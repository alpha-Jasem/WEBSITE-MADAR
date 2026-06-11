export interface VATResult {
  subtotal: number
  vat_amount: number
  total_amount: number
}

export function calcVAT(
  price: number,
  taxEnabled: boolean,
  vatRate: number,
  priceIncludesVAT: boolean
): VATResult {
  const safePrice = Math.max(0, price)
  const safeRate  = Math.max(0, Math.min(100, vatRate))
  if (!taxEnabled) {
    return { subtotal: safePrice, vat_amount: 0, total_amount: safePrice }
  }
  if (priceIncludesVAT) {
    const subtotal = safePrice / (1 + safeRate / 100)
    return { subtotal, vat_amount: safePrice - subtotal, total_amount: safePrice }
  }
  const vat_amount = (safePrice * safeRate) / 100
  return { subtotal: safePrice, vat_amount, total_amount: safePrice + vat_amount }
}

export function formatVATLabel(vatRate: number): string {
  return `ضريبة القيمة المضافة ${vatRate}%`
}
