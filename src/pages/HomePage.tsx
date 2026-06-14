import { motion } from 'framer-motion'

import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor }  from '../components/shared/CustomCursor'

import { MadarNavbar }   from '../components/public/MadarNavbar'
import { Hero }          from '../components/public/Hero'
import { ProductsSection } from '../components/public/ProductsSection'
import { LeadForm }      from '../components/public/LeadForm'
import { Footer }        from '../components/public/Footer'

const stats = [
  { value: '3×',      ar: 'زيادة الحجوزات',         en: 'More bookings' },
  { value: '< ثانية', ar: 'وقت الرد على العميل',     en: 'Response time' },
  { value: '80%',     ar: 'تقليل المواعيد الفائتة',  en: 'Fewer no-shows' },
  { value: '24/7',    ar: 'تشغيل بدون موظف إضافي',   en: 'No extra staff' },
]

const Outcomes = () => (
  <section style={{ background: '#050810', padding: '0 0 80px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>

      {/* Divider line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.2), transparent)', marginBottom: 64 }} />

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 56 }}
      >
        <h2 style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px', lineHeight: 1.3 }}>
          ما يقدمه النظام لك من اليوم الأول
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          مصمم خصيصاً للمغاسل والعيادات السعودية
        </p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 1, background: 'rgba(255,255,255,0.06)' }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{ padding: '28px 16px', textAlign: 'center', background: '#050810' }}
          >
            <div style={{ fontSize: 36, fontWeight: 900, color: '#00BFFF', fontFamily: 'Cairo, sans-serif', marginBottom: 8, letterSpacing: '-1px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal, sans-serif' }}>
              {s.ar}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Value strip */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
        style={{ marginTop: 48, padding: '24px 28px', borderRadius: 14, background: 'rgba(0,191,255,0.04)', border: '1px solid rgba(0,191,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', textAlign: 'center' }}
      >
        <span style={{ fontSize: 20 }}>🚀</span>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.6 }}>
          كن من أوائل المغاسل والعيادات في السعودية اللي تشغّل واتساب ذكي يرد ويحجز بدون موظف — <span style={{ color: '#00BFFF', fontWeight: 700 }}>الأماكن محدودة</span>
        </p>
      </motion.div>

    </div>
  </section>
)

export const HomePage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#050810' }}>
      <CustomCursor />
      <ScrollProgress />
      <MadarNavbar navLinks={[{ href: '#outcomes', label: 'النتائج' }, { href: '#products', label: 'المنتجات' }, { href: '#contact', label: 'تواصل' }]} subtitle="واتساب + ذكاء اصطناعي" />
      <main>
        <Hero />
        <Outcomes />
        <ProductsSection />
        <LeadForm />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
