import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BarChart3, Bot, CalendarCheck, CheckCircle2, Clock3, Headphones,
  Lock, MessageCircle, Phone, PhoneMissed, Search, Sparkles, TrendingUp,
  UserRoundCheck, UsersRound, WalletCards,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  AI_RECEPTIONIST_DEMO, CLINIC_PLANS, DEMO_CONVERSATIONS, DEMO_LEADS,
  DEMO_LOST_OPPORTUNITIES, DEMO_SMART_CALLS, getOverallUsage, getUsageMetrics,
  usagePercentage,
} from '../../../lib/clinicOSProduct'
import './clinic-ai-dashboard.css'

const WHATSAPP = 'https://wa.me/966546666005'

const PageHeader = ({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) => (
  <div className="clinic-ai-header">
    <div><h1>{title}</h1><p>{subtitle}</p></div>
    {action}
  </div>
)

const Metric = ({ icon: Icon, label, value, description, tone = 'violet' }: { icon: typeof TrendingUp; label: string; value: ReactNode; description: string; tone?: 'violet'|'mint'|'amber'|'blue'|'rose' }) => {
  const tones = {
    violet: ['#f0efff','#6557d9'], mint: ['#eafaf5','#0f9f78'], amber: ['#fff7e8','#c77a18'],
    blue: ['#edf7ff','#2780c3'], rose: ['#fff0f2','#d44b5c'],
  }
  return <div className="clinic-card clinic-kpi">
    <div className="clinic-kpi-icon" style={{ background: tones[tone][0], color: tones[tone][1] }}><Icon size={18}/></div>
    <div className="clinic-kpi-label">{label}</div><div className="clinic-kpi-value">{value}</div><div className="clinic-kpi-description">{description}</div>
  </div>
}

const UpgradeLocked = ({ missed = false }: { missed?: boolean }) => (
  <div className="clinic-card clinic-lock">
    <div className="clinic-lock-inner">
      <div className="clinic-lock-icon"><Lock size={28}/></div>
      <h1>{missed ? 'المكالمات الفائتة متاحة في الباقة الأعلى' : 'المكالمات الذكية متاحة في الباقة الأعلى'}</h1>
      <p>لا تخسر المكالمات خارج الدوام أو وقت انشغال الموظفين. الاتصال الذكي يرد على العميل، يفهم الطلب، ويحوله إلى حجز أو متابعة.</p>
      <div className="clinic-benefits">
        {['الرد على المكالمات خارج الدوام','فهم طلب العميل','تحويل المكالمة إلى حجز','إرسال ملخص للموظف','تقليل المكالمات الفائتة'].map(item => <div className="clinic-benefit" key={item}><CheckCircle2 size={14} color="#0f9f78"/> {item}</div>)}
      </div>
      <Link className="clinic-action" to="/clinic-os/dashboard/plans">عرض الباقات <ArrowLeft size={15}/></Link>
    </div>
  </div>
)

export const SystemValuePage = () => {
  const daily = [{day:'الأحد',value:5},{day:'الاثنين',value:7},{day:'الثلاثاء',value:4},{day:'الأربعاء',value:8},{day:'الخميس',value:9},{day:'الجمعة',value:3},{day:'السبت',value:6}]
  const services = [{name:'تنظيف',value:32},{name:'تقويم',value:25},{name:'كشف',value:21},{name:'جلدية',value:14},{name:'أخرى',value:8}]
  return <div className="clinic-ai-page">
    <PageHeader title="قيمة النظام هذا الشهر" subtitle="تابع كيف ساعد موظف الاستقبال الذكي في استقبال العملاء، زيادة الحجوزات، وتقليل الفرص الضائعة."/>
    <div className="clinic-kpi-grid">
      <Metric icon={CalendarCheck} label="الحجوزات التي تمت" value="42" description="حجزاً أنجزها النظام" tone="mint"/>
      <Metric icon={Clock3} label="عملاء خارج الدوام" value="27" description="تم الرد عليهم فوراً" tone="blue"/>
      <Metric icon={Phone} label="مكالمات تم إنقاذها" value="11" description="عادت إلى مسار الحجز" tone="violet"/>
      <Metric icon={UserRoundCheck} label="حالات محولة للموظف" value="18" description="مع ملخص واضح للطلب" tone="amber"/>
      <Metric icon={TrendingUp} label="فرص تمت متابعتها" value="31" description="قبل أن تذهب لمنافس" tone="rose"/>
      <Metric icon={Sparkles} label="معدل التحويل" value="28%" description="من محادثة إلى حجز"/>
    </div>
    <div className="clinic-card clinic-section">
      <div className="clinic-section-head"><div><h2>الأثر التجاري</h2><p>النظام لا يرد فقط، بل يحافظ على اهتمام العميل حتى يصل إلى الحجز.</p></div><span className="clinic-badge success">فرصة إيراد تقديرية</span></div>
      <div style={{display:'flex',alignItems:'baseline',gap:8}}><strong style={{font:'800 32px Sora,Cairo',color:'#0f9f78'}}>10,500 ر.س</strong><span className="clinic-muted">42 حجزاً × متوسط خدمة 250 ر.س</span></div>
      <p className="clinic-note">هذه فرصة إيراد تقديرية مبنية على الحجوزات ومتوسط قيمة الخدمة، وليست إيراداً مضموناً.</p>
    </div>
    <div className="clinic-two-col">
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><h2>الحجوزات حسب اليوم</h2></div><ResponsiveContainer width="100%" height={240}><BarChart data={daily}><CartesianGrid stroke="#eef1f6" vertical={false}/><XAxis dataKey="day" tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip/><Bar dataKey="value" fill="#6557d9" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="clinic-card clinic-section"><div className="clinic-section-head"><h2>أكثر الخدمات طلباً</h2></div><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={services} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>{services.map((_,i)=><Cell key={i} fill={['#6557d9','#0f9f78','#2780c3','#c77a18','#d9deea'][i]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
    </div>
  </div>
}

export const ConversationsPage = () => {
  const [filter,setFilter] = useState('الكل')
  const filters = ['الكل','تم الحجز','يحتاج متابعة','تم التحويل للموظف','خارج الدوام','لم يكتمل الحجز']
  const rows = DEMO_CONVERSATIONS.filter(row => filter === 'الكل' || row.status === filter || (filter === 'خارج الدوام' && row.afterHours))
  return <div className="clinic-ai-page">
    <PageHeader title="المحادثات" subtitle="كل عميل تواصل مع العيادة، ماذا طلب، وكيف تعامل معه موظف الاستقبال الذكي." action={<button className="clinic-action ghost"><Search size={14}/>بحث</button>}/>
    <div className="clinic-filter-row">{filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`clinic-filter ${filter===f?'active':''}`}>{f}</button>)}</div>
    <div className="clinic-card clinic-section">
      <div className="clinic-list">{rows.map(row=><div className="clinic-list-row" key={row.phone} style={{gridTemplateColumns:'1fr 1.7fr .8fr .8fr auto'}}>
        <div><strong>{row.name}</strong><div className="clinic-muted">{row.phone}</div></div>
        <div><strong>{row.summary}</strong><div className="clinic-muted">آخر رسالة: {row.last}</div></div>
        <span className={`clinic-badge ${row.booked?'success':row.status.includes('متابعة')?'warning':''}`}>{row.status}</span>
        <div className="clinic-muted">{row.time}</div>
        <button className="clinic-action secondary">عرض المحادثة</button>
      </div>)}</div>
    </div>
  </div>
}

export const LeadsPage = () => <div className="clinic-ai-page">
  <PageHeader title="العملاء المحتملون" subtitle="رتّب العملاء حسب نية الحجز وابدأ بمن هم أقرب لاتخاذ القرار."/>
  <div className="clinic-kpi-grid"><Metric icon={TrendingUp} label="عملاء ساخنون" value="8" description="طلبوا سعراً أو موعداً" tone="rose"/><Metric icon={UsersRound} label="يحتاجون متابعة" value="13" description="لم يكملوا الحجز" tone="amber"/><Metric icon={MessageCircle} label="قادمين من واتساب" value="31" description="هذا الشهر" tone="mint"/><Metric icon={UserRoundCheck} label="محولون للموظف" value="6" description="بحاجة لتدخل بشري" tone="blue"/></div>
  <div className="clinic-card clinic-section"><div className="clinic-list">{DEMO_LEADS.map(row=><div className="clinic-list-row" key={row.phone} style={{gridTemplateColumns:'1fr 1.3fr .6fr .7fr 1fr auto'}}><div><strong>{row.name}</strong><div className="clinic-muted">{row.phone}</div></div><div>{row.interest}</div><span className={`clinic-badge ${row.score==='ساخن'?'danger':row.score==='متوسط'?'warning':''}`}>{row.score}</span><div className="clinic-muted">{row.last}</div><div>{row.next}</div><a className="clinic-action secondary" href={`${WHATSAPP}?text=${encodeURIComponent('مرحباً، لاحظنا أنك كنت مهتماً بحجز موعد. هل يناسبك أن نساعدك في اختيار الوقت المناسب؟')}`} target="_blank" rel="noreferrer">متابعة</a></div>)}</div></div>
</div>

export const LostOpportunitiesPage = () => <div className="clinic-ai-page">
  <PageHeader title="الفرص الضائعة" subtitle="عملاء أبدوا اهتماماً لكن لم يتحولوا إلى حجز حتى الآن." action={<button className="clinic-action">متابعة الفرص الآن</button>}/>
  <div className="clinic-kpi-grid"><Metric icon={TrendingUp} label="إجمالي الفرص" value="13" description="تحتاج تدخلاً سريعاً" tone="rose"/><Metric icon={Sparkles} label="فرص ساخنة" value="7" description="قريبة من الحجز" tone="amber"/><Metric icon={Clock3} label="خارج الدوام" value="4" description="بدأت بعد الإغلاق" tone="blue"/><Metric icon={PhoneMissed} label="مكالمات فائتة" value="2" description="تحتاج معاودة اتصال" tone="violet"/><Metric icon={WalletCards} label="قيمة تقديرية" value="3,250" description="ر.س فرصة محتملة" tone="mint"/></div>
  <div className="clinic-card clinic-section"><p className="clinic-note" style={{marginTop:0}}>كل تأخير في متابعة هذه الفرص قد يعني انتقال العميل إلى عيادة أخرى.</p><div className="clinic-list">{DEMO_LOST_OPPORTUNITIES.map(row=><div className="clinic-list-row" key={row.phone} style={{gridTemplateColumns:'1fr 1.1fr 1fr .7fr .8fr auto'}}><div><strong>{row.name}</strong><div className="clinic-muted">{row.phone}</div></div><div>{row.type}</div><div>{row.service}</div><span className={`clinic-badge ${row.priority==='عالية'?'danger':'warning'}`}>{row.priority}</span><div className="clinic-muted">{row.last}</div><button className="clinic-action secondary">{row.action}</button></div>)}</div></div>
</div>

export const SmartCallsPage = () => {
  const { packageType, isSubscribed } = useClinicOS()
  if (!isSubscribed || packageType !== 'ai_pro') return <div className="clinic-ai-page"><UpgradeLocked/></div>
  return <div className="clinic-ai-page"><PageHeader title="المكالمات الذكية" subtitle="المكالمات التي استقبلها النظام، فهم طلبها، وحوّلها إلى حجز أو متابعة."/>
    <div className="clinic-kpi-grid"><Metric icon={Phone} label="عدد المكالمات" value="36" description="هذا الشهر" tone="violet"/><Metric icon={Clock3} label="الدقائق المستخدمة" value="126" description="من 300 دقيقة" tone="blue"/><Metric icon={CalendarCheck} label="تحولت إلى حجز" value="14" description="حجزاً مؤكداً" tone="mint"/><Metric icon={TrendingUp} label="تحتاج متابعة" value="7" description="فرص لم تغلق بعد" tone="amber"/><Metric icon={Headphones} label="متوسط المكالمة" value="1:31" description="دقيقة" tone="rose"/></div>
    <div className="clinic-card clinic-section"><div className="clinic-list">{DEMO_SMART_CALLS.map(row=><div className="clinic-list-row" key={row.phone} style={{gridTemplateColumns:'1fr .55fr .75fr 1.5fr .7fr'}}><div><strong>{row.name}</strong><div className="clinic-muted">{row.phone}</div></div><div>{row.duration}</div><div>{row.reason}</div><div>{row.summary}</div><span className={`clinic-badge ${row.booked?'success':'warning'}`}>{row.status}</span></div>)}</div></div>
  </div>
}

export const MissedCallsPage = () => {
  const { packageType, isSubscribed } = useClinicOS()
  if (!isSubscribed || packageType !== 'ai_pro') return <div className="clinic-ai-page"><UpgradeLocked missed/></div>
  const rows = [{phone:'055 710 4832',time:'أمس 8:42 م',contact:'تم التواصل',method:'اتصال ذكي',result:'تم الحجز',booked:'نعم'},{phone:'050 881 2940',time:'أمس 9:18 م',contact:'تم التواصل',method:'واتساب',result:'بانتظار الرد',booked:'لا'},{phone:'053 244 7105',time:'اليوم 7:16 ص',contact:'يحتاج متابعة',method:'لم يبدأ',result:'فرصة جديدة',booked:'لا'}]
  return <div className="clinic-ai-page"><PageHeader title="المكالمات الفائتة" subtitle="المكالمة الفائتة ليست مجرد اتصال ضائع؛ قد تكون حجزاً ذهب إلى عيادة أخرى."/><div className="clinic-kpi-grid"><Metric icon={PhoneMissed} label="المكالمات الفائتة" value="18" description="هذا الشهر" tone="rose"/><Metric icon={Phone} label="تم إنقاذها" value="11" description="تم التواصل معها" tone="mint"/><Metric icon={CalendarCheck} label="تحولت إلى حجز" value="6" description="بعد معاودة التواصل" tone="blue"/><Metric icon={TrendingUp} label="تحتاج متابعة" value="7" description="ما زالت مفتوحة" tone="amber"/><Metric icon={Sparkles} label="نسبة الإنقاذ" value="61%" description="من إجمالي المكالمات" tone="violet"/></div><div className="clinic-card clinic-section"><div className="clinic-list">{rows.map(r=><div className="clinic-list-row" key={r.phone}><strong>{r.phone}</strong><div>{r.time}</div><span className="clinic-badge">{r.contact}</span><div>{r.method}</div><span className={`clinic-badge ${r.booked==='نعم'?'success':'warning'}`}>{r.result}</span></div>)}</div></div></div>
}

export const PlanUsagePage = () => {
  const { packageType, isDemo, isSubscribed, usageMetrics, usageCycleStart, usageCycleEnd, subscriptionEndDate } = useClinicOS()
  const plan = CLINIC_PLANS[packageType]
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const overall = isSubscribed || isDemo ? getOverallUsage(packageType, metrics) : 0
  return <div className="clinic-ai-page"><PageHeader title="الباقة والاستخدام" subtitle="راقب حدود الخدمات الذكية ودورة الاشتراك من مكان واحد." action={<a className="clinic-action ghost" href={`${WHATSAPP}?text=${encodeURIComponent('مرحباً، أحتاج مساعدة بخصوص الباقة والاستخدام.')}`} target="_blank" rel="noreferrer">تواصل مع الإدارة</a>}/>
    <div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>{isSubscribed?plan.name:'Free'}</h2><p>{isSubscribed?plan.support:'حساب معاينة بدون خدمات تشغيلية مفعلة.'}</p></div><span className={`clinic-badge ${isSubscribed?'success':''}`}>{isSubscribed?'نشطة':'معاينة'}</span></div><div className="clinic-outcome-grid"><div className="clinic-mini-stat"><span>السعر السنوي</span><strong>{isSubscribed?`${plan.annualPrice.toLocaleString('ar-SA')} ر.س`:'0 ر.س'}</strong></div><div className="clinic-mini-stat"><span>رسوم التأسيس</span><strong>{isSubscribed?`${plan.setupFee.toLocaleString('ar-SA')} ر.س`:'—'}</strong></div><div className="clinic-mini-stat"><span>دورة الاستخدام</span><strong style={{fontSize:15}}>{usageCycleStart&&usageCycleEnd?`${usageCycleStart} - ${usageCycleEnd}`:'تبدأ بعد التفعيل'}</strong></div><div className="clinic-mini-stat"><span>انتهاء الاشتراك</span><strong style={{fontSize:15}}>{subscriptionEndDate||'غير مفعّل'}</strong></div></div></div>
    <div className="clinic-two-col"><div className="clinic-card clinic-section"><div className="clinic-section-head"><div><h2>استخدام هذا الشهر</h2><p>النسبة العامة تعتمد على أقرب حد للاكتمال.</p></div><strong style={{font:'800 24px Sora,Cairo'}}>{overall}%</strong></div>{metrics.map(m=>{const p=usagePercentage(m);return <div className="clinic-usage-row" key={m.key}><div className="clinic-usage-meta"><span>{m.label}</span><strong>{m.used.toLocaleString('ar-SA')} / {m.limit ? m.limit.toLocaleString('ar-SA') : 'غير مفعّل'}</strong></div><div className="clinic-progress"><span style={{width:`${p}%`,background:p>=100?'#d44b5c':p>=80?'#c77a18':'#0f9f78'}}/></div></div>})}<p className="clinic-note">استخدامك الشهري ضمن الحد المسموح.</p></div>
    <div className="clinic-card clinic-section"><div className="clinic-section-head"><h2>{packageType==='whatsapp'?'فعّل الاتصال الذكي':'أنت على أعلى باقة'}</h2></div><p className="clinic-muted" style={{lineHeight:1.9}}>{packageType==='whatsapp'?'لا تخسر المكالمات خارج الدوام أو وقت انشغال الموظفين. الاتصال الذكي يحول المكالمات إلى حجوزات.':'الباقة الحالية تشمل واتساب، الاتصال الذكي، إنقاذ المكالمات الفائتة، والدعم الأولوي.'}</p>{packageType==='whatsapp'&&<Link className="clinic-action" to="/clinic-os/dashboard/plans">عرض الباقات</Link>}</div></div>
  </div>
}

const knowledgeTabs = ['معلومات العيادة','الأطباء','الخدمات والأسعار','أوقات العمل','الفروع','الأسئلة الشائعة','سياسة الحجز والإلغاء','طرق الدفع','العروض']
export const KnowledgeCenterPage = () => {
  const [tab,setTab] = useState(knowledgeTabs[0])
  const content = useMemo(()=>({
    'معلومات العيادة':['اسم العيادة','وصف مختصر','رقم التواصل','الموقع ورابط الخريطة'],
    'الأطباء':['د. سارة الحربي — أسنان عامة','د. أحمد الزهراني — تركيبات وزراعة','د. نورة القحطاني — تقويم'],
    'الخدمات والأسعار':['كشف عام — 150 ر.س','تنظيف الأسنان — 250 ر.س','استشارة تقويم — 200 ر.س'],
    'أوقات العمل':['الأحد إلى الخميس: 9 ص - 10 م','السبت: 2 م - 10 م','الجمعة: مغلق'],
  } as Record<string,string[]>)[tab] || ['أضف المعلومات التي يحتاجها موظف الاستقبال الذكي للإجابة بدقة.'],[tab])
  return <div className="clinic-ai-page"><PageHeader title="مركز المعرفة" subtitle="حدّث المعلومات التي يعتمد عليها موظف الاستقبال الذكي عند الرد والحجز."/><div className="clinic-card"><div className="clinic-tabbar">{knowledgeTabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`clinic-tab ${tab===t?'active':''}`}>{t}</button>)}</div><div className="clinic-section"><div className="clinic-section-head"><div><h2>{tab}</h2><p>تظهر هذه المعلومات للعميل بصياغة واضحة أثناء المحادثة.</p></div><button className="clinic-action">حفظ التغييرات</button></div><div className="clinic-form-grid">{content.map((v,i)=><div className="clinic-field" key={i}><label>{tab} {i+1}</label><input defaultValue={v}/></div>)}</div></div></div></div>
}

