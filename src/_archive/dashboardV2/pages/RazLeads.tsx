import { useMemo, useState } from 'react'
import { Search, Users, Phone, MessageCircle, Calendar, Check, RotateCcw, Inbox } from 'lucide-react'
import { useRazLeads, updateRazLeadStatus } from '@/lib/clinicOSQueries'
import { Card, Badge, Button, Input } from '@/_archive/dashboardV2/components/primitives'
import { useToast, EmptyState, KpiCardSkeleton } from '@/_archive/dashboardV2/components/uiExtras'
import { timeAgo } from './HomeWidgets'
import type { RazLead, LeadStatus } from '@/types/clinicOS'

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  closed: 'مغلق',
}
const STATUS_TONE: Record<LeadStatus, 'danger' | 'warning' | 'success'> = {
  new: 'danger',
  contacted: 'warning',
  closed: 'success',
}

function LeadRow({ lead, onAdvance, onReset }: {
  lead: RazLead
  onAdvance: (next: LeadStatus) => void
  onReset: () => void
}) {
  const appointment = [lead.appointment_day, lead.appointment_time].filter(Boolean).join(' — ')

  return (
    <Card style={{ padding: 'var(--space-4)', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 200, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{lead.customer_name || 'عميل بدون اسم'}</span>
            <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
            <Badge tone="neutral">{lead.request_type}</Badge>
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
            {lead.customer_phone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} /> {lead.customer_phone}
              </span>
            )}
            {lead.project_of_interest && <span>المشروع: {lead.project_of_interest}</span>}
            {lead.purpose && <span>{lead.purpose}</span>}
            {lead.property_type && <span>{lead.property_type}</span>}
          </div>

          {appointment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--brand-600)', marginTop: 6 }}>
              <Calendar size={12} /> {appointment}
              {lead.contact_channel && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  <MessageCircle size={11} /> {lead.contact_channel}
                </span>
              )}
            </div>
          )}

          {lead.notes && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.6 }}>{lead.notes}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{timeAgo(lead.created_at)}</span>
          {lead.status === 'new' && (
            <Button variant="primary" onClick={() => onAdvance('contacted')}>
              <Check size={14} /> تم التواصل
            </Button>
          )}
          {lead.status === 'contacted' && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="secondary" onClick={() => onAdvance('closed')}>إغلاق</Button>
              <Button variant="secondary" onClick={onReset}><RotateCcw size={13} /></Button>
            </div>
          )}
          {lead.status === 'closed' && (
            <Button variant="secondary" onClick={onReset}><RotateCcw size={13} /> إعادة فتح</Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function DashboardV2RazLeads() {
  const { data: leads, loading, refetch } = useRazLeads()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [optimistic, setOptimistic] = useState<Record<string, LeadStatus>>({})
  const pushToast = useToast()

  const all = useMemo(() => (leads || []).map((l) => (
    optimistic[l.id] ? { ...l, status: optimistic[l.id] } : l
  )), [leads, optimistic])

  const counts: Record<LeadStatus | 'all', number> = {
    all: all.length,
    new: all.filter((l) => l.status === 'new').length,
    contacted: all.filter((l) => l.status === 'contacted').length,
    closed: all.filter((l) => l.status === 'closed').length,
  }

  const filtered = useMemo(() => all.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [l.customer_name, l.customer_phone, l.project_of_interest, l.notes]
      .some((f) => f?.toLowerCase().includes(q))
  }), [all, statusFilter, search])

  async function setStatus(lead: RazLead, next: LeadStatus) {
    setOptimistic((s) => ({ ...s, [lead.id]: next }))
    try {
      await updateRazLeadStatus(lead.id, next)
      refetch()
    } catch (e) {
      setOptimistic((s) => { const { [lead.id]: _drop, ...rest } = s; return rest })
      pushToast({ kind: 'danger', title: 'تعذّر تحديث حالة العميل', description: e instanceof Error ? e.message : undefined })
    }
  }

  if (loading) return <KpiCardSkeleton />

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} style={{ color: 'var(--brand-500)' }} /> طلبات العملاء
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            كل طلب سجّله الموظف الذكي — تابعه حتى يتم التواصل مع العميل
          </div>
        </div>
        {counts.new > 0 && (
          <Badge tone="danger">{counts.new} طلب ينتظر التواصل</Badge>
        )}
      </div>

      <Card delay={0} style={{ marginBottom: 18, padding: 'var(--space-4)' }}>
        <Input
          icon={<Search size={14} />} placeholder="ابحث بالاسم، الجوال، أو المشروع..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([['all', 'الكل'], ['new', 'جديد'], ['contacted', 'تم التواصل'], ['closed', 'مغلق']] as const).map(([key, label]) => (
            <span
              key={key}
              onClick={() => setStatusFilter(key)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: statusFilter === key ? 'var(--surface-sunken)' : 'transparent',
                color: statusFilter === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >{label} ({counts[key]})</span>
          ))}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={20} />}
          title={all.length === 0 ? 'ما فيه طلبات بعد' : 'ما فيه نتائج للبحث'}
          description={all.length === 0
            ? 'كل طلب يسجّله الموظف الذكي عبر المكالمات أو واتساب راح يظهر هنا مباشرة.'
            : 'جرّب تعديل البحث أو الفلتر.'}
        />
      ) : (
        filtered.map((lead) => (
          <LeadRow
            key={lead.id}
            lead={lead}
            onAdvance={(next) => setStatus(lead, next)}
            onReset={() => setStatus(lead, 'new')}
          />
        ))
      )}
    </div>
  )
}
