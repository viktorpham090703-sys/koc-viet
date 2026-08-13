import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const requestId = crypto.randomUUID()
  console.error('API error', requestId, error)
  response.status(500).json({ error: 'Máy chủ gặp lỗi. Vui lòng thử lại sau.', requestId })
}
