import { useState, type ReactNode } from 'react'
import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { Bot, Check, CheckCheck, Eye, Headphones, MessageCircle, Phone, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { CLINIC_PLANS } from '../../../lib/clinicOSProduct'
import type { PackageType } from '../../../types/clinicOS'
import './clinic-ai-dashboard.css'

const comparison = [
  ['محادثات واتساب شهرياً', '0', '1,500', '2,500'],
  ['ردود المساعد الذكي', '0', '3,000', '5,000'],
  ['تذكيرات المواعيد', '0', '500', '700'],
  ['دقائق الاتصال الذكي', 'غير متاحة', 'غير متاحة', '300 دقيقة'],
  ['استعادة المكالمات الفائتة', 'غير متاحة', 'غير متاحة', 'مشمولة'],
  ['الدعم', 'غير مشمول', 'أساسي', 'أولوية'],
]

const freeFeatures = ['تصفح الداشبورد', 'معاينة طريقة عمل النظام', 'اختيار الباقة المناسبة']
const whatsappFeatures = ['استقبال الاستفسارات عبر واتساب','الإجابة من مركز معرفة العيادة','تحويل المحادثات إلى حجوزات','متابعة العملاء والفرص غير المكتملة','تحويل الحالات التي تحتاج موظفاً','التقارير والدعم الأساسي']
const smartFeatures = ['جميع مزايا باقة واتساب','استقبال المكالمات بالذكاء الاصطناعي','العمل خارج أوقات الدوام','تحويل المكالمات إلى حجوزات','استعادة المكالمات الفائتة','ملخص المكالمة ودعم أولوي']

export const PlansPage = () => {
  const { packageType, clinicName, companyId, isSubscribed } = useClinicOS()
  const [confirming, setConfirming] = useState<PackageType | null>(null)
  const currentIsWhatsapp = isSubscribed && packageType === 'whatsapp'
  const currentIsPro = isSubscribed && packageType === 'ai_pro'
  const requested = confirming ? CLINIC_PLANS[confirming] : null
  const requestedName = confirming === 'whatsapp' ? 'واتساب AI' : 'AI Pro (واتساب + اتصال ذكي)'

  const sendRequest = () => {
    if (!confirming || !requested) return
    const currentName = isSubscribed ? CLINIC_PLANS[packageType].name : 'Free'
    const total = requested.annualPrice + requested.setupFee
    const message = `مرحباً، نرغب في تثبيت اشتراك حساب ${clinicName || 'العيادة'} من ${currentName} إلى باقة ${requestedName}. معرّف الشركة: ${companyId || 'غير متوفر'}. اطلعنا على رسوم التأسيس ${requested.setupFee.toLocaleString('en-US')} ر.س والسعر السنوي ${requested.annualPrice.toLocaleString('en-US')} ر.س وإجمالي السنة الأولى ${total.toLocaleString('en-US')} ر.س. نرجو مراجعة الطلب والتواصل معنا لإتمام التفعيل.`
    window.open(`https://wa.me/966546666005?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setConfirming(null)
  }

  return <div className="clinic-ai-page clinic-plans-page">
    <div className="clinic-ai-header clinic-pricing-heading"><div><span className="clinic-pricing-eyebrow"><Bot size={14}/> موظف استقبال ذكي لعيادتك</span><h1>اختر مستوى التشغيل المناسب</h1><p>ابدأ بالمعاينة، ثم فعّل واتساب أو أضف المكالمات الذكية. الأسعار واضحة والتفعيل يتم بعد مراجعة إدارة مدار.</p></div><span className="clinic-status-pill"><ShieldCheck size={14}/> تفعيل يدوي وآمن بعد تأكيدك</span></div>
    <div className="clinic-pricing-frame">
      <div className="clinic-plan-grid">
        <PlanCard index={0} icon={Eye} name="Free" kicker="للمعاينة" description="استكشف الداشبورد وتعرّف على سير العمل قبل تثبيت أي اشتراك." annual={0} setup={0} features={freeFeatures} current={!isSubscribed}/>
        <PlanCard index={1} icon={MessageCircle} name="WhatsApp AI" kicker="استقبال وحجوزات" description="موظف استقبال ذكي يدير المحادثات والحجوزات والمتابعة عبر واتساب." annual={CLINIC_PLANS.whatsapp.annualPrice} setup={CLINIC_PLANS.whatsapp.setupFee} features={whatsappFeatures} current={currentIsWhatsapp} footer={currentIsPro?<p className="clinic-plan-note">للتغيير إلى باقة أقل، تواصل مع الإدارة قبل موعد التجديد.</p>:<button className="clinic-plan-cta" onClick={()=>setConfirming('whatsapp')}><Check size={16}/>{isSubscribed?'تغيير الاشتراك':'تثبيت الاشتراك'}</button>}/>
        <PlanCard index={2} icon={Headphones} name="AI Pro" kicker="واتساب + اتصال ذكي" description="منظومة استقبال كاملة تنقذ المكالمات وتحولها إلى حجوزات قابلة للمتابعة." annual={CLINIC_PLANS.ai_pro.annualPrice} setup={CLINIC_PLANS.ai_pro.setupFee} features={smartFeatures} current={currentIsPro} highlighted badge="الأكثر اكتمالاً" footer={!currentIsPro?<button className="clinic-plan-cta" onClick={()=>setConfirming('ai_pro')}><Sparkles size={16}/>{isSubscribed?'ترقية الاشتراك':'تثبيت الاشتراك'}</button>:undefined}/>
      </div>
    </div>
    <div className="clinic-pricing-assurance"><ShieldCheck size={17}/><span><strong>السعر يشمل إعداد النظام واختباره وربطه ببيانات العيادة.</strong> رسوم التأسيس تُدفع مرة واحدة، والاشتراك السنوي يغطي التشغيل والدعم وحدود الاستخدام الموضحة.</span></div>
    <section className="clinic-card clinic-section clinic-plan-comparison"><div className="clinic-section-head"><div><h2>مقارنة سريعة</h2><p>الحدود الشهرية والخدمات الأساسية لكل باقة.</p></div></div><div className="clinic-comparison-table"><div className="clinic-comparison-row header"><strong>الميزة</strong><strong>Free</strong><strong>واتساب</strong><strong>واتساب + اتصال ذكي</strong></div>{comparison.map(([label,free,basic,advanced])=><div className="clinic-comparison-row" key={label}><strong>{label}</strong><span>{free}</span><span>{basic}</span><span>{advanced}</span></div>)}</div></section>
    {confirming&&requested&&<div className="clinic-plan-modal-backdrop" role="presentation" onMouseDown={()=>setConfirming(null)}><div className="clinic-plan-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onMouseDown={event=>event.stopPropagation()}><button className="clinic-plan-modal-close" aria-label="إغلاق" onClick={()=>setConfirming(null)}><X size={18}/></button><div className="clinic-lock-icon"><Phone size={25}/></div><h2 id="upgrade-title">راجع طلب تثبيت الاشتراك</h2><p className="clinic-muted">سيتم إرسال الطلب إلى إدارة مدار للمراجعة والتواصل معك.</p><div className="clinic-upgrade-summary"><div><span>العيادة</span><strong>{clinicName||'اسم العيادة'}</strong></div><div><span>الباقة الحالية</span><strong>{isSubscribed?CLINIC_PLANS[packageType].name:'Free'}</strong></div><div><span>الباقة المطلوبة</span><strong>{requestedName}</strong></div><div><span>السعر السنوي</span><strong>{requested.annualPrice.toLocaleString('en-US')} ر.س</strong></div><div><span>رسوم التأسيس</span><strong>{requested.setupFee.toLocaleString('en-US')} ر.س</strong></div><div className="total"><span>إجمالي السنة الأولى</span><strong>{(requested.annualPrice+requested.setupFee).toLocaleString('en-US')} ر.س</strong></div></div><p className="clinic-note">لن تتغير باقتك قبل مراجعة الطلب وتأكيد التفعيل من إدارة مدار.</p><div className="clinic-modal-actions"><button className="clinic-action secondary" onClick={()=>setConfirming(null)}>رجوع</button><button className="clinic-action" onClick={sendRequest}>إرسال طلب تثبيت الاشتراك</button></div></div></div>}
  </div>
}

const PlanCard=({index,icon:Icon,name,kicker,description,annual,setup,features,current,highlighted,badge,footer}:{index:number;icon:typeof MessageCircle;name:string;kicker:string;description:string;annual:number;setup:number;features:string[];current:boolean;highlighted?:boolean;badge?:string;footer?:ReactNode})=><motion.article initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.42,delay:index*.08}} className={`clinic-plan-card ${highlighted?'featured':''} ${current?'current':''}`}>
  {highlighted&&<div className="clinic-plan-popular"><Sparkles size={13}/>{badge}</div>}
  <div className="clinic-plan-topline"><div className="clinic-plan-icon"><Icon size={21}/></div>{current&&<span className="clinic-badge success">الباقة الحالية</span>}</div>
  <div className="clinic-plan-price"><strong><NumberFlow value={annual} locales="en-US"/></strong><span>ر.س / سنة</span></div>
  <small className="clinic-plan-kicker">{kicker}</small><h2>{name}</h2><p>{description}</p>
  <div className="clinic-plan-setup"><span>رسوم تأسيس لمرة واحدة</span><strong>{setup.toLocaleString('en-US')} ر.س</strong></div>
  <div className="clinic-plan-includes"><strong>{annual===0?'يشمل الحساب المجاني:':'تشمل الباقة:'}</strong><ul>{features.map(feature=><li key={feature}><span><CheckCheck size={14}/></span><em>{feature}</em></li>)}</ul></div>
  <div className="clinic-plan-first-year"><span>إجمالي السنة الأولى</span><strong>{(annual+setup).toLocaleString('en-US')} ر.س</strong></div>
  <div className="clinic-plan-footer">{current?<button className="clinic-plan-current" disabled><Check size={16}/> باقتك الحالية</button>:footer}</div>
</motion.article>
