import { useMemo, useState } from 'react'
import { MessageCircle, PlugZap } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useMessages, useIntegrations } from '@/lib/dashboardQueries'
import { Card, Button } from '@/dashboard/components/primitives'
import { EmptyState, KpiCardSkeleton } from '@/dashboard/components/uiExtras'
import { useNavigate } from 'react-router-dom'
import { NightPage, PageHead, Seg, Kpi, fmtNum } from './shared/night'

type Period = 1 | 7 | 30

export function DashboardV2WhatsAppAnalytics() {
  const { companyId, isDemo } = useWorkspace()
  const { data: messages, loading: msgLoading } = useMessages(companyId, isDemo)
  const { data: integrations, loading: intLoading } = useIntegrations(companyId, isDemo)
  const [period, setPeriod] = useState<Period>(7)
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'

  const wa = (integrations || []).find((i) => i.provider === 'whatsapp')
  const connected = wa?.status === 'connected'

  const all = messages || []
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - period); return d }, [period])
  const inRange = useMemo(() => all.filter((m) => new Date(m.created_at) >= cutoff), [all, cutoff])

  if (msgLoading || intLoading) return <KpiCardSkeleton />

  const delivered = inRange.filter((m) => m.status === 'delivered' || m.status === 'read').length
  const failed = inRange.filter((m) => m.status === 'failed').length

  return (
    <NightPage>
      <PageHead
        title="تحليلات واتساب"
        sub="مقاييس المحادثات والرسائل لهذي القناة"
        actions={<Seg label="الفترة" value={period} onChange={setPeriod} options={[[1, 'اليوم'], [7, 'آخر 7 أيام'], [30, 'آخر 30 يوم']] as const} />}
      />

      {!connected ? (
        <Card style={{ padding: 'var(--space-8)' }}>
          <EmptyState
            icon={<PlugZap size={20} />} title="لا يوجد اتصال واتساب"
            description="اربط رقم واتساب المنشأة بمساحة العمل لبدء عرض التحليلات."
            action={<Button size="sm" onClick={() => navigate(`${base}/integrations`)}>ربط واتساب</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="np-kpis c3">
            <Kpi label="إجمالي الرسائل" value={fmtNum(inRange.length)} />
            <Kpi label="تم التسليم" value={fmtNum(delivered)} hint={inRange.length ? `${Math.round((delivered / inRange.length) * 100)}%` : undefined} trend="up" />
            <Kpi label="فشلت" value={fmtNum(failed)} valueStyle={failed ? { color: 'var(--bad)' } : undefined} />
          </div>
          {inRange.length === 0 && (
            <Card><EmptyState icon={<MessageCircle size={18} />} title="لا توجد رسائل بهذي الفترة" /></Card>
          )}
        </>
      )}
    </NightPage>
  )
}
