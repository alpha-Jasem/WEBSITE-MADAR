import { useMemo, useState } from 'react'
import { Plus, Search, Ticket as TicketIcon, Inbox, ArrowLeft, LayoutGrid, Rows3 } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicSupportTickets, createSupportTicket, updateTicketStatus, resolveTicket } from '@/lib/clinicOSQueries'
import { Card, Badge, Button, Dialog, Input, Select } from '@/_archive/dashboardV2/components/primitives'
import { useToast, EmptyState, KpiCardSkeleton } from '@/_archive/dashboardV2/components/uiExtras'
import { timeAgo } from './HomeWidgets'
import type { SupportTicket, TicketPriority, TicketStatus } from '@/types/clinicOS'

const COLUMNS: { key: TicketStatus; label: string; color: string }[] = [
  { key: 'open', label: 'مفتوحة', color: 'var(--brand-500)' },
  { key: 'in_progress', label: 'قيد المعالجة', color: 'var(--warning-500)' },
  { key: 'resolved', label: 'محلولة', color: 'var(--success-500)' },
]

const PRIORITY_TONE: Record<TicketPriority, 'danger' | 'warning' | 'neutral'> = { high: 'danger', normal: 'warning', low: 'neutral' }
const PRIORITY_LABEL: Record<TicketPriority, string> = { high: 'عالية', normal: 'عادية', low: 'منخفضة' }

