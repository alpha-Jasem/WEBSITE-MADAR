import { useMemo, useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicAICalls } from '@/lib/clinicOSQueries'
import { Card } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, KpiCardSkeleton } from '@/_archive/dashboardV2/components/uiExtras'
import { Donut } from './HomeWidgets'
import type { AICallLog } from '@/types/clinicOS'

type Period = 7 | 30

export function DashboardV2CallsAnalytics() {
  const { companyId, isDemo } = useClinicOS()
  const { data: calls, loading } = useClinicAICalls(companyId, isDemo)
  const [period, setPeriod] = useState<Period>(7)

  const all = calls || []
  const cutoff = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - period); return d }, [period])
  const inRange = useMemo(() => all.filter((c) => new Date(c.call_time) >= cutoff), [all, cutoff])

  const totalCalls = inRange.length
  const avgDuration = totalCalls > 0 ? Math.round(inRange.reduce((s, c) => s + c.duration_seconds, 0) / totalCalls) : 0
  const completed = inRange.filter((c) => c.status === 'completed').length
  const failedOrReview = inRange.filter((c) => c.status === 'failed' || c.status === 'needs_review').length

  const dayBuckets = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const count = inRange.filter((c) => c.call_time.slice(0, 10) === key).length
      days.push({ label: d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }), count })
    }
    return days
  }, [inRange, period])
  const maxDay = Math.max(1, ...dayBuckets.map((d) => d.count))

  const statusSources = totalCalls > 0 ? [
    { key: 'completed', label: 'مكتملة', pct: Math.round((completed / totalCalls) * 100), color: 'var(--success-500)' },
    { key: 'needs_review', label: 'تحتاج مراجعة', pct: Math.round((inRange.filter((c) => c.status === 'needs_review').length / totalCalls) * 100), color: 'var(--warning-500)' },
    { key: 'failed', label: 'فشلت', pct: Math.round((inRange.filter((c) => c.status === 'failed').length / totalCalls) * 100), color: 'var(--danger-500)' },
  ].filter((s) => s.pct > 0) : []

  const hourBuckets = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => h)
    return hours.map((h) => ({ h, count: inRange.filter((c: AICallLog) => new Date(c.call_time).getHours() === h).length }))
  }, [inRange])
  const maxHour = Math.max(1, ...hourBuckets.map((h) => h.count))

  if (loading) return <KpiCardSkeleton />

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-600)', letterSpacing: '.04em', marginBottom: 4 }}>التحليلات</div>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700 }}>تحليلات المكالمات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>تتبّع أداء المكالمات على مستوى مساحة العمل</div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([[7, 'آخر 7 أيام'], [30, 'آخر 30 يوم']] as const).map(([p, label]) => (
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

      <div className="dv2-responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'إجمالي المكالمات', value: totalCalls },
          { label: 'متوسط المدة', value: `${Math.floor(avgDuration / 60)}د ${avgDuration % 60}ث` },
          { label: 'مكتملة', value: completed },
          { label: 'فشلت/تحتاج مراجعة', value: failedOrReview },
        ].map((s, i) => (
          <Card key={s.label} delay={i * 0.06} style={{ padding: 'var(--space-4)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <PhoneCall size={15} />
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 700, fontSize: 'var(--text-heading-lg)', marginTop: 4 }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card delay={0.24}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>اتجاه المكالمات</div>
          {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
              {dayBuckets.map((d) => (
                <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div title={`${d.label}: ${d.count}`} style={{ width: '100%', height: Math.max(3, (d.count / maxDay) * 110), background: 'var(--brand-400)', borderRadius: 3 }} />
                  {period === 7 && <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>{d.label}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card delay={0.3}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>توزيع حالة المكالمات</div>
          {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات" /> : (
            <>
              <Donut sources={statusSources} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                {statusSources.map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontWeight: 600 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card delay={0.36}>
        <div style={{ fontWeight: 700 }}>التوزيع بالساعة</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>نمط حجم المكالمات خلال 24 ساعة</div>
        {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 90 }}>
            {hourBuckets.map((h) => (
              <div key={h.h} title={`${h.h}:00 — ${h.count}`} style={{ flex: 1, height: Math.max(2, (h.count / maxHour) * 80), background: 'var(--brand-300)', borderRadius: 2 }} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
