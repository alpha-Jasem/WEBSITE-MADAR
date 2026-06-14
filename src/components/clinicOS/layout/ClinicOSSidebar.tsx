import { NavLink } from 'react-router-dom'
import {
  BarChart3, BookOpen, CalendarCheck, LineChart, Headphones, LayoutDashboard,
  Lock, MessageCircle, Phone, PhoneMissed, Settings, Sparkles, TrendingUp, UsersRound, X,
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface Props { onNewAppointment?: () => void; onClose?: () => void }

export const ClinicOSSidebar = ({ onClose }: Props) => {
  const { packageType, clinicName } = useClinicOS()
  const smartCalls = packageType === 'ai_pro'
  const base = '/clinic-os/dashboard'
  const items = [
    ['', LayoutDashboard, 'الرئيسية'],
    ['/value', LineChart, 'قيمة النظام'],
    ['/conversations', MessageCircle, 'المحادثات'],
    ['/bookings', CalendarCheck, 'الحجوزات'],
    ['/leads', UsersRound, 'العملاء المحتملون'],
    ['/lost-opportunities', TrendingUp, 'الفرص الضائعة'],
    ['/smart-calls', Phone, 'المكالمات الذكية', !smartCalls],
    ['/missed-calls', PhoneMissed, 'المكالمات الفائتة', !smartCalls],
    ['/usage', BarChart3, 'الباقة والاستخدام'],
    ['/knowledge', BookOpen, 'مركز المعرفة'],
    ['/reports', LineChart, 'التقارير'],
    ['/settings', Settings, 'الإعدادات'],
  ] as const

  return <aside style={{width:232,background:'#fff',borderLeft:'1px solid #e5e9f2',display:'flex',flexDirection:'column',height:'100vh',direction:'rtl'}}>
    <div style={{height:68,padding:'0 14px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #eef1f6'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}><div style={{width:36,height:36,borderRadius:8,background:'#6557d9',display:'grid',placeItems:'center',color:'#fff'}}><Headphones size={18}/></div><div style={{minWidth:0}}><strong style={{display:'block',font:'900 13px Cairo',color:'#172033'}}>Clinic OS</strong><span style={{display:'block',font:'11px Tajawal',color:'#7a8699',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{clinicName || 'موظف الاستقبال الذكي'}</span></div></div>
      {onClose&&<button onClick={onClose} aria-label="إغلاق القائمة" style={{border:0,background:'transparent',color:'#8893a5',cursor:'pointer'}}><X size={17}/></button>}
    </div>
    <nav style={{flex:1,overflowY:'auto',padding:'12px 9px'}}>{items.map(([path,Icon,label,locked])=><NavLink key={path} to={base+path} end={path===''} onClick={onClose} style={({isActive})=>({display:'flex',alignItems:'center',gap:10,minHeight:38,padding:'7px 11px',marginBottom:3,borderRadius:7,textDecoration:'none',font:'700 12px Tajawal',color:isActive?'#5549c6':locked?'#a8afbd':'#536075',background:isActive?'#f0efff':'transparent',border:isActive?'1px solid #dedaff':'1px solid transparent'})}><Icon size={16}/><span style={{flex:1}}>{label}</span>{locked&&<Lock size={12}/>}</NavLink>)}</nav>
    <div style={{padding:10,borderTop:'1px solid #eef1f6'}}>{smartCalls?<div style={{padding:12,borderRadius:8,background:'#eafaf5',border:'1px solid #bdebdc'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}><strong style={{font:'800 11px Cairo',color:'#08785b'}}>AI Voice + WhatsApp</strong><span style={{font:'800 9px Cairo',color:'#08785b'}}>نشط</span></div><div style={{font:'11px Tajawal',color:'#498574'}}>الباقة مفعلة</div></div>:<div style={{padding:13,borderRadius:8,background:'#f7f6ff',border:'1px solid #dedaff'}}><Sparkles size={17} color="#6557d9"/><strong style={{display:'block',margin:'8px 0 4px',font:'900 12px Cairo',color:'#302a72'}}>فعّل الاتصال الذكي</strong><p style={{margin:'0 0 10px',font:'11px/1.55 Tajawal',color:'#706b94'}}>لا تخسر المكالمات خارج الدوام أو وقت انشغال الموظفين.</p><NavLink to="/clinic-os/dashboard/plans" onClick={onClose} style={{display:'flex',justifyContent:'center',padding:8,borderRadius:6,background:'#6557d9',color:'#fff',textDecoration:'none',font:'800 11px Cairo'}}>عرض الباقات</NavLink></div>}</div>
  </aside>
}
