import { useCallback, useEffect, useState } from 'react'
import { get } from '../lib/api'

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await get<T>(url)) } catch (reason) { setError(reason) }
    finally { setLoading(false) }
  }, [url])
  useEffect(() => { void reload() }, [reload])
  return { data, error, loading, reload }
}
