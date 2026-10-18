// Fetches the owner's configured AI news feeds (RSS/Atom) and stores title, link and publish date.
// Nothing is invented: an item exists only if the feed returned it, and it always keeps its link and date.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim()
const tag = (block: string, name: string) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : '' }

function parseFeed(xml: string) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  return blocks.slice(0, 15).map(b => {
    const title = tag(b, 'title')
    const link = tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? '')
    const dateRaw = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date')
    const t = dateRaw ? new Date(dateRaw) : null
    return { title, link, published_at: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null }
  }).filter(i => i.title && /^https?:\/\//.test(i.link))
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const secret = Deno.env.get('OUTREACH_CRON_SECRET')
  if (!(secret && req.headers.get('x-cron-secret') === secret)) {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'missing_auth' }, 401)
    const { data: u } = await service.auth.getUser(token)
    if (!u.user) return json({ error: 'invalid_auth' }, 401)
    const { data: me } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
    if (me?.role !== 'admin') return json({ error: 'forbidden' }, 403)
  }

  const { data: sources } = await service.from('news_sources').select('id, name, feed_url').eq('active', true)
  if (!sources?.length) return json({ ok: true, configured: false, fetched: 0 })

  let fetched = 0
  const errors: { source: string; error: string }[] = []
  for (const s of sources) {
    try {
      if (!s.feed_url.startsWith('https://')) throw new Error('only_https_feeds')
      const res = await fetch(s.feed_url, { headers: { 'User-Agent': 'MadarNews/1.0' }, signal: AbortSignal.timeout(15000) })
      if (!res.ok) throw new Error(`http_${res.status}`)
      const items = parseFeed(await res.text())
      if (items.length === 0) throw new Error('no_items_found')
      const { data } = await service.from('news_items').upsert(items.map(i => ({ ...i, source_id: s.id })), { onConflict: 'source_id,link', ignoreDuplicates: true }).select('id')
      fetched += data?.length ?? 0
    } catch (e) {
      errors.push({ source: s.name, error: (e as Error).message })
    }
  }
  return json({ ok: true, configured: true, fetched, errors, fetched_at: new Date().toISOString() })
})
