import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft, Bell, Bot, CalendarDays, Check, ChevronDown, Clock3,
  FileBarChart, Menu, MessageSquare, Phone, ShieldCheck, Sparkles,
  Stethoscope, UserRound, Users, X,
} from 'lucide-react'
import './clinicOS/clinic-os-landing.css'

const PHONE = '966546666005'

const navItems = [
  ['product', 'النظام'],
  ['workflow', 'كيف يعمل'],
  ['features', 'المزايا'],
  ['faq', 'الأسئلة'],
]

const workflow = [
  { icon: MessageSquare, title: 'يصل طلب المريض', text: 'يبدأ الحجز من موظف الاستقبال أو من قناة الحجز المتاحة للعيادة.' },
  { icon: CalendarDays, title: 'يتأكد الموعد', text: 'يظهر الموعد مباشرة في الجدول مع الطبيب والخدمة وحالة التأكيد.' },
  { icon: Stethoscope, title: 'يُدار يوم العيادة', text: 'يعرف الفريق من حضر، ومن ينتظر، وما يحتاج إلى متابعة دون فوضى.' },
  { icon: FileBarChart, title: 'تتضح النتائج', text: 'تقارير تشغيلية تساعد الإدارة على متابعة المواعيد والأداء واتخاذ القرار.' },
]

const features = [
  { icon: CalendarDays, title: 'مواعيد واضحة', text: 'جدول يومي وأسبوعي منظم، مع حالات مفهومة لكل موعد.' },
  { icon: Users, title: 'ملف مريض واحد', text: 'بيانات المريض، زياراته وملاحظاته في مكان يسهل الرجوع إليه.' },
  { icon: UserRound, title: 'تنظيم الأطباء', text: 'جداول الأطباء والخدمات المتاحة بدون تضارب أو بحث طويل.' },
  { icon: MessageSquare, title: 'متابعة الرسائل', text: 'سجل موحد للتأكيدات والتذكيرات ومتابعة الحالات التي تحتاج تدخلاً.' },
  { icon: Bot, title: 'حجز ذكي اختياري', text: 'مسار إضافي يمكن تفعيله للعيادة عند جاهزية قنواتها الرسمية.' },
  { icon: FileBarChart, title: 'تقارير مفيدة', text: 'قراءة عملية للحجوزات والحضور والخدمات بدلاً من أرقام مبعثرة.' },
]

const faqs = [
  ['هل أحتاج إلى تغيير طريقة عمل العيادة؟', 'لا. يبدأ النظام من سير العمل الحالي، ثم يجمع المواعيد والمرضى والأطباء والتقارير في واجهة واحدة أوضح.'],
  ['هل يمكنني مشاهدة النظام قبل الاشتراك؟', 'نعم. الديمو يوضح شكل التشغيل داخل المنصة، ويمكن بعدها إنشاء حساب للعيادة وتجهيز البيانات الأساسية.'],
  ['هل الحجز الذكي إلزامي؟', 'لا. هو ميزة اختيارية. يمكن استخدام Clinic OS لإدارة التشغيل أولاً ثم تفعيل القنوات الذكية عند الحاجة.'],
  ['هل يعمل على الجوال والكمبيوتر؟', 'نعم. الواجهة مصممة للاستخدام اليومي على الكمبيوتر والتابلت والجوال.'],
]

