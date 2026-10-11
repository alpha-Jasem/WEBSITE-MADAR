// Backfills clinic_os_ai_calls from Nabrah and ElevenLabs call history for every
// agent listed in public.agent_links. Idempotent: rows upsert on (provider, external_id).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NABRAH_API_KEY and/or ELEVENLABS_API_KEY
// Usage: node scripts/backfill-agent-calls.mjs [--provider=nabrah|elevenlabs] [--since=2026-09-01] [--dry-run] [--no-tickets]
// Calls that need a person also open one support ticket each (as the webhook does) unless --no-tickets.

import {
  buildTicketForCall, normalizeElevenLabsConversation, normalizeNabrahCall,
} from '../supabase/functions/_shared/agentCallMapper.js'

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const DRY = !!args['dry-run']
const TICKETS = !args['no-tickets']
const ONLY = args.provider || null
const SINCE = args.since ? new Date(args.since) : null
if (SINCE && Number.isNaN(SINCE.getTime())) throw new Error(`bad --since: ${args.since}`)

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NABRAH_API_KEY, ELEVENLABS_API_KEY } = process.env
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

async function getJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url} -> ${res.status} ${(await res.text()).slice(0, 300)}`)
  return res.json()
}

let ticketCount = 0

async function upsertRows(rows) {
  if (rows.length === 0) return
  if (DRY) {
    for (const r of rows) {
      const ticket = TICKETS ? buildTicketForCall(r) : null
      console.log(JSON.stringify({ ...r, transcript: `[${r.transcript.length} lines]`, ticket: ticket ? `${ticket.priority}: ${ticket.subject}` : null }))
    }
    return
  }
  const saved = await getJson(`${SUPABASE_URL}/rest/v1/clinic_os_ai_calls?on_conflict=provider,external_id&select=id,provider,external_id`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  })
  if (!TICKETS) return
  const idByKey = new Map(saved.map((s) => [`${s.provider}:${s.external_id}`, s.id]))
  const tickets = rows
    .map((r) => {
      const ticket = buildTicketForCall(r)
      const id = idByKey.get(`${r.provider}:${r.external_id}`)
      return ticket && id ? { ...ticket, ai_call_id: id } : null
    })
    .filter(Boolean)
  if (tickets.length === 0) return
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ai_agent_support_tickets?on_conflict=ai_call_id`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(tickets),
  })
  if (!res.ok) throw new Error(`ticket insert failed: ${res.status} ${(await res.text()).slice(0, 500)}`)
  ticketCount += tickets.length
}

async function backfillNabrah(link) {
  const base = 'https://api.nabrah.ai/api/ext'
  const headers = { 'X-API-Key': NABRAH_API_KEY, 'Content-Type': 'application/json' }
  const limit = 50
  let offset = 0
  let total = 0
  for (;;) {
    const body = { agent_id: link.agent_id, limit, offset }
    if (SINCE) body.call_started_at_start = SINCE.toISOString()
    const page = await getJson(`${base}/call/search`, { method: 'POST', headers, body: JSON.stringify(body) })
    const calls = page.calls || []
    const rows = []
    for (const c of calls) {
      // Search results are summaries; the single-call record carries transcript + analysis_results.
      const full = await getJson(`${base}/call/${encodeURIComponent(c.id)}`, { headers })
      rows.push(normalizeNabrahCall(full, link.company_id))
    }
    await upsertRows(rows)
    total += rows.length
    offset += calls.length
    if (calls.length < limit || (page.total_count != null && offset >= page.total_count)) break
  }
  return total
}

async function backfillElevenLabs(link) {
  const base = 'https://api.elevenlabs.io/v1/convai/conversations'
  const headers = { 'xi-api-key': ELEVENLABS_API_KEY }
  let cursor = null
  let total = 0
  for (;;) {
    const qs = new URLSearchParams({ agent_id: link.agent_id, page_size: '100' })
    if (cursor) qs.set('cursor', cursor)
    if (SINCE) qs.set('call_start_after_unix', String(Math.floor(SINCE.getTime() / 1000)))
    const page = await getJson(`${base}?${qs}`, { headers })
    const rows = []
    for (const s of page.conversations || []) {
      const full = await getJson(`${base}/${encodeURIComponent(s.conversation_id)}`, { headers })
      rows.push(normalizeElevenLabsConversation(full, link.company_id))
    }
    await upsertRows(rows)
    total += rows.length
    if (!page.has_more || !page.next_cursor) break
    cursor = page.next_cursor
  }
  return total
}

const links = await getJson(`${SUPABASE_URL}/rest/v1/agent_links?select=provider,agent_id,company_id,label`, { headers: sbHeaders })
if (links.length === 0) console.warn('agent_links is empty: nothing to backfill')

for (const link of links) {
  if (ONLY && link.provider !== ONLY) continue
  const name = `${link.provider}:${link.agent_id}${link.label ? ` (${link.label})` : ''}`
  try {
    if (link.provider === 'nabrah') {
      if (!NABRAH_API_KEY) { console.warn(`skip ${name}: NABRAH_API_KEY not set`); continue }
      console.log(`${name}: ${await backfillNabrah(link)} calls${DRY ? ' (dry run)' : ''}`)
    } else if (link.provider === 'elevenlabs') {
      if (!ELEVENLABS_API_KEY) { console.warn(`skip ${name}: ELEVENLABS_API_KEY not set`); continue }
      console.log(`${name}: ${await backfillElevenLabs(link)} conversations${DRY ? ' (dry run)' : ''}`)
    }
  } catch (e) {
    console.error(`${name} failed:`, e.message)
    process.exitCode = 1
  }
}
if (TICKETS && !DRY) console.log(`tickets offered: ${ticketCount} (existing ones for the same call are left unchanged)`)
