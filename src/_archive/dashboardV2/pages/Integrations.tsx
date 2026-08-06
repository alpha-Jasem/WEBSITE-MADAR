import { useMemo, useState } from 'react'
import { MessageCircle, Calendar, Star, Phone, AtSign, Lock } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicIntegrations, toggleIntegration } from '@/lib/clinicOSQueries'
import type { IntegrationStatus } from '@/types/clinicOS'
import { Card, Badge, Button } from '@/_archive/dashboardV2/components/primitives'
import { Skeleton } from '@/_archive/dashboardV2/components/uiExtras'

const ICON_BY_PROVIDER: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={19} />,
  google_calendar: <Calendar size={19} />,
  google_business: <Star size={19} />,
  voip: <Phone size={19} />,
  instagram: <AtSign size={19} />,
}

const COLOR_BY_PROVIDER: Record<string, { bg: string; fg: string }> = {
  whatsapp: { bg: '#DCFCE7', fg: '#16A34A' },
  google_calendar: { bg: '#DBEAFE', fg: '#2563EB' },
  google_business: { bg: '#FEF3C7', fg: '#D97706' },
  voip: { bg: '#EDE9FE', fg: '#7C3AED' },
  instagram: { bg: '#FCE7F3', fg: '#DB2777' },
}

const DESC_BY_PROVIDER: Record<string, string> = {
  whatsapp: 'استقبال وإرسال رسائل العملاء تلقائياً',
  google_calendar: 'مزامنة الحجوزات مع تقويم العمل',
  google_business: 'إدارة التقييمات والردود الآلية',
  voip: 'الرد الآلي على المكالمات الواردة',
  instagram: 'استقبال رسائل الاستفسار من إنستغرام',
}

// OAuth self-serve connect isn't wired for any provider yet — this stays a manual
// status flag until a provider's Client ID/Secret is registered.
const OAUTH_READY: Record<string, boolean> = {}

export function DashboardV2Integrations() {
  const { companyId, isDemo } = useClinicOS()
  const { data: rawIntegrations, loading, refetch } = useClinicIntegrations(companyId, isDemo)
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, IntegrationStatus>>({})
  const integrations = useMemo(() => (rawIntegrations || []).map((i) => (
    optimisticStatus[i.id] ? { ...i, status: optimisticStatus[i.id] } : i
  )), [rawIntegrations, optimisticStatus])

  async function toggle(id: string, current: IntegrationStatus) {
    if (isDemo) return
    const next: IntegrationStatus = current === 'connected' ? 'disconnected' : 'connected'
    setOptimisticStatus((s) => ({ ...s, [id]: next }))
    try {
      await toggleIntegration(id, next)
      refetch()
    } catch (e) {
      setOptimisticStatus((s) => { const { [id]: _drop, ...rest } = s; return rest })
      throw e
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التكاملات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>اربط قنوات التواصل والأدوات الخارجية بمدار — حالة الاتصال محفوظة فعلياً بحسابك</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16 }}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Skeleton width={42} height={42} radius="var(--radius-md)" />
              <div style={{ flex: 1 }}>
                <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
                <Skeleton width="85%" height={11} />
              </div>
            </div>
            <Skeleton width={100} height={30} radius="var(--radius-md)" style={{ marginTop: 14 }} />
          </Card>
        ))}
        {!loading && (integrations || []).map((i, idx) => {
          const color = COLOR_BY_PROVIDER[i.provider] || { bg: 'var(--brand-100)', fg: 'var(--brand-600)' }
          const oauthReady = OAUTH_READY[i.provider]
          return (
            <Card key={i.id} interactive glow delay={Math.min(idx * 0.05, 0.3)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 'var(--radius-md)', background: color.bg, color: color.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{ICON_BY_PROVIDER[i.provider] || <Star size={18} />}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 220 }}>{DESC_BY_PROVIDER[i.provider] || ''}</div>
                  </div>
                </div>
                <Badge tone={i.status === 'connected' ? 'success' : 'neutral'}>{i.status === 'connected' ? 'متصل' : 'غير متصل'}</Badge>
              </div>
              <Button size="sm" variant={i.status === 'connected' ? 'secondary' : 'primary'} onClick={() => toggle(i.id, i.status)} style={{ marginTop: 14 }}>
                {i.status === 'connected' ? 'قطع الاتصال' : 'ربط الآن'}
              </Button>
              {!oauthReady && i.status !== 'connected' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Lock size={11} /> الربط التلقائي (OAuth) قيد الإعداد — التبديل هنا يحدّث الحالة يدوياً حتى ذلك الحين
                </div>
              )}
            </Card>
          )
        })}
        {!loading && (integrations || []).length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>جارِ تجهيز التكاملات...</div>}
      </div>
    </div>
  )
}
