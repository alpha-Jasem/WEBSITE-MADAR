// Zaki: the client dashboard's assistant. It answers questions about the signed-in person's own company
// with read-only tools (conversations, customers, bookings, campaigns, team load). It never sends or
// changes anything. Chats are kept in ai_assistant_conversations / ai_assistant_messages (route 'zaki').
//   POST { action: 'list' }                                   -> { threads: [{ id, title, updated_at }] }
//   POST { action: 'messages', conversation_id }              -> { messages: [{ role, content, created_at }] }
//   POST { action: 'ask', message, conversation_id? }         -> { reply, conversation_id, tools: string[] }
//   POST { action: 'delete', conversation_id }                -> { ok }

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const DAILY_LIMIT = 100
const DAY = 86_400_000
const riyadhDate = (ms = Date.now()) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 10)
const since = (days: number) => new Date(Date.now() - Math.max(1, Math.min(365, days || 7)) * DAY).toISOString()

const TOOLS = [
  { type: 'function', function: { name: 'conversations_overview', description: 'Counts of conversations in the last N days: total, by channel, needing review, and per day.',
    parameters: { type: 'object', properties: { days: { type: 'integer', description: '1 = today' } }, required: ['days'] } } },
  { type: 'function', function: { name: 'list_conversations', description: 'Recent conversations with name, phone, channel, time and summary. Filter to ones needing review.',
    parameters: { type: 'object', properties: { days: { type: 'integer' }, needs_review: { type: 'boolean' }, limit: { type: 'integer' } }, required: ['days'] } } },
  { type: 'function', function: { name: 'find_customer', description: 'Look up a customer by part of their name or phone; returns their details and last conversations.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'bookings', description: 'Bookings/appointments between two dates (YYYY-MM-DD, Saudi time), with status.',
    parameters: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] } } },
  { type: 'function', function: { name: 'unanswered_topics', description: 'What customers asked about that the agent could not handle (review reasons and summaries) in the last N days.',
    parameters: { type: 'object', properties: { days: { type: 'integer' } }, required: ['days'] } } },
  { type: 'function', function: { name: 'campaigns_summary', description: 'WhatsApp campaigns with status, audience size, messages sent and failed.',
    parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'team_load', description: 'Open conversations each team member holds now, and who is unassigned.',
    parameters: { type: 'object', properties: {} } } },
]

