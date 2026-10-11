// Offline check of the shared call mapper and webhook handler (no network, no DB):
//   node scripts/agent-calls-selfcheck.mjs
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  INTENTS, RESULTS, buildTicketForCall, extractNabrahCallId, normalizeElevenLabsConversation, normalizeNabrahCall,
  verifyElevenLabsSignature,
} from '../supabase/functions/_shared/agentCallMapper.js'
import { createAgentCallWebhook } from '../supabase/functions/_shared/agentCallWebhook.js'

const COMPANY = '00000000-0000-0000-0000-000000000001'
const STATUSES = ['completed', 'failed', 'needs_review']

function checkConstraints(row) {
  assert.ok(STATUSES.includes(row.status), `status ${row.status}`)
  assert.ok(row.intent === null || INTENTS.includes(row.intent), `intent ${row.intent}`)
  assert.ok(row.result === null || RESULTS.includes(row.result), `result ${row.result}`)
  assert.ok(['phone', 'web', 'whatsapp'].includes(row.channel), `channel ${row.channel}`)
  assert.equal(typeof row.phone, 'string')
  assert.ok(Number.isInteger(row.duration_seconds))
  assert.equal(row.needs_review, row.status === 'needs_review')
}

// Nabrah: completed inbound call where analysis says an appointment was booked.
const nabrah = normalizeNabrahCall({
  id: 'nb-123', call_started_at: '2026-10-11T08:00:00Z', call_ended_at: '2026-10-11T08:01:30Z', duration: 90.4,
  call_from: '+966500000001', call_to: '+966110000000', call_type: 'inbound', status: 'completed',
  agent_id: 'agent-nb', agent_name: 'Reception',
  transcript: [
    { role: 'assistant', message: 'أهلاً، كيف أقدر أساعدك؟', timestamp: '2026-10-11T08:00:01Z' },
    { role: 'user', message: 'أبغى أحجز موعد', timestamp: '2026-10-11T08:00:07Z' },
    { role: 'user', message: '   ', timestamp: '2026-10-11T08:00:09Z' },
  ],
  analysis_results: [{ name: 'appointment_booked', value: 'yes' }, { name: 'summary', value: 'حجز موعد كشف' }, { name: 'caller_name', value: 'سارة' }],
  tags: [],
}, COMPANY)
checkConstraints(nabrah)
assert.equal(nabrah.provider, 'nabrah')
assert.equal(nabrah.external_id, 'nb-123')
assert.equal(nabrah.phone, '+966500000001')
assert.equal(nabrah.channel, 'phone')
assert.equal(nabrah.duration_seconds, 90)
assert.equal(nabrah.status, 'completed')
assert.equal(nabrah.result, 'booked')
assert.equal(nabrah.intent, 'new_booking')
assert.equal(nabrah.summary, 'حجز موعد كشف')
assert.equal(nabrah.caller_name, 'سارة')
assert.deepEqual(nabrah.transcript.map((t) => [t.speaker, t.time]), [['agent', '00:01'], ['patient', '00:07']])

const nabrahMissed = normalizeNabrahCall({ id: 9, status: 'no_answer', call_type: 'outbound', call_to: '+966500000002', duration: 0 }, COMPANY)
checkConstraints(nabrahMissed)
assert.equal(nabrahMissed.status, 'failed')
assert.equal(nabrahMissed.result, 'failed')
assert.equal(nabrahMissed.phone, '+966500000002')
assert.equal(nabrahMissed.external_id, '9')

assert.equal(extractNabrahCallId({ call_id: 'a' }), 'a')
assert.equal(extractNabrahCallId({ call: { id: 'b' } }), 'b')
assert.equal(extractNabrahCallId({ data: { call_id: 'c' } }), 'c')
assert.equal(extractNabrahCallId({ foo: 1 }), null)

