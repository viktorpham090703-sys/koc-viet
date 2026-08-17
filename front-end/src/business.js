import { api, post } from './api.js';
import { money, num, esc, fmtDate, stars, statusChip, spinner, empty, toast, modal, closeModal, tierBadge, skeletonPortal, skeletonStatCards, skeletonTable, skeletonKocGrid, avatarUrl } from './ui.js';
import { state, logout, enhancePortal } from './app.js';
import { renderMarketplaceEmbed } from './public.js';
import { icon } from './icons.js';

const NAV = [
  ['#/dashboard',icon('overview', 'sidebar-icon'),'Tổng quan'],['#/find',icon('search', 'sidebar-icon'),'Tìm KOC'],['#/orders',icon('booking', 'sidebar-icon'),'Booking'],
  ['#/products',icon('productData', 'sidebar-icon'),'Sản phẩm'],
  ['#/aiclone-booking',icon('aiClone', 'sidebar-icon'),'Booking AI Clone'],
  ['#/wallet',icon('wallet', 'sidebar-icon'),'Ví doanh nghiệp'],
  ['#/kol',icon('kolRequest', 'sidebar-icon'),'KOL / Nghệ sĩ'],['#/campaigns',icon('campaign', 'sidebar-icon'),'Chiến dịch lớn'],['#/report',icon('report', 'sidebar-icon'),'Báo cáo'],['#/profile','🏢','Hồ sơ DN'],
];

export async function renderBusiness(el, hash) {
  const page = hash.replace('#/','') || 'dashboard';
  const active = '#/' + (['dashboard','find','orders','products','aiclone-booking','wallet','kol','campaigns','report','profile'].includes(page)?page:'dashboard');
  el.innerHTML = `<div class="portal">
    ${sidebar(active)}
    <div class="main"><div class="topbar"><h2>Trang doanh nghiệp</h2>
      <div class="row"><span class="muted">${esc(state.user.name)}</span><button class="btn ghost sm" id="bz-logout">Đăng xuất</button></div></div>
      <div class="content" id="bz-view">${skeletonStatCards(4) + skeletonTable(4)}</div></div></div>`;
  document.getElementById('bz-logout').addEventListener('click', logout);
  enhancePortal();
  const view = document.getElementById('bz-view');
  try {
    if (active==='#/dashboard') await dashboard(view);
    else if (active==='#/find') await find(view);
    else if (active==='#/orders') await orders(view);
    else if (active==='#/products') await products(view);
    else if (active==='#/aiclone-booking') await aiCloneBooking(view);
    else if (active==='#/wallet') await wallet(view);
    else if (active==='#/kol') await kolPage(view);
    else if (active==='#/campaigns') await campaigns(view);
    else if (active==='#/report') await report(view);
    else if (active==='#/profile') await profile(view);
  } catch (e) { view.innerHTML = empty(icon('complaint','teaser-icon'), e.message); }
}

function sidebar(active) {
  return `<div class="sidebar"><div class="brand"><img class="brand-icon" src="https://res.cloudinary.com/drxum5uxt/image/upload/v1785140673/business_ft0lrg.png" alt=""><span class="brand-name">KOC Viet <span>Business</span></span></div>
    ${NAV.map(n=>`<a href="${n[0]}" class="${n[0]===active?'active':''}">${n[1]}<span>${n[2]}</span></a>`).join('')}</div>`;
}

async function dashboard(el) {
  const r = await api('/api/business/report');
  const t = r.totals;
  el.innerHTML = `<h1>Xin chào, ${esc(state.user.name)}</h1>
    <div class="stat-cards" style="margin-top:16px">
      ${stat('Tổng chi booking', money(t.spend))}
      ${stat('Lượt nhấp vào sản phẩm', num(t.clicks))}
      ${stat('Đơn hàng', num(t.orders))}
      ${stat('Phí dịch vụ (5%)', money(t.fee))}
    </div>
    <div class="card" style="margin-top:20px">
      <div class="between"><h2>Booking gần đây</h2><a href="#/find" class="btn primary sm">+ Đặt booking mới</a></div>
      <div id="bz-recent" style="margin-top:12px">${skeletonTable(3)}</div>
    </div>`;
  const rec = await api('/api/bookings');
  document.getElementById('bz-recent').innerHTML = rec.bookings.length ? tableBookings(rec.bookings.slice(0,6)) : empty('📋','Chưa có booking');
  bindOrderRows(el);
}
function stat(l,v){ return `<div class="card"><div class="muted">${l}</div><div style="font-size:24px;font-weight:800;margin-top:4px" class="money">${v}</div></div>`; }

async function aiCloneBooking(el) {
  let catalog = await api('/api/aiclone/eligible-kocs?page=1&per=12');
  const selected = new Map();
  const categories = catalog.filters?.categories || [];
  el.innerHTML = `<div class="between" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="icon-heading">${icon('aiClone','teaser-icon')} Booking AI Clone Avatar</h1>
        <p class="muted">Tạo chiến dịch và sản xuất video tự động từ KOC đã sẵn sàng AI Clone Avatar</p>
      </div>
      <a class="btn ghost sm" href="#/orders">📋 Theo dõi đơn booking</a>
    </div>

    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">
      <!-- Left Panel: KOC Selection Workspace -->
      <div class="card" style="padding:16px">
        <div class="between" style="align-items:center;margin-bottom:12px">
          <b>🎯 Chọn KOC có AI Clone Avatar</b>
          <span class="hint" style="margin:0">Đã chọn: <b id="ac-count" style="color:var(--primary);font-size:14px">0</b>/10 KOC</span>
        </div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">
          <input id="ac-search" placeholder="🔍 Tên KOC…">
          <select id="ac-tier"><option value="">Tất cả hạng</option>${(catalog.filters?.tiers || []).map(x=>`<option>${esc(x)}</option>`).join('')}</select>
          <select id="ac-province"><option value="">Tất cả khu vực</option>${(catalog.filters?.provinces || []).map(x=>`<option>${esc(x)}</option>`).join('')}</select>
          <select id="ac-filter-category"><option value="">Tất cả ngành hàng</option>${categories.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
        </div>
        <div id="ac-kocs" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px;max-height:580px;overflow-y:auto;padding-right:4px"></div>
        <div id="ac-pagination" class="row" style="justify-content:center;margin-top:12px"></div>
      </div>

      <!-- Right Panel: Campaign Brief & Quote Request -->
      <div class="card" style="padding:16px">
        <b>📝 Cấu hình Brief & Nội dung Video</b>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px;margin-top:12px">
          <div class="field"><label>Loại nội dung</label><select id="ac-format"><option value="review">Đánh giá sản phẩm</option><option value="affiliate">Tiếp thị liên kết</option><option value="combo">Đánh giá + tiếp thị liên kết</option></select></div>
          <div class="field"><label>Ngành hàng</label><select id="ac-category">${categories.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
          <div class="field"><label>Link thông tin sản phẩm</label><input id="ac-product-link" placeholder="https://…"></div>
          <div class="field"><label>Deadline bàn giao</label><input id="ac-deadline" type="date"></div>
          <div class="field"><label>Quy mô video AI</label><select id="ac-scope">
            <option value="short">Review ngắn · 15–30 giây</option>
            <option value="standard" selected>Review tiêu chuẩn · 30–60 giây</option>
            <option value="detailed">Review chi tiết · 60–90 giây</option>
          </select></div>
          <div class="field"><label>Số lượng video / KOC</label><input id="ac-video-quantity" type="number" min="1" max="100" value="1"></div>
        </div>
        <p class="hint">Chiết khấu số lượng: từ 5 video -10% · từ 10 video -15% · từ 20 video -20%.</p>
        <div class="field"><label>Thông điệp chính</label><input id="ac-message" maxlength="500" placeholder="Thông điệp cốt lõi bắt buộc có trong video"></div>
        <div class="field"><label>Brief / Yêu cầu kịch bản</label><textarea id="ac-brief" rows="3" placeholder="Mô tả sản phẩm, đối tượng người xem, giọng điệu, điểm cần nhấn mạnh…"></textarea></div>
        
        <div id="ac-affiliate" style="display:none;margin-top:8px">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 12px">
            <div class="field"><label>Sàn áp dụng</label><select id="ac-platform">${PLATFORMS.map(x=>`<option>${x}</option>`).join('')}</select></div>
            <div class="field"><label>Hoa hồng bán hàng (%)</label><input id="ac-rate" type="number" min="1" max="90"></div>
          </div>
          <div class="field"><label>Link sản phẩm trên sàn</label><input id="ac-product-url" placeholder="https://…"></div>
        </div>

        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
          <b style="font-size:14px">💰 Báo giá dự kiến & Gửi yêu cầu</b>
          <div class="tint-box" id="ac-quote" style="margin-top:8px">Vui lòng chọn KOC ở danh sách bên trái để tính báo giá dự kiến.</div>
          <div class="row" style="gap:8px;margin-top:12px">
            <button class="btn primary" id="ac-submit" style="flex:1;padding:12px;font-weight:600">📩 Gửi yêu cầu báo giá cho Admin</button>
            <button class="btn ghost" id="ac-contact-quote" style="flex:1;padding:12px;font-weight:600">💬 Liên hệ nhận báo giá trực tiếp</button>
          </div>
          <p class="hint" style="margin-top:8px">Đội ngũ hỗ trợ sẽ tiếp nhận yêu cầu, lập báo giá chính thức và gửi lại để doanh nghiệp thanh toán.</p>
        </div>
      </div>
    </div>`;

  const list = el.querySelector('#ac-kocs');
  const renderKocs = () => {
    list.innerHTML = catalog.kocs.map(k => `<button type="button" class="card ${selected.has(k.id)?'selected':''}" data-koc="${k.id}" style="text-align:left;padding:10px;border:${selected.has(k.id)?'2px solid var(--primary)':'1px solid var(--border)'}">
      <div class="row" style="gap:8px"><img class="avatar" src="${esc(avatarUrl(k.avatar))}" style="width:40px;height:40px"><div><b style="font-size:13px">${esc(k.name)}</b><div>${tierBadge(k.tier)}</div></div></div>
      <div class="muted" style="font-size:11px;margin-top:6px">${esc(k.province||'')} · ${num(k.followers)} người theo dõi</div>
      <div class="muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.categories.map(esc).join(', ')}</div>
      <div style="margin-top:6px"><span class="chip g" style="font-size:10px">✅ AI Clone Ready</span></div></button>`).join('') || empty('','Không tìm thấy KOC đã đăng ký AI Clone');
    list.querySelectorAll('[data-koc]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.koc;
      if (selected.has(id)) selected.delete(id);
      else if (selected.size < 10) selected.set(id, catalog.kocs.find(k => k.id === id));
      else return toast('Chỉ chọn tối đa 10 KOC', 'err');
      renderKocs();
      updateQuote();
    }));
    el.querySelector('#ac-count').textContent = selected.size;
  };
  const updateQuote = () => {
    // Báo giá chỉ được hiển thị sau khi Admin kiểm tra và gửi chính thức.
  };
  const renderPagination = () => {
    const box = el.querySelector('#ac-pagination');
    const page = Number(catalog.page || 1);
    const pages = Number(catalog.pages || 1);
    box.innerHTML = `<button class="btn ghost sm" data-page="${page-1}" ${page<=1?'disabled':''}>← Trước</button>
      <span class="muted">Trang ${page}/${pages} · ${num(catalog.total || 0)} KOC</span>
      <button class="btn ghost sm" data-page="${page+1}" ${page>=pages?'disabled':''}>Sau →</button>`;
    box.querySelectorAll('[data-page]:not([disabled])').forEach(button =>
      button.addEventListener('click', () => loadKocs(Number(button.dataset.page))));
  };
  const loadKocs = async (page=1) => {
    const params = new URLSearchParams({
      page:String(page), per:'12',
      q:el.querySelector('#ac-search').value.trim(),
      tier:el.querySelector('#ac-tier').value,
      province:el.querySelector('#ac-province').value,
      category:el.querySelector('#ac-filter-category').value,
    });
    list.innerHTML = skeletonKocGrid(6);
    try {
      catalog = await api(`/api/aiclone/eligible-kocs?${params}`);
      renderKocs();
      renderPagination();
    } catch (error) {
      list.innerHTML = empty('','Không tải được danh sách KOC');
      toast(error.message,'err');
    }
  };
  let searchTimer;
  el.querySelector('#ac-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadKocs(1), 250);
  });
  ['#ac-tier','#ac-province','#ac-filter-category'].forEach(selector =>
    el.querySelector(selector).addEventListener('change', () => loadKocs(1)));
  el.querySelector('#ac-format').addEventListener('change', e => {
    el.querySelector('#ac-affiliate').style.display = ['affiliate','combo'].includes(e.target.value) ? 'block' : 'none';
    updateQuote();
  });
  el.querySelector('#ac-category').addEventListener('change', updateQuote);
  ['#ac-scope','#ac-video-quantity'].forEach(selector =>
    el.querySelector(selector).addEventListener('input', updateQuote));
  el.querySelector('#ac-deadline').min = new Date().toISOString().slice(0,10);
  renderKocs();
  renderPagination();

  el.querySelector('#ac-submit').addEventListener('click', async () => {
    if (!selected.size) return toast('Chọn ít nhất 1 KOC', 'err');
    const format = el.querySelector('#ac-format').value;
    const payload = {
      koc_ids:[...selected.keys()],
      format,
      category:el.querySelector('#ac-category').value,
      product_link:el.querySelector('#ac-product-link').value.trim(),
      deadline:el.querySelector('#ac-deadline').value,
      message:el.querySelector('#ac-message').value.trim(),
      requirements:el.querySelector('#ac-brief').value.trim(),
      scope:el.querySelector('#ac-scope').value,
      video_quantity:Number(el.querySelector('#ac-video-quantity').value),
    };
    if (['affiliate','combo'].includes(format)) {
      payload.platform=el.querySelector('#ac-platform').value;
      payload.product_url=el.querySelector('#ac-product-url').value.trim();
      payload.commission_rate=Number(el.querySelector('#ac-rate').value);
    }
    const button=el.querySelector('#ac-submit');
    button.disabled=true;
    try {
      const result=await post('/api/aiclone/bookings',payload);
      toast(`Đã gửi ${result.bookings.length} yêu cầu · Admin sẽ gửi báo giá chính thức`,'ok');
      location.hash='#/orders';
    } catch(e) {
      toast(e.message,'err');
      button.disabled=false;
    }
  });
}

