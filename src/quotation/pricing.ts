import type { QtLine, QtSettings } from './types'

/**
 * Quote arithmetic and issue rules. Everything is computed in halalas (integer cents) so totals are
 * exact and reproducible; the agent never does the maths.
 *
 *   line gross    = round(qty × unit price)
 *   line discount = round(gross × line discount %)
 *   line net      = gross − line discount
 *   subtotal      = Σ line net (optional lines excluded)
 *   quote disc.   = round(subtotal × quote discount %)
 *   taxable       = subtotal − quote discount
 *   VAT           = round(taxable × VAT %)
 *   total         = taxable + VAT
 *   margin %      = (taxable − cost) ÷ taxable × 100, only when every priced line has a known cost
 */

const toH = (x: number) => Math.round(x * 100)
const fromH = (h: number) => h / 100

export interface LineTotals { id: string; gross: number; discount: number; net: number }

export interface QuoteTotals {
  lines: LineTotals[]
  subtotal: number
  discount: number
  taxable: number
  vat: number
  total: number
  /** null when a priced line has no cost, so the margin can't be checked. */
  cost: number | null
  margin: number | null
  marginPct: number | null
}

export function computeTotals(lines: QtLine[], discountPct: number, vatRate: number): QuoteTotals {
  const out: LineTotals[] = []
  let subH = 0
  let costH = 0
  let costKnown = true
  for (const l of lines) {
    const price = l.unitPrice ?? 0
    const grossH = Math.round(l.qty * price * 100)
    const discH = Math.round(grossH * (l.discountPct || 0) / 100)
    const netH = grossH - discH
    out.push({ id: l.id, gross: fromH(grossH), discount: fromH(discH), net: fromH(netH) })
    if (l.optional) continue
    subH += netH
    if (l.unitPrice != null) {
      if (l.unitCost == null) costKnown = false
      else costH += Math.round(l.qty * l.unitCost * 100)
    }
  }
  const qDiscH = Math.round(subH * (discountPct || 0) / 100)
  const taxableH = subH - qDiscH
  const vatH = Math.round(taxableH * (vatRate || 0) / 100)
  const marginH = costKnown ? taxableH - costH : null
  return {
    lines: out,
    subtotal: fromH(subH),
    discount: fromH(qDiscH),
    taxable: fromH(taxableH),
    vat: fromH(vatH),
    total: fromH(taxableH + vatH),
    cost: costKnown ? fromH(costH) : null,
    margin: marginH == null ? null : fromH(marginH),
    marginPct: marginH == null || taxableH === 0 ? null : Math.round((marginH / taxableH) * 1000) / 10,
  }
}

export type IssueKind =
  | 'unmatched' | 'ambiguous' | 'no_price' | 'bad_qty'
  | 'stale_price' | 'discount' | 'low_margin' | 'cost_unknown' | 'over_limit' | 'empty'

export interface Issue {
  kind: IssueKind
  /** blocking = the quote can't be prepared until someone answers; approval = a person with authority decides. */
  level: 'blocking' | 'approval'
  lineId?: string
  message: string
}

export interface Verdict {
  issues: Issue[]
  totals: QuoteTotals
  /** Every rule passed: the agent may issue the quote on its own. */
  canAutoIssue: boolean
  needsInfo: boolean
  needsApproval: boolean
}

const DAY = 86400000

export function evaluate(lines: QtLine[], discountPct: number, settings: QtSettings, now = Date.now()): Verdict {
  const issues: Issue[] = []
  const active = lines.filter((l) => !l.optional)
  if (active.length === 0) issues.push({ kind: 'empty', level: 'blocking', message: 'العرض بدون بنود' })
  for (const l of lines) {
    if (!l.productId) {
      issues.push(l.candidates?.length
        ? { kind: 'ambiguous', level: 'blocking', lineId: l.id, message: `«${l.requested}» يطابق أكثر من منتج، اختر واحدًا` }
        : { kind: 'unmatched', level: 'blocking', lineId: l.id, message: `«${l.requested}» غير موجود في الكتالوج` })
      continue
    }
    if (!(l.qty > 0)) issues.push({ kind: 'bad_qty', level: 'blocking', lineId: l.id, message: `كمية «${l.description}» غير صحيحة` })
    if (l.unitPrice == null) {
      issues.push({ kind: 'no_price', level: 'blocking', lineId: l.id, message: `«${l.description}» بدون سعر معتمد` })
      continue
    }
    if (l.priceUpdatedAt && now - new Date(l.priceUpdatedAt).getTime() > settings.priceMaxAgeDays * DAY) {
      issues.push({ kind: 'stale_price', level: 'approval', lineId: l.id, message: `سعر «${l.description}» أقدم من ${settings.priceMaxAgeDays} يومًا` })
    }
    if ((l.discountPct || 0) > settings.maxDiscountPct) {
      issues.push({ kind: 'discount', level: 'approval', lineId: l.id, message: `خصم ${l.discountPct}% على «${l.description}» أعلى من ${settings.maxDiscountPct}%` })
    }
  }
  if ((discountPct || 0) > settings.maxDiscountPct) {
    issues.push({ kind: 'discount', level: 'approval', message: `خصم العرض ${discountPct}% أعلى من ${settings.maxDiscountPct}%` })
  }
  const totals = computeTotals(lines, discountPct, settings.vatRate)
  const blocking = issues.some((i) => i.level === 'blocking')
  if (!blocking) {
    if (totals.marginPct == null) issues.push({ kind: 'cost_unknown', level: 'approval', message: 'تكلفة بعض البنود غير مسجلة، فما يمكن التحقق من الهامش' })
    else if (totals.marginPct < settings.minMarginPct) issues.push({ kind: 'low_margin', level: 'approval', message: `هامش الربح ${totals.marginPct}% أقل من الحد ${settings.minMarginPct}%` })
    if (settings.autoIssueMaxTotal != null && totals.total > settings.autoIssueMaxTotal) {
      issues.push({ kind: 'over_limit', level: 'approval', message: `قيمة العرض أعلى من حد الإصدار التلقائي (${settings.autoIssueMaxTotal.toLocaleString('en-US')})` })
    }
  }
  const needsInfo = issues.some((i) => i.level === 'blocking')
  const needsApproval = !needsInfo && issues.some((i) => i.level === 'approval')
  return { issues, totals, canAutoIssue: !needsInfo && !needsApproval, needsInfo, needsApproval }
}

export function money(n: number, currency = 'SAR') {
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency === 'SAR' ? 'ر.س' : currency}`
}

export { toH, fromH }
