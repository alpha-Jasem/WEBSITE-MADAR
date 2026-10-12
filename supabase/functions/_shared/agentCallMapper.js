// Normalises Nabrah calls and ElevenLabs conversations into clinic_os_ai_calls rows.
// Plain ESM with no runtime-specific APIs so the Deno edge function
// (agent-call-webhook) and the Node backfill script share one copy.

export const INTENTS = ['new_booking', 'reschedule', 'cancellation', 'inquiry', 'follow_up', 'other']
export const RESULTS = ['booked', 'rescheduled', 'cancelled', 'referred', 'no_action', 'failed']

const NABRAH_FAILED = ['failed', 'no_answer', 'busy', 'canceled', 'cancelled']
const PHONE_FAILED = ['no_answer', 'busy', 'failed', 'voicemail']
const TRUTHY = ['true', 'yes', 'y', '1', 'نعم', 'booked', 'done', 'success', 'confirmed', 'تم']

const SUMMARY_KEYS = ['summary', 'call_summary', 'transcript_summary', 'ملخص']
const NAME_KEYS = ['caller_name', 'customer_name', 'patient_name', 'full_name', 'name', 'اسم', 'الاسم']
const INTENT_KEYS = ['intent', 'call_intent', 'reason', 'call_reason']
const BOOKED_RE = /book|appointment|reservation|حجز|موعد/i
const TRANSFER_RE = /transfer|escalat|handoff|hand_off|human|تحويل/i
const RESCHEDULE_RE = /reschedul|تأجيل|تغيير.?موعد/i
const CANCEL_RE = /cancel|إلغاء|الغاء/i
const COMPLAINT_RE = /complain|شكوى|شكوي|اشتكى|يشتكي|غير راض/i
const REFUND_RE = /refund|money.?back|return.?(request|item|product|order)|استرجاع|استرداد|إرجاع|ارجاع/i
const UNSUCCESS_KEY_RE = /^(call_)?(success|successful|succeeded|resolved|issue_resolved|goal_achieved|goal_met)$/
const UNSUCCESS_TEXT_RE = /unsuccess|unresolved|not.?resolved|failure|غير.?ناجح|لم.?تحل|لم.?يحل/i
const NEGATIVE = ['false', 'no', 'n', '0', 'failure', 'failed', 'unsuccessful', 'لا', 'فشل']
const CALLBACK_RE = /call.?back|callback|معاودة.?الاتصال|إعادة.?الاتصال|اعادة.?الاتصال|يتصل.?(عليه|علي|بي|به)|اتصال.?لاحق/i

// review_reason values; buildTicketForCall keys off them.
export const REVIEW_REASONS = {
  transfer: 'transferred to a human',
  complaint: 'customer complaint',
  refund: 'refund or return request',
  callback: 'customer asked for a call back',
  unsuccessful: 'agent marked the call unsuccessful',
}

function isNegative(v) {
  if (v === false || v === 0) return true
  if (typeof v === 'string') return NEGATIVE.includes(v.trim().toLowerCase())
  return false
}

function isTruthy(v) {
  if (v === true) return true
  if (typeof v === 'number') return v > 0
  if (typeof v === 'string') return TRUTHY.includes(v.trim().toLowerCase())
  return false
}

function str(v) {
  if (v == null) return null
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

/** Flattens {k: v}, {k: {value}} and [{name, value}] shapes into {lowercased key: value}. */
export function flattenAnalysis(src) {
  const out = {}
  if (!src) return out
  const put = (k, v) => {
    if (!k) return
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('value' in v) v = v.value
      else if ('result' in v) v = v.result
    }
    out[String(k).toLowerCase()] = v
  }
  if (Array.isArray(src)) {
    for (const item of src) if (item && typeof item === 'object') put(item.name ?? item.key ?? item.id, item.value ?? item.result)
  } else if (typeof src === 'object') {
    for (const [k, v] of Object.entries(src)) put(k, v)
  }
  return out
}

function firstKey(map, keys) {
  for (const k of keys) {
    const v = str(map[k])
    if (v) return v
  }
  return null
}

