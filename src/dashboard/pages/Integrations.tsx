import { useMemo, useState } from 'react'
import { MessageCircle, Calendar, Star, Phone, AtSign, Lock } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useIntegrations, toggleIntegration } from '@/lib/dashboardQueries'
import { isIntegrationVisible } from '@/dashboard/modules'
import type { IntegrationStatus } from '@/types/dashboard'
import { Card, Button } from '@/dashboard/components/primitives'
import { NightPage, PageHead, Chip, EmptyLine, fmtNum } from './shared/night'
import { Skeleton } from '@/dashboard/components/uiExtras'

const ICON_BY_PROVIDER: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={19} />,
  google_calendar: <Calendar size={19} />,
  google_business: <Star size={19} />,
  voip: <Phone size={19} />,
  instagram: <AtSign size={19} />,
}

// Semantic tints from the tokens, so the tiles read on Night and Day alike.
const COLOR_BY_PROVIDER: Record<string, { bg: string; fg: string }> = {
  whatsapp: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
  google_calendar: { bg: 'var(--info-bg)', fg: 'var(--info)' },
  google_business: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  voip: { bg: 'var(--ai-bg)', fg: 'var(--ai)' },
  instagram: { bg: 'var(--bad-bg)', fg: 'var(--bad)' },
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
// Channels the Madar team connects on the voice platform; the rest need a self-serve OAuth link that is not live yet.
const MANAGED = new Set(['whatsapp', 'voip'])

export function DashboardV2Integrations() {
  const { companyId, isDemo, hasModule } = useWorkspace()
  const { data: rawIntegrations, loading, refetch } = useIntegrations(companyId, isDemo)
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, IntegrationStatus>>({})
  // Integrations for sections this company doesn't have (e.g. Google reviews for a store) are hidden.
  const integrations = useMemo(() => (rawIntegrations || [])
    .filter((i) => isIntegrationVisible(i.provider, hasModule))
    .map((i) => (optimisticStatus[i.id] ? { ...i, status: optimisticStatus[i.id] } : i)),
  [rawIntegrations, optimisticStatus, hasModule])

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
    <NightPage>
      <PageHead
        title="التكاملات"
        sub={loading ? 'اربط قنوات التواصل والأدوات الخارجية بمدار' : `${fmtNum(integrations.filter((i) => i.status === 'connected').length)} متصل من ${fmtNum(integrations.length)} · حالة الاتصال محفوظة فعلياً بحسابك`}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
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
            <Card key={i.id} delay={Math.min(idx * 0.05, 0.3)} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                  <div className="np-icon-tile" style={{ width: 42, height: 42, background: color.bg, color: color.fg }}>{ICON_BY_PROVIDER[i.provider] || <Star size={18} />}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{i.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{DESC_BY_PROVIDER[i.provider] || ''}</div>
                  </div>
                </div>
                <Chip tone={i.status === 'connected' ? 'ok' : 'muted'}>{i.status === 'connected' ? 'متصل' : 'غير متصل'}</Chip>
              </div>
              {MANAGED.has(i.provider) ? (
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Lock size={11} /> يُربط ويُدار من فريق مدار. للتغيير كلمنا.
                </div>
              ) : (
                <Button size="sm" variant="secondary" disabled style={{ marginTop: 14, alignSelf: 'flex-start' }}>قريبًا</Button>
              )}
            </Card>
          )
        })}
      </div>
      {!loading && (integrations || []).length === 0 && <Card><EmptyLine>جارِ تجهيز التكاملات...</EmptyLine></Card>}
    </NightPage>
  )
}
