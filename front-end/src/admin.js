import { api, post } from "./api.js";
import {
  money,
  num,
  esc,
  statusChip,
  spinner,
  skeletonStatCards,
  skeletonTable,
  empty,
  toast,
  modal,
  closeModal,
  tierBadge,
  stars,
  fmtDate,
} from "./ui.js";
import { state, logout, enhancePortal } from "./app.js";
import { icon } from "./icons.js";

const NAV = [
  ["#/dashboard", icon("kpi", "sidebar-icon"), "KPI Dashboard"],
  ["#/businesses", "🏢", "Quản lý doanh nghiệp"],
  ["#/queue", icon("approval", "sidebar-icon"), "Duyệt hồ sơ"],
  ["#/allbookings", icon("booking", "sidebar-icon"), "Booking toàn sàn"],
  ["#/complaints", icon("complaint", "sidebar-icon"), "Khiếu nại"],
  ["#/contracts", "📜", "Hợp đồng điện tử"],
  ["#/affiliate", "🔗", "Đơn Affiliate"],
  ["#/kol", icon("kolRequest", "sidebar-icon"), "Yêu cầu KOL"],
  ["#/leads", icon("quoteLead", "sidebar-icon"), "Lead tư vấn"],
  ["#/campaigns", icon("coordination", "sidebar-icon"), "Điều phối chiến dịch"],
  ["#/settle", icon("settlement", "sidebar-icon"), "Đối soát & Chi trả"],
  ["#/aiclone", icon("aiClone", "sidebar-icon"), "AI Clone Avatar"],
  ["#/tiers", icon("ranking", "sidebar-icon"), "Khung giá hạng"],
];

