import { post } from "./api.js";
import { money, esc, toast, modal, closeModal } from "./ui.js";
import { state } from "./app.js";
import { bankIdentityHtml } from "./payout-banks.js";

export function withdrawModal(balance, payout, onSuccess, endpoint = "/api/wallet/withdraw", minimum = 10_000) {
  const minimumWithdrawLabel = minimum.toLocaleString("vi-VN");
  const hasBank = payout && payout.bank_account && payout.bank_name && payout.bank_owner && /^\d{6}$/.test(String(payout.bank_bin || ""));
  const m = modal(`<h2 id="wd-title">Gửi yêu cầu rút tiền</h2>
    <p class="muted">Khả dụng: <b class="money">${money(balance)}</b> · Tối thiểu ${minimumWithdrawLabel}đ</p>
    <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);padding:10px 14px;border-radius:8px;margin:10px 0;font-size:12px;color:var(--text);line-height:1.5">
      ℹ️ <strong>Quy trình chi trả:</strong> Yêu cầu rút tiền sẽ được NetViet kiểm duyệt và chuyển khoản vào tài khoản ngân hàng của bạn trong vòng <strong>6 - 24 giờ làm việc</strong>.
    </div>
    ${
      hasBank
        ? `<div style="background:var(--bg-muted);padding:10px;border-radius:8px;margin:10px 0;font-size:13px">
              <div class="between"><span class="muted">Ngân hàng nhận:</span> ${bankIdentityHtml(state.config?.payoutBanks, payout.bank_name, payout.bank_bin)}</div>
              <div><span class="muted">Số tài khoản:</span> <b>${esc(payout.bank_account)}</b> (${esc(payout.bank_owner || "")})</div>
             </div>`
        : `<div style="color:var(--error);background:rgba(239,68,68,0.1);padding:10px;border-radius:8px;margin:10px 0;font-size:13px">
              ⚠️ Chưa cập nhật thông tin ngân hàng. Vui lòng thiết lập tài khoản nhận tiền trong Hồ sơ trước khi rút.
             </div>`
    }
    <div class="field" style="margin-top:12px"><label class="required-label" for="wd-amt">Số tiền rút</label><input id="wd-amt" type="number" placeholder="đ" value="${minimum}" min="${minimum}" step="1" max="${balance}"></div>
    <div class="field"><label class="required-label" for="wd-otp">Mã OTP gửi qua email</label><div class="row" style="gap:8px">
      <input id="wd-otp" class="otp-in" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" style="flex:1">
      <button class="btn ghost sm" id="wd-send-otp" type="button">Gửi OTP</button>
    </div></div>
    <button class="btn primary" id="wd-go" ${!hasBank || balance < minimum ? "disabled" : ""} style="width:100%">📨 Gửi yêu cầu rút tiền</button>
    <button data-modal-dismiss class="btn ghost" id="wd-cancel" style="width:100%;margin-top:8px">Hủy</button>`);
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-labelledby', 'wd-title');
  m.querySelector('#wd-amt').focus();
  m.querySelector("#wd-cancel").addEventListener("click", closeModal);
  m.querySelector("#wd-send-otp").addEventListener("click", async () => {
    const sendButton = m.querySelector("#wd-send-otp");
    sendButton.disabled = true;
    sendButton.textContent = "Đang gửi…";
    try {
      const result = await post("/api/otp", {});
      toast("Mã OTP đã được gửi tới email của bạn", "ok");
      let remaining = Number(result.resendIn || 30);
      const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0 || !m.isConnected) {
          clearInterval(timer);
          if (m.isConnected) {
            sendButton.disabled = false;
            sendButton.textContent = "Gửi lại OTP";
          }
        } else {
          sendButton.textContent = `Gửi lại (${remaining}s)`;
        }
      }, 1000);
    } catch (error) {
      toast(error.message, "err");
      sendButton.disabled = false;
      sendButton.textContent = "Gửi OTP";
    }
  });
  m.querySelector("#wd-go").addEventListener("click", async () => {
    const amount = Number(m.querySelector("#wd-amt").value);
    const otp = m.querySelector("#wd-otp").value.trim();
    if (!Number.isSafeInteger(amount) || amount < minimum) {
      toast(`Ngưỡng rút tối thiểu ${minimumWithdrawLabel}đ`, "err");
      return;
    }
    if (!hasBank) { toast("Vui lòng cập nhật ngân hàng trong Hồ sơ", "err"); return; }
    if (amount > balance) { toast("Số dư khả dụng không đủ", "err"); return; }
    if (!/^\d{6}$/.test(otp)) {
      toast("Vui lòng nhập mã OTP", "err");
      return;
    }
    const goBtn = m.querySelector("#wd-go");
    goBtn.disabled = true;
    try {
      const res = await post(endpoint, { amount, otp });
      toast(res.message || "Yêu cầu rút tiền thành công", "ok");
      closeModal();
      await onSuccess();
    } catch (e) {
      toast(e.message, "err");
      const retryAfter = Math.max(0, Math.ceil(Number(e.retryAfter)));
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        const originalLabel = goBtn.textContent;
        let remaining = retryAfter;
        goBtn.textContent = `Thử lại (${remaining}s)`;
        const timer = setInterval(() => {
          remaining--;
          if (remaining <= 0 || !m.isConnected) {
            clearInterval(timer);
            if (m.isConnected) {
              goBtn.disabled = false;
              goBtn.textContent = originalLabel;
            }
          } else {
            goBtn.textContent = `Thử lại (${remaining}s)`;
          }
        }, 1000);
      } else {
        goBtn.disabled = false;
      }
    }
  });
}

// ---------- Điều khoản xác nhận tham gia Chương trình "AI Clone Avatar" ----------
// Toàn văn lấy từ file DieuKhoan_XacNhan_AICloneAvatar.docx — KOC bắt buộc cuộn hết mới được tick đồng ý.
