/** Normalize any Saudi phone number to 966XXXXXXXXX format */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('966')) return digits
  if (digits.startsWith('0')) return `966${digits.slice(1)}`
  return `966${digits}`
}

/** Display phone as 05XXXXXXXX (10-digit local format) */
export function displayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('966')) return `0${digits.slice(3)}`
  if (digits.startsWith('0')) return digits
  return digits
}
