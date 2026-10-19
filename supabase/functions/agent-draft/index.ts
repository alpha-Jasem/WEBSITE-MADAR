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

type Lead = { id: string; name: string; phone: string; category: string | null; city: string | null; rating: number | null; reviews: number | null; website: string | null; source_url?: string | null; review_notes?: string | null }
type Agent = { id: string; name: string; min_price: number | null; max_discount_pct: number | null }
type Campaign = { name: string; service: string; offer: string } | null
type Price = { name: string; setup: number | null; monthly: number | null }

const WEBSITE_PRODUCT = `مدار تبني مواقع إلكترونية جاهزة وسريعة للأنشطة التجارية التي ما عندها موقع (مطاعم، عقارات، عيادات، متاجر). نرتب لك نموذجًا أوليًا لموقعك لتراه قبل أي التزام.`

const PRODUCT = `مدار (madar.software) تبني وكلاء ذكاء اصطناعي يردون على عملاء النشاط على واتساب والمكالمات والموقع على مدار الساعة، يجاوبون الأسئلة المتكررة، يحجزون المواعيد، ويحوّلون العميل لموظف عند الحاجة. تناسب العيادات والمطاعم والعقارات والمتاجر.`

type Cfg = { agent_product?: string; agent_instructions?: string; agent_tone?: string } | null
// The scraper finds a place most reliably by its Google place id (kept inside the saved Maps link).
const placeInput = (u: string) => { const m = u.match(/query_place_id=([^&]+)/); return m ? { placeIds: [decodeURIComponent(m[1])] } : { startUrls: [{ url: u }] } }

// Lowest-rated Google reviews of the business (cached on the lead). Used only to open the chat with something specific.
async function reviewNotes(service: any, lead: Lead): Promise<string> {
  if (lead.review_notes !== null && lead.review_notes !== undefined) return lead.review_notes
  const apify = Deno.env.get('APIFY_TOKEN')
  if (!apify || !lead.source_url) return ''
  let notes = ''
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apify}&timeout=75`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...placeInput(lead.source_url), maxCrawledPlacesPerSearch: 1, maxReviews: 12, reviewsSort: 'lowestRanking', language: 'ar', scrapeReviewsPersonalData: false }),
    })
    const items = await res.json().catch(() => [])
    const reviews = (Array.isArray(items) ? items[0]?.reviews : []) ?? []
    notes = reviews.filter((r: any) => r?.text && (r.stars ?? 5) <= 3).slice(0, 4).map((r: any) => `(${r.stars}★) ${String(r.text).replace(/\s+/g, ' ').slice(0, 220)}`).join('\n')
  } catch { notes = '' }
  await service.from('outreach_leads').update({ review_notes: notes }).eq('id', lead.id)
  return notes
}

function agentSystem(agent: Agent, lead: Lead, campaign: Campaign, prices: Price[], cfg: Cfg = null, kb = '', target = 'outreach') {
  const priceText = prices.length
    ? prices.map(p => `${p.name}: تأسيس ${p.setup ?? '—'} ر.س، شهري ${p.monthly ?? '—'} ر.س (قبل الضريبة)`).join(' | ')
    : 'لا توجد أسعار معتمدة بعد.'
  return `أنت ${agent.name} من فريق مبيعات مدار. تكتب رسائل واتساب لصاحب نشاط تجاري سعودي باسم ${agent.name}.
