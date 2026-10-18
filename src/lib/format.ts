// One place for number, money and date formatting in the admin: Gregorian calendar, Latin digits, Riyadh time.
export const AR_GREG = 'ar-SA-u-ca-gregory-nu-latn'
export const RIYADH = 'Asia/Riyadh'

export const nf = (n: number) => new Intl.NumberFormat(AR_GREG).format(n)
export const sar = (n: number) => `${nf(Math.round(n))} ر.س`

export function pct(part: number, whole: number) {
  return whole > 0 ? `${nf(Math.round((part / whole) * 100))}%` : '—'
}

export function dateLong(d: Date | string) {
  return new Date(d).toLocaleDateString(AR_GREG, { weekday: 'long', day: 'numeric', month: 'long', timeZone: RIYADH })
}

export function dateShort(d: Date | string) {
  return new Date(d).toLocaleDateString(AR_GREG, { day: 'numeric', month: 'short', timeZone: RIYADH })
}

export function timeShort(d: Date | string) {
  return new Date(d).toLocaleTimeString(AR_GREG, { hour: 'numeric', minute: '2-digit', timeZone: RIYADH })
}

export function greetingFor(hour: number) {
  return hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور'
}

/** YYYY-MM of a date in Riyadh time, used as the key of monthly goals. */
export function monthKey(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: RIYADH, year: 'numeric', month: '2-digit' }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)!.value
  return `${get('year')}-${get('month')}`
}

/** Start of the Riyadh calendar day containing d (as a UTC Date). */
export function riyadhDayStart(d: Date = new Date()) {
  const shifted = new Date(d.getTime() + 3 * 3600000)
  shifted.setUTCHours(0, 0, 0, 0)
  return new Date(shifted.getTime() - 3 * 3600000)
}