export async function renderAdmin(el, hash) {
  const page = hash.replace("#/", "") || "dashboard";
  const keys = NAV.map((n) => n[0].replace("#/", ""));
  const active = "#/" + (keys.includes(page) ? page : "dashboard");
  el.innerHTML = `<div class="portal">
    <div class="sidebar"><div class="brand">${icon("admin", "brand-icon")}<span class="brand-name">KOC Viet <span>Admin</span></span></div>
      ${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}">${n[1]}<span>${n[2]}</span></a>`).join("")}</div>
    <div class="main"><div class="topbar" style="background:var(--navy);color:#fff"><h2 style="color:#fff">Admin Panel</h2>
      <div class="row"><span style="color:#cdd6e4">${esc(state.user.name)}</span><button class="btn ghost sm" id="ad-logout">Đăng xuất</button></div></div>
      <div class="content" id="ad-view">${skeletonStatCards(4) + skeletonTable(5)}</div></div></div>`;
  document.getElementById("ad-logout").addEventListener("click", logout);
  enhancePortal();
  const view = document.getElementById("ad-view");
  try {
    if (active === "#/dashboard") await kpi(view);
    else if (active === "#/businesses") await businessesAdmin(view);
    else if (active === "#/queue") await queue(view);
    else if (active === "#/allbookings") await allBookings(view);
    else if (active === "#/complaints") await complaintsAdmin(view);
    else if (active === "#/contracts") await contractsAdmin(view);
    else if (active === "#/affiliate") await affiliateAdmin(view);
    else if (active === "#/kol") await kolAdmin(view);
    else if (active === "#/leads") await leadsAdmin(view);
    else if (active === "#/campaigns") await adminCampaigns(view);
    else if (active === "#/settle") await settle(view);
    else if (active === "#/aiclone") await aiclone(view);
    else if (active === "#/tiers") await tiers(view);
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
        <td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(b.created_at)}</td>
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
      <div class="between"><span>Email liên hệ</span><b>${esc(b.email || "—")}</b></div>
      <div class="between"><span>Người liên hệ</span><b>${esc(b.contact || "—")}</b></div>
      <div class="between"><span>Ngành nghề</span><b>${esc(b.industry || "—")}</b></div>
      <div class="between"><span>Mã số thuế</span><b>${esc(b.tax_code || "—")}</b></div>
      <div class="between"><span>Email đăng nhập</span><b>${esc(b.login_email || "—")}</b></div>
    </div>
    <div class="stat-cards" style="margin-bottom:14px">
      ${scard("Booking", num(s.bookings_count))}${scard("Hoàn thành", num(s.completed_count))}${scard("Tổng chi", money(s.total_spend))}
    </div>
    ${["locked", "rejected"].includes(b.account_status) ? `<div class="tint-box" style="margin-bottom:14px"><b>${b.account_status === "rejected" ? "Lý do từ chối" : "Lý do khóa"}:</b> ${esc(b.locked_reason || "—")}<div class="muted">${b.locked_at ? fmtDate(b.locked_at) : ""}</div></div>` : ""}
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
      <div class="between"><span>Ngân hàng</span><b>${esc(b.bank_name || "—")}</b></div>
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
    reason = prompt(
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
    if (!confirm(message)) return;
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

async function kpi(el) {
  const k = await api("/api/admin/kpi");
  const pct = (a, b) => Math.min(100, (a / b) * 100).toFixed(3);
  el.innerHTML = `<h1>KPI Dashboard</h1>
    <div class="stat-cards" style="margin:16px 0">
      <div class="card"><div class="muted">KOC hoạt động</div><div style="font-size:26px;font-weight:800">${num(k.kocs)}</div>
        <div class="progress" style="margin-top:8px"><i style="width:${pct(k.kocs, k.targetKoc)}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Mục tiêu ${num(k.targetKoc)}</div></div>
      <div class="card"><div class="muted">Doanh nghiệp</div><div style="font-size:26px;font-weight:800">${num(k.businesses)}</div>
        <div class="progress" style="margin-top:8px"><i style="width:${pct(k.businesses, k.targetBiz)}%"></i></div><div class="muted" style="font-size:11px;margin-top:4px">Mục tiêu ${num(k.targetBiz)}</div></div>
      <div class="card"><div class="muted">GMV booking</div><div style="font-size:26px;font-weight:800" class="money">${money(k.gmv)}</div></div>
      <div class="card"><div class="muted">Doanh thu phí (5%)</div><div style="font-size:26px;font-weight:800" class="money">${money(k.fee)}</div></div>
    </div>
    <div class="stat-cards" style="margin:0 0 16px">
      <div class="card"><div class="muted">Doanh số affiliate (GMV)</div><div style="font-size:22px;font-weight:800" class="money">${money(k.affGmv || 0)}</div></div>
      <div class="card"><div class="muted">Hoa hồng KOC affiliate</div><div style="font-size:22px;font-weight:800" class="money">${money(k.affCommission || 0)}</div></div>
      <div class="card"><div class="muted">Phí nền tảng 1% (affiliate)</div><div style="font-size:22px;font-weight:800" class="money">${money(k.platformFee || 0)}</div></div>
      <div class="card"><div class="muted">Lead tư vấn mới</div><div style="font-size:22px;font-weight:800">${num(k.newLeads || 0)}</div></div>
    </div>
    <div class="grid" style="grid-template-columns:1fr 1fr">
      <div class="card"><h2>Phễu chuyển đổi booking</h2><div style="margin-top:12px">
        ${Object.entries(k.funnel)
          .map(
            ([s, c]) =>
              `<div class="between" style="padding:6px 0">${statusChip(s)}<b>${c}</b></div>`,
          )
          .join("")}</div></div>
      <div class="card"><h2>Phân bố theo tỉnh</h2><div style="margin-top:12px">
        ${k.provinces
          .map(
            (
              p,
            ) => `<div class="between" style="padding:5px 0"><span>${esc(p.province)}</span>
          <div class="row" style="flex:1;margin-left:10px"><div class="progress" style="flex:1"><i style="width:${(p.c / k.kocs) * 100}%"></i></div><b style="margin-left:8px">${p.c}</b></div></div>`,
          )
          .join("")}</div></div>
    </div>`;
}

async function queue(el) {
  const r = await api("/api/admin/queue");
  el.innerHTML = `<div class="between"><h1>Hàng đợi duyệt hồ sơ KOC</h1>${r.kocs.length ? `<button class="btn ok sm" id="q-bulk">Duyệt hàng loạt (${r.kocs.length})</button>` : ""}</div>
    <div style="margin-top:16px">${r.kocs.length ? r.kocs.map(kocQueueCard).join("") : empty("✅", "Không có hồ sơ chờ duyệt")}</div>`;
  el.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", () => act(b.dataset.approve, true, el)),
  );
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", () => {
      const rr = prompt("Lý do từ chối:");
      if (rr !== null) act(b.dataset.reject, false, el);
    }),
  );
  el.querySelectorAll("[data-detail]").forEach((b) =>
    b.addEventListener("click", () =>
      kocDetail(r.kocs.find((x) => x.id === b.dataset.detail)),
    ),
  );
  const bulk = document.getElementById("q-bulk");
  if (bulk)
    bulk.addEventListener("click", async () => {
      await post("/api/admin/approve-bulk", { ids: r.kocs.map((x) => x.id) });
      toast("Đã duyệt hàng loạt", "ok");
      queue(el);
    });
}
function kocQueueCard(k) {
  const followerVerifiedLabel =
    k.followers_verification_source === "tesseract_ocr"
      ? "✓ Follower OCR"
      : "✓ Follower đã xác minh";
  return `<div class="card" style="margin-bottom:12px"><div class="between">
    <div class="row"><img class="avatar" src="${esc(k.avatar)}"><div>
      <div class="row"><strong>${esc(k.name)}</strong>${tierBadge(k.tier)}${k.followers_verified ? `<span class="chip g">${followerVerifiedLabel}</span>` : '<span class="chip w">Follower chưa xác minh</span>'}${k.status === "leader_ok" ? '<span class="chip b">Leader duyệt</span>' : ""}</div>
      <div class="muted" style="font-size:12px">📍 ${esc(k.province)} · ${num(k.followers)} follower · ${(k.categories || []).join(", ")}</div></div></div>
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
function kocDetail(k) {
  const followerVerifiedLabel =
    k.followers_verification_source === "tesseract_ocr"
      ? "✓ OCR"
      : "✓ Đã xác minh";
  modal(`<div class="row"><img class="avatar lg" src="${esc(k.avatar)}"><div><h2>${esc(k.name)}</h2>${tierBadge(k.tier)} <span class="muted">📍 ${esc(k.province)}</span></div></div>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>Follower</span><b>${num(k.followers)} ${k.followers_verified ? `<span class="chip g">${followerVerifiedLabel}</span>` : '<span class="chip w">Chưa xác minh</span>'}</b></div>
      <div class="between"><span>Tương tác</span><b>${k.engagement}%</b></div>
      <div class="between"><span>Ngành hàng</span><b>${(k.categories || []).join(", ")}</b></div>
      <div class="between"><span>SĐT / Email</span><b style="font-size:12px">${esc(k.phone || "")} · ${esc(k.email || "—")}</b></div>
      <div class="between"><span>Mã hợp đồng</span><b style="font-size:11px">${esc((k.contract_hash || "").slice(0, 20))}…</b></div>
    </div>
    <div class="tint-box" style="margin:0 0 12px">
      <div style="font-size:12px;font-weight:700;margin-bottom:4px">💳 Tài khoản nhận thanh toán</div>
      <div class="between"><span>Ngân hàng</span><b>${esc(k.bank_name || "—")}</b></div>
      <div class="between"><span>Số TK</span><b>${esc(k.bank_account || "—")}</b></div>
      <div class="between"><span>Chủ TK</span><b>${esc(k.bank_owner || "—")}</b></div>
    </div>
    <h3>eKYC</h3><div class="row" style="margin:8px 0">${["CCCD trước", "CCCD sau", "Selfie"].map((x) => `<div class="tint-box" style="text-align:center;flex:1;padding:16px 6px">📷<div style="font-size:11px">${x}</div><span class="chip g" style="margin-top:4px">Đạt</span></div>`).join("")}</div>
    <div class="row">
      ${k.contract_html ? '<button class="btn primary" id="admin-view-contract">📜 Xem hợp đồng đã ký</button>' : ""}
      <button class="btn ghost" onclick="document.getElementById('modal-root').innerHTML=''">Đóng</button>
    </div>`);
  document
    .getElementById("admin-view-contract")
    ?.addEventListener("click", () => showSignedContract(k));
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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title></title>
    </head><body>${c.contract_html}
    <style>
      @page{size:A4 portrait;margin:21mm 23mm}
      *{box-sizing:border-box}
      html,body{margin:0;color:#000;background:#e5e7eb}
      body{padding:18px;font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.35}
      .contract-box{width:210mm;min-height:297mm;margin:0 auto;background:#fff!important;border:0!important;border-radius:0!important;box-shadow:0 2px 16px rgba(0,0,0,.16);overflow:visible!important;padding:21mm 23mm}
      .contract-header{background:#fff!important;color:#000!important;padding:0!important;text-align:center}
      .contract-title{font-family:"Times New Roman",Times,serif!important;font-size:15pt!important;font-weight:700!important;text-transform:uppercase;margin:0 0 4pt!important;letter-spacing:0!important}
      .contract-subtitle,.contract-header .doc-no{font-family:"Times New Roman",Times,serif!important;color:#000!important;font-size:11pt!important;margin:0 0 4pt!important}
      .contract-header .doc-no{text-align:left;margin-top:10pt!important}
      .contract-scroll{max-height:none!important;overflow:visible!important;padding:0!important;background:#fff!important;color:#000!important;font-family:"Times New Roman",Times,serif!important;font-size:13pt!important;line-height:1.35!important}
      .contract-basis{margin:10pt 0!important;padding:0!important;background:#fff!important;border:0!important;border-radius:0!important;font-size:13pt!important}
      .contract-basis ul{margin:4pt 0 8pt 24pt!important;padding:0!important}
      .contract-basis li{margin:0 0 3pt!important}
      .contract-party{margin:8pt 0!important;padding:0!important;border:0!important;border-radius:0!important;font-size:13pt!important}
      .contract-party b{color:#000!important}
      .contract-party .party-label{display:block!important;background:none!important;color:#000!important;border-radius:0!important;padding:0!important;margin:8pt 0 3pt!important;font-size:13pt!important;font-weight:700!important}
      .contract-scroll p{margin:0 0 6pt!important;text-align:justify}
      .contract-article-title{font-family:"Times New Roman",Times,serif!important;font-size:13pt!important;font-weight:700!important;color:#000!important;margin:10pt 0 5pt!important;padding:0!important;border:0!important;page-break-after:avoid}
      .contract-scroll .term-def b{color:#000!important}
      .contract-table{width:100%!important;border-collapse:collapse!important;margin:8pt 0 10pt!important;font-family:"Times New Roman",Times,serif!important;font-size:11pt!important;page-break-inside:auto}
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

let abFilters = {};
async function allBookings(el) {
  const cfg = state.config;
  el.innerHTML = `<h1>Booking toàn sàn</h1>
    <div class="filters" style="margin:14px 0">
      <div class="field"><label>Từ khoá (mã/DN/KOC)</label><input id="ab-q" value="${esc(abFilters.q || "")}"></div>
      <div class="field"><label>Trạng thái</label><select id="ab-status"><option value="">Tất cả</option>${["pending", "confirmed", "producing", "posted", "payment_pending", "payment_failed", "payment_cancelled", "settling", "completed", "rejected"].map((s) => `<option value="${s}" ${abFilters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="field"><label>Loại booking</label><select id="ab-type"><option value="">Tất cả</option>${[
        ["aiclone", "AI Clone Avatar"],
        ["review", "Review"],
        ["advertising", "Quảng cáo"],
        ["affiliate", "Affiliate"],
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
    <div class="table-wrap" id="ab-table">${skeletonTable(5)}</div>`;
  document.getElementById("ab-go").addEventListener("click", () => {
    abFilters = {
      q: document.getElementById("ab-q").value.trim(),
      status: document.getElementById("ab-status").value,
      type: document.getElementById("ab-type").value,
      business: document.getElementById("ab-biz").value.trim(),
      koc: document.getElementById("ab-koc").value.trim(),
      fromD: document.getElementById("ab-from").value,
      toD: document.getElementById("ab-to").value,
    };
    loadAllBookings(el);
  });
  loadAllBookings(el);
}
async function loadAllBookings(el) {
  const tbl = document.getElementById("ab-table");
  tbl.innerHTML = skeletonTable(5);
  const qs = new URLSearchParams();
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
  tbl.innerHTML = r.bookings.length
    ? `<table><thead><tr><th>Mã</th><th>Thời gian</th><th>DN</th><th>KOC</th><th>Giá</th><th>Loại</th><th>Trạng thái</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${r.bookings
      .map(
        (
          b,
        ) => `<tr><td>${esc(b.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(b.created_at)}</td><td>${esc(b.bizname)}</td><td>${esc(b.kocname)}</td><td class="money">${money(b.price)}</td>
      <td>${b.type === "aiclone" ? `${icon("aiClone")} AI Clone Avatar` : b.booking_type === "affiliate" ? "Affiliate" : b.booking_type === "combo" ? "Combo" : b.content_type === "advertising" ? "Quảng cáo" : "Review"}</td><td>${statusChip(b.status)}</td>
      <td style="width:1%;white-space:nowrap;text-align:right">${b.status === "pending" ? `<button class="btn danger sm" data-refund="${b.id}">Yêu cầu hoàn</button>` : ""}</td></tr>`,
      )
      .join("")}
    </tbody></table>`
    : empty("📋", "Không có booking phù hợp bộ lọc");
  tbl.querySelectorAll("[data-refund]").forEach((b) =>
    b.addEventListener("click", async () => {
      const reason =
        prompt("Lý do hoàn tiền/khiếu nại:") || "Admin xử lý khiếu nại";
      await post("/api/booking/action", {
        id: b.dataset.refund,
        action: "reject",
        reason,
      });
      toast("Đã chuyển escrow sang chờ hoàn", "ok");
      loadAllBookings(el);
    }),
  );
}

// ---------- Complaints (tiếp nhận → xem chi tiết → xử lý → cập nhật trạng thái, gắn với hoàn tiền) ----------
async function complaintsAdmin(el) {
  el.innerHTML = `<div class="between"><h1 class="icon-heading">${icon("complaint", "teaser-icon")} Khiếu nại booking</h1>
    <select id="cp-status"><option value="">Tất cả</option><option value="open">Mới tiếp nhận</option><option value="in_review">Đang xử lý</option><option value="resolved">Đã xử lý</option><option value="rejected">Từ chối</option></select></div>
    <div style="margin-top:16px" id="cp-list">${spinner()}</div>`;
  document
    .getElementById("cp-status")
    .addEventListener("change", () => loadComplaints(el));
  loadComplaints(el);
}
async function loadComplaints(el) {
  const st = document.getElementById("cp-status").value;
  const r = await api("/api/complaints" + (st ? "?status=" + st : ""));
  const list = document.getElementById("cp-list");
  if (!r.complaints.length) {
    list.innerHTML = empty("✅", "Không có khiếu nại nào");
    return;
  }
  list.innerHTML = r.complaints
    .map(
      (c) => `<div class="card" style="margin-bottom:12px">
    <div class="between"><div><strong>${esc(c.bcode)}</strong> · ${esc(c.bizname)} ↔ ${esc(c.kocname)} ${statusChip(c.status)}</div>
      <button class="btn ghost sm" data-detail="${c.id}">Xem chi tiết</button></div>
    <div class="muted" style="margin-top:6px;font-size:13px">${esc((c.reason || "").slice(0, 140))}${(c.reason || "").length > 140 ? "…" : ""}</div>
    <div class="muted" style="font-size:11px;margin-top:4px">Gửi bởi ${c.raised_by_role === "business" ? "Doanh nghiệp" : "KOC"} · ${fmtDate(c.created_at)}</div>
  </div>`,
    )
    .join("");
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
      <div class="between"><span>Escrow còn giữ</span><b class="money">${money(c.escrow || 0)}</b></div>
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
    rf.addEventListener("click", () => {
      if (confirm("Xác nhận hoàn tiền escrow cho doanh nghiệp?"))
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
      <div class="field"><label>Trạng thái</label><select id="ct-status"><option value="">Tất cả</option><option value="pending">Chờ duyệt</option><option value="leader_ok">Leader duyệt</option><option value="active">Đã kích hoạt</option><option value="rejected">Từ chối</option></select></div>
      <button class="btn primary sm" id="ct-go">Tìm</button>
    </div>
    <div id="ct-list">${spinner()}</div>`;
  document.getElementById("ct-go").addEventListener("click", () => {
    ctrFilters = {
      page: 1,
      search: document.getElementById("ct-search").value.trim(),
      status: document.getElementById("ct-status").value,
    };
    loadContracts(el);
  });
  loadContracts(el);
}
async function loadContracts(el) {
  const box = document.getElementById("ct-list");
  box.innerHTML = spinner();
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
      <td class="muted">${fmtDate(c.contract_signed_at || c.created_at)}</td><td>${statusChip(c.status)}</td>
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
  el.innerHTML = `<h1>Điều phối chiến dịch lớn</h1>
    <div style="margin-top:16px">${
      r.campaigns.length
        ? r.campaigns
            .map((c) => {
              let assigned = [];
              try {
                assigned = JSON.parse(c.assigned || "[]");
              } catch (e) {}
              return `<div class="card" style="margin-bottom:12px">
      <div class="between"><div><strong>${esc(c.bizname)}</strong> ${statusChip(c.status)}</div>
        <button class="btn primary sm" data-assign="${c.id}">Gán / chỉnh KOC</button></div>
      <div class="muted" style="margin-top:6px">Ngân sách ${money(c.budget)} · ${c.qty} KOC hạng ${esc(c.tier)} · ngành ${esc(c.category)}</div>
      ${c.note ? `<div class="tint-box" style="margin-top:8px;font-size:13px">${esc(c.note)}</div>` : ""}
      <div style="margin-top:8px"><span class="chip ${assigned.length > Number(c.qty) ? "r" : assigned.length === Number(c.qty) ? "g" : "n"}">${assigned.length}/${c.qty} KOC đã gán</span>
        ${assigned.length ? assigned.map((k) => `<span class="chip g" style="margin:2px">${esc(k.name)}</span>`).join("") : '<span class="muted" style="font-size:12px">Chưa gán KOC nào</span>'}
        ${assigned.length > Number(c.qty) ? '<div style="color:var(--error);font-size:12px;margin-top:6px">Số KOC đang gán vượt yêu cầu. Hãy bớt KOC để lưu lại.</div>' : ""}</div>
    </div>`;
            })
            .join("")
        : empty("📣", "Chưa có yêu cầu chiến dịch")
    }</div>`;
  el.querySelectorAll("[data-assign]").forEach((b) =>
    b.addEventListener("click", async () => {
      const c = r.campaigns.find((x) => x.id === b.dataset.assign);
      let assigned = [];
      try {
        assigned = JSON.parse(c.assigned || "[]");
      } catch (e) {}
      const assignedIds = new Set(assigned.map((k) => k.id));
      const kocs = await api(
        `/api/kocs?tier=${encodeURIComponent(c.tier)}&category=${encodeURIComponent(c.category)}`,
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
                (k) => `<label class="between list-item" style="cursor:pointer">
        <div class="row"><input type="checkbox" data-kid="${k.id}" ${assignedIds.has(k.id) ? "checked" : ""} style="width:auto;margin-right:8px"><img class="avatar" src="${esc(k.avatar)}"><div><b>${esc(k.name)}</b><div class="muted" style="font-size:12px">${num(k.followers)} · ${stars(k.rating)}</div></div></div><span class="chip g">Phù hợp</span></label>`,
              )
              .join("")
          : empty("🔍", "Không có KOC phù hợp")
      }</div>
      <button class="btn primary" id="asg-go" style="margin-top:10px">Xác nhận phân bổ</button>
      <button class="btn ghost" onclick="document.getElementById('modal-root').innerHTML=''" style="margin-top:8px">Đóng</button>`);
      const boxes = [...document.querySelectorAll("[data-kid]")];
      const updateSelection = () => {
        const count = boxes.filter((x) => x.checked).length;
        const over = count > Number(c.qty);
        const full = count >= Number(c.qty);
        const counter = document.getElementById("asg-count");
        counter.textContent = `${count}/${c.qty} KOC`;
        counter.className = `chip ${over ? "r" : count === Number(c.qty) ? "g" : "n"}`;
        boxes.forEach((x) => {
          if (!x.checked) x.disabled = full;
        });
        const warning = document.getElementById("asg-warning");
        warning.style.display = over ? "block" : "none";
        warning.textContent = over
          ? `Đang vượt ${count - Number(c.qty)} KOC. Hãy bỏ bớt trước khi lưu.`
          : "";
        document.getElementById("asg-go").disabled = over;
      };
      boxes.forEach((x) => x.addEventListener("change", updateSelection));
      updateSelection();
      document.getElementById("asg-go").addEventListener("click", async () => {
        const kocIds = [...document.querySelectorAll("[data-kid]:checked")].map(
          (x) => x.dataset.kid,
        );
        if (kocIds.length > Number(c.qty))
          return toast(`Chỉ được gán tối đa ${c.qty} KOC`, "err");
        try {
          await post("/api/admin/campaign-assign", { id: c.id, kocIds });
          toast(`Đã phân bổ ${kocIds.length} KOC`, "ok");
          closeModal();
          adminCampaigns(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    }),
  );
}

async function settle(el) {
  const [kpiData, led] = await Promise.all([
    api("/api/admin/kpi"),
    api("/api/admin/ledger"),
  ]);
  const list = led.settlements || [];
  let totalNetviet = 0;
  let totalKoc = 0;
  let totalEscrow = 0;

  const rows = list
    .map((s) => {
      const isAi = s.type === "aiclone";
      const quoteKoc = Number(s.aiclone_quote_koc || 0);
      const prodFee = Number(
        s.aiclone_quote_production || s.aiclone_production_fee || 0,
      );
      const platFee = Number(
        s.aiclone_quote_platform || s.aiclone_platform_fee || 0,
      );
      const addFee = Number(s.aiclone_quote_additional || 0);

      let kocFee = 0;
      if (isAi) {
        if (quoteKoc > 0) kocFee = quoteKoc;
        else if (Number(s.price) > prodFee + platFee + addFee)
          kocFee = Number(s.price) - prodFee - platFee - addFee;
        else kocFee = Math.round(Number(s.price) * 0.85);
      } else {
        kocFee = Math.max(
          0,
          Number(s.price) - Math.round(Number(s.price) * 0.05),
        );
      }
      const netvietFee = Math.max(0, Number(s.price) - kocFee);

      if (s.status === "completed") {
        totalEscrow += Number(s.price);
        totalKoc += kocFee;
        totalNetviet += netvietFee;
      }

      return `<tr>
      <td><b>${esc(s.code)}</b><div class="muted" style="font-size:11px">${esc(s.business_name || "Doanh nghiệp")}</div></td>
      <td><b>${esc(s.koc_name || "KOC")}</b></td>
      <td class="money" style="font-weight:700">${money(s.price)}</td>
      <td class="money" style="color:var(--success);font-weight:700">+${money(kocFee)}</td>
      <td class="money" style="color:var(--primary);font-weight:700">+${money(netvietFee)}<div class="muted" style="font-size:10px">Sản xuất AI + Phí NT</div></td>
      <td>${s.status === "completed" ? '<span class="chip g">✅ Đã giải ngân</span>' : '<span class="chip b">Đang xử lý</span>'}</td>
      <td class="muted" style="font-size:11px">${fmtDate(s.updated_at || s.created_at)}</td>
    </tr>`;
    })
    .join("");

  el.innerHTML = `<div class="between"><div><h1>Đối soát & Giải ngân (Demo NetViet / payOS)</h1>
      <p class="muted">Hạch toán phân bổ tiền Escrow khi doanh nghiệp bấm giải ngân: + Phí KOC vào Ví KOC và + Số tiền còn lại vào Tài khoản NetViet / payOS.</p></div>
    <button class="btn primary sm" id="s-run">▶ Chạy đối soát kỳ này</button></div>
    <div class="stat-cards" style="margin:16px 0">
      ${scard("Doanh thu NetViet (Tài khoản payOS)", money(totalNetviet))}
      ${scard("Giải ngân về Ví KOC (Phí KOC)", money(totalKoc))}
      ${scard("Tổng Ký quỹ Escrow (Đã hoàn tất)", money(totalEscrow))}
      ${scard("Hoa hồng chờ đối soát", money(kpiData.pendingSettle))}
    </div>
    <div class="card" style="margin-bottom:16px">
      <h2>🏛️ Nhật ký Phân bổ Giải ngân Đơn hàng (Demo payOS & Ví KOC)</h2>
      <div class="table-wrap" style="margin-top:12px;border:none">
        <table><thead><tr><th>Mã đơn &amp; Doanh nghiệp</th><th>KOC thụ hưởng</th><th>Tổng Escrow</th><th>+ Ví KOC (Phí KOC)</th><th>+ TK NetViet (payOS)</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
        ${rows || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">Chưa có đơn hàng đối soát</td></tr>'}
        </tbody></table>
      </div>
    </div>
    <div class="card"><h2>Ledger tổng (append-only) — Sổ cái hệ thống</h2><div class="table-wrap" style="margin-top:12px;border:none">
      <table><thead><tr><th>Loại</th><th>Số tiền</th><th>Ghi chú</th><th>Thời gian</th></tr></thead><tbody>
      ${led.ledger.length ? led.ledger.map((l) => `<tr><td>${ledgerKind(l.kind)}</td><td class="money">${money(l.amount)}</td><td>${esc(l.note || "")}</td><td class="muted">${fmtDate(l.created_at)}</td></tr>`).join("") : '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Chưa có bút toán</td></tr>'}
      </tbody></table></div></div>
    <div class="card" style="margin-top:16px"><h2>Nhật ký kiểm toán (audit log)</h2><div class="table-wrap" style="margin-top:12px;border:none">
      <table><thead><tr><th>Hành động</th><th>Tham chiếu</th><th>Chi tiết</th><th>Thời gian</th></tr></thead><tbody>
      ${led.audit && led.audit.length ? led.audit.map((a) => `<tr><td><span class="chip n">${esc(a.action)}</span></td><td class="muted">${esc((a.ref || "").slice(0, 16))}</td><td class="muted" style="max-width:220px">${esc(a.detail || "")}</td><td class="muted">${fmtDate(a.created_at)}</td></tr>`).join("") : '<tr><td colspan="4" class="muted" style="text-align:center;padding:20px">Chưa có log</td></tr>'}
      </tbody></table></div></div>`;
  document.getElementById("s-run").addEventListener("click", async () => {
    const r = await post("/api/admin/settle", {});
    toast(
      `Đối soát: ${r.count} khoản ví (${money(r.total)}) · ${r.affOrders} đơn affiliate · Phí NT 1% ${money(r.platformFee)}`,
      "ok",
    );
    settle(el);
  });
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

async function affiliateAdmin(el) {
  const r = await api("/api/admin/affiliate");
  const t = r.totals;
  el.innerHTML = `<h1>🔗 Đơn Affiliate — đối soát với sàn</h1>
    <div class="stat-cards" style="margin:16px 0">
      ${scard("Tổng GMV", money(t.g))}${scard("Hoa hồng KOC", money(t.c))}${scard("Phí nền tảng 1%", money(t.f))}${scard("Đơn nghi ngờ", num(t.flagged))}
    </div>
    <div class="table-wrap"><table><thead><tr><th>Order ID (sàn)</th><th>Thời gian</th><th>KOC</th><th>Booking</th><th>Sàn</th><th>GMV</th><th>Hoa hồng</th><th>Phí 1%</th><th>TT</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
      ${
        r.orders.length
          ? r.orders
              .map(
                (o) => `<tr>
        <td>${esc(o.platform_order_id)} ${o.flagged ? '<span class="chip r">⚠ nghi ngờ</span>' : ""}</td>
        <td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(o.ordered_at || o.created_at)}</td>
        <td>${esc(o.kocname)}</td><td>${esc(o.bcode)}</td><td>${esc(o.platform)}</td>
        <td class="money">${money(o.gmv)}</td><td class="money">${money(o.commission_amount)}</td><td class="money">${money(o.platform_fee)}</td>
        <td>${statusChip(o.status)}</td>
        <td style="width:1%;white-space:nowrap;text-align:right">${["pending", "confirmed"].includes(o.status) ? `<button class="btn ghost sm" data-refund="${o.id}">Hoàn</button>` : ""}</td></tr>`,
              )
              .join("")
          : '<tr><td colspan="10" class="muted" style="text-align:center;padding:20px">Chưa có đơn affiliate</td></tr>'
      }
    </tbody></table></div>
    <p class="hint" style="margin-top:10px">Mỗi bản ghi truy vết về order_id gốc của sàn · chống gian lận (self-referral, click ảo) tự đánh dấu · KOC & DN xem cùng số liệu.</p>`;
  el.querySelectorAll("[data-refund]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Xử lý hoàn đơn này? Doanh số & hoa hồng sẽ bị trừ ngược."))
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

async function kolAdmin(el) {
  const r = await api("/api/kol/requests");
  const prefillBanner = state.kolPrefill
    ? `<div class="tint-box" style="margin-bottom:16px;border-left:4px solid var(--primary);padding:14px">
        <div class="between">
          <div>
            <b>💡 Thông tin từ Lead tư vấn: ${esc(state.kolPrefill.name)}</b>
            <div style="font-size:13px;margin-top:4px">Liên hệ: ${esc(state.kolPrefill.contact)} ${state.kolPrefill.company ? `(${esc(state.kolPrefill.company)})` : ""}</div>
            <div class="muted" style="font-size:12px;margin-top:2px">Nội dung tư vấn: ${esc(state.kolPrefill.note || state.kolPrefill.need)}</div>
          </div>
          <button class="btn ghost sm" id="kol-clear-prefill">Đóng</button>
        </div>
        <p class="hint" style="margin-top:8px">Thông tin điền sẵn từ Lead tư vấn đã sẵn sàng. Admin xem xét và trao đổi để chốt báo giá / phân bổ KOL khi cần.</p>
      </div>`
    : "";
  el.innerHTML = `<h1 class="icon-heading">${icon("kolRequest", "teaser-icon")} Yêu cầu KOL / Nghệ sĩ</h1><p class="muted" style="margin-bottom:16px">Duyệt / báo giá / từ chối. Phân khúc cao cấp có duyệt riêng.</p>
    ${prefillBanner}
    <div class="table-wrap"><table><thead><tr><th>KOL</th><th>Thời gian</th><th>Lĩnh vực</th><th>DN</th><th>Ngân sách</th><th>Báo giá</th><th>TT</th><th>Ghi chú</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${
      r.requests.length
        ? r.requests
            .map(
              (
                q,
              ) => `<tr><td>${esc(q.kolname)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(q.created_at)}</td><td>${esc(q.field)}</td><td>${esc(q.bizname)}</td>
      <td class="money">${money(q.budget)}</td><td class="money">${q.quote ? money(q.quote) : "—"}</td><td>${statusChip({ pending: "pending", quoted: "settling", approved: "confirmed", rejected: "rejected" }[q.status] || q.status)}</td>
      <td class="muted" style="max-width:200px">${esc(q.admin_note || "—")}</td>
      <td style="width:1%;white-space:nowrap;text-align:right"><div class="row" style="flex-wrap:wrap">${q.status === "pending" ? `<button class="btn primary sm" data-quote="${q.id}">Báo giá</button> <button class="btn danger sm" data-reject="${q.id}">Từ chối</button>` : q.status === "quoted" ? `<button class="btn ok sm" data-approve="${q.id}">Chốt</button> <button class="btn danger sm" data-reject="${q.id}">Từ chối</button>` : ""}</div></td></tr>`,
            )
            .join("")
        : '<tr><td colspan="9" class="muted" style="text-align:center;padding:20px">Chưa có yêu cầu KOL</td></tr>'
    }
    </tbody></table></div>`;
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
      const m =
        modal(`<h2>Báo giá KOL</h2><div class="field" style="margin-top:12px"><label>Mức báo giá (đ)</label><input id="kq-amt" type="number"></div>
      <div class="field"><label>Ghi chú</label><textarea id="kq-note" rows="2"></textarea></div>
      <button class="btn primary" id="kq-go">Gửi báo giá</button><button class="btn ghost" id="kq-x" style="margin-top:8px">Hủy</button>`);
      m.querySelector("#kq-x").addEventListener("click", closeModal);
      m.querySelector("#kq-go").addEventListener("click", async () => {
        try {
          await post("/api/admin/kol-action", {
            id: b.dataset.quote,
            action: "quote",
            quote: m.querySelector("#kq-amt").value,
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
  el.querySelectorAll("[data-approve]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await post("/api/admin/kol-action", {
          id: b.dataset.approve,
          action: "approve",
        });
        toast("Đã chốt yêu cầu KOL", "ok");
        kolAdmin(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-reject]").forEach((b) =>
    b.addEventListener("click", async () => {
      const m = modal(`<h2>Từ chối yêu cầu KOL</h2>
      <p class="muted" style="margin:8px 0 12px">Lý do sẽ được hiển thị cho doanh nghiệp đã gửi yêu cầu.</p>
      <div class="field"><label>Lý do từ chối *</label><textarea id="kr-reason" rows="4" maxlength="500" placeholder="Nhập lý do cụ thể…"></textarea></div>
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
const LEAD_NEEDS = [
  "Tư vấn booking marketplace",
  "Tư vấn chiến dịch lớn",
  "Tìm hiểu AI Clone",
  "Hỗ trợ kỹ thuật khác",
];

const LEAD_STATUSES = [
  ["new", "Lead mới"],
  ["contacting", "Đang liên hệ"],
  ["advised", "Đã tư vấn"],
  ["converted", "Chuyển đổi thành công"],
  ["no_need", "Không có nhu cầu"],
];

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
    return "Không thể chuyển trực tiếp từ Lead mới sang trạng thái này. Vui lòng chuyển sang 'Đang liên hệ' trước.";
  }
  if (currentStatus === "contacting" && targetStatus === "converted") {
    return "Vui lòng chuyển sang 'Đã tư vấn' trước khi đánh dấu 'Chuyển đổi thành công'.";
  }
  return true;
}

async function leadsAdmin(el) {
  const qs = leadStatusFilter
    ? `?status=${encodeURIComponent(leadStatusFilter)}`
    : "";
  const r = await api("/api/admin/leads" + qs);
  el.innerHTML = `<div class="between" style="align-items:flex-start;gap:16px;margin-bottom:16px;flex-wrap:wrap">
    <div>
      <h1 class="icon-heading" style="margin:0;white-space:nowrap">${icon("quoteLead", "teaser-icon")} Quản lý Lead tư vấn</h1>
      <p class="muted" style="margin-top:4px;font-size:13px">Tiếp nhận và theo dõi các lượt liên hệ/tư vấn từ website công khai — không phải nơi tạo booking hay báo giá.</p>
    </div>
    <div style="min-width:200px">
      <select id="lead-filter" style="width:100%;max-width:220px;padding:8px 12px;border-radius:8px;font-size:14px"><option value="">Tất cả trạng thái</option>${LEAD_STATUSES.map(([v, l]) => `<option value="${v}" ${leadStatusFilter === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    </div>
  </div>
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Khách hàng</th><th>Thời gian</th><th>Liên hệ</th><th>Nhu cầu</th><th>Nguồn</th><th>Trạng thái</th><th>Tiến độ gần nhất</th><th></th></tr></thead><tbody>
    ${
      r.leads.length
        ? r.leads
            .map((l) => {
              const hasValidNeed = LEAD_NEEDS.includes(l.need);
              const needDisplay = hasValidNeed
                ? `<span class="chip b">${esc(l.need)}</span>`
                : `<span class="chip r">⚠ Thiếu nhu cầu</span>`;
              return `<tr>
      <td><b>${esc(l.name)}</b><div class="muted" style="font-size:11px">${esc(l.company || "Cá nhân")}</div></td>
      <td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(l.created_at)}</td>
      <td><div>${esc(l.phone)}</div><div class="muted" style="font-size:11px">${esc(l.email || "—")}</div></td>
      <td>${needDisplay}</td><td><span class="chip n">${esc(l.source)}</span></td>
      <td>${leadStatusChip(l.status)}</td>
      <td class="muted" style="max-width:190px">${esc(l.latest_note || "Chưa có cập nhật")}<div style="font-size:10px;margin-top:3px">${fmtDate(l.updated_at || l.created_at)}</div></td>
      <td><button class="btn primary sm" data-lead-progress="${l.id}">Theo dõi</button></td></tr>`;
            })
            .join("")
        : '<tr><td colspan="8" class="muted" style="text-align:center;padding:20px">Chưa có lead phù hợp</td></tr>'
    }
    </tbody></table></div>`;
  document.getElementById("lead-filter").addEventListener("change", (e) => {
    leadStatusFilter = e.target.value;
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
  const m = modal(`<h2>Theo dõi Lead · ${esc(lead.name)}</h2>
    <div class="field" style="margin-top:12px"><label>Trạng thái *</label><select id="lp-status">${LEAD_STATUSES.map(([v, l]) => `<option value="${v}" ${lead.status === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label>Nhu cầu tư vấn *</label><select id="lp-need">${LEAD_NEEDS.map((n) => `<option value="${esc(n)}" ${lead.need === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>
    <div id="lp-branch-box"></div>
    <div class="field" style="margin-top:10px"><label>Ghi chú tiến độ *</label><textarea id="lp-note" rows="3" maxlength="1000" placeholder="VD: Đã gọi điện tư vấn nhu cầu, giải đáp thắc mắc cho khách hàng…"></textarea></div>
    <button class="btn primary" id="lp-save">Lưu cập nhật</button><button class="btn ghost" id="lp-close" style="margin-top:8px">Đóng</button>
    <h3 style="margin-top:18px">Lịch sử chăm sóc</h3>
    <div style="max-height:240px;overflow:auto;margin-top:8px">${
      history.activities.length
        ? history.activities
            .map(
              (a) => `<div class="tint-box" style="margin-bottom:8px">
      <div class="between">${leadStatusChip(a.status)}<span class="muted" style="font-size:11px">${fmtDate(a.created_at)}</span></div>
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
        <b>🛒 Tư vấn booking marketplace</b>
        <div style="font-size:13px;margin-top:4px">Khách hàng tự thao tác đặt booking trực tiếp tại trang Marketplace (/marketplace). Hệ thống lưu nhật ký tư vấn.</div>
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
      toast("Đã cập nhật tiến độ lead", "ok");
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
    <div style="margin-top:8px">${
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
        ${!a.booking_id ? `<button class="btn primary sm" data-book="${a.koc_id}">Tạo booking nội bộ</button>` : ""}
        ${!a.quote_kocs && a.booking_id && ["pending", "confirmed", "brief_review", "revision_requested"].includes(a.booking_status) ? `<button class="btn primary sm" data-script="${a.booking_id}" data-current="${esc(a.aiclone_script || "")}">✍️ Nội dung sản xuất (tùy chọn)</button>` : ""}
        ${!a.quote_kocs && a.booking_id && ["pending", "confirmed", "brief_review", "producing", "revision_requested"].includes(a.booking_status) ? `<button class="btn navy sm" data-deliver="${a.booking_id}" data-target="business" data-code="${esc(a.booking_code || "")}" data-recipient="${esc(a.business_name || "Doanh nghiệp")}">📤 Giao video cho doanh nghiệp</button>` : ""}
        ${a.booking_status === "pending_business_review" ? '<span class="chip w">Đã giao doanh nghiệp duyệt</span>' : ""}
        ${["business_approved", "pending_koc_review"].includes(a.booking_status) ? '<span class="chip w">Đã tự động chuyển KOC duyệt</span>' : ""}
      </div></div>
      ${a.requirements ? `<div class="tint-box" style="margin-top:10px"><b>Brief:</b> ${esc(a.requirements)}</div>` : ""}
      ${
        a.quote_kocs
          ? `<div class="tint-box" style="margin-top:10px"><b>KOC và tiến độ giao video trong booking</b>
        <div style="margin-top:8px">${a.quote_kocs
          .map(
            (
              k,
            ) => `<div class="between" style="padding:10px 0;border-top:1px solid var(--border);gap:12px">
          <div class="row"><img class="avatar" src="${esc(k.avatar || "")}"><div>
            <div class="row"><b>${esc(k.name)}</b>${tierBadge(k.tier)}${statusChip(k.booking_status)}</div>
            <div class="muted" style="font-size:11px">${esc(k.booking_code || "")} · ${esc(k.province || "")}</div>
          </div></div>
          <div class="row" style="flex-wrap:wrap;justify-content:flex-end">
            ${["pending", "confirmed", "brief_review", "revision_requested"].includes(k.booking_status) ? `<button class="btn primary sm" data-script="${k.booking_id}" data-current="${esc(k.aiclone_script || "")}">✍️ Nội dung sản xuất</button>` : ""}
            ${["pending", "confirmed", "brief_review", "producing", "revision_requested"].includes(k.booking_status) ? `<button class="btn navy sm" data-deliver="${k.booking_id}" data-target="business" data-code="${esc(k.booking_code || "")}" data-recipient="${esc(k.business_name || "Doanh nghiệp")}">📤 Giao video cho doanh nghiệp</button>` : ""}
            ${k.booking_status === "pending_business_review" ? '<span class="chip w">Doanh nghiệp đang duyệt</span>' : ""}
            ${k.booking_status === "business_approved" ? `<button class="btn ok sm" data-deliver="${k.booking_id}" data-target="koc" data-code="${esc(k.booking_code || "")}" data-recipient="${esc(k.name || "KOC")}">📤 Giao video cho KOC</button>` : ""}
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
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px;margin-top:12px">
        <div class="field"><label>Phí sản xuất video (đ)</label><input class="aiq-part" id="aiq-production" type="number" min="0" value="${estimatedProduction}"></div>
        <div class="field"><label>Phí KOC (đ)</label><input class="aiq-part" id="aiq-koc" type="number" min="0" value="0"></div>
        <div class="field"><label>Phí nền tảng (đ)</label><input class="aiq-part" id="aiq-platform" type="number" min="0" value="${estimatedPlatform}"></div>
        <div class="field"><label>Chi phí bổ sung (đ)</label><input class="aiq-part" id="aiq-additional" type="number" min="0" value="0"></div>
      </div>
      <div class="tint-box between"><b>Tổng báo giá</b><b class="money" id="aiq-total">0đ</b></div>
      <div class="field"><label>Ghi chú gửi doanh nghiệp</label><textarea id="aiq-note" rows="3" maxlength="1000" placeholder="Hạng mục sản xuất, thời gian thực hiện, điều kiện áp dụng…"></textarea></div>
      <button class="btn primary" id="aiq-send">Gửi báo giá cho doanh nghiệp</button>
      <button class="btn ghost" id="aiq-cancel" style="margin-top:8px">Hủy</button>`);
      const quoteParts = () => ({
        production_fee: Number(m.querySelector("#aiq-production").value || 0),
        koc_fee: Number(m.querySelector("#aiq-koc").value || 0),
        platform_fee: Number(m.querySelector("#aiq-platform").value || 0),
        additional_fee: Number(m.querySelector("#aiq-additional").value || 0),
      });
      const updateTotal = () => {
        const parts = quoteParts();
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
      <div class="field" style="margin-top:12px"><label>Nội dung kịch bản</label><textarea id="ai-script" rows="12">${esc(button.dataset.current || "")}</textarea></div>
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
      const target = b.dataset.target;
      const targetLabel = target === "koc" ? "KOC" : "doanh nghiệp";
      modal(`<h2>Giao video AI Clone cho ${targetLabel}</h2>
      <div class="tint-box"><b>${esc(b.dataset.code)}</b> · ${esc(b.dataset.recipient)}</div>
      <p class="muted" style="margin-top:10px">${
        target === "koc"
          ? "Đây là bước giao riêng cho KOC sau khi doanh nghiệp đã duyệt. KOC sẽ được thông báo để xem và phê duyệt quyền hình ảnh."
          : "Video chỉ được giao cho doanh nghiệp xem và duyệt. Hệ thống chưa gửi video này cho KOC."
      }</p>
      <div class="field" style="margin-top:12px"><label>Link video bản dựng</label><input id="dv-link" type="url" placeholder="https://…/video.mp4"></div>
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
            target,
            video_link: videoLink,
          });
          toast(`Đã giao video riêng cho ${targetLabel} duyệt`, "ok");
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
  el.innerHTML = `<div class="between"><h1>Khung giá 4 hạng</h1><button class="btn primary sm" id="tr-save">💾 Lưu khung giá</button></div>
    <p class="muted" style="margin-bottom:16px">KOC niêm yết giá phải nằm trong khung của hạng. Sau khi lưu, bảng giá KOC hiện có sẽ được kiểm tra lại theo khung mới.</p>
    <div class="table-wrap"><table><thead><tr><th>Hạng</th><th>Follower tối thiểu</th><th>Follower tối đa</th><th>Giá tối thiểu (đ)</th><th>Giá tối đa (đ)</th><th>Phí dịch vụ (%)</th></tr></thead><tbody>
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
        <li>Hạng cao hơn: khung giá cao hơn, ưu tiên hiển thị trên marketplace</li>
        <li>Phí dịch vụ giảm dần theo hạng (Nano 5% → Macro 3%)</li>
        <li>Thăng hạng dựa trên: follower, số booking hoàn thành, điểm đánh giá</li>
      </ul></div>`;
  document.getElementById("tr-save").addEventListener("click", async () => {
    if (
      !confirm(
        "Xác nhận lưu khung giá mới? Booking mới và onboarding KOC mới sẽ áp dụng ngay.",
      )
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
      btn.textContent = "💾 Lưu khung giá";
    }
  });
}
