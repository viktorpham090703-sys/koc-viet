import { api, post } from "./api.js";
import {
  toast,
  spinner,
  esc,
  passwordInputHtml,
  bindPasswordToggles,
  confirmDialog,
  copyToClipboard,
} from "./ui.js";
import { renderKoc } from "./koc.js";
import { renderBusiness } from "./business.js";
import { renderAdmin } from "./admin.js";
import { renderPartner } from "./partner.js";
import { renderKocProfile, renderMarketplacePublic } from "./public.js";
import { LANDING_ROUTES, renderLandingBody } from "./landing/pages.js";
import { bindLandingEvents } from "./landing/shared.js";
import { autoAnimate } from "./animations.js";
import {
  disconnectPwaNotifications,
  initializePwa,
  setPwaAuthenticated,
} from "./pwa.js";

export const state = { user: null, config: null };
const appEl = document.getElementById("app");
const PARTNER_INVITE_STORAGE = "koc-viet:partner-invite";

const partnerInviteHash = (token) =>
  `#/tham-gia-doi-tac/${encodeURIComponent(String(token || ""))}`;

window.onerror = (m) => {
  console.error(m);
};

async function boot() {
  try {
    state.config = await api("/api/config");
  } catch (_) {
    state.config = { tiers: [], categories: [], provinces: [] };
  }
  try {
    const r = await api("/api/me");
    state.user = r.user;
  } catch (_) {
    state.user = null;
  }
  initializePwa({ authenticated: Boolean(state.user) });
  route();
}

export function navigate(hash) {
  location.hash = hash;
}

// Set location.hash and route exactly once: the browser only fires 'hashchange' when the
// hash actually changes, so we must call route() ourselves ONLY in the no-op case — calling
// it unconditionally here would double-fire route() (once now, once again async via the
// hashchange listener), racing two concurrent renders against the same appEl.innerHTML.
function goHash(newHash) {
  const changed = location.hash !== newHash;
  location.hash = newHash;
  if (!changed) route();
}

function showLogoutTransition() {
  const root = document.getElementById("modal-root");
  if (!root) return;
  root.innerHTML = `<div class="logout-transition-backdrop" role="status" aria-live="polite">
    <div class="logout-transition-card">
      <div class="logout-transition-logo-wrap" aria-hidden="true">
        <img class="logout-transition-logo" src="/images/koc-viet-app-icon.png" alt="">
      </div>
      <div class="logout-transition-spinner" aria-hidden="true"></div>
      <strong>Đang đăng xuất…</strong>
      <span>Vui lòng chờ trong giây lát</span>
    </div>
  </div>`;
}

export async function logout(options = {}) {
  if (!options?.skipConfirmation) {
    const confirmed = await confirmDialog(
      "Bạn có chắc chắn muốn đăng xuất không?",
      {
        title: "Xác nhận đăng xuất",
        confirmText: "Đăng xuất",
        cancelText: "Hủy",
        tone: "danger",
      },
    );
    if (!confirmed) return false;
  }

  showLogoutTransition();
  await disconnectPwaNotifications();
  try {
    await post("/api/logout");
  } catch (_) {}
  state.user = null;
  setPwaAuthenticated(false);
  const modalRoot = document.getElementById("modal-root");
  if (modalRoot?.querySelector(".logout-transition-backdrop")) {
    modalRoot.innerHTML = "";
  }
  goHash("#/login");
  return true;
}

