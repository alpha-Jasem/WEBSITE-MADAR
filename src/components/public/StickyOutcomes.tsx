import { useRef, useState } from 'react'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import { Car, Stethoscope, TrendingUp, Clock, Users, Zap, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const EM = '#10B981'
const CY = '#0099CC'
const VI = '#7C3AED'

const scenes = [
  {
    accent: '#EF4444',
    tag     : { ar: 'الواقع الآن', en: 'Right Now' },
    num     : { ar: '?', en: '?' },
    headline: { ar: 'كم عميل خسرته اليوم وما تعرف؟', en: 'How Many Customers Did You Lose Today — Without Knowing?' },
    sub     : { ar: 'كل يوم: وقت يضيع، عملاء ينتظرون ويمشون، مواعيد تضيع بسبب مكالمة ما ردت.', en: 'Every day: wasted time, customers waiting and leaving, appointments missed from unanswered calls.' },
    stats   : [
      { icon: Clock,    val:{ ar:'٢+ ساعة', en:'2+ hrs'  }, lbl:{ ar:'يومياً في التنظيم اليدوي', en:'daily on manual management' }, bad: true },
      { icon: Users,    val:{ ar:'٤٠٪',     en:'40%'     }, lbl:{ ar:'مكالمات تضيع بلا رد',       en:'of calls go unanswered'     }, bad: true },
      { icon: TrendingUp, val:{ ar:'٠',     en:'0'       }, lbl:{ ar:'من هذا يُقاس أو يُتابع',   en:'of this is tracked'         }, bad: true },
    ],
  },
  {
    accent: CY,
    tag     : { ar: 'Car Wash OS', en: 'Car Wash OS' },
    num     : { ar: '٤٠+', en: '40+' },
    headline: { ar: 'دقيقة تُستعاد يومياً — بدون موظف إضافي', en: 'Minutes Reclaimed Daily — No Extra Staff' },
    sub     : { ar: 'الطابور ينظّم نفسه. الواتساب يرسل تأكيدات تلقائية. أنت تشوف الأرقام بدل ما تعدّها.', en: 'Queue manages itself. WhatsApp sends auto-confirmations. You watch the numbers instead of counting them.' },
    stats   : [
      { icon: Clock,       val:{ ar:'٤٠+ دق', en:'40+ min' }, lbl:{ ar:'توفير يومي موثّق',        en:'daily saving documented'      }, bad: false },
      { icon: Zap,         val:{ ar:'١١',      en:'11'      }, lbl:{ ar:'workflow أتمتة جاهز',    en:'automation workflows ready'   }, bad: false },
      { icon: CheckCircle2,val:{ ar:'٠',       en:'0'       }, lbl:{ ar:'تدخل يدوي في الطابور',   en:'manual queue interventions'   }, bad: false },
    ],
  },
  {
    accent: EM,
    tag     : { ar: 'Clinic OS', en: 'Clinic OS' },
    num     : { ar: '٧٨٪', en: '78%' },
    headline: { ar: 'من كل اتصال يصير موعد — حتى وأنت نايم', en: 'Every Call Becomes a Booking — Even While You Sleep' },
    sub     : { ar: 'مها تستقبل بالليل والعطل. تتحقق من جدول الدكتور. تحجز وترسل تأكيد. بدون تعارض.', en: 'Maha answers nights and weekends. Checks the schedule. Books and sends confirmation. Zero conflicts.' },
    stats   : [
      { icon: Users,       val:{ ar:'٧٨٪', en:'78%'  }, lbl:{ ar:'معدل تحويل المتصلين',        en:'caller-to-patient rate'       }, bad: false },
      { icon: Clock,       val:{ ar:'٠',   en:'0'    }, lbl:{ ar:'تعارض في الحجز أبداً',       en:'double-bookings ever'         }, bad: false },
      { icon: CheckCircle2,val:{ ar:'٢٤/٧',en:'24/7' }, lbl:{ ar:'تغطية كاملة بدون إجازات',   en:'coverage with no days off'    }, bad: false },
    ],
  },
]

export const StickyOutcomes = () => {
  const { t, language } = useLanguage()
  const isAr = language === 'ar'
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target : containerRef,
    offset : ['start start', 'end end'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(2, Math.floor(v * 3 + 0.05))
    setActive(idx)
  })

  const scene = scenes[active]

  return (
    <section className="relative" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── section label ── */}
      <div className="text-center pt-20 pb-0 relative z-10">
        <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-4 ${isAr ? 'font-cairo' : 'font-work'}`}
          style={{ color: 'rgba(255,255,255,0.22)' }}>
          {t('قبل وبعد', 'Before & After')}
        </p>
        <h2 className={`text-4xl sm:text-5xl font-black text-white mb-2 ${isAr ? 'font-cairo' : 'font-sora'}`}
          style={{ letterSpacing: '-0.025em' }}>
          {t('مادار يغيّر المعادلة', 'Madar Changes the Equation')}
        </h2>
        <p className={`text-base mt-3 mb-10 ${isAr ? 'font-tajawal' : 'font-work'}`}
          style={{ color: 'rgba(255,255,255,0.32)' }}>
          {t('اسكرول وشوف الفرق', 'Scroll to see the difference')}
        </p>
      </div>

      {/* ── tall container that drives scroll ── */}
      <div ref={containerRef} style={{ height: '300vh' }}>
        <div className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>

          {/* Accent glow that matches active scene */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`glow-${active}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${scene.accent}12 0%, transparent 70%)`,
              }}
            />
          </AnimatePresence>

          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

              {/* ── LEFT: text ── */}
              <div className="flex flex-col gap-6">

                {/* Scene tag */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`tag-${active}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full self-start"
                    style={{ background: `${scene.accent}18`, border: `1px solid ${scene.accent}40` }}
                  >
                    {active === 0 && <span style={{ fontSize: 11, color: scene.accent }}>⚠</span>}
                    {active === 1 && <Car size={11} style={{ color: scene.accent }} />}
                    {active === 2 && <Stethoscope size={11} style={{ color: scene.accent }} />}
                    <span className={`text-xs font-bold tracking-widest uppercase ${isAr ? 'font-cairo' : 'font-work'}`}
                      style={{ color: scene.accent }}>
                      {isAr ? scene.tag.ar : scene.tag.en}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Big number */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`num-${active}`}
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className={`font-black leading-none ${isAr ? 'font-cairo' : 'font-sora'}`}
                    style={{
                      fontSize: 'clamp(72px, 12vw, 128px)',
                      color: scene.accent,
                      letterSpacing: '-0.04em',
                      textShadow: `0 0 60px ${scene.accent}50`,
                    }}
                  >
                    {isAr ? scene.num.ar : scene.num.en}
                  </motion.div>
                </AnimatePresence>

                {/* Headline */}
                <AnimatePresence mode="wait">
                  <motion.h3
                    key={`headline-${active}`}
                    initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
                    transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-2xl sm:text-3xl font-black text-white leading-tight ${isAr ? 'font-cairo' : 'font-sora'}`}
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {isAr ? scene.headline.ar : scene.headline.en}
                  </motion.h3>
                </AnimatePresence>

                {/* Sub */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`sub-${active}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-base leading-relaxed max-w-md ${isAr ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.42)' }}
                  >
                    {isAr ? scene.sub.ar : scene.sub.en}
                  </motion.p>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="flex items-center gap-3 mt-2">
                  {scenes.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        width: i === active ? 32 : 8,
                        background: i === active ? scene.accent : 'rgba(255,255,255,0.15)',
                      }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      style={{ height: 4, borderRadius: 99 }}
                    />
                  ))}
                </div>
              </div>

              {/* ── RIGHT: stats card ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`card-${active}`}
                  initial={{ opacity: 0, x: isAr ? -40 : 40, filter: 'blur(16px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: isAr ? 40 : -40, filter: 'blur(16px)' }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-3xl overflow-hidden"
                  style={{
                    background: 'rgba(5,8,18,0.75)',
                    border: `1px solid ${scene.accent}30`,
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 60px ${scene.accent}12`,
                  }}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: `1px solid ${scene.accent}18`, background: `${scene.accent}08` }}>
                    <div className="flex items-center gap-2.5">
                      {active === 0 && <span style={{ fontSize: 16 }}>⚠️</span>}
                      {active === 1 && (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, #0D1B3E, ${CY})` }}>
                          <Car size={12} className="text-white" />
                        </div>
                      )}
                      {active === 2 && (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, #0D2B1E, ${EM})` }}>
                          <Stethoscope size={12} className="text-white" />
                        </div>
                      )}
                      <span className={`text-sm font-bold text-white ${isAr ? 'font-cairo' : 'font-sora'}`}>
                        {active === 0 ? t('بدون نظام', 'No System') : active === 1 ? 'Car Wash OS' : 'Clinic OS'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: active === 0 ? 'rgba(239,68,68,0.15)' : `${scene.accent}15`, border: `1px solid ${active === 0 ? 'rgba(239,68,68,0.3)' : `${scene.accent}30`}` }}>
                      <div className="w-1.5 h-1.5 rounded-full"
                        style={{ background: active === 0 ? '#EF4444' : '#4ADE80', animation: 'pulse-live 2s ease-in-out infinite' }} />
                      <span className={`text-[10px] font-bold ${isAr ? 'font-cairo' : 'font-work'}`}
                        style={{ color: active === 0 ? '#EF4444' : '#4ADE80' }}>
                        {active === 0 ? t('خسارة', 'LOSING') : t('نشط', 'LIVE')}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-6 flex flex-col gap-4">
                    {scene.stats.map((s, i) => {
                      const Icon = s.icon
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: isAr ? -20 : 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="flex items-center gap-4 p-4 rounded-2xl"
                          style={{
                            background: s.bad ? 'rgba(239,68,68,0.06)' : `${scene.accent}08`,
                            border: `1px solid ${s.bad ? 'rgba(239,68,68,0.15)' : `${scene.accent}18`}`,
                          }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: s.bad ? 'rgba(239,68,68,0.15)' : `${scene.accent}20` }}>
                            <Icon size={16} style={{ color: s.bad ? '#EF4444' : scene.accent }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-black ${isAr ? 'font-cairo' : 'font-sora'}`}
                                style={{ color: s.bad ? '#EF4444' : scene.accent, letterSpacing: '-1px' }}>
                                {isAr ? s.val.ar : s.val.en}
                              </span>
                              {!s.bad && (
                                <span style={{ fontSize: 14, color: EM }}>✓</span>
                              )}
                              {s.bad && (
                                <span style={{ fontSize: 14, color: '#EF4444' }}>✗</span>
                              )}
                            </div>
                            <p className={`text-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                              style={{ color: 'rgba(255,255,255,0.38)' }}>
                              {isAr ? s.lbl.ar : s.lbl.en}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Card footer */}
                  {active > 0 && (
                    <div className="px-6 pb-5">
                      <div className="flex items-center gap-2 p-3 rounded-xl"
                        style={{ background: `${scene.accent}10`, border: `1px solid ${scene.accent}22` }}>
                        <span style={{ fontSize: 14 }}>💡</span>
                        <p className={`text-xs ${isAr ? 'font-tajawal' : 'font-work'}`}
                          style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {active === 1
                            ? t('تشغيل فوري — فريقنا يجهّز كل شيء في ٤٨ ساعة', 'Instant activation — our team sets everything up in 48 hours')
                            : t('مها تشتغل من اليوم الأول — لا موظف إضافي', 'Maha works from day one — no extra staff')
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

            </div>
          </div>

          {/* Scroll hint (only on scene 0) */}
          <AnimatePresence>
            {active === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-[1px] h-10" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.25))' }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
                </motion.div>
                <span className={`text-[10px] tracking-widest uppercase ${isAr ? 'font-tajawal' : 'font-work'}`}
                  style={{ color: 'rgba(255,255,255,0.18)' }}>
                  {t('اسكرول', 'scroll')}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </section>
  )
}