function DashboardPreview() {
  const side = [
    ['الرئيسية', 'active'], ['المواعيد', ''], ['المرضى', ''], ['الأطباء', ''],
    ['الخدمات', ''], ['التقويم', ''], ['الرسائل', ''], ['الحجز الذكي', ''], ['التقارير', ''],
  ]
  return (
    <div className="clinic-preview" aria-label="معاينة واجهة Clinic OS">
      <aside className="preview-sidebar">
        <div className="preview-brand"><span><Stethoscope size={16} /></span><b>Clinic OS</b></div>
        <button className="preview-add">+ موعد جديد</button>
        <nav>{side.map(([label, state], index) => <span className={state} key={label}><i>{index + 1}</i>{label}</span>)}</nav>
        <div className="preview-plan"><small>حالة النظام</small><strong>جاهز للتشغيل</strong></div>
      </aside>
      <main className="preview-main">
        <header className="preview-topbar">
          <div><small>الخميس، 12 يونيو</small><strong>نظرة عامة على اليوم</strong></div>
          <div className="preview-actions"><span><Bell size={14} /></span><b>مدير العيادة</b></div>
        </header>
        <section className="preview-kpis">
          <article><small>مواعيد اليوم</small><strong>12</strong><em>9 مؤكدة</em></article>
          <article><small>بانتظار التأكيد</small><strong>2</strong><em>تحتاج متابعة</em></article>
          <article><small>المرضى الجدد</small><strong>4</strong><em>هذا الأسبوع</em></article>
          <article><small>نسبة الحضور</small><strong>86%</strong><em>آخر 30 يوماً</em></article>
        </section>
        <section className="preview-grid">
          <article className="preview-schedule">
            <div className="preview-section-title"><b>مواعيد اليوم</b><span>عرض الكل</span></div>
            {[
              ['09:00', 'سارة محمد', 'تنظيف أسنان', 'تم الحضور'],
              ['10:30', 'أحمد خالد', 'فحص واستشارة', 'مؤكد'],
              ['12:00', 'نورة علي', 'متابعة علاج', 'بانتظار التأكيد'],
              ['01:30', 'محمد سالم', 'حشوة تجميلية', 'مؤكد'],
            ].map((row, index) => <div className="preview-appointment" key={row[0]}><time>{row[0]}</time><span className="preview-avatar">{row[1][0]}</span><div><b>{row[1]}</b><small>{row[2]}</small></div><em className={index === 2 ? 'waiting' : ''}>{row[3]}</em></div>)}
          </article>
          <div className="preview-side-column">
            <article className="preview-doctors"><div className="preview-section-title"><b>الأطباء اليوم</b><span>3 متاحون</span></div><div className="doctor-row"><span>د</span><div><b>د. ريم العتيبي</b><small>طب الأسنان العام</small></div><em>5 مواعيد</em></div><div className="doctor-row"><span>د</span><div><b>د. عمر الحربي</b><small>تقويم الأسنان</small></div><em>4 مواعيد</em></div></article>
            <article className="preview-reminder"><Sparkles size={18} /><div><b>تحتاج انتباهك</b><p>موعدان بانتظار التأكيد قبل الظهر.</p></div><button>مراجعة</button></article>
          </div>
        </section>
      </main>
    </div>
  )
}

