// Every time in the dashboard is shown in Saudi time (Riyadh/Jeddah, UTC+3, no daylight saving),
// whatever the viewer's device clock is set to.

export const SAUDI_TZ = 'Asia/Riyadh'
const OFFSET_MS = 3 * 3600_000

/** yyyy-mm-dd of the Saudi calendar day the instant falls on. */
export function saudiDayKey(d: Date | number | string): string {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: SAUDI_TZ })
}

/** Hour of day (0-23) in Saudi time. */
export function saudiHour(d: Date | number | string): number {
  const h = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: SAUDI_TZ }).format(new Date(d))
  return Number(h) % 24
}

/** Midnight (Saudi time) that starts the Saudi day containing the instant, as epoch ms. */
export function saudiStartOfDay(d: Date | number | string = Date.now()): number {
  const t = new Date(d).getTime()
  return Math.floor((t + OFFSET_MS) / 86_400_000) * 86_400_000 - OFFSET_MS
}