// ElevenLabs: WhatsApp conversation that ended in a transfer to a human.
const elevenEvent = {
  type: 'post_call_transcription',
  event_timestamp: 1760169600,
  data: {
    agent_id: 'agent-el', conversation_id: 'conv_abc', status: 'done',
    transcript: [
      { role: 'agent', message: 'مرحبا!', time_in_call_secs: 0 },
      { role: 'user', message: 'أبي أكلم موظف', time_in_call_secs: 4 },
      { role: 'agent', message: null, time_in_call_secs: 6, tool_calls: [{ tool_name: 'transfer_to_number', params_as_json: '{}' }] },
    ],
    metadata: {
      start_time_unix_secs: 1760169500, call_duration_secs: 65,
      whatsapp: { whatsapp_user_id: '966500000003', direction: 'inbound' },
    },
    analysis: { call_successful: 'success', transcript_summary: 'The caller asked for a human.', data_collection_results: {} },
  },
}
const eleven = normalizeElevenLabsConversation(elevenEvent.data, COMPANY)
checkConstraints(eleven)
assert.equal(eleven.provider, 'elevenlabs')
assert.equal(eleven.external_id, 'conv_abc')
assert.equal(eleven.channel, 'whatsapp')
assert.equal(eleven.phone, '966500000003')
assert.equal(eleven.call_time, new Date(1760169500 * 1000).toISOString())
assert.equal(eleven.status, 'needs_review')
assert.equal(eleven.result, 'referred')
assert.equal(eleven.intent, 'inquiry')
assert.equal(eleven.summary, 'The caller asked for a human.')
assert.equal(eleven.transcript.length, 2)
assert.equal(eleven.transcript[1].time, '00:04')

const elevenFail = normalizeElevenLabsConversation({
  conversation_id: 'conv_x', status: 'done', transcript: [],
  metadata: { start_time_unix_secs: 1760169500, call_duration_secs: 30, phone_call: { external_number: '+966500000004', direction: 'inbound' } },
  analysis: { call_successful: 'failure', data_collection_results: { booking_confirmed: { value: false } } },
}, COMPANY)
checkConstraints(elevenFail)
assert.equal(elevenFail.channel, 'phone')
assert.equal(elevenFail.status, 'needs_review')
assert.equal(elevenFail.result, 'no_action')

const elevenBooked = normalizeElevenLabsConversation({
  conversation_id: 'conv_y', status: 'done', transcript: [], metadata: { start_time_unix_secs: 1760169500, call_duration_secs: 40 },
  analysis: { call_successful: 'success', evaluation_criteria_results: { appointment_booked: { criteria_id: 'appointment_booked', result: 'success' } } },
}, COMPANY)
checkConstraints(elevenBooked)
assert.equal(elevenBooked.channel, 'web')
assert.equal(elevenBooked.phone, 'unknown')
assert.equal(elevenBooked.status, 'completed')
assert.equal(elevenBooked.result, 'booked')
assert.equal(elevenBooked.intent, 'new_booking')

// Tickets: only calls that need a person open one.
assert.equal(buildTicketForCall(nabrah), null, 'booked call opens no ticket')
assert.equal(buildTicketForCall(nabrahMissed), null, 'failed call opens no ticket')
assert.equal(buildTicketForCall(elevenBooked), null)
assert.equal(buildTicketForCall(elevenFail), null, 'unsuccessful call where the caller said nothing opens no ticket')

const transferTicket = buildTicketForCall(eleven)
assert.ok(transferTicket)
assert.equal(transferTicket.company_id, COMPANY)
assert.equal(transferTicket.priority, 'normal')
assert.equal(transferTicket.status, 'open')
assert.equal(transferTicket.route, 'ai-receptionist')
assert.equal(transferTicket.subject, 'The caller asked for a human.')
assert.match(transferTicket.description, /966500000003/)

