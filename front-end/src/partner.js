import { api, post } from "./api.js";
import { withdrawModal } from "./withdrawal.js";
import {
  money,
  num,
  esc,
  fmtDate,
  tierBadge,
  statusChip,
  spinner,
  empty,
  toast,
  avatarUrl,
  passwordInputHtml,
  bindPasswordToggles,
  copyToClipboard,
  confirmDialog,
} from "./ui.js";
import { state, logout, enhancePortal } from "./app.js";
import { brandLogo, icon } from "./icons.js";
import { autoAnimate } from "./animations.js";
import {
  bankIdentityHtml,
  bankPickerHtml,
  bindBankPicker,
  selectedPayoutBank,
} from "./payout-banks.js";

const NAV = [
  ["#/dashboard", icon("home", "sidebar-icon"), "Trang chủ"],
  ["#/wallet", icon("wallet", "sidebar-icon"), "Ví"],
  ["#/kocs", icon("kocApp", "sidebar-icon"), "KOC"],
  ["#/report", icon("report", "sidebar-icon"), "Báo cáo doanh thu"],
];
const PAGES = ["dashboard", "kocs", "report", "wallet", "profile"];

const bankIncomplete = (p) =>
  !(p && p.bank_name && p.bank_bin && p.bank_account && p.bank_owner);

async function refreshPartnerBanners() {
  const box = document.getElementById("pn-banners");
  if (!box) return;
  try {
    const r = await api("/api/partner/profile");
    box.innerHTML = partnerBannersHtml(r.partner);
  } catch (_) {}
}

function partnerBannersHtml(p) {
  const items = [];
  if (state.user.must_change_password) {
    items.push(
      `Bạn đang dùng mật khẩu tạm thời. Vui lòng đổi mật khẩu để bảo mật tài khoản.`,
    );
  }
  if (bankIncomplete(p)) {
    items.push(
      `Hồ sơ chưa có thông tin ngân hàng nhận chi trả. Vui lòng cập nhật để KOC Việt thanh toán hoa hồng cho bạn.`,
    );
  }
  if (!items.length) return "";
  return `<div style="margin-bottom:16px;display:flex;flex-direction:column;gap:10px">
    ${items
      .map(
        (
          msg,
        ) => `<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412">
        <span style="font-size:16px">⚠️</span>
        <span style="flex:1;min-width:200px;font-size:13px">${msg}</span>
        <a href="#/profile" class="btn ghost sm" style="border-color:#fdba74;color:#9a3412">Cập nhật hồ sơ</a>
      </div>`,
      )
      .join("")}
  </div>`;
}

export async function renderPartner(el, hash) {
  const page = hash.replace("#/", "") || "dashboard";
  const active = "#/" + (PAGES.includes(page) ? page : "dashboard");
  el.innerHTML = `<div class="portal business-portal">
    <div class="sidebar"><div class="brand"><a class="portal-brand-link" href="#/dashboard" aria-label="KOC Việt — Cổng đối tác">${brandLogo()}</a></div>
      <nav class="portal-nav">${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}">${n[1]}<span>${n[2]}</span></a>`).join("")}</nav><button class="btn ghost sm portal-sidebar-logout" id="pn-logout">Đăng xuất</button></div>
    <div class="main"><div class="topbar portal-topbar">
      <div class="portal-context"><span class="portal-context-label">KOC VIET</span><h2>Cổng đối tác</h2></div>
      <div class="portal-account"><a class="portal-account-identity" href="#/profile" aria-label="Mở hồ sơ đối tác"><div class="portal-account-avatar" aria-hidden="true">${esc((state.user.name || "P").charAt(0).toUpperCase())}</div><div class="portal-account-meta"><strong>${esc(state.user.name)}</strong><span>Đối tác</span></div></a></div></div>
      <div class="content"><div id="pn-banners"></div><div id="pn-view"></div></div></div></div>`;
  document.getElementById("pn-logout").addEventListener("click", logout);
  enhancePortal();
  const view = document.getElementById("pn-view");
  try {
    // One shell-level fetch to drive the reminder banners on every page.
    void refreshPartnerBanners();
    if (active === "#/dashboard") await dashboard(view);
    else if (active === "#/kocs") await kocsPage(view);
    else if (active === "#/report") await report(view);
    else if (active === "#/wallet") await wallet(view);
    else if (active === "#/profile") await profile(view);
    autoAnimate(view);
  } catch (e) {
    view.innerHTML = empty("⚠️", e.message);
  }
}

function stat(l, v, sub = "") {
  return `<div class="card"><div class="muted">${l}</div><div style="font-size:24px;font-weight:800;margin-top:4px" class="money">${v}</div>${sub ? `<div class="muted" style="font-size:12px;margin-top:2px">${sub}</div>` : ""}</div>`;
}

const inviteUrl = (token) =>
  `${location.origin}/#/tham-gia-doi-tac/${encodeURIComponent(String(token || ""))}`;

