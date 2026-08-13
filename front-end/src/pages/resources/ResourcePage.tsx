import { useMemo, useState } from 'react'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { StatusChip } from '../../components/StatusChip'
import { useApi } from '../../hooks/useApi'
import type { UnknownRecord } from '../../types'

interface Props { title: string; endpoint: string; collection: string; columns?: string[] }
const pretty = (key: string) => ({ name:'Tên', code:'Mã', status:'Trạng thái', price:'Giá', amount:'Số tiền', created_at:'Ngày tạo', category:'Danh mục', email:'Email', note:'Ghi chú', title:'Tiêu đề' }[key] ?? key.replaceAll('_',' '))
const value = (key: string, input: unknown) => {
  if (key === 'status' && typeof input === 'string') return <StatusChip status={input}/>
  if (['price','amount','budget','gmv','balance'].includes(key)) return `${Number(input || 0).toLocaleString('vi-VN')}đ`
  if (key.endsWith('_at') && input) return new Date(Number(input) * 1000).toLocaleString('vi-VN')
  if (typeof input === 'object') return JSON.stringify(input)
  return String(input ?? '—')
}
export function ResourcePage({ title, endpoint, collection, columns }: Props) {
  const [filter, setFilter] = useState('')
  const { data, loading, error, reload } = useApi<Record<string, unknown>>(endpoint)
  const rows = useMemo(() => {
    const source = data?.[collection]
    if (!Array.isArray(source)) return []
    return (source as UnknownRecord[]).filter(row => JSON.stringify(row).toLowerCase().includes(filter.toLowerCase()))
  }, [data, collection, filter])
  const shownColumns = columns ?? (rows[0] ? Object.keys(rows[0]).filter(k=>!['password','contract_html','contract_signature','license_file'].includes(k)).slice(0, 7) : [])
  return <><div className="between"><div><h1>{title}</h1><p className="muted">Dữ liệu được tải trực tiếp từ API Express/PostgreSQL.</p></div><div className="row"><input placeholder="Tìm kiếm…" value={filter} onChange={e=>setFilter(e.target.value)}/><button className="btn ghost sm" onClick={()=>void reload()}>Làm mới</button></div></div>
    {loading ? <Loading /> : error ? <ErrorState error={error}/> : !rows.length ? <Empty/> : <div className="table-wrap"><table><thead><tr>{shownColumns.map(c=><th key={c}>{pretty(c)}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={String(row.id ?? index)}>{shownColumns.map(c=><td key={c}>{value(c,row[c])}</td>)}</tr>)}</tbody></table></div>}
  </>
}