async function route() {
  // 8 public marketing landing pages — render regardless of auth state. A direct visit to a
  // clean path like "/koc" may arrive here as pathname "/koc" OR get rewritten upstream into
  // hash "#/koc" (platform-dependent) — handle both so the page is reachable either way.
  const landingPath = location.hash
    ? location.hash.slice(1)
    : location.pathname;
  if (LANDING_ROUTES.includes(landingPath)) {
    appEl.innerHTML = renderLandingBody(landingPath);
    bindLandingEvents(appEl);
    autoAnimate(appEl);
    return;
  }
  if (
    !state.user &&
    !location.hash &&
    (location.pathname === "/" || location.pathname === "")
  ) {
    appEl.innerHTML = renderLandingBody("/trang-chu");
    bindLandingEvents(appEl);
    autoAnimate(appEl);
    return;
  }
  const hash = location.hash || "#/";
  // public routes (no auth)
  if (hash.startsWith("#/koc/")) {
    return renderKocProfile(appEl, hash.split("/")[2]);
  }
  if (hash === "#/explore" || hash.startsWith("#/explore?")) {
    return renderMarketplacePublic(appEl);
  }
  if (hash === "#/aiclone-landing") {
    return renderAiCloneLanding(appEl);
  }
  if (hash === "#/tuyen-koc") {
    return renderRecruitLanding(appEl);
  }
  if (hash === "#/business-register") {
    const { renderBusinessRegister } = await import("./business-register.js");
    return renderBusinessRegister(appEl);
  }
  if (hash === "#/forgot-password") {
    return renderForgotPassword(appEl);
  }
  if (hash.startsWith("#/tham-gia-doi-tac/")) {
    let token = "";
    try {
      token = decodeURIComponent(hash.slice("#/tham-gia-doi-tac/".length));
    } catch (_) {}
    return renderPartnerInvite(appEl, token);
  }

  if (!state.user) {
    return renderLogin();
  }

  if (state.user.role === "koc") {
    await renderKoc(appEl, hash);
    return;
  }
  if (state.user.role === "business") {
    await renderBusiness(appEl, hash);
    enhancePortal();
    return;
  }
  if (state.user.role === "partner") {
    await renderPartner(appEl, hash);
    enhancePortal();
    return;
  }
  if (state.user.role === "admin") {
    await renderAdmin(appEl, hash);
    enhancePortal();
    return;
  }
  renderLogin();
}

// Additive mobile/tablet enhancement for the Admin & Business portals: inject a hamburger
// button into the topbar + a scrim, wiring them to slide the existing .sidebar as a drawer.
// Pure DOM decoration — does not touch any business logic or existing markup structure.
export function enhancePortal() {
  const portal = appEl.querySelector(".portal");
  if (!portal) return;
  const topbar = portal.querySelector(".topbar");
  const sidebar = portal.querySelector(".sidebar");
  if (!topbar || !sidebar) return;
  if (!topbar.querySelector(".portal-burger")) {
    const burger = document.createElement("button");
    burger.className = "portal-burger";
    burger.setAttribute("aria-label", "Menu");
    burger.setAttribute("aria-expanded", "false");
    if (!sidebar.id) sidebar.id = `portal-sidebar-${state.user?.role || "user"}`;
    burger.setAttribute("aria-controls", sidebar.id);
    burger.textContent = "☰";
    const close = () => {
      sidebar.classList.remove("open");
      portal.classList.remove("drawer-open");
      burger.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      sidebar.classList.add("open");
      portal.classList.add("drawer-open");
      burger.setAttribute("aria-expanded", "true");
    };
    burger.addEventListener("click", () =>
      sidebar.classList.contains("open") ? close() : open(),
    );
    topbar.insertBefore(burger, topbar.firstChild);
    const scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "portal-scrim";
    scrim.setAttribute("aria-label", "Đóng menu");
    scrim.addEventListener("click", close);
    portal.appendChild(scrim);
    // Close the drawer after picking a nav item (mobile)
    sidebar.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
    portal.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar.classList.contains("open")) {
        close();
        burger.focus();
      }
    });
  }
}
window.addEventListener("hashchange", route);
window.addEventListener("popstate", route);
// Intercept clicks on links to the 8 marketing pages so navigating between them (and back to
// the app) doesn't force a full reload — pure additive behavior, only for those exact hrefs.
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a");
  if (!a) return;
  const href = a.getAttribute("href") || "";
  if (LANDING_ROUTES.includes(href)) {
    e.preventDefault();
    history.pushState(null, "", href);
    route();
  }
});

