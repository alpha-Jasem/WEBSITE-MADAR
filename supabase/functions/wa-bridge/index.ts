// Bridge between the Madar agent and WhatsApp Web running in the owner's Chrome (via the Madar extension).
// The extension asks for the next message to send (next_job), reports what it sent (report), and passes on replies it sees (inbound).
// Safety rails live here, not in the extension: master switch, active hours, a daily cap that ramps up slowly,
// the do-not-contact list, one active agent per lead, stop words, escalation, and an automatic pause after repeated failures.
// Deployed with --no-verify-jwt: the extension authenticates with a per-device token; the dashboard uses an admin session for device management.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { normalizeSaudiPhone } from '../_shared/outreach.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
const riyadh = () => new Date(Date.now() + 3 * 3600000)
const riyadhDayStart = () => { const d = riyadh(); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() - 3 * 3600000) }

const OPT_OUT = 'إذا ما يناسبك قل لي وما أتواصل معك مرة ثانية.'

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const cronSecret = Deno.env.get('OUTREACH_CRON_SECRET')!
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const body = await req.json().catch(() => ({})) as Record<string, any>
  const action = String(body.action || '')

  // ---- dashboard: device management (admin session) ----
  if (action === 'create_device' || action === 'revoke_device') {
    const bearer = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: u } = await service.auth.getUser(bearer)
    if (!u.user) return json({ error: 'invalid_auth' }, 401)
    const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
    if (action === 'revoke_device') {
      await service.from('wa_devices').update({ revoked: true }).eq('id', String(body.id || ''))
      return json({ ok: true })
    }
    const raw = crypto.getRandomValues(new Uint8Array(32))
    const token = 'mwa_' + btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const { data: dev, error } = await service.from('wa_devices').insert({ name: String(body.name || 'Chrome').slice(0, 40), token_hash: await sha256(token) }).select('id').single()
    if (error) return json({ error: 'create_failed' }, 500)
    return json({ ok: true, id: dev.id, token })
  }

  // ---- extension: device token ----
  const devToken = req.headers.get('x-device-token') || ''
  if (!devToken) return json({ error: 'missing_device_token' }, 401)
  const { data: device } = await service.from('wa_devices').select('id, revoked').eq('token_hash', await sha256(devToken)).maybeSingle()
  if (!device || device.revoked) return json({ error: 'invalid_device' }, 401)
  await service.from('wa_devices').update({ last_seen_at: new Date().toISOString(), last_status: String(body.status || action).slice(0, 80) }).eq('id', device.id)

  const { data: s } = await service.from('wa_settings').select('*').eq('id', 1).single()
  const settings = s!
  const hour = riyadh().getUTCHours()
  const inHours = hour >= settings.start_hour && hour < settings.end_hour

  const dayStart = riyadhDayStart().toISOString()
  const sentToday = async (kind: 'first' | 'reply') => {
    const { count } = await service.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'sent').eq('kind', kind).gte('sent_at', dayStart)
    return count ?? 0
  }
  // the daily cap climbs slowly from ramp_start so a fresh number is never pushed
  const capToday = () => {
    const started = settings.started_on ? new Date(settings.started_on + 'T00:00:00Z') : new Date()
    const days = Math.max(0, Math.floor((riyadhDayStart().getTime() - (started.getTime() - 3 * 3600000)) / 86400000))
    return Math.min(settings.max_cap, settings.ramp_start + Math.floor(days / settings.ramp_every_days) * settings.ramp_step)
  }
  const pause = async (reason: string) => {
    await service.from('wa_settings').update({ enabled: false, pause_reason: reason, updated_at: new Date().toISOString() }).eq('id', 1)
    await service.rpc('notify_admin', { p_title: 'توقف الإرسال عبر واتساب', p_body: reason, p_url: '/admin/whatsapp', p_tag: 'wa' })
  }
  const internalFn = (name: string, payload: unknown) => fetch(`${url}/functions/v1/${name}`, {
    method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, 'x-cron-secret': cronSecret, 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then(r => r.json()).catch(() => ({}))

  try {
    if (action === 'hello') {
      return json({ ok: true, enabled: settings.enabled, in_hours: inHours, cap_today: capToday(), sent_today: await sentToday('first'), pause_reason: settings.pause_reason })
    }

    if (action === 'next_job') {
      if (!settings.enabled) return json({ job: null, reason: 'disabled', retry_s: 60 })
      if (!inHours) return json({ job: null, reason: 'quiet_hours', retry_s: 300 })

      // 1) replies come first
      if (settings.auto_reply && (await sentToday('reply')) < settings.reply_cap) {
        const { data: q } = await service.from('wa_messages').select('id, body, conversation_id, wa_conversations(phone, state)').eq('direction', 'out').eq('status', 'queued').eq('kind', 'reply').order('created_at').limit(1)
        const m = q?.[0] as any
        if (m) {
          return json({ job: { id: m.id, phone: m.wa_conversations.phone, text: m.body, kind: 'reply' }, wait_s: rand(15, 45) })
        }
      }

      // 2) first messages to new leads (a first message already waiting is handed out again, never a second one)
      if (settings.send_outbound && settings.agent_id) {
        const { data: waiting } = await service.from('wa_messages').select('id, body, wa_conversations(phone)').eq('direction', 'out').eq('status', 'queued').eq('kind', 'first').order('created_at').limit(1)
        const w = waiting?.[0] as any
        if (w) return json({ job: { id: w.id, phone: w.wa_conversations.phone, text: w.body, kind: 'first' }, wait_s: rand(settings.min_delay_s, settings.max_delay_s) })
        const { data: agent } = await service.from('sales_agents').select('id, status, daily_message_cap').eq('id', settings.agent_id).maybeSingle()
        if (!agent || agent.status !== 'active') return json({ job: null, reason: 'agent_not_active', retry_s: 120 })
        const done = await sentToday('first')
        if (done >= Math.min(capToday(), agent.daily_message_cap)) return json({ job: null, reason: 'daily_cap', retry_s: 600 })
        const { data: last } = await service.from('wa_messages').select('sent_at').eq('direction', 'out').eq('status', 'sent').eq('kind', 'first').order('sent_at', { ascending: false }).limit(1)
        if (last?.[0]?.sent_at && Date.now() - new Date(last[0].sent_at).getTime() < settings.min_delay_s * 1000) return json({ job: null, reason: 'cooldown', retry_s: settings.min_delay_s })

        const { data: blocked } = await service.from('do_not_contact').select('phone').not('phone', 'is', null)
        const stop = new Set((blocked ?? []).map(b => b.phone))
        const { data: known } = await service.from('wa_conversations').select('phone')
        const seen = new Set((known ?? []).map(k => k.phone))
        let q = service.from('outreach_leads').select('id, name, phone, rating, reviews, website').eq('status', 'new').eq('is_mobile', true).order('rating', { ascending: false, nullsFirst: false }).limit(60)
        q = settings.target === 'no_website' ? q.eq('website', '') : q.neq('website', '')
        const { data: pool } = await q
        for (const lead of pool ?? []) {
          if (stop.has(lead.phone) || seen.has(lead.phone)) continue
          const { error: asg } = await service.from('agent_assignments').insert({ agent_id: agent.id, lead_id: lead.id })
          if (asg) continue // already held by an agent
          const made = await internalFn('agent-draft', { action: 'draft', agent_id: agent.id, lead_ids: [lead.id], campaign_id: settings.campaign_id || undefined, target: settings.target, trial: false })
          const draft = made?.drafts?.[0]
          if (!draft?.body) {
            await service.from('agent_assignments').update({ released_at: new Date().toISOString() }).eq('lead_id', lead.id).is('released_at', null)
            return json({ job: null, reason: 'draft_failed', retry_s: 120 })
          }
          const text = `${draft.body}\n\n${OPT_OUT}`
          const { data: conv } = await service.from('wa_conversations').insert({ lead_id: lead.id, phone: lead.phone }).select('id').single()
          const { data: msg } = await service.from('wa_messages').insert({ conversation_id: conv!.id, direction: 'out', body: text, kind: 'first', draft_id: draft.id ?? null }).select('id').single()
          return json({ job: { id: msg!.id, phone: lead.phone, text, kind: 'first' }, wait_s: rand(settings.min_delay_s, settings.max_delay_s) })
        }
        return json({ job: null, reason: 'no_leads', retry_s: 600 })
      }
      return json({ job: null, reason: 'idle', retry_s: 120 })
    }

    if (action === 'report') {
      const { data: msg } = await service.from('wa_messages').select('id, kind, draft_id, conversation_id, wa_conversations(lead_id, phone)').eq('id', String(body.id || '')).maybeSingle() as { data: any }
      if (!msg) return json({ error: 'unknown_message' }, 404)
      const now = new Date().toISOString()
      if (body.ok) {
        await service.from('wa_messages').update({ status: 'sent', sent_at: now, error: null }).eq('id', msg.id)
        await service.from('wa_conversations').update({ last_out_at: now }).eq('id', msg.conversation_id)
        if (msg.kind === 'first') {
          const follow = new Date(Date.now() + 2 * 86400000); follow.setUTCHours(7, 0, 0, 0)
          const leadId = msg.wa_conversations?.lead_id
          if (leadId) await service.from('outreach_leads').update({ status: 'contacted', last_contacted_at: now, next_follow_up: follow.toISOString(), updated_at: now }).eq('id', leadId).eq('status', 'new')
          if (msg.draft_id) await service.from('agent_drafts').update({ status: 'sent', sent_at: now }).eq('id', msg.draft_id)
        }
        return json({ ok: true })
      }
      const err = String(body.error || 'failed').slice(0, 200)
      await service.from('wa_messages').update({ status: 'failed', error: err }).eq('id', msg.id)
      if (err === 'not_on_whatsapp') {
        await service.from('wa_conversations').update({ state: 'done' }).eq('id', msg.conversation_id)
        if (msg.wa_conversations?.lead_id) await service.from('outreach_leads').update({ status: 'no_answer', notes: 'ليس على واتساب', updated_at: now }).eq('id', msg.wa_conversations.lead_id)
        if (msg.draft_id) await service.from('agent_drafts').update({ status: 'cancelled' }).eq('id', msg.draft_id)
      }
      const { data: recent } = await service.from('wa_messages').select('status').eq('direction', 'out').gte('created_at', new Date(Date.now() - 15 * 60000).toISOString()).order('created_at', { ascending: false }).limit(4)
      const fails = (recent ?? []).filter(r => r.status === 'failed').length
      if (err !== 'not_on_whatsapp' && fails >= 3) await pause('فشل إرسال متكرر (3 رسائل خلال 15 دقيقة). افحص واتساب ويب ثم فعّل الإرسال من جديد.')
      return json({ ok: true })
    }

    if (action === 'inbound') {
      const phone = normalizeSaudiPhone(body.phone)?.phone
      if (!phone) return json({ ok: true, ignored: 'bad_phone' })
      const { data: conv } = await service.from('wa_conversations').select('id, lead_id, state, auto_replies').eq('phone', phone).maybeSingle()
      if (!conv) return json({ ok: true, ignored: 'unknown_chat' }) // only conversations the agent started
      const incoming = (Array.isArray(body.messages) ? body.messages : []).slice(-6).map((m: any) => ({ text: String(m.text || '').trim().slice(0, 1500), ts: String(m.ts || '') })).filter((m: any) => m.text)
      if (!incoming.length) return json({ ok: true, ignored: 'empty' })
      const rows: Record<string, unknown>[] = []
      for (const m of incoming) {
        const fp = await sha256(`${m.ts}|${m.text}`)
        const { data: dup } = await service.from('wa_messages').select('id').eq('conversation_id', conv.id).eq('direction', 'in').eq('fingerprint', fp).maybeSingle()
        if (!dup) rows.push({ conversation_id: conv.id, direction: 'in', body: m.text, status: 'received', fingerprint: fp })
      }
      if (!rows.length) return json({ ok: true, ignored: 'duplicate' })
      await service.from('wa_messages').insert(rows)
      const now = new Date().toISOString()
      await service.from('wa_conversations').update({ last_in_at: now }).eq('id', conv.id)
      if (conv.lead_id) await service.from('outreach_leads').update({ status: 'replied', updated_at: now }).eq('id', conv.lead_id).in('status', ['new', 'contacted', 'no_answer'])

      const { data: lead } = conv.lead_id ? await service.from('outreach_leads').select('name').eq('id', conv.lead_id).maybeSingle() : { data: null }
      const name = lead?.name ?? phone
      if (conv.state !== 'active' || !settings.enabled || !settings.auto_reply) {
        await service.rpc('notify_admin', { p_title: 'عميل رد وبانتظارك', p_body: `${name}: ${incoming[incoming.length - 1].text.slice(0, 100)}`, p_url: '/admin/whatsapp', p_tag: 'wa-reply' })
        return json({ ok: true, queued: 0, reason: conv.state !== 'active' ? 'conversation_' + conv.state : 'auto_reply_off' })
      }
      if (conv.auto_replies >= 12) {
        await service.from('wa_conversations').update({ state: 'escalated' }).eq('id', conv.id)
        await service.rpc('notify_admin', { p_title: 'عميل يحتاجك', p_body: `${name}: وصلت المحادثة حد الردود الآلية، كملها بنفسك.`, p_url: '/admin/whatsapp', p_tag: 'wa-escalate' })
        return json({ ok: true, queued: 0, reason: 'reply_limit' })
      }

      const { data: hist } = await service.from('wa_messages').select('direction, body').eq('conversation_id', conv.id).in('status', ['sent', 'received']).order('created_at', { ascending: false }).limit(14)
      const messages = (hist ?? []).reverse().map(h => ({ role: h.direction === 'in' ? 'user' : 'assistant', content: h.body }))
      const out = await internalFn('agent-draft', { action: 'chat', live: true, real_booking: true, target: settings.target, agent_id: settings.agent_id || undefined, lead_id: conv.lead_id || undefined, campaign_id: settings.campaign_id || undefined, messages })
      const reply = String(out?.reply || '').trim()
      if (!reply) {
        await service.rpc('notify_admin', { p_title: 'عميل رد وبانتظارك', p_body: `${name}: تعذّر على الإيجنت الرد، افتح المحادثة.`, p_url: '/admin/whatsapp', p_tag: 'wa-reply' })
        return json({ ok: true, queued: 0, reason: 'agent_failed' })
      }
      await service.from('wa_messages').insert({ conversation_id: conv.id, direction: 'out', body: reply, kind: 'reply' })
      await service.from('wa_conversations').update({ auto_replies: conv.auto_replies + 1 }).eq('id', conv.id)
      if (out.flag === 'stop') {
        await service.from('wa_conversations').update({ state: 'stopped' }).eq('id', conv.id)
        await service.from('do_not_contact').insert({ phone, reason: 'opt_out', scope: 'all' }).then(() => null, () => null)
        if (conv.lead_id) await service.from('outreach_leads').update({ status: 'lost', lost_reason: 'طلب التوقف', updated_at: now }).eq('id', conv.lead_id)
      } else if (out.flag === 'escalate') {
        await service.from('wa_conversations').update({ state: 'escalated' }).eq('id', conv.id)
        await service.rpc('notify_admin', { p_title: 'عميل جاهز لك', p_body: `${name} يحتاج موظفًا. كلّمه بنفسك.`, p_url: '/admin/whatsapp', p_tag: 'wa-escalate' })
      }
      return json({ ok: true, queued: 1, flag: out.flag ?? null })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: 'bridge_failed', detail: (e as Error).message.slice(0, 200) }, 500)
  }
})
