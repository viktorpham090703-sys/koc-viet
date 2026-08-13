import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { post } from '../../lib/api'

export function BusinessRegisterPage(){
  const [form,setForm]=useState({email:'',companyName:'',contactName:'',phone:'',industry:'',taxCode:'',password:'',code:''}); const [otp,setOtp]=useState(false); const [done,setDone]=useState(false); const [error,setError]=useState('');
  const field=(name:keyof typeof form)=>(event:React.ChangeEvent<HTMLInputElement>)=>setForm({...form,[name]:event.target.value})
  async function sendOtp(){setError('');try{await post('/api/business-register/email-otp',{email:form.email});setOtp(true)}catch(e){setError(e instanceof Error?e.message:'Có lỗi xảy ra')}}
  async function submit(event:FormEvent){event.preventDefault();setError('');try{await post('/api/business-register',form);setDone(true)}catch(e){setError(e instanceof Error?e.message:'Có lỗi xảy ra')}}
  if(done)return <div className="auth"><div className="auth-card empty"><div className="ico">✅</div><h2>Đăng ký thành công</h2><Link className="btn primary" to="/login">Đăng nhập</Link></div></div>
  return <div className="auth"><form className="auth-card" onSubmit={submit}><div className="logo">KOC<span> Viet</span></div><h2>Đăng ký doanh nghiệp</h2>{(['companyName','contactName','phone','industry','taxCode'] as const).map(name=><div className="field" key={name}><label>{{companyName:'Tên doanh nghiệp',contactName:'Người liên hệ',phone:'Điện thoại',industry:'Ngành nghề',taxCode:'Mã số thuế'}[name]}</label><input value={form[name]} onChange={field(name)} required={name!=='taxCode'}/></div>)}<div className="field"><label>Email</label><div className="row"><input type="email" value={form.email} onChange={field('email')} required/><button type="button" className="btn ghost sm" onClick={sendOtp}>Gửi OTP</button></div></div>{otp&&<div className="field"><label>Mã OTP</label><input value={form.code} onChange={field('code')} required/></div>}<div className="field"><label>Mật khẩu</label><input type="password" minLength={8} value={form.password} onChange={field('password')} required/></div>{error&&<div className="err">{error}</div>}<button className="btn primary" disabled={!otp}>Tạo tài khoản</button><Link to="/login">← Đăng nhập</Link></form></div>
}
