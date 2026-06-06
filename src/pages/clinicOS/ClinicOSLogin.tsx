import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const ClinicOSLogin = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني وكلمة المرور'); return }
    setLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      navigate('/clinic-os/dashboard')
    } catch {
      setError('بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF, #F8FAFC)', display: 'flex', direction: 'rtl' }}>
      {/* Left panel (hidden below 768px ideally) */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={20} style={{ color: 'white' }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>مدار — نظام الحجز الذكي</span>
        </div>

        <h2 style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: '0 0 16px', lineHeight: 1.4 }}>
          عيادتك تستحق
          <br />
          نظاماً يعمل معها
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, marginBottom: 40 }}>
          حجوزات تلقائية، تذكيرات ذكية، وتقارير فورية — كل شيء في مكان واحد.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            '٧٨٪ تقليل في المواعيد الفائتة',
            'حجز ٢٤/٧ بدون موظف استقبال',
            'إعداد كامل في ٣ أيام عمل',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'white', fontWeight: 900 }}>✓</span>
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal, sans-serif' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', margin: '0 0 8px', fontFamily: 'Cairo, sans-serif' }}>مرحباً بك</h1>
          <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 32px' }}>
            ادخل بياناتك للوصول إلى لوحة تحكم العيادة
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="email@clinic.sa"
                style={{ padding: '12px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'ltr', outline: 'none', background: '#FFFFFF', color: '#0F172A' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', fontFamily: 'Cairo, sans-serif' }}>كلمة المرور</label>
                <button type="button" onClick={() => navigate('/forgot-password')} style={{ fontSize: 12, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'Tajawal, sans-serif', direction: 'ltr', outline: 'none', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4F46E5')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif' }}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={loading}
              style={{ marginTop: 4, padding: '13px', borderRadius: 10, background: loading ? '#C7D2FE' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? 'جاري الدخول...' : <>دخول <ArrowLeft size={16} /></>}
            </motion.button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>ليس لديك حساب؟ </span>
            <button onClick={() => navigate('/clinic-os/signup')} style={{ fontSize: 13, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>
              سجّل الآن
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
