import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useClinicOS } from '../../context/ClinicOSContext'
import { DashboardOverview } from './dashboard/DashboardOverview'
import { ClinicOSAdmin } from './admin/ClinicOSAdmin'
import './dashboard/clinic-ai-dashboard.css'

type View = 'whatsapp' | 'ai_pro' | 'admin'

export const DemoReview = () => {
  const { setPackageType } = useClinicOS()
  const [view,setView] = useState<View>('whatsapp')
  useEffect(()=>{ if(view !== 'admin') setPackageType(view) },[view,setPackageType])
  return <div style={{minHeight:'100vh',background:'#f6f8fc',direction:'rtl'}}>
    <div style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'11px 22px',background:'#fff',borderBottom:'1px solid #e5e9f2'}}>
      <div style={{display:'flex',alignItems:'center',gap:9}}><ShieldCheck size={18} color="#6557d9"/><div><strong style={{display:'block',font:'900 13px Cairo'}}>مراجعة Clinic OS</strong><span style={{font:'10px Tajawal',color:'#7b8799'}}>بيانات تجريبية فقط، بدون تنفيذ أو إرسال</span></div></div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{([['whatsapp','لوحة العميل — واتساب'],['ai_pro','لوحة العميل — الاتصال الذكي'],['admin','لوحة الإدارة']] as const).map(([id,label])=><button key={id} onClick={()=>setView(id)} style={{padding:'8px 12px',borderRadius:7,border:`1px solid ${view===id?'#6557d9':'#e5e9f2'}`,background:view===id?'#f0efff':'#fff',color:view===id?'#5146bd':'#637087',font:'800 11px Cairo',cursor:'pointer'}}>{label}</button>)}</div>
    </div>
    <main style={{maxWidth:1480,margin:'0 auto',padding:22}}>{view==='admin'?<ClinicOSAdmin embedded/>:<DashboardOverview/>}</main>
  </div>
}

