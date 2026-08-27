import { api, post } from "./api.js";
import {
  money,
  num,
  esc,
  stars,
  tierBadge,
  statusChip,
  spinner,
  skeletonKocView,
  skeletonStatCards,
  skeletonTable,
  skeletonPage,
  empty,
  toast,
  modal,
  closeModal,
  confirmDialog,
  promptDialog,
  fmtDate,
  copyToClipboard,
  avatarUrl,
  provinceOptions,
} from "./ui.js";
import { state, logout } from "./app.js";
import { icon } from "./icons.js";
import { autoAnimate } from "./animations.js";
import {
  bankIdentityHtml,
  bankPickerHtml,
  bindBankPicker,
  selectedPayoutBank,
} from "./payout-banks.js";

const MIN_WITHDRAW_AMOUNT = 10_000;

const NAV = [
  ["#/home", icon("home", "nav-icon"), "Trang chủ"],
  ["#/bookings", icon("booking", "nav-icon"), "Booking"],
  ["#/campaigns", icon("campaign", "nav-icon"), "Chiến dịch"],
  ["#/content", icon("content", "nav-icon"), "Nội dung"],
  ["#/affiliate", icon("affiliate", "nav-icon"), "Hoa hồng bán hàng"],
  ["#/wallet", icon("wallet", "nav-icon"), "Ví"],
  ["#/notifications", icon("notification", "nav-icon"), "Thông báo"],
];

export async function renderKoc(el, hash) {
  const page = hash.replace("#/", "") || "home";
  const known = [
    "home",
    "bookings",
    "campaigns",
    "content",
    "affiliate",
    "wallet",
    "aiclone",
    "profile",
    "notifications",
  ];
  const p = known.includes(page) ? page : "home";
  let shellKoc = { name: state.user.name, avatar: "" };
  const activeNav = NAV.find((item) => item[0] === "#/" + p);
  el.innerHTML = `<div class="mobile koc-portal">
    <div class="koc-desktop-topbar">
      <div><h2>${activeNav ? activeNav[2] : "KOC Portal"}</h2></div>
      <div class="koc-desktop-actions">
        <a href="#/notifications" class="koc-top-icon" aria-label="Thông báo">${icon("notification", "nav-icon")}<span class="badge-num notification-count" hidden></span></a>
        <a href="#/profile" class="koc-top-profile" aria-label="Hồ sơ ${esc(shellKoc.name)}"><img src="${esc(avatarUrl(shellKoc.avatar))}" alt=""><span>${esc(shellKoc.name)}</span></a>
      </div>
    </div>
    <div id="koc-view"></div>${bottomNav("#/" + p)}</div>`;
  document.getElementById("koc-shell-logout").addEventListener("click", logout);
  const view = document.getElementById("koc-view");
  try {
    const profileData = await api("/api/koc/profile");
    if (profileData?.koc) {
      shellKoc = profileData.koc;
      const shellProfile = el.querySelector('.koc-top-profile');
      const shellAvatar = shellProfile?.querySelector('img');
      const shellName = shellProfile?.querySelector('span');
      if (shellAvatar) shellAvatar.src = avatarUrl(shellKoc.avatar);
      if (shellName) shellName.textContent = shellKoc.name;
      if (shellProfile) shellProfile.setAttribute('aria-label', `Hồ sơ ${shellKoc.name}`);
    }
    if (p === "home") await home(view);
    else if (p === "bookings") await bookings(view);
    else if (p === "campaigns") await campaigns(view);
    else if (p === "content") await content(view);
    else if (p === "affiliate") await affiliate(view);
    else if (p === "wallet") await wallet(view);
    else if (p === "aiclone") await aiclone(view);
    else if (p === "profile") await profile(view);
    else if (p === "notifications") await notifications(view);
    autoAnimate(view);
    await refreshNotificationBadges();
  } catch (e) {
    view.innerHTML = empty(icon("complaint", "teaser-icon"), e.message);
  }
}

function bottomNav(active) {
  return `<div class="bottom-nav">
    <div class="koc-desktop-brand"><img src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785140674/koc_app_wsfxgv.png" alt=""><span>KOC Viet</span></div>
    <nav class="koc-nav-scroll">${NAV.map((n) => `<a href="${n[0]}" class="${n[0] === active ? "active" : ""}"><span class="ico">${n[1]}</span><span class="koc-nav-label">${n[2]}</span>${n[0] === "#/notifications" ? '<span class="badge-num notification-count" hidden></span>' : ""}</a>`).join("")}</nav>
    <button class="koc-desktop-account" id="koc-shell-logout">Đăng xuất</button>
  </div>`;
}

async function refreshNotificationBadges() {
  try {
    const data = await api("/api/notifications");
    document.querySelectorAll(".notification-count").forEach((badge) => {
      badge.textContent = data.unread > 9 ? "9+" : String(data.unread || 0);
      badge.hidden = !data.unread;
    });
  } catch (_) {}
}

async function home(el) {
  const d = await api("/api/koc/dashboard");
  const k = d.koc;
  el.innerHTML = `
    <div class="m-head koc-page-heading koc-dashboard-heading">
      <div class="between"><div><div style="font-size:13px;opacity:.85">Xin chào 👋</div>
        <div style="font-size:20px;font-weight:800">${esc(k.name)}</div></div>
        <div class="row koc-home-actions" style="gap:8px"><a href="#/notifications" class="chip on-dark">🔔 <span class="notification-count" hidden></span></a>
        <a href="#/profile" class="chip on-dark">👤 Hồ sơ</a>
        <button class="chip on-dark" id="k-logout">Đăng xuất</button></div></div>
      <div class="tint-box on-dark" style="margin-top:14px">
        <div style="font-size:12px;opacity:.85">Số dư khả dụng</div>
        <div style="font-size:26px;font-weight:800" id="hm-bal">…</div></div>
    </div>
    <div class="m-body">
      <div class="row" style="margin-bottom:12px">
        <div class="stat-tile"><div class="v">${d.pending}</div><div class="l">Chờ xác nhận</div></div>
        <div class="stat-tile"><div class="v">${d.active}</div><div class="l">Đang chạy</div></div>
        <div class="stat-tile"><div class="v">${tierBadge(k.tier)}</div><div class="l">Hạng · ${stars(k.rating)}</div></div>
      </div>
      <div class="card" style="margin-bottom:12px"><div class="between"><h3>Nhận booking theo ngành</h3></div>
        <div id="acc-toggles" style="margin-top:10px"></div></div>
      <div class="card" style="background:var(--navy);color:#fff;border:none">
        <div class="between"><div><h3 class="icon-heading" style="color:#fff">${icon("aiClone", "teaser-icon")} Dịch vụ AI Clone Avatar</h3><p style="opacity:.8;font-size:12px;margin-top:4px">NetViet sản xuất video cho bạn</p></div>
          <a href="#/aiclone" class="btn grad sm">Xem</a></div>
      </div>
    </div>`;
  document.getElementById("k-logout").addEventListener("click", logout);
  const w = await api("/api/wallet");
  document.getElementById("hm-bal").textContent = money(w.balance);
  const at = document.getElementById("acc-toggles");
  at.innerHTML =
    (k.prices || [])
      .map(
        (
          pr,
        ) => `<div class="between" style="padding:6px 0;border-bottom:1px solid var(--border)">
    <span>${esc(pr.category)} · <b class="money">${money(pr.price)}</b></span>
    <button class="chip ${k.accepting[pr.category] !== false ? "g" : "r"}" data-toggle="${esc(pr.category)}">${k.accepting[pr.category] !== false ? "Đang nhận" : "Tạm ngưng"}</button></div>`,
      )
      .join("") || '<p class="muted">Chưa có bảng giá.</p>';
  at.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", async () => {
      await post("/api/koc/accepting", { category: b.dataset.toggle });
      home(el);
    }),
  );
}

