import type { AICallLog, AICallVerdict } from '@/types/dashboard'
import { aiCallIntentLabel } from './aiCallLabels'

// Safe readers for clinic_os_ai_calls.analysis. The column is null for most Nabrah rows and
// only holds { data } for the rest, so every reader here returns a neutral value when a
// piece is missing instead of assuming the full agent-platform shape.

export type Verdict = AICallVerdict | 'none'
export type SentimentKind = 'positive' | 'neutral' | 'negative'

export const VERDICT_LABEL: Record<Verdict, string> = {
  success: 'ناجحة', failure: 'غير ناجحة', unknown: 'غير محسومة', none: 'بدون تقييم',
}
export const SENTIMENT_LABEL: Record<SentimentKind, string> = { positive: 'إيجابي', neutral: 'محايد', negative: 'سلبي' }

/** Arabic names for the collected fields we know about; anything else is shown humanised. */
export const DATA_FIELD_LABEL: Record<string, string> = {
  customer_name: 'الاسم',
  contact_number: 'رقم التواصل',
  phone: 'رقم التواصل',
  interest: 'الاهتمام',
  budget: 'الميزانية',
  budget_type: 'نوع الميزانية',
  payment_method: 'طريقة الدفع',
  preferred_unit: 'الوحدة المفضلة',
  visit_preference: 'موعد الزيارة',
  follow_up_needed: 'يحتاج متابعة',
  requested_next_step: 'الخطوة التالية',
  unit_type: 'نوع الوحدة',
  city: 'المدينة',
  email: 'البريد الإلكتروني',
  service: 'الخدمة المطلوبة',
  preferred_time: 'الوقت المفضل',
}

export const TERMINATION_LABEL: Record<string, string> = {
  'end_call tool was called.': 'أنهى الوكيل المحادثة',
  'Client disconnected': 'قطع العميل الاتصال',
  'Remote party ended call': 'أنهى العميل المكالمة',
}

export function humanizeKey(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function fieldLabel(key: string): string {
  return DATA_FIELD_LABEL[key] || humanizeKey(key)
}

export function callVerdict(c: AICallLog): Verdict {
  const v = c.analysis?.call_successful
  return v === 'success' || v === 'failure' || v === 'unknown' ? v : 'none'
}

export function callTitle(c: AICallLog): string {
  const t = c.analysis?.title?.trim()
  if (t) return t
  if (c.summary) {
    const words = c.summary.trim().split(/\s+/)
    return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : words.join(' ')
  }
  return aiCallIntentLabel(c.intent) || 'محادثة بدون عنوان'
}

/** Topic for grouping: the platform title, else the intent, else "أخرى". */
export function callTopic(c: AICallLog): string {
  return c.analysis?.title?.trim() || aiCallIntentLabel(c.intent) || 'أخرى'
}

export function sentimentKind(c: AICallLog): SentimentKind | null {
  const s = c.analysis?.sentiment
  if (!s) return null
  const label = (s.label || '').toLowerCase()
  if (label.includes('neg') || label.includes('frustrat') || label.includes('angry')) return 'negative'
  if (label.includes('pos') || label.includes('happy') || label.includes('satisf')) return 'positive'
  if (label) return 'neutral'
  if (typeof s.score === 'number') return s.score > 0.2 ? 'positive' : s.score < -0.2 ? 'negative' : 'neutral'
  return null
}

export function sentimentScore(c: AICallLog): number | null {
  const v = c.analysis?.sentiment?.score
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function sentimentTone(k: SentimentKind | null): 'ok' | 'warn' | 'bad' | 'dim' {
  return k === 'positive' ? 'ok' : k === 'negative' ? 'bad' : k === 'neutral' ? 'warn' : 'dim'
}

export function verdictTone(v: Verdict): 'ok' | 'bad' | 'warn' | 'dim' {
  return v === 'success' ? 'ok' : v === 'failure' ? 'bad' : v === 'unknown' ? 'warn' : 'dim'
}

export function callCost(c: AICallLog): number | null {
  const v = c.analysis?.cost_credits
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function messageCount(c: AICallLog): number {
  return c.transcript?.length || 0
}

/** Very short or one-sided conversations: under 20 seconds, or the customer said at most one thing. */
export function isShortConversation(c: AICallLog): boolean {
  if (c.duration_seconds > 0 && c.duration_seconds < 20) return true
  if (!c.transcript || c.transcript.length === 0) return false
  return c.transcript.filter((l) => l.speaker === 'patient').length <= 1 && c.transcript.length <= 2
}

const EMPTY_STRINGS = new Set(['', 'null', 'none', 'n/a', 'na', 'unknown', 'undefined', '-', '—', 'غير متوفر', 'غير معروف'])

export function isFilled(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'string') return !EMPTY_STRINGS.has(v.trim().toLowerCase())
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'boolean') return true
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as object).length > 0
  return false
}

export function formatValue(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(formatValue).filter(Boolean).join('، ')
  try { return JSON.stringify(v) } catch { return '' }
}

export interface CollectedField { key: string; label: string; value: unknown; rationale: string; filled: boolean }

export function collectedData(c: AICallLog): CollectedField[] {
  const data = c.analysis?.data
  if (!data || typeof data !== 'object') return []
  return Object.entries(data).map(([key, raw]) => {
    const isEntry = raw != null && typeof raw === 'object' && !Array.isArray(raw) && ('value' in raw || 'rationale' in raw)
    const value = isEntry ? (raw as { value?: unknown }).value : raw
    const rationale = isEntry ? String((raw as { rationale?: unknown }).rationale ?? '') : ''
    return { key, label: fieldLabel(key), value, rationale, filled: isFilled(value) }
  })
}

export function collectedValue(c: AICallLog, ...keys: string[]): string {
  const fields = collectedData(c)
  for (const k of keys) {
    const f = fields.find((x) => x.key === k && x.filled)
    if (f) return formatValue(f.value)
  }
  return ''
}

export interface EvalCriterion { key: string; label: string; result: Verdict; rationale: string }

export function evaluationCriteria(c: AICallLog): EvalCriterion[] {
  const ev = c.analysis?.evaluation
  if (!ev || typeof ev !== 'object') return []
  return Object.entries(ev).map(([key, v]) => {
    const r = (v?.result || '').toLowerCase()
    const result: Verdict = r === 'success' ? 'success' : r === 'failure' ? 'failure' : r ? 'unknown' : 'none'
    return { key, label: humanizeKey(key), result, rationale: v?.rationale || '' }
  })
}

export function callWarnings(c: AICallLog): string[] {
  const w = c.analysis?.warnings
  return Array.isArray(w) ? w.filter((x) => typeof x === 'string' && x.trim()) : []
}

export function terminationLabel(c: AICallLog): string {
  const t = c.analysis?.termination_reason?.trim()
  if (!t) return ''
  return TERMINATION_LABEL[t] || t
}

/** Digits only, with a leading Saudi 966 folded to 0, so the same person matches across channels. */
export function normalizePhone(p: string | null | undefined): string {
  const d = (p || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('966')) return `0${d.slice(3)}`
  return d
}

/** Who a conversation belongs to: the platform user id, else the phone, else the name. */
export function contactKey(c: AICallLog): string {
  const uid = c.analysis?.user_id?.trim()
  if (uid) return `u:${uid}`
  const p = normalizePhone(c.phone)
  if (p) return `p:${p}`
  const n = (c.patient_name || c.caller_name || '').trim()
  return n ? `n:${n}` : `c:${c.id}`
}

export function contactName(c: AICallLog): string {
  return c.patient_name || c.caller_name || collectedValue(c, 'customer_name', 'name') || ''
}
