import { api, post } from "./api.js";
import {
  money,
  num,
  esc,
  statusChip,
  spinner,
  skeletonStatCards,
  skeletonTable,
  skeletonPage,
  empty,
  toast,
  modal,
  closeModal,
  confirmDialog,
  promptDialog,
  tierBadge,
  stars,
  fmtDateTime,
  avatarUrl,
} from "./ui.js";
import { state, logout, enhancePortal } from "./app.js";
import { brandLogo, icon } from "./icons.js";
import { autoAnimate } from "./animations.js";
import { bankIdentityHtml } from "./payout-banks.js";
import { mountListSearch, searchForm, bindSearchForm } from "./list-search.js";

const NAV = [
  ["#/dashboard", icon("kpi", "sidebar-icon"), "Tổng quan hoạt động"],
  ["#/businesses", "🏢", "Quản lý doanh nghiệp"],
  ["#/partners", "🤝", "Đối tác KOC Việt"],
  ["#/queue", icon("approval", "sidebar-icon"), "Quản lý KOC"],
  ["#/allbookings", icon("booking", "sidebar-icon"), "Booking toàn sàn"],
  ["#/complaints", icon("complaint", "sidebar-icon"), "Khiếu nại"],
  ["#/affiliate", "🔗", "Đơn tiếp thị liên kết"],
  ["#/kol", icon("kolRequest", "sidebar-icon"), "Yêu cầu KOL"],
  ["#/leads", icon("quoteLead", "sidebar-icon"), "Khách cần tư vấn"],
  ["#/campaigns", icon("coordination", "sidebar-icon"), "Điều phối chiến dịch"],
  ["#/settle", icon("settlement", "sidebar-icon"), "Đối soát & Chi trả"],
  ["#/aiclone", icon("aiClone", "sidebar-icon"), "AI Clone Avatar"],
  ["#/tiers", icon("ranking", "sidebar-icon"), "Khung giá hạng"],
];

