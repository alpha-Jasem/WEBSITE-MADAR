import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Users, UserCheck } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCustomers, updateCustomer } from '@/lib/dashboardQueries'
import { useConversationData } from '@/lib/queries/conversations'
import { buildContacts } from './AgentUsers'
import type { Customer } from '@/types/dashboard'
import { Card, Badge, Button, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { NightPage, PageHead, Seg, useIsNarrow, fmtNum } from './shared/night'
import { EmptyState, SkeletonRows, useToast, Avatar, SortableHeader, ContactActions } from '@/dashboard/components/uiExtras'

/** A person known only from the agent's conversations; saved customers keep their own row. */
type Row = Customer & { fromConversation?: boolean; openId?: string }

type SortKey = 'name' | 'last_visit_at' | 'total_visits'

const EDIT_TYPE_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]

export function DashboardV2Customers() {
  const { companyId, isDemo, hasModule } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { data: patients, loading: customersLoading, refetch } = useCustomers(companyId, isDemo)
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const loading = customersLoading || callsLoading
  const pushToast = useToast()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'last_visit_at', dir: -1 })
  const [selected, setSelected] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', last_visit_at: '', total_visits: 0, patient_type: 'new' as Customer['patient_type'] })
  const [saving, setSaving] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

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
        await updateCustomer(selected.id, {
          company_id: companyId || undefined,
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

  function toggleCheck(id: string) {
    setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function bulkMarkReturning() {
    const ids = Array.from(checked)
    if (ids.length === 0) return
    setBulkSaving(true)
    try {
      if (!isDemo) {
        await Promise.all(ids.map((id) => updateCustomer(id, { company_id: companyId || undefined, patient_type: 'returning' })))
        await refetch()
      }
      pushToast({ kind: 'success', title: `تم تحديث ${ids.length} عميل${isDemo ? ' (عرض تجريبي)' : ''}` })
      setChecked(new Set())
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر التحديث', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBulkSaving(false)
    }
  }

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  }

  const rows = useMemo<Row[]>(() => {
    const saved: Row[] = patients || []
    const phones = new Set(saved.map((p) => p.phone.replace(/D/g, '')).filter(Boolean))
    const fromChats: Row[] = buildContacts(calls || [])
      .filter((c) => !c.phone || !phones.has(c.phone.replace(/D/g, '')))
      .map((c) => ({
        id: `chat:${c.key}`, company_id: companyId || '', name: c.name, phone: c.phone, patient_type: c.count > 1 ? 'returning' : 'new',
        tags: [], no_show_count: 0, total_visits: c.count, last_visit_at: c.last, created_at: c.last,
        fromConversation: true, openId: `call:${c.lastCall.id}`,
      }))
    return [...saved, ...fromChats]
  }, [patients, calls, companyId])
  const shown = useMemo(() => {
    let filtered = rows.filter((p) => p.name.includes(q) || p.phone.includes(q))
    if (typeFilter !== 'all') filtered = filtered.filter((p) => p.patient_type === typeFilter)
    filtered = [...filtered]
    filtered.sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
    return filtered
  }, [rows, q, typeFilter, sort])

  const narrow = useIsNarrow()
  const returning = rows.filter((p) => p.patient_type === 'returning').length
  const visitsLabel = hasModule('bookings') ? 'عدد الزيارات' : 'عدد التواصل'

  return (
    <NightPage>
      <PageHead
        title="العملاء"
        sub={loading ? 'جارِ التحميل…' : `${fmtNum(rows.length)} عميل · ${fmtNum(returning)} عائد · كل من تواصل مع الوكيل الذكي يُحفظ هنا تلقائيًا`}
      />

      <div className="np-filters">
        <Input placeholder="بحث بالاسم أو الجوال" icon={<Search size={15} />} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: narrow ? '100%' : 260 }} />
        <Seg label="نوع العميل" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS.map((o) => [o.value, o.label] as const)} />
        <span className="np-aside np-num">{fmtNum(shown.length)} من {fmtNum(rows.length)}</span>
      </div>

      {checked.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="np-bulk">
          <b>{checked.size} محدد</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => setChecked(new Set())}>إلغاء التحديد</Button>
            <Button size="sm" onClick={bulkMarkReturning} disabled={bulkSaving}>
              <UserCheck size={14} /> {bulkSaving ? 'جارِ التحديث...' : 'تحديد كعائدين'}
            </Button>
          </div>
        </motion.div>
      )}

      <Card style={{ padding: 0 }}>
        {loading && <SkeletonRows rows={6} columns={7} />}
        {!loading && shown.length > 0 && (
          <div className="np-table-wrap">
            <table className="np-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <label className="np-check"><input type="checkbox" aria-label="تحديد الكل" checked={shown.length > 0 && shown.every((p) => checked.has(p.id))} onChange={() => setChecked((s) => { const all = shown.every((p) => s.has(p.id)); const n = new Set(s); shown.forEach((p) => (all ? n.delete(p.id) : n.add(p.id))); return n })} /></label>
                  </th>
                  <th><SortableHeader label="العميل" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} /></th>
                  <th>الجوال</th>
                  <th><SortableHeader label="آخر زيارة" active={sort.key === 'last_visit_at'} dir={sort.dir} onClick={() => toggleSort('last_visit_at')} /></th>
                  <th><SortableHeader label={visitsLabel} active={sort.key === 'total_visits'} dir={sort.dir} onClick={() => toggleSort('total_visits')} /></th>
                  <th>النوع</th>
                  <th>تواصل</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className={`clickable${checked.has(p.id) ? ' is-selected' : ''}`} onClick={() => (p.fromConversation ? navigate(`${base}/conversations?id=${encodeURIComponent(p.openId || '')}`) : setSelected(p))}>
                    <td onClick={(e) => e.stopPropagation()}>
                      {!p.fromConversation && <label className="np-check"><input type="checkbox" aria-label={`تحديد ${p.name}`} checked={checked.has(p.id)} onChange={() => toggleCheck(p.id)} /></label>}
                    </td>
                    <td className="strong">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar name={p.name} size={32} />{p.name}{p.fromConversation && <Badge tone="neutral">من المحادثات</Badge>}</span>
                    </td>
                    <td className="np-num" dir="ltr" style={{ textAlign: 'end' }}>{p.phone || '—'}</td>
                    <td className="np-num">{p.last_visit_at ? p.last_visit_at.split('T')[0] : '—'}</td>
                    <td className="np-num">{p.total_visits}</td>
                    <td><Badge tone={p.patient_type === 'returning' ? 'success' : 'brand'}>{p.patient_type === 'returning' ? 'عائد' : 'جديد'}</Badge></td>
                    <td>{p.phone ? <ContactActions size={narrow ? 40 : 28} phone={p.phone} message={`مرحباً ${p.name}`} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && shown.length === 0 && (
          <EmptyState icon={<Users size={20} />} title="لا يوجد عملاء مطابقون" description="جرّب تغيير كلمة البحث أو الفلاتر." />
        )}
      </Card>

      <Dialog
        open={!!selected} title="تعديل بيانات العميل" onClose={() => setSelected(null)}
        footer={<><Button variant="secondary" onClick={() => setSelected(null)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={selected.name} size={48} />
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>مرات عدم الحضور: {selected.no_show_count}{selected.notes ? ` — ${selected.notes}` : ''}</div>
            </div>
            <Input label="الاسم" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="الجوال" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <div className="np-form-grid">
              <Input label="آخر زيارة" type="date" value={form.last_visit_at} onChange={(e) => setForm((f) => ({ ...f, last_visit_at: e.target.value }))} />
              <Input label={visitsLabel} type="number" value={String(form.total_visits)} onChange={(e) => setForm((f) => ({ ...f, total_visits: Number(e.target.value) || 0 }))} />
            </div>
            <Select label="النوع" options={EDIT_TYPE_OPTIONS} value={form.patient_type} onChange={(e) => setForm((f) => ({ ...f, patient_type: e.target.value as Customer['patient_type'] }))} />
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}