async function find(el) {
  el.innerHTML = `<h1>Tìm & đặt booking KOC</h1><p class="muted" style="margin-bottom:16px">Chọn KOC → đặt gói theo bảng giá niêm yết (không thương lượng).</p><div id="mp-embed"></div>`;
  renderMarketplaceEmbed(document.getElementById('mp-embed'), (kocId) => openBookingForm(kocId, el));
}

const PLATFORMS = ['Shopee','Lazada','TikTok Shop','Tiki','Facebook Shop'];

async function openBookingForm(kocId, el) {
  const { koc } = await api('/api/koc/' + kocId);
  const prices = koc.prices.filter(p => koc.accepting[p.category] !== false);
  if (!prices.length) return toast('KOC này đang tạm ngưng nhận booking','err');
  const m = modal(`
    <div class="row"><img class="avatar" src="${esc(avatarUrl(koc.avatar))}"><div><h2>${esc(koc.name)}</h2><div>${tierBadge(koc.tier)} ${stars(koc.rating)}</div></div></div>
    <div class="field" style="margin-top:14px"><label>Kiểu booking</label>
      <select id="bf-type">
        <option value="review">Review sản phẩm — phí cố định</option>
        <option value="advertising">Quảng cáo thương hiệu — phí cố định</option>
        <option value="affiliate">Tiếp thị liên kết — trả theo doanh số</option>
        <option value="combo">Gói kết hợp — đánh giá/quảng cáo + hoa hồng bán hàng</option>
      </select></div>
    <div class="field"><label>Gói ngành hàng (giá niêm yết cố định)</label>
      <select id="bf-cat">${prices.map(p=>`<option value="${esc(p.category)}" data-price="${p.price}">${esc(p.category)} — ${money(p.price)}</option>`).join('')}</select></div>
    <div class="tint-box between" id="bf-esc-box"><span>Giá booking · khoản tiền được giữ an toàn khi gửi yêu cầu</span><b class="money" id="bf-price">${money(prices[0].price)}</b></div>
    <div id="bf-aff" style="display:none">
      <div class="field" style="margin-top:12px"><label>🛒 Sàn áp dụng</label>
        <select id="bf-plat">${PLATFORMS.map(pl=>`<option>${pl}</option>`).join('')}</select></div>
      <div class="field"><label>🔗 Link sản phẩm gốc trên sàn</label><input id="bf-purl" placeholder="https://shopee.vn/…"></div>
      <div class="field"><label>Tỉ lệ % chiết khấu (hoa hồng) đề xuất cho KOC</label><input id="bf-rate" type="number" min="1" max="90" placeholder="ví dụ 12"></div>
      <p class="hint">Hoa hồng KOC = doanh số × % chiết khấu. Phí nền tảng 1% trên doanh số do DN chi trả (không trừ vào hoa hồng KOC).</p>
    </div>
    <div class="field" style="margin-top:12px"><label>${icon('productData')} Link dữ liệu sản phẩm (bắt buộc)</label><input id="bf-link" placeholder="https://… (thông tin, hình ảnh, giá, chính sách)"></div>
    <div class="field"><label>Mô tả yêu cầu</label><textarea id="bf-req" rows="3" placeholder="Yêu cầu nội dung, thông điệp…"></textarea></div>
    <div class="field"><label>Thời hạn</label><input id="bf-deadline" type="date"></div>
    <p class="hint" id="bf-hint">Phí được trừ từ số dư khả dụng và giữ an toàn khi gửi yêu cầu. Khi bạn duyệt bài đăng, KOC nhận 95% và NetViet nhận 5%.</p>
    <button class="btn primary" id="bf-go">Gửi yêu cầu booking</button>
    <button class="btn ghost" id="bf-cancel" style="margin-top:8px">Hủy</button>`);
  const sel = m.querySelector('#bf-cat');
  const typeSel = m.querySelector('#bf-type');
  const escBox = m.querySelector('#bf-esc-box');
  const affBox = m.querySelector('#bf-aff');
  const catField = sel.closest('.field');
  function syncType() {
    const t = typeSel.value;
    const showAff = t==='affiliate' || t==='combo';
    const showAd = t==='review' || t==='advertising' || t==='combo';
    affBox.style.display = showAff ? 'block' : 'none';
    escBox.style.display = showAd ? 'flex' : 'none';
    catField.style.display = showAd ? 'block' : 'none';
    m.querySelector('#bf-hint').textContent = showAd
      ? `${t==='review'?'Phí đánh giá sản phẩm':t==='advertising'?'Phí quảng cáo':'Phí gói kết hợp'} được trừ từ số dư khả dụng và giữ an toàn khi gửi yêu cầu. Khi bạn duyệt bài đăng, KOC nhận 95% và NetViet nhận 5%.`
      : 'Tiếp thị liên kết: KOC nhận hoa hồng theo doanh số thực tế; doanh nghiệp trả thêm phí nền tảng 1%.';
    m.querySelector('#bf-go').textContent = 'Gửi yêu cầu booking';
  }
  typeSel.addEventListener('change', syncType);
  sel.addEventListener('change', () => { m.querySelector('#bf-price').textContent = money(sel.selectedOptions[0].dataset.price); });
  m.querySelector('#bf-cancel').addEventListener('click', closeModal);
  const isValidUrl = (s) => { try { const u = new URL(s); return u.protocol==='http:'||u.protocol==='https:'; } catch (e) { return false; } };
  const markErr = (inp, bad) => { inp.style.borderColor = bad ? 'var(--error)' : ''; };
  m.querySelector('#bf-go').addEventListener('click', async () => {
    const t = typeSel.value;
    let ok = true;
    const linkInp = m.querySelector('#bf-link');
    const product_link = linkInp.value.trim();
    const linkBad = !product_link || !isValidUrl(product_link);
    markErr(linkInp, linkBad); if (linkBad) ok = false;
    const deadlineInp = m.querySelector('#bf-deadline');
    const deadline = deadlineInp.value;
    const deadlineBad = !deadline || deadline < new Date().toISOString().slice(0,10);
    markErr(deadlineInp, deadlineBad); if (deadlineBad) ok = false;
    const reqInp = m.querySelector('#bf-req');
    const requirements = reqInp.value.trim();
    const reqBad = requirements.length < 5;
    markErr(reqInp, reqBad); if (reqBad) ok = false;
    const payload = { koc_id: kocId, category: sel.value, product_link, booking_type: t, requirements, deadline };
    if (t==='affiliate' || t==='combo') {
      const purlInp = m.querySelector('#bf-purl');
      payload.platform = m.querySelector('#bf-plat').value;
      payload.product_url = purlInp.value.trim();
      const purlBad = !payload.product_url || !isValidUrl(payload.product_url);
      markErr(purlInp, purlBad); if (purlBad) ok = false;
      const rateInp = m.querySelector('#bf-rate');
      payload.commission_rate = Number(rateInp.value);
      const rateBad = !(payload.commission_rate >= 1 && payload.commission_rate <= 90);
      markErr(rateInp, rateBad); if (rateBad) ok = false;
    }
    if (!ok) return toast('Vui lòng kiểm tra lại các trường được đánh dấu đỏ','err');
    const btn = m.querySelector('#bf-go'); btn.disabled = true;
    try {
      await post('/api/booking', payload);
      toast('Đã gửi booking cho KOC xác nhận', 'ok');
      closeModal();
      location.hash = '#/orders';
    } catch (e) {
      toast(e.message, 'err');
      btn.disabled = false;
    }
  });
  m.querySelectorAll('#bf-link,#bf-req,#bf-deadline,#bf-purl,#bf-rate').forEach(inp => inp.addEventListener('input', () => markErr(inp, false)));
  syncType();
}

