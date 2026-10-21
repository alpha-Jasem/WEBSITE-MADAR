// WhatsApp on Kapso (official WhatsApp Cloud API): shared pieces for the webhook, the scheduled sender and the admin helper.
// All safety rails live here: master switch, active hours for first messages, a daily cap that ramps up slowly,
// the do-not-contact list, one active agent per lead, stop words, escalation and an automatic pause after repeated failures.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { normalizeSaudiPhone } from './outreach.ts'

const KAPSO_META = 'https://api.kapso.ai/meta/whatsapp/v24.0'
export const KAPSO_PLATFORM = 'https://api.kapso.ai/platform/v1'
export const kapsoKey = () => Deno.env.get('KAPSO_API_KEY') || ''

export const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
export const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
export const riyadh = () => new Date(Date.now() + 3 * 3600000)
export const riyadhDayStart = () => { const d = riyadh(); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() - 3 * 3600000) }

export interface WaSettings {
  enabled: boolean; send_outbound: boolean; auto_reply: boolean; start_hour: number; end_hour: number
  ramp_start: number; ramp_step: number; ramp_every_days: number; max_cap: number; min_delay_s: number; max_delay_s: number
  reply_cap: number; agent_id: string | null; target: 'outreach' | 'no_website'; campaign_id: string | null
  started_on: string | null; pause_reason: string | null
  phone_number_id: string | null; template_name: string; template_lang: string; reply_to_new_inbound: boolean
}

export async function loadSettings(service: SupabaseClient): Promise<WaSettings> {
  const { data } = await service.from('wa_settings').select('*').eq('id', 1).single()
  return data as WaSettings
}
export const inHours = (s: WaSettings) => { const h = riyadh().getUTCHours(); return h >= s.start_hour && h < s.end_hour }
// the daily cap climbs slowly from ramp_start so a fresh number is never pushed
export function capToday(s: WaSettings) {
  const started = s.started_on ? new Date(s.started_on + 'T00:00:00Z') : new Date()
  const days = Math.max(0, Math.floor((riyadhDayStart().getTime() - (started.getTime() - 3 * 3600000)) / 86400000))
  return Math.min(s.max_cap, s.ramp_start + Math.floor(days / s.ramp_every_days) * s.ramp_step)
}
export async function sentToday(service: SupabaseClient, kind: 'first' | 'reply') {
  const { count } = await service.from('wa_messages').select('id', { count: 'exact', head: true })
    .eq('direction', 'out').eq('status', 'sent').eq('kind', kind).gte('sent_at', riyadhDayStart().toISOString())
  return count ?? 0
}

