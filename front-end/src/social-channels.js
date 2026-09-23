export const MAX_SOCIAL_CHANNELS = 5;

export const SOCIAL_PLATFORM_ICONS = Object.freeze({
  TikTok: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.32a6.34 6.34 0 0 0-.85-.06A6.33 6.33 0 0 0 3.1 15.6a6.34 6.34 0 0 0 10.83 4.47 6.27 6.27 0 0 0 1.9-4.47V8.5a8.28 8.28 0 0 0 4.76 1.6V6.7a4.8 4.8 0 0 1-1-.01Z" fill="#010101"/></svg>`,
  Facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/></svg>`,
  Instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="#E1306C"/></svg>`,
  YouTube: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF"/></svg>`,
  Threads: `<svg width="18" height="18" viewBox="0 0 192 192" fill="none" aria-hidden="true"><path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" fill="#010101"/></svg>`,
});

export function socialPlatformIcon(platform, size = 18) {
  const icon = SOCIAL_PLATFORM_ICONS[String(platform || "").trim()];
  if (!icon) return "";
  if (size && size !== 18) {
    return icon.replace(/width="18" height="18"/, `width="${size}" height="${size}"`);
  }
  return icon;
}

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

export const PENDING_APPROVAL_PLATFORMS = Object.freeze([]);

export function isPlatformPendingApproval(platform) {
  return PENDING_APPROVAL_PLATFORMS.includes(String(platform || "").trim());
}

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
      avatarUrl: String(social?.avatarUrl || social?.avatar || "").trim(),
      displayName: String(social?.displayName || "").trim(),
    });
    if (drafts.length === MAX_SOCIAL_CHANNELS) break;
  }

  if (!drafts.length && withFallback) {
    drafts.push({
      platform: SOCIAL_CHANNELS[0].platform,
      handle: "",
      followers: 0,
      avatarUrl: "",
      displayName: "",
    });
  }
  return drafts;
}

