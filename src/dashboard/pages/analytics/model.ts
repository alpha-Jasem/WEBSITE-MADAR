import type { AICallLog, AICallChannel } from '@/types/dashboard'
import {
  callVerdict, callTopic, sentimentKind, sentimentScore, callCost, collectedData, fieldLabel, isShortConversation,
  type SentimentKind,
} from '@/lib/callAnalysis'
import { periodBuckets, type Bucket, type Period } from '../shared/periods'

// Everything the agent-analytics page shows, computed from the call rows in the browser.
// Nothing here calls a model: the insight line is assembled from the numbers.

export type ChannelFilter = 'all' | AICallChannel
export type MetricId = 'count' | 'success' | 'duration' | 'sentiment' | 'cost' | 'review'

export interface Metric {
  id: MetricId
  label: string
  value: string
  hint: string
  tone?: 'up' | 'down'
  series: number[]
  format: (n: number) => string
  /** False when the data has nothing to say (e.g. no cost recorded), so the tile can be hidden. */
  available: boolean
}

export interface TopicRow {
  topic: string
  /** One line from the most recent conversation on this topic. */
  description: string
  /** The bucket for very short / no-interaction conversations. */
  short?: boolean
  count: number
  successRate: number | null
  positive: number
  neutral: number
  negative: number
  avgScore: number | null
  dominant: SentimentKind | null
}

export interface FieldStat { key: string; label: string; filled: number; total: number }

const t = (c: AICallLog) => new Date(c.call_time).getTime()

export function filterCalls(calls: AICallLog[], period: Period, channel: ChannelFilter, now = new Date()) {
  const buckets = periodBuckets(period, now)
  const start = buckets[0].start
  const end = buckets[buckets.length - 1].end
  const span = end - start
  const byChannel = channel === 'all' ? calls : calls.filter((c) => (c.channel || 'phone') === channel)
  const inRange = byChannel.filter((c) => { const x = t(c); return x >= start && x < end })
  const previous = byChannel.filter((c) => { const x = t(c); return x >= start - span && x < start })
  return { buckets, inRange, previous }
}

function perBucket(calls: AICallLog[], buckets: Bucket[]) {
  const out: AICallLog[][] = buckets.map(() => [])
  for (const c of calls) {
    const x = t(c)
    const i = buckets.findIndex((b) => x >= b.start && x < b.end)
    if (i >= 0) out[i].push(c)
  }
  return out
}

function successRate(calls: AICallLog[]): number | null {
  let ok = 0, judged = 0
  for (const c of calls) {
    const v = callVerdict(c)
    if (v === 'success') { ok++; judged++ } else if (v === 'failure') judged++
  }
  return judged ? ok / judged : null
}

function positiveShare(calls: AICallLog[]): number | null {
  let pos = 0, n = 0
  for (const c of calls) {
    const k = sentimentKind(c)
    if (!k) continue
    n++
    if (k === 'positive') pos++
  }
  return n ? pos / n : null
}

function avg(nums: number[]) {
  return nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : null
}

