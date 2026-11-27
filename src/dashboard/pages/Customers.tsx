import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, LayoutGrid, List, Plus, Search, Upload, Users, UserCheck } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { createCustomer, importCustomers, useCustomers, updateCustomer } from '@/lib/dashboardQueries'
import { useConversationData } from '@/lib/queries/conversations'
import { buildContacts } from './AgentUsers'
import { addToStaticSegment, saveSegment, segmentMembers, useContacts, useSegments } from '@/lib/queries/segments'
import { normalizePhone } from '@/lib/callAnalysis'
import { useCustomFields, useLeadStages, type CustomField, type LeadStage } from '@/lib/queries/workspaceSettings'
import { EMPTY_RULES } from '@/lib/segments'
import type { Customer } from '@/types/dashboard'
import { Card, Badge, Button, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { NightPage, PageHead, Seg, useIsNarrow, fmtNum } from './shared/night'
import { EmptyState, SkeletonRows, useToast, Avatar, SortableHeader, ContactActions } from '@/dashboard/components/uiExtras'

/** A person known only from the agent's conversations; saved customers keep their own row. */
type Row = Customer & { fromConversation?: boolean; openId?: string }

type SortKey = 'name' | 'last_visit_at' | 'total_visits'
const SORTS: { value: string; label: string; key: SortKey; dir: 1 | -1 }[] = [
  { value: 'recent', label: 'آخر نشاط (الأحدث)', key: 'last_visit_at', dir: -1 },
  { value: 'oldest', label: 'آخر نشاط (الأقدم)', key: 'last_visit_at', dir: 1 },
  { value: 'name', label: 'الاسم (أ–ي)', key: 'name', dir: 1 },
  { value: 'most', label: 'الأكثر تواصلًا', key: 'total_visits', dir: -1 },
]

const EDIT_TYPE_OPTIONS = [
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]

const TYPE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'returning', label: 'عائد' },
]

const IMPORT_LIMIT = 2000
const NAME_HEAD = /^(الاسم|اسم|اسم العميل|name|full ?name|customer)$/i
const PHONE_HEAD = /^(الجوال|الهاتف|رقم الجوال|رقم الهاتف|الرقم|جوال|phone|mobile|phone ?number|number|tel)$/i

/** Name and phone pairs from a CSV or Excel file: a header row picks the columns, else the first two columns. */
async function readContactsFile(file: File): Promise<{ name: string; phone: string }[]> {
  const XLSX = await import('xlsx')
  // raw keeps CSV cells as text, so a leading 0 in a phone number survives.
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true })
  const sheet = book.Sheets[book.SheetNames[0]]
  const grid = (XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '', raw: false }) as unknown[][]).map((r) => r.map((c) => String(c ?? '').trim()))
  if (grid.length === 0) return []
  const head = grid[0]
  let nameCol = head.findIndex((h) => NAME_HEAD.test(h))
  let phoneCol = head.findIndex((h) => PHONE_HEAD.test(h))
  const hasHeader = nameCol >= 0 || phoneCol >= 0
  if (!hasHeader) {
    // No header: the column that looks like numbers is the phone, the other the name.
    const digits = (s: string) => s.replace(/\D/g, '').length >= 8
    phoneCol = head.findIndex(digits)
    nameCol = head.findIndex((_, i) => i !== phoneCol)
  }
  return grid.slice(hasHeader ? 1 : 0).map((r) => ({ name: nameCol >= 0 ? r[nameCol] ?? '' : '', phone: phoneCol >= 0 ? r[phoneCol] ?? '' : '' }))
}

/** The saved value of each custom field, typed; empty values are left out. */
function packCustom(fields: CustomField[], raw: Record<string, string>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const f of fields) {
    const v = (raw[f.id] ?? '').trim()
    if (!v) continue
    out[f.id] = f.field_type === 'number' ? (Number.isFinite(Number(v)) ? Number(v) : v) : f.field_type === 'yes_no' ? v === 'yes' || v === 'true' : v
  }
  return out
}

function StageChip({ stage }: { stage?: LeadStage }) {
  if (!stage) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}><i style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />{stage.label}</span>
}

function FieldInput({ field, value, onChange }: { field: CustomField; value: string; onChange: (v: string) => void }) {
  if (field.field_type === 'select') return <Select label={field.label} options={[{ value: '', label: '—' }, ...field.options.map((o) => ({ value: o, label: o }))]} value={value} onChange={(e) => onChange(e.target.value)} />
  if (field.field_type === 'yes_no') return <Select label={field.label} options={[{ value: '', label: '—' }, { value: 'yes', label: 'نعم' }, { value: 'no', label: 'لا' }]} value={value === 'true' ? 'yes' : value === 'false' ? 'no' : value} onChange={(e) => onChange(e.target.value)} />
  return <Input label={field.label} type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
}

