// Madar Quotation agent. Reads a buyer's request (free text, a pasted message, or a PDF) and turns it into
// quote items matched to the company's catalog. Prices always come from the catalog, never from the model.
//   POST { action: 'company', company_id }                      public: name and logo for the request page
//   POST { action: 'understand', text?, file? }                  signed-in member: items for the new-quote dialog
//   POST { action: 'intake', company_id, key, name, phone, org?, email?, text?, file?, items? }
//                                                                public: the request page creates a draft quote
// The quote is saved with work_state 'preparing'; the dashboard applies the issue rules when it next loads.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

type Product = { id: string; sku: string; name: string; name_en: string | null; unit: string; unit_price: number | null; price_updated_at: string | null }
type Item = { text: string; qty: number | null; productId?: string | null; sourceRef?: string }
type FileIn = { name?: string; type?: string; base64?: string }

const AR: Record<string, string> = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٫': '.' }
const normalize = (s: string) => s
  .replace(/[٠-٩٫]/g, (d) => AR[d])
  .replace(/[ً-ْـ]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}.\s-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()
const tokens = (s: string) => normalize(s).split(' ').map((t) => (t.length > 3 && t.startsWith('ال') ? t.slice(2) : t)).filter((t) => t.length > 1)

/** Local mobile numbers become 9665XXXXXXXX so the same buyer is recognised however they typed it. */
function saudiPhone(s: string) {
  const d = normalize(s).replace(/\D/g, '').replace(/^00/, '')
  if (/^05\d{8}$/.test(d)) return `966${d.slice(1)}`
  if (/^5\d{8}$/.test(d)) return `966${d}`
  return d
}

/** Without a model: one item per line, quantity at the start or the end. */
function parseLines(raw: string): Item[] {
  return raw.split(/\r?\n|،|;/).map((l) => l.replace(/^\s*(?:[-–•*]|[\d٠-٩]+[.)])\s*/, '').trim()).filter(Boolean).map((line) => {
    const n = line.replace(/[٠-٩٫]/g, (d) => AR[d])
    const lead = n.match(/^(\d+(?:\.\d+)?)\s*(?:x|×|\*)?\s+(.+)$/i)
    const trail = n.match(/^(.+?)\s*(?:x|×|\*|:|=|-|عدد)\s*(\d+(?:\.\d+)?)\s*$/i)
    if (lead) return { text: lead[2].trim(), qty: Number(lead[1]) }
    if (trail) return { text: trail[1].trim(), qty: Number(trail[2]) }
    return { text: n.trim(), qty: null }
  }).filter((i) => i.text.length > 1)
}

async function ask(key: string, model: string, system: string, user: unknown[], schema: Record<string, unknown>) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, max_completion_tokens: 4000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      response_format: { type: 'json_schema', json_schema: { name: 'out', strict: true, schema } },
    }),
  })
  const out = await res.json()
  if (!res.ok) throw new Error(String(out?.error?.message ?? res.status).slice(0, 200))
  return JSON.parse(out.choices?.[0]?.message?.content ?? '{}')
}

const EXTRACT_SYSTEM = `أنت تقرأ طلب شراء أرسله مشترٍ لمورد، وتستخرج البنود المطلوبة فقط.
لكل بند: text = اسم الصنف ومواصفاته كما كتبها المشتري (بدون الكمية)، qty = الكمية رقمًا، أو null إذا لم تُذكر.
تجاهل التحية والتوقيع وبيانات التواصل والأسعار والشروط. لا تخترع بنودًا ولا تدمج بندين. إذا لم يوجد أي بند أرجع قائمة فارغة.`

const MATCH_SYSTEM = `أنت تطابق بنود طلب شراء مع كتالوج مورد. لكل بند اختر رمز المنتج (مثل p12) فقط إذا كان هو نفس الصنف بوضوح: نفس النوع ونفس المقاس أو المواصفة المذكورة.
إذا كان البند يحتمل أكثر من منتج، أو لا يوجد منتج مطابق، أرجع null. لا تختر أقرب شيء لمجرد التشابه.`

