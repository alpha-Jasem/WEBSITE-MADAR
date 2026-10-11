import { useMemo, useState } from 'react'
import { Plus, Wrench, ChevronDown, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { SERVICE_NAME_EXAMPLE } from '@/lib/industryExamples'
import { useServices, createService, updateService } from '@/lib/dashboardQueries'
import type { Service } from '@/types/dashboard'
import { Card, Badge, Button, Dialog, Input, Switch } from '@/dashboard/components/primitives'
import { NightPage, PageHead, Toggle, Chip, fmtNum } from './shared/night'
import { useToast, EmptyState, SkeletonRows } from '@/dashboard/components/uiExtras'

const EMPTY_FORM = { name: '', category: '', duration_minutes: '30', price: '', active: true, available_for_ai: true }
const UNCATEGORIZED = 'خدمات أخرى'

export function DashboardV2Services() {
  const { companyId, isDemo, businessType } = useWorkspace()
  const { data: services, loading, refetch } = useServices(companyId, isDemo)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({})
  const pushToast = useToast()

  const rows = useMemo(() => (services || []).map((s) => (
    s.id in optimisticActive ? { ...s, active: optimisticActive[s.id] } : s
  )), [services, optimisticActive])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const map = new Map<string, Service[]>()
    for (const s of rows) {
      const key = s.category?.trim() || UNCATEGORIZED
      map.set(key, [...(map.get(key) || []), s])
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'ar'))
  }, [rows])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setForm({ name: s.name, category: s.category || '', duration_minutes: String(s.duration_minutes), price: String(s.price), active: s.active, available_for_ai: s.available_for_ai })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.name.trim() || !companyId) return
    setSaving(true)
    try {
      if (editing) {
        await updateService(editing.id, {
          company_id: companyId, name: form.name, category: form.category,
          duration_minutes: Number(form.duration_minutes) || 30, price: Number(form.price) || 0, active: form.active,
          available_for_ai: form.available_for_ai,
        })
      } else {
        await createService({
          company_id: companyId, name: form.name, category: form.category,
          duration_minutes: Number(form.duration_minutes) || 30, buffer_minutes: 0, price: Number(form.price) || 0,
          active: form.active, requires_approval: false, available_for_ai: form.available_for_ai, available_for_whatsapp: true,
        })
      }
      setDialogOpen(false)
      refetch()
      pushToast({ kind: 'success', title: editing ? 'تم تحديث الخدمة' : 'تم إضافة الخدمة' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: Service) {
    if (isDemo || !companyId) return
    setOptimisticActive((o) => ({ ...o, [s.id]: !s.active }))
    try {
      await updateService(s.id, { company_id: companyId, active: !s.active })
      refetch()
    } catch (e) {
      setOptimisticActive((o) => { const { [s.id]: _drop, ...rest } = o; return rest })
      pushToast({ kind: 'danger', title: 'تعذّر تحديث الحالة', description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <NightPage>
      <PageHead
        title="الخدمات"
        sub={`${fmtNum(rows.length)} خدمة · ${fmtNum(rows.filter((s) => s.active).length)} مفعّلة — تُستخدم بالحجوزات والإيرادات وخيارات الموظف الذكي`}
        actions={<Button onClick={openNew}><Plus size={15} /> خدمة جديدة</Button>}
      />

      {loading && <Card style={{ padding: 0 }}><SkeletonRows rows={5} columns={6} /></Card>}

      {!loading && rows.length === 0 && (
        <Card>
          <EmptyState
            icon={<Wrench size={20} />} title="لا توجد خدمات بعد" description="أضف أول خدمة لعملك ليبدأ العملاء بحجزها والوكيل الصوتي بعرضها."
            action={<Button size="sm" onClick={openNew}><Plus size={14} /> خدمة جديدة</Button>}
          />
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!loading && groups.map(([category, items], gi) => {
          const isOpen = !collapsed[category]
          const aiCount = items.filter((s) => s.available_for_ai).length
          return (
            <Card key={category} delay={gi * 0.06} style={{ padding: 0, overflow: 'hidden' }}>
              <button
                type="button" aria-expanded={isOpen}
                onClick={() => setCollapsed((c) => ({ ...c, [category]: isOpen }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 20px', cursor: 'pointer', width: '100%', background: 'none', border: 0, textAlign: 'start' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>{category}</span>
                  <Badge tone="neutral">{items.length} خدمة</Badge>
                  {aiCount > 0 && (
                    <Chip tone="ai"><Sparkles size={12} /> {aiCount} متاحة للموظف الذكي</Chip>
                  )}
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
              </button>
              {isOpen && (
                <div className="np-table-wrap" style={{ borderTop: '1px solid var(--line)' }}>
                  <table className="np-table">
                    <thead>
                      <tr><th style={{ paddingInlineStart: 20 }}>الخدمة</th><th>المدة</th><th>السعر</th><th>الموظف الذكي</th><th>الحالة</th><th aria-label="إجراءات" /></tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr key={s.id}>
                          <td className="strong" style={{ paddingInlineStart: 20 }}>{s.name}</td>
                          <td className="np-num">{s.duration_minutes} د</td>
                          <td className="np-num">{s.price ? `${fmtNum(s.price)} ر.س` : '—'}</td>
                          <td>{s.available_for_ai ? <Badge tone="brand">متاحة</Badge> : <Badge tone="neutral">غير متاحة</Badge>}</td>
                          <td><Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'مفعّلة' : 'موقوفة'}</Badge></td>
                          <td>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Toggle checked={s.active} label={`تفعيل ${s.name}`} onChange={() => toggleActive(s)} />
                              <button type="button" className="np-link" onClick={() => openEdit(s)}>تعديل</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Dialog
        open={dialogOpen} title={editing ? 'تعديل خدمة' : 'خدمة جديدة'} onClose={() => setDialogOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="اسم الخدمة" placeholder={SERVICE_NAME_EXAMPLE[businessType]} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="الفئة" placeholder="مثال: عام" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <div className="np-form-grid">
            <Input label="المدة (دقيقة)" type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} />
            <Input label="السعر (ر.س)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            <span style={{ fontSize: 13 }}>مفعّلة للحجز</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={form.available_for_ai} onChange={(v) => setForm((f) => ({ ...f, available_for_ai: v }))} />
            <div>
              <div style={{ fontSize: 13 }}>متاحة للوكيل الصوتي (مها)</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>يحدد إذا كان الوكيل يعرض هذي الخدمة أثناء المكالمات</div>
            </div>
          </div>
        </div>
      </Dialog>
    </NightPage>
  )
}
