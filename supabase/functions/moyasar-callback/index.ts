import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PLAN_LIMITS: Record<string, number> = {
  starter: 2000,
  growth: 10000,
  enterprise: 100000,
}

serve(async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const plan = url.searchParams.get('plan') || ''
  const companyId = url.searchParams.get('company_id') || ''
  const statusParam = url.searchParams.get('status')

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const MOYASAR_SECRET_KEY = Deno.env.get('MOYASAR_SECRET_KEY')!

  const frontendUrl = 'https://madar.software/client/upgrade'

  try {
    if (!companyId || !PLAN_LIMITS[plan]) {
      return Response.redirect(`${frontendUrl}?payment_failed=1`, 302)
    }

    let paymentStatus = statusParam

    if (id && MOYASAR_SECRET_KEY) {
      const verifyResp = await fetch(`https://api.moyasar.com/v1/invoices/${id}`, {
        headers: {
          'Authorization': `Basic ${btoa(MOYASAR_SECRET_KEY + ':')}`,
        },
      })
      const invoice = await verifyResp.json()
      console.log('Moyasar invoice verification:', JSON.stringify(invoice))
      paymentStatus = invoice.status
    }

    if (paymentStatus === 'paid') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('companies').update({
        plan,
        status: 'active',
        message_limit: PLAN_LIMITS[plan],
        messages_used: 0,
        plan_reset_at: nextReset,
      }).eq('id', companyId)

      if (error) throw error

      await supabase.from('logs').insert({
        company_id: companyId,
        level: 'success',
        event: 'moyasar_payment_paid',
        message: 'Company subscription activated after Moyasar payment',
        meta: { invoice_id: id, plan, next_reset: nextReset },
      })

      return Response.redirect(`${frontendUrl}?payment_success=1&plan=${plan}`, 302)
    }

    return Response.redirect(`${frontendUrl}?payment_failed=1`, 302)
  } catch (err) {
    console.error('Callback error:', err)
    return Response.redirect(`${frontendUrl}?payment_failed=1`, 302)
  }
})
