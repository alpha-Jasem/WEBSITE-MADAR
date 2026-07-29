import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Users } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicPatients, updatePatient } from '@/lib/clinicOSQueries'
import type { Patient } from '@/types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Select } from '@/_archive/dashboardV2/components/primitives'
import { EmptyState, SkeletonRows, useToast } from '@/_archive/dashboardV2/components/uiExtras'

const EDIT_TYPE_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]

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
  const { data: patients, loading, refetch } = useClinicPatients(companyId, isDemo)
  const pushToast = useToast()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [selected, setSelected] = useState<Patient | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', last_visit_at: '', total_visits: 0, patient_type: 'new' as Patient['patient_type'] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name,
        phone: selected.phone,
        last_visit_at: selected.last_visit_at ? selected.last_visit_at.split('T')[0] : '',
        total_visits: selected.total_visits,
        patient_type: selected.patient_type,
      })
    }
  }, [selected])

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      if (isDemo) {
        pushToast({ kind: 'success', title: 'تم الحفظ (عرض تجريبي)' })
      } else {
        await updatePatient(selected.id, {
          clinic_id: companyId || undefined,
          name: form.name,
          phone: form.phone,
          last_visit_at: form.last_visit_at ? new Date(form.last_visit_at).toISOString() : undefined,
          total_visits: form.total_visits,
          patient_type: form.patient_type,
        })
        await refetch()
        pushToast({ kind: 'success', title: 'تم حفظ بيانات العميل' })
      }
      setSelected(null)
    } catch (err) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: err instanceof Error ? err.message : undefined })
    } finally {
      setSaving(false)
    }
  }

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
        {loading && <SkeletonRows rows={6} columns={6} />}
        {!loading && shown.map((p, i) => (
          <motion.div
            key={p.id}
            onClick={() => setSelected(p)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: Math.min(i, 8) * 0.02 }}
            style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.6fr 1.2fr 1fr 0.8fr 0.8fr', padding: '12px 20px', fontSize: 14, alignItems: 'center', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--slate-200)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.phone}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.last_visit_at ? p.last_visit_at.split('T')[0] : '—'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{p.total_visits}</div>
            <div><Badge tone={p.patient_type === 'returning' ? 'success' : 'brand'}>{p.patient_type === 'returning' ? 'عائد' : 'جديد'}</Badge></div>
          </motion.div>
        ))}
        {!loading && shown.length === 0 && (
          <EmptyState icon={<Users size={20} />} title="لا يوجد عملاء مطابقون" description="جرّب تغيير كلمة البحث أو الفلاتر." />
        )}
        </div>
      </Card>

      <Dialog
        open={!!selected} title="تعديل بيانات العميل" onClose={() => setSelected(null)}
        footer={<><Button variant="secondary" onClick={() => setSelected(null)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>مرات عدم الحضور: {selected.no_show_count}{selected.notes ? ` — ${selected.notes}` : ''}</div>
            </div>
            <Input label="الاسم" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="الجوال" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)' }}>
                <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>آخر زيارة</span>
                <input type="date" value={form.last_visit_at} onChange={(e) => setForm((f) => ({ ...f, last_visit_at: e.target.value }))}
                  style={{ padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: 13 }} />
              </label>
              <Input label="عدد الزيارات" type="number" value={String(form.total_visits)} onChange={(e) => setForm((f) => ({ ...f, total_visits: Number(e.target.value) || 0 }))} style={{ flex: 1 }} />
            </div>
            <Select label="النوع" options={EDIT_TYPE_OPTIONS} value={form.patient_type} onChange={(e) => setForm((f) => ({ ...f, patient_type: e.target.value as Patient['patient_type'] }))} />
          </div>
        )}
      </Dialog>
    </div>
  )
}
