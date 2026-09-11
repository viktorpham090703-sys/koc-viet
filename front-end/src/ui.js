import { notify } from './notifications.jsx';
import { formatPaymentTime, formatPaymentTimeParts } from './payment-time.js';

// Event timestamps use the same Vietnam timezone and input formats as payments.
export const fmtDateTime = formatPaymentTime;

// Shared UI helpers + components for all 3 portals.
export const money = (n) => (Number(n)||0).toLocaleString('vi-VN') + 'đ';
export const num = (n) => (Number(n)||0).toLocaleString('vi-VN');
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateTimeStack = (value) => {
  const { time, date } = formatPaymentTimeParts(value);
  return date
    ? `<span class="datetime-stack"><span>${esc(time)}</span><span>${esc(date)}</span></span>`
    : esc(time);
};
export const avatarUrl = (value) => String(value || '').trim() || '/default-avatar.svg';
const PW_EYE_OPEN = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>`;
const PW_EYE_CLOSED = `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.1 2.8"/><path d="M6.2 6.2C3.8 7.8 2.5 12 2.5 12s3.5 6 9.5 6c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;

// A <input type="password"> with a show/hide eye button. `attrs` is raw extra
// attribute HTML (id is fixed as the given id) — e.g. autocomplete/minlength/
// placeholder/required. Call bindPasswordToggles() after inserting the markup.
export function passwordInputHtml(id, attrs = '') {
  return `<div style="position:relative"><input id="${esc(id)}" type="password" style="padding-right:44px" ${attrs}>
    <button type="button" class="pw-toggle" data-target="${esc(id)}" aria-label="Hiển thị mật khẩu" aria-pressed="false"
      style="position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;padding:0;border:0;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center">${PW_EYE_CLOSED}</button></div>`;
}

export function bindPasswordToggles(container) {
  (container || document).querySelectorAll('.pw-toggle').forEach(button => {
    if (button.dataset.pwBound) return;
    button.dataset.pwBound = '1';
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      button.innerHTML = visible ? PW_EYE_CLOSED : PW_EYE_OPEN;
      button.setAttribute('aria-pressed', String(!visible));
      input.focus();
    });
  });
}

export function provinceOptions(provinces = [], current = '') {
  const values = [...new Set([...(provinces || []), current].map(value => String(value || '').trim()).filter(Boolean))];
  return values.map(value => `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(value)}</option>`).join('');
}
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
  active:    ['Hoạt động','g'],
  locked:    ['Đã khóa','r'],
  paused:    ['Tạm dừng','n'],
  leader_ok: ['Trưởng nhóm đã duyệt','b'],
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
  funded:    ['Đã ký quỹ','b'],
  coordinating: ['Đang tuyển chọn','b'],
  invited: ['Chờ KOC xác nhận','w'],
  accepted: ['KOC đã nhận việc','b'],
  declined: ['KOC từ chối','r'],
  submitted: ['Chờ doanh nghiệp duyệt','w'],
  approved: ['Doanh nghiệp đã duyệt','g'],
  in_progress: ['Đang nghiệm thu','w'],
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
  return notify(msg, type);
}

