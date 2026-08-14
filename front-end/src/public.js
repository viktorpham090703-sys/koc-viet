import { api, post } from './api.js';
import { money, esc, stars, tierBadge, spinner, empty, pager, toast, modal, closeModal, num, skeletonKocGrid, skeletonStatCards, skeletonTable, avatarUrl } from './ui.js';
import { state } from './app.js';

function pubShell(inner) {
  return `<div class="pub-shell-wrap" style="width:100%;min-height:100vh;background:#fff">
    <div class="topbar-wrap" style="border-bottom:1px solid var(--border);background:#fff">
      <div class="topbar" style="max-width:1400px;margin:0 auto;padding:14px 32px">
        <a href="#/login" class="logo" style="font-size:22px">KOC<span style="color:var(--navy)"> Viet</span></a>
        <div class="row" style="gap:12px">
          <a href="#/explore" class="btn ghost sm">Khám phá KOC</a>
          <a href="#/login" class="btn primary sm">Đăng nhập</a>
        </div>
      </div>
    </div>
    <div class="pub-content-container" style="max-width:1400px;margin:0 auto;padding:28px 32px 80px">
      ${inner}
    </div>
  </div>`;
}

let mp = { page: 1, filters: {} };

export async function renderMarketplacePublic(el) {
  el.innerHTML = pubShell(`<div class="content" style="padding:0">
    <div style="margin-bottom:12px">
      <a href="/marketplace" class="muted" style="font-size:13.5px;display:inline-flex;align-items:center;gap:4px;font-weight:500">‹ Quay lại trang giới thiệu</a>
    </div>
    <h1 style="font-size:28px;margin-bottom:6px">Khám phá KOC</h1>
    <p class="muted" style="margin-bottom:20px;font-size:15px">Tìm KOC theo ngành hàng, tỉnh, hạng, giá và đánh giá.</p>
    <div id="mp-filters"></div><div id="mp-list">${skeletonKocGrid(6)}</div></div>`);
  renderFilters(document.getElementById('mp-filters'), () => loadMp(false));
  loadMp(false);
}

// Reusable marketplace for business portal
export async function renderMarketplaceEmbed(container, onBook) {
  container.innerHTML = `<div id="mp-filters"></div><div id="mp-list">${skeletonKocGrid(6)}</div>`;
  renderFilters(document.getElementById('mp-filters'), () => loadMp(!!onBook, onBook));
  loadMp(!!onBook, onBook);
}

