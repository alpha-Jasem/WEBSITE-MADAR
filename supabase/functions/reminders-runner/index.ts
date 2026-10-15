// Sends the appointment reminders the company switched on (clinic_os_reminder_rules). Runs every 10 minutes
// from cron (header x-runner-secret). A rule only sends once it has an approved WhatsApp template chosen.
//   reminder_24h   WhatsApp template ~24 hours before the appointment
//   reminder_3h    WhatsApp template ~2 hours before
//   review_request WhatsApp template 1-6 hours after a completed visit
//   no_show_alert  in-dashboard notification when a booking is 30+ minutes late and nobody checked in
// Appointment times are Saudi local time (UTC+3). reminder_sends keeps each reminder to once per appointment.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SAUDI_OFFSET_MS = 3 * 3600_000
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

interface Appt {
  id: string; company_id: string; patient_name: string; patient_phone: string; service_name: string | null
  appointment_date: string; start_time: string; end_time: string; status: string
}
interface Rule { id: string; company_id: string; rule_key: string; enabled: boolean; template_id: string | null; params: string[] | null }

/** The appointment's start as a real instant. */
const startMs = (a: Appt) => Date.parse(`${a.appointment_date}T${a.start_time.slice(0, 8)}Z`) - SAUDI_OFFSET_MS
const endMs = (a: Appt) => Date.parse(`${a.appointment_date}T${a.end_time.slice(0, 8)}Z`) - SAUDI_OFFSET_MS
const iso = (ms: number) => new Date(ms).toISOString()
const hhmm = (t: string) => t.slice(0, 5)

function fillParam(tpl: string, a: Appt): string {
  const map: Record<string, string> = {
    'customer.name': a.patient_name, 'customer.phone': a.patient_phone, 'booking.date': a.appointment_date,
    'booking.time': hhmm(a.start_time), 'booking.service': a.service_name || '',
  }
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k: string) => map[k] ?? '')
}

async function claim(db: SupabaseClient, a: Appt, key: string, status: 'sent' | 'failed' | 'skipped', detail: string) {
  await db.from('reminder_sends').upsert({ company_id: a.company_id, appointment_id: a.id, rule_key: key, status, detail: detail.slice(0, 300) }, { onConflict: 'appointment_id,rule_key', ignoreDuplicates: true })
}

async function sendTemplate(rule: Rule, a: Appt): Promise<string> {
  const params = (rule.params || []).map((p) => fillParam(String(p), a))
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-outreach`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: rule.template_id, company_id: rule.company_id, sent_by: 'التذكير الآلي', recipients: [{ phone: a.patient_phone, name: a.patient_name, params }] }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `فشل ${res.status}`)
  const r = out.results?.[0]
  if (r && r.status !== 'sent') throw new Error(r.error || 'ما انرسلت')
  return 'أُرسل'
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('AUTOMATION_RUNNER_SECRET')
  if (!secret || req.headers.get('x-runner-secret') !== secret) return json({ error: 'unauthorized' }, 401)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: rules } = await db.from('clinic_os_reminder_rules').select('id, company_id, rule_key, enabled, template_id, params').eq('enabled', true)
    .in('rule_key', ['reminder_24h', 'reminder_3h', 'review_request', 'no_show_alert'])
  const now = Date.now()
  const stats = { sent: 0, failed: 0, alerts: 0 }

  // Windows, as hours before (negative: after) the appointment start.
  const windows: Record<string, [number, number]> = { reminder_24h: [23, 24.5], reminder_3h: [1.5, 2.5] }

  for (const rule of (rules || []) as Rule[]) {
    if (rule.rule_key === 'no_show_alert') {
      const day = iso(now + SAUDI_OFFSET_MS).slice(0, 10)
      const { data: appts } = await db.from('clinic_os_appointments').select('id, company_id, patient_name, patient_phone, service_name, appointment_date, start_time, end_time, status')
        .eq('company_id', rule.company_id).eq('appointment_date', day).in('status', ['confirmed', 'pending'])
      for (const a of (appts || []) as Appt[]) {
        if (now < startMs(a) + 30 * 60_000) continue
        const { data: done } = await db.from('reminder_sends').select('id').eq('appointment_id', a.id).eq('rule_key', 'no_show_alert').maybeSingle()
        if (done) continue
        await db.from('clinic_os_notifications').insert({ company_id: a.company_id, notification_type: 'no_show_alert', title: 'موعد متأخر', message: `${a.patient_name} ما حضر موعده الساعة ${hhmm(a.start_time)}`, severity: 'warning', route: 'bookings' })
        await claim(db, a, 'no_show_alert', 'sent', 'تنبيه داخلي')
        stats.alerts++
      }
      continue
    }

    if (!rule.template_id) continue  // switched on but no template chosen yet: nothing can be sent
    let from: string, to: string
    if (rule.rule_key === 'review_request') { from = iso(now - 6 * 3600_000); to = iso(now - 3600_000) } else {
      const [lo, hi] = windows[rule.rule_key]
      from = iso(now + lo * 3600_000); to = iso(now + hi * 3600_000)
    }
    // Pull the days that can hold the window, then keep the exact matches in code.
    const dayLo = iso(Date.parse(from) + SAUDI_OFFSET_MS).slice(0, 10), dayHi = iso(Date.parse(to) + SAUDI_OFFSET_MS).slice(0, 10)
    const wanted = rule.rule_key === 'review_request' ? ['completed'] : ['confirmed', 'pending']
    const { data: appts } = await db.from('clinic_os_appointments').select('id, company_id, patient_name, patient_phone, service_name, appointment_date, start_time, end_time, status')
      .eq('company_id', rule.company_id).gte('appointment_date', dayLo).lte('appointment_date', dayHi).in('status', wanted)
    for (const a of (appts || []) as Appt[]) {
      const t = rule.rule_key === 'review_request' ? endMs(a) : startMs(a)
      if (t < Date.parse(from) || t > Date.parse(to)) continue
      const { data: done } = await db.from('reminder_sends').select('id').eq('appointment_id', a.id).eq('rule_key', rule.rule_key).maybeSingle()
      if (done) continue
      try { const d = await sendTemplate(rule, a); await claim(db, a, rule.rule_key, 'sent', d); stats.sent++ }
      catch (e) { await claim(db, a, rule.rule_key, 'failed', e instanceof Error ? e.message : String(e)); stats.failed++ }
    }
  }
  return json({ ok: true, ...stats })
})
