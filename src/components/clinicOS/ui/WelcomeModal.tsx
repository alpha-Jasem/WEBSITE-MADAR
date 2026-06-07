import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, MessageCircle, Stethoscope, Bot, Calendar, Bell, BarChart3, ArrowLeft } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

const WHATSAPP_NUMBER = '966546666005'

const PACKAGE_INFO = {
  whatsapp: {
    label: 'باقة واتساب',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    icon: MessageCircle,
    features: [
      'حجز مواعيد تلقائي عبر واتساب ٢٤/٧',
      'تأكيدات وتذكيرات للمرضى',
      'داشبورد إدارة كامل',
      'تقارير أسبوعية للحجوزات',
    ],
  },
  ai_pro: {
    label: 'AI Voice + واتساب',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    icon: Bot,
    features: [
      'وكيل AI يستقبل المكالمات ويحجز',
      'حجز واتساب تلقائي ٢٤/٧',
      'تحليلات AI متقدمة',
      'تقارير ذكية فورية',
    ],
  },
}

const NEXT_STEPS = [
  {
    icon: Stethoscope,
    color: '#38BDF8',
    title: 'استكشف الداشبورد',
    body: 'جرّب كل الأقسام — المواعيد، المرضى، الأطباء، التقارير.',
  },
  {
    icon: MessageCircle,
    color: '#10B981',
    title: 'أرسل تأكيد الدفع',
    body: 'بعد تحويل الاشتراك، أرسل الإيصال على واتساب وسنفعّل حسابك.',
  },
  {
    icon: Bell,
    color: '#F59E0B',
    title: 'تفعيل خلال ٢٤ ساعة',
    body: 'بعد التأكيد ينفتح لك الداشبورد الكامل بالبيانات الحقيقية.',
  },
]

export const WelcomeModal = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { clinicName, userName, packageType } = useClinicOS()
  const navigate = useNavigate()
  const isOpen = searchParams.get('welcome') === '1'

  const pkg = PACKAGE_INFO[packageType] || PACKAGE_INFO.whatsapp
  const PkgIcon = pkg.icon

  const dismiss = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('welcome')
    setSearchParams(next, { replace: true })
  }

  const goWhatsApp = () => {
    const name = clinicName || 'العيادة'
    const pkgLabel = pkg.label
    const msg = `مرحباً 👋\nأنا ${userName || 'مسؤول'} من ${name}.\nاشتركت للتو في ${pkgLabel} وأريد تأكيد الدفع وتفعيل الحساب.`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(5,6,10,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', direction: 'rtl',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              width: '100%', maxWidth: 560,
              background: '#0D0F14',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
            }}
          >
            {/* Top accent bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${pkg.color}, transparent)` }} />

            <div style={{ padding: '36px 32px 32px' }}>
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{ marginBottom: 28 }}
              >
                {/* Package badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20,
                  background: pkg.bg, border: `1px solid ${pkg.border}`,
                  marginBottom: 16,
                }}>
                  <PkgIcon size={13} style={{ color: pkg.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: pkg.color, fontFamily: 'Cairo, sans-serif' }}>
                    {pkg.label}
                  </span>
                </div>

                <h1 style={{
                  fontSize: 26, fontWeight: 900, color: '#FAFAFA',
                  fontFamily: 'Cairo, sans-serif', margin: '0 0 8px', lineHeight: 1.3,
                }}>
                  {userName ? `أهلاً ${userName} 🎉` : 'أهلاً بك في مدار 🎉'}
                </h1>
                <p style={{
                  fontSize: 14, color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.7,
                }}>
                  {clinicName
                    ? `تم إنشاء حساب "${clinicName}" بنجاح. حسابك الآن في وضع التجربة.`
                    : 'تم إنشاء حسابك بنجاح. أنت الآن في وضع التجربة.'}
                </p>
              </motion.div>

              {/* Package features */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: pkg.bg,
                  border: `1px solid ${pkg.border}`,
                  marginBottom: 24,
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: pkg.color, fontFamily: 'Cairo, sans-serif', marginBottom: 10, letterSpacing: '0.05em' }}>
                  ما ستحصل عليه في {pkg.label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                  {pkg.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <CheckCircle2 size={12} style={{ color: pkg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Next steps */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                style={{ marginBottom: 28 }}
              >
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'Cairo, sans-serif', marginBottom: 12, letterSpacing: '0.05em' }}>
                  الخطوات التالية
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {NEXT_STEPS.map((step, i) => {
                    const Icon = step.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 + i * 0.07 }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12,
                          padding: '12px 14px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                          background: `${step.color}14`,
                          border: `1px solid ${step.color}25`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Icon size={14} style={{ color: step.color }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif', marginBottom: 2 }}>
                            <span style={{ color: step.color, marginLeft: 6 }}>{i + 1}.</span>
                            {step.title}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>
                            {step.body}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                style={{ display: 'flex', gap: 10 }}
              >
                <button
                  onClick={goWhatsApp}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12,
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    border: 'none', cursor: 'pointer',
                    color: 'white', fontSize: 13, fontWeight: 800,
                    fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    boxShadow: '0 4px 20px rgba(37,211,102,0.25)',
                  }}
                >
                  <MessageCircle size={15} />
                  أرسل تأكيد الدفع
                </button>

                <button
                  onClick={dismiss}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 800,
                    fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  استكشف الداشبورد
                  <ArrowLeft size={14} />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
