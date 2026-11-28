// Onboarding: drafts a customer's first voice agent so the setup page can show it before anything is created.
//   POST { business_name, agent_name, website?, industry?, capabilities?, instructions? }  with the signed-in user's JWT
//   -> { plan: { who_are_you, goal, steps, first_sentence, questions[], analysis{ name, fields[] } } }
// With a website, its text is read first (https only, never a private address). Nothing is created here: the page creates
// the agent through nabrah-agent and the analysis group through analysis-sync once the owner has reviewed the draft.
// Deploy with JWT verification ON. Needs OPENAI_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

/** True for hosts a visitor-supplied address must never reach: localhost, private ranges, bare IPs, internal names. */
function blockedHost(host: string): boolean {
  const h = host.toLowerCase()
  if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return true
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.includes(':') || h.startsWith('[')) return true
  return false
}

async function siteText(raw: string): Promise<string> {
  let u: URL
  try { u = new URL(raw) } catch { return '' }
  if (u.protocol !== 'https:' || blockedHost(u.hostname)) return ''
  try {
    const res = await fetch(u.toString(), { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MadarBot/1.0)', Accept: 'text/html' } })
    if (!res.ok) return ''
    const final = new URL(res.url)
    if (final.protocol !== 'https:' || blockedHost(final.hostname)) return ''
    const html = (await res.text()).slice(0, 400_000)
    const title = html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? ''
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? ''
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
    return `${title}\n${desc}\n${body}`.slice(0, 6000)
  } catch { return '' }
}

const TYPES = new Set(['text', 'number', 'yes_no'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!url || !anonKey || !openaiKey) return json({ error: 'server misconfigured' }, 500)

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } })
  const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
  if (!companyId) return json({ error: 'unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const business = clip(body?.business_name, 120)
  const agentName = clip(body?.agent_name, 60)
  if (!business || !agentName) return json({ error: 'name required' }, 400)
  const website = clip(body?.website, 300)
  const industry = clip(body?.industry, 80)
  const capabilities = Array.isArray(body?.capabilities) ? body.capabilities.map((c: unknown) => clip(c, 80)).filter(Boolean).slice(0, 8) : []
  const instructions = clip(body?.instructions, 2500)

  const site = website ? await siteText(website) : ''
  if (website && !site && !instructions && !industry) return json({ error: 'site_unreadable' }, 422)

  const ctx = [
    `اسم النشاط: ${business}`, `اسم الوكيل: ${agentName}`,
    industry ? `المجال: ${industry}` : '', capabilities.length ? `ما يتولاه الوكيل: ${capabilities.join('، ')}` : '',
    instructions ? `وصف صاحب النشاط:\n${instructions}` : '', site ? `نص موقع النشاط:\n${site}` : '',
  ].filter(Boolean).join('\n')

  const system = `أنت تصمم وكيلًا صوتيًا يرد على مكالمات عملاء نشاط تجاري سعودي. اكتب كل شيء بالعربية وبلهجة سعودية بيضاء مهذبة.
أعد JSON فقط بهذا الشكل بالضبط:
{"who_are_you": "من هو الوكيل ومن يمثّل وأسلوبه (3-5 جمل)",
 "goal": "هدفه في المكالمة (جملتان)",
 "steps": "خطوات المكالمة مرقّمة، وكل خطوة سطر، من الترحيب حتى إنهاء المكالمة، مع ما يفعله عند ما لا يعرف الجواب",
 "first_sentence": "الجملة الأولى التي ينطقها عند الرد (جملة واحدة قصيرة تذكر اسم الوكيل والنشاط)",
 "questions": [{"q": "سؤال قرار على صاحب النشاط", "options": [{"label": "خيار", "recommended": true}, {"label": "خيار آخر"}]}],
 "analysis": {"name": "اسم مجموعة تحليل بالعربية", "fields": [{"name": "اسم الحقل بالعربية", "type": "text", "description": "ماذا يستخرج الذكاء من المكالمة"}]}}
قواعد: لا تخترع أسعارًا أو مواعيد أو معلومات غير موجودة في المعطيات؛ إن غابت المعلومة اجعل الوكيل يقول إنه سيحوّل المتصل لفريق النشاط. أسئلة القرار من سؤالين إلى ثلاثة، لكل سؤال خياران أو ثلاثة وواحد منها فقط recommended. حقول التحليل من 3 إلى 5، ونوعها text أو number أو yes_no فقط. لا تذكر أي شركة تقنية أو نموذج ذكاء اصطناعي.`

  let out: Record<string, unknown> = {}
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(50_000),
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini', response_format: { type: 'json_object' }, temperature: 0.4, max_completion_tokens: 1800, messages: [{ role: 'system', content: system }, { role: 'user', content: ctx }] }),
    })
    if (!res.ok) return json({ error: 'upstream' }, 502)
    out = JSON.parse(String((await res.json())?.choices?.[0]?.message?.content ?? '{}'))
  } catch { return json({ error: 'upstream' }, 502) }

  const questions = (Array.isArray(out.questions) ? out.questions : []).slice(0, 3).map((q) => {
    const o = q as { q?: unknown; options?: unknown }
    const options = (Array.isArray(o.options) ? o.options : []).slice(0, 3).map((x) => ({ label: clip((x as { label?: unknown }).label, 160), recommended: (x as { recommended?: unknown }).recommended === true })).filter((x) => x.label)
    if (options.length && !options.some((x) => x.recommended)) options[0].recommended = true
    return { q: clip(o.q, 240), options }
  }).filter((q) => q.q && q.options.length >= 2)

  const an = (out.analysis ?? {}) as { name?: unknown; fields?: unknown }
  const fields = (Array.isArray(an.fields) ? an.fields : []).slice(0, 5).map((f) => {
    const x = f as { name?: unknown; type?: unknown; description?: unknown }
    return { name: clip(x.name, 60), type: TYPES.has(String(x.type)) ? String(x.type) : 'text', description: clip(x.description, 200) }
  }).filter((f) => f.name)

  const plan = {
    who_are_you: clip(out.who_are_you, 2500), goal: clip(out.goal, 1200), steps: clip(out.steps, 3500), first_sentence: clip(out.first_sentence, 300),
    questions, analysis: { name: clip(an.name, 60) || 'تفاصيل المكالمة', fields },
  }
  if (!plan.who_are_you || !plan.first_sentence) return json({ error: 'empty_plan' }, 502)
  return json({ plan })
})
