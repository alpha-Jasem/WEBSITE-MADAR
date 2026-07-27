import { MessageCircle, Bell, Phone, Star, CalendarX2 } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicReminderRules, toggleReminderRule } from '../../../lib/clinicOSQueries'
import { Card, Switch } from '../../../components/clinicOS/v2/primitives'

const ICON_BY_KEY: Record<string, React.ReactNode> = {
  reminder_24h: <MessageCircle size={17} />,
  reminder_3h: <Bell size={17} />,
  call_unconfirmed: <Phone size={17} />,
  review_request: <Star size={17} />,
  no_show_alert: <CalendarX2 size={17} />,
}

export function DashboardV2Reminders() {
  const { companyId, isDemo } = useClinicOS()
  const { data: rules, refetch } = useClinicReminderRules(companyId, isDemo)

  async function toggle(id: string, current: boolean) {
    if (isDemo) return
    await toggleReminderRule(id, !current)
    refetch()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التذكيرات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>قواعد التذكير الآلي عبر واتساب والمكالمات — محفوظة فعلياً بحسابك</div>
      </div>
      <Card style={{ padding: 0 }}>
        {(rules || []).map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < (rules || []).length - 1 ? '1px solid var(--border-default)' : 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{ICON_BY_KEY[r.rule_key] || <Bell size={17} />}</div>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{r.label}</div>
            <Switch checked={r.enabled} onChange={() => toggle(r.id, r.enabled)} />
          </div>
        ))}
        {(rules || []).length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>جارِ تجهيز القواعد...</div>}
      </Card>
    </div>
  )
}
