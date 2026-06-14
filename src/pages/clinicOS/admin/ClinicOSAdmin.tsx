import { useState } from 'react'
import { AlertTriangle, BarChart3, Bell, Building2, CalendarClock, FileClock, LayoutDashboard, Settings, SlidersHorizontal, TrendingUp, UsersRound, Wrench } from 'lucide-react'
import '../dashboard/clinic-ai-dashboard.css'

const clients = [
  {name:'عيادة نور للأسنان',plan:'AI Receptionist + Smart Calls',status:'نشط',usage:68,end:'12 يونيو 2027',lost:13,calls:18},
  {name:'مجمع لمسة الطبي',plan:'WhatsApp AI Receptionist',status:'اقتربت من الحد',usage:92,end:'3 أكتوبر 2026',lost:21,calls:27},
  {name:'عيادات صفاء',plan:'WhatsApp AI Receptionist',status:'متوقف مؤقتاً',usage:100,end:'18 أغسطس 2026',lost:9,calls:15},
  {name:'مركز الحياة الطبي',plan:'AI Receptionist + Smart Calls',status:'نشط',usage:54,end:'29 ديسمبر 2026',lost:6,calls:8},
]

export const ClinicOSAdmin = ({embedded=false}:{embedded?:boolean}) => {
  const [section,setSection] = useState('الرئيسية')
  const menu = [['الرئيسية',LayoutDashboard],['كل العملاء',UsersRound],['الاشتراكات والاستخدام',BarChart3],['فرص الترقية',TrendingUp],['التنبيهات',Bell],['السجلات',FileClock],['إعدادات الباقات',Settings],['حدود الاستخدام',SlidersHorizontal],['إدارة التفعيل والتجديد',Wrench],['الإعدادات',Settings]] as const
  const content = section==='الرئيسية'?<AdminHome/>:<AdminTable section={section}/>
  if(embedded) return <div className="clinic-ai-page"><div className="clinic-ai-header"><div><h1>لوحة إدارة Clinic OS</h1><p>متابعة العملاء، الاستخدام، الاشتراكات وفرص الترقية من مكان واحد.</p></div><span className="clinic-status-pill">جميع الأنظمة تعمل</span></div><div className="clinic-filter-row">{menu.slice(0,6).map(([label])=><button onClick={()=>setSection(label)} className={`clinic-filter ${section===label?'active':''}`} key={label}>{label}</button>)}</div>{content}</div>
  return <div style={{minHeight:'100vh',display:'flex',direction:'rtl',background:'#f6f8fc'}}><aside style={{width:235,background:'#fff',borderLeft:'1px solid #e5e9f2',padding:12}}><div style={{display:'flex',alignItems:'center',gap:9,padding:'12px 8px 20px'}}><div style={{width:38,height:38,borderRadius:8,background:'#6557d9',display:'grid',placeItems:'center',color:'#fff'}}><Building2 size={19}/></div><div><strong style={{font:'900 13px Cairo'}}>إدارة Clinic OS</strong><div style={{font:'10px Tajawal',color:'#7a8699'}}>مالك المنصة</div></div></div>{menu.map(([label,Icon])=><button key={label} onClick={()=>setSection(label)} style={{width:'100%',display:'flex',alignItems:'center',gap:9,padding:'10px',marginBottom:3,borderRadius:7,border:'1px solid transparent',background:section===label?'#f0efff':'transparent',color:section===label?'#5146bd':'#566277',font:'700 11px Cairo',cursor:'pointer'}}><Icon size={15}/>{label}</button>)}</aside><main className="clinic-ai-page" style={{flex:1,padding:24,overflow:'auto'}}><div className="clinic-ai-header"><div><h1>{section}</h1><p>إدارة عملاء Clinic OS والخدمات الذكية يدوياً بدون بوابة دفع.</p></div></div>{content}</main></div>
}

const AdminHome=()=> <><div className="clinic-kpi-grid"><AdminMetric label="إجمالي العملاء" value="24" icon={UsersRound}/><AdminMetric label="العملاء النشطون" value="19" icon={Building2}/><AdminMetric label="اقتربوا من الحد" value="3" icon={AlertTriangle}/><AdminMetric label="متوقفون مؤقتاً" value="2" icon={Wrench}/><AdminMetric label="تنتهي قريباً" value="4" icon={CalendarClock}/><AdminMetric label="فرص ترقية" value="7" icon={TrendingUp}/></div><AdminTable section="آخر العملاء"/></>

const AdminMetric=({label,value,icon:Icon}:{label:string;value:string;icon:typeof UsersRound})=><div className="clinic-card clinic-kpi"><div className="clinic-kpi-icon" style={{background:'#f0efff',color:'#6557d9'}}><Icon size={18}/></div><div className="clinic-kpi-label">{label}</div><div className="clinic-kpi-value">{value}</div><div className="clinic-kpi-description">تحديث مباشر</div></div>

const AdminTable=({section}:{section:string})=><div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>{section}</h2><p>استخدم الإجراءات اليدوية لإدارة التفعيل والتجديد والحدود.</p></div><button className="clinic-action">إضافة عميل</button></div><div className="clinic-list">{clients.map(c=><div className="clinic-list-row" key={c.name} style={{gridTemplateColumns:'1.2fr 1.4fr .7fr 1fr .8fr auto'}}><div><strong>{c.name}</strong><div className="clinic-muted">عيادة</div></div><div>{c.plan}</div><span className={`clinic-badge ${c.status==='نشط'?'success':c.usage>=100?'danger':'warning'}`}>{c.status}</span><div><div className="clinic-usage-meta"><span>الاستخدام</span><strong>{c.usage}%</strong></div><div className="clinic-progress"><span style={{width:`${c.usage}%`,background:c.usage>=100?'#d44b5c':c.usage>=80?'#c77a18':'#0f9f78'}}/></div></div><div className="clinic-muted">{c.end}</div><button className="clinic-action secondary">عرض التفاصيل</button></div>)}</div></div>

