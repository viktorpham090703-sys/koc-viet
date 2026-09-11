import { api, post } from "./api.js";
import {
  money,
  num,
  esc,
  fmtDateTime,
  dateTimeStack,
  stars,
  statusChip,
  spinner,
  empty,
  toast,
  modal,
  closeModal,
  confirmDialog,
  promptDialog,
  tierBadge,
  skeletonPage,
  skeletonStatCards,
  skeletonTable,
  skeletonKocGrid,
  avatarUrl,
} from "./ui.js";
import { state, logout, enhancePortal } from "./app.js";
import { renderMarketplaceEmbed } from "./public.js";
import { brandLogo, icon } from "./icons.js";
import { autoAnimate } from "./animations.js";
import { socialProfileUrl } from "./social-channels.js";
import { mountListSearch } from "./list-search.js";

const BOOKING_PAYMENT_NOTICE =
  "Phí booking được trừ từ số dư khả dụng của bạn và giữ an toàn cho đến khi KOC hoàn thành booking và bạn duyệt bài đăng. KOC sẽ nhận được phí ngay sau khi bạn xác nhận booking hoàn thành.";

function businessSearchForm(key, label, placeholder, value) {
  return `<form class="list-search-toolbar" id="${key}-form" role="search">
    <div class="list-search-field"><label for="${key}">${label}</label><input type="search" id="${key}" name="search" value="${esc(value)}" placeholder="${placeholder}" maxlength="120"></div>
    <button class="btn primary sm" type="submit">Tìm kiếm</button>
    <button class="btn ghost sm" type="button" data-clear-search ${value ? "" : "hidden"}>Xóa tìm kiếm</button>
  </form>`;
}

function bindBusinessSearch(el, key, reload) {
  const form = el.querySelector(`#${key}-form`);
  const input = form.querySelector("input");
  const run = async (query) => {
    form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    input.disabled = true;
    try {
      await reload(query);
      el.querySelector(`#${key}`)?.focus({ preventScroll: true });
    } catch (error) {
      toast(error.message, "err");
    } finally {
      form.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      input.disabled = false;
    }
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run(input.value.trim());
  });
  form.querySelector("[data-clear-search]").addEventListener("click", () => run(""));
  input.addEventListener("search", () => { if (!input.value) run(""); });
}

const NAV = [
  ["#/dashboard", icon("overview", "sidebar-icon"), "Tổng quan"],
  ["#/find", icon("search", "sidebar-icon"), "Tìm KOC"],
  ["#/orders", icon("booking", "sidebar-icon"), "Booking"],
  ["#/products", icon("productData", "sidebar-icon"), "Sản phẩm"],
  ["#/aiclone-booking", icon("aiClone", "sidebar-icon"), "Booking AI Clone"],
  ["#/wallet", icon("wallet", "sidebar-icon"), "Ví doanh nghiệp"],
  ["#/kol", icon("kolRequest", "sidebar-icon"), "KOL / Nghệ sĩ"],
  ["#/campaigns", icon("campaign", "sidebar-icon"), "Chiến dịch lớn"],
  ["#/report", icon("report", "sidebar-icon"), "Báo cáo"],
  ["#/profile", icon("business", "sidebar-icon"), "Hồ sơ DN"],
];

export async function renderBusiness(el, hash) {
  const params = new URLSearchParams(location.search);
  const routeParam = params.get("app_route") || params.get("vnp_route");
  let defaultPage = "dashboard";
  if (routeParam && ["wallet", "orders"].includes(routeParam)) {
    defaultPage = routeParam;
  } else if (params.get("vnp_ResponseCode") || params.get("payos")) {
    defaultPage = "wallet";
  }
  const cleanHash = (hash || "").split("?")[0];
  const rawPage = cleanHash.replace("#/", "") || defaultPage;
  const page = [
    "dashboard",
    "find",
    "orders",
    "products",
    "aiclone-booking",
    "wallet",
    "kol",
    "campaigns",
    "report",
    "profile",
  ].includes(rawPage)
    ? rawPage
    : defaultPage;
  const active = "#/" + page;
  el.innerHTML = `<div class="portal business-portal">
    ${sidebar(active)}
    <div class="main"><div class="topbar portal-topbar">
      <div class="portal-context"><span class="portal-context-label">KOC VIET</span><h2>Trang doanh nghiệp</h2></div>
      <div class="portal-account"><a class="portal-account-identity" href="#/profile" aria-label="Mở hồ sơ doanh nghiệp"><div class="portal-account-avatar" aria-hidden="true">${esc((state.user.name || "D").charAt(0).toUpperCase())}</div><div class="portal-account-meta"><strong>${esc(state.user.name)}</strong><span>Doanh nghiệp</span></div></a></div></div>
      <div class="content" id="bz-view"></div></div></div>`;
  document.getElementById("bz-logout").addEventListener("click", logout);
  void hydrateBusinessAccount(el);
  enhancePortal();
  const view = document.getElementById("bz-view");
  try {
    if (active === "#/dashboard") await dashboard(view);
    else if (active === "#/find") await find(view);
    else if (active === "#/orders") await orders(view);
    else if (active === "#/products") await products(view);
    else if (active === "#/aiclone-booking") await aiCloneBooking(view);
    else if (active === "#/wallet") await wallet(view);
    else if (active === "#/kol") await kolPage(view);
    else if (active === "#/campaigns") await campaigns(view);
    else if (active === "#/report") await report(view);
    else if (active === "#/profile") await profile(view);
    autoAnimate(view);
  } catch (e) {
    view.innerHTML = empty(icon("complaint", "teaser-icon"), e.message);
  }
}

