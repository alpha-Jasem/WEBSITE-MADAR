import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor }  from '../components/shared/CustomCursor'

import { MadarNavbar }   from '../components/public/MadarNavbar'
import { Hero }          from '../components/public/Hero'
import { ProductsSection } from '../components/public/ProductsSection'
import { LeadForm }      from '../components/public/LeadForm'
import { Footer }        from '../components/public/Footer'
import { Check, Phone, Clock, CalendarX, Moon, AlertCircle, Wallet } from 'lucide-react'

const PHONE = '966546666005'
const openWhatsApp = (msg: string) => window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const clinicPlans = [
  {
    name: 'Clinic Core',
    label: 'لبداية تشغيل مرتبة',
    description: 'الأساس اليومي الذي يجمع فريق العيادة في نظام واحد واضح.',
    features: ['المواعيد والتقويم', 'ملفات المرضى', 'الأطباء والخدمات', 'التقارير والصلاحيات'],
    featured: false,
  },
  {
    name: 'Clinic AI',
    label: 'للتشغيل والنمو الذكي',
    description: 'كل ما في Core، مع قنوات ذكية تقلل العمل اليدوي وتسرّع الاستجابة.',
    features: ['كل مزايا Clinic Core', 'تأكيدات وتذكيرات واتساب', 'حجز ذكي ومساعد AI', 'تكاملات حسب احتياج العيادة'],
    featured: true,
  },
]

