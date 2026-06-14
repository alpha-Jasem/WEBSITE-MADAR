import { useState, type ReactNode } from 'react'
import { Check, Headphones, MessageCircle, Phone, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { CLINIC_PLANS } from '../../../lib/clinicOSProduct'
import './clinic-ai-dashboard.css'

const comparison = [
  ['محادثات واتساب شهرياً', '1,500', '2,500'],
  ['ردود المساعد الذكي', '3,000', '5,000'],
  ['تذكيرات المواعيد', '500', '700'],
  ['دقائق الاتصال الذكي', 'غير متاحة', '300 دقيقة'],
  ['استعادة المكالمات الفائتة', 'غير متاحة', 'مشمولة'],
  ['الدعم', 'أساسي', 'أولوية'],
]

const whatsappFeatures = [
  'استقبال الاستفسارات عبر واتساب',
  'الإجابة من مركز معرفة العيادة',
  'تحويل المحادثات إلى حجوزات',
  'متابعة العملاء والفرص غير المكتملة',
  'تحويل الحالات التي تحتاج موظفاً',
  'التقارير والدعم الأساسي',
]

const smartFeatures = [
  'جميع مزايا باقة واتساب',
  'استقبال المكالمات بالذكاء الاصطناعي',
  'العمل خارج أوقات الدوام',
  'تحويل المكالمات إلى حجوزات',
  'استعادة المكالمات الفائتة',
  'ملخص المكالمة ودعم أولوي',
]

export const PlansPage = () => {
  const { packageType, clinicName, companyId } = useClinicOS()
  const [confirming, setConfirming] = useState(false)
  const currentIsPro = packageType === 'ai_pro'
  const pro = CLINIC_PLANS.ai_pro

  const sendUpgrade = () => {
    const message = `مرحباً، نرغب في ترقية حساب ${clinicName || 'العيادة'} من باقة WhatsApp AI Receptionist إلى باقة AI Receptionist + Smart Calls. معرّف الشركة: ${companyId || 'غير متوفر'}. اطلعنا على رسوم التأسيس 5,000 ر.س والسعر السنوي 27,000 ر.س وإجمالي السنة الأولى 32,000 ر.س. نرجو مراجعة الطلب والتواصل معنا لإتمام التحويل.`
    window.open(`https://wa.me/966546666005?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setConfirming(false)
  }

  return <div className="clinic-ai-page clinic-plans-page">
    <div className="clinic-ai-header">
      <div><h1>الباقات</h1><p>قارن الخدمات والحدود والتكلفة بوضوح قبل إرسال طلب الترقية.</p></div>
      <span className="clinic-status-pill"><ShieldCheck size={14}/> لا يتم تغيير الباقة دون تأكيد الإدارة</span>
    </div>

    <div className="clinic-plan-grid">
      <PlanCard
        icon={MessageCircle}
        name="WhatsApp AI Receptionist"
        description="موظف استقبال ذكي يدير محادثات واتساب والحجوزات والمتابعة طوال اليوم."
        annual={CLINIC_PLANS.whatsapp.annualPrice}
        setup={CLINIC_PLANS.whatsapp.setupFee}
        features={whatsappFeatures}
        current={!currentIsPro}
        footer={currentIsPro ? <p className="clinic-plan-note">للتغيير إلى باقة أقل، تواصل مع الإدارة قبل موعد التجديد.</p> : undefined}
      />
      <PlanCard
        icon={Headphones}
        name="AI Receptionist + Smart Calls"
        description="واتساب واتصال ذكي في منظومة واحدة لإنقاذ المكالمات وتحويلها إلى حجوزات."
        annual={pro.annualPrice}
        setup={pro.setupFee}
        features={smartFeatures}
        current={currentIsPro}
        highlighted
        badge="تشمل المكالمات الذكية"
        footer={!currentIsPro ? <button className="clinic-plan-cta" onClick={() => setConfirming(true)}><Sparkles size={16}/>طلب الترقية إلى المكالمات الذكية</button> : undefined}
      />
    </div>

    <section className="clinic-card clinic-section clinic-plan-comparison">
      <div className="clinic-section-head"><div><h2>مقارنة سريعة</h2><p>الحدود الشهرية والخدمات الأساسية لكل باقة.</p></div></div>
      <div className="clinic-comparison-table">
        <div className="clinic-comparison-row header"><strong>الميزة</strong><strong>واتساب</strong><strong>واتساب + اتصال ذكي</strong></div>
        {comparison.map(([label, basic, advanced]) => <div className="clinic-comparison-row" key={label}><strong>{label}</strong><span>{basic}</span><span>{advanced}</span></div>)}
      </div>
    </section>

    {confirming && <div className="clinic-plan-modal-backdrop" role="presentation" onMouseDown={() => setConfirming(false)}>
      <div className="clinic-plan-modal" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onMouseDown={event => event.stopPropagation()}>
        <button className="clinic-plan-modal-close" aria-label="إغلاق" onClick={() => setConfirming(false)}><X size={18}/></button>
        <div className="clinic-lock-icon"><Phone size={25}/></div>
        <h2 id="upgrade-title">راجع طلب الترقية</h2>
        <p className="clinic-muted">سيتم إرسال الطلب إلى إدارة مدار للمراجعة والتواصل معك.</p>
        <div className="clinic-upgrade-summary">
          <div><span>العيادة</span><strong>{clinicName || 'اسم العيادة'}</strong></div>
          <div><span>الباقة الحالية</span><strong>WhatsApp AI Receptionist</strong></div>
          <div><span>الباقة المطلوبة</span><strong>AI Receptionist + Smart Calls</strong></div>
          <div><span>السعر السنوي</span><strong>27,000 ر.س</strong></div>
          <div><span>رسوم التأسيس</span><strong>5,000 ر.س</strong></div>
          <div className="total"><span>إجمالي السنة الأولى</span><strong>32,000 ر.س</strong></div>
        </div>
        <p className="clinic-note">لن تتغير باقتك قبل مراجعة الطلب وتأكيد التحويل من إدارة مدار.</p>
        <div className="clinic-modal-actions"><button className="clinic-action secondary" onClick={() => setConfirming(false)}>رجوع</button><button className="clinic-action" onClick={sendUpgrade}>إرسال طلب الترقية</button></div>
      </div>
    </div>}
  </div>
}

const PlanCard = ({ icon: Icon, name, description, annual, setup, features, current, highlighted, badge, footer }:{
  icon: typeof MessageCircle; name:string; description:string; annual:number; setup:number; features:string[]; current:boolean; highlighted?:boolean; badge?:string; footer?:ReactNode
}) => <article className={`clinic-plan-card ${highlighted ? 'featured' : ''} ${current ? 'current' : ''}`}>
  <div className="clinic-plan-card-head"><div className="clinic-plan-icon"><Icon size={21}/></div><div>{current && <span className="clinic-badge success">باقتك الحالية</span>}{!current && badge && <span className="clinic-badge">{badge}</span>}<h2>{name}</h2></div></div>
  <p>{description}</p>
  <div className="clinic-plan-prices"><div><span>السعر السنوي</span><strong>{annual.toLocaleString('en-US')} <small>ر.س</small></strong></div><div><span>رسوم التأسيس لمرة واحدة</span><strong>{setup.toLocaleString('en-US')} <small>ر.س</small></strong></div></div>
  <div className="clinic-plan-first-year"><span>إجمالي السنة الأولى</span><strong>{(annual + setup).toLocaleString('en-US')} ر.س</strong></div>
  <ul>{features.map(feature => <li key={feature}><Check size={15}/><span>{feature}</span></li>)}</ul>
  {current ? <button className="clinic-plan-current" disabled>باقتك الحالية</button> : footer}
</article>