async function orders(el) {
  const params = new URLSearchParams(location.search);
  const payOSResult = params.get('payos');
  const orderCode = Number(params.get('orderCode'));
  if (payOSResult && Number.isSafeInteger(orderCode)) {
    try {
      const payment = await post('/api/booking/payment/status', {
        order_code: orderCode,
      });
      if (payment.status === 'paid') {
        toast('Thanh toán thành công · booking đã hoàn tất và KOC nhận 95%', 'ok');
      } else if (payment.status === 'cancelled') {
        toast('Bạn đã hủy thanh toán', 'err');
      } else {
        toast('Thanh toán đang được xác nhận', 'ok');
      }
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
    }
  }
  const r = await api('/api/bookings');
  el.innerHTML = `<h1>Booking đã đặt</h1><div class="table-wrap" style="margin-top:16px">${r.bookings.length?tableBookings(r.bookings):empty('📋','Chưa có booking')}</div>`;
  bindOrderRows(el);
}

function tableBookings(list) {
  return `<table><thead><tr><th>Mã</th><th>Thời gian</th><th>KOC</th><th>Ngành</th><th>Giá</th><th>Trạng thái</th><th style="width:1%;white-space:nowrap"></th></tr></thead><tbody>
    ${list.map(b=>`<tr><td>${esc(b.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(b.created_at)}</td><td>${esc(b.kocname)}</td><td>${esc(b.category)}</td>
      <td class="money">${b.status==='quote_pending'?'Chờ báo giá':['quote_grouped','payment_grouped'].includes(b.status)?'Báo giá chung':money(b.price)}</td><td style="white-space:nowrap">${statusChip(b.status)}</td>
      <td style="width:1%;white-space:nowrap;text-align:right"><button class="btn ghost sm" data-order="${b.id}">Chi tiết</button></td></tr>`).join('')}
  </tbody></table>`;
}

function bindOrderRows(el) {
  el.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => openOrder(b.dataset.order, el)));
}

function businessVideoBlock(b) {
  if (!b.video_preview_url) return '';
  return `<div class="field booking-video">
    <label>🎥 Video KOC gửi duyệt · phiên bản ${Number(b.video_version || 1)}</label>
    <div class="stream-frame"><video src="${esc(b.video_preview_url)}" title="Video ${esc(b.code)}" controls playsinline preload="metadata"></video></div>
    <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
      ${b.video_download_url ? `<a class="btn ghost sm" href="${esc(b.video_download_url)}" target="_blank" rel="noopener">⬇️ Tải video</a>` : '<span class="muted" style="font-size:12px">Video chưa sẵn sàng để tải.</span>'}
    </div>
  </div>`;
}

