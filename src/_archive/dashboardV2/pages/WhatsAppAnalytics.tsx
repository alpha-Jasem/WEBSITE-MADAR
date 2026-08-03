import { useMemo, useState } from 'react'
import { MessageCircle, PlugZap } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicMessages, useClinicIntegrations } from '@/lib/clinicOSQueries'
import { Card, Button } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, KpiCardSkeleton } from '@/_archive/dashboardV2/components/uiExtras'
import { useNavigate } from 'react-router-dom'

type Period = 1 | 7 | 30

export function DashboardV2WhatsAppAnalytics() {
  const { companyId, isDemo } = useClinicOS()
  const { data: messages, loading: msgLoading } = useClinicMessages(companyId, isDemo)
  const { data: integrations, loading: intLoading } = useClinicIntegrations(companyId, isDemo)
  const [period, setPeriod] = useState<Period>(7)
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'

  const wa = (integrations || []).find((i) => i.provider === 'whatsapp')
  const connected = wa?.status === 'connected'

  const all = messages || []
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - period); return d }, [period])
  const inRange = useMemo(() => all.filter((m) => new Date(m.created_at) >= cutoff), [all, cutoff])

  if (msgLoading || intLoading) return <KpiCardSkeleton />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', letterSpacing: '.04em', marginBottom: 4 }}>واتساب</div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700 }}>تحليلات واتساب</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>مقاييس المحادثات والرسائل لهذي القناة</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([[1, 'اليوم'], [7, 'آخر 7 أيام'], [30, 'آخر 30 يوم']] as const).map(([p, label]) => (
            <span
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                background: period === p ? 'var(--surface-sunken)' : 'transparent', color: period === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >{label}</span>
          ))}
        </div>
      </div>

      {!connected ? (
        <Card style={{ padding: 'var(--space-8)' }}>
          <EmptyState
            icon={<PlugZap size={20} />} title="لا يوجد اتصال واتساب"
            description="اربط رقم واتساب العيادة بمساحة العمل لبدء عرض التحليلات."
            action={<Button size="sm" onClick={() => navigate(`${base}/integrations`)}>ربط واتساب</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="dv2-responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'إجمالي الرسائل', value: inRange.length },
              { label: 'تم التسليم', value: inRange.filter((m) => m.status === 'delivered' || m.status === 'read').length },
              { label: 'فشلت', value: inRange.filter((m) => m.status === 'failed').length },
            ].map((s) => (
              <Card key={s.label} style={{ padding: 'var(--space-4)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <MessageCircle size={15} />
                </div>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 700, fontSize: 'var(--text-heading-lg)', marginTop: 4 }}>{s.value}</div>
              </Card>
            ))}
          </div>
          {inRange.length === 0 && (
            <Card><EmptyState icon={<MessageCircle size={18} />} title="لا توجد رسائل بهذي الفترة" /></Card>
          )}
        </>
      )}
    </div>
  )
}
