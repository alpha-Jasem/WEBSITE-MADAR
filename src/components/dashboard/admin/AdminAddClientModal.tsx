import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, Eye, EyeOff, Building2, Car, Stethoscope, Briefcase } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Plan, BusinessType } from '../../../types'

// ─── Package definitions ──────────────────────────────────────────────────────
const PLANS: Array<{
  id: Plan; label: string; price: string; limit: number
  color: string; gradient: string; features: string[]
}> = [
  {
    id: 'starter', label: 'ابتدائي', price: '299', limit: 1000,
    color: '#06B6D4', gradient: 'from-cyan-500/20 to-cyan-500/5',
    features: ['واتساب أتوماتيك', 'CRM أساسي', 'تقارير أسبوعية', 'أتمتة واحدة'],
  },
  {
    id: 'growth', label: 'نمو', price: '799', limit: 4000,
    color: '#4F6EF7', gradient: 'from-indigo-500/20 to-indigo-500/5',
    features: ['كل مميزات ابتدائي', 'Claude AI', 'تقارير يومية', '3 أتمتة متوازية', 'Lead Scoring'],
  },
  {
    id: 'enterprise', label: 'مؤسسي', price: '1,999', limit: 10000,
    color: '#F59E0B', gradient: 'from-amber-500/20 to-amber-500/5',
    features: ['كل مميزات نمو', 'API مخصص', 'أتمتات غير محدودة', 'دعم أولوية 24/7', 'White Label'],
  },
]

const BUSINESS_TYPES: Array<{ id: BusinessType; label: string; icon: typeof Building2 }> = [
  { id: 'clinic',      label: 'عيادة طبية',       icon: Stethoscope },
  { id: 'car_wash',    label: 'مغسلة سيارات',      icon: Car },
  { id: 'real_estate', label: 'شركة عقارية',       icon: Building2 },
  { id: 'other',       label: 'أخرى',              icon: Briefcase },
]

interface Props { onClose: () => void; onSuccess: () => void }