let kocCampaignPage = 1;
async function campaigns(el, page = kocCampaignPage) {
  kocCampaignPage = Math.max(1, Number(page) || 1);
  const r = await api(`/api/koc/campaigns?page=${kocCampaignPage}&per=6`);
  kocCampaignPage = r.page || 1;
  el.innerHTML = `<div class="m-body"><div class="campaign-koc-grid${r.campaigns.length ? '' : ' campaign-koc-grid--empty'}">${r.campaigns.length?r.campaigns.map(c=>`<article class="card campaign-koc-card campaign-koc-card--${esc(c.status)}">
      <div class="campaign-koc-card-head"><div class="campaign-koc-company"><span>Doanh nghiệp</span><h3>${esc(c.business_name)}</h3></div>${statusChip(c.status)}</div>
      <div class="campaign-koc-money"><span>Khoản nhận sau nghiệm thu</span><strong>${money(c.amount)}</strong></div>
      <div class="campaign-koc-meta"><div><span>Ngành hàng</span><b>${esc(c.category)}</b></div><div><span>Hạng KOC</span>${tierBadge(c.tier)}</div><div><span>Hạn hoàn thành</span><b>${c.deadline||c.campaign_deadline?esc(c.deadline||c.campaign_deadline):'Chưa đặt'}</b></div></div>
      ${c.campaign_note?`<div class="campaign-koc-brief"><span>Yêu cầu chiến dịch</span><p>${esc(c.campaign_note)}</p></div>`:''}
      ${c.business_note?`<div class="campaign-koc-feedback"><b>Phản hồi doanh nghiệp</b><p>${esc(c.business_note)}</p></div>`:''}
      ${c.submission_url?`<a class="campaign-submission-link" href="${esc(c.submission_url)}" target="_blank" rel="noopener">↗ Mở nội dung đã nộp</a>`:''}
      <div class="campaign-koc-card-footer">${c.status==='invited'?`<div class="campaign-koc-actions"><button class="btn primary sm" data-campaign-accept="${c.id}">Nhận chiến dịch</button><button class="btn ghost sm" data-campaign-decline="${c.id}">Từ chối</button></div>`:''}
      ${['accepted','revision_requested'].includes(c.status)?`<div class="campaign-submit-form"><div class="field"><label>Link bài đăng / video</label><input data-campaign-url="${c.id}" value="${esc(c.submission_url||'')}" placeholder="https://..."></div><div class="field"><label>Ghi chú bàn giao</label><textarea data-campaign-note="${c.id}" rows="2">${esc(c.submission_note||'')}</textarea></div><button class="btn primary sm" data-campaign-submit="${c.id}">Gửi doanh nghiệp duyệt</button></div>`:''}
      ${!['invited','accepted','revision_requested'].includes(c.status)?`<div class="campaign-koc-waiting">${c.status==='submitted'?'Đang chờ doanh nghiệp duyệt':c.status==='approved'?'Đã duyệt · Chờ Admin giải ngân':c.status==='settled'?'Khoản tiền đã vào Ví KOC':c.status==='declined'?'Bạn đã từ chối lời mời này':'Đang xử lý'}</div>`:''}</div>
    </article>`).join(''):empty('📣','Chưa có lời mời chiến dịch lớn')}</div>
    ${r.pages>1?`<nav class="campaign-koc-pager" aria-label="Phân trang chiến dịch"><button class="btn ghost sm" data-campaign-page="${r.page-1}" ${r.page<=1?'disabled':''}>← Trước</button><span>Trang <b>${r.page}</b> / ${r.pages}</span><button class="btn ghost sm" data-campaign-page="${r.page+1}" ${r.page>=r.pages?'disabled':''}>Sau →</button></nav>`:''}</div>`;
  el.querySelectorAll('[data-campaign-page]').forEach(b=>b.addEventListener('click',()=>campaigns(el,Number(b.dataset.campaignPage))));
  el.querySelectorAll('[data-campaign-accept]').forEach(b=>b.addEventListener('click',async()=>{try{await post('/api/campaign/allocation/action',{id:b.dataset.campaignAccept,action:'accept'});toast('Đã nhận chiến dịch','ok');campaigns(el,kocCampaignPage)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-campaign-decline]').forEach(b=>b.addEventListener('click',async()=>{if(!(await confirmDialog('Xác nhận từ chối chiến dịch này?')))return;const note=await promptDialog('Lý do từ chối (không bắt buộc):')||'';try{await post('/api/campaign/allocation/action',{id:b.dataset.campaignDecline,action:'decline',note});toast('Đã từ chối lời mời','ok');campaigns(el,kocCampaignPage)}catch(e){toast(e.message,'err')}}));
  el.querySelectorAll('[data-campaign-submit]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.campaignSubmit,url=el.querySelector(`[data-campaign-url="${id}"]`).value.trim(),note=el.querySelector(`[data-campaign-note="${id}"]`).value.trim();try{await post('/api/campaign/allocation/action',{id,action:'submit',url,note});toast('Đã gửi nội dung cho doanh nghiệp duyệt','ok');campaigns(el,kocCampaignPage)}catch(e){toast(e.message,'err')}}));
}

async function bookings(el) {
  const r = await api("/api/bookings");
  const kinds = [
    ["all", "Tất cả"],
    ["aiclone", `${icon("aiClone")} AI Clone Avatar`],
    ["review", "📝 Review"],
    ["advertising", "📣 Quảng cáo"],
    ["affiliate", "🔗 Tiếp thị liên kết"],
    ["combo", "🎯 Combo"],
  ];
  el.innerHTML = `<div class="m-head koc-page-heading"><h2 style="color:#fff">Booking của tôi</h2>
      <p style="opacity:.85;font-size:12px;margin-top:4px">Phân loại rõ theo hình thức hợp tác</p></div>
    <div class="m-body">
      <div class="booking-type-tabs" id="bk-tabs">${kinds.map(([key, label], i) => `<button class="${i === 0 ? "active" : ""}" data-kind="${key}">${label}<span>${key === "all" ? r.bookings.length : r.bookings.filter((b) => bookingKind(b) === key).length}</span></button>`).join("")}</div>
      <div id="bk-list"></div>
    </div>`;
  const list = document.getElementById("bk-list");
  const draw = (kind = "all") => {
    const filtered =
      kind === "all"
        ? r.bookings
        : r.bookings.filter((b) => bookingKind(b) === kind);
    list.innerHTML = filtered.length
      ? filtered.map(bookingCard).join("")
      : empty("📋", "Không có booking thuộc loại này");
    list
      .querySelectorAll("[data-open]")
      .forEach((c) =>
        c.addEventListener("click", () => openBooking(c.dataset.open, el)),
      );
    list
      .querySelectorAll("[data-video]")
      .forEach((link) =>
        link.addEventListener("click", (event) => event.stopPropagation()),
      );
  };
  el.querySelectorAll("#bk-tabs [data-kind]").forEach((button) =>
    button.addEventListener("click", () => {
      el.querySelectorAll("#bk-tabs [data-kind]").forEach((item) =>
        item.classList.toggle("active", item === button),
      );
      draw(button.dataset.kind);
    }),
  );
  draw();
}

function bookingKind(b) {
  if (b.type === "aiclone") return "aiclone";
  const bt = b.booking_type || "ad";
  if (bt === "affiliate" || bt === "combo") return bt;
  return b.content_type === "advertising" ? "advertising" : "review";
}

function bookingKindMeta(b) {
  return {
    aiclone: [icon("aiClone"), "AI Clone Avatar", "aiclone"],
    review: ["📝", "Review", "review"],
    advertising: ["📣", "Quảng cáo", "advertising"],
    affiliate: ["🔗", "Tiếp thị liên kết", "affiliate"],
    combo: ["🎯", "Combo", "combo"],
  }[bookingKind(b)];
}

function btChip(b) {
  const [glyph, label] = bookingKindMeta(b);
  if (b.type === "aiclone") return `· ${glyph} AI Clone Avatar`;
  return `· ${glyph} ${label}${b.platform ? " · " + b.platform : ""}`;
}
function bookingCard(b) {
  const bt = b.booking_type || "ad";
  const [icon, label, cls] = bookingKindMeta(b);
  const earn =
    bt === "affiliate"
      ? `HH ${b.commission_rate}% doanh số`
      : `Nhận 95%: ${money(Math.round(b.price * 0.95))}`;
  return `<div class="list-item booking-grid-card" data-open="${b.id}" style="cursor:pointer">
    <div class="between"><span class="booking-kind ${cls}">${icon} ${label}</span>${statusChip(b.status)}</div>
    <strong style="display:block;margin-top:8px">${esc(b.bizname)}</strong>
    <div class="muted" style="font-size:12px">${esc(b.code)} · ${esc(b.category)}${b.platform ? " · " + esc(b.platform) : ""}</div>
    <div class="between" style="margin-top:8px"><span class="money">${b.price > 0 ? money(b.price) : "Theo doanh số"}</span>
      <span class="muted" style="font-size:12px">${earn}</span></div>
    ${b.type === "aiclone" && (b.koc_video_link || b.video_link) && ["pending_koc_review", "video_approved", "posted", "completed"].includes(b.status) ? `<a class="btn ok sm" data-video href="${esc(b.koc_video_link || b.video_link)}" target="_blank" rel="noopener" style="margin-top:10px;width:100%">🎥 Mở / tải video admin giao</a>` : ""}
  </div>`;
}

function videoPreviewBlock(b) {
  if (!b.video_preview_url) return "";
  return `<div class="field booking-video">
    <label>🎥 Video phiên bản ${Number(b.video_version || 1)}</label>
    <div class="stream-frame"><video src="${esc(b.video_preview_url)}" title="Video ${esc(b.code)}" controls playsinline preload="metadata"></video></div>
    <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
      ${b.video_download_url ? `<a class="btn ghost sm" href="${esc(b.video_download_url)}" target="_blank" rel="noopener">⬇️ Tải video MP4</a>` : '<span class="muted" style="font-size:12px">Bản MP4 đang được chuẩn bị.</span>'}
    </div>
  </div>`;
}

function videoUploadForm() {
  return `<div class="video-upload-box">
    <div class="field"><label>Video gửi doanh nghiệp duyệt</label>
      <input id="a-video" type="file" accept="video/mp4,video/webm,.mp4,.m4v,.webm">
      <p class="hint">Chấp nhận MP4/WebM, tối đa 5 phút và 5 GB. Video được lưu riêng tư và chỉ người có quyền mới xem được.</p>
    </div>
    <div class="upload-progress" id="a-upload-progress" hidden>
      <div class="between"><span id="a-upload-label">Đang tải video…</span><b id="a-upload-percent">0%</b></div>
      <div class="progress"><i id="a-upload-bar" style="width:0"></i></div>
    </div>
    <button class="btn primary" id="a-upload">☁️ Upload video để duyệt</button>
  </div>`;
}

function uploadR2Part(
  uploadUrl,
  partNumber,
  chunk,
  progressBase,
  fileSize,
  onProgress,
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "PUT",
      `${uploadUrl}&part_number=${encodeURIComponent(partNumber)}`,
    );
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress((progressBase + event.loaded) / fileSize);
    });
    xhr.addEventListener("load", () => {
      let result = {};
      try {
        result = JSON.parse(xhr.responseText || "{}");
      } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(result);
      else
        reject(
          new Error(
            result.error || `Chưa tải được video (${xhr.status})`,
          ),
        );
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Mất kết nối khi tải video")),
    );
    xhr.send(chunk);
  });
}

async function uploadR2Video(session, file, onProgress) {
  const chunkSize = Number(session.chunk_size) || 10 * 1024 * 1024;
  const parts = [];
  let offset = 0;
  let partNumber = 1;
  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    let uploaded;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        uploaded = await uploadR2Part(
          session.upload_url,
          partNumber,
          file.slice(offset, end),
          offset,
          file.size,
          onProgress,
        );
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }
    if (!uploaded?.etag)
      throw new Error("Hệ thống chưa xác nhận phần video đã tải");
    parts.push({
      partNumber: Number(uploaded.partNumber || partNumber),
      etag: uploaded.etag,
    });
    offset = end;
    partNumber += 1;
    onProgress(offset / file.size);
  }
  return parts;
}

function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = () => URL.revokeObjectURL(objectUrl);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      done();
      if (Number.isFinite(duration)) resolve(duration);
      else reject(new Error("Không đọc được thời lượng video"));
    };
    video.onerror = () => {
      done();
      reject(new Error("Video không tương thích. Vui lòng dùng MP4 hoặc WebM"));
    };
    video.src = objectUrl;
  });
}

async function uploadBookingVideo(b, act, el) {
  const file = act.querySelector("#a-video")?.files?.[0];
  if (!file) return toast("Chọn video cần gửi duyệt", "err");
  if (
    !["video/mp4", "video/webm"].includes(file.type) &&
    !/\.(mp4|m4v|webm)$/i.test(file.name)
  )
    return toast("Chỉ chấp nhận video MP4 hoặc WebM", "err");
  if (file.size > 5 * 1024 * 1024 * 1024)
    return toast("Video vượt quá giới hạn 5 GB", "err");

  const button = act.querySelector("#a-upload");
  const progress = act.querySelector("#a-upload-progress");
  const label = act.querySelector("#a-upload-label");
  const percent = act.querySelector("#a-upload-percent");
  const bar = act.querySelector("#a-upload-bar");
  button.disabled = true;
  progress.hidden = false;
  const setProgress = (ratio, text = "Đang tải video…") => {
    const value = Math.max(0, Math.min(100, Math.round(ratio * 100)));
    label.textContent = text;
    percent.textContent = `${value}%`;
    bar.style.width = `${value}%`;
  };
  let session;
  try {
    setProgress(0, "Đang kiểm tra video…");
    const duration = await readVideoDuration(file);
    if (duration > 300)
      throw new Error("Video dài quá 5 phút. Vui lòng chọn video ngắn hơn");
    session = await post("/api/booking/video/upload-url", {
      booking_id: b.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      duration,
    });
    const parts = await uploadR2Video(session, file, setProgress);
    setProgress(1, "Đã tải xong · đang gửi doanh nghiệp duyệt…");
    const completed = await post("/api/booking/video/complete", {
      submission_id: session.submission_id,
      parts,
    });
    toast(
      completed.video?.status === "pending_review"
        ? "Đã gửi video cho doanh nghiệp duyệt"
        : "Đã tải video thành công",
      "ok",
    );
    closeModal();
    bookings(el);
  } catch (error) {
    if (session?.submission_id) {
      try {
        await post("/api/booking/video/fail", {
          submission_id: session.submission_id,
          reason: error.message,
        });
      } catch (_) {}
    }
    toast(error.message, "err");
    label.textContent = "Upload chưa hoàn tất";
    button.disabled = false;
  }
}

