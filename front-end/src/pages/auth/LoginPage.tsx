import { useState, type FormEvent } from 'react'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={user.role === 'koc' ? '/app/home' : '/app/dashboard'} replace />
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const next = await login(email, password); navigate(next.role === 'koc' ? '/app/home' : '/app/dashboard') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng nhập thất bại') }
    finally { setBusy(false) }
  }
  return <div className="auth auth-login"><div className="auth-card">
    <div className="logo" style={{textAlign:'center'}}>KOC<span> Viet</span></div>
    <p className="muted" style={{textAlign:'center'}}>Sàn booking KOC/KOLs · NetViet</p>
    <form onSubmit={submit}>
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
      <div className="field"><label>Mật khẩu</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
      {error && <div className="err">{error}</div>}
      <button className="btn primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
    <div className="row" style={{marginTop:12}}><Link to="/forgot-password">Quên mật khẩu?</Link></div>
    <div className="row" style={{marginTop:12,gap:8,display:'flex',flexWrap:'wrap'}}><Link className="btn ghost sm" to="/explore">Khám phá KOC</Link><Link className="btn ghost sm" to="/dang-ky">Đăng ký KOC</Link><Link className="btn ghost sm" to="/dang-ky?role=business">Đăng ký doanh nghiệp</Link></div>
  </div></div>
}