async function renderLogin() {
  appEl.innerHTML = `
  <div class="auth auth-login">
    <div class="auth-login-shell">
      <a href="/trang-chu" class="auth-home-link" aria-label="Về trang chủ"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9.5 19v-5h5v5"/></svg><span>Trang chủ</span></a>
      <section class="auth-intro" aria-label="Giới thiệu KOC Việt">
        <span class="auth-eyebrow">NỀN TẢNG BOOKING KOC / KOL</span>
        <h1>Kết nối đúng KOC.<br><span>Tạo nên chiến dịch hiệu quả.</span></h1>
        <p>Tìm kiếm, booking và quản lý chiến dịch trên một nền tảng minh bạch, chuyên nghiệp.</p>
        <div class="auth-benefits">
          <div><span>✓</span><p><b>Hệ sinh thái đa dạng</b><small>Kết nối KOC/KOL trên toàn quốc</small></p></div>
          <div><span>✓</span><p><b>Chi phí minh bạch</b><small>Dễ dàng lựa chọn theo ngân sách</small></p></div>
          <div><span>✓</span><p><b>Quản lý tập trung</b><small>Theo dõi tiến độ ngay trên nền tảng</small></p></div>
        </div>
      </section>
      <div class="auth-card">
      <div class="logo" style="text-align:center;margin-bottom:4px">KOC<span> Viet</span></div>
      <form id="li-form">
        <div class="field"><label for="li-email">Email</label><input id="li-email" name="email" type="email" autocomplete="username" placeholder="Nhập địa chỉ email" required></div>
        <div class="field"><div class="auth-label-row"><label for="li-pass">Mật khẩu</label><a href="#/forgot-password">Quên mật khẩu?</a></div>${passwordInputHtml("li-pass", 'name="password" autocomplete="current-password" placeholder="Nhập mật khẩu" required')}</div>
        <button class="btn primary nv-lift" id="li-btn" type="submit">Đăng nhập <span aria-hidden="true">→</span></button>
      </form>
      <div class="auth-quick-links">
        <a href="#/explore" class="btn ghost sm">Khám phá KOC</a>
        <a href="#/tuyen-koc" class="btn ghost sm">Trở thành KOC</a>
        <a href="#/business-register" class="btn ghost sm auth-business-register">Đăng ký doanh nghiệp</a>
      </div>
    </div>
    </div>
  </div>`;
  bindPasswordToggles(appEl);
  document.getElementById("li-form").addEventListener("submit", (event) => {
    event.preventDefault();
    doLogin();
  });
}

async function doLogin() {
  const btn = document.getElementById("li-btn");
  const email = document.getElementById("li-email").value;
  const password = document.getElementById("li-pass").value;
  btn.disabled = true;
  btn.textContent = "Đang đăng nhập…";
  try {
    const r = await post("/api/login", { email, password });
    state.user = r.user;
    setPwaAuthenticated(true);
    toast("Xin chào " + r.user.name, "ok");
    const inviteToken = sessionStorage.getItem(PARTNER_INVITE_STORAGE);
    if (inviteToken) {
      sessionStorage.removeItem(PARTNER_INVITE_STORAGE);
      if (r.user.role === "koc") {
        goHash(partnerInviteHash(inviteToken));
        return;
      }
    }
    goHash(
      r.user.role === "koc"
        ? "#/home"
        : r.user.role === "partner" && r.user.must_change_password
          ? "#/profile"
          : "#/dashboard",
    );
  } catch (e) {
    toast(e.message, "err");
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
  }
}

