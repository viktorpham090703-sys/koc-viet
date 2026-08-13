export class ApiError extends Error {
  constructor(message: string, public status: number, public data: unknown) {
    super(message)
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Lỗi máy chủ (${response.status})`
    throw new ApiError(message, response.status, data)
  }
  return data as T
}

export const get = <T,>(path: string) => api<T>(path)
export const post = <T,>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
export const put = <T,>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const remove = <T,>(path: string) => api<T>(path, { method: 'DELETE' })