const complaint = normalizeNabrahCall({
  id: 'nb-complaint', call_started_at: '2026-10-11T09:00:00Z', duration: 120, call_from: '+966500000005',
  call_type: 'inbound', status: 'completed', agent_id: 'agent-nb',
  transcript: [{ role: 'user', message: 'عندي شكوى على الموعد الماضي', timestamp: '2026-10-11T09:00:03Z' }],
  analysis_results: { summary: 'العميل قدّم شكوى بسبب تأخير الموعد. يطلب استرجاع المبلغ.', caller_name: 'خالد' },
}, COMPANY)
checkConstraints(complaint)
assert.equal(complaint.status, 'needs_review')
assert.equal(complaint.review_reason, 'customer complaint; refund or return request')
assert.equal(complaint.intent, 'other')
const complaintTicket = buildTicketForCall(complaint)
assert.equal(complaintTicket.priority, 'high')
assert.equal(complaintTicket.subject, 'العميل قدّم شكوى بسبب تأخير الموعد.')
assert.match(complaintTicket.description, /خالد/)

// Signature: same scheme as the ElevenLabs SDK (t=<secs>,v0=<hex hmac of `${t}.${body}`>).
const secret = 'wsec_test'
const raw = JSON.stringify(elevenEvent)
const t = Math.floor(Date.now() / 1000)
const sig = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')
assert.equal(await verifyElevenLabsSignature(raw, `t=${t},v0=${sig}`, secret), true)
assert.equal(await verifyElevenLabsSignature(raw + ' ', `t=${t},v0=${sig}`, secret), false)
assert.equal(await verifyElevenLabsSignature(raw, `t=${t},v0=${sig}`, 'other'), false)
assert.equal(await verifyElevenLabsSignature(raw, `t=${t - 3600},v0=${createHmac('sha256', secret).update(`${t - 3600}.${raw}`).digest('hex')}`, secret), false)
assert.equal(await verifyElevenLabsSignature(raw, null, secret), false)

// Multiple triggers: a transfer that is also a refund request is high priority.
const multi = normalizeNabrahCall({
  id: 'nb-multi', call_started_at: '2026-10-11T09:00:00Z', duration: 50, call_from: '+966500000006',
  call_type: 'inbound', status: 'escalated', agent_id: 'agent-nb',
  transcript: [{ role: 'user', message: 'أبي أرجع المبلغ', timestamp: '2026-10-11T09:00:03Z' }],
  analysis_results: [{ name: 'refund_requested', value: 'yes' }],
}, COMPANY)
checkConstraints(multi)
assert.equal(multi.status, 'needs_review')
assert.equal(multi.result, 'referred')
assert.equal(multi.review_reason, 'transferred to a human; refund or return request')
assert.equal(buildTicketForCall(multi).priority, 'high')

// Nabrah spellings: "no-answer" fails; analysis {call_successful: 'no'} is unsuccessful.
assert.equal(normalizeNabrahCall({ id: 'x1', status: 'no-answer' }, COMPANY).status, 'failed')
const unsuccessfulNb = normalizeNabrahCall({
  id: 'x2', status: 'completed', call_type: 'inbound', call_from: '+966500000007',
  transcript: [{ role: 'user', message: 'أبي أعرف سعر التقويم', timestamp: 3 }],
  analysis_results: { call_successful: 'no' },
}, COMPANY)
assert.equal(unsuccessfulNb.status, 'needs_review')
assert.equal(unsuccessfulNb.review_reason, 'agent marked the call unsuccessful')
assert.equal(buildTicketForCall(unsuccessfulNb).priority, 'normal')

// ─── Webhook handler end to end, against an in-memory store that enforces the
//     migration's unique indexes (provider, external_id) and (ai_call_id). ──────
function memoryStore(links) {
  const calls = new Map()
  const tickets = new Map()
  let seq = 0
  return {
    calls, tickets,
    async companyForAgent(provider, agentId) { return links[`${provider}:${agentId}`] ?? null },
    async upsertCall(row) {
      const key = `${row.provider}:${row.external_id}`
      const id = calls.get(key)?.id ?? `call-${++seq}`
      calls.set(key, { ...row, id })
      return id
    },
    async insertTicketOnce(ticket) {
      if (tickets.has(ticket.ai_call_id)) return false
      tickets.set(ticket.ai_call_id, { ...ticket, id: `t-${tickets.size + 1}` })
      return true
    },
  }
}
const ENV = { NABRAH_WEBHOOK_SECRET: 'nb_hook_secret', NABRAH_API_KEY: 'nb_test', ELEVENLABS_WEBHOOK_SECRET: secret }
const env = { get: (k) => ENV[k] }
const quiet = { warn() {}, error() {}, log() {} }
const store = memoryStore({ 'nabrah:agent-nb': COMPANY, 'elevenlabs:agent-el': COMPANY })

