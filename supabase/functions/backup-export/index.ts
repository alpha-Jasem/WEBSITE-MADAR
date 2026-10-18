// Scheduled/owner-triggered export of the agency tables to a private storage bucket, with a verification pass.
// "verify" checks that each exported file parses and matches its manifest. It is an integrity check, NOT a restore
// into an isolated environment (that needs a second project, so restore_tested_at is only set by verify with a clear note).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const TABLES = [
  'users', 'companies', 'outreach_leads', 'outreach_runs', 'outreach_settings', 'deals', 'deal_events', 'do_not_contact', 'campaigns', 'agency_goals', 'agency_settings',
  'payments', 'invoices', 'quotes', 'contracts', 'refunds', 'expenses', 'bank_notifications', 'onboarding_projects', 'onboarding_items', 'sales_agents',
  'agent_assignments', 'agent_drafts', 'marketers', 'referrals', 'commissions', 'payout_statements', 'packages', 'package_prices', 'agency_services', 'admin_tasks',
  'audit_events', 'news_sources', 'sales_blitz_leads', 'crm_leads',
]
const BUCKET = 'backups'

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
  const { action = 'export' } = await req.json().catch(() => ({}))

  if (action === 'export') {
    const { data: run } = await service.from('backup_runs').insert({ kind: 'tables_json' }).select('id').single()
    const stamp = new Date().toISOString().slice(0, 10)
    const counts: Record<string, number> = {}
    let bytes = 0
    try {
      for (const t of TABLES) {
        const rows: unknown[] = []
        for (let from = 0; ; from += 1000) {
          const { data, error } = await service.from(t).select('*').range(from, from + 999)
          if (error) throw new Error(`${t}: ${error.message}`)
          rows.push(...(data ?? []))
          if ((data?.length ?? 0) < 1000) break
        }
        const body = JSON.stringify(rows)
        bytes += body.length
        const { error: up } = await service.storage.from(BUCKET).upload(`${stamp}/${t}.json`, new Blob([body], { type: 'application/json' }), { upsert: true })
        if (up) throw new Error(`upload ${t}: ${up.message}`)
        counts[t] = rows.length
      }
      await service.storage.from(BUCKET).upload(`${stamp}/manifest.json`, new Blob([JSON.stringify({ stamp, counts })], { type: 'application/json' }), { upsert: true })
      await service.from('backup_runs').update({ status: 'ok', tables: counts, bytes, storage_path: stamp, finished_at: new Date().toISOString() }).eq('id', run!.id)
      return json({ ok: true, path: stamp, tables: Object.keys(counts).length, bytes })
    } catch (e) {
      await service.from('backup_runs').update({ status: 'failed', error: (e as Error).message.slice(0, 300), finished_at: new Date().toISOString() }).eq('id', run!.id)
      return json({ ok: false, error: (e as Error).message }, 500)
    }
  }

  if (action === 'verify') {
    const { data: last } = await service.from('backup_runs').select('id, storage_path, tables').eq('status', 'ok').order('started_at', { ascending: false }).limit(1).maybeSingle()
    if (!last) return json({ ok: false, error: 'no_backup_to_verify' }, 404)
    const bad: string[] = []
    for (const [t, n] of Object.entries(last.tables as Record<string, number>)) {
      const { data, error } = await service.storage.from(BUCKET).download(`${last.storage_path}/${t}.json`)
      if (error || !data) { bad.push(`${t}: missing`); continue }
      try { const rows = JSON.parse(await data.text()); if (!Array.isArray(rows) || rows.length !== n) bad.push(`${t}: count ${Array.isArray(rows) ? rows.length : '?'} != ${n}`) } catch { bad.push(`${t}: unreadable`) }
    }
    const note = bad.length ? `فشل التحقق: ${bad.slice(0, 5).join('، ')}` : 'الملفات سليمة ومطابقة للفهرس. هذا فحص سلامة وليس استعادة في بيئة معزولة (تحتاج مشروعًا ثانيًا).'
    await service.from('backup_runs').update({ restore_tested_at: bad.length ? null : new Date().toISOString(), restore_test_note: note }).eq('id', last.id)
    return json({ ok: bad.length === 0, note })
  }
  return json({ error: 'unknown_action' }, 400)
})
