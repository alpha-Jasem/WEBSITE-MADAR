import { useMemo } from 'react'
import { Download } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicAppointments, useClinicAICalls, useClinicMessages } from '@/lib/clinicOSQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, Skeleton } from '@/_archive/dashboardV2/components/uiExtras'
import { MetalButton } from '@/components/ui/liquid-glass-button'
import { BarChart3 } from 'lucide-react'

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 150, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 10, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ width: (max > 0 ? value / max * 100 : 0) + '%', height: '100%', background: 'var(--brand-500)', borderRadius: 'var(--radius-full)' }} />
      </div>
      <div style={{ width: 60, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>{value.toLocaleString('en-US')}</div>
    </div>
  )
}

function BarsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Skeleton width={150} height={13} />
          <Skeleton width="100%" height={10} radius="var(--radius-full)" style={{ flex: 1 }} />
          <Skeleton width={60} height={13} />
        </div>
      ))}
    </div>
  )
}

const SOURCE_COLORS: Record<string, string> = {
  ai_booking: 'var(--brand-500)', whatsapp: '#2fbfa0', website: 'var(--indigo-500)',
  reception: '#c9b6f5', manual: 'var(--slate-400)',
}
const SOURCE_LABELS: Record<string, string> = {
  ai_booking: 'حجز بالذكاء الاصطناعي', whatsapp: 'واتساب', website: 'الموقع الإلكتروني',
  reception: 'الاستقبال', manual: 'يدوي',
}

export function DashboardV2Reports() {
  const { companyId, isDemo } = useClinicOS()
  const { data: appointments, loading: apptsLoading } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: aiCalls, loading: callsLoading } = useClinicAICalls(companyId, isDemo)
  const { data: messages, loading: msgsLoading } = useClinicMessages(companyId, isDemo)
  const loading = apptsLoading || callsLoading || msgsLoading

  const appts = appointments || []
  const calls = aiCalls || []
  const msgs = messages || []

  const funnel = useMemo(() => {
    const incoming = calls.length + msgs.length
    const answered = calls.filter((c) => c.status === 'completed').length + msgs.filter((m) => m.status !== 'failed').length
    const booked = calls.filter((c) => c.result === 'booked').length
    const attended = appts.filter((a) => a.status === 'completed').length
    return [
      { label: 'محادثات واردة', value: incoming },
      { label: 'تم الرد عليها', value: answered },
      { label: 'تم حجز موعد', value: booked },
      { label: 'تم الحضور', value: attended },
    ]
  }, [calls, msgs, appts])

  const services = useMemo(() => {
    const counts: Record<string, number> = {}
    appts.forEach((a) => { counts[a.service_name] = (counts[a.service_name] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [appts])

  const sources = useMemo(() => {
    const counts: Record<string, number> = {}
    appts.forEach((a) => { counts[a.source] = (counts[a.source] || 0) + 1 })
    const total = appts.length || 1
    return Object.entries(counts).map(([key, count]) => ({
      label: SOURCE_LABELS[key] || key, pct: Math.round((count / total) * 100), color: SOURCE_COLORS[key] || 'var(--slate-400)',
    }))
  }, [appts])

  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value))
  const maxService = Math.max(1, ...services.map(([, v]) => v))

  function exportReport() {
    exportRowsToExcel('تقرير-مدار', [
      { name: 'مسار التحويل', rows: funnel.map((f) => ({ 'المرحلة': f.label, 'العدد': f.value })) },
      { name: 'أعلى الخدمات', rows: services.map(([label, value]) => ({ 'الخدمة': label, 'عدد الحجوزات': value })) },
      { name: 'مصادر الحجوزات', rows: sources.map((s) => ({ 'المصدر': s.label, 'النسبة %': s.pct })) },
      { name: 'الحجوزات التفصيلية', rows: appts.map((a) => ({ 'العميل': a.patient_name, 'الجوال': a.patient_phone, 'الخدمة': a.service_name, 'التاريخ': a.appointment_date, 'الوقت': a.start_time, 'الحالة': a.status, 'المصدر': SOURCE_LABELS[a.source] || a.source })) },
    ])
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التقارير والتحليلات</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>نظرة شاملة على كل بيانات {isDemo ? 'العرض التجريبي' : 'حسابك'}</div>
        </div>
        <MetalButton type="button" variant="brand" onClick={exportReport}><Download size={15} /> تصدير Excel</MetalButton>
      </div>
      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card delay={0}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>مسار المحادثات إلى الحجوزات</div>
          {loading ? <BarsSkeleton /> : funnel.map((f, i) => <Bar key={i} label={f.label} value={f.value} max={maxFunnel} />)}
        </Card>
        <Card delay={0.08}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>أعلى الخدمات حجوزاً</div>
          {loading ? <BarsSkeleton rows={5} /> : (
            <>
              {services.length === 0 && (
                <EmptyState icon={<BarChart3 size={20} />} title="لا توجد بيانات بعد" description="ستظهر أعلى الخدمات حجزاً هنا بمجرد وصول أول حجز." />
              )}
              {services.map(([label, value]) => <Bar key={label} label={label} value={value} max={maxService} />)}
            </>
          )}
        </Card>
      </div>
      <Card delay={0.16} style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>مصادر الحجوزات</div>
        {!loading && sources.length === 0 && (
          <EmptyState icon={<BarChart3 size={20} />} title="لا توجد بيانات بعد" description="ستظهر توزيعة مصادر الحجوزات هنا بمجرد وصول أول حجز." />
        )}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {sources.map((s, i) => (
            <div key={i} style={{ flex: 1, minWidth: 140 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 700 }}>{s.pct}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: s.pct + '%', height: '100%', background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
