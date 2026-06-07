import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bot, Calendar, MessageSquare, Users, Clock, CheckCircle, Star,
  ArrowLeft, Phone, Shield, TrendingUp, Zap, ChevronDown, ChevronUp
} from 'lucide-react'
import { ClinicDashMockup } from '../components/public/ClinicDashMockup'

const PHONE = '966546666005'

const OUTCOMES = [
  { icon: Clock, value: '٧٨٪', label: 'تقليل المواعيد الفائتة', sub: 'بفضل التذكيرات التلقائية عبر واتساب' },
  { icon: TrendingUp, value: '٣×', label: 'زيادة الحجوزات', sub: 'حجز ذكي على مدار الساعة بدون موظف' },
  { icon: Clock, value: '٣ ساعات', label: 'توفير يومي', sub: 'وقت الاستقبال الذي يُحرَّر لرعاية المريض' },
  { icon: Users, value: '٩٥٪', label: 'رضا المرضى', sub: 'تجربة احترافية من أول تواصل حتى الزيارة' },
]

const HOW_STEPS = [
  {
    num: '١',
    title: 'المريض يتواصل عبر واتساب',
    body: 'يرسل المريض رسالة في أي وقت — ليلاً، في عطلة نهاية الأسبوع، أو بين المواعيد. النظام يرد فوراً.',
    color: '#4F46E5',
  },
  {
    num: '٢',
    title: 'وكيل الحجز الذكي يرتب كل شيء',
    body: 'يسأل عن الخدمة والطبيب والوقت المفضل، يتحقق من التوافر، ويحجز الموعد مباشرة في جدول العيادة.',
    color: '#10B981',
  },
  {
    num: '٣',
    title: 'تأكيد تلقائي وتذكيرات ذكية',
    body: 'يصل التأكيد لحظياً. يصل تذكير قبل ٢٤ ساعة وقبل ٣ ساعات. وإذا لم يُؤكد المريض — يعرض بديلاً من قائمة الانتظار.',
    color: '#7C3AED',
  },
]

const PRICING = [
  {
    id: 'whatsapp',
    name: 'باقة واتساب',
    price: '٩,٩٩٩',
    period: 'سنة',
    badge: 'عرض إطلاق',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    color: '#4F46E5',
    features: [
      'حجز مباشر عبر واتساب ٢٤/٧',
      'تأكيدات وتذكيرات تلقائية',
      'إدارة المرضى والمواعيد',
      'جدول أطباء متكامل',
      'قائمة انتظار ذكية',
      'سجل رسائل واتساب',
      'تقارير الحجوزات الأسبوعية',
      'دعم إعداد كامل',
    ],
    locked: ['وكيل AI للمكالمات الصوتية', 'تحليلات AI المتقدمة'],
    cta: 'اشترك في باقة واتساب',
    ctaBg: '#4F46E5',
  },
  {
    id: 'ai_pro',
    name: 'باقة AI Voice + واتساب',
    price: '١٦,٩٩٩',
    period: 'سنة',
    badge: 'الأكثر طلباً',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    color: '#7C3AED',
    recommended: true,
    features: [
      'كل مزايا باقة واتساب',
      'وكيل AI للمكالمات الصوتية',
      'تحويل المكالمات لحجوزات تلقائياً',
      'تحليلات AI وتقارير ذكية',
      'نسخ ومراجعة المحادثات',
      'قائمة انتظار ذكية بأولوية AI',
      'اكتشاف تعارضات المواعيد تلقائياً',
      'مدير حساب مخصص',
    ],
    locked: [],
    cta: 'اشترك في باقة AI Voice',
    ctaBg: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
  },
]

const FAQS = [
  { q: 'هل يعمل النظام مع أي عيادة؟', a: 'نعم، النظام مصمم لعيادات الأسنان، العيادات العامة، عيادات التجميل، والعيادات المتخصصة. يمكن تخصيصه لأي تخصص طبي.' },
  { q: 'كيف يتعامل النظام مع مرضى لا يستخدمون واتساب؟', a: 'يمكن للاستقبال حجز المواعيد يدوياً من لوحة التحكم. النظام يدعم جميع قنوات الحجز ويوحدها في مكان واحد.' },
  { q: 'هل البيانات آمنة؟', a: 'نعم. بيانات المرضى مشفرة ومحمية بالكامل. نلتزم بمعايير الخصوصية الطبية ولا يصل إليها أحد خارج عيادتك.' },
  { q: 'كم يستغرق الإعداد؟', a: 'الإعداد الكامل يستغرق من ١ إلى ٣ أيام عمل. فريقنا يتولى كل شيء: ربط واتساب، تدريب النظام على خدماتك، وإعداد جداول الأطباء.' },
  { q: 'ماذا يحدث إذا كان الإنترنت منقطعاً في العيادة؟', a: 'وكيل الحجز الذكي يعمل على خوادمنا السحابية، ولا يتأثر بانقطاع الإنترنت في العيادة. المواعيد المحجوزة تُزامن تلقائياً عند عودة الاتصال.' },
]

