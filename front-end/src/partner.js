import { api } from "./api.js";
import {
  money,
  num,
  esc,
  fmtDate,
  tierBadge,
  spinner,
  empty,
  avatarUrl,
} from "./ui.js";
import { state, logout, enhancePortal } from "./app.js";
import { brandLogo, icon } from "./icons.js";
import { autoAnimate } from "./animations.js";

const NAV = [
  ["#/dashboard", icon("home", "sidebar-icon"), "Trang chủ"],
  ["#/kocs", icon("kocApp", "sidebar-icon"), "KOC"],
  ["#/report", icon("report", "sidebar-icon"), "Báo cáo doanh thu"],
];

export async function renderPartner(el, hash) {
  const page = hash.replace("#/", "") || "dashboard";
  const active =
    "#/" + (["dashboard", "kocs", "report"].includes(page) ? page : "dashboard");
  el.innerHTML = `<div class="portal business-portal">
    <div class="sidebar"><div class="brand"><a class="portal-brand-link" href="#/dashboard" aria-label="KOC Việt — Cổng đối tác">${brandLogo()}</a></div>
      <nav class="portal-nav">${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}">${n[1]}<span>${n[2]}</span></a>`).join("")}</nav><button class="btn ghost sm portal-sidebar-logout" id="pn-logout">Đăng xuất</button></div>
    <div class="main"><div class="topbar portal-topbar">
      <div class="portal-context"><span class="portal-context-label">KOC VIET</span><h2>Cổng đối tác</h2></div>
      <div class="portal-account"><div class="portal-account-avatar" aria-hidden="true">${esc((state.user.name || "P").charAt(0).toUpperCase())}</div><div class="portal-account-meta"><strong>${esc(state.user.name)}</strong><span>Đối tác</span></div></div></div>
      <div class="content" id="pn-view"></div></div></div>`;
  document.getElementById("pn-logout").addEventListener("click", logout);
  enhancePortal();
  const view = document.getElementById("pn-view");
  try {
    if (active === "#/dashboard") await dashboard(view);
    else if (active === "#/kocs") await kocsPage(view);
    else if (active === "#/report") await report(view);
    autoAnimate(view);
  } catch (e) {
    view.innerHTML = empty("⚠️", e.message);
  }
}

function stat(l, v, sub = "") {
  return `<div class="card"><div class="muted">${l}</div><div style="font-size:24px;font-weight:800;margin-top:4px" class="money">${v}</div>${sub ? `<div class="muted" style="font-size:12px;margin-top:2px">${sub}</div>` : ""}</div>`;
}

async function dashboard(el) {
  el.innerHTML = spinner();
  const r = await api("/api/partner/overview");
  const pct = Math.round(Number(r.partner.fee_rate || 0) * 100);
  el.innerHTML = `<h1>Xin chào, ${esc(state.user.name)}</h1>
    <p class="muted" style="margin-top:4px">Bạn được chia ${pct}% của phí dịch vụ 5% trên mỗi booking hoàn tất của các KOC thuộc đối tác này.</p>
    <div class="stat-cards" style="margin-top:16px">
      ${stat("KOC đang quản lý", num(r.memberCount))}
      ${stat("Tổng hoa hồng đã tích luỹ", money(r.earnedTotal), `${num(r.earnedBookings)} booking`)}
      ${stat("Số dư chờ chi trả", money(r.walletRevenue))}
      ${stat("Tỷ lệ chia sẻ", pct + "%", "của phí dịch vụ 5%")}
    </div>
    <div class="card" style="margin-top:20px">
      <div class="between"><h2>Hoa hồng gần đây</h2><a href="#/report" class="btn ghost sm">Xem báo cáo đầy đủ →</a></div>
      <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Booking</th><th>KOC</th><th>Bạn nhận</th><th>Thời gian</th></tr></thead><tbody>
        ${
          r.recentEarnings.length
            ? r.recentEarnings.map((e) => `<tr>
          <td>${esc(e.booking_code || e.booking_id)}</td><td>${esc(e.koc_name || "—")}</td>
          <td class="money">${money(e.amount)}</td>
          <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(e.created_at)}</td>
        </tr>`).join("")
            : `<tr><td colspan="4">${empty("💸", "Chưa phát sinh hoa hồng")}</td></tr>`
        }
      </tbody></table></div>
    </div>`;
}

async function kocsPage(el) {
  el.innerHTML = spinner();
  const r = await api("/api/partner/kocs");
  const kocs = r.kocs || [];
  el.innerHTML = `<div class="between"><div><h1>KOC thuộc đối tác</h1>
      <p class="muted">Danh sách KOC hiện đang được gán cho bạn.</p></div>
      <span class="chip b">${num(kocs.length)} KOC</span></div>
    <div class="table-wrap" style="margin-top:16px"><table><thead><tr>
      <th>KOC</th><th>Hạng</th><th>Khu vực</th><th>Booking hoàn tất</th><th>Hoa hồng từ KOC này</th><th>Ngày gán</th>
    </tr></thead><tbody>
      ${
        kocs.length
          ? kocs.map((k) => `<tr>
        <td><div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}" alt=""><b>${esc(k.name)}</b></div></td>
        <td>${tierBadge(k.tier)}</td>
        <td>${esc(k.province || "—")}</td>
        <td>${num(k.completed_bookings)}</td>
        <td class="money">${money(k.earned)}</td>
        <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(k.assigned_at)}</td>
      </tr>`).join("")
          : `<tr><td colspan="6">${empty("🙋", "Chưa có KOC nào được gán")}</td></tr>`
      }
    </tbody></table></div>`;
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
          ? r.rows.map((row) => `<tr>
        <td>${esc(row.booking_code || row.booking_id)}</td><td>${esc(row.koc_name || "—")}</td>
        <td class="money">${money(row.base_service_fee)}</td>
        <td>${Math.round(Number(row.rate) * 1000) / 10}%</td>
        <td class="money">${money(row.amount)}</td>
        <td class="muted" style="font-size:11px;white-space:nowrap">${fmtDate(row.created_at)}</td>
      </tr>`).join("")
          : `<tr><td colspan="6">${empty("💸", "Chưa có dữ liệu")}</td></tr>`
      }
    </tbody></table></div>
    ${pagerHtml(r.page, r.pages)}`;
  el.querySelectorAll("[data-pg]").forEach((b) =>
    b.addEventListener("click", () => report(el, Number(b.dataset.pg))),
  );
}

function pagerHtml(page, pages) {
  if (pages <= 1) return "";
  let btns = `<button class="btn ghost sm" ${page <= 1 ? "disabled" : ""} data-pg="${page - 1}">‹ Trước</button>`;
  btns += `<span class="muted" style="margin:0 10px">Trang ${page}/${pages}</span>`;
  btns += `<button class="btn ghost sm" ${page >= pages ? "disabled" : ""} data-pg="${page + 1}">Sau ›</button>`;
  return `<div style="margin-top:12px;text-align:center">${btns}</div>`;
}
