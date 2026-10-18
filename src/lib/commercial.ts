// Pure commercial rules: quote totals, margin, bank-notice parsing and marketer commission.

const round2 = (n: number) => Math.round(n * 100) / 100

export interface QuoteInput { setup_net: number; monthly_net: number; discount_pct: number; vat_rate: number }

/** First-invoice totals: (setup + first month) minus the discount, then VAT once on the discounted net. */
export function computeQuote(q: QuoteInput) {
  const net = round2((q.setup_net + q.monthly_net) * (1 - q.discount_pct / 100))
  const tax = round2((net * q.vat_rate) / 100)
  return { net_total: net, tax_total: tax, grand_total: round2(net + tax) }
}

/** Why a quote needs the owner's exception, if at all. Empty list means it is inside the agent's limits. */
export function quoteExceptions(q: { discount_pct: number; net_total: number }, limits: { max_discount_pct: number | null; min_price: number | null }) {
  const out: string[] = []
  if (limits.max_discount_pct !== null && q.discount_pct > limits.max_discount_pct) out.push(`الخصم ${q.discount_pct}% أعلى من الحد ${limits.max_discount_pct}%`)
  if (limits.min_price !== null && q.net_total < limits.min_price) out.push(`الصافي أقل من الحد الأدنى للسعر`)
  return out
}

/** Margin on net revenue. Returns null (not 0) when costs are unknown so a missing cost never looks like a 100% margin. */
export function marginPct(netRevenue: number, knownCosts: number | null) {
  if (knownCosts === null || netRevenue <= 0) return null
  return Math.round(((netRevenue - knownCosts) / netRevenue) * 1000) / 10
}

export interface ParsedNotice { amount: number | null; reference: string; currency: string }

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const toLatin = (s: string) => s.replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d))).replace(/٫/g, '.').replace(/٬/g, ',')

/** Best-effort read of a bank transfer notice. The owner reviews every field; nothing here confirms a payment. */
export function parseBankNotice(raw: string): ParsedNotice {
  const text = toLatin(raw)
  const amountMatch =
    text.match(/(?:SAR|SR|ر\.?\s?س|ريال)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i) ||
    text.match(/([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:SAR|SR|ر\.?\s?س|ريال)/i) ||
    text.match(/(?:amount|المبلغ)\s*[:：]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i)
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : null
  const refMatch = text.match(/(?:ref(?:erence)?(?:\s*no\.?)?|رقم\s*المرجع|المرجع|مرجع)\s*[:：#]?\s*([A-Za-z0-9\-]{5,})/i)
  return { amount: amount && amount > 0 ? amount : null, reference: refMatch ? refMatch[1] : '', currency: 'SAR' }
}

export interface CommissionRule { type?: 'percent' | 'fixed'; value?: number; hold_days?: number }

/** Commission on the confirmed net amount (before VAT). No approved rule means no commission, never a guessed one. */
export function commissionFor(netCollected: number, rule: CommissionRule | null | undefined) {
  if (!rule || !rule.type || !(Number(rule.value) > 0) || netCollected <= 0) return null
  const amount = rule.type === 'percent' ? round2((netCollected * Number(rule.value)) / 100) : round2(Number(rule.value))
  return { amount, base: round2(netCollected), rate_pct: rule.type === 'percent' ? Number(rule.value) : null, hold_days: rule.hold_days ?? 14 }
}

/** Standard onboarding checklist for a service: working steps plus the gates that must pass before live. */
export function onboardingTemplate(serviceCode: string, serviceName: string) {
  const steps = [
    { title: `جمع متطلبات ${serviceName}`, kind: 'step' as const, assignee: 'client' as const, required_input: 'معلومات الشركة والملفات المطلوبة' },
    { title: `تجهيز ${serviceName}`, kind: 'step' as const, assignee: 'owner' as const, required_input: '' },
  ]
  const gates = [
    { title: `ربط ${serviceName} بالأنظمة المطلوبة`, kind: 'gate' as const, assignee: 'owner' as const, required_input: '' },
    { title: `اختبار ${serviceName} في بيئة التجربة`, kind: 'gate' as const, assignee: 'owner' as const, required_input: '' },
    { title: `اعتماد العميل لإطلاق ${serviceName}`, kind: 'gate' as const, assignee: 'client' as const, required_input: '' },
  ]
  return [...steps, ...gates].map(i => ({ ...i, service_code: serviceCode }))
}
