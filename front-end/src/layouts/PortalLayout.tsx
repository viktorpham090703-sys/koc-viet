import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

const navigation: Record<Role, Array<[string, string, string]>> = {
  koc: [['/app/home','🏠','Tổng quan'],['/app/bookings','📋','Booking'],['/app/content','🎬','Nội dung'],['/app/affiliate','🔗','Affiliate'],['/app/wallet','💰','Ví'],['/app/aiclone','🤖','AI Clone'],['/app/notifications','🔔','Thông báo'],['/app/profile','👤','Hồ sơ']],
  business: [['/app/dashboard','📊','Tổng quan'],['/app/find','🔎','Tìm KOC'],['/app/orders','📋','Booking'],['/app/products','🛍️','Sản phẩm'],['/app/wallet','💰','Ví'],['/app/campaigns','📣','Chiến dịch'],['/app/kol','⭐','KOL'],['/app/report','📈','Báo cáo'],['/app/profile','🏢','Hồ sơ']],
  admin: [['/app/dashboard','📊','Dashboard'],['/app/businesses','🏢','Doanh nghiệp'],['/app/queue','✅','Duyệt KOC'],['/app/allbookings','📋','Booking'],['/app/complaints','⚠️','Khiếu nại'],['/app/contracts','📜','Hợp đồng'],['/app/campaigns','📣','Chiến dịch'],['/app/settle','💰','Đối soát'],['/app/affiliate','🔗','Affiliate'],['/app/kol','⭐','KOL'],['/app/leads','🎯','Leads'],['/app/aiclone','🤖','AI Clone'],['/app/tiers','🏷️','Khung giá']],
}

export function PortalLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  return <div className="portal">
    <aside className="sidebar">
      <div className="logo">KOC<span> Viet</span></div>
      <nav>{navigation[user.role].map(([to, icon, label]) => <NavLink key={to} to={to} className={({isActive}) => isActive ? 'active' : ''}><span>{icon}</span>{label}</NavLink>)}</nav>
      <button className="btn ghost sm" onClick={async () => { await logout(); navigate('/login') }}>Đăng xuất</button>
    </aside>
    <main className="main"><header className="topbar"><strong>{user.name}</strong><span className="chip b">{user.role}</span></header><section className="content"><Outlet /></section></main>
  </div>
}
