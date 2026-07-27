import { useState } from 'react'
import { MessageCircle, Bell, Phone, Star, CalendarX2 } from 'lucide-react'
import { Card, Switch } from '../../../components/clinicOS/v2/primitives'

interface Rule { id: string; icon: React.ReactNode; label: string; enabled: boolean }

const INITIAL: Rule[] = [
  { id: 'reminder_24h', icon: <MessageCircle size={17} />, label: 'تذكير واتساب قبل الموعد بيوم', enabled: true },
  { id: 'reminder_3h', icon: <Bell size={17} />, label: 'تذكير واتساب قبل الموعد بساعتين', enabled: true },
  { id: 'call_unconfirmed', icon: <Phone size={17} />, label: 'اتصال آلي بالعميل عند عدم التأكيد', enabled: false },
  { id: 'review_request', icon: <Star size={17} />, label: 'طلب تقييم Google بعد الزيارة', enabled: true },
  { id: 'no_show_alert', icon: <CalendarX2 size={17} />, label: 'تنبيه للفريق عند موعد لم يُحضر', enabled: true },
]

export function DashboardV2Reminders() {
  const [rules, setRules] = useState(INITIAL)
  function toggle(id: string) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  }
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التذكيرات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          قواعد التذكير الآلي عبر واتساب والمكالمات — تُطابق أنواع الرسائل المُرسلة فعلياً من مدار
        </div>
      </div>
      <Card style={{ padding: 0 }}>
        {rules.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < rules.length - 1 ? '1px solid var(--border-default)' : 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-600)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{r.icon}</div>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{r.label}</div>
            <Switch checked={r.enabled} onChange={() => toggle(r.id)} />
          </div>
        ))}
      </Card>
    </div>
  )
}