async function renderPartnerInvite(el, token) {
  if (!token) {
    el.innerHTML = partnerInviteMessage(
      "Liên kết không hợp lệ",
      "Liên kết mời bị thiếu thông tin. Hãy nhờ đối tác gửi lại đường dẫn mới.",
    );
    return;
  }

  el.innerHTML = `<div class="partner-invite-page"><div class="partner-invite-card partner-invite-loading">${spinner()}</div></div>`;
  let preview;
  try {
    preview = await post("/api/partner-invite/preview", { token });
  } catch (error) {
    el.innerHTML = partnerInviteMessage(
      "Liên kết không còn hiệu lực",
      error.message || "Hãy nhờ đối tác gửi lại đường dẫn mời mới.",
    );
    return;
  }

  const partner = preview.partner || {};
  const membership = preview.membership;
  const initial = esc(String(partner.name || "Đ").charAt(0).toUpperCase());
  let actionHtml = "";
  if (!state.user) {
    actionHtml = `<div class="partner-invite-actions">
      <button class="btn primary" type="button" data-invite-login>Đăng nhập để tham gia</button>
      <button class="btn ghost" type="button" data-invite-register>Đăng ký tài khoản KOC</button>
    </div>`;
  } else if (state.user.role !== "koc") {
    actionHtml = `<div class="partner-invite-notice warning">Tài khoản hiện tại không phải tài khoản KOC. Vui lòng đăng xuất và đăng nhập bằng tài khoản KOC để tham gia.</div>
      <button class="btn ghost" type="button" data-invite-logout>Đăng xuất</button>`;
  } else if (membership?.samePartner) {
    actionHtml = `<div class="partner-invite-notice success">Bạn ${membership.status === "pending" ? "đã đăng ký qua lời mời này và đang chờ duyệt" : "đã thuộc đối tác này"}.</div>
      <a class="btn primary" href="#/home">Về trang chủ KOC</a>`;
  } else if (membership) {
    actionHtml = `<div class="partner-invite-notice warning">Bạn đang thuộc đối tác <b>${esc(membership.partnerName)}</b>. Liên kết mời không thể tự động chuyển đối tác; vui lòng liên hệ quản trị viên nếu cần thay đổi.</div>
      <a class="btn ghost" href="#/home">Về trang chủ KOC</a>`;
  } else {
    actionHtml = `<div class="partner-invite-actions">
      <button class="btn primary" type="button" data-invite-accept>Tham gia đối tác này</button>
      <a class="btn ghost" href="#/home">Để sau</a>
    </div>`;
  }

  el.innerHTML = `<div class="partner-invite-page">
    <section class="partner-invite-card" aria-labelledby="partner-invite-title">
      <a class="partner-invite-brand" href="/trang-chu" aria-label="KOC Việt">
        <img src="/images/koc-viet-logo.png" alt="" width="46" height="46"><strong>KOC VIỆT</strong>
      </a>
      <div class="partner-invite-avatar">${partner.avatar ? `<img src="${esc(partner.avatar)}" alt="Ảnh đại diện ${esc(partner.name)}">` : initial}</div>
      <span class="partner-invite-eyebrow">LỜI MỜI HỢP TÁC</span>
      <h1 id="partner-invite-title">${esc(partner.name)}</h1>
      <p>Mời bạn tham gia đội ngũ KOC của đối tác trên KOC Việt. Việc tham gia không làm thay đổi thu nhập booking của bạn.</p>
      ${actionHtml}
      <button class="partner-invite-copy" type="button" data-invite-copy>🔗 Sao chép liên kết này</button>
    </section>
  </div>`;

  el.querySelector("[data-invite-copy]")?.addEventListener("click", async () => {
    const copied = await copyToClipboard(location.href);
    toast(copied ? "Đã sao chép liên kết" : "Không thể sao chép liên kết", copied ? "ok" : "err");
  });
  el.querySelector("[data-invite-login]")?.addEventListener("click", () => {
    sessionStorage.setItem(PARTNER_INVITE_STORAGE, token);
    goHash("#/login");
  });
  el.querySelector("[data-invite-register]")?.addEventListener("click", async () => {
    sessionStorage.setItem(PARTNER_INVITE_STORAGE, token);
    const { renderOnboarding } = await import("./onboard.js");
    renderOnboarding(el, {
      partnerInviteToken: token,
      partnerName: partner.name,
      cancelHash: partnerInviteHash(token),
    });
  });
  el.querySelector("[data-invite-logout]")?.addEventListener("click", logout);
  el.querySelector("[data-invite-accept]")?.addEventListener("click", async (event) => {
    // currentTarget is cleared after an awaited dialog; capture it synchronously.
    const button = event.currentTarget;
    const accepted = await confirmDialog(
      `Bạn có chắc chắn muốn tham gia đội KOC của ${partner.name}?`,
      { title: "Xác nhận tham gia", confirmText: "Tham gia", cancelText: "Hủy" },
    );
    if (!accepted) return;
    button.disabled = true;
    button.textContent = "Đang tham gia…";
    try {
      await post("/api/partner-invite/accept", { token });
      sessionStorage.removeItem(PARTNER_INVITE_STORAGE);
      toast(`Bạn đã tham gia đối tác ${partner.name}`, "ok");
      renderPartnerInvite(el, token);
    } catch (error) {
      toast(error.message, "err");
      button.disabled = false;
      button.textContent = "Tham gia đối tác này";
    }
  });
}

