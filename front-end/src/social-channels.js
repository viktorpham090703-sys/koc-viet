export const MAX_SOCIAL_CHANNELS = 5;

export const SOCIAL_CHANNELS = Object.freeze([
  {
    platform: "TikTok",
    placeholder: "https://www.tiktok.com/@tenkenh",
    profileBase: "https://www.tiktok.com/@",
  },
  {
    platform: "Facebook",
    placeholder: "https://www.facebook.com/tenkenh",
    profileBase: "https://www.facebook.com/",
  },
  {
    platform: "Instagram",
    placeholder: "https://www.instagram.com/tenkenh",
    profileBase: "https://www.instagram.com/",
  },
  {
    platform: "YouTube",
    placeholder: "https://www.youtube.com/@tenkenh",
    profileBase: "https://www.youtube.com/@",
  },
  {
    platform: "Threads",
    placeholder: "https://www.threads.net/@tenkenh",
    profileBase: "https://www.threads.net/@",
  },
]);

const CHANNEL_BY_PLATFORM = new Map(
  SOCIAL_CHANNELS.map((channel) => [channel.platform, channel]),
);

export function socialChannelPlaceholder(platform) {
  return (
    CHANNEL_BY_PLATFORM.get(String(platform || ""))?.placeholder ||
    "https://..."
  );
}

export function socialProfileUrl(social) {
  const value = String(social?.handle || "").trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch (_) {}

  const username = value.replace(/^@+/, "").trim();
  const channel = CHANNEL_BY_PLATFORM.get(String(social?.platform || ""));
  if (!channel || !username || /[\s/]/.test(username)) return "";
  return `${channel.profileBase}${encodeURIComponent(username)}`;
}

export function isValidSocialUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 300 || /[\r\n]/.test(raw)) return false;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch (_) {
    return false;
  }
}

export function normalizeSocialDrafts(value, { withFallback = false } = {}) {
  const seen = new Set();
  const drafts = [];
  for (const social of Array.isArray(value) ? value : []) {
    const platform = String(social?.platform || "").trim();
    if (!CHANNEL_BY_PLATFORM.has(platform) || seen.has(platform)) continue;
    seen.add(platform);
    drafts.push({
      ...social,
      platform,
      handle: socialProfileUrl(social) || String(social?.handle || "").trim(),
    });
    if (drafts.length === MAX_SOCIAL_CHANNELS) break;
  }

  if (!drafts.length && withFallback) {
    drafts.push({ platform: SOCIAL_CHANNELS[0].platform, handle: "", followers: 0 });
  }
  return drafts;
}

export function socialChannelPickerHtml({
  socials,
  prefix,
  escapeHtml,
  primaryVerified = false,
  primaryLabel = "Kênh chính",
}) {
  const drafts = normalizeSocialDrafts(socials);
  const selected = new Set(drafts.map((social) => social.platform));
  const safe = typeof escapeHtml === "function" ? escapeHtml : String;
  const labelId = `${prefix}-social-channel-label`;

  return `<section class="social-channel-picker" aria-labelledby="${labelId}">
    <div class="social-channel-heading">
      <div>
        <label class="required-label" id="${labelId}">Kênh mạng xã hội</label>
        <p>Chọn tối đa ${MAX_SOCIAL_CHANNELS} kênh. Mỗi kênh được chọn sẽ có một ô gắn link riêng.</p>
      </div>
      <span aria-label="Đã chọn ${drafts.length} trên ${MAX_SOCIAL_CHANNELS} kênh">${drafts.length}/${MAX_SOCIAL_CHANNELS}</span>
    </div>
    <div class="social-channel-options" role="group" aria-labelledby="${labelId}">
      ${SOCIAL_CHANNELS.map((channel) => {
        const index = drafts.findIndex(
          (social) => social.platform === channel.platform,
        );
        const isSelected = index >= 0;
        const isLockedPrimary = primaryVerified && index === 0;
        return `<button type="button" class="social-channel-option${isSelected ? " selected" : ""}" data-social-toggle="${safe(channel.platform)}" aria-pressed="${isSelected}" ${isLockedPrimary ? 'disabled title="Kênh chính đã được xác minh"' : ""}>
          <span>${safe(channel.platform)}</span>${isLockedPrimary ? "<small>Đã xác minh</small>" : ""}
        </button>`;
      }).join("")}
    </div>
    <div class="social-channel-fields" aria-live="polite">
      ${drafts.map((social, index) => {
        const isLockedPrimary = primaryVerified && index === 0;
        const inputId = `${prefix}-social-link-${index}`;
        return `<div class="social-channel-field">
          <label for="${inputId}"><span class="${isLockedPrimary ? "" : "required-label"}">${safe(social.platform)}</span>${index === 0 ? `<small>${isLockedPrimary ? "Kênh chính · Đã xác minh" : safe(primaryLabel)}</small>` : ""}</label>
          <input id="${inputId}" type="url" inputmode="url" autocomplete="url" data-social-link data-platform="${safe(social.platform)}" value="${safe(social.handle || "")}" placeholder="${safe(socialChannelPlaceholder(social.platform))}" maxlength="300" ${isLockedPrimary ? "readonly" : ""}>
        </div>`;
      }).join("") || '<p class="social-channel-empty">Chọn ít nhất một kênh để gắn link hồ sơ.</p>'}
    </div>
  </section>`;
}
