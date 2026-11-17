// Sends the campaign messages that are due. Runs every 5 minutes from cron (header x-runner-secret), and
// right away when someone presses "send now" (their JWT plus { campaign_id }, limited to their company).
//   step 0          goes out at scheduled_at
//   step n (n > 0)  goes out delay_days after that person's step n-1 was sent
//   stop_on_reply   someone who started a conversation after their first message gets no more steps
// Every send goes through whatsapp-outreach, which logs it in outreach_messages with campaign_id and step;
// that log is what keeps each person to one message per step. At most PER_RUN sends per campaign per run.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PER_RUN = 100
const BATCH = 25
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-runner-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

interface Step { template_id: string; params: string[]; delay_days: number }
interface Recipient { key: string; phone: string; name: string }
interface Campaign {
  id: string; company_id: string; name: string; status: string; recipients: Recipient[]; steps: Step[]
  stop_on_reply: boolean; scheduled_at: string
}

/** Any format -> 05xxxxxxxx style key, the same one the dashboard uses. */
const norm = (p: string) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('966') ? `0${d.slice(3)}` : d }

async function runCampaign(db: SupabaseClient, c: Campaign, now: number) {
  const { data: sentRows } = await db.from('outreach_messages').select('to_phone, step, status, created_at').eq('campaign_id', c.id)
  const done = new Map<string, { status: string; at: string }>()
  const firstSent = new Map<string, string>()
  for (const r of sentRows || []) {
    const p = norm(r.to_phone)
    done.set(`${r.step}:${p}`, { status: r.status, at: r.created_at })
    if (r.status === 'sent' && (!firstSent.has(p) || r.created_at < firstSent.get(p)!)) firstSent.set(p, r.created_at)
  }

  // Who wrote to us after their first message (for stop_on_reply).
  const replied = new Set<string>()
  if (c.stop_on_reply && firstSent.size) {
    const { data: calls } = await db.from('clinic_os_ai_calls').select('phone, call_time').eq('company_id', c.company_id).gte('call_time', c.scheduled_at)
    for (const k of calls || []) { const p = norm(k.phone); const f = firstSent.get(p); if (f && k.call_time > f) replied.add(p) }
  }

  // Due sends, grouped by step (each step has its own template and values).
  const due = new Map<number, Recipient[]>()
  let remaining = 0
  for (const r of c.recipients || []) {
    const p = norm(r.phone)
    for (let i = 0; i < c.steps.length; i++) {
      if (done.has(`${i}:${p}`)) continue
      if (i > 0) {
        const prev = done.get(`${i - 1}:${p}`)
        // A failed or missing previous step ends this person's journey.
        if (!prev || prev.status !== 'sent') break
        if (replied.has(p)) break
        remaining++
        if (Date.parse(prev.at) + (c.steps[i].delay_days || 0) * 86_400_000 > now) break
      } else remaining++
      const list = due.get(i) || []
      list.push(r)
      due.set(i, list)
      break
    }
  }

  let sent = 0, failed = 0, budget = PER_RUN
  for (const [i, people] of due) {
    const step = c.steps[i]
    for (let o = 0; o < people.length && budget > 0; o += BATCH) {
      const chunk = people.slice(o, Math.min(o + BATCH, o + budget))
      budget -= chunk.length
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-outreach`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: c.company_id, template_id: step.template_id, campaign_id: c.id, step: i, sent_by: `حملة: ${c.name}`.slice(0, 80),
          recipients: chunk.map((r) => ({ phone: r.phone, name: r.name, params: (step.params || []).map((v) => String(v).replaceAll('{name}', r.name || 'عميلنا')) })),
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) {
        // A setup problem (no number, template removed) pauses the campaign instead of retrying every run.
        await db.from('client_campaigns').update({ status: 'paused', updated_at: new Date().toISOString() }).eq('id', c.id)
        return { sent, failed, error: String(out.error || res.status) }
      }
      for (const r of out.results || []) r.status === 'sent' ? sent++ : failed++
    }
  }

  const left = remaining - sent - failed
  const patch = left <= 0 && budget > 0
    ? { status: 'done', finished_at: new Date().toISOString() }
    : { status: 'running' }
  await db.from('client_campaigns').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', c.id).in('status', ['scheduled', 'running'])
  return { sent, failed }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const body = await req.json().catch(() => ({}))
  const secret = Deno.env.get('AUTOMATION_RUNNER_SECRET')
  const fromCron = !!secret && req.headers.get('x-runner-secret') === secret

  let companyId: string | null = null
  if (!fromCron) {
    const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false },
    })
    const { data } = await asUser.rpc('get_my_clinic_company_id')
    companyId = (data as string | null) || null
    if (!companyId || typeof body?.campaign_id !== 'string') return json({ error: 'unauthorized' }, 401)
  }

  let q = db.from('client_campaigns').select('id, company_id, name, status, recipients, steps, stop_on_reply, scheduled_at')
    .in('status', ['scheduled', 'running']).lte('scheduled_at', new Date().toISOString())
  if (companyId) q = q.eq('company_id', companyId).eq('id', body.campaign_id)
  const { data: due, error } = await q.limit(50)
  if (error) return json({ error: error.message }, 500)
  if (companyId && !due?.length) return json({ error: 'not found' }, 404)

  const now = Date.now()
  let sent = 0, failed = 0
  const errors: string[] = []
  for (const c of (due || []) as Campaign[]) {
    const r = await runCampaign(db, c, now)
    sent += r.sent; failed += r.failed
    if ('error' in r && r.error) errors.push(`${c.id}: ${r.error}`)
  }
  return json({ campaigns: due?.length || 0, sent, failed, ...(errors.length ? { errors } : {}) })
})
