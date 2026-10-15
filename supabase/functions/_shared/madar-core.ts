// Shared by the public REST API (madar-api) and the MCP server (madar-mcp): one list of operations,
// each with a scope, a JSON-schema for its input and a runner. Both front ends call the same code, so
// the CLI, REST callers and AI agents always see identical behaviour.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface ApiCtx { db: SupabaseClient; companyId: string; keyName: string }
export interface Op {
  name: string
  scope: 'read' | 'write'
  description: string
  /** JSON schema of the arguments (also what MCP shows the model). */
  input: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  run: (ctx: ApiCtx, args: Record<string, unknown>) => Promise<unknown>
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new ApiError(500, 'server misconfigured')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Resolves `Authorization: Bearer mk_...` to the company that owns the key. */
export async function authenticate(req: Request): Promise<{ ctx: ApiCtx; scopes: string[] }> {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!token.startsWith('mk_')) throw new ApiError(401, 'missing or invalid API key (send Authorization: Bearer mk_...)')
  const db = serviceClient()
  const { data: key } = await db.from('api_keys').select('id, company_id, name, permissions, active').eq('key_hash', await sha256(token)).maybeSingle()
  if (!key || !key.active || !key.company_id) throw new ApiError(401, 'invalid or revoked API key')
  void db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)
  return { ctx: { db, companyId: key.company_id as string, keyName: (key.name as string) || 'API' }, scopes: (key.permissions as string[]) || [] }
}

export function allowed(scopes: string[], op: Op): boolean {
  if (op.scope === 'read') return scopes.some((s) => s === 'read:all' || s === 'write:all')
  return scopes.includes('write:all')
}

const num = (v: unknown, def: number, max: number) => Math.min(Math.max(Number(v) || def, 1), max)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** 05xxxxxxxx / 5xxxxxxxx / +966… / 00966… -> 9665xxxxxxxx, or null. */
export function saudiNumber(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '966' + d.slice(1)
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d
  return /^9665\d{8}$/.test(d) ? d : null
}

function conversationKey(row: { id: string; channel?: string | null; phone?: string | null }): string {
  return row.channel === 'whatsapp' && row.phone ? `chat:${String(row.phone).replace(/\D/g, '')}` : `call:${row.id}`
}

async function addEvent(ctx: ApiCtx, key: string, kind: string, body: string, extra: Record<string, unknown> = {}) {
  const { error } = await ctx.db.from('conversation_events').insert({
    company_id: ctx.companyId, conversation_key: key, kind, body, author_name: `API · ${ctx.keyName}`, ...extra,
  })
  if (error) throw new ApiError(400, error.message)
}

async function resolveTeam(ctx: ApiCtx, team: string) {
  const q = ctx.db.from('company_teams').select('id, name').eq('company_id', ctx.companyId)
  const { data } = await (/^[0-9a-f-]{36}$/i.test(team) ? q.eq('id', team) : q.eq('name', team)).maybeSingle()
  if (!data) throw new ApiError(404, `team not found: ${team}`)
  return data as { id: string; name: string }
}