function partnerInviteCard(invite) {
  if (!invite?.available) {
    return `<section class="card partner-invite-manage is-disabled">
      <div class="partner-invite-manage-title">
        <span class="partner-invite-manage-icon" aria-hidden="true"><img src="/images/koc-viet-app-icon.png" alt=""></span>
        <div><span class="partner-invite-manage-kicker">MỜI KOC VÀO ĐỘI</span><h2>Liên kết mời đang tạm khóa</h2>
        <p class="muted">Đối tác cần ở trạng thái hoạt động để sử dụng liên kết mời.</p></div>
      </div>
    </section>`;
  }
  const url = inviteUrl(invite.token);
  return `<section class="card partner-invite-manage">
    <header class="partner-invite-manage-head">
      <div class="partner-invite-manage-title">
        <span class="partner-invite-manage-icon" aria-hidden="true"><img src="/images/koc-viet-app-icon.png" alt=""></span>
        <div>
          <span class="partner-invite-manage-kicker">MỜI KOC VÀO ĐỘI</span>
          <h2>Mở rộng đội ngũ của bạn</h2>
          <p class="muted">Gửi liên kết riêng này cho KOC bạn muốn đồng hành.</p>
        </div>
      </div>
      <div class="partner-invite-count"><strong>${num(invite.useCount || 0)}</strong><span>KOC đã tham gia</span></div>
    </header>
    <div class="partner-invite-link-box">
      <div class="partner-invite-link-label">
        <span>Liên kết mời của bạn</span>
        <span class="partner-invite-status"><i></i> Đang hoạt động</span>
      </div>
      <div class="partner-invite-link-row">
        <div class="partner-invite-link-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7"/></svg>
          <input type="text" readonly value="${esc(url)}" aria-label="Liên kết mời KOC" data-partner-invite-input>
        </div>
        <button class="btn primary partner-invite-copy-button" type="button" data-partner-invite-copy>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>
          Sao chép
        </button>
      </div>
    </div>
    <footer class="partner-invite-manage-footer">
      <p><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8 7 10 4.1-2 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg><span>KOC cần xác nhận tham gia. Hồ sơ mới chỉ được liên kết sau khi NetViet duyệt.</span></p>
      <div class="partner-invite-manage-actions">
        <button class="btn ghost sm" type="button" data-partner-invite-share>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>
          Chia sẻ
        </button>
        <button class="partner-invite-rotate-button" type="button" data-partner-invite-rotate>Tạo liên kết mới</button>
      </div>
    </footer>
  </section>`;
}

function bindPartnerInviteCard(scope, invite, refresh) {
  if (!invite?.available) return;
  const url = inviteUrl(invite.token);
  scope.querySelector("[data-partner-invite-copy]")?.addEventListener("click", async () => {
    const copied = await copyToClipboard(url);
    toast(copied ? "Đã sao chép liên kết mời" : "Không thể sao chép liên kết", copied ? "ok" : "err");
  });
  scope.querySelector("[data-partner-invite-input]")?.addEventListener("click", (event) => event.currentTarget.select());
  scope.querySelector("[data-partner-invite-share]")?.addEventListener("click", async () => {
    if (!navigator.share) {
      const copied = await copyToClipboard(url);
      toast(copied ? "Đã sao chép liên kết để chia sẻ" : "Không thể sao chép liên kết", copied ? "ok" : "err");
      return;
    }
    try {
      await navigator.share({ title: "Tham gia đội KOC", text: "Mời bạn tham gia đội KOC của tôi trên KOC Việt.", url });
    } catch (error) {
      if (error?.name !== "AbortError") toast("Chưa thể chia sẻ liên kết", "err");
    }
  });
  scope.querySelector("[data-partner-invite-rotate]")?.addEventListener("click", async (event) => {
    const confirmed = await confirmDialog(
      "Liên kết cũ sẽ ngừng hoạt động ngay. Bạn có chắc chắn muốn tạo liên kết mới?",
      { title: "Tạo lại liên kết mời", confirmText: "Tạo liên kết mới", cancelText: "Hủy", tone: "danger" },
    );
    if (!confirmed) return;
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Đang tạo…";
    try {
      await post("/api/partner/invite-link/rotate");
      toast("Đã tạo liên kết mời mới", "ok");
      await refresh();
    } catch (error) {
      toast(error.message, "err");
      button.disabled = false;
      button.textContent = "Tạo liên kết mới";
    }
  });
}

