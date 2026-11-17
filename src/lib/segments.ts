import type { Contact } from './contacts'

// Customer segments: a set of conditions over contacts, grouped. The root joins its groups with
// "all" (and) or "any" (or); each group joins its own conditions the same way and can be negated.
// Pure, so it is easy to test; the page and the campaign audience both use it.

export type FieldId = 'name' | 'phone' | 'type' | 'visits' | 'last_contact' | 'first_contact' | 'channel' | 'tag' | 'status' | 'team' | 'assigned'
export type Op =
  | 'contains' | 'not_contains' | 'starts_with' | 'empty' | 'not_empty'
  | 'is' | 'is_not' | 'gt' | 'lt' | 'eq' | 'within' | 'before' | 'never' | 'has' | 'not_has'

export interface Condition { field: FieldId; op: Op; value?: string | number }
export interface RuleGroup { match: 'all' | 'any'; negate?: boolean; conditions: Condition[] }
export interface SegmentRules { match: 'all' | 'any'; groups: RuleGroup[] }

export interface Choice { value: string; label: string }
type Kind = 'text' | 'number' | 'days' | 'enum' | 'list'

export interface FieldDef { label: string; kind: Kind; ops: Op[]; options?: Choice[] }

export const OP_LABELS: Record<Op, string> = {
  contains: 'يحتوي', not_contains: 'ما يحتوي', starts_with: 'يبدأ بـ', empty: 'فاضي', not_empty: 'موجود',
  is: 'هو', is_not: 'ليس', gt: 'أكثر من', lt: 'أقل من', eq: 'يساوي',
  within: 'خلال آخر', before: 'قبل أكثر من', never: 'ما صار أبدًا', has: 'عنده', not_has: 'ما عنده',
}

export const STATUS_CHOICES: Choice[] = [
  { value: 'open', label: 'مفتوحة' }, { value: 'waiting', label: 'بانتظار العميل' },
  { value: 'snoozed', label: 'مؤجلة' }, { value: 'closed', label: 'مغلقة' },
]

export const FIELDS: Record<FieldId, FieldDef> = {
  name: { label: 'الاسم', kind: 'text', ops: ['contains', 'not_contains', 'empty', 'not_empty'] },
  phone: { label: 'الجوال', kind: 'text', ops: ['starts_with', 'contains', 'empty', 'not_empty'] },
  type: { label: 'نوع العميل', kind: 'enum', ops: ['is', 'is_not'], options: [{ value: 'new', label: 'جديد' }, { value: 'returning', label: 'عائد' }] },
  visits: { label: 'عدد التواصل', kind: 'number', ops: ['gt', 'lt', 'eq'] },
  last_contact: { label: 'آخر تواصل', kind: 'days', ops: ['within', 'before', 'never'] },
  first_contact: { label: 'أول تواصل', kind: 'days', ops: ['within', 'before'] },
  channel: { label: 'القناة', kind: 'list', ops: ['has', 'not_has'], options: [{ value: 'whatsapp', label: 'واتساب' }, { value: 'phone', label: 'هاتف' }, { value: 'web', label: 'الموقع' }] },
  tag: { label: 'الوسم', kind: 'list', ops: ['has', 'not_has'] },
  status: { label: 'حالة آخر محادثة', kind: 'enum', ops: ['is', 'is_not'], options: STATUS_CHOICES },
  team: { label: 'الفريق', kind: 'enum', ops: ['is', 'is_not', 'empty'] },
  assigned: { label: 'الإسناد', kind: 'enum', ops: ['empty', 'not_empty'] },
}

export const FIELD_ORDER: FieldId[] = ['type', 'last_contact', 'first_contact', 'visits', 'channel', 'tag', 'status', 'team', 'assigned', 'name', 'phone']

/** Ops that need no value. */
export const NO_VALUE: Op[] = ['empty', 'not_empty', 'never']

export const EMPTY_RULES: SegmentRules = { match: 'all', groups: [{ match: 'all', conditions: [] }] }

const DAY = 86_400_000