export const OPS: Op[] = [
  {
    name: 'whoami', scope: 'read', description: 'The company this API key belongs to.',
    input: { type: 'object', properties: {} },
    run: async (ctx) => {
      const { data } = await ctx.db.from('companies').select('id, name, business_type, city').eq('id', ctx.companyId).maybeSingle()
      return { company: data, key: ctx.keyName }
    },
  },
  {
    name: 'list_conversations', scope: 'read',
    description: 'Recent conversations (calls and WhatsApp chats), newest first. Each has a `key` used by the other conversation tools.',
    input: { type: 'object', properties: {
      limit: { type: 'number', description: 'Max rows, up to 100 (default 25)' },
      channel: { type: 'string', description: 'whatsapp | phone | web' },
      needs_review: { type: 'boolean', description: 'Only conversations flagged for a human' },
      since: { type: 'string', description: 'ISO date-time; only conversations after it' },
    } },
    run: async (ctx, a) => {
      let q = ctx.db.from('clinic_os_ai_calls')
        .select('id, phone, caller_name, channel, call_time, duration_seconds, intent, result, status, summary, needs_review, review_reason')
        .eq('company_id', ctx.companyId).order('call_time', { ascending: false }).limit(num(a.limit, 25, 100))
      if (str(a.channel)) q = q.eq('channel', str(a.channel))
      if (a.needs_review === true) q = q.eq('needs_review', true)
      if (str(a.since)) q = q.gt('call_time', str(a.since))
      const { data, error } = await q
      if (error) throw new ApiError(400, error.message)
      return (data || []).map((r) => ({ key: conversationKey(r), ...r }))
    },
  },
  {
    name: 'get_conversation', scope: 'read',
    description: 'One conversation with its transcript and the team activity (notes, assignments, transfers).',
    input: { type: 'object', properties: { id: { type: 'string', description: 'The conversation id (uuid) or its key (call:<id> / chat:<phone>)' } }, required: ['id'] },
    run: async (ctx, a) => {
      let id = str(a.id)
      let phone = ''
      if (id.startsWith('call:')) id = id.slice(5)
      if (id.startsWith('chat:')) { phone = id.slice(5); id = '' }
      let q = ctx.db.from('clinic_os_ai_calls').select('*').eq('company_id', ctx.companyId)
      q = phone ? q.like('phone', `%${phone.slice(-9)}`).order('call_time', { ascending: false }).limit(5) : q.eq('id', id).limit(1)
      const { data, error } = await q
      if (error) throw new ApiError(400, error.message)
      if (!data?.length) throw new ApiError(404, 'conversation not found')
      const key = phone ? `chat:${phone}` : conversationKey(data[0])
      const { data: events } = await ctx.db.from('conversation_events').select('kind, body, author_name, team_name, assignee_name, created_at')
        .eq('company_id', ctx.companyId).eq('conversation_key', key).order('created_at')
      return { key, conversations: data, events: events || [] }
    },
  },
  {
    name: 'add_note', scope: 'write', description: 'Add an internal note (never sent to the customer) to a conversation.',
    input: { type: 'object', properties: { conversation_key: { type: 'string' }, body: { type: 'string' } }, required: ['conversation_key', 'body'] },
    run: async (ctx, a) => { await addEvent(ctx, str(a.conversation_key), 'note', str(a.body)); return { ok: true } },
  },
  {
    name: 'transfer_conversation', scope: 'write',
    description: 'Hand a conversation to a team (by name or id), optionally to one person in it, with a reason the team will see.',
    input: { type: 'object', properties: {
      conversation_key: { type: 'string' }, team: { type: 'string', description: 'Team name or id' },
      user_id: { type: 'string', description: 'Optional: login id of a team member' }, reason: { type: 'string' },
    }, required: ['conversation_key', 'team'] },
    run: async (ctx, a) => {
      const t = await resolveTeam(ctx, str(a.team))
      let assignee: { auth_user_id: string; full_name: string } | null = null
      if (str(a.user_id)) {
        const { data } = await ctx.db.from('company_users').select('auth_user_id, full_name').eq('company_id', ctx.companyId).eq('auth_user_id', str(a.user_id)).maybeSingle()
        assignee = data as typeof assignee
      }
      await addEvent(ctx, str(a.conversation_key), 'transfer', str(a.reason), {
        team_id: t.id, team_name: t.name, assignee_user_id: assignee?.auth_user_id ?? null, assignee_name: assignee?.full_name ?? null,
      })
      return { ok: true, team: t.name }
    },
  },
  {
    name: 'set_conversation_status', scope: 'write', description: 'Close or reopen a conversation.',
    input: { type: 'object', properties: { conversation_key: { type: 'string' }, status: { type: 'string', enum: ['open', 'closed'] } }, required: ['conversation_key', 'status'] },
    run: async (ctx, a) => { await addEvent(ctx, str(a.conversation_key), 'status', str(a.status) === 'closed' ? 'closed' : 'open'); return { ok: true } },
  },
  {
    name: 'list_teams', scope: 'read', description: 'The company teams and their members.',
    input: { type: 'object', properties: {} },
    run: async (ctx) => {
      const [t, m, u] = await Promise.all([
        ctx.db.from('company_teams').select('id, name, description').eq('company_id', ctx.companyId),
        ctx.db.from('company_team_members').select('team_id, auth_user_id').eq('company_id', ctx.companyId),
        ctx.db.from('company_users').select('auth_user_id, full_name, role').eq('company_id', ctx.companyId),
      ])
      const names = new Map((u.data || []).map((x) => [x.auth_user_id, x]))
      return (t.data || []).map((team) => ({
        ...team,
        members: (m.data || []).filter((x) => x.team_id === team.id).map((x) => ({ user_id: x.auth_user_id, name: names.get(x.auth_user_id)?.full_name ?? null, role: names.get(x.auth_user_id)?.role ?? null })),
      }))
    },
  },
  {
    name: 'list_customers', scope: 'read', description: 'Customers, optionally filtered by a name or phone fragment.',
    input: { type: 'object', properties: { q: { type: 'string' }, limit: { type: 'number' } } },
    run: async (ctx, a) => {
      let q = ctx.db.from('clinic_os_patients').select('id, name, phone, patient_type, tags, notes, last_visit_at, total_appointments, created_at')
        .eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(num(a.limit, 25, 200))
      const s = str(a.q).replace(/[%,()]/g, '')
      if (s) q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%`)
      const { data, error } = await q
      if (error) throw new ApiError(400, error.message)
      return data || []
    },
  },
  {
    name: 'upsert_customer', scope: 'write', description: 'Create a customer, or update the one with the same phone number.',
    input: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, notes: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['name', 'phone'] },
    run: async (ctx, a) => {
      const phone = saudiNumber(str(a.phone)) || str(a.phone)
      if (!phone || !str(a.name)) throw new ApiError(400, 'name and phone are required')
      const { data: existing } = await ctx.db.from('clinic_os_patients').select('id').eq('company_id', ctx.companyId).eq('phone', phone).maybeSingle()
      const row: Record<string, unknown> = { name: str(a.name), phone, updated_at: new Date().toISOString() }
      if (a.notes !== undefined) row.notes = str(a.notes)
      if (Array.isArray(a.tags)) row.tags = a.tags.map(String)
      const res = existing
        ? await ctx.db.from('clinic_os_patients').update(row).eq('id', existing.id).select('id').single()
        : await ctx.db.from('clinic_os_patients').insert({ company_id: ctx.companyId, patient_type: 'new', ...row }).select('id').single()
      if (res.error) throw new ApiError(400, res.error.message)
      return { id: res.data.id, created: !existing }
    },
  },
  {
    name: 'list_tickets', scope: 'read', description: 'Support tickets, newest first.',
    input: { type: 'object', properties: { status: { type: 'string' }, limit: { type: 'number' } } },
    run: async (ctx, a) => {
      let q = ctx.db.from('ai_agent_support_tickets').select('id, subject, description, priority, status, ticket_type, customer_name, customer_phone, assignee_name, due_at, created_at')
        .eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(num(a.limit, 25, 100))
      if (str(a.status)) q = q.eq('status', str(a.status))
      const { data, error } = await q
      if (error) throw new ApiError(400, error.message)
      return data || []
    },
  },
  {
    name: 'create_ticket', scope: 'write', description: 'Open a support ticket.',
    input: { type: 'object', properties: {
      subject: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
      customer_name: { type: 'string' }, customer_phone: { type: 'string' },
    }, required: ['subject', 'description'] },
    run: async (ctx, a) => {
      const { data, error } = await ctx.db.from('ai_agent_support_tickets').insert({
        company_id: ctx.companyId, subject: str(a.subject), description: str(a.description), priority: str(a.priority) || 'normal',
        status: 'open', ticket_type: 'api', customer_name: str(a.customer_name) || null, customer_phone: str(a.customer_phone) || null,
      }).select('id').single()
      if (error) throw new ApiError(400, error.message)
      return { id: data.id }
    },
  },
  {
    name: 'update_ticket', scope: 'write', description: 'Change a ticket status or priority.',
    input: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, priority: { type: 'string' } }, required: ['id'] },
    run: async (ctx, a) => {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (str(a.status)) row.status = str(a.status)
      if (str(a.priority)) row.priority = str(a.priority)
      const { error } = await ctx.db.from('ai_agent_support_tickets').update(row).eq('id', str(a.id)).eq('company_id', ctx.companyId)
      if (error) throw new ApiError(400, error.message)
      return { ok: true }
    },
  },
  {
    name: 'list_bookings', scope: 'read', description: 'Bookings/appointments in a date range (default: from today).',
    input: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' }, status: { type: 'string' }, limit: { type: 'number' } } },
    run: async (ctx, a) => {
      const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)
      let q = ctx.db.from('clinic_os_appointments').select('id, patient_name, patient_phone, service_name, doctor_name, appointment_date, start_time, end_time, status, source, notes')
        .eq('company_id', ctx.companyId).gte('appointment_date', str(a.from) || today).order('appointment_date').order('start_time').limit(num(a.limit, 50, 200))
      if (str(a.to)) q = q.lte('appointment_date', str(a.to))
      if (str(a.status)) q = q.eq('status', str(a.status))
      const { data, error } = await q
      if (error) throw new ApiError(400, error.message)
      return data || []
    },
  },
  {
    name: 'create_booking', scope: 'write', description: 'Create a booking for a customer.',
    input: { type: 'object', properties: {
      customer_name: { type: 'string' }, customer_phone: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' },
      start_time: { type: 'string', description: 'HH:MM (24h, Saudi time)' }, duration_minutes: { type: 'number' }, service_name: { type: 'string' }, notes: { type: 'string' },
    }, required: ['customer_name', 'customer_phone', 'date', 'start_time'] },
    run: async (ctx, a) => {
      const start = str(a.start_time)
      if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(str(a.date))) throw new ApiError(400, 'date must be YYYY-MM-DD and start_time HH:MM')
      const mins = num(a.duration_minutes, 30, 480)
      const [h, m] = start.split(':').map(Number)
      const endTotal = h * 60 + m + mins
      const end = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`
      const { data, error } = await ctx.db.from('clinic_os_appointments').insert({
        company_id: ctx.companyId, patient_name: str(a.customer_name), patient_phone: saudiNumber(str(a.customer_phone)) || str(a.customer_phone),
        appointment_date: str(a.date), start_time: start, end_time: end, duration_minutes: mins, service_name: str(a.service_name) || null,
        notes: str(a.notes) || null, status: 'confirmed', source: 'api',
      }).select('id').single()
      if (error) throw new ApiError(400, error.message)
      return { id: data.id }
    },
  },
  {
    name: 'list_whatsapp_templates', scope: 'read', description: 'Approved WhatsApp templates that can be sent with send_whatsapp_template.',
    input: { type: 'object', properties: {} },
    run: async (ctx) => {
      const { data } = await ctx.db.from('whatsapp_templates').select('id, name, label, body, param_labels, language').eq('company_id', ctx.companyId).eq('enabled', true)
      return data || []
    },
  },
  {
    name: 'send_whatsapp_template', scope: 'write',
    description: 'Send an approved WhatsApp template to one customer from the company WhatsApp number.',
    input: { type: 'object', properties: {
      template: { type: 'string', description: 'Template id or name' }, phone: { type: 'string' }, name: { type: 'string' },
      params: { type: 'array', items: { type: 'string' }, description: 'Values for {{1}}, {{2}}… in order' },
    }, required: ['template', 'phone'] },
    run: async (ctx, a) => {
      const t = str(a.template)
      const q = ctx.db.from('whatsapp_templates').select('id').eq('company_id', ctx.companyId).eq('enabled', true)
      const { data: tpl } = await (/^[0-9a-f-]{36}$/i.test(t) ? q.eq('id', t) : q.eq('name', t)).maybeSingle()
      if (!tpl) throw new ApiError(404, 'template not found')
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-outreach`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: tpl.id, company_id: ctx.companyId, sent_by: `API · ${ctx.keyName}`, recipients: [{ phone: str(a.phone), name: str(a.name), params: Array.isArray(a.params) ? a.params.map(String) : [] }] }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new ApiError(res.status, out.error || 'send failed')
      return out.results?.[0] || out
    },
  },
]

export function findOp(name: string): Op | undefined { return OPS.find((o) => o.name === name) }
