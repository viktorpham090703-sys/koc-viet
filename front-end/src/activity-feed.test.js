import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { KOC_ACTIVITY_FALLBACK } from "./landing/shared.js";

test("homepage activity feed ships seven Vietnamese representative portraits", async () => {
  assert.equal(KOC_ACTIVITY_FALLBACK.length, 7);
  assert.equal(new Set(KOC_ACTIVITY_FALLBACK.map((item) => item.avatar)).size, 7);

  for (const item of KOC_ACTIVITY_FALLBACK) {
    assert.match(item.name, /^KOC .+ [A-ZÀ-Ỹ]\.$/u);
    assert.match(item.avatar, /^\/images\/koc-avatars\/[a-z-]+\.jpg$/);
    assert.ok(item.category);
    assert.ok(item.text);
    assert.ok(item.time);

    const asset = fileURLToPath(
      new URL(`../public${item.avatar}`, import.meta.url),
    );
    await access(asset);
  }
});
