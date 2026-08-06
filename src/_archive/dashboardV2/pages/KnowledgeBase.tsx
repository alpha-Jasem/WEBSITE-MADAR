import { useMemo, useState } from 'react'
import { Plus, BookOpen, ChevronDown, Trash2 } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import {
  useClinicKnowledge, saveClinicKnowledgeItem, deleteClinicKnowledgeItem, toggleClinicKnowledgeItem,
  type ClinicKnowledgeItem,
} from '@/lib/clinicOSQueries'
import { Card, Badge, Button, Dialog, Input, Select, Switch } from '@/_archive/dashboardV2/components/primitives'
import { useToast, EmptyState, SkeletonRows } from '@/_archive/dashboardV2/components/uiExtras'

const TYPE_LABEL: Record<string, string> = { faq: 'سؤال شائع', policy: 'سياسة عامة' }
const TYPE_OPTIONS = [{ value: 'faq', label: 'سؤال شائع' }, { value: 'policy', label: 'سياسة عامة' }]
const EMPTY_FORM = { type: 'faq', title: '', content: '' }

export function DashboardV2KnowledgeBase() {
  const { companyId, isDemo } = useClinicOS()
  const { data: items, loading, refetch } = useClinicKnowledge(companyId, isDemo)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClinicKnowledgeItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({})
  const pushToast = useToast()

  const rows = useMemo(() => (items || []).map((it) => (
    it.id in optimisticActive ? { ...it, is_active: optimisticActive[it.id] } : it
  )), [items, optimisticActive])
  const groups = useMemo(() => {
    const map = new Map<string, ClinicKnowledgeItem[]>()
    for (const it of rows) {
      const key = it.type
      map.set(key, [...(map.get(key) || []), it])
    }
    return Array.from(map.entries()).sort(([a], [b]) => (TYPE_LABEL[a] || a).localeCompare(TYPE_LABEL[b] || b, 'ar'))
  }, [rows])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(it: ClinicKnowledgeItem) {
    setEditing(it)
    setForm({ type: it.type, title: it.title, content: it.content || '' })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !companyId) return
    if (isDemo) { pushToast({ kind: 'info', title: 'غير متاح بوضع العرض التجريبي' }); setDialogOpen(false); return }
    setSaving(true)
    try {
      await saveClinicKnowledgeItem({
        id: editing?.id, company_id: companyId, type: form.type, title: form.title, content: form.content,
      })
      setDialogOpen(false)
      refetch()
      pushToast({ kind: 'success', title: editing ? 'تم تحديث العنصر' : 'تم إضافة العنصر' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(it: ClinicKnowledgeItem) {
    if (isDemo) return
    setOptimisticActive((o) => ({ ...o, [it.id]: !it.is_active }))
    try {
      await toggleClinicKnowledgeItem(it.id, !it.is_active)
      refetch()
    } catch (e) {
      setOptimisticActive((o) => { const { [it.id]: _drop, ...rest } = o; return rest })
      pushToast({ kind: 'danger', title: 'تعذّر تحديث الحالة', description: e instanceof Error ? e.message : undefined })
    }
  }

  async function remove(it: ClinicKnowledgeItem) {
    if (isDemo) { pushToast({ kind: 'info', title: 'غير متاح بوضع العرض التجريبي' }); return }
    if (!window.confirm(`حذف "${it.title}"؟`)) return
    try {
      await deleteClinicKnowledgeItem(it.id)
      refetch()
      pushToast({ kind: 'success', title: 'تم الحذف' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحذف', description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={20} style={{ color: 'var(--brand-500)' }} /> قاعدة المعرفة
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{rows.length} عنصر — المعلومات اللي يرجع لها الوكيل الصوتي مها أثناء المكالمات</div>
        </div>
        <Button onClick={openNew}><Plus size={15} /> عنصر جديد</Button>
      </div>

      {loading && <Card style={{ padding: 0 }}><SkeletonRows rows={4} columns={3} /></Card>}

      {!loading && rows.length === 0 && (
        <Card>
          <EmptyState
            icon={<BookOpen size={20} />} title="لا توجد عناصر بعد"
            description="أضف أسئلة شائعة أو سياسات عامة للعيادة عشان الوكيل الصوتي يرجع لها أثناء الرد على العملاء."
            action={<Button size="sm" onClick={openNew}><Plus size={14} /> عنصر جديد</Button>}
          />
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!loading && groups.map(([type, list], gi) => {
          const isOpen = !collapsed[type]
          const activeCount = list.filter((i) => i.is_active).length
          return (
            <Card key={type} delay={gi * 0.06} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => setCollapsed((c) => ({ ...c, [type]: isOpen }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>{TYPE_LABEL[type] || type}</span>
                  <Badge tone="neutral">{list.length} عنصر</Badge>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{activeCount} فعّال</span>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border-default)' }}>
                  {list.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderTop: '1px solid var(--border-default)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{it.title}</div>
                        {it.content && (
                          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {it.content}
                          </div>
                        )}
                      </div>
                      <Badge tone={it.is_active ? 'success' : 'neutral'}>{it.is_active ? 'فعّال' : 'موقوف'}</Badge>
                      <Switch checked={it.is_active} onChange={() => toggleActive(it)} />
                      <span onClick={() => openEdit(it)} style={{ color: 'var(--brand-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>تعديل</span>
                      <span onClick={() => remove(it)} style={{ color: 'var(--danger-500)', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Dialog
        open={dialogOpen} title={editing ? 'تعديل عنصر' : 'عنصر جديد'} onClose={() => setDialogOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setDialogOpen(false)}>إلغاء</Button><Button onClick={save} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="النوع" options={TYPE_OPTIONS} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
          <Input label="العنوان / السؤال" placeholder="مثال: هل تقبلون التأمين الطبي؟" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)' }}>
            <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>المحتوى / الإجابة</span>
            <textarea
              rows={4} placeholder="التفاصيل اللي يعتمد عليها الوكيل الصوتي بالرد"
              value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 14px', fontSize: 'var(--text-body-sm)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', outline: 'none',
                color: 'var(--text-primary)', fontFamily: 'var(--font-body)', resize: 'vertical',
              }}
            />
          </label>
        </div>
      </Dialog>
    </div>
  )
}
