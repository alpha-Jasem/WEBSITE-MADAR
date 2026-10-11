import { useMemo } from 'react'
import { Download, Wallet } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBookings, useServices } from '@/lib/dashboardQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card, Button } from '@/dashboard/components/primitives'
import { EmptyState, Skeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Kpi, Meter, EmptyLine, fmtNum } from './shared/night'
import { BarChart } from './shared/charts'

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export function DashboardV2Revenue() {
  const { companyId, isDemo } = useWorkspace()
  const { data: appointments, loading: apptsLoading } = useBookings(companyId, undefined, isDemo)
  const { data: services, loading: servicesLoading } = useServices(companyId, isDemo)
  const loading = apptsLoading || servicesLoading

  const priceByServiceId = useMemo(() => {
    const map: Record<string, number> = {}
    ;(services || []).forEach((s) => { map[s.id] = s.price })
    return map
  }, [services])

  const completed = useMemo(
    () => (appointments || []).filter((a) => a.status === 'completed'),
    [appointments],
  )

  const hasPricing = Object.keys(priceByServiceId).length > 0

  // Oldest month first; the chart draws it on the right (RTL time).
  const revenueByMonth = useMemo(() => {
    const buckets: Record<string, number> = {}
    completed.forEach((a) => {
      const d = new Date(a.appointment_date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const price = priceByServiceId[a.service_id] || 0
      buckets[key] = (buckets[key] || 0) + price
    })
    const now = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      return { m: MONTH_NAMES[d.getMonth()], v: buckets[key] || 0 }
    })
  }, [completed, priceByServiceId])

  const revenueByService = useMemo(() => {
    const buckets: Record<string, number> = {}
    completed.forEach((a) => {
      const price = priceByServiceId[a.service_id] || 0
      if (price > 0) buckets[a.service_name] = (buckets[a.service_name] || 0) + price
    })
    return Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [completed, priceByServiceId])

  const total = revenueByMonth[revenueByMonth.length - 1]?.v || 0
  const prev = revenueByMonth[revenueByMonth.length - 2]?.v || 0
  const delta = prev > 0 ? Math.round(((total - prev) / prev) * 1000) / 10 : null
  const fiveMonths = revenueByMonth.reduce((s, r) => s + r.v, 0)
  const pricedCompleted = completed.filter((a) => (priceByServiceId[a.service_id] || 0) > 0).length
  const maxS = Math.max(1, ...revenueByService.map(([, v]) => v))

  function exportRevenue() {
    exportRowsToExcel('الإيرادات-مدار', [
      { name: 'الإيرادات الشهرية', rows: revenueByMonth.map((r) => ({ 'الشهر': r.m, 'الإيرادات (ر.س)': r.v })) },
      { name: 'حسب الخدمة', rows: revenueByService.map(([label, value]) => ({ 'الخدمة': label, 'الإيرادات (ر.س)': value })) },
    ])
  }

  return (
    <NightPage>
      <PageHead
        title="الإيرادات"
        sub={hasPricing
          ? 'محسوبة تلقائياً من أسعار الخدمات × الحجوزات المكتملة'
          : 'محسوبة تلقائياً من أسعار الخدمات × الحجوزات المكتملة — أضف أسعاراً لخدماتك لتفعيلها'}
        actions={hasPricing ? <Button variant="secondary" onClick={exportRevenue}><Download size={15} /> تصدير Excel</Button> : undefined}
      />

      {hasPricing && !loading && (
        <div className="np-kpis">
          <Kpi label="هذا الشهر" value={`${fmtNum(total)} ر.س`} hint={delta != null ? `${delta >= 0 ? '+' : ''}${delta}% عن الشهر السابق` : 'لا توجد مقارنة'} trend={delta == null ? 'flat' : delta >= 0 ? 'up' : 'down'} />
          <Kpi label="الشهر السابق" value={`${fmtNum(prev)} ر.س`} hint={revenueByMonth[revenueByMonth.length - 2]?.m} />
          <Kpi label="آخر 5 أشهر" value={`${fmtNum(fiveMonths)} ر.س`} hint="إجمالي الإيرادات" />
          <Kpi label="حجوزات مكتملة مسعّرة" value={fmtNum(pricedCompleted)} hint={`من ${fmtNum(completed.length)} مكتملة`} />
        </div>
      )}

      <Card delay={0}>
        <CardTitle aside="ر.س">الإيرادات الشهرية</CardTitle>
        {loading ? (
          <Skeleton width="100%" height={200} />
        ) : hasPricing ? (
          <BarChart values={revenueByMonth.map((r) => r.v)} labels={revenueByMonth.map((r) => r.m)} ariaLabel="الإيرادات الشهرية" format={(n) => `${fmtNum(n)} ر.س`} />
        ) : (
          <EmptyState icon={<Wallet size={20} />} title="جاهزة لاستقبال البيانات" description="لا توجد أسعار خدمات مضافة بعد — أضف أسعاراً لخدماتك من صفحة الخدمات لتفعيل هذا التقرير." />
        )}
      </Card>

      <Card delay={0.08}>
        <CardTitle>الإيرادات حسب الخدمة</CardTitle>
        {loading && <Skeleton width="100%" height={140} />}
        {!loading && revenueByService.length === 0 && (
          <EmptyLine>ستظهر الإيرادات حسب الخدمة هنا بمجرد اكتمال أول حجز مسعّر.</EmptyLine>
        )}
        {!loading && revenueByService.map(([label, value]) => (
          <Meter key={label} label={label} value={value} max={maxS} display={`${fmtNum(value)} ر.س`} />
        ))}
      </Card>
    </NightPage>
  )
}