async function openOrder(id, el) {
  const r = await api('/api/bookings');
  const b = r.bookings.find(x=>x.id===id);
  if (!b) return;
  if (
    b.video_submission_id &&
    ['video_processing', 'pending_review', 'video_approved', 'revision_requested'].includes(b.status)
  ) {
    try {
      const synced = await post('/api/booking/video/status', {
        submission_id: b.video_submission_id,
      });
      const video = synced.video || {};
      b.status = video.status === 'pending_review' ? 'pending_review' : b.status;
      b.video_status = video.status;
      b.video_preview_url = video.preview_url;
      b.video_thumbnail_url = video.thumbnail_url;
      b.video_download_url = video.download_url;
      b.video_duration = video.duration;
    } catch (_) {}
  }
  const m = modal(`
    <div class="between"><h2>${esc(b.code)}</h2>${statusChip(b.status)}</div>
    <div class="tint-box" style="margin:12px 0">
      <div class="between"><span>KOC</span><b>${esc(b.kocname)}</b></div>
      <div class="between"><span>Ngành</span><b>${esc(b.category)}</b></div>
      <div class="between"><span>Giá booking</span><b class="money">${b.status==='quote_pending'?'Chờ Admin báo giá':['quote_grouped','payment_grouped'].includes(b.status)?'Nằm trong báo giá chung':money(b.price)}</b></div>
      ${Number(b.escrow) > 0 && Number(b.legacy_paid_escrow) ? `<div class="between"><span>Khoản tiền đang được đảm bảo</span><b class="money">${money(b.escrow)}</b></div>` : ''}
      ${b.payment_order_code ? `<div class="between"><span>Mã giao dịch</span><b>${esc(b.payment_order_code)}</b></div>` : ''}
    </div>
    ${b.type==='aiclone'&&Number(b.price)>0&&(
      Number(b.aiclone_quote_production||0)+Number(b.aiclone_quote_koc||0)+
      Number(b.aiclone_quote_platform||0)+Number(b.aiclone_quote_additional||0)
    )>0?`<div class="tint-box" style="margin-bottom:12px">
      <b>Chi tiết báo giá AI Clone Avatar</b>
      <div class="between" style="margin-top:8px"><span>Phí sản xuất video</span><b>${money(b.aiclone_quote_production||0)}</b></div>
      <div class="between"><span>Phí KOC</span><b>${money(b.aiclone_quote_koc||0)}</b></div>
      <div class="between"><span>Phí nền tảng</span><b>${money(b.aiclone_quote_platform||0)}</b></div>
      <div class="between"><span>Chi phí bổ sung</span><b>${money(b.aiclone_quote_additional||0)}</b></div>
      <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><b>Tổng thanh toán</b><b class="money">${money(b.price)}</b></div>
      ${b.aiclone_quote_note?`<p class="muted" style="margin-top:8px"><b>Ghi chú:</b> ${esc(b.aiclone_quote_note)}</p>`:''}
    </div>`:''}
    <div class="field"><label>Link sản phẩm đã gửi</label><div class="copybox">${esc(b.product_link)}</div></div>
    ${b.type==='aiclone'&&b.aiclone_message?`<div class="field"><label>Thông điệp chính</label><div class="tint-box">${esc(b.aiclone_message)}</div></div>`:''}
    ${b.type==='aiclone'&&b.aiclone_script?`<div class="field"><label>Kịch bản đã duyệt nội bộ</label><div class="tint-box" style="white-space:pre-wrap">${esc(b.aiclone_script)}</div></div>`:''}
    ${b.type==='aiclone'&&(b.business_video_link||b.video_link)?`<div class="field"><label>🎥 Video admin giao doanh nghiệp</label><div class="copybox"><a href="${esc(b.business_video_link||b.video_link)}" target="_blank" rel="noopener" style="color:var(--info)">Mở / xem video</a></div></div>`:''}
    ${businessVideoBlock(b)}
    ${b.video_review_note ? `<div class="tint-box video-review-note"><b>Phản hồi đã gửi:</b><p>${esc(b.video_review_note)}</p></div>` : ''}
    ${b.post_link?`<div class="field"><label>Bài KOC đã đăng (${esc(b.post_platform)})</label><div class="copybox"><a href="${esc(b.post_link)}" target="_blank" style="color:var(--info)">${esc(b.post_link)}</a></div></div>`:''}
    ${b.reject_reason ? `<div class="chip r">KOC từ chối: ${esc(b.reject_reason)}${b.status === 'refund_pending' ? ' — khoản thanh toán đang chờ hoàn.' : ''}</div>` : ''}
    <div id="ord-act" style="margin-top:14px"></div>
    <button class="btn ghost" id="ord-close" style="margin-top:8px">Đóng</button>`);
  m.querySelector('#ord-close').addEventListener('click', closeModal);
  const act = m.querySelector('#ord-act');
  const hasAiQuote =
    b.type === 'aiclone' &&
    Number(b.aiclone_quote_production||0)+Number(b.aiclone_quote_koc||0)+
    Number(b.aiclone_quote_platform||0)+Number(b.aiclone_quote_additional||0) > 0;
  if (b.status === 'quote_pending' && b.type === 'aiclone') {
    act.innerHTML = `<div class="tint-box"><b>Đã gửi yêu cầu báo giá</b>
      <p class="muted" style="margin-top:5px">Admin đang kiểm tra KOC, số lượng video, quy mô sản xuất và brief. Bạn sẽ nhận thông báo khi báo giá chính thức được gửi.</p></div>`;
  } else if (['quote_grouped','payment_grouped'].includes(b.status) && b.type === 'aiclone') {
    act.innerHTML = `<div class="tint-box"><b>KOC này nằm trong báo giá chung của booking</b>
      <p class="muted" style="margin-top:5px">Hãy xác nhận tại dòng booking cùng lô đang có trạng thái “Chờ DN xác nhận báo giá”. Khi chấp nhận, toàn bộ KOC sẽ được chuyển sang bước sản xuất.</p></div>`;
  } else if ((['quote_sent','quoted','payment_pending'].includes(b.status) || (hasAiQuote && ['quote_sent','quoted','payment_pending'].includes(b.status))) && b.type === 'aiclone') {
    act.innerHTML = `<div class="card" style="padding:14px;border:1px solid var(--primary);margin-top:10px;background:var(--card-bg)">
        <div class="between" style="align-items:center;flex-wrap:wrap;gap:8px">
          <div>
            <b style="font-size:15px;color:var(--primary)">💳 Báo giá và thanh toán</b>
            <div class="muted" style="font-size:12px;margin-top:2px">Báo giá đã được duyệt. Hãy thanh toán để chuyển sang bước sản xuất video.</div>
          </div>
          <b class="money" style="font-size:20px">${money(b.price)}</b>
        </div>
        <div class="row" style="gap:10px;margin-top:14px;flex-wrap:wrap">
          <button class="btn primary" id="o-pay-wallet" style="flex:1;min-width:200px;padding:12px;white-space:normal;line-height:1.3;height:auto;text-align:center">💼 Thanh toán / Ký quỹ từ Ví doanh nghiệp</button>
          <button class="btn ghost" id="o-pay-payos" style="flex:1;min-width:200px;padding:12px;white-space:normal;line-height:1.3;height:auto;text-align:center">🏦 Thanh toán trực tuyến / Mã QR</button>
        </div>
      </div>`;
    const payWallet = act.querySelector('#o-pay-wallet');
    if (payWallet) payWallet.addEventListener('click', async () => {
      if (!confirm(`Xác nhận thanh toán ${money(b.price)} từ Ví doanh nghiệp để bắt đầu sản xuất video?`)) return;
      payWallet.disabled = true;
      try {
        await post('/api/aiclone/quote-response', { id: b.id, action: 'accept' });
        toast('Thanh toán thành công · Đơn đã chuyển sang sản xuất', 'ok');
        closeModal(); orders(el);
      } catch (e) { toast(e.message, 'err'); payWallet.disabled = false; }
    });
    const payPayOS = act.querySelector('#o-pay-payos');
    if (payPayOS) payPayOS.addEventListener('click', async () => {
      payPayOS.disabled = true;
      try {
        const res = await post('/api/booking/payment-link', { booking_id: b.id });
        if (res.checkoutUrl) window.open(res.checkoutUrl, '_blank');
        toast('Đã tạo yêu cầu thanh toán', 'ok');
        closeModal(); orders(el);
      } catch (e) { toast(e.message, 'err'); payPayOS.disabled = false; }
    });
  } else if (b.status === 'pending_business_review' && b.type === 'aiclone') {
    act.innerHTML = `<div class="field"><label>Nhận xét khi yêu cầu chỉnh sửa</label><textarea id="o-ai-note" rows="3" placeholder="Nêu rõ đoạn cần chỉnh sửa…"></textarea></div>
      <div class="row" style="gap:8px"><button class="btn ok" id="o-ai-approve" style="flex:1">✅ Duyệt bản dựng</button>
      <button class="btn danger" id="o-ai-revise" style="flex:1">↩ Yêu cầu sửa</button></div>
      <p class="hint">Sau khi doanh nghiệp duyệt, video sẽ tự động chuyển đến KOC phê duyệt và đăng bài.</p>`;
    const review = async action => {
      const note=act.querySelector('#o-ai-note').value.trim();
      if(action==='request_revision'&&!note)return toast('Nhập nội dung cần chỉnh sửa','err');
      try{
        await post('/api/aiclone/video-review',{id:b.id,action,note});
        toast(action==='approve'?'Đã duyệt bản dựng · Đã chuyển KOC phê duyệt':'Đã gửi yêu cầu chỉnh sửa','ok');
        closeModal();orders(el);
      }catch(e){toast(e.message,'err');}
    };
    act.querySelector('#o-ai-approve').addEventListener('click',()=>review('approve'));
    act.querySelector('#o-ai-revise').addEventListener('click',()=>review('request_revision'));
  } else if (['business_approved', 'pending_koc_review'].includes(b.status) && b.type === 'aiclone') {
    act.innerHTML='<div class="chip b">✅ Doanh nghiệp đã duyệt bản dựng · Đang chờ KOC phê duyệt & đăng bài.</div>';
  } else if (['brief_review','producing'].includes(b.status) && b.type === 'aiclone') {
    act.innerHTML=`<div class="chip b">${b.status==='brief_review'?'NetViet đã nhận thanh toán và đang xử lý yêu cầu sản xuất':'NetViet đang sản xuất video AI Clone'}</div>`;
  } else if (b.status === 'revision_requested' && b.type === 'aiclone') {
    act.innerHTML=`<div class="chip r">NetViet đang chỉnh sửa bản dựng AI Clone: ${esc(b.reject_reason||'')}</div>`;
  } else if (['payment_pending', 'payment_failed', 'payment_cancelled'].includes(b.status)) {
    const canResume = b.status === 'payment_pending' && b.payment_checkout_url;
    act.innerHTML = `<div class="tint-box">
        <b>${b.status === 'payment_failed' ? 'Chưa tạo được yêu cầu thanh toán' : b.status === 'payment_cancelled' ? 'Thanh toán đã bị hủy' : 'Booking đang chờ thanh toán'}</b>
        <p class="muted" style="margin-top:4px">${b.post_link
          ? 'KOC đã đăng bài. Booking sẽ hoàn tất và 95% được ghi vào ví KOC sau khi thanh toán được xác nhận.'
          : b.type === 'aiclone'
            ? `Admin đã gửi báo giá chính thức${b.aiclone_quote_note ? `: ${esc(b.aiclone_quote_note)}` : ''}. Thanh toán để NetViet bắt đầu sản xuất video.`
            : 'Đây là booking theo quy trình đảm bảo thanh toán cũ; KOC chỉ nhận booking sau khi giao dịch được xác nhận.'}</p>
      </div>
      <button class="btn primary" id="o-payment" style="margin-top:10px">${canResume ? 'Tiếp tục thanh toán' : 'Tạo lại yêu cầu thanh toán'}</button>
      ${b.type === 'aiclone' && r.demoPaymentAllowed
        ? `<button class="btn ok" id="o-demo-paid" style="margin-top:8px">✓ Đã thanh toán (Demo)</button>
           <p class="hint">Chỉ dùng để kiểm thử: hệ thống sẽ mô phỏng một giao dịch thành công.</p>`
        : ''}`;
    act.querySelector('#o-payment').addEventListener('click', async () => {
      const button = act.querySelector('#o-payment');
      button.disabled = true;
      try {
        if (canResume) {
          window.location.assign(b.payment_checkout_url);
          return;
        }
        const payment = await post('/api/booking/payment-link', {
          booking_id: b.id,
        });
        window.location.assign(payment.checkoutUrl);
      } catch (e) {
        toast(e.message, 'err');
        button.disabled = false;
      }
    });
    const demoPaid = act.querySelector('#o-demo-paid');
    if (demoPaid) demoPaid.addEventListener('click', async () => {
      if (!confirm('Xác nhận mô phỏng booking này đã thanh toán thành công?')) return;
      demoPaid.disabled = true;
      try {
        await post('/api/booking/payment/demo-paid', { booking_id: b.id });
        toast('Đã mô phỏng thanh toán thành công · Admin có thể bắt đầu sản xuất', 'ok');
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, 'err');
        demoPaid.disabled = false;
      }
    });
  } else if (b.status === 'pending_review') {
    act.innerHTML = `<div class="field"><label>Nhận xét cho KOC (bắt buộc khi yêu cầu sửa)</label><textarea id="o-video-note" rows="3" placeholder="Ví dụ: chỉnh lại 5 giây đầu, tăng âm lượng…"></textarea></div>
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <button class="btn ok" id="o-video-approve" style="flex:1">✅ Duyệt video</button>
        <button class="btn danger" id="o-video-revise" style="flex:1">↩ Yêu cầu sửa</button>
      </div>`;
    const review = async (action) => {
      const note = act.querySelector('#o-video-note').value.trim();
      if (action === 'request_revision' && !note)
        return toast('Nhập nội dung KOC cần chỉnh sửa', 'err');
      act.querySelector('#o-video-approve').disabled = true;
      act.querySelector('#o-video-revise').disabled = true;
      try {
        await post('/api/booking/video/review', {
          submission_id: b.video_submission_id,
          action,
          note,
        });
        toast(action === 'approve' ? 'Đã duyệt video · KOC có thể đăng bài' : 'Đã gửi yêu cầu chỉnh sửa', 'ok');
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, 'err');
        act.querySelector('#o-video-approve').disabled = false;
        act.querySelector('#o-video-revise').disabled = false;
      }
    };
    act.querySelector('#o-video-approve').addEventListener('click', () => review('approve'));
    act.querySelector('#o-video-revise').addEventListener('click', () => review('request_revision'));
  } else if (b.status === 'video_processing') {
    act.innerHTML = `<div class="tint-box"><b>Đang hoàn tất video</b><p class="muted" style="margin-top:4px">Mở lại chi tiết sau ít phút để xem và duyệt.</p></div>`;
  } else if (b.status === 'video_approved') {
    act.innerHTML = `<div class="chip g">✅ Video đã duyệt · đang chờ KOC đăng lên mạng xã hội và nộp link.</div>`;
  } else if (b.status === 'revision_requested') {
    act.innerHTML = `<div class="chip r">Đang chờ KOC tải phiên bản chỉnh sửa.</div>`;
  } else if (['posted', 'settling', 'video_approved'].includes(b.status)) {
    const isAi = b.type === 'aiclone';
    const quoteKoc = Number(b.aiclone_quote_koc || 0);
    const prodFee = Number(b.aiclone_quote_production || b.aiclone_production_fee || 0);
    const platFee = Number(b.aiclone_quote_platform || b.aiclone_platform_fee || 0);
    const addFee = Number(b.aiclone_quote_additional || 0);

    let kocFee = 0;
    if (isAi) {
      if (quoteKoc > 0) kocFee = quoteKoc;
      else if (Number(b.price) > (prodFee + platFee + addFee)) kocFee = Number(b.price) - prodFee - platFee - addFee;
      else kocFee = Math.round(Number(b.price) * 0.85);
    } else {
      kocFee = Math.max(0, Number(b.price) - Math.round(Number(b.price) * 0.05));
    }

    act.innerHTML = `<div class="tint-box" style="margin-bottom:10px">
        <b>Theo dõi & Đối soát nghiệm thu</b>
        <p class="muted" style="margin-top:4px">KOC đã đăng tải bài review. Bấm nút bên dưới để giải ngân <b>+${money(kocFee)}</b> về Ví của KOC (5% chuyển vào Tài khoản NetViet).</p>
      </div>
      <button class="btn ok" id="o-complete" style="width:100%;padding:12px;font-size:15px;font-weight:700">💸 Duyệt bài & Giải ngân ngay cho KOC (+${money(kocFee)})</button>`;
    act.querySelector('#o-complete').addEventListener('click', async () => {
      if (!confirm(`Xác nhận duyệt bài đăng và giải ngân +${money(kocFee)} cho KOC ${b.kocname}?`)) return;
      const button = act.querySelector('#o-complete');
      button.disabled = true;
      try {
        await post('/api/booking/action', { id: b.id, action: 'complete' });
        toast(`Đã giải ngân thành công +${money(kocFee)} vào Ví của KOC ${b.kocname}`, 'ok');
        closeModal();
        orders(el);
      } catch (e) {
        toast(e.message, 'err');
        button.disabled = false;
      }
    });
  } else if (b.status === 'completed' && !b.rating) {
    act.innerHTML = `<div class="field"><label>Đánh giá sao</label><select id="o-rating"><option value="5">★★★★★ (5)</option><option value="4">★★★★ (4)</option><option value="3">★★★ (3)</option></select></div>
      <div class="field"><label>Nhận xét</label><textarea id="o-review" rows="2"></textarea></div>
      <button class="btn primary" id="o-rate">Gửi đánh giá</button>`;
    act.querySelector('#o-rate').addEventListener('click', async () => {
      try { await post('/api/booking/action', { id: b.id, action:'rate', rating: act.querySelector('#o-rating').value, review: act.querySelector('#o-review').value.trim() }); toast('Đã đánh giá','ok'); closeModal(); orders(el); }
      catch (e) { toast(e.message,'err'); }
    });
  } else if (b.status === 'completed') {
    act.innerHTML = `<div class="chip g">Đã hoàn thành · Bạn đã đánh giá ${stars(b.rating)}</div>`;
  } else {
    act.innerHTML = `<p class="muted">Đang chờ KOC xử lý.</p>`;
  }
  if (b.status !== 'rejected') {
    const complainBtn = document.createElement('button');
    complainBtn.className = 'btn ghost sm'; complainBtn.style.marginTop = '8px'; complainBtn.style.width = '100%';
    complainBtn.innerHTML = `${icon('complaint','btn-icon')} Gửi khiếu nại về booking này`;
    complainBtn.addEventListener('click', async () => {
      const reason = prompt('Mô tả vấn đề bạn gặp phải với booking này:');
      if (!reason || !reason.trim()) return;
      try { await post('/api/complaints', { booking_id: b.id, reason: reason.trim() }); toast('Đã gửi khiếu nại — NetViet sẽ xem xét','ok'); } catch (e) { toast(e.message,'err'); }
    });
    act.appendChild(complainBtn);
  }
}

