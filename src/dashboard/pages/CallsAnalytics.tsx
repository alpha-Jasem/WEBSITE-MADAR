import { saudiHour } from '@/lib/saudiTime'
import { useMemo, useState } from 'react'
import { PhoneCall } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAICalls } from '@/lib/dashboardQueries'
import { Card } from '@/dashboard/components/primitives'
import { EmptyState, KpiCardSkeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Seg, Kpi, fmtNum } from './shared/night'
import { BarChart } from './shared/charts'
import { AR_GREG, hourLabel } from './shared/periods'
import { Donut } from './HomeWidgets'
import type { AICallLog } from '@/types/dashboard'

type Period = 7 | 30

export function DashboardV2CallsAnalytics() {
  const { companyId, isDemo } = useWorkspace()
  const { data: calls, loading } = useAICalls(companyId, isDemo)
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
      days.push({ label: i === 0 ? 'اليوم' : d.toLocaleDateString(AR_GREG, period === 7 ? { weekday: 'short' } : { day: 'numeric', month: 'numeric' }), count })
    }
    return days
  }, [inRange, period])

  const needsReviewCount = inRange.filter((c) => c.status === 'needs_review').length
  const failedCount = inRange.filter((c) => c.status === 'failed').length
  const statusSources = totalCalls > 0 ? [
    { key: 'completed', label: 'مكتملة', pct: Math.round((completed / totalCalls) * 100), color: 'var(--success-500)', count: completed },
    { key: 'needs_review', label: 'تحتاج مراجعة', pct: Math.round((needsReviewCount / totalCalls) * 100), color: 'var(--warning-500)', count: needsReviewCount },
    { key: 'failed', label: 'فشلت', pct: Math.round((failedCount / totalCalls) * 100), color: 'var(--danger-500)', count: failedCount },
  ].filter((s) => s.pct > 0) : []

  const hourBuckets = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => h)
    return hours.map((h) => ({ h, count: inRange.filter((c: AICallLog) => saudiHour(c.call_time) === h).length }))
  }, [inRange])

  if (loading) return <KpiCardSkeleton />

  return (
    <NightPage>
      <PageHead
        title="تحليلات المكالمات"
        sub="تتبّع أداء المكالمات على مستوى مساحة العمل"
        actions={<Seg label="الفترة" value={period} onChange={setPeriod} options={[[7, 'آخر 7 أيام'], [30, 'آخر 30 يوم']] as const} />}
      />

      <div className="np-kpis">
        <Kpi label="إجمالي المكالمات" value={fmtNum(totalCalls)} />
        <Kpi label="متوسط المدة" value={`${Math.floor(avgDuration / 60)}د ${avgDuration % 60}ث`} />
        <Kpi label="مكتملة" value={fmtNum(completed)} hint={totalCalls ? `${Math.round((completed / totalCalls) * 100)}%` : undefined} trend="up" />
        <Kpi label="فشلت/تحتاج مراجعة" value={fmtNum(failedOrReview)} valueStyle={failedOrReview ? { color: 'var(--bad)' } : undefined} />
      </div>

      <div className="np-grid-2">
        <Card delay={0.1}>
          <CardTitle aside={`${fmtNum(totalCalls)} مكالمة`}>اتجاه المكالمات</CardTitle>
          {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
            <BarChart values={dayBuckets.map((d) => d.count)} labels={dayBuckets.map((d) => d.label)} ariaLabel="المكالمات حسب اليوم" />
          )}
        </Card>
        <Card delay={0.16}>
          <CardTitle>توزيع حالة المكالمات</CardTitle>
          {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات" /> : (
            <Donut sources={statusSources} total={totalCalls} centerLabel="مكالمة" />
          )}
        </Card>
      </div>

      <Card delay={0.22}>
        <CardTitle aside="نمط حجم المكالمات خلال 24 ساعة">التوزيع بالساعة</CardTitle>
        {totalCalls === 0 ? <EmptyState icon={<PhoneCall size={18} />} title="لا توجد بيانات للفترة المحددة" /> : (
          <BarChart values={hourBuckets.map((h) => h.count)} labels={hourBuckets.map((h) => hourLabel(h.h))} ariaLabel="المكالمات حسب الساعة" height={170} highlightLast={false} />
        )}
      </Card>
    </NightPage>
  )
}
