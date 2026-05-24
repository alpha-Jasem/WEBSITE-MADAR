import { Lock, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MADAR_WHATSAPP_NUMBER, PLAN_LABELS } from '../../lib/constants'

interface Props {
  locked: boolean
  requiredPlan: 'pro' | 'premium'
  featureName: string
  benefit: string
  companyName?: string
  currentPlan?: string
  children: React.ReactNode
}

function buildWhatsAppUrl(companyName: string, currentPlan: string, requestedPlan: string) {
  const msg = `أهلاً، أود ترقية باقتي في Madar OS.\n\nالمنشأة: ${companyName}\nالباقة الحالية: ${currentPlan}\nالباقة المطلوبة: ${requestedPlan}\n\nأرجو المساعدة في الترقية.`
  return `https://wa.me/${MADAR_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export function FeatureLock({ locked, requiredPlan, featureName, benefit, companyName = 'منشأتي', currentPlan = 'Starter', children }: Props) {
  const navigate = useNavigate()
  const targetPlanLabel = requiredPlan === 'pro' ? 'Pro' : 'Premium'
  const targetPlanDb = requiredPlan === 'pro' ? 'growth' : 'enterprise'
  const requestedLabel = PLAN_LABELS[targetPlanDb]

  if (!locked) return <>{children}</>

  const waUrl = buildWhatsAppUrl(companyName, currentPlan, requestedLabel)

  return (
    <div style={{ position: 'relative' }}>
      {/* Blurred children beneath */}
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
      }}>
        <div style={{
          background: 'rgba(13, 20, 34, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 20,
          padding: '28px 32px',
          maxWidth: 340,
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(99,102,241,0.2)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={22} color="#A5B4FC" />
          </div>

          <p style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: '0 0 8px' }}>
            {featureName}
          </p>
          <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: '0 0 20px', lineHeight: 1.6 }}>
            {benefit}
          </p>

          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '11px 0', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'Tajawal, sans-serif', textDecoration: 'none',
              marginBottom: 10,
              boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            }}
          >
            <Sparkles size={14} />
            ترقية إلى {targetPlanLabel}
          </a>

          <button
            onClick={() => navigate('/client/upgrade')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6366F1', fontSize: 12, fontFamily: 'Tajawal, sans-serif',
              textDecoration: 'underline',
            }}
          >
            عرض جميع الباقات
          </button>
        </div>
      </div>
    </div>
  )
}
