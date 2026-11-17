import { normalizePhone } from './callAnalysis'

// WhatsApp campaigns: a one-off send or a journey (several templates spaced by days), to people picked
// from segments and typed numbers. The people are fixed when the campaign is scheduled. Sending runs on
// the server (campaigns-runner); this file holds the shared shapes and the numbers the page shows.

export interface CampaignStep {
  template_id: string
  /** One value per {{n}} in the template; {name} becomes each person's name. */
  params: string[]
  /** Days after the previous step; the first step ignores it. */
  delay_days: number
}

export interface Recipient { key: string; phone: string; name: string }

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'done' | 'cancelled'

export interface Campaign {
  id: string
  name: string
  kind: 'once' | 'journey'
  status: CampaignStatus
  segment_ids: string[]
  recipients: Recipient[]
  steps: CampaignStep[]
  /** Journeys: someone who writes back gets no further steps. */
  stop_on_reply: boolean
  scheduled_at: string | null
  finished_at: string | null
  created_by_name: string | null
  created_at: string
}

/** One send of a campaign step to one person (a row of outreach_messages). */
export interface CampaignMessage { campaign_id: string; step: number; to_phone: string; status: 'sent' | 'failed'; created_at: string }

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'مسودة', scheduled: 'مجدولة', running: 'قيد الإرسال', paused: 'موقوفة', done: 'اكتملت', cancelled: 'ملغاة',
}

/** Placeholder values with {name} filled for one person. */
export function stepParams(step: CampaignStep, name: string): string[] {
  return step.params.map((p) => p.split('{name}').join(name || 'عميلنا'))
}

export interface StepStats { sent: number; failed: number }
export interface CampaignStats {
  recipients: number
  steps: StepStats[]
  /** People who got at least one message. */
  reached: number
  /** People who wrote to us after their first message. */
  replied: number
  /** replied / reached, 0–100, or null before anything was sent. */
  replyRate: number | null
  /** Sends still to go (not yet sent or failed). */
  pending: number
}

/**
 * Numbers for one campaign. `contactTimes` maps a normalised phone to the times that person wrote to us
 * (their conversations), used for replies.
 */
export function campaignStats(c: Pick<Campaign, 'id' | 'recipients' | 'steps'>, messages: CampaignMessage[], contactTimes: Map<string, string[]>): CampaignStats {
  const mine = messages.filter((m) => m.campaign_id === c.id)
  const steps: StepStats[] = c.steps.map(() => ({ sent: 0, failed: 0 }))
  const firstSent = new Map<string, string>()
  const done = new Set<string>()
  for (const m of mine) {
    const s = steps[m.step]
    if (!s) continue
    const p = normalizePhone(m.to_phone)
    done.add(`${m.step}:${p}`)
    if (m.status === 'sent') {
      s.sent++
      const prev = firstSent.get(p)
      if (!prev || m.created_at < prev) firstSent.set(p, m.created_at)
    } else s.failed++
  }
  let replied = 0
  for (const [p, at] of firstSent) if ((contactTimes.get(p) || []).some((t) => t > at)) replied++
  const reached = firstSent.size
  const pending = Math.max(0, c.recipients.length * c.steps.length - done.size)
  return { recipients: c.recipients.length, steps, reached, replied, replyRate: reached ? Math.round((replied / reached) * 100) : null, pending }
}

/** Sends per day over the last `days` days (Saudi calendar days), oldest first, for the activity chart. */
export function sendsPerDay(messages: CampaignMessage[], days: number, now = Date.now()): { day: string; sent: number; failed: number }[] {
  const key = (ms: number) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 10)
  const out = new Map<string, { day: string; sent: number; failed: number }>()
  for (let i = days - 1; i >= 0; i--) { const d = key(now - i * 86_400_000); out.set(d, { day: d, sent: 0, failed: 0 }) }
  for (const m of messages) {
    const row = out.get(key(Date.parse(m.created_at)))
    if (row) row[m.status === 'sent' ? 'sent' : 'failed']++
  }
  return [...out.values()]
}

/** Unique recipients with a valid-looking number, keyed by normalised phone. */
export function dedupeRecipients(list: { phone: string; name?: string }[]): Recipient[] {
  const out = new Map<string, Recipient>()
  for (const r of list) {
    const key = normalizePhone(r.phone)
    // Loose on purpose: the sender checks each number and logs the bad ones as failed.
    if (!/^\d{7,15}$/.test(key)) continue
    if (!out.has(key)) out.set(key, { key, phone: r.phone, name: (r.name || '').trim() })
  }
  return [...out.values()]
}

/** Typed numbers, one per line: «0501234567» or «الاسم، 0501234567». */
export function parseTyped(text: string): { phone: string; name: string }[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [a, b] = l.split(/[,،\t]/).map((x) => x.trim())
    return b ? { name: a, phone: b } : { name: '', phone: a }
  })
}
