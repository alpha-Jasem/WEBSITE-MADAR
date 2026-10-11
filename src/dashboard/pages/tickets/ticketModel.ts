import type { OpsTicket } from '@/lib/queries/ops'
import type { TicketPriority, TicketStatus } from '@/types/dashboard'

export const STATUS: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'مفتوحة', color: 'var(--sky)' },
  in_progress: { label: 'قيد المعالجة', color: 'var(--warn)' },
  resolved: { label: 'محلولة', color: 'var(--ok)' },
}

export const PRIORITY: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  high: { label: 'عالية', color: 'var(--bad)', bg: 'var(--bad-bg)' },
  normal: { label: 'عادية', color: 'var(--info)', bg: 'var(--info-bg)' },
  low: { label: 'منخفضة', color: 'var(--dim)', bg: 'var(--hover-bg)' },
}

export const TICKET_TYPES = ['شكوى', 'استرجاع', 'متابعة', 'طلب اتصال', 'استفسار تأمين', 'طلب خاص']

/** Response window when a ticket has no explicit due time. */
const SLA_HOURS: Record<TicketPriority, number> = { high: 4, normal: 24, low: 72 }

export function isAiOpened(t: OpsTicket) {
  return t.route === 'ai-receptionist' || !!t.ai_call_id
}

/** Value of a "key: value" line in the description (how the call mapper writes details). */
function descField(t: OpsTicket, key: string): string | null {
  const m = (t.description || '').match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))
  return m ? m[1].trim() : null
}

export function customerOf(t: OpsTicket): string {
  return t.customer_name || descField(t, 'المتصل') || descField(t, 'العميل') || descField(t, 'الهاتف') || 'عميل غير معروف'
}

export function phoneOf(t: OpsTicket): string | null {
  return t.customer_phone || descField(t, 'الهاتف')
}

export function typeOf(t: OpsTicket): string {
  if (t.ticket_type) return t.ticket_type
  const reason = descField(t, 'السبب') || descField(t, 'النوع')
  if (reason) return reason.split('،')[0].trim()
  if (t.route?.startsWith('google_review')) return 'تقييم سلبي'
  return 'متابعة'
}

export function dueOf(t: OpsTicket): Date {
  if (t.due_at) return new Date(t.due_at)
  return new Date(new Date(t.created_at).getTime() + SLA_HOURS[t.priority] * 3_600_000)
}

export function isLate(t: OpsTicket, now = Date.now()) {
  return t.status !== 'resolved' && dueOf(t).getTime() < now
}

function span(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000))
  if (mins < 60) return `${mins} د`
  const hours = Math.round(mins / 60)
  if (hours < 24) return hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${hours} س`
  const days = Math.round(hours / 24)
  return days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} أيام`
}

export function dueLabel(t: OpsTicket, now = Date.now()): string {
  if (t.status === 'resolved') return 'انحلت'
  const diff = dueOf(t).getTime() - now
  return diff < 0 ? `متأخرة ${span(-diff)}` : `خلال ${span(diff)}`
}

export function shortId(t: OpsTicket) {
  return `#${t.id.replace(/^demo-tk-/, '').replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

export function relTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (diff < 60_000) return 'الحين'
  return `قبل ${span(diff)}`
}