function sidebar(active) {
  return `<div class="sidebar"><div class="brand"><a class="portal-brand-link" href="#/dashboard" aria-label="KOC Việt — Trang doanh nghiệp">${brandLogo()}</a></div>
    <nav class="portal-nav">${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}">${n[1]}<span>${n[2]}</span></a>`).join("")}</nav><button class="btn ghost sm portal-sidebar-logout" id="bz-logout">Đăng xuất</button></div>`;
}

async function hydrateBusinessAccount(root) {
  try {
    const { business } = await api("/api/business/profile");
    const account = root.querySelector(".portal-account-identity");
    const avatar = account?.querySelector(".portal-account-avatar");
    const name = account?.querySelector(".portal-account-meta strong");
    if (!account || !avatar || !business) return;
    if (name) name.textContent = business.name || state.user.name;
    account.setAttribute(
      "aria-label",
      `Mở hồ sơ doanh nghiệp ${business.name || state.user.name}`,
    );
    if (business.avatar) {
      const image = document.createElement("img");
      image.src = business.avatar;
      image.alt = `Logo ${business.name || "doanh nghiệp"}`;
      image.addEventListener("error", () => image.remove(), { once: true });
      avatar.replaceChildren(image);
    }
  } catch (_) {}
}

async function dashboard(el) {
  const r = await api("/api/business/report");
  const t = r.totals;
  el.innerHTML = `<h1>Xin chào, ${esc(state.user.name)}</h1>
    <div class="stat-cards" style="margin-top:16px">
      ${stat("Tổng chi booking", money(t.spend))}
      ${stat("Lượt nhấp vào sản phẩm", num(t.clicks))}
      ${stat("Đơn hàng", num(t.orders))}
      ${stat("Phí dịch vụ (5%)", money(t.fee))}
    </div>
    <div class="card" style="margin-top:20px">
      <div class="between"><h2>Booking gần đây</h2><a href="#/find" class="btn primary sm">+ Đặt booking mới</a></div>
      <div id="bz-recent" style="margin-top:12px">${skeletonTable(3)}</div>
    </div>`;
  const rec = await api("/api/bookings");
  const recentBookings = groupBusinessBookings(rec.bookings || []).slice(0, 6);
  document.getElementById("bz-recent").innerHTML = recentBookings.length
    ? tableBookings(recentBookings)
    : empty("📋", "Chưa có booking");
  bindOrderRows(el);
}
function stat(l, v) {
  return `<div class="card"><div class="muted">${l}</div><div style="font-size:24px;font-weight:800;margin-top:4px" class="money">${v}</div></div>`;
}

async function aiCloneBooking(el) {
  let catalog = await api("/api/aiclone/eligible-kocs?page=1&per=12");
  const selected = new Map();
  const categories = catalog.filters?.categories || [];
  el.innerHTML = `<div class="between" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="icon-heading">${icon("aiClone", "teaser-icon")} Booking AI Clone Avatar</h1>
        <p class="muted">Tạo chiến dịch và tự động sản xuất video quảng cáo với AI Clone Avatar của KOC Việt.</p>
      </div>
      <a class="btn ghost sm" href="#/orders">📋 Theo dõi đơn booking</a>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">
      <!-- Left Panel: KOC Selection Workspace -->
      <div class="card" style="padding:16px">
        <div class="between" style="align-items:center;margin-bottom:12px">
          <b class="required-label">🎯 Chọn KOC có AI Clone Avatar</b>
          <span class="hint" style="margin:0">Đã chọn: <b id="ac-count" style="color:var(--primary);font-size:14px">0</b>/10 KOC</span>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
          <input id="ac-search" placeholder="🔍 Tên KOC…">
          <select id="ac-tier"><option value="">Tất cả hạng</option>${(catalog.filters?.tiers || []).map((x) => `<option>${esc(x)}</option>`).join("")}</select>
          <select id="ac-province"><option value="">Tất cả khu vực</option>${(catalog.filters?.provinces || []).map((x) => `<option>${esc(x)}</option>`).join("")}</select>
          <select id="ac-filter-category"><option value="">Tất cả ngành hàng</option>${categories.map((x) => `<option>${esc(x)}</option>`).join("")}</select>
        </div>
        <div id="ac-kocs" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px;max-height:580px;overflow-y:auto;padding-right:4px"></div>
        <div id="ac-pagination" class="row" style="justify-content:center;margin-top:12px"></div>
      </div>

      <!-- Right Panel: Campaign Brief & Quote Request -->
      <div class="card" style="padding:16px">
        <b>📝 Cấu hình Brief & Nội dung Video</b>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px;margin-top:12px">
          <div class="field"><label class="required-label">Loại nội dung</label><select id="ac-format"><option value="review">Đánh giá sản phẩm</option><option value="affiliate">Tiếp thị liên kết</option><option value="combo">Đánh giá + tiếp thị liên kết</option></select></div>
          <div class="field"><label class="required-label">Ngành hàng</label><select id="ac-category">${categories.map((x) => `<option>${esc(x)}</option>`).join("")}</select></div>
          <div class="field"><label class="required-label">Link thông tin sản phẩm</label><input id="ac-product-link" placeholder="https://…"></div>
          <div class="field"><label class="required-label">Deadline bàn giao</label><input id="ac-deadline" type="date"></div>
          <div class="field"><label class="required-label">Quy mô video AI</label><select id="ac-scope">
            <option value="short">Review ngắn · 15–30 giây</option>
            <option value="standard" selected>Review tiêu chuẩn · 30–60 giây</option>
            <option value="detailed">Review chi tiết · 60–90 giây</option>
          </select></div>
          <div class="field"><label class="required-label">Số lượng video / KOC</label><input id="ac-video-quantity" type="number" min="1" max="100" value="1"></div>
        </div>
        <p class="hint">Admin sẽ đánh giá ngành hàng, số lượng video và yêu cầu nội dung để gửi báo giá chính thức.</p>
        <div class="field"><label>Thông điệp chính</label><input id="ac-message" maxlength="500" placeholder="Thông điệp cốt lõi bắt buộc có trong video"></div>
        <div class="field"><label class="required-label">Brief / Yêu cầu kịch bản</label><textarea id="ac-brief" rows="3" placeholder="Mô tả sản phẩm, đối tượng người xem, giọng điệu, điểm cần nhấn mạnh…"></textarea></div>
        
        <div id="ac-affiliate" style="display:none;margin-top:8px">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px">
            <div class="field"><label class="required-label">Sàn áp dụng</label><select id="ac-platform">${PLATFORMS.map((x) => `<option>${x}</option>`).join("")}</select></div>
            <div class="field"><label class="required-label">Hoa hồng bán hàng (%)</label><input id="ac-rate" type="number" min="1" max="90"></div>
          </div>
          <div class="field"><label class="required-label">Link sản phẩm trên sàn</label><input id="ac-product-url" placeholder="https://…"></div>
        </div>

        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
          <b style="font-size:14px">📩 Gửi yêu cầu báo giá</b>
          <div class="tint-box" id="ac-quote" style="margin-top:8px" aria-live="polite">Vui lòng chọn KOC ở danh sách bên trái để gửi yêu cầu báo giá.</div>
          <div class="row" style="gap:8px;margin-top:12px">
            <button class="btn primary" id="ac-submit" style="flex:1;padding:12px;font-weight:600">📩 Gửi yêu cầu báo giá cho Admin</button>
          </div>
          <p class="hint" style="margin-top:8px">Đội ngũ hỗ trợ sẽ tiếp nhận yêu cầu, lập báo giá chính thức và gửi lại để doanh nghiệp thanh toán.</p>
        </div>
      </div>
    </div>`;

  const list = el.querySelector("#ac-kocs");
  const renderKocs = () => {
    list.innerHTML =
      catalog.kocs
        .map(
          (
            k,
          ) => `<button type="button" class="card ${selected.has(k.id) ? "selected" : ""}" data-koc="${k.id}" style="text-align:left;padding:10px;border:${selected.has(k.id) ? "2px solid var(--primary)" : "1px solid var(--border)"}">
      <div class="row" style="gap:8px"><img class="avatar" src="${esc(avatarUrl(k.avatar))}" style="width:40px;height:40px"><div><b style="font-size:13px">${esc(k.name)}</b><div>${tierBadge(k.tier)}</div></div></div>
      <div class="muted" style="font-size:11px;margin-top:6px">${esc(k.province || "")} · ${num(k.followers)} người theo dõi</div>
      <div class="muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.categories.map(esc).join(", ")}</div>
      <div style="margin-top:6px"><span class="chip g" style="font-size:10px" title="Đã đăng ký AI Clone. Admin sẽ kiểm tra mức độ phù hợp với ngành hàng trong brief.">Đã đăng ký AI Clone</span></div></button>`,
        )
        .join("") || empty("", "Không tìm thấy KOC đã đăng ký AI Clone");
    list.querySelectorAll("[data-koc]").forEach((button) =>
      button.addEventListener("click", () => {
        const id = button.dataset.koc;
        if (selected.has(id)) selected.delete(id);
        else if (selected.size < 10)
          selected.set(
            id,
            catalog.kocs.find((k) => k.id === id),
          );
        else return toast("Chỉ chọn tối đa 10 KOC", "err");
        renderKocs();
        updateQuote();
      }),
    );
    el.querySelector("#ac-count").textContent = selected.size;
  };
  const updateQuote = () => {
    el.querySelector("#ac-quote").textContent = selected.size
      ? `Đã chọn ${selected.size} KOC. Admin sẽ kiểm tra brief và gửi báo giá chính thức. Bạn chưa cần thanh toán ở bước này.`
      : "Vui lòng chọn KOC ở danh sách bên trái để gửi yêu cầu báo giá.";
  };
  const renderPagination = () => {
    const box = el.querySelector("#ac-pagination");
    const page = Number(catalog.page || 1);
    const pages = Number(catalog.pages || 1);
    box.innerHTML = `<button class="btn ghost sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>← Trước</button>
      <span class="muted">Trang ${page}/${pages} · ${num(catalog.total || 0)} KOC</span>
      <button class="btn ghost sm" data-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Sau →</button>`;
    box
      .querySelectorAll("[data-page]:not([disabled])")
      .forEach((button) =>
        button.addEventListener("click", () =>
          loadKocs(Number(button.dataset.page)),
        ),
      );
  };
  const loadKocs = async (page = 1) => {
    const params = new URLSearchParams({
      page: String(page),
      per: "12",
      q: el.querySelector("#ac-search").value.trim(),
      tier: el.querySelector("#ac-tier").value,
      province: el.querySelector("#ac-province").value,
      category: el.querySelector("#ac-filter-category").value,
    });
    list.innerHTML = skeletonKocGrid(6);
    try {
      catalog = await api(`/api/aiclone/eligible-kocs?${params}`);
      renderKocs();
      renderPagination();
    } catch (error) {
      list.innerHTML = empty("", "Không tải được danh sách KOC");
      toast(error.message, "err");
    }
  };
  let searchTimer;
  el.querySelector("#ac-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadKocs(1), 250);
  });
  ["#ac-tier", "#ac-province", "#ac-filter-category"].forEach((selector) =>
    el.querySelector(selector).addEventListener("change", () => loadKocs(1)),
  );
  el.querySelector("#ac-format").addEventListener("change", (e) => {
    el.querySelector("#ac-affiliate").style.display = [
      "affiliate",
      "combo",
    ].includes(e.target.value)
      ? "block"
      : "none";
    updateQuote();
  });
  el.querySelector("#ac-category").addEventListener("change", updateQuote);
  ["#ac-scope", "#ac-video-quantity"].forEach((selector) =>
    el.querySelector(selector).addEventListener("input", updateQuote),
  );
  el.querySelector("#ac-deadline").min = new Date().toISOString().slice(0, 10);
  renderKocs();
  renderPagination();

  el.querySelector("#ac-submit").addEventListener("click", async () => {
    if (!selected.size) return toast("Chọn ít nhất 1 KOC", "err");
    const format = el.querySelector("#ac-format").value;
    const payload = {
      koc_ids: [...selected.keys()],
      format,
      category: el.querySelector("#ac-category").value,
      product_link: el.querySelector("#ac-product-link").value.trim(),
      deadline: el.querySelector("#ac-deadline").value,
      message: el.querySelector("#ac-message").value.trim(),
      requirements: el.querySelector("#ac-brief").value.trim(),
      scope: el.querySelector("#ac-scope").value,
      video_quantity: Number(el.querySelector("#ac-video-quantity").value),
    };
    if (["affiliate", "combo"].includes(format)) {
      payload.platform = el.querySelector("#ac-platform").value;
      payload.product_url = el.querySelector("#ac-product-url").value.trim();
      payload.commission_rate = Number(el.querySelector("#ac-rate").value);
    }
    const button = el.querySelector("#ac-submit");
    button.disabled = true;
    try {
      const result = await post("/api/aiclone/bookings", payload);
      toast(
        `Đã gửi ${result.bookings.length} yêu cầu · Admin sẽ gửi báo giá chính thức`,
        "ok",
      );
      location.hash = "#/orders";
    } catch (e) {
      toast(e.message, "err");
      button.disabled = false;
    }
  });
}

async function find(el) {
  el.innerHTML = `<h1>Tìm & đặt booking KOC</h1><p class="muted" style="margin-bottom:16px">Chọn KOC → đặt gói theo bảng giá niêm yết (không thương lượng).</p><div id="mp-embed"></div>`;
  renderMarketplaceEmbed(document.getElementById("mp-embed"), (kocId) =>
    openBookingForm(kocId, el),
    (kocId) => openKocProfile(kocId, el),
  );
}

const PLATFORMS = ["Shopee", "Lazada", "TikTok Shop", "Tiki", "Facebook Shop"];

function closeKocProfileModal(dialog, afterClose) {
  const backdrop = dialog?.closest(".modal-bg");
  if (!dialog || !backdrop || backdrop.classList.contains("is-koc-profile-closing")) return;
  backdrop.classList.add("is-koc-profile-closing");
  dialog.classList.add("is-koc-profile-closing");
  window.setTimeout(() => {
    closeModal();
    if (afterClose) afterClose();
  }, 280);
}

async function openKocProfile(kocId, el) {
  let koc;
  try {
    ({ koc } = await api("/api/koc/" + kocId));
  } catch (error) {
    return toast(error.message, "err");
  }
  const socials = (koc.socials || []).map((social) => ({
    ...social,
    url: socialProfileUrl(social),
  }));
  const m = modal(`
    <section class="business-koc-profile">
      <div class="business-koc-profile-head">
        ${koc.cover ? `<img class="business-koc-profile-cover" src="${esc(koc.cover)}" alt="Ảnh bìa ${esc(koc.name)}" onerror="this.hidden=true">` : ""}
        <span class="business-koc-profile-overlay" aria-hidden="true"></span>
        <button data-modal-dismiss type="button" class="business-koc-profile-close" id="koc-profile-close" aria-label="Đóng hồ sơ">×</button>
        <div class="business-koc-profile-hero-content">
          <img class="business-koc-profile-avatar" src="${esc(avatarUrl(koc.avatar))}" alt="Ảnh đại diện ${esc(koc.name)}">
          <div class="business-koc-profile-identity">
            <div class="row">${tierBadge(koc.tier)} ${koc.followers_verified ? '<span class="chip g">✓ Đã xác minh</span>' : ''}</div>
            <h2>${esc(koc.name)}</h2>
            <p>📍 ${esc(koc.province || "Chưa cập nhật")}</p>
            <div class="business-koc-profile-rating">${stars(koc.rating)} <span>· ${num(koc.completed_bookings)} booking hoàn thành</span></div>
          </div>
        </div>
      </div>
      <div class="business-koc-profile-stats">
        <div><strong>${num(koc.followers)}</strong><span>Người theo dõi</span></div>
        <div><strong>${Number(koc.rating || 0).toFixed(1)}/5</strong><span>Đánh giá</span></div>
      </div>
      <div class="business-koc-profile-section">
        <h3>Giới thiệu</h3>
        <p>${esc(koc.bio || "KOC chưa cập nhật phần giới thiệu.")}</p>
        <div class="business-koc-categories">${(koc.categories || []).map((category) => `<span class="chip">${esc(category)}</span>`).join("")}</div>
      </div>
      <div class="business-koc-profile-grid">
        <div class="business-koc-profile-section">
          <h3>Kênh mạng xã hội</h3>
          ${socials.length ? `<div class="business-koc-socials">${socials.map((social) => social.url
            ? `<a href="${esc(social.url)}" target="_blank" rel="noopener noreferrer"><span><b>${esc(social.platform || "Mạng xã hội")}</b><small>${esc(social.handle)}</small></span><strong>${num(social.followers || koc.followers)} follower ↗</strong></a>`
            : `<div><span><b>${esc(social.platform || "Mạng xã hội")}</b><small>${esc(social.handle)}</small></span><strong>${num(social.followers || koc.followers)} follower</strong></div>`).join("")}</div>`
            : '<p class="muted">KOC chưa cập nhật kênh mạng xã hội.</p>'}
          <aside class="business-koc-off-platform-warning" role="note">
            <span class="business-koc-off-platform-warning-icon" aria-hidden="true">⚠</span>
            <div>
              <strong>Giao dịch an toàn trên KOC Việt</strong>
              <p><b>Lưu ý:</b> Tự thoả thuận booking ngoài app với KOC sẽ có giá cao hơn trong app. Doanh nghiệp và KOC đều không được bảo vệ trước các rủi ro về giao dịch và tự chịu trách nhiệm trước các nguy cơ lừa đảo cùng những thiệt hại liên quan. Khi bị phát hiện, doanh nghiệp và KOC đều bị cấm vĩnh viễn trên KOCViet.</p>
            </div>
          </aside>
        </div>
        <div class="business-koc-profile-section">
          <h3>Giá booking niêm yết</h3>
          ${(koc.prices || []).length ? `<div class="business-koc-prices">${koc.prices.map((price) => `<div><span>${esc(price.category)}</span><b>${money(price.price)}</b></div>`).join("")}</div>` : '<p class="muted">Chưa có gói booking đang mở.</p>'}
        </div>
      </div>
      <div class="business-koc-profile-actions">
        <span class="business-koc-profile-assurance">✓ Giá minh bạch · Thanh toán được bảo vệ</span>
        <button type="button" class="btn primary" id="koc-profile-book" ${(koc.prices || []).length ? "" : "disabled"}>Đặt booking KOC này</button>
      </div>
    </section>`);
  m.classList.add("business-koc-profile-modal");
  m.querySelector("#koc-profile-close").addEventListener("click", () => closeKocProfileModal(m));
  m.querySelector("#koc-profile-book").addEventListener("click", () => {
    closeKocProfileModal(m, () => openBookingForm(kocId, el));
  });
}

async function openBookingForm(kocId, el) {
  const { koc } = await api("/api/koc/" + kocId);
  const prices = koc.prices.filter((p) => koc.accepting[p.category] !== false);
  if (!prices.length)
    return toast("KOC này đang tạm ngưng nhận booking", "err");
  const m = modal(`
    <div class="row"><img class="avatar" src="${esc(avatarUrl(koc.avatar))}"><div><h2>${esc(koc.name)}</h2><div>${tierBadge(koc.tier)} ${stars(koc.rating)}</div></div></div>
    <div class="field" style="margin-top:14px"><label class="required-label">Kiểu booking</label>
      <select id="bf-type">
        <option value="review">Review sản phẩm — phí cố định</option>
        <option value="advertising">Quảng cáo thương hiệu — phí cố định</option>
        <option value="affiliate">Tiếp thị liên kết — phí ngành hàng + hoa hồng doanh số</option>
        <option value="combo">Gói kết hợp — đánh giá/quảng cáo + hoa hồng bán hàng</option>
      </select></div>
    <div class="field"><label class="required-label">Gói ngành hàng (giá niêm yết cố định)</label>
      <select id="bf-cat">${prices.map((p) => `<option value="${esc(p.category)}" data-price="${p.price}">${esc(p.category)} — ${money(p.price)}</option>`).join("")}</select></div>
    <div class="tint-box between" id="bf-esc-box"><span>Phí booking · được giữ an toàn đến khi hoàn thành</span><b class="money" id="bf-price">${money(prices[0].price)}</b></div>
    <div id="bf-aff" style="display:none">
      <div class="field" style="margin-top:12px"><label class="required-label">🛒 Sàn áp dụng</label>
        <select id="bf-plat">${PLATFORMS.map((pl) => `<option>${pl}</option>`).join("")}</select></div>
      <div class="field"><label class="required-label">🔗 Link sản phẩm gốc trên sàn</label><input id="bf-purl" placeholder="https://shopee.vn/…"></div>
      <div class="field"><label class="required-label">Tỉ lệ % chiết khấu (hoa hồng) đề xuất cho KOC</label><input id="bf-rate" type="number" min="1" max="90" placeholder="ví dụ 12"></div>
      <p class="hint">Hoa hồng KOC = doanh số × % chiết khấu. Phí nền tảng 1% trên doanh số do DN chi trả (không trừ vào hoa hồng KOC).</p>
    </div>
    <div class="field" style="margin-top:12px"><label class="required-label">${icon("productData")} Link dữ liệu sản phẩm (bắt buộc)</label><input id="bf-link" placeholder="https://… (thông tin, hình ảnh, giá, chính sách)"></div>
    <div class="field"><label class="required-label">Mô tả yêu cầu</label><textarea id="bf-req" rows="3" placeholder="Yêu cầu nội dung, thông điệp…"></textarea></div>
    <div class="field"><label class="required-label">Thời hạn</label><input id="bf-deadline" type="date"></div>
    <p class="hint" id="bf-hint">${BOOKING_PAYMENT_NOTICE}</p>
    <button class="btn primary" id="bf-go">Gửi yêu cầu booking</button>
    <button data-modal-dismiss class="btn ghost" id="bf-cancel" style="margin-top:8px">Hủy</button>`);
  const sel = m.querySelector("#bf-cat");
  const typeSel = m.querySelector("#bf-type");
  const escBox = m.querySelector("#bf-esc-box");
  const affBox = m.querySelector("#bf-aff");
  const catField = sel.closest(".field");
  function syncType() {
    const t = typeSel.value;
    const showAff = t === "affiliate" || t === "combo";
    const hasListedFee = [
      "review",
      "advertising",
      "affiliate",
      "combo",
    ].includes(t);
    affBox.style.display = showAff ? "block" : "none";
    escBox.style.display = hasListedFee ? "flex" : "none";
    catField.style.display = hasListedFee ? "block" : "none";
    m.querySelector("#bf-hint").textContent = BOOKING_PAYMENT_NOTICE;
    m.querySelector("#bf-go").textContent = "Gửi yêu cầu booking";
  }
  typeSel.addEventListener("change", syncType);
  sel.addEventListener("change", () => {
    m.querySelector("#bf-price").textContent = money(
      sel.selectedOptions[0].dataset.price,
    );
  });
  m.querySelector("#bf-cancel").addEventListener("click", closeModal);
  const isValidUrl = (s) => {
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  };
  const markErr = (inp, bad) => {
    inp.style.borderColor = bad ? "var(--error)" : "";
  };
  m.querySelector("#bf-go").addEventListener("click", async () => {
    const t = typeSel.value;
    let ok = true;
    const linkInp = m.querySelector("#bf-link");
    const product_link = linkInp.value.trim();
    const linkBad = !product_link || !isValidUrl(product_link);
    markErr(linkInp, linkBad);
    if (linkBad) ok = false;
    const deadlineInp = m.querySelector("#bf-deadline");
    const deadline = deadlineInp.value;
    const deadlineBad =
      !deadline || deadline < new Date().toISOString().slice(0, 10);
    markErr(deadlineInp, deadlineBad);
    if (deadlineBad) ok = false;
    const reqInp = m.querySelector("#bf-req");
    const requirements = reqInp.value.trim();
    const reqBad = requirements.length < 5;
    markErr(reqInp, reqBad);
    if (reqBad) ok = false;
    const payload = {
      koc_id: kocId,
      category: sel.value,
      product_link,
      booking_type: t,
      requirements,
      deadline,
    };
    if (t === "affiliate" || t === "combo") {
      const purlInp = m.querySelector("#bf-purl");
      payload.platform = m.querySelector("#bf-plat").value;
      payload.product_url = purlInp.value.trim();
      const purlBad = !payload.product_url || !isValidUrl(payload.product_url);
      markErr(purlInp, purlBad);
      if (purlBad) ok = false;
      const rateInp = m.querySelector("#bf-rate");
      payload.commission_rate = Number(rateInp.value);
      const rateBad = !(
        payload.commission_rate >= 1 && payload.commission_rate <= 90
      );
      markErr(rateInp, rateBad);
      if (rateBad) ok = false;
    }
    if (!ok)
      return toast("Vui lòng kiểm tra lại các trường được đánh dấu đỏ", "err");
    const btn = m.querySelector("#bf-go");
    btn.disabled = true;
    try {
      await post("/api/booking", payload);
      toast("Đã gửi booking cho KOC xác nhận", "ok");
      closeModal();
      location.hash = "#/orders";
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false;
    }
  });
  m.querySelectorAll("#bf-link,#bf-req,#bf-deadline,#bf-purl,#bf-rate").forEach(
    (inp) => inp.addEventListener("input", () => markErr(inp, false)),
  );
  syncType();
}

let businessOrdersPage = 1;
let businessOrdersSearch = "";
async function orders(el, page = businessOrdersPage) {
  businessOrdersPage = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams(location.search);
  const hashQuery = location.hash.includes("?") ? location.hash.split("?").slice(1).join("?") : "";
  const hashParams = new URLSearchParams(hashQuery);
  const payOSResult = params.get("payos") || hashParams.get("payos");
  const vnpResponseCode = params.get("vnp_ResponseCode") || hashParams.get("vnp_ResponseCode");
  const orderCode = Number(params.get("orderCode") || hashParams.get("orderCode") || params.get("vnp_TxnRef") || hashParams.get("vnp_TxnRef"));
  if (vnpResponseCode || (payOSResult && Number.isSafeInteger(orderCode))) {
    if (vnpResponseCode) {
      try {
        const vnpPayload = {};
        for (const [k, v] of params.entries()) vnpPayload[k] = v;
        for (const [k, v] of hashParams.entries()) if (!vnpPayload[k]) vnpPayload[k] = v;
        const res = await post("/api/vnpay/verify-return", vnpPayload);
        if (res.ok && res.status === "paid") {
          toast("Thanh toán qua VNPAY thành công · phí booking được giữ an toàn đến khi bạn xác nhận booking hoàn thành.", "ok");
        } else if (vnpResponseCode === "00") {
          toast("Thanh toán qua VNPAY thành công!", "ok");
        } else {
          toast("Giao dịch VNPAY không thành công hoặc bạn đã hủy", "err");
        }
      } catch (e) {
        console.warn("VNPAY return verify error:", e);
        if (vnpResponseCode === "00") {
          toast("Thanh toán qua VNPAY thành công!", "ok");
        } else {
          toast(e.message || "Giao dịch VNPAY không thành công", "err");
        }
      }
    } else if (payOSResult && Number.isSafeInteger(orderCode)) {
      try {
        const payment = await post("/api/booking/payment/status", {
          order_code: orderCode,
        });
        if (payment.status === "paid") {
          toast(
            "Thanh toán thành công · phí booking được giữ an toàn đến khi bạn xác nhận booking hoàn thành.",
            "ok",
          );
        } else if (payment.status === "cancelled") {
          toast("Bạn đã hủy thanh toán", "err");
        } else {
          toast("Thanh toán đang được xác nhận", "ok");
        }
      } catch (e) {
        toast(e.message, "err");
      }
    }
    history.replaceState({}, "", `${location.pathname}#/orders`);
  }
  const r = await api(`/api/bookings?page=${businessOrdersPage}&per=50&search=${encodeURIComponent(businessOrdersSearch)}`);
  businessOrdersPage = r.page || businessOrdersPage;
  const bookings = groupBusinessBookings(r.bookings || []);
  el.innerHTML = `<div class="between"><div><h1>Booking đã đặt</h1><p class="muted">${num(bookings.length)} booking${r.total > r.per ? ` trên trang này` : ""}</p></div></div>${businessSearchForm("business-orders-search", "Tìm booking", "Mã booking, tên KOC hoặc ngành hàng…", businessOrdersSearch)}<div class="table-wrap" style="margin-top:16px">${bookings.length ? tableBookings(bookings) : empty("📋", businessOrdersSearch ? "Không tìm thấy booking phù hợp" : "Chưa có booking")}</div><div class="pager" id="business-orders-pager"></div>`;
  bindBusinessSearch(el, "business-orders-search", (query) => {
    businessOrdersSearch = query;
    return orders(el, 1);
  });
  const pager = el.querySelector("#business-orders-pager");
  if (r.pages > 1) {
    pager.innerHTML = `<button data-orders-page="${r.page - 1}" ${r.page <= 1 ? "disabled" : ""}>‹</button><span class="muted" style="padding:7px 6px">${r.page} / ${r.pages}</span><button data-orders-page="${r.page + 1}" ${r.page >= r.pages ? "disabled" : ""}>›</button>`;
    pager
      .querySelectorAll("[data-orders-page]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          orders(el, Number(button.dataset.ordersPage)),
        ),
      );
  }
  bindOrderRows(el);
}

