// Runs "when X happens, do Y" rules (table connect_rules).
//   POST { event_id }        from the database trigger, header x-runner-secret  -> runs the rules for one queued event
//   POST { sweep: true }     from the one-minute cron, same header              -> retries events left unprocessed
//   POST { test: rule_id }   from the dashboard (signed-in user's JWT)          -> runs one rule with a sample event
// Actions: webhook (generic JSON, Slack, Discord, Telegram, Zapier/Make/n8n/Sheets), transfer to a team,
// open a ticket, send a WhatsApp template, or post an in-dashboard notification.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-runner-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Payload = Record<string, any>
interface Rule {
  id: string; company_id: string; name: string; trigger_event: string
  conditions: Record<string, any>; action_type: string; action_config: Record<string, any>
}

const SAMPLES: Record<string, Payload> = {
  'conversation.new': { conversation: { key: 'chat:966500000000', phone: '966500000000', name: 'عميل تجريبي', channel: 'whatsapp', summary: 'سأل عن الأسعار وطلب موعد', intent: 'inquiry', needs_review: false } },
  'conversation.needs_review': { conversation: { key: 'chat:966500000000', phone: '966500000000', name: 'عميل تجريبي', channel: 'whatsapp', summary: 'عميل منزعج من التأخير', reason: 'complaint' } },
  'conversation.transferred': { conversation: { key: 'chat:966500000000' }, transfer: { team: 'المبيعات', reason: 'يبي عرض سعر', by: 'سارة' } },
  'ticket.created': { ticket: { id: 'sample', subject: 'مشكلة في الموعد', description: 'العميل يبي تغيير الموعد', priority: 'high', status: 'open' }, customer: { name: 'عميل تجريبي', phone: '966500000000' } },
  'booking.created': { booking: { id: 'sample', date: '2026-10-20', time: '16:30:00', service: 'استشارة', status: 'confirmed', source: 'ai' }, customer: { name: 'عميل تجريبي', phone: '966500000000' } },
  'customer.created': { customer: { id: 'sample', name: 'عميل تجريبي', phone: '966500000000' } },
  'review.new': { review: { rating: 5, author: 'عميل تجريبي', text: 'خدمة ممتازة' } },
}

function summarize(event: string, p: Payload): string {
  const who = p.customer?.name || p.conversation?.name || p.customer?.phone || p.conversation?.phone || 'عميل'
  switch (event) {
    case 'conversation.new': return `محادثة جديدة من ${who} عبر ${p.conversation?.channel || 'قناة'}: ${p.conversation?.summary || ''}`.trim()
    case 'conversation.needs_review': return `محادثة تحتاج مراجعة من ${who}: ${p.conversation?.summary || p.conversation?.reason || ''}`.trim()
    case 'conversation.transferred': return `حُوّلت محادثة إلى فريق ${p.transfer?.team || ''}${p.transfer?.reason ? `: ${p.transfer.reason}` : ''}`
    case 'ticket.created': return `تذكرة جديدة (${p.ticket?.priority || 'normal'}): ${p.ticket?.subject || ''} · ${who}`
    case 'booking.created': return `حجز جديد: ${who} · ${p.booking?.service || ''} · ${p.booking?.date || ''} ${String(p.booking?.time || '').slice(0, 5)}`
    case 'customer.created': return `عميل جديد: ${p.customer?.name || ''} ${p.customer?.phone || ''}`
    case 'review.new': return `تقييم جديد ${p.review?.rating || ''}★ من ${p.review?.author || ''}: ${p.review?.text || ''}`
    default: return event
  }
}

/** Fills {{path.to.value}} from the payload. */
function fill(tpl: string, event: string, p: Payload): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    if (path === 'summary_text') return summarize(event, p)
    const v = path.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), p)
    return v == null ? '' : String(v)
  })
}

function matches(rule: Rule, p: Payload): boolean {
  const c = rule.conditions || {}
  if (c.channel && p.conversation?.channel && p.conversation.channel !== c.channel) return false
  if (c.priority && p.ticket?.priority && p.ticket.priority !== c.priority) return false
  if (c.contains) {
    const hay = JSON.stringify(p).toLowerCase()
    if (!hay.includes(String(c.contains).toLowerCase())) return false
  }
  return true
}

function safeUrl(raw: string): URL {
  const u = new URL(raw)
  if (u.protocol !== 'https:') throw new Error('الرابط لازم يبدأ بـ https')
  const h = u.hostname
  if (h === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/.test(h) || h.endsWith('.internal') || h.endsWith('.local')) throw new Error('رابط غير مسموح')
  return u
}

