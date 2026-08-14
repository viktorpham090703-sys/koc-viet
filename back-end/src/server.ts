import 'dotenv/config'
import { createApp, initializeDatabase } from './app.js'
import { loadConfig } from './config/env.js'

async function start() {
  const config = loadConfig()
  const { app, pool, environment } = createApp(config)

  try {
    await pool.query('SELECT 1')
    await initializeDatabase(environment)
  } catch (error) {
    await pool.end()
    console.error('Unable to initialize PostgreSQL. Check DATABASE_URL and database permissions.', error)
    process.exitCode = 1
    return
  }

  const server = app.listen(config.port, () => {
    console.log(`Express API listening on http://localhost:${config.port}`)
  })

  async function shutdown(signal: string) {
    console.log(`${signal}: shutting down`)
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

start().catch(async (error) => {
  console.error('Backend startup failed.', error)
  process.exitCode = 1
})