export const ClinicOSLanding = () => {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    document.title = 'Clinic OS من مدار | تشغيل العيادة بوضوح'
    const description = 'Clinic OS من مدار يجمع مواعيد العيادة والمرضى والأطباء والتذكيرات والتقارير في واجهة تشغيل عربية واحدة.'
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = description
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (id: string) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' })
  }
  const openWhatsApp = () => window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent('مرحباً، أريد معرفة المزيد عن Clinic OS للعيادات.')}`, '_blank', 'noopener,noreferrer')
  const reveal = reduceMotion ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.55 } }

  return (
    <div className="clinic-site" dir="rtl">
      <header className={`clinic-public-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <button className="clinic-public-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="العودة للأعلى">
          <img src="/logo-main.png" alt="مدار" /><span><b>Clinic OS</b><small>من مدار</small></span>
        </button>
        <nav className={menuOpen ? 'open' : ''}>{navItems.map(([id, label]) => <button key={id} onClick={() => go(id)}>{label}</button>)}</nav>
        <div className="clinic-nav-actions"><button className="text-button" onClick={() => navigate('/clinic-os/login')}>تسجيل الدخول</button><button className="nav-cta" onClick={() => navigate('/clinic-os/signup')}>إنشاء حساب</button></div>
        <button className="clinic-menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="القائمة">{menuOpen ? <X /> : <Menu />}</button>
      </header>

      <main>
        <section className="clinic-hero">
          <img className="clinic-hero-image" src="/clinic-os-hero-reception.png" alt="استقبال عيادة سعودية حديثة" />
          <div className="clinic-hero-veil" />
          <motion.div className="clinic-hero-copy" initial={reduceMotion ? undefined : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="clinic-eyebrow"><Sparkles size={15} /> نظام تشغيل يومي للعيادات</span>
            <h1>كل موعد في مكانه.<br /><em>وكل يوم في عيادتك تحت السيطرة.</em></h1>
            <p>نظّم المواعيد والمرضى والأطباء والتذكيرات والتقارير من شاشة واحدة، واعرف ما يحتاج انتباهك قبل أن يتحول إلى فوضى.</p>
            <div className="clinic-hero-buttons"><button className="primary-button" onClick={() => navigate('/clinic-os/demo')}>جرّب الداشبورد <ArrowLeft size={17} /></button><button className="secondary-button" onClick={() => navigate('/clinic-os/signup')}>إنشاء حساب عيادة</button></div>
            <div className="clinic-live-strip"><span><i /> 12 موعد اليوم</span><span>9 مؤكدة</span><span>2 بانتظار التأكيد</span></div>
          </motion.div>
          <button className="clinic-scroll-cue" onClick={() => go('product')}><span>اكتشف النظام</span><ChevronDown /></button>
        </section>

        <section id="product" className="clinic-product-section">
          <motion.div className="section-heading" {...reveal}><span>المنتج الحقيقي</span><h2>نفس واجهة التشغيل التي يستخدمها فريق العيادة</h2><p>المعاينة مبنية من مكونات المنصة نفسها، حتى ترى شكل العمل قبل إنشاء الحساب.</p></motion.div>
          <motion.div className="dashboard-stage" {...reveal}><DashboardPreview /></motion.div>
          <div className="product-proof"><span><ShieldCheck /> صلاحيات واضحة لكل مستخدم</span><span><Clock3 /> متابعة يوم العمل لحظياً</span><span><FileBarChart /> تقارير قابلة للقراءة</span></div>
        </section>

        <section id="workflow" className="clinic-workflow-section">
          <motion.div className="section-heading" {...reveal}><span>من الطلب إلى التقرير</span><h2>مسار واحد يفهمه كل الفريق</h2><p>كل خطوة لها مكان واضح، فلا تضيع المواعيد بين المحادثات والدفاتر.</p></motion.div>
          <div className="workflow-line">{workflow.map((item, index) => { const Icon = item.icon; return <motion.article key={item.title} {...reveal}><i>{index + 1}</i><span><Icon /></span><h3>{item.title}</h3><p>{item.text}</p></motion.article> })}</div>
        </section>

        <section id="features" className="clinic-features-section">
          <motion.div className="section-heading align-start" {...reveal}><span>تشغيل أهدأ</span><h2>ما يحتاجه مدير العيادة، بدون ازدحام أدوات</h2></motion.div>
          <div className="features-grid">{features.map(item => { const Icon = item.icon; return <motion.article key={item.title} {...reveal}><span><Icon /></span><div><h3>{item.title}</h3><p>{item.text}</p></div><Check /></motion.article> })}</div>
        </section>

        <section className="clinic-decision-section">
          <motion.div className="decision-copy" {...reveal}><span>ابدأ بالأساس، ثم توسّع</span><h2>نجهز العيادة على تشغيلها الحقيقي</h2><p>ابدأ بإدارة المواعيد والمرضى والأطباء والتقارير. ثم فعّل الحجز الذكي والتكاملات عندما تحتاجها.</p><div><button className="primary-button" onClick={() => navigate('/clinic-os/signup')}>ابدأ إعداد العيادة <ArrowLeft size={17} /></button><button className="whatsapp-button" onClick={openWhatsApp}><Phone size={17} /> تحدث معنا</button></div></motion.div>
          <motion.div className="decision-list" {...reveal}>{['إعداد الحساب والبيانات الأساسية', 'تجربة واجهة التشغيل قبل القرار', 'تفعيل المزايا حسب احتياج العيادة', 'دعم واضح أثناء التجهيز'].map((text, index) => <div key={text}><span>{index + 1}</span><b>{text}</b><Check /></div>)}</motion.div>
        </section>

        <section id="faq" className="clinic-faq-section">
          <motion.div className="section-heading" {...reveal}><span>قبل أن تبدأ</span><h2>إجابات واضحة على الأسئلة المهمة</h2></motion.div>
          <div className="faq-list">{faqs.map(([q, a], index) => <article className={openFaq === index ? 'open' : ''} key={q}><button onClick={() => setOpenFaq(openFaq === index ? null : index)}><b>{q}</b><ChevronDown /></button><div><p>{a}</p></div></article>)}</div>
        </section>

        <section className="clinic-final-cta"><motion.div {...reveal}><span>Clinic OS من مدار</span><h2>شاهد يوم عيادتك من شاشة واحدة.</h2><p>جرّب الداشبورد، ثم أنشئ حساب العيادة عندما تكون جاهزاً.</p><div><button onClick={() => navigate('/clinic-os/demo')}>فتح الديمو</button><button onClick={() => navigate('/clinic-os/signup')}>إنشاء حساب</button></div></motion.div></section>
      </main>

      <footer className="clinic-public-footer"><div><img src="/logo-main.png" alt="مدار" /><p>منصة عربية لتنظيم تشغيل العيادات بوضوح.</p></div><nav><button onClick={() => navigate('/clinic-os/demo')}>الديمو</button><button onClick={() => navigate('/clinic-os/login')}>تسجيل الدخول</button><button onClick={openWhatsApp}>واتساب</button></nav><small>© 2026 مدار. جميع الحقوق محفوظة.</small></footer>
    </div>
  )
}
