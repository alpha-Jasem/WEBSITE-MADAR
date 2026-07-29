import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicAppointments, useClinicServices } from '@/lib/clinicOSQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card, Button } from '@/_archive/dashboardV2/components/primitives'

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export function DashboardV2Revenue() {
  const { companyId, isDemo } = useClinicOS()
  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: services } = useClinicServices(companyId, isDemo)

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

  const max = Math.max(1, ...revenueByMonth.map((r) => r.v))
  const maxS = Math.max(1, ...revenueByService.map(([, v]) => v))

  function exportRevenue() {
    exportRowsToExcel('الإيرادات-مدار', [
      { name: 'الإيرادات الشهرية', rows: revenueByMonth.map((r) => ({ 'الشهر': r.m, 'الإيرادات (ر.س)': r.v })) },
      { name: 'حسب الخدمة', rows: revenueByService.map(([label, value]) => ({ 'الخدمة': label, 'الإيرادات (ر.س)': value })) },
    ])
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الإيرادات</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {hasPricing
              ? `${fmt(total)} ر.س هذا الشهر${delta != null ? ` · ${delta >= 0 ? '+' : ''}${delta}% مقارنة بالشهر السابق` : ''}`
              : 'محسوبة تلقائياً من أسعار الخدمات × الحجوزات المكتملة — أضف أسعاراً لخدماتك لتفعيلها'}
          </div>
        </div>
        {hasPricing && <Button variant="secondary" onClick={exportRevenue}><Download size={15} /> تصدير Excel</Button>}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>الإيرادات الشهرية</div>
        {hasPricing ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, height: 180 }}>
            {revenueByMonth.map((r, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{fmt(r.v)}</div>
                <div style={{
                  width: '100%', height: (r.v / max * 140) + 'px', minHeight: r.v > 0 ? 4 : 0,
                  background: i === revenueByMonth.length - 1 ? 'var(--brand-500)' : 'var(--brand-200)', borderRadius: 'var(--radius-sm)',
                }} />
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.m}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            جاهزة لاستقبال البيانات — لا توجد أسعار خدمات مضافة بعد
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>الإيرادات حسب الخدمة</div>
        {revenueByService.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>لا توجد بيانات بعد</div>
        )}
        {revenueByService.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 140, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ flex: 1, height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: (value / maxS * 100) + '%', height: '100%', background: 'var(--brand-500)', borderRadius: 'var(--radius-full)' }} />
            </div>
            <div style={{ width: 90, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{fmt(value)} ر.س</div>
          </div>
        ))}
      </Card>
    </div>
  )
}
