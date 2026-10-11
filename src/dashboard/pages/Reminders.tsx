import { MessageCircle, Bell, Phone, Star, CalendarX2 } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useReminderRules, toggleReminderRule } from '@/lib/dashboardQueries'
import { Card } from '@/dashboard/components/primitives'
import { NightPage, PageHead, CardTitle, Toggle, fmtNum } from './shared/night'
import { EmptyState, SkeletonRows } from '@/dashboard/components/uiExtras'

const ICON_BY_KEY: Record<string, React.ReactNode> = {
  reminder_24h: <MessageCircle size={17} />,
  reminder_3h: <Bell size={17} />,
  call_unconfirmed: <Phone size={17} />,
  review_request: <Star size={17} />,
  no_show_alert: <CalendarX2 size={17} />,
}

export function DashboardV2Reminders() {
  const { companyId, isDemo } = useWorkspace()
  const { data: rules, loading, refetch } = useReminderRules(companyId, isDemo)

  async function toggle(id: string, current: boolean) {
    if (isDemo) return
    await toggleReminderRule(id, !current)
    refetch()
  }

  const list = rules || []
  const on = list.filter((r) => r.enabled).length

  return (
    <NightPage>
      <PageHead title="التذكيرات" sub="قواعد التذكير الآلي عبر واتساب والمكالمات — محفوظة فعلياً بحسابك" />
      <Card>
        <CardTitle aside={loading ? null : `${fmtNum(on)} مفعّلة من ${fmtNum(list.length)}`}>قواعد التذكير</CardTitle>
        {loading && <SkeletonRows rows={5} columns={2} />}
        {!loading && list.map((r) => (
          <div key={r.id} className="np-row">
            <div className="np-icon-tile" style={{ background: 'var(--info-bg)', color: 'var(--sky)' }}>{ICON_BY_KEY[r.rule_key] || <Bell size={17} />}</div>
            <div className="np-row-main"><b>{r.label}</b></div>
            <Toggle checked={r.enabled} label={r.label} onChange={() => toggle(r.id, r.enabled)} />
          </div>
        ))}
        {!loading && list.length === 0 && (
          <EmptyState icon={<Bell size={20} />} title="جارِ تجهيز القواعد" description="قواعد التذكير الآلي تُفعّل تلقائياً مع حسابك — راجع الصفحة بعد قليل." />
        )}
      </Card>
    </NightPage>
  )
}