async function dashboard(el) {
  el.innerHTML = spinner();
  const [r, invite] = await Promise.all([
    api("/api/partner/overview"),
    api("/api/partner/invite-link").catch(() => ({ available: false })),
  ]);
  const pct = Math.round(Number(r.partner.fee_rate || 0) * 100);
  el.innerHTML = `<h1>Xin chào, ${esc(state.user.name)}</h1>
    <p class="muted" style="margin-top:4px">Bạn được chia ${pct}% của phí dịch vụ 5% trên mỗi booking hoàn tất của các KOC thuộc đối tác này.</p>
    <div class="stat-cards" style="margin-top:16px">
      ${stat("KOC đang quản lý", num(r.memberCount))}
      ${stat("Tổng hoa hồng đã tích luỹ", money(r.earnedTotal), `${num(r.earnedBookings)} booking`)}
      ${stat("Số dư chờ chi trả", money(r.walletRevenue))}
      ${stat("Tỷ lệ chia sẻ", pct + "%", "của phí dịch vụ 5%")}
    </div>
    ${partnerInviteCard(invite)}
    <div class="card" style="margin-top:20px">
      <div class="between"><h2>Hoa hồng gần đây</h2><a href="#/report" class="btn ghost sm">Xem báo cáo đầy đủ →</a></div>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Booking</th><th>KOC</th><th>Bạn nhận</th><th>Thời gian</th></tr></thead><tbody>
        ${
          r.recentEarnings.length
            ? r.recentEarnings
                .map(
                  (e) => `<tr>
          <td>${esc(e.booking_code || e.booking_id)}</td><td>${esc(e.koc_name || "—")}</td>
          <td class="money">${money(e.amount)}</td>
          <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(e.created_at)}</td>
        </tr>`,
                )
                .join("")
            : `<tr><td colspan="4">${empty("💸", "Chưa phát sinh hoa hồng")}</td></tr>`
        }
      </tbody></table></div>
    </div>`;
  bindPartnerInviteCard(el, invite, () => dashboard(el));
}

async function kocsPage(el) {
  el.innerHTML = spinner();
  const [r, invite] = await Promise.all([
    api("/api/partner/kocs"),
    api("/api/partner/invite-link").catch(() => ({ available: false })),
  ]);
  const kocs = r.kocs || [];
  el.innerHTML = `<div class="between"><div><h1>KOC thuộc đối tác</h1>
      <p class="muted">Danh sách KOC hiện đang được gán cho bạn.</p></div>
      <span class="chip b">${num(kocs.length)} KOC</span></div>
    ${partnerInviteCard(invite)}
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr>
      <th>KOC</th><th>Hạng</th><th>Khu vực</th><th>Booking hoàn tất</th><th>Hoa hồng từ KOC này</th><th>Ngày gán</th>
    </tr></thead><tbody>
      ${
        kocs.length
          ? kocs
              .map(
                (k) => `<tr>
        <td><div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}" alt=""><b>${esc(k.name)}</b></div></td>
        <td>${tierBadge(k.tier)}</td>
        <td>${esc(k.province || "—")}</td>
        <td>${num(k.completed_bookings)}</td>
        <td class="money">${money(k.earned)}</td>
        <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(k.assigned_at)}</td>
      </tr>`,
              )
              .join("")
          : `<tr><td colspan="6">${empty("🙋", "Chưa có KOC nào được gán")}</td></tr>`
      }
    </tbody></table></div>`;
  bindPartnerInviteCard(el, invite, () => kocsPage(el));
}

