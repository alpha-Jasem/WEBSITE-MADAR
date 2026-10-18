import { describe, expect, it } from 'vitest'
import { dailyCollection, goalProgress, pctChange, splitVat, sumConfirmed, type PaymentRow } from './collections'

const pay = (over: Partial<PaymentRow>): PaymentRow => ({
  id: 'x', customer_name: 'c', status: 'confirmed', total_amount: 1150, net_amount: 1000, tax_amount: 150,
  confirmed_at: '2026-10-18T09:00:00Z', received_at: '2026-10-18T08:00:00Z', reference: '', method: 'bank_transfer', deal_id: null, ...over,
})

describe('splitVat', () => {
  it('extracts VAT from an amount that already includes it', () => {
    expect(splitVat(1150, 15, true)).toEqual({ net: 1000, tax: 150, total: 1150 })
  })
  it('adds VAT once to a net amount', () => {
    expect(splitVat(1000, 15, false)).toEqual({ net: 1000, tax: 150, total: 1150 })
  })
  it('handles a zero rate', () => {
    expect(splitVat(500, 0, true)).toEqual({ net: 500, tax: 0, total: 500 })
  })
})

describe('sumConfirmed', () => {
  const from = new Date('2026-10-17T21:00:00Z')
  const to = new Date('2026-10-18T21:00:00Z')
  it('counts only confirmed payments inside the window', () => {
    const rows = [
      pay({ id: 'a' }),
      pay({ id: 'b', status: 'pending_verification', confirmed_at: null }),
      pay({ id: 'c', status: 'rejected', confirmed_at: null }),
      pay({ id: 'd', confirmed_at: '2026-10-10T09:00:00Z' }),
    ]
    expect(sumConfirmed(rows, from, to)).toBe(1150)
  })
})

describe('dailyCollection', () => {
  it('returns one bucket per day with zeros when nothing was collected', () => {
    const days = dailyCollection([], 7, new Date('2026-10-18T10:00:00Z'))
    expect(days).toHaveLength(7)
    expect(days.every(d => d.total === 0)).toBe(true)
  })
})

describe('pctChange and goalProgress', () => {
  it('has no percentage without a previous value', () => {
    expect(pctChange(5000, 0)).toBeNull()
    expect(pctChange(5000, 4000)).toBe(25)
  })
  it('has no progress without a target and caps at 100', () => {
    expect(goalProgress(100, null)).toBeNull()
    expect(goalProgress(50000, 80000)).toBe(62.5)
    expect(goalProgress(90000, 80000)).toBe(100)
  })
})

import { bucketWindow, collectionSeries } from './collections'

describe('collectionSeries', () => {
  const now = new Date('2026-10-18T10:00:00Z')
  it('has the right number of buckets per period', () => {
    expect(collectionSeries([], 'day', now)).toHaveLength(7)
    expect(collectionSeries([], 'week', now)).toHaveLength(8)
    expect(collectionSeries([], 'month', now)).toHaveLength(6)
  })
  it('puts a payment in its day and keeps the previous period separate', () => {
    const rows = [
      pay({ id: 'today', confirmed_at: '2026-10-18T09:00:00Z', total_amount: 5000 }),
      pay({ id: 'old', confirmed_at: '2026-10-08T09:00:00Z', total_amount: 700 }),
    ]
    const s = collectionSeries(rows, 'day', now)
    expect(s[s.length - 1].current).toBe(5000)
    expect(s.reduce((a, b) => a + b.current, 0)).toBe(5000)
    expect(s.reduce((a, b) => a + b.previous, 0)).toBe(700)
  })
  it('month windows follow Riyadh calendar months', () => {
    const w = bucketWindow('month', 0, now)
    expect(w.start.toISOString()).toBe('2026-09-30T21:00:00.000Z')
    expect(w.end.toISOString()).toBe('2026-10-31T21:00:00.000Z')
  })
})

import { netCollection, sumRefunds, type RefundRow } from './collections'

describe('refunds reduce net collection only once executed', () => {
  const from = new Date('2026-10-17T21:00:00Z')
  const to = new Date('2026-10-18T21:00:00Z')
  const ref = (over: Partial<RefundRow>): RefundRow => ({ id: 'r', payment_id: 'x', amount: 500, status: 'executed', executed_at: '2026-10-18T10:00:00Z', ...over })
  it('ignores requested and approved refunds', () => {
    expect(sumRefunds([ref({ status: 'requested' }), ref({ status: 'approved' })], from, to)).toBe(0)
  })
  it('subtracts an executed refund and keeps the original payment', () => {
    expect(netCollection([pay({})], [ref({})], from, to)).toBe(650)
    expect(sumConfirmed([pay({})], from, to)).toBe(1150)
  })
})
