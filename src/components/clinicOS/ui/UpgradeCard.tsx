import { Lock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface UpgradeCardProps {
  title?: string
  subtitle?: string
  compact?: boolean
}

export const UpgradeCard = ({
  title = 'متاح في باقة الحجز الذكي 24/7',
  subtitle = 'استقبل حجوزات المرضى على مدار الساعة وقلل المكالمات الضائعة.',
  compact = false,
}: UpgradeCardProps) => {
  const navigate = useNavigate()
  const { setPackageType } = useClinicOS()

  const handleUpgrade = () => {
    setPackageType('ai_pro')
    navigate('/clinic-os/demo/select')
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={14} style={{ color: '#7C3AED' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', fontFamily: 'Cairo, sans-serif' }}>{title}</span>
        </div>
        <button onClick={handleUpgrade} style={{ padding: '4px 12px', borderRadius: 6, background: '#4F46E5', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          ترقية
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '60px 32px', background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', borderRadius: 16, border: '1px solid #C7D2FE', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
        <Lock size={26} style={{ color: 'white' }} />
      </div>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 8px 0' }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0, maxWidth: 380, lineHeight: 1.7 }}>{subtitle}</p>
      </div>
      <button onClick={handleUpgrade} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.35)', fontFamily: 'Cairo, sans-serif' }}>
        <Zap size={15} />
        ترقية إلى باقة الحجز الذكي 24/7
      </button>
    </div>
  )
}
