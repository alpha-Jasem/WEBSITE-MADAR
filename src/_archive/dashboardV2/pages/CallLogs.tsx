import { useMemo, useState } from 'react'
import { Download, PhoneOff, Search } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicAICalls } from '@/lib/clinicOSQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card, Badge, Button, Select } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, KpiCardSkeleton, useToast } from '@/_archive/dashboardV2/components/uiExtras'
import type { AICallLog, AICallStatus } from '@/types/clinicOS'

const STATUS_TONE: Record<AICallStatus, 'success' | 'warning' | 'danger'> = { completed: 'success', needs_review: 'warning', failed: 'danger' }
const STATUS_LABEL: Record<AICallStatus, string> = { completed: 'مكتملة', needs_review: 'تحتاج مراجعة', failed: 'فشلت' }
const RESULT_LABEL: Record<string, string> = {
  booked: 'حجز موعد', needs_review: 'تحتاج مراجعة', no_slot: 'لا يوجد موعد متاح', cancelled: 'أُلغيت', failed: 'فشلت', transferred: 'حُوّلت لموظف',
}

export function DashboardV2CallLogs() {
  const { companyId, isDemo } = useClinicOS()
  const { data: calls, loading } = useClinicAICalls(companyId, isDemo)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AICallStatus | 'all'>('all')
  const pushToast = useToast()

  const all = calls || []
  const filtered = useMemo(() => all.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!(c.patient_name || '').toLowerCase().includes(q) && !c.phone.toLowerCase().includes(q)) return false
    }
    return true
  }), [all, statusFilter, search])

  function handleExport() {
    if (filtered.length === 0) { pushToast({ kind: 'info', title: 'لا توجد بيانات للتصدير' }); return }
    exportRowsToExcel('سجل-المكالمات', [{
      name: 'المكالمات',
      rows: filtered.map((c: AICallLog) => ({
        العميل: c.patient_name || '', الهاتف: c.phone,
        الوقت: new Date(c.call_time).toLocaleString('ar-SA'),
        'المدة (ث)': c.duration_seconds,
        النتيجة: RESULT_LABEL[c.result] || c.result,
        الحالة: STATUS_LABEL[c.status] || c.status,
      })),
    }])
    pushToast({ kind: 'success', title: 'تم تصدير السجل' })
  }

  if (loading) return <KpiCardSkeleton />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700 }}>سجل المكالمات</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>سجل تفصيلي لكل مكالمات الوكيل الصوتي — {all.length} مكالمة</div>
        </div>
        <Button variant="secondary" onClick={handleExport}><Download size={15} /> تصدير Excel</Button>
      </div>

      <Card delay={0} style={{ marginBottom: 16, padding: 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', insetInlineStart: 12, color: 'var(--text-tertiary)' }} />
            <input
              placeholder="ابحث بالاسم أو رقم الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '9px 14px 9px 14px', paddingInlineStart: 34, fontSize: 13, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <Select
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AICallStatus | 'all')}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'completed', label: 'مكتملة' },
              { value: 'needs_review', label: 'تحتاج مراجعة' },
              { value: 'failed', label: 'فشلت' },
            ]}
          />
        </div>
      </Card>

      <Card delay={0.08} style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <EmptyState icon={<PhoneOff size={20} />} title="لا توجد مكالمات" description="ستظهر هنا المكالمات فور استقبال الوكيل لأي نشاط." />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 640 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '10px 20px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>
                <div>العميل</div><div>الهاتف</div><div>المدة</div><div>النتيجة</div><div>الحالة</div>
              </div>
              {filtered.map((c) => (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', padding: '13px 20px', fontSize: 13, alignItems: 'center', borderTop: '1px solid var(--border-default)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.patient_name || 'غير معروف'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(c.call_time).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', direction: 'ltr', textAlign: 'right' }}>{c.phone}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{Math.round(c.duration_seconds / 60)} د {c.duration_seconds % 60} ث</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{RESULT_LABEL[c.result] || c.result}</div>
                  <div><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