const NABRAH_CALLS = {
  'nb-review': {
    id: 'nb-review', call_started_at: '2026-10-11T10:00:00Z', call_ended_at: '2026-10-11T10:02:00Z', duration: 120,
    call_from: '+966500000008', call_to: '+966110000000', call_type: 'inbound', status: 'completed', agent_id: 'agent-nb',
    transcript: [
      { role: 'assistant', message: 'أهلاً بك', timestamp: '2026-10-11T10:00:01Z' },
      { role: 'user', message: 'عندي شكوى، الطبيب تأخر ساعة', timestamp: '2026-10-11T10:00:06Z' },
    ],
    analysis_results: [{ name: 'complaint', value: 'yes' }, { name: 'summary', value: 'شكوى من تأخير الطبيب ساعة كاملة.' }],
  },
  'nb-stranger': { id: 'nb-stranger', status: 'completed', agent_id: 'someone-else', transcript: [] },
}
let nabrahFetches = 0
const fakeFetch = async (url, init) => {
  nabrahFetches++
  assert.equal(init.headers['X-API-Key'], 'nb_test')
  const id = decodeURIComponent(String(url).split('/').pop())
  const call = NABRAH_CALLS[id]
  return call ? new Response(JSON.stringify(call), { status: 200 }) : new Response('{}', { status: 404 })
}
const handle = createAgentCallWebhook({ env, store, fetchImpl: fakeFetch, log: quiet })
const BASE = 'https://example.supabase.co/functions/v1/agent-call-webhook'
const nabrahPost = (body, hdrSecret = 'nb_hook_secret') => handle(new Request(`${BASE}?provider=nabrah`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Madar-Secret': hdrSecret }, body: JSON.stringify(body),
}))
function signedElevenLabs(event, { tsOffset = 0, key = secret } = {}) {
  const body = JSON.stringify(event)
  const ts = Math.floor(Date.now() / 1000) + tsOffset
  const v0 = createHmac('sha256', key).update(`${ts}.${body}`).digest('hex')
  return handle(new Request(`${BASE}?provider=elevenlabs`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'elevenlabs-signature': `t=${ts},v0=${v0}` }, body,
  }))
}

// Nabrah call -> needs_review + one high-priority ticket.
let r = await nabrahPost({ call_id: 'nb-review' })
let j = await r.json()
assert.equal(r.status, 200, JSON.stringify(j))
assert.equal(j.ticket, 'opened')
assert.equal(store.calls.size, 1)
const reviewRow = store.calls.get('nabrah:nb-review')
checkConstraints(reviewRow)
assert.equal(reviewRow.status, 'needs_review')
assert.equal(reviewRow.review_reason, 'customer complaint')
assert.equal(reviewRow.phone, '+966500000008')
assert.equal(store.tickets.size, 1)
const t1 = store.tickets.get(reviewRow.id)
assert.equal(t1.priority, 'high')
assert.equal(t1.status, 'open')
assert.equal(t1.subject, 'شكوى من تأخير الطبيب ساعة كاملة.')
assert.equal(t1.ai_call_id, reviewRow.id)

