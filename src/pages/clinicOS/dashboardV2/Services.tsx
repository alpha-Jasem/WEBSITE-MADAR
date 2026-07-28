import { useMemo, useState } from 'react'
import { Plus, Wrench, ChevronDown, Sparkles } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicServices, createService, updateService } from '../../../lib/clinicOSQueries'
import type { Service } from '../../../types/clinicOS'
import { Card, Badge, Button, Dialog, Input, Switch, Toast } from '../../../components/clinicOS/v2/primitives'

const EMPTY_FORM = { name: '', category: '', duration_minutes: '30', price: '', active: true, available_for_ai: true }
const UNCATEGORIZED = 'خدمات أخرى'

export function DashboardV2Services() {
  const { companyId, isDemo } = useClinicOS()
  const { data: services, refetch } = useClinicServices(companyId, isDemo)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null)

  const rows = services || []
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
          clinic_id: companyId, name: form.name, category: form.category,
          duration_minutes: Number(form.duration_minutes) || 30, price: Number(form.price) || 0, active: form.active,
          available_for_ai: form.available_for_ai,
        })
      } else {
        await createService({
          clinic_id: companyId, name: form.name, category: form.category,
          duration_minutes: Number(form.duration_minutes) || 30, buffer_minutes: 0, price: Number(form.price) || 0,
          active: form.active, requires_approval: false, available_for_ai: form.available_for_ai, available_for_whatsapp: true,
        })
      }
      setDialogOpen(false)
      refetch()
      setToast({ title: editing ? 'تم تحديث الخدمة' : 'تم إضافة الخدمة' })
    } catch (e) {
      setToast({ title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  async function toggleActive(s: Service) {
    if (isDemo || !companyId) return
    await updateService(s.id, { clinic_id: companyId, active: !s.active })
    refetch()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wrench size={20} style={{ color: 'var(--brand-500)' }} /> الخدمات
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{rows.length} خدمة — تُستخدم بالحجوزات والإيرادات وخيارات الوكيل الذكي</div>
        </div>
        <Button onClick={openNew}><Plus size={15} /> خدمة جديدة</Button>
      </div>

      {rows.length === 0 && (
        <Card><div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>لا توجد خدمات بعد — أضف أول خدمة لعملك</div></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(([category, items]) => {
          const isOpen = !collapsed[category]
          const aiCount = items.filter((s) => s.available_for_ai).length
          return (
            <Card key={category} style={{ padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => setCollapsed((c) => ({ ...c, [category]: isOpen }))}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text-primary)' }}>{category}</span>
                  <Badge tone="neutral">{items.length} خدمة</Badge>
                  {aiCount > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--brand-600)' }}>
                      <Sparkles size={12} /> {aiCount} متاحة للوكيل الصوتي
                    </span>
                  )}
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-tertiary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border-default)', overflowX: 'auto' }}>
                  <div style={{ minWidth: 620 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.9fr 0.7fr 0.6fr', padding: '10px 20px', fontSize: 11.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>
                      <div>الخدمة</div><div>المدة</div><div>السعر</div><div>الوكيل الصوتي</div><div>الحالة</div><div></div>
                    </div>
                    {items.map((s) => (
                      <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 0.9fr 0.7fr 0.6fr', padding: '13px 20px', fontSize: 14, alignItems: 'center', borderTop: '1px solid var(--border-default)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{s.duration_minutes} د</div>
                        <div style={{ color: 'var(--text-secondary)' }}>{s.price ? `${s.price} ر.س` : '—'}</div>
                        <div>{s.available_for_ai ? <Badge tone="brand">متاحة</Badge> : <Badge tone="neutral">غير متاحة</Badge>}</div>
                        <div><Badge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'مفعّلة' : 'موقوفة'}</Badge></div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Switch checked={s.active} onChange={() => toggleActive(s)} />
                          <span onClick={() => openEdit(s)} style={{ color: 'var(--brand-600)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>تعديل</span>
                        </div>
                      </div>
                    ))}
                  </div>
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
          <Input label="اسم الخدمة" placeholder="مثال: كشف عام" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="الفئة" placeholder="مثال: عام" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="المدة (دقيقة)" type="number" value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))} style={{ flex: 1 }} />
            <Input label="السعر (ر.س)" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={{ flex: 1 }} />
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

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="success" title={toast.title} description={toast.description} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
