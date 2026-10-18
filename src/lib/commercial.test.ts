import { describe, expect, it } from 'vitest'
import { commissionFor, computeQuote, marginPct, onboardingTemplate, parseBankNotice, quoteExceptions } from './commercial'

describe('computeQuote', () => {
  it('applies the discount first and VAT once', () => {
    expect(computeQuote({ setup_net: 4000, monthly_net: 1000, discount_pct: 20, vat_rate: 15 })).toEqual({ net_total: 4000, tax_total: 600, grand_total: 4600 })
  })
  it('works without a discount', () => {
    expect(computeQuote({ setup_net: 1000, monthly_net: 0, discount_pct: 0, vat_rate: 15 }).grand_total).toBe(1150)
  })
})

describe('quoteExceptions', () => {
  it('flags a discount above the agent limit and a price under the minimum', () => {
    const e = quoteExceptions({ discount_pct: 30, net_total: 900 }, { max_discount_pct: 20, min_price: 1000 })
    expect(e).toHaveLength(2)
  })
  it('stays silent when limits are not set or respected', () => {
    expect(quoteExceptions({ discount_pct: 10, net_total: 5000 }, { max_discount_pct: 20, min_price: 1000 })).toEqual([])
    expect(quoteExceptions({ discount_pct: 90, net_total: 1 }, { max_discount_pct: null, min_price: null })).toEqual([])
  })
})

describe('marginPct', () => {
  it('is unknown, not 100%, when costs are unknown', () => {
    expect(marginPct(1000, null)).toBeNull()
    expect(marginPct(0, 100)).toBeNull()
  })
  it('computes the margin on net revenue', () => {
    expect(marginPct(1000, 400)).toBe(60)
    expect(marginPct(1000, 1200)).toBe(-20)
  })
})

describe('parseBankNotice', () => {
  it('reads amount and reference from an English notice', () => {
    expect(parseBankNotice('Credit of SAR 5,000.00 received. Ref: AB12345678')).toEqual({ amount: 5000, reference: 'AB12345678', currency: 'SAR' })
  })
  it('reads Arabic digits and wording', () => {
    const r = parseBankNotice('تم إيداع مبلغ ٢٬٣٠٠٫٥٠ ريال رقم المرجع: 998877TT')
    expect(r.amount).toBe(2300.5)
    expect(r.reference).toBe('998877TT')
  })
  it('returns nulls when nothing can be read', () => {
    expect(parseBankNotice('hello')).toEqual({ amount: null, reference: '', currency: 'SAR' })
  })
})

describe('commissionFor', () => {
  it('has no commission without an approved rule', () => {
    expect(commissionFor(1000, {})).toBeNull()
    expect(commissionFor(1000, null)).toBeNull()
    expect(commissionFor(1000, { type: 'percent', value: 0 })).toBeNull()
  })
  it('computes percent and fixed commissions on net collected', () => {
    expect(commissionFor(2000, { type: 'percent', value: 10 })).toMatchObject({ amount: 200, base: 2000, rate_pct: 10, hold_days: 14 })
    expect(commissionFor(2000, { type: 'fixed', value: 150, hold_days: 7 })).toMatchObject({ amount: 150, hold_days: 7 })
  })
})

describe('onboardingTemplate', () => {
  it('always produces gates so a service cannot go live untested', () => {
    const items = onboardingTemplate('voice_elevenlabs', 'حل صوتي')
    expect(items.filter(i => i.kind === 'gate').length).toBeGreaterThanOrEqual(3)
    expect(items.every(i => i.service_code === 'voice_elevenlabs')).toBe(true)
  })
})
