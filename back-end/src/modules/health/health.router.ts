import { Router } from 'express'
import type { Pool } from 'pg'

export function createHealthRouter(pool: Pool) {
  const router = Router()
  router.get('/', async (_request, response, next) => {
    try { await pool.query('SELECT 1'); response.json({ ok: true, database: 'postgresql' }) }
    catch (error) { next(error) }
  })
  return router
}
