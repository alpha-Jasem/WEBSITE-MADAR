import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, Mail, Phone, User, Building2, Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BG     = '#09090B'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT   = '#FAFAFA'
const MUTED  = 'rgba(250,250,250,0.45)'
const CARD   = 'rgba(255,255,255,0.03)'

const FEATURES = [
  'حجز مواعيد عبر واتساب ٢٤/٧',
  'تأكيدات وتذكيرات تلقائية',
  'داشبورد إدارة كامل',
  'تقارير أسبوعية للحجوزات',
]

export const ClinicOSSignup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pkgParam = searchParams.get('pkg') === 'ai_pro' ? 'ai_pro' : 'whatsapp'

  const [step, setStep]           = useState<'form' | 'sent'>('form')
  const [clinicName, setClinicName] = useState('')
  const [ownerName, setOwnerName]   = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicName.trim() || !ownerName.trim() || !phone.trim() || !email.trim() || !password) {
      setError('يرجى تعبئة جميع الحقول')
      return
    }
    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Save clinic data — AuthCallback will create the company after email confirmation
      const { error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: 'https://madar.software/auth/callback',
          data: {
            full_name: ownerName.trim(),
            account_type: 'clinic',
            business_type: 'clinic',
            clinic_name: clinicName.trim(),
            owner_phone: phone.trim(),
            package_type: pkgParam,
          },
        },
      })
      if (signUpErr) throw signUpErr
      setStep('sent')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setError('هذا البريد الإلكتروني مسجّل مسبقاً. يمكنك الدخول من صفحة تسجيل الدخول.')
      } else {
        setError(msg || 'حدث خطأ، حاول مجدداً')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 40px',
    borderRadius: 10, border: `1px solid ${BORDER}`,
    background: CARD, color: TEXT, fontSize: 14,
    fontFamily: 'Tajawal, sans-serif', outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', direction: 'rtl' }}>
      {/* Left branding */}
      <div style={{ flex: 1, padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 52 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={17} color="white" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif' }}>Clinic OS</span>
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', letterSpacing: '0.1em', marginBottom: 10, fontFamily: 'Cairo, sans-serif' }}>
            نظام إدارة العيادة
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: TEXT, margin: 0, lineHeight: 1.35, fontFamily: 'Cairo, sans-serif' }}>
            حجوزات تلقائية<br />
            <span style={{ color: '#4F46E5' }}>بدون موظف استقبال</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#818CF8' }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <AnimatePresence mode="wait">

            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: TEXT, margin: '0 0 6px', fontFamily: 'Cairo, sans-serif' }}>
                  أنشئ حسابك مجاناً
                </h1>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 28px', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>
                  سنرسل لك رابط تفعيل على بريدك الإلكتروني
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                    <input style={inputStyle} placeholder="اسم العيادة" value={clinicName}
                      onChange={e => { setClinicName(e.target.value); setError('') }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                    <input style={inputStyle} placeholder="اسمك الكريم" value={ownerName}
                      onChange={e => { setOwnerName(e.target.value); setError('') }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Phone size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                    <input style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} placeholder="05xxxxxxxx" type="tel" value={phone}
                      onChange={e => { setPhone(e.target.value); setError('') }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                    <input style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }} placeholder="email@clinic.sa" type="email" value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)} />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: MUTED, pointerEvents: 'none' }} />
                    <input
                      style={{ ...inputStyle, direction: 'ltr', paddingLeft: '40px' }}
                      placeholder="كلمة المرور (8 أحرف على الأقل)"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                      onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, display: 'flex', alignItems: 'center' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#FCA5A5', fontFamily: 'Tajawal, sans-serif' }}>
                      {error}
                    </motion.div>
                  )}

                  <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
                    style={{ marginTop: 4, padding: '13px', borderRadius: 11, background: loading ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: 'white', border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                  </motion.button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <span style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif' }}>لديك حساب؟ </span>
                  <button onClick={() => navigate('/login')} style={{ fontSize: 13, color: '#818CF8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>
                    ادخل هنا
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  style={{ display: 'inline-flex', marginBottom: 24 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 22, background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={32} style={{ color: '#818CF8' }} />
                  </div>
                </motion.div>

                <h2 style={{ fontSize: 24, fontWeight: 900, color: TEXT, margin: '0 0 10px', fontFamily: 'Cairo, sans-serif' }}>
                  تحقق من بريدك الإلكتروني
                </h2>
                <p style={{ fontSize: 14, color: MUTED, margin: '0 0 8px', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>
                  أرسلنا رابط التفعيل إلى
                </p>
                <p style={{ fontSize: 15, color: TEXT, fontWeight: 700, margin: '0 0 28px', direction: 'ltr' }}>
                  {email}
                </p>

                <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(79,70,229,0.07)', border: '1px solid rgba(79,70,229,0.15)', marginBottom: 28, textAlign: 'right' }}>
                  <p style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.9 }}>
                    ١. افتح بريدك الإلكتروني<br />
                    ٢. ابحث عن رسالة من <strong style={{ color: TEXT }}>Supabase / Madar</strong><br />
                    ٣. انقر على <strong style={{ color: '#818CF8' }}>رابط التفعيل</strong><br />
                    ٤. سيفتح الداشبورد تلقائياً ✓<br />
                    ٥. الدخولات القادمة من <strong style={{ color: TEXT }}>madar.software/login</strong>
                  </p>
                </div>

                <button onClick={() => { setStep('form'); setError('') }}
                  style={{ fontSize: 13, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  ← تغيير البيانات
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