export function DashboardV2Customers() {
  const { companyId, isDemo, hasModule } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { data: rawPatients, loading: customersLoading, refetch } = useCustomers(companyId, isDemo)
  const { stages } = useLeadStages(companyId, isDemo)
  const { fields } = useCustomFields(companyId, isDemo)
  // In the demo nothing is saved, so stage and field changes are kept here for the session.
  const [demoEdits, setDemoEdits] = useState<Record<string, Pick<Customer, 'stage_id' | 'custom_data'>>>({})
  const patients = useMemo(() => (rawPatients ? rawPatients.map((p) => (demoEdits[p.id] ? { ...p, ...demoEdits[p.id] } : p)) : rawPatients), [rawPatients, demoEdits])
  const stageById = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])
  const [stageFilter, setStageFilter] = useState('')
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const loading = customersLoading || callsLoading
  const pushToast = useToast()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'last_visit_at', dir: -1 })
  const [view, setView] = useState<'cards' | 'table'>('table')
  const [newOpen, setNewOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', phone: '' })
  const [importing, setImporting] = useState<{ ready: { name: string; phone: string }[]; skipped: number; total: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', last_visit_at: '', total_visits: 0, patient_type: 'new' as Customer['patient_type'], stage_id: '', custom: {} as Record<string, string> })
  const [saving, setSaving] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const { segments, available: segmentsOn } = useSegments(companyId, isDemo)
  const { contacts } = useContacts(companyId, isDemo)
  const [segFilter, setSegFilter] = useState('')
  const segKeys = useMemo(() => {
    const seg = segments.find((x) => x.id === segFilter)
    return seg ? new Set(segmentMembers(seg, contacts).map((c) => c.key)) : null
  }, [segments, segFilter, contacts])
  const rowKey = (p: Row) => normalizePhone(p.phone) || `id:${p.id}`

  async function addCheckedToSegment(target: string) {
    const keys = rows.filter((r) => checked.has(r.id)).map(rowKey)
    if (!keys.length || !target) return
    try {
      if (target === 'new') {
        const name = window.prompt('اسم الشريحة الجديدة')?.trim()
        if (!name) return
        await saveSegment(companyId, isDemo, { name, description: null, kind: 'static', rules: EMPTY_RULES, member_keys: keys })
      } else {
        const seg = segments.find((x) => x.id === target)
        if (!seg) return
        await addToStaticSegment(companyId, isDemo, seg, keys)
      }
      pushToast({ kind: 'success', title: `انضاف ${keys.length} للشريحة` })
      setChecked(new Set())
    } catch { pushToast({ kind: 'danger', title: 'ما قدرنا نضيفهم' }) }
  }

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name,
        phone: selected.phone,
        last_visit_at: selected.last_visit_at ? selected.last_visit_at.split('T')[0] : '',
        total_visits: selected.total_visits,
        patient_type: selected.patient_type,
        stage_id: selected.stage_id || '',
        custom: Object.fromEntries(Object.entries(selected.custom_data || {}).map(([k, v]) => [k, v == null ? '' : String(v)])),
      })
    }
  }, [selected])

  async function save() {
    if (!selected) return
    setSaving(true)
    try {
      const custom_data = packCustom(fields, form.custom)
      if (isDemo) {
        setDemoEdits((m) => ({ ...m, [selected.id]: { stage_id: form.stage_id || null, custom_data } }))
        pushToast({ kind: 'success', title: 'تم الحفظ (عرض تجريبي)' })
      } else {
        await updateCustomer(selected.id, {
          company_id: companyId || undefined,
          name: form.name,
          phone: form.phone,
          last_visit_at: form.last_visit_at ? new Date(form.last_visit_at).toISOString() : undefined,
          total_visits: form.total_visits,
          patient_type: form.patient_type,
          // Only sent when set or changed, so editing a customer still works before the stage columns exist.
          ...((form.stage_id || selected.stage_id) ? { stage_id: form.stage_id || null } : {}),
          ...((Object.keys(custom_data).length || Object.keys(selected.custom_data || {}).length) ? { custom_data } : {}),
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

  async function bulkSetStage(stageId: string) {
    const ids = Array.from(checked)
    if (!ids.length || !stageId) return
    const value = stageId === 'none' ? null : stageId
    setBulkSaving(true)
    try {
      if (isDemo) setDemoEdits((m) => ({ ...m, ...Object.fromEntries(ids.map((id) => [id, { stage_id: value, custom_data: (patients || []).find((p) => p.id === id)?.custom_data ?? null }])) }))
      else { await Promise.all(ids.map((id) => updateCustomer(id, { company_id: companyId || undefined, stage_id: value }))); await refetch() }
      pushToast({ kind: 'success', title: `انتقل ${ids.length} عميل${isDemo ? ' (عرض تجريبي)' : ''}` })
      setChecked(new Set())
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر النقل', description: e instanceof Error ? e.message : undefined })
    } finally { setBulkSaving(false) }
  }

  async function createContact() {
    const name = draft.name.trim()
    const phone = draft.phone.trim()
    if (!name || !phone) { pushToast({ kind: 'danger', title: 'اكتب الاسم والجوال' }); return }
    if (isDemo) { pushToast({ kind: 'success', title: 'انضافت جهة الاتصال (عرض تجريبي)' }); setNewOpen(false); return }
    setSaving(true)
    try {
      await createCustomer({ company_id: companyId || undefined, name, phone, patient_type: 'new' })
      await refetch()
      pushToast({ kind: 'success', title: 'انضافت جهة الاتصال' })
      setNewOpen(false); setDraft({ name: '', phone: '' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الإضافة', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  // Import: read the file, drop rows without a valid number and numbers already saved or repeated, then confirm.
  async function pickFile(file: File | undefined) {
    if (!file) return
    try {
      const parsed = await readContactsFile(file)
      const known = new Set(rows.map((r) => normalizePhone(r.phone)).filter(Boolean))
      const seen = new Set<string>()
      const ready: { name: string; phone: string }[] = []
      for (const raw of parsed) {
        // Excel stores 0551234567 as the number 551234567; put the 0 back for Saudi mobiles.
        const r = { ...raw, phone: /^5\d{8}$/.test(raw.phone) ? `0${raw.phone}` : raw.phone }
        const key = normalizePhone(r.phone)
        if (!key || key.replace(/\D/g, '').length < 8 || known.has(key) || seen.has(key)) continue
        seen.add(key)
        ready.push({ name: r.name.slice(0, 120) || r.phone, phone: r.phone.slice(0, 30) })
      }
      if (parsed.length === 0) { pushToast({ kind: 'danger', title: 'الملف فاضي أو ما قدرنا نقراه' }); return }
      setImporting({ ready: ready.slice(0, IMPORT_LIMIT), skipped: parsed.length - ready.length + Math.max(0, ready.length - IMPORT_LIMIT), total: parsed.length })
    } catch {
      pushToast({ kind: 'danger', title: 'ما قدرنا نقرا الملف', description: 'استخدم ملف CSV أو Excel فيه عمود للاسم وعمود للجوال.' })
    } finally { if (fileRef.current) fileRef.current.value = '' }
  }

  async function runImport() {
    if (!importing || importing.ready.length === 0) return
    if (isDemo) { pushToast({ kind: 'success', title: `انضاف ${importing.ready.length} جهة اتصال (عرض تجريبي)` }); setImporting(null); return }
    if (!companyId) return
    setSaving(true)
    try {
      const n = await importCustomers(companyId, importing.ready)
      await refetch()
      pushToast({ kind: 'success', title: `انضاف ${n} جهة اتصال` })
      setImporting(null)
    } catch (e) {
      const saved = (e as { saved?: number }).saved ?? 0
      await refetch()
      pushToast({ kind: 'danger', title: saved ? `انضاف ${saved} وتوقف الباقي` : 'تعذّر الاستيراد', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const head = ['الاسم', 'الجوال', 'آخر نشاط', visitsLabel, 'النوع', 'المرحلة']
    const lines = shown.map((p) => [p.name, p.phone, p.last_visit_at ? p.last_visit_at.split('T')[0] : '', p.total_visits, p.patient_type === 'returning' ? 'عائد' : 'جديد', p.stage_id ? stageById.get(p.stage_id)?.label : ''].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const openRow = (p: Row) => (p.fromConversation ? navigate(`${base}/conversations?id=${encodeURIComponent(p.openId || '')}`) : setSelected(p))

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
    if (segKeys) filtered = filtered.filter((p) => segKeys.has(rowKey(p)))
    if (stageFilter) filtered = filtered.filter((p) => (stageFilter === 'none' ? !p.stage_id : p.stage_id === stageFilter))
    filtered = [...filtered]
    filtered.sort((a, b) => {
      const av = a[sort.key] ?? ''
      const bv = b[sort.key] ?? ''
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0
    })
    return filtered
  }, [rows, q, typeFilter, sort, segKeys, stageFilter])

  const narrow = useIsNarrow()
  const returning = rows.filter((p) => p.patient_type === 'returning').length
  const visitsLabel = hasModule('bookings') ? 'عدد الزيارات' : 'عدد التواصل'

  return (
    <NightPage>
      <PageHead
        title="جهات الاتصال"
        sub={loading ? 'جارِ التحميل…' : `أدر جهات اتصال مساحة العمل واحتفظ بسياق التواصل في مكان واحد. ${fmtNum(returning)} عائد، وكل من تواصل مع الوكيل الذكي يُحفظ هنا تلقائيًا.`}
        actions={<>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv" hidden onChange={(e) => void pickFile(e.target.files?.[0])} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> استيراد</Button>
          <Button variant="secondary" disabled={shown.length === 0} onClick={exportCsv}><Download size={14} /> تصدير</Button>
          <Button onClick={() => setNewOpen(true)}><Plus size={14} /> جهة اتصال جديدة</Button>
        </>}
      />

      <div className="np-filters">
        <b className="np-num" style={{ fontSize: 14 }}>{fmtNum(rows.length)} جهات اتصال</b>
        <Select options={SORTS.map((s) => ({ value: s.value, label: s.label }))} style={{ width: 190 }}
          value={SORTS.find((s) => s.key === sort.key && s.dir === sort.dir)?.value ?? ''}
          onChange={(e) => { const s = SORTS.find((x) => x.value === e.target.value); if (s) setSort({ key: s.key, dir: s.dir }) }} />
        <Seg label="طريقة العرض" value={view} onChange={setView} options={[['cards', <span key="c" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><LayoutGrid size={13} /> عرض بطاقات</span>], ['table', <span key="t" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><List size={13} /> عرض جدول</span>]] as const} />
        <Input placeholder="بحث بالاسم أو الجوال" icon={<Search size={15} />} value={q} onChange={(e) => setQ(e.target.value)} style={{ width: narrow ? '100%' : 260 }} />
        <Seg label="نوع العميل" value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS.map((o) => [o.value, o.label] as const)} />
        {segmentsOn && segments.length > 0 && (
          <Select options={[{ value: '', label: 'كل الشرائح' }, ...segments.map((x) => ({ value: x.id, label: x.name }))]} value={segFilter} onChange={(e) => setSegFilter(e.target.value)} style={{ width: 180 }} />
        )}
        {stages.length > 0 && (
          <Select options={[{ value: '', label: 'كل المراحل' }, ...stages.map((s) => ({ value: s.id, label: s.label })), { value: 'none', label: 'بدون مرحلة' }]} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ width: 170 }} />
        )}
        <span className="np-aside np-num">{fmtNum(shown.length)} من {fmtNum(rows.length)}</span>
      </div>

      {checked.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="np-bulk">
          <b>{checked.size} محدد</b>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={() => setChecked(new Set())}>إلغاء التحديد</Button>
            {segmentsOn && (
              <Select value="" onChange={(e) => void addCheckedToSegment(e.target.value)} style={{ width: 190 }}
                options={[{ value: '', label: 'أضف إلى شريحة…' }, ...segments.filter((x) => x.kind === 'static').map((x) => ({ value: x.id, label: x.name })), { value: 'new', label: '+ شريحة جديدة بالمحددين' }]} />
            )}
            {stages.length > 0 && (
              <Select value="" onChange={(e) => void bulkSetStage(e.target.value)} style={{ width: 170 }}
                options={[{ value: '', label: 'انقل إلى مرحلة…' }, ...stages.map((s) => ({ value: s.id, label: s.label })), { value: 'none', label: 'بدون مرحلة' }]} />
            )}
            <Button size="sm" onClick={bulkMarkReturning} disabled={bulkSaving}>
              <UserCheck size={14} /> {bulkSaving ? 'جارِ التحديث...' : 'تحديد كعائدين'}
            </Button>
          </div>
        </motion.div>
      )}

      {view === 'cards' && !loading && shown.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {shown.map((p) => (
            <Card key={p.id} interactive style={{ padding: 14, display: 'grid', gap: 10, cursor: 'pointer' }}>
              <button type="button" onClick={() => openRow(p)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={p.name} size={38} />
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</b>
                  <span className="np-num" dir="ltr" style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{p.phone || '—'}</span>
                </span>
              </button>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12 }}>
                <Badge tone={p.patient_type === 'returning' ? 'success' : 'brand'}>{p.patient_type === 'returning' ? 'عائد' : 'جديد'}</Badge>
                {p.fromConversation && <Badge tone="neutral">من المحادثات</Badge>}
                {p.stage_id && <StageChip stage={stageById.get(p.stage_id)} />}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
                <span>آخر نشاط: <span className="np-num">{p.last_visit_at ? p.last_visit_at.split('T')[0] : '—'}</span></span>
                {p.phone ? <ContactActions size={28} phone={p.phone} message={`مرحباً ${p.name}`} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card style={{ padding: 0, display: view === 'cards' && !loading && shown.length > 0 ? 'none' : undefined }}>
        {loading && <SkeletonRows rows={6} columns={7} />}
        {!loading && shown.length > 0 && view === 'table' && (
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
                  {stages.length > 0 && <th>المرحلة</th>}
                  <th>تواصل</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id} className={`clickable${checked.has(p.id) ? ' is-selected' : ''}`} onClick={() => openRow(p)}>
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
                    {stages.length > 0 && <td><StageChip stage={p.stage_id ? stageById.get(p.stage_id) : undefined} /></td>}
                    <td>{p.phone ? <ContactActions size={narrow ? 40 : 28} phone={p.phone} message={`مرحباً ${p.name}`} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && shown.length === 0 && (rows.length === 0
          ? <EmptyState icon={<Users size={20} />} title="لا توجد جهات اتصال بعد" description="أنشئ أول جهة اتصال لبدء تتبع المكالمات والتذاكر حسب الشخص." />
          : <EmptyState icon={<Users size={20} />} title="لا توجد جهات اتصال مطابقة" description="جرّب تغيير كلمة البحث أو الفلاتر." />)}
      </Card>

      <Dialog open={!!importing} title="استيراد جهات اتصال" onClose={() => setImporting(null)} width={520}
        footer={<><Button variant="secondary" onClick={() => setImporting(null)}>إلغاء</Button><Button onClick={() => void runImport()} disabled={saving || !importing?.ready.length}>{saving ? 'جارِ الاستيراد...' : `استيراد ${importing?.ready.length ?? 0}`}</Button></>}>
        {importing && (
          <div style={{ display: 'grid', gap: 12, fontSize: 13.5, lineHeight: 1.8 }}>
            <div>في الملف <b>{fmtNum(importing.total)}</b> صف. جاهز للإضافة <b>{fmtNum(importing.ready.length)}</b>{importing.skipped ? <>، وتخطينا <b>{fmtNum(importing.skipped)}</b> (بدون رقم صحيح، أو الرقم موجود عندك، أو مكرر في الملف{importing.total > IMPORT_LIMIT ? `، أو فوق حد ${IMPORT_LIMIT}` : ''}).</> : '.'}</div>
            {importing.ready.length > 0 && (
              <div className="np-table-wrap">
                <table className="np-table">
                  <thead><tr><th>الاسم</th><th>الجوال</th></tr></thead>
                  <tbody>{importing.ready.slice(0, 5).map((r, i) => <tr key={i}><td>{r.name}</td><td className="np-num" dir="ltr" style={{ textAlign: 'end' }}>{r.phone}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            <small style={{ color: 'var(--text-tertiary)' }}>الملف يكون CSV أو Excel، فيه عمود «الاسم» وعمود «الجوال» (أو أول عمودين بدون عناوين).</small>
          </div>
        )}
      </Dialog>

      <Dialog open={newOpen} title="جهة اتصال جديدة" onClose={() => setNewOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setNewOpen(false)}>إلغاء</Button><Button onClick={() => void createContact()} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'إضافة'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="الاسم" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <Input label="الجوال" placeholder="05xxxxxxxx" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
        </div>
      </Dialog>

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
            {stages.length > 0 && <Select label="المرحلة" options={[{ value: '', label: 'بدون مرحلة' }, ...stages.map((s) => ({ value: s.id, label: s.label }))]} value={form.stage_id} onChange={(e) => setForm((f) => ({ ...f, stage_id: e.target.value }))} />}
            {fields.map((fd) => <FieldInput key={fd.id} field={fd} value={form.custom[fd.id] ?? ''} onChange={(v) => setForm((f) => ({ ...f, custom: { ...f.custom, [fd.id]: v } }))} />)}
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}
