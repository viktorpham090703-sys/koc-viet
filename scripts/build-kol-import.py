#!/usr/bin/env python3
"""Build an idempotent PostgreSQL replacement script for public KOL profiles.

The Cloudinary workbook is authoritative for membership, display name and avatar.
The lead workbook is only used to enrich the matching source row. Private contact
fields (phone, email and free-form contact information) are deliberately omitted.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path

import pandas as pd


GROUP_CONFIG = {
    "Ca sĩ": {"sheet": "Ca sĩ", "header": 0, "source_offset": 2},
    "MC": {"sheet": "MC", "header": None, "source_offset": 1},
    "Diễn viên": {"sheet": "Diễn viên", "header": 0, "source_offset": 2},
}


def clean(value) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def normalized_name(value) -> str:
    value = unicodedata.normalize("NFD", clean(value).lower())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", value)


def normalized_fanbase(value) -> str:
    value = clean(value)
    if not value:
        return ""
    if not re.fullmatch(r"\d+(?:[.,]\d+)?[KkMm]?", value):
        return ""
    return value.upper()


def sql_text(value) -> str:
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def lead_value(row, group: str, named_column: str, mc_index: int | None = None) -> str:
    if group == "MC":
        return clean(row.iloc[mc_index]) if mc_index is not None else ""
    return clean(row.get(named_column))


def lead_name(row, group: str) -> str:
    return lead_value(row, group, "Name", 0)


def enrich(row, group: str) -> dict:
    facebook = lead_value(row, group, "Link Facebook ", 2)
    followers = normalized_fanbase(
        lead_value(row, group, "TỔNG SỐ NGƯỜI THEO DÕI", 14 if group == "MC" else None)
    )
    platform = "Facebook"
    media_kit = ""
    bio = ""
    if group == "Ca sĩ":
        bio = lead_value(row, group, "Link Vực")
    elif group == "MC":
        media_kit = lead_value(row, group, "", 5)
        bio = "MC / Người dẫn chương trình"
    else:
        media_kit = lead_value(row, group, "Link Post Bài")
        bio = lead_value(row, group, "NGÀNH HOẠT ĐỘNG")

    channels = []
    if facebook.startswith(("http://", "https://")):
        channel = {"platform": clean(platform) or "Facebook", "handle": facebook}
        if followers:
            channel["followers"] = followers
        channels.append(channel)

    return {
        "fanbase": followers,
        "channels": channels,
        "media_kit": media_kit if media_kit.startswith(("http://", "https://")) else "",
        "bio": bio,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--avatars", required=True, type=Path)
    parser.add_argument("--leads", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--catalog", type=Path)
    args = parser.parse_args()

    cloud = pd.read_excel(args.avatars, sheet_name="Danh sách KOL", header=3)
    lead_sheets = {
        group: pd.read_excel(args.leads, sheet_name=config["sheet"], header=config["header"])
        for group, config in GROUP_CONFIG.items()
    }

    merged: OrderedDict[str, dict] = OrderedDict()
    mismatches = []
    invalid_rows = []

    for _, cloud_row in cloud.iterrows():
        group = clean(cloud_row.get("Nhóm"))
        display_name = clean(cloud_row.get("Tên KOL"))
        avatar = clean(cloud_row.get("Link Cloudinary"))
        source_raw = cloud_row.get("Dòng nguồn")
        if group not in GROUP_CONFIG or not display_name or not avatar:
            invalid_rows.append({"name": display_name, "group": group, "reason": "missing required value"})
            continue

        try:
            source_row = int(source_raw)
            source_index = source_row - GROUP_CONFIG[group]["source_offset"]
            lead_row = lead_sheets[group].iloc[source_index]
        except (TypeError, ValueError, IndexError):
            invalid_rows.append({"name": display_name, "group": group, "reason": f"invalid source row {source_raw}"})
            continue

        source_name = lead_name(lead_row, group)
        if normalized_name(display_name) != normalized_name(source_name):
            mismatches.append({
                "cloud_name": display_name,
                "lead_name": source_name,
                "group": group,
                "source_row": source_row,
            })

        detail = enrich(lead_row, group)
        # The avatar workbook sometimes contains a legal name (for example
        # "Nguyễn Thùy Chi") while the lead workbook contains the public stage
        # name ("Chi Pu"). Public cards should use the latter.
        public_name = source_name or display_name
        key = normalized_name(public_name)
        if key not in merged:
            merged[key] = {
                "id": "kol_" + hashlib.sha256(key.encode("utf-8")).hexdigest()[:24],
                "name": public_name,
                "fields": [],
                "fanbase": detail["fanbase"],
                "channels": [],
                "media_kit": detail["media_kit"],
                "avatar": avatar,
                "bios": [],
            }
        profile = merged[key]
        if group not in profile["fields"]:
            profile["fields"].append(group)
        for channel in detail["channels"]:
            if not any(item.get("handle") == channel.get("handle") for item in profile["channels"]):
                profile["channels"].append(channel)
        if not profile["fanbase"] and detail["fanbase"]:
            profile["fanbase"] = detail["fanbase"]
        if not profile["media_kit"] and detail["media_kit"]:
            profile["media_kit"] = detail["media_kit"]
        if detail["bio"] and detail["bio"] not in profile["bios"]:
            profile["bios"].append(detail["bio"])

    if invalid_rows:
        raise SystemExit(f"Refusing to generate SQL: {len(invalid_rows)} invalid Cloudinary rows")

    base_created_at = 1787788800
    values = []
    catalog = []
    for position, profile in enumerate(merged.values()):
        field = " / ".join(profile["fields"])
        fanbase = profile["fanbase"] or "Chưa cập nhật"
        bio = " · ".join(profile["bios"])
        created_at = base_created_at - position
        record = {
            "id": profile["id"],
            "name": profile["name"],
            "field": field,
            "fanbase": fanbase,
            "channels": profile["channels"],
            "media_kit": profile["media_kit"] or None,
            "ref_price": 0,
            "price_hidden": 1,
            "premium": 0,
            "avatar": profile["avatar"],
            "bio": bio or None,
            "status": "active",
            "created_at": created_at,
        }
        catalog.append(record)
        values.append(
            "(" + ",".join([
                sql_text(record["id"]), sql_text(record["name"]), sql_text(record["field"]),
                sql_text(record["fanbase"]),
                sql_text(json.dumps(record["channels"], ensure_ascii=False, separators=(",", ":"))),
                sql_text(record["media_kit"]), "0", "1", "0", sql_text(record["avatar"]),
                sql_text(record["bio"]), sql_text(record["status"]), str(record["created_at"]),
            ]) + ")"
        )

    sql = """-- Generated by scripts/build-kol-import.py. Do not edit manually.
