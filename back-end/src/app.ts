import compression from 'compression'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { Pool } from 'pg'
import type { AppConfig } from './config/env.js'
import { PostgresD1Adapter } from './database/d1-adapter.js'
import { MemoryKv } from './infrastructure/memory-kv.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFound } from './middleware/not-found.js'
import { createApiRouter } from './modules/api/api.router.js'
import { migrate } from './modules/core/db.js'
import { ensureSeedData } from './modules/core/seed.js'
import { createHealthRouter } from './modules/health/health.router.js'
import path from 'node:path'
import type { ApplicationEnvironment } from './types/environment.js'

export function createApp(config: AppConfig) {
  const app = express()
  const pool = new Pool({ connectionString: config.databaseUrl })
  const environment: ApplicationEnvironment = {
    ...process.env,
    DB: new PostgresD1Adapter(pool),
    KV: new MemoryKv(path.resolve(process.cwd(), '.kv-storage.json')),
  }
  app.disable('x-powered-by')
  app.use(helmet({ crossOriginResourcePolicy: false }))
  app.use(compression())
  app.use(cors({ origin: config.frontendOrigin, credentials: true }))
  app.use(express.raw({ type: '*/*', limit: '25mb' }))
  app.use('/health', createHealthRouter(pool))
  app.use('/api', createApiRouter(environment))
  app.use(notFound)
  app.use(errorHandler)
  return { app, pool, environment }
}

export async function initializeDatabase(environment: ApplicationEnvironment) {
  await migrate(environment)
  await ensureSeedData(environment)
}
