import assert from "node:assert/strict";
import test from "node:test";
import { TIERS, tierOf } from "./seed.js";

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
  assert.equal(tierOf(9_999, 99), "Nano");
  assert.equal(tierOf(10_000, 0), "Micro");
  assert.equal(tierOf(99_999, 99), "Micro");
  assert.equal(tierOf(100_000, 0), "Mid");
  assert.equal(tierOf(299_999, 99), "Mid");
  assert.equal(tierOf(300_000, 0), "Macro");
  assert.equal(tierOf(999_999, 99), "Macro");
  assert.equal(tierOf(1_000_000, 0), "Mega");
});
