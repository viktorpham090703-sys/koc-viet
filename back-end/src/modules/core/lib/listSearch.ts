export function normalizeSearch(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function matchesSearch(value: unknown, query: unknown): boolean {
  const text = normalizeSearch(value);
  return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term => text.includes(term));
}

// PostgreSQL translate avoids requiring an unaccent extension in deployments.
const accented = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const plain = normalizeSearch(accented);
export function sqlSearch(fields: string[], query: unknown) {
  if (fields.some(field => !/^[a-z_][a-z0-9_.]*$/i.test(field))) throw new Error('Invalid search field');
  const terms = normalizeSearch(String(query ?? '').slice(0, 120)).split(/\s+/).filter(Boolean).slice(0, 12);
  const text = `translate(lower(concat_ws(' ', ${fields.join(', ')})), '${accented}', '${plain}')`;
  return {
    sql: terms.length ? terms.map(() => `${text} LIKE ? ESCAPE '\\'`).join(' AND ') : '1=1',
    bindings: terms.map(term => `%${term.replace(/[\\%_]/g, '\\$&')}%`),
  };
}

export function listPage(params: URLSearchParams, total: number, defaultPer = 10) {
  const per = Math.min(50, Math.max(5, Math.floor(Number(params.get('per'))) || defaultPer));
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get('page'))) || 1));
  return {page, per, total, pages};
}