-- Replaces public KOL profiles while remapping historical requests by public name.
-- It intentionally does not import private contacts.
BEGIN;

CREATE TEMP TABLE _kol_import
  (LIKE kol_profiles INCLUDING DEFAULTS)
  ON COMMIT DROP;

INSERT INTO _kol_import
  (id,name,field,fanbase,channels,media_kit,ref_price,price_hidden,premium,avatar,bio,status,created_at)
VALUES
""" + ",\n".join(values) + ";\n\n" + """
UPDATE kol_requests request
SET kol_id = new_profile.id
FROM kol_profiles old_profile
JOIN _kol_import new_profile
  ON LOWER(REGEXP_REPLACE(new_profile.name, '[^[:alnum:]]', '', 'g'))
   = LOWER(REGEXP_REPLACE(old_profile.name, '[^[:alnum:]]', '', 'g'))
WHERE request.kol_id = old_profile.id;

-- Unreferenced legacy profiles can be removed. Profiles still referenced by
-- historical requests are retained but hidden from the public API.
DELETE FROM kol_profiles profile
WHERE NOT EXISTS (
  SELECT 1 FROM kol_requests request WHERE request.kol_id = profile.id
);

UPDATE kol_profiles profile
SET status = 'archived'
WHERE NOT EXISTS (
  SELECT 1 FROM _kol_import incoming WHERE incoming.id = profile.id
);

INSERT INTO kol_profiles
  (id,name,field,fanbase,channels,media_kit,ref_price,price_hidden,premium,avatar,bio,status,created_at)
SELECT id,name,field,fanbase,channels,media_kit,ref_price,price_hidden,premium,avatar,bio,status,created_at
FROM _kol_import
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  field=EXCLUDED.field,
  fanbase=EXCLUDED.fanbase,
  channels=EXCLUDED.channels,
  media_kit=EXCLUDED.media_kit,
  ref_price=EXCLUDED.ref_price,
  price_hidden=EXCLUDED.price_hidden,
  premium=EXCLUDED.premium,
  avatar=EXCLUDED.avatar,
  bio=EXCLUDED.bio,
  status=EXCLUDED.status,
  created_at=EXCLUDED.created_at;

COMMIT;
"""

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(sql, encoding="utf-8")
    if args.catalog:
        args.catalog.parent.mkdir(parents=True, exist_ok=True)
        args.catalog.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {
        "cloudinary_rows": int(len(cloud)),
        "profiles_generated": len(merged),
        "duplicates_merged": int(len(cloud) - len(merged)),
        "source_name_mismatches": mismatches,
        "invalid_rows": invalid_rows,
        "profiles_without_fanbase": [p["name"] for p in merged.values() if not p["fanbase"]],
        "profiles_without_channels": [p["name"] for p in merged.values() if not p["channels"]],
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
