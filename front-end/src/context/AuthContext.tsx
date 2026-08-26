import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get, post } from '../lib/api'
import type { AppConfig, User } from '../types'

interface AuthValue {
  user: User | null
  config: AppConfig
  loading: boolean
  login(email: string, password: string): Promise<User>
  logout(): Promise<void>
  refresh(): Promise<void>
}

const emptyConfig: AppConfig = { tiers: [], categories: [], provinces: [], payoutBanks: [] }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [config, setConfig] = useState<AppConfig>(emptyConfig)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const [configResult, meResult] = await Promise.allSettled([
      get<AppConfig>('/api/config'), get<{ user: User }>('/api/me'),
    ])
    if (configResult.status === 'fulfilled') setConfig(configResult.value)
    setUser(meResult.status === 'fulfilled' ? meResult.value.user : null)
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  const value = useMemo<AuthValue>(() => ({
    user, config, loading, refresh,
    async login(email, password) {
      const result = await post<{ user: User }>('/api/login', { email, password })
      setUser(result.user); return result.user
    },
    async logout() { await post('/api/logout'); setUser(null) },
  }), [user, config, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
