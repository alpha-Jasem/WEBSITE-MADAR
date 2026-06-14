import { useNavigate } from 'react-router-dom'
import { CalendarCheck, Clock3, Lock, MessageCircle, Phone, Sparkles, TrendingUp, UserRoundCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { AI_RECEPTIONIST_DEMO, CLINIC_PLANS, DEMO_TODAY_APPOINTMENTS, getOverallUsage, getUsageMetrics, STATUS_COPY, usagePercentage } from '../../../lib/clinicOSProduct'
import './clinic-ai-dashboard.css'

const tone = {violet:['#f0efff','#6557d9'],mint:['#eafaf5','#0f9f78'],amber:['#fff7e8','#c77a18'],blue:['#edf7ff','#2780c3'],rose:['#fff0f2','#d44b5c']} as const

export const DashboardOverview = () => {
  const { userName, packageType, isDemo, isSubscribed, usageMetrics, usageSummary } = useClinicOS()
  const navigate = useNavigate()
  const smart = isSubscribed && packageType === 'ai_pro'
  const summary = isDemo ? AI_RECEPTIONIST_DEMO : usageSummary
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const usage = isSubscribed || isDemo ? getOverallUsage(packageType, metrics) : 0
  const kpis = [
    [CalendarCheck,'حجوزات أنجزها النظام',String(summary.bookings),'حجز مؤكد هذا الشهر','mint'],
    [MessageCircle,'محادثات واتساب',String(summary.conversations),'محادثة تعامل معها النظام','blue'],
    [Clock3,'عملاء خارج الدوام',String(summary.afterHours),'تم الرد عليهم بعد وقت العمل','amber'],
    [TrendingUp,'فرص تحتاج متابعة',String(summary.lostOpportunities),'عملاء مهتمون لم يكملوا الحجز','rose'],
    [smart?Phone:Lock,'مكالمات ذكية',smart?String(summary.smartCallMinutes):'غير مفعلة',smart?'دقيقة اتصال ذكي مستخدمة':'متاحة في الباقة الأعلى','violet'],
    [Sparkles,'نسبة التحويل',summary.conversations?`${Math.round((summary.bookings/summary.conversations)*100)}%`:'0%','من محادثة إلى حجز','violet'],
  ] as const
  const activities = isDemo ? ['تم حجز موعد بواسطة المساعد الذكي — تنظيف أسنان — 6:40 م','تم تحويل عميل للموظف — استفسار عن التقسيط','تم الرد على عميل خارج الدوام — 11:35 م','مكالمة ذكية تحولت إلى حجز — جلدية','عميل لم يكمل الحجز ويحتاج متابعة'] : []
  return <div className="clinic-ai-page">
    <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="clinic-ai-header"><div><h1>صباح الخير، {userName || 'مدير العيادة'}</h1><p>{isSubscribed?'تابع نتائج موظف الاستقبال الذكي والحجوزات والفرص التي تعامل معها النظام هذا الشهر.':'حسابك جاهز للمعاينة. ثبّت الاشتراك لتشغيل واتساب الذكي وبدء تسجيل النتائج الفعلية.'}</p></div><span className="clinic-status-pill">{isSubscribed?STATUS_COPY.active:'حساب معاينة'}</span></motion.div>
    <div className="clinic-kpi-grid">{kpis.map(([Icon,label,value,desc,t],i)=><motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:.04*i}} className="clinic-card clinic-kpi" key={label}><div className="clinic-kpi-icon" style={{background:tone[t][0],color:tone[t][1]}}><Icon size={18}/></div><div className="clinic-kpi-label">{label}</div><div className="clinic-kpi-value" style={{fontSize:value==='غير مفعلة'?16:26}}>{value}</div><div className="clinic-kpi-description">{desc}</div></motion.div>)}</div>
    <div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>قيمة النظام هذا الشهر</h2><p>نتائج فعلية يبدأ النظام في تسجيلها من لحظة التفعيل.</p></div><button className="clinic-action secondary" onClick={()=>navigate('/clinic-os/dashboard/value')}>عرض التفاصيل</button></div><div className="clinic-outcome-grid">{[['الحجوزات التي تمت',summary.bookings],['العملاء خارج الدوام',summary.afterHours],['المكالمات التي تم إنقاذها',summary.recoveredCalls],['الحالات المحولة للموظف',summary.humanHandoffs]].map(([label,value])=><div className="clinic-mini-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="clinic-note">تبدأ الأرقام من الصفر للحساب الجديد وتُحدّث مع كل عملية حقيقية.</p></div>
    <div className="clinic-two-col">
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>الفرص الضائعة</h2><p>ابدأ بالأقرب للحجز قبل أن يبرد اهتمامه.</p></div><button className="clinic-action" onClick={()=>navigate('/clinic-os/dashboard/lost-opportunities')}>متابعة الفرص الآن</button></div>{[[String(summary.lostOpportunities),'إجمالي الفرص التي تحتاج متابعة'],[String(summary.humanHandoffs),'حالات محولة للموظف'],[String(summary.recoveredCalls),'مكالمات تم إنقاذها']].map(([v,l])=><div key={l} style={{display:'flex',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid #eff1f6',fontSize:13}}><span>{l}</span><strong style={{fontFamily:'Sora,Cairo'}}>{v}</strong></div>)}<p className="clinic-note">كل فرصة غير مكتملة قد تذهب إلى عيادة أخرى إذا لم تتم متابعتها بسرعة.</p></div>
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>الباقة والاستخدام</h2><p>{isSubscribed?CLINIC_PLANS[packageType].name:'Free'}</p></div><strong style={{font:'800 22px Sora,Cairo'}}>{usage}%</strong></div>{metrics.filter(m=>m.limit>0).slice(0,3).map(m=>{const p=usagePercentage(m);return <div className="clinic-usage-row" key={m.key}><div className="clinic-usage-meta"><span>{m.label}</span><strong>{m.used} / {m.limit}</strong></div><div className="clinic-progress"><span style={{width:`${p}%`}}/></div></div>})}<button className="clinic-action secondary" style={{marginTop:16}} onClick={()=>navigate(isSubscribed?'/clinic-os/dashboard/usage':'/clinic-os/dashboard/plans')}>{isSubscribed?'عرض الباقة والاستخدام':'تثبيت الاشتراك'}</button></div>
    </div>
    <div className="clinic-two-col">
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>مواعيد اليوم</h2><p>المصدر يوضح كيف وصل كل حجز.</p></div><button className="clinic-action secondary" onClick={()=>navigate('/clinic-os/dashboard/bookings')}>عرض الحجوزات</button></div><div className="clinic-list">{(isDemo?DEMO_TODAY_APPOINTMENTS:[]).map(a=><div className="clinic-list-row" key={a.name} style={{gridTemplateColumns:'1fr .45fr .9fr .65fr .8fr'}}><strong>{a.name}</strong><span style={{font:'800 12px Sora,Cairo'}}>{a.time}</span><span>{a.service}</span><span className="clinic-badge">{a.source}</span><span className={`clinic-badge ${a.status==='مؤكد'?'success':a.status.includes('مراجعة')?'danger':'warning'}`}>{a.status}</span></div>)}{!isDemo&&<div className="clinic-empty-state"><CalendarCheck size={22}/><strong>لا توجد مواعيد اليوم بعد</strong><span>ستظهر الحجوزات هنا فور تسجيل أول موعد.</span></div>}</div></div>
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><h2>آخر الأنشطة</h2></div>{activities.map((a,i)=><div key={a} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:i<activities.length-1?'1px solid #eff1f6':'none'}}><div style={{width:25,height:25,borderRadius:7,background:i%2?'#edf7ff':'#eafaf5',color:i%2?'#2780c3':'#0f9f78',display:'grid',placeItems:'center',flexShrink:0}}>{i%2?<MessageCircle size={12}/>:<UserRoundCheck size={12}/>}</div><span style={{fontSize:12,lineHeight:1.7}}>{a}</span></div>)}{!activities.length&&<div className="clinic-empty-state"><UserRoundCheck size={22}/><strong>لا توجد أنشطة بعد</strong><span>ستظهر أول محادثة أو حجز هنا مباشرة.</span></div>}</div>
    </div>
  </div>
}
