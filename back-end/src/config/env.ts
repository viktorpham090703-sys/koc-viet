export interface AppConfig {
  port: number
  databaseUrl: string
  frontendOrigin: string
  nodeEnv: string
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = source.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL is required')
  const port = Number(source.PORT || 3000)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid')
  return {
    port,
    databaseUrl,
    frontendOrigin: source.FRONTEND_ORIGIN || 'http://localhost:5173',
    nodeEnv: source.NODE_ENV || 'development',
  }
}
