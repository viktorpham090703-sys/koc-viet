import { Navigate, createBrowserRouter } from 'react-router-dom'
import { PortalLayout } from './layouts/PortalLayout'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LoginPage } from './pages/auth/LoginPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { BusinessRegisterPage } from './pages/auth/BusinessRegisterPage'
import { MarketplacePage } from './pages/public/MarketplacePage'
import { KocProfilePage } from './pages/public/KocProfilePage'
import { RecruitLanding } from './pages/public/RecruitLanding'
import { RegisterPortalPage } from './pages/public/RegisterPortalPage'
import { ResourcePage } from './pages/resources/ResourcePage'
import { useAuth } from './context/AuthContext'
import type { Role } from './types'
import { AiCloneLanding, BusinessLanding, CommunityLanding, HomeLanding, KocLanding, MarketplaceLanding, PricingLanding, SupportLanding } from './pages/landing/LandingPages'

function Protected({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="spin" />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />
  return <PortalLayout />
}
function AppIndex() { const { user } = useAuth(); return <Navigate to={user?.role === 'koc' ? '/app/home' : '/app/dashboard'} replace /> }
function TermsRedirect() { if (typeof window !== 'undefined') window.location.replace('/terms.html'); return null }
function PrivacyRedirect() { if (typeof window !== 'undefined') window.location.replace('/privacy.html'); return null }

const resource = (title:string, endpoint:string, collection:string, columns?:string[]) => <ResourcePage title={title} endpoint={endpoint} collection={collection} columns={columns}/>
export const router = createBrowserRouter([
  { path:'/', element:<HomeLanding/> },
  { path:'/terms', element:<TermsRedirect/> },
  { path:'/terms.html', element:<TermsRedirect/> },
  { path:'/privacy', element:<PrivacyRedirect/> },
  { path:'/privacy.html', element:<PrivacyRedirect/> },
  { path:'/trang-chu', element:<HomeLanding/> },
  { path:'/koc', element:<KocLanding/> },
  { path:'/doanh-nghiep', element:<BusinessLanding/> },
  { path:'/marketplace', element:<MarketplaceLanding/> },
  { path:'/ai-clone', element:<AiCloneLanding/> },
  { path:'/bang-gia', element:<PricingLanding/> },
  { path:'/cong-dong', element:<CommunityLanding/> },
  { path:'/ho-tro', element:<SupportLanding/> },
  { path:'/tuyen-koc', element:<RecruitLanding/> },
  { path:'/dang-ky', element:<RegisterPortalPage/> },
  { path:'/login', element:<LoginPage/> },
  { path:'/forgot-password', element:<ForgotPasswordPage/> },
  { path:'/business-register', element:<BusinessRegisterPage/> },
  { path:'/explore', element:<MarketplacePage/> },
  { path:'/koc/:id', element:<KocProfilePage/> },
  { path:'/app', element:<Protected/>, children:[
    { index:true, element:<AppIndex/> },
    { path:'home', element:<DashboardPage/> }, { path:'dashboard', element:<DashboardPage/> },
    { path:'bookings', element:resource('Booking của tôi','/api/bookings','bookings',['code','category','price','status','deadline','created_at']) },
    { path:'content', element:resource('Quản lý nội dung','/api/bookings','bookings',['code','content_type','status','post_platform','updated_at']) },
    { path:'affiliate', element:resource('Tiếp thị liên kết','/api/affiliate/links','links',['tracking_code','platform','clicks','status','created_at']) },
    { path:'wallet', element:resource('Ví và giao dịch','/api/wallet','transactions',['type','amount','status','note','created_at']) },
    { path:'notifications', element:resource('Thông báo','/api/notifications','notifications',['title','message','is_read','created_at']) },
    { path:'orders', element:resource('Booking đã đặt','/api/bookings','bookings',['code','kocname','category','price','status','created_at']) },
    { path:'find', element:<Navigate to="/explore" replace/> },
    { path:'products', element:resource('Sản phẩm','/api/business/products','products',['name','platform','price','commission_rate','status','updated_at']) },
    { path:'campaigns', element:resource('Chiến dịch','/api/campaigns','campaigns',['category','tier','budget','qty','status','created_at']) },
    { path:'kol', element:resource('KOL / Nghệ sĩ','/api/kols','kols',['name','field','fanbase','ref_price','status']) },
    { path:'report', element:<DashboardPage/> },
    { path:'profile', element:resource('Hồ sơ','/api/business/profile','business') },
    { path:'businesses', element:resource('Doanh nghiệp','/api/admin/businesses','businesses',['name','email','contact','status','created_at']) },
    { path:'queue', element:resource('Hàng đợi duyệt KOC','/api/admin/queue','kocs',['name','email','tier','province','status','created_at']) },
    { path:'allbookings', element:resource('Booking toàn sàn','/api/bookings','bookings',['code','bizname','kocname','price','status','created_at']) },
    { path:'complaints', element:resource('Khiếu nại','/api/complaints','complaints',['bcode','raised_by_role','reason','status','created_at']) },
    { path:'contracts', element:resource('Hợp đồng KOC','/api/admin/contracts','kocs',['name','tier','status','contract_version','contract_signed_at']) },
    { path:'settle', element:resource('Đối soát','/api/admin/ledger','ledger',['kind','amount','ref','note','created_at']) },
    { path:'leads', element:resource('Khách hàng tiềm năng','/api/admin/leads','leads',['name','company','phone','status','assigned_to','created_at']) },
    { path:'aiclone', element:resource('AI Clone','/api/admin/aiclone','bookings',['code','kocname','bizname','status','price','updated_at']) },
    { path:'tiers', element:<DashboardPage/> },
  ]},
  { path:'*', element:<Navigate to="/" replace/> },
])