async function extract(key: string, model: string, text: string, file: FileIn | null): Promise<Item[]> {
  const parts: unknown[] = []
  if (text.trim()) parts.push({ type: 'text', text: `نص الطلب:\n${text.slice(0, 12000)}` })
  if (file?.base64) parts.push({ type: 'file', file: { filename: file.name || 'request.pdf', file_data: `data:application/pdf;base64,${file.base64}` } })
  if (!parts.length) return []
  const out = await ask(key, model, EXTRACT_SYSTEM, parts, {
    type: 'object', additionalProperties: false, required: ['items'],
    properties: { items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'qty'], properties: { text: { type: 'string' }, qty: { type: ['number', 'null'] } } } } },
  })
  const ref = file?.base64 ? `ملف: ${file.name || 'PDF'}` : 'نص الطلب'
  return (Array.isArray(out.items) ? out.items : []).slice(0, 200)
    .map((i: Item) => ({ text: String(i.text ?? '').trim().slice(0, 300), qty: typeof i.qty === 'number' && i.qty > 0 ? i.qty : null, sourceRef: ref }))
    .filter((i: Item) => i.text.length > 1)
}

/** Products worth showing the model for these items: the whole catalog when it is small, otherwise the closest by shared words. */
function shortlist(items: Item[], catalog: Product[]) {
  if (catalog.length <= 400) return catalog
  const keep = new Map<string, Product>()
  for (const it of items) {
    const t = new Set(tokens(it.text))
    catalog
      .map((p) => ({ p, hit: [...tokens(`${p.name} ${p.name_en ?? ''} ${p.sku}`)].filter((x) => t.has(x)).length }))
      .filter((x) => x.hit > 0).sort((a, b) => b.hit - a.hit).slice(0, 12)
      .forEach((x) => keep.set(x.p.id, x.p))
  }
  return [...keep.values()].slice(0, 400)
}

async function match(key: string, model: string, items: Item[], catalog: Product[]): Promise<Item[]> {
  const todo = items.filter((i) => !i.productId)
  if (!todo.length || !catalog.length) return items
  const list = shortlist(todo, catalog)
  if (!list.length) return items
  const code = new Map(list.map((p, i) => [`p${i + 1}`, p.id]))
  const catalogText = list.map((p, i) => `p${i + 1} | ${p.sku || '-'} | ${p.name}${p.name_en ? ` / ${p.name_en}` : ''} | ${p.unit}`).join('\n')
  const out = await ask(key, model, MATCH_SYSTEM, [{ type: 'text', text: `الكتالوج (رمز | رقم الصنف | الاسم | الوحدة):\n${catalogText}\n\nالبنود:\n${todo.map((i, n) => `${n} | ${i.text}`).join('\n')}` }], {
    type: 'object', additionalProperties: false, required: ['matches'],
    properties: { matches: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['index', 'product'], properties: { index: { type: 'integer' }, product: { type: ['string', 'null'] } } } } },
  })
  for (const m of Array.isArray(out.matches) ? out.matches : []) {
    const it = todo[m.index]
    const id = m.product ? code.get(String(m.product)) : undefined
    if (it && id) it.productId = id
  }
  return items
}

/** Understand a request end to end; falls back to line-by-line reading when no model is configured or it fails. */
async function understand(text: string, file: FileIn | null, preset: Item[], catalog: Product[]) {
  const key = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('QT_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  let items: Item[] = [...preset]
  let usedModel = false
  if (key) {
    try {
      items = [...items, ...await extract(key, model, text, file)]
      items = await match(key, model, items, catalog)
      usedModel = true
    } catch (e) {
      console.error('qt-agent model', e)
      items = [...preset]
    }
  }
  if (!usedModel) {
    if (file?.base64) return { items: [], error: 'pdf_unavailable' }
    items = [...items, ...parseLines(text).map((i) => ({ ...i, sourceRef: 'نص الطلب' }))]
  }
  return { items, error: null }
}

async function loadCatalog(db: any, companyId: string): Promise<Product[]> {
  const { data } = await db.from('qt_products').select('id, sku, name, name_en, unit, unit_price, price_updated_at').eq('company_id', companyId).eq('active', true).limit(5000)
  return (data ?? []) as Product[]
}

async function quotationCompany(db: any, companyId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) return null
  const { data } = await db.from('companies').select('id, name, logo_url, products').eq('id', companyId).maybeSingle()
  return data && Array.isArray(data.products) && data.products.includes('quotation') ? data : null
}

