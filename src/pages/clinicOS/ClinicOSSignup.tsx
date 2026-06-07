import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, CheckCircle2, ArrowLeft, Loader2, Phone, Mail, User, Building2, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BG     = '#09090B'
const GREEN  = '#10B981'
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

  // Step 1 form state
  const [clinicName, setClinicName] = useState('')
  const [ownerName, setOwnerName]   = useState('')
  const [phone, setPhone]           = useState('')
  const [email, setEmail]           = useState('')

  // Step 2 OTP state
  const [otp, setOtp] = useState('')

  // UI state
  const [step, setStep]       = useState<'form' | 'otp' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // ── Step 1: send OTP ────────────────────────────────────────────────────────
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!clinicName.trim() || !ownerName.trim() || !phone.trim() || !email.trim()) {
      setError('يرجى ملء جميع الحقول'); return
    }
    setLoading(true)
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          data: { full_name: ownerName.trim() },
        },
      })
      if (otpErr) throw otpErr
      setStep('otp')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ، حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify OTP + create company ────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (otp.trim().length < 6) { setError('الكود يجب أن يكون ٦ أرقام'); return }
    setLoading(true)
    try {
      // Verify OTP → establishes session
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      })
      if (verifyErr) throw verifyErr

      const userId = verifyData.user?.id
      if (!userId) throw new Error('فشل التحقق، حاول مرة أخرى')

      // Create company (session is now active)
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .insert({
          name: clinicName.trim(),
          industry: 'clinic',
          plan: 'starter',
          package_type: pkgParam,
          status: 'trial',
          owner_name: ownerName.trim(),
          owner_email: email.trim().toLowerCase(),
          owner_phone: phone.trim(),
          auth_user_id: userId,
          business_type: 'clinic',
        })
        .select('id')
        .single()

      if (companyErr) throw companyErr

      // Create users row
      await supabase.from('users').upsert({
        id: userId,
        email: email.trim().toLowerCase(),
        full_name: ownerName.trim(),
        role: 'client',
      })

      setStep('done')
      setTimeout(() => navigate('/clinic-os/dashboard?welcome=1'), 1400)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ، حاول مرة أخرى'
      if (msg.includes('Token has expired') || msg.includes('invalid') || msg.includes('expired')) {
        setError('الكود منتهي أو غير صحيح. تأكد من الكود أو اطلب كوداً جديداً.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setError(null)
    setOtp('')
    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    })
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' }}>

      {/* Background glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '15%', width: 600, height: 600, background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(52,211,153,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* ── Left: Info panel ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={18} color={GREEN} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif' }}>مدار Clinic OS</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 14px', lineHeight: 1.15 }}>
              {pkgParam === 'ai_pro' ? 'باقة AI Voice + واتساب' : 'باقة واتساب'}<br />
              <span style={{ background: pkgParam === 'ai_pro' ? 'linear-gradient(125deg,#A78BFA,#7C3AED)' : 'linear-gradient(125deg,#34D399,#10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                للعيادات
              </span>
            </h1>
            <p style={{ fontSize: 14, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, margin: 0 }}>
              نظام إدارة مواعيد كامل مع حجز تلقائي عبر واتساب. جاهز خلال ٤٨ ساعة.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={15} color={GREEN} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
              </motion.div>
            ))}
          </div>

          <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, fontFamily: 'Cairo, sans-serif', letterSpacing: '0.1em', marginBottom: 6 }}>السعر السنوي</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif' }}>
                {pkgParam === 'ai_pro' ? '١٦,٩٩٩' : '٩,٩٩٩'}
              </span>
              <span style={{ fontSize: 14, color: MUTED, fontFamily: 'Tajawal, sans-serif' }}>ريال / سنة</span>
            </div>
          </div>
        </motion.div>

        {/* ── Right: Form / OTP / Done ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32 }}>

          <AnimatePresence mode="wait">

            {/* ─── DONE ─── */}
            {step === 'done' && (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '32px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                  <CheckCircle2 size={56} color={GREEN} style={{ margin: '0 auto 20px' }} />
                </motion.div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>تم إنشاء حسابك!</h2>
                <p style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8 }}>
                  جارٍ تحويلك إلى لوحة التحكم...
                </p>
              </motion.div>
            )}

            {/* ─── OTP STEP ─── */}
            {step === 'otp' && (
              <motion.form key="otp" onSubmit={handleVerifyOtp}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <KeyRound size={22} color={GREEN} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 8px' }}>تحقق من بريدك الإلكتروني</h2>
                  <p style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>
                    أرسلنا كود مكوّن من ٦ أرقام إلى<br />
                    <span style={{ color: GREEN, fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>{email}</span>
                  </p>
                </div>

                {/* OTP input */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif', marginBottom: 8, letterSpacing: '0.05em' }}>
                    كود التحقق
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(null) }}
                    placeholder="• • • • • •"
                    autoFocus
                    style={{
                      width: '100%', padding: '14px', textAlign: 'center',
                      letterSpacing: '0.4em', fontSize: 24, fontWeight: 900,
                      background: 'rgba(255,255,255,0.06)', border: `1px solid ${otp.length === 6 ? 'rgba(16,185,129,0.5)' : BORDER}`,
                      borderRadius: 12, color: TEXT, fontFamily: 'monospace',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = otp.length === 6 ? 'rgba(16,185,129,0.5)' : BORDER)}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#FCA5A5', fontFamily: 'Tajawal, sans-serif', marginBottom: 14 }}>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button type="submit" disabled={loading || otp.length < 6}
                  whileHover={!loading && otp.length === 6 ? { scale: 1.02 } : {}}
                  whileTap={!loading && otp.length === 6 ? { scale: 0.97 } : {}}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12, marginBottom: 14,
                    background: otp.length < 6 || loading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10B981,#34D399)',
                    border: 'none', cursor: otp.length < 6 || loading ? 'not-allowed' : 'pointer',
                    color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {loading ? 'جارٍ التحقق...' : 'تأكيد الكود وإنشاء الحساب'}
                </motion.button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <button type="button" onClick={resendOtp}
                    style={{ fontSize: 12, color: GREEN, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                    أعد إرسال الكود
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                  <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(null) }}
                    style={{ fontSize: 12, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                    تغيير الإيميل
                  </button>
                </div>
              </motion.form>
            )}

            {/* ─── FORM STEP ─── */}
            {step === 'form' && (
              <motion.form key="form" onSubmit={handleSubmitForm}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 6px' }}>إنشاء حساب جديد</h2>
                <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Tajawal, sans-serif', margin: '0 0 24px' }}>
                  لديك حساب؟{' '}
                  <Link to="/clinic-os/login" style={{ color: GREEN, textDecoration: 'none', fontWeight: 700 }}>سجّل الدخول</Link>
                </p>

                {[
                  { label: 'اسم العيادة',         placeholder: 'عيادة النور للأسنان',   icon: Building2, value: clinicName, set: setClinicName, dir: 'rtl'  },
                  { label: 'اسم المسؤول',          placeholder: 'د. أحمد العمري',        icon: User,      value: ownerName,  set: setOwnerName,  dir: 'rtl'  },
                  { label: 'رقم الجوال',            placeholder: '05xxxxxxxx',            icon: Phone,     value: phone,      set: setPhone,      dir: 'ltr'  },
                  { label: 'البريد الإلكتروني',    placeholder: 'email@clinic.sa',       icon: Mail,      value: email,      set: setEmail,      dir: 'ltr'  },
                ].map(({ label, placeholder, icon: Icon, value, set, dir }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif', marginBottom: 6, letterSpacing: '0.05em' }}>
                      {label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={14} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                      <input
                        type={label.includes('بريد') ? 'email' : label.includes('جوال') ? 'tel' : 'text'}
                        value={value}
                        onChange={e => { set(e.target.value); setError(null) }}
                        placeholder={placeholder}
                        dir={dir}
                        style={{
                          width: '100%', padding: '10px 38px 10px 12px',
                          background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                          borderRadius: 10, color: TEXT, fontSize: 13,
                          fontFamily: dir === 'ltr' ? 'monospace' : 'Tajawal, sans-serif',
                          outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
                        onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                      />
                    </div>
                  </div>
                ))}

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#FCA5A5', fontFamily: 'Tajawal, sans-serif', marginBottom: 14 }}>
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button type="submit" disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12, marginTop: 4,
                    background: loading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg,#10B981,#34D399)',
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={15} />}
                  {loading ? 'جارٍ الإرسال...' : 'إرسال كود التحقق'}
                </motion.button>

                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', fontFamily: 'Tajawal, sans-serif', textAlign: 'center', marginTop: 16, lineHeight: 1.7 }}>
                  بالتسجيل توافق على{' '}
                  <Link to="/terms" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>شروط الاستخدام</Link>
                  {' '}و{' '}
                  <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>سياسة الخصوصية</Link>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