function groupBusinessBookings(list) {
  const grouped = new Map();
  for (const booking of list) {
    const key =
      booking.type === "aiclone" && booking.aiclone_batch_id
        ? `aiclone:${booking.aiclone_batch_id}`
        : `booking:${booking.id}`;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        ...booking,
        batch_kocs: [booking.kocname],
        batch_size: 1,
      });
      continue;
    }
    current.batch_kocs.push(booking.kocname);
    current.batch_size += 1;
    const bookingHasTotal =
      Number(booking.price) > 0 ||
      ["quote_sent", "quoted", "payment_pending"].includes(booking.status);
    const currentHasTotal =
      Number(current.price) > 0 ||
      ["quote_sent", "quoted", "payment_pending"].includes(current.status);
    if (bookingHasTotal && !currentHasTotal) {
      const names = current.batch_kocs;
      const size = current.batch_size;
      Object.assign(current, booking, { batch_kocs: names, batch_size: size });
    }
  }
  return [...grouped.values()];
}

function tableBookings(list) {
  return `<table><thead><tr><th>Mã</th><th>Thời gian</th><th>KOC</th><th>Ngành</th><th>Giá</th><th>Trạng thái</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${list
      .map(
        (
          b,
        ) => `<tr><td>${esc(b.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${dateTimeStack(b.created_at)}</td><td>${b.batch_size > 1 ? `<b>${b.batch_size} KOC</b><div class="muted" style="font-size:11px">${esc(b.batch_kocs.slice(0, 2).join(", "))}${b.batch_size > 2 ? "…" : ""}</div>` : esc(b.kocname)}</td><td>${esc(b.category)}</td>
      <td class="money">${b.status === "quote_pending" ? "Chờ báo giá" : ["quote_grouped", "payment_grouped"].includes(b.status) ? "Báo giá chung" : money(b.price)}</td><td style="white-space:nowrap">${statusChip(b.status)}</td>
      <td style="width:1%;white-space:nowrap;text-align:right"><button class="btn ghost sm" data-order="${b.id}">Chi tiết</button></td></tr>`,
      )
      .join("")}
  </tbody></table>`;
}

function bindOrderRows(el) {
  el.querySelectorAll("[data-order]").forEach((b) =>
    b.addEventListener("click", () => openOrder(b.dataset.order, el)),
  );
}

function businessVideoBlock(b) {
  if (!b.video_preview_url) return "";
  return `<div class="field booking-video">
    <label>🎥 Video KOC gửi duyệt · phiên bản ${Number(b.video_version || 1)}</label>
    <div class="stream-frame"><video src="${esc(b.video_preview_url)}" title="Video ${esc(b.code)}" controls playsinline preload="metadata"></video></div>
    <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
      ${b.video_download_url ? `<a class="btn ghost sm" href="${esc(b.video_download_url)}" target="_blank" rel="noopener">⬇️ Tải video</a>` : '<span class="muted" style="font-size:12px">Video chưa sẵn sàng để tải.</span>'}
    </div>
  </div>`;
}

async function openOrder(id, el) {
  const r = await api("/api/bookings?id=" + encodeURIComponent(id));
  const b = r.bookings.find((x) => x.id === id);
  if (!b) return;
  let batchMembers = [b];
  if (b.type === "aiclone" && b.aiclone_batch_id) {
    const batchResult = await api(
      "/api/bookings?batch=" +
        encodeURIComponent(b.aiclone_batch_id) +
        "&per=50",
    );
    batchMembers = batchResult.bookings || batchMembers;
  }
  const batchKocTotal = batchMembers.reduce(
    (sum, member) => sum + Number(member.aiclone_quote_koc || 0),
    0,
  );
  const batchReadyToSettle =
    b.type === "aiclone"
      ? batchMembers.filter((member) =>
          ["posted", "settling"].includes(member.status),
        )
      : [];
  if (
    b.video_submission_id &&
    [
      "video_processing",
      "pending_review",
      "video_approved",
      "revision_requested",
    ].includes(b.status)
  ) {
    try {
      const synced = await post("/api/booking/video/status", {
        submission_id: b.video_submission_id,
      });
      const video = synced.video || {};
      b.status =
        video.status === "pending_review" ? "pending_review" : b.status;
      b.video_status = video.status;
      b.video_preview_url = video.preview_url;
      b.video_thumbnail_url = video.thumbnail_url;
      b.video_download_url = video.download_url;
      b.video_duration = video.duration;
    } catch (_) {}
  }
  const m = modal(`
    <div class="between"><h2>${esc(b.code)}</h2>${statusChip(b.status)}</div>
    <p class="muted" style="font-size:12px;margin-top:6px">Thời gian tạo booking: ${fmtDateTime(b.created_at)}</p>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>KOC tham gia</span><b>${batchMembers.length} KOC</b></div>
      <div class="booking-batch-kocs" style="display:grid;gap:7px;margin-top:10px">${batchMembers.map((member, index) => `<div class="between" style="padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:#fff"><span>${index + 1}. ${esc(member.kocname)}</span><span class="row" style="justify-content:flex-end"><b class="money">${money(member.aiclone_quote_koc || 0)}</b>${statusChip(["quote_grouped", "payment_grouped"].includes(member.status) ? b.status : member.status)}</span></div>`).join("")}</div>
      <div class="between"><span>Ngành</span><b>${esc(b.category)}</b></div>
      <div class="between"><span>Giá booking</span><b class="money">${b.status === "quote_pending" ? "Chờ Admin báo giá" : ["quote_grouped", "payment_grouped"].includes(b.status) ? "Nằm trong báo giá chung" : money(b.price)}</b></div>
      ${Number(b.escrow) > 0 && Number(b.legacy_paid_escrow) ? `<div class="between"><span>Khoản tiền đang được đảm bảo</span><b class="money">${money(b.escrow)}</b></div>` : ""}
      ${b.payment_order_code ? `<div class="between"><span>Mã giao dịch</span><b>${esc(b.payment_order_code)}</b></div>` : ""}
    </div>
    ${
      b.type === "aiclone" &&
      Number(b.price) > 0 &&
      Number(b.aiclone_quote_production || 0) +
        Number(b.aiclone_quote_koc || 0) +
        Number(b.aiclone_quote_platform || 0) +
        Number(b.aiclone_quote_additional || 0) >
        0
        ? `<div class="tint-box" style="margin-bottom:12px">
      <b>Chi tiết báo giá AI Clone Avatar</b>
      <div class="between" style="margin-top:8px"><span>Phí sản xuất video</span><b>${money(b.aiclone_quote_production || 0)}</b></div>
      <div class="between"><span>Tổng phí KOC</span><b>${money(batchKocTotal)}</b></div>
      <div class="between"><span>Phí nền tảng</span><b>${money(b.aiclone_quote_platform || 0)}</b></div>
      <div class="between"><span>Chi phí bổ sung</span><b>${money(b.aiclone_quote_additional || 0)}</b></div>
      <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><b>Tổng thanh toán</b><b class="money">${money(b.price)}</b></div>
      ${b.aiclone_quote_note ? `<p class="muted" style="margin-top:8px"><b>Ghi chú:</b> ${esc(b.aiclone_quote_note)}</p>` : ""}
    </div>`
        : ""
    }
    <div class="field"><label>Link sản phẩm đã gửi</label><div class="copybox">${esc(b.product_link)}</div></div>
    ${b.type === "aiclone" && b.aiclone_message ? `<div class="field"><label>Thông điệp chính</label><div class="tint-box">${esc(b.aiclone_message)}</div></div>` : ""}
    ${b.type === "aiclone" && b.aiclone_script ? `<div class="field"><label>Kịch bản đã duyệt nội bộ</label><div class="tint-box" style="white-space:pre-wrap">${esc(b.aiclone_script)}</div></div>` : ""}
    ${b.type === "aiclone" && (b.business_video_link || b.video_link) ? `<div class="field"><label>🎥 Video admin giao doanh nghiệp</label><div class="copybox"><a href="${esc(b.business_video_link || b.video_link)}" target="_blank" rel="noopener" style="color:var(--info)">Mở / xem video</a></div></div>` : ""}
    ${businessVideoBlock(b)}
    ${b.video_review_note ? `<div class="tint-box video-review-note"><b>Phản hồi đã gửi:</b><p>${esc(b.video_review_note)}</p></div>` : ""}
    ${b.post_link ? `<div class="field"><label>Bài KOC đã đăng (${esc(b.post_platform)})</label><div class="copybox"><a href="${esc(b.post_link)}" target="_blank" style="color:var(--info)">${esc(b.post_link)}</a></div></div>` : ""}
    ${b.reject_reason ? `<div class="chip r">KOC từ chối: ${esc(b.reject_reason)}${b.status === "refund_pending" ? " — khoản thanh toán đang chờ hoàn." : ""}</div>` : ""}
    <div id="ord-act" style="margin-top:14px"></div>
    <button data-modal-dismiss class="btn ghost" id="ord-close" style="margin-top:8px">Đóng</button>`);
  m.querySelector("#ord-close").addEventListener("click", closeModal);
  const act = m.querySelector("#ord-act");
  const hasAiQuote =
    b.type === "aiclone" &&
    Number(b.aiclone_quote_production || 0) +
      Number(b.aiclone_quote_koc || 0) +
      Number(b.aiclone_quote_platform || 0) +
      Number(b.aiclone_quote_additional || 0) >
      0;
  if (b.status === "quote_pending" && b.type === "aiclone") {
    act.innerHTML = `<div class="tint-box"><b>Đã gửi yêu cầu báo giá</b>
      <p class="muted" style="margin-top:5px">Admin đang kiểm tra KOC, số lượng video, quy mô sản xuất và brief. Bạn sẽ nhận thông báo khi báo giá chính thức được gửi.</p></div>`;
  } else if (
    ["quote_grouped", "payment_grouped"].includes(b.status) &&
    b.type === "aiclone"
  ) {
    act.innerHTML = `<div class="tint-box"><b>KOC này nằm trong báo giá chung của booking</b>
      <p class="muted" style="margin-top:5px">Hãy xác nhận tại dòng booking cùng lô đang có trạng thái “Chờ DN xác nhận báo giá”. Khi chấp nhận, toàn bộ KOC sẽ được chuyển sang bước sản xuất.</p></div>`;
  } else if (
    (["quote_sent", "quoted", "payment_pending"].includes(b.status) ||
      (hasAiQuote &&
        ["quote_sent", "quoted", "payment_pending"].includes(b.status))) &&
    b.type === "aiclone"
  ) {
    act.innerHTML = `<div class="card" style="padding:14px;border:1px solid var(--primary);margin-top:10px;background:var(--card-bg)">
        <div class="between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <b style="font-size:15px;color:var(--primary)">🛡️ Xác nhận báo giá & ký quỹ</b>
            <div class="muted" style="font-size:12px;margin-top:2px">Số tiền sẽ được chuyển từ Ví doanh nghiệp sang Escrow và chỉ giải ngân theo tiến độ đã thống nhất.</div>
          </div>
          <b class="money" style="font-size:20px">${money(b.price)}</b>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px">
          <button class="btn primary" id="o-pay-wallet" style="width:100%;min-height:64px;padding:12px;white-space:normal;line-height:1.3;text-align:center">Chấp nhận báo giá & ký quỹ vào Escrow</button>
          <button class="btn danger" id="o-reject-quote" style="width:100%;min-height:64px;padding:12px;white-space:normal;line-height:1.3;text-align:center">Từ chối báo giá</button>
        </div>
      </div>`;
    const payWallet = act.querySelector("#o-pay-wallet");
    if (payWallet)
      payWallet.addEventListener("click", async () => {
        if (
          !(await confirmDialog(
            `Chấp nhận báo giá và ký quỹ ${money(b.price)} từ Ví doanh nghiệp vào Escrow?`,
            { confirmText: "Chấp nhận & ký quỹ" },
          ))
        )
          return;
        payWallet.disabled = true;
        try {
          await post("/api/aiclone/quote-response", {
            id: b.id,
            action: "accept",
          });
          toast("Đã chấp nhận báo giá và ký quỹ vào Escrow", "ok");
          closeModal();
          orders(el);
        } catch (e) {
          toast(e.message, "err");
          payWallet.disabled = false;
        }
      });
    const rejectQuote = act.querySelector("#o-reject-quote");
    if (rejectQuote)
      rejectQuote.addEventListener("click", async () => {
        const reason = await promptDialog(
          "Vui lòng cho biết lý do từ chối báo giá:",
          {
            title: "Từ chối báo giá",
            confirmText: "Xác nhận từ chối",
            placeholder: "Ví dụ: Chi phí chưa phù hợp với ngân sách…",
          },
        );
        if (!reason) return;
        rejectQuote.disabled = true;
        try {
          await post("/api/aiclone/quote-response", {
            id: b.id,
            action: "reject",
            reason,
          });
          toast("Đã từ chối báo giá", "ok");
          closeModal();
          orders(el);
        } catch (e) {
          toast(e.message, "err");
          rejectQuote.disabled = false;
        }
      });
  } else if (b.status === "pending_business_review" && b.type === "aiclone") {
    act.innerHTML = `<div class="field"><label>Nhận xét khi yêu cầu chỉnh sửa <span class="required-label">khi yêu cầu sửa</span></label><textarea id="o-ai-note" rows="3" placeholder="Nêu rõ đoạn cần chỉnh sửa…"></textarea></div>
      <div class="row" style="gap:8px"><button class="btn ok" id="o-ai-approve" style="flex:1"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Duyệt bản dựng</button>
      <button class="btn danger" id="o-ai-revise" style="flex:1">↩ Yêu cầu sửa</button></div>
      <p class="hint">Sau khi doanh nghiệp duyệt, video sẽ tự động chuyển đến KOC phê duyệt và đăng bài.</p>`;
    const review = async (action) => {
      const note = act.querySelector("#o-ai-note").value.trim();
      if (action === "request_revision" && !note)
        return toast("Nhập nội dung cần chỉnh sửa", "err");
      try {
        await post("/api/aiclone/video-review", { id: b.id, action, note });
        toast(
          action === "approve"
            ? "Đã duyệt bản dựng · Đã chuyển KOC phê duyệt"
            : "Đã gửi yêu cầu chỉnh sửa",
          "ok",
        );
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, "err");
      }
    };
    act
      .querySelector("#o-ai-approve")
      .addEventListener("click", () => review("approve"));
    act
      .querySelector("#o-ai-revise")
      .addEventListener("click", () => review("request_revision"));
  } else if (
    ["business_approved", "pending_koc_review"].includes(b.status) &&
    b.type === "aiclone"
  ) {
    act.innerHTML =
      '<div class="chip b"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Doanh nghiệp đã duyệt bản dựng · Đang chờ KOC phê duyệt & đăng bài.</div>';
  } else if (
    ["brief_review", "producing"].includes(b.status) &&
    b.type === "aiclone"
  ) {
    act.innerHTML = `<div class="chip b">${b.status === "brief_review" ? "NetViet đã nhận thanh toán và đang xử lý yêu cầu sản xuất" : "NetViet đang sản xuất video AI Clone"}</div>`;
  } else if (b.status === "revision_requested" && b.type === "aiclone") {
    act.innerHTML = `<div class="chip r">NetViet đang chỉnh sửa bản dựng AI Clone: ${esc(b.reject_reason || "")}</div>`;
  } else if (
    ["payment_pending", "payment_failed", "payment_cancelled"].includes(
      b.status,
    )
  ) {
    const canResume = b.status === "payment_pending" && b.payment_checkout_url;
    act.innerHTML = `<div class="tint-box">
        <b>${b.status === "payment_failed" ? "Chưa tạo được yêu cầu thanh toán" : b.status === "payment_cancelled" ? "Thanh toán đã bị hủy" : "Booking đang chờ thanh toán"}</b>
        <p class="muted" style="margin-top:4px">${
          b.post_link
            ? "KOC đã đăng bài. Phí booking được giữ an toàn cho đến khi bạn xác nhận booking hoàn thành; KOC sẽ nhận được phí ngay sau đó."
            : b.type === "aiclone"
              ? `Admin đã gửi báo giá chính thức${b.aiclone_quote_note ? `: ${esc(b.aiclone_quote_note)}` : ""}. Thanh toán để NetViet bắt đầu sản xuất video.`
              : "Đây là booking theo quy trình đảm bảo thanh toán cũ; KOC chỉ nhận booking sau khi giao dịch được xác nhận."
        }</p>
      </div>
      <button class="btn primary" id="o-payment" style="margin-top:10px">${canResume ? "Tiếp tục thanh toán" : "Tạo lại yêu cầu thanh toán"}</button>
      ${
        b.type === "aiclone" && r.demoPaymentAllowed
          ? `<button class="btn ok" id="o-demo-paid" style="margin-top:8px">✓ Đã thanh toán (Demo)</button>
           <p class="hint">Chỉ dùng để kiểm thử: hệ thống sẽ mô phỏng một giao dịch thành công.</p>`
          : ""
      }`;
    act.querySelector("#o-payment").addEventListener("click", async () => {
      const button = act.querySelector("#o-payment");
      button.disabled = true;
      try {
        if (canResume) {
          window.location.assign(b.payment_checkout_url);
          return;
        }
        const payment = await post("/api/booking/payment-link", {
          booking_id: b.id,
        });
        window.location.assign(payment.checkoutUrl);
      } catch (e) {
        toast(e.message, "err");
        button.disabled = false;
      }
    });
    const demoPaid = act.querySelector("#o-demo-paid");
    if (demoPaid)
      demoPaid.addEventListener("click", async () => {
        if (
          !(await confirmDialog(
            "Xác nhận mô phỏng booking này đã thanh toán thành công?",
          ))
        )
          return;
        demoPaid.disabled = true;
        try {
          await post("/api/booking/payment/demo-paid", { booking_id: b.id });
          toast(
            "Đã mô phỏng thanh toán thành công · Admin có thể bắt đầu sản xuất",
            "ok",
          );
          closeModal();
          orders(el);
        } catch (e) {
          toast(e.message, "err");
          demoPaid.disabled = false;
        }
      });
  } else if (b.status === "pending_review") {
    act.innerHTML = `<div class="field"><label>Nhận xét cho KOC <span class="required-label">khi yêu cầu sửa</span></label><textarea id="o-video-note" rows="3" placeholder="Ví dụ: chỉnh lại 5 giây đầu, tăng âm lượng…"></textarea></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn ok" id="o-video-approve" style="flex:1"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Duyệt video</button>
        <button class="btn danger" id="o-video-revise" style="flex:1">↩ Yêu cầu sửa</button>
      </div>`;
    const review = async (action) => {
      const note = act.querySelector("#o-video-note").value.trim();
      if (action === "request_revision" && !note)
        return toast("Nhập nội dung KOC cần chỉnh sửa", "err");
      act.querySelector("#o-video-approve").disabled = true;
      act.querySelector("#o-video-revise").disabled = true;
      try {
        await post("/api/booking/video/review", {
          submission_id: b.video_submission_id,
          action,
          note,
        });
        toast(
          action === "approve"
            ? "Đã duyệt video · KOC có thể đăng bài"
            : "Đã gửi yêu cầu chỉnh sửa",
          "ok",
        );
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, "err");
        act.querySelector("#o-video-approve").disabled = false;
        act.querySelector("#o-video-revise").disabled = false;
      }
    };
    act
      .querySelector("#o-video-approve")
      .addEventListener("click", () => review("approve"));
    act
      .querySelector("#o-video-revise")
      .addEventListener("click", () => review("request_revision"));
  } else if (b.status === "video_processing") {
    act.innerHTML = `<div class="tint-box"><b>Đang hoàn tất video</b><p class="muted" style="margin-top:4px">Mở lại chi tiết sau ít phút để xem và duyệt.</p></div>`;
  } else if (b.status === "video_approved") {
    act.innerHTML = `<div class="chip g"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Video đã duyệt · đang chờ KOC đăng lên mạng xã hội và nộp link.</div>`;
  } else if (b.status === "revision_requested") {
    act.innerHTML = `<div class="chip r">Đang chờ KOC tải phiên bản chỉnh sửa.</div>`;
  } else if (
    batchReadyToSettle.length ||
    ["posted", "settling", "video_approved"].includes(b.status)
  ) {
    const isAi = b.type === "aiclone";
    const quoteKoc = Number(b.aiclone_quote_koc || 0);
    const prodFee = Number(
      b.aiclone_quote_production || b.aiclone_production_fee || 0,
    );
    const platFee = Number(
      b.aiclone_quote_platform || b.aiclone_platform_fee || 0,
    );
    const addFee = Number(b.aiclone_quote_additional || 0);

    let kocFee = 0;
    if (isAi) {
      kocFee = quoteKoc;
    } else {
      kocFee = Math.max(
        0,
        Number(b.price) - Math.round(Number(b.price) * 0.05),
      );
    }

    const settlements =
      isAi && batchMembers.length > 1
        ? batchReadyToSettle.map((member) => ({
            id: member.id,
            name: member.kocname,
            amount: Number(member.aiclone_quote_koc || 0),
          }))
        : [{ id: b.id, name: b.kocname, amount: kocFee }];
    const settlementTotal = settlements.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    act.innerHTML = `<div class="tint-box" style="margin-bottom:10px">
        <b>Theo dõi & Đối soát nghiệm thu</b>
        <p class="muted" style="margin-top:4px">${settlements.length} KOC đã đăng bài và sẵn sàng nghiệm thu. Hệ thống sẽ chuyển đúng khoản phí Admin đã xác nhận vào Ví của từng KOC.</p>
        ${settlements.map((item) => `<div class="between" style="margin-top:7px"><span>${esc(item.name)}</span><b class="money">+${money(item.amount)}</b></div>`).join("")}
        <div class="between" style="margin-top:9px;padding-top:9px;border-top:1px solid var(--border)"><b>Tổng giải ngân</b><b class="money">+${money(settlementTotal)}</b></div>
      </div>
      <button class="btn ok" id="o-complete" style="width:100%;padding:12px;font-size:15px;font-weight:700">💸 Duyệt bài & Giải ngân cho ${settlements.length} KOC (+${money(settlementTotal)})</button>`;
    act.querySelector("#o-complete").addEventListener("click", async () => {
      if (
        !(await confirmDialog(
          `Xác nhận nghiệm thu và giải ngân tổng cộng ${money(settlementTotal)} cho ${settlements.length} KOC?`,
        ))
      )
        return;
      const button = act.querySelector("#o-complete");
      button.disabled = true;
      try {
        for (const settlement of settlements) {
          await post("/api/booking/action", {
            id: settlement.id,
            action: "complete",
          });
        }
        toast(
          `Đã giải ngân tổng cộng ${money(settlementTotal)} vào Ví của ${settlements.length} KOC`,
          "ok",
        );
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, "err");
        button.disabled = false;
      }
    });
  } else if (b.status === "completed" && !b.rating) {
    act.innerHTML = `<div class="field"><label class="required-label" id="o-rating-label">Đánh giá sao</label><div class="rating-picker" role="radiogroup" aria-labelledby="o-rating-label">${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="rating-star" data-rating="${value}" role="radio" aria-checked="false" aria-label="${value} sao">★</button>`).join("")}</div><input id="o-rating" type="hidden" value=""></div>
      <div class="field"><label>Nhận xét</label><textarea id="o-review" rows="2" placeholder="Chia sẻ trải nghiệm của bạn về KOC..."></textarea></div>
      <button class="btn primary" id="o-rate" disabled>Gửi đánh giá</button>`;
    const ratingInput = act.querySelector("#o-rating"),
      ratingButtons = [...act.querySelectorAll(".rating-star")];
    const paintStars = (value) =>
      ratingButtons.forEach((button) =>
        button.classList.toggle(
          "active",
          Number(button.dataset.rating) <= value,
        ),
      );
    ratingButtons.forEach((button) => {
      button.addEventListener("mouseenter", () =>
        paintStars(Number(button.dataset.rating)),
      );
      button.addEventListener("focus", () =>
        paintStars(Number(button.dataset.rating)),
      );
      button.addEventListener("click", () => {
        const value = Number(button.dataset.rating);
        ratingInput.value = String(value);
        ratingButtons.forEach((item) =>
          item.setAttribute("aria-checked", String(item === button)),
        );
        paintStars(value);
        act.querySelector("#o-rate").disabled = false;
      });
    });
    act
      .querySelector(".rating-picker")
      .addEventListener("mouseleave", () =>
        paintStars(Number(ratingInput.value || 0)),
      );
    act.querySelector("#o-rate").addEventListener("click", async () => {
      try {
        await post("/api/booking/action", {
          id: b.id,
          action: "rate",
          rating: act.querySelector("#o-rating").value,
          review: act.querySelector("#o-review").value.trim(),
        });
        toast("Đã đánh giá", "ok");
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, "err");
      }
    });
  } else if (b.status === "completed") {
    act.innerHTML = `<div class="chip g">Đã hoàn thành · Bạn đã đánh giá ${stars(b.rating)}</div>`;
  } else {
    act.innerHTML = `<p class="muted">Đang chờ KOC xử lý.</p>`;
  }
  if (b.status !== "rejected") {
    const complainBtn = document.createElement("button");
    complainBtn.className = "btn ghost sm";
    complainBtn.style.marginTop = "8px";
    complainBtn.style.width = "100%";
    complainBtn.innerHTML = `${icon("complaint", "btn-icon")} Gửi khiếu nại về booking này`;
    complainBtn.addEventListener("click", async () => {
      const reason = await promptDialog(
        "Mô tả vấn đề bạn gặp phải với booking này:",
      );
      if (!reason || !reason.trim()) return;
      try {
        await post("/api/complaints", {
          booking_id: b.id,
          reason: reason.trim(),
        });
        toast("Đã gửi khiếu nại — NetViet sẽ xem xét", "ok");
      } catch (e) {
        toast(e.message, "err");
      }
    });
    act.appendChild(complainBtn);
  }
}

function businessProductPayload(product, status = product.status) {
  return {
    name: product.name,
    product_url: product.product_url,
    platform: product.platform,
    sku: product.sku || "",
    price: Number(product.price) || 0,
    image_url: product.image_url || "",
    commission_rate: Number(product.commission_rate) || 0,
    affiliate_enabled: product.affiliate_enabled !== 0,
    status,
    notes: product.notes || "",
  };
}

async function products(el) {
  let searchTimer;
  el.innerHTML = `<div class="between product-page-heading">
      <div>
        <h1 class="icon-heading">${icon("productData", "teaser-icon")} Quản lý sản phẩm</h1>
        <p class="muted">Lưu đường dẫn sản phẩm để dùng lại khi tạo booking và chương trình hoa hồng bán hàng.</p>
      </div>
      <button class="btn primary sm" id="pr-new">+ Thêm sản phẩm</button>
    </div>
    <div class="stat-cards product-stats" id="pr-stats"></div>
    <div class="card product-toolbar">
      <input id="pr-search" placeholder="Tìm theo tên, SKU, nền tảng hoặc link…" aria-label="Tìm sản phẩm">
      <select id="pr-status" aria-label="Lọc trạng thái">
        <option value="">Tất cả trạng thái</option>
        <option value="active">Đang hoạt động</option>
        <option value="paused">Tạm dừng</option>
      </select>
    </div>
    <div id="pr-list" class="product-grid">${skeletonKocGrid(4)}</div>`;

  const list = el.querySelector("#pr-list");
  const load = async () => {
    const params = new URLSearchParams();
    const search = el.querySelector("#pr-search").value.trim();
    const status = el.querySelector("#pr-status").value;
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    list.innerHTML = skeletonKocGrid(4);
    try {
      const result = await api(
        `/api/business/products${params.size ? `?${params}` : ""}`,
      );
      const summary = result.summary || {};
      el.querySelector("#pr-stats").innerHTML =
        stat("Tổng sản phẩm", num(summary.total || 0)) +
        stat("Đang hoạt động", num(summary.active || 0)) +
        stat("Tạm dừng", num(summary.paused || 0));
      renderBusinessProducts(list, result.products || [], load);
    } catch (error) {
      list.innerHTML = empty(icon("productData", "teaser-icon"), error.message);
    }
  };

  el.querySelector("#pr-new").addEventListener("click", () =>
    businessProductModal(null, load),
  );
  el.querySelector("#pr-search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });
  el.querySelector("#pr-status").addEventListener("change", load);
  await load();
}

function renderBusinessProducts(list, products, reload) {
  if (!products.length) {
    list.innerHTML = empty(
      icon("productData", "teaser-icon"),
      "Chưa có sản phẩm phù hợp. Hãy thêm link sản phẩm đầu tiên của doanh nghiệp.",
    );
    return;
  }
  list.innerHTML = products
    .map(
      (product) => `<article class="card product-card">
      <div class="product-card-media">
        ${
          product.image_url
            ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy">`
            : `<span>${icon("productData", "teaser-icon")}</span>`
        }
      </div>
      <div class="product-card-body">
        <div class="between product-card-title">
          <div>
            <h3>${esc(product.name)}</h3>
            <div class="row product-meta">
              <span class="chip b">${esc(product.platform || "Website")}</span>
              <span class="chip ${product.status === "active" ? "g" : "w"}">${product.status === "active" ? "Đang hoạt động" : "Tạm dừng"}</span>
            </div>
          </div>
          <b class="money">${money(product.price || 0)}</b>
        </div>
        <a class="product-link" href="${esc(product.product_url)}" target="_blank" rel="noopener" title="${esc(product.product_url)}">${esc(product.product_url)}</a>
        <div class="product-details">
          <span><b>SKU:</b> ${esc(product.sku || "—")}</span>
          <span><b>Hoa hồng dự kiến:</b> ${Number(product.commission_rate || 0).toLocaleString("vi-VN")}%</span>
          <span><b>Thời gian tạo:</b> ${fmtDateTime(product.created_at)}</span>
          <span><b>Cập nhật:</b> ${fmtDateTime(product.updated_at)}</span>
        </div>
        ${product.notes ? `<p class="muted product-notes">${esc(product.notes)}</p>` : ""}
        <div class="row product-affiliate-ready">
          <span class="chip ${product.affiliate_enabled ? "g" : "n"}">${product.affiliate_enabled ? "Sẵn sàng trả hoa hồng" : "Chưa bật hoa hồng bán hàng"}</span>
          <button class="btn ghost sm" disabled title="Tính năng sẽ sớm được mở">Tạo đường dẫn riêng · Sắp ra mắt</button>
        </div>
        <div class="product-actions">
          <button class="btn ghost sm" data-product-action="copy" data-id="${product.id}">Sao chép link</button>
          <a class="btn ghost sm" href="${esc(product.product_url)}" target="_blank" rel="noopener">Mở sản phẩm</a>
          <button class="btn ghost sm" data-product-action="toggle" data-id="${product.id}">${product.status === "active" ? "Tạm dừng" : "Kích hoạt"}</button>
          <button class="btn ghost sm" data-product-action="edit" data-id="${product.id}">Sửa</button>
          <button class="btn danger sm" data-product-action="delete" data-id="${product.id}">Xóa</button>
        </div>
      </div>
    </article>`,
    )
    .join("");

  const byId = new Map(products.map((product) => [product.id, product]));
  list.querySelectorAll("[data-product-action]").forEach((button) =>
    button.addEventListener("click", async () => {
      const product = byId.get(button.dataset.id);
      if (!product) return;
      const action = button.dataset.productAction;
      if (action === "copy") {
        try {
          await navigator.clipboard.writeText(product.product_url);
          toast("Đã sao chép link sản phẩm", "ok");
        } catch (_) {
          await promptDialog("Sao chép link sản phẩm:", {
            value: product.product_url,
            required: false,
            confirmText: "Đóng",
          });
        }
        return;
      }
      if (action === "edit") {
        businessProductModal(product, reload);
        return;
      }
      if (action === "toggle") {
        button.disabled = true;
        try {
          const status = product.status === "active" ? "paused" : "active";
          await api(`/api/business/products/${product.id}`, {
            method: "PUT",
            body: businessProductPayload(product, status),
          });
          toast(
            status === "active"
              ? "Đã kích hoạt sản phẩm"
              : "Đã tạm dừng sản phẩm",
            "ok",
          );
          await reload();
        } catch (error) {
          toast(error.message, "err");
          button.disabled = false;
        }
        return;
      }
      if (action === "delete") {
        if (
          !(await confirmDialog(
            `Xóa sản phẩm “${product.name}” khỏi danh mục?`,
            { confirmText: "Xóa sản phẩm", tone: "danger" },
          ))
        )
          return;
        button.disabled = true;
        try {
          await api(`/api/business/products/${product.id}`, {
            method: "DELETE",
          });
          toast("Đã xóa sản phẩm", "ok");
          await reload();
        } catch (error) {
          toast(error.message, "err");
          button.disabled = false;
        }
      }
    }),
  );
}

function businessProductModal(product, reload) {
  const editing = !!product;
  const value = (key, fallback = "") => esc(product?.[key] ?? fallback);
  const platforms = [...PLATFORMS, "Website"];
  const m = modal(`<h2>${editing ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}</h2>
    <p class="muted" style="margin-bottom:14px">Đường dẫn này sẽ được lưu trong danh mục sản phẩm và có thể dùng lại cho booking hoặc chương trình hoa hồng bán hàng.</p>
    <div class="field"><label class="required-label">Tên sản phẩm</label><input id="prf-name" maxlength="160" value="${value("name")}" placeholder="Ví dụ: Serum Vitamin C 30ml"></div>
    <div class="field"><label class="required-label">Link sản phẩm</label><input id="prf-url" type="url" maxlength="2000" value="${value("product_url")}" placeholder="https://..."></div>
    <div class="grid product-form-grid">
      <div class="field"><label>Nền tảng</label><input id="prf-platform" list="prf-platforms" maxlength="80" value="${value("platform")}" placeholder="Shopee, Website…"><datalist id="prf-platforms">${platforms.map((platform) => `<option value="${platform}">`).join("")}</datalist></div>
      <div class="field"><label>SKU / Mã sản phẩm</label><input id="prf-sku" maxlength="80" value="${value("sku")}"></div>
      <div class="field"><label>Giá bán (đ)</label><input id="prf-price" type="number" min="0" step="1000" value="${value("price", 0)}"></div>
      <div class="field"><label>Hoa hồng dự kiến (%)</label><input id="prf-rate" type="number" min="0" max="100" step="0.01" value="${value("commission_rate", 0)}"></div>
      <div class="field"><label>Trạng thái</label><select id="prf-status"><option value="active" ${product?.status !== "paused" ? "selected" : ""}>Đang hoạt động</option><option value="paused" ${product?.status === "paused" ? "selected" : ""}>Tạm dừng</option></select></div>
      <label class="product-affiliate-check"><input id="prf-affiliate" type="checkbox" ${product?.affiliate_enabled === 0 ? "" : "checked"}> Cho phép KOC nhận hoa hồng bán hàng</label>
    </div>
    <div class="field"><label>Link ảnh sản phẩm</label><input id="prf-image" type="url" maxlength="2000" value="${value("image_url")}" placeholder="https://..."></div>
    <div class="field"><label>Ghi chú</label><textarea id="prf-notes" maxlength="1000" rows="3" placeholder="Biến thể, chính sách bán hàng, thông tin cần lưu ý…">${value("notes")}</textarea></div>
    <button class="btn primary" id="prf-save">${editing ? "Lưu thay đổi" : "Thêm vào danh mục"}</button>
    <button data-modal-dismiss class="btn ghost" id="prf-cancel" style="margin-top:8px">Hủy</button>`);

  m.querySelector("#prf-cancel").addEventListener("click", closeModal);
  m.querySelector("#prf-save").addEventListener("click", async () => {
    const name = m.querySelector("#prf-name").value.trim();
    const productUrl = m.querySelector("#prf-url").value.trim();
    if (name.length < 2) return toast("Tên sản phẩm tối thiểu 2 ký tự", "err");
    try {
      const parsedUrl = new URL(productUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch (_) {
      return toast("Nhập link sản phẩm http/https hợp lệ", "err");
    }
    const payload = {
      name,
      product_url: productUrl,
      platform: m.querySelector("#prf-platform").value.trim(),
      sku: m.querySelector("#prf-sku").value.trim(),
      price: Number(m.querySelector("#prf-price").value || 0),
      commission_rate: Number(m.querySelector("#prf-rate").value || 0),
      status: m.querySelector("#prf-status").value,
      affiliate_enabled: m.querySelector("#prf-affiliate").checked,
      image_url: m.querySelector("#prf-image").value.trim(),
      notes: m.querySelector("#prf-notes").value.trim(),
    };
    const button = m.querySelector("#prf-save");
    button.disabled = true;
    button.textContent = "Đang lưu…";
    try {
      if (editing) {
        await api(`/api/business/products/${product.id}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await post("/api/business/products", payload);
      }
      toast(editing ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm", "ok");
      closeModal();
      await reload();
    } catch (error) {
      toast(error.message, "err");
      button.disabled = false;
      button.textContent = editing ? "Lưu thay đổi" : "Thêm vào danh mục";
    }
  });
}