export const ClinicOSLanding = () => {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const openWa = (pkg: string) => {
    const msg = pkg === 'ai_pro'
      ? 'مرحباً، شاهدت ديمو نظام الحجز الذكي وأرغب بالاشتراك في باقة AI Voice + واتساب.'
      : 'مرحباً، شاهدت ديمو نظام الحجز الذكي وأرغب بالاشتراك في باقة واتساب للعيادات.'
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>مدار</div>
            <div style={{ fontSize: 10, color: '#64748B', lineHeight: 1 }}>نظام الحجز الذكي</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <a href="#pricing" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', fontWeight: 600 }}>الأسعار</a>
          <a href="#how" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', fontWeight: 600 }}>كيف يعمل</a>
          <a href="#faq" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', fontWeight: 600 }}>الأسئلة الشائعة</a>
          <button onClick={() => navigate('/login')} style={{ padding: '8px 18px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            تسجيل الدخول
          </button>
          <button onClick={() => navigate('/trial')} style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            جرب مجاناً
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 40%, #F8FAFC 100%)', padding: '72px 40px 60px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>

          {/* Right — text */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>وكيل الحجز الذكي — جاهز للعيادات السعودية</span>
            </div>

            <h1 style={{ fontSize: 42, fontWeight: 900, color: '#0F172A', lineHeight: 1.25, margin: '0 0 18px' }}>
              عيادتك تحجز مواعيد
              <br />
              <span style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                وهي نائمة
              </span>
            </h1>

            <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.8, margin: '0 0 32px', fontFamily: 'Tajawal, sans-serif' }}>
              نظام ذكي يستقبل طلبات الحجز، يرد على المرضى، ويرتب المواعيد تلقائياً عبر واتساب — بدون موظف استقبال يعمل ليلاً.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/trial')}
                style={{ padding: '13px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(79,70,229,0.35)' }}
              >
                ابدأ تجربتك المجانية <ArrowLeft size={15} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => openWa('general')}
                style={{ padding: '13px 28px', borderRadius: 10, background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Phone size={15} /> تحدث مع فريقنا
              </motion.button>
            </div>

            <p style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 32 }}>
              لا يلزم بطاقة ائتمان • إعداد في أقل من ٣ أيام • ضمان استرداد ٣٠ يوماً
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { v: '+٢٠٠', l: 'عيادة نشطة' },
                { v: '٩٧٪', l: 'نسبة التسليم' },
                { v: '٢٤/٧', l: 'بدون توقف' },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#4F46E5' }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Left — Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(79,70,229,0.18)', border: '1px solid #E2E8F0' }}
          >
            <ClinicDashMockup />
          </motion.div>

        </div>
      </section>

      {/* Outcomes */}
      <section style={{ padding: '80px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>النتائج التي تراها في الشهر الأول</h2>
            <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>أرقام حقيقية من عيادات تستخدم النظام</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {OUTCOMES.map((o, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                style={{ background: '#F8FAFC', borderRadius: 16, padding: '28px 20px', textAlign: 'center', border: '1px solid #E2E8F0' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <o.icon size={22} style={{ color: '#4F46E5' }} />
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: '#4F46E5', marginBottom: 8 }}>{o.value}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{o.label}</div>
                <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>{o.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ padding: '80px 40px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>كيف يعمل النظام؟</h2>
            <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>ثلاث خطوات — المريض لا يلاحظ الفرق، أنت تلاحظ النتائج</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {HOW_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                style={{ display: 'flex', gap: 24, alignItems: 'flex-start', background: '#FFFFFF', borderRadius: 16, padding: '28px 32px', border: '1px solid #E2E8F0' }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `${step.color}15`, border: `2px solid ${step.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: step.color }}>{step.num}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: '#475569', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features highlight */}
      <section style={{ padding: '80px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>كل ما تحتاجه لإدارة عيادتك</h2>
            <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>من أول تواصل للمريض حتى التقرير الأسبوعي</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: MessageSquare, color: '#10B981', bg: '#ECFDF5', title: 'حجز عبر واتساب', body: 'المريض يحجز بمحادثة طبيعية. الوكيل يفهم الطلب ويرتب الموعد.' },
              { icon: Calendar, color: '#4F46E5', bg: '#EEF2FF', title: 'جدول عيادة ذكي', body: 'تقويم موحد لكل الأطباء. التعارضات تُكتشف تلقائياً قبل التأكيد.' },
              { icon: Bot, color: '#7C3AED', bg: '#F5F3FF', title: 'وكيل مكالمات AI', body: 'يستقبل المكالمات، يفهم الطلبات، ويحجز دون تدخل بشري.' },
              { icon: Zap, color: '#F59E0B', bg: '#FFFBEB', title: 'تذكيرات تلقائية', body: 'قبل ٢٤ ساعة و٣ ساعات. نسبة الحضور ترتفع، والمواعيد الفائتة تنخفض.' },
              { icon: Users, color: '#0099CC', bg: '#EFF9FF', title: 'سجل المرضى', body: 'تاريخ كامل لكل مريض: الزيارات، الخدمات، الملاحظات، والتواصل.' },
              { icon: Shield, color: '#059669', bg: '#ECFDF5', title: 'حماية وأمان', body: 'بيانات المرضى مشفرة ومحمية. امتثال كامل لمعايير الخصوصية الطبية.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                style={{ padding: '24px', borderRadius: 14, border: '1px solid #E2E8F0', background: '#F8FAFC' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6, margin: 0 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '80px 40px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>خطط واضحة، بدون رسوم خفية</h2>
            <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>اشتراك سنوي شامل — لا عمولة على الحجوزات</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {PRICING.map((pkg) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: pkg.recommended ? `2px solid ${pkg.color}` : '1px solid #E2E8F0',
                  padding: '32px',
                  position: 'relative',
                  boxShadow: pkg.recommended ? `0 8px 32px ${pkg.color}20` : 'none',
                }}
              >
                {pkg.recommended && (
                  <div style={{ position: 'absolute', top: -14, right: 24, padding: '4px 14px', borderRadius: 20, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: 'white', fontSize: 11, fontWeight: 800 }}>
                    ⭐ الأكثر طلباً
                  </div>
                )}
                <div style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: 20, background: pkg.badgeBg, marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: pkg.badgeColor }}>{pkg.badge}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>{pkg.name}</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: pkg.color }}>{pkg.price}</span>
                  <span style={{ fontSize: 16, color: '#475569' }}>ريال</span>
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>/ {pkg.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {pkg.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#0F172A', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                    </div>
                  ))}
                  {pkg.locked.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: 0.4 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 7, border: '1.5px solid #CBD5E1', flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', textDecoration: 'line-through' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(`/clinic-os/signup?pkg=${pkg.id}`)}
                  style={{ width: '100%', padding: '13px', borderRadius: 10, background: pkg.ctaBg, color: 'white', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  {pkg.cta}
                </button>
                <button
                  onClick={() => openWa(pkg.id)}
                  style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  تحدث مع فريقنا
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / case study */}
      <section style={{ padding: '80px 40px', background: '#FFFFFF' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
          <blockquote style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', lineHeight: 1.7, fontFamily: 'Tajawal, sans-serif', margin: '0 0 24px' }}>
            "كنا نضيع ٣ ساعات يومياً في الرد على الاستفسارات والتأكيد على المواعيد. الآن الموظفة تركز كلياً على المرضى اللي في العيادة."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>س</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>د. سارة الحربي</div>
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>عيادات نور للأسنان — جدة</div>
            </div>
            <div style={{ display: 'flex', gap: 2, marginRight: 8 }}>
              {[1,2,3,4,5].map(i => <Star key={i} size={14} style={{ fill: '#F59E0B', color: '#F59E0B' }} />)}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: '80px 40px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', textAlign: 'center', margin: '0 0 40px' }}>الأسئلة الشائعة</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} style={{ color: '#64748B', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#64748B', flexShrink: 0 }} />}
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    style={{ padding: '0 20px 16px', fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '80px 40px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: 'white', margin: '0 0 16px' }}>جاهز تشوف كيف تبدو عيادتك بالنظام؟</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal, sans-serif', marginBottom: 36 }}>
            جرب الداشبورد الكامل مجاناً — بيانات تجريبية، بدون أي التزام
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/trial')}
              style={{ padding: '14px 36px', borderRadius: 10, background: 'white', color: '#4F46E5', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
            >
              جرب الداشبورد مجاناً
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => openWa('general')}
              style={{ padding: '14px 36px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              تحدث مع فريقنا
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0F172A', padding: '40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={16} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 900, color: 'white' }}>مدار — نظام الحجز الذكي</span>
        </div>
        <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          © ٢٠٢٦ مدار. جميع الحقوق محفوظة. المملكة العربية السعودية.
        </p>
      </footer>
    </div>
  )
}