export async function renderAdmin(el, hash) {
  const requestedPage = hash.replace("#/", "") || "dashboard";
  const kocSection = ["queue", "contracts", "kocs"].includes(requestedPage)
    ? requestedPage
    : "queue";
  const page = ["contracts", "kocs"].includes(requestedPage)
    ? "queue"
    : requestedPage;
  const keys = NAV.map((n) => n[0].replace("#/", ""));
  const active = "#/" + (keys.includes(page) ? page : "dashboard");
  el.innerHTML = `<div class="portal admin-portal">
    <div class="sidebar"><div class="brand"><a class="portal-brand-link" href="#/dashboard" aria-label="KOC Việt — Trang quản trị">${brandLogo()}</a></div>
      <nav class="portal-nav">${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}">${n[1]}<span>${n[2]}</span></a>`).join("")}</nav><button class="btn ghost sm portal-sidebar-logout" id="ad-logout">Đăng xuất</button></div>
    <div class="main"><div class="topbar portal-topbar" style="background:var(--navy);color:#fff">
      <div class="portal-context"><span class="portal-context-label">KOC VIET</span><h2 style="color:#fff">Trang quản trị</h2></div>
      <div class="portal-account"><div class="portal-account-avatar" aria-hidden="true">${esc((state.user.name || "A").charAt(0).toUpperCase())}</div><div class="portal-account-meta"><strong>${esc(state.user.name)}</strong><span>Quản trị viên</span></div></div></div>
      <div class="content" id="ad-view"></div></div></div>`;
  document.getElementById("ad-logout").addEventListener("click", logout);
  enhancePortal();
  const view = document.getElementById("ad-view");
  try {
    if (active === "#/dashboard") await kpi(view);
    else if (active === "#/businesses") await businessesAdmin(view);
    else if (active === "#/partners") await partnersAdmin(view);
    else if (active === "#/queue") await kocManagement(view, kocSection);
    else if (active === "#/allbookings") await allBookings(view);
    else if (active === "#/complaints") await complaintsAdmin(view);
    else if (active === "#/affiliate") await affiliateAdmin(view);
    else if (active === "#/kol") await kolAdmin(view);
    else if (active === "#/leads") await leadsAdmin(view);
    else if (active === "#/campaigns") await adminCampaigns(view);
    else if (active === "#/settle") await settle(view);
    else if (active === "#/aiclone") await aiclone(view);
    else if (active === "#/tiers") await tiers(view);
    autoAnimate(view);
  } catch (e) {
    view.innerHTML = empty(icon("complaint", "teaser-icon"), e.message);
  }
}

let bizFilters = { search: "", status: "", page: 1 };
async function businessesAdmin(el) {
  const qs = new URLSearchParams({ page: String(bizFilters.page), per: "10" });
  if (bizFilters.search) qs.set("search", bizFilters.search);
  if (bizFilters.status) qs.set("status", bizFilters.status);
  const r = await api("/api/admin/businesses?" + qs.toString());
  const accountChip = (s) =>
    s === "active"
      ? '<span class="chip g">Hoạt động</span>'
      : s === "pending"
        ? '<span class="chip b">Chờ duyệt</span>'
        : s === "rejected"
          ? '<span class="chip r">Đã từ chối</span>'
          : s === "locked"
            ? '<span class="chip r">Đã khóa</span>'
            : '<span class="chip n">Chưa có tài khoản</span>';
  el.innerHTML = `<div class="between"><div><h1>Quản lý doanh nghiệp</h1>
      <p class="muted">Xem, chỉnh sửa và kiểm soát tài khoản đăng nhập của doanh nghiệp.</p></div>
      <span class="chip b">${num(r.total)} doanh nghiệp</span></div>
    <div class="filters" style="margin:16px 0">
      <div class="field" style="flex:1"><label>Tìm kiếm</label><input id="biz-search" value="${esc(bizFilters.search)}" placeholder="Tên, email, người liên hệ, mã số thuế…"></div>
      <div class="field"><label>Trạng thái tài khoản</label><select id="biz-status">
        <option value="">Tất cả</option>
        <option value="pending" ${bizFilters.status === "pending" ? "selected" : ""}>Chờ duyệt</option>
        <option value="active" ${bizFilters.status === "active" ? "selected" : ""}>Hoạt động</option>
        <option value="rejected" ${bizFilters.status === "rejected" ? "selected" : ""}>Đã từ chối</option>
        <option value="locked" ${bizFilters.status === "locked" ? "selected" : ""}>Đã khóa</option>
        <option value="no_account" ${bizFilters.status === "no_account" ? "selected" : ""}>Chưa có tài khoản</option>
      </select></div>
      <button class="btn primary sm" id="biz-filter">Tìm kiếm</button>
    </div>
    <div class="table-wrap"><table><thead><tr><th>Doanh nghiệp</th><th>Thời gian</th><th>Liên hệ</th><th>Tài khoản</th><th>Booking</th><th>Tổng chi</th><th></th></tr></thead><tbody>
      ${
        r.businesses.length
          ? r.businesses
              .map(
                (b) => `<tr>
        <td><div class="row">${b.avatar ? `<img class="avatar" src="${esc(b.avatar)}" alt="">` : ""}<div><b>${esc(b.name)}</b><div class="muted" style="font-size:11px">${esc(b.industry || "Chưa cập nhật ngành nghề")}</div></div></div></td>
        <td class="muted" style="font-size:12px;white-space:nowrap">${fmtDateTime(b.created_at)}</td>
        <td><div>${esc(b.contact || "—")}</div><div class="muted" style="font-size:11px">${esc(b.email || "—")}</div></td>
        <td>${accountChip(b.account_status)}<div class="muted" style="font-size:11px;margin-top:3px">${esc(b.login_email || "—")}</div></td>
        <td>${num(b.bookings_count)}</td><td class="money">${money(b.total_spend)}</td>
        <td><div class="row"><button class="btn ghost sm" data-biz-view="${b.id}">Xem</button>
          ${
            b.account_status === "pending"
              ? `<button class="btn ok sm" data-biz-approve="${b.id}">Duyệt</button><button class="btn danger sm" data-biz-reject="${b.id}">Từ chối</button>`
              : b.account_status === "active"
                ? `<button class="btn danger sm" data-biz-lock="${b.id}">Khóa</button>`
                : b.account_status === "locked"
                  ? `<button class="btn ok sm" data-biz-unlock="${b.id}">Mở khóa</button>`
                  : ""
          }
        </div></td></tr>`,
              )
              .join("")
          : `<tr><td colspan="7">${empty("🏢", "Không tìm thấy doanh nghiệp")}</td></tr>`
      }
    </tbody></table></div>
    ${pagerHtml(r.page, r.pages)}`;
  document.getElementById("biz-filter").addEventListener("click", () => {
    bizFilters = {
      search: document.getElementById("biz-search").value.trim(),
      status: document.getElementById("biz-status").value,
      page: 1,
    };
    businessesAdmin(el);
  });
  document.getElementById("biz-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("biz-filter").click();
  });
  el.querySelectorAll("[data-pg]").forEach((b) =>
    b.addEventListener("click", () => {
      bizFilters.page = Number(b.dataset.pg);
      businessesAdmin(el);
    }),
  );
  el.querySelectorAll("[data-biz-view]").forEach((b) =>
    b.addEventListener("click", () => businessDetail(b.dataset.bizView)),
  );
  el.querySelectorAll("[data-biz-approve]").forEach((b) =>
    b.addEventListener("click", () =>
      businessStatus(b.dataset.bizApprove, "approve", el),
    ),
  );
  el.querySelectorAll("[data-biz-reject]").forEach((b) =>
    b.addEventListener("click", () =>
      businessStatus(b.dataset.bizReject, "reject", el),
    ),
  );
  el.querySelectorAll("[data-biz-lock]").forEach((b) =>
    b.addEventListener("click", () =>
      businessStatus(b.dataset.bizLock, "lock", el),
    ),
  );
  el.querySelectorAll("[data-biz-unlock]").forEach((b) =>
    b.addEventListener("click", () =>
      businessStatus(b.dataset.bizUnlock, "unlock", el),
    ),
  );
}

async function businessDetail(id) {
  const r = await api("/api/admin/businesses/" + id);
  const b = r.business,
    s = r.stats;
  const statusLabel =
    b.account_status === "active"
      ? "Hoạt động"
      : b.account_status === "pending"
        ? "Chờ duyệt"
        : b.account_status === "rejected"
          ? "Đã từ chối"
          : b.account_status === "locked"
            ? "Đã khóa"
            : "Chưa có tài khoản";
  modal(`<div class="between"><h2>Chi tiết doanh nghiệp</h2><span class="chip ${b.account_status === "active" ? "g" : b.account_status === "pending" ? "b" : b.account_status === "locked" || b.account_status === "rejected" ? "r" : "n"}">${statusLabel}</span></div>
    <div class="tint-box" style="margin:14px 0">
      <div class="between"><span>Tên doanh nghiệp</span><b>${esc(b.name)}</b></div>
      <div class="between"><span>Thời gian đăng ký</span><b>${fmtDateTime(b.created_at)}</b></div>
      <div class="between"><span>Email liên hệ</span><b>${esc(b.email || "—")}</b></div>
      <div class="between"><span>Người liên hệ</span><b>${esc(b.contact || "—")}</b></div>
      <div class="between"><span>Ngành nghề</span><b>${esc(b.industry || "—")}</b></div>
      <div class="between"><span>Mã số thuế</span><b>${esc(b.tax_code || "—")}</b></div>
      <div class="between"><span>Email đăng nhập</span><b>${esc(b.login_email || "—")}</b></div>
    </div>
    <div class="stat-cards" style="margin-bottom:14px">
      ${scard("Booking", num(s.bookings_count))}${scard("Hoàn thành", num(s.completed_count))}${scard("Tổng chi", money(s.total_spend))}
    </div>
    ${["locked", "rejected"].includes(b.account_status) ? `<div class="tint-box" style="margin-bottom:14px"><b>${b.account_status === "rejected" ? "Lý do từ chối" : "Lý do khóa"}:</b> ${esc(b.locked_reason || "—")}<div class="muted">${b.locked_at ? fmtDateTime(b.locked_at) : ""}</div></div>` : ""}
    <h3>Hồ sơ pháp lý</h3><div class="tint-box" style="margin:8px 0 14px">
      <div class="between"><span>Mã số thuế</span><b>${esc(b.tax_code || "—")}</b></div>
      <div class="between"><span>Giấy phép kinh doanh</span>
        ${
          b.license_file
            ? '<button class="btn ghost sm" id="biz-license-download">Tải xuống</button>'
            : '<span class="chip r">Chưa cung cấp</span>'
        }
      </div>
    </div>
    <h3>Thông tin ngân hàng</h3><div class="tint-box" style="margin:8px 0 14px">
      <div class="between"><span>Ngân hàng</span>${bankIdentityHtml(state.config?.payoutBanks, b.bank_name, "", "—")}</div>
      <div class="between"><span>Số tài khoản</span><b>${esc(b.bank_account || "—")}</b></div>
      <div class="between"><span>Chủ tài khoản</span><b>${esc(b.bank_owner || "—")}</b></div>
    </div>
    <button class="btn ghost" id="biz-detail-close">Đóng</button>`);
  document
    .getElementById("biz-license-download")
    ?.addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = b.license_file;
      link.download = b.license_name || "giay-phep-kinh-doanh";
      link.click();
    });
  document
    .getElementById("biz-detail-close")
    .addEventListener("click", closeModal);
}

async function businessStatus(id, action, el) {
  let reason = "";
  if (action === "lock" || action === "reject") {
    reason = await promptDialog(
      action === "lock"
        ? "Nhập lý do khóa tài khoản:"
        : "Nhập lý do từ chối đăng ký:",
    );
    if (reason === null) return;
    if (!reason.trim())
      return toast(
        action === "lock"
          ? "Vui lòng nhập lý do khóa"
          : "Vui lòng nhập lý do từ chối",
        "err",
      );
  } else {
    const message =
      action === "approve"
        ? "Duyệt và kích hoạt tài khoản doanh nghiệp này?"
        : "Mở khóa tài khoản doanh nghiệp này?";
    if (!(await confirmDialog(message))) return;
  }
  try {
    await post("/api/admin/businesses/status", { id, action, reason });
    const messages = {
      approve: "Đã duyệt và kích hoạt tài khoản",
      reject: "Đã từ chối đăng ký doanh nghiệp",
      lock: "Đã khóa tài khoản",
      unlock: "Đã mở khóa tài khoản",
    };
    toast(messages[action] || "Đã cập nhật tài khoản", "ok");
    businessesAdmin(el);
  } catch (e) {
    toast(e.message, "err");
  }
}

// ---------- KOC Viet partner program ----------
const partnerPct = (rate) => {
  const value = Number(rate) * 100;
  return (Number.isInteger(value) ? value : value.toFixed(1)) + "%";
};

async function partnersAdmin(el) {
  el.innerHTML = spinner();
  const r = await api("/api/admin/partners");
  const rows = r.partners || [];
  const earnedTotal = rows.reduce((sum, p) => sum + Number(p.earned_total || 0), 0);
  el.innerHTML = `<div class="between"><div><h1>Đối tác KOC Việt</h1>
      <p class="muted">Đối tác được hưởng một phần phí dịch vụ 5% trên mỗi booking của các KOC thuộc đối tác đó.</p></div>
      <button class="btn primary" id="pt-new">+ Tạo đối tác</button></div>
    <div class="stat-cards" style="margin:16px 0">
      ${scard("Đối tác", num(rows.length))}
      ${scard("KOC được gán", num(rows.reduce((s, p) => s + Number(p.member_count || 0), 0)))}
      ${scard("Tổng hoa hồng đã chia", money(earnedTotal))}
    </div>
    <div class="table-wrap"><table><thead><tr>
      <th>Đối tác</th><th>Thời gian tạo</th><th>Tỷ lệ chia</th><th>KOC</th><th>Hoa hồng tích luỹ</th><th>Số dư ví</th><th>Trạng thái</th><th>Tài khoản</th><th></th>
    </tr></thead><tbody>
      ${
        rows.length
          ? rows.map((p) => `<tr data-search="${esc([p.name, p.email, p.account_email].join(" "))}">
        <td><div class="row" style="gap:8px">
          <div style="width:30px;height:30px;border-radius:8px;overflow:hidden;background:var(--tint);display:flex;align-items:center;justify-content:center;font-size:15px;flex:none">${p.avatar ? `<img src="${esc(p.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">` : "🤝"}</div>
          <b>${esc(p.name)}</b></div></td>
        <td class="muted">${fmtDateTime(p.created_at)}</td>
        <td>${partnerPct(p.fee_rate)} <span class="muted" style="font-size:11px">của 5%</span></td>
        <td>${num(p.member_count)}</td>
        <td class="money">${money(p.earned_total)}<div class="muted" style="font-size:11px">${num(p.earned_bookings)} booking</div></td>
        <td class="money">${money(p.wallet_revenue)}</td>
        <td>${p.status === "active" ? '<span class="chip g">Hoạt động</span>' : '<span class="chip n">Tạm dừng</span>'}</td>
        <td>${p.account_user_id ? '<span class="chip g">Đã cấp</span>' : '<span class="chip n">Chưa cấp</span>'}</td>
        <td><button class="btn ghost sm" data-pt-view="${p.id}">Xem</button></td>
      </tr>`).join("")
          : `<tr><td colspan="9">${empty("🤝", "Chưa có đối tác nào")}</td></tr>`
      }
    </tbody></table></div>`;
  mountListSearch(el, { key: "admin-partners", label: "Tìm đối tác", placeholder: "Tên hoặc email đối tác…", itemSelector: "tbody tr[data-search]", containerSelector: ".table-wrap", searchText: (row) => row.dataset.search });
  document.getElementById("pt-new").addEventListener("click", () => partnerCreate(el));
  el.querySelectorAll("[data-pt-view]").forEach((b) =>
    b.addEventListener("click", () => partnerDetail(b.dataset.ptView, el)),
  );
}

function partnerKocPickerHtml(kocs, { checked = [] } = {}) {
  const checkedSet = new Set(checked);
  if (!kocs.length)
    return `<div class="muted" style="padding:12px;text-align:center">Không có KOC nào khả dụng.</div>`;
  return kocs
    .map(
      (k, i) => `<label class="pt-koc-row" style="display:flex;align-items:center;gap:10px;padding:9px 8px;cursor:pointer;${i ? "border-top:1px solid var(--line)" : ""}">
        <input type="checkbox" value="${esc(k.id)}" ${checkedSet.has(k.id) ? "checked" : ""} style="width:auto;flex:none;margin:0">
        <img class="avatar" src="${esc(avatarUrl(k.avatar))}" alt="" style="width:34px;height:34px;flex:none">
        <span style="flex:1;min-width:0">
          <b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(k.name)}</b>
          <span class="muted" style="font-size:11px">${esc(k.tier || "—")}${k.province ? " · " + esc(k.province) : ""}</span>
        </span>
      </label>`,
    )
    .join("");
}


function partnerAvatarFieldHtml(prefix, avatar = "") {
  const img = `<img src="${esc(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">`;
  return `<div class="field"><label>Ảnh đại diện (tuỳ chọn)</label>
    <div class="row" style="gap:12px;align-items:center">
      <div id="${prefix}-preview" style="width:56px;height:56px;border-radius:12px;overflow:hidden;background:var(--tint);flex:none"${avatar ? "" : " hidden"}>${avatar ? img : ""}</div>
      <label class="btn ghost sm">Chọn ảnh<input id="${prefix}-file" type="file" accept="image/*" hidden></label>
      <button type="button" class="btn ghost sm" id="${prefix}-clear"${avatar ? "" : " hidden"}>Xoá ảnh</button>
    </div>
  </div>`;
}

// Downscale to a small square JPEG before it becomes a data: URL. Avatars are
// stored inline (no S3 upload involved — same as KOC/business avatars), and an
// unresized photo easily produces a multi-MB base64 string that gets silently
// truncated by the backend's field-length cap, corrupting the image so it
// saves but never renders. Mirrors koc.js's optimizeProfileImage.
async function optimizePartnerAvatar(file, size = 160, quality = 0.85) {
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
    canvas.getContext("2d").drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function bindPartnerAvatar(prefix, onChange) {
  const input = document.getElementById(prefix + "-file");
  const preview = document.getElementById(prefix + "-preview");
  const clearBtn = document.getElementById(prefix + "-clear");
  if (!input) return;
  const render = (value) => {
    if (preview) {
      preview.innerHTML = value
        ? `<img src="${value}" alt="" style="width:100%;height:100%;object-fit:cover">`
        : "";
      preview.hidden = !value;
    }
    if (clearBtn) clearBtn.hidden = !value;
  };
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    input.disabled = true;
    try {
      const value = await optimizePartnerAvatar(file);
      onChange(value);
      render(value);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      input.disabled = false;
    }
  });
  clearBtn?.addEventListener("click", () => {
    input.value = "";
    onChange("");
    render("");
  });
}

async function partnerCreate(listEl) {
  const kocResp = await api("/api/admin/partners/assignable-kocs");
  let kocs = kocResp.kocs || [];
  let avatar = "";
  modal(`<h2>Tạo đối tác</h2>
    <div class="field" style="margin-top:12px"><label class="required-label">Tên đối tác</label>
      <input id="pt-name" placeholder="Tên đối tác / công ty" autofocus></div>
    ${partnerAvatarFieldHtml("pt-avatar")}
    <div class="field"><label class="required-label">Tỷ lệ chia sẻ trên phí 5%</label>
      <input id="pt-rate" type="number" step="1" min="1" max="100" value="30"> <span class="muted">% (đối tác hưởng 30% của 5%)</span>
    </div>
    <div class="field"><label>Ghi chú (tuỳ chọn)</label><input id="pt-note"></div>
    <p class="muted" style="font-size:12px;margin:0 0 4px">Thông tin ngân hàng nhận chi trả do đối tác tự cập nhật trong cổng đối tác sau khi đăng nhập.</p>
    <div class="field"><label>Gán KOC vào đối tác</label>
      <input id="pt-koc-search" placeholder="Tìm KOC theo tên…" style="margin-bottom:6px">
      <div id="pt-koc-list" style="max-height:220px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px">
        ${partnerKocPickerHtml(kocs)}
      </div>
    </div>
    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn primary" id="pt-save">Tạo đối tác</button>
      <button class="btn ghost" id="pt-cancel">Huỷ</button>
    </div>`);
  bindPartnerAvatar("pt-avatar", (v) => (avatar = v));
  const listBox = document.getElementById("pt-koc-list");
  let searchTimer;
  document.getElementById("pt-koc-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const term = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      const resp = await api(
        "/api/admin/partners/assignable-kocs" + (term ? "?search=" + encodeURIComponent(term) : ""),
      );
      kocs = resp.kocs || [];
      const stillChecked = [...listBox.querySelectorAll("input:checked")].map((i) => i.value);
      listBox.innerHTML = partnerKocPickerHtml(kocs, { checked: stillChecked });
    }, 250);
  });
  document.getElementById("pt-cancel").addEventListener("click", closeModal);
  document.getElementById("pt-save").addEventListener("click", async () => {
    const name = document.getElementById("pt-name").value.trim();
    if (!name) return toast("Nhập tên đối tác", "err");
    const ratePct = Number(document.getElementById("pt-rate").value);
    if (!(ratePct > 0 && ratePct <= 100)) return toast("Tỷ lệ phải trong khoảng 1–100%", "err");
    const kocIds = [...listBox.querySelectorAll("input:checked")].map((i) => i.value);
    try {
      await post("/api/admin/partners", {
        name,
        avatar,
        fee_rate: ratePct / 100,
        note: document.getElementById("pt-note").value.trim(),
        koc_ids: kocIds,
      });
      toast("Đã tạo đối tác", "ok");
      closeModal();
      partnersAdmin(listEl);
    } catch (e) {
      toast(e.message, "err");
    }
  });
}

async function partnerDetail(id, listEl) {
  const banks = state.config?.payoutBanks || [];
  const r = await api("/api/admin/partners/" + id);
  const p = r.partner;
  const members = r.members || [];
  const earnings = r.earnings || [];
  let avatar = p.avatar || "";
  modal(`<div class="between"><div class="row" style="gap:10px">
      ${avatar ? `<div style="width:44px;height:44px;border-radius:10px;overflow:hidden;background:var(--tint);flex:none"><img src="${esc(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover"></div>` : ""}
      <h2 style="margin:0">${esc(p.name)}</h2></div>
      ${p.status === "active" ? '<span class="chip g">Hoạt động</span>' : '<span class="chip n">Tạm dừng</span>'}</div>
    <div class="tint-box" style="margin:14px 0">
      <div class="between"><span>Ngân hàng nhận</span>${bankIdentityHtml(banks, p.bank_name, p.bank_bin, "—")}</div>
      <div class="between"><span>Số tài khoản</span><b>${esc(p.bank_account || "—")}</b></div>
      <div class="between"><span>Chủ tài khoản</span><b>${esc(p.bank_owner || "—")}</b></div>
      <div class="between"><span>Số dư ví (chờ chi trả)</span><b class="money">${money(p.wallet_revenue)}</b></div>
    </div>
    <h3>Tài khoản đăng nhập</h3>
    <div class="tint-box" style="margin:8px 0 16px">
      ${
        p.account
          ? `<div class="between"><span>Email đăng nhập</span><b>${esc(p.account.email)}</b></div>
             <div class="between"><span>Trạng thái</span>${p.account.status === "active" ? '<span class="chip g">Hoạt động</span>' : `<span class="chip n">${esc(p.account.status)}</span>`}</div>
             <div style="margin-top:10px"><button class="btn ghost sm" id="pt-d-account-reset">Đặt lại mật khẩu & gửi lại email</button></div>`
          : `<p class="muted" style="margin:0 0 10px">Đối tác chưa có tài khoản đăng nhập.</p>
             <div class="field" style="margin:0 0 8px"><label class="required-label">Email đăng nhập</label><input id="pt-d-account-email" type="email" placeholder="email@doanhnghiep.vn"></div>
             <button class="btn primary sm" id="pt-d-account-create">Cấp tài khoản đăng nhập</button>`
      }
    </div>
    <h3>Cấu hình</h3>
    <div class="field" style="margin:8px 0 0"><label class="required-label">Tên đối tác</label>
      <input id="pt-d-name" value="${esc(p.name)}"></div>
    ${partnerAvatarFieldHtml("pt-d-avatar", avatar)}
    <div class="row" style="gap:8px;align-items:flex-end;margin:0 0 12px">
      <div class="field" style="margin:0"><label class="required-label">Tỷ lệ chia (% của 5%)</label>
        <input id="pt-d-rate" type="number" step="1" min="1" max="100" value="${Math.round(Number(p.fee_rate) * 100)}"></div>
      <div class="field" style="margin:0"><label class="required-label">Trạng thái</label>
        <select id="pt-d-status">
          <option value="active" ${p.status === "active" ? "selected" : ""}>Hoạt động</option>
          <option value="paused" ${p.status === "paused" ? "selected" : ""}>Tạm dừng</option>
        </select></div>
    </div>
    <p class="muted" style="font-size:12px;margin:0 0 12px">Thông tin ngân hàng nhận chi trả ở trên do đối tác tự cập nhật trong cổng đối tác — admin chỉ xem.</p>
    <button class="btn primary sm" id="pt-d-save" style="margin:4px 0 16px">Lưu thay đổi</button>
    <div class="between"><h3>KOC thuộc đối tác (${members.length})</h3>
      <button class="btn ghost sm" id="pt-d-add">+ Thêm KOC</button></div>
    <div class="table-wrap" style="margin:8px 0 16px"><table><thead><tr><th>KOC</th><th>Hạng</th><th>Hoa hồng</th><th></th></tr></thead><tbody>
      ${
        members.length
          ? members.map((m) => `<tr>
        <td><b>${esc(m.name)}</b></td><td>${esc(m.tier || "—")}</td>
        <td class="money">${money(m.earned)}</td>
        <td><button class="btn danger sm" data-pt-remove="${esc(m.koc_id)}">Gỡ</button></td>
      </tr>`).join("")
          : `<tr><td colspan="4">${empty("🙋", "Chưa gán KOC nào")}</td></tr>`
      }
    </tbody></table></div>
    <h3>Hoa hồng gần đây</h3>
    <div class="table-wrap" style="margin:8px 0"><table><thead><tr><th>Booking</th><th>KOC</th><th>Phí 5%</th><th>Tỷ lệ</th><th>Đối tác nhận</th><th>Thời gian</th></tr></thead><tbody>
      ${
        earnings.length
          ? earnings.map((e) => `<tr>
        <td>${esc(e.booking_code || e.booking_id)}</td><td>${esc(e.koc_name || "—")}</td>
        <td class="money">${money(e.base_service_fee)}</td><td>${partnerPct(e.rate)}</td>
        <td class="money">${money(e.amount)}</td>
        <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDateTime(e.created_at)}</td>
      </tr>`).join("")
          : `<tr><td colspan="6">${empty("💸", "Chưa phát sinh hoa hồng")}</td></tr>`
      }
    </tbody></table></div>
    <button class="btn ghost" id="pt-d-close">Đóng</button>`);
  document.getElementById("pt-d-close").addEventListener("click", closeModal);
  bindPartnerAvatar("pt-d-avatar", (v) => (avatar = v));
  document.getElementById("pt-d-account-create")?.addEventListener("click", async () => {
    const email = document.getElementById("pt-d-account-email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast("Email không hợp lệ", "err");
    const btn = document.getElementById("pt-d-account-create");
    btn.disabled = true;
    btn.textContent = "Đang cấp tài khoản…";
    try {
      await post("/api/admin/partners/account", { id, email });
      toast("Đã cấp tài khoản và gửi email cho đối tác", "ok");
      closeModal();
      partnerDetail(id, listEl);
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false;
      btn.textContent = "Cấp tài khoản đăng nhập";
    }
  });
  document.getElementById("pt-d-account-reset")?.addEventListener("click", async () => {
    if (
      !(await confirmDialog(
        "Đặt lại mật khẩu cho tài khoản này? Mật khẩu mới sẽ được gửi qua email, mật khẩu cũ sẽ không còn dùng được.",
      ))
    )
      return;
    const btn = document.getElementById("pt-d-account-reset");
    btn.disabled = true;
    btn.textContent = "Đang gửi…";
    try {
      await post("/api/admin/partners/account/reset", { id });
      toast("Đã đặt lại mật khẩu và gửi email mới", "ok");
    } catch (e) {
      toast(e.message, "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Đặt lại mật khẩu & gửi lại email";
    }
  });
  document.getElementById("pt-d-save").addEventListener("click", async () => {
    const name = document.getElementById("pt-d-name").value.trim();
    if (!name) return toast("Nhập tên đối tác", "err");
    const ratePct = Number(document.getElementById("pt-d-rate").value);
    if (!(ratePct > 0 && ratePct <= 100)) return toast("Tỷ lệ phải trong khoảng 1–100%", "err");
    try {
      await post("/api/admin/partners/update", {
        id,
        name,
        avatar,
        fee_rate: ratePct / 100,
        status: document.getElementById("pt-d-status").value,
      });
      toast("Đã lưu", "ok");
      closeModal();
      partnersAdmin(listEl);
    } catch (e) {
      toast(e.message, "err");
    }
  });
  el_bindPartnerRemove(id, listEl);
  document.getElementById("pt-d-add").addEventListener("click", () => partnerAddMembers(id, listEl));

  function el_bindPartnerRemove(partnerId, list) {
    document.querySelectorAll("[data-pt-remove]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!(await confirmDialog("Gỡ KOC này khỏi đối tác? Các booking mới sẽ không còn chia hoa hồng."))) return;
        try {
          await post("/api/admin/partners/members", { id: partnerId, remove: [b.dataset.ptRemove] });
          toast("Đã gỡ KOC", "ok");
          closeModal();
          partnerDetail(partnerId, list);
        } catch (e) {
          toast(e.message, "err");
        }
      }),
    );
  }
}

async function partnerAddMembers(id, listEl) {
  const resp = await api("/api/admin/partners/assignable-kocs");
  let kocs = resp.kocs || [];
  modal(`<h2>Thêm KOC vào đối tác</h2>
    <input id="pt-a-search" placeholder="Tìm KOC theo tên…" style="margin:10px 0 6px">
    <div id="pt-a-list" style="max-height:280px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:4px">
      ${partnerKocPickerHtml(kocs)}
    </div>
    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn primary" id="pt-a-save">Thêm</button>
      <button class="btn ghost" id="pt-a-cancel">Huỷ</button>
    </div>`);
  const listBox = document.getElementById("pt-a-list");
  let searchTimer;
  document.getElementById("pt-a-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const term = e.target.value.trim();
    searchTimer = setTimeout(async () => {
      const r2 = await api(
        "/api/admin/partners/assignable-kocs" + (term ? "?search=" + encodeURIComponent(term) : ""),
      );
      kocs = r2.kocs || [];
      const stillChecked = [...listBox.querySelectorAll("input:checked")].map((i) => i.value);
      listBox.innerHTML = partnerKocPickerHtml(kocs, { checked: stillChecked });
    }, 250);
  });
  document.getElementById("pt-a-cancel").addEventListener("click", () => partnerDetail(id, listEl));
  document.getElementById("pt-a-save").addEventListener("click", async () => {
    const kocIds = [...listBox.querySelectorAll("input:checked")].map((i) => i.value);
    if (!kocIds.length) return toast("Chọn ít nhất 1 KOC", "err");
    try {
      await post("/api/admin/partners/members", { id, add: kocIds });
      toast("Đã thêm KOC", "ok");
      closeModal();
      partnerDetail(id, listEl);
    } catch (e) {
      toast(e.message, "err");
    }
  });
}

async function kpi(el) {
  const k = await api("/api/admin/kpi");
  const pct = (a, b) => Math.min(100, (a / b) * 100).toFixed(3);
  el.innerHTML = `<h1>Tổng quan hoạt động</h1>
    <div class="stat-cards" style="margin:16px 0">
      <div class="card"><div class="muted">KOC hoạt động</div><div style="font-size:26px;font-weight:800">${num(k.kocs)}</div>
        <div class="progress" style="margin-top:8px"><i style="width:${pct(k.kocs, k.targetKoc)}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Mục tiêu ${num(k.targetKoc)}</div></div>
      <div class="card"><div class="muted">Doanh nghiệp</div><div style="font-size:26px;font-weight:800">${num(k.businesses)}</div>
        <div class="progress" style="margin-top:8px"><i style="width:${pct(k.businesses, k.targetBiz)}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Mục tiêu ${num(k.targetBiz)}</div></div>
      <div class="card"><div class="muted">Tổng giá trị booking</div><div style="font-size:26px;font-weight:800" class="money">${money(k.gmv)}</div></div>
      <div class="card"><div class="muted">Doanh thu phí (5%)</div><div style="font-size:26px;font-weight:800" class="money">${money(k.fee)}</div></div>
    </div>
    <div class="stat-cards" style="margin:0 0 16px">
      <div class="card"><div class="muted">Doanh số tiếp thị liên kết</div><div style="font-size:22px;font-weight:800" class="money">${money(k.affGmv || 0)}</div></div>
      <div class="card"><div class="muted">Hoa hồng KOC</div><div style="font-size:22px;font-weight:800" class="money">${money(k.affCommission || 0)}</div></div>
      <div class="card"><div class="muted">Phí nền tảng 1%</div><div style="font-size:22px;font-weight:800" class="money">${money(k.platformFee || 0)}</div></div>
      <div class="card"><div class="muted">Khách mới cần tư vấn</div><div style="font-size:22px;font-weight:800">${num(k.newLeads || 0)}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr">
      <div class="card"><h2>Phễu chuyển đổi booking</h2><div style="margin-top:12px">
        ${Object.entries(k.funnel)
          .map(
            ([s, c]) =>
              `<div class="between" style="padding:6px 0">${statusChip(s)}<b>${c}</b></div>`,
          )
          .join("")}</div></div>
      <div class="card"><div class="between"><h2>Phân bố theo tỉnh</h2><span class="muted" style="font-size:12px">34 tỉnh/thành</span></div>
        <div id="province-distribution" style="margin-top:12px"></div>
        <div class="pager" id="province-pager" style="margin-top:12px"></div></div>
    </div>`;
  const provinces = [...(k.provinces || [])].sort(
    (a, b) =>
      Number(b.c || 0) - Number(a.c || 0) ||
      String(a.province).localeCompare(String(b.province), "vi"),
  );
  const provincePerPage = 8;
  const provincePages = Math.max(
    1,
    Math.ceil(provinces.length / provincePerPage),
  );
  let provincePage = 1;
  const drawProvinces = () => {
    const start = (provincePage - 1) * provincePerPage;
    const rows = provinces.slice(start, start + provincePerPage);
    el.querySelector("#province-distribution").innerHTML = rows
      .map(
        (
          p,
        ) => `<div class="between" style="padding:5px 0"><span>${esc(p.province)}</span>
      <div class="row" style="flex:1;margin-left:10px"><div class="progress" style="flex:1"><i style="width:${k.kocs ? (p.c / k.kocs) * 100 : 0}%"></i></div><b style="margin-left:8px">${p.c}</b></div></div>`,
      )
      .join("");
    const pager = el.querySelector("#province-pager");
    pager.innerHTML = `<button data-province-page="${provincePage - 1}" ${provincePage === 1 ? "disabled" : ""} aria-label="Trang tỉnh thành trước">‹</button><span class="muted" style="padding:7px 6px">${provincePage} / ${provincePages}</span><button data-province-page="${provincePage + 1}" ${provincePage === provincePages ? "disabled" : ""} aria-label="Trang tỉnh thành sau">›</button>`;
    pager.querySelectorAll("[data-province-page]").forEach((button) =>
      button.addEventListener("click", () => {
        provincePage = Number(button.dataset.provincePage);
        drawProvinces();
      }),
    );
  };
  drawProvinces();
}

async function kocManagement(el, section = "queue") {
  el.innerHTML = `<div class="between"><div><h1>Quản lý KOC</h1>
      <p class="muted">Duyệt hồ sơ và quản lý hợp đồng điện tử của KOC tại một nơi.</p></div></div>
    <div class="row" style="margin:16px 0;gap:8px" role="tablist" aria-label="Quản lý KOC">
      <a class="btn ${section === "queue" ? "primary" : "ghost"} sm" href="#/queue" role="tab" aria-selected="${section === "queue"}">Hồ sơ chờ duyệt</a>
      <a class="btn ${section === "contracts" ? "primary" : "ghost"} sm" href="#/contracts" role="tab" aria-selected="${section === "contracts"}">Hợp đồng điện tử</a>
      <a class="btn ${section === "kocs" ? "primary" : "ghost"} sm" href="#/kocs" role="tab" aria-selected="${section === "kocs"}">Thông tin KOC</a>
    </div>
    <div id="koc-management-content"></div>`;
  const content = el.querySelector("#koc-management-content");
  if (section === "contracts") await contractsAdmin(content);
  else if (section === "kocs") await kocDirectory(content);
  else await queue(content);
}

let kocDirectoryFilters = { page: 1, search: "", searchBy: "name", status: "" };
const kocDirectorySearchFields = {
  name: { label: "Tên KOC", placeholder: "Nhập tên KOC, có dấu hoặc không dấu" },
  email: { label: "Email", placeholder: "Nhập email KOC" },
  phone: { label: "Số điện thoại", placeholder: "Nhập số điện thoại KOC" },
};
async function kocDirectory(el) {
  el.innerHTML = `<div class="between"><div><h1>Thông tin KOC</h1><p class="muted">Tra cứu hồ sơ, chỉ số hoạt động và thông tin thanh toán của KOC.</p></div></div>
    <div class="filters" style="margin:14px 0">
      <div class="field"><label for="koc-directory-search-by">Tìm theo</label><select id="koc-directory-search-by">${Object.entries(kocDirectorySearchFields).map(([value, field]) => `<option value="${value}" ${kocDirectoryFilters.searchBy === value ? "selected" : ""}>${field.label}</option>`).join("")}</select></div>
      <div class="field" style="flex:1"><label for="koc-directory-search">Tìm kiếm</label><input type="search" maxlength="120" id="koc-directory-search" value="${esc(kocDirectoryFilters.search)}" placeholder="${kocDirectorySearchFields[kocDirectoryFilters.searchBy].placeholder}"></div>
      <div class="field"><label for="koc-directory-status">Trạng thái</label><select id="koc-directory-status">
        <option value="">Tất cả</option>
        <option value="pending" ${kocDirectoryFilters.status === "pending" ? "selected" : ""}>Chờ duyệt</option>
        <option value="leader_ok" ${kocDirectoryFilters.status === "leader_ok" ? "selected" : ""}>Trưởng nhóm đã duyệt</option>
        <option value="active" ${kocDirectoryFilters.status === "active" ? "selected" : ""}>Đang hoạt động</option>
        <option value="rejected" ${kocDirectoryFilters.status === "rejected" ? "selected" : ""}>Đã từ chối</option>
      </select></div>
      <button class="btn primary sm" id="koc-directory-filter">Tìm</button>
    </div>
    <div id="koc-directory-list">${skeletonPage("table")}</div>`;
  el.querySelector("#koc-directory-filter").addEventListener("click", () => {
    kocDirectoryFilters = {
      page: 1,
      search: el.querySelector("#koc-directory-search").value.trim(),
      searchBy: el.querySelector("#koc-directory-search-by").value,
      status: el.querySelector("#koc-directory-status").value,
    };
    loadKocDirectory(el);
  });
  el.querySelector("#koc-directory-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") el.querySelector("#koc-directory-filter").click();
  });
  el.querySelector("#koc-directory-search-by").addEventListener("change", (event) => {
    el.querySelector("#koc-directory-search").placeholder = kocDirectorySearchFields[event.target.value].placeholder;
    el.querySelector("#koc-directory-filter").click();
  });
  await loadKocDirectory(el);
}

async function loadKocDirectory(el) {
  const box = el.querySelector("#koc-directory-list");
  box.innerHTML = skeletonPage("table");
  const qs = new URLSearchParams({ page: String(kocDirectoryFilters.page), searchBy: kocDirectoryFilters.searchBy });
  if (kocDirectoryFilters.search) qs.set("search", kocDirectoryFilters.search);
  if (kocDirectoryFilters.status) qs.set("status", kocDirectoryFilters.status);
  const r = await api("/api/admin/kocs?" + qs.toString());
  if (!r.kocs.length) {
    box.innerHTML = empty("👤", "Không tìm thấy KOC phù hợp");
    return;
  }
  box.innerHTML = `<div class="table-wrap"><table class="koc-directory-table"><thead><tr><th>KOC</th><th>Thời gian tạo hồ sơ</th><th>Liên hệ</th><th>Hạng</th><th>Ngành hàng</th><th>Người theo dõi</th><th>Đánh giá</th><th>Trạng thái</th><th></th></tr></thead><tbody>
    ${r.kocs.map((k) => `<tr><td><div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}"><b>${esc(k.name)}</b></div></td>
      <td class="muted">${fmtDateTime(k.created_at)}</td>
      <td><div>${esc(k.phone || "—")}</div><div class="muted" style="font-size:11px">${esc(k.email || "—")}</div></td>
      <td>${tierBadge(k.tier)}</td><td>${esc((k.categories || []).join(", ") || "—")}</td><td>${num(k.followers)}</td><td>${stars(k.rating)}</td><td>${statusChip(k.status)}</td>
      <td><button class="btn ghost sm" data-koc-directory-detail="${k.id}">Chi tiết</button></td></tr>`).join("")}
    </tbody></table></div>${pagerHtml(r.page, r.pages)}`;
  box.querySelectorAll("[data-koc-directory-detail]").forEach((button) =>
    button.addEventListener("click", () => kocDetail(r.kocs.find((k) => k.id === button.dataset.kocDirectoryDetail))),
  );
  box.querySelectorAll("[data-pg]").forEach((button) =>
    button.addEventListener("click", () => {
      kocDirectoryFilters.page = Number(button.dataset.pg);
      loadKocDirectory(el);
    }),
  );
}

async function queue(el) {
  const r = await api("/api/admin/queue");
  el.innerHTML = `<div class="between"><h1>Hàng đợi duyệt hồ sơ KOC</h1>${r.kocs.length ? `<button class="btn ok sm" id="q-bulk">Duyệt hàng loạt (${r.kocs.length})</button>` : ""}</div>
    <div id="queue-list" style="margin-top:16px">${r.kocs.length ? r.kocs.map(kocQueueCard).join("") : empty("<img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em>", "Không có hồ sơ chờ duyệt")}</div>`;
  mountListSearch(el, { key: "admin-queue", label: "Tìm hồ sơ KOC", placeholder: "Tên, email, điện thoại, tỉnh thành hoặc ngành hàng…", itemSelector: ".koc-queue-card", containerSelector: "#queue-list", searchText: (card) => card.dataset.search });
  el.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => act(b.dataset.approve, true, el)),
  );
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", async () => {
      const rr = await promptDialog("Lý do từ chối:");
      if (rr !== null) act(b.dataset.reject, false, el);
    }),
  );
  el.querySelectorAll("[data-detail]").forEach((b) =>
    b.addEventListener("click", () =>
      kocDetail(r.kocs.find((x) => x.id === b.dataset.detail)),
    ),
  );
  const bulk = document.getElementById("q-bulk");
  if (bulk) bulk.textContent = "Duyệt các hồ sơ đang hiển thị";
  if (bulk)
    bulk.addEventListener("click", async () => {
      const ids = [...el.querySelectorAll(".koc-queue-card:not([hidden]) [data-approve]")].map((button) => button.dataset.approve);
      if (!ids.length) return toast("Không có hồ sơ phù hợp để duyệt", "err");
      if (!(await confirmDialog(`Duyệt ${ids.length} hồ sơ KOC đang hiển thị?`))) return;
      await post("/api/admin/approve-bulk", { ids });
      toast("Đã duyệt hàng loạt", "ok");
      queue(el);
    });
}
function kocQueueCard(k) {
  return `<div class="card koc-queue-card" data-search="${esc([k.name, k.email, k.phone, k.province, ...(k.categories || [])].join(" "))}" style="margin-bottom:12px"><div class="between">
    <div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}"><div>
       <div class="row"><strong>${esc(k.name)}</strong>${tierBadge(k.tier)}${k.followers_verified ? '<span class="chip g">✓ Người theo dõi đã xác minh</span>' : '<span class="chip w">Người theo dõi chưa xác minh</span>'}${k.status === "leader_ok" ? '<span class="chip b">Trưởng nhóm đã duyệt</span>' : ""}</div>
       <div class="muted" style="font-size:12px">📍 ${esc(k.province)} · ${num(k.followers)} người theo dõi · ${(k.categories || []).join(", ")}</div>
       <div class="muted" style="font-size:12px;margin-top:4px">Thời gian tạo hồ sơ: ${fmtDateTime(k.created_at)}</div></div></div>
    <div class="row"><button class="btn ghost sm" data-detail="${k.id}">Chi tiết</button>
      <button class="btn ok sm" data-approve="${k.id}">Duyệt</button>
      <button class="btn danger sm" data-reject="${k.id}">Từ chối</button></div></div></div>`;
}
async function act(id, approve, el) {
  await post("/api/admin/approve", { id, approve });
  toast(approve ? "Đã duyệt & kích hoạt" : "Đã từ chối", "ok");
  closeModal();
  queue(el);
}
async function kocDetail(k) {
  try {
    const result = await api(
      `/api/admin/koc-identity/${encodeURIComponent(k.id)}`,
    );
    k = {
      ...k,
      kyc_front_image: result.identity?.front_url || "",
      kyc_back_image: result.identity?.back_url || "",
      kyc_selfie_image: result.identity?.selfie_url || "",
    };
  } catch (_) {
    k = { ...k, kyc_front_image: "", kyc_back_image: "", kyc_selfie_image: "" };
  }
  modal(`<div class="row"><img class="avatar lg" src="${esc(avatarUrl(k.avatar))}"><div><h2>${esc(k.name)}</h2>${tierBadge(k.tier)} <span class="muted">📍 ${esc(k.province)}</span></div></div>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>Trạng thái</span><b>${statusChip(k.status)}</b></div>
      <div class="between"><span>Thời gian tạo hồ sơ</span><b>${fmtDateTime(k.created_at)}</b></div>
      <div class="between"><span>Thời gian ký hợp đồng</span><b>${fmtDateTime(k.contract_signed_at)}</b></div>
      <div class="between"><span>Người theo dõi</span><b>${num(k.followers)} ${k.followers_verified ? '<span class="chip g">✓ Đã xác minh</span>' : '<span class="chip w">Chưa xác minh</span>'}</b></div>
      <div class="between"><span>Đánh giá</span><b>${stars(k.rating)} · ${num(k.completed_bookings || 0)} booking</b></div>
      <div class="between"><span>Ngành hàng</span><b>${(k.categories || []).join(", ")}</b></div>
      <div class="between"><span>Kênh mạng xã hội</span><b style="font-size:12px">${(k.socials || []).map((social) => `${esc(social.platform || "")} ${esc(social.handle || "")}`).join(" · ") || "—"}</b></div>
      <div class="between"><span>SĐT / Email</span><b style="font-size:12px">${esc(k.phone || "")} · ${esc(k.email || "—")}</b></div>
      <div class="between"><span>Mã hợp đồng</span><b style="font-size:11px">${esc((k.contract_hash || "").slice(0, 20))}…</b></div>
    </div>
    ${k.bio ? `<div class="tint-box" style="margin:0 0 12px"><div style="font-size:12px;font-weight:700;margin-bottom:5px">Giới thiệu</div><div class="muted">${esc(k.bio)}</div></div>` : ""}
    ${(k.prices || []).length ? `<div class="tint-box" style="margin:0 0 12px"><div style="font-size:12px;font-weight:700;margin-bottom:5px">Bảng giá booking</div>${k.prices.map((price) => `<div class="between"><span>${esc(price.category)}</span><b>${money(price.price)}</b></div>`).join("")}</div>` : ""}
    <div class="tint-box" style="margin:0 0 12px">
      <div style="font-size:12px;font-weight:700;margin-bottom:4px">💳 Tài khoản nhận thanh toán</div>
      <div class="between"><span>Ngân hàng</span>${bankIdentityHtml(state.config?.payoutBanks, k.bank_name, k.bank_bin, "—")}</div>
      <div class="between"><span>Số TK</span><b>${esc(k.bank_account || "—")}</b></div>
      <div class="between"><span>Chủ TK</span><b>${esc(k.bank_owner || "—")}</b></div>
    </div>
    <h3>Xác minh danh tính</h3><div class="row" style="margin:8px 0;align-items:stretch">${[
      ["Mặt trước CCCD", k.kyc_front_image],
      ["Mặt sau CCCD", k.kyc_back_image],
      ["Ảnh chân dung", k.kyc_selfie_image],
    ]
      .map(
        (
          [label, image],
          index,
        ) => `<div class="tint-box" style="text-align:center;flex:1;padding:8px;min-width:0">${
          image
            ? `<button type="button" data-kyc-image="${index}" style="display:block;width:100%;padding:0;border:0;background:none;cursor:zoom-in"><img src="${esc(image)}" alt="${label}" style="display:block;width:100%;height:120px;object-fit:cover;border-radius:8px"></button>`
            : `<div style="height:120px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.55)">📷</div>`
        }
      <div style="font-size:11px;margin-top:6px">${label}</div><span class="chip ${image ? "g" : "w"}" style="margin-top:4px">${image ? "Đạt" : "Chưa lưu ảnh"}</span></div>`,
      )
      .join("")}</div>
    <div class="row">
      ${k.contract_html ? '<button class="btn primary" id="admin-view-contract">📜 Xem hợp đồng đã ký</button>' : ""}
      <button class="btn ghost" onclick="document.getElementById('modal-root').innerHTML=''">Đóng</button>
    </div>`);
  document
    .getElementById("admin-view-contract")
    ?.addEventListener("click", () => showSignedContract(k));
  const identityImages = [
    k.kyc_front_image,
    k.kyc_back_image,
    k.kyc_selfie_image,
  ];
  document.querySelectorAll("[data-kyc-image]").forEach((button) =>
    button.addEventListener("click", () => {
      const image = identityImages[Number(button.dataset.kycImage)];
      if (image)
        modal(
          `<img src="${esc(image)}" alt="Ảnh xác minh danh tính" style="display:block;max-width:100%;max-height:82vh;margin:auto;border-radius:10px">`,
        );
    }),
  );
}

function showSignedContract(c) {
  if (!c.contract_html) {
    toast("Hồ sơ cũ chưa lưu bản hợp đồng và chữ ký đầy đủ", "err");
    return;
  }
  const dialog = modal(`<div class="between">
      <div><h2>Hợp đồng điện tử đã ký</h2><div class="muted" style="font-size:12px">${esc(c.name)} · ${esc(c.contract_version || "KOC")}</div></div>
      <div style="text-align:right">
        <button class="btn primary sm" id="admin-print-contract">🖨️ In / Lưu PDF</button>
        <div class="muted" style="font-size:11px;margin-top:4px">Khi lưu PDF, hãy tắt “Đầu trang và chân trang”.</div>
      </div>
    </div>
    <div class="copybox" style="margin:10px 0;word-break:break-all;font-size:11px"><b>SHA-256:</b> ${esc(c.contract_hash || "")}</div>
    <iframe id="admin-contract-frame" title="Hợp đồng đã ký của ${esc(c.name)}" sandbox="allow-same-origin allow-modals"
      style="width:100%;height:72vh;border:1px solid #d1d5db;border-radius:10px;background:#e5e7eb"></iframe>
    <button class="btn ghost" onclick="document.getElementById('modal-root').innerHTML=''" style="margin-top:10px">Đóng</button>`);
  dialog.style.maxWidth = "1180px";
  const frame = document.getElementById("admin-contract-frame");
  const printDocument = buildContractPrintDocument(c);
  frame.srcdoc = printDocument;
  document
    .getElementById("admin-print-contract")
    ?.addEventListener("click", () => {
      const target = frame.contentWindow;
      if (!target) return toast("Không mở được bản in hợp đồng", "err");
      target.focus();
      target.print();
    });
}

function buildContractPrintDocument(c) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src 'self'; style-src 'unsafe-inline'">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title></title>
    </head><body>${c.contract_html}
    <style>
      @font-face{font-family:"Be Vietnam Pro Local";src:url("/font/Be_Vietnam_Pro/BeVietnamPro-Regular.ttf") format("truetype");font-weight:400;font-style:normal}
      @font-face{font-family:"Be Vietnam Pro Local";src:url("/font/Be_Vietnam_Pro/BeVietnamPro-Bold.ttf") format("truetype");font-weight:700;font-style:normal}
      @page{size:A4 portrait;margin:21mm 23mm}
      *{box-sizing:border-box}
      html,body{margin:0;color:#000;background:#e5e7eb}
      body{padding:18px;font-family:"Be Vietnam Pro Local",Arial,sans-serif;font-size:13pt;line-height:1.35}
      .contract-box{width:210mm;min-height:297mm;margin:0 auto;background:#fff!important;border:0!important;border-radius:0!important;box-shadow:0 2px 16px rgba(0,0,0,.16);overflow:visible!important;padding:21mm 23mm}
      .contract-header{background:#fff!important;color:#000!important;padding:0!important;text-align:center}
      .contract-title{font-family:"Be Vietnam Pro Local",Arial,sans-serif!important;font-size:15pt!important;font-weight:700!important;text-transform:uppercase;margin:0 0 4pt!important;letter-spacing:0!important}
      .contract-subtitle,.contract-header .doc-no{font-family:"Be Vietnam Pro Local",Arial,sans-serif!important;color:#000!important;font-size:11pt!important;margin:0 0 4pt!important}
      .contract-header .doc-no{text-align:left;margin-top:10pt!important}
      .contract-scroll{max-height:none!important;overflow:visible!important;padding:0!important;background:#fff!important;color:#000!important;font-family:"Be Vietnam Pro Local",Arial,sans-serif!important;font-size:13pt!important;line-height:1.35!important}
      .contract-basis{margin:10pt 0!important;padding:0!important;background:#fff!important;border:0!important;border-radius:0!important;font-size:13pt!important}
      .contract-basis ul{margin:4pt 0 8pt 24pt!important;padding:0!important}
      .contract-basis li{margin:0 0 3pt!important}
      .contract-party{margin:8pt 0!important;padding:0!important;border:0!important;border-radius:0!important;font-size:13pt!important}
      .contract-party b{color:#000!important}
      .contract-party .party-label{display:block!important;background:none!important;color:#000!important;border-radius:0!important;padding:0!important;margin:8pt 0 3pt!important;font-size:13pt!important;font-weight:700!important}
      .contract-scroll p{margin:0 0 6pt!important;text-align:justify}
      .contract-article-title{font-family:"Be Vietnam Pro Local",Arial,sans-serif!important;font-size:13pt!important;font-weight:700!important;color:#000!important;margin:10pt 0 5pt!important;padding:0!important;border:0!important;page-break-after:avoid}
      .contract-scroll .term-def b{color:#000!important}
      .contract-table{width:100%!important;border-collapse:collapse!important;margin:8pt 0 10pt!important;font-family:"Be Vietnam Pro Local",Arial,sans-serif!important;font-size:11pt!important;page-break-inside:auto}
      .contract-table tr{page-break-inside:avoid}
      .contract-table th,.contract-table td{border:1px solid #000!important;background:#fff!important;color:#000!important;padding:4pt 5pt!important;vertical-align:middle!important;text-align:left!important}
      .contract-table th{font-weight:700!important;text-align:center!important}
      .contract-signblock{display:flex!important;gap:12mm!important;margin-top:14pt!important;padding-top:0!important;border:0!important;font-size:12pt!important;page-break-inside:avoid;text-align:center}
      .contract-signblock>div{flex:1!important}
      .contract-signblock .sign-label{font-weight:700!important;color:#000!important;margin-bottom:5pt!important}
      .contract-signblock img{margin:5pt auto!important}
      .contract-endnote{margin-top:14pt!important;font-size:10.5pt!important;font-style:italic!important;color:#000!important}
      @media print{
        html,body{background:#fff!important}
        body{padding:0!important}
        .contract-box{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important}
      }
    </style></body></html>`;
}