// ---------- Kapso calls ----------
async function kapsoPost(path: string, body: unknown) {
  const res = await fetch(`${KAPSO_META}${path}`, { method: 'POST', headers: { 'X-API-Key': kapsoKey(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
const errText = (d: any) => String(d?.error?.message ?? d?.error ?? d?.message ?? 'send_failed').slice(0, 200)

export async function sendText(phoneNumberId: string, to: string, text: string) {
  const r = await kapsoPost(`/${phoneNumberId}/messages`, { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } })
  return { ok: r.ok, id: r.data?.messages?.[0]?.id as string | undefined, error: r.ok ? undefined : errText(r.data) }
}
export async function sendTemplate(phoneNumberId: string, to: string, name: string, lang: string, params: Record<string, string>) {
  const r = await kapsoPost(`/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp', to, type: 'template',
    template: { name, language: { code: lang }, components: [{ type: 'body', parameters: Object.entries(params).map(([k, v]) => ({ type: 'text', parameter_name: k, text: v })) }] },
  })
  return { ok: r.ok, id: r.data?.messages?.[0]?.id as string | undefined, error: r.ok ? undefined : errText(r.data) }
}

// ---------- the agent ----------
export function agentCall(name: string, payload: unknown) {
  const url = Deno.env.get('SUPABASE_URL')!
  return fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'x-cron-secret': Deno.env.get('OUTREACH_CRON_SECRET')!, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json()).catch(() => ({}))
}
const notify = (service: SupabaseClient, title: string, body: string, url = '/admin/whatsapp', tag = 'wa') =>
  service.rpc('notify_admin', { p_title: title, p_body: body, p_url: url, p_tag: tag })

export async function pauseSending(service: SupabaseClient, reason: string) {
  await service.from('wa_settings').update({ enabled: false, pause_reason: reason, updated_at: new Date().toISOString() }).eq('id', 1)
  await notify(service, 'توقف الإرسال عبر واتساب', reason)
}

const STOP_WORDS = /(^|\s)(ايقاف|إيقاف|وقف|stop|unsubscribe)(\s|$|[.!،])/i

// ---------- a customer wrote to the business number ----------
export async function processInbound(service: SupabaseClient, s: WaSettings, m: { from: string; name?: string; text: string; type: string; waId?: string }) {
  const phone = normalizeSaudiPhone(m.from)?.phone ?? m.from.replace(/\D/g, '')
  if (!phone || !s.phone_number_id) return { ignored: 'bad_phone' }
  const now = new Date().toISOString()

  let { data: conv } = await service.from('wa_conversations').select('id, lead_id, state, auto_replies').eq('phone', phone).maybeSingle()
  if (!conv) {
    if (!s.reply_to_new_inbound) return { ignored: 'unknown_sender' }
    // somebody wrote to the business number first: find or create the lead so it shows up in the dashboard
    let { data: lead } = await service.from('outreach_leads').select('id, status').eq('phone', phone).maybeSingle()
    if (!lead) {
      const ins = await service.from('outreach_leads').insert({ name: m.name || `+${phone}`, phone, is_mobile: true, source: 'manual', status: 'replied', category: '', city: '' }).select('id, status').single()
      lead = ins.data
    }
    const created = await service.from('wa_conversations').insert({ lead_id: lead?.id ?? null, phone }).select('id, lead_id, state, auto_replies').single()
    conv = created.data
  }
  if (!conv) return { ignored: 'no_conversation' }

  if (m.waId) {
    const { data: dup } = await service.from('wa_messages').select('id').eq('conversation_id', conv.id).eq('direction', 'in').eq('wa_message_id', m.waId).maybeSingle()
    if (dup) return { ignored: 'duplicate' }
  }
  const text = (m.type === 'text' ? m.text : `[${m.type}] ${m.text || ''}`).trim().slice(0, 1500)
  await service.from('wa_messages').insert({ conversation_id: conv.id, direction: 'in', body: text || `[${m.type}]`, status: 'received', wa_message_id: m.waId ?? null, fingerprint: m.waId ? await sha256(m.waId) : null })
  await service.from('wa_conversations').update({ last_in_at: now }).eq('id', conv.id)
  if (conv.lead_id) await service.from('outreach_leads').update({ status: 'replied', updated_at: now }).eq('id', conv.lead_id).in('status', ['new', 'contacted', 'no_answer'])

  const { data: lead } = conv.lead_id ? await service.from('outreach_leads').select('name').eq('id', conv.lead_id).maybeSingle() : { data: null }
  const name = lead?.name ?? m.name ?? phone

  const reply = async (body: string, kind: 'reply' = 'reply') => {
    const { data: row } = await service.from('wa_messages').insert({ conversation_id: conv!.id, direction: 'out', body, kind, status: 'queued' }).select('id').single()
    const r = await sendText(s.phone_number_id!, phone, body)
    if (r.ok) {
      await service.from('wa_messages').update({ status: 'sent', sent_at: new Date().toISOString(), wa_message_id: r.id ?? null }).eq('id', row!.id)
      await service.from('wa_conversations').update({ last_out_at: new Date().toISOString() }).eq('id', conv!.id)
    } else {
      await service.from('wa_messages').update({ status: 'failed', error: r.error }).eq('id', row!.id)
      await notify(service, 'تعذّر إرسال رد واتساب', `${name}: ${r.error}`)
    }
    return r.ok
  }

  // explicit opt-out: honored immediately, no model involved
  if (m.type === 'text' && STOP_WORDS.test(m.text)) {
    await service.from('wa_conversations').update({ state: 'stopped' }).eq('id', conv.id)
    await service.from('do_not_contact').insert({ phone, reason: 'opt_out', scope: 'all' }).then(() => null, () => null)
    if (conv.lead_id) await service.from('outreach_leads').update({ status: 'lost', lost_reason: 'طلب التوقف', updated_at: now }).eq('id', conv.lead_id)
    await reply('تم إيقاف التواصل معك. شكرًا لوقتك.')
    return { queued: 1, flag: 'stop' }
  }

  if (conv.state !== 'active' || !s.enabled || !s.auto_reply) {
    await notify(service, 'عميل رد وبانتظارك', `${name}: ${text.slice(0, 100)}`, '/admin/whatsapp', 'wa-reply')
    return { queued: 0, reason: conv.state !== 'active' ? 'conversation_' + conv.state : 'auto_reply_off' }
  }
  if (conv.auto_replies >= 12 || (await sentToday(service, 'reply')) >= s.reply_cap) {
    await service.from('wa_conversations').update({ state: 'escalated' }).eq('id', conv.id)
    await notify(service, 'عميل يحتاجك', `${name}: وصلت المحادثة حد الردود الآلية، كملها بنفسك.`, '/admin/whatsapp', 'wa-escalate')
    return { queued: 0, reason: 'reply_limit' }
  }
  if (m.type !== 'text') {
    await reply('وصلتني رسالتك. أقدر أقرأ النص فقط حاليًا، اكتب لي سؤالك وأجاوبك.')
    return { queued: 1, reason: 'non_text' }
  }

  const { data: hist } = await service.from('wa_messages').select('direction, body').eq('conversation_id', conv.id).in('status', ['sent', 'received']).order('created_at', { ascending: false }).limit(14)
  const messages = (hist ?? []).reverse().map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }))
  const out = await agentCall('agent-draft', { action: 'chat', live: true, real_booking: true, target: s.target, agent_id: s.agent_id || undefined, lead_id: conv.lead_id || undefined, campaign_id: s.campaign_id || undefined, messages })
  const answer = String(out?.reply || '').trim()
  if (!answer) {
    await notify(service, 'عميل رد وبانتظارك', `${name}: تعذّر على الإيجنت الرد، افتح المحادثة.`, '/admin/whatsapp', 'wa-reply')
    return { queued: 0, reason: 'agent_failed' }
  }
  await service.from('wa_conversations').update({ auto_replies: conv.auto_replies + 1 }).eq('id', conv.id)
  await reply(answer)
  if (out.flag === 'stop') {
    await service.from('wa_conversations').update({ state: 'stopped' }).eq('id', conv.id)
    await service.from('do_not_contact').insert({ phone, reason: 'opt_out', scope: 'all' }).then(() => null, () => null)
    if (conv.lead_id) await service.from('outreach_leads').update({ status: 'lost', lost_reason: 'طلب التوقف', updated_at: now }).eq('id', conv.lead_id)
  } else if (out.flag === 'escalate') {
    await service.from('wa_conversations').update({ state: 'escalated' }).eq('id', conv.id)
    await notify(service, 'عميل جاهز لك', `${name} يحتاج موظفًا. كلّمه بنفسك.`, '/admin/whatsapp', 'wa-escalate')
  }
  return { queued: 1, flag: out.flag ?? null }
}

// ---------- the scheduled sender: one first message per minute at most ----------
export async function sendNextFirst(service: SupabaseClient, s: WaSettings) {
  if (!s.enabled) return { skipped: 'disabled' }
  if (!s.send_outbound || !s.agent_id || !s.phone_number_id) return { skipped: 'outbound_off' }
  if (!inHours(s)) return { skipped: 'quiet_hours' }
  const { data: agent } = await service.from('sales_agents').select('id, status, daily_message_cap').eq('id', s.agent_id).maybeSingle()
  if (!agent || agent.status !== 'active') return { skipped: 'agent_not_active' }
  if ((await sentToday(service, 'first')) >= Math.min(capToday(s), agent.daily_message_cap)) return { skipped: 'daily_cap' }

  const { data: last } = await service.from('wa_messages').select('sent_at').eq('direction', 'out').eq('status', 'sent').eq('kind', 'first').order('sent_at', { ascending: false }).limit(1)
  // random gap between first messages, inside [min_delay_s, max_delay_s]
  const gap = rand(s.min_delay_s, s.max_delay_s) * 1000
  if (last?.[0]?.sent_at && Date.now() - new Date(last[0].sent_at).getTime() < gap) return { skipped: 'gap' }

  const { data: blocked } = await service.from('do_not_contact').select('phone').not('phone', 'is', null)
  const stop = new Set((blocked ?? []).map(b => b.phone))
  const { data: known } = await service.from('wa_conversations').select('phone')
  const seen = new Set((known ?? []).map(k => k.phone))
  let q = service.from('outreach_leads').select('id, name, phone, website').eq('status', 'new').eq('is_mobile', true).eq('in_focus', true).order('rating', { ascending: false, nullsFirst: false }).limit(60)
  q = s.target === 'no_website' ? q.eq('website', '') : q.neq('website', '')
  const { data: pool } = await q
  for (const lead of pool ?? []) {
    if (stop.has(lead.phone) || seen.has(lead.phone)) continue
    const { error: asg } = await service.from('agent_assignments').insert({ agent_id: agent.id, lead_id: lead.id })
    if (asg) continue
    const made = await agentCall('agent-draft', { action: 'draft', agent_id: agent.id, lead_ids: [lead.id], campaign_id: s.campaign_id || undefined, target: s.target, trial: false })
    const draft = made?.drafts?.[0]
    if (!draft?.body) {
      await service.from('agent_assignments').update({ released_at: new Date().toISOString() }).eq('lead_id', lead.id).is('released_at', null)
      return { skipped: 'draft_failed' }
    }
    // a template variable cannot contain line breaks, so the opener goes out as one line
    const opener = String(draft.body).replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 480)
    const businessName = String(lead.name).replace(/\s+/g, ' ').slice(0, 60)
    const { data: conv } = await service.from('wa_conversations').insert({ lead_id: lead.id, phone: lead.phone }).select('id').single()
    const { data: msg } = await service.from('wa_messages').insert({ conversation_id: conv!.id, direction: 'out', body: opener, kind: 'first', draft_id: draft.id ?? null, status: 'queued' }).select('id').single()
    const r = await sendTemplate(s.phone_number_id, lead.phone, s.template_name, s.template_lang, { business_name: businessName, message: opener })
    const now = new Date().toISOString()
    if (r.ok) {
      await service.from('wa_messages').update({ status: 'sent', sent_at: now, wa_message_id: r.id ?? null }).eq('id', msg!.id)
      await service.from('wa_conversations').update({ last_out_at: now }).eq('id', conv!.id)
      const follow = new Date(Date.now() + 2 * 86400000); follow.setUTCHours(7, 0, 0, 0)
      await service.from('outreach_leads').update({ status: 'contacted', last_contacted_at: now, next_follow_up: follow.toISOString(), updated_at: now }).eq('id', lead.id).eq('status', 'new')
      if (draft.id) await service.from('agent_drafts').update({ status: 'sent', sent_at: now }).eq('id', draft.id)
      return { sent: lead.name }
    }
    await service.from('wa_messages').update({ status: 'failed', error: r.error }).eq('id', msg!.id)
    await service.from('wa_conversations').update({ state: 'done' }).eq('id', conv!.id)
    await service.from('agent_assignments').update({ released_at: now }).eq('lead_id', lead.id).is('released_at', null)
    if (draft.id) await service.from('agent_drafts').update({ status: 'cancelled' }).eq('id', draft.id)
    // template not approved / account problem: stop instead of burning through the list
    const { data: recent } = await service.from('wa_messages').select('status').eq('direction', 'out').eq('kind', 'first').gte('created_at', new Date(Date.now() - 20 * 60000).toISOString()).order('created_at', { ascending: false }).limit(3)
    if ((recent ?? []).length >= 3 && (recent ?? []).every(x => x.status === 'failed')) await pauseSending(service, `فشل إرسال متكرر: ${r.error}. افحص حالة القالب والرقم في صفحة واتساب ثم شغّل الإرسال من جديد.`)
    return { failed: r.error }
  }
  return { skipped: 'no_leads' }
}
