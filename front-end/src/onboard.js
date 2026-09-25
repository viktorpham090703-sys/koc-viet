import { priceDescriptionField } from "./price-description.js";
import { get, post } from "./api.js";
import { registrationAgeError } from "./registration-age.js";
import { openIdentityCamera } from "./identity-camera.js";
import { money, num, esc, toast, modal, closeModal, confirmDialog, copyToClipboard } from "./ui.js";
import { parseIntegerInput, bindIntegerInputs } from "./number-input.js";
import { bindProvincePicker } from "./province-picker.js";
import "./province-picker.css";
import { state } from "./app.js";
import {
  bankPickerHtml,
  bindBankPicker,
  selectedPayoutBank,
} from "./payout-banks.js";
import {
  MAX_SOCIAL_CHANNELS,
  normalizeSocialDrafts,
  isValidSocialUrl,
  socialChannelPickerHtml,
  isPlatformPendingApproval,
} from "./social-channels.js";

const MIN_KOC_REGISTRATION_FOLLOWERS = 1_000;

// Multi-step KOC onboarding funnel → "chờ duyệt"
// Steps: 0 Email & OTP · 1 Hồ sơ · 2 Phân hạng & Bảng giá · 3 eKYC & Thanh toán · 4 Hợp đồng · 5 Hoàn tất
export async function renderOnboarding(el, options = {}) {
  if (!state.config || !Array.isArray(state.config.provinces) || !state.config.provinces.length) {
    try {
      state.config = await get("/api/config");
    } catch {
      state.config = { tiers: [], categories: [], provinces: ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"] };
    }
  }
  const cfg = state.config || { tiers: [], categories: [], provinces: ["Hà Nội"] };
  const partnerInviteToken = String(options.partnerInviteToken || "").trim();
  const partnerName = String(options.partnerName || "").trim();
  const cancelHash = String(options.cancelHash || "#/dang-ky");
  const d = {
    name: "",
    phone: "",
    email: "",
    otpSent: false,
    otpEmail: "",
    otpValue: "",
    otpExpiresAt: 0,
    otpResendAt: 0,
    otpVerified: false,
    verifiedEmail: "",
    password: "",
    passwordConfirmation: "",
    province: (cfg.provinces && cfg.provinces[0]) || "Hà Nội",
    categories: [],
    customCategory: "",
    socialMode: "auto",
    socials: normalizeSocialDrafts([], { withFallback: true }),
    followers: 0,
    bio: "",
    prices: {},
    priceDescriptions: {},
    tier: "Nano",
    files: { front: "", back: "", selfie: "", frontPreview: "", backPreview: "", selfiePreview: "" },
    dob: "",
    cccd: "",
    cccdDate: "",
    cccdPlace: "",
    address: "",
    bankName: "",
    bankBin: "",
    bankAccount: "",
    bankOwner: "",
    termsRead: false,
    agreed: false,
    signStage: "read", // "read" -> "sign" -> "review"
    signature: "",
    signedAt: null,
  };
  let step = 0;
  let stepTransitioning = false;
  let submitting = false;
  let otpTimer = null;
  const steps = [
    "Email & OTP",
    "Hồ sơ",
    "Phân hạng & Bảng giá",
    "Danh tính & Thanh toán",
    "Hợp đồng",
    "Hoàn tất",
  ];
  const val = (id) => {
    const e = el.querySelector("#" + id);
    return e ? e.value : "";
  };
  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "[•]");
  const fmtDateTime = (v) => (v ? new Date(v).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : "[•]");
  const socialLabel = (social) => {
    if (!social) return "";
    const platform = String(social.platform || "").trim();
    const handle = String(social.handle || "").trim();
    if (platform && handle) return `${platform}: ${handle}`;
    return platform || handle;
  };
  async function onCancel() {
    if (submitting) {
      toast("Đang gửi hồ sơ. Bạn vui lòng chờ một chút.", "err");
      return;
    }
    if (
      step < 5 && !(await confirmDialog(
        "Bạn có chắc chắn muốn hủy đăng ký?\nToàn bộ thông tin đã nhập sẽ bị xoá và không thể khôi phục.",
      ))
    )
      return;
    stopOtpTimer();
    // We're already on hash "#/tuyen-koc" (the recruit landing hosts this wizard), so setting
    // the same hash again is a no-op and the browser won't fire 'hashchange' — dispatch it
    // ourselves so the app's router re-renders the landing page instead of leaving this
    // half-cancelled form on screen (same pattern app.js's own goHash() uses).
    const target = cancelHash;
    const changed = location.hash !== target;
    location.hash = target;
    if (!changed) window.dispatchEvent(new Event("hashchange"));
  }

  function wrap(inner, opts) {
    opts = opts || {};
    const showCancel = true;
    const showNav = step < 4 && !opts.hideNav;
    return `<div class="onboard-page">
      <aside class="onboard-aside">
        <div class="onboard-aside-top"><button type="button" class="onboard-return onboard-return-desktop" aria-label="Trở về trang giới thiệu KOC">← Trở về</button><span class="onboard-kicker">GIA NHẬP KOC VIỆT</span></div>
        <h2>Xây dựng hồ sơ.<br><span>Mở rộng cơ hội.</span></h2>
        <p>Hoàn thiện thông tin để kết nối với các chiến dịch phù hợp và bắt đầu hành trình chuyên nghiệp.</p>
        <div class="onboard-aside-progress"><b>${String(step + 1).padStart(2, "0")}</b><span>/ 06</span></div>
        <div class="onboard-aside-steps">${steps.map((label, i) => `<div class="${i === step ? "current" : i < step ? "done" : ""}"><i>${i < step ? "✓" : i + 1}</i><span>${label}</span></div>`).join("")}</div>
      </aside>
      <main class="onboard-panel">
      <button type="button" class="onboard-return onboard-return-mobile" aria-label="Trở về trang giới thiệu KOC">← Trở về</button>
      ${
        showCancel
          ? `<button type="button" id="o-cancel" class="onboard-close" title="${step < 5 ? "Hủy đăng ký" : "Đóng"}" aria-label="${step < 5 ? "Hủy đăng ký" : "Đóng"}">✕</button>`
          : ""
      }
      <div class="between onboard-header" style="padding-right:${showCancel ? "44px" : "0"}">
        <div class="row" style="gap:10px;min-width:0">
          <a href="${esc(cancelHash)}" class="logo" style="font-size:18px">KOC<span style="color:var(--navy)"> Viet</span></a>
        </div>
        <span class="onboard-step-count">${step < 5 ? `Bước ${step + 1}/6` : ""}</span>
      </div>
      <div class="step-dots">${steps.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
      ${partnerInviteToken ? `<div class="onboard-partner-invite">Bạn đang đăng ký theo lời mời của <b>${esc(partnerName || "đối tác")}</b>. Hồ sơ sẽ được liên kết sau khi NetViet phê duyệt.</div>` : ""}
      <div class="onboard-title"><span>THÔNG TIN ĐĂNG KÝ</span><h1>${steps[step]}</h1></div>${inner}
      ${
        showNav
          ? `<div class="row" style="gap:10px;margin-top:18px">
        ${step > 0 ? '<button type="button" class="btn ghost" id="o-prev" style="flex:1">← Quay lại</button>' : ""}
        <button type="button" class="btn primary" id="o-next" style="flex:2">Tiếp tục →</button>
      </div>`
          : ""
      }
      </main>
    </div>`;
  }

  function bindChrome() {
    const cancelBtn = el.querySelector("#o-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", onCancel);
    el.querySelectorAll(".onboard-return").forEach(returnBtn => returnBtn.addEventListener("click", onCancel));
    const next = el.querySelector("#o-next");
    if (next) next.addEventListener("click", () => goNext());
    const prev = el.querySelector("#o-prev");
    if (prev) prev.addEventListener("click", () => goPrev());
  }

  async function goNext() {
    if (stepTransitioning) return;
    const validators = [validate0, validate1, validate2, validate3];
    const currentStep = step;
    const validator = validators[currentStep];
    if (typeof validator !== "function") return;
    const nextButton = el.querySelector("#o-next");
    stepTransitioning = true;
    if (nextButton) nextButton.disabled = true;
    try {
      const ok = await validator();
      if (!ok || step !== currentStep) {
        if (nextButton?.isConnected) nextButton.disabled = false;
        return;
      }
      step = currentStep + 1;
      render();
    } finally {
      stepTransitioning = false;
    }
  }
  function goPrev() {
    [collect0, collect1, collect2, collect3, collect4][step]();
    step--;
    render();
  }

  let lastRenderedStep = -1;

  function render() {
    stopOtpTimer();
    const panel = el.querySelector(".onboard-panel");
    const prevPanelScrollTop = panel ? panel.scrollTop : 0;
    const prevWindowScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const isSameStep = step === lastRenderedStep;

    if (step === 0) renderStep0();
    else if (step === 1) renderStep1();
    else if (step === 2) renderStep2();
    else if (step === 3) renderStep3();
    else if (step === 4) renderStep4();
    else if (step === 5) renderStep5();

    lastRenderedStep = step;

    if (isSameStep) {
      const newPanel = el.querySelector(".onboard-panel");
      if (newPanel && prevPanelScrollTop > 0) {
        newPanel.scrollTop = prevPanelScrollTop;
      }
      if (prevWindowScrollY > 0) {
        window.scrollTo({ top: prevWindowScrollY, behavior: "instant" });
      }
      requestAnimationFrame(() => {
        const p = el.querySelector(".onboard-panel");
        if (p && prevPanelScrollTop > 0 && Math.abs(p.scrollTop - prevPanelScrollTop) > 2) {
          p.scrollTop = prevPanelScrollTop;
        }
        const winY = window.scrollY || document.documentElement.scrollTop || 0;
        if (prevWindowScrollY > 0 && Math.abs(winY - prevWindowScrollY) > 2) {
          window.scrollTo({ top: prevWindowScrollY, behavior: "instant" });
        }
      });
    }
  }

  // ---------- Step 0: Họ tên, SĐT, Email + OTP qua email ----------
  function fieldErr(id, msg) {
    const e = el.querySelector("#" + id);
    if (!e) return;
    e.textContent = msg || "";
    e.style.display = msg ? "block" : "none";
  }

  function stopOtpTimer() {
    if (otpTimer) clearInterval(otpTimer);
    otpTimer = null;
  }

  function resetOtpState() {
    stopOtpTimer();
    d.otpSent = false;
    d.otpEmail = "";
    d.otpValue = "";
    d.otpExpiresAt = 0;
    d.otpResendAt = 0;
    d.otpVerified = false;
    d.verifiedEmail = "";
  }

  function updateOtpCountdown() {
    const btn = el.querySelector("#o-send");
    const status = el.querySelector("#o-otp-status");
    if (!btn || !status) return;

    if (d.otpVerified && d.verifiedEmail === d.email) {
      btn.disabled = true;
      btn.textContent = "Email đã xác thực";
      status.textContent = "✓ Mã OTP chính xác. Bạn có thể tiếp tục sang bước 2.";
      status.style.color = "var(--success)";
      return;
    }

    if (!d.otpSent || d.otpEmail !== d.email) {
      btn.disabled = false;
      btn.textContent = "Gửi mã OTP qua email";
      status.textContent = "Email thường được gửi trong vòng 30 giây.";
      status.style.color = "var(--muted)";
      return;
    }

    const resendIn = Math.max(
      0,
      Math.ceil((d.otpResendAt - Date.now()) / 1000),
    );
    btn.disabled = resendIn > 0;
    btn.textContent =
      resendIn > 0 ? `Gửi lại sau ${resendIn}s` : "Gửi lại mã OTP";
    status.textContent = "";
  }

  function startOtpCountdown() {
    stopOtpTimer();
    updateOtpCountdown();
    if (d.otpSent && !d.otpVerified) {
      otpTimer = setInterval(updateOtpCountdown, 1000);
    }
  }

  function renderStep0() {
    const eyeOpen = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
      <circle cx="12" cy="12" r="2.5"/>
    </svg>`;
    const eyeClosed = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3l18 18"/>
      <path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8"/>
      <path d="M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1"/>
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>
    </svg>`;
    el.innerHTML = wrap(`
      <div class="field"><label class="required-label">Họ tên</label><input id="o-name" value="${esc(d.name)}" placeholder="Nguyễn Văn A">
        <div class="err" id="o-name-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Số điện thoại</label><input id="o-phone" value="${esc(d.phone)}" placeholder="09xxxxxxxx">
        <div class="err" id="o-phone-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Email</label><input id="o-email" type="email" value="${esc(d.email)}" placeholder="ban@email.com">
        <div class="err" id="o-email-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Mật khẩu</label>
        <div style="position:relative">
          <input id="o-password" type="password" autocomplete="new-password" minlength="8"
            maxlength="128" value="${esc(d.password)}" placeholder="Tối thiểu 8 ký tự"
            style="padding-right:48px">
          <button type="button" class="o-password-toggle" data-target="o-password"
            aria-label="Hiển thị mật khẩu" aria-pressed="false"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;padding:0;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center">
            ${eyeClosed}
          </button>
        </div>
        <div class="err" id="o-password-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Xác nhận mật khẩu</label>
        <div style="position:relative">
          <input id="o-password-confirmation" type="password" autocomplete="new-password"
            minlength="8" maxlength="128" value="${esc(d.passwordConfirmation)}"
            style="padding-right:48px">
          <button type="button" class="o-password-toggle" data-target="o-password-confirmation"
            aria-label="Hiển thị mật khẩu xác nhận" aria-pressed="false"
            style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;padding:0;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center">
            ${eyeClosed}
          </button>
        </div>
        <div class="err" id="o-password-confirmation-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Mã OTP nhận được qua email</label><input id="o-otp" class="otp-in"
        maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="••••••" value="${esc(d.otpValue)}"
        ${d.otpVerified && d.verifiedEmail === d.email ? "disabled" : ""}>
        <div class="err" id="o-otp-err" style="display:none"></div></div>
      <div id="o-otp-status" class="muted" style="font-size:12px;margin-bottom:8px" aria-live="polite"></div>
      <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn ghost" id="o-send">Gửi mã OTP qua email</button>
        ${d.otpVerified && d.verifiedEmail === d.email ? `<button type="button" class="btn ghost" id="o-reverify" style="font-size:12px;color:#475569;border-color:#cbd5e1">🔄 Đổi email / Gửi lại OTP</button>` : ""}
      </div>`);
    bindChrome();
    const reverifyBtn = el.querySelector("#o-reverify");
    if (reverifyBtn) {
      reverifyBtn.addEventListener("click", () => {
        resetOtpState();
        d.otpVerified = false;
        d.verifiedEmail = "";
        render();
      });
    }
    el.querySelectorAll(".o-password-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const input = el.querySelector("#" + button.dataset.target);
        if (!input) return;
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.setAttribute("aria-pressed", String(!visible));
        button.setAttribute(
          "aria-label",
          visible ? "Hiển thị mật khẩu" : "Ẩn mật khẩu",
        );
        button.innerHTML = visible ? eyeClosed : eyeOpen;
        input.focus();
      });
    });
    el.querySelector("#o-send").addEventListener("click", sendOtp);
    el.querySelector("#o-email").addEventListener("input", (event) => {
      const email = event.target.value.trim().toLowerCase();
      if (d.otpEmail && email !== d.otpEmail) resetOtpState();
      d.email = email;
      updateOtpCountdown();
    });
    el.querySelector("#o-otp").addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
      d.otpValue = event.target.value;
      fieldErr("o-otp-err", "");
    });
    startOtpCountdown();
  }
  function collect0() {
    d.name = val("o-name").trim();
    d.phone = val("o-phone").trim();
    d.email = val("o-email").trim().toLowerCase();
    d.otpValue = val("o-otp").trim();
    d.password = val("o-password");
    d.passwordConfirmation = val("o-password-confirmation");
  }
  async function sendOtp() {
    collect0();
    fieldErr("o-email-err", "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      fieldErr("o-email-err", "Email không hợp lệ");
      return;
    }
    if (
      d.otpSent &&
      d.otpEmail === d.email &&
      Date.now() < d.otpResendAt
    )
      return;
    const btn = el.querySelector("#o-send");
    btn.disabled = true;
    btn.textContent = "Đang gửi…";
    try {
      const r = await post("/api/onboard/email-otp", { email: d.email });
      d.otpSent = true;
      d.otpEmail = d.email;
      d.otpValue = r.devCode || "";
      d.otpVerified = false;
      d.verifiedEmail = "";
      d.otpExpiresAt = Date.now() + Number(r.expiresIn || 300) * 1000;
      d.otpResendAt = Date.now() + Number(r.resendIn || 30) * 1000;
      const otpInput = el.querySelector("#o-otp");
      if (otpInput) {
        otpInput.value = r.devCode || "";
        otpInput.disabled = false;
        otpInput.focus();
      }
      fieldErr("o-otp-err", "");
      if (r.demo && r.devCode) {
        toast(`[Môi trường Dev] Mã OTP của bạn là: ${r.devCode}`, "ok");
      } else {
        toast("Đã gửi mã OTP tới email của bạn", "ok");
      }
      startOtpCountdown();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      updateOtpCountdown();
    }
  }
  async function validate0() {
    collect0();
    fieldErr("o-name-err", "");
    fieldErr("o-phone-err", "");
    fieldErr("o-email-err", "");
    fieldErr("o-otp-err", "");
    fieldErr("o-password-err", "");
    fieldErr("o-password-confirmation-err", "");
    let ok = true;
    if (d.name.length < 2) {
      fieldErr(
        "o-name-err",
        "Họ tên tối thiểu 2 ký tự, không chỉ khoảng trắng",
      );
      ok = false;
    }
    if (!/^0\d{9}$/.test(d.phone)) {
      fieldErr(
        "o-phone-err",
        "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)",
      );
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      fieldErr("o-email-err", "Email không hợp lệ");
      ok = false;
    }
    if (d.password.length < 8) {
      fieldErr("o-password-err", "Mật khẩu phải có ít nhất 8 ký tự");
      ok = false;
    } else if (d.password.length > 128) {
      fieldErr("o-password-err", "Mật khẩu không được quá 128 ký tự");
      ok = false;
    }
    if (d.passwordConfirmation !== d.password) {
      fieldErr("o-password-confirmation-err", "Mật khẩu xác nhận không khớp");
      ok = false;
    }
    if (d.otpVerified && d.verifiedEmail === d.email) return ok;
    const code = d.otpValue;
    if (!d.otpSent || d.otpEmail !== d.email) {
      fieldErr("o-otp-err", "Vui lòng gửi mã OTP tới email trước");
      ok = false;
    } else if (Date.now() >= d.otpExpiresAt) {
      fieldErr("o-otp-err", "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.");
      ok = false;
    } else if (!/^\d{6}$/.test(code)) {
      fieldErr("o-otp-err", "Mã OTP phải gồm đúng 6 chữ số");
      ok = false;
    }
    if (!ok) return false;
    const btn = el.querySelector("#o-next");
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Đang xác thực…";
    try {
      await post("/api/onboard/email-otp/verify", { email: d.email, code });
      d.otpVerified = true;
      d.verifiedEmail = d.email;
      stopOtpTimer();
      return true;
    } catch (e) {
      fieldErr("o-otp-err", e.message);
      return false;
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  // ---------- Step 1: Hồ sơ (tỉnh/thành, ngành hàng + "Khác", follower...) ----------
  function renderStep1() {
    function applySocialStats(stats) {
      const platform = stats.platform || "TikTok";
      const isPersonal = Boolean(stats.isPersonalAccount || (stats.followers <= 0 && (platform === "Facebook" || platform === "Instagram")));
      let idx = d.socials.findIndex((s) => s.platform === platform);
      if (idx === -1) {
        if (d.socials.length < MAX_SOCIAL_CHANNELS) {
          d.socials.push({ platform, handle: "", followers: 0 });
          idx = d.socials.length - 1;
        } else {
          idx = 0;
        }
      }
      d.socials[idx] = {
        ...d.socials[idx],
        platform,
        handle: stats.handle || stats.url || `https://${platform.toLowerCase()}.com/@kocviet_${platform.toLowerCase()}`,
        followers: Number(stats.followers) || 0,
        verified: true,
        verificationSource: stats.verificationSource || `oauth2_${platform.toLowerCase()}`,
        verifiedAt: stats.verifiedAt || new Date().toISOString(),
        isPersonalAccount: isPersonal,
        notice: stats.notice,
        avatarUrl: stats.avatarUrl || stats.avatar || d.socials[idx]?.avatarUrl || "",
        displayName: stats.displayName || d.socials[idx]?.displayName || "",
      };

      // Use the largest verified channel for registration and tiering.
      const verifiedChannels = d.socials.filter((s) => s.verified);
      d.followers = verifiedChannels.reduce(
        (largest, s) => Math.max(largest, Number(s.followers) || 0),
        0,
      );
      d.followers_verified = 1;
      d.followers_verification_source = stats.verificationSource || `oauth2_${platform.toLowerCase()}`;

      if (isPersonal) {
        toast(`⚠️ Tài khoản ${platform} cá nhân chưa bật Chế độ chuyên nghiệp (0 fl). Vui lòng xem hướng dẫn bên dưới để hiển thị followers!`, "err", 8000);
      } else {
        toast(`✓ Đã xác thực kênh ${platform} (${Number(stats.followers).toLocaleString('vi-VN')} followers)!`, "ok");
      }
      render();
    }

    const isManual = (d.socialMode || "auto") === "manual";
    const verifiedSocials = d.socials.filter((s) => s.verified);
    const hasVerified = verifiedSocials.length > 0;
    if (!isManual) {
      if (hasVerified) {
        const maxVerifiedFollowers = verifiedSocials.reduce(
          (largest, s) => Math.max(largest, Number(s.followers) || 0),
          0,
        );
        d.followers = maxVerifiedFollowers;
        d.followers_verified = 1;
      } else {
        d.followers = 0;
        d.followers_verified = 0;
      }
    }

    const catList = cfg.categories.concat(["Khác"]);
    el.innerHTML = wrap(`
      <div class="field"><label class="required-label" for="o-prov">Tỉnh/Thành phố</label>
        <div class="province-picker">
          <input id="o-prov" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="o-provinces" value="${esc(d.province)}" placeholder="Gõ để tìm tỉnh/thành phố" autocomplete="off" aria-describedby="o-prov-err">
          <button type="button" class="province-picker-toggle" data-province-toggle tabindex="-1" aria-label="Hiện danh sách tỉnh/thành phố"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></button>
          <div class="province-picker-panel" data-province-panel hidden>
            <div id="o-provinces" role="listbox" aria-label="Danh sách tỉnh/thành phố">${cfg.provinces.map((province, i) => `<div id="o-province-${i}" role="option" aria-selected="${province === d.province}">${esc(province)}</div>`).join("")}</div>
            <p class="province-picker-empty" data-province-empty role="status" hidden>Không tìm thấy tỉnh/thành phố phù hợp.</p>
          </div>
        </div>
        <div class="err" id="o-prov-err" role="alert" style="display:none"></div>
      </div>
      <div class="field"><label class="required-label">Ngành hàng (chọn nhiều)</label>
        <div id="o-cats" style="display:flex;flex-wrap:wrap;gap:8px">${catList.map((c) => `<button type="button" class="chip" data-c="${esc(c)}" style="cursor:pointer;padding:8px 14px;${d.categories.includes(c) ? "background:var(--primary);color:#fff" : ""}">${esc(c)}</button>`).join("")}</div>
        ${d.categories.includes("Khác") ? `<div class="field" style="margin-top:8px"><label class="required-label" for="o-cat-other">Ngành hàng khác</label><input id="o-cat-other" value="${esc(d.customCategory)}" placeholder="Nhập tên ngành hàng khác"></div>` : ""}
      </div>
      ${socialChannelPickerHtml({
        socials: d.socials,
        prefix: "o",
        escapeHtml: esc,
        primaryVerified: !isManual && hasVerified,
        primaryLabel: "Kênh chính",
        mode: d.socialMode || "auto",
      })}
      <div class="field">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px">
          <label class="required-label" for="o-fol" style="margin:0">Số người theo dõi lớn nhất trên một kênh</label>
          ${(!isManual && hasVerified) ? `<span class="social-verified-tag" style="font-size:11px">🔒 Đã đồng bộ từ mạng xã hội (${Number(d.followers).toLocaleString('vi-VN')} người theo dõi)</span>` : ""}
        </div>
        <input id="o-fol" type="text" inputmode="numeric" data-integer-input value="${Number.isFinite(d.followers) && d.followers ? num(d.followers) : ""}" placeholder="Ví dụ: 1.000.000" aria-describedby="o-fol-help" ${(!isManual && hasVerified) ? "readonly style='background:#f1f5f9;cursor:not-allowed;font-weight:700;color:var(--navy)'" : ""}>
      </div>
      <p class="muted" id="o-fol-help" style="font-size:12px;margin:-6px 0 14px">${(!isManual && hasVerified) ? "Đã lấy số người theo dõi lớn nhất trong các kênh đã xác thực." : "Nhập số người theo dõi của kênh có lượng theo dõi cao nhất, không cộng các kênh. Tối thiểu 1.000 người. Có thể nhập 1000000 hoặc 1.000.000."}</p>
      <div class="field"><label>Giới thiệu</label><textarea id="o-bio" rows="2">${esc(d.bio)}</textarea></div>`);
    bindChrome();
    bindIntegerInputs(el);
    bindProvincePicker(el.querySelector(".province-picker"));
    const provinceInput = el.querySelector("#o-prov");
    provinceInput.addEventListener("input", () => {
      fieldErr("o-prov-err", "");
      provinceInput.removeAttribute("aria-invalid");
    });
    el.querySelectorAll("#o-cats [data-c]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        collect1();
        const c = b.dataset.c;
        if (d.categories.includes(c))
          d.categories = d.categories.filter((x) => x !== c);
        else d.categories.push(c);
        render();
      }),
    );
    el.querySelectorAll("[data-social-mode]").forEach((button) =>
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        collect1();
        d.socialMode = button.dataset.socialMode;
        render();
      }),
    );
    el.querySelectorAll("[data-social-toggle]").forEach((button) =>
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        collect1();
        const platform = button.dataset.socialToggle;
        const index = d.socials.findIndex(
          (social) => social.platform === platform,
        );
        if (index >= 0) {
          d.socials.splice(index, 1);
        } else {
          if (d.socials.length >= MAX_SOCIAL_CHANNELS) {
            toast(`Chỉ được chọn tối đa ${MAX_SOCIAL_CHANNELS} kênh`, "err");
            return;
          }
          d.socials.push({ platform, handle: "", followers: 0 });
        }
        render();
      }),
    );
    el.querySelectorAll("[data-switch-to-manual]").forEach((link) =>
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        collect1();
        d.socialMode = "manual";
        render();
      }),
    );
    el.querySelectorAll("[data-social-oauth]").forEach((button) =>
      button.addEventListener("click", async () => {
        const platform = button.dataset.socialOauth;
        if (isPlatformPendingApproval(platform)) {
          toast(`Tính năng kết nối tự động với ${platform} đang chờ nền tảng xét duyệt. Vui lòng chuyển sang tab "Nhập link thủ công" để điền liên kết.`, "err");
          return;
        }
        collect1();
        window.__lastOAuthPlatform = platform;
        const oldText = button.textContent;
        button.disabled = true;
        button.textContent = "Đang kết nối…";

        let popup = null;
        let pollTimer = null;
        let bc = null;

        const cleanup = () => {
          if (pollTimer) clearInterval(pollTimer);
          window.removeEventListener("message", handleMessage);
          if (bc) bc.close();
          button.disabled = false;
          button.textContent = oldText;
        };

        const handleSuccess = (stats) => {
          cleanup();
          applySocialStats(stats);
        };

        const handleMessage = (event) => {
          if (event.data?.type === "KOC_OAUTH_SUCCESS") {
            handleSuccess(event.data.payload);
          } else if (event.data?.type === "KOC_OAUTH_ERROR") {
            cleanup();
            toast(event.data.error || "Xác thực không thành công", "err");
            render();
          }
        };

        try {
          const res = await get(`/api/oauth/social/auth-url?platform=${encodeURIComponent(platform)}`);
          const width = 580;
          const height = 660;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          popup = window.open(
            res.authUrl,
            `oauth_${platform}`,
            `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`,
          );

          const state = res.state;
          window.addEventListener("message", handleMessage);
          try {
            bc = new BroadcastChannel("koc_oauth_channel");
            bc.onmessage = handleMessage;
          } catch (_) {}

          let isHandled = false;
          pollTimer = setInterval(async () => {
            if (isHandled) return;

            // Poll local server for OAuth completion state
            if (state) {
              try {
                const check = await get(`/api/oauth/social/status?state=${encodeURIComponent(state)}`);
                if (check?.status === "completed" && check.stats) {
                  isHandled = true;
                  if (popup && !popup.closed) popup.close();
                  handleSuccess(check.stats);
                  return;
                } else if (check?.status === "error") {
                  isHandled = true;
                  if (popup && !popup.closed) popup.close();
                  cleanup();
                  toast(check.error || "Xác thực không thành công", "err");
                  render();
                  return;
                }
              } catch (_) {}
            }

            // Check if popup was closed by user
            if (popup && popup.closed) {
              clearInterval(pollTimer);
              if (state && !isHandled) {
                try {
                  const check = await get(`/api/oauth/social/status?state=${encodeURIComponent(state)}`);
                  if (check?.status === "completed" && check.stats) {
                    isHandled = true;
                    handleSuccess(check.stats);
                    return;
                  }
                } catch (_) {}
              }
              cleanup();
            }
          }, 800);
        } catch (err) {
          cleanup();
          toast(err.message || "Lỗi khởi tạo OAuth", "err");
        }
      }),
    );
  }
  function collect1() {
    const prov = el.querySelector("#o-prov");
    if (prov) d.province = prov.value.trim();
    const fol = el.querySelector("#o-fol");
    if (fol && !fol.hasAttribute("readonly")) d.followers = parseIntegerInput(fol.value);
    const bio = el.querySelector("#o-bio");
    if (bio) d.bio = bio.value;
    const other = el.querySelector("#o-cat-other");
    if (other) d.customCategory = other.value;
    const currentByPlatform = new Map(
      d.socials.map((social) => [social.platform, social]),
    );
    const socialInputs = [...el.querySelectorAll("[data-social-link]")];
    if (socialInputs.length) {
      d.socials = socialInputs.map((input) => {
        const platform = input.dataset.platform;
        const existing = currentByPlatform.get(platform) || {};
        const val = input.value.trim();
        return {
          ...existing,
          platform,
          handle: val || (existing.verified ? existing.handle : ""),
          followers: Number(existing.followers) || 0,
        };
      });
    }
  }
  function validate1() {
    collect1();
    if (!cfg.provinces.includes(d.province)) {
      fieldErr("o-prov-err", "Vui lòng chọn tỉnh/thành phố trong danh sách gợi ý.");
      el.querySelector("#o-prov").setAttribute("aria-invalid", "true");
      el.querySelector("#o-prov").focus();
      return false;
    }
    if (!d.categories.length) {
      toast("Chọn ít nhất 1 ngành hàng", "err");
      return false;
    }
    if (d.categories.includes("Khác")) {
      if (!d.customCategory.trim()) {
        toast("Nhập tên ngành hàng khác", "err");
        return false;
      }
      d.categories = d.categories.map((c) =>
        c === "Khác" ? d.customCategory.trim() : c,
      );
    }
    if (!d.socials.length) {
      toast("Chọn ít nhất một kênh mạng xã hội", "err");
      return false;
    }
    const missingLink = d.socials.find((social) => !social.handle);
    if (missingLink) {
      toast(
        (d.socialMode || "auto") === "manual"
          ? `Vui lòng nhập link kênh ${missingLink.platform}`
          : `Vui lòng kết nối xác thực kênh ${missingLink.platform}`,
        "err",
      );
      return false;
    }
    const invalidLink = d.socials.find(
      (social) => !isValidSocialUrl(social.handle),
    );
    if (invalidLink) {
      toast(`Link ${invalidLink.platform} phải bắt đầu bằng http:// hoặc https://`, "err");
      return false;
    }
    if (
      !Number.isSafeInteger(d.followers) ||
      d.followers < MIN_KOC_REGISTRATION_FOLLOWERS ||
      d.followers > 2_000_000_000
    ) {
      toast("Nhập số người theo dõi từ 1.000 đến 2.000.000.000, ví dụ: 1.000.000", "err");
      return false;
    }
    return true;
  }

  // ---------- Step 2: Phân hạng tự động + giải thích + bảng giá ----------
  function renderStep2() {
    d.tier = tierOf(d.followers);
    const tr = cfg.tiers.find((t) => t.name === d.tier);
    el.innerHTML = wrap(`
      <div class="tint-box"><div class="between"><span>Hạng tự động của bạn</span><span class="tier-badge tier-${d.tier}">${d.tier}</span></div>
        <div class="muted" style="margin-top:6px">Khung giá cho phép: <b>${tr.name === "Mega" ? `Từ ${money(tr.min)}` : `${money(tr.min)} – ${money(tr.max)}`}</b></div></div>
      <div class="card" style="margin:14px 0;background:var(--screen)">
        <h3 style="font-size:14px;margin-bottom:8px">📊 Cách hệ thống phân hạng KOC</h3>
        <p class="muted" style="font-size:12.5px;line-height:1.7">Hạng KOC được xác định theo số người theo dõi. Hệ thống tự động xếp hạng như sau:</p>
        <ul style="margin:8px 0 0 18px;font-size:12.5px;color:var(--text);line-height:1.9">
          <li><b>Nano</b> — từ 1.000 đến dưới 10.000 người theo dõi</li>
          <li><b>Micro</b> — từ 10.000 đến dưới 100.000 người theo dõi</li>
          <li><b>Mid</b> — từ 100.000 đến dưới 300.000 người theo dõi</li>
          <li><b>Macro</b> — từ 300.000 đến dưới 1.000.000 người theo dõi</li>
          <li><b>Mega</b> — từ 1.000.000 người theo dõi trở lên</li>
        </ul>
        <p class="muted" style="font-size:12px;margin-top:8px">Hạng càng cao, khung giá niêm yết theo ngành hàng càng rộng. Hạng được xem xét định kỳ theo số người theo dõi, tỉ lệ hoàn thành booking và điểm đánh giá.</p>
      </div>
      <p class="muted" style="margin:12px 0 6px">Đặt phí cố định cho từng ngành hàng (trong khung):</p>
      ${d.categories.map((c, i) => `<div class="field"><label class="required-label" for="o-price-${i}">${esc(c)}</label><input id="o-price-${i}" type="text" inputmode="numeric" data-integer-input data-price="${esc(c)}" value="${num(d.prices[c] || tr.min)}" placeholder="${num(tr.min)}">${priceDescriptionField(c, d.priceDescriptions[c], `o-price-description-${i}`)}</div>`).join("")}
      ${d.categories.length ? "" : '<p class="err">Bạn chưa chọn ngành hàng ở bước trước.</p>'}`);
    bindChrome();
    bindIntegerInputs(el);
  }
  function collect2() {
    el.querySelectorAll('[data-price-description]').forEach(input => {
      d.priceDescriptions[input.dataset.priceDescription] = input.value.trim();
    });
    el.querySelectorAll("[data-price]").forEach((inp) => {
      d.prices[inp.dataset.price] = parseIntegerInput(inp.value);
    });
  }
  function validate2() {
    const tr = cfg.tiers.find((t) => t.name === d.tier);
    collect2();
    for (const input of el.querySelectorAll('[data-price-description]')) {
      if (!input.reportValidity()) return false;
      if (!input.value.trim()) {
        input.focus();
        toast('Ghi rõ dịch vụ, đơn vị tính và phạm vi công việc cho từng mức giá.', 'err');
        return false;
      }
    }
    let ok = true;
    el.querySelectorAll("[data-price]").forEach((inp) => {
      const v = d.prices[inp.dataset.price];
      const invalid = !Number.isSafeInteger(v) || v < tr.min || v > tr.max;
      inp.style.borderColor = invalid ? "var(--error)" : "";
      inp.setAttribute("aria-invalid", String(invalid));
      if (invalid) {
        ok = false;
      }
    });
    if (!ok) {
      toast(`Giá phải trong khung ${money(tr.min)}–${money(tr.max)}`, "err");
      return false;
    }
    return true;
  }

  // ---------- Step 3: eKYC (chụp trực tiếp hoặc chọn ảnh) + Thông tin nhận thanh toán ----------
  function fileRow(label, key, inputId) {
    const facingMode = key === "selfie" ? "user" : "environment";
    return `<div class="field" data-identity-photo="${key}"><label class="required-label" for="${inputId}">${label}</label>
      <div class="identity-photo-actions">
        <button type="button" class="btn ghost sm" id="${inputId}-cam-btn" aria-label="Chụp trực tiếp ${label}">Chụp trực tiếp</button>
        <button type="button" class="btn ghost sm" id="${inputId}-lib-btn" aria-label="Chọn ảnh ${label} từ thư viện">Chọn từ thư viện</button>
      </div>
      <input type="file" accept="image/jpeg,image/png,image/webp" id="${inputId}" hidden>
      <input type="file" accept="image/*" capture="${facingMode}" id="${inputId}-cam-fallback" aria-label="Chụp ${label}" hidden>
      <div class="muted" id="${inputId}-name" style="font-size:11px;margin-top:4px">${d.files[key] ? "<img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> " + esc(d.files[key]) : "Chưa chọn ảnh"}</div>
      <div class="err" id="${inputId}-err" style="display:none"></div>
      <img class="identity-photo-preview" id="${inputId}-preview" alt="${label}" ${d.files[key + "Preview"] ? `src="${d.files[key + "Preview"]}"` : "hidden"}>
    </div>`;
  }
  function renderStep3() {
    el.innerHTML = wrap(`
      <p class="muted" style="margin-bottom:12px">Xác minh danh tính — nhập thông tin cá nhân, chụp hoặc tải ảnh hai mặt CCCD và ảnh chân dung.</p>
      <div class="field"><label class="required-label">Ngày sinh</label><input type="date" id="o-dob" value="${esc(d.dob)}">
        <div class="err" id="o-dob-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Số CCCD</label><input id="o-cccd" value="${esc(d.cccd)}" placeholder="9-12 số">
        <div class="err" id="o-cccd-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Ngày cấp</label><input type="date" id="o-cccd-date" value="${esc(d.cccdDate)}">
        <div class="err" id="o-cccd-date-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Nơi cấp</label><input id="o-cccd-place" value="${esc(d.cccdPlace)}" placeholder="VD: Cục Cảnh sát QLHC về TTXH">
        <div class="err" id="o-cccd-place-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Địa chỉ thường trú</label><input id="o-address" value="${esc(d.address)}" placeholder="Số nhà, đường, phường/xã, tỉnh/thành">
        <div class="err" id="o-address-err" style="display:none"></div></div>
      ${fileRow("CCCD mặt trước", "front", "o-file-front")}
      ${fileRow("CCCD mặt sau", "back", "o-file-back")}
      ${fileRow("Ảnh chân dung (cầm CCCD)", "selfie", "o-file-selfie")}
      <h3 style="margin-top:18px;font-size:14px">💳 Thông tin nhận thanh toán</h3>
      <p class="muted" style="font-size:12px;margin-bottom:10px">Dùng để nhận 95% phí booking cùng hoa hồng bán hàng sau khi đối soát.</p>
      <div class="field"><label class="required-label" for="o-bank-select-trigger">Ngân hàng</label>${bankPickerHtml("o-bank-select", cfg.payoutBanks, d.bankName, d.bankBin, "o-bank-name-err")}
        <div class="err" id="o-bank-name-err" style="display:none"></div></div>
      <div class="field"><label class="required-label">Số tài khoản</label><input id="o-bank-account" value="${esc(d.bankAccount)}" placeholder="Số tài khoản (chỉ số)">
        <div class="err" id="o-bank-account-err" style="display:none"></div></div>
      <div class="field"><label class="required-label" for="o-bank-owner">Chủ tài khoản</label><input id="o-bank-owner" value="${esc(d.bankOwner)}" placeholder="Tên chủ tài khoản">
        <div class="err" id="o-bank-owner-err" style="display:none"></div></div>`);
    bindChrome();
    const dobInput = el.querySelector("#o-dob");
    const checkDob = () => {
      d.dob = dobInput.value;
      const error = registrationAgeError(d.dob);
      fieldErr("o-dob-err", error);
      dobInput.setAttribute("aria-invalid", String(Boolean(error)));
    };
    dobInput.setAttribute("aria-describedby", "o-dob-err");
    dobInput.addEventListener("input", checkDob);
    dobInput.addEventListener("change", checkDob);
    if (d.dob) checkDob();
    const bankSelect = bindBankPicker(
      el.querySelector('[data-bank-picker="o-bank-select"]'),
      cfg.payoutBanks,
    );
    bankSelect?.addEventListener("change", () => {
      const bank = selectedPayoutBank(bankSelect);
      d.bankName = bank.name;
      d.bankBin = bank.bin;
      fieldErr("o-bank-name-err", "");
    });
    const savePhoto = (key, name, dataUrl) => {
      const inputId = "o-file-" + key;
      d.files[key] = name;
      d.files[key + "Preview"] = dataUrl;
      const nameEl = el.querySelector("#" + inputId + "-name");
      if (nameEl) nameEl.textContent = name;
      fieldErr(inputId + "-err", "");
      const preview = el.querySelector("#" + inputId + "-preview");
      if (preview) {
        preview.src = dataUrl;
        preview.hidden = false;
      }
    };
    for (const [key, label] of [["front", "CCCD mặt trước"], ["back", "CCCD mặt sau"], ["selfie", "ảnh chân dung"]]) {
      const inputId = "o-file-" + key;
      const owner = el.querySelector('[data-identity-photo="' + key + '"]');
      const library = el.querySelector("#" + inputId);
      const fallback = el.querySelector("#" + inputId + "-cam-fallback");
      // Only the latest selection may replace this side's draft image.
      let selection = 0;
      for (const input of [library, fallback]) {
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          if (!file) return;
          input.value = "";
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10_000_000) {
            fieldErr(inputId + "-err", "Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 10 MB");
            return;
          }
          const currentSelection = ++selection;
          const reader = new FileReader();
          reader.onload = () => {
            if (currentSelection === selection) savePhoto(key, file.name, reader.result);
          };
          reader.onerror = () => {
            if (currentSelection === selection) fieldErr(inputId + "-err", "Không đọc được ảnh. Vui lòng chọn lại.");
          };
          reader.readAsDataURL(file);
        });
      }
      el.querySelector("#" + inputId + "-lib-btn").addEventListener("click", () => library.click());
      el.querySelector("#" + inputId + "-cam-btn").addEventListener("click", () => {
        openIdentityCamera({
          owner,
          label,
          facingMode: key === "selfie" ? "user" : "environment",
          onFallback: () => fallback.click(),
          onCapture: (dataUrl) => {
            selection++;
            savePhoto(key, key + "-camera-" + Date.now() + ".jpg", dataUrl);
            toast("Đã chụp " + label + ". Bạn có thể chụp lại nếu ảnh chưa rõ.", "ok");
          },
        });
      });
    }
  }

  function collect3() {
    const dob = el.querySelector("#o-dob");
    if (dob) d.dob = dob.value;
    const cccd = el.querySelector("#o-cccd");
    if (cccd) d.cccd = cccd.value.trim();
    const cccdDate = el.querySelector("#o-cccd-date");
    if (cccdDate) d.cccdDate = cccdDate.value;
    const cccdPlace = el.querySelector("#o-cccd-place");
    if (cccdPlace) d.cccdPlace = cccdPlace.value.trim();
    const address = el.querySelector("#o-address");
    if (address) d.address = address.value.trim();
    const bank = selectedPayoutBank(el.querySelector("#o-bank-select"));
    d.bankName = bank.name;
    d.bankBin = bank.bin;
    const ba = el.querySelector("#o-bank-account");
    if (ba) d.bankAccount = ba.value;
    const bo = el.querySelector("#o-bank-owner");
    if (bo) d.bankOwner = bo.value;
  }
  function validate3() {
    collect3();
    fieldErr("o-dob-err", "");
    fieldErr("o-cccd-err", "");
    fieldErr("o-cccd-date-err", "");
    fieldErr("o-cccd-place-err", "");
    fieldErr("o-address-err", "");
    fieldErr("o-file-front-err", "");
    fieldErr("o-file-back-err", "");
    fieldErr("o-file-selfie-err", "");
    fieldErr("o-bank-name-err", "");
    fieldErr("o-bank-account-err", "");
    fieldErr("o-bank-owner-err", "");
    let ok = true;
    const dobError = registrationAgeError(d.dob);
    if (dobError) {
      fieldErr("o-dob-err", dobError);
      ok = false;
    }
    if (!/^\d{9,12}$/.test(d.cccd)) {
      fieldErr("o-cccd-err", "Số CCCD chỉ gồm chữ số, 9-12 ký tự");
      ok = false;
    }
    if (!d.cccdDate) {
      fieldErr("o-cccd-date-err", "Chọn ngày cấp CCCD");
      ok = false;
    }
    if (!d.cccdPlace.trim()) {
      fieldErr("o-cccd-place-err", "Nhập nơi cấp CCCD");
      ok = false;
    }
    if (!d.address.trim()) {
      fieldErr("o-address-err", "Nhập địa chỉ thường trú");
      ok = false;
    }
    if (!d.files.front) {
      fieldErr("o-file-front-err", "Vui lòng chụp hoặc tải ảnh CCCD mặt trước");
      ok = false;
    }
    if (!d.files.back) {
      fieldErr("o-file-back-err", "Vui lòng chụp hoặc tải ảnh CCCD mặt sau");
      ok = false;
    }
    if (!d.files.selfie) {
      fieldErr("o-file-selfie-err", "Vui lòng chụp hoặc tải ảnh chân dung (cầm CCCD)");
      ok = false;
    }
    if (!d.files.front || !d.files.back || !d.files.selfie) {
      toast("Vui lòng chụp hoặc tải đủ ảnh hai mặt CCCD và ảnh chân dung", "err");
    }
    if (!d.bankName.trim()) {
      fieldErr("o-bank-name-err", "Chọn ngân hàng nhận thanh toán");
      ok = false;
    }
    if (!/^\d{6}$/.test(d.bankBin.trim())) {
      fieldErr("o-bank-name-err", "Không xác định được ngân hàng, vui lòng chọn lại");
      ok = false;
    }
    if (!/^\d{6,20}$/.test(d.bankAccount.trim())) {
      fieldErr("o-bank-account-err", "Số tài khoản chỉ gồm chữ số, 6-20 ký tự");
      ok = false;
    }
    if (!d.bankOwner.trim() || /\d/.test(d.bankOwner)) {
      fieldErr(
        "o-bank-owner-err",
        "Nhập tên chủ tài khoản hợp lệ (không chứa số)",
      );
      ok = false;
    }
    if (!ok) return false;
    return true;
  }

  // ---------- Step 4: Hợp đồng điện tử — đọc → tick đồng ý → ký tên → xem lại → xác nhận ----------
  const CONTRACT_STYLE = `
    <style>
      .contract-box{ border:1px solid #E8E8E8; border-radius:16px; background:#FFFFFF; overflow:hidden; }
      .contract-scroll{ max-height:420px; overflow-y:auto; padding:20px 22px; font-size:14px; line-height:1.65; color:#212121; background:#FFFFFF; }
      .contract-scroll::-webkit-scrollbar{ width:8px; }
      .contract-scroll::-webkit-scrollbar-thumb{ background:#E8E8E8; border-radius:9999px; }
      .contract-header{ background:#0B1F3A; color:#FFFFFF; padding:18px 22px; }
      .contract-header .doc-no{ color:#C9D4E3; font-size:12px; margin-top:2px; }
      .contract-title{ font-size:17px; font-weight:700; letter-spacing:.2px; margin:0; }
      .contract-subtitle{ font-size:12px; color:#C9D4E3; margin-top:4px; }
      .contract-basis{ margin:14px 0 18px; padding:12px 14px; background:#FDEEE8; border-left:3px solid #EE4D2D; border-radius:8px; font-size:13px; color:#212121; }
      .contract-basis ul{ margin:6px 0 0 18px; padding:0; }
      .contract-basis li{ margin-bottom:4px; }
      .contract-party{ margin-bottom:14px; padding:12px 14px; border:1px solid #E8E8E8; border-radius:12px; font-size:13px; }
      .contract-party b{ color:#C8371A; }
      .contract-party .party-label{ display:inline-block; font-size:11px; font-weight:700; color:#EE4D2D; background:#FDEEE8; border-radius:9999px; padding:2px 10px; margin-bottom:6px; }
      .contract-article-title{ font-size:14.5px; font-weight:700; color:#0B1F3A; margin:22px 0 8px; padding-bottom:6px; border-bottom:2px solid #FDEEE8; }
      .contract-article-title:first-of-type{ margin-top:4px; }
      .contract-scroll p{ margin:0 0 10px; }
      .contract-scroll .term-def b{ color:#0B1F3A; }
      .contract-table{ width:100%; border-collapse:collapse; margin:10px 0 16px; font-size:12.5px; }
      .contract-table th{ background:#0B1F3A; color:#FFFFFF; text-align:left; padding:8px 10px; font-weight:600; }
      .contract-table td{ padding:8px 10px; border-bottom:1px solid #E8E8E8; vertical-align:top; }
      .contract-table tr:nth-child(even) td{ background:#F5F5F5; }
      .contract-signblock{ margin-top:22px; padding-top:16px; border-top:1px dashed #E8E8E8; display:flex; gap:16px; font-size:12.5px; }
      .contract-signblock > div{ flex:1; }
      .contract-signblock .sign-label{ font-weight:700; color:#0B1F3A; margin-bottom:4px; }
      .contract-endnote{ margin-top:16px; font-size:11.5px; font-style:italic; color:#757575; }
      .contract-scroll-end{ margin-top:18px; text-align:center; font-size:12px; color:#EE4D2D; font-weight:600; }
      .signpad-box{ border:1px solid #E8E8E8; border-radius:16px; background:#FDFDFD; padding:20px; }
      .signpad-canvas-wrap{ border:1px dashed #E8E8E8; border-radius:12px; overflow:hidden; background:#FFFFFF; }
    </style>`;

  // Toàn văn hợp đồng, gán dữ liệu KOC thật; dùng chung cho màn "đọc" và màn "xem lại sau khi ký"
  function contractBody(opts) {
    opts = opts || {};
    const signedMode = !!opts.signed;
    return `
    <div class="contract-party">
      <span class="party-label">BÊN A (Bên cung cấp nền tảng — “NetViet”)</span><br>
      <b>CÔNG TY CỔ PHẦN TẬP ĐOÀN CÔNG NGHỆ VÀ TRUYỀN THÔNG NETVIET</b><br>
      Trụ sở chính: Tầng 2, Tòa nhà Chelsea Park, 116 Trung Kính, Phường Yên Hòa, TP. Hà Nội.<br>
      Văn phòng đại diện: 180 Điện Biên Phủ, Phường Xuân Hòa, TP. Hồ Chí Minh.<br>
      Mã số thuế: 0111412305.<br>
      Người đại diện theo pháp luật: Nguyễn Thu Hương - Chức vụ: Tổng giám đốc.<br>
      Hotline: 0812.98.68.98 / 0813.487.686 &nbsp;&nbsp;&nbsp; Email: kocviet@netviettv.com.vn<br>
      Website: netviet.live<br>
      (Sau đây gọi là “Bên A” hoặc “NetViet”)
    </div>

    <div class="contract-party">
      <span class="party-label">BÊN B — KOC/KOL</span><br>
      Họ và tên: <b>${esc(d.name) || "[•]"}</b> · Ngày sinh: ${fmtDate(d.dob)}<br>
      Số CCCD: ${esc(d.cccd) || "[•]"} cấp ngày ${fmtDate(d.cccdDate)} tại ${esc(d.cccdPlace) || "[•]"}<br>
      Địa chỉ thường trú: ${esc(d.address) || "[•]"}<br>
      Số điện thoại: ${esc(d.phone) || "[•]"} · Email: ${esc(d.email) || "[•]"}<br>
      Kênh mạng xã hội chính: ${d.socials[0] ? esc(socialLabel(d.socials[0])) : "[•]"} · Số người theo dõi tại thời điểm ký: ${d.followers || "[•]"}<br>
      Số tài khoản ngân hàng nhận chi trả: ${esc(d.bankAccount) || "[•]"} tại Ngân hàng ${esc(d.bankName) || "[•]"}<br>
      (Sau đây gọi là “Bên B” hoặc “KOC”)
    </div>

    <p>Xét rằng Bên B đã hoàn tất đăng ký, xác minh danh tính điện tử (eKYC) và được Bên A phê duyệt hồ sơ trên Nền tảng NetViet, hai Bên thống nhất ký kết Hợp đồng hợp tác với các điều khoản như sau:</p>

    <p class="contract-article-title">Điều 1. Giải thích từ ngữ</p>
    <p class="term-def"><b>“Nền tảng”/“App”:</b> Hệ thống KOC App, Business Portal và Admin Panel do Bên A vận hành.</p>
    <p class="term-def"><b>“AI Clone Avatar”:</b> Video/âm thanh được tổng hợp bằng công nghệ trí tuệ nhân tạo, tái tạo hình ảnh và giọng nói của Bên B với độ giống cao, dùng để sản xuất nội dung theo booking đã được Bên B phê duyệt.</p>
    <p class="term-def"><b>“Booking”:</b> Yêu cầu hợp tác quảng cáo/tiếp thị do doanh nghiệp tạo trên Nền tảng, gồm các loại: Booking Review, Booking Quảng cáo, Booking Affiliate, Booking AI Clone Avatar và Booking kết hợp (Combo).</p>
    <p class="term-def"><b>“Luồng A – NetViet điều phối”:</b> Bên A dùng AI matching để phân bổ booking phù hợp cho Bên B.</p>
    <p class="term-def"><b>“Luồng B – Marketplace tự booking”:</b> Doanh nghiệp tự tìm và đặt booking trực tiếp với Bên B qua hồ sơ công khai.</p>
    <p class="term-def"><b>“Ví Escrow”:</b> Ví ký quỹ trung gian của Bên A, giữ tiền doanh nghiệp thanh toán cho đến khi booking được xác nhận hoàn thành.</p>
    <p class="term-def"><b>“Ví nội bộ”:</b> Ví trên App ghi nhận thu nhập của Bên B (phí booking, hoa hồng), từ đó Bên B yêu cầu rút về ngân hàng.</p>
    <p class="term-def"><b>“Ledger”:</b> Sổ đối soát điện tử ghi nhận doanh số, đơn hàng, hoa hồng và các khoản chi trả, lưu vết bất biến.</p>
    <p class="term-def"><b>“Đơn hàng hợp lệ”:</b> Đơn đã thanh toán thành công, không bị hủy/trả hàng/hoàn tiền trong thời hạn đối soát.</p>
    <p class="term-def"><b>“Cửa sổ theo dõi”:</b> Khoảng thời gian [•] ngày kể từ khi khách hàng click/tương tác với link/mã của Bên B để ghi nhận đơn phát sinh.</p>

    <p class="contract-article-title">Điều 2. Phạm vi hợp tác</p>
    <p>2.1. Bên A cấp cho Bên B quyền truy cập Nền tảng để: (a) nhận booking từ doanh nghiệp qua Luồng A hoặc Luồng B; (b) sử dụng kênh mạng xã hội đăng ký để đăng nội dung quảng bá sản phẩm; (c) gắn link affiliate và nhận hoa hồng chuyển đổi.</p>
    <p>2.2. Bên B hợp tác với tư cách đối tác độc lập, tự chủ về thời gian và cách thức thực hiện; quan hệ giữa hai Bên không phải là quan hệ lao động theo Bộ luật Lao động.</p>
    <p>2.3. Phạm vi hợp tác áp dụng cho toàn bộ booking phát sinh qua Nền tảng trong thời hạn hiệu lực của Hợp đồng.</p>

    <p class="contract-article-title">Điều 3. Các hình thức Booking</p>
    <p>Bên B có thể tham gia một hoặc nhiều hình thức booking dưới đây; mỗi hình thức có cơ chế ghi nhận, đối soát và chi trả riêng, không bù trừ lẫn nhau trừ khi có thỏa thuận khác:</p>
    <p><b>Booking Review/Quảng cáo:</b> Bên B tạo hoặc đăng tải nội dung review/quảng cáo theo yêu cầu doanh nghiệp, nhận phí booking cố định.</p>
    <p><b>Booking Affiliate:</b> Bên B quảng bá sản phẩm qua link/mã giới thiệu riêng và nhận hoa hồng theo doanh số hợp lệ (Điều 6).</p>
    <p><b>Booking AI Clone Avatar:</b> Đối tác sản xuất của Bên A dùng hình ảnh/giọng nói AI Clone của Bên B (đã cấp phép) để tạo video; Bên B duyệt và đăng tải, nhận phí booking và/hoặc hoa hồng affiliate.</p>
    <p><b>Booking Combo:</b> Kết hợp cấu phần quảng cáo và affiliate trong cùng một booking.</p>

    <p class="contract-article-title">Điều 4. Chính sách hoa hồng và chi trả — Luồng A (NetViet điều phối)</p>
    <p>4.1. Đối với booking do Bên A điều phối, Bên B được chi trả gồm: (a) Booking fee cố định theo từng job, thể hiện trong xác nhận booking; và (b) % hoa hồng affiliate tính trên doanh thu chuyển đổi hợp lệ qua link/UTM riêng của Bên B, theo khung tham khảo dưới đây (mức chi tiết áp dụng theo Phụ lục Chính sách hoa hồng do Bên A công bố, có thể điều chỉnh theo từng thời kỳ với thông báo trước tối thiểu 15 ngày):</p>
    <table class="contract-table">
      <tr><th>Hạng KOC</th><th>Tiêu chí tham khảo</th><th>% Hoa hồng affiliate (theo Phụ lục)</th></tr>
      <tr><td>Nano</td><td>Dưới 10.000 follower</td><td>[10]%</td></tr>
      <tr><td>Micro</td><td>10.000 – 50.000 follower</td><td>[12]%</td></tr>
      <tr><td>Mid</td><td>50.000 – 200.000 follower</td><td>[15]%</td></tr>
      <tr><td>Macro</td><td>Trên 200.000 follower</td><td>[16]%</td></tr>
    </table>
    <p>4.2. Chu kỳ đối soát: [1 lần/tháng] — Bên A tổng hợp Ledger và thông báo số liệu cho Bên B trước khi chi trả.</p>
    <p>4.3. Ngưỡng rút tiền tối thiểu: [1.000.000] đồng; số dư dưới ngưỡng được cộng dồn sang chu kỳ kế tiếp.</p>
    <p>4.4. Chi trả thực hiện vào Ví nội bộ trên App; Bên B có thể yêu cầu rút về tài khoản ngân hàng đã đăng ký, xử lý trong vòng [7] ngày làm việc.</p>
    <p>4.5. Bên A khấu trừ thuế thu nhập cá nhân (nếu có) theo quy định pháp luật trước khi chi trả, hoặc hướng dẫn Bên B tự kê khai tùy hình thức hợp tác.</p>

    <p class="contract-article-title">Điều 5. Booking trực tiếp qua Marketplace (Luồng B) — Phí dịch vụ 5%</p>
    <p>5.1. Bên B được quyền niêm yết hồ sơ năng lực, mức giá dịch vụ trên Marketplace để doanh nghiệp tìm kiếm và đặt booking trực tiếp.</p>
    <p>5.2. Mọi giao dịch Luồng B bắt buộc thực hiện qua Ví Escrow của Bên A: doanh nghiệp thanh toán tạm giữ 100% giá trị booking vào Ví Escrow trước khi Bên B triển khai; Bên A giữ lại 5% phí dịch vụ trên tổng giá trị booking khi giải ngân; Bên B nhận 95% sau khi doanh nghiệp xác nhận hoàn thành.</p>
    <p>5.3. Nghiêm cấm giao dịch ngoài hệ thống: Bên B không được thỏa thuận, báo giá riêng hoặc nhận thanh toán trực tiếp từ doanh nghiệp ngoài Ví Escrow đối với booking phát sinh từ việc doanh nghiệp biết đến/liên hệ Bên B qua Nền tảng. Vi phạm bị coi là vi phạm nghiêm trọng; Bên A không chịu trách nhiệm đối với mâu thuẫn phát sinh từ giao dịch ngoài hệ thống.</p>
    <p>5.4. Cam kết chênh lệch báo giá ưu tiên Nền tảng: Đối với các booking mà doanh nghiệp/khách hàng biết đến hoặc tiếp cận Bên B thông qua KOC Việt, khi được doanh nghiệp/khách hàng yêu cầu báo giá dịch vụ tương tự ở các kênh khác ngoài Nền tảng, Bên B cam kết mức báo giá niêm yết hoặc chào bán trên KOC Việt cho cùng phạm vi công việc phải thấp hơn tối thiểu 5% so với mức báo giá Bên B cung cấp trực tiếp ở kênh khác, nhằm bảo đảm quyền lợi cho doanh nghiệp khi giao dịch qua Nền tảng và ngăn ngừa hành vi lách phí dịch vụ. Trường hợp phát hiện Bên B báo giá trên KOC Việt cao hơn hoặc bằng mức báo giá tại kênh khác (không bảo đảm mức chênh lệch tối thiểu 5%), hành vi này bị coi là vi phạm nghiêm trọng khoản 5.3 Điều này và bị xử lý theo chế tài quy định tại Điều 13.</p>

    <p class="contract-article-title">Điều 6. Booking Affiliate — Chương trình liên kết bán hàng</p>
    <p>6.1. <b>Định nghĩa và phạm vi.</b> Booking Affiliate là hình thức Bên B tự lựa chọn sản phẩm/dịch vụ từ Danh mục Affiliate do doanh nghiệp đối tác đăng tải để quảng bá, không phụ thuộc vào một booking quảng cáo cụ thể theo Điều 4 hoặc Điều 5.</p>
    <p>6.2. <b>Quy trình thực hiện.</b> (a) Bên B chọn sản phẩm trên Danh mục Affiliate; (b) Nền tảng tự động cấp link/mã giới thiệu gắn định danh riêng của Bên B; (c) Bên B sáng tạo nội dung quảng bá sử dụng link/mã đã cấp; (d) Nội dung phải gắn nhãn quảng cáo/tiếp thị liên kết theo quy định pháp luật.</p>
    <p>6.3. <b>Ghi nhận đơn hàng.</b> Đơn phát sinh qua link/mã của Bên B được hệ thống ghi nhận trong Cửa sổ theo dõi [3] ngày kể từ khi khách hàng click/tương tác. Chỉ Đơn hàng hợp lệ mới là căn cứ tính hoa hồng.</p>
    <p>6.4. <b>Mức hoa hồng và phí nền tảng.</b> Mức hoa hồng áp dụng theo từng doanh nghiệp/nhà cung cấp, công bố công khai tại thời điểm Bên B chọn sản phẩm. Bên A thu phí nền tảng 1% trên tổng doanh số affiliate được ghi nhận; phí này do DOANH NGHIỆP chi trả và không trừ vào hoa hồng của Bên B. Mức chi tiết theo Phụ lục Chính sách hoa hồng affiliate, thông báo trước tối thiểu 15 ngày.</p>
    <p>6.5. <b>Đối soát và chi trả.</b> Chu kỳ đối soát: [hàng tuần]; chu kỳ chi trả: [1 tháng/lần]. Hoa hồng ghi có vào Ví nội bộ, áp dụng cùng cơ chế rút tiền, ngưỡng tối thiểu và khấu trừ thuế TNCN tại Điều 4.</p>
    <p>6.6. <b>Nghiêm cấm gian lận.</b> Bên B không được dùng công cụ tự động, phần mềm giả lập click. Bên A có quyền từ chối chi trả hoa hồng gian lận và tạm khóa tài khoản, áp dụng chế tài tại Điều 13.</p>
    <p>6.7. <b>Tính độc lập.</b> Bên B có thể đồng thời tham gia Booking Affiliate và các booking khác; thu nhập từ Booking Affiliate được ghi nhận, đối soát và chi trả riêng biệt.</p>

    <p class="contract-article-title">Điều 7. Đối soát và thanh toán theo từng hạng mục booking</p>
    <p>Nguyên tắc đối soát minh bạch: mọi bản ghi doanh số truy vết được về đơn hàng gốc; Bên B, doanh nghiệp và Bên A cùng xem một nguồn số liệu.</p>
    <table class="contract-table">
      <tr><th>Hạng mục</th><th>Bên B nhận</th><th>Bên A thu</th><th>Chu kỳ</th></tr>
      <tr><td>Luồng A (điều phối)</td><td>Booking fee + % hoa hồng affiliate</td><td>Theo chính sách nội bộ</td><td>[1 lần/tháng]</td></tr>
      <tr><td>Luồng B (Marketplace)</td><td>95% giá trị booking</td><td>5% phí dịch vụ</td><td>Sau khi hoàn thành</td></tr>
      <tr><td>Booking Affiliate</td><td>Doanh số × % hoa hồng</td><td>1% (do DN trả)</td><td>[1 lần/tháng]</td></tr>
      <tr><td>Booking AI Clone Avatar</td><td>Booking fee và/hoặc hoa hồng affiliate</td><td>Theo booking</td><td>Theo loại cấu phần</td></tr>
    </table>
    <p>7.1. Đơn hàng bị hủy/trả/hoàn trong thời hạn đối soát bị trừ ngược khỏi doanh số ghi nhận.</p>
    <p>7.2. Bên B có quyền tra cứu lịch sử thu nhập, đơn hàng và trạng thái chi trả trên App bất kỳ lúc nào.</p>
    <p>7.3. Mọi số liệu đối soát được lưu trong Ledger bất biến (append-only), không chỉnh sửa thủ công.</p>

    <p class="contract-article-title">Điều 8. Bảo mật và dữ liệu cá nhân</p>
    <p>8.1. Bên A tuân thủ Nghị định 13/2023/NĐ-CP: dữ liệu định danh (CCCD, ảnh selfie) và dữ liệu sinh trắc học (giọng nói, khuôn mặt dùng huấn luyện AI Clone) chỉ được thu thập, lưu trữ, sử dụng cho mục đích xác minh, chi trả và tạo nội dung theo booking đã phê duyệt; được mã hóa khi lưu trữ và truyền tải.</p>
    <p>8.2. Bên B đồng ý cho Bên A xử lý dữ liệu cá nhân theo đúng mục đích tại Hợp đồng và có quyền rút lại sự đồng ý, yêu cầu xóa dữ liệu theo quy định pháp luật, trừ dữ liệu cần lưu giữ để đối soát tài chính hoặc giải quyết tranh chấp.</p>
    <p>8.3. Bên B cam kết cung cấp thông tin trung thực, chính xác và chịu trách nhiệm nếu cung cấp thông tin, danh tính giả mạo.</p>

    <p class="contract-article-title">Điều 9. Bảo vệ hình ảnh và nội dung của KOC</p>
    <p>9.1. Bên A cam kết không dùng, không cho phép bên thứ ba dùng AI Clone Avatar của Bên B để tạo nội dung sai sự thật, bôi nhọ, khiêu dâm, chính trị nhạy cảm, lừa đảo hoặc gây tổn hại danh dự, uy tín, quyền lợi hợp pháp của Bên B.</p>
    <p>9.2. Bên B có quyền yêu cầu gỡ bỏ (takedown) trong thời hạn hợp lý đối với nội dung AI Clone Avatar bị sử dụng sai phạm vi, sai mục đích hoặc chưa được phê duyệt.</p>
    <p>9.3. Bên A áp dụng biện pháp kỹ thuật ngăn chặn rò rỉ, sao chép trái phép mẫu dữ liệu và mô hình clone của Bên B; thông báo cho Bên B khi phát hiện sự cố dữ liệu ảnh hưởng đến quyền lợi của Bên B.</p>
    <p>9.4. Việc chấm dứt Hợp đồng không làm mất quyền của Bên B yêu cầu chấm dứt sử dụng hình ảnh, giọng nói cho nội dung mới theo Điều 16.</p>

    <p class="contract-article-title">Điều 10. Quyền và nghĩa vụ của Bên A</p>
    <p>10.1. <b>Quyền.</b> (a) Duyệt/từ chối hồ sơ, tạm khóa tài khoản vi phạm; (b) Điều phối booking qua AI matching; (c) Vận hành AI Clone Studio, kiểm duyệt nội dung trước khi gửi Bên B; (d) Điều chỉnh chính sách hoa hồng theo quy trình thông báo tại Điều 4.1.</p>
    <p>10.2. <b>Nghĩa vụ.</b> (a) Bảo đảm hệ thống vận hành ổn định, minh bạch số liệu đối soát; (b) Chi trả đúng hạn theo chu kỳ công bố; (c) Không sử dụng hình ảnh, giọng nói của Bên B ngoài phạm vi đã phê duyệt; (d) Bảo mật dữ liệu theo Điều 8 và bảo vệ hình ảnh, nội dung theo Điều 9; (e) Hỗ trợ Bên B qua Trung tâm hỗ trợ trên Nền tảng.</p>

    <p class="contract-article-title">Điều 11. Quyền và nghĩa vụ của Bên B</p>
    <p>11.1. <b>Quyền.</b> (a) Nhận hoặc từ chối booking phù hợp; (b) Xem trước và phê duyệt mọi nội dung AI Clone trước khi công bố; (c) Yêu cầu đối soát, tra cứu lịch sử thu nhập; (d) Yêu cầu gỡ bỏ nội dung sai phạm vi theo Điều 9.2.</p>
    <p>11.2. <b>Nghĩa vụ.</b> (a) Phản hồi duyệt booking trong 24h và duyệt nội dung đúng thời hạn tại Điều 7.2; (b) Không thực hiện giao dịch ngoài hệ thống theo Điều 9.3; (c) Gắn nhãn quảng cáo theo quy định pháp luật; (d) Không sử dụng dữ liệu, khách hàng tiếp cận qua Nền tảng cho mục đích cạnh tranh trái tinh thần hợp tác; (e) Đăng tải đúng nội dung đã phê duyệt và duy trì tối thiểu theo cam kết của booking.</p>

    <p class="contract-article-title">Điều 12. Sở hữu trí tuệ</p>
    <p>Nhãn hiệu, logo, giao diện và mã nguồn của Nền tảng thuộc quyền sở hữu của Bên A; Bên B không được sao chép, phân phối lại dưới bất kỳ hình thức nào ngoài mục đích thực hiện Hợp đồng này.</p>

    <p class="contract-article-title">Điều 13. Vi phạm và bồi thường thiệt hại</p>
    <p>13.1. Bên vi phạm gây thiệt hại cho Bên còn lại có trách nhiệm bồi thường theo thiệt hại thực tế phát sinh, mức bồi thường không vượt quá tổng giá trị các booking phát sinh trong [1] tháng gần nhất, trừ trường hợp vi phạm nghiêm trọng tại khoản 13.2.</p>
    <p>13.2. Đối với vi phạm nghiêm trọng (gian lận hồ sơ/KYC, giao dịch ngoài hệ thống, sử dụng/đăng tải nội dung chưa được phê duyệt, sử dụng AI Clone Avatar sai mục đích gây tổn hại), Bên bị vi phạm có quyền đơn phương chấm dứt Hợp đồng ngay lập tức, tạm khóa/chấm dứt tài khoản và thu hồi khoản lợi bất hợp pháp mà không cần tuân thủ thời hạn báo trước.</p>

    <p class="contract-article-title">Điều 14. Chấm dứt hợp đồng</p>
    <p>14.1. Mỗi Bên có quyền chấm dứt Hợp đồng bằng thông báo trước 15–30 ngày qua email hoặc thông báo trên Nền tảng.</p>
    <p>14.2. Trường hợp chấm dứt do vi phạm nghiêm trọng của Bên còn lại theo Điều 13.2, Bên chấm dứt không cần tuân thủ thời hạn báo trước.</p>
    <p>14.3. Các booking đang dang dở tại thời điểm chấm dứt tiếp tục được xử lý và chi trả đầy đủ theo cam kết cho đến khi hoàn tất, trừ trường hợp chấm dứt do vi phạm nghiêm trọng của Bên B.</p>
    <p>14.4. Sau khi chấm dứt, Bên A ngừng sử dụng hình ảnh, giọng nói của Bên B cho nội dung mới; nội dung đã phát hành công khai trước thời điểm chấm dứt tiếp tục lưu hành trừ khi hai Bên có thỏa thuận khác bằng văn bản.</p>

    <p class="contract-article-title">Điều 15. Sự kiện bất khả kháng</p>
    <p>Sự kiện bất khả kháng (thiên tai, dịch bệnh, thay đổi chính sách pháp luật, sự cố hạ tầng kỹ thuật diện rộng nằm ngoài khả năng kiểm soát...) làm Bên bị ảnh hưởng được miễn trách nhiệm tương ứng với phần nghĩa vụ không thể thực hiện, với điều kiện thông báo kịp thời cho Bên còn lại và áp dụng biện pháp khắc phục hợp lý.</p>

    <p class="contract-article-title">Điều 16. Giải quyết tranh chấp</p>
    <p>Mọi tranh chấp phát sinh từ hoặc liên quan đến Hợp đồng này được hai Bên ưu tiên giải quyết thông qua thương lượng, hòa giải. Trường hợp không đạt thỏa thuận trong vòng 30 ngày kể từ ngày phát sinh tranh chấp, một trong hai Bên có quyền khởi kiện tại Tòa án có thẩm quyền tại [•] theo quy định pháp luật Việt Nam.</p>

    <p class="contract-article-title">Điều 17. Hiệu lực và giá trị pháp lý của chữ ký điện tử</p>
    <p>17.1. Hợp đồng được giao kết bằng phương thức điện tử: Bên B xác nhận đã đọc và đồng ý toàn bộ điều khoản (tick xác nhận) kết hợp xác thực bằng mã OTP/chữ ký số gửi tới số điện thoại/email đã đăng ký. Hình thức này có giá trị pháp lý tương đương văn bản giấy có chữ ký tay theo Luật Giao dịch điện tử số 20/2023/QH15.</p>
    <p>17.2. Thời điểm ký kết được xác định theo timestamp hệ thống ghi nhận khi Bên B hoàn tất xác nhận OTP; dữ liệu ký kết được lưu trữ bất biến kèm mã băm (hash) chống chỉnh sửa, phục vụ đối soát và giải quyết tranh chấp.</p>
    <p>17.3. Hợp đồng có hiệu lực kể từ thời điểm Bên A xác nhận phê duyệt hồ sơ và kích hoạt tài khoản chính thức cho Bên B trên Nền tảng.</p>
    <p>17.4. Hợp đồng được lập thành 01 bản điện tử duy nhất, lưu trữ trên hệ thống của Bên A; hai Bên có thể tải bản sao có giá trị như bản chính bất kỳ lúc nào qua tài khoản của mình.</p>

    <div class="contract-signblock">
      <div>
        <div class="sign-label">ĐẠI DIỆN BÊN A (NETVIET)</div>
        (Ký điện tử / chữ ký số)<br>Họ tên: [•]<br>Chức vụ: [•]
      </div>
      <div>
        <div class="sign-label">BÊN B (KOC/KOL)</div>
        ${
          signedMode && d.signature
            ? `<img src="${d.signature}" alt="Chữ ký KOC" style="max-width:180px;max-height:70px;display:block;margin:4px 0">(Xác nhận tick + OTP)<br>Họ tên: ${esc(d.name) || "[•]"}<br>Timestamp: ${fmtDateTime(d.signedAt)}<br>Hash: ${esc(d.hash) || "[•]"}`
            : `(Xác nhận tick + OTP)<br>Họ tên: ${esc(d.name) || "[•]"}<br>Timestamp: [•]<br>Hash: [•]`
        }
      </div>
    </div>

    <p class="contract-endnote">Ghi chú: Đây là bản mẫu hợp đồng do NetViet soạn thảo. Trước khi ban hành, đề nghị bộ phận pháp chế/luật sư rà soát để bảo đảm phù hợp quy định pháp luật hiện hành và điền đầy đủ các trường [•].</p>`;
  }

  function signedContractSnapshot() {
    return `${CONTRACT_STYLE}
      <div class="contract-box">
        <div class="contract-header">
          <p class="contract-title">HỢP ĐỒNG HỢP TÁC KOC/KOL — ĐÃ KÝ</p>
          <p class="contract-subtitle">Ký kết bằng phương thức điện tử theo Luật Giao dịch điện tử số 20/2023/QH15</p>
          <p class="doc-no">Số: HĐ-KOC-[•]/[NĂM]-NETVIET · Ký lúc: ${fmtDateTime(d.signedAt)}</p>
        </div>
        <div class="contract-scroll" style="max-height:none;overflow:visible">
          <div class="contract-basis">
            <b>Căn cứ:</b>
            <ul>
              <li>Bộ luật Dân sự số 91/2015/QH13;</li>
              <li>Luật Giao dịch điện tử số 20/2023/QH15;</li>
              <li>Luật Thương mại số 36/2005/QH11 và pháp luật về thương mại điện tử;</li>
              <li>Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân;</li>
              <li>Luật Quảng cáo số 16/2012/QH13 (sửa đổi, bổ sung) và quy định về gắn nhãn nội dung quảng cáo;</li>
              <li>Nhu cầu và sự tự nguyện thỏa thuận hợp tác của hai Bên.</li>
            </ul>
          </div>
          <p>Hôm nay, tại thời điểm được ghi nhận bởi hệ thống (timestamp điện tử), các Bên gồm:</p>
          ${contractBody({ signed: true })}
        </div>
      </div>`;
  }

  function renderStep4() {
    if (d.signStage === "sign") renderStep4Sign();
    else if (d.signStage === "review") renderStep4Review();
    else renderStep4Read();
    bindChrome();
  }

  // 4a. Đọc toàn văn + tick đồng ý
  function renderStep4Read() {
    el.innerHTML = wrap(
      `${CONTRACT_STYLE}
      <div class="contract-box" id="o-terms-box">
        <div class="contract-header">
          <p class="contract-title">HỢP ĐỒNG HỢP TÁC KOC/KOL</p>
          <p class="contract-subtitle">Ký kết bằng phương thức điện tử theo Luật Giao dịch điện tử số 20/2023/QH15</p>
          <p class="doc-no">Số: HĐ-KOC-[•]/[NĂM]-NETVIET</p>
        </div>
        <div class="contract-scroll" id="o-terms">
          <div class="contract-basis">
            <b>Căn cứ:</b>
            <ul>
              <li>Bộ luật Dân sự số 91/2015/QH13;</li>
              <li>Luật Giao dịch điện tử số 20/2023/QH15;</li>
              <li>Luật Thương mại số 36/2005/QH11 và pháp luật về thương mại điện tử;</li>
              <li>Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân;</li>
              <li>Luật Quảng cáo số 16/2012/QH13 (sửa đổi, bổ sung) và quy định về gắn nhãn nội dung quảng cáo;</li>
              <li>Nhu cầu và sự tự nguyện thỏa thuận hợp tác của hai Bên.</li>
            </ul>
          </div>
          <p>Hôm nay, tại thời điểm được ghi nhận bởi hệ thống (timestamp điện tử), các Bên gồm:</p>
          ${contractBody({ signed: false })}
          <p class="contract-scroll-end">— Bạn đã đọc hết toàn văn hợp đồng —</p>
        </div>
      </div>

      <label class="required-label" style="display:flex;gap:8px;align-items:center;margin-top:14px;opacity:${d.termsRead ? 1 : 0.5}" id="o-agree-wrap">
        <input type="checkbox" id="o-agree" style="width:auto" ${d.termsRead ? "" : "disabled"} ${d.agreed ? "checked" : ""}> Tôi đã đọc và đồng ý toàn bộ nội dung Hợp đồng hợp tác KOC/KOL
      </label>
      <div class="row" style="gap:10px;margin-top:16px">
        <button type="button" class="btn ghost" id="o-prev" style="flex:1">← Quay lại</button>
        <button type="button" class="btn navy" id="o-sign" style="flex:2" ${d.agreed ? "" : "disabled"}>✍️ Ký hợp đồng điện tử</button>
      </div>`,
      { hideNav: true },
    );

    const termsEl = document.getElementById("o-terms");
    if (termsEl) {
      termsEl.addEventListener("scroll", () => {
        const atBottom =
          termsEl.scrollTop + termsEl.clientHeight >= termsEl.scrollHeight - 8;
        if (atBottom && !d.termsRead) {
          d.termsRead = true;
          const wrapEl = document.getElementById("o-agree-wrap");
          const chk = document.getElementById("o-agree");
          if (wrapEl) wrapEl.style.opacity = 1;
          if (chk) chk.disabled = false;
        }
      });
    }
    const agreeChk = el.querySelector("#o-agree");
    if (agreeChk) {
      agreeChk.addEventListener("change", (e) => {
        d.agreed = e.target.checked;
        const signBtn = el.querySelector("#o-sign");
        if (signBtn) signBtn.disabled = !d.agreed;
      });
    }
    const signBtn = el.querySelector("#o-sign");
    if (signBtn)
      signBtn.addEventListener("click", () => {
        if (!d.agreed) return;
        d.signStage = "sign";
        renderStep4();
      });
  }

  // 4b. Ô ký tên (canvas vẽ chữ ký)
  function renderStep4Sign() {
    el.innerHTML = wrap(
      `${CONTRACT_STYLE}
      <div class="signpad-box">
        <h3 class="required-label" style="margin-bottom:6px">Ký tên xác nhận hợp đồng</h3>
        <p class="muted" style="font-size:12.5px;margin-bottom:12px">Dùng chuột hoặc ngón tay để ký tên vào khung bên dưới.</p>
        <div class="signpad-canvas-wrap">
          <canvas id="o-sign-pad" width="480" height="200" style="width:100%;height:200px;touch-action:none;cursor:crosshair;display:block"></canvas>
        </div>
        <div class="row" style="gap:8px;margin-top:10px">
          <button type="button" class="btn ghost" id="o-sign-clear" style="flex:1">Xóa chữ ký</button>
        </div>
      </div>
      <div class="row" style="gap:10px;margin-top:16px">
        <button type="button" class="btn ghost" id="o-sign-back" style="flex:1">← Quay lại đọc hợp đồng</button>
        <button type="button" class="btn navy" id="o-sign-confirm" style="flex:2" disabled>Xác nhận chữ ký →</button>
      </div>`,
      { hideNav: true },
    );

    const canvas = el.querySelector("#o-sign-pad");
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1F3A";

    let drawing = false;
    let hasStroke = false;
    const confirmBtn = el.querySelector("#o-sign-confirm");

    const posFromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };
    const start = (e) => {
      drawing = true;
      const p = posFromEvent(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (e) => {
      if (!drawing) return;
      const p = posFromEvent(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      hasStroke = true;
      if (confirmBtn) confirmBtn.disabled = false;
    };
    const end = () => {
      drawing = false;
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);

    const clearPad = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke = false;
      if (confirmBtn) confirmBtn.disabled = true;
    };
    el.querySelector("#o-sign-clear").addEventListener("click", clearPad);

    el.querySelector("#o-sign-back").addEventListener("click", () => {
      d.signStage = "read";
      renderStep4();
    });
    confirmBtn.addEventListener("click", () => {
      if (!hasStroke) return;
      d.signature = canvas.toDataURL("image/png");
      d.signedAt = Date.now();
      d.signStage = "review";
      renderStep4();
    });
  }

  // 4c. Xem lại hợp đồng đã ký + xác nhận hoàn tất đăng ký
  function renderStep4Review() {
    el.innerHTML = wrap(
      `${CONTRACT_STYLE}
      <div class="contract-box" id="o-terms-box">
        <div class="contract-header">
          <p class="contract-title">HỢP ĐỒNG HỢP TÁC KOC/KOL — ĐÃ KÝ</p>
          <p class="contract-subtitle">Xem lại toàn văn hợp đồng kèm chữ ký trước khi hoàn tất đăng ký</p>
          <p class="doc-no">Số: HĐ-KOC-[•]/[NĂM]-NETVIET · Ký lúc: ${fmtDateTime(d.signedAt)}</p>
        </div>
        <div class="contract-scroll" id="o-terms-review">
          <div class="contract-basis">
            <b>Căn cứ:</b>
            <ul>
              <li>Bộ luật Dân sự số 91/2015/QH13;</li>
              <li>Luật Giao dịch điện tử số 20/2023/QH15;</li>
              <li>Luật Thương mại số 36/2005/QH11 và pháp luật về thương mại điện tử;</li>
              <li>Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân;</li>
              <li>Luật Quảng cáo số 16/2012/QH13 (sửa đổi, bổ sung) và quy định về gắn nhãn nội dung quảng cáo;</li>
              <li>Nhu cầu và sự tự nguyện thỏa thuận hợp tác của hai Bên.</li>
            </ul>
          </div>
          <p>Hôm nay, tại thời điểm được ghi nhận bởi hệ thống (timestamp điện tử), các Bên gồm:</p>
          ${contractBody({ signed: true })}
        </div>
      </div>
      <div class="row" style="gap:10px;margin-top:16px">
        <button type="button" class="btn ghost" id="o-sign-again" style="flex:1">← Ký lại</button>
        <button type="button" class="btn primary" id="o-sign" style="flex:2">✔ Xác nhận & Hoàn tất đăng ký</button>
      </div>`,
      { hideNav: true },
    );

    el.querySelector("#o-sign-again").addEventListener("click", () => {
      d.signature = "";
      d.signedAt = null;
      d.signStage = "sign";
      renderStep4();
    });
    el.querySelector("#o-sign").addEventListener("click", submit);
  }

  function collect4() {
    /* checkbox/scroll/signature state already tracked live in d */
  }

  // ---------- Step 5: Hoàn tất ----------
  function renderStep5() {
    el.innerHTML = wrap(
      `
      <div class="empty"><div class="ico">🎉</div>
        <h2>Hồ sơ đã gửi — chờ duyệt</h2>
        <p class="muted" style="margin-top:8px">Hạng: <b>${d.tier}</b></p>
        <div class="copybox" style="margin:12px auto;max-width:420px">Mã hợp đồng: ${esc(d.hash || "").slice(0, 24)}…</div>
        <p class="muted">Timestamp: ${fmtDateTime(d.ts || Date.now())}</p>
        <p class="muted" style="margin-top:14px">Tài khoản đã được tạo. Đội ngũ quản trị sẽ duyệt hồ sơ; sau khi được kích hoạt, bạn mới có thể đăng nhập và xuất hiện trên trang khám phá KOC.</p>
        ${partnerInviteToken ? `<p class="partner-invite-notice success" style="margin-top:12px">Sau khi hồ sơ được duyệt, bạn sẽ thuộc đội KOC của <b>${esc(partnerName || "đối tác đã mời")}</b>.</p>` : ""}
      </div>
      <a href="#/login" class="btn primary">Về trang đăng nhập</a>`,
      { hideNav: true },
    );
    bindChrome();
  }

  async function submit() {
    if (submitting) return;
    submitting = true;
    const btn = el.querySelector("#o-sign");
    btn.disabled = true;
    btn.textContent = "Đang xử lý…";
    try {
      const r = await post("/api/onboard", {
        name: d.name,
        phone: d.phone,
        email: d.email,
        password: d.password,
        province: d.province,
        categories: d.categories,
        followers: d.followers,
        followerVerificationToken: "",
        partnerInviteToken,
        bio: d.bio,
        socials: d.socials,
        prices: d.prices,
        price_descriptions: d.priceDescriptions,
        identity: {
          dob: d.dob,
          cccd: d.cccd,
          cccdDate: d.cccdDate,
          cccdPlace: d.cccdPlace,
          address: d.address,
        },
        bank: {
          name: d.bankName,
          bin: d.bankBin,
          account: d.bankAccount,
          owner: d.bankOwner,
        },
        kyc: { ok: true, files: d.files },
        contract: {
          signature: d.signature,
          signedAt: d.signedAt,
          html: signedContractSnapshot(),
        },
      });
      d.hash = r.hash;
      d.ts = r.ts;
      d.tier = r.tier;
      if (partnerInviteToken) sessionStorage.removeItem("koc-viet:partner-invite");
      step = 5;
      render();
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false;
      btn.textContent = "✔ Xác nhận & Hoàn tất đăng ký";
    } finally {
      submitting = false;
    }
  }

  render();
}

function tierOf(followers) {
  if (followers >= 1000000) return "Mega";
  if (followers >= 300000) return "Macro";
  if (followers >= 100000) return "Mid";
  if (followers >= 10000) return "Micro";
  return "Nano";
}
