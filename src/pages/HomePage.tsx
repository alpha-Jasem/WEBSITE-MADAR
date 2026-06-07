import { motion } from 'framer-motion'

import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor }  from '../components/shared/CustomCursor'

import { Navbar }        from '../components/public/Navbar'
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
          النتيجة تظهر من الأسبوع الأول
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          أرقام حقيقية من عملائنا في المغاسل والعيادات
        </p>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            style={{
              padding: '32px 24px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <div style={{ fontSize: 42, fontWeight: 900, color: '#00BFFF', fontFamily: 'Cairo, sans-serif', marginBottom: 8, letterSpacing: '-1px' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal, sans-serif' }}>
              {s.ar}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Social proof strip */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
        style={{ marginTop: 48, padding: '20px 28px', borderRadius: 14, background: 'rgba(0,191,255,0.04)', border: '1px solid rgba(0,191,255,0.12)', display: 'flex', alignItems: 'center', gap: 16 }}
      >
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #00BFFF22, #1565C033)', border: '1.5px solid rgba(0,191,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#00BFFF' }}>ن</span>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal, sans-serif', margin: '0 0 4px', lineHeight: 1.6 }}>
            "كنا نرد على الرسائل يدوياً ونخسر عملاء. الحين النظام يرد ويحجز والمغسلة شغالة حتى بعد الدوام."
          </p>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo, sans-serif' }}>نايف العتيبي — مغسلة نخبة، جدة</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ color: '#F59E0B', fontSize: 14 }}>★</span>)}
        </div>
      </motion.div>

    </div>
  </section>
)

export const HomePage = () => {
  return (
    <div className="min-h-screen" style={{ background: '#050810' }}>
      <CustomCursor />
      <ScrollProgress />
      <Navbar />
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
