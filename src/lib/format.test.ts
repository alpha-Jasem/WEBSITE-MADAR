import { describe, expect, it } from 'vitest'
import { monthKey, nf, pct, riyadhDayStart, sar } from './format'

describe('format', () => {
  it('uses Latin digits', () => {
    expect(nf(1234)).toBe('1,234')
    expect(sar(5000)).toBe('5,000 ر.س')
  })

  it('does not turn a missing denominator into 0%', () => {
    expect(pct(0, 0)).toBe('—')
    expect(pct(1, 4)).toBe('25%')
  })

  it('computes the month in Riyadh time, not UTC', () => {
    // 2026-09-30 22:30 UTC is already 2026-10-01 01:30 in Riyadh.
    expect(monthKey(new Date('2026-09-30T22:30:00Z'))).toBe('2026-10')
    expect(monthKey(new Date('2026-09-30T20:30:00Z'))).toBe('2026-09')
  })

  it('finds the start of the Riyadh day', () => {
    const start = riyadhDayStart(new Date('2026-10-18T10:00:00Z'))
    expect(start.toISOString()).toBe('2026-10-17T21:00:00.000Z')
  })
})