let partnerReportPage = 1;
async function report(el, page = partnerReportPage) {
  el.innerHTML = spinner();
  const r = await api(`/api/partner/report?page=${page}&per=10`);
  partnerReportPage = r.page;
  el.innerHTML = `<div class="between"><div><h1>Báo cáo doanh thu</h1>
      <p class="muted">Toàn bộ hoa hồng đã ghi nhận từ các booking của KOC thuộc đối tác này.</p></div></div>
    <div class="stat-cards" style="margin:16px 0">
      ${stat("Tổng phí dịch vụ 5% (gốc)", money(r.totals.baseFee))}
      ${stat("Bạn được chia", money(r.totals.amount))}
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>Booking</th><th>KOC</th><th>Phí dịch vụ 5%</th><th>Tỷ lệ</th><th>Bạn nhận</th><th>Thời gian</th>
    </tr></thead><tbody>
      ${
        r.rows.length
          ? r.rows
              .map(
                (row) => `<tr>
        <td>${esc(row.booking_code || row.booking_id)}</td><td>${esc(row.koc_name || "—")}</td>
        <td class="money">${money(row.base_service_fee)}</td>
        <td>${Math.round(Number(row.rate) * 1000) / 10}%</td>
        <td class="money">${money(row.amount)}</td>
        <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(row.created_at)}</td>
      </tr>`,
              )
              .join("")
          : `<tr><td colspan="6">${empty("💸", "Chưa có dữ liệu")}</td></tr>`
      }
    </tbody></table></div>
    ${pagerHtml(r.page, r.pages)}`;
  el.querySelectorAll("[data-pg]").forEach((b) =>
    b.addEventListener("click", () => report(el, Number(b.dataset.pg))),
  );
}

async function wallet(el, page = 1) {
  el.innerHTML = spinner();
  try {
    const r = await api(`/api/partner/wallet?page=${page}`);
    el.innerHTML = `<div style="margin-bottom:16px">
      <h1 class="icon-heading">${icon("wallet", "teaser-icon")} Ví đối tác</h1>
      <p class="muted">Theo dõi số tiền có thể rút và lịch sử rút tiền.</p>
    </div>
    <div class="card" style="padding:16px;margin-bottom:20px">
      <div class="muted" style="font-size:12px">Số tiền có thể rút</div>
      <div class="money" style="font-size:30px;font-weight:800;margin-top:6px;color:var(--primary)">${money(r.balance)}</div>
      <p class="muted" style="margin-top:6px">Đang chờ chi trả: <b class="money">${money(r.pending || 0)}</b></p>
      <p class="muted" style="font-size:12px;margin-top:6px">KOC Việt đối soát và chuyển khoản thủ công về tài khoản ngân hàng trong hồ sơ của bạn.</p>
      <div class="row" style="gap:10px;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="btn primary" id="pn-withdraw" ${bankIncomplete(r.payout) || r.balance < r.minimumWithdraw ? 'disabled' : ''}>Rút về ngân hàng</button>
        <a href="#/profile" class="btn ghost">Cập nhật ngân hàng</a>
      </div>
      <p class="muted" style="font-size:12px;margin-top:8px">${bankIncomplete(r.payout) ? 'Cập nhật đầy đủ ngân hàng nhận tiền để gửi yêu cầu rút.' : `Rút tối thiểu ${money(r.minimumWithdraw)}. Xác thực bằng OTP gửi đến email đăng nhập.`}</p>
    </div>
    <div class="card">
      <h2>Lịch sử rút tiền</h2>
      ${r.rows.length ? `<div class="table-wrap" style="margin-top:12px"><table><thead><tr>
        <th>Mã giao dịch</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th><th>Ghi chú</th>
      </tr></thead><tbody>${r.rows.map((row) => `<tr>
        <td>${esc(row.reference_id || row.id)}</td>
        <td class="money">${money(row.amount)}</td>
        <td><span class="chip ${row.status === 'pending_review' ? 'w' : row.status === 'rejected' ? 'r' : 'g'}">${row.status === 'pending_review' ? 'Chờ duyệt' : row.status === 'rejected' ? 'Bị từ chối' : 'Đã chi trả'}</span></td>
        <td style="white-space:nowrap">${fmtDate(row.created_at)}</td>
        <td>${esc(row.note || "—")}</td>
      </tr>`).join("")}</tbody></table></div>` : empty("💸", "Chưa có lịch sử rút tiền")}
      ${pagerHtml(r.page, r.pages)}
    </div>`;
    el.querySelector('#pn-withdraw').addEventListener('click', () =>
      withdrawModal(r.balance, r.payout, () => wallet(el), '/api/partner/wallet/withdraw', r.minimumWithdraw));
    el.querySelectorAll("[data-pg]").forEach((button) =>
      button.addEventListener("click", () => wallet(el, Number(button.dataset.pg))),
    );
  } catch (e) {
    el.innerHTML = empty("⚠️", e.message);
  }
}

