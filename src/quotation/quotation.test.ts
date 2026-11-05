import { describe, expect, it } from 'vitest'
import { computeTotals, evaluate } from './pricing'
import { buildLines, matchItem, normalize, parseRequest } from './matching'
import { DEMO_PRODUCTS, DEMO_SETTINGS } from './demoData'
import { runAgentCommand } from './agent'
import { dueFollowUps } from './store'
import type { QtEvent, QtLine, QtQuote } from './types'

const line = (p: Partial<QtLine>): QtLine => ({
  id: 'x', requested: 'x', productId: 'p', description: 'بند', unit: 'حبة', qty: 1, unitPrice: 100, unitCost: 60, discountPct: 0,
  priceUpdatedAt: new Date().toISOString(), ...p,
})

describe('computeTotals', () => {
  it('is exact in halalas', () => {
    const t = computeTotals([line({ qty: 3, unitPrice: 0.1, unitCost: 0 })], 0, 15)
    expect(t.subtotal).toBe(0.3)
    expect(t.vat).toBe(0.05) // 0.045 rounds half up
    expect(t.total).toBe(0.35)
  })
  it('applies line then quote discount before VAT', () => {
    const t = computeTotals([line({ qty: 10, unitPrice: 100, discountPct: 10 })], 5, 15)
    expect(t.lines[0].net).toBe(900)
    expect(t.discount).toBe(45)
    expect(t.taxable).toBe(855)
    expect(t.vat).toBe(128.25)
    expect(t.total).toBe(983.25)
  })
  it('excludes optional lines from totals', () => {
    const t = computeTotals([line({ qty: 1 }), line({ id: 'o', qty: 5, optional: true })], 0, 0)
    expect(t.total).toBe(100)
  })
  it('reports margin only when every cost is known', () => {
    expect(computeTotals([line({ qty: 2 })], 0, 15).marginPct).toBe(40)
    expect(computeTotals([line({ qty: 2, unitCost: null })], 0, 15).marginPct).toBeNull()
  })
})

describe('evaluate', () => {
  const s = DEMO_SETTINGS
  it('auto-issues a clean quote', () => {
    const v = evaluate([line({ qty: 2, unitPrice: 100, unitCost: 50 })], 0, s)
    expect(v.canAutoIssue).toBe(true)
  })
  it('blocks unmatched and unpriced lines', () => {
    const v = evaluate([line({ productId: null }), line({ id: 'y', unitPrice: null })], 0, s)
    expect(v.needsInfo).toBe(true)
    expect(v.canAutoIssue).toBe(false)
    expect(v.issues.map((i) => i.kind)).toEqual(['unmatched', 'no_price'])
  })
  it('sends discount, low margin, stale price and big totals to approval', () => {
    expect(evaluate([line({})], 15, s).issues.some((i) => i.kind === 'discount')).toBe(true)
    expect(evaluate([line({ unitCost: 95 })], 0, s).issues.some((i) => i.kind === 'low_margin')).toBe(true)
    expect(evaluate([line({ priceUpdatedAt: new Date(Date.now() - 200 * 86400000).toISOString() })], 0, s).needsApproval).toBe(true)
    expect(evaluate([line({ qty: 1000 })], 0, s).issues.some((i) => i.kind === 'over_limit')).toBe(true)
  })
  it('never auto-issues when margin can not be checked', () => {
    expect(evaluate([line({ unitCost: null })], 0, s).canAutoIssue).toBe(false)
  })
})

