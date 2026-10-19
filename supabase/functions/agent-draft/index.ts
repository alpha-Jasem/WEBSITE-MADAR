// Sales-agent brain for drafts and dry-run conversations. Admin only. It never sends anything:
//  - draft:    writes the first WhatsApp message for each chosen lead and stores it as a draft for review
//  - simulate: plays a short sales conversation (the customer is played by the model) so the owner can see how the agent behaves
// The agent only states approved prices, never goes under the agent's limits, admits it is an automated assistant when asked,
// and stops when the customer says no.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type Lead = { id: string; name: string; phone: string; category: string | null; city: string | null; rating: number | null; reviews: number | null; website: string | null }
type Agent = { id: string; name: string; min_price: number | null; max_discount_pct: number | null }
type Campaign = { name: string; service: string; offer: string } | null
type Price = { name: string; setup: number | null; monthly: number | null }

const PRODUCT = `مدار (madar.software) تبني وكلاء ذكاء اصطناعي يردون على عملاء النشاط على واتساب والمكالمات والموقع على مدار الساعة، يجاوبون الأسئلة المتكررة، يحجزون المواعيد، ويحوّلون العميل لموظف عند الحاجة. تناسب العيادات والمطاعم والعقارات والمتاجر.`

type Cfg = { agent_product?: string; agent_instructions?: string; agent_tone?: string } | null
function agentSystem(agent: Agent, lead: Lead, campaign: Campaign, prices: Price[], cfg: Cfg = null) {
  const priceText = prices.length
    ? prices.map(p => `${p.name}: تأسيس ${p.setup ?? '—'} ر.س، شهري ${p.monthly ?? '—'} ر.س (قبل الضريبة)`).join(' | ')
    : 'لا توجد أسعار معتمدة بعد.'
  return `أنت ${agent.name}، مساعد مبيعات آلي يعمل لصالح شركة مدار. تكتب رسائل واتساب لصاحب نشاط تجاري سعودي.
المنتج: ${cfg?.agent_product?.trim() || PRODUCT}
${campaign ? `الحملة: ${campaign.name}. الخدمة: ${campaign.service}. العرض: ${campaign.offer}.` : ''}
العميل المستهدف: ${lead.name}${lead.category ? ` (${lead.category})` : ''}${lead.city ? ` في ${lead.city}` : ''}${lead.rating ? `، تقييمه ${lead.rating} من ${lead.reviews ?? 0} تقييم` : ''}${lead.website ? '' : '، وما عنده موقع إلكتروني'}.
الأسعار المعتمدة: ${priceText}
حدودك: أقل سعر مسموح ${agent.min_price ?? 'غير محدد'}، أقصى خصم ${agent.max_discount_pct != null ? agent.max_discount_pct + '%' : 'غير مسموح بأي خصم'}.

القواعد (لا تخالفها):
- لهجة سعودية بيضاء ${cfg?.agent_tone === 'formal' ? 'رسمية ومهذبة جدًا' : 'ودودة مهذبة'}، رسالة من جملة إلى ثلاث جمل، بدون إيموجي زائدة وبدون قوائم.
- عرّف بنفسك بصدق في أول رسالة فقط: مساعد آلي من مدار، ولا تكرر التعريف بعدها. إذا سُئلت «هل أنت روبوت؟» أو «مين تكلمني؟» اعترف بأنك مساعد آلي وأن موظفًا من مدار يكمل معه إن أحب.
- لا تذكر سعرًا إلا من الأسعار المعتمدة أعلاه. إذا ما فيه سعر معتمد قل إن السعر يتحدد بعد فهم احتياجه وإن الموظف يرسل له عرضًا رسميًا. لا تخترع أرقامًا أو نتائج أو عملاء سابقين أو شهادات. أول مرة يسأل عن السعر وما فيه سعر معتمد: قل إن السعر يتحدد حسب احتياجه واسأل سؤالًا واحدًا. المرة الثانية: لا تسأل أي سؤال جديد ولا تكرر الجملة السابقة؛ اعرض عليه مكالمة 15 دقيقة اليوم أو بكرة مع موظف يعطيه العرض الرسمي، وأضف في آخر الرد الوسم [ESCALATE].
- لا تعطي خصمًا ولا تنزل عن أقل سعر. إذا طلب خصمًا أكبر من المسموح قل إنك ترفع الطلب للمسؤول ولا تعد بشي.
- هدفك: تفهم احتياجه بسؤال واحد في كل رسالة (عدد الرسائل اليومية، من يرد، هل يفوته عملاء)، ثم تقترح مكالمة أو عرضًا قصيرًا 15 دقيقة. لا تضغط ولا تكرر.
- إذا قال «لا أرغب» أو «لا تراسلني» أو ما يشبهها: اعتذر بجملة واحدة وتوقف، وأضف في آخر الرد الوسم [STOP].
- إذا طلب شيئًا خارج صلاحيتك (عقد، استثناء، سعر خاص) أضف في آخر الرد الوسم [ESCALATE].${cfg?.agent_instructions?.trim() ? `
تعليمات إضافية من المالك (لا تتعارض مع القواعد أعلاه):
${cfg.agent_instructions.trim().slice(0, 1500)}` : ''}`
}

