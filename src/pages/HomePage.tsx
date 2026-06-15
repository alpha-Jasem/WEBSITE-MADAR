import { motion } from 'framer-motion'

import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor }  from '../components/shared/CustomCursor'

import { MadarNavbar }   from '../components/public/MadarNavbar'
import { Hero }          from '../components/public/Hero'
import { ProductsSection } from '../components/public/ProductsSection'
import { LeadForm }      from '../components/public/LeadForm'
import { Footer }        from '../components/public/Footer'
import { Check } from 'lucide-react'

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

const stats = [
  { value: '3×',      ar: 'زيادة الحجوزات',         en: 'More bookings' },
  { value: '< ثانية', ar: 'وقت الرد على العميل',     en: 'Response time' },
  { value: '80%',     ar: 'تقليل المواعيد الفائتة',  en: 'Fewer no-shows' },
  { value: '24/7',    ar: 'تشغيل بدون موظف إضافي',   en: 'No extra staff' },
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
          ما يقدمه النظام لك من اليوم الأول
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          مصمم خصيصاً للعيادات السعودية
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
          كن من أوائل العيادات في السعودية اللي تشغّل واتساب ذكي يرد ويحجز بدون موظف — <span style={{ color: '#0099CC', fontWeight: 700 }}>الأماكن محدودة</span>
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
      <MadarNavbar navLinks={[{ href: '#outcomes', label: 'النتائج' }, { href: '#products', label: 'المنتجات' }, { href: '#contact', label: 'تواصل' }]} subtitle="Clinic OS للعيادات" />
      <main>
        <Hero />
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
