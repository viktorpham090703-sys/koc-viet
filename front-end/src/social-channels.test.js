import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SOCIAL_CHANNELS,
  SOCIAL_CHANNELS,
  normalizeSocialDrafts,
  socialPlatformIcon,
  socialChannelPickerHtml,
  PENDING_APPROVAL_PLATFORMS,
  isPlatformPendingApproval,
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

test("renders verified channel with text link, avatar, and no text input box", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "TikTok",
        handle: "https://www.tiktok.com/@trngdc_14",
        avatarUrl: "https://p16-va.tiktokcdn.com/avatar.jpg",
        displayName: "Trung Đức",
        followers: 1500,
        verified: true,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  // Must not have text/url input box for filling link
  assert.ok(!html.includes('type="url"'), "Should not render text/url input box");
  assert.ok(html.includes('type="hidden"'), "Should render hidden input to preserve data-social-link binding");

  // Must have dashboard overview with progress
  assert.ok(html.includes('class="social-dashboard-overview"'), "Should render dashboard overview");
  assert.ok(html.includes("1/5</strong> kênh đã liên kết"), "Should show linked channels count");
  assert.ok(html.includes("1.500</strong> người theo dõi"), "Should show total followers");
  assert.ok(html.includes("✓ Đủ điều kiện"), "Should show eligible status badge");

  // Must have platform selector pills
  assert.ok(html.includes('class="social-platform-pill selected verified"'), "Should render selected & verified pill");
  assert.ok(html.includes('class="platform-pill-icon"'), "Should render icon in platform pill");

  // Must have text link and avatar
  assert.ok(html.includes('class="social-account-text-link"'), "Should render link as text");
  assert.ok(html.includes("https://www.tiktok.com/@trngdc_14"), "Should display channel link");
  assert.ok(html.includes('class="social-avatar-image"'), "Should render avatar image");
  assert.ok(html.includes("Trung Đức"), "Should display account display name");

  // Must have follower metric and actions without technical jargon
  assert.ok(html.includes('class="social-stat-metric eligible"'), "Should render follower metric box");
  assert.ok(html.includes('class="btn-card-action reauth"'), "Should have reauth button");
  assert.ok(html.includes("Đồng bộ lại"), "Should render re-sync button with non-technical text");
  assert.ok(html.includes("↗ Xem hồ sơ"), "Should render external profile view button");
  assert.ok(!html.includes("OAuth"), "Strictly avoids technical jargon OAuth");
  assert.ok(!html.includes("Token"), "Strictly avoids technical jargon Token");
  assert.ok(!html.includes("Callback"), "Strictly avoids technical jargon Callback");
});

test("displays explicit requirement reason when follower count is below minimum", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "TikTok",
        handle: "https://www.tiktok.com/@newbie",
        displayName: "Newbie Creator",
        followers: 450,
        verified: true,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  assert.ok(html.includes("⚠ Chưa đạt yêu cầu"), "Renders ineligible status badge");
  assert.ok(
    html.includes("Hiện có 450 người theo dõi. Yêu cầu tối thiểu: 1.000 người theo dõi."),
    "Displays explicit clear explanation of minimum follower requirement",
  );
});

test("renders unconnected channel with friendly connection CTA button", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "YouTube",
        handle: "",
        followers: 0,
        verified: false,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  assert.ok(html.includes('class="social-unconnected-layout"'), "Renders unconnected layout");
  assert.ok(html.includes("Chưa kết nối tài khoản YouTube"), "Friendly title");
  assert.ok(html.includes("Kết nối YouTube"), "Clear CTA button text");
  assert.ok(html.includes('data-social-oauth="YouTube"'), "Binds oauth click listener");
});

test("renders personal account guidance callout with helpful step-by-step instructions", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "Facebook",
        handle: "https://www.facebook.com/123456",
        followers: 0,
        verified: true,
        isPersonalAccount: true,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
  });

  assert.ok(html.includes('class="social-info-callout"'), "Renders elegant guidance callout");
  assert.ok(html.includes("Lưu ý về hiển thị người theo dõi Facebook"), "Displays informative header");
  assert.ok(html.includes("👉 Cách thực hiện nhanh:"), "Displays step-by-step instructions heading");
  assert.ok(html.includes("Bật chế độ chuyên nghiệp (Turn on Professional Mode)"), "Provides Facebook mode instructions");
});

test("renders mode switcher offering both Auto (Beta) and Manual (Standard) modes", () => {
  const html = socialChannelPickerHtml({
    socials: [{ platform: "TikTok", handle: "https://www.tiktok.com/@creator" }],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "auto",
  });

  assert.ok(html.includes('class="social-mode-selector"'), "Renders mode selector");
  assert.ok(html.includes('data-social-mode="auto"'), "Has auto beta button");
  assert.ok(html.includes('data-social-mode="manual"'), "Has manual standard button");
  assert.ok(html.includes("Beta"), "Labels auto mode as Beta");
  assert.ok(html.includes("Tiêu chuẩn"), "Labels manual mode as Standard");
});