async function runTool(db: SupabaseClient, company: string, name: string, a: Record<string, unknown>) {
  try {
    if (name === 'conversations_overview') {
      const { data } = await db.from('clinic_os_ai_calls').select('channel, call_time, needs_review').eq('company_id', company).gte('call_time', since(Number(a.days))).limit(5000)
      const rows = data || []
      const byChannel: Record<string, number> = {}
      const byDay: Record<string, number> = {}
      for (const r of rows) { byChannel[r.channel || 'phone'] = (byChannel[r.channel || 'phone'] || 0) + 1; const d = riyadhDate(Date.parse(r.call_time)); byDay[d] = (byDay[d] || 0) + 1 }
      return { total: rows.length, by_channel: byChannel, needs_review: rows.filter((r) => r.needs_review).length, per_day: byDay }
    }
    if (name === 'list_conversations') {
      let q = db.from('clinic_os_ai_calls').select('caller_name, phone, channel, call_time, summary, needs_review, review_reason')
        .eq('company_id', company).gte('call_time', since(Number(a.days))).order('call_time', { ascending: false }).limit(Math.min(30, Number(a.limit) || 15))
      if (a.needs_review) q = q.eq('needs_review', true)
      const { data } = await q
      return { conversations: (data || []).map((r) => ({ ...r, summary: String(r.summary || '').slice(0, 220) })) }
    }
    if (name === 'find_customer') {
      const raw = String(a.query || '').trim().slice(0, 60)
      if (!raw) return { error: 'empty query' }
      const digits = raw.replace(/\D/g, '')
      const like = `%${digits.length >= 4 ? digits.slice(-9) : raw.replace(/[%_,()]/g, '')}%`
      const [p, c] = await Promise.all([
        db.from('clinic_os_patients').select('name, phone, patient_type, last_visit_at, total_appointments, no_show_count, notes').eq('company_id', company)
          .or(`name.ilike.${like},phone.ilike.${like}`).limit(5),
        db.from('clinic_os_ai_calls').select('caller_name, phone, channel, call_time, summary').eq('company_id', company)
          .or(`caller_name.ilike.${like},phone.ilike.${like}`).order('call_time', { ascending: false }).limit(8),
      ])
      return { saved_customers: p.data || [], recent_conversations: (c.data || []).map((r) => ({ ...r, summary: String(r.summary || '').slice(0, 200) })) }
    }
    if (name === 'bookings') {
      const { data } = await db.from('clinic_os_appointments').select('patient_name, patient_phone, service_name, doctor_name, appointment_date, start_time, status')
        .eq('company_id', company).gte('appointment_date', String(a.from)).lte('appointment_date', String(a.to)).order('appointment_date').order('start_time').limit(60)
      const rows = data || []
      const byStatus: Record<string, number> = {}
      for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1
      return { count: rows.length, by_status: byStatus, bookings: rows.slice(0, 40) }
    }
    if (name === 'unanswered_topics') {
      const { data } = await db.from('clinic_os_ai_calls').select('review_reason, summary, call_time').eq('company_id', company)
        .eq('needs_review', true).gte('call_time', since(Number(a.days))).order('call_time', { ascending: false }).limit(40)
      return { items: (data || []).map((r) => ({ reason: r.review_reason, summary: String(r.summary || '').slice(0, 200), at: r.call_time })) }
    }
    if (name === 'campaigns_summary') {
      const [c, m] = await Promise.all([
        db.from('client_campaigns').select('id, name, kind, status, scheduled_at, recipients').eq('company_id', company).order('created_at', { ascending: false }).limit(20),
        db.from('outreach_messages').select('campaign_id, status').eq('company_id', company).not('campaign_id', 'is', null).limit(5000),
      ])
      if (c.error) return { error: 'campaigns are not set up yet' }
      return { campaigns: (c.data || []).map((x) => ({
        name: x.name, kind: x.kind, status: x.status, scheduled_at: x.scheduled_at, audience: Array.isArray(x.recipients) ? x.recipients.length : 0,
        sent: (m.data || []).filter((r) => r.campaign_id === x.id && r.status === 'sent').length,
        failed: (m.data || []).filter((r) => r.campaign_id === x.id && r.status === 'failed').length,
      })) }
    }
    if (name === 'team_load') {
      const { data, error } = await db.rpc('madar_conversation_states', { p_company: company })
      if (error) return { error: 'assignment is not set up' }
      const rows = (data || []) as { assignee: string | null; closed: boolean; status?: string }[]
      const open = rows.filter((r) => (r.status ? r.status === 'open' : !r.closed))
      const per: Record<string, number> = {}
      for (const r of open) if (r.assignee) per[r.assignee] = (per[r.assignee] || 0) + 1
      const { data: people } = await db.from('company_users').select('auth_user_id, full_name').eq('company_id', company)
      const nameOf = (id: string) => (people || []).find((p) => p.auth_user_id === id)?.full_name || 'عضو'
      return { open_unassigned: open.filter((r) => !r.assignee).length, per_member: Object.entries(per).map(([id, n]) => ({ name: nameOf(id), open: n })) }
    }
    return { error: 'unknown tool' }
  } catch (e) {
    return { error: (e as Error).message.slice(0, 160) }
  }
}

