import type { Request } from 'express'

export function toWebRequest(request: Request): globalThis.Request {
  const origin = `${request.protocol}://${request.get('host')}`
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
  }
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : request.body
  return new globalThis.Request(new URL(request.originalUrl, origin), {
    method: request.method,
    headers,
    body: body?.length ? body : undefined,
  })
}
