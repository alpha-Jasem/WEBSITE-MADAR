// Receives a table reservation from a restaurant's WhatsApp agent and stores it (restaurant_reservations).
//   POST { customer_name, customer_phone, date: YYYY-MM-DD, time: HH:MM, party_size, notes? }
//   Header x-agent-key must equal the RESTAURANT_AGENT_KEY secret.
// Reservations are saved as "pending" until the restaurant confirms them. Times are Saudi local time.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const key = Deno.env.get('RESTAURANT_AGENT_KEY')
  if (!key || req.headers.get('x-agent-key') !== key) return json({ error: 'unauthorized' }, 401)

  const b = await req.json().catch(() => ({}))
  const date = String(b.date || '')
  const time = String(b.time || '')
  const size = Math.round(Number(b.party_size))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return json({ error: 'date must be YYYY-MM-DD and time HH:MM' }, 400)
  if (!(size >= 1 && size <= 30)) return json({ error: 'party_size must be between 1 and 30' }, 400)

  // Saudi "now" (UTC+3): reject reservations in the past.
  const nowSa = new Date(Date.now() + 3 * 3600_000).toISOString()
  const when = `${date}T${time.padStart(5, '0')}:00.000Z`
  if (when < nowSa) return json({ error: 'that time has already passed' }, 400)
  const hour = Number(time.split(':')[0])
  if (hour < 12 || (hour === 23 && Number(time.split(':')[1]) > 30)) return json({ error: 'reservations are taken between 12:00 and 23:30' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await db.from('restaurant_reservations').insert({
    customer_name: String(b.customer_name || '').slice(0, 80) || null,
    customer_phone: String(b.customer_phone || '').replace(/[^\d+]/g, '').slice(0, 20) || null,
    reservation_date: date, reservation_time: time, party_size: size, notes: String(b.notes || '').slice(0, 300) || null,
  }).select('id').single()
  if (error) return json({ error: 'could not save the reservation' }, 500)
  return json({ reservation_id: data.id, status: 'pending', message: 'Reservation received. Tell the customer the restaurant will confirm it shortly.' })
})
