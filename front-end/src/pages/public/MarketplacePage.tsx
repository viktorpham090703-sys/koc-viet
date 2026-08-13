import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, Loading, Empty } from '../../components/AsyncState'
import { useApi } from '../../hooks/useApi'
import type { Koc } from '../../types'

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
export function MarketplacePage() {
  const [query, setQuery] = useState('')
  const url = useMemo(() => `/api/kocs?page=1&per=48&q=${encodeURIComponent(query)}`, [query])
  const { data, loading, error } = useApi<{ kocs: Koc[] }>(url)
  return <><PublicHeader /><main className="content"><div className="between"><div><h1>Khám phá KOC</h1><p className="muted">Tìm đối tác phù hợp cho chiến dịch của bạn.</p></div><input placeholder="Tìm tên, lĩnh vực…" value={query} onChange={e=>setQuery(e.target.value)} /></div>
    {loading ? <Loading /> : error ? <ErrorState error={error} /> : !data?.kocs.length ? <Empty /> : <div className="koc-grid">{data.kocs.map(koc => <Link to={`/koc/${koc.id}`} className="card koc-card" key={koc.id}><img src={koc.avatar || 'https://placehold.co/320x320?text=KOC'} alt={koc.name}/><h3>{koc.name}</h3><div><span className={`tier-badge tier-${koc.tier}`}>{koc.tier}</span></div><p className="muted">{koc.province} · {Number(koc.followers).toLocaleString('vi-VN')} followers</p><p>{koc.categories?.join(' · ')}</p><b>{koc.prices?.[0] ? `Từ ${money(koc.prices[0].price)}` : 'Liên hệ'}</b></Link>)}</div>}
  </main></>
}
export function PublicHeader() { return <header className="lp-header"><Link className="logo" to="/">KOC<span> Viet</span></Link><nav><Link to="/explore">KOC Marketplace</Link><Link to="/login">Đăng nhập</Link></nav></header> }
