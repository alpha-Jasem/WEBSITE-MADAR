import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicPatients } from '../../../lib/clinicOSQueries'
import type { Patient } from '../../../types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Select } from '../../../components/clinicOS/v2/primitives'

const TYPE_OPTIONS = [
  { value: 'all', label: 'كل الأنواع' },
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]
const SORT_OPTIONS = [
  { value: 'recent', label: 'الأحدث زيارة' },
  { value: 'visits', label: 'الأكثر زيارات' },
  { value: 'name', label: 'الاسم (أ-ي)' },
]

export function DashboardV2Patients() {
  const { companyId, isDemo } = useClinicOS()
  const { data: patients } = useClinicPatients(companyId, isDemo)
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [selected, setSelected] = useState<Patient | null>(null)

  const rows = patients || []
  const shown = useMemo(() => {
    let filtered = rows.filter((p) => p.name.includes(q) || p.phone.includes(q))
    if (typeFilter !== 'all') filtered = filtered.filter((p) => p.patient_type === typeFilter)
    filtered = [...filtered]
    if (sort === 'visits') filtered.sort((a, b) => b.total_visits - a.total_visits)
    else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    else filtered.sort((a, b) => (b.last_visit_at || '').localeCompare(a.last_visit_at || ''))
    return filtered
  }, [rows, q, typeFilter, sort])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>العملاء</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{shown.length} من {rows.length} عميل</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Input placeholder="بحث بالاسم أو الجوال" icon={<Search size={15} />} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
          <Select options={TYPE_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 130 }} />
          <Select options={SORT_OPTIONS} value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 150 }} />
        </div>
      </div>

      <Card style={{ padding: 0, overflowX: 'auto' }}>
        <div style={{ minWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.6fr 1.2fr 1fr 0.8fr 0.8fr', padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-default)' }}>
          <div></div><div>الاسم</div><div>الجوال</div><div>آخر زيارة</div><div>عدد الزيارات</div><div>النوع</div>
        </div>
        {shown.map((p) => (
          <div key={p.id} onClick={() => setSelected(p)} style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.6fr 1.2fr 1fr 0.8fr 0.8fr', padding: '12px 20px', fontSize: 14, alignItems: 'center', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--slate-200)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.phone}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.last_visit_at ? p.last_visit_at.split('T')[0] : '—'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.total_visits}</div>
            <div><Badge tone={p.patient_type === 'returning' ? 'success' : 'brand'}>{p.patient_type === 'returning' ? 'عائد' : 'جديد'}</Badge></div>
          </div>
        ))}
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>لا يوجد عملاء مطابقون</div>}
        </div>
      </Card>

      <Dialog open={!!selected} title={selected?.name || ''} onClose={() => setSelected(null)} footer={<Button onClick={() => setSelected(null)}>إغلاق</Button>}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{selected.phone}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>آخر زيارة</span>
              <span style={{ fontWeight: 600 }}>{selected.last_visit_at ? selected.last_visit_at.split('T')[0] : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>عدد الزيارات</span>
              <span style={{ fontWeight: 600 }}>{selected.total_visits}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>مرات عدم الحضور</span>
              <span style={{ fontWeight: 600 }}>{selected.no_show_count}</span>
            </div>
            {selected.notes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, marginTop: 6 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>ملاحظات</span>
                <span>{selected.notes}</span>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