// Add a subtle shake animation to error toasts for better visual feedback.
export function toastError(msg) {
  return notify(msg, 'error');
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

const SKELETON_PRESETS = {
  home: 'dashboard', dashboard: 'dashboard', report: 'report', tiers: 'report',
  bookings: 'cards', orders: 'table', allbookings: 'table', content: 'cards',
  affiliate: 'table', notifications: 'notifications', businesses: 'table',
  complaints: 'table', contracts: 'table', campaigns: 'table', settle: 'table',
  kol: 'table', leads: 'table', queue: 'cards', aiclone: 'workflow',
  'aiclone-booking': 'workflow', find: 'grid', products: 'grid', wallet: 'wallet',
  profile: 'profile',
};

const skLine = (width = 'w-75', height = '') =>
  `<div class="nv-skeleton sk-line ${width}"${height ? ` style="height:${height}"` : ''}></div>`;

function skeletonHeading(withAction = true) {
  return `<div class="sk-page-heading"><div>${skLine('w-50', '26px')}${skLine('w-75')}</div>${withAction ? skLine('w-25', '38px') : ''}</div>`;
}

function skeletonCards(count = 5) {
  return `<div class="sk-list">${Array.from({ length: count }, () => `<div class="sk-card sk-list-card"><div class="nv-skeleton sk-circle sm"></div><div class="sk-grow">${skLine('w-75', '16px')}${skLine('w-50')}</div>${skLine('w-25', '28px')}</div>`).join('')}</div>`;
}

function skeletonDataTable(rows = 6, columns = 5) {
  const cells = () => Array.from({ length: columns }, (_, i) => `<div>${skLine(i === 0 ? 'w-75' : 'w-50')}</div>`).join('');
  return `<div class="sk-data-table"><div class="sk-data-row sk-data-head">${cells()}</div>${Array.from({ length: rows }, () => `<div class="sk-data-row">${cells()}</div>`).join('')}</div>`;
}

/** Route-aware loading state used by all authenticated portals. */
export function skeletonPage(page = 'dashboard') {
  const preset = SKELETON_PRESETS[page] || 'table';
  if (preset === 'dashboard') return `<div class="sk-page" aria-hidden="true">${skeletonHeading(false)}${skeletonStatCards(4)}<div class="sk-dashboard-panels"><div class="sk-card">${skLine('w-50','20px')}${skeletonCards(3)}</div><div class="sk-card">${skLine('w-50','20px')}${skeletonCards(3)}</div></div></div>`;
  if (preset === 'report') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}${skeletonStatCards(4)}<div class="sk-dashboard-panels"><div class="sk-card sk-chart">${skLine('w-50','20px')}<div class="nv-skeleton sk-chart-area"></div></div><div class="sk-card">${skLine('w-50','20px')}${skeletonCards(4)}</div></div></div>`;
  if (preset === 'grid') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}<div class="sk-toolbar">${skLine('w-50','38px')}${skLine('w-25','38px')}</div>${skeletonKocGrid(6)}</div>`;
  if (preset === 'cards' || preset === 'notifications') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}${preset === 'cards' ? `<div class="sk-tabs">${skLine('w-25','34px')}${skLine('w-25','34px')}${skLine('w-25','34px')}</div>` : ''}${skeletonCards(preset === 'notifications' ? 7 : 5)}</div>`;
  if (preset === 'wallet') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}<div class="sk-wallet-summary"><div class="sk-card">${skLine('w-50')}${skLine('w-75','30px')}</div><div class="sk-card">${skLine('w-50')}${skLine('w-75','30px')}</div></div><div class="sk-card">${skLine('w-25','20px')}${skeletonCards(5)}</div></div>`;
  if (preset === 'profile') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}<div class="sk-profile"><div class="sk-card sk-profile-aside"><div class="nv-skeleton sk-circle lg"></div>${skLine('w-75','20px')}${skLine('w-50')}</div><div class="sk-card sk-form-grid">${Array.from({length: 8}, () => `<div>${skLine('w-50')}${skLine('w-100','40px')}</div>`).join('')}</div></div></div>`;
  if (preset === 'workflow') return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}<div class="sk-workflow"><div class="sk-card">${skLine('w-50','20px')}<div class="sk-toolbar">${skLine('w-50','38px')}${skLine('w-25','38px')}</div>${skeletonCards(5)}</div><div class="sk-card sk-form-grid">${Array.from({length: 7}, () => `<div>${skLine('w-50')}${skLine('w-100','40px')}</div>`).join('')}</div></div></div>`;
  return `<div class="sk-page" aria-hidden="true">${skeletonHeading()}<div class="sk-toolbar">${skLine('w-50','38px')}${skLine('w-25','38px')}</div>${skeletonDataTable()}</div>`;
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

function mountModalShell(dialog) {
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.append(...dialog.childNodes);
  const header = document.createElement('header');
  header.className = 'modal-header';
  const originalTitle = body.querySelector('h2');
  // The profile card uses the heading as part of its image hero; retain that
  // identity in the body while adding the fixed accessible title above it.
  const title = originalTitle && dialog.classList.contains('business-koc-profile-modal')
    ? originalTitle.cloneNode(true)
    : originalTitle || document.createElement('h2');
  if (!title.textContent.trim()) title.textContent = body.querySelector('img')?.alt || 'Chi tiết';
  if (!title.id) title.id = 'modal-title';
  title.classList.add('modal-title');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', title.id);

  // Reuse dismiss controls so callers keep their cleanup and back-navigation handlers.
  const dismiss = body.querySelector('[data-modal-dismiss], .business-koc-profile-close');
  const keepCancel = dismiss && /^(Hủy|Huỷ)$/.test(dismiss.textContent.trim());
  const close = dismiss && !keepCancel ? dismiss : document.createElement('button');
  if (!dismiss) close.addEventListener('click', closeModal);
  else if (keepCancel) close.addEventListener('click', () => dismiss.click());
  close.classList.add('modal-close');
  close.removeAttribute('style');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Đóng');
  close.title = 'Đóng';
  header.append(title, close);
  dialog.append(header, body);
}

