import { useState } from 'react'
import { Eye, X, MessageCircle } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

const WA_NUMBER = '966546666005'

const WA_MESSAGES = {
  growth: 'مرحباً، شاهدت ديمو نظام الحجز الذكي وأرغب بالاشتراك في باقة نمو الحجوزات.',
  ai_pro: 'مرحباً، شاهدت ديمو نظام الحجز الذكي وأرغب بالاشتراك في باقة الحجز الذكي 24/7.',
}

export const DemoModeBanner = () => {
  const { packageType, isDemo } = useClinicOS()
  const [dismissed, setDismissed] = useState(false)

  const handleWhatsApp = () => {
    const msg = WA_MESSAGES[packageType]
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
  }

  if (!isDemo || dismissed) return null

  return (
    <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Eye size={15} style={{ color: 'rgba(255,255,255,0.9)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Cairo, sans-serif' }}>
          وضع التجربة
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal, sans-serif' }}>
          — هذه بيانات تجريبية لعيادة نور للأسنان
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={handleWhatsApp}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'white', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}
        >
          <MessageCircle size={13} />
          ابدأ بهذه الباقة
        </button>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 2 }}>
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