async function hmac(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function runWebhook(rule: Rule, event: string, p: Payload): Promise<string> {
  const cfg = rule.action_config
  const preset = cfg.preset || 'generic'
  const text = cfg.template ? fill(String(cfg.template), event, p) : summarize(event, p)
  let url = String(cfg.url || '')
  let body: Record<string, unknown>
  if (preset === 'slack') body = { text }
  else if (preset === 'discord') body = { content: text }
  else if (preset === 'telegram') {
    url = `https://api.telegram.org/bot${String(cfg.bot_token || '')}/sendMessage`
    body = { chat_id: String(cfg.chat_id || ''), text }
  } else body = { event, occurred_at: new Date().toISOString(), company_id: rule.company_id, text, data: p }
  const raw = JSON.stringify(body)
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'User-Agent': 'Madar-Connect/1.0' }
  if (cfg.secret) headers['X-Madar-Signature'] = await hmac(String(cfg.secret), raw)
  const res = await fetch(safeUrl(url), { method: 'POST', headers, body: raw, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`الخدمة ردّت ${res.status}`)
  return `أُرسل (${res.status})`
}

async function runAction(db: SupabaseClient, rule: Rule, event: string, p: Payload): Promise<string> {
  const cfg = rule.action_config || {}
  switch (rule.action_type) {
    case 'webhook': return await runWebhook(rule, event, p)
    case 'transfer': {
      if (event === 'conversation.transferred') throw new Error('ما ينفع التحويل التلقائي عند حدث تحويل')
      const key = p.conversation?.key
      if (!key) throw new Error('الحدث ما فيه محادثة')
      const { data: team } = await db.from('company_teams').select('id, name').eq('company_id', rule.company_id).eq('id', cfg.team_id).maybeSingle()
      if (!team) throw new Error('الفريق غير موجود')
      const { error } = await db.from('conversation_events').insert({
        company_id: rule.company_id, conversation_key: key, kind: 'transfer', body: cfg.reason ? fill(String(cfg.reason), event, p) : `تحويل تلقائي: ${rule.name}`,
        team_id: team.id, team_name: team.name, author_name: 'الأتمتة',
      })
      if (error) throw new Error(error.message)
      return `حُوّلت إلى ${team.name}`
    }
    case 'ticket': {
      if (event === 'ticket.created') throw new Error('ما ينفع فتح تذكرة عند حدث تذكرة')
      const { error } = await db.from('ai_agent_support_tickets').insert({
        company_id: rule.company_id, subject: fill(String(cfg.subject || '{{summary_text}}'), event, p).slice(0, 200),
        description: summarize(event, p), priority: cfg.priority || 'normal', status: 'open', ticket_type: 'automation',
        customer_name: p.customer?.name || p.conversation?.name || null, customer_phone: p.customer?.phone || p.conversation?.phone || null,
      })
      if (error) throw new Error(error.message)
      return 'فُتحت تذكرة'
    }
    case 'notify': {
      const { error } = await db.from('clinic_os_notifications').insert({
        company_id: rule.company_id, notification_type: 'automation', title: fill(String(cfg.title || rule.name), event, p), message: summarize(event, p), severity: 'info',
      })
      if (error) throw new Error(error.message)
      return 'أُرسل إشعار'
    }
    case 'whatsapp': {
      const phone = p.customer?.phone || p.conversation?.phone
      if (!phone) throw new Error('ما فيه رقم للعميل')
      const params = (Array.isArray(cfg.params) ? cfg.params : []).map((x: unknown) => fill(String(x), event, p))
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-outreach`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: cfg.template_id, company_id: rule.company_id, sent_by: `الأتمتة · ${rule.name}`, recipients: [{ phone, name: p.customer?.name || p.conversation?.name || '', params }] }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `فشل الإرسال ${res.status}`)
      const r = out.results?.[0]
      if (r && r.status !== 'sent') throw new Error(r.error || 'ما انرسلت')
      return 'أُرسل واتساب'
    }
    default: throw new Error('إجراء غير معروف')
  }
}

async function runRule(db: SupabaseClient, rule: Rule, event: string, p: Payload) {
  let status: 'ok' | 'failed' = 'ok'
  let detail = ''
  try { detail = await runAction(db, rule, event, p) } catch (e) { status = 'failed'; detail = e instanceof Error ? e.message : String(e) }
  await db.from('connect_runs').insert({ company_id: rule.company_id, rule_id: rule.id, event, status, detail: detail.slice(0, 300) })
  const { data: cur } = await db.from('connect_rules').select('run_count').eq('id', rule.id).maybeSingle()
  await db.from('connect_rules').update({ run_count: ((cur?.run_count as number) || 0) + 1, last_run_at: new Date().toISOString() }).eq('id', rule.id)
  return { status, detail }
}

async function processEvent(db: SupabaseClient, ev: { id: string; company_id: string; event: string; payload: Payload }) {
  const { data: rules } = await db.from('connect_rules').select('*').eq('company_id', ev.company_id).eq('trigger_event', ev.event).eq('enabled', true)
  for (const rule of (rules || []) as Rule[]) if (matches(rule, ev.payload)) await runRule(db, rule, ev.event, ev.payload)
  await db.from('connect_events').update({ processed_at: new Date().toISOString() }).eq('id', ev.id)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(url, serviceKey, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))

  if (req.headers.get('x-runner-secret') && req.headers.get('x-runner-secret') === Deno.env.get('AUTOMATION_RUNNER_SECRET')) {
    if (body.event_id) {
      const { data: ev } = await db.from('connect_events').select('*').eq('id', body.event_id).is('processed_at', null).maybeSingle()
      if (ev) await processEvent(db, ev)
      return json({ ok: true })
    }
    if (body.sweep) {
      const { data: evs } = await db.from('connect_events').select('*').is('processed_at', null).lt('created_at', new Date(Date.now() - 20_000).toISOString()).order('created_at').limit(50)
      for (const ev of evs || []) await processEvent(db, ev)
      return json({ ok: true, processed: (evs || []).length })
    }
    return json({ error: 'bad request' }, 400)
  }

  // Test run from the dashboard: the caller must belong to the rule's company.
  if (body.test) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
    const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
    if (!companyId) return json({ error: 'unauthorized' }, 401)
    const { data: rule } = await db.from('connect_rules').select('*').eq('id', body.test).eq('company_id', companyId).maybeSingle()
    if (!rule) return json({ error: 'rule not found' }, 404)
    const result = await runRule(db, rule as Rule, rule.trigger_event, SAMPLES[rule.trigger_event] || {})
    return json(result)
  }
  return json({ error: 'unauthorized' }, 401)
})
