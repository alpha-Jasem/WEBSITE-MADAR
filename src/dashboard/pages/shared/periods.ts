/* Time buckets for report charts. Buckets are returned oldest-first; the charts draw them
   right-to-left so the oldest sits on the right, matching the RTL dashboard. */

export type Period = 'today' | 'week' | 'month'

export const PERIOD_OPTIONS = [['today', 'اليوم'], ['week', 'الأسبوع'], ['month', 'الشهر']] as const
export const PERIOD_PHRASE: Record<Period, string> = { today: 'اليوم', week: 'آخر 7 أيام', month: 'آخر 30 يوم' }

export interface Bucket { start: number; end: number; label: string }

/** Gregorian calendar with Latin digits; plain 'ar-SA' would switch to the Hijri calendar. */
export const AR_GREG = 'ar-SA-u-ca-gregory-nu-latn'

export function hourLabel(h: number) {
  if (h === 0) return '12ص'
  if (h < 12) return `${h}ص`
  if (h === 12) return '12م'
  return `${h - 12}م`
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function periodBuckets(period: Period, now = new Date()): Bucket[] {
  const today = startOfDay(now)
  if (period === 'today') {
    return Array.from({ length: 24 }, (_, h) => {
      const s = new Date(today); s.setHours(h)
      const e = new Date(today); e.setHours(h + 1)
      return { start: s.getTime(), end: e.getTime(), label: hourLabel(h) }
    })
  }
  const days = period === 'week' ? 7 : 30
  return Array.from({ length: days }, (_, i) => {
    const s = new Date(today); s.setDate(s.getDate() - (days - 1 - i))
    const e = new Date(s); e.setDate(e.getDate() + 1)
    const isToday = i === days - 1
    const label = isToday ? 'اليوم'
      : period === 'week' ? s.toLocaleDateString(AR_GREG, { weekday: 'short' })
      : `${s.getDate()}/${s.getMonth() + 1}`
    return { start: s.getTime(), end: e.getTime(), label }
  })
}

export function periodRange(period: Period, now = new Date()) {
  const b = periodBuckets(period, now)
  return { start: b[0].start, end: b[b.length - 1].end }
}

/** Counts (or sums) items into the buckets by a timestamp. */
export function bucketize<T>(items: T[], buckets: Bucket[], time: (item: T) => number | null, weight: (item: T) => number = () => 1) {
  const out = buckets.map(() => 0)
  if (!buckets.length) return out
  const first = buckets[0].start
  const last = buckets[buckets.length - 1].end
  for (const it of items) {
    const t = time(it)
    if (t == null || Number.isNaN(t) || t < first || t >= last) continue
    const idx = buckets.findIndex((b) => t >= b.start && t < b.end)
    if (idx >= 0) out[idx] += weight(it)
  }
  return out
}

/** 'YYYY-MM-DD' (+ optional 'HH:MM') read as local time. */
export function localTime(date: string | undefined | null, time?: string | null) {
  if (!date) return null
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0).getTime()
}

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
