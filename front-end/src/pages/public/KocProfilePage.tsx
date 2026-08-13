import { Link, useParams } from 'react-router-dom'
import { ErrorState, Loading } from '../../components/AsyncState'
import { useApi } from '../../hooks/useApi'
import type { Koc } from '../../types'
import { PublicHeader } from './MarketplacePage'

export function KocProfilePage() {
  const { id } = useParams()
  const { data, loading, error } = useApi<{ koc: Koc }>(`/api/koc/${id}`)
  if (loading) return <Loading />
  if (error || !data) return <ErrorState error={error} />
  const koc = data.koc
  return <><PublicHeader /><main className="content"><Link to="/explore">← Quay lại marketplace</Link><article className="profile-hero card"><img className="avatar xl" src={koc.avatar || 'https://placehold.co/240x240?text=KOC'} /><div><h1>{koc.name}</h1><span className={`tier-badge tier-${koc.tier}`}>{koc.tier}</span><p>{koc.bio}</p><p className="muted">{koc.province} · {Number(koc.followers).toLocaleString('vi-VN')} followers · {koc.engagement}% tương tác</p><div className="row">{koc.categories.map(item=><span className="chip b" key={item}>{item}</span>)}</div></div></article></main></>
}
