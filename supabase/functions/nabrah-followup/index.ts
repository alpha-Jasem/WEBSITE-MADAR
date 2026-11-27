// The voice platform's post-analysis callback: after each analysed call, sends the agent's WhatsApp
// follow-ups whose conditions match, from the company's own number through Meta's Cloud API.
//   POST { call_details: "<JSON string>" }   Header X-Madar-Secret: followupSecret(service role key, company); the key itself never leaves the server
// The nabrah-agent function sets this callback on the agent when a follow-up is saved.
// One send per follow-up per call (unique row in agent_followup_sends), so a repeat callback sends nothing.
// Deploy with --no-verify-jwt: the voice platform cannot send a Supabase JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { recomputeVoiceUsage } from '../_shared/voice-usage.ts'
import { conditionsMet, customerNumber, flattenAnalysis, followupSecret, renderParam, waNumber, type FollowupCall } from '../_shared/followup.ts'

const GRAPH = 'https://graph.facebook.com/v21.0'
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405)
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim()
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret || !url || !serviceKey) return json({ ok: false, error: 'server misconfigured' }, 500)
  const body = await req.json().catch(() => ({}))
  let call: FollowupCall & { agent_id?: string }
  try { call = typeof body?.call_details === 'string' ? JSON.parse(body.call_details) : body?.call_details ?? {} }
  catch { return json({ ok: false, error: 'bad call_details' }, 400) }
  const agentId = String(call?.agent_id ?? '')
  const callId = String(call?.id ?? '')
  if (!agentId || !callId) return json({ ok: false, error: 'bad request' }, 400)

  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: link } = await db.from('agent_links').select('company_id').eq('provider', 'nabrah').eq('agent_id', agentId).maybeSingle()
  if (!link) return json({ ok: false, error: 'unauthorized' }, 401)
  const companyId = link.company_id as string
  // The header must be this company's value (see followupSecret), not just any company's.
  if (!same(req.headers.get('x-madar-secret') ?? '', await followupSecret(secret, companyId))) return json({ ok: false, error: 'unauthorized' }, 401)

  // Every analysed call also moves the company's live usage (best effort; the dashboard re-counts on its own too).
  const nabrahKey = Deno.env.get('NABRAH_API_KEY')?.trim()
  if (nabrahKey) await recomputeVoiceUsage(db, nabrahKey, companyId).catch(() => null)

  const { data: rules } = await db.from('agent_followups').select('id, template_id, params, recipient, conditions')
    .eq('company_id', companyId).eq('agent_id', agentId).eq('enabled', true)
  if (!rules?.length) return json({ ok: true, sent: 0 })

  const analysis = flattenAnalysis(call.analysis_results)
  const due = rules.filter((r) => conditionsMet((r.conditions ?? []) as string[], analysis))
  if (!due.length) return json({ ok: true, sent: 0 })

  // The sender: the company's Meta token and its connected number (else the first number on its WhatsApp Business Account).
  const { data: acc } = await db.from('whatsapp_cloud_accounts').select('access_token, waba_id, phone_number_id').eq('company_id', companyId).maybeSingle()
  let phoneNumberId: string | null = acc?.phone_number_id ?? null
  if (!phoneNumberId && acc?.access_token && acc?.waba_id) {
    const r = await fetch(`${GRAPH}/${acc.waba_id}/phone_numbers?fields=id`, { headers: { Authorization: `Bearer ${acc.access_token}` } })
    phoneNumberId = r.ok ? (await r.json().catch(() => ({})))?.data?.[0]?.id ?? null : null
  }

  let sent = 0
  for (const rule of due) {
    // Claim the (follow-up, call) pair first; a repeat callback stops here.
    const { data: claim, error: claimErr } = await db.from('agent_followup_sends')
      .insert({ followup_id: rule.id, company_id: companyId, call_id: callId, status: 'skipped' }).select('id').maybeSingle()
    if (claimErr || !claim) continue
    const finish = (status: 'sent' | 'failed' | 'skipped', error: string | null, to: string | null) =>
      db.from('agent_followup_sends').update({ status, error, to_phone: to }).eq('id', claim.id)

    const to = rule.recipient === 'customer' ? customerNumber(call) : waNumber(rule.recipient)
    if (!to) { await finish('skipped', 'no number', null); continue }
    const { data: tpl } = await db.from('whatsapp_templates').select('name, language, label, param_labels, enabled').eq('id', rule.template_id).eq('company_id', companyId).maybeSingle()
    if (!tpl?.enabled) { await finish('skipped', 'template off', to); continue }
    const params = ((rule.params ?? []) as string[]).map((p) => renderParam(String(p ?? ''), call, analysis))
    const expected = Array.isArray(tpl.param_labels) ? tpl.param_labels.length : 0
    if (params.length < expected || params.slice(0, expected).some((p) => !p)) { await finish('skipped', 'empty value', to); continue }
    if (!acc?.access_token || !phoneNumberId) { await finish('failed', 'whatsapp not linked', to); continue }

    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acc.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: tpl.name, language: { code: tpl.language },
          ...(expected ? { components: [{ type: 'body', parameters: params.slice(0, expected).map((text) => ({ type: 'text', text })) }] } : {}),
        },
      }),
    })
    const error = res.ok ? null : `${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`
    await finish(res.ok ? 'sent' : 'failed', error, to)
    await db.from('outreach_messages').insert({
      company_id: companyId, template_name: tpl.name, template_label: tpl.label, language: tpl.language,
      to_phone: to, params: params.slice(0, expected), status: res.ok ? 'sent' : 'failed', error, sent_by_name: 'متابعة بعد المكالمة',
    })
    if (res.ok) sent++
  }
  return json({ ok: true, sent })
})