function businessProductPayload(product, status = product.status) {
  return {
    name: product.name,
    product_url: product.product_url,
    platform: product.platform,
    sku: product.sku || '',
    price: Number(product.price) || 0,
    image_url: product.image_url || '',
    commission_rate: Number(product.commission_rate) || 0,
    affiliate_enabled: product.affiliate_enabled !== 0,
    status,
    notes: product.notes || '',
  };
}

async function products(el) {
  let searchTimer;
  el.innerHTML = `<div class="between product-page-heading">
      <div>
        <h1 class="icon-heading">${icon('productData','teaser-icon')} Quản lý sản phẩm</h1>
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

  const list = el.querySelector('#pr-list');
  const load = async () => {
    const params = new URLSearchParams();
    const search = el.querySelector('#pr-search').value.trim();
    const status = el.querySelector('#pr-status').value;
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    list.innerHTML = skeletonKocGrid(4);
    try {
      const result = await api(`/api/business/products${params.size ? `?${params}` : ''}`);
      const summary = result.summary || {};
      el.querySelector('#pr-stats').innerHTML =
        stat('Tổng sản phẩm', num(summary.total || 0)) +
        stat('Đang hoạt động', num(summary.active || 0)) +
        stat('Tạm dừng', num(summary.paused || 0));
      renderBusinessProducts(list, result.products || [], load);
    } catch (error) {
      list.innerHTML = empty(icon('productData','teaser-icon'), error.message);
    }
  };

  el.querySelector('#pr-new').addEventListener('click', () => businessProductModal(null, load));
  el.querySelector('#pr-search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 250);
  });
  el.querySelector('#pr-status').addEventListener('change', load);
  await load();
}

function renderBusinessProducts(list, products, reload) {
  if (!products.length) {
    list.innerHTML = empty(
      icon('productData','teaser-icon'),
      'Chưa có sản phẩm phù hợp. Hãy thêm link sản phẩm đầu tiên của doanh nghiệp.',
    );
    return;
  }
  list.innerHTML = products.map(product => `<article class="card product-card">
      <div class="product-card-media">
        ${product.image_url
          ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy">`
          : `<span>${icon('productData','teaser-icon')}</span>`}
      </div>
      <div class="product-card-body">
        <div class="between product-card-title">
          <div>
            <h3>${esc(product.name)}</h3>
            <div class="row product-meta">
              <span class="chip b">${esc(product.platform || 'Website')}</span>
              <span class="chip ${product.status === 'active' ? 'g' : 'w'}">${product.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}</span>
            </div>
          </div>
          <b class="money">${money(product.price || 0)}</b>
        </div>
        <a class="product-link" href="${esc(product.product_url)}" target="_blank" rel="noopener" title="${esc(product.product_url)}">${esc(product.product_url)}</a>
        <div class="product-details">
          <span><b>SKU:</b> ${esc(product.sku || '—')}</span>
          <span><b>Hoa hồng dự kiến:</b> ${Number(product.commission_rate || 0).toLocaleString('vi-VN')}%</span>
          <span><b>Cập nhật:</b> ${fmtDate(product.updated_at)}</span>
        </div>
        ${product.notes ? `<p class="muted product-notes">${esc(product.notes)}</p>` : ''}
        <div class="row product-affiliate-ready">
          <span class="chip ${product.affiliate_enabled ? 'g' : 'n'}">${product.affiliate_enabled ? 'Sẵn sàng trả hoa hồng' : 'Chưa bật hoa hồng bán hàng'}</span>
          <button class="btn ghost sm" disabled title="Tính năng sẽ sớm được mở">Tạo đường dẫn riêng · Sắp ra mắt</button>
        </div>
        <div class="product-actions">
          <button class="btn ghost sm" data-product-action="copy" data-id="${product.id}">Sao chép link</button>
          <a class="btn ghost sm" href="${esc(product.product_url)}" target="_blank" rel="noopener">Mở sản phẩm</a>
          <button class="btn ghost sm" data-product-action="toggle" data-id="${product.id}">${product.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}</button>
          <button class="btn ghost sm" data-product-action="edit" data-id="${product.id}">Sửa</button>
          <button class="btn danger sm" data-product-action="delete" data-id="${product.id}">Xóa</button>
        </div>
      </div>
    </article>`).join('');

  const byId = new Map(products.map(product => [product.id, product]));
  list.querySelectorAll('[data-product-action]').forEach(button => button.addEventListener('click', async () => {
    const product = byId.get(button.dataset.id);
    if (!product) return;
    const action = button.dataset.productAction;
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(product.product_url);
        toast('Đã sao chép link sản phẩm', 'ok');
      } catch (_) {
        window.prompt('Sao chép link sản phẩm:', product.product_url);
      }
      return;
    }
    if (action === 'edit') {
      businessProductModal(product, reload);
      return;
    }
    if (action === 'toggle') {
      button.disabled = true;
      try {
        const status = product.status === 'active' ? 'paused' : 'active';
        await api(`/api/business/products/${product.id}`, {
          method: 'PUT',
          body: businessProductPayload(product, status),
        });
        toast(status === 'active' ? 'Đã kích hoạt sản phẩm' : 'Đã tạm dừng sản phẩm', 'ok');
        await reload();
      } catch (error) {
        toast(error.message, 'err');
        button.disabled = false;
      }
      return;
    }
    if (action === 'delete') {
      if (!confirm(`Xóa sản phẩm “${product.name}” khỏi danh mục?`)) return;
      button.disabled = true;
      try {
        await api(`/api/business/products/${product.id}`, { method: 'DELETE' });
        toast('Đã xóa sản phẩm', 'ok');
        await reload();
      } catch (error) {
        toast(error.message, 'err');
        button.disabled = false;
      }
    }
  }));
}

function businessProductModal(product, reload) {
  const editing = !!product;
  const value = (key, fallback = '') => esc(product?.[key] ?? fallback);
  const platforms = [...PLATFORMS, 'Website'];
  const m = modal(`<h2>${editing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
    <p class="muted" style="margin-bottom:14px">Đường dẫn này sẽ được lưu trong danh mục sản phẩm và có thể dùng lại cho booking hoặc chương trình hoa hồng bán hàng.</p>
    <div class="field"><label>Tên sản phẩm *</label><input id="prf-name" maxlength="160" value="${value('name')}" placeholder="Ví dụ: Serum Vitamin C 30ml"></div>
    <div class="field"><label>Link sản phẩm *</label><input id="prf-url" type="url" maxlength="2000" value="${value('product_url')}" placeholder="https://..."></div>
    <div class="grid product-form-grid">
      <div class="field"><label>Nền tảng</label><input id="prf-platform" list="prf-platforms" maxlength="80" value="${value('platform')}" placeholder="Shopee, Website…"><datalist id="prf-platforms">${platforms.map(platform => `<option value="${platform}">`).join('')}</datalist></div>
      <div class="field"><label>SKU / Mã sản phẩm</label><input id="prf-sku" maxlength="80" value="${value('sku')}"></div>
      <div class="field"><label>Giá bán (đ)</label><input id="prf-price" type="number" min="0" step="1000" value="${value('price', 0)}"></div>
      <div class="field"><label>Hoa hồng dự kiến (%)</label><input id="prf-rate" type="number" min="0" max="100" step="0.01" value="${value('commission_rate', 0)}"></div>
      <div class="field"><label>Trạng thái</label><select id="prf-status"><option value="active" ${product?.status !== 'paused' ? 'selected' : ''}>Đang hoạt động</option><option value="paused" ${product?.status === 'paused' ? 'selected' : ''}>Tạm dừng</option></select></div>
      <label class="product-affiliate-check"><input id="prf-affiliate" type="checkbox" ${product?.affiliate_enabled === 0 ? '' : 'checked'}> Cho phép KOC nhận hoa hồng bán hàng</label>
    </div>
    <div class="field"><label>Link ảnh sản phẩm</label><input id="prf-image" type="url" maxlength="2000" value="${value('image_url')}" placeholder="https://..."></div>
    <div class="field"><label>Ghi chú</label><textarea id="prf-notes" maxlength="1000" rows="3" placeholder="Biến thể, chính sách bán hàng, thông tin cần lưu ý…">${value('notes')}</textarea></div>
    <button class="btn primary" id="prf-save">${editing ? 'Lưu thay đổi' : 'Thêm vào danh mục'}</button>
    <button class="btn ghost" id="prf-cancel" style="margin-top:8px">Hủy</button>`);

  m.querySelector('#prf-cancel').addEventListener('click', closeModal);
  m.querySelector('#prf-save').addEventListener('click', async () => {
    const name = m.querySelector('#prf-name').value.trim();
    const productUrl = m.querySelector('#prf-url').value.trim();
    if (name.length < 2) return toast('Tên sản phẩm tối thiểu 2 ký tự', 'err');
    try {
      const parsedUrl = new URL(productUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch (_) {
      return toast('Nhập link sản phẩm http/https hợp lệ', 'err');
    }
    const payload = {
      name,
      product_url: productUrl,
      platform: m.querySelector('#prf-platform').value.trim(),
      sku: m.querySelector('#prf-sku').value.trim(),
      price: Number(m.querySelector('#prf-price').value || 0),
      commission_rate: Number(m.querySelector('#prf-rate').value || 0),
      status: m.querySelector('#prf-status').value,
      affiliate_enabled: m.querySelector('#prf-affiliate').checked,
      image_url: m.querySelector('#prf-image').value.trim(),
      notes: m.querySelector('#prf-notes').value.trim(),
    };
    const button = m.querySelector('#prf-save');
    button.disabled = true;
    button.textContent = 'Đang lưu…';
    try {
      if (editing) {
        await api(`/api/business/products/${product.id}`, { method: 'PUT', body: payload });
      } else {
        await post('/api/business/products', payload);
      }
      toast(editing ? 'Đã cập nhật sản phẩm' : 'Đã thêm sản phẩm', 'ok');
      closeModal();
      await reload();
    } catch (error) {
      toast(error.message, 'err');
      button.disabled = false;
      button.textContent = editing ? 'Lưu thay đổi' : 'Thêm vào danh mục';
    }
  });
}

async function campaigns(el) {
  const r = await api('/api/campaigns');
  const cfg = state.config;
  el.innerHTML = `<div class="between"><h1>Chiến dịch lớn (NetViet điều phối)</h1><button class="btn primary sm" id="c-new">+ Tạo yêu cầu</button></div>
    <div class="table-wrap" style="margin-top:16px">${r.campaigns.length?`<table><thead><tr><th>Thời gian</th><th>Ngân sách</th><th>SL KOC</th><th>Hạng</th><th>Ngành</th><th>Trạng thái</th><th>KOC đã gán</th></tr></thead><tbody>
      ${r.campaigns.map(c=>{ let assigned=[]; try{assigned=JSON.parse(c.assigned||'[]');}catch(e){} return `<tr><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(c.created_at)}</td><td class="money">${money(c.budget)}</td><td>${c.qty}</td><td>${tierBadge(c.tier)}</td><td>${esc(c.category)}</td><td>${statusChip(c.status)}</td>
      <td>${assigned.length?assigned.map(k=>`<span class="chip b" style="margin:2px">${esc(k.name)}</span>`).join(''):'<span class="muted">Chưa gán</span>'}</td></tr>`; }).join('')}
    </tbody></table>`:empty('📣','Chưa có chiến dịch. NetViet sẽ phân bổ KOC cho bạn.')}</div>`;
  document.getElementById('c-new').addEventListener('click', () => {
    const m = modal(`<h2>Yêu cầu chiến dịch lớn</h2>
      <div class="field"><label>Ngân sách (đ)</label><input id="cf-budget" type="number"></div>
      <div class="field"><label>Số lượng KOC</label><input id="cf-qty" type="number" value="5"></div>
      <div class="field"><label>Hạng KOC</label><select id="cf-tier">${cfg.tiers.map(t=>`<option>${t.name}</option>`).join('')}</select></div>
      <div class="field"><label>Ngành hàng</label><select id="cf-cat">${cfg.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Ghi chú</label><textarea id="cf-note" rows="2"></textarea></div>
      <button class="btn primary" id="cf-go">Gửi cho NetViet</button>
      <button class="btn ghost" id="cf-cancel" style="margin-top:8px">Hủy</button>`);
    m.querySelector('#cf-cancel').addEventListener('click', closeModal);
    m.querySelector('#cf-go').addEventListener('click', async () => {
      const budget = Number(m.querySelector('#cf-budget').value);
      const qty = Number(m.querySelector('#cf-qty').value);
      if (!(budget > 0)) return toast('Ngân sách phải là số dương','err');
      if (!(qty > 0) || !Number.isInteger(qty)) return toast('Số lượng KOC phải là số nguyên dương','err');
      try { await post('/api/campaign', { budget, qty, tier: m.querySelector('#cf-tier').value, category: m.querySelector('#cf-cat').value, note: m.querySelector('#cf-note').value.trim() }); toast('Đã gửi yêu cầu','ok'); closeModal(); campaigns(el); }
      catch (e) { toast(e.message,'err'); }
    });
  });
}

async function report(el) {
  const r = await api('/api/business/report');
  const t = r.totals;
  el.innerHTML = `<h1>Báo cáo hiệu quả & đối soát</h1>
    <div class="stat-cards" style="margin:16px 0">
      ${stat('Doanh số tiếp thị liên kết', money(t.gmv))}${stat('Lượt nhấp', num(t.clicks))}${stat('Đơn hàng', num(t.orders))}${stat('Hiệu quả chi tiêu', ((t.commission+t.spend)>0?(t.gmv/(t.commission+t.spend)):0).toFixed(2)+' lần')}
    </div>
    <div class="card" style="margin-bottom:16px"><h3>Đối soát chi phí — tách bạch 3 khoản</h3>
      <div class="tint-box" style="margin-top:10px">
        <div class="between"><span>① Phí quảng cáo cố định</span><b class="money">${money(t.spend)}</b></div>
        <div class="between"><span>② Hoa hồng KOC (doanh số × % chiết khấu)</span><b class="money">${money(t.commission)}</b></div>
        <div class="between"><span>③ Phí nền tảng 1% (DN trả thêm)</span><b class="money">${money(t.platformFee)}</b></div>
        <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><span><b>DN thanh toán</b></span><b class="money" style="color:var(--primary)">${money(t.payable)}</b></div>
      </div></div>
    <div class="table-wrap"><table><thead><tr><th>Mã</th><th>Thời gian</th><th>KOC</th><th>Hình thức</th><th>Chi phí quảng cáo</th><th>Doanh số</th><th>Đơn</th><th>Hoa hồng</th><th>Phí 1%</th><th>Trạng thái</th></tr></thead><tbody>
      ${r.rows.map(x=>`<tr><td>${esc(x.code)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(x.created_at)}</td><td>${esc(x.kocname)}</td><td><span class="chip n">${btLabel(x.booking_type,x.content_type)}</span></td><td class="money">${money(x.price)}</td>
        <td class="money">${money(x.gmv||0)}</td><td>${num(x.orders||0)}</td><td class="money">${money(x.commission||0)}</td><td class="money">${money(x.platform_fee||0)}</td><td>${statusChip(x.status)}</td></tr>`).join('')}
    </tbody></table></div>
    <button class="btn navy sm" id="r-invoice" style="margin-top:16px;width:auto">🧾 Xuất hoá đơn phí dịch vụ</button>`;
  document.getElementById('r-invoice').addEventListener('click', () => {
    modal(`<h2>Hoá đơn phí dịch vụ</h2><div class="tint-box">
      <div class="between"><span>① Phí quảng cáo cố định</span><b class="money">${money(t.spend)}</b></div>
      <div class="between"><span>Phí dịch vụ QC (5%)</span><b class="money">${money(t.fee)}</b></div>
      <div class="between"><span>② Hoa hồng KOC</span><b class="money">${money(t.commission)}</b></div>
      <div class="between"><span>③ Phí nền tảng affiliate (1%)</span><b class="money">${money(t.platformFee)}</b></div>
      <div class="between" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px"><span><b>Tổng DN thanh toán</b></span><b class="money">${money(t.payable)}</b></div>
    </div><button class="btn primary" onclick="document.getElementById('modal-root').innerHTML=''" style="margin-top:14px">Đóng</button>`);
  });
}
function btLabel(t,contentType){ return t==='ad'||!t ? (contentType==='advertising'?'Quảng cáo':'Đánh giá sản phẩm') : ({affiliate:'Tiếp thị liên kết',combo:'Gói kết hợp',kol:'KOL'})[t]||t; }

async function kolPage(el) {
  const [{ kols }, reqs] = await Promise.all([api('/api/kols'), api('/api/kol/requests')]);
  el.innerHTML = `<div class="between"><h1>KOL / Nghệ sĩ</h1>
    <button class="btn sm" id="k-quote" style="background:#B91C1C;color:#fff">${icon('quoteLead','btn-icon')} Liên hệ nhận báo giá trực tiếp</button></div>
    <p class="muted" style="margin:8px 0 16px">Giá KOL thường thoả thuận — gửi yêu cầu báo giá, NetViet duyệt & phản hồi. Phân khúc cao cấp có duyệt riêng.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
      ${kols.map(k=>`<div class="card">
        <div class="row"><img class="avatar" src="${esc(k.avatar)}"><div><div class="row"><b>${esc(k.name)}</b>${k.premium?'<span class="chip r">Cao cấp</span>':''}</div>
          <div class="muted" style="font-size:12px">${esc(k.field)} · ${esc(k.fanbase)}</div></div></div>
        <div class="tint-box" style="margin:10px 0;font-size:13px">${k.price_hidden?'Giá: <b>Thoả thuận</b>':'Giá tham khảo: <b class="money">'+money(k.ref_price)+'</b>'}</div>
        <button class="btn primary sm" data-kol="${k.id}" style="width:100%">Gửi yêu cầu báo giá</button>
      </div>`).join('')}
    </div>
    <div class="card" style="margin-top:20px"><h3>Yêu cầu KOL đã gửi</h3>
      <div class="table-wrap" style="margin-top:10px">${reqs.requests.length?`<table><thead><tr><th>KOL</th><th>Thời gian</th><th>Lĩnh vực</th><th>Ngân sách</th><th>Báo giá</th><th>TT</th></tr></thead><tbody>
        ${reqs.requests.map(q=>`<tr><td>${esc(q.kolname)}</td><td class="muted" style="font-size:12px;white-space:nowrap">${fmtDate(q.created_at)}</td><td>${esc(q.field)}</td><td class="money">${money(q.budget)}</td><td class="money">${q.quote?money(q.quote):'—'}</td><td>${kolStatus(q.status)}</td></tr>`).join('')}
      </tbody></table>`:empty(icon('kolRequest','teaser-icon'),'Chưa gửi yêu cầu KOL nào')}</div></div>`;
  el.querySelectorAll('[data-kol]').forEach(b=>b.addEventListener('click',()=>kolRequestModal(b.dataset.kol, el)));
  document.getElementById('k-quote').addEventListener('click', ()=>quoteLeadModal('business-kol'));
}
function kolStatus(s){ return statusChip(({pending:'pending',quoted:'settling',approved:'confirmed',rejected:'rejected'})[s]||s); }

function kolRequestModal(kolId, el) {
  const m = modal(`<h2>Gửi yêu cầu báo giá KOL</h2>
    <div class="field" style="margin-top:12px"><label>Ngân sách dự kiến (đ)</label><input id="kr-budget" type="number" placeholder="đ"></div>
    <div class="field"><label>Brief / yêu cầu</label><textarea id="kr-brief" rows="3" placeholder="Mô tả chiến dịch, thông điệp, thời gian…"></textarea></div>
    <button class="btn primary" id="kr-go">Gửi yêu cầu</button>
    <button class="btn ghost" id="kr-cancel" style="margin-top:8px">Hủy</button>`);
  m.querySelector('#kr-cancel').addEventListener('click', closeModal);
  m.querySelector('#kr-go').addEventListener('click', async ()=>{
    try { await post('/api/kol/request',{ kol_id:kolId, budget:m.querySelector('#kr-budget').value, brief:m.querySelector('#kr-brief').value.trim() });
      toast('Đã gửi yêu cầu · NetViet sẽ báo giá','ok'); closeModal(); kolPage(el); } catch(e){ toast(e.message,'err'); }
  });
}

export function quoteLeadModal(source) {
  const m = modal(`<h2>Liên hệ nhận báo giá trực tiếp</h2>
    <p class="muted" style="margin-bottom:12px">Để lại thông tin — đội ngũ sales NetViet sẽ liên hệ (Zalo / hotline / email).</p>
    <div class="field"><label>Họ tên *</label><input id="ql-name"></div>
    <div class="field"><label>Doanh nghiệp</label><input id="ql-company"></div>
    <div class="field"><label>Số điện thoại *</label><input id="ql-phone"></div>
    <div class="field"><label>Email</label><input id="ql-email"></div>
    <div class="field"><label>Nhu cầu</label><textarea id="ql-need" rows="2"></textarea></div>
    <button class="btn" id="ql-go" style="background:#B91C1C;color:#fff">Gửi yêu cầu</button>
    <button class="btn ghost" id="ql-cancel" style="margin-top:8px">Hủy</button>`);
  m.querySelector('#ql-cancel').addEventListener('click', closeModal);
  m.querySelector('#ql-go').addEventListener('click', async ()=>{
    const name=m.querySelector('#ql-name').value.trim(), phone=m.querySelector('#ql-phone').value.trim();
    if(!name||!phone) return toast('Nhập tên và số điện thoại','err');
    try { await post('/api/lead',{ name, phone, company:m.querySelector('#ql-company').value.trim(),
      email:m.querySelector('#ql-email').value.trim(), need:m.querySelector('#ql-need').value.trim(), source:source||'app' });
      toast('Đã gửi · sales sẽ liên hệ sớm','ok'); closeModal(); } catch(e){ toast(e.message,'err'); }
  });
}

async function optimizeBusinessProfileImage(file, width, height, quality = 0.84) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Vui lòng chọn file ảnh');
  if (file.size > 10 * 1024 * 1024) throw new Error('Ảnh gốc tối đa 10MB');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Không đọc được file ảnh'));
      image.src = objectUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sx = 0, sy = 0, sw = image.naturalWidth, sh = image.naturalHeight;
    if (sourceRatio > targetRatio) {
      sw = image.naturalHeight * targetRatio;
      sx = (image.naturalWidth - sw) / 2;
    } else {
      sh = image.naturalWidth / targetRatio;
      sy = (image.naturalHeight - sh) / 2;
    }
    canvas.getContext('2d').drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function profile(el, editing = false) {
  const r = await api('/api/business/profile');
  const b = r.business;

  if (!editing) {
    el.innerHTML = `<div class="between"><h1>Hồ sơ doanh nghiệp</h1>
      <button class="btn primary sm" id="pf-edit">✏️ Chỉnh sửa</button></div>
      <div class="card" style="padding:0;overflow:hidden;margin:16px 0">
        <div style="height:180px;background:linear-gradient(120deg,var(--navy),var(--info));overflow:hidden">
          ${b.cover ? `<img src="${esc(b.cover)}" style="width:100%;height:100%;object-fit:cover" alt="Ảnh bìa doanh nghiệp">` : ''}
        </div>
        <div style="padding:16px 20px 20px;margin-top:-52px;position:relative">
          <img class="avatar lg" src="${esc(b.avatar||'https://i.pravatar.cc/150?u='+b.id)}" style="border:4px solid #fff;width:96px;height:96px" alt="Logo doanh nghiệp">
          <h2 style="margin-top:10px">${esc(b.name || 'Chưa cập nhật tên doanh nghiệp')}</h2>
          <p class="muted">${esc(b.industry || 'Chưa cập nhật ngành nghề')}</p>
        </div>
      </div>
      <div class="card">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px 28px">
          <div><span class="muted">Người liên hệ</span><p><b>${esc(b.contact || 'Chưa cập nhật')}</b></p></div>
          <div><span class="muted">Email liên hệ</span><p><b>${esc(b.email || 'Chưa cập nhật')}</b></p></div>
          <div><span class="muted">Mã số thuế</span><p><b>${esc(b.tax_code || 'Chưa cập nhật')}</b></p></div>
          <div><span class="muted">Ngành nghề</span><p><b>${esc(b.industry || 'Chưa cập nhật')}</b></p></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <h3>💳 Thông tin thanh toán (chi trả booking)</h3>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px 28px;margin-top:14px">
          <div><span class="muted">Ngân hàng</span><p><b>${esc(b.bank_name || 'Chưa cập nhật')}</b></p></div>
          <div><span class="muted">Số tài khoản</span><p><b>${esc(b.bank_account || 'Chưa cập nhật')}</b></p></div>
          <div><span class="muted">Chủ tài khoản</span><p><b>${esc(b.bank_owner || 'Chưa cập nhật')}</b></p></div>
        </div>
      </div>`;
    el.querySelector('#pf-edit').addEventListener('click', () => profile(el, true));
    return;
  }

  let avatarSource = b.avatar || '';
  let coverSource = b.cover || '';
  el.innerHTML = `<div class="between"><h1>Chỉnh sửa hồ sơ doanh nghiệp</h1>
      <button class="btn ghost sm" id="pf-cancel">Hủy</button></div>
    <div class="image-editor" style="margin-top:16px">
      <div class="cover-upload-preview" id="pf-cover-preview">${coverSource ? `<img src="${esc(coverSource)}" alt="Xem trước ảnh bìa">` : '<span>Ảnh bìa tỷ lệ 8:3</span>'}</div>
      <div class="avatar-upload-row">
        <div class="avatar-upload-preview" id="pf-avatar-preview">${avatarSource ? `<img src="${esc(avatarSource)}" alt="Xem trước logo">` : '🏢'}</div>
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
        <div class="field"><label>Tên doanh nghiệp *</label><input id="pf-name" value="${esc(b.name||'')}"></div>
        <div class="field"><label>Người liên hệ</label><input id="pf-contact" value="${esc(b.contact||'')}"></div>
        <div class="field"><label>Email liên hệ</label><input id="pf-email" type="email" value="${esc(b.email||'')}"></div>
        <div class="field"><label>Ngành nghề</label><input id="pf-industry" value="${esc(b.industry||'')}" placeholder="VD: Mỹ phẩm, Bán lẻ…"></div>
        <div class="field"><label>Mã số thuế</label><input id="pf-tax" value="${esc(b.tax_code||'')}"></div>
      </div>
      <h3 style="margin-top:10px;font-size:14px">💳 Thông tin thanh toán (chi trả booking)</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:0 16px">
        <div class="field"><label>Ngân hàng</label><input id="pf-bank-name" value="${esc(b.bank_name||'')}"></div>
        <div class="field"><label>Số tài khoản</label><input id="pf-bank-account" value="${esc(b.bank_account||'')}"></div>
        <div class="field"><label>Chủ tài khoản</label><input id="pf-bank-owner" value="${esc(b.bank_owner||'')}"></div>
      </div>
      <button class="btn primary" id="pf-save" style="margin-top:10px;width:auto">💾 Lưu hồ sơ</button>
    </div>`;

  const processFile = async (input, target, width, height, assign) => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      input.disabled = true;
      const source = await optimizeBusinessProfileImage(file, width, height);
      assign(source);
      target.innerHTML = `<img src="${source}" alt="Xem trước ảnh đã chọn">`;
      toast('Đã tối ưu và xem trước ảnh', 'ok');
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      input.disabled = false;
    }
  };
  el.querySelector('#pf-avatar-file').addEventListener('change', (e) =>
    processFile(e.target, el.querySelector('#pf-avatar-preview'), 480, 480, (value) => avatarSource = value));
  el.querySelector('#pf-cover-file').addEventListener('change', (e) =>
    processFile(e.target, el.querySelector('#pf-cover-preview'), 1200, 450, (value) => coverSource = value));
  el.querySelector('#pf-cancel').addEventListener('click', () => profile(el));

  el.querySelector('#pf-save').addEventListener('click', async () => {
    const name = el.querySelector('#pf-name').value.trim();
    if (!name) return toast('Nhập tên doanh nghiệp','err');
    const email = el.querySelector('#pf-email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Email không hợp lệ','err');
    const btn = el.querySelector('#pf-save'); btn.disabled = true; btn.textContent = 'Đang lưu…';
    try {
      await post('/api/business/profile', {
        name, email, contact: el.querySelector('#pf-contact').value.trim(),
        industry: el.querySelector('#pf-industry').value.trim(), tax_code: el.querySelector('#pf-tax').value.trim(),
        avatar: avatarSource, cover: coverSource,
        bank: { name: el.querySelector('#pf-bank-name').value.trim(), account: el.querySelector('#pf-bank-account').value.trim(), owner: el.querySelector('#pf-bank-owner').value.trim() },
      });
      toast('Đã lưu hồ sơ','ok'); profile(el);
    } catch (e) { toast(e.message,'err'); btn.disabled = false; btn.textContent = '💾 Lưu hồ sơ'; }
  });
}

async function wallet(el) {
  const params = new URLSearchParams(location.search);
  const payOSResult = params.get('payos');
  const orderCode = Number(params.get('orderCode'));
  if (payOSResult && Number.isSafeInteger(orderCode)) {
    try {
      const payment = await post('/api/booking/payment/status', {
        order_code: orderCode,
      });
      if (payment.status === 'paid') {
        toast('Thanh toán hoặc nạp tiền thành công!', 'ok');
      } else if (payment.status === 'cancelled') {
        toast('Bạn đã hủy giao dịch', 'err');
      } else {
        toast('Giao dịch đang được xác nhận', 'ok');
      }
    } catch (e) {
      toast(e.message, 'err');
    } finally {
      history.replaceState({}, '', `${location.pathname}${location.hash}`);
    }
  }

  const w = await api('/api/wallet');
  el.innerHTML = `
    <div class="between" style="margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="icon-heading">${icon('wallet', 'teaser-icon')} Ví doanh nghiệp</h1>
        <p class="muted">Quản lý số dư, tiền nạp, khoản đang được đảm bảo và lịch sử giao dịch</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn primary" id="w-deposit-payos">💳 Nạp tiền trực tuyến</button>
        <button class="btn secondary" id="w-deposit-demo">⚡ Nạp demo</button>
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
        <div class="muted" style="font-size:11px;margin-top:4px">Tiền giữ an toàn chờ KOC hoàn thành bài đăng</div>
      </div>
    </div>

    <div class="card" style="padding:16px">
      <b>📜 Lịch sử thanh toán và nạp tiền</b>
      <div style="margin-top:12px;overflow-x:auto">
        ${(w.payments || []).length ? `
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
              ${w.payments.map(p => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px"><b>#${esc(p.order_code)}</b></td>
                  <td style="padding:8px">${esc(p.booking_code || (p.booking_id === 'wallet_topup' ? 'Nạp tiền ví' : p.booking_id || '-'))}</td>
                  <td style="padding:8px"><span class="chip ${p.purpose === 'deposit' ? 'g' : p.purpose === 'escrow' ? 'b' : 'w'}">${p.purpose === 'deposit' ? 'Nạp tiền' : p.purpose === 'escrow' ? 'Khoản đảm bảo' : 'Thanh toán'}</span></td>
                  <td style="padding:8px"><span class="chip ghost">${p.provider === 'demo' ? '⚡ Thử nghiệm' : '🏦 Trực tuyến'}</span></td>
                  <td style="padding:8px"><b class="money">${money(p.amount)}</b></td>
                  <td style="padding:8px">${p.status === 'paid' ? '<span class="chip g">✅ Thành công</span>' : p.status === 'pending' || p.status === 'creating' ? '<span class="chip w">⏳ Chờ thanh toán</span>' : '<span class="chip r">Thất bại</span>'}</td>
                  <td style="padding:8px;font-size:12px" class="muted">${new Date(p.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : empty('', 'Chưa có lịch sử giao dịch thanh toán nào')}
      </div>
    </div>
  `;

  el.querySelector('#w-deposit-payos').addEventListener('click', () => depositModal('payos', el));
  el.querySelector('#w-deposit-demo').addEventListener('click', () => depositModal('demo', el));
}

function depositModal(mode, el) {
  const isPayOS = mode === 'payos';
  const title = isPayOS ? 'Nạp tiền trực tuyến' : 'Nạp tiền thử nghiệm';
  const desc = isPayOS
    ? 'Thanh toán nhanh bằng mã QR ngân hàng.'
    : 'Nạp tiền mô phỏng thử nghiệm ngay tức thì vào ví doanh nghiệp.';
  const m = modal(`
    <h2>${title}</h2>
    <p class="muted" style="margin-bottom:12px">${desc}</p>
    <div class="field">
      <label>Chọn mốc số tiền hoặc nhập số tiền khác</label>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:10px">
        <button class="btn ghost sm preset-btn" data-val="500000">500.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="1000000">1.000.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="2000000">2.000.000đ</button>
        <button class="btn ghost sm preset-btn" data-val="5000000">5.000.000đ</button>
      </div>
      <input id="dep-amt" type="number" placeholder="Nhập số tiền (tối thiểu 10.000đ)" value="500000" min="10000" step="10000">
    </div>
    <button class="btn ${isPayOS ? 'primary' : 'ok'}" id="dep-go" style="width:100%;margin-top:8px">${isPayOS ? '💳 Mở trang thanh toán' : '⚡ Xác nhận nạp thử'}</button>
    <button class="btn ghost" id="dep-cancel" style="width:100%;margin-top:6px">Hủy</button>
  `);

  m.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      m.querySelector('#dep-amt').value = btn.dataset.val;
    });
  });

  m.querySelector('#dep-cancel').addEventListener('click', closeModal);

  m.querySelector('#dep-go').addEventListener('click', async () => {
    const amount = Number(m.querySelector('#dep-amt').value);
    if (!amount || amount < 10000) {
      toast('Số tiền nạp tối thiểu là 10.000đ', 'err');
      return;
    }
    const goBtn = m.querySelector('#dep-go');
    goBtn.disabled = true;
    try {
      const res = await post('/api/wallet/deposit', { amount, mode });
      closeModal();
      if (res.mode === 'payos' && res.checkoutUrl) {
        toast('Đang mở trang thanh toán...', 'ok');
        window.location.href = res.checkoutUrl;
      } else {
        toast(res.message || 'Nạp tiền demo thành công', 'ok');
        await wallet(el);
      }
    } catch (e) {
      toast(e.message, 'err');
      goBtn.disabled = false;
    }
  });
}