let abFilters = { page: 1 };
async function allBookings(el) {
  const cfg = state.config;
  el.innerHTML = `<h1>Booking toàn sàn</h1>
    <div class="filters" style="margin:14px 0">
      <div class="field"><label for="ab-q">Tìm booking</label><input id="ab-q" type="search" placeholder="Mã booking, doanh nghiệp hoặc KOC…" value="${esc(abFilters.q || "")}"></div>
      <div class="field"><label>Trạng thái</label><select id="ab-status"><option value="">Tất cả</option>${["pending", "confirmed", "producing", "posted", "payment_pending", "payment_failed", "payment_cancelled", "settling", "completed", "rejected"].map((s) => `<option value="${s}" ${abFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Loại booking</label><select id="ab-type"><option value="">Tất cả</option>${[
        ["aiclone", "AI Clone Avatar"],
        ["review", "Review"],
        ["advertising", "Quảng cáo"],
        ["affiliate", "Tiếp thị liên kết"],
        ["combo", "Combo"],
      ]
        .map(
          ([value, label]) =>
            `<option value="${value}" ${abFilters.type === value ? "selected" : ""}>${label}</option>`,
        )
        .join("")}</select></div>
      <div class="field"><label>Doanh nghiệp</label><input id="ab-biz" value="${esc(abFilters.business || "")}"></div>
      <div class="field"><label>KOC</label><input id="ab-koc" value="${esc(abFilters.koc || "")}"></div>
      <div class="field"><label>Từ ngày</label><input id="ab-from" type="date" value="${abFilters.fromD || ""}"></div>
      <div class="field"><label>Đến ngày</label><input id="ab-to" type="date" value="${abFilters.toD || ""}"></div>
      <button class="btn primary sm" id="ab-go">Lọc</button>
    </div>
    <div class="table-wrap" id="ab-table">${skeletonTable(5)}</div>
    <div id="ab-pager"></div>`;
  document.getElementById("ab-go").addEventListener("click", () => {
    abFilters = {
      q: document.getElementById("ab-q").value.trim(),
      status: document.getElementById("ab-status").value,
      type: document.getElementById("ab-type").value,
      business: document.getElementById("ab-biz").value.trim(),
      koc: document.getElementById("ab-koc").value.trim(),
      fromD: document.getElementById("ab-from").value,
      toD: document.getElementById("ab-to").value,
      page: 1,
    };
    loadAllBookings(el);
  });
  el.querySelectorAll("#ab-q, #ab-biz, #ab-koc").forEach(input => input.addEventListener("keydown", event => {
    if (event.key === "Enter") el.querySelector("#ab-go").click();
  }));
  await loadAllBookings(el);
}
async function loadAllBookings(el) {
  const tbl = document.getElementById("ab-table");
  tbl.innerHTML = skeletonTable(5);
  const qs = new URLSearchParams();
  qs.set("page", String(abFilters.page || 1));
  qs.set("per", "10");
  if (abFilters.q) qs.set("q", abFilters.q);
  if (abFilters.status) qs.set("status", abFilters.status);
  if (abFilters.type) qs.set("type", abFilters.type);
  if (abFilters.business) qs.set("business", abFilters.business);
  if (abFilters.koc) qs.set("koc", abFilters.koc);
  if (abFilters.fromD)
    qs.set(
      "from",
      String(
        Math.floor(new Date(abFilters.fromD + "T00:00:00").getTime() / 1000),
      ),
    );
  if (abFilters.toD)
    qs.set(
      "to",
      String(
        Math.floor(new Date(abFilters.toD + "T23:59:59").getTime() / 1000),
      ),
    );
  const r = await api("/api/bookings?" + qs.toString());
  abFilters.page = r.page;
  tbl.innerHTML = r.bookings.length
    ? `<table><thead><tr><th>Mã</th><th>Thời gian</th><th>DN</th><th>KOC</th><th>Giá</th><th>Loại</th><th>Trạng thái</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${r.bookings
      .map(
        (
          b,
        ) => `<tr><td>${esc(b.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDateTime(b.created_at)}</td><td>${esc(b.bizname)}</td><td>${esc(b.kocname)}</td><td class="money">${money(b.price)}</td>
      <td>${b.type === "aiclone" ? `${icon("aiClone")} Video đại diện` : b.booking_type === "affiliate" ? "Tiếp thị liên kết" : b.booking_type === "combo" ? "Gói kết hợp" : b.content_type === "advertising" ? "Quảng cáo" : "Đánh giá sản phẩm"}</td><td>${statusChip(b.status)}</td>
      <td style="width:1%;white-space:nowrap;text-align:right">${b.status === "pending" ? `<button class="btn danger sm" data-refund="${b.id}">Yêu cầu hoàn</button>` : ""}</td></tr>`,
      )
      .join("")}
    </tbody></table>`
    : empty("📋", "Không có booking phù hợp bộ lọc");
  tbl.querySelectorAll("[data-refund]").forEach((b) =>
    b.addEventListener("click", async () => {
      const reason =
        (await promptDialog("Lý do hoàn tiền/khiếu nại:")) ||
        "Admin xử lý khiếu nại";
      await post("/api/booking/action", {
        id: b.dataset.refund,
        action: "reject",
        reason,
      });
      toast("Khoản tiền đã được chuyển sang chờ hoàn", "ok");
      loadAllBookings(el);
    }),
  );
  const pager = document.getElementById("ab-pager");
  if (pager) {
    pager.innerHTML = pagerHtml(r.page, r.pages);
    pager.querySelectorAll("[data-pg]").forEach((button) =>
      button.addEventListener("click", () => {
        abFilters.page = Number(button.dataset.pg);
        loadAllBookings(el);
        tbl.scrollIntoView({ behavior: "smooth", block: "start" });
      }),
    );
  }
}

// ---------- Complaints (tiếp nhận → xem chi tiết → xử lý → cập nhật trạng thái, gắn với hoàn tiền) ----------
let complaintFilters = { search: "", status: "", page: 1 };
async function complaintsAdmin(el) {
  el.innerHTML = `<div class="between"><h1 class="icon-heading">${icon("complaint", "teaser-icon")} Khiếu nại booking</h1>
    <div class="field"><label for="cp-status">Trạng thái khiếu nại</label><select id="cp-status"><option value="">Tất cả</option><option value="open">Mới tiếp nhận</option><option value="in_review">Đang xử lý</option><option value="resolved">Đã xử lý</option><option value="rejected">Từ chối</option></select></div></div>
    ${searchForm("admin-complaints", "Tìm khiếu nại", "Mã booking, doanh nghiệp, KOC hoặc nội dung…", complaintFilters.search)}
    <div style="margin-top:16px" id="cp-list">${skeletonPage("complaints")}</div>`;
  el.querySelector("#cp-status").value = complaintFilters.status;
  bindSearchForm(el, "admin-complaints", search => {
    complaintFilters.search = search;
    complaintFilters.page = 1;
    loadComplaints(el).catch(error => toast(error.message, "err"));
  });
  document
    .getElementById("cp-status")
    .addEventListener("change", event => {
      complaintFilters.status = event.target.value;
      complaintFilters.search = el.querySelector("#search-admin-complaints").value.trim();
      complaintFilters.page = 1;
      loadComplaints(el).catch(error => toast(error.message, "err"));
    });
  await loadComplaints(el);
}
async function loadComplaints(el) {
  const r = await api("/api/complaints?" + new URLSearchParams({ ...complaintFilters, per: "10" }));
  complaintFilters.page = r.page || 1;
  const list = document.getElementById("cp-list");
  if (!r.complaints.length) {
    list.innerHTML = empty("<img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em>", "Không có khiếu nại nào");
    return;
  }
  list.innerHTML = r.complaints
    .map(
      (c) => `<div class="card" style="margin-bottom:12px">
    <div class="between"><div><strong>${esc(c.bcode)}</strong> · ${esc(c.bizname)} ↔ ${esc(c.kocname)} ${statusChip(c.status)}</div>
      <button class="btn ghost sm" data-detail="${c.id}">Xem chi tiết</button></div>
    <div class="muted" style="margin-top:6px;font-size:13px">${esc((c.reason || "").slice(0, 140))}${(c.reason || "").length > 140 ? "…" : ""}</div>
    <div class="muted" style="font-size:11px;margin-top:4px">Gửi bởi ${c.raised_by_role === "business" ? "Doanh nghiệp" : "KOC"} · ${fmtDateTime(c.created_at)}</div>
  </div>`,
    )
    .join("");
  list.insertAdjacentHTML("afterbegin", `<p class="list-search-summary" role="status">${num(r.total ?? r.complaints.length)} khiếu nại phù hợp</p>`);
  list.insertAdjacentHTML("beforeend", pagerHtml(r.page, r.pages));
  list.querySelectorAll("[data-pg]").forEach(button => button.addEventListener("click", () => {
    complaintFilters.page = Number(button.dataset.pg);
    loadComplaints(el).catch(error => toast(error.message, "err"));
  }));
  list.querySelectorAll("[data-detail]").forEach((b) =>
    b.addEventListener("click", () => {
      const c = r.complaints.find((x) => x.id === b.dataset.detail);
      complaintDetail(c, el);
    }),
  );
}
function complaintDetail(c, el) {
  const canAct = c.status === "open" || c.status === "in_review";
  const m = modal(`<h2>Khiếu nại · ${esc(c.bcode)}</h2>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>Doanh nghiệp</span><b>${esc(c.bizname)}</b></div>
      <div class="between"><span>KOC</span><b>${esc(c.kocname)}</b></div>
      <div class="between"><span>Gửi bởi</span><b>${c.raised_by_role === "business" ? "Doanh nghiệp" : "KOC"}</b></div>
      <div class="between"><span>Thời gian gửi</span><b>${fmtDateTime(c.created_at)}</b></div>
      <div class="between"><span>Khoản tiền còn được đảm bảo</span><b class="money">${money(c.escrow || 0)}</b></div>
      <div class="between"><span>Trạng thái</span>${statusChip(c.status)}</div>
    </div>
    <div class="field"><label>Lý do khiếu nại</label><div class="tint-box">${esc(c.reason)}</div></div>
    ${c.admin_note ? `<div class="field"><label>Ghi chú xử lý</label><div class="tint-box">${esc(c.admin_note)}</div></div>` : ""}
    ${
      canAct
        ? `<div class="field" style="margin-top:10px"><label>Ghi chú phản hồi</label><textarea id="cp-note" rows="2" placeholder="Mô tả cách xử lý…"></textarea></div>
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
      ${c.status === "open" ? `<button class="btn ghost sm" id="cp-review">Tiếp nhận xử lý</button>` : ""}
      ${c.escrow > 0 ? `<button class="btn danger sm" id="cp-refund">Hoàn tiền cho DN</button>` : ""}
      <button class="btn ok sm" id="cp-resolve">Đánh dấu đã xử lý</button>
      <button class="btn ghost sm" id="cp-reject">Từ chối khiếu nại</button>
    </div>`
        : ""
    }
    <button class="btn ghost" id="cp-close" style="margin-top:10px">Đóng</button>`);
  m.querySelector("#cp-close").addEventListener("click", closeModal);
  const note = () => (m.querySelector("#cp-note")?.value || "").trim();
  const doAct = async (action) => {
    try {
      await post("/api/complaints/action", { id: c.id, action, note: note() });
      toast("Đã cập nhật khiếu nại", "ok");
      closeModal();
      complaintsAdmin(el);
    } catch (e) {
      toast(e.message, "err");
    }
  };
  const rv = m.querySelector("#cp-review");
  if (rv) rv.addEventListener("click", () => doAct("review"));
  const rf = m.querySelector("#cp-refund");
  if (rf)
    rf.addEventListener("click", async () => {
      if (
        await confirmDialog(
          "Xác nhận hoàn khoản tiền đang được đảm bảo cho doanh nghiệp?",
        )
      )
        doAct("refund");
    });
  const rs = m.querySelector("#cp-resolve");
  if (rs) rs.addEventListener("click", () => doAct("resolve"));
  const rj = m.querySelector("#cp-reject");
  if (rj) rj.addEventListener("click", () => doAct("reject"));
}

// ---------- Contracts registry (mã hợp đồng / hash / timestamp / các bên ký / trạng thái) ----------
let ctrFilters = { page: 1 };
async function contractsAdmin(el) {
  el.innerHTML = `<h1>📜 Hợp đồng điện tử KOC</h1>
    <div class="filters" style="margin:14px 0">
      <div class="field"><label>Tìm (tên/mã hash)</label><input id="ct-search" value="${esc(ctrFilters.search || "")}"></div>
      <div class="field"><label>Trạng thái</label><select id="ct-status"><option value="">Tất cả</option><option value="pending">Chờ duyệt</option><option value="leader_ok">Trưởng nhóm duyệt</option><option value="active">Đã kích hoạt</option><option value="rejected">Từ chối</option></select></div>
      <button class="btn primary sm" id="ct-go">Tìm</button>
    </div>
    <div id="ct-list">${skeletonPage("contracts")}</div>`;
  document.getElementById("ct-go").addEventListener("click", () => {
    ctrFilters = {
      page: 1,
      search: document.getElementById("ct-search").value.trim(),
      status: document.getElementById("ct-status").value,
    };
    loadContracts(el);
  });
  el.querySelector("#ct-search").addEventListener("keydown", event => {
    if (event.key === "Enter") el.querySelector("#ct-go").click();
  });
  await loadContracts(el);
}
async function loadContracts(el) {
  const box = document.getElementById("ct-list");
  box.innerHTML = skeletonPage("contracts");
  const qs = new URLSearchParams({ page: ctrFilters.page || 1 });
  if (ctrFilters.search) qs.set("search", ctrFilters.search);
  if (ctrFilters.status) qs.set("status", ctrFilters.status);
  const r = await api("/api/admin/contracts?" + qs.toString());
  if (!r.contracts.length) {
    box.innerHTML = empty("📜", "Không tìm thấy hợp đồng nào");
    return;
  }
  box.innerHTML =
    `<div class="table-wrap"><table><thead><tr><th>KOC</th><th>Hạng</th><th>Mã hợp đồng (hash)</th><th>Thời gian ký</th><th>Trạng thái</th><th></th></tr></thead><tbody>
    ${r.contracts
      .map(
        (
          c,
        ) => `<tr><td>${esc(c.name)}</td><td>${tierBadge(c.tier)}</td><td style="font-size:11px">${esc((c.contract_hash || "").slice(0, 18))}…</td>
      <td class="muted">${fmtDateTime(c.contract_signed_at)}</td><td>${statusChip(c.status)}</td>
      <td><button class="btn ghost sm" data-view="${c.id}">Chi tiết</button></td></tr>`,
      )
      .join("")}
    </tbody></table></div>` + pagerHtml(r.page, r.pages);
  box.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      showSignedContract(r.contracts.find((x) => x.id === b.dataset.view));
    }),
  );
  box.querySelectorAll("[data-pg]").forEach((b) =>
    b.addEventListener("click", () => {
      ctrFilters.page = Number(b.dataset.pg);
      loadContracts(el);
    }),
  );
}
function pagerHtml(page, pages) {
  if (pages <= 1) return "";
  let btns = `<button class="btn ghost sm" ${page <= 1 ? "disabled" : ""} data-pg="${page - 1}">‹ Trước</button>`;
  btns += `<span class="muted" style="margin:0 10px">Trang ${page}/${pages}</span>`;
  btns += `<button class="btn ghost sm" ${page >= pages ? "disabled" : ""} data-pg="${page + 1}">Sau ›</button>`;
  return `<div style="margin-top:12px;text-align:center">${btns}</div>`;
}

async function adminCampaigns(el) {
  const r = await api("/api/campaigns");
  const campaignStatus = {
    pending: "Chờ Admin báo giá",
    quote_pending: "Chờ Admin báo giá",
    quoted: "Đã gửi báo giá",
    funded: "Đã ký quỹ",
    coordinating: "Đang tuyển chọn",
    assigned: "Đã phân bổ",
    in_progress: "Đang nghiệm thu",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  };
  el.innerHTML = `<h1>Điều phối chiến dịch lớn</h1>
    <div id="admin-campaign-list" style="margin-top:16px">${
      r.campaigns.length
        ? r.campaigns
            .map((c) => {
              let assigned = [];
              try {
                assigned = JSON.parse(c.assigned || "[]");
              } catch (e) {}
              const allocations = Array.isArray(c.allocations)
                ? c.allocations
                : [];
              return `<div class="card" style="margin-bottom:12px">
      <div class="between"><div><strong>${esc(c.bizname)}</strong> <span class="chip ${c.status === "completed" ? "g" : c.status === "cancelled" ? "r" : ["pending","quote_pending"].includes(c.status) ? "w" : "b"}">${campaignStatus[c.status] || esc(c.status)}</span></div><div class="row" style="flex-wrap:wrap">${["pending","quote_pending","quoted"].includes(c.status) ? `<button class="btn primary sm" data-campaign-quote="${c.id}">Gửi báo giá</button>` : ""}${c.status === "funded" ? `<button class="btn primary sm" data-campaign-start="${c.id}">Bắt đầu điều phối</button>` : ""}${["coordinating", "assigned"].includes(c.status) && allocations.every(a=>['invited','declined'].includes(a.status)) ? `<button class="btn primary sm" data-assign="${c.id}">Phân bổ KOC</button>` : ""}${["assigned", "in_progress"].includes(c.status) && allocations.length && allocations.every((x) => x.status === "settled") ? `<button class="btn ok sm" data-campaign-complete="${c.id}">Hoàn tất</button>` : ""}${!["completed", "cancelled"].includes(c.status) ? `<button class="btn ghost sm" data-admin-campaign-cancel="${c.id}">Hủy</button>` : ""}</div></div>
      <div class="muted" style="margin-top:6px">Ngân sách KOC ${money(c.budget)} · Phí điều phối ${money(Number(c.management_fee) || Math.max(2000000, Math.round(Number(c.budget) * 0.15)))} · Tổng ${money(Number(c.total_amount) || Number(c.budget) + Number(c.management_fee))}</div><div class="muted" style="margin-top:3px">${c.qty} KOC hạng ${esc(c.tier)} · ngành ${esc(c.category)}</div>
      <div class="muted" style="font-size:12px;margin-top:6px">Thời gian tạo: ${fmtDateTime(c.created_at)}</div>
      ${c.note ? `<div class="tint-box" style="margin-top:8px;font-size:13px">${esc(c.note)}</div>` : ""}
      <div style="margin-top:8px"><span class="chip ${assigned.length > Number(c.qty) ? "r" : assigned.length === Number(c.qty) ? "g" : "n"}">${assigned.length}/${c.qty} KOC đã gán</span>
        ${assigned.length ? assigned.map((k) => `<span class="chip g" style="margin:2px">${esc(k.name)}</span>`).join("") : '<span class="muted" style="font-size:12px">Chưa gán KOC nào</span>'}
        ${assigned.length > Number(c.qty) ? '<div style="color:var(--error);font-size:12px;margin-top:6px">Số KOC đang gán vượt yêu cầu.</div>' : ""}</div>${allocations.length ? `<div class="campaign-allocation-list">${allocations.map((a) => `<div><span><b>${esc(a.koc_name)}</b><small>${statusChip(a.status)}${a.submission_url?` · <a href="${esc(a.submission_url)}" target="_blank" rel="noopener">Xem nội dung</a>`:''}</small></span><strong>${money(a.amount)}</strong>${a.status === "approved" ? `<button class="btn ok sm" data-settle-allocation="${a.id}" data-campaign-id="${c.id}">Giải ngân đúng khoản</button>` : a.status === "settled"?'<span class="chip g">Đã trả</span>':a.status==='declined'?`<button class="btn ghost sm" data-replace-allocation="${a.id}" data-campaign-id="${c.id}">Chọn KOC thay thế</button>`:'<span class="muted">Chưa đủ điều kiện</span>'}</div>`).join("")}</div>` : ""}
    </div>`;
            })
            .join("")
        : empty("📣", "Chưa có yêu cầu chiến dịch")
    }</div>`;
  mountListSearch(el, { key: "admin-campaigns", label: "Tìm chiến dịch", placeholder: "Doanh nghiệp, ngành hàng, KOC hoặc ghi chú…", itemSelector: "#admin-campaign-list > .card", containerSelector: "#admin-campaign-list" });
  el.querySelectorAll('[data-campaign-quote]').forEach(button=>button.addEventListener('click',()=>{
    const c=r.campaigns.find(x=>x.id===button.dataset.campaignQuote),suggested=Number(c.management_fee)||Math.max(2000000,Math.round(Number(c.budget)*.15));
    const m=modal(`<h2>Báo giá chiến dịch lớn</h2><div class="tint-box" style="margin:12px 0"><div class="between"><span>Ngân sách trả KOC</span><b>${money(c.budget)}</b></div></div><div class="field"><label>Phí điều phối NetViet</label><input id="cq-fee" type="number" min="0" step="1000" value="${suggested}"></div><div class="field"><label>Ghi chú báo giá</label><textarea id="cq-note" rows="3">${esc(c.quote_note||'')}</textarea></div><button class="btn primary" id="cq-send">Gửi doanh nghiệp xác nhận</button><button class="btn ghost" id="cq-close" style="margin-top:8px">Đóng</button>`);
    m.querySelector('#cq-close').addEventListener('click',closeModal);m.querySelector('#cq-send').addEventListener('click',async()=>{try{await post('/api/campaign/action',{id:c.id,action:'quote',managementFee:Number(m.querySelector('#cq-fee').value),note:m.querySelector('#cq-note').value.trim()});toast('Đã gửi báo giá','ok');closeModal();adminCampaigns(el)}catch(e){toast(e.message,'err')}});
  }));
  el.querySelectorAll("[data-campaign-start]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!(await confirmDialog("Bắt đầu điều phối và ghi nhận 20% phí?")))
        return;
      try {
        await post("/api/campaign/action", {
          id: b.dataset.campaignStart,
          action: "start",
        });
        toast("Đã bắt đầu điều phối", "ok");
        adminCampaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-settle-allocation]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!(await confirmDialog("Nghiệm thu và giải ngân vào Ví KOC?"))) return;
      try {
        await post("/api/campaign/action", {
          id: b.dataset.campaignId,
          action: "settle_koc",
          allocationId: b.dataset.settleAllocation,
        });
        toast("Đã giải ngân", "ok");
        adminCampaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll('[data-replace-allocation]').forEach(button=>button.addEventListener('click',async()=>{
    const c=r.campaigns.find(x=>x.id===button.dataset.campaignId),categoryQuery=c.category==='Tất cả'?'':`&category=${encodeURIComponent(c.category)}`,kocs=await api(`/api/kocs?tier=${encodeURIComponent(c.tier)}${categoryQuery}`),used=new Set((c.allocations||[]).map(a=>a.koc_id));
    const candidates=kocs.kocs.filter(k=>!used.has(k.id));
    const m=modal(`<h2>Chọn KOC thay thế</h2><p class="muted" style="margin:6px 0 12px">Khoản phân bổ được giữ nguyên để không làm lệch ngân sách.</p>${candidates.length?candidates.map(k=>`<button class="btn ghost" data-replacement-koc="${k.id}" style="margin-bottom:8px;justify-content:flex-start"><img class="avatar" src="${esc(avatarUrl(k.avatar))}"><span>${esc(k.name)} · ${esc(k.tier)}</span></button>`).join(''):empty('🔍','Không còn KOC phù hợp')}<button class="btn ghost" id="replace-close">Đóng</button>`);
    m.querySelector('#replace-close').addEventListener('click',closeModal);m.querySelectorAll('[data-replacement-koc]').forEach(k=>k.addEventListener('click',async()=>{try{await post('/api/admin/campaign-allocation-replace',{allocationId:button.dataset.replaceAllocation,kocId:k.dataset.replacementKoc});toast('Đã mời KOC thay thế','ok');closeModal();adminCampaigns(el)}catch(e){toast(e.message,'err')}}));
  }));
  el.querySelectorAll("[data-campaign-complete]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!(await confirmDialog("Hoàn tất và ghi nhận phí còn lại?"))) return;
      try {
        await post("/api/campaign/action", {
          id: b.dataset.campaignComplete,
          action: "complete",
        });
        toast("Đã hoàn tất", "ok");
        adminCampaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-admin-campaign-cancel]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!(await confirmDialog("Hủy và hoàn phần tiền chưa sử dụng?"))) return;
      try {
        const x = await post("/api/campaign/action", {
          id: b.dataset.adminCampaignCancel,
          action: "cancel",
        });
        toast(`Đã hoàn ${money(x.refundAmount || 0)}`, "ok");
        adminCampaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-assign]").forEach((b) =>
    b.addEventListener("click", async () => {
      const c = r.campaigns.find((x) => x.id === b.dataset.assign);
      let assigned = [];
      try {
        assigned = JSON.parse(c.assigned || "[]");
      } catch (e) {}
      const assignedIds = new Set(assigned.map((k) => k.id));
      const existingAmounts = new Map(
        (c.allocations || []).map((a) => [a.koc_id, Number(a.amount)]),
      );
      const categoryQuery =
        c.category === "Tất cả"
          ? ""
          : `&category=${encodeURIComponent(c.category)}`;
      const kocs = await api(
        `/api/kocs?tier=${encodeURIComponent(c.tier)}${categoryQuery}`,
      );
      const byId = new Map();
      assigned.forEach((k) => byId.set(k.id, k));
      kocs.kocs.forEach((k) => byId.set(k.id, k));
      const candidates = [...byId.values()];
      modal(`<div class="between"><h2>Gán KOC cho chiến dịch</h2><span class="chip n" id="asg-count">0/${c.qty} KOC</span></div>
      <p class="muted">Ngành ${esc(c.category)} · hạng ${esc(c.tier)} · tối đa ${c.qty} KOC theo yêu cầu doanh nghiệp.</p>
      <div class="tint-box" id="asg-warning" style="display:none;margin-top:10px;color:var(--error)"></div>
      <div style="margin-top:12px">${
        candidates.length
          ? candidates
              .map(
                (k) =>
                  `<div class="between list-item campaign-candidate"><label class="row" style="cursor:pointer;flex:1"><input type="checkbox" data-kid="${k.id}" ${assignedIds.has(k.id) ? "checked" : ""} style="width:auto;margin-right:8px"><img class="avatar" src="${esc(avatarUrl(k.avatar))}"><div><b>${esc(k.name)}</b><div class="muted" style="font-size:12px">${num(k.followers)} · ${stars(k.rating)}</div></div></label><div class="campaign-allocation-input"><span class="allocation-required-label">Chi phí KOC</span><input type="number" min="1" step="1000" data-allocation-for="${k.id}" value="${existingAmounts.get(k.id) || ""}" ${assignedIds.has(k.id) ? "" : "disabled"}></div></div>`,
              )
              .join("")
          : empty("🔍", "Không có KOC phù hợp")
      }</div>
      <button class="btn primary" id="asg-go" style="margin-top:10px">Xác nhận phân bổ</button>
      <button class="btn ghost" onclick="document.getElementById('modal-root').innerHTML=''" style="margin-top:8px">Đóng</button>`);
      const boxes = [...document.querySelectorAll("[data-kid]")];
      const allocationInputs = [
        ...document.querySelectorAll("[data-allocation-for]"),
      ];
      const updateSelection = () => {
        const count = boxes.filter((x) => x.checked).length;
        const over = count > Number(c.qty);
        const full = count >= Number(c.qty);
        const counter = document.getElementById("asg-count");
        counter.textContent = `${count}/${c.qty} KOC`;
        counter.className = `chip ${over ? "r" : count === Number(c.qty) ? "g" : "n"}`;
        boxes.forEach((x) => {
          if (!x.checked) x.disabled = full;
          document.querySelector(
            `[data-allocation-for="${x.dataset.kid}"]`,
          ).disabled = !x.checked;
        });
        const warning = document.getElementById("asg-warning");
        const allocated = allocationInputs
            .filter((x) => !x.disabled)
            .reduce((sum, x) => sum + (Number(x.value) || 0), 0),
          bad = count !== Number(c.qty) || allocated !== Number(c.budget);
        warning.style.display = over || bad ? "block" : "none";
        warning.textContent = over
          ? "Đang chọn quá số KOC."
          : count !== Number(c.qty)
            ? `Cần chọn đúng ${c.qty} KOC.`
            : `Tổng phân bổ ${money(allocated)}, phải bằng ${money(c.budget)}.`;
        document.getElementById("asg-go").disabled = over || bad;
      };
      const splitEvenly = () => {
        const selected = boxes.filter((x) => x.checked);
        if (!selected.length) return;
        const base =
          Math.floor(Number(c.budget) / selected.length / 1000) * 1000;
        let left = Number(c.budget);
        selected.forEach((box, i) => {
          const input = document.querySelector(
              `[data-allocation-for="${box.dataset.kid}"]`,
            ),
            amount = i === selected.length - 1 ? left : base;
          input.value = String(amount);
          left -= amount;
        });
      };
      boxes.forEach((x) =>
        x.addEventListener("change", () => {
          splitEvenly();
          updateSelection();
        }),
      );
      allocationInputs.forEach((x) =>
        x.addEventListener("input", updateSelection),
      );
      updateSelection();
      document.getElementById("asg-go").addEventListener("click", async () => {
        const allocations = [
          ...document.querySelectorAll("[data-kid]:checked"),
        ].map((x) => ({
          kocId: x.dataset.kid,
          amount: Number(
            document.querySelector(`[data-allocation-for="${x.dataset.kid}"]`)
              .value,
          ),
        }));
        try {
          await post("/api/admin/campaign-assign", { id: c.id, allocations });
          toast(`Đã phân bổ ${allocations.length} KOC`, "ok");
          closeModal();
          adminCampaigns(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
}

let settleView = {
  activeTab: "payout",
  payoutStatus: "pending",
  payoutPage: 1,
  distributionPage: 1,
  ledgerPage: 1,
  distributionSearch: "",
  ledgerSearch: "",
  auditPage: 1,
  auditSearch: "",
  auditCategory: "",
};

function payoutQrModal(ticket, onDone) {
  const isPending = ticket.status === "pending_review" || ticket.status === "processing";
  const m = modal(`
    <div style="max-width:580px;width:100%">
      <h2>Yêu cầu chi trả hoa hồng #${esc(ticket.ticket_code)}</h2>
      <p class="muted" style="font-size:12px">Quét mã VietQR bằng ứng dụng ngân hàng để chuyển khoản chính xác 100% không cần nhập tay.</p>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin:16px 0;align-items:start" class="payout-modal-grid">
        <div style="text-align:center;background:#fff;padding:12px;border-radius:12px;border:1px solid var(--border);box-shadow:0 2px 8px rgba(0,0,0,0.05)">
          ${ticket.vietqr_url ? `
            <img src="${ticket.vietqr_url}" alt="VietQR Napas 24/7" style="width:236px;height:236px;display:block;margin:0 auto;border-radius:8px">
            <div style="font-size:11px;color:#666;margin-top:8px">
              📱 Dùng App ngân hàng quét mã QR Napas 24/7
            </div>
          ` : `
            <div style="padding:40px 10px;color:var(--error);font-size:12px">
              ⚠️ Không thể tạo mã QR do thiếu thông tin ngân hàng hợp lệ
            </div>
          `}
        </div>

        <div>
          <div class="card" style="padding:12px;background:var(--bg-muted);margin-bottom:12px">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase">KOC nhận tiền</div>
            <div style="font-weight:700;font-size:14px;margin-top:2px">${esc(ticket.koc_name)}</div>
            <div class="muted" style="font-size:12px">${esc(ticket.koc_phone || ticket.koc_email || "")}</div>
            
            <div style="margin-top:10px;font-size:12px;display:flex;flex-direction:column;gap:6px">
              <div><span class="muted">Ngân hàng:</span> <b>${esc(ticket.bank_name)}</b></div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span><span class="muted">Số TK:</span> <b style="font-size:14px;color:var(--primary)">${esc(ticket.bank_account)}</b></span>
                <button class="btn ghost sm copy-val-btn" data-val="${esc(ticket.bank_account)}" style="padding:1px 6px;font-size:11px">Sao chép</button>
              </div>
              <div><span class="muted">Chủ TK:</span> <b>${esc(ticket.bank_owner || ticket.koc_name)}</b></div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span><span class="muted">Số tiền:</span> <b class="money" style="font-size:15px;color:var(--success)">${money(ticket.amount)}</b></span>
                <button class="btn ghost sm copy-val-btn" data-val="${ticket.amount}" style="padding:1px 6px;font-size:11px">Sao chép</button>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span><span class="muted">Nội dung:</span> <code>${esc(ticket.transfer_info?.content || ticket.ticket_code)}</code></span>
                <button class="btn ghost sm copy-val-btn" data-val="${esc(ticket.transfer_info?.content || ticket.ticket_code)}" style="padding:1px 6px;font-size:11px">Sao chép</button>
              </div>
            </div>
          </div>

          ${isPending ? `
            <div class="field" style="margin-bottom:8px">
              <label style="font-size:12px">Mã giao dịch ngân hàng (tùy chọn sau khi chuyển)</label>
              <input id="payout-ref-input" placeholder="Ví dụ: FT260910..." style="font-size:12px;padding:6px 10px">
            </div>
          ` : `
            <div style="padding:8px 12px;border-radius:8px;background:rgba(34,197,94,0.1);color:var(--success);font-size:12px;margin-bottom:10px">
              ${ticket.status === 'settled' || ticket.status === 'paid' ? '✅ Đã xác nhận chuyển tiền' : '❌ Đã từ chối yêu cầu'}
              ${ticket.note ? `<div class="muted" style="margin-top:2px;font-size:11px">${esc(ticket.note)}</div>` : ''}
            </div>
          `}
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;align-items:center">
        ${isPending ? `
          <button class="btn primary" id="payout-confirm-btn" style="flex:2 1 200px;min-height:44px;height:auto;padding:10px 16px;white-space:nowrap;font-weight:600;font-size:14px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">✅ Xác nhận đã chuyển tiền</button>
          <button class="btn ghost" id="payout-cancel-btn" style="flex:1 0 auto;width:auto;min-height:44px;height:auto;padding:10px 14px;color:var(--error);border-color:rgba(217,48,37,0.3);white-space:nowrap;font-size:14px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">❌ Từ chối</button>
        ` : ''}
        <button class="btn ghost" id="payout-close-btn" style="${isPending ? 'flex:0 0 auto;width:auto;min-height:44px;height:auto;padding:10px 14px;white-space:nowrap;font-size:14px;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box' : 'width:100%'}">Đóng</button>
      </div>
    </div>
  `);

  m.querySelectorAll(".copy-val-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard?.writeText(btn.dataset.val || "");
      toast("Đã sao chép: " + btn.dataset.val, "ok");
    });
  });

  m.querySelector("#payout-close-btn")?.addEventListener("click", closeModal);

  if (isPending) {
    m.querySelector("#payout-confirm-btn")?.addEventListener("click", async () => {
      const refCode = m.querySelector("#payout-ref-input")?.value?.trim() || "";
      const btn = m.querySelector("#payout-confirm-btn");
      btn.disabled = true;
      btn.textContent = "Đang xử lý...";
      try {
        await post("/api/admin/payout-tickets/approve", {
          id: ticket.id,
          reference_code: refCode,
        });
        toast("Đã xác nhận chuyển tiền thành công cho KOC!", "ok");
        closeModal();
        onDone?.();
      } catch (err) {
        toast(err.message || "Không thể duyệt yêu cầu", "err");
        btn.disabled = false;
        btn.textContent = "✅ Xác nhận đã chuyển tiền";
      }
    });

    m.querySelector("#payout-cancel-btn")?.addEventListener("click", async () => {
      const reason = await promptDialog("Lý do từ chối yêu cầu rút tiền:", "Thông tin tài khoản không hợp lệ");
      if (!reason) return;
      try {
        await post("/api/admin/payout-tickets/reject", {
          id: ticket.id,
          reason,
        });
        toast("Đã từ chối yêu cầu và hoàn lại tiền vào ví KOC!", "ok");
        closeModal();
        onDone?.();
      } catch (err) {
        toast(err.message || "Không thể từ chối yêu cầu", "err");
      }
    });
  }
}

async function settle(el, changes = {}) {
  settleView = { ...settleView, ...changes };
  const ledgerParams = new URLSearchParams({
    per: "20",
    distributionPage: settleView.distributionPage,
    ledgerPage: settleView.ledgerPage,
    distributionSearch: settleView.distributionSearch,
    ledgerSearch: settleView.ledgerSearch,
    auditPage: settleView.auditPage,
    auditSearch: settleView.auditSearch,
    auditCategory: settleView.auditCategory,
  });
  const payoutParams = new URLSearchParams({
    page: String(settleView.payoutPage || 1),
    per: "20",
    status: settleView.payoutStatus || "pending",
  });
  const [kpiData, led, payoutData] = await Promise.all([
    api("/api/admin/kpi"),
    api("/api/admin/ledger?" + ledgerParams.toString()),
    api("/api/admin/payout-tickets?" + payoutParams.toString()),
  ]);
  const rawSettlements = led.settlements || [];
  const settlementGroups = new Map();
  for (const settlement of rawSettlements) {
    const key =
      settlement.type === "aiclone" && settlement.aiclone_batch_id
        ? `aiclone:${settlement.aiclone_batch_id}`
        : `booking:${settlement.id}`;
    const current = settlementGroups.get(key);
    if (!current) {
      settlementGroups.set(key, {
        ...settlement,
        koc_names: [settlement.koc_name],
        batch_count: 1,
      });
      continue;
    }
    current.koc_names.push(settlement.koc_name);
    current.batch_count += 1;
    current.aiclone_quote_koc =
      Number(current.aiclone_quote_koc || 0) +
      Number(settlement.aiclone_quote_koc || 0);
    if (Number(settlement.price) > Number(current.price)) {
      current.price = settlement.price;
      current.code = settlement.code;
    }
    if (settlement.status !== "completed") current.status = settlement.status;
    current.updated_at = Math.max(
      Number(current.updated_at || 0),
      Number(settlement.updated_at || 0),
    );
  }
  const list = [...settlementGroups.values()];
  const totalNetviet = Number(led.totals?.netviet || 0);
  const totalKoc = Number(led.totals?.koc || 0);
  const totalEscrow = Number(led.totals?.escrow || 0);
  const platformWalletRevenue = Number(led.totals?.platformWalletRevenue || 0);

  const rows = list
    .map((s) => {
      const isAi = s.type === "aiclone";
      const isCampaign = s.type === "campaign" || String(s.code || '').startsWith('CD-');
      const isKol = s.type === 'kol' || String(s.code||'').startsWith('KOL-');
      const quoteKoc = Number(s.aiclone_quote_koc || 0);
      const prodFee = Number(
        s.aiclone_quote_production || s.aiclone_production_fee || 0,
      );
      const platFee = Number(
        s.aiclone_quote_platform || s.aiclone_platform_fee || 0,
      );
      const addFee = Number(s.aiclone_quote_additional || 0);

      let kocFee = 0;
      if (isCampaign || isKol) {
        kocFee = Number(s.campaign_koc_paid || 0);
      } else if (isAi) {
        kocFee = quoteKoc;
      } else {
        kocFee = Math.max(
          0,
          Number(s.price) - Math.round(Number(s.price) * 0.05),
        );
      }
      const netvietFee = isCampaign || isKol
        ? Number(s.campaign_netviet_paid || 0)
        : Math.max(0, Number(s.price) - kocFee);
      const campaignStatus = {
        funded: 'Đã ký quỹ', coordinating: 'Đang điều phối', assigned: 'Đã phân bổ',
        in_progress: 'Đang giải ngân', completed: 'Đã hoàn tất', cancelled: 'Đã hủy',
      };
      const kolSettlementStatus={funded:'Đã ký quỹ',confirmed:'Đã xác nhận',revision_requested:'Chờ chỉnh sửa',delivered:'Chờ nghiệm thu',approved:'Chờ giải ngân',completed:'Đã hoàn tất',cancelled:'Đã hủy'};
      const kocNames = isCampaign
        ? String(s.koc_name || '').split(' · ').filter(name => name && name !== 'Chưa phân bổ')
        : (s.koc_names || [s.koc_name]).filter(Boolean);
      const kocCount = isCampaign ? kocNames.length : Number(s.batch_count || kocNames.length);

      return `<tr>
      <td><b>${esc(s.code)}</b>${isCampaign?'<span class="chip n" style="margin-left:6px">Chiến dịch lớn</span>':isKol?'<span class="chip r" style="margin-left:6px">KOL / Nghệ sĩ</span>':''}<div class="muted" style="font-size:11px">${esc(s.business_name || "Doanh nghiệp")}</div></td>
      <td>${kocCount>1?`<div class="settlement-koc-group"><b>${kocCount} KOC</b><button class="settlement-koc-detail" data-settlement-kocs="${esc(s.id)}">Xem chi tiết</button></div>`:`<b>${esc(kocNames[0]||'Chưa phân bổ')}</b>`}</td>
      <td class="money" style="font-weight:700">${money(s.price)}${isCampaign||isKol?`<div class="muted" style="font-size:10px">Còn Escrow ${money(s.campaign_remaining||0)}</div>`:''}</td>
      <td class="money" style="color:var(--success);font-weight:700">+${money(kocFee)}</td>
      <td class="money" style="color:var(--primary);font-weight:700">+${money(netvietFee)}<div class="muted" style="font-size:10px">${isCampaign?'Phí điều phối đã ghi nhận':isKol?'Phí dịch vụ KOL đã ghi nhận':'Sản xuất AI + Phí NT'}</div></td>
      <td class="settlement-status">${isCampaign?`<span class="chip ${s.status==='completed'?'g':s.status==='cancelled'?'r':'b'}">${campaignStatus[s.status]||esc(s.status)}</span>`:isKol?`<span class="chip ${s.status==='completed'?'g':s.status==='cancelled'?'r':'b'}">${kolSettlementStatus[s.status]||esc(s.status)}</span>`:s.status === "completed" ? '<span class="chip g">✓ Đã giải ngân</span>' : '<span class="chip b">Đang xử lý</span>'}</td>
      <td class="muted" style="font-size:11px">${fmtDateTime(s.updated_at || s.created_at)}</td>
    </tr>`;
    })
    .join("");

  const payoutTickets = payoutData.tickets || [];
  const payoutRows = payoutTickets.map(t => {
    const isPending = t.status === "pending_review" || t.status === "processing";
    const isPaid = t.status === "settled" || t.status === "paid";
    const statusLabel = isPaid
      ? '<span class="chip g"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Đã chi trả</span>'
      : isPending
      ? '<span class="chip w">⏳ Chờ duyệt (6-24h)</span>'
      : '<span class="chip r">❌ Bị từ chối</span>';

    return `<tr>
      <td><b>#${esc(t.ticket_code)}</b></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          ${avatarUrl(t.koc_avatar, t.koc_name)}
          <div>
            <b>${esc(t.koc_name || "KOC")}</b>
            <div class="muted" style="font-size:11px">${esc(t.koc_phone || t.koc_email || "")}</div>
          </div>
        </div>
      </td>
      <td>
        <div>${bankIdentityHtml(state.config?.payoutBanks, t.bank_name, t.bank_bin)}</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px">
          <span style="font-size:13px;font-weight:600">${esc(t.bank_account || "")}</span>
        </div>
        <div class="muted" style="font-size:11px">${esc(t.bank_owner || "")}</div>
      </td>
      <td>
        <b class="money" style="font-size:15px;color:var(--primary)">${money(t.amount)}</b>
      </td>
      <td>${statusLabel}</td>
      <td class="muted" style="font-size:11px">${fmtDateTime(t.created_at)}</td>
      <td style="white-space:nowrap">
        ${isPending ? `
          <button class="btn primary sm payout-qr-trigger" data-ticket-id="${esc(t.id)}">💳 Quét VietQR</button>
          <button class="btn ghost sm payout-reject-trigger" data-ticket-id="${esc(t.id)}" style="color:var(--error);margin-left:4px">Từ chối</button>
        ` : `
          <button class="btn ghost sm payout-qr-trigger" data-ticket-id="${esc(t.id)}">👁️ Chi tiết</button>
        `}
      </td>
    </tr>`;
  }).join("");

  el.innerHTML = `<div class="between"><div><h1>Đối soát và chi trả</h1>
      <p class="muted">Duyệt chi trả hoa hồng KOC qua VietQR và theo dõi phân bổ tiền booking, doanh thu nền tảng.</p></div>
    <button class="btn primary sm" id="s-run">▶ Chạy đối soát kỳ này</button></div>
    <div class="stat-cards" style="margin:16px 0">
      ${scard("Yêu cầu rút tiền chờ duyệt", `${payoutData.pendingCount || 0} yêu cầu`)}
      ${scard("Doanh thu NetViet đã ghi sổ", money(platformWalletRevenue || totalNetviet))}
      ${scard("Giải ngân về Ví KOC (Phí KOC)", money(totalKoc))}
      ${scard("Tổng khoản đảm bảo đã hoàn tất", money(totalEscrow))}
    </div>
    <div class="settle-tabs" role="tablist" aria-label="Chi tiết đối soát">
      <button class="${settleView.activeTab === "payout" ? "active" : ""}" role="tab" aria-selected="${settleView.activeTab === "payout"}" data-settle-tab="payout">
        💳 Yêu cầu rút tiền KOC ${payoutData.pendingCount > 0 ? `<span class="chip r" style="margin-left:6px;padding:1px 6px;font-size:11px;font-weight:700">${payoutData.pendingCount}</span>` : ""}
      </button>
      <button class="${settleView.activeTab === "distribution" ? "active" : ""}" role="tab" aria-selected="${settleView.activeTab === "distribution"}" data-settle-tab="distribution">🏛️ Phân bổ tiền</button>
      <button class="${settleView.activeTab === "ledger" ? "active" : ""}" role="tab" aria-selected="${settleView.activeTab === "ledger"}" data-settle-tab="ledger">📒 Sổ thu chi</button>
      <button class="${settleView.activeTab === "audit" ? "active" : ""}" role="tab" aria-selected="${settleView.activeTab === "audit"}" data-settle-tab="audit">🕘 Nhật ký hệ thống</button>
    </div>

    <div class="card settle-panel ${settleView.activeTab === "payout" ? "active" : ""}" data-settle-panel="payout" role="tabpanel" ${settleView.activeTab !== "payout" ? "hidden" : ""}>
      <div class="between" style="flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div>
          <h2>💳 Danh sách yêu cầu rút tiền KOC</h2>
          <p class="muted" style="font-size:12px">Kiểm tra thông tin tài khoản và quét mã VietQR để chuyển khoản trực tiếp cho KOC.</p>
        </div>
        <div class="payout-filters" style="display:flex;gap:6px">
          <button class="btn sm ${(!settleView.payoutStatus || settleView.payoutStatus === "pending") ? "primary" : "ghost"}" data-payout-filter="pending">Chờ duyệt ${payoutData.pendingCount > 0 ? `(${payoutData.pendingCount})` : ""}</button>
          <button class="btn sm ${settleView.payoutStatus === "all" ? "primary" : "ghost"}" data-payout-filter="all">Tất cả (${num(payoutData.total || 0)})</button>
          <button class="btn sm ${settleView.payoutStatus === "paid" ? "primary" : "ghost"}" data-payout-filter="paid">Đã chi trả</button>
          <button class="btn sm ${settleView.payoutStatus === "rejected" ? "primary" : "ghost"}" data-payout-filter="rejected">Bị từ chối</button>
        </div>
      </div>
      <div class="table-wrap" style="border:none">
        <table>
          <thead>
            <tr>
              <th>Mã yêu cầu</th>
              <th>KOC</th>
              <th>Tài khoản nhận tiền</th>
              <th>Số tiền</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${payoutRows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Không có yêu cầu rút tiền nào</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="pager" id="payout-pager"></div>
    </div>

    <div class="card settle-panel ${settleView.activeTab === "distribution" ? "active" : ""}" data-settle-panel="distribution" role="tabpanel" ${settleView.activeTab !== "distribution" ? "hidden" : ""}>
      <h2>🏛️ Lịch sử phân bổ tiền</h2>
      ${searchForm("admin-distribution", "Tìm khoản phân bổ", "Mã đơn, doanh nghiệp hoặc người nhận…", settleView.distributionSearch)}
      <div class="table-wrap" style="margin-top:12px;border:none">
        <table><thead><tr><th>Mã đơn &amp; Doanh nghiệp</th><th>KOC nhận tiền</th><th>Tổng khoản đảm bảo</th><th>Tiền vào Ví KOC</th><th>Doanh thu NetViet</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
        ${rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Chưa có đơn hàng đối soát</td></tr>'}
        </tbody></table>
      </div>
      <div class="pager" id="distribution-pager"></div>
    </div>
    <div class="card settle-panel ${settleView.activeTab === "ledger" ? "active" : ""}" data-settle-panel="ledger" role="tabpanel" ${settleView.activeTab !== "ledger" ? "hidden" : ""}><h2>Sổ thu chi toàn hệ thống</h2>
      ${searchForm("admin-ledger", "Tìm giao dịch thu chi", "Loại giao dịch, mã tham chiếu hoặc ghi chú…", settleView.ledgerSearch)}
      <div class="table-wrap" style="margin-top:12px;border:none">
      <table><thead><tr><th>Loại</th><th>Số tiền</th><th>Ghi chú</th><th>Thời gian</th></tr></thead><tbody>
      ${led.ledger.length ? led.ledger.map((l) => `<tr><td>${ledgerKind(l.kind)}</td><td class="money">${money(l.amount)}</td><td>${esc(l.note || "")}</td><td class="muted">${fmtDateTime(l.created_at)}</td></tr>`).join("") : '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Chưa có giao dịch</td></tr>'}
      </tbody></table></div><div class="pager" id="ledger-pager"></div></div>
    <div class="card audit-card settle-panel ${settleView.activeTab === "audit" ? "active" : ""}" data-settle-panel="audit" role="tabpanel" ${settleView.activeTab !== "audit" ? "hidden" : ""}>
      <div class="between audit-heading"><div><h2>Nhật ký hoạt động hệ thống</h2><p class="muted">Theo dõi các thay đổi quan trọng liên quan đến booking, AI Clone, thanh toán và tài khoản.</p></div><span class="chip n">${num(led.pagination?.audit?.total || 0)} hoạt động</span></div>
      <div class="audit-toolbar"><input id="audit-search" value="${esc(settleView.auditSearch)}" placeholder="Tìm hành động, người thực hiện, mã tham chiếu…"><select id="audit-category"><option value="">Tất cả nghiệp vụ</option><option value="booking" ${settleView.auditCategory === "booking" ? "selected" : ""}>Booking</option><option value="aiclone" ${settleView.auditCategory === "aiclone" ? "selected" : ""}>AI Clone</option><option value="payment" ${settleView.auditCategory === "payment" ? "selected" : ""}>Thanh toán & ví</option><option value="account" ${settleView.auditCategory === "account" ? "selected" : ""}>Tài khoản & hồ sơ</option><option value="other" ${settleView.auditCategory === "other" ? "selected" : ""}>Khác</option></select></div>
      <div id="audit-list"></div><div class="pager" id="audit-pager"></div>
    </div>`;

  el.querySelectorAll("[data-payout-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      settle(el, { payoutStatus: btn.dataset.payoutFilter, payoutPage: 1, activeTab: "payout" }).catch(e => toast(e.message, "err"));
    });
  });

  el.querySelectorAll(".payout-qr-trigger").forEach(btn => {
    btn.addEventListener("click", () => {
      const ticket = payoutTickets.find(t => String(t.id) === btn.dataset.ticketId);
      if (ticket) payoutQrModal(ticket, () => settle(el));
    });
  });

  el.querySelectorAll(".payout-reject-trigger").forEach(btn => {
    btn.addEventListener("click", async () => {
      const ticket = payoutTickets.find(t => String(t.id) === btn.dataset.ticketId);
      if (!ticket) return;
      const reason = await promptDialog("Lý do từ chối yêu cầu rút tiền:", "Thông tin tài khoản không hợp lệ");
      if (!reason) return;
      try {
        await post("/api/admin/payout-tickets/reject", { id: ticket.id, reason });
        toast("Đã từ chối yêu cầu và hoàn lại tiền vào ví KOC!", "ok");
        settle(el);
      } catch (err) {
        toast(err.message || "Không thể từ chối yêu cầu", "err");
      }
    });
  });

  bindServerPager(
    el,
    "#payout-pager",
    { page: payoutData.page, total: payoutData.total, per: payoutData.per },
    (page) => settle(el, { payoutPage: page, activeTab: "payout" }),
  );

  bindSearchForm(el, "admin-distribution", distributionSearch => {
    settle(el, { distributionSearch, distributionPage: 1, activeTab: "distribution" }).catch(error => toast(error.message, "err"));
  });
  bindSearchForm(el, "admin-ledger", ledgerSearch => {
    settle(el, { ledgerSearch, ledgerPage: 1, activeTab: "ledger" }).catch(error => toast(error.message, "err"));
  });
  el.querySelectorAll('[data-settlement-kocs]').forEach(button=>button.addEventListener('click',()=>{
    const settlement=list.find(item=>String(item.id)===button.dataset.settlementKocs);
    if(!settlement)return;
    const campaign=settlement.type==='campaign'||String(settlement.code||'').startsWith('CD-');
    const names=campaign?String(settlement.koc_name||'').split(' · ').filter(name=>name&&name!=='Chưa phân bổ'):(settlement.koc_names||[settlement.koc_name]).filter(Boolean);
    const m=modal(`<div class="between"><div><h2>Danh sách KOC</h2><p class="muted" style="margin-top:4px">${esc(settlement.code)} · ${esc(settlement.business_name||'Doanh nghiệp')}</p></div><span class="chip n">${names.length} KOC</span></div><div class="settlement-koc-detail-list">${names.map((name,index)=>`<div><span>${index+1}</span><b>${esc(name)}</b></div>`).join('')}</div><button class="btn ghost" id="settlement-koc-close" style="margin-top:14px">Đóng</button>`);
    m.querySelector('#settlement-koc-close').addEventListener('click',closeModal);
  }));
  bindServerPager(
    el,
    "#distribution-pager",
    led.pagination?.distribution,
    (page) => settle(el, { distributionPage: page, activeTab: "distribution" }),
  );
  bindServerPager(el, "#ledger-pager", led.pagination?.ledger, (page) =>
    settle(el, { ledgerPage: page, activeTab: "ledger" }),
  );
  initAuditLog(el, led.audit || [], led.pagination?.audit);
  el.querySelectorAll("[data-settle-tab]").forEach((tab) =>
    tab.addEventListener("click", () => {
      settleView.activeTab = tab.dataset.settleTab;
      el.querySelectorAll("[data-settle-tab]").forEach((item) => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
      });
      el.querySelectorAll("[data-settle-panel]").forEach((panel) => {
        const active = panel.dataset.settlePanel === tab.dataset.settleTab;
        panel.classList.toggle("active", active);
        panel.hidden = !active;
      });
    }),
  );
  document.getElementById("s-run").addEventListener("click", async () => {
    const r = await post("/api/admin/settle", {});
    toast(
      `Đối soát: ${r.count} khoản ví (${money(r.total)}) · ${r.affOrders} đơn tiếp thị liên kết · Phí nền tảng 1% ${money(r.platformFee)}`,
      "ok",
    );
    settle(el);
  });
}

const AUDIT_LABELS = {
  "booking.complete": ["Hoàn tất booking", "booking"],
  "booking.create": ["Tạo booking", "booking"],
  "booking.delete": ["Xóa booking", "booking"],
  "aiclone.booking_create": ["Tạo booking AI Clone", "aiclone"],
  "aiclone.video_approve": ["Duyệt video AI Clone", "aiclone"],
  "aiclone.deliver": ["Giao video AI Clone", "aiclone"],
  "aiclone.script_approved": ["Duyệt kịch bản", "aiclone"],
  "aiclone.quote_sent": ["Gửi báo giá AI Clone", "aiclone"],
  "aiclone.quote_accepted": ["Chấp nhận báo giá", "aiclone"],
  "payment.paid": ["Xác nhận thanh toán", "payment"],
  "payment.checkout_created": ["Tạo yêu cầu thanh toán", "payment"],
  "settle.run": ["Chạy đối soát", "payment"],
  "wallet.deposit.demo": ["Nạp tiền vào ví", "payment"],
  "business.profile_update": ["Cập nhật hồ sơ doanh nghiệp", "account"],
  "koc.profile_update": ["Cập nhật hồ sơ KOC", "account"],
  "business.lock": ["Khóa doanh nghiệp", "account"],
  "business.unlock": ["Mở khóa doanh nghiệp", "account"],
  "business.reject": ["Từ chối doanh nghiệp", "account"],
};

function auditMeta(action) {
  if (AUDIT_LABELS[action]) return AUDIT_LABELS[action];
  const prefix = String(action || "").split(".")[0];
  const category = ["booking"].includes(prefix)
    ? "booking"
    : prefix === "aiclone"
      ? "aiclone"
      : ["payment", "wallet", "settle", "affiliate_order"].includes(prefix)
        ? "payment"
        : ["business", "koc", "account"].includes(prefix)
          ? "account"
          : "other";
  return [String(action || "system.event").replaceAll("_", " "), category];
}

function auditActor(entry) {
  if (entry.actor_name)
    return { name: entry.actor_name, role: entry.actor_role || "Người dùng" };
  if (entry.actor === "payos")
    return { name: "PayOS", role: "Cổng thanh toán" };
  if (entry.actor === "system") return { name: "Hệ thống", role: "Tự động" };
  if (entry.actor === "guest")
    return { name: "Khách truy cập", role: "Công khai" };
  return { name: "Tài khoản hệ thống", role: "Không xác định" };
}

function bindServerPager(el, selector, meta, onPage) {
  const pager = el.querySelector(selector);
  if (!pager || !meta || meta.pages <= 1) {
    if (pager) pager.innerHTML = "";
    return;
  }
  pager.innerHTML = `<button data-server-page="${meta.page - 1}" ${meta.page <= 1 ? "disabled" : ""}>‹</button><span class="muted" style="padding:7px 6px">${meta.page} / ${meta.pages}</span><button data-server-page="${meta.page + 1}" ${meta.page >= meta.pages ? "disabled" : ""}>›</button>`;
  pager
    .querySelectorAll("[data-server-page]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        onPage(Number(button.dataset.serverPage)),
      ),
    );
}

function initAuditLog(el, entries, meta) {
  const search = el.querySelector("#audit-search");
  const category = el.querySelector("#audit-category");
  const list = el.querySelector("#audit-list");
  list.innerHTML = entries.length
    ? `<div class="audit-list">${entries
        .map((entry) => {
          const [label, group] = auditMeta(entry.action);
          const actor = auditActor(entry);
          return `<article class="audit-item"><span class="audit-dot ${group}"></span><div class="audit-main"><div class="audit-title"><strong>${esc(label)}</strong><code>${esc(entry.action)}</code></div><div class="audit-detail">${entry.detail ? esc(entry.detail) : "Không có thông tin bổ sung"}</div></div><div class="audit-actor"><strong>${esc(actor.name)}</strong><span>${esc(actor.role)}</span></div><div class="audit-ref" title="${esc(entry.ref || "")}"><span>Tham chiếu</span><code>${esc((entry.ref || "—").slice(0, 14))}${entry.ref?.length > 14 ? "…" : ""}</code></div><time>${fmtDateTime(entry.created_at)}</time></article>`;
        })
        .join("")}</div>`
    : empty("🔎", "Không tìm thấy hoạt động phù hợp");
  bindServerPager(el, "#audit-pager", meta, (page) =>
    settle(el, { auditPage: page, activeTab: "audit" }),
  );
  const applyFilter = () =>
    settle(el, {
      auditPage: 1,
      auditSearch: search.value.trim(),
      auditCategory: category.value,
      activeTab: "audit",
    });
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") applyFilter();
  });
  category.addEventListener("change", applyFilter);
}

function ledgerKind(k) {
  const map = {
    service_fee: ["Phí dịch vụ 5%", "g"],
    platform_fee: ["Phí nền tảng 1%", "b"],
    affiliate_settle: ["Đối soát hoa hồng", "w"],
  };
  const [lbl, cls] = map[k] || [k, "n"];
  return `<span class="chip ${cls}">${esc(lbl)}</span>`;
}
function scard(l, v) {
  return `<div class="card"><div class="muted">${l}</div><div style="font-size:22px;font-weight:800;margin-top:4px" class="money">${v}</div></div>`;
}

let affiliateFilters = { search: "", status: "", platform: "", flagged: "", page: 1 };
async function affiliateAdmin(el) {
  const r = await api("/api/admin/affiliate?" + new URLSearchParams({ ...affiliateFilters, per: "20" }));
  affiliateFilters.page = r.page || 1;
  const t = r.totals;
  el.innerHTML = `<h1>Đơn tiếp thị liên kết</h1>
    <p class="muted">Tra cứu đơn trên sàn, đối chiếu doanh số và xử lý hoàn đơn.</p>
    <div class="stat-cards" style="margin:16px 0">
      ${scard("Tổng doanh số", money(t.g))}${scard("Hoa hồng KOC", money(t.c))}${scard("Phí nền tảng 1%", money(t.f))}${scard("Đơn cần kiểm tra", num(t.flagged))}
    </div>
    <div class="affiliate-admin-controls">
      ${searchForm("admin-affiliate", "Tìm đơn tiếp thị liên kết", "Mã đơn, mã booking hoặc tên KOC…", affiliateFilters.search)}
      <div class="filters affiliate-admin-filters">
        <div class="field"><label for="af-status">Trạng thái đơn</label><select id="af-status"><option value="">Tất cả trạng thái</option>${[["pending", "Chờ xác nhận"], ["confirmed", "Đã xác nhận"], ["settled", "Đã đối soát"], ["refunded", "Đã hoàn"], ["cancelled", "Đã hủy"]].map(([value, label]) => `<option value="${value}" ${affiliateFilters.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="field"><label for="af-platform">Sàn</label><select id="af-platform"><option value="">Tất cả sàn</option>${[...new Set([...(r.platforms || []), affiliateFilters.platform].filter(Boolean))].map(value => `<option value="${esc(value)}" ${affiliateFilters.platform === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></div>
        <div class="field"><label for="af-flagged">Đối chiếu</label><select id="af-flagged"><option value="">Tất cả đơn</option><option value="1" ${affiliateFilters.flagged === "1" ? "selected" : ""}>Đơn cần kiểm tra</option></select></div>
      </div>
    </div>
    <p class="list-search-summary" role="status">${num(r.total ?? r.orders.length)} đơn phù hợp</p>
    <div class="table-wrap"><table class="affiliate-admin-table"><thead><tr><th>Đơn trên sàn</th><th>KOC / Booking</th><th>Thời gian</th><th>Doanh số</th><th>Hoa hồng / Phí</th><th>Trạng thái / Xử lý</th></tr></thead><tbody>
      ${
        r.orders.length
          ? r.orders
              .map(
                (o) => `<tr>
        <td><strong>${esc(o.platform_order_id)}</strong><small class="muted">${esc(o.platform || "—")}</small>${Number(o.flagged) === 1 ? '<span class="chip r">Cần kiểm tra</span>' : ""}</td>
        <td><strong>${esc(o.kocname)}</strong><small class="muted">${esc(o.bcode)}</small></td>
        <td class="muted affiliate-admin-date">${fmtDateTime(o.ordered_at || o.created_at)}</td>
        <td class="money">${money(o.gmv)}</td><td><strong class="money">${money(o.commission_amount)}</strong><small class="muted">Phí 1%: ${money(o.platform_fee)}</small></td>
        <td><div class="affiliate-admin-actions">${statusChip(o.status)}${["pending", "confirmed"].includes(o.status) ? `<button class="btn ghost sm" data-refund="${o.id}">Hoàn đơn</button>` : ""}</div></td></tr>`,
              )
              .join("")
          : '<tr><td colspan="6" class="list-search-empty">Không tìm thấy đơn phù hợp. Thử từ khóa khác hoặc đổi bộ lọc.</td></tr>'
      }
    </tbody></table></div>
    ${pagerHtml(r.page, r.pages)}
    <p class="hint" style="margin-top:10px">Mỗi đơn được đối chiếu với mã gốc từ sàn. Hệ thống tự đánh dấu hoạt động bất thường để quản trị viên kiểm tra.</p>`;
  bindSearchForm(el, "admin-affiliate", search => {
    affiliateFilters.search = search;
    affiliateFilters.page = 1;
    affiliateAdmin(el).catch(error => toast(error.message, "err"));
  });
  for (const key of ["status", "platform", "flagged"]) {
    el.querySelector(`#af-${key}`).addEventListener("change", event => {
      affiliateFilters[key] = event.target.value;
      affiliateFilters.search = el.querySelector("#search-admin-affiliate").value.trim();
      affiliateFilters.page = 1;
      affiliateAdmin(el).catch(error => toast(error.message, "err"));
    });
  }
  el.querySelectorAll("[data-pg]").forEach(button => button.addEventListener("click", () => {
    affiliateFilters.page = Number(button.dataset.pg);
    affiliateAdmin(el).catch(error => toast(error.message, "err"));
  }));
  el.querySelectorAll("[data-refund]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (
        !(await confirmDialog(
          "Xử lý hoàn đơn này? Doanh số & hoa hồng sẽ bị trừ ngược.",
        ))
      )
        return;
      try {
        await post("/api/affiliate/order-status", {
          orderId: b.dataset.refund,
          to: "refunded",
        });
        toast("Đã xử lý hoàn · trừ ngược doanh số", "ok");
        affiliateAdmin(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
}

let adminKolPage=1;
let adminKolSearch = "";
async function kolAdmin(el,page=adminKolPage) {
  adminKolPage=Math.max(1,Number(page)||1);
  const r = await api(`/api/kol/requests?page=${adminKolPage}&per=10&search=${encodeURIComponent(adminKolSearch)}`);
  adminKolPage=r.page||1;
  const prefillBanner = state.kolPrefill
    ? `<div class="tint-box" style="margin-bottom:16px;border-left:4px solid var(--primary);padding:14px">
        <div class="between">
          <div>
            <b>💡 Thông tin từ khách cần tư vấn: ${esc(state.kolPrefill.name)}</b>
            <div style="font-size:13px;margin-top:4px">Liên hệ: ${esc(state.kolPrefill.contact)} ${state.kolPrefill.company ? `(${esc(state.kolPrefill.company)})` : ""}</div>
            <div class="muted" style="font-size:12px;margin-top:2px">Nội dung tư vấn: ${esc(state.kolPrefill.note || state.kolPrefill.need)}</div>
          </div>
          <button class="btn ghost sm" id="kol-clear-prefill">Đóng</button>
        </div>
        <p class="hint" style="margin-top:8px">Thông tin khách hàng đã được điền sẵn. Quản trị viên xem xét và trao đổi để chốt báo giá hoặc phân bổ KOL khi cần.</p>
      </div>`
    : "";
  el.innerHTML = `<h1 class="icon-heading">${icon("kolRequest", "teaser-icon")} Yêu cầu KOL / Nghệ sĩ</h1><p class="muted" style="margin-bottom:16px">Duyệt / báo giá / từ chối. Phân khúc cao cấp có duyệt riêng.</p>
    ${prefillBanner}
    ${searchForm("admin-kol", "Tìm yêu cầu KOL", "Tên KOL, doanh nghiệp hoặc lĩnh vực…", adminKolSearch)}
    <div class="table-wrap"><table><thead><tr><th>KOL</th><th>Thời gian</th><th>Lĩnh vực</th><th>DN</th><th>Ngân sách</th><th>Báo giá</th><th>TT</th><th>Ghi chú</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${
      r.requests.length
        ? r.requests
            .map(
              (
                q,
              ) => `<tr><td>${esc(q.kolname)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDateTime(q.created_at)}</td><td>${esc(q.field)}</td><td>${esc(q.bizname)}</td>
      <td class="money">${money(q.budget)}</td><td>${q.quote?`<b class="money">${money(q.total_amount||q.quote)}</b><div class="muted" style="font-size:10px">KOL ${money(q.quote_kol||q.quote)} · NetViet ${money(q.quote_platform||0)}</div>`:'—'}</td><td>${statusChip(q.status)}</td>
      <td class="muted" style="max-width:200px">${esc(q.admin_note || "—")}</td>
      <td style="width:1%;white-space:nowrap;text-align:right"><div class="row" style="flex-wrap:wrap">${['pending','quoted'].includes(q.status)?`<button class="btn primary sm" data-quote="${q.id}">${q.status==='quoted'?'Sửa báo giá':'Báo giá'}</button> <button class="btn danger sm" data-reject="${q.id}">Từ chối</button>`:''}${q.status==='funded'?`<button class="btn ok sm" data-confirm-kol="${q.id}">Xác nhận lịch & hợp đồng</button>`:''}${['confirmed','revision_requested'].includes(q.status)?`<button class="btn primary sm" data-deliver-kol="${q.id}">Bàn giao sản phẩm</button>`:''}${q.status==='approved'?`<button class="btn ok sm" data-settle-kol="${q.id}">Giải ngân</button>`:''}${['funded','confirmed','revision_requested','delivered','approved'].includes(q.status)?`<button class="btn danger sm" data-cancel-kol="${q.id}">Hủy & hoàn tiền</button>`:''}</div></td></tr>`,
            )
            .join("")
          : '<tr><td colspan="9" class="list-search-empty">Không tìm thấy yêu cầu KOL phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.</td></tr>'
    }
    </tbody></table></div><div class="pager" id="admin-kol-pager"></div>`;
  if(r.pages>1){const pager=el.querySelector('#admin-kol-pager');pager.innerHTML=`<button data-admin-kol-page="${r.page-1}" ${r.page<=1?'disabled':''}>‹</button><span class="muted">${r.page} / ${r.pages}</span><button data-admin-kol-page="${r.page+1}" ${r.page>=r.pages?'disabled':''}>›</button>`;pager.querySelectorAll('[data-admin-kol-page]').forEach(b=>b.addEventListener('click',()=>kolAdmin(el,Number(b.dataset.adminKolPage))))}
  bindSearchForm(el, "admin-kol", search => {
    adminKolSearch = search;
    kolAdmin(el, 1).catch(error => toast(error.message, "err"));
  });
  if (state.kolPrefill) {
    document
      .getElementById("kol-clear-prefill")
      ?.addEventListener("click", () => {
        state.kolPrefill = null;
        kolAdmin(el);
      });
  }
  el.querySelectorAll("[data-quote]").forEach((b) =>
    b.addEventListener("click", () => {
      const request=r.requests.find(item=>item.id===b.dataset.quote);
      const m =
        modal(`<h2>Báo giá KOL</h2><div class="field" style="margin-top:12px"><label class="required-label">Thù lao KOL (đ)</label><input id="kq-kol" type="number" min="1" step="1000" value="${Number(request?.quote_kol||0)||''}"></div><div class="field"><label>Phí dịch vụ NetViet (đ)</label><input id="kq-platform" type="number" min="0" step="1000" value="${Number(request?.quote_platform||0)}"></div><div class="field"><label>Chi phí bổ sung (đ)</label><input id="kq-additional" type="number" min="0" step="1000" value="${Number(request?.quote_additional||0)}"></div>
      <div class="field"><label>Ghi chú</label><textarea id="kq-note" rows="2">${esc(request?.admin_note||'')}</textarea></div>
      <button class="btn primary" id="kq-go">Gửi báo giá</button><button class="btn ghost" id="kq-x" style="margin-top:8px">Hủy</button>`);
      m.querySelector("#kq-x").addEventListener("click", closeModal);
      m.querySelector("#kq-go").addEventListener("click", async () => {
        try {
          await post("/api/admin/kol-action", {
            id: b.dataset.quote,
            action: "quote",
            kolAmount: Number(m.querySelector("#kq-kol").value),
            platformFee: Number(m.querySelector("#kq-platform").value),
            additionalFee: Number(m.querySelector("#kq-additional").value),
            note: m.querySelector("#kq-note").value,
          });
          toast("Đã gửi báo giá", "ok");
          closeModal();
          kolAdmin(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
  el.querySelectorAll('[data-confirm-kol]').forEach(b=>b.addEventListener('click',async()=>{const contractReference=await promptDialog('Nhập mã hợp đồng hoặc nội dung xác nhận lịch:');if(!contractReference)return;try{await post('/api/admin/kol-action',{id:b.dataset.confirmKol,action:'confirm',contractReference});toast('Đã xác nhận lịch và hợp đồng KOL','ok');kolAdmin(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-deliver-kol]').forEach(b=>b.addEventListener('click',()=>{const m=modal(`<h2>Bàn giao sản phẩm KOL</h2><div class="field"><label class="required-label">Link sản phẩm / biên bản bàn giao</label><input id="kd-url" placeholder="https://..."></div><div class="field"><label>Ghi chú</label><textarea id="kd-note" rows="3"></textarea></div><button class="btn primary" id="kd-go">Gửi doanh nghiệp nghiệm thu</button><button class="btn ghost" id="kd-close" style="margin-top:8px">Đóng</button>`);m.querySelector('#kd-close').addEventListener('click',closeModal);m.querySelector('#kd-go').addEventListener('click',async()=>{try{await post('/api/admin/kol-action',{id:b.dataset.deliverKol,action:'deliver',deliveryUrl:m.querySelector('#kd-url').value.trim(),note:m.querySelector('#kd-note').value.trim()});toast('Đã bàn giao sản phẩm KOL','ok');closeModal();kolAdmin(el)}catch(e){toast(e.message,'err')}})}));
  el.querySelectorAll('[data-settle-kol]').forEach(b=>b.addEventListener('click',async()=>{if(!(await confirmDialog('Giải ngân thù lao vào Ví KOL và ghi nhận phí NetViet?')))return;try{await post('/api/admin/kol-action',{id:b.dataset.settleKol,action:'settle'});toast('Đã giải ngân yêu cầu KOL','ok');kolAdmin(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-cancel-kol]').forEach(b=>b.addEventListener('click',async()=>{const note=await promptDialog('Lý do hủy và hoàn tiền:');if(!note)return;try{await post('/api/admin/kol-action',{id:b.dataset.cancelKol,action:'cancel',note});toast('Đã hủy và hoàn tiền doanh nghiệp','ok');kolAdmin(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", async () => {
      const m = modal(`<h2>Từ chối yêu cầu KOL</h2>
      <p class="muted" style="margin:8px 0 12px">Lý do sẽ được hiển thị cho doanh nghiệp đã gửi yêu cầu.</p>
      <div class="field"><label class="required-label">Lý do từ chối</label><textarea id="kr-reason" rows="4" maxlength="500" placeholder="Nhập lý do cụ thể…"></textarea></div>
      <button class="btn danger" id="kr-reject-go">Xác nhận từ chối</button>
      <button class="btn ghost" id="kr-reject-cancel" style="margin-top:8px">Hủy</button>`);
      m.querySelector("#kr-reject-cancel").addEventListener(
        "click",
        closeModal,
      );
      m.querySelector("#kr-reject-go").addEventListener("click", async () => {
        const note = m.querySelector("#kr-reason").value.trim();
        if (!note) return toast("Vui lòng nhập lý do từ chối", "err");
        try {
          await post("/api/admin/kol-action", {
            id: b.dataset.reject,
            action: "reject",
            note,
          });
          toast("Đã từ chối yêu cầu KOL", "ok");
          closeModal();
          kolAdmin(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
}

let leadStatusFilter = "";
let leadSearch = "";
let leadPage = 1;
const LEAD_NEEDS = [
  "Tư vấn booking marketplace",
  "Tư vấn chiến dịch lớn",
  "Tìm hiểu AI Clone",
  "Hỗ trợ kỹ thuật khác",
];

const LEAD_STATUSES = [
  ["new", "Khách mới"],
  ["contacting", "Đang liên hệ"],
  ["advised", "Đã tư vấn"],
  ["converted", "Chuyển đổi thành công"],
  ["no_need", "Không có nhu cầu"],
];

function leadNeedLabel(need) {
  return (
    {
      "Tư vấn booking marketplace": "Tư vấn chọn và đặt KOC",
      "Tư vấn chiến dịch lớn": "Tư vấn chiến dịch lớn",
      "Tìm hiểu AI Clone": "Tìm hiểu dịch vụ video đại diện",
      "Hỗ trợ kỹ thuật khác": "Cần hỗ trợ khác",
    }[need] || need
  );
}

function leadStatusChip(status) {
  const found = LEAD_STATUSES.find(([value]) => value === status);
  const cls =
    {
      new: "w",
      contacting: "b",
      advised: "b",
      converted: "g",
      no_need: "r",
      assigned: "b",
      contacted: "b",
      following_up: "w",
      qualified: "g",
      won: "g",
      lost: "r",
    }[status] || "n";
  const label = found
    ? found[1]
    : {
        assigned: "Đã phân công",
        contacted: "Đã liên hệ",
        following_up: "Đang chăm sóc",
        qualified: "Đủ điều kiện",
        won: "Đã chốt",
        lost: "Không thành công",
      }[status] || status;
  return `<span class="chip ${cls}">${esc(label)}</span>`;
}

function validateLeadStatusTransition(currentStatus, targetStatus) {
  if (!currentStatus || currentStatus === targetStatus) return true;
  if (targetStatus === "no_need") return true;
  if (["converted", "won"].includes(currentStatus)) return true;

  if (currentStatus === "new" && targetStatus !== "contacting") {
    return "Không thể chuyển trực tiếp từ Khách mới sang trạng thái này. Vui lòng chuyển sang 'Đang liên hệ' trước.";
  }
  if (currentStatus === "contacting" && targetStatus === "converted") {
    return "Vui lòng chuyển sang 'Đã tư vấn' trước khi đánh dấu 'Chuyển đổi thành công'.";
  }
  return true;
}

async function leadsAdmin(el) {
  const qs = "?" + new URLSearchParams({ search: leadSearch, status: leadStatusFilter, page: String(leadPage), per: "10" });
  const r = await api("/api/admin/leads" + qs);
  leadPage = r.page || 1;
  el.innerHTML = `<div class="between" style="align-items:flex-start;gap:16px;margin-bottom:16px;flex-wrap:wrap">
    <div>
      <h1 class="icon-heading" style="margin:0;white-space:nowrap">${icon("quoteLead", "teaser-icon")} Quản lý khách cần tư vấn</h1>
      <p class="muted" style="margin-top:4px;font-size:13px">Tiếp nhận và theo dõi các lượt liên hệ/tư vấn từ website công khai — không phải nơi tạo booking hay báo giá.</p>
    </div>
    <div style="min-width:200px">
      <label for="lead-filter">Trạng thái tư vấn</label><select id="lead-filter" style="width:100%;max-width:220px;padding:8px 12px;border-radius:8px;font-size:14px"><option value="">Tất cả trạng thái</option>${LEAD_STATUSES.map(([v, l]) => `<option value="${v}" ${leadStatusFilter === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    </div>
  </div>
    ${searchForm("admin-leads", "Tìm khách cần tư vấn", "Tên, công ty, điện thoại hoặc email…", leadSearch)}
    <p class="list-search-summary" role="status">${num(r.total ?? r.leads.length)} khách hàng phù hợp</p>
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Khách hàng</th><th>Thời gian</th><th>Liên hệ</th><th>Nhu cầu</th><th>Nguồn</th><th>Trạng thái</th><th>Tiến độ gần nhất</th><th></th></tr></thead><tbody>
    ${
      r.leads.length
        ? r.leads
            .map((l) => {
              const hasValidNeed = LEAD_NEEDS.includes(l.need);
              const needDisplay = hasValidNeed
                ? `<span class="chip b">${esc(leadNeedLabel(l.need))}</span>`
                : `<span class="chip r">⚠ Thiếu nhu cầu</span>`;
              return `<tr>
      <td><b>${esc(l.name)}</b><div class="muted" style="font-size:11px">${esc(l.company || "Cá nhân")}</div></td>
      <td class="muted" style="font-size:12px;white-space:nowrap">${fmtDateTime(l.created_at)}</td>
      <td><div>${esc(l.phone)}</div><div class="muted" style="font-size:11px">${esc(l.email || "—")}</div></td>
      <td>${needDisplay}</td><td><span class="chip n">${esc(l.source)}</span></td>
      <td>${leadStatusChip(l.status)}</td>
      <td class="muted" style="max-width:190px">${esc(l.latest_note || "Chưa có cập nhật")}<div style="font-size:10px;margin-top:3px">${fmtDateTime(l.updated_at || l.created_at)}</div></td>
      <td><button class="btn primary sm" data-lead-progress="${l.id}">Theo dõi</button></td></tr>`;
            })
            .join("")
        : '<tr><td colspan="8" class="muted" style="text-align:center;padding:20px">Chưa có khách hàng phù hợp</td></tr>'
    }
    </tbody></table></div>`;
  el.insertAdjacentHTML("beforeend", pagerHtml(r.page, r.pages));
  bindSearchForm(el, "admin-leads", search => {
    leadSearch = search;
    leadPage = 1;
    leadsAdmin(el).catch(error => toast(error.message, "err"));
  });
  el.querySelectorAll("[data-pg]").forEach(button => button.addEventListener("click", () => {
    leadPage = Number(button.dataset.pg);
    leadsAdmin(el).catch(error => toast(error.message, "err"));
  }));
  document.getElementById("lead-filter").addEventListener("change", (e) => {
    leadStatusFilter = e.target.value;
    leadSearch = el.querySelector("#search-admin-leads").value.trim();
    leadPage = 1;
    leadsAdmin(el);
  });
  el.querySelectorAll("[data-lead-progress]").forEach((b) =>
    b.addEventListener("click", () =>
      leadProgressModal(
        b.dataset.leadProgress,
        r.leads.find((l) => l.id === b.dataset.leadProgress),
        el,
      ),
    ),
  );
}
async function leadProgressModal(id, lead, el) {
  const history = await api(
    "/api/admin/lead-activities?lead_id=" + encodeURIComponent(id),
  );
  const m = modal(`<h2>Theo dõi khách hàng · ${esc(lead.name)}</h2>
    <div class="field" style="margin-top:12px"><label class="required-label">Trạng thái</label><select id="lp-status">${LEAD_STATUSES.map(([v, l]) => `<option value="${v}" ${lead.status === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label class="required-label">Nhu cầu tư vấn</label><select id="lp-need">${LEAD_NEEDS.map((n) => `<option value="${esc(n)}" ${lead.need === n ? "selected" : ""}>${esc(leadNeedLabel(n))}</option>`).join("")}</select></div>
    <div id="lp-branch-box"></div>
    <div class="field" style="margin-top:10px"><label class="required-label">Ghi chú tiến độ</label><textarea id="lp-note" rows="3" maxlength="1000" placeholder="VD: Đã gọi điện tư vấn nhu cầu, giải đáp thắc mắc cho khách hàng…"></textarea></div>
    <button class="btn primary" id="lp-save">Lưu cập nhật</button><button class="btn ghost" id="lp-close" style="margin-top:8px">Đóng</button>
    <h3 style="margin-top:18px">Lịch sử chăm sóc</h3>
    <div style="max-height:240px;overflow:auto;margin-top:8px">${
      history.activities.length
        ? history.activities
            .map(
              (a) => `<div class="tint-box" style="margin-bottom:8px">
      <div class="between">${leadStatusChip(a.status)}<span class="muted" style="font-size:11px">${fmtDateTime(a.created_at)}</span></div>
      <div style="margin-top:6px">${esc(a.note || "—")}</div><div class="muted" style="font-size:11px">${esc(a.actor_name || "Admin")}</div>
    </div>`,
            )
            .join("")
        : '<p class="muted">Chưa có lịch sử chăm sóc.</p>'
    }</div>`);

  const updateBranchBox = () => {
    const status = m.querySelector("#lp-status").value;
    const need = m.querySelector("#lp-need").value;
    const box = m.querySelector("#lp-branch-box");

    if (status !== "converted" && status !== "won") {
      box.innerHTML = "";
      return;
    }

    if (need === "Tư vấn booking marketplace") {
      box.innerHTML = `<div class="tint-box" style="margin-top:10px;border-left:3px solid var(--primary)">
        <b>🛒 Tư vấn đặt KOC</b>
        <div style="font-size:13px;margin-top:4px">Khách hàng có thể tự chọn và đặt KOC tại trang khám phá. Hệ thống sẽ lưu lại lịch sử tư vấn.</div>
      </div>`;
    } else if (need === "Tư vấn chiến dịch lớn") {
      box.innerHTML = `<div class="tint-box" style="margin-top:10px;border-left:3px solid #B91C1C">
        <b>📣 Tư vấn chiến dịch lớn</b>
        <div style="font-size:13px;margin-top:4px">Đã có thể điều hướng thông tin sang màn Yêu cầu KOL để tạo đợt chiến dịch mới.</div>
        <button class="btn primary sm" id="lp-to-kol" style="margin-top:8px;width:100%;background:#B91C1C;color:#fff">Chuyển sang Yêu cầu KOL</button>
      </div>`;
      box.querySelector("#lp-to-kol")?.addEventListener("click", () => {
        state.kolPrefill = {
          name: lead.name,
          contact: lead.phone || lead.email || "—",
          company: lead.company || "",
          need: need,
          note:
            m.querySelector("#lp-note").value.trim() ||
            lead.need ||
            "Tư vấn chiến dịch lớn",
        };
        closeModal();
        window.location.hash = "#/kol";
      });
    } else if (need === "Tìm hiểu AI Clone") {
      box.innerHTML = `<div class="tint-box" style="margin-top:10px;border-left:3px solid #2563EB">
        <span class="chip b">✓ Đã ghi nhận cho đội AI Clone</span>
        <div class="muted" style="font-size:12px;margin-top:4px">Booking AI Clone chỉ được khởi tạo từ màn "AI Clone Avatar" theo đúng quy trình Module 8.</div>
      </div>`;
    } else if (need === "Hỗ trợ kỹ thuật khác") {
      box.innerHTML = `<div class="tint-box" style="margin-top:10px;border-left:3px solid #059669">
        <b>🛠️ Hỗ trợ kỹ thuật khác</b>
        <div style="font-size:13px;margin-top:4px">Xử lý như ticket thông thường, đã hỗ trợ xong sự cố kỹ thuật cho khách hàng.</div>
      </div>`;
    } else {
      box.innerHTML = "";
    }
  };

  m.querySelector("#lp-status").addEventListener("change", updateBranchBox);
  m.querySelector("#lp-need").addEventListener("change", updateBranchBox);
  updateBranchBox();

  m.querySelector("#lp-close").addEventListener("click", closeModal);
  m.querySelector("#lp-save").addEventListener("click", async () => {
    const need = m.querySelector("#lp-need").value,
      status = m.querySelector("#lp-status").value,
      note = m.querySelector("#lp-note").value.trim();
    if (!need || !LEAD_NEEDS.includes(need))
      return toast("Vui lòng chọn Nhu cầu tư vấn hợp lệ", "err");

    const transitionCheck = validateLeadStatusTransition(lead.status, status);
    if (transitionCheck !== true) return toast(transitionCheck, "err");

    if (!note) return toast("Vui lòng nhập ghi chú tiến độ", "err");
    try {
      await post("/api/admin/lead-update", {
        id,
        need,
        status,
        note,
      });
      toast("Đã cập nhật tiến độ khách hàng", "ok");
      closeModal();
      leadsAdmin(el);
    } catch (e) {
      toast(e.message, "err");
    }
  });
}

async function aiclone(el) {
  const r = await api("/api/admin/aiclone");
  const quoteGroups = new Map();
  for (const item of r.list) {
    if (!item.booking_id || !item.aiclone_batch_id) continue;
    if (!quoteGroups.has(item.aiclone_batch_id))
      quoteGroups.set(item.aiclone_batch_id, []);
    quoteGroups.get(item.aiclone_batch_id).push(item);
  }
  const quoteRepresentatives = new Map();
  for (const [batchId, items] of quoteGroups) {
    quoteRepresentatives.set(
      batchId,
      items.find(
        (item) =>
          !["quote_grouped", "payment_grouped"].includes(item.booking_status),
      ) || items[0],
    );
  }
  const displayList = r.list.filter((item) => {
    if (!item.booking_id || !item.aiclone_batch_id) return true;
    if (quoteRepresentatives.get(item.aiclone_batch_id) !== item) return false;
    item.quote_kocs = quoteGroups.get(item.aiclone_batch_id) || [item];
    return true;
  });
  el.innerHTML = `<h1 class="icon-heading">${icon("aiClone", "teaser-icon")} AI Clone Avatar — Trung tâm sản xuất</h1><p class="muted" style="margin-bottom:16px">Brief → kịch bản → sản xuất → doanh nghiệp duyệt → KOC duyệt → đăng bài.</p>
    <div id="admin-aiclone-list" style="margin-top:8px">${
      displayList.length
        ? displayList
            .map(
              (
                a,
              ) => `<div class="card" style="margin-bottom:12px"><div class="between">
      <div class="row">${
        a.quote_kocs
          ? `<div><div class="row"><b>Booking của ${esc(a.business_name || "Doanh nghiệp")}</b><span class="chip b">${num(a.quote_kocs.length)} KOC</span></div>
           <div class="muted" style="font-size:12px">Mã yêu cầu: ${esc(a.aiclone_batch_id)}</div></div>`
          : `<img class="avatar" src="${esc(a.avatar)}"><div><div class="row"><b>${esc(a.name)}</b>${tierBadge(a.tier)}</div>
           <div class="muted" style="font-size:12px">📍 ${esc(a.province)} ${a.business_name ? "· " + esc(a.business_name) : ""}</div>`
      }
        ${
          a.booking_code
            ? `<div style="font-size:12px;margin-top:4px"><b>${esc(a.booking_code)}</b> · ${statusChip(a.booking_status)}</div>
          ${!a.id ? '<div class="chip w" style="margin-top:4px">KOC chưa đăng ký AI Clone</div>' : ""}`
            : `<div class="chip b" style="margin-top:4px">Đã đăng ký dịch vụ</div>`
        }${a.quote_kocs ? "" : "</div>"}</div>
      <div class="row">
        ${a.booking_status === "quote_pending" ? `<button class="btn primary sm" data-ai-quote="${a.booking_id}" data-batch="${esc(a.aiclone_batch_id || "")}" data-code="${esc(a.booking_code || "")}" data-business="${esc(a.business_name || "Doanh nghiệp")}">💰 Gửi báo giá booking</button>` : ""}
        ${a.quote_kocs && a.quote_kocs.some((k) => ["brief_review", "producing", "revision_requested", "pending_business_review", "business_approved", "pending_koc_review", "video_approved"].includes(k.booking_status)) ? `<button class="btn navy sm" data-deliver="${a.booking_id}" data-batch="${esc(a.aiclone_batch_id || "")}" data-target="business" data-code="${esc(a.aiclone_batch_id || a.booking_code || "")}" data-recipient="${esc(a.business_name || "Doanh nghiệp")}">📤 Gửi một video cho doanh nghiệp duyệt</button>` : ""}
        ${!a.booking_id ? `<button class="btn primary sm" data-book="${a.koc_id}">Tạo booking nội bộ</button>` : ""}
        ${!a.quote_kocs && a.booking_id && ["pending", "confirmed", "brief_review", "revision_requested"].includes(a.booking_status) ? `<button class="btn primary sm" data-script="${a.booking_id}" data-current="${esc(a.aiclone_script || "")}">✍️ Nội dung sản xuất (tùy chọn)</button>` : ""}
        ${!a.quote_kocs && a.booking_id && ["pending", "confirmed", "brief_review", "producing", "revision_requested"].includes(a.booking_status) ? `<button class="btn navy sm" data-deliver="${a.booking_id}" data-target="business" data-code="${esc(a.booking_code || "")}" data-recipient="${esc(a.business_name || "Doanh nghiệp")}">📤 Giao video cho doanh nghiệp</button>` : ""}
        ${a.booking_status === "pending_business_review" ? '<span class="chip w">Đã giao doanh nghiệp duyệt</span>' : ""}
        ${["business_approved", "pending_koc_review"].includes(a.booking_status) ? '<span class="chip w">Đã tự động chuyển KOC duyệt</span>' : ""}
      </div></div>
      <div class="muted" style="font-size:12px;margin-top:6px">${a.booking_id ? "Thời gian tạo booking" : "Thời gian đăng ký"}: ${fmtDateTime(a.booking_id ? a.booking_created_at : a.registered_at)}</div>
      ${a.requirements ? `<div class="tint-box" style="margin-top:10px"><b>Brief:</b> ${esc(a.requirements)}</div>` : ""}
      ${
        a.quote_kocs
          ? `<div class="tint-box" style="margin-top:10px"><b>KOC và tiến độ giao video trong booking</b>
        <div style="margin-top:8px">${a.quote_kocs
          .map(
            (
              k,
            ) => `<div class="between" style="padding:10px 0;border-top:1px solid var(--border);gap:12px">
          <div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}"><div>
            <div class="row"><b>${esc(k.name)}</b>${tierBadge(k.tier)}${statusChip(["quote_grouped", "payment_grouped"].includes(k.booking_status) ? a.booking_status : k.booking_status)}</div>
            <div class="muted" style="font-size:11px">${esc(k.booking_code || "")} · ${esc(k.province || "")}</div>
          </div></div>
          <div class="row" style="flex-wrap:wrap;justify-content:flex-end">
            ${["pending", "confirmed", "brief_review", "revision_requested"].includes(k.booking_status) ? `<button class="btn primary sm" data-script="${k.booking_id}" data-current="${esc(k.aiclone_script || "")}">✍️ Nội dung sản xuất</button>` : ""}
            ${k.booking_status === "pending_business_review" ? '<span class="chip w">Doanh nghiệp đang duyệt</span>' : ""}
            ${k.booking_status === "pending_koc_review" ? '<span class="chip w">KOC đang duyệt</span>' : ""}
            ${k.booking_status === "video_approved" ? '<span class="chip g">Video đã được KOC duyệt</span>' : ""}
          </div>
        </div>`,
          )
          .join("")}</div>
      </div>`
          : ""
      }
      ${
        a.booking_status === "quote_pending"
          ? `<div class="tint-box" style="margin-top:10px">
        <b>Thông tin yêu cầu báo giá</b>
        <div class="muted" style="margin-top:6px">Quy mô: ${esc(a.aiclone_scope || "—")} · ${num(a.aiclone_video_quantity || 1)} video · Phí sản xuất dự kiến ${money(a.aiclone_production_fee || 0)} · Phí nền tảng dự kiến ${money(a.aiclone_platform_fee || 0)}</div>
        ${a.aiclone_message ? `<div style="margin-top:5px">Thông điệp: ${esc(a.aiclone_message)}</div>` : ""}
        ${a.product_link ? `<div style="margin-top:5px">Sản phẩm: <a href="${esc(a.product_link)}" target="_blank" rel="noopener">Mở link</a></div>` : ""}
      </div>`
          : ""
      }
      ${
        a.booking_id && !a.quote_kocs
          ? `<div class="tint-box" style="margin-top:10px">
        <div class="between"><b>🎥 Giao video</b>
          ${
            [
              "pending",
              "confirmed",
              "brief_review",
              "producing",
              "revision_requested",
            ].includes(a.booking_status)
              ? '<span class="chip b">Có thể giao doanh nghiệp</span>'
              : ["business_approved", "pending_koc_review"].includes(
                    a.booking_status,
                  )
                ? '<span class="chip g">Đã chuyển KOC duyệt</span>'
                : `<span class="chip w">${a.booking_status === "pending" ? "Chờ KOC nhận booking" : a.booking_status === "payment_pending" ? "Chờ doanh nghiệp thanh toán" : "Chưa đến bước giao video"}</span>`
          }
        </div>
        <p class="muted" style="font-size:12px;margin-top:5px">${
          [
            "pending",
            "confirmed",
            "brief_review",
            "producing",
            "revision_requested",
          ].includes(a.booking_status)
            ? "Dùng nút “Giao video cho doanh nghiệp” phía trên để gửi bản dựng."
            : ["business_approved", "pending_koc_review"].includes(
                  a.booking_status,
                )
              ? "Doanh nghiệp đã duyệt. Video được tự động chuyển đến KOC phê duyệt."
              : "Nút giao video sẽ được mở khi booking hoàn tất bước hiện tại."
        }</p>
      </div>`
          : ""
      }
    </div>`,
            )
            .join("")
        : empty("", "Chưa có booking hoặc KOC đăng ký AI Clone Avatar")
    }</div>`;
  mountListSearch(el, { key: "admin-aiclone", label: "Tìm yêu cầu AI Clone", placeholder: "Mã booking, mã yêu cầu, doanh nghiệp hoặc tên KOC…", itemSelector: "#admin-aiclone-list > .card", containerSelector: "#admin-aiclone-list" });
  el.querySelectorAll("[data-book]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await post("/api/admin/aiclone/booking", { koc_id: b.dataset.book });
        toast("Đã tạo booking AI Clone Avatar", "ok");
        aiclone(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-ai-quote]").forEach((button) =>
    button.addEventListener("click", () => {
      const items = button.dataset.batch
        ? r.list.filter((row) => row.aiclone_batch_id === button.dataset.batch)
        : r.list.filter((row) => row.booking_id === button.dataset.aiQuote);
      const estimatedProduction = items.reduce(
        (sum, item) => sum + Number(item.aiclone_production_fee || 0),
        0,
      );
      const estimatedPlatform = items.reduce(
        (sum, item) => sum + Number(item.aiclone_platform_fee || 0),
        0,
      );
      const m = modal(`<h2>Gửi báo giá AI Clone Avatar</h2>
      <div class="tint-box"><b>${esc(button.dataset.business)}</b> · ${num(items.length)} KOC trong booking
        <div class="muted" style="margin-top:5px">${items.map((item) => esc(item.name)).join(" · ")}</div></div>
      <div class="field" style="margin-top:12px"><label>Phí trả riêng cho từng KOC</label>
        <div style="display:grid;gap:8px;margin-top:7px">${items
          .map(
            (
              item,
              index,
            ) => `<div class="between" style="gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:12px;background:#fff">
          <div><b>${index + 1}. ${esc(item.name)}</b><div class="muted" style="font-size:11px">${esc(item.booking_code || "")}</div></div>
          <input class="aiq-part aiq-koc-fee" data-booking-id="${esc(item.booking_id)}" type="number" min="0" step="1000" value="${Number(item.aiclone_quote_koc || 0)}" style="width:150px;text-align:right" aria-label="Phí của ${esc(item.name)}">
        </div>`,
          )
          .join("")}</div>
        <div class="between" style="margin-top:8px"><span class="muted">Tổng phí KOC</span><b class="money" id="aiq-koc-total">0đ</b></div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px;margin-top:12px">
        <div class="field"><label>Phí sản xuất video (đ)</label><input class="aiq-part" id="aiq-production" type="number" min="0" value="${estimatedProduction}"></div>
        <div class="field"><label>Phí nền tảng (đ)</label><input class="aiq-part" id="aiq-platform" type="number" min="0" value="${estimatedPlatform}"></div>
        <div class="field"><label>Chi phí bổ sung (đ)</label><input class="aiq-part" id="aiq-additional" type="number" min="0" value="0"></div>
      </div>
      <div class="tint-box between"><b>Tổng báo giá</b><b class="money" id="aiq-total">0đ</b></div>
      <div class="field"><label>Ghi chú gửi doanh nghiệp</label><textarea id="aiq-note" rows="3" maxlength="1000" placeholder="Hạng mục sản xuất, thời gian thực hiện, điều kiện áp dụng…"></textarea></div>
      <button class="btn primary" id="aiq-send">Gửi báo giá cho doanh nghiệp</button>
      <button class="btn ghost" id="aiq-cancel" style="margin-top:8px">Hủy</button>`);
      const kocAllocations = () =>
        [...m.querySelectorAll(".aiq-koc-fee")].map((input) => ({
          booking_id: input.dataset.bookingId,
          amount: Number(input.value || 0),
        }));
      const quoteParts = () => ({
        production_fee: Number(m.querySelector("#aiq-production").value || 0),
        koc_fee: kocAllocations().reduce(
          (sum, allocation) => sum + allocation.amount,
          0,
        ),
        platform_fee: Number(m.querySelector("#aiq-platform").value || 0),
        additional_fee: Number(m.querySelector("#aiq-additional").value || 0),
      });
      const updateTotal = () => {
        const parts = quoteParts();
        m.querySelector("#aiq-koc-total").textContent = money(parts.koc_fee);
        m.querySelector("#aiq-total").textContent = money(
          parts.production_fee +
            parts.koc_fee +
            parts.platform_fee +
            parts.additional_fee,
        );
      };
      m.querySelectorAll(".aiq-part").forEach((input) =>
        input.addEventListener("input", updateTotal),
      );
      updateTotal();
      m.querySelector("#aiq-cancel").addEventListener("click", closeModal);
      m.querySelector("#aiq-send").addEventListener("click", async () => {
        const parts = quoteParts();
        const quote =
          parts.production_fee +
          parts.koc_fee +
          parts.platform_fee +
          parts.additional_fee;
        if (
          !Object.values(parts).every(
            (value) => Number.isSafeInteger(value) && value >= 0,
          ) ||
          quote <= 0
        )
          return toast("Vui lòng nhập các hạng mục báo giá hợp lệ", "err");
        try {
          await post("/api/admin/aiclone/quote", {
            id: button.dataset.aiQuote,
            batch_id: button.dataset.batch,
            ...parts,
            koc_allocations: kocAllocations(),
            note: m.querySelector("#aiq-note").value.trim(),
          });
          toast("Đã gửi báo giá cho doanh nghiệp", "ok");
          closeModal();
          aiclone(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
  el.querySelectorAll("[data-script]").forEach((button) =>
    button.addEventListener("click", () => {
      modal(`<h2>Soạn & duyệt kịch bản AI Clone</h2>
      <p class="muted">Kịch bản là căn cứ sản xuất và được hiển thị cho doanh nghiệp/KOC.</p>
      <div class="field" style="margin-top:12px"><label class="required-label">Nội dung kịch bản</label><textarea id="ai-script" rows="12">${esc(button.dataset.current || "")}</textarea></div>
      <button class="btn primary" id="ai-script-save">Duyệt kịch bản & chuyển sản xuất</button>
      <button class="btn ghost" id="ai-script-cancel" style="margin-top:8px">Hủy</button>`);
      document
        .getElementById("ai-script-cancel")
        .addEventListener("click", closeModal);
      document
        .getElementById("ai-script-save")
        .addEventListener("click", async () => {
          try {
            await post("/api/admin/aiclone/script", {
              id: button.dataset.script,
              script: document.getElementById("ai-script").value,
            });
            toast("Đã duyệt kịch bản · chuyển sang sản xuất", "ok");
            closeModal();
            aiclone(el);
          } catch (e) {
            toast(e.message, "err");
          }
        });
    }),
  );
  el.querySelectorAll("[data-deliver]").forEach((b) =>
    b.addEventListener("click", async () => {
      const target = "business";
      const targetLabel = "doanh nghiệp";
      modal(`<h2>Gửi video chung cho doanh nghiệp duyệt</h2>
      <div class="tint-box"><b>${esc(b.dataset.code)}</b> · ${esc(b.dataset.recipient)}</div>
      <p class="muted" style="margin-top:10px">Chỉ cần gửi một bản dựng cho doanh nghiệp. Sau khi doanh nghiệp duyệt, hệ thống tự động chuyển cùng link video đến toàn bộ KOC trong booking.</p>
      <div class="field" style="margin-top:12px"><label class="required-label">Link video bản dựng</label><input id="dv-link" type="url" placeholder="https://…/video.mp4"></div>
      <div id="dv-preview" style="display:none;margin-bottom:12px"><video controls playsinline style="width:100%;max-height:360px;border-radius:12px;background:#111"></video></div>
      <button class="btn navy" id="dv-go">Gửi video cho ${targetLabel} xem và duyệt</button>
      <button class="btn ghost" id="dv-cancel" style="margin-top:8px">Hủy</button>`);
      const linkInput = document.getElementById("dv-link");
      const preview = document.getElementById("dv-preview");
      linkInput.addEventListener("input", () => {
        const link = linkInput.value.trim();
        if (/^https?:\/\//i.test(link)) {
          preview.style.display = "block";
          preview.querySelector("video").src = link;
        } else {
          preview.style.display = "none";
          preview.querySelector("video").removeAttribute("src");
        }
      });
      document
        .getElementById("dv-cancel")
        .addEventListener("click", closeModal);
      document.getElementById("dv-go").addEventListener("click", async () => {
        const videoLink = linkInput.value.trim();
        if (!videoLink)
          return toast("Vui lòng nhập link video thành phẩm", "err");
        try {
          await post("/api/admin/aiclone/deliver", {
            id: b.dataset.deliver,
            batch_id: b.dataset.batch,
            target,
            video_link: videoLink,
          });
          toast(`Đã gửi video chung cho ${targetLabel} duyệt`, "ok");
          closeModal();
          aiclone(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
}

async function tiers(el) {
  const cfg = state.config;
  el.innerHTML = `<div class="between"><h1>Khung giá 5 hạng</h1><button class="btn primary sm" id="tr-save">💾 Lưu khung giá</button></div>
    <p class="muted" style="margin-bottom:16px">KOC niêm yết giá phải nằm trong khung của hạng. Sau khi lưu, bảng giá KOC hiện có sẽ được kiểm tra lại theo khung mới.</p>
    <div class="table-wrap"><table><thead><tr><th>Hạng</th><th>Follower tối thiểu</th><th class="required-label">Follower tối đa</th><th>Giá tối thiểu (đ)</th><th class="required-label">Giá tối đa (đ)</th><th>Phí dịch vụ (%)</th></tr></thead><tbody>
    ${cfg.tiers
      .map(
        (t) => `<tr><td>${tierBadge(t.name)}</td>
      <td><input type="number" data-f="minF" data-tier="${esc(t.name)}" value="${t.minF}" style="width:100px"></td>
      <td><input type="number" data-f="maxF" data-tier="${esc(t.name)}" value="${t.maxF}" style="width:100px"></td>
      <td><input type="number" data-f="min" data-tier="${esc(t.name)}" value="${t.min}" style="width:130px"></td>
      <td><input type="number" data-f="max" data-tier="${esc(t.name)}" value="${t.max}" style="width:130px"></td>
      <td><input type="number" data-f="fee" data-tier="${esc(t.name)}" value="${t.fee}" style="width:70px"></td></tr>`,
      )
      .join("")}
    </tbody></table></div>
    <div id="tr-warnings" style="margin-top:16px"></div>
    <div class="card" style="margin-top:16px"><h3>Quyền lợi theo hạng</h3>
      <ul style="margin:10px 0 0 18px;line-height:2;color:#444">
        <li>Hạng cao hơn: khung giá cao hơn, ưu tiên hiển thị trên trang khám phá KOC</li>
        <li>Phí dịch vụ giảm dần theo hạng (Nano 5% → Mega 3%)</li>
        <li>Thăng hạng dựa trên: follower, số booking hoàn thành, điểm đánh giá</li>
      </ul></div>`;
  document.getElementById("tr-save").addEventListener("click", async () => {
    if (
      !(await confirmDialog(
        "Xác nhận lưu khung giá mới? Booking mới và onboarding KOC mới sẽ áp dụng ngay.",
      ))
    )
      return;
    const names = cfg.tiers.map((t) => t.name);
    const newTiers = names.map((name) => {
      const row = {};
      el.querySelectorAll(`[data-tier="${CSS.escape(name)}"]`).forEach(
        (inp) => {
          row[inp.dataset.f] = Number(inp.value);
        },
      );
      return {
        name,
        min: row.min,
        max: row.max,
        minF: row.minF,
        maxF: row.maxF,
        fee: row.fee,
      };
    });
    const btn = document.getElementById("tr-save");
    btn.disabled = true;
    btn.textContent = "Đang lưu…";
    try {
      const r = await post("/api/admin/tiers", { tiers: newTiers });
      state.config = await api("/api/config");
      const wbox = document.getElementById("tr-warnings");
      if (r.warnings && r.warnings.length) {
        wbox.innerHTML = `<div class="card" style="border-color:var(--error)"><h3 class="icon-heading" style="color:var(--error)">${icon("complaint", "teaser-icon")} ${r.warnings.length} bảng giá KOC hiện đang nằm ngoài khung mới</h3>
          <table style="margin-top:10px"><thead><tr><th>KOC</th><th>Ngành</th><th>Giá hiện tại</th><th>Khung hạng ${esc(r.warnings[0].tier)}</th></tr></thead><tbody>
          ${r.warnings.map((w) => `<tr><td>${esc(w.name)}</td><td>${esc(w.category)}</td><td class="money">${money(w.price)}</td><td class="money">${money(w.min)} – ${money(w.max)}</td></tr>`).join("")}
          </tbody></table><p class="muted" style="margin-top:8px;font-size:12px">Các KOC này cần tự cập nhật lại giá trong trang Hồ sơ của họ để tuân thủ khung mới.</p></div>`;
      } else {
        wbox.innerHTML = "";
        toast("Đã lưu khung giá mới", "ok");
      }
      if (!r.warnings || !r.warnings.length) tiers(el);
    } catch (e) {
      toast(e.message, "err");
    } finally {
      btn.disabled = false;
      btn.textContent = "Lưu khung giá";
    }
  });
}
