import type { AICallLog } from '@/types/dashboard'
import { collectedData } from './callAnalysis'

/** One automatic tag: what the conversation was about, read from its summary and collected data. */
export interface CallTag { id: string; label: string }

/** A company's override of the automatic tags (conversation_tag_rules): rename or turn off a built-in tag, or a custom tag matched by keywords. */
export interface TagRule { tag_key: string; label: string; keywords?: string | null; enabled: boolean }

export const CUSTOM_TAG_PREFIX = 'custom_'

/** The built-in tags, for the settings screen (filled right after RULES). */
export const BUILT_IN_TAGS: CallTag[] = []

interface Rule { id: string; label: string; re: RegExp }

// Order is display order. Matching is on Arabic and English wording, so Nabrah and ElevenLabs rows both work.
const RULES: Rule[] = [
  { id: 'complaint', label: 'شكوى', re: /شكوى|شكوي|اشتكى|يشتكي|غير راض|سيئ|تأخر|complain/i },
  { id: 'refund', label: 'استرجاع', re: /استرجاع|استرداد|إرجاع|ارجاع|refund|return request/i },
  { id: 'sales', label: 'مبيعات', re: /شراء|اشتري|أشتري|يشتري|حجز وحدة|وحدة|شقة|شقق|فيلا|ميزانية|تمويل|دفعة|تقسيط|استثمار|عرض سعر|مهتم|اهتمام|للبيع|buy|purchase|unit|apartment|budget|investment|interested|lead/i },
  { id: 'investment', label: 'استثمار', re: /استثمار|عائد|عوائد|investment|roi/i },
  { id: 'pricing', label: 'أسعار', re: /سعر|أسعار|اسعار|تكلفة|كم يكلف|price|pricing|cost/i },
  { id: 'visit', label: 'زيارة / معاينة', re: /زيارة|معاينة|أزور|ازور|يزور|موقع المشروع|visit|viewing|tour/i },
  { id: 'booking', label: 'حجز موعد', re: /حجز موعد|موعد|حجز|booking|appointment|reservation/i },
  { id: 'followup', label: 'متابعة', re: /متابعة|يتصل|اتصال لاحق|معاودة|follow.?up|call.?back|callback/i },
  { id: 'support', label: 'دعم', re: /مشكلة|عطل|ما يشتغل|لا يعمل|دعم|support|issue|problem|error/i },
  { id: 'transfer', label: 'تحويل لموظف', re: /تحويل لموظف|موظف مبيعات|التواصل مع الموظف|transfer|human agent|escalat/i },
]

export const MAX_TAGS = 3

BUILT_IN_TAGS.push(...RULES.map(({ id, label }) => ({ id, label })), { id: 'inquiry', label: 'استفسار عام' })

/** Keywords typed in settings: separated by commas, Arabic commas or new lines. */
export function parseKeywords(raw?: string | null): string[] {
  return String(raw || '').split(/[,،\n]+/).map((k) => k.trim().toLowerCase()).filter(Boolean)
}

/** Collected fields that, when filled, say something on their own (e.g. a budget means a sales lead). */
const FIELD_TAGS: Record<string, string> = {
  budget: 'sales', budget_type: 'sales', preferred_unit: 'sales', payment_method: 'sales', visit_preference: 'visit',
}

function textOf(c: AICallLog): string {
  const fields = collectedData(c).filter((f) => f.filled).map((f) => (typeof f.value === 'string' ? f.value : ""))
  return [c.summary, c.analysis?.title, c.review_reason, c.service_requested, ...fields].filter(Boolean).join(' ')
}

/**
 * Automatic tags for a conversation, most specific first (at most three). Computed in the
 * dashboard from the summary, the platform title and the data the agent collected, so it
 * works on every row already saved. A conversation that matches nothing gets "استفسار عام".
 */
export function callTags(c: AICallLog, rules: TagRule[] = []): CallTag[] {
  const text = textOf(c)
  const lower = text.toLowerCase()
  const byKey = new Map(rules.map((r) => [r.tag_key, r]))
  const hit = new Set<string>()
  for (const r of RULES) if (r.re.test(text)) hit.add(r.id)
  for (const f of collectedData(c)) {
    if (!f.filled) continue
    if (FIELD_TAGS[f.key]) hit.add(FIELD_TAGS[f.key])
    // A stated purpose (living there or investing) is a buyer lead even when no price came up.
    if (f.key === 'interest' && /سكن|استثمار/.test(String(f.value))) hit.add('sales')
  }
  if (c.result === 'booked' || c.intent === 'new_booking') hit.add('booking')
  if (c.result === 'referred') hit.add('transfer')
  if (c.intent === 'follow_up') hit.add('followup')
  // A visit request is already a booking of a kind: keep the more specific tag.
  if (hit.has('visit')) hit.delete('booking')
  // Pricing questions are part of sales interest.
  if (hit.has('sales')) hit.delete('pricing')
  // The company's own tags come first, then the built-in ones it has not turned off (renamed ones use its label).
  const custom: CallTag[] = rules
    .filter((r) => r.tag_key.startsWith(CUSTOM_TAG_PREFIX) && r.enabled && parseKeywords(r.keywords).some((k) => lower.includes(k)))
    .map((r) => ({ id: r.tag_key, label: r.label }))
  const builtIn: CallTag[] = RULES.filter((r) => hit.has(r.id) && byKey.get(r.id)?.enabled !== false)
    .map((r) => ({ id: r.id, label: byKey.get(r.id)?.label || r.label }))
  const tags = [...custom, ...builtIn].slice(0, MAX_TAGS)
  if (tags.length) return tags
  const general = byKey.get('inquiry')
  return general?.enabled === false ? [] : [{ id: 'inquiry', label: general?.label || 'استفسار عام' }]
}

/** Every tag present in a list of calls, with counts, for the filter. */
export function tagCounts(calls: AICallLog[], rules: TagRule[] = []): Array<CallTag & { count: number }> {
  const map = new Map<string, CallTag & { count: number }>()
  for (const c of calls) for (const t of callTags(c, rules)) {
    const e = map.get(t.id)
    if (e) e.count += 1; else map.set(t.id, { ...t, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
