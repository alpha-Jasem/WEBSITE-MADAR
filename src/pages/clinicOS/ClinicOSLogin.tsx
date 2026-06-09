import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Step = 'email' | 'sent'

export const ClinicOSLogin = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { setError('يرجى إدخال البريد الإلكتروني'); return }
    setLoading(true)
    setError('')
    try {
      const redirectTo = 'https://madar.software/auth/callback'
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      })
      if (otpErr) throw otpErr
      setStep('sent')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('invalid')) {
        setError('لا يوجد حساب بهذا البريد. هل تريد إنشاء حساب جديد؟')
      } else {
        setError('حدث خطأ، يرجى المحاولة مجدداً.')
      }
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setLoading(true)
    const redirectTo = 'https://madar.software/auth/callback'
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
    })
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF, #F8FAFC)', display: 'flex', direction: 'rtl' }}>
      {/* Left branding panel */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>مدار — نظام الحجز الذكي</span>
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: '0 0 16px', lineHeight: 1.4 }}>
          عيادتك تستحق<br />نظاماً يعمل معها
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, marginBottom: 40 }}>
          حجوزات تلقائية، تذكيرات ذكية، وتقارير فورية — كل شيء في مكان واحد.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['٧٨٪ تقليل في المواعيد الفائتة', 'حجز ٢٤/٧ بدون موظف استقبال', 'إعداد كامل في ٣ أيام عمل'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'white', fontWeight: 900 }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal, sans-serif' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <AnimatePresence mode="wait">

            {step === 'email' && (
              <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', margin: '0 0 8px', fontFamily: 'Cairo, sans-serif' }}>مرحباً بك</h1>
                <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 32px', lineHeight: 1.6 }}>
                  أدخل بريدك وسنرسل لك رابط الدخول الفوري
                </p>

                <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="email@clinic.sa"
                      autoFocus
                      style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'ltr', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                    />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.5 }}
                    >
                      {error}
                      {error.includes('إنشاء حساب') && (
                        <button type="button" onClick={() => navigate('/clinic-os/signup')} style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, padding: 0 }}>
                          سجّل الآن ←
                        </button>
                      )}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    disabled={loading}
                    style={{ marginTop: 4, padding: '13px', borderRadius: 10, background: loading ? '#C7D2FE' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {loading ? 'جاري الإرسال...' : <><Mail size={15} /> أرسل رابط الدخول</>}
                  </motion.button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>ليس لديك حساب؟ </span>
                  <button onClick={() => navigate('/clinic-os/signup')} style={{ fontSize: 13, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>
                    سجّل الآن
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  style={{ display: 'inline-flex', marginBottom: 24 }}
                >
                  <div style={{ width: 72, height: 72, borderRadius: 22, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={32} style={{ color: '#4F46E5' }} />
                  </div>
                </motion.div>

                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: '0 0 10px', fontFamily: 'Cairo, sans-serif' }}>
                  تحقق من بريدك
                </h2>
                <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 6px', lineHeight: 1.6 }}>
                  أرسلنا رابط الدخول إلى
                </p>
                <p style={{ fontSize: 14, color: '#0F172A', fontWeight: 700, margin: '0 0 24px', direction: 'ltr' }}>
                  {email}
                </p>

                <div style={{ padding: '14px 18px', borderRadius: 10, background: '#F8FAFF', border: '1px solid #E0E7FF', marginBottom: 24, textAlign: 'right' }}>
                  <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.8 }}>
                    ١. افتح بريدك الإلكتروني<br />
                    ٢. انقر على <strong style={{ color: '#4F46E5' }}>رابط الدخول</strong> في الرسالة<br />
                    ٣. سيفتح الداشبورد مباشرة ✓
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <button onClick={resend} disabled={loading} style={{ fontSize: 13, color: loading ? '#CBD5E1' : '#4F46E5', background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
                    {loading ? 'جاري...' : 'أعد إرسال الرابط'}
                  </button>
                  <span style={{ color: '#CBD5E1' }}>·</span>
                  <button onClick={() => { setStep('email'); setError('') }} style={{ fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                    <ArrowLeft size={12} style={{ display: 'inline', marginLeft: 4 }} />
                    تغيير الإيميل
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
