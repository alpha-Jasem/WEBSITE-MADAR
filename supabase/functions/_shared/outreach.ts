// Shared outreach logic: starting and advancing Apify runs (Google Maps + LinkedIn) and importing leads.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const APIFY = 'https://api.apify.com/v2'
const MAPS_ACTOR = 'compass~crawler-google-places'
const LINKEDIN_ACTOR = 'harvestapi~linkedin-company-search'
export const MAX_COUNT = 500

const DISTRICTS: Record<string, string[]> = {
  Jeddah: ['Al Hamra', 'Al Rawdah', 'Al Salamah', 'Al Safa', 'Al Zahraa', 'Al Nahda', 'Al Andalus', 'Ash Sharafeyah',
    'Al Faisaliyah', 'Obhur', 'Al Marwah', 'Al Basateen', 'Al Naeem', 'Al Aziziyah', 'Ash Shati', 'Al Muhammadiyah',
    'Al Khalidiyah', 'Ar Rehab', 'Al Fayhaa', 'Al Mohammadiyah'],
  Riyadh: ['Al Olaya', 'Al Malaz', 'As Sulimaniyah', 'An Nakheel', 'Al Yasmin', 'An Narjis', 'Hittin', 'Al Malqa',
    'Ar Rawdah', 'Al Murabba', 'Al Wurud', 'An Nuzhah', 'Al Aziziyah', 'Ar Rabwah', 'As Sahafah', 'Al Qirawan',
    'Al Ghadir', 'Al Muruj', 'Laban', 'Al Yarmuk'],
  Dammam: ['Al Faisaliyah', 'Al Shati', 'Al Adamah', 'Al Mazruiyah', 'Uhud', 'Al Nur', 'Al Badiyah', 'Al Jalawiyah'],
  Khobar: ['Al Aqrabiyah', 'Al Rakah', 'Al Yarmouk', 'Al Ulaya', 'Al Hamra', 'Al Khobar Shamalia', 'Thuqbah', 'Al Bandariyah'],
  Makkah: ['Al Aziziyah', 'Al Shawqiyah', 'Al Awali', 'Al Naseem', 'Al Zahir', 'Al Rusayfah', 'Al Sharaie', 'Al Kakiyah'],
  Madinah: ['Quba', 'Al Aziziyah', 'Al Khalidiyah', 'Al Awali', 'Sultanah', 'Al Rawabi', 'Al Mughaysilah', 'Al Hijrah'],
}

// Saudi numbers -> 966XXXXXXXXX. Returns null when it is not a usable Saudi number.
export function normalizeSaudiPhone(value: unknown) {
  let d = String(value ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('966')) d = d.slice(3)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length !== 9) return null
  return { phone: `966${d}`, isMobile: d.startsWith('5') }
}

