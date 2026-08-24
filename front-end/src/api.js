// Remove tokens left by older builds. Authentication now uses a SameSite,
// HttpOnly session cookie that JavaScript cannot read or exfiltrate.
localStorage.removeItem('kv_token');

export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers,
    credentials: 'same-origin',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const error = new Error(data.error || 'Lỗi máy chủ (' + res.status + ')');
    Object.assign(error, data);
    throw error;
  }
  return data;
}

export const get = (p) => api(p);
export const post = (p, body) => api(p, { method: 'POST', body });
