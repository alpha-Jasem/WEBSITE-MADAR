import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Bot, ArrowLeft } from 'lucide-react'

export const DemoConfirm = () => {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ECFDF5, #EEF2FF, #F8FAFC)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', direction: 'rtl' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}
        style={{ width: '100%', maxWidth: 480, background: '#FFFFFF', borderRadius: 24, border: '1px solid #E2E8F0', padding: '52px 40px', textAlign: 'center', boxShadow: '0 20px 60px rgba(16,185,129,0.1)' }}
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
        >
          <CheckCircle size={40} style={{ color: '#10B981' }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', margin: '0 0 12px', fontFamily: 'Cairo, sans-serif' }}>
            تم التسجيل بنجاح! 🎉
          </h1>
          <p style={{ fontSize: 14, color: '#475569', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: '0 0 32px' }}>
            تفاصيل الدخول وصلت على بريدك الإلكتروني.
            <br />
            الآن جاهز تجرب الداشبورد الكامل — اختر باقتك وابدأ.
          </p>

          <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '20px', marginBottom: 28, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginBottom: 12 }}>ما ستشاهده في الداشبورد:</div>
            {[
              'لوحة تحكم مع بيانات عيادة حقيقية',
              'إدارة المواعيد والمرضى والأطباء',
              'سجل رسائل واتساب التلقائية',
              'وكيل الحجز الذكي (باقة AI Pro)',
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none' }}>
                <CheckCircle size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#0F172A', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
              </div>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/clinic-os/demo/select')}
            style={{ width: '100%', padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            اختر باقتك وابدأ التجربة <ArrowLeft size={16} />
          </motion.button>

          <button
            onClick={() => navigate('/clinic-os/login')}
            style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 13, color: '#64748B', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
          >
            أو سجل الدخول بحسابك
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