function partnerInviteMessage(title, message) {
  return `<div class="partner-invite-page"><section class="partner-invite-card">
    <a class="partner-invite-brand" href="/trang-chu"><img src="/images/koc-viet-logo.png" alt="" width="46" height="46"><strong>KOC VIỆT</strong></a>
    <div class="partner-invite-avatar">!</div><h1>${esc(title)}</h1><p>${esc(message)}</p>
    <a class="btn primary" href="/trang-chu">Về trang chủ</a>
  </section></div>`;
}

// ---- Forgot / reset password (email OTP, no auth required) ----
function renderForgotPassword(el) {
  let stage = "email"; // 'email' -> 'reset' -> 'done'
  let email = "";
  const setErr = (id, msg) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.textContent = msg || "";
    e.style.display = msg ? "block" : "none";
  };

  function renderEmailStage() {
    el.innerHTML = `<div class="auth auth-forgot-password"><div class="auth-card">
      <div class="logo" style="text-align:center;margin-bottom:4px">KOC<span> Viet</span></div>
      <h2 style="text-align:center;margin-bottom:14px">Quên mật khẩu</h2>
      <p class="muted" style="text-align:center;margin-bottom:14px">Nhập email đã đăng ký để nhận mã đặt lại mật khẩu.</p>
      <div class="field"><label>Email</label><input id="fp-email" type="email" value="${esc(email)}" placeholder="email@domain.com"></div>
      <div class="err" id="fp-email-err" style="display:none"></div>
      <button class="btn primary" id="fp-send" style="margin-top:10px">Gửi mã đặt lại</button>
      <div class="row" style="margin-top:14px"><a href="#/login" class="muted" style="font-size:12px;text-align:center;width:100%">← Quay lại đăng nhập</a></div>
    </div></div>`;
    document.getElementById("fp-send").addEventListener("click", async () => {
      const v = document.getElementById("fp-email").value.trim();
      setErr("fp-email-err", "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setErr("fp-email-err", "Email không hợp lệ");
        return;
      }
      const btn = document.getElementById("fp-send");
      btn.disabled = true;
      btn.textContent = "Đang gửi…";
      try {
        const result = await post("/api/forgot-password", { email: v });
        if (!result.sent) throw new Error("Chưa gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.");
        email = v;
        toast("Mã đặt lại đã được gửi", "ok");
        stage = "reset";
        render();
      } catch (e) {
        toast(e.message, "err");
        btn.disabled = false;
        btn.textContent = "Gửi mã đặt lại";
      }
    });
  }
  function renderResetStage() {
    el.innerHTML = `<div class="auth auth-forgot-password"><div class="auth-card">
      <div class="logo" style="text-align:center;margin-bottom:4px">KOC<span> Viet</span></div>
      <h2 style="text-align:center;margin-bottom:14px">Đặt lại mật khẩu</h2>
      <p class="muted" style="text-align:center;margin-bottom:14px">Nhập mã đã gửi tới <b>${esc(email)}</b> và mật khẩu mới.</p>
      <div class="field"><label>Mã xác thực</label><input id="fp-code" class="otp-in" maxlength="6" placeholder="••••••"></div>
      <div class="err" id="fp-code-err" style="display:none"></div>
      <div class="field"><label>Mật khẩu mới</label>${passwordInputHtml("fp-pass", 'minlength="8" maxlength="128" placeholder="Tối thiểu 8 ký tự"')}</div>
      <div class="err" id="fp-pass-err" style="display:none"></div>
      <div class="field"><label>Xác nhận mật khẩu</label>${passwordInputHtml("fp-pass2")}</div>
      <div class="err" id="fp-pass2-err" style="display:none"></div>
      <button class="btn primary" id="fp-reset" style="margin-top:6px">Đặt lại mật khẩu</button>
      <div class="row" style="gap:8px;margin-top:10px">
        <button type="button" class="btn ghost sm" id="fp-resend" style="flex:1">Gửi lại mã</button>
        <button type="button" class="btn ghost sm" id="fp-back" style="flex:1">← Nhập lại email</button>
      </div>
    </div></div>`;
    bindPasswordToggles(el);
    document.getElementById("fp-back").addEventListener("click", () => {
      stage = "email";
      render();
    });
    document.getElementById("fp-resend").addEventListener("click", async () => {
      const btn = document.getElementById("fp-resend");
      btn.disabled = true;
      try {
        const result = await post("/api/forgot-password", { email });
        if (!result.sent) throw new Error("Chưa gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.");
        toast("Mã đặt lại đã được gửi", "ok");
      } catch (e) {
        toast(e.message, "err");
      } finally {
        btn.disabled = false;
      }
    });
    document.getElementById("fp-reset").addEventListener("click", async () => {
      const code = document.getElementById("fp-code").value.trim();
      const pass = document.getElementById("fp-pass").value;
      const pass2 = document.getElementById("fp-pass2").value;
      setErr("fp-code-err", "");
      setErr("fp-pass-err", "");
      setErr("fp-pass2-err", "");
      let ok = true;
      if (!code) {
        setErr("fp-code-err", "Nhập mã xác thực");
        ok = false;
      }
      if (!pass || pass.length < 8) {
        setErr("fp-pass-err", "Mật khẩu tối thiểu 8 ký tự");
        ok = false;
      }
      if (pass !== pass2) {
        setErr("fp-pass2-err", "Mật khẩu xác nhận không khớp");
        ok = false;
      }
      if (!ok) return;
      const btn = document.getElementById("fp-reset");
      btn.disabled = true;
      btn.textContent = "Đang cập nhật…";
      try {
        await post("/api/reset-password", { email, code, password: pass });
        stage = "done";
        render();
      } catch (e) {
        setErr("fp-code-err", e.message);
        btn.disabled = false;
        btn.textContent = "Đặt lại mật khẩu";
      }
    });
  }
  function renderDoneStage() {
    el.innerHTML = `<div class="auth"><div class="auth-card">
      <div class="empty"><div class="ico"><svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true" style="display:block;margin:0 auto"><circle cx="26" cy="26" r="23" stroke="#22c55e" stroke-width="3"/><path d="m15 26 7 7 15-15" stroke="#22c55e" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 style="margin-top:12px">Đặt lại mật khẩu thành công</h2>
      <p class="muted" style="margin-top:8px">Bạn có thể đăng nhập bằng mật khẩu mới.</p></div>
      <a href="#/login" class="btn primary" style="margin-top:14px">Về trang đăng nhập</a>
    </div></div>`;
  }
  function render() {
    if (stage === "email") return renderEmailStage();
    if (stage === "reset") return renderResetStage();
    return renderDoneStage();
  }
  render();
}

