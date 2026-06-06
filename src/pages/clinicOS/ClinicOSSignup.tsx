import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, Eye, EyeOff, CheckCircle2, ArrowLeft, Loader2, Phone, Mail, Lock, User, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BG      = '#09090B'
const GREEN   = '#10B981'
const BORDER  = 'rgba(255,255,255,0.08)'
const TEXT    = '#FAFAFA'
const MUTED   = 'rgba(250,250,250,0.45)'
const CARD    = 'rgba(255,255,255,0.03)'

interface FormData {
  clinic_name: string
  owner_name: string
  phone: string
  email: string
  password: string
}

const FIELD_CONFIG = [
  { key: 'clinic_name', label: 'اسم العيادة',      placeholder: 'عيادة النور للأسنان',   icon: Building2, type: 'text'     },
  { key: 'owner_name',  label: 'اسم المسؤول',       placeholder: 'د. أحمد العمري',        icon: User,      type: 'text'     },
  { key: 'phone',       label: 'رقم الجوال',         placeholder: '05xxxxxxxx',            icon: Phone,     type: 'tel'      },
  { key: 'email',       label: 'البريد الإلكتروني',  placeholder: 'email@clinic.sa',       icon: Mail,      type: 'email'    },
  { key: 'password',    label: 'كلمة المرور',         placeholder: '٨ أحرف على الأقل',    icon: Lock,      type: 'password' },
] as const

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
  const [form, setForm] = useState<FormData>({ clinic_name: '', owner_name: '', phone: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.clinic_name.trim() || !form.owner_name.trim() || !form.phone.trim() || !form.email.trim() || !form.password.trim()) {
      setError('يرجى ملء جميع الحقول')
      return
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون ٨ أحرف على الأقل')
      return
    }

    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: { data: { full_name: form.owner_name.trim() } },
      })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('فشل إنشاء الحساب، حاول مرة أخرى')

      // 2. Create company row
      const { data: company, error: companyErr } = await supabase
        .from('companies')
        .insert({
          name: form.clinic_name.trim(),
          industry: 'clinic',
          plan: 'starter',
          package_type: pkgParam,
          status: 'trial',
          owner_name: form.owner_name.trim(),
          owner_email: form.email.trim().toLowerCase(),
          owner_phone: form.phone.trim(),
          auth_user_id: userId,
          business_type: 'clinic',
        })
        .select('id')
        .single()
      if (companyErr) throw companyErr

      // 3. Create users row
      await supabase.from('users').upsert({
        id: userId,
        email: form.email.trim().toLowerCase(),
        full_name: form.owner_name.trim(),
        role: 'client',
        company_id: company.id,
      })

      setDone(true)
      // Auto-redirect to dashboard — status=trial so isDemo=true until admin activates
      setTimeout(() => navigate('/clinic-os/dashboard'), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ، حاول مرة أخرى'
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('هذا البريد الإلكتروني مسجّل مسبقاً. تفضل تسجيل الدخول.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', overflow: 'hidden' }}>

      {/* Background glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', right: '15%', width: 600, height: 600, background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%)', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(52,211,153,0.06) 0%, transparent 65%)', filter: 'blur(80px)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 980, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center', position: 'relative', zIndex: 1 }}>

        {/* ── Left: Info panel ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Logo + badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(16,185,129,0.12)`, border: `1px solid rgba(16,185,129,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={18} color={GREEN} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, fontFamily: 'Cairo, sans-serif' }}>مدار Clinic OS</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 14px', lineHeight: 1.15 }}>
              {pkgParam === 'ai_pro' ? 'باقة AI Voice + واتساب' : 'باقة واتساب'}<br />
              <span style={{ background: pkgParam === 'ai_pro' ? 'linear-gradient(125deg, #A78BFA, #7C3AED)' : 'linear-gradient(125deg, #34D399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                للعيادات
              </span>
            </h1>
            <p style={{ fontSize: 14, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, margin: 0 }}>
              نظام إدارة مواعيد كامل مع حجز تلقائي عبر واتساب. جاهز خلال ٤٨ ساعة.
            </p>
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={15} color={GREEN} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
              </motion.div>
            ))}
          </div>

          {/* Price */}
          <div style={{ padding: '18px 20px', borderRadius: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, fontFamily: 'Cairo, sans-serif', letterSpacing: '0.1em', marginBottom: 6 }}>السعر السنوي</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif' }}>٦,٩٠٠</span>
              <span style={{ fontSize: 14, color: MUTED, fontFamily: 'Tajawal, sans-serif' }}>ريال / سنة</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>= ٥٧٥ ريال شهرياً</div>
          </div>

          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Tajawal, sans-serif' }}>
            ✦ يمكنك الترقية إلى باقة AI Voice في أي وقت
          </div>
        </motion.div>

        {/* ── Right: Signup form ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 24, padding: 32 }}>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done"
                initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '32px 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                  <CheckCircle2 size={56} color={GREEN} style={{ margin: '0 auto 20px' }} />
                </motion.div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>تم إنشاء حسابك!</h2>
                <p style={{ fontSize: 13, color: MUTED, fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8 }}>
                  جارٍ تحويلك إلى لوحة التحكم...
                </p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: TEXT, fontFamily: 'Cairo, sans-serif', margin: '0 0 6px' }}>
                  إنشاء حساب جديد
                </h2>
                <p style={{ fontSize: 12, color: MUTED, fontFamily: 'Tajawal, sans-serif', margin: '0 0 24px' }}>
                  لديك حساب؟{' '}
                  <Link to="/login" style={{ color: GREEN, textDecoration: 'none', fontWeight: 700 }}>سجّل الدخول</Link>
                </p>

                {FIELD_CONFIG.map(({ key, label, placeholder, icon: Icon, type }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cairo, sans-serif', marginBottom: 6, letterSpacing: '0.05em' }}>
                      {label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={14} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                      <input
                        type={key === 'password' ? (showPass ? 'text' : 'password') : type}
                        value={form[key]}
                        onChange={set(key)}
                        placeholder={placeholder}
                        dir={key === 'email' || key === 'password' ? 'ltr' : 'rtl'}
                        style={{
                          width: '100%', padding: '10px 38px 10px 36px',
                          background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
                          borderRadius: 10, color: TEXT, fontSize: 13,
                          fontFamily: key === 'email' || key === 'password' ? 'monospace' : 'Tajawal, sans-serif',
                          outline: 'none', boxSizing: 'border-box',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = `rgba(16,185,129,0.4)`)}
                        onBlur={e => (e.currentTarget.style.borderColor = BORDER)}
                      />
                      {key === 'password' && (
                        <button type="button" onClick={() => setShowPass(v => !v)}
                          style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      )}
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
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.97 } : {}}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 12, marginTop: 4,
                    background: loading ? 'rgba(16,185,129,0.4)' : `linear-gradient(135deg, #10B981, #34D399)`,
                    border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                    color: 'white', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background 0.2s',
                  }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={15} />}
                  {loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب والبدء'}
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

      {/* Mobile: stack vertically */}
      <style>{`
        @media (max-width: 700px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
