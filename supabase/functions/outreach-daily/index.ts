// Cron + push for Outreach: daily lead fetch, run completion alerts, morning digest, test push.
// Deployed with --no-verify-jwt: cron calls it with x-cron-secret, the dashboard with an admin JWT.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import webpush from 'npm:web-push@3.6.7'
import { advanceRun, startRun } from '../_shared/outreach.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const nfmt = (n: number) => n.toLocaleString('ar-SA')
const names = (list: { name: string }[], max = 4) => {
  const shown = list.slice(0, max).map(l => l.name).join('، ')
  return list.length > max ? `${shown} و${nfmt(list.length - max)} آخرين` : shown
}
const riyadhStart = () => {
  const now = new Date(Date.now() + 3 * 3600000)
  now.setUTCHours(0, 0, 0, 0)
  return new Date(now.getTime() - 3 * 3600000)
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const apifyToken = Deno.env.get('APIFY_TOKEN')
  const cronSecret = Deno.env.get('OUTREACH_CRON_SECRET')
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  const service = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } })

  const payload = await req.json().catch(() => ({}))
  const action = String(payload.action || '')

  // Auth: cron secret, or an admin session (for the manual test/digest buttons).
  const fromCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret
  let adminUserId: string | null = null
  if (!fromCron) {
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'missing_auth' }, 401)
    const { data: u } = await service.auth.getUser(token)
    if (!u.user) return json({ error: 'invalid_auth' }, 401)
    const { data: profile } = await service.from('users').select('role').eq('id', u.user.id).maybeSingle()
    if (profile?.role !== 'admin') return json({ error: 'forbidden' }, 403)
    adminUserId = u.user.id
    if (!['test_push', 'digest', 'brief'].includes(action)) return json({ error: 'forbidden_action' }, 403)
  }

  const preview = payload.preview === true
  async function push(title: string, body: string, url = '/admin/outreach', tag = 'outreach', onlyUser?: string | null) {
    if (preview) return { sent: 0, preview: { title, body, url } }
    if (!vapidPublic || !vapidPrivate) return { sent: 0, error: 'vapid_not_configured' }
    webpush.setVapidDetails('https://madar.software', vapidPublic, vapidPrivate)
    let q = service.from('push_subscriptions').select('*')
    if (onlyUser) q = q.eq('user_id', onlyUser)
    const { data: subs } = await q
    let sent = 0
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url, tag }),
        )
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await service.from('push_subscriptions').delete().eq('id', s.id)
      }
    }
    return { sent, subscriptions: subs?.length ?? 0 }
  }

  try {
    if (action === 'test_push') {
      const r = await push('مدار — تجربة الإشعارات', 'وصلك هذا الإشعار، يعني الإشعارات شغّالة على جوالك. بكرة الصبح يوصلك ملخص المتابعات والعملاء الجدد.', '/admin/outreach', 'test', adminUserId)
      return json({ ok: true, ...r })
    }

    if (action === 'notify') {
      // called by database triggers (payments, deals, bank transfers) with the cron secret
      if (!fromCron) return json({ error: 'forbidden_action' }, 403)
      const title = String(payload.title || '').slice(0, 80)
      const body = String(payload.body || '').slice(0, 240)
      if (!title || !body) return json({ error: 'empty' }, 400)
      const r = await push(title, body, String(payload.url || '/admin'), String(payload.tag || 'event'))
      return json({ ok: true, ...r })
    }

    if (action === 'daily_fetch') {
      const { data: s } = await service.from('outreach_settings').select('*').eq('id', 1).maybeSingle()
      if (!s?.daily_enabled || !apifyToken) return json({ ok: true, skipped: 'disabled' })
      const { count } = await service.from('outreach_runs').select('id', { count: 'exact', head: true })
        .eq('trigger', 'daily').gte('created_at', riyadhStart().toISOString())
      if ((count ?? 0) > 0) return json({ ok: true, skipped: 'already_ran_today' })
      const sources = s.daily_source === 'both' ? ['google_maps', 'linkedin'] : [s.daily_source]
      const ids: string[] = []
      for (const source of sources) {
        ids.push(await startRun(service, apifyToken, {
          source: source as 'google_maps' | 'linkedin', query: s.daily_query, city: s.daily_city,
          count: sources.length > 1 ? Math.ceil(s.daily_count / 2) : s.daily_count, trigger: 'daily',
        }))
      }
      return json({ ok: true, started: ids })
    }

    if (action === 'tick') {
      if (!apifyToken) return json({ ok: true, skipped: 'no_token' })
      const { data: runs } = await service.from('outreach_runs').select('*')
        .eq('trigger', 'daily').eq('imported', false).eq('status', 'running').limit(5)
      for (const run of runs ?? []) await advanceRun(service, apifyToken, run).catch(() => null)

      // Tell the owner once when today's automatic fetch is finished (all of that day's runs done).
      const { data: finished } = await service.from('outreach_runs').select('*')
        .eq('trigger', 'daily').eq('status', 'done').eq('notified', false)
      if (finished?.length) {
        const { count: stillRunning } = await service.from('outreach_runs').select('id', { count: 'exact', head: true })
          .eq('trigger', 'daily').eq('status', 'running')
        if (!stillRunning) {
          const added = finished.reduce((n, r) => n + (r.added || 0), 0)
          const { data: sample } = await service.from('outreach_leads').select('name')
            .in('run_id', finished.map(r => r.id)).eq('is_mobile', true).order('rating', { ascending: false, nullsFirst: false }).limit(3)
          await push(
            `وصلتك ${nfmt(added)} عميل جديد`,
            `${finished[0].query} في ${finished[0].city}. أبرزهم: ${names(sample ?? [], 3) || '—'}. افتح الصفحة وابدأ التواصل.`,
            '/admin/outreach', 'daily-fetch',
          )
          await service.from('outreach_runs').update({ notified: true }).in('id', finished.map(r => r.id))
        }
      }

      // Follow-ups that just came due, and meetings starting within 20 minutes. Each is pushed once.
      const nowIso = new Date().toISOString()
      const soon = new Date(Date.now() + 20 * 60000).toISOString()
      const { data: dueNow } = await service.from('outreach_leads').select('id, name, next_follow_up, followup_pushed_for')
        .lte('next_follow_up', nowIso).in('status', ['new', 'contacted', 'no_answer', 'replied']).limit(40)
      const dueFresh = (dueNow ?? []).filter(l => l.followup_pushed_for !== l.next_follow_up)
      if (dueFresh.length) {
        await push('حان موعد المتابعة', `${names(dueFresh, 3)}. افتح Outreach واتصل بهم.`, '/admin/outreach', 'followup')
        for (const l of dueFresh) await service.from('outreach_leads').update({ followup_pushed_for: l.next_follow_up }).eq('id', l.id)
      }
      const { data: meetNow } = await service.from('outreach_leads').select('id, name, meeting_at, meeting_pushed_for')
        .eq('status', 'meeting').gte('meeting_at', nowIso).lte('meeting_at', soon).limit(20)
      for (const m of (meetNow ?? []).filter(x => x.meeting_pushed_for !== x.meeting_at)) {
        const at = new Date(m.meeting_at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })
        await push('اجتماع بعد دقائق', `${m.name} الساعة ${at}. جهّز نفسك وافتح رابط الاجتماع.`, '/admin/outreach', 'meeting')
        await service.from('outreach_leads').update({ meeting_pushed_for: m.meeting_at }).eq('id', m.id)
      }
      return json({ ok: true })
    }

    if (action === 'digest' || action === 'brief') {
      const { data: s } = await service.from('outreach_settings').select('digest_enabled').eq('id', 1).maybeSingle()
      if (fromCron && s && !s.digest_enabled) return json({ ok: true, skipped: 'disabled' })

      const endOfToday = new Date(riyadhStart().getTime() + 86400000)
      const [due, fresh, meetings] = await Promise.all([
        service.from('outreach_leads').select('name').lte('next_follow_up', endOfToday.toISOString())
          .in('status', ['new', 'contacted', 'no_answer', 'replied']).order('next_follow_up').limit(50),
        service.from('outreach_leads').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('is_mobile', true),
        service.from('outreach_leads').select('name, meeting_at').eq('status', 'meeting')
          .gte('meeting_at', riyadhStart().toISOString()).lt('meeting_at', endOfToday.toISOString()).order('meeting_at'),
      ])
      const lines: string[] = []
      if (meetings.data?.length) {
        lines.push('اجتماعات اليوم: ' + meetings.data.map(m =>
          `${m.name} (${new Date(m.meeting_at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })})`).join('، '))
      }
      if (due.data?.length) lines.push(`متابعات اليوم (${nfmt(due.data.length)}): ${names(due.data)}`)
      else lines.push('ما عندك متابعات متأخرة اليوم.')
      lines.push(`بانتظار أول تواصل: ${nfmt(fresh.count ?? 0)} عميل.`)
      const [pendingPay, noStep, tasksToday, goal, collected] = await Promise.all([
        service.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification'),
        service.from('deals').select('id', { count: 'exact', head: true }).not('stage', 'in', '(won,lost)').is('next_step', null),
        service.from('admin_tasks').select('id', { count: 'exact', head: true }).eq('done', false).lte('due_at', endOfToday.toISOString()),
        service.from('agency_goals').select('target').eq('period', new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 7)).eq('kind', 'collections').maybeSingle(),
        service.from('payments').select('net_amount').eq('status', 'confirmed').gte('confirmed_at', new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
      ])
      if (tasksToday.count) lines.push(`مهامك المفتوحة اليوم: ${nfmt(tasksToday.count)}.`)
      if (pendingPay.count) lines.push(`دفعات تنتظر تأكيدك: ${nfmt(pendingPay.count)}.`)
      if (noStep.count) lines.push(`صفقات بلا خطوة قادمة: ${nfmt(noStep.count)}.`)
      if (goal.data?.target) {
        const got = (collected.data ?? []).reduce((n, r) => n + Number(r.net_amount || 0), 0)
        lines.push(`هدف الشهر: ${nfmt(Math.round(got))} من ${nfmt(Number(goal.data.target))} ر.س.`)
      }
      const title = due.data?.length || meetings.data?.length
        ? `صباح الخير، عندك ${nfmt((due.data?.length ?? 0) + (meetings.data?.length ?? 0))} مهام اليوم`
        : 'صباح الخير، يومك فاضي للعملاء الجدد'
      const r = await push(title, lines.join('\n'), '/admin/outreach', 'digest', adminUserId)
      return json({ ok: true, ...r })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (e) {
    return json({ error: 'outreach_daily_failed', details: (e as Error).message }, 500)
  }
})
