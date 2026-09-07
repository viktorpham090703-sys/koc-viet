import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { post } from '../../lib/api'

export function ForgotPasswordPage() {
  const [email,setEmail]=useState(''); const [code,setCode]=useState(''); const [password,setPassword]=useState('')
  const [stage,setStage]=useState<'email'|'reset'|'done'>('email'); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false)
  async function send(event:FormEvent){event.preventDefault();setBusy(true);setMessage('');try{await post('/api/forgot-password',{email});setStage('reset')}catch(e){setMessage(e instanceof Error?e.message:'Có lỗi xảy ra')}finally{setBusy(false)}}
  async function reset(event:FormEvent){event.preventDefault();setBusy(true);setMessage('');try{await post('/api/reset-password',{email,code,password});setStage('done')}catch(e){setMessage(e instanceof Error?e.message:'Có lỗi xảy ra')}finally{setBusy(false)}}
  return <div className="auth"><div className="auth-card"><div className="logo" style={{textAlign:'center'}}>KOC<span> Viet</span></div><h2>Đặt lại mật khẩu</h2>
    {stage==='email'&&<form onSubmit={send}><div className="field"><label>Email đã đăng ký</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><button className="btn primary" disabled={busy}>Gửi mã xác thực</button></form>}
    {stage==='reset'&&<form onSubmit={reset}><div className="field"><label>Mã xác thực</label><input value={code} onChange={e=>setCode(e.target.value)} required/></div><div className="field"><label>Mật khẩu mới</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required/></div><button className="btn primary" disabled={busy}>Đổi mật khẩu</button></form>}
    {stage==='done'&&<div className="empty"><div className="ico"><img src="/images/check-circle.svg" alt="" aria-hidden="true" style={{width:"1em",height:"1em",verticalAlign:"-0.125em"}} /></div><p>Đổi mật khẩu thành công.</p><Link className="btn primary" to="/login">Đăng nhập</Link></div>}{message&&<div className="err">{message}</div>}<Link to="/login">← Quay lại</Link>
  </div></div>
}