قائمة الاستهداف: ${target === 'no_website' ? 'أنشطة بدون موقع إلكتروني، وما تبيعه هو موقع إلكتروني جاهز.' : 'قائمة Outreach العامة، وما تبيعه هو وكلاء الذكاء الاصطناعي.'}
المنتج: ${target === 'no_website' ? WEBSITE_PRODUCT : (cfg?.agent_product?.trim() || PRODUCT)}
${campaign ? `الحملة: ${campaign.name}. الخدمة: ${campaign.service}. العرض: ${campaign.offer}.` : ''}
العميل المستهدف: ${lead.name}${lead.category ? ` (${lead.category})` : ''}${lead.city ? ` في ${lead.city}` : ''}${lead.rating ? `، تقييمه ${lead.rating} من ${lead.reviews ?? 0} تقييم` : ''}${lead.website ? '' : '، وما عنده موقع إلكتروني'}.
الأسعار المعتمدة: ${priceText}
${lead.review_notes ? `ملاحظات من تقييمات عملائهم على خرائط قوقل (سرّية للتخصيص فقط): 
${lead.review_notes}
إذا كان فيها شكوى عن الرد أو الحجز أو الانتظار فاجعل جملتك الثانية تلمّح لها بلطف وبشكل عام ودون اتهام (مثل: «لاحظت أن بعض المراجعين يذكرون صعوبة الوصول لكم على الهاتف، وهذا بالضبط اللي نحله»)، ثم اسأل سؤالك. لا تقتبس نص تقييم ولا تذكر اسم عميل ولا تنتقد النشاط. إذا ما فيها شي ذي صلة تجاهلها تمامًا.` : ''}
${kb ? `معلومات كتبها المالك عن مدار وخدماتها (اعتمد عليها ولا تخرج عنها، وإذا سُئلت عن شي غير مذكور هنا قل إنك تتأكد من الفريق ولا تخمّن):\n${kb}\n` : ''}حدودك: أقل سعر مسموح ${agent.min_price ?? 'غير محدد'}، أقصى خصم ${agent.max_discount_pct != null ? agent.max_discount_pct + '%' : 'غير مسموح بأي خصم'}.