test("renders classic manual mode with direct url input boxes and platform pills", () => {
  const html = socialChannelPickerHtml({
    socials: [
      { platform: "TikTok", handle: "https://www.tiktok.com/@creator", followers: 1200, verified: true },
      { platform: "Facebook", handle: "", followers: 0, verified: false },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "manual",
  });

  // Manual mode MUST render editable URL inputs
  assert.ok(html.includes('type="url"'), "Renders URL input boxes in manual mode");
  assert.ok(html.includes('class="social-manual-input"'), "Has manual input class");
  assert.ok(html.includes('data-social-link'), "Preserves data-social-link binding");
  assert.ok(html.includes("https://www.tiktok.com/@creator"), "Pre-fills existing handle");
  assert.ok(html.includes("Nhập thủ công"), "Shows manual mode title");

  // Platform pills and verified pill
  assert.ok(html.includes('class="social-platform-pill selected verified"'), "Shows selected verified pill");
  assert.ok(html.includes("✓ Đã xác thực · 1.200 fl"), "Shows verified stats pill in manual mode");
});

test("always renders unlink button for ineligible or primary channels and never disables platform pills", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "TikTok",
        handle: "https://www.tiktok.com/@creator",
        followers: 0,
        verified: true,
      },
      {
        platform: "Threads",
        handle: "https://www.threads.net/@creator",
        followers: 14726,
        verified: true,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "auto",
  });

  // Both cards must have unlink buttons
  assert.ok(html.includes('data-social-toggle="TikTok" title="Gỡ TikTok khỏi danh sách"'), "Renders unlink button on primary ineligible channel");
  assert.ok(html.includes('data-social-toggle="Threads" title="Gỡ Threads khỏi danh sách"'), "Renders unlink button on secondary eligible channel");
  assert.ok(!html.includes('disabled title="Kênh chính đã liên kết cố định"'), "Never disables platform pills or locks channels");
});

test("renders approved active channel for Threads without demo badge", () => {
  const html = socialChannelPickerHtml({
    socials: [
      {
        platform: "Threads",
        handle: "",
        followers: 0,
        verified: false,
      },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "auto",
  });

  // Verify Threads is approved and active
  assert.ok(html.includes("Chưa kết nối tài khoản Threads"), "Renders standard unconnected title");
  assert.ok(html.includes("Kết nối Threads"), "Renders clear connect CTA text");
  assert.ok(html.includes('data-social-oauth="Threads"'), "Binds OAuth click listener for Threads");
  assert.ok(!html.includes("Demo"), "No Demo badge or demo text appears for Threads");
  assert.ok(!html.includes('class="btn-card-action locked"'), "Threads is not locked");
});

test("identifies TikTok and Facebook as pending platform approval", () => {
  assert.deepEqual([...PENDING_APPROVAL_PLATFORMS], ["TikTok", "Facebook"]);
  assert.equal(isPlatformPendingApproval("TikTok"), true);
  assert.equal(isPlatformPendingApproval("Facebook"), true);
  assert.equal(isPlatformPendingApproval("YouTube"), false);
  assert.equal(isPlatformPendingApproval("Instagram"), false);
  assert.equal(isPlatformPendingApproval("Threads"), false);
});

test("locks connect button and prevents OAuth clicks for TikTok and Facebook in auto mode", () => {
  const html = socialChannelPickerHtml({
    socials: [
      { platform: "TikTok", handle: "", followers: 0, verified: false },
      { platform: "Facebook", handle: "", followers: 0, verified: false },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "auto",
  });

  // Verify locked buttons
  assert.ok(html.includes('class="btn-card-action locked" disabled aria-disabled="true"'), "Renders disabled locked button");
  assert.ok(html.includes("Đang chờ duyệt"), "Button displays 'Đang chờ duyệt'");
  assert.ok(!html.includes('data-social-oauth="TikTok"'), "Does NOT bind OAuth click listener for TikTok");
  assert.ok(!html.includes('data-social-oauth="Facebook"'), "Does NOT bind OAuth click listener for Facebook");

  // Verify pending badges & messages
  assert.ok(html.includes('class="social-card-pending-badge"'), "Renders pending approval badge in card header");
  assert.ok(html.includes('class="platform-pill-pending-tag"'), "Renders pending tag in platform pills");
  assert.ok(html.includes("Kênh TikTok (Đang chờ nền tảng xét duyệt)"), "Displays clear pending heading for TikTok");
  assert.ok(html.includes("Kênh Facebook (Đang chờ nền tảng xét duyệt)"), "Displays clear pending heading for Facebook");
  assert.ok(html.includes("data-switch-to-manual"), "Provides quick link to switch to manual mode");
});

test("allows TikTok and Facebook manual entry without locked state in manual mode", () => {
  const html = socialChannelPickerHtml({
    socials: [
      { platform: "TikTok", handle: "https://www.tiktok.com/@mybrand", followers: 0, verified: false },
      { platform: "Facebook", handle: "https://facebook.com/mybrand", followers: 0, verified: false },
    ],
    prefix: "test",
    escapeHtml: (s) => s,
    mode: "manual",
  });

  // In manual mode, inputs must remain editable and no locked buttons
  assert.ok(!html.includes('class="btn-card-action locked"'), "No locked button in manual mode");
  assert.ok(!html.includes("Đang chờ duyệt"), "No pending approval text on manual buttons");
  assert.ok(html.includes('value="https://www.tiktok.com/@mybrand"'), "Preserves manual input for TikTok");
  assert.ok(html.includes('value="https://facebook.com/mybrand"'), "Preserves manual input for Facebook");
});





