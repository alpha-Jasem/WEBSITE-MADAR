import type { AICallLog, AICallChannel, MessageLog, MessageStatus } from '@/types/dashboard'
import { aiCallIntentLabel, aiCallResultLabel } from '@/lib/aiCallLabels'
import { callTags, type CallTag, type TagRule } from '@/lib/callTags'
import { callTitle, callTopic, callVerdict, collectedValue, normalizePhone, type Verdict } from '@/lib/callAnalysis'
import { timeAgo } from '../HomeWidgets'

// One row in the unified conversation list: an AI call (phone, web or WhatsApp chat
// handled by the agent) or the WhatsApp messages sent to one number, grouped.

export type ConvChannel = AICallChannel
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'ai' | 'dim'

export interface ConvItem {
  key: string
  kind: 'call' | 'thread'
  channel: ConvChannel
  name: string
  phone: string
  time: string
  summary: string
  /** Short heading: the platform's title, or the first words of the summary. */
  title: string
  verdict: Verdict
  /** Transcript lines for a call, messages for a thread. */
  messageCount: number
  /** Lower-cased text the search box matches against. */
  haystack: string
  needsAction: boolean
  /** Automatic topic tags (مبيعات، زيارة…). Empty for WhatsApp threads. */
  tags: CallTag[]
  call?: AICallLog
  /** Thread messages, oldest first. */
  messages?: MessageLog[]
}

export const CHANNEL_LABEL: Record<ConvChannel, string> = { phone: 'هاتف', whatsapp: 'واتساب', web: 'الموقع' }

export const MSG_STATUS_LABEL: Record<MessageStatus, string> = {
  pending: 'قيد الإرسال', sent: 'أُرسلت', delivered: 'وصلت', read: 'انقرأت', failed: 'ما وصلت',
}
const MSG_STATUS_TONE: Record<MessageStatus, Tone> = { pending: 'dim', sent: 'info', delivered: 'ok', read: 'ok', failed: 'bad' }

export const MSG_TYPE_LABEL: Record<string, string> = {
  confirmation: 'تأكيد موعد', reminder_24h: 'تذكير قبل يوم', reminder_3h: 'تذكير قبل 3 ساعات', reschedule: 'إعادة جدولة',
  cancellation: 'إلغاء', follow_up: 'متابعة', review_request: 'طلب تقييم', waitlist_offer: 'عرض قائمة انتظار', manual: 'يدوي',
}

export function callChannel(c: AICallLog): ConvChannel {
  return c.channel || 'phone'
}

export function callNeedsAction(c: AICallLog): boolean {
  return c.needs_review || c.status === 'needs_review' || c.status === 'failed'
}

export function callDisplayName(c: AICallLog): string {
  return c.patient_name || c.caller_name || collectedValue(c, 'customer_name') || c.phone || (c.channel === 'web' ? 'زائر الموقع' : 'متصل غير معروف')
}

/** Status chip for a call: what happened, coloured by whether it needs someone. */
export function callChip(c: AICallLog): [string, Tone] {
  if (c.needs_review || c.status === 'needs_review') return ['يحتاج مراجعة', 'warn']
  if (c.status === 'failed') return [c.result && c.result !== 'failed' ? aiCallResultLabel(c.result) : 'ما اكتملت', 'bad']
  if (c.result === 'booked' || c.result === 'rescheduled') return [aiCallResultLabel(c.result), 'ok']
  if (c.result === 'referred') return [aiCallResultLabel(c.result), 'warn']
  if (c.result && c.result !== 'no_action') return [aiCallResultLabel(c.result), 'info']
  if (c.intent) return [aiCallIntentLabel(c.intent), 'info']
  return ['مكتملة', 'ok']
}

export function threadChip(t: ConvItem): [string, Tone] {
  const last = t.messages?.[t.messages.length - 1]
  if (!last) return ['—', 'dim']
  return [MSG_STATUS_LABEL[last.status] || last.status, MSG_STATUS_TONE[last.status] || 'dim']
}

export function itemChip(item: ConvItem): [string, Tone] {
  return item.call ? callChip(item.call) : threadChip(item)
}

export function buildConversations(calls: AICallLog[], messages: MessageLog[], opts: { includePhone: boolean; includeMessages: boolean; tagRules?: TagRule[] }): ConvItem[] {
  const rules = opts.tagRules || []
  const items: ConvItem[] = []
  for (const c of calls) {
    const ch = callChannel(c)
    if (ch === 'phone' && !opts.includePhone) continue
    const name = callDisplayName(c)
    const summary = c.summary || c.review_reason || aiCallIntentLabel(c.intent) || ''
    const title = callTitle(c)
    items.push({
      key: `call:${c.id}`, kind: 'call', channel: ch, name, phone: c.phone || '', time: c.call_time,
      summary, title, verdict: callVerdict(c), messageCount: c.transcript?.length || 0,
      haystack: `${callTags(c, rules).map((t) => t.label).join(' ')} ${name} ${c.phone || ''} ${normalizePhone(c.phone)} ${summary} ${title} ${callTopic(c)} ${c.analysis?.user_id || ''}`.toLowerCase(),
      needsAction: callNeedsAction(c), tags: callTags(c, rules), call: c,
    })
  }
  if (opts.includeMessages) {
    const byPhone = new Map<string, MessageLog[]>()
    for (const m of messages) {
      const k = m.recipient_phone || m.recipient_name || m.id
      const list = byPhone.get(k)
      if (list) list.push(m); else byPhone.set(k, [m])
    }
    for (const [phone, list] of byPhone) {
      const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at))
      const last = sorted[sorted.length - 1]
      const name = last.recipient_name || phone
      const summary = `${MSG_TYPE_LABEL[last.message_type] || 'رسالة'}: ${last.body}`
      items.push({
        key: `wa:${phone}`, kind: 'thread', channel: 'whatsapp', name, phone: last.recipient_phone || '',
        time: last.created_at, summary, title: MSG_TYPE_LABEL[last.message_type] || 'رسائل واتساب', verdict: 'none', messageCount: sorted.length,
        haystack: `${name} ${last.recipient_phone || ''} ${normalizePhone(last.recipient_phone)} ${summary}`.toLowerCase(),
        needsAction: false, tags: [], messages: sorted,
      })
    }
  }
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}

// ─── formatting ─────────────────────────────────────────────────────────────

const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

export function fmtWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  if (diff >= 0 && diff < 12 * 3600000) return timeAgo(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `اليوم ${time}`
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return `أمس ${time}`
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
}

export function fmtFull(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
}

/** Day separator label: اليوم / أمس / a date. */
export function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'اليوم'
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'أمس'
  return d.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function fmtDuration(sec: number | null | undefined): string {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function hourLabel(h: number): string {
  if (h === 0) return '12 ص'
  if (h < 12) return `${h} ص`
  if (h === 12) return '12 م'
  return `${h - 12} م`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
