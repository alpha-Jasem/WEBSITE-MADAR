export function sanitizeNameText(value: string) {
  return value
    .replace(/[^\p{L}\s.'’-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trimStart()
}

export function sanitizeDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '')
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits
}

export function sanitizeDecimalInput(value: string, maxLength = 9) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [whole = '', ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const next = decimalParts.length > 0 ? `${whole}.${decimal}` : whole
  return next.slice(0, maxLength)
}

export function toSafeNumber(value: string | number, fallback = 0, min = 0, max = 999999) {
  const numeric = typeof value === 'number' ? value : Number(sanitizeDecimalInput(value))
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}