function TicketCard({ ticket, onAdvance }: { ticket: SupportTicket; onAdvance?: () => void }) {
  return (
    <Card style={{ padding: 'var(--space-4)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.subject}</div>
        <Badge tone={PRIORITY_TONE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Badge>
      </div>
      {ticket.description && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {ticket.description}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(ticket.created_at)}</span>
        {onAdvance && (
          <span onClick={onAdvance} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-600)', fontWeight: 700, cursor: 'pointer' }}>
            {ticket.status === 'open' ? 'بدء المعالجة' : 'تحديد كمحلولة'} <ArrowLeft size={12} />
          </span>
        )}
      </div>
    </Card>
  )
}

export function DashboardV2Tickets() {
  const { companyId, isDemo } = useClinicOS()
  const { data: tickets, loading, refetch } = useClinicSupportTickets(companyId, isDemo)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [view, setView] = useState<'kanban' | 'cards'>('kanban')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', priority: 'normal' as TicketPriority })
  const [saving, setSaving] = useState(false)
  const pushToast = useToast()

  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, TicketStatus>>({})
  const all = useMemo(() => (tickets || []).map((t) => (
    optimisticStatus[t.id] ? { ...t, status: optimisticStatus[t.id] } : t
  )), [tickets, optimisticStatus])
  const filtered = useMemo(() => all.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (search.trim() && !t.subject.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  }), [all, priorityFilter, statusFilter, search])

  const priorityCounts: Record<TicketPriority | 'all', number> = {
    all: all.length,
    low: all.filter((t) => t.priority === 'low').length,
    normal: all.filter((t) => t.priority === 'normal').length,
    high: all.filter((t) => t.priority === 'high').length,
  }
  const statusCounts: Record<TicketStatus | 'all', number> = {
    all: all.length,
    open: all.filter((t) => t.status === 'open').length,
    in_progress: all.filter((t) => t.status === 'in_progress').length,
    resolved: all.filter((t) => t.status === 'resolved').length,
  }

  async function handleAdvance(t: SupportTicket) {
    if (isDemo) { pushToast({ kind: 'info', title: 'غير متاح بوضع العرض التجريبي' }); return }
    const next: TicketStatus = t.status === 'open' ? 'in_progress' : 'resolved'
    setOptimisticStatus((s) => ({ ...s, [t.id]: next })) // reflect the move instantly, roll back below if it fails
    try {
      if (t.status === 'open') await updateTicketStatus(t.id, 'in_progress')
      else if (t.status === 'in_progress') await resolveTicket(t.id)
      refetch()
    } catch (e) {
      setOptimisticStatus((s) => { const { [t.id]: _drop, ...rest } = s; return rest })
      pushToast({ kind: 'danger', title: 'تعذّر تحديث التذكرة', description: e instanceof Error ? e.message : undefined })
    }
  }

  async function handleCreate() {
    if (!form.subject.trim() || !companyId) return
    if (isDemo) { pushToast({ kind: 'info', title: 'غير متاح بوضع العرض التجريبي' }); setDialogOpen(false); return }
    setSaving(true)
    try {
      await createSupportTicket({ company_id: companyId, subject: form.subject, description: form.description, priority: form.priority, route: 'tickets-page' })
      pushToast({ kind: 'success', title: 'تم إنشاء التذكرة' })
      setDialogOpen(false)
      setForm({ subject: '', description: '', priority: 'normal' })
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر إنشاء التذكرة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <KpiCardSkeleton />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TicketIcon size={20} style={{ color: 'var(--brand-500)' }} /> التذاكر
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>إدارة تذاكر الدعم عبر كل القنوات</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 600, padding: '6px 10px' }}>{all.length} تذكرة</span>
          <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <span
              onClick={() => setView('kanban')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                background: view === 'kanban' ? 'var(--surface-sunken)' : 'transparent', color: view === 'kanban' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            ><LayoutGrid size={13} /> لوحة</span>
            <span
              onClick={() => setView('cards')}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                borderInlineStart: '1px solid var(--border-default)',
                background: view === 'cards' ? 'var(--surface-sunken)' : 'transparent', color: view === 'cards' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            ><Rows3 size={13} /> قائمة</span>
          </div>
          <Button variant="primary" onClick={() => setDialogOpen(true)}><Plus size={15} /> تذكرة جديدة</Button>
        </div>
      </div>

      <Card delay={0} style={{ marginBottom: 18, padding: 'var(--space-4)' }}>
        <Input
          icon={<Search size={14} />} placeholder="ابحث بعنوان التذكرة..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '.04em', marginBottom: 6 }}>الحالة</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([['all', 'الكل'], ['open', 'مفتوحة'], ['in_progress', 'قيد المعالجة'], ['resolved', 'محلولة']] as const).map(([key, label]) => (
                <span
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: statusFilter === key ? 'var(--surface-sunken)' : 'transparent',
                    color: statusFilter === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >{label} ({statusCounts[key]})</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '.04em', marginBottom: 6 }}>الأولوية</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([['all', 'الكل'], ['low', 'منخفضة'], ['normal', 'عادية'], ['high', 'عالية']] as const).map(([key, label]) => (
                <span
                  key={key}
                  onClick={() => setPriorityFilter(key)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: priorityFilter === key ? 'var(--surface-sunken)' : 'transparent',
                    color: priorityFilter === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    border: '1px solid var(--border-default)',
                  }}
                >{label} ({priorityCounts[key]})</span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {view === 'kanban' ? (
        <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {COLUMNS.map((col, ci) => {
            const items = filtered.filter((t) => t.status === col.key)
            return (
              <Card key={col.key} delay={0.08 + ci * 0.06} style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <EmptyState icon={<Inbox size={18} />} title="لا توجد تذاكر" description="عدّل الفلاتر أو أنشئ تذكرة جديدة." />
                ) : (
                  items.map((t) => <TicketCard key={t.id} ticket={t} onAdvance={col.key !== 'resolved' ? () => handleAdvance(t) : undefined} />)
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card delay={0.08} style={{ padding: 'var(--space-4)' }}>
          {filtered.length === 0 ? (
            <EmptyState icon={<Inbox size={18} />} title="لا توجد تذاكر" description="عدّل الفلاتر أو أنشئ تذكرة جديدة." />
          ) : (
            filtered.map((t) => {
              const col = COLUMNS.find((c) => c.key === t.status)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--border-default)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: col?.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{col?.label} · {timeAgo(t.created_at)}</div>
                  </div>
                  <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                  {t.status !== 'resolved' && (
                    <span onClick={() => handleAdvance(t)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand-600)', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {t.status === 'open' ? 'بدء المعالجة' : 'تحديد كمحلولة'} <ArrowLeft size={12} />
                    </span>
                  )}
                </div>
              )
            })
          )}
        </Card>
      )}

      <Dialog
        open={dialogOpen} title="تذكرة جديدة" onClose={() => setDialogOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreate} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'إنشاء التذكرة'}</Button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="العنوان" placeholder="مثال: مشكلة بربط واتساب" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
          <Input label="التفاصيل" placeholder="اشرح المشكلة أو الطلب" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Select
            label="الأولوية" value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
            options={[{ value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' }, { value: 'high', label: 'عالية' }]}
          />
        </div>
      </Dialog>
    </div>
  )
}