async function campaigns(el) {
  const r = await api("/api/campaigns");
  const cfg = state.config;
  el.innerHTML = `<div class="between"><h1>Chiến dịch lớn (NetViet điều phối)</h1><button class="btn primary sm" id="c-new">+ Tạo yêu cầu</button></div>
    <div class="table-wrap campaign-table-wrap" style="margin-top:16px">${
      r.campaigns.length
        ? `<table class="campaign-table"><thead><tr><th>Thời gian</th><th>Ngân sách</th><th>SL KOC</th><th>Hạng</th><th>Ngành</th><th>Trạng thái</th><th>KOC đã gán</th><th>Thao tác</th></tr></thead><tbody>
      ${r.campaigns
        .map((c) => {
          let assigned = [];
          try {
            assigned = JSON.parse(c.assigned || "[]");
          } catch (e) {}
          const fee =
              Number(c.management_fee) ||
              Math.max(2000000, Math.round(Number(c.budget || 0) * 0.15)),
            total = Number(c.total_amount) || Number(c.budget || 0) + fee;
          return `<tr><td class="campaign-date">${dateTimeStack(c.created_at)}</td><td><div class="campaign-budget"><strong>${money(c.budget)}</strong><span>Phí ${money(fee)}</span><span>Tổng ${money(total)}</span></div>${c.quote_note ? `<div class="campaign-quote-note">${esc(c.quote_note)}</div>` : ""}</td><td><span class="campaign-qty">${c.qty}</span></td><td>${tierBadge(c.tier)}</td><td>${esc(c.category)}</td><td class="campaign-status-cell">${statusChip(c.status)}</td><td>${c.allocations?.length ? c.allocations.map((a) => `<div class="campaign-business-allocation"><div class="campaign-allocation-head"><b>${esc(a.koc_name)}</b><strong>${money(a.amount)}</strong>${statusChip(a.status)}</div>${a.business_note ? `<small>${esc(a.business_note)}</small>` : ""}<div class="campaign-allocation-controls">${a.submission_url ? `<a href="${esc(a.submission_url)}" target="_blank" rel="noopener">Mở nội dung</a>` : ""}${a.status === "submitted" ? `<div class="campaign-allocation-review"><button class="btn ok sm" data-allocation-approve="${a.id}">Duyệt</button><button class="btn ghost sm" data-allocation-revision="${a.id}">Yêu cầu sửa</button></div>` : ""}</div></div>`).join("") : assigned.length ? assigned.map((k) => `<span class="chip b" style="margin:2px">${esc(k.name)}</span>`).join("") : '<span class="campaign-unassigned">Chưa phân bổ</span>'}</td><td><div class="campaign-actions">${c.status === "quoted" ? `<button class="btn primary sm campaign-action-primary" data-campaign-fund="${c.id}">Chấp nhận & ký quỹ</button>` : ""}<div class="campaign-action-secondary"><button class="btn ghost sm" data-campaign-detail="${c.id}">Chi tiết</button>${["pending", "quote_pending", "quoted", "funded"].includes(c.status) ? `<button class="btn ghost sm campaign-cancel-button" data-campaign-cancel="${c.id}">Hủy</button>` : ""}</div></div></td></tr>`;
        })
        .join("")}
    </tbody></table>`
        : empty("📣", "Chưa có chiến dịch. NetViet sẽ phân bổ KOC cho bạn.")
    }</div>`;
  mountListSearch(el, {
    key: "business-campaigns",
    label: "Tìm chiến dịch",
    placeholder: "Ngành hàng, tên KOC hoặc trạng thái…",
    itemSelector: ".campaign-table tbody > tr",
    containerSelector: ".campaign-table-wrap",
  });
  el.querySelectorAll("[data-campaign-fund]").forEach((button) =>
    button.addEventListener("click", async () => {
      const c = r.campaigns.find((x) => x.id === button.dataset.campaignFund),
        total =
          Number(c.total_amount) || Number(c.budget) + Number(c.management_fee);
      if (
        !(await confirmDialog(
          `Xác nhận khóa ${money(total)} từ Ví doanh nghiệp?`,
        ))
      )
        return;
      button.disabled = true;
      try {
        await post("/api/campaign/action", { id: c.id, action: "fund" });
        toast("Đã ký quỹ chiến dịch", "ok");
        campaigns(el);
      } catch (e) {
        toast(e.message, "err");
        button.disabled = false;
      }
    }),
  );
  el.querySelectorAll("[data-campaign-cancel]").forEach((button) =>
    button.addEventListener("click", async () => {
      if (
        !(await confirmDialog(
          "Hủy chiến dịch và hoàn phần tiền chưa sử dụng?",
          { confirmText: "Hủy chiến dịch", tone: "danger" },
        ))
      )
        return;
      try {
        const x = await post("/api/campaign/action", {
          id: button.dataset.campaignCancel,
          action: "cancel",
        });
        toast(
          `Đã hủy${x.refundAmount ? ` · hoàn ${money(x.refundAmount)}` : ""}`,
          "ok",
        );
        campaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-campaign-detail]").forEach((button) =>
    button.addEventListener("click", () => {
      const c = r.campaigns.find((x) => x.id === button.dataset.campaignDetail),
        fee = Number(c.management_fee) || 0,
        total = Number(c.total_amount) || Number(c.budget) + fee,
        allocations = c.allocations || [];
      const m =
        modal(`<div class="between"><div><h2>Chi tiết chiến dịch lớn</h2><p class="muted" style="margin-top:4px">Tạo lúc ${fmtDateTime(c.created_at)}</p></div>${statusChip(c.status)}</div>
      <div class="campaign-detail-summary"><div><span>Ngân sách KOC</span><b>${money(c.budget)}</b></div><div><span>Phí điều phối</span><b>${money(fee)}</b></div><div class="total"><span>Tổng ký quỹ</span><strong>${money(total)}</strong></div></div>
      <div class="grid campaign-detail-meta"><div><span>SL KOC</span><b>${c.qty}</b></div><div><span>Hạng</span>${tierBadge(c.tier)}</div><div><span>Ngành</span><b>${esc(c.category)}</b></div><div><span>Hạn hoàn thành</span><b>${c.deadline ? esc(c.deadline) : "Chưa đặt"}</b></div></div>
      ${c.note ? `<div class="tint-box" style="margin-top:12px"><b>Yêu cầu chiến dịch</b><p>${esc(c.note)}</p></div>` : ""}${c.quote_note ? `<div class="tint-box" style="margin-top:10px"><b>Ghi chú báo giá từ NetViet</b><p>${esc(c.quote_note)}</p></div>` : ""}
      <h3 style="margin-top:18px">KOC và tiến độ (${allocations.length}/${c.qty})</h3><div class="campaign-detail-allocations">${allocations.length ? allocations.map((a) => `<div><span><b>${esc(a.koc_name)}</b><small>${statusChip(a.status)}</small>${a.submission_url ? `<a href="${esc(a.submission_url)}" target="_blank" rel="noopener">Mở nội dung đã nộp</a>` : ""}</span><strong>${money(a.amount)}</strong></div>`).join("") : empty("👥", "NetViet chưa phân bổ KOC")}</div>
      <button data-modal-dismiss class="btn ghost" id="campaign-detail-close" style="margin-top:14px">Đóng</button>`);
      m.querySelector("#campaign-detail-close").addEventListener(
        "click",
        closeModal,
      );
    }),
  );
  el.querySelectorAll("[data-allocation-approve]").forEach((button) =>
    button.addEventListener("click", async () => {
      if (
        !(await confirmDialog(
          "Xác nhận nội dung đạt yêu cầu? Sau bước này Admin mới có thể giải ngân đúng khoản của KOC này.",
        ))
      )
        return;
      try {
        await post("/api/campaign/allocation/action", {
          id: button.dataset.allocationApprove,
          action: "approve",
        });
        toast("Đã duyệt nội dung KOC", "ok");
        campaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  el.querySelectorAll("[data-allocation-revision]").forEach((button) =>
    button.addEventListener("click", async () => {
      const note = await promptDialog("Nội dung KOC cần chỉnh sửa:");
      if (!note) return;
      try {
        await post("/api/campaign/allocation/action", {
          id: button.dataset.allocationRevision,
          action: "request_revision",
          note,
        });
        toast("Đã gửi yêu cầu chỉnh sửa", "ok");
        campaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  document.getElementById("c-new").addEventListener("click", () => {
    const m = modal(`<h2>Yêu cầu chiến dịch lớn</h2>
      <p class="muted" style="margin:6px 0 16px">NetViet tuyển chọn KOC, điều phối tiến độ và hỗ trợ nghiệm thu chiến dịch.</p>
      <div class="field"><label class="required-label">Ngân sách trả KOC (đ)</label><input id="cf-budget" type="number" min="1" placeholder="Ví dụ: 50.000.000"></div>
      <div class="field"><label class="required-label">Số lượng KOC</label><input id="cf-qty" type="number" value="5"></div>
      <div class="field"><label class="required-label">Hạng KOC</label><select id="cf-tier">${cfg.tiers.map((t) => `<option>${t.name}</option>`).join("")}</select></div>
      <div class="field"><label class="required-label">Ngành hàng</label><select id="cf-cat"><option value="Tất cả">Tất cả</option>${cfg.categories.map((c) => `<option>${esc(c)}</option>`).join("")}</select></div>
      <div class="field"><label>Hạn hoàn thành</label><input id="cf-deadline" type="date"></div>
      <div class="field"><label>Ghi chú</label><textarea id="cf-note" rows="2"></textarea></div>
      <div class="campaign-pricing"><div><span>Ngân sách dành cho KOC</span><b id="cf-creator-budget">0đ</b></div><div><span>Phí điều phối <small>15% · tối thiểu 2.000.000đ</small></span><b id="cf-management-fee">2.000.000đ</b></div><div class="campaign-pricing-total"><span>Tổng dự kiến</span><strong id="cf-total">2.000.000đ</strong></div><p>Chưa bao gồm phí thanh toán, thuế và chi phí phát sinh được xác nhận riêng.</p></div>
      <button class="btn primary" id="cf-go">Gửi cho NetViet</button>
      <button data-modal-dismiss class="btn ghost" id="cf-cancel" style="margin-top:8px">Hủy</button>`);
    const updatePricing = () => {
      const budget = Math.max(
          0,
          Number(m.querySelector("#cf-budget").value) || 0,
        ),
        fee = Math.max(2000000, Math.round(budget * 0.15));
      m.querySelector("#cf-creator-budget").textContent = money(budget);
      m.querySelector("#cf-management-fee").textContent = money(fee);
      m.querySelector("#cf-total").textContent = money(budget + fee);
    };
    m.querySelector("#cf-budget").addEventListener("input", updatePricing);
    updatePricing();
    m.querySelector("#cf-cancel").addEventListener("click", closeModal);
    m.querySelector("#cf-go").addEventListener("click", async () => {
      const budget = Number(m.querySelector("#cf-budget").value);
      const qty = Number(m.querySelector("#cf-qty").value);
      if (!(budget > 0)) return toast("Ngân sách phải là số dương", "err");
      if (!(qty > 0) || !Number.isInteger(qty))
        return toast("Số lượng KOC phải là số nguyên dương", "err");
      try {
        await post("/api/campaign", {
          budget,
          qty,
          tier: m.querySelector("#cf-tier").value,
          category: m.querySelector("#cf-cat").value,
          deadline: m.querySelector("#cf-deadline").value,
          note: m.querySelector("#cf-note").value.trim(),
        });
        toast("Đã gửi yêu cầu chờ NetViet báo giá", "ok");
        closeModal();
        campaigns(el);
      } catch (e) {
        toast(e.message, "err");
      }
    });
  });
}

let businessReportPage = 1;
let businessReportSearch = "";
async function report(el, page = businessReportPage) {
  businessReportPage = Math.max(1, Number(page) || 1);
  const r = await api(`/api/business/report?page=${businessReportPage}&per=10&search=${encodeURIComponent(businessReportSearch)}`);
  businessReportPage = r.page || businessReportPage;
  const t = r.totals;
  el.innerHTML = `<h1>Báo cáo hiệu quả & đối soát</h1>
    <div class="stat-cards" style="margin:16px 0">
      ${stat("Doanh số tiếp thị liên kết", money(t.gmv))}${stat("Lượt nhấp", num(t.clicks))}${stat("Đơn hàng", num(t.orders))}${stat("Hiệu quả chi tiêu", (t.commission + t.spend > 0 ? t.gmv / (t.commission + t.spend) : 0).toFixed(2) + " lần")}
    </div>
    <div class="card" style="margin-bottom:16px"><h3>Đối soát chi phí — tách bạch 3 khoản</h3>
      <div class="tint-box" style="margin-top:10px">
        <div class="between"><span>① Phí booking theo giá ngành hàng</span><b class="money">${money(t.spend)}</b></div>
        <div class="between"><span>② Hoa hồng KOC (doanh số × % chiết khấu)</span><b class="money">${money(t.commission)}</b></div>
        <div class="between"><span>③ Phí nền tảng 1% (DN trả thêm)</span><b class="money">${money(t.platformFee)}</b></div>
        <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><span><b>DN thanh toán</b></span><b class="money" style="color:var(--primary)">${money(t.payable)}</b></div>
      </div></div>
    ${businessSearchForm("business-report-search", "Tìm booking trong báo cáo", "Mã booking hoặc tên KOC…", businessReportSearch)}
    <p class="list-search-summary" role="status">${num(r.total || 0)} booking${businessReportSearch ? " phù hợp" : ""}</p>
    <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Thời gian</th><th>KOC</th><th>Hình thức</th><th>Chi phí booking</th><th>Doanh số</th><th>Đơn</th><th>Hoa hồng</th><th>Phí 1%</th><th>Trạng thái</th></tr></thead><tbody>
      ${r.rows
        .map(
          (
            x,
          ) => `<tr><td>${esc(x.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${dateTimeStack(x.created_at)}</td><td>${esc(x.kocname)}</td><td><span class="chip n">${btLabel(x.booking_type, x.content_type)}</span></td><td class="money">${money(x.price)}</td>
        <td class="money">${money(x.gmv || 0)}</td><td>${num(x.orders || 0)}</td><td class="money">${money(x.commission || 0)}</td><td class="money">${money(x.platform_fee || 0)}</td><td>${statusChip(x.status)}</td></tr>`,
        )
        .join("")}
    ${r.rows.length ? "" : `<tr><td colspan="10">${empty("", businessReportSearch ? "Không tìm thấy booking phù hợp" : "Chưa có dữ liệu báo cáo")}</td></tr>`}
    </tbody></table></div>
    <div class="pager" id="business-report-pager"></div>
    <button class="btn navy sm" id="r-invoice" style="margin-top:16px;width:auto">🧾 Xuất hoá đơn phí dịch vụ</button>`;
  bindBusinessSearch(el, "business-report-search", (query) => {
    businessReportSearch = query;
    return report(el, 1);
  });
  const pager = el.querySelector("#business-report-pager");
  if (r.pages > 1) {
    pager.innerHTML = `<button data-report-page="${r.page - 1}" ${r.page <= 1 ? "disabled" : ""}>‹</button><span class="muted" style="padding:7px 6px">${r.page} / ${r.pages} · ${num(r.total || 0)} booking</span><button data-report-page="${r.page + 1}" ${r.page >= r.pages ? "disabled" : ""}>›</button>`;
    pager
      .querySelectorAll("[data-report-page]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          report(el, Number(button.dataset.reportPage)),
        ),
      );
  }
  document.getElementById("r-invoice").addEventListener("click", () => {
    modal(`<h2>Hoá đơn phí dịch vụ</h2><div class="tint-box">
      <div class="between"><span>① Phí booking theo giá ngành hàng</span><b class="money">${money(t.spend)}</b></div>
      <div class="between"><span>Phần phí nền tảng trong booking (5%)</span><b class="money">${money(t.fee)}</b></div>
      <div class="between"><span>② Hoa hồng KOC</span><b class="money">${money(t.commission)}</b></div>
      <div class="between"><span>③ Phí nền tảng affiliate (1%)</span><b class="money">${money(t.platformFee)}</b></div>
      <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><span><b>Tổng DN thanh toán</b></span><b class="money">${money(t.payable)}</b></div>
    </div><button data-modal-dismiss class="btn primary" onclick="document.getElementById('modal-root').innerHTML=''" style="margin-top:14px">Đóng</button>`);
  });
}
function btLabel(t, contentType) {
  return t === "ad" || !t
    ? contentType === "advertising"
      ? "Quảng cáo"
      : "Đánh giá sản phẩm"
    : { affiliate: "Tiếp thị liên kết", combo: "Gói kết hợp", kol: "KOL" }[t] ||
        t;
}

let businessKolCatalogPage = 1;
let businessKolRequestPage = 1;
let businessKolCatalogSearch = "";
let businessKolRequestSearch = "";
function businessKolColumns() {
  if (window.innerWidth >= 1200) return 4;
  if (window.innerWidth >= 900) return 3;
  if (window.innerWidth >= 600) return 2;
  return 1;
}

function businessKolAvatarUrl(value) {
  const source = avatarUrl(value);

  try {
    const url = new URL(source, window.location.origin);
    const uploadMarker = "/image/upload/";

    if (
      url.hostname === "res.cloudinary.com" &&
      url.pathname.includes(uploadMarker) &&
      !url.pathname.includes("c_fill,g_face")
    ) {
      url.pathname = url.pathname.replace(
        uploadMarker,
        `${uploadMarker}c_fill,g_face,w_160,h_160,q_auto,f_auto/`,
      );
    }

    return url.href;
  } catch (_) {
    return source;
  }
}

async function kolPage(
  el,
  catalogPage = businessKolCatalogPage,
  requestPage = businessKolRequestPage,
) {
  businessKolCatalogPage = Math.max(1, Number(catalogPage) || 1);
  businessKolRequestPage = Math.max(1, Number(requestPage) || 1);
  // Show five complete rows per catalogue page at the current column count.
  const catalogPer = businessKolColumns() * 5;
  const [catalog, reqs] = await Promise.all([
    api(`/api/kols?page=${businessKolCatalogPage}&per=${catalogPer}&search=${encodeURIComponent(businessKolCatalogSearch)}`),
    api(`/api/kol/requests?page=${businessKolRequestPage}&per=5&search=${encodeURIComponent(businessKolRequestSearch)}`),
  ]);
  const { kols } = catalog;
  businessKolCatalogPage = catalog.page || 1;
  businessKolRequestPage = reqs.page || 1;
  el.innerHTML = `<div class="business-kol-page"><div class="between"><h1>KOL / Nghệ sĩ</h1>
    <button class="btn sm" id="k-quote" style="background:#B91C1C;color:#fff">${icon("quoteLead", "btn-icon")} Liên hệ nhận báo giá trực tiếp</button></div>
    <p class="muted" style="margin:8px 0 16px">Giá KOL thường thoả thuận — gửi yêu cầu báo giá, NetViet duyệt & phản hồi. Phân khúc cao cấp có duyệt riêng.</p>
    ${businessSearchForm("business-kol-catalog-search", "Tìm KOL / nghệ sĩ", "Tên nghệ sĩ hoặc lĩnh vực…", businessKolCatalogSearch)}
    <p class="list-search-summary" role="status">${num(catalog.total || 0)} KOL${businessKolCatalogSearch ? " phù hợp" : ""}</p>
    <div class="business-kol-catalog-scroll">
    ${kols.length ? "" : empty("", businessKolCatalogSearch ? "Không tìm thấy KOL phù hợp" : "Chưa có KOL trong danh sách")}
    <div class="business-kol-grid">
      ${kols
        .map(
          (k) => `<div class="card">
        <div class="row"><img class="avatar business-kol-avatar" src="${esc(businessKolAvatarUrl(k.avatar))}" alt="Ảnh đại diện ${esc(k.name)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/default-avatar.svg'"><div><div class="row"><b>${esc(k.name)}</b>${k.premium ? '<span class="chip r">Cao cấp</span>' : ""}</div>
          <div class="muted" style="font-size:12px">${esc(k.field)} · ${esc(k.fanbase)}</div></div></div>
        <div class="tint-box" style="margin:10px 0;font-size:13px">${k.price_hidden ? "Giá: <b>Thoả thuận</b>" : 'Giá tham khảo: <b class="money">' + money(k.ref_price) + "</b>"}</div>
        <button class="btn primary sm" data-kol="${k.id}" style="width:100%">Gửi yêu cầu báo giá</button>
      </div>`,
        )
        .join("")}
    </div>
    <div class="pager business-kol-catalog-pager" id="business-kol-catalog-pager"></div>
    </div>
    <div class="card business-kol-requests"><h3>Yêu cầu KOL đã gửi</h3>
      ${businessSearchForm("business-kol-request-search", "Tìm yêu cầu KOL", "Tên KOL, lĩnh vực hoặc nội dung yêu cầu…", businessKolRequestSearch)}
      <p class="list-search-summary" role="status">${num(reqs.total || 0)} yêu cầu${businessKolRequestSearch ? " phù hợp" : ""}</p>
      <div class="table-wrap" style="margin-top:10px">${
        reqs.requests.length
          ? `<table><thead><tr><th>KOL</th><th>Thời gian</th><th>Ngân sách</th><th>Báo giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        ${reqs.requests.map((q) => `<tr><td><b>${esc(q.kolname)}</b><div class="muted" style="font-size:11px">${esc(q.field)}</div></td><td class="muted" style="font-size:12px;white-space:nowrap">${dateTimeStack(q.created_at)}</td><td class="money">${money(q.budget)}</td><td>${q.quote ? `<b class="money">${money(q.total_amount||q.quote)}</b><div class="muted" style="font-size:10px">KOL ${money(q.quote_kol||q.quote)} · NetViet ${money(q.quote_platform||0)}${Number(q.quote_additional)>0?` · Khác ${money(q.quote_additional)}`:''}</div>` : "—"}</td><td>${kolStatus(q.status)}</td><td><div class="row" style="flex-wrap:wrap">${q.status==='quoted'?`<button class="btn primary sm" data-kol-fund="${q.id}">Chấp nhận & ký quỹ</button>`:''}${q.status==='delivered'?`<a class="btn ghost sm" href="${esc(q.delivery_url)}" target="_blank" rel="noopener">Xem bàn giao</a><button class="btn ok sm" data-kol-approve="${q.id}">Nghiệm thu</button><button class="btn ghost sm" data-kol-revision="${q.id}">Yêu cầu sửa</button>`:''}${['pending','quoted','funded'].includes(q.status)?`<button class="btn ghost sm" data-kol-cancel="${q.id}">Hủy</button>`:''}</div></td></tr>`).join("")}
      </tbody></table>`
          : empty(icon("kolRequest", "teaser-icon"), businessKolRequestSearch ? "Không tìm thấy yêu cầu KOL phù hợp" : "Chưa gửi yêu cầu KOL nào")
      }</div><div class="pager" id="business-kol-pager"></div></div></div>`;
  bindBusinessSearch(el, "business-kol-catalog-search", (query) => {
    businessKolCatalogSearch = query;
    return kolPage(el, 1, businessKolRequestPage);
  });
  bindBusinessSearch(el, "business-kol-request-search", (query) => {
    businessKolRequestSearch = query;
    return kolPage(el, businessKolCatalogPage, 1);
  });
  el.querySelectorAll("[data-kol]").forEach((b) =>
    b.addEventListener("click", () => kolRequestModal(b.dataset.kol, el)),
  );
  document
    .getElementById("k-quote")
    .addEventListener("click", () => quoteLeadModal("business-kol"));
  const catalogPager = el.querySelector('#business-kol-catalog-pager');
  if (catalog.pages > 1) {
    catalogPager.innerHTML = `<button data-kol-catalog-page="${catalog.page - 1}" ${catalog.page <= 1 ? 'disabled' : ''} aria-label="Trang KOL trước">‹</button><span class="muted">Trang ${catalog.page} / ${catalog.pages} · ${num(catalog.total)} KOL</span><button data-kol-catalog-page="${catalog.page + 1}" ${catalog.page >= catalog.pages ? 'disabled' : ''} aria-label="Trang KOL sau">›</button>`;
    catalogPager.querySelectorAll('[data-kol-catalog-page]').forEach((button) =>
      button.addEventListener('click', async () => {
        await kolPage(el, Number(button.dataset.kolCatalogPage), businessKolRequestPage);
        el.querySelector('.business-kol-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }),
    );
  }
  if(reqs.pages>1){const pager=el.querySelector('#business-kol-pager');pager.innerHTML=`<button data-kol-request-page="${reqs.page-1}" ${reqs.page<=1?'disabled':''}>‹</button><span class="muted">${reqs.page} / ${reqs.pages}</span><button data-kol-request-page="${reqs.page+1}" ${reqs.page>=reqs.pages?'disabled':''}>›</button>`;pager.querySelectorAll('[data-kol-request-page]').forEach(b=>b.addEventListener('click',()=>kolPage(el,businessKolCatalogPage,Number(b.dataset.kolRequestPage))))}
  el.querySelectorAll('[data-kol-fund]').forEach(b=>b.addEventListener('click',async()=>{const q=reqs.requests.find(x=>x.id===b.dataset.kolFund),amount=Number(q.total_amount||q.quote);if(!(await confirmDialog(`Xác nhận khóa ${money(amount)} vào Escrow cho yêu cầu KOL?`)))return;try{await post('/api/kol/action',{id:q.id,action:'fund'});toast('Đã ký quỹ yêu cầu KOL','ok');kolPage(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-kol-approve]').forEach(b=>b.addEventListener('click',async()=>{if(!(await confirmDialog('Xác nhận sản phẩm KOL đạt yêu cầu?')))return;try{await post('/api/kol/action',{id:b.dataset.kolApprove,action:'approve_delivery'});toast('Đã nghiệm thu sản phẩm KOL','ok');kolPage(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-kol-revision]').forEach(b=>b.addEventListener('click',async()=>{const note=await promptDialog('Nội dung cần KOL chỉnh sửa:');if(!note)return;try{await post('/api/kol/action',{id:b.dataset.kolRevision,action:'request_revision',note});toast('Đã gửi yêu cầu chỉnh sửa','ok');kolPage(el)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-kol-cancel]').forEach(b=>b.addEventListener('click',async()=>{if(!(await confirmDialog('Hủy yêu cầu KOL và hoàn toàn bộ khoản đang ký quỹ?',{tone:'danger'})))return;try{const x=await post('/api/kol/action',{id:b.dataset.kolCancel,action:'cancel'});toast(`Đã hủy${x.refund?` · hoàn ${money(x.refund)}`:''}`,'ok');kolPage(el)}catch(e){toast(e.message,'err')}}));
}
function kolStatus(s) {
  return statusChip(
    {
      pending: "pending",
      quoted: "quoted",
      funded: "funded",
      confirmed: "confirmed",
      revision_requested: "revision_requested",
      delivered: "delivered",
      approved: "approved",
      completed: "completed",
      cancelled: "cancelled",
      rejected: "rejected",
    }[s] || s,
  );
}

function kolRequestModal(kolId, el) {
  const m = modal(`<h2>Gửi yêu cầu báo giá KOL</h2>
    <div class="field" style="margin-top:12px"><label class="required-label">Ngân sách dự kiến (đ)</label><input id="kr-budget" type="number" placeholder="đ"></div>
    <div class="field"><label class="required-label">Brief / yêu cầu</label><textarea id="kr-brief" rows="3" placeholder="Mô tả chiến dịch, thông điệp, thời gian…"></textarea></div>
    <button class="btn primary" id="kr-go">Gửi yêu cầu</button>
    <button data-modal-dismiss class="btn ghost" id="kr-cancel" style="margin-top:8px">Hủy</button>`);
  m.querySelector("#kr-cancel").addEventListener("click", closeModal);
  m.querySelector("#kr-go").addEventListener("click", async () => {
    try {
      await post("/api/kol/request", {
        kol_id: kolId,
        budget: m.querySelector("#kr-budget").value,
        brief: m.querySelector("#kr-brief").value.trim(),
      });
      toast("Đã gửi yêu cầu · NetViet sẽ báo giá", "ok");
      closeModal();
      kolPage(el);
    } catch (e) {
      toast(e.message, "err");
    }
  });
}

export function quoteLeadModal(source) {
  const m = modal(`<h2>Liên hệ nhận báo giá trực tiếp</h2>
    <p class="muted" style="margin-bottom:12px">Để lại thông tin — đội ngũ sales NetViet sẽ liên hệ (Zalo / hotline / email).</p>
    <div class="field"><label class="required-label">Họ tên</label><input id="ql-name"></div>
    <div class="field"><label>Doanh nghiệp</label><input id="ql-company"></div>
    <div class="field"><label class="required-label">Số điện thoại</label><input id="ql-phone"></div>
    <div class="field"><label>Email</label><input id="ql-email"></div>
    <div class="field"><label>Nhu cầu</label><textarea id="ql-need" rows="2"></textarea></div>
    <button class="btn" id="ql-go" style="background:#B91C1C;color:#fff">Gửi yêu cầu</button>
    <button data-modal-dismiss class="btn ghost" id="ql-cancel" style="margin-top:8px">Hủy</button>`);
  m.querySelector("#ql-cancel").addEventListener("click", closeModal);
  m.querySelector("#ql-go").addEventListener("click", async () => {
    const name = m.querySelector("#ql-name").value.trim(),
      phone = m.querySelector("#ql-phone").value.trim();
    if (!name || !phone) return toast("Nhập tên và số điện thoại", "err");
    try {
      await post("/api/lead", {
        name,
        phone,
        company: m.querySelector("#ql-company").value.trim(),
        email: m.querySelector("#ql-email").value.trim(),
        need: m.querySelector("#ql-need").value.trim(),
        source: source || "app",
      });
      toast("Đã gửi · sales sẽ liên hệ sớm", "ok");
      closeModal();
    } catch (e) {
      toast(e.message, "err");
    }
  });
}

async function optimizeBusinessProfileImage(
  file,
  width,
  height,
  quality = 0.84,
) {
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
    canvas.width = width;
    canvas.height = height;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sx = 0,
      sy = 0,
      sw = image.naturalWidth,
      sh = image.naturalHeight;
    if (sourceRatio > targetRatio) {
      sw = image.naturalHeight * targetRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    canvas
      .getContext("2d")
      .drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function profile(el, editing = false) {
  const r = await api("/api/business/profile");
  const b = r.business;

  if (!editing) {
    el.innerHTML = `<div class="between"><h1>Hồ sơ doanh nghiệp</h1>
      <button class="btn primary sm" id="pf-edit">✏️ Chỉnh sửa</button></div>
      <div class="card" style="padding:0;overflow:hidden;margin:16px 0">
        <div style="height:180px;background:linear-gradient(120deg,var(--navy),var(--info));overflow:hidden">
          ${b.cover ? `<img src="${esc(b.cover)}" style="width:100%;height:100%;object-fit:cover" alt="Ảnh bìa doanh nghiệp">` : ""}
        </div>
        <div style="padding:16px 20px 20px;margin-top:-52px;position:relative">
          <img class="avatar lg" src="${esc(b.avatar || "https://i.pravatar.cc/150?u=" + b.id)}" style="border:4px solid #fff;width:96px;height:96px" alt="Logo doanh nghiệp">
          <h2 style="margin-top:10px">${esc(b.name || "Chưa cập nhật tên doanh nghiệp")}</h2>
          <p class="muted">${esc(b.industry || "Chưa cập nhật ngành nghề")}</p>
        </div>
      </div>
      <div class="card">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px 28px">
          <div><span class="muted">Người liên hệ</span><p><b>${esc(b.contact || "Chưa cập nhật")}</b></p></div>
          <div><span class="muted">Email liên hệ</span><p><b>${esc(b.email || "Chưa cập nhật")}</b></p></div>
          <div><span class="muted">Mã số thuế</span><p><b>${esc(b.tax_code || "Chưa cập nhật")}</b></p></div>
          <div><span class="muted">Ngành nghề</span><p><b>${esc(b.industry || "Chưa cập nhật")}</b></p></div>
        </div>
      </div>`;
    el.querySelector("#pf-edit").addEventListener("click", () =>
      profile(el, true),
    );
    return;
  }

  let avatarSource = b.avatar || "";
  let coverSource = b.cover || "";
  el.innerHTML = `<div class="between"><h1>Chỉnh sửa hồ sơ doanh nghiệp</h1>
      <button class="btn ghost sm" id="pf-cancel">Hủy</button></div>
    <div class="image-editor" style="margin-top:16px">
      <div class="cover-upload-preview" id="pf-cover-preview">${coverSource ? `<img src="${esc(coverSource)}" alt="Xem trước ảnh bìa">` : "<span>Ảnh bìa tỷ lệ 8:3</span>"}</div>
      <div class="avatar-upload-row">
        <div class="avatar-upload-preview" id="pf-avatar-preview">${avatarSource ? `<img src="${esc(avatarSource)}" alt="Xem trước logo">` : "🏢"}</div>
        <div><b>Logo / ảnh đại diện</b><small>Ảnh được cắt vuông 1:1</small>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label class="btn ghost sm upload-label">Chọn ảnh từ thư viện<input id="pf-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
            <label class="btn ghost sm upload-label">🖼️ Thay ảnh bìa từ thư viện<input id="pf-cover-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
          </div>
        </div>
      </div>
      <p class="hint">PNG, JPG hoặc WebP · tối đa 10MB. Hệ thống tự cắt đúng tỷ lệ và tối ưu dung lượng.</p>
    </div>
    <div class="card">
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 16px">
        <div class="field"><label class="required-label">Tên doanh nghiệp</label><input id="pf-name" value="${esc(b.name || "")}"></div>
        <div class="field"><label>Người liên hệ</label><input id="pf-contact" value="${esc(b.contact || "")}"></div>
        <div class="field"><label>Email liên hệ</label><input id="pf-email" type="email" value="${esc(b.email || "")}"></div>
        <div class="field"><label>Ngành nghề</label><input id="pf-industry" value="${esc(b.industry || "")}" placeholder="VD: Mỹ phẩm, Bán lẻ…"></div>
        <div class="field"><label>Mã số thuế</label><input id="pf-tax" value="${esc(b.tax_code || "")}"></div>
      </div>
      <button class="btn primary" id="pf-save" style="margin-top:10px;width:auto">Lưu hồ sơ</button>
    </div>`;

  const processFile = async (input, target, width, height, assign) => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      input.disabled = true;
      const source = await optimizeBusinessProfileImage(file, width, height);
      assign(source);
      target.innerHTML = `<img src="${source}" alt="Xem trước ảnh đã chọn">`;
      toast("Đã tối ưu và xem trước ảnh", "ok");
    } catch (e) {
      toast(e.message, "err");
    } finally {
      input.disabled = false;
    }
  };
  el.querySelector("#pf-avatar-file").addEventListener("change", (e) =>
    processFile(
      e.target,
      el.querySelector("#pf-avatar-preview"),
      480,
      480,
      (value) => (avatarSource = value),
    ),
  );
  el.querySelector("#pf-cover-file").addEventListener("change", (e) =>
    processFile(
      e.target,
      el.querySelector("#pf-cover-preview"),
      1200,
      450,
      (value) => (coverSource = value),
    ),
  );
  el.querySelector("#pf-cancel").addEventListener("click", () => profile(el));

  el.querySelector("#pf-save").addEventListener("click", async () => {
    const name = el.querySelector("#pf-name").value.trim();
    if (!name) return toast("Nhập tên doanh nghiệp", "err");
    const email = el.querySelector("#pf-email").value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast("Email không hợp lệ", "err");
    const btn = el.querySelector("#pf-save");
    btn.disabled = true;
    btn.textContent = "Đang lưu…";
    try {
      await post("/api/business/profile", {
        name,
        email,
        contact: el.querySelector("#pf-contact").value.trim(),
        industry: el.querySelector("#pf-industry").value.trim(),
        tax_code: el.querySelector("#pf-tax").value.trim(),
        avatar: avatarSource,
        cover: coverSource,
      });
      toast("Đã lưu hồ sơ", "ok");
      void hydrateBusinessAccount(document.getElementById("app"));
      profile(el);
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false;
      btn.textContent = "Lưu hồ sơ";
    }
  });
}

async function wallet(el) {
  const params = new URLSearchParams(location.search);
  const hashQuery = location.hash.includes("?") ? location.hash.split("?").slice(1).join("?") : "";
  const hashParams = new URLSearchParams(hashQuery);
  const payOSResult = params.get("payos") || hashParams.get("payos");
  const vnpResponseCode = params.get("vnp_ResponseCode") || hashParams.get("vnp_ResponseCode");
  const orderCode = Number(params.get("orderCode") || hashParams.get("orderCode") || params.get("vnp_TxnRef") || hashParams.get("vnp_TxnRef"));
  if (vnpResponseCode || (payOSResult && Number.isSafeInteger(orderCode))) {
    if (vnpResponseCode) {
      try {
        const vnpPayload = {};
        for (const [k, v] of params.entries()) vnpPayload[k] = v;
        for (const [k, v] of hashParams.entries()) if (!vnpPayload[k]) vnpPayload[k] = v;
        const res = await post("/api/vnpay/verify-return", vnpPayload);
        if (res.ok && res.status === "paid") {
          toast("Nạp tiền ví qua VNPAY thành công!", "ok");
        } else if (vnpResponseCode === "00") {
          toast("Nạp tiền ví qua VNPAY thành công!", "ok");
        } else {
          toast("Giao dịch VNPAY không thành công hoặc bạn đã hủy", "err");
        }
      } catch (e) {
        console.warn("VNPAY return verify error:", e);
        if (vnpResponseCode === "00") {
          toast("Nạp tiền ví qua VNPAY thành công!", "ok");
        } else {
          toast(e.message || "Giao dịch VNPAY không thành công", "err");
        }
      }
    } else if (payOSResult && Number.isSafeInteger(orderCode)) {
      try {
        const payment = await post("/api/booking/payment/status", {
          order_code: orderCode,
        });
        if (payment.status === "paid") {
          toast("Thanh toán hoặc nạp tiền thành công!", "ok");
        } else if (payment.status === "cancelled") {
          toast("Bạn đã hủy giao dịch", "err");
        } else {
          toast("Giao dịch đang được xác nhận", "ok");
        }
      } catch (e) {
        toast(e.message, "err");
      }
    }
    history.replaceState({}, "", `${location.pathname}#/wallet`);
  }

  const w = await api("/api/wallet");
  el.innerHTML = `
    <div class="between" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="icon-heading">${icon("wallet", "teaser-icon")} Ví doanh nghiệp</h1>
        <p class="muted">Quản lý số dư, tiền nạp, khoản đang được đảm bảo và lịch sử giao dịch</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn primary" id="w-deposit-payos">💳 Nạp tiền trực tuyến</button>
        <a class="btn ghost sm" href="#/orders">📋 Đơn booking</a>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:20px">
      <div class="card" style="padding:16px;border-left:4px solid var(--primary)">
        <div class="muted" style="font-size:12px">Số dư ví khả dụng</div>
        <div class="money" style="font-size:24px;font-weight:700;margin-top:6px;color:var(--primary)">${money(w.balance || 0)}</div>
        <div class="muted" style="font-size:11px;margin-top:4px">Dùng để thanh toán trực tiếp các đơn booking KOC</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid var(--warning)">
        <div class="muted" style="font-size:12px">Khoản đang được đảm bảo</div>
        <div class="money" style="font-size:24px;font-weight:700;margin-top:6px;color:var(--warning)">${money(w.escrow || 0)}</div>
        <div class="muted" style="font-size:11px;margin-top:4px">Phí booking được giữ an toàn đến khi KOC hoàn thành và bạn duyệt bài đăng</div>
      </div>
    </div>

    <div class="card" style="padding:16px">
      <b>📜 Lịch sử thanh toán và nạp tiền</b>
      <div class="table-wrap business-wallet-payments" style="margin-top:12px;overflow-x:auto">
        ${
          (w.payments || []).length
            ? `
          <table class="table" style="width:100%;text-align:left;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                <th style="padding:8px">Mã đơn</th>
                <th style="padding:8px">Booking</th>
                <th style="padding:8px">Mục đích</th>
                <th style="padding:8px">Cổng</th>
                <th style="padding:8px">Số tiền</th>
                <th style="padding:8px">Trạng thái</th>
                <th style="padding:8px">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              ${w.payments
                .map(
                  (p) => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px"><b>#${esc(p.order_code)}</b></td>
                  <td style="padding:8px">${esc(p.booking_code || (p.booking_id === "wallet_topup" ? "Nạp tiền ví" : p.booking_id || "-"))}</td>
                  <td style="padding:8px"><span class="chip ${p.purpose === "deposit" ? "g" : p.purpose === "escrow" ? "b" : "w"}">${p.purpose === "deposit" ? "Nạp tiền" : p.purpose === "escrow" ? "Khoản đảm bảo" : "Thanh toán"}</span></td>
                  <td style="padding:8px"><span class="chip ghost">${p.provider === "demo" ? "⚡ Thử nghiệm" : "🏦 Trực tuyến"}</span></td>
                  <td style="padding:8px"><b class="money">${money(p.amount)}</b></td>
                  <td style="padding:8px">${p.status === "paid" ? '<span class="chip g"><img src=/images/check-circle.svg alt aria-hidden=true style=width:1em;height:1em;vertical-align:-0.125em> Thành công</span>' : p.status === "pending" || p.status === "creating" ? `<div style="display:flex;align-items:center;gap:6px"><span class="chip w">⏳ Chờ thanh toán</span><button class="btn ghost sm sync-payment-btn" data-order="${esc(p.order_code)}" style="padding:2px 8px;font-size:11px" title="Kiểm tra trạng thái từ VNPAY">🔄 Kiểm tra</button></div>` : '<span class="chip r">Thất bại</span>'}</td>
                  <td style="padding:8px;font-size:12px" class="muted">${dateTimeStack(p.created_at)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `
            : empty("", "Chưa có lịch sử giao dịch thanh toán nào")
        }
      </div>
    </div>
  `;

  mountListSearch(el, {
    key: "business-wallet-payments",
    label: "Tìm giao dịch",
    placeholder: "Mã đơn, mã booking, mục đích hoặc trạng thái…",
    itemSelector: ".business-wallet-payments tbody > tr",
    containerSelector: ".business-wallet-payments",
  });
  el.querySelectorAll(".sync-payment-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const code = Number(btn.dataset.order);
      btn.disabled = true;
      btn.textContent = "Đang kiểm tra...";
      try {
        const res = await post("/api/booking/payment/status", { order_code: code });
        if (res.status === "paid") {
          toast("Giao dịch đã được xác nhận thành công!", "ok");
        } else {
          toast(`Trạng thái giao dịch: ${res.status}`, "ok");
        }
        await wallet(el);
      } catch (err) {
        toast(err.message || "Không thể kiểm tra giao dịch", "err");
        btn.disabled = false;
        btn.textContent = "🔄 Kiểm tra";
      }
    });
  });
  el.querySelector("#w-deposit-payos").addEventListener("click", () =>
    depositModal(),
  );
}

function depositModal() {
  const m = modal(`
    <h2>Nạp tiền trực tuyến</h2>
    <p class="muted" style="margin-bottom:12px">Thanh toán an toàn qua cổng <strong>VNPAY-QR</strong> (quét mã ngân hàng, thẻ ATM, thẻ quốc tế).</p>
    <div class="field">
      <label class="required-label">Chọn mốc số tiền hoặc nhập số tiền khác</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
        <button class="btn ghost sm preset-btn" data-val="500000">500.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="1000000">1.000.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="2000000">2.000.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="5000000">5.000.000đ</button>
      </div>
      <input id="dep-amt" type="number" placeholder="Nhập số tiền (tối thiểu 10.000đ)" value="500000" min="10000" step="10000">
    </div>
    <button class="btn primary" id="dep-go" style="width:100%;margin-top:8px">💳 Thanh toán qua VNPAY</button>
    <button data-modal-dismiss class="btn ghost" id="dep-cancel" style="width:100%;margin-top:6px">Hủy</button>
  `);

  m.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      m.querySelector("#dep-amt").value = btn.dataset.val;
    });
  });

  m.querySelector("#dep-cancel").addEventListener("click", closeModal);

  m.querySelector("#dep-go").addEventListener("click", async () => {
    const amount = Number(m.querySelector("#dep-amt").value);
    if (!amount || amount < 10000) {
      toast("Số tiền nạp tối thiểu là 10.000đ", "err");
      return;
    }
    const goBtn = m.querySelector("#dep-go");
    goBtn.disabled = true;
    try {
      const res = await post("/api/wallet/deposit", { amount });
      if (!res.checkoutUrl) throw new Error("Không nhận được liên kết thanh toán");
      closeModal();
      toast("Đang mở trang thanh toán...", "ok");
      window.location.href = res.checkoutUrl;
    } catch (e) {
      toast(e.message, "err");
      goBtn.disabled = false;
    }
  });
}
