import type { RequestHandler } from 'express'

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: 'Không tìm thấy nội dung bạn yêu cầu' })
}
