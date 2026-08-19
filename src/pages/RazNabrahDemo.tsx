import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Phone, ShieldCheck, Building2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { NabrahVoiceWidget } from '../components/shared/NabrahVoiceWidget'

const BG = '#050810'

const rv = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
}

const capabilities = [
  { icon: Building2, title: 'يعرف المشاريع والأسعار', body: 'راز 55 من 395 ألف، راز 19، راز 18 — بالأرقام الحقيقية من موقع الشركة، ويصارحك بالمباع.' },
  { icon: ShieldCheck, title: 'يرفع الشكاوى ويصعّدها', body: 'يعترف بالمشكلة، يسجّلها باسم كامل ورقم جوال، ويؤكد لك — بدون وعود ما يقدر يوفيها.' },
  { icon: Phone, title: 'يحجز موعد مع مستشار', body: 'يجمع الاسم والرقم والوقت المناسب، ويختم بـ«سيتم التواصل معك من قبل فريق الدعم».' },
]

export const RazNabrahDemo = () => {
  const { dir } = useLanguage()

  return (
    <div dir={dir} style={{ fontFamily: '"IBM Plex Sans Arabic", Cairo, sans-serif', background: BG, minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-tajawal" style={{ color: 'rgba(234,241,251,0.55)' }}>
          <ArrowRight size={15} />
          العودة إلى مدار
        </Link>
      </div>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 text-center">
        <motion.div {...rv}>
          <span
            className="inline-flex items-center gap-2 text-xs font-cairo px-3 py-1.5 rounded-full mb-6"
            style={{ background: 'rgba(0,191,255,0.1)', color: '#7FD8FF', border: '1px solid rgba(0,191,255,0.25)' }}
          >
            تجربة صوتية مباشرة — راز العقارية
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold font-cairo mb-4" style={{ color: 'white', letterSpacing: '-0.02em' }}>
            كلّم <span style={{ color: '#00BFFF' }}>سعود</span> الآن
          </h1>
          <p className="text-sm sm:text-base font-tajawal leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(234,241,251,0.6)' }}>
            موظف استقبال ذكي يتكلم لهجة حجازية، مبني على بيانات راز العقارية الحقيقية.
            اسأله عن المشاريع والأسعار، احجز موعد مع مستشار، أو ارفع شكوى.
          </p>
        </motion.div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          {...rv}
          className="rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(160deg, rgba(0,191,255,0.06), rgba(5,8,16,0.9))',
            border: '1px solid rgba(0,191,255,0.18)',
          }}
        >
          <NabrahVoiceWidget />
        </motion.div>

        <motion.p {...rv} className="text-center text-xs font-tajawal mt-5" style={{ color: 'rgba(234,241,251,0.35)' }}>
          يحتاج إذن الميكروفون. المكالمة تبدأ فوراً بدون تسجيل دخول.
        </motion.p>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {capabilities.map((c, i) => (
            <motion.div
              key={i}
              {...rv}
              transition={{ ...rv.transition, delay: i * 0.08 }}
              className="p-6 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.25)' }}
              >
                <c.icon size={17} color="#00BFFF" />
              </div>
              <h3 className="text-base font-bold font-cairo mb-2" style={{ color: 'white' }}>{c.title}</h3>
              <p className="text-sm font-tajawal leading-relaxed" style={{ color: 'rgba(234,241,251,0.55)' }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default RazNabrahDemo
