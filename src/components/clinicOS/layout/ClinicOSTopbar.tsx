import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Bell, BookOpen, ChevronDown, LogOut, Menu, MessageCircle, Settings, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics } from '../../../lib/clinicOSProduct'
import { useClinicMessages, useClinicOpportunities, useClinicTodayAppointments } from '../../../lib/clinicOSQueries'

interface Props { pageTitle?: string; onMenuToggle?: () => void; showMenuBtn?: boolean; onSearch?: (q:string)=>void }

export const ClinicOSTopbar = ({ pageTitle, onMenuToggle, showMenuBtn }: Props) => {
  const { packageType, clinicName, isDemo, isSubscribed, usageMetrics, usageCycleStart, usageCycleEnd, companyId, accountLoading, logout } = useClinicOS()
  const { data: todayAppointments = [] } = useClinicTodayAppointments(companyId, isDemo)
  const { data: messages = [] } = useClinicMessages(companyId, isDemo)
  const { data: opportunities = [] } = useClinicOpportunities(companyId, isDemo)
  const navigate = useNavigate()
  const [open,setOpen] = useState(false)
  const [notifs,setNotifs] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const usage = isSubscribed || isDemo ? getOverallUsage(packageType, metrics) : 0
  const plan = CLINIC_PLANS[packageType]
  const notifications = [
    ...todayAppointments.filter(a => a.status === 'pending' || a.status === 'needs_review').slice(0, 2).map(a => `موعد ${a.patient_name || 'مريض'} يحتاج ${a.status === 'pending' ? 'تأكيداً' : 'مراجعة'}`),
    ...opportunities.filter(o => o.status !== 'closed').slice(0, 2).map(o => `فرصة متابعة: ${o.customer_name || o.customer_phone}`),
    ...messages.filter(m => m.status === 'failed').slice(0, 1).map(m => `تعذر إرسال رسالة إلى ${m.recipient_name || m.recipient_phone}`),
  ]
  const color = usage >= 100 ? '#d44b5c' : usage >= 80 ? '#c77a18' : '#0f9f78'
  useEffect(()=>{const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  return <header style={{height:64,background:'#fff',borderBottom:'1px solid #e5e9f2',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 18px',direction:'rtl',zIndex:30}}>
    <div style={{display:'flex',alignItems:'center',gap:10}}>{showMenuBtn&&<button onClick={onMenuToggle} aria-label="القائمة" style={{width:36,height:36,borderRadius:7,border:'1px solid #e5e9f2',background:'#fff',display:'grid',placeItems:'center'}}><Menu size={18}/></button>}<h1 style={{margin:0,font:'900 15px Cairo',color:'#172033'}}>{pageTitle}</h1></div>
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{position:'relative'}}><button onClick={()=>setNotifs(!notifs)} aria-label="الإشعارات" style={{width:36,height:36,borderRadius:7,border:'1px solid #e5e9f2',background:'#fff',display:'grid',placeItems:'center',color:'#566277'}}><Bell size={16}/>{notifications.length>0&&<span style={{position:'absolute',top:7,right:7,width:6,height:6,borderRadius:'50%',background:'#d44b5c',border:'1px solid #fff'}}/>}</button>{notifs&&<div style={{position:'absolute',top:44,left:0,width:310,padding:10,background:'#fff',border:'1px solid #e5e9f2',borderRadius:8,boxShadow:'0 18px 45px rgba(27,37,61,.13)'}}>{notifications.length?notifications.map((n,i)=><div key={n} style={{padding:11,borderBottom:i<notifications.length-1?'1px solid #eef1f6':'none',font:'12px Tajawal',color:'#344055'}}>{n}</div>):<div style={{padding:16,textAlign:'center',font:'12px Tajawal',color:'#788499'}}>لا توجد تنبيهات تحتاج إجراء الآن</div>}</div>}</div>
      <div ref={ref} style={{position:'relative'}}><button onClick={()=>setOpen(!open)} title={`استخدام هذا الشهر: ${usage}%`} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 8px 4px 5px',borderRadius:8,border:'1px solid #e5e9f2',background:'#fff',cursor:'pointer'}}><div style={{width:34,height:34,borderRadius:'50%',padding:3,background:`conic-gradient(${color} ${usage*3.6}deg,#e9edf3 0)`}}><div style={{width:'100%',height:'100%',borderRadius:'50%',background:'#6557d9',display:'grid',placeItems:'center',color:'#fff',font:'800 11px Cairo'}}>{(clinicName||'م').charAt(0)}</div></div><div className="hide-on-mobile" style={{textAlign:'right'}}><strong style={{display:'block',maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',font:'800 11px Cairo',color:'#172033'}}>{accountLoading?'جاري التحميل':clinicName||'حساب العيادة'}</strong><span style={{font:'10px Tajawal',color:'#788499'}}>{usage}% استخدام</span></div><ChevronDown size={13} color="#8791a2"/></button>
      {open&&<div style={{position:'absolute',top:48,left:0,width:330,background:'#fff',border:'1px solid #e5e9f2',borderRadius:8,boxShadow:'0 20px 55px rgba(27,37,61,.15)',padding:15,direction:'rtl'}}><div style={{display:'flex',gap:10,alignItems:'center',paddingBottom:13,borderBottom:'1px solid #eef1f6'}}><div style={{width:42,height:42,borderRadius:8,background:'#6557d9',display:'grid',placeItems:'center',color:'#fff',font:'900 16px Cairo'}}>{(clinicName||'م').charAt(0)}</div><div><strong style={{font:'900 13px Cairo'}}>{clinicName||'حساب العيادة'}</strong><div style={{font:'11px Tajawal',color:'#778398'}}>{isSubscribed?plan.name:'Free'}</div></div><span style={{marginRight:'auto',padding:'3px 8px',borderRadius:20,background:isSubscribed?'#eafaf5':'#f0efff',color:isSubscribed?'#08785b':'#5146bd',font:'800 9px Cairo'}}>{isSubscribed?'نشط':'معاينة'}</span></div><div style={{padding:'13px 0'}}><div style={{display:'flex',justifyContent:'space-between',font:'11px Cairo',marginBottom:7}}><span>استخدام هذا الشهر</span><strong>{usage}%</strong></div><div style={{height:7,borderRadius:8,background:'#edf0f5',overflow:'hidden'}}><span style={{display:'block',width:`${usage}%`,height:'100%',background:color}}/></div><p style={{font:'11px/1.6 Tajawal',color:'#778398',margin:'8px 0 0'}}>{usageCycleStart&&usageCycleEnd?`دورة الاستخدام: ${usageCycleStart} - ${usageCycleEnd}`:'تبدأ دورة الاستخدام عند تفعيل الاشتراك'}</p></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}><button onClick={()=>navigate('/clinic-os/dashboard/usage')} style={quick}><Sparkles size={13}/>الباقة والاستخدام</button><button onClick={()=>navigate('/clinic-os/dashboard/knowledge')} style={quick}><BookOpen size={13}/>مركز المعرفة</button><button onClick={()=>navigate('/clinic-os/dashboard/settings')} style={quick}><Settings size={13}/>الإعدادات</button><a href="https://wa.me/966546666005" target="_blank" rel="noreferrer" style={{...quick,textDecoration:'none'}}><MessageCircle size={13}/>تواصل مع الإدارة</a></div><button onClick={logout} style={{...quick,width:'100%',marginTop:9,color:'#b93446'}}><LogOut size={13}/>تسجيل الخروج</button></div>}</div>
    </div>
  </header>
}

const quick: CSSProperties = {display:'flex',alignItems:'center',justifyContent:'center',gap:6,minHeight:34,borderRadius:6,border:'1px solid #e5e9f2',background:'#fafbfe',color:'#536075',font:'700 10px Cairo',cursor:'pointer'}