القواعد (لا تخالفها):
- لهجة سعودية بيضاء ${cfg?.agent_tone === 'formal' ? 'رسمية ومهذبة جدًا' : 'ودودة مهذبة'}، رسالة من جملة إلى ثلاث جمل، بدون إيموجي زائدة وبدون قوائم.
- عرّف بنفسك في أول رسالة فقط باسمك: «أنا ${agent.name} من مدار»، ولا تكرر التعريف بعدها، ولا تقل إنك آلي أو مساعد آلي من نفسك.
- لا تدّعِ أبدًا أنك إنسان أو أن عندك جسدًا أو حياة شخصية، ولا تكذب إذا سُئلت. إذا سأل «هل أنت إنسان؟» أو «روبوت؟» أو «ذكاء اصطناعي؟» قل بصدق إنك مساعد ذكي يشتغل مع فريق مدار، وإنه يقدر يكلم أحد الفريق إن أحب، ثم كمّل بنفس السياق.
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

  let body: { action?: string; agent_id?: string; lead_ids?: string[]; lead_id?: string; campaign_id?: string; turns?: number; trial?: boolean; persona?: string; target?: string; messages?: { role: string; content: string }[]; real_booking?: boolean } = {}
  try { body = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  const { data: agent } = await service.from('sales_agents').select('id, name, min_price, max_discount_pct').eq('id', body.agent_id ?? '').maybeSingle()
  const agentRow: Agent = (agent as Agent | null) ?? { id: '', name: 'عبدالله', min_price: null, max_discount_pct: null }
  if (body.action === 'draft' && !agent) return json({ error: 'agent_not_found' }, 404)

  let campaign: Campaign = null
  if (body.campaign_id) {
    const { data } = await service.from('campaigns').select('name, service, offer').eq('id', body.campaign_id).maybeSingle()
    campaign = (data as Campaign) ?? null
  }
  const { data: cfg } = await service.from('ai_settings').select('agent_product, agent_instructions, agent_tone').eq('id', 1).maybeSingle()
  const { data: kbRows } = await service.from('ai_knowledge').select('category, title, content').eq('active', true).order('created_at').limit(80)
  const CAT_AR: Record<string, string> = { about: 'عن مدار', services: 'الخدمات', pricing: 'الأسعار والعروض', faq: 'أسئلة شائعة', objection: 'ردود على الاعتراضات', policy: 'سياسات', website: 'المواقع الإلكترونية' }
  const kb = (kbRows ?? []).map((r: any) => `[${CAT_AR[r.category] ?? r.category}] ${r.title}: ${r.content}`).join('\n').slice(0, 7000)
  const target = body.target === 'no_website' ? 'no_website' : 'outreach'
  const { data: priceRows } = await service.from('package_prices').select('setup_net, monthly_net, packages(name)').eq('status', 'approved')
  const prices: Price[] = (priceRows ?? []).map((p: any) => ({ name: p.packages?.name ?? 'باقة', setup: p.setup_net, monthly: p.monthly_net }))

  const leadCols = 'id, name, phone, category, city, rating, reviews, website, source_url, review_notes'
  try {
    if (body.action === 'draft') {
      const ids = (body.lead_ids ?? []).slice(0, 10)
      const { data: leads } = await service.from('outreach_leads').select(leadCols).in('id', ids)
      const { data: blocked } = await service.from('do_not_contact').select('phone').not('phone', 'is', null)
      const stop = new Set((blocked ?? []).map(b => b.phone))
      const made: { lead_id: string; name: string; body: string }[] = []
      const list = ((leads ?? []) as Lead[]).filter(l => !stop.has(l.phone))
      // look up each business's reviews in parallel (cached after the first time)
      await Promise.all(list.slice(0, 8).map(async l => { l.review_notes = await reviewNotes(service, l) }))
      for (const lead of list) {
        const text = await chat(key, model, [
          { role: 'system', content: agentSystem(agentRow, lead, campaign, prices, cfg, kb, target) },
          { role: 'user', content: 'اكتب أول رسالة واتساب لهذا النشاط. رسالة واحدة فقط، بدون عنوان وبدون شرح.' + (lead.review_notes ? ' مهم: عندك ملاحظات من تقييماتهم، فلمّح لأبرز شكوى فيها بلطف في جملة واحدة قبل سؤالك.' : '') },
        ])
        const clean = text.replace(/\[(STOP|ESCALATE)\]/g, '').trim()
        if (!clean) continue
        const { error } = await service.from('agent_drafts').insert({ agent_id: agentRow.id, lead_id: lead.id, body: clean, is_trial: body.trial !== false })
        if (!error) made.push({ lead_id: lead.id, name: lead.name, body: clean })
      }
      return json({ ok: true, drafts: made })
    }

    if (body.action === 'reviews') {
      // Diagnostic: what the review lookup returns for one lead (also refreshes the cached notes).
      const { data: lead } = await service.from('outreach_leads').select(leadCols).eq('id', body.lead_id ?? '').maybeSingle()
      if (!lead) return json({ error: 'lead_not_found' }, 404)
      const apify = Deno.env.get('APIFY_TOKEN')
      if (!apify || !(lead as Lead).source_url) return json({ ok: true, reason: !apify ? 'no_apify_token' : 'no_source_url' })
      const res = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${apify}&timeout=75`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...placeInput((lead as Lead).source_url!), maxCrawledPlacesPerSearch: 1, maxReviews: 12, reviewsSort: 'lowestRanking', language: 'ar', scrapeReviewsPersonalData: false }),
      })
      const items = await res.json().catch(() => null)
      const first = Array.isArray(items) ? items[0] : null
      return json({ ok: res.ok, status: res.status, items: Array.isArray(items) ? items.length : null, keys: first ? Object.keys(first).slice(0, 40) : null, reviews: first?.reviews?.length ?? null, reviewsCount: first?.reviewsCount, reviewsDistribution: first?.reviewsDistribution, hasReviewsKey: first ? 'reviews' in first : null, title: first?.title, placeId: first?.placeId, url: first?.url, err: first?.error ?? first?.searchString, total: first?.totalScore, sample: (first?.reviews ?? []).slice(0, 3).map((r: any) => ({ stars: r.stars, text: String(r.text ?? '').slice(0, 120) })), error: !Array.isArray(items) ? items : null })
    }

    if (body.action === 'chat') {
      // A live test: the owner plays the customer. The agent can look at the real calendar, book (dry-run unless asked), and prepare a website preview.
      const { data: leadRow } = body.lead_id ? await service.from('outreach_leads').select(leadCols).eq('id', body.lead_id).maybeSingle() : { data: null }
      const lead: Lead = (leadRow as Lead | null) ?? { id: '', name: 'نشاط تجريبي', phone: '', category: null, city: null, rating: null, reviews: null, website: null }
      if (lead.id) lead.review_notes = await reviewNotes(service, lead)
      const history = (body.messages ?? []).slice(-14).filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 1200) }))
      if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'empty' }, 400)
      const events: { type: string; [k: string]: unknown }[] = []
      const tools = [
        { type: 'function', function: { name: 'get_free_slots', description: 'Real free 30-minute meeting times from the owner calendar (Sunday-Thursday, Riyadh time). Call it before proposing times.', parameters: { type: 'object', properties: {} } } },
        { type: 'function', function: { name: 'book_meeting', description: 'Book the meeting the customer chose, only after they clearly picked one of the proposed times.', parameters: { type: 'object', properties: { start_iso: { type: 'string', description: 'Exact start from get_free_slots' }, customer_name: { type: 'string' }, notes: { type: 'string' } }, required: ['start_iso'] } } },
        { type: 'function', function: { name: 'create_site_preview', description: 'Prepare a one-page website preview for this business and return its link. Use only when the business has no website or the customer asks to see one. Never promise delivery time or price.', parameters: { type: 'object', properties: { business_name: { type: 'string' }, category: { type: 'string' }, city: { type: 'string' }, services: { type: 'array', items: { type: 'string' } }, phone: { type: 'string' }, notes: { type: 'string' } }, required: ['business_name'] } } },
      ]
      const runTool = async (name: string, a: Record<string, any>) => {
        if (name === 'get_free_slots') {
          const r = await fetch(`${url}/functions/v1/outreach-calendar`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'slots', minutes: 30 }) })
          const d = await r.json().catch(() => ({}))
          if (!r.ok || !d.slots) return { error: 'calendar_unavailable' }
          const slots = (d.slots as { start: string; label: string }[]).slice(0, 6)
          events.push({ type: 'slots', slots: slots.map(x => x.label) })
          return { slots }
        }
        if (name === 'book_meeting') {
          const start = new Date(String(a.start_iso))
          if (Number.isNaN(start.getTime())) return { error: 'invalid_time' }
          const label = start.toLocaleString('ar-SA-u-ca-gregory', { timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })
          if (!body.real_booking) { events.push({ type: 'booking', dry_run: true, label }); return { ok: true, dry_run: true, note: 'اختبار: لم يُنشأ حدث في التقويم', when: label } }
          const r = await fetch(`${url}/functions/v1/outreach-calendar`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ start: start.toISOString(), minutes: 30, name: `${a.customer_name || lead.name} (اختبار الإيجنت)`, phone: lead.phone, notes: a.notes || '' }) })
          const d = await r.json().catch(() => ({}))
          if (!r.ok) return { error: 'booking_failed' }
          events.push({ type: 'booking', dry_run: false, label, link: d.link })
          return { ok: true, when: label }
        }
        if (name === 'create_site_preview') {
          const { count } = await service.from('site_previews').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString())
          if ((count ?? 0) >= 30) return { error: 'daily_preview_limit' }
          const biz = String(a.business_name || lead.name).slice(0, 80)
          const brief = `النشاط: ${biz}${a.category || lead.category ? ` (${a.category || lead.category})` : ''}${a.city || lead.city ? `، ${a.city || lead.city}` : ''}.${Array.isArray(a.services) && a.services.length ? ` الخدمات التي ذكرها العميل: ${a.services.slice(0, 8).join('، ')}.` : ''}${a.notes ? ` ملاحظات: ${String(a.notes).slice(0, 300)}.` : ''}`
          let html = await chat(key, model, [
            { role: 'system', content: 'أنت مصمم مواقع. تكتب صفحة هبوط عربية RTL كاملة في ملف HTML واحد، CSS داخل وسم style فقط، بدون JavaScript وبدون أي رابط أو صورة أو خط من الإنترنت. تصميم حديث وأنيق ومتجاوب للجوال، ألوان هادئة، أقسام: رأس مع اسم النشاط وزر اتصال، من نحن، الخدمات، لماذا نحن، تواصل. لا تخترع تقييمات ولا أرقامًا ولا عناوين ولا أسعارًا ولا ساعات عمل؛ استخدم الاسم والنشاط والمدينة وما أُعطيت فقط، واكتب نصوصًا عامة صادقة. في التذييل: «نموذج أولي أعدّته مدار — غير معتمد بعد». أعد HTML فقط بلا شرح وبلا علامات ```.' },
            { role: 'user', content: brief + (a.phone || lead.phone ? ` رقم الاتصال: ${a.phone || lead.phone}.` : '') },
          ], 6000)
          html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<iframe[\s\S]*?<\/iframe>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
          if (!/<html|<body|<div/i.test(html) || html.length < 400) return { error: 'generation_failed' }
          const { data: row, error } = await service.from('site_previews').insert({ lead_id: lead.id || null, business_name: biz, html }).select('token').single()
          if (error || !row) return { error: 'save_failed' }
          const link = `https://madar.software/preview/${row.token}`
          events.push({ type: 'site', link, business: biz })
          return { ok: true, link }
        }
        return { error: 'unknown_tool' }
      }

      const sys = agentSystem(agentRow, lead, campaign, prices, cfg, kb, target) + `
وضع المحادثة الحية: العميل يكتب لك الآن، رد على آخر رسالة فقط، ولا تعيد التعريف بنفسك بعد أول رسالة.
- عند الاتفاق على اجتماع: استدعِ get_free_slots ثم اقترح موعدين حقيقيين، ولا تحجز إلا بعد أن يختار العميل موعدًا بوضوح ثم استدعِ book_meeting.
- إذا ما عند النشاط موقع أو طلب أن يرى موقعًا: استدعِ create_site_preview بمعلوماته وأرسل الرابط وقل إنه نموذج أولي أعدّه الفريق للمراجعة. لا تعد بوقت تسليم ولا سعر إلا إذا كان في معلومات المالك.
- لا تدّعِ أنك أنشأت موقعًا نهائيًا أو أرسلت شيئًا لم تفعله.`
      const msgs: Record<string, unknown>[] = [{ role: 'system', content: sys }, ...history]
      for (let round = 0; round < 4; round++) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: msgs, tools, tool_choice: 'auto', max_completion_tokens: 500 }) })
        const out = await res.json()
        if (!res.ok) return json({ error: 'model_error', detail: String(out?.error?.message ?? res.status).slice(0, 200) }, 200)
        const m = out.choices?.[0]?.message
        if (!m) return json({ error: 'no_reply' }, 200)
        msgs.push(m)
        if (!m.tool_calls?.length) {
          const text = String(m.content ?? '').trim()
          const flag = /\[STOP\]/.test(text) ? 'stop' : /\[ESCALATE\]/.test(text) ? 'escalate' : undefined
          return json({ ok: true, reply: text.replace(/\[(STOP|ESCALATE)\]/g, '').trim(), flag, events })
        }
        for (const c of m.tool_calls) {
          let args: Record<string, any> = {}
          try { args = JSON.parse(c.function.arguments || '{}') } catch { /* empty */ }
          msgs.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(await runTool(c.function.name, args)) })
        }
      }
      return json({ ok: true, reply: 'خلني أتأكد من الفريق وأرجع لك.', events })
    }

    if (body.action === 'simulate') {
      const { data: lead } = await service.from('outreach_leads').select(leadCols).eq('id', body.lead_id ?? '').maybeSingle()
      if (!lead) return json({ error: 'lead_not_found' }, 404)
      const turns = Math.min(Math.max(Number(body.turns) || 3, 1), 5)
      const persona = String(body.persona || 'صاحب نشاط مشغول وحذر، يسأل عن السعر بسرعة ويعترض مرة واحدة على الأقل، لكنه منفتح إذا شاف فايدة واضحة').slice(0, 300)
      const customerSystem = `أنت ${(lead as Lead).name}، صاحب أو مدير نشاط تجاري سعودي يرد على واتساب. شخصيتك: ${persona}. لست مبرمجًا ولا تعرف تفاصيل تقنية. ترد برسالة واحدة قصيرة (جملتان على الأكثر) بلهجة سعودية عامية، بدون تنسيق ولا نجوم. لا تكشف أنك محاكاة.`
      const agentMsgs: Record<string, unknown>[] = [{ role: 'system', content: agentSystem(agentRow, lead as Lead, campaign, prices, cfg, kb, target) }]
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