function pagerHtml(page, pages) {
  if (pages <= 1) return "";
  let btns = `<button class="btn ghost sm" ${page <= 1 ? "disabled" : ""} data-pg="${page - 1}">‹ Trước</button>`;
  btns += `<span class="muted" style="margin:0 10px">Trang ${page}/${pages}</span>`;
  btns += `<button class="btn ghost sm" ${page >= pages ? "disabled" : ""} data-pg="${page + 1}">Sau ›</button>`;
  return `<div style="margin-top:12px;text-align:center">${btns}</div>`;
}

async function optimizePartnerProfileImage(file, size = 240, quality = 0.85) {
  if (!file || !file.type.startsWith("image/"))
    throw new Error("Vui lòng chọn file ảnh");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh gốc tối đa 10MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Không đọc được file ảnh"));
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    canvas
      .getContext("2d")
      .drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function profile(el, editing = false) {
  el.innerHTML = spinner();
  const r = await api("/api/partner/profile");
  const p = r.partner;
  const pct = Math.round(Number(p.fee_rate || 0) * 100);

  if (!editing) {
    el.innerHTML = `<div class="between"><h1>Hồ sơ đối tác</h1>
        <button class="btn primary sm" id="pf-edit">Chỉnh sửa</button></div>
      <div class="card" style="margin:16px 0">
        <div class="row" style="gap:14px;align-items:center">
          <div style="width:72px;height:72px;border-radius:14px;overflow:hidden;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:28px;flex:none">${p.avatar ? `<img src="${esc(p.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "🤝"}</div>
          <div><h2 style="margin:0">${esc(p.name)}</h2>
            <p class="muted" style="margin-top:2px">${statusChip(p.status)} · Chia sẻ ${pct}% của phí dịch vụ 5%</p>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>Thông tin nhận chi trả</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px 28px;margin-top:14px">
          <div><span class="muted">Ngân hàng</span><p>${bankIdentityHtml(state.config?.payoutBanks, p.bank_name, p.bank_bin)}</p></div>
          <div><span class="muted">Số tài khoản</span><p><b>${esc(p.bank_account || "Chưa cập nhật")}</b></p></div>
          <div><span class="muted">Chủ tài khoản</span><p><b>${esc(p.bank_owner || "Chưa cập nhật")}</b></p></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Đổi mật khẩu</h3>
        <p class="muted" style="margin:4px 0 12px">Sau khi đổi thành công, bạn cần đăng nhập lại.</p>
        <div class="field"><label>Mật khẩu hiện tại</label>${passwordInputHtml("pf-cur-pass", 'autocomplete="current-password" maxlength="128"')}</div>
        <div class="field"><label>Mật khẩu mới</label>${passwordInputHtml("pf-new-pass", 'autocomplete="new-password" minlength="8" maxlength="128" placeholder="Tối thiểu 8 ký tự"')}</div>
        <div class="field"><label>Xác nhận mật khẩu mới</label>${passwordInputHtml("pf-new-pass2", 'autocomplete="new-password" minlength="8" maxlength="128"')}</div>
        <button class="btn ghost" id="pf-pass-save" type="button">Cập nhật mật khẩu</button>
      </div>`;
    bindPasswordToggles(el);
    el.querySelector("#pf-edit").addEventListener("click", () =>
      profile(el, true),
    );
    el.querySelector("#pf-pass-save").addEventListener("click", async () => {
      const cur = el.querySelector("#pf-cur-pass").value;
      const next = el.querySelector("#pf-new-pass").value;
      const confirmation = el.querySelector("#pf-new-pass2").value;
      if (!cur) return toast("Nhập mật khẩu hiện tại", "err");
      if (next.length < 8)
        return toast("Mật khẩu mới phải có ít nhất 8 ký tự", "err");
      if (next !== confirmation)
        return toast("Mật khẩu xác nhận không khớp", "err");
      if (cur === next)
        return toast("Mật khẩu mới phải khác mật khẩu hiện tại", "err");
      const btn = el.querySelector("#pf-pass-save");
      btn.disabled = true;
      btn.textContent = "Đang cập nhật…";
      try {
        await post("/api/change-password", {
          current_password: cur,
          new_password: next,
        });
        toast("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", "ok");
        setTimeout(() => logout({ skipConfirmation: true }), 1200);
      } catch (err) {
        toast(err.message, "err");
        btn.disabled = false;
        btn.textContent = "Cập nhật mật khẩu";
      }
    });
    return;
  }

  let avatar = p.avatar || "";
  const banks = state.config?.payoutBanks || [];
  el.innerHTML = `<div class="between"><h1>Chỉnh sửa hồ sơ đối tác</h1>
      <button class="btn ghost sm" id="pf-cancel">Huỷ</button></div>
    <div class="card" style="margin-top:16px">
      <div class="row" style="gap:14px;align-items:center;margin-bottom:14px">
        <div id="pf-avatar-preview" style="width:72px;height:72px;border-radius:14px;overflow:hidden;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:28px;flex:none">${avatar ? `<img src="${esc(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "🤝"}</div>
        <div><label class="btn ghost sm upload-label">Chọn ảnh<input id="pf-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
          <p class="hint" style="margin-top:6px">PNG, JPG hoặc WebP · tối đa 10MB.</p></div>
      </div>
      <div class="field"><label class="required-label">Tên đối tác</label><input id="pf-name" value="${esc(p.name || "")}"></div>
      <h3 style="margin-top:10px;font-size:14px">💳 Thông tin nhận chi trả</h3>
      <div id="pf-bank-fields" class="grid" style="grid-template-columns:1fr 1fr;gap:0 16px">
        <div class="field"><label for="pf-bank-select-trigger">Ngân hàng</label>${bankPickerHtml("pf-bank-select", banks, p.bank_name, p.bank_bin)}</div>
        <div class="field"><label>Số tài khoản</label><input id="pf-bank-account" inputmode="numeric" value="${esc(p.bank_account || "")}"></div>
        <div class="field"><label>Chủ tài khoản</label><input id="pf-bank-owner" value="${esc(p.bank_owner || "")}"></div>
      </div>
      <button class="btn primary" id="pf-save" style="margin-top:10px;width:auto">Lưu hồ sơ</button>
    </div>`;
  bindBankPicker(
    el.querySelector('[data-bank-picker="pf-bank-select"]'),
    banks,
  );
  // Once a payout field is filled, the existing API requires the entire bank block.
  const bankFields = el.querySelector("#pf-bank-fields");
  const updateBankRequiredLabels = () => {
    const controls = ["#pf-bank-select", "#pf-bank-account", "#pf-bank-owner"]
      .map(selector => bankFields.querySelector(selector));
    const required = controls.some(control => control.value.trim());
    bankFields.querySelectorAll(".field > label").forEach(label => {
      label.classList.toggle("required-label", required);
    });
  };
  bankFields.addEventListener("input", updateBankRequiredLabels);
  bankFields.addEventListener("change", updateBankRequiredLabels);
  updateBankRequiredLabels();
  el.querySelector("#pf-avatar-file").addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    input.disabled = true;
    try {
      avatar = await optimizePartnerProfileImage(file);
      el.querySelector("#pf-avatar-preview").innerHTML =
        `<img src="${avatar}" alt="" style="width:100%;height:100%;object-fit:cover">`;
      toast("Đã tối ưu và xem trước ảnh", "ok");
    } catch (err) {
      toast(err.message, "err");
    } finally {
      input.disabled = false;
    }
  });
  el.querySelector("#pf-cancel").addEventListener("click", () => profile(el));
  el.querySelector("#pf-save").addEventListener("click", async () => {
    const name = el.querySelector("#pf-name").value.trim();
    if (!name) return toast("Nhập tên đối tác", "err");
    const bank = selectedPayoutBank(el.querySelector("#pf-bank-select"));
    const btn = el.querySelector("#pf-save");
    btn.disabled = true;
    btn.textContent = "Đang lưu…";
    try {
      await post("/api/partner/profile", {
        name,
        avatar,
        bank_name: bank.name,
        bank_bin: bank.bin,
        bank_account: el.querySelector("#pf-bank-account").value.trim(),
        bank_owner: el.querySelector("#pf-bank-owner").value.trim(),
      });
      toast("Đã lưu hồ sơ", "ok");
      void refreshPartnerBanners();
      profile(el);
    } catch (err) {
      toast(err.message, "err");
      btn.disabled = false;
      btn.textContent = "Lưu hồ sơ";
    }
  });
}