async function chat(key: string, model: string, messages: Record<string, unknown>[], maxTokens = 220) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_completion_tokens: maxTokens }),
  })
  const out = await res.json()
  if (!res.ok) throw new Error(String(out?.error?.message ?? res.status).slice(0, 200))
  return String(out.choices?.[0]?.message?.content ?? '').trim()
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!token) return json({ error: 'missing_auth' }, 401)
  const { data: u } = await service.auth.getUser(token)
  if (!u.user) return json({ error: 'invalid_auth' }, 401)
  const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)

  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return json({ error: 'not_configured' }, 200)
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'

  let body: { action?: string; agent_id?: string; lead_ids?: string[]; lead_id?: string; campaign_id?: string; turns?: number; trial?: boolean; persona?: string } = {}
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  const { data: agent } = await service.from('sales_agents').select('id, name, min_price, max_discount_pct').eq('id', body.agent_id ?? '').maybeSingle()
  const agentRow: Agent = (agent as Agent | null) ?? { id: '', name: 'سلطان', min_price: null, max_discount_pct: null }
  if (body.action === 'draft' && !agent) return json({ error: 'agent_not_found' }, 404)

  let campaign: Campaign = null
  if (body.campaign_id) {
    const { data } = await service.from('campaigns').select('name, service, offer').eq('id', body.campaign_id).maybeSingle()
    campaign = (data as Campaign) ?? null
  }
  const { data: cfg } = await service.from('ai_settings').select('agent_product, agent_instructions, agent_tone').eq('id', 1).maybeSingle()
  const { data: priceRows } = await service.from('package_prices').select('setup_net, monthly_net, packages(name)').eq('status', 'approved')
  const prices: Price[] = (priceRows ?? []).map((p: any) => ({ name: p.packages?.name ?? 'باقة', setup: p.setup_net, monthly: p.monthly_net }))

  const leadCols = 'id, name, phone, category, city, rating, reviews, website'
  try {
    if (body.action === 'draft') {
      const ids = (body.lead_ids ?? []).slice(0, 10)
      const { data: leads } = await service.from('outreach_leads').select(leadCols).in('id', ids)
      const { data: blocked } = await service.from('do_not_contact').select('phone').not('phone', 'is', null)
      const stop = new Set((blocked ?? []).map(b => b.phone))
      const made: { lead_id: string; name: string; body: string }[] = []
      for (const lead of (leads ?? []) as Lead[]) {
        if (stop.has(lead.phone)) continue
        const text = await chat(key, model, [
          { role: 'system', content: agentSystem(agentRow, lead, campaign, prices, cfg) },
          { role: 'user', content: 'اكتب أول رسالة واتساب لهذا النشاط. رسالة واحدة فقط، بدون عنوان وبدون شرح.' },
        ])
        const clean = text.replace(/\[(STOP|ESCALATE)\]/g, '').trim()
        if (!clean) continue
        const { error } = await service.from('agent_drafts').insert({ agent_id: agentRow.id, lead_id: lead.id, body: clean, is_trial: body.trial !== false })
        if (!error) made.push({ lead_id: lead.id, name: lead.name, body: clean })
      }
      return json({ ok: true, drafts: made })
    }

    if (body.action === 'simulate') {
      const { data: lead } = await service.from('outreach_leads').select(leadCols).eq('id', body.lead_id ?? '').maybeSingle()
      if (!lead) return json({ error: 'lead_not_found' }, 404)
      const turns = Math.min(Math.max(Number(body.turns) || 3, 1), 5)
      const persona = String(body.persona || 'صاحب نشاط مشغول وحذر، يسأل عن السعر بسرعة ويعترض مرة واحدة على الأقل، لكنه منفتح إذا شاف فايدة واضحة').slice(0, 300)
      const customerSystem = `أنت ${(lead as Lead).name}، صاحب أو مدير نشاط تجاري سعودي يرد على واتساب. شخصيتك: ${persona}. لست مبرمجًا ولا تعرف تفاصيل تقنية. ترد برسالة واحدة قصيرة (جملتان على الأكثر) بلهجة سعودية عامية، بدون تنسيق ولا نجوم. لا تكشف أنك محاكاة.`
      const agentMsgs: Record<string, unknown>[] = [{ role: 'system', content: agentSystem(agentRow, lead as Lead, campaign, prices, cfg) }]
      const custMsgs: Record<string, unknown>[] = [{ role: 'system', content: customerSystem }]
      const transcript: { from: 'agent' | 'customer'; text: string; flag?: string }[] = []

      agentMsgs.push({ role: 'user', content: 'اكتب أول رسالة واتساب لهذا النشاط. رسالة واحدة فقط.' })
      for (let i = 0; i < turns; i++) {
        const a = await chat(key, model, agentMsgs)
        const flag = /\[STOP\]/.test(a) ? 'stop' : /\[ESCALATE\]/.test(a) ? 'escalate' : undefined
        const aText = a.replace(/\[(STOP|ESCALATE)\]/g, '').trim()
        transcript.push({ from: 'agent', text: aText, ...(flag ? { flag } : {}) })
        agentMsgs.push({ role: 'assistant', content: a })
        if (flag === 'stop') break
        custMsgs.push({ role: 'user', content: aText })
        const c = await chat(key, model, custMsgs, 200)
        transcript.push({ from: 'customer', text: c })
        custMsgs.push({ role: 'assistant', content: c })
        agentMsgs.push({ role: 'user', content: c })
      }
      return json({ ok: true, lead: { name: (lead as Lead).name }, transcript, priced: prices.length > 0 })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: 'failed', detail: (e as Error).message.slice(0, 200) }, 200)
  }
})