async function openBooking(id, el) {
  const r = await api("/api/bookings");
  const b = r.bookings.find((x) => x.id === id);
  if (!b) return;
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
      if (video.status === "pending_review" && b.status === "video_processing")
        b.status = "pending_review";
      b.video_status = video.status;
      b.video_preview_url = video.preview_url;
      b.video_thumbnail_url = video.thumbnail_url;
      b.video_download_url = video.download_url;
      b.video_duration = video.duration;
    } catch (_) {}
  }
  if (b.booking_type === "affiliate" || b.booking_type === "combo") {
    try {
      const lk = await api("/api/affiliate/links");
      const found = (lk.links || []).find((x) => x.booking_id === b.id);
      if (found) b.affLink = found.generated_url;
    } catch (e) {}
  }
  const m = modal(`
    <div class="between"><h2>${esc(b.code)}</h2>${statusChip(b.status)}</div>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>Doanh nghiệp</span><b>${esc(b.bizname)}</b></div>
      <div class="between"><span>Ngành hàng</span><b>${esc(b.category)}</b></div>
      <div class="between"><span>Kiểu booking</span><b>${bookingKindMeta(b)[0]} ${bookingKindMeta(b)[1]}${b.platform ? " · " + esc(b.platform) : ""}</b></div>
      ${
        b.price > 0
          ? `<div class="between"><span>Phí booking</span><b class="money">${money(b.price)}</b></div>
      <div class="between"><span>Bạn nhận (95%)</span><b class="money">${money(Math.round(b.price * 0.95))}</b></div>`
          : ""
      }
      ${b.booking_type === "affiliate" || b.booking_type === "combo" ? `<div class="between"><span>Hoa hồng bán hàng</span><b>${b.commission_rate}% doanh số</b></div>` : ""}
      <div class="between"><span>Hạn</span><b>${esc(b.deadline || "—")}</b></div>
    </div>
    <div class="field"><label>${icon("productData")} Link dữ liệu sản phẩm (kiểm tra trước khi xác nhận)</label>
      <div class="copybox"><a href="${esc(b.product_link)}" target="_blank" style="color:var(--info)">${esc(b.product_link || "—")}</a></div></div>
    ${b.product_url ? `<div class="field"><label>🛒 Link sản phẩm gốc trên sàn (${esc(b.platform)})</label><div class="copybox"><a href="${esc(b.product_url)}" target="_blank" style="color:var(--info)">${esc(b.product_url)}</a></div></div>` : ""}
    ${b.affLink ? `<div class="field"><label>🔗 Đường dẫn sản phẩm dành riêng cho bạn</label><div class="copybox affiliate-link-copy"><span title="${esc(b.affLink)}">${esc(b.affLink)}</span><button class="btn primary sm" id="bk-copyaff">Sao chép</button></div></div>` : ""}
    <div class="field"><label>Yêu cầu</label><div class="tint-box">${esc(b.requirements || "—")}</div></div>
    ${b.type === "aiclone" && b.aiclone_script ? `<div class="field"><label>Kịch bản AI Clone</label><div class="tint-box" style="white-space:pre-wrap">${esc(b.aiclone_script)}</div></div>` : ""}
    ${(b.koc_video_link || b.video_link) && (b.type !== "aiclone" || ["pending_koc_review", "video_approved", "posted", "completed"].includes(b.status)) ? `<div class="field"><label>🎥 Video AI Clone Avatar admin giao KOC</label><div class="copybox" style="flex-wrap:wrap"><span style="flex:1;min-width:180px">${esc(b.koc_video_link || b.video_link)}</span><a class="btn ok sm" href="${esc(b.koc_video_link || b.video_link)}" target="_blank" rel="noopener">Mở / tải video</a></div></div>` : ""}
    ${videoPreviewBlock(b)}
    ${b.video_review_note ? `<div class="tint-box video-review-note"><b>${b.status === "revision_requested" ? "Doanh nghiệp yêu cầu sửa:" : "Phản hồi duyệt:"}</b><p>${esc(b.video_review_note)}</p></div>` : ""}
    ${b.post_link ? `<div class="field"><label>Bài đã đăng (${esc(b.post_platform)})</label><div class="copybox">${esc(b.post_link)}</div></div>` : ""}
    ${b.reject_reason ? `<div class="chip r">Lý do từ chối: ${esc(b.reject_reason)}</div>` : ""}
    <div id="bk-actions" style="margin-top:14px"></div>
    <button class="btn ghost" id="bk-close" style="margin-top:8px">Đóng</button>`);
  m.querySelector("#bk-close").addEventListener("click", closeModal);
  const copyAff = m.querySelector("#bk-copyaff");
  if (copyAff)
    copyAff.addEventListener("click", async () => {
      const ok = await copyToClipboard(b.affLink);
      if (ok) {
        toast("Đã sao chép đường dẫn sản phẩm", "ok");
      } else {
        toast("Không thể sao chép tự động", "err");
      }
    });
  const act = m.querySelector("#bk-actions");
  if (
    b.status === "pending" &&
    b.type === "aiclone" &&
    !Number(b.koc_ai_clone)
  ) {
    act.innerHTML = `<div class="tint-box" style="margin-bottom:10px">
        <b>Bạn chưa đăng ký AI Clone Avatar</b>
        <p class="muted" style="margin-top:5px">Bạn cần đọc và đồng ý điều khoản AI Clone Avatar trước khi có thể nhận booking này.</p>
      </div>
      <a class="btn primary" href="#/aiclone">Đăng ký AI Clone Avatar</a>
      <button class="btn danger" id="a-reject" style="margin-top:8px">Từ chối booking</button>`;
    act.querySelector("#a-reject").addEventListener("click", async () => {
      const reason = await promptDialog("Lý do từ chối booking:");
      if (reason) doAction(b.id, "reject", { reason }, el);
    });
  } else if (b.status === "pending") {
    act.innerHTML = `<button class="btn ok" id="a-confirm">✅ Xác nhận booking</button>
      <button class="btn danger" id="a-reject" style="margin-top:8px">Từ chối</button>`;
    act
      .querySelector("#a-confirm")
      .addEventListener("click", () => doAction(b.id, "confirm", {}, el));
    act.querySelector("#a-reject").addEventListener("click", async () => {
      const reason = await promptDialog("Lý do từ chối booking:");
      if (reason) doAction(b.id, "reject", { reason }, el);
    });
  } else if (
    b.type === "aiclone" &&
    ["brief_review", "producing", "pending_business_review"].includes(b.status)
  ) {
    const text =
      b.status === "brief_review"
        ? "NetViet đang kiểm tra yêu cầu của doanh nghiệp và chuẩn bị sản xuất."
        : b.status === "producing"
          ? "NetViet đang sản xuất video AI Clone."
          : "Bản dựng đang chờ doanh nghiệp duyệt trước.";
    act.innerHTML = `<div class="tint-box"><b>⏳ ${text}</b><p class="muted" style="margin-top:4px">Ngay khi doanh nghiệp duyệt, video sẽ tự động chuyển đến bạn phê duyệt và đăng tải.</p></div>`;
  } else if (b.type === "aiclone" && b.status === "pending_koc_review") {
    if (!Number(b.koc_ai_clone)) {
      act.innerHTML = `<div class="tint-box" style="margin-bottom:10px">
          <b>Bạn cần đăng ký AI Clone Avatar trước khi duyệt video</b>
          <p class="muted" style="margin-top:5px">Hãy đọc và đồng ý điều khoản sử dụng hình ảnh, sau đó quay lại booking này để duyệt.</p>
        </div>
        <a class="btn primary" href="#/aiclone">Đăng ký AI Clone Avatar</a>`;
      return;
    }
    act.innerHTML = `<div class="field"><label>Nhận xét khi yêu cầu chỉnh sửa</label><textarea id="a-ai-note" rows="3" placeholder="Nêu rõ vấn đề về hình ảnh, giọng nói hoặc nội dung…"></textarea></div>
      <div class="row" style="gap:8px"><button class="btn ok" id="a-ai-approve" style="flex:1">✅ Phê duyệt video</button>
      <button class="btn danger" id="a-ai-revise" style="flex:1">↩ Yêu cầu sửa</button></div>
      <p class="hint">Sau khi duyệt, đường dẫn sản phẩm riêng sẽ được tạo để bạn đăng video và quảng bá sản phẩm.</p>`;
    const review = async (action) => {
      const note = act.querySelector("#a-ai-note").value.trim();
      if (action === "request_revision" && !note)
        return toast("Nhập nội dung cần chỉnh sửa", "err");
      try {
        await post("/api/aiclone/video-review", { id: b.id, action, note });
        toast(
          action === "approve"
            ? "Đã phê duyệt · bạn có thể đăng video"
            : "Đã gửi yêu cầu chỉnh sửa",
          "ok",
        );
        closeModal();
        bookings(el);
      } catch (e) {
        toast(e.message, "err");
      }
    };
    act
      .querySelector("#a-ai-approve")
      .addEventListener("click", () => review("approve"));
    act
      .querySelector("#a-ai-revise")
      .addEventListener("click", () => review("request_revision"));
  } else if (b.type === "aiclone" && b.status === "revision_requested") {
    act.innerHTML = `<div class="chip r">NetViet đang tiếp nhận yêu cầu chỉnh sửa: ${esc(b.reject_reason || "")}</div>`;
  } else if (b.status === "confirmed" && b.type === "aiclone") {
    act.innerHTML = `<button class="btn primary" id="a-produce">🎬 Bắt đầu sản xuất content</button>`;
    act
      .querySelector("#a-produce")
      .addEventListener("click", () => doAction(b.id, "produce", {}, el));
  } else if (["producing", "revision_requested"].includes(b.status) && b.type === "aiclone") {
    act.innerHTML = videoUploadForm();
    act
      .querySelector("#a-upload")
      .addEventListener("click", () => uploadBookingVideo(b, act, el));
  } else if (b.status === "video_processing" && b.type === "aiclone") {
    act.innerHTML = `<div class="tint-box"><b>Đang hoàn tất video</b><p class="muted" style="margin-top:4px">Bấm kiểm tra để cập nhật trạng thái.</p></div>
      <button class="btn primary" id="a-video-refresh" style="margin-top:8px">↻ Kiểm tra trạng thái video</button>`;
    act
      .querySelector("#a-video-refresh")
      .addEventListener("click", async () => {
        const button = act.querySelector("#a-video-refresh");
        button.disabled = true;
        try {
          const result = await post("/api/booking/video/status", {
            submission_id: b.video_submission_id,
          });
          toast(
            result.video?.status === "pending_review"
              ? "Video đã sẵn sàng và được gửi doanh nghiệp duyệt"
              : "Video vẫn đang được xử lý",
            result.video?.status === "pending_review" ? "ok" : "",
          );
          closeModal();
          bookings(el);
        } catch (error) {
          toast(error.message, "err");
          button.disabled = false;
        }
      });
  } else if (b.status === "pending_review" && b.type === "aiclone") {
    act.innerHTML = `<div class="tint-box"><b>⏳ Đang chờ doanh nghiệp duyệt</b><p class="muted" style="margin-top:4px">Bạn chỉ có thể đăng video sau khi được duyệt.</p></div>`;
  } else if (b.status === "video_approved" || (b.type !== "aiclone" && ["confirmed", "producing", "video_approved"].includes(b.status))) {
    act.innerHTML = `<div class="field"><label>Nền tảng đăng bài</label><select id="a-plat"><option>TikTok</option><option>Facebook</option><option>Instagram</option><option>YouTube</option></select></div>
      <div class="field"><label>Link bài đã đăng review</label><input id="a-link" placeholder="https://…"></div>
      <button class="btn primary" id="a-submit">📤 Nộp link bài đăng review</button>`;
    act.querySelector("#a-submit").addEventListener("click", () => {
      const post_link = act.querySelector("#a-link").value.trim();
      if (!post_link) return toast("Nhập link bài đăng", "err");
      doAction(
        b.id,
        "submit",
        { post_link, post_platform: act.querySelector("#a-plat").value },
        el,
      );
    });
  } else if (
    [
      "posted",
      "settling",
      "payment_pending",
      "payment_failed",
      "payment_cancelled",
    ].includes(b.status)
  ) {
    act.innerHTML = `<div class="tint-box"><b>Đã nộp link bài đăng review</b><p class="muted" style="margin-top:4px">Đang chờ doanh nghiệp kiểm tra bài đăng và duyệt giải ngân. Sau khi duyệt, 95% phí booking sẽ được chuyển trực tiếp vào ví của bạn.</p></div>`;
  } else {
    act.innerHTML = `<p class="muted">Không có thao tác ở trạng thái này.</p>`;
  }
  if (b.status !== "rejected") {
    const complainBtn = document.createElement("button");
    complainBtn.className = "btn ghost sm";
    complainBtn.style.marginTop = "8px";
    complainBtn.style.width = "100%";
    complainBtn.innerHTML = `${icon("complaint", "btn-icon")} Gửi khiếu nại về booking này`;
    complainBtn.addEventListener("click", async () => {
      const reason = await promptDialog("Mô tả vấn đề bạn gặp phải với booking này:");
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

async function doAction(id, action, extra, el) {
  try {
    await post("/api/booking/action", { id, action, ...extra });
    toast("Đã cập nhật", "ok");
    closeModal();
    bookings(el);
  } catch (e) {
    toast(e.message, "err");
  }
}

async function content(el) {
  const r = await api("/api/bookings");
  const active = r.bookings.filter((b) =>
    ["confirmed", "producing", "posted"].includes(b.status),
  );
  el.innerHTML = `<div class="m-head koc-page-heading"><h2 style="color:#fff">Nội dung đang sản xuất</h2></div><div class="m-body"></div>`;
  const body = el.querySelector(".m-body");
  body.classList.add("koc-content-grid");
  if (!active.length) {
    body.innerHTML = empty("🎬", "Chưa có nội dung nào đang chạy");
    return;
  }
  body.innerHTML = active
    .map(
      (b) => `<div class="list-item koc-content-card">
    <div class="between"><strong>${esc(b.bizname)}</strong>${statusChip(b.status)}</div>
    <div class="muted" style="font-size:12px">${esc(b.category)} · Hạn ${esc(b.deadline || "—")}</div>
    <div class="copybox" style="margin-top:8px">${icon("productData")} <a href="${esc(b.product_link)}" target="_blank" style="color:var(--info)">Dữ liệu sản phẩm</a></div>
    ${b.post_link ? `<div class="chip g" style="margin-top:8px">Đã đăng: ${esc(b.post_platform)}</div>` : ""}
    <button class="btn ghost sm" data-open="${b.id}" style="margin-top:10px;width:100%">Quản lý</button>
  </div>`,
    )
    .join("");
  body
    .querySelectorAll("[data-open]")
    .forEach((bt) =>
      bt.addEventListener("click", () => openBooking(bt.dataset.open, el)),
    );
}

async function affiliate(el) {
  const [legacy, r] = await Promise.all([
    api("/api/affiliate"),
    api("/api/affiliate/links"),
  ]);
  el.innerHTML = `<div class="m-head koc-page-heading"><h2 style="color:#fff">Hoa hồng bán hàng</h2><p style="opacity:.85;font-size:12px">Nhớ gắn nhãn #quangcao khi đăng bài</p></div><div class="m-body"></div>`;
  const body = el.querySelector(".m-body");
  body.classList.add("koc-affiliate-grid");
  const hasNew = r.links && r.links.length;
  const hasLegacy = legacy.affiliates && legacy.affiliates.length;
  if (!hasNew && !hasLegacy) {
    body.innerHTML = empty(
      "🔗",
      "Nhận booking tiếp thị liên kết để hệ thống tạo đường dẫn sản phẩm riêng",
    );
    return;
  }
  let html = "";
  // NEW: per-KOC generated affiliate links with tracking
  html += (r.links || [])
    .map((a) => {
      const s = a.stat || {};
      const orders = a.orders || [];
      return `<div class="list-item koc-affiliate-card">
      <div class="between"><strong>${esc(a.code)}</strong><span class="chip b">${esc(a.platform)} · ${esc(a.category)}</span></div>
      <div class="muted" style="font-size:12px">${esc(a.bizname)} · Hoa hồng ${a.commission_rate}%</div>
      <div class="copybox affiliate-link-copy" style="margin:8px 0"><span title="${esc(a.generated_url)}">${esc(a.generated_url)}</span><button class="btn primary sm" data-copy="${esc(a.generated_url)}">Sao chép</button></div>
      <div class="row" style="gap:14px;flex-wrap:wrap">
        <div><div class="v" style="font-weight:800">${num(a.clicks)}</div><div class="muted" style="font-size:11px">Click</div></div>
        <div><div class="v" style="font-weight:800">${num(s.orders || 0)}</div><div class="muted" style="font-size:11px">Đơn</div></div>
        <div><div class="v" style="font-weight:800">${(a.conversion || 0).toFixed(1)}%</div><div class="muted" style="font-size:11px">Chuyển đổi</div></div>
        <div><div class="v money" style="font-weight:800">${money(s.gmv || 0)}</div><div class="muted" style="font-size:11px">Doanh số</div></div>
        <div><div class="v money" style="font-weight:800">${money(s.valid_comm || 0)}</div><div class="muted" style="font-size:11px">Hoa hồng</div></div>
      </div>
      <div class="affiliate-orders">
        <div class="between"><b>Trạng thái từng đơn</b><span class="muted">${orders.length} đơn gần nhất</span></div>
        ${
          orders.length
            ? orders
                .map((order) => {
                  const reversed = ["cancelled", "refunded"].includes(
                    order.status,
                  );
                  return `<div class="affiliate-order ${reversed ? "reversed" : ""}">
            <div><b>${esc(order.platform_order_id)}</b><div class="muted">${money(order.gmv)} · ${fmtDate(order.ordered_at)}</div></div>
            <div style="text-align:right">${statusChip(order.status)}
              <div class="${reversed ? "amount-reversed" : "money"}">${reversed ? "-" : "+"}${money(order.commission_amount)}</div>
            </div>
            ${
              ["pending", "confirmed"].includes(order.status)
                ? `<div class="order-actions">
              <button class="btn ghost sm" data-order-state="${order.id}" data-to="cancelled">Giả lập hủy</button>
              <button class="btn danger sm" data-order-state="${order.id}" data-to="refunded">Giả lập hoàn</button>
            </div>`
                : ""
            }
          </div>`;
                })
                .join("")
            : '<p class="muted" style="font-size:12px;margin-top:8px">Chưa phát sinh đơn.</p>'
        }
      </div>
      <div class="tint-box" style="margin-top:8px;font-size:12px">💡 Caption: "Sản phẩm mình cực ưng 😍 Link ở bio nhé! #quangcao #review #${esc((a.category || "").replace(/\s/g, ""))}"</div>
      <button class="btn ghost sm" data-sync="${a.id}" style="margin-top:8px;width:100%">🧪 Giả lập phát sinh đơn (đồng bộ từ sàn)</button>
    </div>`;
    })
    .join("");
  // LEGACY affiliate rows (pre-existing bookings)
  html += (legacy.affiliates || [])
    .map((a) => {
      const url = location.origin + "/r/" + a.short_code;
      return `<div class="list-item koc-affiliate-card">
      <div class="between"><strong>${esc(a.code)}</strong><span class="chip b">${esc(a.category)}</span></div>
      <div class="copybox affiliate-link-copy" style="margin:8px 0"><span title="${esc(url)}">${esc(url)}</span><button class="btn primary sm" data-copy="${esc(url)}">Sao chép</button></div>
      <div class="row" style="gap:16px">
        <div><div class="v" style="font-weight:800">${num(a.clicks)}</div><div class="muted" style="font-size:11px">Click</div></div>
        <div><div class="v" style="font-weight:800">${num(a.orders)}</div><div class="muted" style="font-size:11px">Đơn</div></div>
        <div><div class="v money" style="font-weight:800">${money(a.commission)}</div><div class="muted" style="font-size:11px">Hoa hồng</div></div>
      </div>
      <button class="btn ghost sm" data-order="${a.id}" style="margin-top:8px;width:100%">🧪 Giả lập phát sinh đơn</button>
    </div>`;
    })
    .join("");
  body.innerHTML = html;
  body.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      const textToCopy = b.dataset.copy || b.getAttribute("data-copy");
      const ok = await copyToClipboard(textToCopy);
      if (ok) {
        toast("Đã sao chép", "ok");
      } else {
        toast("Không thể sao chép tự động", "err");
      }
    }),
  );
  body.querySelectorAll("[data-sync]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        const rr = await post("/api/affiliate/sync", {
          linkId: b.dataset.sync,
        });
        toast(
          `Đơn ${rr.orderId} · Doanh số ${money(rr.gmv)} · Hoa hồng +${money(rr.commission)}`,
          "ok",
        );
        affiliate(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  body.querySelectorAll("[data-order]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        const rr = await post("/api/affiliate/order", { id: b.dataset.order });
        toast(`+${rr.addOrders} đơn · +${money(rr.addCommission)}`, "ok");
        affiliate(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
  body.querySelectorAll("[data-order-state]").forEach((button) =>
    button.addEventListener("click", async () => {
      const actionLabel = button.dataset.to === "refunded" ? "hoàn" : "hủy";
      if (
        !(await confirmDialog(
          `Giả lập ${actionLabel} đơn này? Hoa hồng sẽ được cập nhật tương ứng.`,
        ))
      )
        return;
      try {
        await post("/api/affiliate/order-status", {
          orderId: button.dataset.orderState,
          to: button.dataset.to,
        });
        toast(`Đã ${actionLabel} đơn và cập nhật hoa hồng`, "ok");
        affiliate(el);
      } catch (e) {
        toast(e.message, "err");
      }
    }),
  );
}

async function wallet(el) {
  const w = await api("/api/wallet");
  const summary = w.commissionSummary || {
    expected: w.pending || 0,
    reconciled: 0,
    paid: 0,
  };
  el.innerHTML = `
    <div class="m-head koc-page-heading koc-wallet-heading">
      <div class="tint-box on-dark">
        <div style="font-size:12px;opacity:.85">Số dư khả dụng</div>
        <div style="font-size:30px;font-weight:800">${money(w.balance)}</div>
        <div style="font-size:12px;opacity:.85;margin-top:6px">Hoa hồng dự kiến: ${money(summary.expected)}</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn" id="w-withdraw-payos" style="flex:1;min-width:140px;background:#ffffff;color:#1e293b;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.15)">🏦 Rút về ngân hàng</button>
      </div>
    </div>
    <div class="m-body">
      <h3 style="margin-bottom:10px">Trạng thái hoa hồng</h3>
      <div class="commission-summary">
        <div class="commission-state expected"><span>⏳</span><b>${money(summary.expected)}</b><small>Dự kiến</small></div>
        <div class="commission-state reconciled"><span>✓</span><b>${money(summary.reconciled)}</b><small>Đã đối soát</small></div>
        <div class="commission-state paid"><span>₫</span><b>${money(summary.paid)}</b><small>Đã thanh toán</small></div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <h3 style="margin-bottom:8px">Tài khoản nhận thanh toán</h3>
        ${
          w.payout && w.payout.bank_account
            ? `
          <div class="between" style="padding:4px 0"><span class="muted">Ngân hàng</span>${bankIdentityHtml(state.config?.payoutBanks, w.payout.bank_name, w.payout.bank_bin)}</div>
          <div class="between" style="padding:4px 0"><span class="muted">Số tài khoản</span><b>${esc(w.payout.bank_account || "")}</b></div>
          <div class="between" style="padding:4px 0"><span class="muted">Chủ tài khoản</span><b>${esc(w.payout.bank_owner || "")}</b></div>
          <div class="between" style="padding:4px 0"><span class="muted">Email</span><b>${esc(w.payout.email || "")}</b></div>
        `
            : `<p class="muted" style="font-size:12.5px">Chưa có thông tin tài khoản nhận thanh toán — được thiết lập ở bước đăng ký KOC.</p>`
        }
      </div>
      <h3 style="margin-bottom:10px">Lịch sử giao dịch</h3><div id="w-tx"></div></div>`;
  document
    .getElementById("w-withdraw-payos")
    .addEventListener("click", () =>
      withdrawModal(w.balance, el, w.payout),
    );
  const tx = document.getElementById("w-tx");
  if (!w.transactions.length) {
    tx.innerHTML = empty("💰", "Chưa có giao dịch");
    return;
  }
  const label = {
    booking: "Phí booking",
    commission: "Hoa hồng",
    commission_reversal: "Điều chỉnh hoa hồng",
    withdraw: "Rút tiền",
  };
  tx.innerHTML = w.transactions
    .map((t) => {
      const ignored =
        ["cancelled", "refunded"].includes(t.status) && t.type === "commission";
      const outgoing =
        t.type === "withdraw" ||
        t.type === "commission_reversal" ||
        Number(t.amount) < 0;
      const amountText = ignored
        ? `Không ghi nhận ${money(Math.abs(t.amount))}`
        : `${outgoing ? "-" : "+"}${money(Math.abs(t.amount))}`;
      return `<div class="wallet-transaction ${ignored ? "reversed" : ""}">
      <div><div><b>${label[t.type] || t.type}</b> ${walletStatusChip(t.status)}</div><div class="muted" style="font-size:12px">${esc(t.note || "")} · ${fmtDate(t.created_at)}</div></div>
      <div class="${ignored ? "amount-reversed" : "money"}" style="color:${outgoing || ignored ? "var(--error)" : "var(--success)"}">${amountText}</div>
    </div>`;
    })
    .join("");
}

function walletStatusChip(status) {
  const meta = {
    pending: ["Dự kiến", "w"],
    expected: ["Dự kiến", "w"],
    settled: ["Đã đối soát", "b"],
    reconciled: ["Đã đối soát", "b"],
    paid: ["Đã thanh toán", "g"],
    processing: ["Đang xử lý", "w"],
    cancelled: ["Đơn đã hủy", "r"],
    refunded: ["Đơn đã hoàn", "r"],
  }[status] || [status, "n"];
  return `<span class="chip ${meta[1]}">${esc(meta[0])}</span>`;
}

function withdrawModal(balance, el, payout) {
  const minimumWithdrawLabel = MIN_WITHDRAW_AMOUNT.toLocaleString("vi-VN");
  const hasBank = payout && payout.bank_account && payout.bank_name && /^\d{6}$/.test(String(payout.bank_bin || ""));
  const m = modal(`<h2>Rút tiền về tài khoản ngân hàng</h2>
    <p class="muted">Khả dụng: <b class="money">${money(balance)}</b> · Tối thiểu ${minimumWithdrawLabel}đ</p>
    ${
      hasBank
        ? `<div style="background:var(--bg-muted);padding:10px;border-radius:8px;margin:10px 0;font-size:13px">
              <div class="between"><span class="muted">Ngân hàng nhận:</span> ${bankIdentityHtml(state.config?.payoutBanks, payout.bank_name, payout.bank_bin)}</div>
              <div><span class="muted">Số tài khoản:</span> <b>${esc(payout.bank_account)}</b> (${esc(payout.bank_owner || "")})</div>
             </div>`
        : `<div style="color:var(--error);background:rgba(239,68,68,0.1);padding:10px;border-radius:8px;margin:10px 0;font-size:13px">
              ⚠️ Chưa cập nhật thông tin ngân hàng. Vui lòng thiết lập tài khoản nhận tiền trước khi rút.
             </div>`
    }
    <div class="field" style="margin-top:12px"><label>Số tiền</label><input id="wd-amt" type="number" placeholder="đ" value="${MIN_WITHDRAW_AMOUNT}" min="${MIN_WITHDRAW_AMOUNT}" step="10000"></div>
    <div class="field"><label>Mã OTP gửi qua email</label><div class="row" style="gap:8px">
      <input id="wd-otp" class="otp-in" inputmode="numeric" maxlength="6" placeholder="••••••" style="flex:1">
      <button class="btn ghost sm" id="wd-send-otp" type="button">Gửi OTP</button>
    </div></div>
    <button class="btn primary" id="wd-go">🏦 Xác nhận rút tiền</button>
    <button class="btn ghost" id="wd-cancel" style="margin-top:8px">Hủy</button>`);
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
    if (!amount || amount < MIN_WITHDRAW_AMOUNT) {
      toast(`Ngưỡng rút tối thiểu ${minimumWithdrawLabel}đ`, "err");
      return;
    }
    if (!otp) {
      toast("Vui lòng nhập mã OTP", "err");
      return;
    }
    const goBtn = m.querySelector("#wd-go");
    goBtn.disabled = true;
    try {
      const res = await post("/api/wallet/withdraw", { amount, otp });
      toast(res.message || "Yêu cầu rút tiền thành công", "ok");
      closeModal();
      wallet(el);
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
function aiCloneTermsBody() {
  return `
    <p class="aic-doc-sub">Dành cho KOC/KOL tham gia Nền tảng KOC Việt – NetViet</p>
    <p class="aic-intro">Văn bản này giải thích Chương trình AI Clone Avatar và tập hợp các điều khoản, cam kết mà KOC ("Tôi") xác nhận đồng ý trước khi tham gia. Việc xác nhận tham gia là hoàn toàn tự nguyện và được ghi nhận bằng phương thức điện tử (tick xác nhận), có giá trị pháp lý theo Luật Giao dịch điện tử số 20/2023/QH15.</p>

    <p class="aic-part">PHẦN A — GIỚI THIỆU CHƯƠNG TRÌNH AI CLONE AVATAR</p>
    <p class="aic-h"><b>A.1. AI Clone Avatar là gì?</b></p>
    <p>Dịch vụ video đại diện dùng trí tuệ nhân tạo để tái tạo hình ảnh và giọng nói của chính KOC. Khi có booking từ doanh nghiệp, đối tác sản xuất của KOC Việt sẽ tạo video đánh giá hoặc giới thiệu sản phẩm, sau đó gửi lại để KOC duyệt trước khi đăng tải.</p>
    <p class="aic-h"><b>A.2. Chương trình vận hành như thế nào?</b></p>
    <p>Đối tác sản xuất của KOC Việt tiếp nhận booking từ doanh nghiệp và sử dụng hình ảnh, giọng nói đã được KOC cho phép để tạo video. Video hoàn thiện được gửi tới KOC xem trước và phê duyệt. Nếu phù hợp, KOC đăng video lên kênh mạng xã hội và gắn đường dẫn sản phẩm (nếu có) để nhận phí booking cùng hoa hồng bán hàng.</p>
    <p class="aic-h"><b>A.3. Lợi ích dành cho KOC</b></p>
    <ul>
      <li>Không phải bỏ công sức sáng tạo, quay dựng, sản xuất nội dung — công việc này do đối tác AI đảm nhiệm.</li>
      <li>Có thêm nguồn thu nhập: nhận phí booking và hoa hồng bán hàng cho mỗi nội dung phù hợp được đăng tải.</li>
      <li>Không ảnh hưởng tới công việc sáng tạo nội dung KOC đang làm; KOC hoàn toàn chủ động về thời gian.</li>
      <li>KOC luôn giữ quyền duyệt và đăng tải: chỉ những video KOC xét thấy phù hợp mới được đăng tải.</li>
    </ul>
    <p class="aic-h"><b>A.4. Lợi ích cho doanh nghiệp</b></p>
    <ul>
      <li>Không tốn sản phẩm mẫu và chi phí vận chuyển vì nội dung được sản xuất bằng AI.</li>
      <li>Chi phí booking hợp lý hơn do KOC không phải trực tiếp sản xuất nội dung.</li>
      <li>Kiểm soát rủi ro và thông điệp: nội dung được duyệt trước khi đăng và có thể tạo doanh thu nhờ đường dẫn sản phẩm riêng.</li>
    </ul>
    <p class="aic-h"><b>A.5. Những điểm KOC cần đặc biệt lưu ý</b></p>
    <ul>
      <li>Video AI Clone Avatar giống KOC thật tới 99% — vì vậy KOC cần xem kỹ từng bản xem trước trước khi phê duyệt.</li>
      <li>KOC có quyền yêu cầu chỉnh sửa hoặc từ chối bất kỳ nội dung nào không phù hợp với hình ảnh cá nhân, đạo đức nghề nghiệp hoặc quy định pháp luật.</li>
      <li>Chỉ nội dung đã được KOC phê duyệt trên hệ thống mới được đăng tải; mọi thao tác duyệt đều được lưu vết thời gian (timestamp).</li>
    </ul>

    <p class="aic-part">PHẦN B — QUY TRÌNH THAM GIA & PHỐI HỢP KHI CÓ BOOKING</p>
    <p><b>Bước 1 — Xác nhận tham gia:</b> KOC đọc và đồng ý toàn bộ Điều khoản này, xác nhận bằng tick đã đăng ký.</p>
    <p><b>Bước 2 — Xác minh hồ sơ:</b> KOC Việt kiểm tra tính hợp lệ của hồ sơ, danh tính, kênh mạng xã hội và thông tin nhận tiền của KOC.</p>
    <p><b>Bước 3 — Liên hệ xác nhận & hướng dẫn:</b> Sau khi hồ sơ hợp lệ, KOC Việt liên hệ xác nhận, hướng dẫn KOC cách tham gia, cách thu thập mẫu hình ảnh/giọng nói và cách sử dụng hệ thống để sẵn sàng nhận booking.</p>
    <p><b>Bước 4 — Tiếp nhận booking từ doanh nghiệp:</b> Khi có booking phù hợp, hệ thống gửi loại nội dung, sản phẩm, mức phí và tỉ lệ hoa hồng bán hàng để KOC nhận hoặc từ chối.</p>
    <p><b>Bước 5 — Sản xuất video đại diện:</b> Đối tác sản xuất dùng hình ảnh và giọng nói đã được KOC cho phép để tạo video theo yêu cầu của booking.</p>
    <p><b>Bước 6 — KOC duyệt nội dung:</b> KOC nhận bản xem trước, phê duyệt hoặc yêu cầu chỉnh sửa trong thời hạn quy định. Không có phê duyệt của KOC thì nội dung không được đăng tải.</p>
    <p><b>Bước 7 — Đăng tải và gắn đường dẫn sản phẩm:</b> KOC đăng video đã duyệt lên kênh của mình, gắn đường dẫn hoặc mã giới thiệu riêng (nếu có) và gắn nhãn quảng cáo theo quy định.</p>
    <p><b>Bước 8 — Ghi nhận, đối soát và thanh toán:</b> Hệ thống ghi nhận nội dung đã đăng và doanh số bán hàng; KOC Việt đối soát minh bạch rồi chuyển phí booking cùng hoa hồng vào Ví KOC theo lịch đã công bố.</p>

    <p class="aic-part">PHẦN C — CAM KẾT CỦA KOC</p>
    <p><b>C.1. Đồng ý sử dụng hình ảnh và giọng nói.</b> Tôi đồng ý cho KOC Việt và đối tác sản xuất được chỉ định thu thập, lưu trữ, xử lý và sử dụng hình ảnh, giọng nói cùng các dữ liệu cần thiết do tôi cung cấp để tạo nội dung bằng công nghệ AI Clone Avatar, phục vụ các booking, chiến dịch mà tôi đã xác nhận tham gia.</p>
    <p><b>C.2. Phản hồi và phê duyệt nội dung.</b> Tôi cam kết kiểm tra và phản hồi (phê duyệt hoặc yêu cầu chỉnh sửa) trong thời hạn quy định kể từ khi nhận bản xem trước. Việc chậm hoặc không phản hồi được xử lý theo Điều khoản sử dụng và Chính sách AI Clone Avatar.</p>
    <p><b>C.3. Tuân thủ quy định về quảng cáo.</b> Tôi cam kết mọi nội dung công bố tuân thủ pháp luật về quảng cáo, thương mại điện tử và quy định của KOC Việt, bao gồm gắn nhãn nội dung quảng cáo/tài trợ (#quangcao/#ad) khi được yêu cầu.</p>
    <p><b>C.4. Trung thực thông tin và quyền sử dụng hợp pháp.</b> Tôi cam kết toàn bộ thông tin cá nhân, hình ảnh, giọng nói và dữ liệu cung cấp là trung thực, chính xác và thuộc quyền sử dụng hợp pháp của tôi; chịu trách nhiệm trước pháp luật đối với thông tin sai lệch, giả mạo hoặc xâm phạm quyền của bên thứ ba.</p>
    <p><b>C.5. Không sử dụng ngoài phạm vi cho phép.</b> Tôi cam kết không tự ý chỉnh sửa, chuyển giao, phát hành, khai thác nội dung AI Clone Avatar ngoài phạm vi đã được phê duyệt, trừ khi có thỏa thuận khác bằng văn bản.</p>
    <p><b>C.6. Không gian lận doanh số.</b> Tôi cam kết không tạo lượt nhấp hoặc đơn hàng giả dưới bất kỳ hình thức nào.</p>
    <p><b>C.7. Bảo mật và không giao dịch ngoài hệ thống.</b> Tôi cam kết không thỏa thuận, báo giá riêng hay nhận thanh toán trực tiếp từ doanh nghiệp ngoài hệ thống đối với booking phát sinh qua Nền tảng; không tiết lộ thông tin bảo mật tiếp cận được qua Nền tảng.</p>
    <p><b>C.8. Trách nhiệm khi đăng tải.</b> Tôi chịu trách nhiệm đăng tải đúng nội dung đã phê duyệt, đúng kênh và thời điểm cam kết trong booking; không xóa/gỡ nội dung trước thời hạn tối thiểu quy định của booking nếu không có lý do chính đáng.</p>

    <p class="aic-part">PHẦN D — CAM KẾT CỦA KOC VIỆT</p>
    <p><b>D.1. Sử dụng dữ liệu đúng mục đích.</b> KOC Việt chỉ sử dụng hình ảnh, giọng nói và dữ liệu của KOC để tạo nội dung AI Clone Avatar phục vụ booking/chiến dịch mà KOC đã đồng ý; không sử dụng ngoài phạm vi được cấp phép nếu không có sự chấp thuận của KOC hoặc căn cứ pháp luật.</p>
    <p><b>D.2. Gửi bản xem trước trước khi phát hành.</b> KOC Việt cung cấp bản xem trước để KOC kiểm tra, phê duyệt trước khi công bố. Mọi thao tác xác nhận đều được ghi nhận và lưu trữ làm căn cứ đối soát.</p>
    <p><b>D.3. Bảo mật và bảo vệ dữ liệu cá nhân.</b> KOC Việt áp dụng biện pháp kỹ thuật và quản lý phù hợp để bảo vệ dữ liệu cá nhân, hình ảnh, giọng nói của KOC; tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</p>
    <p><b>D.4. Quyền xử lý vi phạm.</b> KOC Việt có quyền tạm khóa hoặc chấm dứt hợp tác với KOC vi phạm theo quy định pháp luật và Điều khoản sử dụng; việc này không ảnh hưởng đến quyền, nghĩa vụ phát sinh từ các booking đã hoàn thành.</p>
    <p><b>D.5. Thời hạn sử dụng dữ liệu.</b> KOC Việt chỉ sử dụng hình ảnh, giọng nói của KOC trong thời gian KOC tham gia Chương trình hoặc thời gian cần thiết để hoàn tất booking đã xác nhận; sau đó không tạo mới/phát hành nội dung AI Clone Avatar nếu chưa có sự đồng ý tiếp theo của KOC.</p>
    <p><b>D.6. Bảo đảm quyền lợi của KOC.</b> Việc tham gia là tự nguyện và không làm thay đổi các chính sách về booking, thanh toán, hoa hồng bán hàng và đối soát mà KOC được hưởng theo Điều khoản sử dụng.</p>
    <p><b>D.7. Tôn trọng quyền nhân thân.</b> KOC Việt tôn trọng quyền nhân thân của KOC đối với hình ảnh, giọng nói. Việc sử dụng dữ liệu AI Clone Avatar không làm phát sinh chuyển giao quyền nhân thân, trừ các quyền sử dụng đã được KOC đồng ý.</p>
    <p><b>D.8. Minh bạch đối soát và chi trả.</b> KOC Việt bảo đảm số liệu doanh số, đơn hàng, hoa hồng minh bạch, KOC tra cứu được và chi trả đúng hạn theo chu kỳ công bố.</p>

    <p class="aic-part">PHẦN E — QUYỀN SỬ DỤNG & BẢO VỆ HÌNH ẢNH, GIỌNG NÓI, NỘI DUNG</p>
    <p><b>E.1. Phạm vi cấp phép.</b> KOC cấp phép không độc quyền, có thời hạn, giới hạn mục đích cho KOC Việt và đối tác được chỉ định thu thập mẫu và tạo nội dung AI Clone Avatar chỉ trong phạm vi các booking đã được KOC xác nhận và phê duyệt.</p>
    <p><b>E.2. Quyền nhân thân được bảo lưu.</b> KOC giữ nguyên quyền nhân thân đối với hình ảnh, giọng nói theo Bộ luật Dân sự 2015. Cấp phép sử dụng không đồng nghĩa với chuyển nhượng quyền nhân thân.</p>
    <p><b>E.3. Bảo vệ hình ảnh, chống lạm dụng và quyền gỡ bỏ.</b> Nghiêm cấm sử dụng AI Clone Avatar của KOC để tạo nội dung sai sự thật, bôi nhọ, khiêu dâm, chính trị nhạy cảm, lừa đảo hay bất kỳ mục đích nào gây tổn hại danh dự, uy tín của KOC. KOC có quyền yêu cầu gỡ bỏ (takedown) nội dung sử dụng sai phạm vi trong thời hạn hợp lý.</p>
    <p><b>E.4. Thời hạn và xử lý sau khi kết thúc.</b> Sau khi KOC ngừng tham gia hoặc hoàn tất booking, KOC Việt ngừng tạo mới nội dung AI Clone Avatar; KOC có quyền yêu cầu ngừng lưu trữ và xóa dữ liệu clone, trừ dữ liệu bắt buộc lưu giữ phục vụ đối soát tài chính hoặc giải quyết tranh chấp theo quy định pháp luật.</p>
    <p><b>E.5. Rút lại đồng ý và yêu cầu xóa dữ liệu.</b> KOC có quyền rút lại sự đồng ý xử lý dữ liệu cá nhân và yêu cầu xóa dữ liệu theo Nghị định 13/2023/NĐ-CP, trừ phần dữ liệu cần lưu giữ theo nghĩa vụ pháp luật.</p>
    <p><b>E.6. Bảo mật dữ liệu sinh trắc học.</b> Dữ liệu định danh (CCCD, ảnh chân dung) và sinh trắc học (giọng nói, khuôn mặt dùng để tạo video đại diện) được bảo vệ khi lưu trữ, truyền tải và chỉ dùng cho mục đích xác minh, chi trả và tạo nội dung theo booking đã duyệt.</p>

    <p class="aic-part">PHẦN F — THANH TOÁN & ĐỐI SOÁT</p>
    <p>Thu nhập của KOC từ Chương trình gồm các cấu phần sau, tùy nội dung từng booking:</p>
    <table class="aic-table">
      <tr><th>Cấu phần</th><th>Cách tính</th><th>Ghi chú</th></tr>
      <tr><td>Phí booking (booking fee)</td><td>Cố định theo từng job, hiển thị khi KOC nhận booking</td><td>Áp dụng cho booking review/quảng cáo/AI Clone Avatar có phí</td></tr>
      <tr><td>Hoa hồng bán hàng</td><td>Doanh số hợp lệ × % hoa hồng do doanh nghiệp đề xuất</td><td>Chỉ tính đơn đã thanh toán, không hủy hoặc hoàn trong kỳ đối soát</td></tr>
      <tr><td>Phí nền tảng 1%</td><td>Doanh số bán hàng × 1% — do DOANH NGHIỆP chi trả</td><td>Không trừ vào hoa hồng của KOC</td></tr>
    </table>
    <p><b>F.1. Chu kỳ đối soát.</b> KOC Việt tổng hợp sổ thu chi và thông báo cho KOC trước khi chi trả theo chu kỳ công bố (ví dụ 1 lần mỗi tháng). KOC và doanh nghiệp cùng xem một số liệu thống nhất.</p>
    <p><b>F.2. Ví nội bộ và rút tiền.</b> Phí booking và hoa hồng được ghi có vào Ví nội bộ trên App; KOC yêu cầu rút về tài khoản ngân hàng đã đăng ký. Số dư dưới ngưỡng rút tối thiểu được cộng dồn sang kỳ kế tiếp.</p>
    <p><b>F.3. Thuế thu nhập cá nhân.</b> KOC Việt khấu trừ thuế TNCN (nếu có) theo quy định pháp luật trước khi chi trả, hoặc hướng dẫn KOC tự kê khai tùy hình thức hợp tác.</p>
    <p><b>F.4. Xử lý đơn hủy/hoàn.</b> Đơn hàng bị hủy, trả hàng hoặc hoàn tiền trong thời hạn đối soát sẽ bị trừ ngược khỏi doanh số ghi nhận, phản ánh minh bạch trên hệ thống.</p>

    <p class="aic-part">PHẦN G — VI PHẠM, TẠM KHÓA & CHẤM DỨT</p>
    <ul>
      <li>KOC Việt có quyền từ chối chi trả hoa hồng phát sinh từ gian lận và tạm khóa tài khoản khi phát hiện vi phạm.</li>
      <li>Vi phạm nghiêm trọng (gian lận hồ sơ/KYC, giao dịch ngoài hệ thống, sử dụng/đăng tải nội dung chưa được phê duyệt) có thể bị chấm dứt hợp tác ngay lập tức.</li>
      <li>KOC có thể ngừng tham gia Chương trình bằng thông báo qua Nền tảng; các booking đang dang dở tiếp tục được xử lý và chi trả đầy đủ theo cam kết.</li>
    </ul>

    <p class="aic-part">PHẦN H — HIỆU LỰC & XÁC NHẬN ĐIỆN TỬ</p>
    <p>Bằng việc tick vào ô "Tôi đã đọc và đồng ý toàn bộ Điều khoản tham gia Chương trình AI Clone Avatar" và hoàn tất xác thực, KOC xác nhận đồng ý ràng buộc với toàn bộ nội dung trên. Thời điểm xác nhận được ghi nhận theo timestamp hệ thống; dữ liệu xác nhận được lưu trữ bất biến kèm mã băm (hash) phục vụ đối soát và giải quyết tranh chấp.</p>
    <p class="aic-scroll-end">— Bạn đã đọc hết toàn văn điều khoản —</p>`;
}

function openAiCloneTermsModal(kocName, onConfirm) {
  const m = modal(`
    <style>
      .aic-modal-head{ background:#0B1F3A; color:#fff; margin:-20px -20px 0; padding:18px 20px; border-radius:12px 12px 0 0; }
      .aic-modal-title{ font-size:16px; font-weight:700; margin:0; }
      .aic-modal-sub{ font-size:12px; color:#C9D4E3; margin-top:4px; }
      .aic-scroll{ max-height:340px; overflow-y:auto; padding:16px 18px; font-size:13px; line-height:1.6; color:#212121; margin-top:12px; border:1px solid #E8E8E8; border-radius:12px; }
      .aic-scroll::-webkit-scrollbar{ width:8px; }
      .aic-scroll::-webkit-scrollbar-thumb{ background:#E8E8E8; border-radius:9999px; }
      .aic-doc-sub{ font-style:italic; color:#757575; font-size:12px; margin:0 0 10px; }
      .aic-intro{ background:#FDEEE8; border-left:3px solid #EE4D2D; border-radius:8px; padding:10px 12px; margin:0 0 14px; }
      .aic-part{ font-weight:700; color:#0B1F3A; font-size:13.5px; margin:18px 0 8px; padding-bottom:6px; border-bottom:2px solid #FDEEE8; }
      .aic-part:first-of-type{ margin-top:0; }
      .aic-h{ margin:10px 0 4px; }
      .aic-scroll p{ margin:0 0 8px; }
      .aic-scroll ul{ margin:4px 0 10px 18px; padding:0; }
      .aic-scroll li{ margin-bottom:4px; }
      .aic-table{ width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:11.5px; }
      .aic-table th{ background:#0B1F3A; color:#fff; text-align:left; padding:6px 8px; font-weight:600; }
      .aic-table td{ padding:6px 8px; border-bottom:1px solid #E8E8E8; vertical-align:top; }
      .aic-table tr:nth-child(even) td{ background:#F5F5F5; }
      .aic-scroll-end{ text-align:center; color:#EE4D2D; font-weight:600; font-size:12px; margin-top:14px !important; }
      .aic-agree-wrap{ display:flex; gap:8px; align-items:flex-start; margin-top:14px; opacity:.5; }
      .aic-agree-wrap input{ width:auto; margin-top:2px; }
    </style>
    <div class="aic-modal-head">
      <p class="aic-modal-title">📄 Điều khoản xác nhận tham gia Chương trình "AI Clone Avatar"</p>
      <p class="aic-modal-sub">Vui lòng đọc hết toàn văn trước khi đồng ý tham gia</p>
    </div>
    <div class="aic-scroll" id="aic-scroll">${aiCloneTermsBody()}</div>
    <label class="aic-agree-wrap" id="aic-agree-wrap">
      <input type="checkbox" id="aic-agree" disabled>
      <span>Tôi đã đọc và đồng ý toàn bộ Điều khoản tham gia Chương trình AI Clone Avatar.</span>
    </label>
    <div class="row" style="gap:10px;margin-top:14px">
      <button type="button" class="btn ghost" id="aic-cancel" style="flex:1">Hủy</button>
      <button type="button" class="btn primary" id="aic-confirm" style="flex:2" disabled>✔ Xác nhận & Đăng ký</button>
    </div>`);

  const scrollEl = m.querySelector("#aic-scroll");
  const agreeChk = m.querySelector("#aic-agree");
  const agreeWrap = m.querySelector("#aic-agree-wrap");
  const confirmBtn = m.querySelector("#aic-confirm");

  scrollEl.addEventListener("scroll", () => {
    const atBottom =
      scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 8;
    if (atBottom && agreeChk.disabled) {
      agreeChk.disabled = false;
      agreeWrap.style.opacity = 1;
    }
  });
  agreeChk.addEventListener("change", (e) => {
    confirmBtn.disabled = !e.target.checked;
  });
  m.querySelector("#aic-cancel").addEventListener("click", closeModal);
  confirmBtn.addEventListener("click", () => {
    if (agreeChk.disabled || !agreeChk.checked) return;
    closeModal();
    onConfirm();
  });
}

async function aiclone(el) {
  const [d, bookingData] = await Promise.all([
    api("/api/koc/dashboard"),
    api("/api/bookings"),
  ]);
  const registered = d.koc.ai_clone;
  const aiBookings = (bookingData.bookings || []).filter(
    (booking) => booking.type === "aiclone",
  );
  el.innerHTML = `<div class="m-head koc-page-heading koc-aiclone-heading"><h2 class="icon-heading" style="color:#fff">${icon("aiClone", "teaser-icon")} AI Clone Avatar</h2><p style="opacity:.85;font-size:12px">NetViet booking + sản xuất video cho bạn</p></div>
    <div class="m-body koc-aiclone-body">
      <div class="card" style="margin-bottom:12px"><h3>Lợi ích khi tham gia</h3>
        <ul style="margin:10px 0 0 18px;color:#444;line-height:1.9;font-size:13px">
          <li>Không cần tự quay dựng video</li>
          <li>NetViet booking trực tiếp theo bảng giá của bạn</li>
          <li>Nhận video → đăng bài → nộp link như booking thường</li>
          <li>Vẫn nhận 95% phí booking cùng hoa hồng bán hàng</li>
        </ul>
        <div style="margin-top:16px">
        ${
          registered
            ? `<div class="chip g" style="padding:10px 16px">✅ Bạn đã đăng ký dịch vụ AI Clone Avatar</div><p class="muted" style="margin-top:8px;font-size:12px">Chờ NetViet tạo booking & giao video. Booking sẽ hiện ở tab Booking.</p>`
            : `<button class="btn primary" id="ai-reg">Đăng ký tham gia AI Clone Avatar</button>`
        }
        </div>
      </div>
      ${
        registered
          ? `<div class="between" style="margin:18px 0 10px"><h3>Video từ NetViet</h3><span class="chip b">${aiBookings.length} booking</span></div>
            ${
              aiBookings.length
                ? aiBookings
                    .map(
                      (booking) => `<div class="list-item">
                <div class="between"><div><b>${esc(booking.code)}</b><div class="muted" style="font-size:12px">${esc(booking.bizname)} · ${esc(booking.category)}</div></div>${statusChip(booking.status)}</div>
                ${
                  (booking.koc_video_link || booking.video_link) &&
                  [
                    "pending_koc_review",
                    "video_approved",
                    "posted",
                    "completed",
                  ].includes(booking.status)
                    ? `<div class="tint-box" style="margin-top:12px">
                        <b>🎥 Video đã sẵn sàng</b>
                        <p class="muted" style="font-size:12px;margin:4px 0 10px">Mở video để xem hoặc tải về, sau đó đăng bài và nộp link trong Booking.</p>
                        <a class="btn ok" href="${esc(booking.koc_video_link || booking.video_link)}" target="_blank" rel="noopener" style="width:100%">Mở / tải video</a>
                      </div>
                      <a class="btn primary sm" href="#/bookings" style="margin-top:8px;width:100%">Mở booking để tiếp tục</a>`
                    : `<div class="tint-box" style="margin-top:12px"><b>NetViet đang chuẩn bị video</b><p class="muted" style="font-size:12px;margin-top:4px">Bạn sẽ nhận thông báo ngay khi video được giao.</p></div>`
                }
              </div>`,
                    )
                    .join("")
                : empty("🎬", "Chưa có booking AI Clone Avatar nào được tạo")
            }`
          : ""
      }
    </div>`;
  if (!registered)
    document.getElementById("ai-reg").addEventListener("click", () => {
      openAiCloneTermsModal(d.koc.name, async () => {
        try {
          await post("/api/aiclone/register", {});
          toast("Đăng ký thành công", "ok");
          aiclone(el);
        } catch (e) {
          toast(e.message, "err");
        }
      });
    });
}

async function notifications(el) {
  const data = await api("/api/notifications");
  const icon = {
    booking: "📋",
    commission: "💰",
    payment: "✅",
    refund: "↩️",
    cancel: "✕",
  };
  el.innerHTML = `<div class="m-head koc-page-heading koc-notification-heading"><div><h2 style="color:#fff">🔔 Thông báo</h2>
      <p style="opacity:.85;font-size:12px;margin-top:4px">${data.unread} thông báo chưa đọc</p></div></div>
    <div class="m-body" id="notification-list">
      ${
        data.notifications.length
          ? data.notifications
              .map(
                (
                  n,
                ) => `<button class="notification-item ${n.is_read ? "" : "unread"}" data-notification="${n.id}" data-href="${esc(n.href || "#/notifications")}">
        <span class="notification-icon">${icon[n.type] || "🔔"}</span>
        <span><b>${esc(n.title)}</b><small>${esc(n.message)}</small><time>${new Date(n.created_at * 1000).toLocaleString("vi-VN")}</time></span>
        ${n.is_read ? "" : "<i></i>"}
      </button>`,
              )
              .join("")
          : empty("🔔", "Bạn chưa có thông báo")
      }
    </div>`;
  el.querySelectorAll("[data-notification]").forEach((item) =>
    item.addEventListener("click", async () => {
      await post("/api/notifications/read", { id: item.dataset.notification });
      location.hash = item.dataset.href || "#/notifications";
      if (location.hash === "#/notifications") notifications(el);
    }),
  );
}

const TIER_BENEFITS = {
  Nano: [
    "Tiếp cận booking phù hợp KOC mới",
    "Hỗ trợ chuẩn hóa hồ sơ và báo giá",
    "Phí dịch vụ 5%",
  ],
  Micro: [
    "Được ưu tiên giới thiệu trên trang khám phá KOC",
    "Tham gia chiến dịch theo ngành",
    "Phí dịch vụ 5%",
  ],
  Mid: [
    "Ưu tiên booking ngân sách cao",
    "Hỗ trợ chiến dịch và AI Clone Avatar",
    "Phí dịch vụ ưu đãi 4%",
  ],
  Macro: [
    "Ưu tiên cao nhất và chiến dịch độc quyền",
    "Quản lý đối tác hỗ trợ trực tiếp",
    "Phí dịch vụ ưu đãi 3%",
  ],
  Mega: [
    "Ưu tiên đặc biệt cho chiến dịch quy mô lớn",
    "Quản lý đối tác và hỗ trợ trực tiếp",
    "Phí dịch vụ ưu đãi 3%",
  ],
};

function tierPanel(k, cfg) {
  const tier = (cfg.tiers || []).find((item) => item.name === k.tier) || {};
  const benefits = TIER_BENEFITS[k.tier] || [];
  return `<div class="tier-benefit-card">
    <div class="between"><div><span class="eyebrow">HẠNG HIỆN TẠI</span><h3>${tierBadge(k.tier)} Quyền lợi ${esc(k.tier)}</h3></div><span class="tier-shield">★</span></div>
    <div class="tier-price-range"><span>Khung giá theo hạng</span><b>${tier.name === "Mega" ? `Từ ${money(tier.min || 0)}` : `${money(tier.min || 0)} – ${money(tier.max || 0)}`}</b></div>
    <div class="tier-requirement">Điều kiện tham chiếu: ${tier.name === "Mega" ? `Từ ${num(tier.minF || 0)}` : `${num(tier.minF || 0)} – ${num(tier.maxF || 0)}`} người theo dõi · phí nền tảng ${tier.fee || 0}%</div>
    <ul>${benefits.map((item) => `<li>✓ ${esc(item)}</li>`).join("")}</ul>
  </div>`;
}

async function optimizeProfileImage(file, width, height, quality = 0.84) {
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
  const cfg = state.config;
  const { koc: k } = await api("/api/koc/profile");
  const prices = {};
  (k.prices || []).forEach((p) => (prices[p.category] = p.price));

  if (!editing) {
    el.innerHTML = `<div class="m-head koc-page-heading koc-profile-heading"><div class="between"><div><h2 style="color:#fff">👤 Hồ sơ của tôi</h2>
        <p style="opacity:.85;font-size:12px;margin-top:4px">Thông tin doanh nghiệp nhìn thấy khi đặt booking</p></div>
        <button class="chip on-dark" id="pf-edit">✏️ Chỉnh sửa</button></div></div>
      <div class="m-body koc-profile-body">
        <div class="profile-hero">
          <div class="profile-visual">
            <div class="profile-cover ${k.cover ? "has-image" : ""}">${k.cover ? `<img src="${esc(k.cover)}" alt="Ảnh bìa của ${esc(k.name)}">` : "<span>Thêm ảnh bìa để hồ sơ nổi bật hơn</span>"}</div>
            <div class="profile-cover-overlay" aria-hidden="true"></div>
            <div class="profile-identity"><img class="profile-avatar" src="${esc(avatarUrl(k.avatar))}" alt="Ảnh đại diện">
              <div class="profile-identity-copy"><div class="profile-badges">${tierBadge(k.tier)} ${k.followers_verified ? '<span class="chip g">✓ Đã xác minh</span>' : ""}</div>
              <h2>${esc(k.name)}</h2>
              <div class="profile-location">📍 ${esc(k.province || "Chưa cập nhật địa phương")}</div>
              <div class="profile-email">✉ ${esc(k.email || "Chưa cập nhật email")}</div></div>
            </div>
          </div>
          <div class="profile-stats"><span><b>${num(k.followers)}</b>Người theo dõi</span><span><b>${Number(k.engagement || 0).toFixed(1)}%</b>Tương tác</span><span><b>${Number(k.rating || 0).toFixed(1)}</b>Đánh giá</span></div>
          <div class="profile-summary"><div class="profile-summary-heading"><span>GIỚI THIỆU</span><b>Hồ sơ năng lực KOC</b></div>
            <p class="profile-bio">${esc(k.bio || "Bạn chưa cập nhật phần giới thiệu. Hãy bổ sung thế mạnh và phong cách nội dung để doanh nghiệp hiểu bạn hơn.")}</p>
            <div class="profile-category-list">${(k.categories || []).map((category) => `<span>${esc(category)}</span>`).join("") || '<span class="is-empty">Chưa cập nhật ngành hàng</span>'}</div>
          </div>
        </div>
        ${tierPanel(k, cfg)}
        <div class="card profile-section"><h3>Ngành hàng & bảng giá</h3>
          ${(k.prices || []).map((item) => `<div class="profile-price"><span>${esc(item.category)}</span><b class="money">${money(item.price)}</b></div>`).join("") || '<p class="muted">Chưa có bảng giá.</p>'}
        </div>
        <div class="card profile-section"><h3>Kênh mạng xã hội</h3>
          ${(k.socials || []).map((item) => `<div class="profile-price"><span>${esc(item.platform)} · ${esc(item.handle)}</span><b>${num(item.followers || k.followers)} followers</b></div>`).join("") || '<p class="muted">Chưa cập nhật.</p>'}
        </div>
        <div class="card profile-section"><h3>Tài khoản nhận thanh toán</h3>
          <div class="profile-price"><span>Ngân hàng</span>${bankIdentityHtml(cfg.payoutBanks, k.bank_name, k.bank_bin)}</div>
          <div class="profile-price"><span>Số tài khoản</span><b>${esc(k.bank_account || "Chưa cập nhật")}</b></div>
          <div class="profile-price"><span>Chủ tài khoản</span><b>${esc(k.bank_owner || "Chưa cập nhật")}</b></div>
        </div>
        <button class="btn primary" id="pf-edit-bottom">✏️ Cập nhật hồ sơ</button>
      </div>`;
    el.querySelector("#pf-edit").addEventListener("click", () =>
      profile(el, true),
    );
    el.querySelector("#pf-edit-bottom").addEventListener("click", () =>
      profile(el, true),
    );
    return;
  }

  const cats = [...k.categories];
  const catList = [...new Set(cfg.categories.concat(cats))];
  let avatarSource = k.avatar || "";
  let coverSource = k.cover || "";
  el.innerHTML = `<div class="m-head koc-page-heading koc-profile-heading"><div class="between"><h2 style="color:#fff">✏️ Chỉnh sửa hồ sơ</h2><button class="chip on-dark" id="pf-cancel">Hủy</button></div></div>
    <div class="m-body koc-profile-edit-body">
      <div class="image-editor">
        <div class="cover-upload-preview" id="pf-cover-preview">${coverSource ? `<img src="${esc(coverSource)}" alt="Xem trước ảnh bìa">` : "<span>Ảnh bìa tỉ lệ 8:3</span>"}</div>
        <div class="avatar-upload-row"><div class="avatar-upload-preview" id="pf-avatar-preview">${avatarSource ? `<img src="${esc(avatarSource)}" alt="Xem trước ảnh đại diện">` : "👤"}</div>
          <div><b>Ảnh đại diện</b><small>Ảnh được cắt vuông 1:1</small><div class="profile-upload-actions">
            <label class="btn ghost sm upload-label">Thay avatar<input id="pf-avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
            <label class="btn ghost sm upload-label cover-button">Thay ảnh bìa<input id="pf-cover-file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
          </div></div></div>
        <p class="hint">PNG, JPG hoặc WebP · tối đa 10MB. Hệ thống tự cắt đúng tỉ lệ và tối ưu dung lượng.</p>
      </div>
      <div class="field"><label>Giới thiệu</label><textarea id="pf-bio" rows="3">${esc(k.bio || "")}</textarea></div>
      <div class="field"><label>Email liên hệ / đăng nhập</label><input id="pf-email" type="email" value="${esc(k.email || "")}" placeholder="email@domain.com"></div>
      <div class="field"><label>Tỉnh/Thành phố</label><select id="pf-prov">${provinceOptions(cfg.provinces, k.province)}</select></div>
      <div class="field"><label>Kênh MXH chính ${k.followers_verified ? '<span class="chip g">✓ Đã xác minh</span>' : ""}</label><input id="pf-social" value="${esc((k.socials[0] && k.socials[0].platform + " " + k.socials[0].handle) || "")}" placeholder="TikTok @handle" ${k.followers_verified ? "readonly" : ""}>${k.followers_verified ? '<small class="hint">Liên hệ admin nếu cần đổi kênh và xác minh lại.</small>' : ""}</div>
      ${tierPanel(k, cfg)}
      <div class="field"><label>Ngành hàng & bảng giá</label>
        <div id="pf-cats" class="profile-category-picker">${catList.map((c) => `<button type="button" class="chip ${cats.includes(c) ? "selected" : ""}" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      </div>
      <div id="pf-prices"></div>
      <h3 style="margin-top:18px;font-size:14px">Tài khoản nhận thanh toán</h3>
      <div class="field"><label for="pf-bank-select-trigger">Ngân hàng</label>${bankPickerHtml("pf-bank-select", cfg.payoutBanks, k.bank_name, k.bank_bin)}</div>
      <div class="field"><label>Số tài khoản</label><input id="pf-bank-account" value="${esc(k.bank_account || "")}"></div>
      <div class="field"><label>Chủ tài khoản</label><input id="pf-bank-owner" value="${esc(k.bank_owner || "")}"></div>
      <section class="card password-change-section">
        <div class="password-change-heading"><div><h3>Đổi mật khẩu</h3><p class="muted">Sau khi đổi thành công, bạn cần đăng nhập lại trên thiết bị này.</p></div><span class="password-security-mark">Bảo mật</span></div>
        <div class="password-change-fields">
          <div class="field"><label>Mật khẩu hiện tại</label><input id="pf-current-password" type="password" autocomplete="current-password" maxlength="128"></div>
          <div class="field"><label>Mật khẩu mới</label><input id="pf-new-password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="Tối thiểu 8 ký tự"></div>
          <div class="field"><label>Xác nhận mật khẩu mới</label><input id="pf-confirm-password" type="password" autocomplete="new-password" minlength="8" maxlength="128"></div>
        </div>
        <button class="btn ghost" id="pf-change-password" type="button">Cập nhật mật khẩu</button>
      </section>
      <button class="btn primary" id="pf-save" style="margin-top:10px">Lưu thay đổi</button>
    </div>`;

  bindBankPicker(el.querySelector('[data-bank-picker="pf-bank-select"]'), cfg.payoutBanks);

  const processFile = async (input, target, width, height, assign) => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      input.disabled = true;
      const source = await optimizeProfileImage(file, width, height);
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
  el.querySelector("#pf-change-password").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const currentPassword = el.querySelector("#pf-current-password").value;
    const newPassword = el.querySelector("#pf-new-password").value;
    const confirmation = el.querySelector("#pf-confirm-password").value;
    if (!currentPassword) return toast("Nhập mật khẩu hiện tại", "err");
    if (newPassword.length < 8)
      return toast("Mật khẩu mới phải có ít nhất 8 ký tự", "err");
    if (newPassword !== confirmation)
      return toast("Mật khẩu xác nhận không khớp", "err");
    if (currentPassword === newPassword)
      return toast("Mật khẩu mới phải khác mật khẩu hiện tại", "err");
    button.disabled = true;
    button.textContent = "Đang cập nhật...";
    try {
      await post("/api/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", "ok");
      setTimeout(() => logout(), 1200);
    } catch (e) {
      toast(e.message, "err");
      button.disabled = false;
      button.textContent = "Cập nhật mật khẩu";
    }
  });

  function renderPrices() {
    const box = el.querySelector("#pf-prices");
    box.innerHTML =
      cats
        .map(
          (c) =>
            `<div class="field"><label>${esc(c)}</label><input type="number" data-price="${esc(c)}" value="${prices[c] || ""}" placeholder="đ"></div>`,
        )
        .join("") || '<p class="muted">Chọn ít nhất 1 ngành hàng.</p>';
  }
  renderPrices();
  el.querySelectorAll("#pf-cats [data-c]").forEach((button) =>
    button.addEventListener("click", () => {
      const category = button.dataset.c;
      const index = cats.indexOf(category);
      if (index >= 0) cats.splice(index, 1);
      else cats.push(category);
      button.classList.toggle("selected", cats.includes(category));
      renderPrices();
    }),
  );
  el.querySelector("#pf-save").addEventListener("click", async () => {
    const email = el.querySelector("#pf-email").value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return toast("Email không hợp lệ", "err");
    if (!cats.length) return toast("Chọn ít nhất 1 ngành hàng", "err");
    el.querySelectorAll("[data-price]").forEach((input) => {
      prices[input.dataset.price] = Number(input.value) || 0;
    });
    const social = el.querySelector("#pf-social").value.trim();
    const socials = social
      ? [
          {
            platform: social.split(" ")[0] || "MXH",
            handle: social.split(" ").slice(1).join(" ") || social,
            followers: k.followers,
          },
        ]
      : [];
    const bank = selectedPayoutBank(el.querySelector("#pf-bank-select"));
    const bankName = bank.name;
    const bankBin = bank.bin;
    const bankAccount = el.querySelector("#pf-bank-account").value.trim();
    const bankOwner = el.querySelector("#pf-bank-owner").value.trim();
    if (!bankName) return toast("Chọn ngân hàng nhận thanh toán", "err");
    if (!/^\d{6}$/.test(bankBin))
      return toast("Không xác định được ngân hàng, vui lòng chọn lại", "err");
    if (!/^\d{6,20}$/.test(bankAccount))
      return toast("Số tài khoản chỉ gồm chữ số, 6-20 ký tự", "err");
    if (!bankOwner || /\d/.test(bankOwner))
      return toast("Nhập tên chủ tài khoản hợp lệ (không chứa số)", "err");
    const button = el.querySelector("#pf-save");
    button.disabled = true;
    button.textContent = "Đang lưu…";
    try {
      await post("/api/koc/profile", {
        email,
        bio: el.querySelector("#pf-bio").value.trim(),
        province: el.querySelector("#pf-prov").value,
        avatar: avatarSource,
        cover: coverSource,
        socials,
        categories: cats,
        prices,
        bank: { name: bankName, bin: bankBin, account: bankAccount, owner: bankOwner },
      });
      const topAvatar = document.querySelector(".koc-top-profile img");
      if (topAvatar) topAvatar.src = avatarUrl(avatarSource);
      toast("Đã lưu và cập nhật trang hồ sơ", "ok");
      profile(el);
    } catch (e) {
      toast(e.message, "err");
      button.disabled = false;
      button.textContent = "Lưu thay đổi";
    }
  });
}
