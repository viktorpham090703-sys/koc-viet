import 'dotenv/config'
import { createApp } from './app.js'
import { loadConfig } from './config/env.js'

const config = loadConfig()
const { app, pool } = createApp(config)
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
