import { ErrorState, Loading } from '../../components/AsyncState'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import type { UnknownRecord } from '../../types'

const labels: Record<string,string> = { total:'Tổng', revenue:'Doanh thu', bookings:'Booking', active:'Đang hoạt động', pending:'Đang chờ', balance:'Số dư', available:'Khả dụng', kocs:'KOC', businesses:'Doanh nghiệp', gmv:'Tổng doanh số' }
export function DashboardPage() {
  const { user } = useAuth()
  const endpoint = user?.role === 'admin' ? '/api/admin/kpi' : user?.role === 'business' ? '/api/business/report' : '/api/koc/dashboard'
  const { data, loading, error } = useApi<UnknownRecord>(endpoint)
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />
  const values = Object.entries(data ?? {}).filter(([,v]) => typeof v === 'number' || typeof v === 'string').slice(0, 8)
  return <><h1>Xin chào, {user?.name}</h1><p className="muted">Tổng quan hoạt động trên KOC Viet</p><div className="stat-cards">{values.map(([key,value])=><div className="stat card" key={key}><span className="muted">{labels[key] ?? key.replaceAll('_',' ')}</span><strong>{typeof value === 'number' ? value.toLocaleString('vi-VN') : String(value)}</strong></div>)}</div></>
}