export function fmtDur(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} دقيقة` : `${s} ثانية`
}

/** Buckets with no conversations have no rate; carry the neighbouring value so the line doesn't dive to zero. */
function fillGaps(values: (number | null)[]): number[] {
  const first = values.find((v) => v != null) ?? 0
  let last = first
  return values.map((v) => (v == null ? last : (last = v)))
}
const pct = (n: number) => `${Math.round(n * 100)}%`
const credits = (n: number) => (n >= 100 ? Math.round(n).toLocaleString('en-US') : (Math.round(n * 10) / 10).toLocaleString('en-US'))

function delta(cur: number, prev: number, phrase: string): [string, 'up' | 'down' | undefined] {
  if (prev === 0) return [cur > 0 ? `لا يوجد ما نقارن به ${phrase}` : '', undefined]
  const d = Math.round(((cur - prev) / prev) * 100)
  if (d === 0) return [`بدون تغيير عن ${phrase}`, undefined]
  return [`${d > 0 ? '+' : ''}${d}% عن ${phrase}`, d > 0 ? 'up' : 'down']
}

const PREV_PHRASE: Record<Period, string> = { today: 'أمس', week: 'الأسبوع السابق', month: 'الشهر السابق' }

export function computeMetrics(inRange: AICallLog[], previous: AICallLog[], buckets: Bucket[], period: Period): Metric[] {
  const groups = perBucket(inRange, buckets)
  const n = inRange.length
  const prevPhrase = PREV_PHRASE[period]

  const [countHint, countTone] = delta(n, previous.length, prevPhrase)

  const rate = successRate(inRange)
  const judged = inRange.filter((c) => { const v = callVerdict(c); return v === 'success' || v === 'failure' }).length
  const prevRate = successRate(previous)

  const durations = inRange.map((c) => c.duration_seconds || 0).filter((s) => s > 0)
  const avgDur = avg(durations)

  const pos = positiveShare(inRange)
  const scores = inRange.map(sentimentScore).filter((x): x is number => x != null)
  const avgScore = avg(scores)
  const withSentiment = inRange.filter((c) => sentimentKind(c)).length

  const costs = inRange.map(callCost).filter((x): x is number => x != null)
  const totalCost = costs.reduce((s, x) => s + x, 0)

  const review = inRange.filter((c) => c.needs_review || c.status === 'needs_review').length

  return [
    {
      id: 'count', label: 'المحادثات', value: n.toLocaleString('en-US'), hint: countHint, tone: countTone,
      series: groups.map((g) => g.length), format: (x) => x.toLocaleString('en-US'), available: true,
    },
    {
      id: 'success', label: 'نسبة النجاح', value: rate == null ? '—' : pct(rate),
      hint: rate == null ? 'لا يوجد تقييم بعد' : prevRate != null
        ? `${Math.round((rate - prevRate) * 100) >= 0 ? '+' : ''}${Math.round((rate - prevRate) * 100)} نقطة عن ${prevPhrase}`
        : `من ${judged} محادثة مُقيّمة`,
      tone: rate != null && prevRate != null ? (rate > prevRate ? 'up' : rate < prevRate ? 'down' : undefined) : undefined,
      series: fillGaps(groups.map((g) => { const r = successRate(g); return r == null ? null : Math.round(r * 100) })), format: (x) => `${x}%`, available: true,
    },
    {
      id: 'duration', label: 'متوسط المدة', value: avgDur == null ? '—' : fmtDur(avgDur),
      hint: durations.length ? `على ${durations.length} محادثة` : 'لا توجد مدد مسجلة',
      series: fillGaps(groups.map((g) => { const a = avg(g.map((c) => c.duration_seconds || 0).filter((s) => s > 0)); return a == null ? null : Math.round(a) })), format: fmtDur, available: true,
    },
    {
      id: 'sentiment', label: 'المشاعر', value: pos == null ? '—' : `${pct(pos)} إيجابي`,
      hint: pos == null ? 'لا يوجد تحليل مشاعر بعد' : avgScore != null ? `متوسط الدرجة ${avgScore.toFixed(2)} · ${withSentiment} محادثة` : `${withSentiment} محادثة`,
      series: fillGaps(groups.map((g) => { const r = positiveShare(g); return r == null ? null : Math.round(r * 100) })), format: (x) => `${x}%`, available: true,
    },
    {
      id: 'cost', label: 'الاستهلاك', value: credits(totalCost), hint: `رصيد مستهلك على ${costs.length} محادثة`,
      series: groups.map((g) => Math.round(g.reduce((s, c) => s + (callCost(c) ?? 0), 0))), format: (x) => x.toLocaleString('en-US'),
      available: costs.length > 0,
    },
    {
      id: 'review', label: 'يحتاج متابعة', value: review.toLocaleString('en-US'), hint: review ? 'محادثات تنتظر مراجعة' : 'ما فيه شي ينتظرك',
      tone: review ? 'down' : undefined,
      series: groups.map((g) => g.filter((c) => c.needs_review || c.status === 'needs_review').length), format: (x) => x.toLocaleString('en-US'), available: true,
    },
  ]
}

export const SHORT_TOPIC = 'محادثات قصيرة / بدون تفاعل'

export function computeTopics(calls: AICallLog[]): TopicRow[] {
  const map = new Map<string, AICallLog[]>()
  for (const c of calls) {
    const k = isShortConversation(c) ? SHORT_TOPIC : callTopic(c)
    const list = map.get(k)
    if (list) list.push(c); else map.set(k, [c])
  }
  const rows: TopicRow[] = []
  for (const [topic, list] of map) {
    let positive = 0, neutral = 0, negative = 0
    for (const c of list) {
      const k = sentimentKind(c)
      if (k === 'positive') positive++
      else if (k === 'neutral') neutral++
      else if (k === 'negative') negative++
    }
    const top = Math.max(positive, neutral, negative)
    const dominant: SentimentKind | null = top === 0 ? null : positive === top ? 'positive' : negative === top ? 'negative' : 'neutral'
    const latest = [...list].sort((a, b) => b.call_time.localeCompare(a.call_time))[0]
    rows.push({
      topic, short: topic === SHORT_TOPIC, description: topic === SHORT_TOPIC ? 'أقل من 20 ثانية أو رسالة واحدة من العميل' : latest?.summary || '',
      count: list.length, successRate: successRate(list), positive, neutral, negative,
      avgScore: avg(list.map(sentimentScore).filter((x): x is number => x != null)), dominant,
    })
  }
  // Short conversations always go last: they are noise, not a topic.
  return rows.sort((a, b) => Number(!!a.short) - Number(!!b.short) || b.count - a.count || a.topic.localeCompare(b.topic))
}

export function computeFieldStats(calls: AICallLog[]): { withData: number; fields: FieldStat[] } {
  const counts = new Map<string, number>()
  let withData = 0
  for (const c of calls) {
    const fields = collectedData(c)
    if (fields.length) withData++
    for (const f of fields) {
      if (!counts.has(f.key)) counts.set(f.key, 0)
      if (f.filled) counts.set(f.key, (counts.get(f.key) || 0) + 1)
    }
  }
  const fields = [...counts.entries()]
    .map(([key, filled]) => ({ key, label: fieldLabel(key), filled, total: withData }))
    .sort((a, b) => b.filled - a.filled)
  return { withData, fields }
}

const PERIOD_INSIGHT: Record<Period, string> = { today: 'اليوم', week: 'هذا الأسبوع', month: 'هذا الشهر' }

/** One or two plain sentences built from the numbers. */
export function insightText(inRange: AICallLog[], topics: TopicRow[], metrics: Metric[], fields: FieldStat[], period: Period): string {
  const n = inRange.length
  if (n === 0) return ''
  const parts: string[] = []
  const lead = `تعامل الموظف مع ${n.toLocaleString('en-US')} ${n === 1 ? 'محادثة' : n <= 10 ? 'محادثات' : 'محادثة'} ${PERIOD_INSIGHT[period]}`
  const top = topics.find((x) => !x.short)
  if (top && top.count > 1 && topics.length > 1) {
    const word = top.count / n >= 0.4 ? 'أغلبها عن' : 'وأكثر موضوع تكرر'
    parts.push(`${lead}، ${word} «${top.topic}» (${top.count})`)
  } else parts.push(lead)
  const success = metrics.find((m) => m.id === 'success')
  if (success && success.value !== '—') parts.push(`ونجح في ${success.value} من المحادثات المُقيّمة`)
  const moods = { positive: 0, neutral: 0, negative: 0 }
  for (const c of inRange) { const k = sentimentKind(c); if (k) moods[k]++ }
  const moodTop = (Object.entries(moods) as [SentimentKind, number][]).sort((x, y) => y[1] - x[1])[0]
  if (moodTop && moodTop[1] > 0) parts.push(`والمشاعر غالباً ${{ positive: 'إيجابية', neutral: 'محايدة', negative: 'سلبية' }[moodTop[0]]}`)
  let text = `${parts.join('، ')}.`
  const visit = fields.find((f) => f.key === 'visit_preference' && f.filled > 0)
  const phone = fields.find((f) => (f.key === 'contact_number' || f.key === 'phone') && f.filled > 0)
  const extra: string[] = []
  if (phone) extra.push(`${phone.filled} ${phone.filled === 1 ? 'عميل ترك' : 'عملاء تركوا'} رقم تواصل`)
  if (visit) extra.push(`${visit.filled} ${visit.filled === 1 ? 'طلب' : 'طلبوا'} موعد زيارة`)
  const review = metrics.find((m) => m.id === 'review')
  if (extra.length) text += ` ${extra.join('، ')}.`
  if (review && review.value !== '0') text += ` ${review.value === '1' ? 'محادثة واحدة تحتاج' : `${review.value} محادثات تحتاج`} متابعتك.`
  return text
}

export interface InsightCard {
  id: string
  tag: string
  tone: 'ai' | 'warn' | 'bad' | 'info' | 'ok'
  title: string
  text: string
  /** Relative paths under the dashboard base. */
  actions: { label: string; to: string }[]
  dismissible: boolean
}

/** Recommendation cards derived from the numbers. Each one points at the Madar page that fixes it. */
export function recommendations(inRange: AICallLog[], allCalls: AICallLog[], fields: FieldStat[]): InsightCard[] {
  const out: InsightCard[] = []
  const review = inRange.filter((c) => c.needs_review || c.status === 'needs_review').length
  if (review > 0) {
    out.push({
      id: 'review', tag: 'متابعة', tone: 'warn', dismissible: false,
      title: review === 1 ? 'محادثة تنتظر مراجعتك' : `${review} محادثات تنتظر مراجعتك`,
      text: 'الموظف علّمها لأنها تحتاج قرار منك أو من فريقك.',
      actions: [{ label: 'راجعها', to: 'conversations?filter=needs' }],
    })
  }
  const failed = inRange.filter((c) => callVerdict(c) === 'failure').length
  if (failed > 0) {
    out.push({
      id: 'kb-gaps', tag: 'اقتراح', tone: 'ai', dismissible: true,
      title: 'أضف إجابات لقاعدة المعرفة',
      text: `${failed} ${failed === 1 ? 'محادثة ما نجحت' : 'محادثات ما نجحت'}. راجعها وأضف المعلومة اللي كانت ناقصة.`,
      actions: [{ label: 'غير الناجحة', to: 'conversations?view=table&eval=failure' }, { label: 'قاعدة المعرفة', to: 'knowledge-base' }],
    })
  }
  const phone = fields.find((f) => f.key === 'contact_number' || f.key === 'phone')
  if (phone && phone.total >= 3 && phone.filled / phone.total < 0.6) {
    out.push({
      id: 'ask-phone', tag: 'اقتراح', tone: 'info', dismissible: true,
      title: 'اطلب رقم التواصل أبكر',
      text: `${phone.total - phone.filled} من ${phone.total} محادثات انتهت بدون رقم تواصل.`,
      actions: [{ label: 'إعدادات الموظف', to: 'agents' }],
    })
  }
  const negative = inRange.filter((c) => sentimentKind(c) === 'negative').length
  if (inRange.length >= 5 && negative / inRange.length >= 0.15) {
    out.push({
      id: 'negative', tag: 'تنبيه', tone: 'bad', dismissible: true,
      title: 'مشاعر سلبية أعلى من المعتاد',
      text: `${negative} من ${inRange.length} محادثات كانت سلبية. اطّلع عليها لتعرف السبب.`,
      actions: [{ label: 'عرض المحادثات', to: 'conversations?view=table' }],
    })
  }
  if (allCalls.length > 0 && !allCalls.some((c) => c.channel === 'whatsapp')) {
    out.push({
      id: 'connect-wa', tag: 'قناة', tone: 'ok', dismissible: true,
      title: 'اربط واتساب', text: 'خل الموظف يرد على عملائك في واتساب كمان.',
      actions: [{ label: 'التكاملات', to: 'integrations' }],
    })
  }
  return out
}
