import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  KOC_AVATARS,
  KOC_DEMO_PRICES,
  KOC_PROFILE_AVATAR_OVERRIDES,
  TIERS,
  syncKocCatalog,
  tierOf,
} from "./seed.js";

test("defines the five KOC tiers and requested price ranges", () => {
  assert.deepEqual(TIERS.map((tier) => tier.name), ["Nano", "Micro", "Mid", "Macro", "Mega"]);
  assert.deepEqual(TIERS.map(({ min, max }) => [min, max]), [
    [200_000, 1_500_000],
    [1_000_000, 10_000_000],
    [8_000_000, 25_000_000],
    [20_000_000, 60_000_000],
    [50_000_000, 9_000_000_000_000_000],
  ]);
});

test("assigns KOC tier using follower boundaries only", () => {
  assert.equal(tierOf(9_999), "Nano");
  assert.equal(tierOf(10_000), "Micro");
  assert.equal(tierOf(99_999), "Micro");
  assert.equal(tierOf(100_000), "Mid");
  assert.equal(tierOf(299_999), "Mid");
  assert.equal(tierOf(300_000), "Macro");
  assert.equal(tierOf(999_999), "Macro");
  assert.equal(tierOf(1_000_000), "Mega");
});

test("ships a local portrait for every seeded KOC", async () => {
  const expectedNames = [
    "Nguyễn Thu Hà",
    "Trần Minh Quân",
    "Lê Phương Anh",
    "Phạm Gia Bảo",
    "Võ Thanh Trúc",
    "Đặng Hoàng Long",
    "Bùi Ngọc Mai",
    "Hồ Anh Tuấn",
    "Đỗ Thùy Linh",
    "Ngô Quốc Việt",
    "Trịnh Bảo Ngọc",
    "Lý Hải Đăng",
  ];

  assert.deepEqual(Object.keys(KOC_AVATARS), expectedNames);
  for (const avatar of Object.values(KOC_AVATARS)) {
    assert.match(avatar, /^\/images\/koc-avatars\/[a-z-]+\.jpg$/);
    const asset = fileURLToPath(new URL(`../../../../front-end/public${avatar}`, import.meta.url));
    await access(asset);
  }
});

test("replaces Nguyễn Hồ Việt Khoa's external avatar with a local portrait", async () => {
  assert.deepEqual(KOC_PROFILE_AVATAR_OVERRIDES, {
    "58b98467-00a6-43cd-9775-656c85c91208":
      "/images/koc-avatars/nguyen-ho-viet-khoa.jpg",
  });

  const [avatar] = Object.values(KOC_PROFILE_AVATAR_OVERRIDES);
  const asset = fileURLToPath(new URL(`../../../../front-end/public${avatar}`, import.meta.url));
  await access(asset);
});

test("syncs Nguyễn Hồ Việt Khoa's avatar by stable profile ID", async () => {
  const batched: Array<{ sql: string; values: unknown[] }> = [];
  const env = {
    DB: {
      prepare(sql: string) {
        return {
          bind(...values: unknown[]) {
            return { sql, values };
          },
        };
      },
      async batch(statements: Array<{ sql: string; values: unknown[] }>) {
        batched.push(...statements);
      },
    },
  };

  await syncKocCatalog(env);

  assert.ok(batched.some(({ sql, values }) =>
    sql === "UPDATE kocs SET avatar=? WHERE id=?"
      && values[0] === "/images/koc-avatars/nguyen-ho-viet-khoa.jpg"
      && values[1] === "58b98467-00a6-43cd-9775-656c85c91208"));
});

test("keeps every sample KOC price attractive without dropping below its tier floor", () => {
  const expectedPriceWindows: Record<string, [number, number]> = {
    "Nguyễn Thu Hà": [20_000_000, 24_000_000],
    "Trần Minh Quân": [8_000_000, 10_000_000],
    "Lê Phương Anh": [1_000_000, 1_800_000],
    "Phạm Gia Bảo": [1_000_000, 1_800_000],
    "Võ Thanh Trúc": [1_000_000, 1_800_000],
    "Đặng Hoàng Long": [200_000, 450_000],
    "Bùi Ngọc Mai": [8_000_000, 10_000_000],
    "Hồ Anh Tuấn": [200_000, 450_000],
    "Đỗ Thùy Linh": [1_000_000, 1_800_000],
    "Ngô Quốc Việt": [20_000_000, 24_000_000],
    "Trịnh Bảo Ngọc": [200_000, 450_000],
    "Lý Hải Đăng": [1_000_000, 1_800_000],
  };

  assert.deepEqual(Object.keys(KOC_DEMO_PRICES), Object.keys(KOC_AVATARS));
  for (const [name, prices] of Object.entries(KOC_DEMO_PRICES)) {
    const [min, max] = expectedPriceWindows[name];
    for (const price of Object.values(prices)) {
      assert.ok(price >= min && price <= max, `${name}: ${price}`);
    }
  }
});
