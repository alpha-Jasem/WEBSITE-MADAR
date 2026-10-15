// Receives an order from a restaurant's WhatsApp agent and stores it (restaurant_orders).
//   POST { customer_name, customer_phone, order_type, address?, notes?, items: [{ name, qty, price }] }
//   Header x-agent-key must equal the RESTAURANT_AGENT_KEY secret.
// The total is recomputed here from the items. A payment link is returned once the restaurant's payment
// account is connected (PAYMENT_LINK_BASE); until then the order is saved as pending_payment.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const key = Deno.env.get('RESTAURANT_AGENT_KEY')
  if (!key || req.headers.get('x-agent-key') !== key) return json({ error: 'unauthorized' }, 401)

  const b = await req.json().catch(() => ({}))
  const items = Array.isArray(b.items) ? b.items : []
  const clean = items
    .map((i: { name?: unknown; qty?: unknown; price?: unknown }) => ({ name: String(i.name || '').slice(0, 120), qty: Math.max(1, Math.min(50, Number(i.qty) || 1)), price: Math.max(0, Number(i.price) || 0) }))
    .filter((i: { name: string }) => i.name)
  if (clean.length === 0) return json({ error: 'no items' }, 400)
  const type = ['pickup', 'delivery', 'dine_in'].includes(b.order_type) ? b.order_type : 'pickup'
  if (type === 'delivery' && !String(b.address || '').trim()) return json({ error: 'address required for delivery' }, 400)
  const total = clean.reduce((s: number, i: { qty: number; price: number }) => s + i.qty * i.price, 0)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await db.from('restaurant_orders').insert({
    customer_name: String(b.customer_name || '').slice(0, 80) || null,
    customer_phone: String(b.customer_phone || '').replace(/[^\d+]/g, '').slice(0, 20) || null,
    order_type: type, address: String(b.address || '').slice(0, 300) || null, notes: String(b.notes || '').slice(0, 500) || null,
    items: clean, total,
  }).select('id').single()
  if (error) return json({ error: 'could not save the order' }, 500)

  const base = Deno.env.get('PAYMENT_LINK_BASE')
  const payment_link = base ? `${base}${data.id}` : null
  if (payment_link) await db.from('restaurant_orders').update({ payment_link }).eq('id', data.id)
  return json({
    order_id: data.id, total, status: 'pending_payment', payment_link,
    message: payment_link ? 'Send the payment link to the customer.' : 'Order saved. Tell the customer the restaurant will confirm it and send the payment link shortly.',
  })
})
