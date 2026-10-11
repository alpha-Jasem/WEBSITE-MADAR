// Request handling for the agent-call-webhook edge function, kept free of Deno and
// supabase-js so the Node self-check can drive it with fake storage and a fake fetch.
//
//   createAgentCallWebhook({ env, store, fetchImpl, log }) -> (req: Request) => Promise<Response>
//
//   env.get(name)                          reads NABRAH_WEBHOOK_SECRET, NABRAH_API_KEY, ELEVENLABS_WEBHOOK_SECRET
//   store.companyForAgent(provider, id)    -> company uuid | null   (agent_links)
//   store.upsertCall(row)                  -> call row id           (upsert on provider,external_id)
//   store.insertTicketOnce(ticket)         -> true if inserted, false if the call already had one

import {
  buildTicketForCall,
  extractNabrahCallId,
  normalizeElevenLabsConversation,
  normalizeNabrahCall,
  timingSafeEqual,
  verifyElevenLabsSignature,
} from './agentCallMapper.js'

export const NABRAH_SECRET_HEADER = 'x-madar-secret'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Upserts the call, then opens at most one ticket for it. Shared with tests. */
export async function ingestCall(store, row) {
  const callId = await store.upsertCall(row)
  const ticket = buildTicketForCall(row)
  if (!ticket) return { call_id: callId, ticket: 'none' }
  const inserted = await store.insertTicketOnce({ ...ticket, ai_call_id: callId })
  return { call_id: callId, ticket: inserted ? 'opened' : 'exists' }
}

export function createAgentCallWebhook({ env, store, fetchImpl = fetch, log = console }) {
  async function handleNabrah(req, url) {
    const secret = env.get('NABRAH_WEBHOOK_SECRET')
    const apiKey = env.get('NABRAH_API_KEY')
    if (!secret || !apiKey) return json({ error: 'server misconfigured' }, 500)
    if (!timingSafeEqual(req.headers.get(NABRAH_SECRET_HEADER) ?? '', secret)) return json({ error: 'unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const callId = extractNabrahCallId(body) || url.searchParams.get('call_id')
    if (!callId) {
      log.warn('nabrah webhook without a call id:', JSON.stringify(body)?.slice(0, 500))
      return json({ error: 'missing call id' }, 400)
    }

    const res = await fetchImpl(`https://api.nabrah.ai/api/ext/call/${encodeURIComponent(callId)}`, {
      headers: { 'X-API-Key': apiKey },
    })
    if (!res.ok) {
      log.error('nabrah call fetch failed:', res.status, callId)
      // 404: nothing to retry. Anything else: let Nabrah retry.
      return res.status === 404 ? json({ skipped: 'call not found' }, 202) : json({ error: 'could not fetch call' }, 502)
    }
    const call = await res.json()

    const agentId = call?.agent_id != null ? String(call.agent_id) : null
    const companyId = agentId ? await store.companyForAgent('nabrah', agentId) : null
    if (!companyId) {
      log.warn('nabrah call from unlinked agent, skipped:', agentId, callId)
      return json({ skipped: 'unknown agent', agent_id: agentId }, 202)
    }

    const saved = await ingestCall(store, normalizeNabrahCall(call, companyId))
    return json({ ok: true, nabrah_call_id: String(call.id ?? callId), ...saved })
  }

  async function handleElevenLabs(req) {
    const secret = env.get('ELEVENLABS_WEBHOOK_SECRET')
    if (!secret) return json({ error: 'server misconfigured' }, 500)

    const raw = await req.text()
    const valid = await verifyElevenLabsSignature(raw, req.headers.get('elevenlabs-signature'), secret)
    if (!valid) return json({ error: 'invalid signature' }, 401)

    let event
    try {
      event = JSON.parse(raw)
    } catch {
      return json({ error: 'invalid json' }, 400)
    }
    if (event?.type !== 'post_call_transcription') return json({ ignored: event?.type ?? 'unknown' })
    const data = event.data ?? {}
    if (!data.conversation_id) return json({ error: 'missing conversation_id' }, 400)

    const agentId = data.agent_id != null ? String(data.agent_id) : null
    const companyId = agentId ? await store.companyForAgent('elevenlabs', agentId) : null
    if (!companyId) {
      log.warn('elevenlabs conversation from unlinked agent, skipped:', agentId, data.conversation_id)
      return json({ skipped: 'unknown agent', agent_id: agentId }, 202)
    }

    const saved = await ingestCall(store, normalizeElevenLabsConversation(data, companyId))
    return json({ ok: true, conversation_id: data.conversation_id, ...saved })
  }

  return async function handle(req) {
    if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
    const url = new URL(req.url)
    const provider = url.searchParams.get('provider')
    try {
      if (provider === 'nabrah') return await handleNabrah(req, url)
      if (provider === 'elevenlabs') return await handleElevenLabs(req)
      return json({ error: 'unknown provider' }, 400)
    } catch (e) {
      log.error(`agent-call-webhook (${provider}) failed:`, e)
      return json({ error: 'internal error' }, 500)
    }
  }
}
