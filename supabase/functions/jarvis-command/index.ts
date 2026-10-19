// Jarvis: follows the owner's words and edits the dashboard accordingly. Nothing else.
// It can only use the small set of tools below. Every edit runs as the signed-in admin (RLS and the
// database triggers still apply), is logged to audit_events and is reported back in plain words.
// It never sends messages, confirms payments, closes deals or deletes anything.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const STAGES = ['new', 'contacted', 'interested', 'qualified', 'offer_sent', 'negotiation', 'awaiting_payment', 'lost']
const STAGE_AR: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', interested: 'مهتم', qualified: 'مؤهل', offer_sent: 'عرض مرسل',
  negotiation: 'تفاوض', awaiting_payment: 'بانتظار الدفع', won: 'مغلق بنجاح', lost: 'خسارة',
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'add_task',
      description: 'Add a task to the owner\'s to-do list.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          due_at: { type: 'string', description: 'ISO 8601 with +03:00 offset. Omit if no time was said.' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Complete, reopen, rename or reschedule an existing open task, found by part of its title.',
      parameters: {
        type: 'object',
        properties: {
          title_contains: { type: 'string' },
          done: { type: 'boolean' },
          new_title: { type: 'string' },
          due_at: { type: 'string', description: 'ISO 8601 with +03:00 offset' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title_contains'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_monthly_goal',
      description: 'Set this month\'s collection goal in SAR.',
      parameters: { type: 'object', properties: { amount: { type: 'number' } }, required: ['amount'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_deal',
      description: 'Move an open deal to another stage. Closing a deal as won is not allowed here. For lost, give the reason.',
      parameters: {
        type: 'object',
        properties: {
          company_contains: { type: 'string' },
          stage: { type: 'string', enum: STAGES },
          lost_reason: { type: 'string' },
        },
        required: ['company_contains', 'stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_deal_next_step',
      description: 'Set the next step (and optionally its date) on an open deal.',
      parameters: {
        type: 'object',
        properties: {
          company_contains: { type: 'string' },
          next_step: { type: 'string' },
          next_step_at: { type: 'string', description: 'ISO 8601 with +03:00 offset' },
        },
        required: ['company_contains', 'next_step'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_lead_follow_up',
      description: 'Schedule or clear the follow-up reminder of an Outreach lead, found by name or phone.',
      parameters: {
        type: 'object',
        properties: {
          lead_contains: { type: 'string' },
          follow_up_at: { type: 'string', description: 'ISO 8601 with +03:00 offset. Use null to clear.' },
        },
        required: ['lead_contains'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_lead_note',
      description: 'Append a note to an Outreach lead, found by name or phone.',
      parameters: {
        type: 'object',
        properties: { lead_contains: { type: 'string' }, note: { type: 'string' } },
        required: ['lead_contains', 'note'],
      },
    },
  },
]

const clean = (s: unknown) => String(s ?? '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 80)
const validDate = (s: unknown) => {
  if (typeof s !== 'string' || !s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
const riyadhMonthKey = () => {
  const d = new Date(Date.now() + 3 * 3600e3)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}


// ---- Fallback when the language model is unavailable (for example the API balance is empty) ----
// Understands only plain commands for tasks and the monthly goal. Everything else asks the owner to retry.
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const westernDigits = (t: string) => t.replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d)))

function riyadhIso(dayOffset: number, hour: number, minute = 0) {
  const r = new Date(Date.now() + 3 * 3600e3)
  const d = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate() + dayOffset, hour - 3, minute))
  return d.toISOString()
}

function ruleBased(raw: string): { tool: string; args: Record<string, unknown> } | null {
  const t = westernDigits(raw.trim()).replace(/\s+/g, ' ')

  const goal = t.match(/(?:هدف|الهدف)(?: الشهر| الشهري)?\D{0,12}?(\d[\d,.]*)/)
  if (goal && /هدف|الهدف/.test(t)) return { tool: 'set_monthly_goal', args: { amount: Number(goal[1].replace(/[,]/g, '')) } }

  const done = t.match(/^(?:كمل|كمّل|خلص|خلّص|انجز|أنجز|اكمل|أكمل|تم)\s+(?:مهمة\s+)?(.+)$/)
  if (done) return { tool: 'update_task', args: { title_contains: done[1].trim(), done: true } }

  const add = t.match(/^(?:(?:اضف|أضف|ضيف|سوي|سجل|سجّل|حط)\s+(?:لي\s+)?(?:مهمة|تذكير)|ذكرني(?: ب)?)\s*(.+)$/)
  if (add) {
    let title = add[1]
    let day: number | null = null
    if (/بعد بكرة|بعد غد/.test(title)) { day = 2; title = title.replace(/بعد بكرة|بعد غد/, '') }
    else if (/بكرة|بكره|غدا|غداً/.test(title)) { day = 1; title = title.replace(/بكرة|بكره|غدا|غداً/, '') }
    else if (/اليوم/.test(title)) { day = 0; title = title.replace(/اليوم/, '') }
    let due: string | null = null
    const time = title.match(/(?:الساعة|ساعة|الساعه)\s*(\d{1,2})(?::(\d{2}))?\s*(صباح|الصبح|ظهر|عصر|العصر|مساء|المغرب|ليل|الليل)?/)
    if (time) {
      let h = Number(time[1]); const m = Number(time[2] ?? 0)
      const per = time[3] ?? ''
      if (/عصر|العصر|مساء|المغرب|ليل|الليل/.test(per) && h < 12) h += 12
      if (/ظهر/.test(per) && h < 11) h += 12
      due = riyadhIso(day ?? 0, Math.min(h, 23), m)
      title = title.replace(time[0], '')
    } else if (day !== null) due = riyadhIso(day, 9)
    title = title.replace(/\s+/g, ' ').trim()
    if (title) return { tool: 'add_task', args: { title, ...(due ? { due_at: due } : {}) } }
  }
  return null
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })

  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)
  const { data: u } = await service.auth.getUser(token)
  if (!u.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) return json({ error: 'not_configured', reply: 'جارفيس غير مفعّل: مفتاح OPENAI_API_KEY غير مضبوط على الخادم.' }, 200)

  let body: { message?: string; history?: { role: string; content: string }[] } = {}
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  const message = String(body.message ?? '').trim().slice(0, 1200)
  if (!message) return json({ error: 'empty' }, 400)

  // edits run as the admin: row-level security and the business-rule triggers apply
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  const changes: string[] = []

  const audit = (action: string, entity: string, id: string | null, before: unknown, after: unknown) =>
    service.from('audit_events').insert({ actor_id: u.user!.id, actor_type: 'owner', action: `jarvis:${action}`, entity_type: entity, entity_id: id, before, after })

  async function runTool(name: string, a: Record<string, unknown>): Promise<Record<string, unknown>> {
    switch (name) {
      case 'add_task': {
        const title = String(a.title ?? '').trim().slice(0, 200)
        if (!title) return { error: 'العنوان فارغ' }
        const row = { title, due_at: validDate(a.due_at), priority: ['high', 'medium', 'low'].includes(String(a.priority)) ? a.priority : 'medium', created_by: u.user!.id }
        const { data, error } = await db.from('admin_tasks').insert(row).select('id, title, due_at').single()
        if (error) return { error: error.message }
        await audit('add_task', 'admin_task', data.id, null, data)
        changes.push(`مهمة جديدة: ${data.title}`)
        return { ok: true, task: data }
      }
      case 'update_task': {
        const q = clean(a.title_contains)
        const { data: found } = await db.from('admin_tasks').select('id, title, done, due_at, priority').ilike('title', `%${q}%`).order('created_at', { ascending: false }).limit(6)
        if (!found?.length) return { error: `ما لقيت مهمة فيها «${q}»` }
        const open = found.filter(t => !t.done)
        const pool = a.done === false ? found.filter(t => t.done) : open
        if (pool.length !== 1) return { error: pool.length ? 'أكثر من مهمة تطابق، اسأل المالك أيها يقصد' : 'لا توجد مهمة مطابقة بهذه الحالة', candidates: (pool.length ? pool : found).map(t => t.title) }
        const t = pool[0]
        const patch: Record<string, unknown> = {}
        if (typeof a.done === 'boolean') { patch.done = a.done; patch.done_at = a.done ? new Date().toISOString() : null }
        if (a.new_title) patch.title = String(a.new_title).trim().slice(0, 200)
        if (a.due_at) { const d = validDate(a.due_at); if (d) patch.due_at = d }
        if (a.priority && ['high', 'medium', 'low'].includes(String(a.priority))) patch.priority = a.priority
        if (!Object.keys(patch).length) return { error: 'ما فيه تعديل مطلوب' }
        const { error } = await db.from('admin_tasks').update(patch).eq('id', t.id)
        if (error) return { error: error.message }
        await audit('update_task', 'admin_task', t.id, t, patch)
        changes.push(`مهمة «${t.title}»: ${patch.done === true ? 'اكتملت' : patch.done === false ? 'أُعيد فتحها' : 'تعدّلت'}`)
        return { ok: true, task: t.title, patch }
      }
      case 'set_monthly_goal': {
        const amount = Number(a.amount)
        if (!Number.isFinite(amount) || amount < 0 || amount > 1e9) return { error: 'مبلغ غير صالح' }
        const { error } = await db.from('agency_goals').upsert({ period: riyadhMonthKey(), kind: 'collections', target: amount, updated_at: new Date().toISOString() }, { onConflict: 'period,kind' })
        if (error) return { error: error.message }
        await audit('set_goal', 'agency_goal', riyadhMonthKey(), null, { amount })
        changes.push(`هدف الشهر: ${amount.toLocaleString('en-US')} ر.س`)
        return { ok: true, amount }
      }
      case 'move_deal':
      case 'set_deal_next_step': {
        const q = clean(a.company_contains)
        const { data: found } = await db.from('deals').select('id, company_name, stage, next_step, next_step_at').ilike('company_name', `%${q}%`).not('stage', 'in', '(won,lost)').limit(6)
        if (!found?.length) return { error: `ما لقيت صفقة مفتوحة باسم «${q}»` }
        if (found.length > 1) return { error: 'أكثر من صفقة تطابق، اسأل المالك أيها يقصد', candidates: found.map(d => d.company_name) }
        const d = found[0]
        const now = new Date().toISOString()
        if (name === 'move_deal') {
          const stage = String(a.stage)
          if (!STAGES.includes(stage)) return { error: 'مرحلة غير معروفة' }
          const patch: Record<string, unknown> = { stage, updated_at: now }
          if (stage === 'lost') { patch.closed_at = now; patch.lost_reason = String(a.lost_reason ?? '').trim().slice(0, 200) || 'غير محدد' }
          const { error } = await db.from('deals').update(patch).eq('id', d.id)
          if (error) return { error: error.message }
          await db.from('deal_events').insert({ deal_id: d.id, type: 'stage_change', data: { from: d.stage, to: stage, by: 'jarvis' } })
          await audit('move_deal', 'deal', d.id, { stage: d.stage }, { stage })
          changes.push(`صفقة «${d.company_name}»: ${STAGE_AR[d.stage]} ← ${STAGE_AR[stage]}`)
          return { ok: true, company: d.company_name, from: d.stage, to: stage }
        }
        const patch: Record<string, unknown> = { next_step: String(a.next_step ?? '').trim().slice(0, 300), updated_at: now }
        if (a.next_step_at) { const dt = validDate(a.next_step_at); if (dt) patch.next_step_at = dt }
        const { error } = await db.from('deals').update(patch).eq('id', d.id)
        if (error) return { error: error.message }
        await audit('deal_next_step', 'deal', d.id, { next_step: d.next_step, next_step_at: d.next_step_at }, patch)
        changes.push(`خطوة قادمة لـ«${d.company_name}»: ${patch.next_step}`)
        return { ok: true, company: d.company_name }
      }
      case 'set_lead_follow_up':
      case 'add_lead_note': {
        const q = clean(a.lead_contains)
        const digits = q.replace(/\D/g, '')
        let query = db.from('outreach_leads').select('id, name, phone, notes, next_follow_up').limit(6)
        query = digits.length >= 6 ? query.ilike('phone', `%${digits.replace(/^0/, '')}%`) : query.ilike('name', `%${q}%`)
        const { data: found } = await query
        if (!found?.length) return { error: `ما لقيت عميل باسم أو رقم «${q}»` }
        if (found.length > 1) return { error: 'أكثر من عميل يطابق، اسأل المالك أيهم يقصد', candidates: found.map(l => `${l.name} (${l.phone})`) }
        const l = found[0]
        const now = new Date().toISOString()
        if (name === 'set_lead_follow_up') {
          const at = a.follow_up_at === null || a.follow_up_at === undefined || a.follow_up_at === '' ? null : validDate(a.follow_up_at)
          if (a.follow_up_at && !at) return { error: 'تاريخ غير صالح' }
          const { error } = await db.from('outreach_leads').update({ next_follow_up: at, updated_at: now }).eq('id', l.id)
          if (error) return { error: error.message }
          await audit('lead_follow_up', 'outreach_lead', l.id, { next_follow_up: l.next_follow_up }, { next_follow_up: at })
          changes.push(at ? `متابعة «${l.name}» بتاريخ ${new Date(at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' })}` : `إلغاء متابعة «${l.name}»`)
          return { ok: true, lead: l.name, follow_up_at: at }
        }
        const note = String(a.note ?? '').trim().slice(0, 600)
        if (!note) return { error: 'الملاحظة فارغة' }
        const notes = [l.notes, note].filter(Boolean).join('\n')
        const { error } = await db.from('outreach_leads').update({ notes, updated_at: now }).eq('id', l.id)
        if (error) return { error: error.message }
        await audit('lead_note', 'outreach_lead', l.id, { notes: l.notes }, { notes })
        changes.push(`ملاحظة على «${l.name}»`)
        return { ok: true, lead: l.name }
      }
      default:
        return { error: 'أداة غير معروفة' }
    }
  }

  const nowRiyadh = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const system = `أنت جارفيس، مساعد مالك وكالة مدار داخل لوحة الإدارة. تتبّع كلام المالك وتعدّل على لوحته بالأدوات المتاحة فقط، وما عدا ذلك لا تفعل شيئًا.
القواعد:
- الوقت الآن في الرياض: ${nowRiyadh}. حوّل «بكرة»، «الخميس»، «بعد ساعتين» إلى تاريخ ISO بتوقيت +03:00.
- نفّذ فقط ما طلبه المالك صراحة. لا تخترع أسماء أو أرقام أو مبالغ. إذا نقصتك معلومة ضرورية أو تطابق أكثر من عنصر، اسأل سؤالًا قصيرًا واحدًا.
- لا ترسل رسائل، ولا تؤكد دفعات، ولا تغلق صفقة كمكسوبة، ولا تحذف. إذا طلب ذلك قل إنه يتم من صفحته يدويًا.
- بعد كل تعديل أكّد بجملة قصيرة ما الذي تغيّر بالضبط. إذا فشلت الأداة قل السبب كما هو.
- تكلم بلهجة سعودية بيضاء مختصرة، بدون إيموجي. ما تشرح عملك التقني.
- تابع سياق المحادثة: «عدّلها» أو «خليها بكرة» تعود لآخر عنصر ذكرناه.`

  const history = (Array.isArray(body.history) ? body.history : []).slice(-10)
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 800) }))
  const messages: Record<string, unknown>[] = [{ role: 'system', content: system }, ...history, { role: 'user', content: message }]
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'

  try {
    for (let round = 0; round < 5; round++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto' }),
      })
      const out = await res.json()
      if (!res.ok) {
        const detail = String(out?.error?.message ?? res.status).slice(0, 200)
        const simple = round === 0 ? ruleBased(message) : null
        if (simple) {
          const result = await runTool(simple.tool, simple.args)
          if (result.error) return json({ ok: true, reply: String(result.error), changes, error: 'tool_error', detail }, 200)
          return json({ ok: true, reply: 'تم.', changes, fallback: true }, 200)
        }
        const noCredit = /credit|quota|billing/i.test(detail)
        return json({ error: 'model_error', reply: noCredit ? 'رصيد OpenAI منتهي، فجارفيس يفهم الأوامر البسيطة فقط الآن (إضافة مهمة، إكمال مهمة، هدف الشهر). اشحن الرصيد ليفهم كل شي.' : 'تعذّر الاتصال بالنموذج الآن. حاول بعد قليل.', detail }, 200)
      }
      const msg = out.choices?.[0]?.message
      if (!msg) return json({ error: 'no_reply', reply: 'ما وصلني رد. أعد المحاولة.' }, 200)
      messages.push(msg)
      if (!msg.tool_calls?.length) return json({ ok: true, reply: String(msg.content ?? '').trim() || 'تم.', changes })
      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch { /* empty */ }
        const result = await runTool(call.function.name, args)
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) })
      }
    }
    return json({ ok: true, reply: 'طلبك يحتاج خطوات أكثر من اللازم. قسّمه لطلبات أصغر.', changes })
  } catch (e) {
    return json({ error: 'failed', reply: 'صار خطأ غير متوقع. حاول مرة ثانية.', detail: (e as Error).message.slice(0, 200) }, 200)
  }
})