describe('agent commands', () => {
  const lines = buildLines(parseRequest('40 كرسي مكتب شبكي\n3 طابعة ليزر\n2 شاشة 27 بوصة'), DEMO_PRODUCTS)
  it('changes a quantity by name', () => {
    const r = runAgentCommand('غيّر كمية الطابعة إلى ٥٠', lines, DEMO_PRODUCTS)
    expect(r.changed).toBe(true)
    expect(r.lines!.find((l) => l.productId === 'p6')!.qty).toBe(50)
  })
  it('applies a quote discount', () => {
    expect(runAgentCommand('خصم 5%', lines, DEMO_PRODUCTS).discountPct).toBe(5)
  })
  it('adds and removes lines from the catalog only', () => {
    expect(runAgentCommand('أضف 2 تركيب وتوصيل', lines, DEMO_PRODUCTS).lines!.length).toBe(4)
    expect(runAgentCommand('أضف سبورة ذكية', lines, DEMO_PRODUCTS).changed).toBe(false)
    expect(runAgentCommand('احذف الطابعة', lines, DEMO_PRODUCTS).lines!.length).toBe(2)
  })
  it('suggests a cheaper product of the same kind', () => {
    const exec = buildLines(parseRequest('2 كرسي مدير جلد'), DEMO_PRODUCTS)
    const r = runAgentCommand('اقترح بديل أقل تكلفة', exec, DEMO_PRODUCTS)
    expect(r.lines![0].productId).toBe('p1')
  })
  it('finds the line through attached prepositions', () => {
    const mixed = buildLines(parseRequest('3 مكتب مدير 180 سم\n3 كرسي مدير جلد'), DEMO_PRODUCTS)
    const r = runAgentCommand('اقترح بديل أقل تكلفة لكرسي المدير', mixed, DEMO_PRODUCTS)
    expect(r.lines!.map((l) => l.productId)).toEqual(['p4', 'p1'])
  })
  it('says what it can do instead of guessing', () => {
    expect(runAgentCommand('وش رأيك؟', lines, DEMO_PRODUCTS).changed).toBe(false)
  })
})

describe('request parsing and matching', () => {
  it('normalizes Arabic letters and digits', () => {
    expect(normalize('كُرسيّ مكتبٍ ٢٧')).toBe('كرسي مكتب 27')
  })
  it('reads quantities before or after the item and ignores list numbers', () => {
    expect(parseRequest('1. 40 كرسي مكتب\n- طابعة ليزر × ٣\nخزانة ملفات: 6')).toEqual([
      { text: 'كرسي مكتب', qty: 40, sourceRef: 'نص الطلب' },
      { text: 'طابعة ليزر', qty: 3, sourceRef: 'نص الطلب' },
      { text: 'خزانة ملفات', qty: 6, sourceRef: 'نص الطلب' },
    ])
  })
  it('matches by SKU and by name, and refuses to guess', () => {
    expect(matchItem('CH-310', DEMO_PRODUCTS).product?.id).toBe('p2')
    expect(matchItem('طابعة ليزر', DEMO_PRODUCTS).product?.id).toBe('p6')
    const chair = matchItem('كرسي', DEMO_PRODUCTS)
    expect(chair.product).toBeNull()
    expect(chair.candidates.length).toBeGreaterThan(1)
    expect(matchItem('سبورة ذكية', DEMO_PRODUCTS).product).toBeNull()
  })
  it('builds lines that keep the buyer wording', () => {
    const lines = buildLines(parseRequest('3 طابعة ليزر\nسبورة ذكية'), DEMO_PRODUCTS)
    expect(lines[0]).toMatchObject({ productId: 'p6', qty: 3, requested: 'طابعة ليزر', unitPrice: 1350 })
    expect(lines[1]).toMatchObject({ productId: null, qty: 0 })
  })
})

describe('dueFollowUps', () => {
  const day = 86400000
  const now = Date.parse('2026-11-10T12:00:00Z')
  const iso = (daysAgo: number) => new Date(now - daysAgo * day).toISOString()
  const quote = (id: string, docStatus: QtQuote['docStatus'], updatedAt: string) => ({ id, docStatus, updatedAt }) as QtQuote
  const ev = (quoteId: string, kind: QtEvent['kind'], at: string) => ({ id: `${quoteId}${kind}`, quoteId, kind, body: '', actor: '', at })

  it('lists sent quotes with no answer for the follow-up period, counting from the last follow-up', () => {
    const quotes = [quote('a', 'sent', iso(4)), quote('b', 'sent', iso(1)), quote('c', 'accepted', iso(9)), quote('d', 'sent', iso(8))]
    const events = [ev('d', 'followup', iso(1))]
    expect(dueFollowUps({ quotes, events }, now).map((q) => q.id)).toEqual(['a'])
  })
})
