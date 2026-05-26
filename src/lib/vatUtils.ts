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
  if (!taxEnabled) {
    return { subtotal: price, vat_amount: 0, total_amount: price }
  }
  if (priceIncludesVAT) {
    const subtotal = price / (1 + vatRate / 100)
    return { subtotal, vat_amount: price - subtotal, total_amount: price }
  }
  const vat_amount = (price * vatRate) / 100
  return { subtotal: price, vat_amount, total_amount: price + vat_amount }
}

export function formatVATLabel(vatRate: number): string {
  return `ضريبة القيمة المضافة ${vatRate}%`
}