const ClinicPlans = () => (
  <section id="plans" style={{ background: '#F1F5F9', padding: '80px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)', marginBottom: 64 }} />
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>
          Clinic OS — الباقات
        </span>
        <h2 style={{ fontSize: 34, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.3 }}>
          باقتان واضحتان لعيادتك
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          نحدد السعر بعد معرفة عدد الأطباء والفروع والتكاملات المطلوبة — جلسة التعريف مجانية
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {clinicPlans.map((plan, i) => (
          <motion.div key={plan.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ borderRadius: 20, padding: '28px 24px', position: 'relative', overflow: 'hidden',
              background: plan.featured ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04))' : '#FFFFFF',
              border: `1px solid ${plan.featured ? 'rgba(16,185,129,0.3)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: '0 2px 16px rgba(13,27,62,0.06)' }}>
            {plan.featured && (
              <span style={{ position: 'absolute', top: 16, left: 16, padding: '4px 12px', borderRadius: 99, background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>
                الأكثر تكاملاً
              </span>
            )}
            <small style={{ display: 'block', color: plan.featured ? '#10B981' : '#94A3B8', fontSize: 12, fontFamily: 'Tajawal, sans-serif', marginBottom: 6 }}>{plan.label}</small>
            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>{plan.name}</h3>
            <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: '0 0 20px' }}>{plan.description}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>
                  <Check size={14} color={plan.featured ? '#10B981' : '#6B7A99'} style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => openWhatsApp(`مرحباً، أريد عرضاً مناسباً لباقة ${plan.name} لعيادتي.`)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700,
                background: plan.featured ? 'linear-gradient(135deg,#10B981,#059669)' : 'rgba(255,255,255,0.07)',
                color: plan.featured ? '#fff' : 'rgba(255,255,255,0.7)' }}>
              اطلب عرض عيادتك
            </button>
          </motion.div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginTop: 28 }}>
        جلسة التعريف مجانية، والعرض يوضح الإعداد والتشغيل والدعم قبل أي التزام.
      </p>
    </div>
  </section>
)

/* ── Dashboard Preview ── */
const DashboardPreview = () => (
  <section style={{ background: '#F8FAFF', padding: '0 24px 80px', direction: 'rtl' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Label */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 32 }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'rgba(0,153,204,0.08)', border: '1px solid rgba(0,153,204,0.2)', color: '#0099CC', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>
          لوحة التحكم — Clinic OS
        </span>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 10px', lineHeight: 1.35 }}>
          كل شيء عن عيادتك في لوحة واحدة
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 24px' }}>
          المواعيد، المرضى، الإشعارات، والتقارير — في مكان واحد
        </p>
      </motion.div>

      {/* Dashboard Mockup */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.09)',
          boxShadow: '0 24px 80px rgba(13,27,62,0.13), 0 4px 16px rgba(0,0,0,0.06)',
          background: '#fff',
        }}
      >
        {/* Browser chrome */}
        <div style={{ background: '#F1F5F9', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <div style={{ flex: 1, background: '#E2E8F0', borderRadius: 6, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 6, maxWidth: 280, margin: '0 auto' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>clinic.madar.software</span>
          </div>
        </div>

        {/* Dashboard Body */}
        <div style={{ display: 'flex', height: 480, direction: 'rtl' }}>

          {/* Sidebar */}
          <div style={{ width: 200, background: '#0D1B3E', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
            {/* Logo area */}
            <div style={{ padding: '0 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif' }}>Madar <span style={{ color: '#00BFFF' }}>Clinic OS</span></div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>عيادة الدكتور أحمد</div>
            </div>
            <div style={{ padding: '12px 0 0' }}>
              {[
                { label: 'الرئيسية', active: true },
                { label: 'المواعيد', active: false },
                { label: 'المرضى', active: false },
                { label: 'الأطباء', active: false },
                { label: 'الإشعارات', active: false },
                { label: 'التقارير', active: false },
                { label: 'الإعدادات', active: false },
              ].map((item) => (
                <div key={item.label} style={{ padding: '8px 16px', margin: '1px 8px', borderRadius: 8,
                  background: item.active ? 'rgba(0,191,255,0.15)' : 'transparent',
                  borderRight: item.active ? '3px solid #00BFFF' : '3px solid transparent',
                  fontSize: 12, color: item.active ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'Cairo, sans-serif', fontWeight: item.active ? 700 : 400, cursor: 'default' }}>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div style={{ flex: 1, background: '#F8FAFF', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif' }}>لوحة التحكم</div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>الأحد، 15 يونيو 2025</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0D1B3E,#0099CC)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>أ</span>
                </div>
                <span style={{ fontSize: 12, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>د. أحمد</span>
              </div>
            </div>

            {/* Stats cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: 'مواعيد اليوم', value: '14', color: '#0099CC', bg: 'rgba(0,153,204,0.08)' },
                { label: 'مرضى جدد', value: '3', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
                { label: 'مواعيد مؤكدة', value: '11', color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
                { label: 'no-show اليوم', value: '0', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 12px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color, fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{s.label}</div>
                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: s.bg }}>
                    <div style={{ height: '100%', width: '70%', background: s.color, borderRadius: 2, opacity: 0.6 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Content row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>

              {/* Appointments list */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', marginBottom: 10 }}>مواعيد اليوم</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { name: 'محمد العتيبي', time: '09:00', status: 'حضر', statusColor: '#10B981', doc: 'د. سارة' },
                    { name: 'نورة الشمري', time: '09:30', status: 'قادم', statusColor: '#0099CC', doc: 'د. أحمد' },
                    { name: 'فهد الدوسري', time: '10:00', status: 'في الانتظار', statusColor: '#F59E0B', doc: 'د. سارة' },
                    { name: 'ريم المطيري', time: '10:30', status: 'قادم', statusColor: '#0099CC', doc: 'د. أحمد' },
                    { name: 'عبدالله الحربي', time: '11:00', status: 'قادم', statusColor: '#0099CC', doc: 'د. سارة' },
                  ].map((apt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, background: i === 2 ? 'rgba(245,158,11,0.05)' : 'transparent', border: i === 2 ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(0,153,204,0.12),rgba(0,191,255,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#0099CC' }}>{apt.name[0]}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apt.name}</div>
                        <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{apt.time} — {apt.doc}</div>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: apt.statusColor + '18', color: apt.statusColor, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>{apt.status}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Activity feed */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>نشاط المساعد AI</div>
                {[
                  { icon: '✅', text: 'تأكيد موعد نورة الشمري — 9:30 ص', time: 'الآن', color: '#10B981' },
                  { icon: '📨', text: 'تذكير أُرسل لـ فهد الدوسري', time: 'منذ 5 د', color: '#0099CC' },
                  { icon: '📅', text: 'حجز جديد — ريم المطيري — 10:30 ص', time: 'منذ 12 د', color: '#7C3AED' },
                  { icon: '💬', text: 'رد على واتساب — عبدالله الحربي', time: 'منذ 18 د', color: '#F59E0B' },
                  { icon: '✅', text: 'إرسال ملخص يومي للدكتور', time: 'منذ 30 د', color: '#10B981' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.4 }}>{item.text}</div>
                    </div>
                    <span style={{ fontSize: 9, color: '#CBD5E1', fontFamily: 'monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.time}</span>
                  </div>
                ))}

                {/* AI Status badge */}
                <div style={{ marginTop: 'auto', padding: '8px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>المساعد AI نشط — يرد خلال ثانية</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* CTA below mockup */}
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', marginTop: 32 }}>
        <Link to="/trial"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 32px', borderRadius: 14, background: 'linear-gradient(135deg,#0D1B3E,#0099CC)', color: '#fff', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,153,204,0.3)' }}>
          سجّل معنا مجاناً وجرّب اللوحة
          <span style={{ fontSize: 16 }}>←</span>
        </Link>
        <p style={{ marginTop: 10, fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
          لا يحتاج بطاقة ائتمان — إعداد خلال 24 ساعة
        </p>
      </motion.div>
    </div>
  </section>
)

/* ── Pain Section ── */
const painPoints = [
  { icon: Phone,      title: 'مكالمة فايتة = مريض راح',      desc: 'كل مكالمة ما تُرد عليها، المريض يتصل بعيادة ثانية — ولا يرجع.' },
  { icon: AlertCircle, title: 'الاستقبال مشغول دايماً',      desc: 'لما يكون عندك مرضى بالداخل، مين يرد على الجوال والواتساب؟' },
  { icon: CalendarX,  title: '3 من 10 مرضى ما يحضرون',      desc: 'بدون تذكير مسبق، الـ no-show يكلّفك وقتاً فاضياً وكراسي فارغة.' },
  { icon: Moon,       title: 'بعد الدوام لا استقبال',         desc: 'المريض يبحث عن موعد الساعة 10 مساءً — ما يلقى أحد يرد.' },
  { icon: Clock,      title: 'فوضى الحجز اليدوي',            desc: 'تعارض مواعيد، بيانات ناقصة، وأخطاء يصعب تتبعها.' },
  { icon: Wallet,     title: 'تكلفة الاستقبال التقليدي',     desc: 'راتب + تدريب + إجازات + أخطاء بشرية — ويشتغل 8 ساعات فقط.' },
]

const PainSection = () => (
  <section style={{ background: '#FFFFFF', padding: '80px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#DC2626', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>
          المشاكل اليومية
        </span>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.3 }}>
          كل يوم في العيادة، نفس المشاكل
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          الاستقبال التقليدي له حدود — مساعد الاستقبال AI ما له
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {painPoints.map((p, i) => {
          const Icon = p.icon
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
              style={{ padding: '22px', borderRadius: 16, background: '#FEF9F9', border: '1px solid rgba(239,68,68,0.1)' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 6px' }}>{p.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
            </motion.div>
          )
        })}
      </div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
        style={{ marginTop: 32, padding: '20px 28px', borderRadius: 14, background: 'rgba(13,27,62,0.03)', border: '1px solid rgba(13,27,62,0.08)', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: 0, fontWeight: 700 }}>
          مساعد الاستقبال AI يحل هذه المشاكل الستة — تلقائياً، بدون توظيف أحد
        </p>
      </motion.div>
    </div>
  </section>
)

/* ── How It Works ── */
const steps = [
  { num: '١', title: 'المريض يتصل أو يرسل واتساب', desc: 'في أي وقت، أي يوم — المساعد متاح دائماً.' },
  { num: '٢', title: 'AI يرد فوراً ويفهم الطلب',   desc: 'يتعرف على نوع الخدمة، الدكتور المطلوب، والوقت المناسب.' },
  { num: '٣', title: 'يحجز الموعد مباشرة',          desc: 'يضبط الموعد في النظام ويرسل تأكيداً للمريض على الفور.' },
  { num: '٤', title: 'تذكير تلقائي قبل الموعد',     desc: 'رسالة واتساب قبل 24 ساعة وأخرى قبل ساعتين — no-show ينخفض.' },
]

const HowItWorks = () => (
  <section id="how" style={{ background: '#F8FAFF', padding: '80px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 56 }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: 'rgba(0,153,204,0.08)', border: '1px solid rgba(0,153,204,0.2)', color: '#0099CC', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>
          كيف يعمل
        </span>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.3 }}>
          من أول رسالة إلى تأكيد الموعد — كله تلقائي
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          إعداد مرة واحدة — يشتغل كل يوم بدون تدخل
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 0, position: 'relative' }}>
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            style={{ padding: '28px 20px', textAlign: 'center', position: 'relative' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#0D1B3E,#0099CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(0,153,204,0.25)' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif' }}>{s.num}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ position: 'absolute', top: 54, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,rgba(0,153,204,0.3),rgba(0,153,204,0.1))', display: 'none' }} className="hidden md:block" />
            )}
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 8px', lineHeight: 1.4 }}>{s.title}</h3>
            <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Flow bar */}
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }}
        style={{ marginTop: 40, padding: '16px 24px', borderRadius: 12, background: 'rgba(0,153,204,0.05)', border: '1px solid rgba(0,153,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', direction: 'rtl' }}>
        {['مكالمة/واتساب', '←', 'رد AI', '←', 'حجز تلقائي', '←', 'تأكيد', '←', 'تذكير', '←', 'مريض يحضر ✓'].map((item, i) => (
          <span key={i} style={{ fontSize: 13, fontFamily: item === '←' ? 'monospace' : 'Cairo, sans-serif', color: item === '←' ? '#CBD5E1' : item.includes('✓') ? '#059669' : '#0D1B3E', fontWeight: item === '←' ? 400 : 700 }}>{item}</span>
        ))}
      </motion.div>
    </div>
  </section>
)

/* ── Stats ── */
const stats = [
  { value: '80%',     ar: 'تقليل المواعيد الفائتة',   en: 'Fewer no-shows' },
  { value: '< ثانية', ar: 'وقت الرد على المريض',      en: 'Response time' },
  { value: '3×',      ar: 'سرعة تأكيد الموعد',        en: 'Faster confirmations' },
  { value: '24/7',    ar: 'استقبال بدون انقطاع',      en: 'Non-stop reception' },
]

const Outcomes = () => (
  <section style={{ background: '#F8FAFF', padding: '0 0 80px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

      {/* Divider line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,153,204,0.3), transparent)', marginBottom: 64 }} />

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.3 }}>
          النتائج من أول أسبوع
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          أرقام من عيادات تشغّل مساعد الاستقبال AI
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 1, background: 'rgba(0,0,0,0.06)' }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ padding: '28px 16px', textAlign: 'center', background: '#F8FAFF' }}
          >
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0099CC', fontFamily: 'Cairo, sans-serif', marginBottom: 8, letterSpacing: '-1px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
              {s.ar}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Value strip */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
        style={{ marginTop: 48, padding: '24px 28px', borderRadius: 14, background: 'rgba(0,153,204,0.05)', border: '1px solid rgba(0,153,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', textAlign: 'center' }}
      >
        <span style={{ fontSize: 20 }}>🚀</span>
        <p style={{ fontSize: 15, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.6 }}>
          لا مكالمة تضيع، لا موعد يُنسى — مساعد الاستقبال AI يشتغل وأنت نايم — <span style={{ color: '#0099CC', fontWeight: 700 }}>الأماكن محدودة</span>
        </p>
      </motion.div>

    </div>
  </section>
)

export const HomePage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#FFFFFF' }}>
      <CustomCursor />
      <ScrollProgress />
      <MadarNavbar navLinks={[{ href: '#how', label: 'كيف يعمل' }, { href: '#outcomes', label: 'النتائج' }, { href: '#plans', label: 'الباقات' }, { href: '#contact', label: 'تواصل' }]} subtitle="مساعد استقبال AI للعيادات" />
      <main>
        <Hero />
        <DashboardPreview />
        <PainSection />
        <HowItWorks />
        <Outcomes />
        <ProductsSection />
        <ClinicPlans />
        <LeadForm />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
