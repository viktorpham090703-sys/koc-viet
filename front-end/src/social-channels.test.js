import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SOCIAL_CHANNELS,
  SOCIAL_CHANNELS,
  normalizeSocialDrafts,
  socialPlatformIcon,
  socialChannelPickerHtml,
  socialChannelPlaceholder,
  socialProfileUrl,
  isValidSocialUrl,
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

test("provides authentic SVG icons for all supported platforms", () => {
  const platforms = ["TikTok", "Facebook", "Instagram", "YouTube", "Threads"];
  for (const p of platforms) {
    const icon = socialPlatformIcon(p);
    assert.ok(icon.includes("<svg"), `Platform ${p} should have an SVG icon`);
    assert.ok(icon.includes('width="18"'), `Platform ${p} icon default width is 18`);
  }
  const customIcon = socialPlatformIcon("TikTok", 24);
  assert.ok(customIcon.includes('width="24"'), "Allows resizing SVG icon");
});

test("normalizes drafts preserving avatarUrl and displayName", () => {
  const drafts = normalizeSocialDrafts([
    {
      platform: "TikTok",
      handle: "https://www.tiktok.com/@creator",
      avatarUrl: "https://p16-va.tiktokcdn.com/avatar.jpg",
      displayName: "Creator VN",
      followers: 5000,
    },
  ]);
  assert.equal(drafts[0].avatarUrl, "https://p16-va.tiktokcdn.com/avatar.jpg");
  assert.equal(drafts[0].displayName, "Creator VN");
});

test("generates placeholders and profile URLs correctly", () => {
  assert.equal(socialChannelPlaceholder("TikTok"), "https://www.tiktok.com/@tenkenh");
  assert.equal(socialChannelPlaceholder("Facebook"), "https://www.facebook.com/tenkenh");
  assert.equal(socialChannelPlaceholder("Instagram"), "https://www.instagram.com/tenkenh");
  assert.equal(socialChannelPlaceholder("YouTube"), "https://www.youtube.com/@tenkenh");
  assert.equal(socialChannelPlaceholder("Threads"), "https://www.threads.net/@tenkenh");

  assert.equal(socialProfileUrl({ platform: "TikTok", handle: "@koc_viet" }), "https://www.tiktok.com/@koc_viet");
  assert.equal(socialProfileUrl({ platform: "Facebook", handle: "kocviet.official" }), "https://www.facebook.com/kocviet.official");
  assert.equal(socialProfileUrl({ platform: "YouTube", handle: "https://youtube.com/@koc" }), "https://youtube.com/@koc");
});

test("validates social profile URLs strictly", () => {
  assert.equal(isValidSocialUrl("https://www.tiktok.com/@user"), true);
  assert.equal(isValidSocialUrl("http://facebook.com/user"), true);
  assert.equal(isValidSocialUrl("javascript:alert(1)"), false);
  assert.equal(isValidSocialUrl("plain_text"), false);
  assert.equal(isValidSocialUrl(""), false);
});

test("renders direct manual URL input boxes and platform pills", () => {
  const html = socialChannelPickerHtml({
    socials: [
      { platform: "TikTok", handle: "https://www.tiktok.com/@creator", followers: 1200 },
      { platform: "Facebook", handle: "", followers: 0 },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  // URL inputs and bindings
  assert.ok(html.includes('type="url"'), "Renders URL input boxes");
  assert.ok(html.includes('class="social-manual-input"'), "Has manual input class");
  assert.ok(html.includes('data-social-link'), "Preserves data-social-link binding");
  assert.ok(html.includes('value="https://www.tiktok.com/@creator"'), "Pre-fills existing handle");
  assert.ok(html.includes('data-platform="TikTok"'), "Binds TikTok platform attribute");
  assert.ok(html.includes('data-platform="Facebook"'), "Binds Facebook platform attribute");

  // Overview and platform pills
  assert.ok(html.includes("2/5</strong> kênh đã chọn"), "Shows count pill");
  assert.ok(html.includes('class="social-platform-pill selected"'), "Shows selected pill for chosen channels");
  assert.ok(html.includes('data-social-toggle="TikTok"'), "Binds toggle handler for TikTok");
  assert.ok(html.includes('data-social-toggle="YouTube"'), "Binds toggle handler for unselected YouTube");
  assert.ok(html.includes("Kênh chính"), "Renders primary channel badge");
  assert.ok(html.includes("Kênh phụ"), "Renders secondary channel badge");
  assert.ok(html.includes("✕ Gỡ kênh"), "Renders unlink / remove channel button");

  // No technical OAuth jargon
  assert.ok(!html.includes("OAuth"), "Strictly avoids technical jargon OAuth");
  assert.ok(!html.includes("Token"), "Strictly avoids technical jargon Token");
  assert.ok(!html.includes("Callback"), "Strictly avoids technical jargon Callback");
  assert.ok(!html.includes("data-social-mode"), "No mode switcher needed");
});

test("renders empty state when no channels are selected", () => {
  const html = socialChannelPickerHtml({
    socials: [],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  assert.ok(html.includes("Chưa có kênh nào được chọn"), "Shows helpful empty state message");
  assert.ok(html.includes("0/5</strong> kênh đã chọn"), "Shows zero count");
});

test("profile review mode provides editable followers for every channel", () => {
  const html = socialChannelPickerHtml({
    socials: [
      { platform: "TikTok", handle: "https://tiktok.com/@creator", followers: 25000 },
      { platform: "Instagram", handle: "https://instagram.com/creator", followers: 0 },
    ],
    prefix: "pf",
    escapeHtml: (s) => s,
    reviewRequired: true,
  });
  assert.equal((html.match(/data-social-followers/g) || []).length, 2);
  assert.ok(html.includes('for="pf-social-link-0-followers"'));
  assert.ok(html.includes('id="pf-social-link-0-followers"'));
  assert.ok(html.includes('required value="25000"'));
  assert.ok(html.includes('required value="0"'));
  assert.ok(html.includes('min="1000"'));
  assert.ok(html.includes('min="0"'));
  assert.ok(html.includes('data-integer-input'));
  assert.ok(html.includes("Thay đổi chỉ có hiệu lực sau khi admin duyệt."));
  assert.ok(!html.includes("data-social-mode"));
  assert.ok(!html.includes("data-social-connect"));

  const onboarding = socialChannelPickerHtml({ socials: [], prefix: "ob" });
  assert.ok(!onboarding.includes("data-social-followers"));
});