// Duplicate delivery (Nabrah retry, plus post_analysis_callback with another body shape):
// same row, same single ticket, and a ticket staff already moved on is left alone.
t1.status = 'in_progress'
for (const body of [{ call_id: 'nb-review' }, { data: { call: { id: 'nb-review' } } }]) {
  r = await nabrahPost(body)
  j = await r.json()
  assert.equal(r.status, 200)
  assert.equal(j.ticket, 'exists')
  assert.equal(j.call_id, reviewRow.id)
}
assert.equal(store.calls.size, 1)
assert.equal(store.tickets.size, 1)
assert.equal(store.tickets.get(reviewRow.id).status, 'in_progress')

// Nabrah auth / unknown agent / unknown call / no id.
const fetchesBefore = nabrahFetches
assert.equal((await nabrahPost({ call_id: 'nb-review' }, 'wrong')).status, 401)
assert.equal(nabrahFetches, fetchesBefore, 'no Nabrah API call before auth')
r = await nabrahPost({ call_id: 'nb-stranger' })
assert.equal(r.status, 202)
assert.equal((await r.json()).skipped, 'unknown agent')
assert.equal((await nabrahPost({ call_id: 'nb-missing' })).status, 202)
assert.equal((await nabrahPost({ hello: 1 })).status, 400)
assert.equal(store.calls.size, 1)

// ElevenLabs post_call_transcription -> completed, no ticket.
const elCompleted = {
  type: 'post_call_transcription', event_timestamp: Math.floor(Date.now() / 1000),
  data: {
    agent_id: 'agent-el', conversation_id: 'conv_done', status: 'done',
    transcript: [
      { role: 'agent', message: 'Hi, Noor Dental, how can I help?', time_in_call_secs: 0 },
      { role: 'user', message: 'What time do you open on Saturday?', time_in_call_secs: 3 },
      { role: 'agent', message: 'We open at 9am.', time_in_call_secs: 6 },
    ],
    metadata: { start_time_unix_secs: 1760169500, call_duration_secs: 22, phone_call: { external_number: '+966500000009', direction: 'inbound', type: 'twilio' } },
    analysis: { call_successful: 'success', transcript_summary: 'Caller asked about Saturday opening hours.', data_collection_results: {}, evaluation_criteria_results: {} },
  },
}
r = await signedElevenLabs(elCompleted)
j = await r.json()
assert.equal(r.status, 200, JSON.stringify(j))
assert.equal(j.ticket, 'none')
const elRow = store.calls.get('elevenlabs:conv_done')
checkConstraints(elRow)
assert.equal(elRow.status, 'completed')
assert.equal(elRow.result, 'no_action')
assert.equal(elRow.intent, 'inquiry')
assert.equal(elRow.channel, 'phone')
assert.equal(elRow.phone, '+966500000009')
assert.deepEqual(elRow.transcript.map((x) => x.speaker), ['agent', 'patient', 'agent'])
// Duplicate ElevenLabs delivery -> still one row.
assert.equal((await signedElevenLabs(elCompleted)).status, 200)
assert.equal(store.calls.size, 2)
// Wrong secret, stale timestamp, missing header, other event types, unknown agent, bad provider/method.
assert.equal((await signedElevenLabs(elCompleted, { key: 'nope' })).status, 401)
assert.equal((await signedElevenLabs(elCompleted, { tsOffset: -31 * 60 })).status, 401)
assert.equal((await handle(new Request(`${BASE}?provider=elevenlabs`, { method: 'POST', body: '{}' }))).status, 401)
r = await signedElevenLabs({ type: 'post_call_audio', data: { agent_id: 'agent-el', conversation_id: 'conv_done', full_audio: '' } })
assert.equal((await r.json()).ignored, 'post_call_audio')
r = await signedElevenLabs({ ...elCompleted, data: { ...elCompleted.data, agent_id: 'agent-other', conversation_id: 'conv_other' } })
assert.equal(r.status, 202)
assert.equal(store.calls.size, 2)
assert.equal(store.tickets.size, 1)
assert.equal((await handle(new Request(`${BASE}?provider=vapi`, { method: 'POST', body: '{}' }))).status, 400)
assert.equal((await handle(new Request(`${BASE}?provider=nabrah`))).status, 405)

console.log('agent call mapper + webhook self-check passed')