function renderFilters(host, onChange) {
  const cfg = state.config || { categories: [], provinces: [], tiers: [] };
  host.innerHTML = `<div class="filters">
    <div class="field"><label>Tìm tên</label><input id="f-search" placeholder="Tên KOC…"></div>
    <div class="field"><label>Ngành hàng</label><select id="f-cat"><option value="">Tất cả</option>${cfg.categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label>Tỉnh/TP</label><select id="f-prov"><option value="">Tất cả</option>${cfg.provinces.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div>
    <div class="field"><label>Hạng</label><select id="f-tier"><option value="">Tất cả</option>${cfg.tiers.map(t=>`<option>${esc(t.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Giá tối đa</label><input id="f-max" type="number" placeholder="đ"></div>
    <div class="field"><label>Sao ≥</label><select id="f-rating"><option value="">Tất cả</option><option>4</option><option>4.5</option></select></div>
    <button class="btn primary sm" id="f-go">Lọc</button>
  </div>`;
  const go = () => {
    mp.page = 1;
    mp.filters = {
      search: host.querySelector('#f-search').value.trim(),
      category: host.querySelector('#f-cat').value,
      province: host.querySelector('#f-prov').value,
      tier: host.querySelector('#f-tier').value,
      maxPrice: host.querySelector('#f-max').value,
      minRating: host.querySelector('#f-rating').value,
    };
    onChange();
  };
  host.querySelector('#f-go').addEventListener('click', go);
  host.querySelector('#f-search').addEventListener('keydown', e => { if (e.key==='Enter') go(); });
}

async function loadMp(bookMode, onBook) {
  const list = document.getElementById('mp-list');
  list.innerHTML = skeletonKocGrid(6);
  const qs = new URLSearchParams({ page: mp.page });
  Object.entries(mp.filters).forEach(([k,v]) => { if (v) qs.set(k, v); });
  try {
    const r = await api('/api/kocs?' + qs.toString());
    if (!r.kocs.length) { list.innerHTML = empty('🔍', 'Không tìm thấy KOC phù hợp'); return; }
    list.innerHTML = `<div class="grid-fill-260">
      ${r.kocs.map(k => kocCard(k, bookMode)).join('')}</div>` + pager(r.page, r.pages, (p)=>{ mp.page=p; loadMp(bookMode,onBook); });
    list.querySelectorAll('[data-view]').forEach(c => c.addEventListener('click', () => {
      if (bookMode && onBook) onBook(c.dataset.view);
      else location.hash = '#/koc/' + c.dataset.view;
    }));
  } catch (e) { list.innerHTML = empty('⚠️', e.message); }
}

function kocCard(k, bookMode) {
  return `<div class="koc-card" data-view="${k.id}">
    <div class="row"><img class="avatar" src="${esc(avatarUrl(k.avatar))}" alt=""><div style="flex:1">
      <div class="between"><strong>${esc(k.name)}</strong>${tierBadge(k.tier)}</div>
      <div class="muted" style="font-size:12px">📍 ${esc(k.province)} · ${num(k.followers)} follower</div>
    </div></div>
    <div style="margin:10px 0">${(k.categories||[]).slice(0,3).map(c=>`<span class="chip" style="margin-right:4px">${esc(c)}</span>`).join('')}</div>
    <div class="between"><div>${stars(k.rating)}</div><div class="money">từ ${money(k.minPrice)}</div></div>
    <button class="btn ${bookMode?'primary':'ghost'} sm" style="width:100%;margin-top:10px">${bookMode?'Đặt booking':'Xem hồ sơ'}</button>
  </div>`;
}

export async function renderKocProfile(el, id) {
  el.innerHTML = pubShell(`<div class="content">${skeletonStatCards(2) + skeletonTable(3)}</div>`);
  let r;
  try { r = await api('/api/koc/' + id); } catch (e) { el.innerHTML = pubShell(empty('⚠️', e.message)); return; }
  const k = r.koc;
  const content = el.querySelector('.content');
  content.innerHTML = `
    <a href="#/explore" class="muted" style="font-size:13px">‹ Về trang khám phá KOC</a>
    <div class="hero-navy" style="margin-top:10px">
      <div class="row" style="align-items:flex-start">
        <img class="avatar lg" src="${esc(avatarUrl(k.avatar))}" alt="">
        <div style="flex:1">
          <div class="row">${tierBadge(k.tier)} <span class="muted" style="color:#cdd6e4">📍 ${esc(k.province)}</span></div>
          <h1 style="margin:6px 0">${esc(k.name)}</h1>
          <div>${stars(k.rating)} <span style="color:#cdd6e4">(${k.reviews_count} đánh giá) · ${k.completed_bookings} booking hoàn thành</span></div>
        </div>
      </div>
      <p style="opacity:.9;margin-top:10px">${esc(k.bio)}</p>
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        ${(k.socials||[]).map(s=>`<span class="chip on-dark">${esc(s.platform)} ${esc(s.handle)} · ${num(s.followers)}</span>`).join('')}
      </div>
    </div>
    <div class="grid" style="grid-template-columns:1fr;margin-top:16px">
      <div class="card"><h2>Bảng giá niêm yết theo ngành hàng</h2>
        <table style="margin-top:10px"><thead><tr><th>Ngành hàng</th><th>Trạng thái</th><th style="text-align:right">Phí cố định</th></tr></thead><tbody>
        ${(k.prices||[]).map(p=>`<tr><td>${esc(p.category)}</td>
          <td>${k.accepting[p.category]!==false?'<span class="chip g">Đang nhận</span>':'<span class="chip r">Tạm ngưng</span>'}</td>
          <td style="text-align:right" class="money">${money(p.price)}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="card"><h2>Portfolio bài đã làm</h2>
        ${(k.portfolio||[]).length ? `<div class="grid-fill-150">
          ${k.portfolio.map(p=>`<div class="tint-box"><div class="chip b">${esc(p.post_platform||'MXH')}</div>
            <div style="margin-top:6px;font-size:12px">${esc(p.category)}</div>
            <a href="#" class="muted" style="font-size:11px;word-break:break-all">${esc((p.post_link||'').slice(0,40))}…</a></div>`).join('')}</div>`
          : '<p class="muted" style="margin-top:8px">Chưa có bài đăng công khai.</p>'}
      </div>
      <div class="card"><h2>Đánh giá từ doanh nghiệp</h2>
        ${(k.reviews||[]).length ? k.reviews.map(rv=>`<div class="list-item"><div class="between"><strong>${esc(rv.bizname)}</strong>${stars(rv.rating)}</div>
          <div class="muted" style="font-size:12px">${esc(rv.category)}</div><div style="margin-top:4px">${esc(rv.review||'')}</div></div>`).join('')
          : '<p class="muted" style="margin-top:8px">Chưa có đánh giá.</p>'}
      </div>
    </div>
    <div class="card" style="margin-top:16px;text-align:center">
      <p class="muted">Đăng nhập tài khoản doanh nghiệp để đặt booking KOC này.</p>
      <a href="#/login" class="btn primary" style="max-width:240px;margin:10px auto 0">Đăng nhập để đặt booking</a>
    </div>`;
}
