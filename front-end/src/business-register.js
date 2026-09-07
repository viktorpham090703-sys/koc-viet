import { post } from "./api.js";
import { esc, toast } from "./ui.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function renderBusinessRegister(el) {
  const data = {
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    industry: "",
    taxCode: "",
    licenseFile: "",
    licenseName: "",
    licenseType: "",
    code: "",
    password: "",
    passwordConfirmation: "",
    otpEmail: "",
    resendAt: 0,
  };
  let timer = null;

  const eyeOpen = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/>
    <circle cx="12" cy="12" r="2.5"/></svg>`;
  const eyeClosed = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 3l18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8"/>
    <path d="M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1"/>
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

  const passwordField = (id, label, value, placeholder = "") => `
    <div class="field"><label>${label}</label><div style="position:relative">
      <input id="${id}" type="password" autocomplete="new-password" minlength="8"
        maxlength="128" value="${esc(value)}" placeholder="${placeholder}" style="padding-right:48px">
      <button type="button" class="biz-password-toggle" data-target="${id}"
        aria-label="Hiển thị ${label.toLowerCase()}" aria-pressed="false"
        style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:36px;height:36px;padding:0;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center">
        ${eyeClosed}
      </button></div><div class="err" id="${id}-err" style="display:none"></div></div>`;

  function renderForm() {
    el.innerHTML = `<div class="auth" style="padding:24px 12px">
      <div class="auth-card" style="max-width:620px">
        <div class="logo" style="text-align:center;margin-bottom:4px">KOC<span> Viet</span></div>
        <h2 style="text-align:center;margin-bottom:6px">Đăng ký doanh nghiệp</h2>
        <p class="muted" style="text-align:center;margin-bottom:18px">Tạo tài khoản doanh nghiệp và chờ đội ngũ quản trị xác minh.</p>
        <div class="field"><label>Tên doanh nghiệp</label><input id="br-company" value="${esc(data.companyName)}" placeholder="Công ty TNHH ABC"></div>
        <div class="field"><label>Người liên hệ</label><input id="br-contact" value="${esc(data.contactName)}" placeholder="Nguyễn Văn A"></div>
        <div class="field"><label>Số điện thoại</label><input id="br-phone" inputmode="tel" value="${esc(data.phone)}" placeholder="09xxxxxxxx"></div>
        <div class="field"><label>Email đăng nhập</label><input id="br-email" type="email" autocomplete="email" value="${esc(data.email)}" placeholder="business@company.vn"></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
          <div class="field"><label>Ngành nghề</label><input id="br-industry" value="${esc(data.industry)}" placeholder="Mỹ phẩm, thời trang…"></div>
          <div class="field"><label>Mã số thuế</label><input id="br-tax" inputmode="numeric" value="${esc(data.taxCode)}" placeholder="10 hoặc 13 chữ số"></div>
        </div>
        <div class="field"><label>Giấy phép kinh doanh</label>
          <input id="br-license" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp">
          <div class="muted" id="br-license-status" style="font-size:12px;margin-top:6px">
            ${data.licenseName ? `Đã chọn: ${esc(data.licenseName)}` : "Bắt buộc · PDF/JPG/PNG/WebP · tối đa 3 MB"}
          </div>
        </div>
        ${passwordField("br-password", "Mật khẩu", data.password, "Tối thiểu 8 ký tự")}
        ${passwordField("br-password-confirmation", "Xác nhận mật khẩu", data.passwordConfirmation)}
        <div class="field"><label>Mã OTP nhận được qua email</label><input id="br-code" class="otp-in"
          maxlength="6" inputmode="numeric" autocomplete="one-time-code" value="${esc(data.code)}" placeholder="••••••"></div>
        <div id="br-otp-status" class="muted" style="font-size:12px;margin-bottom:8px">Email thường được gửi trong vòng 30 giây.</div>
        <button type="button" class="btn ghost" id="br-send">Gửi mã OTP qua email</button>
        <button type="button" class="btn primary" id="br-submit" style="margin-top:10px">Gửi đăng ký</button>
        <div class="row" style="margin-top:14px"><a href="#/login" class="muted" style="font-size:12px;text-align:center;width:100%">← Quay lại đăng nhập</a></div>
      </div></div>`;
    bind();
    updateOtpButton();
  }

  function collect() {
    data.companyName = value("br-company").trim();
    data.contactName = value("br-contact").trim();
    data.phone = value("br-phone").trim();
    data.email = value("br-email").trim().toLowerCase();
    data.industry = value("br-industry").trim();
    data.taxCode = value("br-tax").trim();
    data.password = value("br-password");
    data.passwordConfirmation = value("br-password-confirmation");
    data.code = value("br-code").trim();
  }

  function value(id) {
    return el.querySelector("#" + id)?.value || "";
  }

  function bind() {
    el.querySelector("#br-send").addEventListener("click", sendOtp);
    el.querySelector("#br-submit").addEventListener("click", submit);
    el.querySelector("#br-code").addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    });
    el.querySelector("#br-license").addEventListener("change", readLicense);
    el.querySelector("#br-email").addEventListener("input", (event) => {
      const email = event.target.value.trim().toLowerCase();
      if (data.otpEmail && email !== data.otpEmail) {
        data.otpEmail = "";
        data.resendAt = 0;
      }
      data.email = email;
      updateOtpButton();
    });
    el.querySelectorAll(".biz-password-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const input = el.querySelector("#" + button.dataset.target);
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        button.innerHTML = visible ? eyeClosed : eyeOpen;
        button.setAttribute("aria-pressed", String(!visible));
        input.focus();
      });
    });
  }

  function readLicense(event) {
    const file = event.target.files?.[0];
    const status = el.querySelector("#br-license-status");
    data.licenseFile = "";
    data.licenseName = "";
    data.licenseType = "";
    if (!file) {
      status.textContent = "Bắt buộc · PDF/JPG/PNG/WebP · tối đa 3 MB";
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      event.target.value = "";
      status.textContent = "Định dạng không hợp lệ";
      return toast("Giấy phép phải là PDF, JPG, PNG hoặc WebP", "err");
    }
    if (file.size > 3 * 1024 * 1024) {
      event.target.value = "";
      status.textContent = "File vượt quá 3 MB";
      return toast("Giấy phép kinh doanh không được vượt quá 3 MB", "err");
    }
    status.textContent = "Đang đọc file…";
    const reader = new FileReader();
    reader.onload = () => {
      data.licenseFile = String(reader.result || "");
      data.licenseName = file.name.slice(0, 180);
      data.licenseType = file.type;
      status.textContent = `Đã chọn: ${data.licenseName}`;
    };
    reader.onerror = () => {
      event.target.value = "";
      status.textContent = "Không đọc được file";
      toast("Không đọc được giấy phép kinh doanh", "err");
    };
    reader.readAsDataURL(file);
  }

  function updateOtpButton() {
    const button = el.querySelector("#br-send");
    const status = el.querySelector("#br-otp-status");
    if (!button || !status) return;
    const seconds = Math.max(0, Math.ceil((data.resendAt - Date.now()) / 1000));
    button.disabled = seconds > 0;
    button.textContent = seconds > 0 ? `Gửi lại sau ${seconds}s` : "Gửi mã OTP qua email";
    status.textContent = data.otpEmail
      ? `Mã đã được gửi tới ${data.otpEmail}.`
      : "Email thường được gửi trong vòng 30 giây.";
  }

  async function sendOtp() {
    collect();
    if (!emailPattern.test(data.email)) return toast("Email không hợp lệ", "err");
    const button = el.querySelector("#br-send");
    button.disabled = true;
    button.textContent = "Đang gửi…";
    try {
      const result = await post("/api/business-register/email-otp", { email: data.email });
      data.otpEmail = data.email;
      data.resendAt = Date.now() + Number(result.resendIn || 30) * 1000;
      toast("Đã gửi mã OTP tới email của bạn", "ok");
      clearInterval(timer);
      timer = setInterval(() => {
        updateOtpButton();
        if (Date.now() >= data.resendAt) clearInterval(timer);
      }, 1000);
    } catch (error) {
      toast(error.message, "err");
    } finally {
      updateOtpButton();
    }
  }

  async function submit() {
    collect();
    if (data.companyName.length < 2) return toast("Nhập tên doanh nghiệp", "err");
    if (data.contactName.length < 2) return toast("Nhập tên người liên hệ", "err");
    if (!/^0\d{9}$/.test(data.phone)) return toast("Số điện thoại không hợp lệ", "err");
    if (!emailPattern.test(data.email)) return toast("Email không hợp lệ", "err");
    if (data.password.length < 8) return toast("Mật khẩu phải có ít nhất 8 ký tự", "err");
    if (data.password !== data.passwordConfirmation) return toast("Mật khẩu xác nhận không khớp", "err");
    if (!/^\d{10}(?:\d{3})?$/.test(data.taxCode)) return toast("Mã số thuế phải gồm 10 hoặc 13 chữ số", "err");
    if (!data.licenseFile) return toast("Vui lòng tải lên giấy phép kinh doanh", "err");
    if (!/^\d{6}$/.test(data.code)) return toast("Nhập mã OTP gồm 6 chữ số", "err");
    if (data.otpEmail !== data.email) return toast("Vui lòng gửi OTP tới email này trước", "err");

    const button = el.querySelector("#br-submit");
    button.disabled = true;
    button.textContent = "Đang gửi đăng ký…";
    try {
      await post("/api/business-register", {
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        industry: data.industry,
        taxCode: data.taxCode,
        licenseFile: data.licenseFile,
        licenseName: data.licenseName,
        licenseType: data.licenseType,
        password: data.password,
        code: data.code,
      });
      clearInterval(timer);
      el.innerHTML = `<div class="auth"><div class="auth-card" style="text-align:center">
        <div style="font-size:48px"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em></div>
        <h2 style="margin:10px 0">Đăng ký thành công</h2>
        <p class="muted">Tài khoản doanh nghiệp đang chờ duyệt. Sau khi được kích hoạt, bạn có thể đăng nhập trang doanh nghiệp.</p>
        <a href="#/login" class="btn primary" style="margin-top:18px">Về trang đăng nhập</a>
      </div></div>`;
    } catch (error) {
      toast(error.message, "err");
      button.disabled = false;
      button.textContent = "Gửi đăng ký";
    }
  }

  renderForm();
}