function normaliseIntent(v) {
  if (!v) return null
  const s = String(v).trim().toLowerCase()
  if (INTENTS.includes(s)) return s
  if (s === 'book_appointment' || s === 'booking' || s === 'new_appointment') return 'new_booking'
  if (s === 'cancel') return 'cancellation'
  return null
}

/**
 * Reads booking / transfer / complaint / refund / call-back flags, intent, summary and
 * caller name out of a flat analysis map. `summaryText` is also scanned, but only for
 * complaint / refund / call-back wording.
 */
export function interpretAnalysis(map, summaryText = '') {
  let booked = false
  let transferred = false
  let rescheduled = false
  let cancelled = false
  let complaint = false
  let refund = false
  let callback = false
  let unsuccessful = false
  for (const [k, v] of Object.entries(map)) {
    // e.g. {call_successful: 'no'} or {resolved: false}
    if (UNSUCCESS_KEY_RE.test(k) && isNegative(v)) unsuccessful = true
    if (!isTruthy(v)) continue
    if (TRANSFER_RE.test(k)) transferred = true
    else if (COMPLAINT_RE.test(k)) complaint = true
    else if (REFUND_RE.test(k)) refund = true
    else if (CALLBACK_RE.test(k)) callback = true
    else if (RESCHEDULE_RE.test(k)) rescheduled = true
    else if (CANCEL_RE.test(k)) cancelled = true
    else if (BOOKED_RE.test(k)) booked = true
  }
  // Analysis may also carry a categorical outcome, e.g. {outcome: 'booked'}.
  const outcome = firstKey(map, ['outcome', 'result', 'call_outcome', 'call_result'])
  if (outcome) {
    const o = outcome.toLowerCase()
    if (TRANSFER_RE.test(o) || o === 'referred') transferred = true
    else if (RESCHEDULE_RE.test(o)) rescheduled = true
    else if (CANCEL_RE.test(o)) cancelled = true
    else if (UNSUCCESS_TEXT_RE.test(o)) unsuccessful = true
    else if (o === 'booked' || BOOKED_RE.test(o)) booked = true
  }
  const summary = firstKey(map, SUMMARY_KEYS)
  const rawIntent = firstKey(map, INTENT_KEYS) || ''
  const text = [rawIntent, outcome || '', summary || '', summaryText || ''].join(' ')
  if (COMPLAINT_RE.test(text)) complaint = true
  if (REFUND_RE.test(text)) refund = true
  if (CALLBACK_RE.test(text)) callback = true
  return {
    booked,
    transferred,
    rescheduled,
    cancelled,
    complaint,
    refund,
    callback,
    unsuccessful,
    intent: normaliseIntent(rawIntent),
    summary,
    callerName: firstKey(map, NAME_KEYS),
  }
}

