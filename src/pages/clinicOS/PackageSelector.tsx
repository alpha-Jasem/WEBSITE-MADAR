import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bot, CheckCircle, Lock, Zap, ArrowLeft } from 'lucide-react'
import { useClinicOS } from '../../context/ClinicOSContext'
import type { PackageType } from '../../types/clinicOS'

const PACKAGES = [
  {
    id: 'whatsapp' as PackageType,
    name: 'باقة واتساب',
    subtitle: 'حجز واتساب تلقائي',
    price: '٩,٩٩٩ ريال / سنة',
    badge: 'عرض إطلاق',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    color: '#4F46E5',
    border: '#C7D2FE',
    bg: '#EEF2FF',
    icon: Zap,
    features: [
      'حجز مباشر عبر واتساب ٢٤/٧',
      'تأكيدات وتذكيرات تلقائية',
      'إدارة المرضى والأطباء والمواعيد',
      'تقارير الحجوزات الأسبوعية',
    ],
    locked: ['وكيل مكالمات AI', 'تحليلات AI المتقدمة'],
    cta: 'جرب باقة النمو',
  },
  {
    id: 'ai_pro' as PackageType,
    name: 'باقة الحجز الذكي ٢٤/٧',
    subtitle: 'كل شيء + وكيل AI للمكالمات',
    price: '١٦,٩٩٩ ريال / سنة',
    badge: 'الأكثر طلباً',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    color: '#7C3AED',
    border: '#DDD6FE',
    bg: '#F5F3FF',
    icon: Bot,
    recommended: true,
    features: [
      'كل مزايا باقة النمو',
      'وكيل AI يستقبل ويحجز بالمكالمات',
      'نسخ وتحليل المحادثات تلقائياً',
      'تحليلات AI وتقارير ذكية متقدمة',
    ],
    locked: [],
    cta: 'جرب الحجز الذكي الكامل',
  },
]

export const PackageSelector = () => {
  const navigate = useNavigate()
  const { setPackageType, userName } = useClinicOS()

  const select = (pkg: PackageType) => {
    setPackageType(pkg)
    navigate('/clinic-os/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF, #F8FAFC)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: 780 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} style={{ color: 'white' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>مدار — نظام الحجز الذكي</span>
          </div>
          {userName && (
            <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginBottom: 16 }}>
              أهلاً {userName} 👋 — اختر الباقة التي تريد تجربتها
            </p>
          )}
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', margin: 0, fontFamily: 'Cairo, sans-serif' }}>
            أي باقة تناسب عيادتك؟
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginTop: 8 }}>
            يمكنك التبديل بين الباقتين في أي وقت داخل الداشبورد
          </p>
        </motion.div>

        {/* Package cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
          {PACKAGES.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => select(pkg.id)}
              whileHover={{ y: -4, boxShadow: `0 12px 40px ${pkg.color}25` }}
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                border: pkg.recommended ? `2px solid ${pkg.color}` : '1px solid #E2E8F0',
                padding: '28px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'box-shadow 0.2s',
              }}
            >
              {pkg.recommended && (
                <div style={{ position: 'absolute', top: -14, right: 24, padding: '5px 16px', borderRadius: 20, background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: 'white', fontSize: 11, fontWeight: 800, fontFamily: 'Cairo, sans-serif' }}>
                  ⭐ الأكثر طلباً
                </div>
              )}

              {/* Icon + Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: pkg.bg, border: `1px solid ${pkg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <pkg.icon size={24} style={{ color: pkg.color }} />
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: pkg.badgeBg }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: pkg.badgeColor, fontFamily: 'Cairo, sans-serif' }}>{pkg.badge}</span>
                </div>
              </div>

              {/* Name + Price */}
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', margin: '0 0 4px', fontFamily: 'Cairo, sans-serif' }}>{pkg.name}</h3>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 6px' }}>{pkg.subtitle}</p>
              <div style={{ fontSize: 14, fontWeight: 800, color: pkg.color, fontFamily: 'Cairo, sans-serif', marginBottom: 20 }}>{pkg.price}</div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {pkg.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle size={13} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#0F172A', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                  </div>
                ))}
                {pkg.locked.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: 0.45 }}>
                    <Lock size={13} style={{ color: '#94A3B8', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', textDecoration: 'line-through' }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ padding: '11px', borderRadius: 10, background: pkg.recommended ? `linear-gradient(135deg, ${pkg.color}, #4F46E5)` : pkg.bg, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: pkg.recommended ? 'white' : pkg.color, fontFamily: 'Cairo, sans-serif' }}>{pkg.cta}</span>
                <ArrowLeft size={14} style={{ color: pkg.recommended ? 'white' : pkg.color }} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}
        >
          التجربة مجانية بالكامل — ستشاهد بيانات تجريبية من "عيادات نور للأسنان — جدة"
        </motion.p>
      </div>
    </div>
  )
}
