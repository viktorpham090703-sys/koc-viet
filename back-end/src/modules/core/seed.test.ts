import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { KOC_AVATARS, TIERS, tierOf } from "./seed.js";

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