export async function apify(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${APIFY}${path}${path.includes('?') ? '&' : '?'}token=${token}`, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error?.message || `apify_${res.status}`)
  return body
}

const post = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

export interface StartOpts {
  source: 'google_maps' | 'linkedin'
  query: string
  city: string
  count: number
  trigger: 'manual' | 'daily'
  userId?: string | null
}

// Website campaign: high-intent B2B sectors in Jeddah, in priority order. need/importance/ability are the
// owner-approved judgment weights for the 100-point lead score, not measured data.
export const CAMPAIGN_QUERY = 'website prospects'
const PROSPECT_SECTORS = [
  { key: 'contracting', rank: 1, terms: ['general contractor', 'interior fit out company'], need: 30, importance: 25, ability: 14 },
  { key: 'equipment', rank: 2, terms: ['heavy equipment rental', 'crane and forklift rental'], need: 28, importance: 22, ability: 14 },
  { key: 'logistics', rank: 3, terms: ['logistics company', 'freight forwarding company'], need: 26, importance: 22, ability: 13 },
  { key: 'fabrication', rank: 4, terms: ['aluminum and glass fabrication', 'kitchen manufacturer workshop'], need: 26, importance: 22, ability: 11 },
  { key: 'hvac', rank: 5, terms: ['air conditioning maintenance company', 'facility maintenance company'], need: 24, importance: 22, ability: 10 },
  { key: 'clinics', rank: 6, terms: ['medical clinic', 'cosmetic clinic'], need: 24, importance: 20, ability: 11 },
  { key: 'recruitment', rank: 7, terms: ['domestic workers recruitment office', 'manpower recruitment agency'], need: 22, importance: 20, ability: 10 },
  { key: 'cleaning', rank: 8, terms: ['cleaning company', 'pest control company'], need: 22, importance: 20, ability: 8 },
  { key: 'real_estate', rank: 9, terms: ['real estate office', 'property management company'], need: 20, importance: 22, ability: 9 },
  { key: 'events', rank: 10, terms: ['exhibition organizer', 'event management company'], need: 22, importance: 18, ability: 9 },
]
// Never targeted by the campaign, even when they have no website.
const BANNED = /(restaurant|cafe|café|coffee|grocery|supermarket|mini ?market|barber|fast food|food truck|bakery|sweets|juice|مطعم|مقهى|كافيه|بقال|سوبرماركت|حلاق)/i
// These are not an independent website of the business.
const NOT_A_SITE = /(instagram|facebook|fb\.com|twitter|x\.com|tiktok|snapchat|linktr\.ee|linktree|wa\.me|whatsapp|t\.me|youtube|google\.|goo\.gl|maps\.app|business\.site)/i

function prospectScore(sec: typeof PROSPECT_SECTORS[number], it: any, isMobile: boolean) {
  const rating = Number(it.totalScore || 0)
  const reviews = Number(it.reviewsCount || 0)
  const lr = Math.log10(reviews + 1)
  const ability = Math.min(20, sec.ability + Math.min(6, Math.floor(lr * 3)))
  const quality = Math.min(15, (rating >= 4.5 ? 8 : rating >= 4 ? 6 : rating >= 3.5 ? 3 : 0) + Math.min(7, Math.floor(lr * 3.5)))
  return Math.min(100, sec.need + sec.importance + ability + quality + (isMobile ? 10 : 4))
}

// Google Maps returns ~120 places per search at most, so big requests are split by district.
// Search terms and city must be English: Arabic terms return nothing from the scraper.
function mapsInput(o: StartOpts, requested: number) {
  const districts = DISTRICTS[o.city] ?? []
  const searches = Math.max(1, Math.min(Math.ceil(requested / 40), districts.length || 1))
  const searchStrings = districts.length > 1 ? districts.slice(0, searches).map(d => `${o.query} ${d}`) : [o.query]
  return {
    searchStringsArray: searchStrings,
    locationQuery: `${o.city}, Saudi Arabia`,
    maxCrawledPlacesPerSearch: districts.length > 1 ? 60 : Math.min(requested, 120),
    language: 'en',
    skipClosedPlaces: true,
  }
}

// Google Places API (New) text search, used when Apify is out of credit. Synchronous: the leads are imported straight away.
// Phone numbers sit in the Enterprise field tier, which has a monthly free allowance, so each run is capped at 25 requests.
const PLACES_MAX_REQUESTS = 25
const b64url = (v: string | ArrayBuffer) => {
  const bytes = typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Auth for Places: an API key if set, otherwise the existing Google service account (cloud-platform scope).
export async function placesAuth(): Promise<Record<string, string> | null> {
  const key = Deno.env.get('GOOGLE_PLACES_KEY')
  if (key) return { 'X-Goog-Api-Key': key }
  const raw = Deno.env.get('GOOGLE_SA_JSON')
  if (!raw) return null
  const sa = JSON.parse(raw)
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const k = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', k, new TextEncoder().encode(`${header}.${claims}`))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${b64url(sig)}` }),
  })
  const tok = await res.json().catch(() => ({}))
  if (!tok.access_token) throw new Error(tok.error_description || 'google_token_failed')
  return { Authorization: `Bearer ${tok.access_token}`, 'X-Goog-User-Project': String(sa.project_id) }
}

