import { useEffect, useState } from 'react'
import { Check, Phone } from 'lucide-react'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { createOpsTicket, useAiCall, type OpsCaps, type OpsTicket, type TeamMember } from '@/lib/queries/ops'
import type { AICallLog, TicketPriority } from '@/types/dashboard'
import { TICKET_TYPES } from './ticketModel'

interface Form {
  subject: string
  customer: string
  phone: string
  type: string
  priority: TicketPriority
  assignee: string
  description: string
}

const EMPTY: Form = { subject: '', customer: '', phone: '', type: 'متابعة', priority: 'normal', assignee: '', description: '' }

function formFromCall(call: AICallLog): Form {
  const reason = call.review_reason || ''
  const type = /complaint/.test(reason) ? 'شكوى' : /refund/.test(reason) ? 'استرجاع' : /call back/.test(reason) ? 'طلب اتصال' : 'متابعة'
  const summary = (call.summary || '').trim()
  const first = summary.split(/(?<=[.!?؟])\s/)[0] || ''
  return {
    subject: first.length > 90 ? `${first.slice(0, 89)}…` : first || 'متابعة مكالمة',
    customer: call.caller_name || call.patient_name || '',
    phone: call.phone && call.phone !== 'unknown' ? call.phone : '',
    type,
    priority: type === 'شكوى' || type === 'استرجاع' ? 'high' : 'normal',
    assignee: '',
    description: summary,
  }
}

export function NewTicketDialog({ open, onClose, onCreated, callId, companyId, isDemo, caps, team, authorName }: {
  open: boolean
  onClose: () => void
  onCreated: (t: OpsTicket) => void
  callId: string | null
  companyId: string | null
  isDemo: boolean
  caps: OpsCaps
  team: TeamMember[]
  authorName: string
}) {
  const pushToast = useToast()
  const { data: call } = useAiCall(open ? callId : null, isDemo)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setForm(EMPTY) }, [open, callId])
  useEffect(() => { if (open && call) setForm(formFromCall(call)) }, [open, call])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.subject.trim() || !form.customer.trim()) {
      pushToast({ kind: 'danger', title: 'اكتب الموضوع واسم العميل' })
      return
    }
    if (!companyId && !isDemo) return
    setSaving(true)
    try {
      const assignee = team.find((m) => m.id === form.assignee) || null
      const row = await createOpsTicket({
        company_id: companyId || 'demo-clinic-001', subject: form.subject.trim(), description: form.description.trim(),
        priority: form.priority, ticket_type: form.type, customer_name: form.customer.trim(), customer_phone: form.phone.trim(),
        assignee, ai_call_id: callId, author_name: authorName,
      }, caps, isDemo)
      pushToast({ kind: 'success', title: 'انفتحت التذكرة' })
      onCreated(row)
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر فتح التذكرة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open} title="تذكرة جديدة" onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={submit} disabled={saving}><Check size={15} /> {saving ? 'جارِ الفتح...' : 'افتح التذكرة'}</Button>
      </>}
    >
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>للطلبات اللي تحتاج متابعة من فريقك.</p>
      {callId && (
        <div className="ops-note" style={{ marginBottom: 14 }}>
          <Phone size={14} />
          <span>{call ? 'عبّينا التفاصيل من المكالمة. راجعها قبل الفتح.' : 'نجيب تفاصيل المكالمة...'}</span>
        </div>
      )}
      <div className="ops-stack">
        <div className="ops-field">
          <label htmlFor="nt-s">الموضوع</label>
          <input className="ops-input" id="nt-s" value={form.subject} onChange={(e) => set('subject', e.target.value)} autoFocus />
        </div>
        <div className="ops-form-grid">
          <div className="ops-field">
            <label htmlFor="nt-c">العميل</label>
            <input className="ops-input" id="nt-c" value={form.customer} onChange={(e) => set('customer', e.target.value)} />
          </div>
          <div className="ops-field">
            <label htmlFor="nt-ph">الجوال</label>
            <input className="ops-input" id="nt-ph" dir="ltr" style={{ textAlign: 'end' }} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="ops-field">
            <label htmlFor="nt-t">النوع</label>
            <select className="ops-input" id="nt-t" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TICKET_TYPES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="ops-field">
            <label htmlFor="nt-p">الأولوية</label>
            <select className="ops-input" id="nt-p" value={form.priority} onChange={(e) => set('priority', e.target.value as TicketPriority)}>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="low">منخفضة</option>
            </select>
          </div>
          {caps.ticketExtras && (
            <div className="ops-field">
              <label htmlFor="nt-w">المسؤول</label>
              <select className="ops-input" id="nt-w" value={form.assignee} onChange={(e) => set('assignee', e.target.value)}>
                <option value="">بدون مسؤول</option>
                {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="ops-field">
          <label htmlFor="nt-d">التفاصيل</label>
          <textarea className="ops-input" id="nt-d" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="وش يحتاج العميل؟" />
        </div>
      </div>
    </Dialog>
  )
}
