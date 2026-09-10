export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function matchesSearch(value, query) {
  const text = normalizeSearch(value);
  return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term => text.includes(term));
}

const queries = new Map();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function searchForm(key, label, placeholder, value = '') {
  return `<form class="list-search-toolbar" data-search-form="${escapeHtml(key)}" role="search">
    <div class="list-search-field"><label for="search-${escapeHtml(key)}">${escapeHtml(label)}</label>
    <input type="search" id="search-${escapeHtml(key)}" name="search" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" maxlength="120"></div>
    <button class="btn primary sm" type="submit">Tìm kiếm</button>
    <button class="btn ghost sm" type="button" data-search-clear>Xóa tìm kiếm</button>
  </form>`;
}

export function bindSearchForm(root, key, onSearch) {
  const form = root.querySelector(`[data-search-form="${key}"]`);
  if (!form) return;
  form.addEventListener('submit', event => { event.preventDefault(); onSearch(form.elements.search.value.trim()); });
  form.querySelector('[data-search-clear]').addEventListener('click', () => {
    form.elements.search.value = '';
    onSearch('');
  });
}

export function mountRemoteSearch(root, {key, label, placeholder, value = '', anchor, meta, onSearch, onPage}) {
  const target = root.querySelector(anchor);
  if (!target) return;
  const toolbar = document.createElement('div');
  toolbar.className = 'list-search';
  toolbar.innerHTML = searchForm(key, label, placeholder, value)
    + (meta ? `<p class="list-search-summary" role="status">${Number(meta.total) || 0} kết quả</p>` : '');
  target.before(toolbar);
  let pager;
  let pending = false;
  const run = async action => {
    if (pending) return;
    pending = true;
    const buttons = [...toolbar.querySelectorAll('button'), ...(pager?.querySelectorAll('button') || [])];
    const disabled = buttons.map(button => button.disabled);
    buttons.forEach(button => button.disabled = true);
    try { await action(); } catch (error) {
      let status = toolbar.querySelector('.list-search-summary');
      if (!status) { status = document.createElement('p'); status.className = 'list-search-summary'; status.setAttribute('role','alert'); toolbar.append(status); }
      status.textContent = error.message || 'Không thể tìm kiếm. Vui lòng thử lại.';
    } finally {
      pending = false;
      buttons.forEach((button, index) => button.disabled = disabled[index]);
    }
  };
  bindSearchForm(toolbar, key, query => run(() => onSearch(query)));
  if (meta?.pages > 1 && onPage) {
    pager = document.createElement('nav');
    pager.className = 'list-search-pager';
    pager.setAttribute('aria-label', 'Phân trang ' + label.toLowerCase());
    pager.innerHTML = `<button class="btn ghost sm" ${meta.page <= 1 ? 'disabled' : ''} data-prev>Trước</button><span>Trang ${meta.page} / ${meta.pages}</span><button class="btn ghost sm" ${meta.page >= meta.pages ? 'disabled' : ''} data-next>Sau</button>`;
    target.after(pager);
    pager.querySelector('[data-prev]').addEventListener('click', () => run(() => onPage(meta.page - 1)));
    pager.querySelector('[data-next]').addEventListener('click', () => run(() => onPage(meta.page + 1)));
  }
}

// Use only for complete lists. Paginated/capped endpoints search on the server.
export function mountListSearch(root, {key, label = 'Tìm kiếm', placeholder = 'Nhập từ khóa…', itemSelector, containerSelector, searchText}) {
  const existing = root.querySelector(`[data-list-search="${key}"]`);
  if (existing) return existing.searchController;
  const items = () => [...root.querySelectorAll(itemSelector)];
  const first = items()[0];
  const container = containerSelector ? root.querySelector(containerSelector) : first?.parentElement;
  if (!container) return {refresh() {}};
  const toolbar = document.createElement('div');
  toolbar.className = 'list-search';
  toolbar.dataset.listSearch = key;
  toolbar.innerHTML = searchForm(key, label, placeholder, queries.get(key) || '') + '<p class="list-search-summary" role="status" aria-live="polite"></p>';
  const anchor = first?.closest('table')?.closest('.table-wrap') || first?.closest('table') || (container === root ? first : container);
  if (anchor?.parentElement) anchor.before(toolbar); else root.prepend(toolbar);
  const noResults = document.createElement('p');
  noResults.className = 'list-search-empty';
  noResults.textContent = 'Không tìm thấy kết quả phù hợp. Thử từ khóa khác hoặc xóa tìm kiếm.';
  noResults.hidden = true;
  toolbar.after(noResults);
  const input = toolbar.querySelector('input');
  const summary = toolbar.querySelector('.list-search-summary');
  function refresh() {
    const all = items();
    let visible = 0;
    for (const item of all) {
      const matched = matchesSearch(searchText ? searchText(item) : item.textContent, input.value);
      item.hidden = !matched;
      if (matched) visible++;
    }
    queries.set(key, input.value);
    summary.textContent = `${visible} / ${all.length} kết quả`;
    noResults.hidden = visible > 0 || !input.value.trim();
    const table = first?.closest('table');
    if (table) table.hidden = visible === 0 && !!input.value.trim();
  }
  input.addEventListener('input', refresh);
  bindSearchForm(toolbar, key, refresh);
  const controller = {refresh};
  toolbar.searchController = controller;
  refresh();
  return controller;
}