async function placesRun(service: SupabaseClient, o: StartOpts, count: number, requested: number) {
  const auth = await placesAuth()
  if (!auth) throw new Error('missing_google_places_key')
  const districts = DISTRICTS[o.city] ?? []
  const searches = Math.max(1, Math.min(Math.ceil(requested / 40), districts.length || 1))
  const queries = districts.length > 1 ? districts.slice(0, searches).map(d => `${o.query} ${d} ${o.city}`) : [`${o.query} ${o.city}`]
  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []
  let requests = 0
  for (const textQuery of queries) {
    let pageToken: string | undefined
    for (let page = 0; page < 3 && requests < PLACES_MAX_REQUESTS && rows.length < requested; page++) {
      requests++
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', ...auth,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,places.businessStatus,nextPageToken',
        },
        body: JSON.stringify({ textQuery, languageCode: 'en', regionCode: 'SA', pageSize: 20, ...(pageToken ? { pageToken } : {}) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error?.message || `places_${res.status}`)
      for (const it of body.places ?? []) {
        if (it.businessStatus && it.businessStatus !== 'OPERATIONAL') continue
        const p = normalizeSaudiPhone(it.internationalPhoneNumber || it.nationalPhoneNumber)
        if (!p || seen.has(p.phone)) continue
        seen.add(p.phone)
        rows.push({
          name: it.displayName?.text || '—', phone: p.phone, is_mobile: p.isMobile, website: it.websiteUri || '',
          address: it.formattedAddress || '', city: o.city, category: it.primaryTypeDisplayName?.text || '',
          rating: it.rating ?? null, reviews: it.userRatingCount ?? null, source: 'google_maps', source_url: it.googleMapsUri || '',
        })
      }
      pageToken = body.nextPageToken
      if (!pageToken) break
    }
  }
  rows.sort((a, b) => Number(b.is_mobile) - Number(a.is_mobile))
  const wanted = rows.slice(0, requested)
  const { data: row, error } = await service.from('outreach_runs').insert({
    source: 'google_maps', query: o.query, city: o.city, requested: count, stage: 'main', trigger: o.trigger,
    created_by: o.userId ?? null, status: 'done', imported: true, found: wanted.length, meta: { via: 'google_places', requests },
  }).select('id').single()
  if (error) throw new Error(error.message)
  const added = await insertLeads(service, wanted.map(r => ({ ...r, run_id: row.id })), o.query)
  await service.from('outreach_runs').update({ added }).eq('id', row.id)
  return row.id as string
}

export async function startRun(service: SupabaseClient, token: string, o: StartOpts) {
  const count = Math.min(Math.max(Number(o.count) || 200, 10), MAX_COUNT)
  const requested = Math.min(Math.ceil(count * 1.5), 750)
  let run

  const campaign = o.source === 'google_maps' && o.query === CAMPAIGN_QUERY
  if (campaign) {
    run = await apify(`/acts/${MAPS_ACTOR}/runs`, token, post({
      searchStringsArray: PROSPECT_SECTORS.flatMap(x => x.terms),
      locationQuery: `${o.city}, Saudi Arabia`,
      maxCrawledPlacesPerSearch: 25,
      language: 'en',
      skipClosedPlaces: true,
    }))
  } else if (o.source === 'google_maps' && (Deno.env.get('GOOGLE_PLACES_KEY') || Deno.env.get('GOOGLE_SA_JSON'))) {
    try { run = await apify(`/acts/${MAPS_ACTOR}/runs`, token, post(mapsInput(o, requested))) }
    catch { return placesRun(service, o, count, requested) }
  }

  if (o.source === 'linkedin') {
    run = await apify(`/acts/${LINKEDIN_ACTOR}/runs`, token, post({
      searchQuery: o.query,
      locations: [o.city],
      maxItems: Math.min(count * 2, 1000),
      takePages: Math.min(20, Math.ceil((count * 2) / 50)),
    }))
  } else if (!run) {
    run = await apify(`/acts/${MAPS_ACTOR}/runs`, token, post(mapsInput(o, requested)))
  }

  const { data: row, error } = await service.from('outreach_runs').insert({
    source: o.source, query: o.query, city: o.city, requested: count,
    apify_run_id: run.data.id, dataset_id: run.data.defaultDatasetId,
    stage: o.source === 'linkedin' ? 'linkedin' : 'main', trigger: o.trigger, created_by: o.userId ?? null,
    meta: campaign ? { campaign: true } : {},
  }).select('id').single()
  if (error) throw new Error(error.message)
  return row.id as string
}

async function datasetItems(datasetId: string, token: string) {
  const res = await fetch(`${APIFY}/datasets/${datasetId}/items?clean=true&format=json&token=${token}`)
  const items = await res.json()
  return Array.isArray(items) ? items : []
}

interface Focus { preset: string; include_words: string[]; exclude_words: string[] }
// same rule as the database function lead_in_focus: excluded words win, then at least one included word must match
export function inFocus(category: unknown, f: Focus | null) {
  if (!f || f.preset === 'all') return true
  const c = String(category ?? '').toLowerCase()
  if ((f.exclude_words ?? []).some(w => w && c.includes(w.toLowerCase()))) return false
  if (!(f.include_words ?? []).length) return true
  return f.include_words.some(w => w && c.includes(w.toLowerCase()))
}

// same rule as the database function query_is_real_estate: the focus words only apply to real estate searches
export const isRealEstateQuery = (q: unknown) => /(real estate|property|developer|development|realty|apartment|housing|عقار|تطوير)/i.test(String(q ?? ''))