function mmss(totalSecs) {
  const s = Math.max(0, Math.round(Number(totalSecs) || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Shared decision table. failed beats everything; then any of transfer/escalation,
 * complaint, refund/return, call-back request or an unsuccessful evaluation sends the
 * call to review (review_reason lists every trigger, '; '-separated, in REVIEW_REASONS
 * order); otherwise it is completed.
 */
export function decideOutcome({
  failed, failReason, transferred, complaint, refund, callback, unsuccessful, booked, rescheduled, cancelled, intent,
}) {
  let status = 'completed'
  let result = 'no_action'
  let reviewReason = null
  if (failed) {
    status = 'failed'
    result = 'failed'
    reviewReason = failReason || null
  } else {
    if (transferred) result = 'referred'
    else if (booked) result = 'booked'
    else if (rescheduled) result = 'rescheduled'
    else if (cancelled) result = 'cancelled'
    const flags = { transfer: transferred, complaint, refund, callback, unsuccessful }
    const kinds = Object.keys(REVIEW_REASONS).filter((k) => flags[k])
    if (kinds.length) {
      status = 'needs_review'
      reviewReason = kinds.map((k) => REVIEW_REASONS[k]).join('; ')
    }
  }
  let finalIntent = intent
  if (!finalIntent) {
    if (complaint || refund) finalIntent = 'other'
    else if (callback) finalIntent = 'follow_up'
    else if (result === 'booked') finalIntent = 'new_booking'
    else if (result === 'rescheduled') finalIntent = 'reschedule'
    else if (result === 'cancelled') finalIntent = 'cancellation'
    else finalIntent = 'inquiry'
  }
  return { status, result, intent: finalIntent, needs_review: status === 'needs_review', review_reason: reviewReason }
}

// ─── Nabrah ─────────────────────────────────────────────────────────────────

/** The post_call_callback payload is undocumented, so accept the common id shapes. */
export function extractNabrahCallId(body) {
  if (!body || typeof body !== 'object') return null
  return str(body.call_id) || str(body.id) || str(body.call?.id) || str(body.data?.call_id)
    || str(body.data?.id) || str(body.data?.call?.id) || null
}

function nabrahTime(ts, startMs) {
  if (ts == null) return '00:00'
  if (typeof ts === 'number') return mmss(ts > 1e12 ? (ts - startMs) / 1000 : ts > 1e9 ? ts - startMs / 1000 : ts)
  const parsed = Date.parse(ts)
  if (!Number.isNaN(parsed) && startMs) return mmss((parsed - startMs) / 1000)
  if (/^\d+(\.\d+)?$/.test(String(ts))) return mmss(Number(ts))
  return '00:00'
}

export function normalizeNabrahCall(call, companyId) {
  const startIso = call.call_started_at || call.created_at || new Date().toISOString()
  const startMs = Date.parse(startIso) || 0
  const analysis = flattenAnalysis(call.analysis_results)
  const tags = Array.isArray(call.tags) ? call.tags.map((t) => String(t?.name ?? t)) : []
  const info = interpretAnalysis(analysis, tags.join(' '))
  const toolNames = Array.isArray(call.tool_logs) ? call.tool_logs.map((t) => String(t?.tool_name ?? t?.name ?? '')) : []
  // Nabrah documents queued|scheduled|in_progress|completed|no_answer|busy|failed|canceled;
  // accept hyphen/space spellings ("no-answer") and escalation/transfer/unsuccessful too.
  const status = String(call.status || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  const transferred = info.transferred || TRANSFER_RE.test(status)
    || tags.some((t) => TRANSFER_RE.test(t)) || toolNames.some((t) => TRANSFER_RE.test(t))
  const unsuccessful = info.unsuccessful || UNSUCCESS_TEXT_RE.test(status) || tags.some((t) => UNSUCCESS_TEXT_RE.test(t))

  const outcome = decideOutcome({
    failed: NABRAH_FAILED.includes(status),
    failReason: status ? `call ${status.replace(/_/g, ' ')}` : null,
    transferred,
    complaint: info.complaint,
    refund: info.refund,
    callback: info.callback,
    unsuccessful,
    booked: info.booked,
    rescheduled: info.rescheduled,
    cancelled: info.cancelled,
    intent: info.intent,
  })

  const transcript = (Array.isArray(call.transcript) ? call.transcript : [])
    .filter((t) => t && str(t.message))
    .map((t) => ({
      speaker: t.role === 'assistant' || t.role === 'agent' ? 'agent' : 'patient',
      text: String(t.message).trim(),
      time: nabrahTime(t.timestamp, startMs),
    }))

  const phone = call.call_type === 'outbound' ? call.call_to : call.call_from
  return {
    company_id: companyId,
    provider: 'nabrah',
    external_id: String(call.id),
    agent_id: call.agent_id ? String(call.agent_id) : null,
    channel: call.call_type === 'web' ? 'web' : 'phone',
    phone: str(phone) || 'unknown',
    caller_name: info.callerName,
    call_time: new Date(startMs || Date.now()).toISOString(),
    duration_seconds: Math.max(0, Math.round(Number(call.duration) || 0)),
    transcript,
    summary: info.summary,
    analysis: call.analysis_results ? { data: call.analysis_results } : null,
    ...outcome,
  }
}

// ─── ElevenLabs ─────────────────────────────────────────────────────────────

/** `data` is the post_call_transcription webhook's data object or a GET /v1/convai/conversations/{id} body. */
export function normalizeElevenLabsConversation(data, companyId) {
  const meta = data.metadata || {}
  const analysis = data.analysis || {}
  const collected = flattenAnalysis(analysis.data_collection_results)
  const evaluations = flattenAnalysis(analysis.evaluation_criteria_results)
  const info = interpretAnalysis({ ...evaluations, ...collected }, str(analysis.transcript_summary) || '')
  const turns = Array.isArray(data.transcript) ? data.transcript : []
  const toolNames = turns.flatMap((t) => (Array.isArray(t?.tool_calls) ? t.tool_calls : []).map((c) => String(c?.tool_name ?? '')))
  const transferred = info.transferred
    || toolNames.some((n) => TRANSFER_RE.test(n))
    || TRANSFER_RE.test(String(meta.termination_reason || ''))

  const phoneCall = meta.phone_call || null
  const whatsapp = meta.whatsapp || null
  const isWhatsapp = !!whatsapp || meta.conversation_initiation_source === 'whatsapp'
  const channel = isWhatsapp ? 'whatsapp' : phoneCall ? 'phone' : 'web'
  const dyn = data.conversation_initiation_client_data?.dynamic_variables || {}
  const phone = str(phoneCall?.external_number) || str(whatsapp?.whatsapp_user_id) || str(whatsapp?.phone_number)
    || str(dyn.system__caller_id) || 'unknown'

  const callResult = String(phoneCall?.call_result || '').toLowerCase().replace(/[-\s]+/g, '_')
  const status = String(data.status || '').toLowerCase()
  const failed = status === 'failed' || PHONE_FAILED.includes(callResult)

  const outcome = decideOutcome({
    failed,
    failReason: PHONE_FAILED.includes(callResult) ? `call ${callResult.replace('_', ' ')}` : status === 'failed' ? 'conversation failed' : null,
    transferred,
    complaint: info.complaint,
    refund: info.refund,
    callback: info.callback,
    unsuccessful: analysis.call_successful === 'failure' || info.unsuccessful,
    booked: info.booked,
    rescheduled: info.rescheduled,
    cancelled: info.cancelled,
    intent: info.intent,
  })

  const transcript = turns
    .filter((t) => t && str(t.message))
    .map((t) => ({
      speaker: t.role === 'agent' ? 'agent' : 'patient',
      text: String(t.message).trim(),
      time: mmss(t.time_in_call_secs),
    }))

  const startSecs = Number(meta.start_time_unix_secs)
  return {
    company_id: companyId,
    provider: 'elevenlabs',
    external_id: String(data.conversation_id),
    agent_id: data.agent_id ? String(data.agent_id) : null,
    channel,
    phone,
    caller_name: info.callerName,
    call_time: new Date(startSecs ? startSecs * 1000 : Date.now()).toISOString(),
    duration_seconds: Math.max(0, Math.round(Number(meta.call_duration_secs) || 0)),
    transcript,
    summary: str(analysis.transcript_summary) || info.summary,
    analysis: {
      call_successful: str(analysis.call_successful),
      title: str(analysis.call_summary_title),
      evaluation: analysis.evaluation_criteria_results || null,
      data: analysis.data_collection_results || null,
      termination_reason: str(meta.termination_reason),
      language: str(meta.main_language),
      success_score: typeof analysis.call_success_score === 'number' ? analysis.call_success_score : null,
      sentiment: analysis.sentiment_analysis
        ? {
          label: str(analysis.sentiment_analysis.overall_label),
          score: analysis.sentiment_analysis.overall_sentiment_score ?? null,
          frustration: analysis.sentiment_analysis.overall_frustration_score ?? null,
        }
        : null,
      cost_credits: typeof meta.cost === 'number' ? meta.cost : null,
      has_audio: data.has_audio ?? null,
      user_id: str(data.user_id),
      warnings: Array.isArray(meta.warnings) ? meta.warnings.map((w) => str(w?.message ?? w)).filter(Boolean) : [],
    },
    ...outcome,
  }
}

// ─── Tickets ────────────────────────────────────────────────────────────────

const TICKET_KIND_LABEL = {
  transfer: 'طلب التحدث مع موظف',
  complaint: 'شكوى عميل',
  refund: 'طلب استرجاع',
  callback: 'طلب معاودة الاتصال',
  unsuccessful: 'مكالمة لم تُحل',
}
const CHANNEL_LABEL = { phone: 'هاتف', web: 'ويب', whatsapp: 'واتساب' }

function shorten(text, max) {
  const first = String(text).split(/(?<=[.!?؟])\s/)[0].trim()
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first
}

/**
 * One ai_agent_support_tickets row for a call that needs a person, or null.
 * The caller sets ai_call_id (the saved call row's id). Unsuccessful calls only
 * open a ticket when the customer actually said something.
 */
export function buildTicketForCall(row) {
  if (!row || row.status !== 'needs_review') return null
  const reasons = String(row.review_reason || '').split('; ')
  const kinds = Object.keys(REVIEW_REASONS).filter((k) => reasons.includes(REVIEW_REASONS[k]))
  if (kinds.length === 0) return null
  // An unsuccessful call alone only needs a person if the customer actually asked for something.
  if (kinds.length === 1 && kinds[0] === 'unsuccessful' && !(row.transcript || []).some((t) => t.speaker === 'patient')) return null
  const highPriority = kinds.includes('complaint') || kinds.includes('refund')
  // Headline the most serious reason.
  const kind = ['complaint', 'refund', 'callback', 'transfer', 'unsuccessful'].find((k) => kinds.includes(k))

  const who = row.caller_name || (row.phone !== 'unknown' ? row.phone : null)
  const subject = row.summary
    ? shorten(row.summary, 90)
    : `${TICKET_KIND_LABEL[kind]}${who ? ` — ${who}` : ''}`
  const fields = [
    ['السبب', kinds.map((k) => TICKET_KIND_LABEL[k]).join('، ')],
    ['المتصل', row.caller_name],
    ['الهاتف', row.phone !== 'unknown' ? row.phone : null],
    ['القناة', CHANNEL_LABEL[row.channel] || row.channel],
    ['وقت المكالمة', row.call_time],
    ['المدة (ث)', row.duration_seconds],
    ['النية', row.intent],
    ['النتيجة', row.result],
    ['المزود', row.provider && row.external_id ? `${row.provider} ${row.external_id}` : row.provider],
  ].filter(([, v]) => v != null && v !== '')
  const description = [row.summary, fields.map(([k, v]) => `${k}: ${v}`).join('\n')].filter(Boolean).join('\n\n')

  return {
    company_id: row.company_id,
    subject,
    description,
    route: 'ai-receptionist',
    priority: highPriority ? 'high' : 'normal',
    status: 'open',
  }
}

/**
 * Verifies the `elevenlabs-signature` header ("t=<unix secs>,v0=<hex hmac>") over
 * `${t}.${rawBody}`, matching the official SDK's webhooks.constructEvent.
 */
export async function verifyElevenLabsSignature(rawBody, header, secret, { toleranceSecs = 30 * 60, nowMs = Date.now() } = {}) {
  if (!header || !secret) return false
  let t = null
  let sig = null
  for (const part of String(header).split(',')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === 't') t = rest.join('=')
    else if (k === 'v0') sig = rest.join('=')
  }
  if (!t || !sig || !/^\d+$/.test(t)) return false
  if (Math.abs(nowMs - Number(t) * 1000) > toleranceSecs * 1000) return false
  const subtle = (globalThis.crypto ?? (await import('node:crypto')).webcrypto).subtle
  const enc = new TextEncoder()
  const key = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`)))
  const expected = Array.from(mac).map((b) => b.toString(16).padStart(2, '0')).join('')
  return timingSafeEqual(expected, sig.toLowerCase())
}

export function timingSafeEqual(a, b) {
  a = String(a)
  b = String(b)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}
