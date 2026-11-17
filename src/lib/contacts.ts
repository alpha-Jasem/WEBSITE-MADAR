import type { Customer } from '@/types/dashboard'
import type { ConvItem } from '@/dashboard/pages/conversations/model'
import { normalizePhone } from './callAnalysis'
import { convState, type ConvEvent, type ConvStatus } from './queries/inbox'

// One row per person, merged from saved customers and the agent's conversations. Segments, campaign
// audiences and Zaki all read this shape. Pure, so it is easy to test.

export interface Contact {
  /** Normalised phone (05…), or `id:<customer id>` / `conv:<key>` for people without one. */
  key: string
  name: string
  phone: string
  type: 'new' | 'returning'
  /** Conversations with the agent, or the saved visit count when larger. */
  visits: number
  firstAt: string | null
  lastAt: string | null
  channels: string[]
  /** Topic tag ids from the conversations. */
  tagIds: string[]
  tagLabels: string[]
  /** State of the latest conversation, or null when they never had one. */
  status: ConvStatus | null
  teamId: string | null
  assigneeId: string | null
  customerId?: string
  /** Key of their latest conversation in the inbox. */
  convKey?: string
}

/** Arabic names of the labels a saved customer can carry. */
export const CUSTOMER_TAG_LABELS: Record<string, string> = {
  new_patient: 'جديد', returning: 'عائد', vip: 'مميز', high_no_show: 'كثير الغياب',
  needs_followup: 'يحتاج متابعة', payment_pending: 'دفعة معلّقة', whatsapp_only: 'واتساب فقط',
}

const known = (v: string | null | undefined) => (v && v.trim() && v.toLowerCase() !== 'unknown' ? v.trim() : '')
const minIso = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b)
const maxIso = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b)

export function buildContactList(customers: Customer[], items: ConvItem[], events: Map<string, ConvEvent[]>): Contact[] {
  const byKey = new Map<string, Contact>()

  for (const c of customers) {
    const p = normalizePhone(c.phone)
    const key = p || `id:${c.id}`
    byKey.set(key, {
      key, name: known(c.name) || c.phone || 'بدون اسم', phone: c.phone || '', type: c.patient_type, visits: c.total_visits || 0,
      firstAt: c.created_at || null, lastAt: c.last_visit_at || null, channels: [], tagIds: (c.tags || []).map((t) => `c:${t}`), tagLabels: (c.tags || []).map((t) => CUSTOMER_TAG_LABELS[t] || t),
      status: null, teamId: null, assigneeId: null, customerId: c.id,
    })
  }

  // Conversations newest first, so the first one seen per person is their latest.
  const sorted = [...items].sort((a, b) => b.time.localeCompare(a.time))
  const convCount = new Map<string, number>()
  for (const i of sorted) {
    const p = normalizePhone(i.phone)
    const key = p || `conv:${i.key}`
    let c = byKey.get(key)
    if (!c) {
      c = { key, name: known(i.name) || i.phone || 'زائر بدون اسم', phone: i.phone, type: 'new', visits: 0, firstAt: null, lastAt: null,
        channels: [], tagIds: [], tagLabels: [], status: null, teamId: null, assigneeId: null }
      byKey.set(key, c)
    }
    if (!c.convKey) {
      // The inbox keeps one thread per WhatsApp number.
      c.convKey = i.channel === 'whatsapp' && p ? `chat:${p}` : i.key
      const st = convState(events.get(c.convKey), { lastCustomerAt: i.time })
      c.status = st.status; c.teamId = st.teamId; c.assigneeId = st.assigneeId
      if (!known(c.name) || c.name === c.phone) c.name = known(i.name) || c.name
    }
    const n = (convCount.get(key) || 0) + (i.group?.length || 1)
    convCount.set(key, n)
    c.firstAt = minIso(c.firstAt, i.group?.[0]?.time || i.time)
    c.lastAt = maxIso(c.lastAt, i.time)
    if (!c.channels.includes(i.channel)) c.channels.push(i.channel)
    for (const t of i.tags) if (!c.tagIds.includes(t.id)) { c.tagIds.push(t.id); c.tagLabels.push(t.label) }
  }
  for (const [key, n] of convCount) {
    const c = byKey.get(key)!
    c.visits = Math.max(c.visits, n)
    if (!c.customerId) c.type = n > 1 ? 'returning' : 'new'
  }
  return [...byKey.values()].sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
}
