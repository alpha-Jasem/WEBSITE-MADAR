// A company's voice usage for the current month, counted from its own agents' calls on the voice platform,
// and written to clinic_os_usage so every open dashboard moves through realtime.
// The platform's own usage endpoint covers the whole workspace (every client) and is cached for an hour, so it
// is not used here: minutes are summed per call (rounded up) over the company's linked agents only.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API = 'https://api.nabrah.ai/api/ext'
const DEFAULT_LIMIT_MINUTES = 300 // the AI Pro plan's included minutes, used until an admin sets the company's own limit
const PAGE = 50
const MAX_PAGES = 20

export interface VoiceUsage { minutes: number; calls: number; limit: number; cycle_start: string; cycle_end: string }

/** The first and last day of the current month in Riyadh (UTC+3), as YYYY-MM-DD. */
function monthBounds(now = new Date()) {
  const r = new Date(now.getTime() + 3 * 3600_000)
  const y = r.getUTCFullYear(), m = r.getUTCMonth()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(new Date(Date.UTC(y, m, 1))), end: iso(new Date(Date.UTC(y, m + 1, 0))), startUtc: new Date(Date.UTC(y, m, 1) - 3 * 3600_000).toISOString() }
}

export async function recomputeVoiceUsage(db: SupabaseClient, nabrahKey: string, companyId: string): Promise<VoiceUsage | null> {
  const { data: links } = await db.from('agent_links').select('agent_id').eq('company_id', companyId).eq('provider', 'nabrah')
  if (!links?.length) return null
  const { start, end, startUtc } = monthBounds()

  let minutes = 0
  let calls = 0
  for (const l of links as { agent_id: string }[]) {
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetch(`${API}/call/search`, {
        method: 'POST', headers: { 'X-API-Key': nabrahKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: l.agent_id, limit: PAGE, offset: page * PAGE, created_at_start: startUtc }),
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`calls ${res.status}`)
      const out = await res.json().catch(() => ({}))
      const list: { duration?: number }[] = Array.isArray(out) ? out : out?.calls ?? []
      for (const c of list) { calls++; minutes += Math.ceil((Number(c.duration) || 0) / 60) }
      if (list.length < PAGE) break
    }
  }

  const { data: lim } = await db.from('clinic_os_usage_limits').select('smart_call_minutes_limit, extra_smart_call_minutes').eq('company_id', companyId).maybeSingle()
  const limit = (Number(lim?.smart_call_minutes_limit) || 0) + (Number(lim?.extra_smart_call_minutes) || 0) || DEFAULT_LIMIT_MINUTES

  // Only write when the number changed, so a quiet account does not cause a stream of realtime events.
  const { data: cur } = await db.from('clinic_os_usage').select('smart_call_minutes_used').eq('company_id', companyId).eq('cycle_start', start).maybeSingle()
  if (!cur || Number(cur.smart_call_minutes_used) !== minutes) {
    await db.from('clinic_os_usage').upsert({ company_id: companyId, cycle_start: start, cycle_end: end, smart_call_minutes_used: minutes, updated_at: new Date().toISOString() }, { onConflict: 'company_id,cycle_start' })
  }
  return { minutes, calls, limit, cycle_start: start, cycle_end: end }
}