export function AdminAddClientModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedPlan, setSelectedPlan] = useState<Plan>('growth')
  const [selectedType, setSelectedType] = useState<BusinessType>('other')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    company_name: '', owner_name: '', email: '', phone: '', password: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.company_name || !form.owner_name || !form.email || !form.password) {
      setError('يرجى تعبئة جميع الحقول المطلوبة')
      return
    }
    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-client`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            company_name: form.company_name,
            business_type: selectedType,
            plan: selectedPlan,
            owner_name: form.owner_name,
            owner_phone: form.phone,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'حدث خطأ'); setLoading(false); return }
      onSuccess()
      onClose()
    } catch {
      setError('خطأ في الاتصال بالخادم')
      setLoading(false)
    }
  }

  const plan = PLANS.find(p => p.id === selectedPlan)!

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
          style={{ background: '#0C0D14', border: '1px solid rgba(255,255,255,0.09)' }}
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <h2 className="text-lg font-bold text-white font-cairo">إضافة عميل جديد</h2>
              <p className="text-xs text-slate-500 font-tajawal mt-0.5">
                {step === 1 ? 'بيانات الحساب والنشاط التجاري' : 'اختيار الباقة المناسبة'}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]">
              <X size={16} className="text-slate-500" />
            </button>
          </div>

          {step === 1 ? (
            <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-work">بيانات العميل</h3>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">اسم الشركة *</label>
                  <input value={form.company_name} onChange={set('company_name')} dir="rtl"
                    placeholder="مثال: مغسلة النجوم"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-tajawal transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">اسم المالك *</label>
                  <input value={form.owner_name} onChange={set('owner_name')} dir="rtl"
                    placeholder="الاسم الكامل"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-tajawal transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">البريد الإلكتروني *</label>
                  <input value={form.email} onChange={set('email')} type="email" dir="ltr"
                    placeholder="client@example.com"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-work transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">رقم الهاتف</label>
                  <input value={form.phone} onChange={set('phone')} type="tel" dir="ltr"
                    placeholder="+966 5x xxx xxxx"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-work transition-colors" />
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">كلمة المرور *</label>
                  <div className="relative">
                    <input value={form.password} onChange={set('password')} type={showPass ? 'text' : 'password'} dir="ltr"
                      placeholder="8 أحرف على الأقل"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-work transition-colors pr-10" />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Business type */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest font-work mb-4">نوع النشاط</h3>
                <div className="grid grid-cols-2 gap-3">
                  {BUSINESS_TYPES.map(bt => {
                    const Icon = bt.icon
                    const active = selectedType === bt.id
                    return (
                      <motion.button key={bt.id} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedType(bt.id)}
                        className="relative flex flex-col items-center gap-3 p-4 rounded-xl transition-all cursor-pointer"
                        style={{
                          border: `1px solid ${active ? 'rgba(79,110,247,0.5)' : 'rgba(255,255,255,0.07)'}`,
                          background: active ? 'rgba(79,110,247,0.1)' : 'rgba(255,255,255,0.02)',
                        }}>
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: active ? 'rgba(79,110,247,0.2)' : 'rgba(255,255,255,0.05)' }}>
                          <Icon size={18} color={active ? '#4F6EF7' : '#64748b'} />
                        </div>
                        <span className="text-xs text-center font-tajawal"
                          style={{ color: active ? '#fff' : '#64748b' }}>{bt.label}</span>
                        {active && (
                          <div className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ background: '#4F6EF7' }}>
                            <Check size={10} color="#fff" />
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Preview of next step */}
                <div className="mt-6 p-4 rounded-xl"
                  style={{ background: 'rgba(79,110,247,0.06)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  <p className="text-xs text-indigo-400/70 font-tajawal">الخطوة التالية</p>
                  <p className="text-sm text-indigo-300 font-tajawal mt-1">اختيار الباقة وتحديد عدد المحادثات</p>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Package selection */
            <div className="p-7">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {PLANS.map(p => {
                  const active = selectedPlan === p.id
                  return (
                    <motion.button key={p.id} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedPlan(p.id)}
                      className="relative flex flex-col rounded-2xl p-5 cursor-pointer transition-all text-right"
                      style={{
                        border: `1.5px solid ${active ? p.color + '80' : 'rgba(255,255,255,0.07)'}`,
                        background: active ? `${p.color}12` : 'rgba(255,255,255,0.02)',
                        boxShadow: active ? `0 0 30px ${p.color}18` : 'none',
                      }}>
                      {active && (
                        <div className="absolute top-3 left-3 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: p.color }}>
                          <Check size={11} color="#000" />
                        </div>
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wider font-work mb-3"
                        style={{ color: p.color }}>{p.label}</span>
                      <div className="mb-1">
                        <span className="text-2xl font-black text-white font-work">SAR {p.price}</span>
                        <span className="text-xs text-slate-500 font-tajawal mr-1">/شهر</span>
                      </div>
                      <div className="text-xs font-work mb-4" style={{ color: p.color + 'cc' }}>
                        {p.limit.toLocaleString('en-US')} محادثة
                      </div>
                      <div className="space-y-2">
                        {p.features.map(f => (
                          <div key={f} className="flex items-center gap-2">
                            <Check size={11} style={{ color: p.color, flexShrink: 0 }} />
                            <span className="text-xs text-slate-400 font-tajawal">{f}</span>
                          </div>
                        ))}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Selected summary */}
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: `${plan.color}0d`, border: `1px solid ${plan.color}30` }}>
                <div>
                  <p className="text-xs text-slate-500 font-tajawal">الباقة المختارة</p>
                  <p className="text-sm font-bold font-cairo mt-0.5" style={{ color: plan.color }}>
                    باقة {plan.label} — {plan.limit.toLocaleString('en-US')} محادثة/شهر
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-tajawal">الاشتراك الشهري</p>
                  <p className="text-lg font-black text-white font-work">SAR {plan.price}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mx-7 mb-1 px-4 py-2.5 rounded-xl text-sm text-red-400 font-tajawal"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-7 py-5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex gap-2">
              {([1, 2] as const).map(s => (
                <div key={s} className="w-6 h-1.5 rounded-full transition-all"
                  style={{ background: step >= s ? '#4F6EF7' : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <div className="flex gap-3">
              {step === 2 && (
                <button onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors font-tajawal cursor-pointer">
                  السابق
                </button>
              )}
              {step === 1 ? (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (!form.company_name || !form.owner_name || !form.email || !form.password) {
                      setError('يرجى تعبئة الحقول المطلوبة أولاً')
                      return
                    }
                    setError('')
                    setStep(2)
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white font-cairo cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
                  التالي — اختر الباقة
                </motion.button>
              ) : (
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-black font-cairo cursor-pointer"
                  style={{ background: loading ? '#64748b' : `linear-gradient(135deg, ${plan.color}, ${plan.color}bb)` }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
