import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SOCIAL_CHANNELS,
  SOCIAL_CHANNELS,
  normalizeSocialDrafts,
} from "./social-channels.js";

test("offers only the five supported social platforms", () => {
  assert.equal(MAX_SOCIAL_CHANNELS, 5);
  assert.deepEqual(
    SOCIAL_CHANNELS.map((channel) => channel.platform),
    ["TikTok", "Facebook", "Instagram", "YouTube", "Threads"],
  );
});

test("drops removed platforms from legacy social drafts", () => {
  const result = normalizeSocialDrafts([
    { platform: "X (Twitter)", handle: "https://x.com/kocviet" },
    { platform: "LinkedIn", handle: "https://linkedin.com/in/kocviet" },
    { platform: "Zalo", handle: "https://zalo.me/0900000000" },
    { platform: "Pinterest", handle: "https://pinterest.com/kocviet" },
    { platform: "Twitch", handle: "https://twitch.tv/kocviet" },
    { platform: "TikTok", handle: "https://tiktok.com/@kocviet" },
  ]);

  assert.deepEqual(result.map((channel) => channel.platform), ["TikTok"]);
});
