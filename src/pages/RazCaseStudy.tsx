import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, Hammer, KeyRound, PenTool, Megaphone, MessageCircle, Sparkles } from 'lucide-react'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'
import { RazVoiceWidget } from '../components/shared/RazVoiceWidget'

const NAVY = '#0D1B3E'
const SKY = '#00BFFF'
const BG = '#050810'

const services = [
  { icon: Building2, label: 'التطوير والاستثمار العقاري' },
  { icon: Hammer, label: 'البناء والمقاولات' },
  { icon: KeyRound, label: 'إدارة الممتلكات والمرافق' },
  { icon: PenTool, label: 'التصميم الهندسي' },
  { icon: Megaphone, label: 'التسويق العقاري' },
]

const projects = ['راز هافن 1، 2، 3', 'راز إليڤيت', 'راز20', 'راز41', 'راز تاور', 'راز إنفست 1&2']
const neighborhoods = ['النهضة', 'الزهراء', 'الروضة', 'السلامة']

const rv = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }

const WA_NUMBER = '966568766030'

export const RazCaseStudy = () => {
  const { dir } = useLanguage()

  return (
    <div dir={dir} style={{ fontFamily: '"IBM Plex Sans Arabic", Cairo, sans-serif', background: BG, minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-tajawal"
          style={{ color: 'rgba(234,241,251,0.55)' }}
        >
          <ArrowRight size={15} />
          العودة إلى مدار
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <motion.div {...rv} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.2)' }}>
          <Sparkles size={12} color={SKY} />
          <span className="text-xs font-medium font-cairo" style={{ color: 'white' }}>دراسة حالة عميل — قطاع العقار</span>
        </motion.div>

        <motion.h1 {...rv} className="text-4xl sm:text-5xl font-bold font-cairo mb-5" style={{ color: 'white' }}>
          راز العقارية <span style={{ color: SKY }}>× مدار OS</span>
        </motion.h1>

        <motion.p {...rv} className="text-base sm:text-lg font-tajawal max-w-xl mx-auto" style={{ color: 'rgba(234,241,251,0.6)' }}>
          وكيل ذكاء اصطناعي مبني خصيصاً لراز العقارية — يرد على المكالمات والواتساب بلهجة حجازية طبيعية،
          ومقيّد بمعلومات الشركة الحقيقية فقط.
        </motion.p>
      </section>

      {/* Company snapshot */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div {...rv} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-10">
          {services.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="flex flex-col items-center gap-2.5 text-center p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.25)' }}>
                  <Icon size={16} color={SKY} />
                </div>
                <span className="text-xs font-tajawal leading-snug" style={{ color: 'rgba(234,241,251,0.75)' }}>{s.label}</span>
              </div>
            )
          })}
        </motion.div>

        <motion.div {...rv} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-cairo mb-3" style={{ color: 'rgba(234,241,251,0.45)' }}>المشاريع</p>
            <div className="flex flex-wrap gap-2">
              {projects.map((p, i) => (
                <span key={i} className="text-xs font-tajawal px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,191,255,0.08)', color: SKY, border: '1px solid rgba(0,191,255,0.2)' }}>{p}</span>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-cairo mb-3" style={{ color: 'rgba(234,241,251,0.45)' }}>الأحياء المستهدفة — جدة</p>
            <div className="flex flex-wrap gap-2">
              {neighborhoods.map((n, i) => (
                <span key={i} className="text-xs font-tajawal px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(234,241,251,0.75)', border: '1px solid rgba(255,255,255,0.1)' }}>{n}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Interactive demo split */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        <motion.div {...rv} className="rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
          style={{ background: 'linear-gradient(160deg, rgba(0,191,255,0.05), rgba(5,8,16,0.9))', border: '1px solid rgba(0,191,255,0.18)' }}>

          {/* WhatsApp side */}
          <div className="p-8 sm:p-10 flex flex-col justify-center gap-4 relative" style={{ borderInlineEnd: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-1" style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)' }}>
              <MessageCircle size={18} color="#25D366" />
            </div>
            <h3 className="text-xl font-bold font-cairo" style={{ color: 'white' }}>تفضّل تجربة سريعة؟</h3>
            <p className="text-sm font-tajawal leading-relaxed" style={{ color: 'rgba(234,241,251,0.6)' }}>
              راسل "سعود" — مستشار راز العقاري — مباشرة على واتساب، ويرد عليك فوراً بنفس المعلومات والمشاريع الحقيقية.
            </p>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('السلام عليكم، أبغى أستفسر عن مشاريع راز العقارية')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold font-cairo w-fit"
              style={{ background: '#25D366', color: '#04160D' }}
            >
              <MessageCircle size={16} />
              راسلنا على واتساب
            </a>
          </div>

          {/* Voice side */}
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center gap-3 text-center" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <RazVoiceWidget />
          </div>
        </motion.div>

        <motion.p {...rv} className="text-center text-xs font-tajawal mt-6" style={{ color: 'rgba(234,241,251,0.35)' }}>
          هذا عرض تجريبي (Demo) بُني على البيانات الحقيقية لراز العقارية — الصوت مستنسخ من مكتبة Munsit الرسمية.
        </motion.p>
      </section>

      <Footer />
    </div>
  )
}

export default RazCaseStudy
