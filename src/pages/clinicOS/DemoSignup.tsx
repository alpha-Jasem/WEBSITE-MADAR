import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, ArrowLeft, CheckCircle, Phone, Building2 } from 'lucide-react'
import { useClinicOS } from '../../context/ClinicOSContext'

export const DemoSignup = () => {
  const navigate = useNavigate()
  const { signup } = useClinicOS()
  const [form, setForm] = useState({ name: '', clinicName: '', phone: '', email: '', city: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const cities = ['جدة', 'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'أبها', 'تبوك', 'أخرى']

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'الاسم مطلوب'
    if (!form.clinicName.trim()) e.clinicName = 'اسم العيادة مطلوب'
    if (!form.phone.trim()) e.phone = 'رقم الجوال مطلوب'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'بريد إلكتروني صحيح مطلوب'
    if (!form.city) e.city = 'المدينة مطلوبة'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    await signup({ name: form.name, clinicName: form.clinicName, email: form.email, city: form.city })
    navigate('/clinic-os/demo-confirm')
  }

  const Field = ({ name, label, type = 'text', placeholder }: { name: keyof typeof form, label: string, type?: string, placeholder?: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={e => { setForm(p => ({ ...p, [name]: e.target.value })); setErrors(p => ({ ...p, [name]: '' })) }}
        placeholder={placeholder}
        style={{
          padding: '11px 14px', borderRadius: 9, border: `1px solid ${errors[name] ? '#EF4444' : '#E2E8F0'}`,
          fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'rtl', outline: 'none',
          background: '#FFFFFF', color: '#0F172A', transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
        onBlur={e => (e.currentTarget.style.borderColor = errors[name] ? '#EF4444' : '#E2E8F0')}
      />
      {errors[name] && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>{errors[name]}</span>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF, #F8FAFC)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', direction: 'rtl' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 520, background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 20px 60px rgba(79,70,229,0.1)' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={18} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>مدار — نظام الحجز الذكي</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', margin: '0 0 8px' }}>جرب الداشبورد مجاناً</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.5 }}>
            سنرسل لك رابط الدخول فوراً — بيانات تجريبية كاملة، بدون أي التزام
          </p>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 20, padding: '14px 32px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', justifyContent: 'center' }}>
          {[['بدون بطاقة ائتمان', CheckCircle], ['ضمان ٣٠ يوماً', CheckCircle], ['إعداد فوري', CheckCircle]].map(([l, I], i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle size={12} style={{ color: '#10B981' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{l as string}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field name="name" label="اسمك الكريم" placeholder="مثال: أحمد العتيبي" />
          <Field name="clinicName" label="اسم العيادة" placeholder="مثال: عيادات الأمل للأسنان" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>رقم الجوال</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: '' })) }}
                placeholder="05xxxxxxxx"
                style={{ padding: '11px 14px', borderRadius: 9, border: `1px solid ${errors.phone ? '#EF4444' : '#E2E8F0'}`, fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'ltr', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                onBlur={e => (e.currentTarget.style.borderColor = errors.phone ? '#EF4444' : '#E2E8F0')}
              />
              {errors.phone && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>{errors.phone}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>المدينة</label>
              <select
                value={form.city}
                onChange={e => { setForm(p => ({ ...p, city: e.target.value })); setErrors(p => ({ ...p, city: '' })) }}
                style={{ padding: '11px 14px', borderRadius: 9, border: `1px solid ${errors.city ? '#EF4444' : '#E2E8F0'}`, fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'rtl', outline: 'none', background: '#FFFFFF', color: form.city ? '#0F172A' : '#94A3B8', cursor: 'pointer' }}
              >
                <option value="">اختر مدينتك</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <span style={{ fontSize: 11, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>{errors.city}</span>}
            </div>
          </div>

          <Field name="email" label="البريد الإلكتروني" type="email" placeholder="email@example.com" />

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            disabled={loading}
            style={{ marginTop: 8, padding: '13px', borderRadius: 10, background: loading ? '#C7D2FE' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? 'جاري الإرسال...' : <>ابدأ التجربة المجانية <ArrowLeft size={16} /></>}
          </motion.button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
            بالمتابعة، أنت توافق على{' '}
            <a href="/terms" style={{ color: '#4F46E5', textDecoration: 'none' }}>شروط الخدمة</a>
            {' '}و{' '}
            <a href="/privacy" style={{ color: '#4F46E5', textDecoration: 'none' }}>سياسة الخصوصية</a>
          </p>

          <div style={{ textAlign: 'center' }}>
            <button type="button" onClick={() => navigate('/clinic-os/login')} style={{ background: 'none', border: 'none', fontSize: 13, color: '#4F46E5', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
              لديك حساب بالفعل؟ سجل الدخول
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
