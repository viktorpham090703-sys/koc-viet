import { useMemo, useState } from 'react'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { StatusChip } from '../../components/StatusChip'
import { useApi } from '../../hooks/useApi'
import type { UnknownRecord } from '../../types'

interface Props { title: string; endpoint: string; collection: string; columns?: string[] }
const labels: Record<string, string> = {
  name:'Tên', code:'Mã', status:'Trạng thái', price:'Giá', amount:'Số tiền',
  created_at:'Ngày tạo', updated_at:'Cập nhật lúc', deadline:'Hạn hoàn thành',
  category:'Danh mục', email:'Email', note:'Ghi chú', title:'Tiêu đề',
  content_type:'Loại nội dung', post_platform:'Kênh đăng', tracking_code:'Mã giới thiệu',
  platform:'Nền tảng', clicks:'Lượt nhấp', type:'Loại giao dịch', commission_rate:'Tỷ lệ hoa hồng',
  tier:'Hạng', budget:'Ngân sách', qty:'Số lượng', field:'Lĩnh vực', fanbase:'Quy mô người theo dõi',
  ref_price:'Giá tham khảo', province:'Tỉnh, thành', bcode:'Mã đơn', raised_by_role:'Người gửi',
  reason:'Lý do', contract_version:'Phiên bản hợp đồng', contract_signed_at:'Ngày ký',
  kind:'Nội dung thu chi', ref:'Mã tham chiếu', company:'Doanh nghiệp', phone:'Số điện thoại',
  assigned_to:'Người phụ trách', kocname:'KOC', bizname:'Doanh nghiệp', is_read:'Tình trạng đọc',
}
const pretty = (key: string) => labels[key] ?? 'Thông tin'
const value = (key: string, input: unknown) => {
  if (key === 'status' && typeof input === 'string') return <StatusChip status={input}/>
  if (key === 'is_read') return Number(input) ? 'Đã đọc' : 'Chưa đọc'
  if (['price','amount','budget','gmv','balance'].includes(key)) return `${Number(input || 0).toLocaleString('vi-VN')}đ`
  if (key.endsWith('_at') && input) return new Date(Number(input) * 1000).toLocaleString('vi-VN')
  if (input && typeof input === 'object') {
    const summary = Object.values(input).filter(item => ['string','number'].includes(typeof item)).join(', ')
    return summary || 'Có thông tin'
  }
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
  return <><div className="between"><div><h1>{title}</h1><p className="muted">Thông tin mới nhất được cập nhật trực tiếp từ hệ thống.</p></div><div className="row"><input placeholder="Tìm kiếm…" value={filter} onChange={e=>setFilter(e.target.value)}/><button className="btn ghost sm" onClick={()=>void reload()}>Làm mới</button></div></div>
    {loading ? <Loading /> : error ? <ErrorState error={error}/> : !rows.length ? <Empty/> : <div className="table-wrap"><table><thead><tr>{shownColumns.map(c=><th key={c}>{pretty(c)}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={String(row.id ?? index)}>{shownColumns.map(c=><td key={c}>{value(c,row[c])}</td>)}</tr>)}</tbody></table></div>}
  </>
}