export function modal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
  // Preserve the table headings when narrow dialogs stack each record vertically.
  root.querySelectorAll('table').forEach(table => {
    const headings = table.tHead?.rows;
    if (headings?.length !== 1 || [...headings[0].cells].some(cell => cell.colSpan !== 1)) return;
    const labels = [...headings[0].cells].map(cell => cell.textContent.trim() || 'Thao tác');
    table.classList.add('modal-data-table');
    [...table.tBodies].forEach(body => [...body.rows].forEach(row => {
      if (row.cells.length === 1 && row.cells[0].colSpan > 1) {
        row.classList.add('modal-table-empty');
        return;
      }
      [...row.cells].forEach((cell, index) => { cell.dataset.label = labels[index] || 'Thao tác'; });
    }));
  });
  mountModalShell(root.querySelector('.modal'));
  return root.querySelector('.modal');
}
export function modalClose() { closeModal(); }
export function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

export function confirmDialog(message, options = {}) {
  return decisionDialog({
    title: options.title || 'Xác nhận thao tác',
    message,
    confirmText: options.confirmText || 'Xác nhận',
    cancelText: options.cancelText || 'Để sau',
    tone: options.tone || 'primary',
  });
}

export function promptDialog(message, options = {}) {
  return decisionDialog({
    title: options.title || 'Nhập thông tin',
    message,
    confirmText: options.confirmText || 'Tiếp tục',
    cancelText: options.cancelText || 'Hủy',
    input: true,
    inputValue: options.value || '',
    placeholder: options.placeholder || 'Nhập nội dung…',
    required: options.required !== false,
  });
}

function decisionDialog(options) {
  const root = document.getElementById('modal-root');
  if (!root) return Promise.resolve(options.input ? null : false);
  return new Promise(resolve => {
    root.innerHTML = `<div class="modal-bg decision-backdrop" role="presentation">
      <section class="modal decision-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title">
        <button class="decision-close" data-modal-dismiss type="button" aria-label="Đóng">×</button>
        <div class="decision-icon" aria-hidden="true">?</div>
        <h2 id="decision-title">${esc(options.title)}</h2>
        <p id="decision-message" class="${options.input && options.required ? 'required-label' : ''}">${esc(options.message).replace(/\n/g, '<br>')}</p>
        ${options.input ? `<textarea class="decision-input" aria-labelledby="decision-message" aria-required="${Boolean(options.required)}" rows="4" placeholder="${esc(options.placeholder)}">${esc(options.inputValue)}</textarea><small class="decision-error" hidden>Vui lòng nhập nội dung trước khi tiếp tục.</small>` : ''}
        <div class="decision-actions">
          <button class="btn ghost decision-cancel" type="button">${esc(options.cancelText)}</button>
          <button class="btn ${options.tone === 'danger' ? 'danger' : 'primary'} decision-confirm" type="button">${esc(options.confirmText)}</button>
        </div>
      </section>
    </div>`;
    mountModalShell(root.querySelector('.modal'));
    const input = root.querySelector('.decision-input');
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown);
      root.innerHTML = '';
      resolve(value);
    };
    const cancel = () => finish(options.input ? null : false);
    const accept = () => {
      if (!options.input) return finish(true);
      const value = input.value.trim();
      if (options.required && !value) {
        root.querySelector('.decision-error').hidden = false;
        input.focus();
        return;
      }
      finish(value);
    };
    const onKeydown = event => {
      if (event.key === 'Escape') cancel();
      if (event.key === 'Enter' && (!options.input || (!event.shiftKey && event.ctrlKey))) accept();
    };
    root.querySelector('.decision-close').addEventListener('click', cancel);
    root.querySelector('.decision-cancel').addEventListener('click', cancel);
    root.querySelector('.decision-confirm').addEventListener('click', accept);
    document.addEventListener('keydown', onKeydown);
    setTimeout(() => (input || root.querySelector('.decision-confirm')).focus(), 0);
  });
}

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