async function insertLeads(service: SupabaseClient, allRows: Record<string, unknown>[], query: string) {
  const { data: focus } = await service.from('lead_focus').select('preset, include_words, exclude_words').eq('id', 1).maybeSingle()
  const { data: gone } = await service.from('deleted_leads').select('phone')
  const deleted = new Set((gone ?? []).map(g => g.phone as string))
  const checkFocus = isRealEstateQuery(query)
  const rows = allRows.filter(r => (!checkFocus || inFocus(r.category, focus as Focus | null)) && !deleted.has(String(r.phone)))
  let added = 0
  for (let i = 0; i < rows.length; i += 200) {
    const { data } = await service.from('outreach_leads')
      .upsert(rows.slice(i, i + 200), { onConflict: 'phone', ignoreDuplicates: true }).select('id')
    added += data?.length ?? 0
  }
  return added
}

const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(t => t.length > 2)

async function failRun(service: SupabaseClient, id: string, error: string) {
  await service.from('outreach_runs').update({ status: 'failed', error }).eq('id', id)
  return { status: 'failed' as const, error }
}

// Moves a run forward one step. Safe to call repeatedly (polling from the UI or the cron tick).
export async function advanceRun(service: SupabaseClient, token: string, run: any) {
  if (run.imported) return { status: 'done' as const, added: run.added, found: run.found }
  if (run.status === 'failed') return { status: 'failed' as const, error: run.error }

  const activeId = run.stage === 'maps' ? run.second_run_id : run.apify_run_id
  const activeDs = run.stage === 'maps' ? run.second_dataset_id : run.dataset_id
  const info = await apify(`/actor-runs/${activeId}`, token)
  const st = info.data.status as string
  if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(st)) return failRun(service, run.id, st)
  if (st !== 'SUCCEEDED') {
    const ds = await apify(`/datasets/${activeDs}`, token).catch(() => null)
    return { status: 'running' as const, progress: ds?.data?.itemCount ?? 0 }
  }

  const items = await datasetItems(activeDs, token)
  // Real Apify spend of the runs so far (USD), stored on the run so profitability can use it
  const cost = Number(run.cost_usd ?? 0) + Number(info.data.usageTotalUsd ?? 0)

  /* ---- LinkedIn stage 1: companies; those with a phone import now, the rest go to a Maps phone lookup ---- */
  if (run.stage === 'linkedin') {
    const seen = new Set<string>()
    const rows: Record<string, unknown>[] = []
    const lookup: { key: string; name: string; website: string; url: string; city: string; category: string }[] = []
    for (const it of items) {
      const name = String(it.name || '').trim()
      if (!name) continue
      const city = it.locations?.[0]?.city || run.city
      const category = it.industries?.[0]?.name || ''
      const p = normalizeSaudiPhone(it.phone?.number ?? it.phone)
      if (p) {
        if (seen.has(p.phone)) continue
        seen.add(p.phone)
        rows.push({
          run_id: run.id, name, phone: p.phone, is_mobile: p.isMobile, website: it.website || '', address: '',
          city, category, source: 'linkedin', source_url: it.linkedinUrl || '',
        })
      } else {
        lookup.push({ key: `${name} ${run.city}`, name, website: it.website || '', url: it.linkedinUrl || '', city, category })
      }
    }
    const added = await insertLeads(service, rows.slice(0, run.requested), run.query)
    const todo = lookup.slice(0, 300)
    if (todo.length === 0) {
      await service.from('outreach_runs').update({ status: 'done', imported: true, cost_usd: cost, found: rows.length, added }).eq('id', run.id)
      return { status: 'done' as const, added, found: rows.length }
    }
    const second = await apify(`/acts/${MAPS_ACTOR}/runs`, token, post({
      searchStringsArray: todo.map(t => t.key),
      locationQuery: `${run.city}, Saudi Arabia`,
      maxCrawledPlacesPerSearch: 1,
      language: 'en',
    }))
    await service.from('outreach_runs').update({
      stage: 'maps', cost_usd: cost, second_run_id: second.data.id, second_dataset_id: second.data.defaultDatasetId,
      added, found: rows.length, meta: { lookup: todo },
    }).eq('id', run.id)
    return { status: 'running' as const, progress: rows.length }
  }

  /* ---- LinkedIn stage 2: phones found on Google Maps for the companies ---- */
  if (run.stage === 'maps') {
    const lookup: any[] = run.meta?.lookup ?? []
    const byKey = new Map(lookup.map(l => [l.key, l]))
    const seen = new Set<string>()
    const rows: Record<string, unknown>[] = []
    for (const it of items) {
      const c = byKey.get(it.searchString)
      const p = normalizeSaudiPhone(it.phoneUnformatted || it.phone)
      if (!c || !p || seen.has(p.phone)) continue
      // Accept only if the Maps place plausibly is the same company (shares a word with its name).
      const a = new Set(tokens(c.name))
      if (!tokens(String(it.title || '')).some(t => a.has(t))) continue
      seen.add(p.phone)
      rows.push({
        run_id: run.id, name: c.name, phone: p.phone, is_mobile: p.isMobile, website: c.website || it.website || '',
        address: it.address || '', city: it.city || c.city, category: c.category || it.categoryName || '',
        rating: it.totalScore ?? null, reviews: it.reviewsCount ?? null, source: 'linkedin', source_url: c.url || it.url || '',
      })
    }
    rows.sort((a, b) => Number(b.is_mobile) - Number(a.is_mobile))
    const remaining = Math.max(0, run.requested - (run.added || 0))
    const added2 = await insertLeads(service, rows.slice(0, remaining), run.query)
    const total = (run.added || 0) + added2
    await service.from('outreach_runs').update({ status: 'done', imported: true, cost_usd: cost, found: (run.found || 0) + rows.length, added: total }).eq('id', run.id)
    return { status: 'done' as const, added: total, found: (run.found || 0) + rows.length }
  }

  /* ---- Website campaign: only businesses without an independent website, scored and balanced across sectors ---- */
  if (run.meta?.campaign) {
    const bySearch = new Map(PROSPECT_SECTORS.flatMap(x => x.terms.map(t => [t, x] as const)))
    const seen = new Set<string>()
    const rows: Record<string, unknown>[] = []
    for (const it of items) {
      const sec = bySearch.get(String(it.searchString ?? '').trim())
      const p = normalizeSaudiPhone(it.phoneUnformatted || it.phone)
      if (!sec || !p || seen.has(p.phone)) continue
      const category = String(it.categoryName || (it.categories?.[0] ?? ''))
      if (BANNED.test(category) || BANNED.test(String(it.title ?? ''))) continue
      if (it.permanentlyClosed) continue
      const site = String(it.website || '').trim()
      if (site && !NOT_A_SITE.test(site)) continue
      seen.add(p.phone)
      rows.push({
        run_id: run.id, name: it.title || it.name || '—', phone: p.phone, is_mobile: p.isMobile,
        website: site, address: it.address || '', city: it.city || run.city, category,
        rating: it.totalScore ?? null, reviews: it.reviewsCount ?? null, source: 'google_maps', source_url: it.url || '',
        sector: sec.key, priority_rank: sec.rank, lead_score: prospectScore(sec, it, p.isMobile), site_status: 'needs_verification',
      })
    }
    const byScore = (a: any, b: any) => a.priority_rank - b.priority_rank || b.lead_score - a.lead_score
    rows.sort(byScore)
    // first the best 10 of every sector, then fill up to the requested count in priority order
    const perSector = new Map<string, number>()
    const picked: Record<string, unknown>[] = []
    const rest: Record<string, unknown>[] = []
    for (const r of rows) {
      const n = perSector.get(r.sector as string) ?? 0
      if (n < 10 && picked.length < run.requested) { perSector.set(r.sector as string, n + 1); picked.push(r) } else rest.push(r)
    }
    for (const r of rest) { if (picked.length >= run.requested) break; picked.push(r) }
    picked.sort(byScore)
    const added = await insertLeads(service, picked, run.query)
    await service.from('outreach_runs').update({ status: 'done', imported: true, cost_usd: cost, found: picked.length, added }).eq('id', run.id)
    return { status: 'done' as const, added, found: picked.length }
  }

  /* ---- Google Maps ---- */
  const seen = new Set<string>()
  const rows: Record<string, unknown>[] = []
  for (const it of items) {
    const p = normalizeSaudiPhone(it.phoneUnformatted || it.phone)
    if (!p || seen.has(p.phone)) continue
    seen.add(p.phone)
    rows.push({
      run_id: run.id, name: it.title || it.name || '—', phone: p.phone, is_mobile: p.isMobile,
      website: it.website || '', address: it.address || '', city: it.city || run.city,
      category: it.categoryName || (it.categories?.[0] ?? ''),
      rating: it.totalScore ?? null, reviews: it.reviewsCount ?? null,
      source: 'google_maps', source_url: it.url || '',
    })
  }
  // Mobiles first (WhatsApp works on them), then trim to what was asked for.
  rows.sort((a, b) => Number(b.is_mobile) - Number(a.is_mobile))
  const wanted = rows.slice(0, run.requested)
  const added = await insertLeads(service, wanted, run.query)
  await service.from('outreach_runs').update({ status: 'done', imported: true, cost_usd: cost, found: wanted.length, added }).eq('id', run.id)
  return { status: 'done' as const, added, found: wanted.length }
}
