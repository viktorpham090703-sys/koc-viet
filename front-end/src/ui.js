// Shared UI helpers + components for all 3 portals.
export const money = (n) => (Number(n)||0).toLocaleString('vi-VN') + 'đ';
export const num = (n) => (Number(n)||0).toLocaleString('vi-VN');
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const avatarUrl = (value) => String(value || '').trim() || '/default-avatar.svg';
export const fmtDate = (ts) => {
  if (!ts) return '—';
  const num = Number(ts);
  if (!isNaN(num) && num > 0) {
    const d = new Date(num > 1e11 ? num : num * 1000);
    return d.toLocaleDateString('vi-VN');
  }
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
};

export function stars(r) {
  r = Number(r)||0;
  const full = Math.round(r);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5-full)}</span> <span class="muted" style="font-size:12px">${r.toFixed(1)}</span>`;
}

const STATUS = {
  quote_pending: ['Chờ Admin báo giá','w'],
  quote_requested: ['Chờ Admin báo giá','w'],
  quoted: ['Admin đã gửi báo giá · Chờ thanh toán','b'],
  quote_sent: ['Chờ DN xác nhận báo giá','w'],
  quote_grouped: ['Báo giá chung chờ xác nhận','w'],
  payment_grouped: ['Thanh toán chung theo booking','w'],
  payment_pending: ['Chờ doanh nghiệp thanh toán','w'],
  payment_failed: ['Chưa tạo được yêu cầu thanh toán','r'],
  payment_cancelled: ['DN đã hủy thanh toán','r'],
  refund_pending: ['Đang chờ hoàn tiền','w'],
  pending:   ['Chờ xác nhận','w'],
  confirmed: ['Đã xác nhận','b'],
  brief_review: ['NetViet duyệt brief','w'],
  script_drafting: ['Đang soạn kịch bản','w'],
  producing: ['Đang sản xuất','b'],
  video_processing: ['Đang xử lý video','w'],
  pending_review: ['Chờ doanh nghiệp duyệt','w'],
  pending_business_review: ['Chờ doanh nghiệp duyệt bản dựng','w'],
  business_approved: ['Doanh nghiệp đã duyệt · Đã chuyển KOC','b'],
  pending_koc_review: ['Chờ KOC phê duyệt & đăng bài','w'],
  video_approved: ['Video đã duyệt','g'],
  revision_requested: ['Yêu cầu sửa video','r'],
  posted:    ['Đã đăng bài','g'],
  settling:  ['Đang đối soát','w'],
  completed: ['Hoàn thành','g'],
  rejected:  ['Từ chối','r'],
  registered:['Đã đăng ký','b'],
  booked:    ['Đã tạo booking','w'],
  delivered: ['Đã giao video','g'],
  processing:['Đang xử lý','w'],
  settled:   ['Đã đối soát','g'],
  expected:  ['Dự kiến','w'],
  reconciled:['Đã đối soát','b'],
  paid:      ['Đã thanh toán','g'],
  cancelled: ['Đã hủy','r'],
  refunded:  ['Đã hoàn','r'],
  open:      ['Mới tiếp nhận','r'],
  in_review: ['Đang xử lý','b'],
  resolved:  ['Đã xử lý','g'],
  assigned:  ['Đã phân bổ','g'],
};
export function statusChip(s) {
  const [label, cls] = STATUS[s] || [s, 'n'];
  return `<span class="chip ${cls}">${esc(label)}</span>`;
}
export function tierBadge(t) { return `<span class="tier-badge tier-${esc(t)}">${esc(t)}</span>`; }

export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// Add a subtle shake animation to error toasts for better visual feedback.
export function toastError(msg) {
  const el = document.createElement('div');
  el.className = 'toast err nv-anim-shake';
  el.textContent = msg;
  document.getElementById('toast-wrap').appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

export function spinner() { return '<div class="spin"></div>'; }
export function empty(icon, text) { return `<div class="empty"><div class="ico">${icon}</div><div>${esc(text)}</div></div>`; }

export function skeletonStatCards(count = 4) {
  let cards = '';
  for (let i = 0; i < count; i++) {
    cards += `<div class="sk-card">
      <div class="nv-skeleton sk-line w-50"></div>
      <div class="nv-skeleton sk-line w-75" style="height:24px"></div>
    </div>`;
  }
  return `<div class="stat-cards">${cards}</div>`;
}

export function skeletonTable(rows = 5) {
  let r = '';
  for (let i = 0; i < rows; i++) {
    r += `<div class="sk-card" style="padding:14px; margin-bottom:8px">
      <div class="row" style="gap:16px; align-items:center">
        <div class="nv-skeleton sk-circle sm"></div>
        <div class="nv-skeleton sk-line w-50" style="margin:0"></div>
        <div class="nv-skeleton sk-line w-25" style="margin:0; margin-left:auto"></div>
      </div>
    </div>`;
  }
  return `<div class="sk-table-wrap">${r}</div>`;
}

export function skeletonKocGrid(count = 6) {
  let cards = '';
  for (let i = 0; i < count; i++) {
    cards += `<div class="sk-card" style="align-items:center; text-align:center">
      <div class="nv-skeleton sk-circle lg" style="margin-bottom:8px"></div>
      <div class="nv-skeleton sk-line w-75" style="height:18px"></div>
      <div class="nv-skeleton sk-line w-50"></div>
      <div class="nv-skeleton sk-line w-25" style="height:24px; border-radius:12px; margin-top:6px"></div>
    </div>`;
  }
  return `<div class="sk-grid">${cards}</div>`;
}

export function skeletonPortal() {
  return `<div class="sk-portal-layout">
    <div class="sk-sidebar">
      <div class="nv-skeleton sk-line w-75" style="height:28px; margin-bottom:20px"></div>
      ${Array(6).fill('<div class="nv-skeleton sk-line w-100" style="height:32px; border-radius:6px; margin-bottom:10px"></div>').join('')}
    </div>
    <div class="sk-main">
      <div class="sk-topbar">
        <div class="nv-skeleton sk-line w-25" style="height:20px; margin:0"></div>
        <div class="nv-skeleton sk-circle sm"></div>
      </div>
      ${skeletonStatCards(4)}
      <div class="sk-card" style="margin-top:16px">
        <div class="nv-skeleton sk-title"></div>
        ${skeletonTable(4)}
      </div>
    </div>
  </div>`;
}

export function skeletonKocView() {
  return `<div style="padding:16px; display:flex; flex-direction:column; gap:16px">
    <div class="row" style="gap:12px; align-items:center">
      <div class="nv-skeleton sk-circle md"></div>
      <div style="flex:1">
        <div class="nv-skeleton sk-line w-50" style="height:18px"></div>
        <div class="nv-skeleton sk-line w-25"></div>
      </div>
    </div>
    ${skeletonStatCards(2)}
    <div class="sk-card">
      <div class="nv-skeleton sk-title"></div>
      ${skeletonTable(3)}
    </div>
  </div>`;
}

export function modal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  root.querySelector('.modal-bg').addEventListener('click', (e) => { if (e.target.classList.contains('modal-bg')) closeModal(); });
  return root.querySelector('.modal');
}
export function modalClose() { closeModal(); }
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

export function pager(page, pages, onGo) {
  if (pages <= 1) return '';
  let btns = `<button ${page<=1?'disabled':''} data-pg="${page-1}">‹</button>`;
  for (let i = 1; i <= pages; i++) btns += `<button class="${i===page?'active':''}" data-pg="${i}">${i}</button>`;
  btns += `<button ${page>=pages?'disabled':''} data-pg="${page+1}">›</button>`;
  setTimeout(() => {
    document.querySelectorAll('.pager button[data-pg]').forEach(b =>
      b.addEventListener('click', () => onGo(Number(b.dataset.pg))));
  }, 0);
  return `<div class="pager">${btns}</div>`;
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn("navigator.clipboard failed, fallback to execCommand:", err);
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.width = "2em";
    ta.style.height = "2em";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.boxShadow = "none";
    ta.style.background = "transparent";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    console.error("Copy failed:", err);
    return false;
  }
}