const cleanFile = (f: unknown): FileIn | null => {
  const x = f as FileIn | null
  if (!x?.base64 || typeof x.base64 !== 'string') return null
  if (x.base64.length > 7_000_000) throw new Error('file_too_large') // ~5 MB
  return { name: String(x.name ?? 'request.pdf').slice(0, 120), base64: x.base64 }
}

/** Next quote number without a session: bump the counter only if nobody else did in between. */
async function nextNumber(db: any, companyId: string) {
  await db.from('qt_settings').upsert({ company_id: companyId }, { onConflict: 'company_id', ignoreDuplicates: true })
  for (let i = 0; i < 5; i++) {
    const { data: s } = await db.from('qt_settings').select('*').eq('company_id', companyId).single()
    const { data: hit } = await db.from('qt_settings').update({ next_number: s.next_number + 1 }).eq('company_id', companyId).eq('next_number', s.next_number).select('company_id')
    if (hit?.length) return { number: `${s.quote_prefix}-${s.next_number}`, settings: s }
  }
  throw new Error('number_busy')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  let b: Record<string, any> = {}
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }

  try {
    if (b.action === 'company') {
      const c = await quotationCompany(db, String(b.company_id ?? ''))
      return c ? json({ ok: true, name: c.name, logo_url: c.logo_url }) : json({ ok: false }, 404)
    }

    if (b.action === 'understand') {
      const auth = req.headers.get('Authorization') ?? ''
      const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
      const { data: companyId } = await asUser.rpc('get_my_clinic_company_id')
      if (!companyId || !(await quotationCompany(db, companyId))) return json({ error: 'forbidden' }, 403)
      const r = await understand(String(b.text ?? '').slice(0, 20000), cleanFile(b.file), [], await loadCatalog(db, companyId))
      return json({ ok: !r.error, items: r.items, error: r.error })
    }

    if (b.action === 'intake') {
      const company = await quotationCompany(db, String(b.company_id ?? ''))
      if (!company) return json({ ok: false, message: 'الرابط غير صالح' }, 404)
      const name = String(b.name ?? '').trim().slice(0, 80)
      const phone = saudiPhone(String(b.phone ?? '')).slice(0, 15)
      const org = String(b.org ?? '').trim().slice(0, 120)
      const email = String(b.email ?? '').trim().slice(0, 120)
      const text = String(b.text ?? '').slice(0, 20000)
      if (!name || phone.length < 9) return json({ ok: false, message: 'اكتب اسمك ورقم جوالك' })
      const idem = `web:${String(b.key ?? '').slice(0, 64)}`
      const { data: dup } = await db.from('qt_quotes').select('number').eq('company_id', company.id).eq('idempotency_key', idem).maybeSingle()
      if (dup) return json({ ok: true, number: dup.number })
      const hourAgo = new Date(Date.now() - 3600_000).toISOString()
      const { count } = await db.from('qt_quotes').select('id', { count: 'exact', head: true }).eq('company_id', company.id).like('idempotency_key', 'web:%').gte('created_at', hourAgo)
      if ((count ?? 0) >= 40) return json({ ok: false, message: 'وصلتنا طلبات كثيرة الحين. حاول بعد قليل.' })

      const preset: Item[] = (Array.isArray(b.items) ? b.items : []).slice(0, 300)
        .map((i: Item) => ({ text: String(i.text ?? '').slice(0, 300), qty: Number(i.qty) > 0 ? Number(i.qty) : null, sourceRef: String(i.sourceRef ?? 'ملف').slice(0, 120) }))
        .filter((i: Item) => i.text.trim().length > 1)
      const catalog = await loadCatalog(db, company.id)
      const r = await understand(text, cleanFile(b.file), preset, catalog)
      if (r.error === 'pdf_unavailable') return json({ ok: false, message: 'ما قدرنا نقرأ الملف. اكتب البنود في خانة الطلب.' })
      if (!r.items.length) return json({ ok: false, message: 'ما لقينا بنودًا في الطلب. اكتب كل صنف في سطر مع الكمية.' })

      // The same buyer (by phone) keeps one customer record.
      const { data: known } = await db.from('qt_customers').select('id').eq('company_id', company.id).eq('phone', phone).limit(1).maybeSingle()
      let customerId = known?.id as string | undefined
      if (!customerId) {
        const { data: made, error } = await db.from('qt_customers').insert({ company_id: company.id, name: org || name, contact_name: org ? name : null, phone, email: email || null }).select('id').single()
        if (error) throw error
        customerId = made.id
      }

      const byId = new Map(catalog.map((p) => [p.id, p]))
      const ids = r.items.map((i) => i.productId).filter(Boolean) as string[]
      const { data: costs } = ids.length ? await db.from('qt_product_costs').select('product_id, unit_cost').in('product_id', ids) : { data: [] }
      const cost = new Map((costs ?? []).map((c: any) => [c.product_id, c.unit_cost == null ? null : Number(c.unit_cost)]))
      const lines = r.items.map((it) => {
        const p = it.productId ? byId.get(it.productId) : undefined
        const id = `l_${crypto.randomUUID().slice(0, 12)}`
        return p
          ? { id, requested: it.text, sourceRef: it.sourceRef, productId: p.id, description: p.name, unit: p.unit, qty: it.qty ?? 0, unitPrice: p.unit_price == null ? null : Number(p.unit_price), unitCost: cost.get(p.id) ?? null, discountPct: 0, priceUpdatedAt: p.price_updated_at }
          : { id, requested: it.text, sourceRef: it.sourceRef, productId: null, description: it.text, unit: '', qty: it.qty ?? 0, unitPrice: null, unitCost: null, discountPct: 0, candidates: [] }
      })

      const { number, settings: s } = await nextNumber(db, company.id)
      const at = new Date().toISOString()
      const tokenHex = Array.from(crypto.getRandomValues(new Uint8Array(18)), (x) => x.toString(16).padStart(2, '0')).join('')
      const { data: q, error } = await db.from('qt_quotes').insert({
        company_id: company.id, number, customer_id: customerId, owner_name: 'الوكيل', doc_status: 'draft', work_state: 'preparing',
        lines, discount_pct: 0, vat_rate: s.vat_rate, currency: s.currency,
        valid_until: new Date(Date.now() + s.validity_days * 86400000).toISOString().slice(0, 10),
        payment_terms: s.payment_terms, delivery_terms: s.delivery_terms, lang: 'ar', version: 1,
        prep_started_at: at, prep_finished_at: new Date().toISOString(), public_token: tokenHex, idempotency_key: idem,
      }).select('id').single()
      if (error) throw error
      const who = `${name}${org ? ` (${org})` : ''}`
      await db.from('qt_events').insert([
        { company_id: company.id, quote_id: q.id, kind: 'created', body: `وصل طلب من صفحة طلب العروض: ${who}، ${lines.length} بند`, actor: 'الوكيل' },
        ...(text.trim() ? [{ company_id: company.id, quote_id: q.id, kind: 'created', body: `نص الطلب: ${text.trim().slice(0, 1500)}`, actor: who }] : []),
      ])
      return json({ ok: true, number })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    console.error('qt-agent', e)
    if (e instanceof Error && e.message === 'file_too_large') return json({ ok: false, message: 'الملف أكبر من 5 ميجا.' })
    return json({ ok: false, message: 'تعذر استلام الطلب، حاول مرة ثانية.' }, 500)
  }
})