export function socialChannelPickerHtml({
  socials,
  prefix,
  escapeHtml,
  primaryVerified = false,
  primaryLabel = "Kênh chính",
  mode = "auto",
  reviewRequired = false,
}) {
  const drafts = normalizeSocialDrafts(socials);
  const safe = typeof escapeHtml === "function" ? escapeHtml : String;
  const labelId = `${prefix}-social-channel-label`;
  const isAutoMode = !reviewRequired && mode !== "manual";

  const verifiedDrafts = drafts.filter(
    (social) => Boolean(social.verified),
  );
  const verifiedCount = verifiedDrafts.length;
  const totalVerifiedFollowers = verifiedDrafts.reduce(
    (sum, s) => sum + (Number(s.followers) || 0),
    0,
  );
  const isOverallEligible = totalVerifiedFollowers >= 1000;
  const progressPercent = Math.min(100, Math.round((verifiedCount / MAX_SOCIAL_CHANNELS) * 100));

  const modeSwitcherHtml = `
    <!-- Mode Switcher: Beta Auto vs Standard Manual -->
    <div class="social-mode-selector">
      <div class="social-mode-tabs" role="tablist" aria-label="Phương thức liên kết">
        <button type="button" class="social-mode-tab${isAutoMode ? " active" : ""}" data-social-mode="auto" role="tab" aria-selected="${isAutoMode}">
          <span class="social-mode-tab-title">⚡ Tự động liên kết</span>
          <span class="social-mode-badge beta">Beta</span>
        </button>
        <button type="button" class="social-mode-tab${!isAutoMode ? " active" : ""}" data-social-mode="manual" role="tab" aria-selected="${!isAutoMode}">
          <span class="social-mode-tab-title">✏️ Nhập link thủ công</span>
          <span class="social-mode-badge standard">Tiêu chuẩn</span>
        </button>
      </div>
      <p class="social-mode-desc">
        ${isAutoMode
          ? '✨ <strong>Phiên bản Beta:</strong> Tự động đồng bộ đường dẫn hồ sơ, ảnh đại diện và số lượng người theo dõi qua tài khoản mạng xã hội.'
          : '📋 <strong>Phiên bản Tiêu chuẩn:</strong> Dán trực tiếp đường link (URL) trang cá nhân của bạn vào ô nhập liệu bên dưới.'}
      </p>
    </div>
  `;

  if (!isAutoMode) {
    // Standard Manual Mode (Input URL box)
    return `<section class="social-channel-picker" aria-labelledby="${labelId}">
      ${reviewRequired ? '' : modeSwitcherHtml}

      <div class="social-dashboard-overview manual-overview">
        <div class="social-overview-header">
          <div class="social-overview-title-wrap">
            <h3 id="${labelId}" class="social-overview-title">Kênh mạng xã hội (Nhập thủ công)</h3>
            <p class="social-overview-desc">Chọn tối đa ${MAX_SOCIAL_CHANNELS} kênh. Dán đường link trang cá nhân của bạn vào từng ô bên dưới.</p>
          </div>
          <div class="social-count-pill" aria-label="Đã chọn ${drafts.length} trên ${MAX_SOCIAL_CHANNELS} kênh">
            <strong>${drafts.length}/${MAX_SOCIAL_CHANNELS}</strong> kênh đã chọn
          </div>
        </div>

        <!-- Platform Selector Pills -->
        <div class="social-platform-selector" role="group" aria-labelledby="${labelId}">
          <span class="social-selector-label">Chọn nền tảng:</span>
          <div class="social-platform-pills">
            ${SOCIAL_CHANNELS.map((channel) => {
              const index = drafts.findIndex(
                (social) => social.platform === channel.platform,
              );
              const isSelected = index >= 0;
              const isVerified = isSelected && Boolean(drafts[index].verified);
              return `<button type="button" class="social-platform-pill${isSelected ? " selected" : ""}${isVerified ? " verified" : ""}" data-social-toggle="${safe(channel.platform)}" aria-pressed="${isSelected}">
                <span class="platform-pill-icon">${socialPlatformIcon(channel.platform, 18)}</span>
                <span class="platform-pill-name">${safe(channel.platform)}</span>
                ${isSelected ? '<span class="platform-pill-status check">✓</span>' : '<span class="platform-pill-status add">+</span>'}
              </button>`;
            }).join("")}
          </div>
        </div>
      </div>

      <!-- Manual URL Input Fields -->
      <div class="social-manual-fields" aria-live="polite">
        ${drafts.map((social, index) => {
          const isVerified = Boolean(social.verified);
          const inputId = `${prefix}-social-link-${index}`;
          const platformLower = String(social.platform || "").toLowerCase();
          const followersCount = Number(social.followers || 0);

          return `<div class="social-manual-field ${platformLower}">
            <div class="social-manual-field-header">
              <div class="social-card-brand">
                <span class="social-brand-logo">${socialPlatformIcon(social.platform, 20)}</span>
                <span class="social-brand-name">${safe(social.platform)}</span>
                <span class="social-role-badge ${index === 0 ? "primary" : "secondary"}">
                  ${index === 0 ? (isVerified ? "Kênh chính · Đã xác minh" : safe(primaryLabel)) : "Kênh phụ"}
                </span>
              </div>
              <div class="social-manual-header-right">
                ${isVerified ? `
                  <span class="social-manual-verified-pill">✓ Đã xác thực · ${followersCount.toLocaleString("vi-VN")} fl</span>
                ` : ""}
                <button type="button" class="btn-unlink-channel" data-social-toggle="${safe(social.platform)}" title="Gỡ ${safe(social.platform)} khỏi danh sách">
                  ✕ Gỡ kênh
                </button>
              </div>
            </div>
            <div class="social-manual-input-row">
              <input 
                id="${inputId}" 
                type="url" 
                inputmode="url" 
                autocomplete="url" 
                class="social-manual-input" 
                data-social-link 
                data-platform="${safe(social.platform)}" 
                value="${safe(social.handle || "")}" 
                placeholder="${safe(socialChannelPlaceholder(social.platform))}" 
                maxlength="300">
            </div>
            <div class="social-manual-hint">
              Đường link trang cá nhân (Ví dụ: <code>${safe(socialChannelPlaceholder(social.platform))}</code>)
            </div>
            ${reviewRequired ? `<div class="field">
              <label for="${inputId}-followers">Số người theo dõi ${safe(social.platform)}${index === 0 ? ' (kênh chính)' : ''}</label>
              <input id="${inputId}-followers" data-social-followers data-platform="${safe(social.platform)}" data-integer-input type="text" inputmode="numeric"
                min="${index === 0 ? 1000 : 0}" max="2000000000" step="1" required value="${safe(social.followers ?? '')}" placeholder="${index === 0 ? '1.000' : '0'}">
              <p class="hint">${index === 0 ? 'Kênh chính tối thiểu 1.000 người theo dõi. ' : ''}Thay đổi chỉ có hiệu lực sau khi admin duyệt.</p>
            </div>` : ''}
          </div>`;
        }).join("") || '<div class="social-cards-empty">Chưa có kênh nào được chọn. Hãy bấm vào các nút nền tảng phía trên để dán link hồ sơ.</div>'}
      </div>
    </section>`;
  }

  // Beta Auto Mode
  return `<section class="social-channel-picker" aria-labelledby="${labelId}">
    ${modeSwitcherHtml}

    <!-- 1. Header & Dashboard Overview -->
    <div class="social-dashboard-overview">
      <div class="social-overview-header">
        <div class="social-overview-title-wrap">
          <h3 id="${labelId}" class="social-overview-title">Liên kết các kênh mạng xã hội</h3>
          <p class="social-overview-desc">Kết nối tài khoản mạng xã hội để xác minh thông tin hồ sơ và thống kê kênh của bạn.</p>
        </div>
        <div class="social-overview-stats">
          <div class="social-stat-badge-group">
            <span class="social-count-pill" aria-label="${verifiedCount} trên ${MAX_SOCIAL_CHANNELS} kênh đã liên kết">
              <span class="social-count-dot ${verifiedCount > 0 ? "active" : ""}">●</span>
              <strong>${verifiedCount}/${MAX_SOCIAL_CHANNELS}</strong> kênh đã liên kết
            </span>
            ${verifiedCount > 0 ? `
              <span class="social-total-fl-pill">
                <strong>${totalVerifiedFollowers.toLocaleString("vi-VN")}</strong> người theo dõi
              </span>
              <span class="social-eligibility-badge ${isOverallEligible ? "eligible" : "ineligible"}">
                ${isOverallEligible ? "✓ Đủ điều kiện" : "⚠ Chưa đạt yêu cầu"}
              </span>
            ` : ""}
          </div>
          <div class="social-progress-bar-bg" title="Tiến độ liên kết: ${verifiedCount}/${MAX_SOCIAL_CHANNELS} kênh">
            <div class="social-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
        </div>
      </div>

      <!-- 2. Platform Selector Pills -->
      <div class="social-platform-selector" role="group" aria-labelledby="${labelId}">
        <span class="social-selector-label">Chọn nền tảng:</span>
        <div class="social-platform-pills">
          ${SOCIAL_CHANNELS.map((channel) => {
            const index = drafts.findIndex(
              (social) => social.platform === channel.platform,
            );
            const isSelected = index >= 0;
            const isVerified = isSelected && Boolean(drafts[index].verified);
            return `<button type="button" class="social-platform-pill${isSelected ? " selected" : ""}${isVerified ? " verified" : ""}" data-social-toggle="${safe(channel.platform)}" aria-pressed="${isSelected}">
              <span class="platform-pill-icon">${socialPlatformIcon(channel.platform, 18)}</span>
              <span class="platform-pill-name">${safe(channel.platform)}${
                isPlatformPendingApproval(channel.platform)
                  ? ' <span class="platform-pill-pending-tag" style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:4px;font-weight:600;margin-left:2px">Chờ duyệt</span>'
                  : ''
              }</span>
              ${isVerified ? '<span class="platform-pill-status dot" title="Đã liên kết">●</span>' : isSelected ? '<span class="platform-pill-status check">✓</span>' : '<span class="platform-pill-status add">+</span>'}
            </button>`;
          }).join("")}
        </div>
      </div>
    </div>

    <!-- 3. Social Account Cards -->
    <div class="social-cards-container" aria-live="polite">
      ${drafts.map((social, index) => {
        const isVerified = Boolean(social.verified);
        const inputId = `${prefix}-social-link-${index}`;
        const followersCount = Number(social.followers || 0);
        const isEligible = isVerified && followersCount >= 1000;
        const isIneligible = isVerified && followersCount < 1000;
        const isLocked = !isVerified && isPlatformPendingApproval(social.platform);

        const isPersonal = Boolean(
          social.isPersonalAccount ||
          (isVerified && followersCount === 0 && (social.platform === "Facebook" || social.platform === "Instagram"))
        );

        const handleUrl = socialProfileUrl(social) || String(social.handle || "").trim();
        const platformLower = String(social.platform || "").toLowerCase();

        return `<div class="social-account-card ${platformLower} ${isVerified ? (isEligible ? "verified-eligible" : "verified-ineligible") : "unconnected"}${isLocked ? " is-pending-approval" : ""}">
          <input type="hidden" id="${inputId}" data-social-link data-platform="${safe(social.platform)}" value="${safe(handleUrl)}">
          
          <!-- Card Header -->
          <div class="social-card-header">
            <div class="social-card-brand">
              <span class="social-brand-logo">${socialPlatformIcon(social.platform, 22)}</span>
              <span class="social-brand-name">${safe(social.platform)}${
                isLocked
                  ? ' <span class="social-card-pending-badge" style="font-size:11px;font-weight:600;color:#92400e;background:#fef3c7;padding:1px 6px;border-radius:4px;border:1px solid #fde68a;margin-left:4px">🔒 Chờ duyệt</span>'
                  : ''
              }</span>
              <span class="social-role-badge ${index === 0 ? "primary" : "secondary"}">
                ${index === 0 ? (isVerified ? "Kênh chính · Đã liên kết" : safe(primaryLabel)) : "Kênh phụ"}
              </span>
            </div>
            <div class="social-card-header-actions">
              <button type="button" class="btn-unlink-channel" data-social-toggle="${safe(social.platform)}" title="Gỡ ${safe(social.platform)} khỏi danh sách">
                ✕ Gỡ kênh
              </button>
            </div>
          </div>

          <!-- Card Body -->
          <div class="social-card-body">
            ${isVerified ? `
              <!-- Connected Account State -->
              <div class="social-connected-layout">
                <!-- Left: Account Details & Text Link -->
                <div class="social-account-details">
                  <div class="social-avatar-container">
                    ${social.avatarUrl ? `
                      <img src="${safe(social.avatarUrl)}" alt="${safe(social.displayName || social.platform)}" class="social-avatar-image" referrerpolicy="no-referrer" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                    ` : ""}
                    <div class="social-avatar-fallback" style="${social.avatarUrl ? 'display:none' : 'display:flex'}">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                  </div>
                  <div class="social-account-text">
                    <div class="social-account-name-row">
                      <strong class="social-account-display-name">${safe(social.displayName || social.platform)}</strong>
                      <span class="social-linked-badge">
                        <span class="linked-check">✓</span> Đã liên kết
                      </span>
                    </div>
                    <div class="social-account-link-row">
                      ${handleUrl ? `
                        <a href="${safe(handleUrl)}" target="_blank" rel="noopener noreferrer" class="social-account-text-link" title="Xem trang cá nhân ${safe(social.platform)}">
                          <span class="link-icon">🔗</span>
                          <span class="link-text">${safe(handleUrl)}</span>
                          <svg class="link-external-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                      ` : `<span class="social-account-text-link muted">Chưa có đường dẫn hồ sơ</span>`}
                    </div>
                  </div>
                </div>

                <!-- Right: Follower Stats & Action Buttons -->
                <div class="social-stats-and-actions">
                  <div class="social-stat-metric ${isEligible ? "eligible" : "ineligible"}">
                    <div class="stat-metric-top">
                      <span class="stat-metric-label">Số người theo dõi</span>
                      <span class="stat-metric-badge ${isEligible ? "eligible" : "ineligible"}">
                        ${isEligible ? "✓ Đủ điều kiện" : "⚠ Chưa đạt yêu cầu"}
                      </span>
                    </div>
                    <div class="stat-metric-value">${followersCount.toLocaleString("vi-VN")}</div>
                    <div class="stat-metric-help">
                      ${isEligible
                        ? "Đạt yêu cầu tối thiểu (≥ 1.000 người theo dõi)"
                        : `Hiện có ${followersCount.toLocaleString("vi-VN")} người theo dõi. Yêu cầu tối thiểu: 1.000 người theo dõi.`}
                    </div>
                  </div>
                  <div class="social-card-btn-group">
                    <button type="button" class="btn-card-action reauth" data-social-oauth="${safe(social.platform)}" title="Bấm để đồng bộ lại số liệu mới nhất">
                      <span class="btn-icon">↺</span> Đồng bộ lại
                    </button>
                    ${handleUrl ? `
                      <a href="${safe(handleUrl)}" target="_blank" rel="noopener noreferrer" class="btn-card-action secondary" title="Xem trang cá nhân trong tab mới">
                        ↗ Xem hồ sơ
                      </a>
                    ` : ""}
                    <button type="button" class="btn-card-action danger" data-social-toggle="${safe(social.platform)}" title="Gỡ kênh ${safe(social.platform)} khỏi hồ sơ">
                      ✕ Gỡ kênh
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Unconnected State -->
              <div class="social-unconnected-layout">
                <div class="social-unconnected-info">
                  <div class="social-unconnected-heading">${
                    isLocked
                      ? `Kênh ${safe(social.platform)} (Đang chờ nền tảng xét duyệt)`
                      : `Chưa kết nối tài khoản ${safe(social.platform)}`
                  }</div>
                  <p class="social-unconnected-subtext">${
                    isLocked
                      ? `Tính năng kết nối tự động với ${safe(social.platform)} đang chờ nền tảng xét duyệt. Bạn vui lòng chuyển sang tab <a href="javascript:void(0)" data-switch-to-manual style="color:var(--primary);font-weight:600;text-decoration:underline;">"Nhập link thủ công"</a> ở trên để liên kết kênh ngay.`
                      : `Kết nối tài khoản ${safe(social.platform)} để hệ thống tự động đồng bộ liên kết hồ sơ và số lượng người theo dõi.`
                  }</p>
                </div>
                <div class="social-unconnected-actions">
                  ${isLocked ? `
                    <button type="button" class="btn-card-action locked" disabled aria-disabled="true" title="Tính năng kết nối tự động với ${safe(social.platform)} đang chờ nền tảng xét duyệt">
                      <span class="btn-icon">🔒</span> Đang chờ duyệt
                    </button>
                  ` : `
                    <button type="button" class="btn-card-action connect-primary" data-social-oauth="${safe(social.platform)}" title="Bấm để kết nối tài khoản ${safe(social.platform)}">
                      Kết nối ${safe(social.platform)}
                    </button>
                  `}
                </div>
              </div>
            `}
          </div>

          <!-- Information / Warning Callout (Small, elegant card) -->
          ${isPersonal ? `
            <div class="social-info-callout">
              <div class="info-callout-header">
                <span class="info-callout-icon">💡</span>
                <strong>Lưu ý về hiển thị người theo dõi ${safe(social.platform)}</strong>
              </div>
              <p class="info-callout-desc">
                ${social.platform === "Instagram"
                  ? "Tài khoản Instagram cá nhân thông thường có thể giới hạn hiển thị số người theo dõi. Bạn có thể chuyển sang Tài khoản chuyên nghiệp (Creator / Business) để hệ thống tự động cập nhật số followers."
                  : "Trang cá nhân Facebook thông thường có thể giới hạn hiển thị người theo dõi công khai. Bạn có thể bật Chế độ chuyên nghiệp (Professional Mode) trên trang cá nhân để hệ thống đồng bộ đúng số followers."}
              </p>
              <div class="info-callout-steps">
                <span class="steps-heading">👉 Cách thực hiện nhanh:</span>
                <ol>
                  ${social.platform === "Instagram" ? `
                    <li>Mở ứng dụng <strong>Instagram</strong> &gt; Vào <strong>Trang cá nhân</strong>.</li>
                    <li>Bấm menu <strong>3 gạch (☰)</strong> &gt; Chọn <strong>Cài đặt và quyền riêng tư</strong>.</li>
                    <li>Chọn <strong>Loại tài khoản và công cụ</strong> &gt; Chọn <strong>Chuyển sang tài khoản chuyên nghiệp</strong>.</li>
                    <li>Sau đó quay lại đây bấm <strong>↺ Đồng bộ lại</strong>.</li>
                  ` : `
                    <li>Mở ứng dụng <strong>Facebook</strong> &gt; Vào <strong>Trang cá nhân</strong> của bạn.</li>
                    <li>Bấm vào nút <strong>dấu 3 chấm (...)</strong> cạnh nút Chỉnh sửa trang cá nhân.</li>
                    <li>Chọn <strong>Bật chế độ chuyên nghiệp (Turn on Professional Mode)</strong> &gt; Bấm Bật.</li>
                    <li>Sau đó quay lại đây bấm <strong>↺ Đồng bộ lại</strong> để hệ thống cập nhật đúng số followers.</li>
                  `}
                </ol>
              </div>
            </div>
          ` : ""}
        </div>`;
      }).join("") || '<div class="social-cards-empty">Chưa có kênh mạng xã hội nào được chọn. Hãy bấm vào các nút nền tảng phía trên để liên kết tài khoản.</div>'}
    </div>
  </section>`;
}