export const BookingsPage = () => {
  const navigate = useNavigate()
  return <div className="clinic-ai-page"><PageHeader title="الحجوزات" subtitle="الحجوزات التي أنجزها النظام أو أضافها فريق العيادة، مع مصدر كل حجز وحالته." action={<button className="clinic-action" onClick={()=>navigate('/clinic-os/dashboard/appointments')}>إضافة موعد</button>}/><div className="clinic-filter-row">{['اليوم','هذا الأسبوع','هذا الشهر','مؤكد','بانتظار التأكيد','يحتاج مراجعة','ملغي'].map((f,i)=><button className={`clinic-filter ${i===0?'active':''}`} key={f}>{f}</button>)}</div><div className="clinic-card clinic-section"><div className="clinic-list">{DEMO_SMART_CALLS.concat([{name:'عائشة المطيري',phone:'050 234 5678',duration:'—',reason:'تنظيف أسنان',summary:'موعد اليوم 9:40 ص',status:'مؤكد',booked:true,date:'اليوم'}]).map((r,i)=><div className="clinic-list-row" key={i}><div><strong>{r.name}</strong><div className="clinic-muted">{r.phone}</div></div><div>{r.reason}</div><div>{r.date}</div><span className="clinic-badge success">{r.status}</span><button className="clinic-action secondary">عرض التفاصيل</button></div>)}</div></div></div>
}
