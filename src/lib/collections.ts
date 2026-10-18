// Collection maths. "Collected" means confirmed payments only; pending or rejected ones never count.
import { monthKey, riyadhDayStart } from './format'

export interface PaymentRow {
  id: string
  customer_name: string
  status: 'pending_verification' | 'confirmed' | 'rejected'
  total_amount: number
  net_amount: number
  tax_amount: number
  confirmed_at: string | null
  received_at: string
  reference: string
  method: string
  deal_id: string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Splits an entered amount into net, tax and total without ever adding the tax twice. */
export function splitVat(amount: number, ratePct: number, vatIncluded: boolean) {
  if (vatIncluded) {
    const net = round2(amount / (1 + ratePct / 100))
    return { net, tax: round2(amount - net), total: round2(amount) }
  }
  const tax = round2((amount * ratePct) / 100)
  return { net: round2(amount), tax, total: round2(amount + tax) }
}

export function sumConfirmed(rows: PaymentRow[], from: Date, to: Date) {
  return rows
    .filter(p => p.status === 'confirmed' && p.confirmed_at && new Date(p.confirmed_at) >= from && new Date(p.confirmed_at) < to)
    .reduce((s, p) => s + Number(p.total_amount), 0)
}

/** Confirmed collection per Riyadh day for the last `days` days, oldest first. */
export function dailyCollection(rows: PaymentRow[], days: number, now: Date = new Date(), refunds: RefundRow[] = []) {
  const today = riyadhDayStart(now).getTime()
  return Array.from({ length: days }, (_, i) => {
    const start = new Date(today - (days - 1 - i) * 86400000)
    return { start, total: netCollection(rows, refunds, start, new Date(start.getTime() + 86400000)) }
  })
}

/** Percentage change, or null when the previous value is zero (no honest comparison exists). */
export function pctChange(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null
}

export function goalProgress(collected: number, target: number | null | undefined) {
  if (!target || target <= 0) return null
  return Math.min(100, Math.round((collected / target) * 1000) / 10)
}

export type Period = 'day' | 'week' | 'month'

const DAY_MS = 86400000

/** Window of bucket k of a period (k = 0 is the current one, negative is older). */
export function bucketWindow(period: Period, k: number, now: Date = new Date()) {
  const today = riyadhDayStart(now)
  if (period === 'day') {
    const start = new Date(today.getTime() + k * DAY_MS)
    return { start, end: new Date(start.getTime() + DAY_MS) }
  }
  if (period === 'week') {
    const end = new Date(today.getTime() + DAY_MS + k * 7 * DAY_MS)
    return { start: new Date(end.getTime() - 7 * DAY_MS), end }
  }
  const [y, m] = monthKey(now).split('-').map(Number)
  const at = (offset: number) => {
    const t = y * 12 + (m - 1) + offset
    return new Date(`${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01T00:00:00+03:00`)
  }
  return { start: at(k), end: at(k + 1) }
}

/** Collection per bucket for the latest n buckets, plus the same buckets one whole series earlier. */
export function collectionSeries(rows: PaymentRow[], period: Period, now: Date = new Date(), refunds: RefundRow[] = []) {
  const n = period === 'day' ? 7 : period === 'week' ? 8 : 6
  const out = Array.from({ length: n }, (_, i) => {
    const k = -(n - 1 - i)
    const cur = bucketWindow(period, k, now)
    const prev = bucketWindow(period, k - n, now)
    return {
      start: cur.start,
      current: netCollection(rows, refunds, cur.start, cur.end),
      previous: netCollection(rows, refunds, prev.start, prev.end),
    }
  })
  return out
}

export interface RefundRow { id: string; payment_id: string; amount: number; status: 'requested' | 'approved' | 'executed' | 'rejected'; executed_at: string | null }

/** Refunds executed inside a window. Requested or approved refunds do not reduce collection until executed. */
export function sumRefunds(refunds: RefundRow[], from: Date, to: Date) {
  return refunds
    .filter(r => r.status === 'executed' && r.executed_at && new Date(r.executed_at) >= from && new Date(r.executed_at) < to)
    .reduce((s, r) => s + Number(r.amount), 0)
}

/** Net collection: confirmed payments minus refunds executed in the same window. The original rows are never removed. */
export function netCollection(payments: PaymentRow[], refunds: RefundRow[], from: Date, to: Date) {
  return sumConfirmed(payments, from, to) - sumRefunds(refunds, from, to)
}