// ---- public landings ----
function shell(inner) {
  return `<div style="max-width:900px;margin:0 auto;min-height:100vh;background:#fff">
    <div class="topbar"><a href="#/login" class="logo" style="font-size:20px">KOC<span style="color:var(--navy)"> Viet</span></a>
      <a href="#/login" class="btn primary sm">Đăng nhập</a></div>${inner}</div>`;
}

async function renderRecruitLanding(el) {
  const { renderOnboarding } = await import("./onboard.js");
  const benefits = [
    [
      "01",
      "Tự đặt giá",
      "Niêm yết mức phí theo ngành hàng và hạng KOC của bạn.",
    ],
    [
      "02",
      "Toàn quyền lựa chọn",
      "Xem brief, sản phẩm và thời hạn trước khi nhận booking.",
    ],
    [
      "03",
      "Thêm thu nhập từ tiếp thị liên kết",
      "Chia sẻ đường dẫn sản phẩm và nhận hoa hồng từ đơn phát sinh.",
    ],
    [
      "04",
      "Ví và đối soát minh bạch",
      "Theo dõi từng khoản thu, trạng thái và lịch sử rút tiền.",
    ],
  ];
  el.innerHTML = `<div class="koc-recruit">
    <header class="koc-recruit-header">
      <div class="koc-recruit-container koc-recruit-header-inner">
        <a href="/trang-chu" class="logo" aria-label="KOC Việt">KOC Việt</a>
        <div class="koc-recruit-header-actions">
          <a href="/trang-chu" class="koc-recruit-back" aria-label="Quay lại trang chủ">
            <span aria-hidden="true">←</span><span>Quay lại trang chủ</span>
          </a>
          <a href="#/login" class="btn primary sm">Đăng nhập</a>
        </div>
      </div>
    </header>

    <main>
      <section class="koc-recruit-hero">
        <div class="koc-recruit-container koc-recruit-hero-grid">
          <div class="koc-recruit-hero-copy">
            <span class="koc-recruit-eyebrow">CỘNG ĐỒNG KOC VIỆT</span>
            <h1>Biến sức ảnh hưởng thành nguồn thu nhập bền vững</h1>
            <p>Chủ động niêm yết bảng giá, chọn booking phù hợp và theo dõi thanh toán minh bạch trên một nền tảng duy nhất.</p>
            <div class="koc-recruit-hero-actions">
              <button class="btn grad nv-lift" id="start-onboard">Bắt đầu đăng ký miễn phí <span aria-hidden="true">→</span></button>
              <a href="#koc-how-it-works" class="koc-recruit-text-link">Xem cách hoạt động</a>
            </div>
            <div class="koc-recruit-trust">
              <span>✓ Đăng ký miễn phí</span>
              <span>✓ Chủ động bảng giá</span>
              <span>✓ Hợp đồng điện tử</span>
            </div>
          </div>
          <div class="koc-recruit-preview" aria-label="Tổng quan quyền lợi KOC">
            <div class="koc-recruit-preview-top">
              <span class="koc-recruit-preview-badge">Tổng quan KOC</span>
              <span class="koc-recruit-live"><i></i> Minh bạch theo thời gian thực</span>
            </div>
            <div class="koc-recruit-earning">
              <span>Thu nhập của bạn</span>
              <strong>Booking + Hoa hồng bán hàng</strong>
              <small>Chủ động kiểm soát từng nguồn thu</small>
            </div>
            <div class="koc-recruit-mini-grid">
              <div><span>Nhận booking</span><b>Tự quyết định</b></div>
              <div><span>Phí dịch vụ</span><b>Niêm yết rõ ràng</b></div>
              <div><span>Đối soát</span><b>Theo từng giao dịch</b></div>
              <div><span>Hỗ trợ</span><b>Từ đội ngũ NetViet</b></div>
            </div>
          </div>
        </div>
      </section>

      <section class="koc-recruit-benefits">
        <div class="koc-recruit-container">
          <div class="koc-recruit-section-head">
            <span>QUYỀN LỢI DÀNH CHO BẠN</span>
            <h2>Làm nội dung theo cách của bạn</h2>
            <p>KOC Việt giúp bạn tập trung vào chất lượng nội dung, còn quy trình booking và thanh toán được chuẩn hóa.</p>
          </div>
          <div class="koc-recruit-benefit-grid">
            ${benefits
              .map(
                (item) => `<article class="koc-recruit-benefit-card">
              <span class="koc-recruit-card-number">${item[0]}</span>
              <h3>${item[1]}</h3><p>${item[2]}</p>
            </article>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="koc-recruit-steps" id="koc-how-it-works">
        <div class="koc-recruit-container">
          <div class="koc-recruit-section-head light">
            <span>BẮT ĐẦU CHỈ VỚI 3 BƯỚC</span>
            <h2>Từ hồ sơ đến booking đầu tiên</h2>
          </div>
          <div class="koc-recruit-step-grid">
            <article><b>1</b><div><h3>Tạo hồ sơ KOC</h3><p>Xác thực email, khai báo kênh mạng xã hội và lĩnh vực nội dung.</p></div></article>
            <article><b>2</b><div><h3>Hoàn tất xác minh</h3><p>Xác minh danh tính, thiết lập bảng giá và ký hợp đồng điện tử.</p></div></article>
            <article><b>3</b><div><h3>Nhận booking</h3><p>Sau khi được duyệt, hồ sơ của bạn xuất hiện trên trang khám phá.</p></div></article>
          </div>
        </div>
      </section>

      <section class="koc-recruit-final">
        <div class="koc-recruit-container koc-recruit-final-box">
          <div><span>SẴN SÀNG BẮT ĐẦU?</span><h2>Xây dựng sự nghiệp KOC cùng KOC Việt</h2>
            <p>Hoàn thiện hồ sơ trong khoảng 15 phút. Bạn có thể chủ động kiểm soát mọi booking.</p></div>
          <button class="btn grad nv-lift" id="start-onboard-bottom">Đăng ký trở thành KOC <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </main>
  </div>`;
  const start = () => renderOnboarding(el);
  document.getElementById("start-onboard").addEventListener("click", start);
  document
    .getElementById("start-onboard-bottom")
    .addEventListener("click", start);

  const revealItems = el.querySelectorAll(
    ".koc-recruit-section-head, .koc-recruit-benefit-card, .koc-recruit-step-grid article, .koc-recruit-final-box",
  );
  revealItems.forEach((item, index) => {
    item.classList.add("koc-recruit-reveal");
    item.style.setProperty(
      "--reveal-delay",
      `${Math.min(index % 4, 3) * 70}ms`,
    );
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px" },
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
}

function renderAiCloneLanding(el) {
  el.innerHTML = shell(`
    <div class="hero-navy" style="border-radius:0;padding:40px 24px">
      <span class="chip on-dark">Dịch vụ cộng thêm</span>
      <h1 style="font-size:30px;margin:12px 0 10px">AI Clone Avatar — NetViet sản xuất video cho bạn</h1>
      <p style="opacity:.85;max-width:540px">Không cần tự quay dựng. NetViet tiếp nhận booking và sản xuất video, sau đó giao cho bạn duyệt và đăng tải. Bạn vẫn nhận phí booking cùng hoa hồng bán hàng như thường.</p>
    </div>
    <div class="content">
      <div class="card"><h3>Quyền lợi</h3>
        <ul style="margin:10px 0 0 18px;color:#444;line-height:2">
          <li>Không cần tự sản xuất content — tiết kiệm thời gian</li>
          <li>NetViet booking trực tiếp, giá theo bảng niêm yết của bạn</li>
          <li>Nhận video thành phẩm, chỉ cần đăng bài + nộp link</li>
          <li>Thu nhập: 95% phí booking + hoa hồng bán hàng</li>
        </ul>
        <p class="muted" style="margin-top:14px">Đăng nhập tài khoản KOC đã kích hoạt để đăng ký tham gia tại tab tương ứng.</p>
        <a href="#/login" class="btn primary" style="margin-top:12px;max-width:220px">Đăng nhập để đăng ký</a>
      </div>
    </div>`);
}

window.addEventListener("popstate", route);
window.addEventListener("hashchange", route);

boot();