function testCondition(c: Contact, cond: Condition, now: number): boolean {
  const v = cond.value
  const text = (s: string) => {
    const hay = s.trim()
    const q = String(v ?? '').trim()
    switch (cond.op) {
      case 'contains': return !!q && hay.includes(q)
      case 'not_contains': return !q || !hay.includes(q)
      case 'starts_with': return !!q && (hay.startsWith(q) || hay.replace(/\D/g, '').startsWith(q.replace(/\D/g, '')))
      case 'empty': return !hay
      case 'not_empty': return !!hay
      default: return false
    }
  }
  const days = (iso: string | null) => {
    if (cond.op === 'never') return !iso
    if (!iso) return false
    const n = Number(v) || 0
    const age = now - Date.parse(iso)
    return cond.op === 'within' ? age <= n * DAY : age > n * DAY
  }
  const list = (vals: string[]) => (cond.op === 'has' ? vals.includes(String(v)) : !vals.includes(String(v)))
  const enumIs = (val: string | null) => {
    if (cond.op === 'empty') return !val
    if (cond.op === 'not_empty') return !!val
    return cond.op === 'is' ? val === String(v) : val !== String(v)
  }
  switch (cond.field) {
    case 'name': return text(c.name)
    case 'phone': return text(c.phone)
    case 'type': return enumIs(c.type)
    case 'visits': {
      const n = Number(v) || 0
      return cond.op === 'gt' ? c.visits > n : cond.op === 'lt' ? c.visits < n : c.visits === n
    }
    case 'last_contact': return days(c.lastAt)
    case 'first_contact': return days(c.firstAt)
    case 'channel': return list(c.channels)
    case 'tag': return list(c.tagIds)
    case 'status': return enumIs(c.status)
    case 'team': return enumIs(c.teamId)
    case 'assigned': return enumIs(c.assigneeId)
  }
}

/** Whether a contact belongs to a dynamic segment. Groups or rules with no conditions match everyone. */
export function matchesRules(c: Contact, rules: SegmentRules, now = Date.now()): boolean {
  const groups = rules.groups.filter((g) => g.conditions.length > 0)
  if (groups.length === 0) return true
  const groupOk = (g: RuleGroup) => {
    const r = g.match === 'all' ? g.conditions.every((x) => testCondition(c, x, now)) : g.conditions.some((x) => testCondition(c, x, now))
    return g.negate ? !r : r
  }
  return rules.match === 'all' ? groups.every(groupOk) : groups.some(groupOk)
}

/** A condition in plain Arabic, e.g. «آخر تواصل خلال آخر 30 يوم». */
export function describeCondition(cond: Condition, lookup: (field: FieldId, value: string) => string = (_, v) => v): string {
  const f = FIELDS[cond.field]
  if (!f) return ''
  if (NO_VALUE.includes(cond.op)) return `${f.label} ${OP_LABELS[cond.op]}`
  let val = String(cond.value ?? '')
  if (f.kind === 'days') val = `${val} يوم`
  else if (f.options) val = f.options.find((o) => o.value === val)?.label || lookup(cond.field, val)
  else if (f.kind === 'enum' || f.kind === 'list') val = lookup(cond.field, val)
  return `${f.label} ${OP_LABELS[cond.op]} «${val}»`
}

/** The whole rule set as one Arabic sentence, for the segment list and the campaign review step. */
export function describeRules(rules: SegmentRules, lookup?: (field: FieldId, value: string) => string): string {
  const groups = rules.groups.filter((g) => g.conditions.length > 0)
  if (groups.length === 0) return 'كل العملاء'
  const parts = groups.map((g) => {
    const inner = g.conditions.map((c) => describeCondition(c, lookup)).join(g.match === 'all' ? ' و' : ' أو ')
    const wrapped = groups.length > 1 || g.negate ? `(${inner})` : inner
    return g.negate ? `ليس ${wrapped}` : wrapped
  })
  return parts.join(rules.match === 'all' ? ' و' : ' أو ')
}

/** Ready-made segments to start from. */
export const SEGMENT_TEMPLATES: { id: string; label: string; description: string; rules: SegmentRules }[] = [
  { id: 'returning', label: 'العملاء العائدون', description: 'تواصلوا أكثر من مرة',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'type', op: 'is', value: 'returning' }] }] } },
  { id: 'new_week', label: 'جدد هالأسبوع', description: 'أول تواصل خلال آخر 7 أيام',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'first_contact', op: 'within', value: 7 }] }] } },
  { id: 'quiet', label: 'انقطعوا عنا', description: 'آخر تواصل قبل أكثر من 30 يوم',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'last_contact', op: 'before', value: 30 }] }] } },
  { id: 'waiting', label: 'بانتظار ردنا', description: 'آخر محادثة مفتوحة وما هي مسندة لأحد',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'status', op: 'is', value: 'open' }, { field: 'assigned', op: 'empty' }] }] } },
  { id: 'whatsapp_loyal', label: 'عملاء واتساب المتكررون', description: 'تواصلوا عبر واتساب أكثر من مرتين',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'channel', op: 'has', value: 'whatsapp' }, { field: 'visits', op: 'gt', value: 2 }] }] } },
]
