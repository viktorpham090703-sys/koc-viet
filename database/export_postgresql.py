"""Build a PostgreSQL schema + data import from the local Wrangler D1 database."""

from __future__ import annotations

import math
import re
import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "database" / "postgresql_schema.sql"
D1_DIR = ROOT / ".wrangler" / "state" / "v3" / "d1" / "miniflare-D1DatabaseObject"
OUTPUT_PATH = ROOT / "database" / "postgresql_full.sql"


def sql_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bytes):
        return f"decode('{value.hex()}', 'hex')"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return "'NaN'"
        if math.isinf(value):
            return "'Infinity'" if value > 0 else "'-Infinity'"
        return repr(value)
    text = str(value)
    if "\x00" in text:
        raise ValueError("PostgreSQL TEXT cannot contain a NUL byte")
    return "'" + text.replace("'", "''") + "'"


def find_d1_database() -> Path:
    candidates = [
        path
        for path in D1_DIR.glob("*.sqlite")
        if not path.name.startswith("metadata.sqlite")
    ]
    if len(candidates) != 1:
        names = ", ".join(str(path) for path in candidates) or "none"
        raise RuntimeError(f"Expected one local D1 database, found: {names}")
    return candidates[0]


def schema_columns(schema: str) -> dict[str, set[str]]:
    tables: dict[str, set[str]] = {}
    pattern = re.compile(
        r"CREATE TABLE IF NOT EXISTS\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*?)\);",
        re.IGNORECASE | re.DOTALL,
    )
    for table, body in pattern.findall(schema):
        columns: set[str] = set()
        for raw_line in body.splitlines():
            line = raw_line.strip().rstrip(",")
            if not line or line.upper().startswith(("PRIMARY ", "UNIQUE ", "CHECK ", "FOREIGN ")):
                continue
            columns.add(line.split()[0].strip('"').lower())
        tables[table.lower()] = columns
    return tables


def main() -> None:
    db_path = find_d1_database()
    schema = SCHEMA_PATH.read_text(encoding="utf-8").rstrip()
    postgres_columns = schema_columns(schema)

    connection = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        table_names = [
            row[0]
            for row in connection.execute(
                """
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name NOT LIKE 'sqlite_%'
                  AND name NOT LIKE '_cf_%'
                ORDER BY name
                """
            )
        ]

        total_rows = 0
        with OUTPUT_PATH.open("w", encoding="utf-8", newline="\n") as output:
            output.write(schema)
            output.write("\n\n-- Data exported from local Cloudflare D1/SQLite.\n")
            output.write(f"-- Source: {db_path.relative_to(ROOT)}\n")
            output.write("-- Inserts are repeat-safe for rows covered by existing constraints.\n\n")
            output.write("BEGIN;\n\n")

            for table in table_names:
                columns = [
                    row[1]
                    for row in connection.execute(
                        f"PRAGMA table_info({sql_identifier(table)})"
                    )
                ]
                if not columns:
                    continue
                missing = set(column.lower() for column in columns) - postgres_columns.get(
                    table.lower(), set()
                )
                if missing:
                    raise RuntimeError(
                        f"PostgreSQL schema is missing {table} columns: {sorted(missing)}"
                    )

                rows = connection.execute(
                    f"SELECT * FROM {sql_identifier(table)}"
                )
                row_count = 0
                column_sql = ", ".join(sql_identifier(column) for column in columns)
                for row in rows:
                    values_sql = ", ".join(sql_literal(row[column]) for column in columns)
                    output.write(
                        f"INSERT INTO {sql_identifier(table)} ({column_sql}) "
                        f"VALUES ({values_sql}) ON CONFLICT DO NOTHING;\n"
                    )
                    row_count += 1
                if row_count:
                    output.write("\n")
                total_rows += row_count

            output.write("COMMIT;\n")
    finally:
        connection.close()

    print(f"Created {OUTPUT_PATH}")
    print(f"Exported {len(table_names)} tables and {total_rows} rows")


if __name__ == "__main__":
    main()