const TOOL_LABEL: Record<string, string> = {
  conversations_overview: 'إحصاء المحادثات', list_conversations: 'قائمة المحادثات', find_customer: 'بحث عن عميل', bookings: 'الحجوزات',
  unanswered_topics: 'الأسئلة اللي ما انجاوبت', campaigns_summary: 'الحملات', team_load: 'ضغط الفريق',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false },
  })
  const { data: userData } = await asUser.auth.getUser()
  const user = userData?.user
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!user || !companyId) return json({ error: 'unauthorized' }, 401)
  const company = companyId as string
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || 'ask')

  // Only this person's own Zaki chats.
  const ownThread = async (id: unknown) => {
    if (typeof id !== 'string') return null
    const { data } = await db.from('ai_assistant_conversations').select('id').eq('id', id).eq('user_id', user.id).eq('company_id', company).maybeSingle()
    return data?.id ?? null
  }

  if (action === 'list') {
    const { data: ids } = await db.from('ai_assistant_messages').select('conversation_id').eq('user_id', user.id).eq('company_id', company).eq('route', 'zaki').limit(2000)
    const unique = [...new Set((ids || []).map((r) => r.conversation_id))]
    if (!unique.length) return json({ threads: [] })
    const { data } = await db.from('ai_assistant_conversations').select('id, title, updated_at').in('id', unique).order('updated_at', { ascending: false }).limit(50)
    return json({ threads: data || [] })
  }
  if (action === 'messages') {
    const id = await ownThread(body.conversation_id)
    if (!id) return json({ error: 'not found' }, 404)
    const { data } = await db.from('ai_assistant_messages').select('role, content, created_at').eq('conversation_id', id).order('created_at').limit(200)
    return json({ messages: data || [] })
  }
  if (action === 'delete') {
    const id = await ownThread(body.conversation_id)
    if (!id) return json({ error: 'not found' }, 404)
    await db.from('ai_assistant_messages').delete().eq('conversation_id', id)
    await db.from('ai_assistant_conversations').delete().eq('id', id)
    return json({ ok: true })
  }

  const message = String(body.message || '').trim().slice(0, 1500)
  if (!message) return json({ error: 'empty' }, 400)
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return json({ error: 'not_configured', reply: 'زكي غير مفعّل حاليًا.' }, 200)

  // Daily cap per company, shared with the support assistant's counter.
  const today = riyadhDate()
  const scope = `zaki:${company}`
  const { data: usage } = await db.from('ai_assistant_usage').select('id, message_count').eq('scope_key', scope).eq('usage_date', today).maybeSingle()
  if ((usage?.message_count || 0) >= DAILY_LIMIT) return json({ error: 'limit', reply: `وصلت حد اليوم (${DAILY_LIMIT} سؤال). يرجع بكرة.` }, 200)
  if (usage?.id) await db.from('ai_assistant_usage').update({ message_count: usage.message_count + 1, updated_at: new Date().toISOString() }).eq('id', usage.id)
  else await db.from('ai_assistant_usage').insert({ scope_key: scope, company_id: company, user_id: user.id, portal: 'client', usage_date: today, message_count: 1 })

  let threadId = await ownThread(body.conversation_id)
  if (!threadId) {
    const { data } = await db.from('ai_assistant_conversations').insert({ company_id: company, user_id: user.id, portal: 'client', title: message.slice(0, 60) }).select('id').single()
    threadId = data?.id ?? null
  }
  if (!threadId) return json({ error: 'failed' }, 500)
  const { data: past } = await db.from('ai_assistant_messages').select('role, content').eq('conversation_id', threadId).order('created_at', { ascending: false }).limit(10)
  await db.from('ai_assistant_messages').insert({ conversation_id: threadId, company_id: company, user_id: user.id, portal: 'client', route: 'zaki', role: 'user', content: message })

  const { data: co } = await db.from('companies').select('name, business_type').eq('id', company).maybeSingle()
  const system = `أنت «زكي»، مساعد ذكي داخل لوحة تحكم شركة ${co?.name || ''}. تجاوب عن بيانات الشركة فقط باستخدام الأدوات المتاحة، وكلها للقراءة.
القواعد:
- اليوم في الرياض: ${today}. حوّل «اليوم»، «أمس»، «هالأسبوع» لتواريخ صحيحة.
- لا تخترع أرقامًا أو أسماء. إذا الأداة ما رجعت بيانات قل ذلك بوضوح.
- ما تقدر ترسل رسائل ولا تعدل شيء؛ إذا طُلب منك، وضّح الصفحة اللي يسويه منها (المحادثات، الحملات، الشرائح، الفريق).
- تكلم بلهجة سعودية بيضاء مختصرة، بدون إيموجي وبدون Markdown. لا تذكر أسماء جداول أو حقول تقنية.
- رتّب الجواب: سطر خلاصة، ثم نقاط قصيرة بالأرقام إذا لزم، ثم توصية عملية وحدة.`
  const messages: Record<string, unknown>[] = [
    { role: 'system', content: system },
    ...((past || []).reverse().map((m) => ({ role: m.role, content: String(m.content).slice(0, 900) }))),
    { role: 'user', content: message },
  ]
  const used: string[] = []
  const model = Deno.env.get('ZAKI_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  let reply = ''
  for (let round = 0; round < 5 && !reply; round++) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto', max_tokens: 600 }),
    })
    const out = await res.json().catch(() => ({}))
    if (!res.ok) { reply = /credit|quota|billing/i.test(JSON.stringify(out)) ? 'زكي متوقف مؤقتًا لانتهاء رصيد الذكاء الاصطناعي.' : 'تعذّر الاتصال الآن، حاول بعد شوي.'; break }
    const msg = out.choices?.[0]?.message
    if (!msg) { reply = 'ما وصلني رد، حاول مرة ثانية.'; break }
    messages.push(msg)
    if (!msg.tool_calls?.length) { reply = String(msg.content || '').replace(/\*\*/g, '').trim(); break }
    for (const call of msg.tool_calls) {
      let args: Record<string, unknown> = {}
      try { args = JSON.parse(call.function.arguments || '{}') } catch { /* keep empty */ }
      used.push(TOOL_LABEL[call.function.name] || call.function.name)
      const result = await runTool(db, company, call.function.name, args)
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 12000) })
    }
  }
  if (!reply) reply = 'سؤالك يحتاج خطوات كثيرة، جرّب تقسمه.'
  await db.from('ai_assistant_messages').insert({ conversation_id: threadId, company_id: company, user_id: user.id, portal: 'client', route: 'zaki', role: 'assistant', content: reply })
  await db.from('ai_assistant_conversations').update({ updated_at: new Date().toISOString() }).eq('id', threadId)
  return json({ reply, conversation_id: threadId, tools: [...new Set(used)] })
})
