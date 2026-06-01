import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { plan, company_id } = await req.json()

    const MOYASAR_SECRET_KEY = Deno.env.get('MOYASAR_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!MOYASAR_SECRET_KEY) {
      console.error('MOYASAR_SECRET_KEY not set')
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server config missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const planPrices: Record<string, number> = {
      growth: 79900,
      enterprise: 199900,
    }

    const amount = planPrices[plan]
    if (!amount) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, status, plan')
      .eq('id', company_id)
      .maybeSingle()

    if (companyError || !company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (company.status === 'active') {
      return new Response(JSON.stringify({ error: 'already_subscribed', message: 'Subscription is already active' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const callbackUrl = `${SUPABASE_URL}/functions/v1/moyasar-callback?plan=${plan}&company_id=${company_id}`

    const moyasarResp = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(MOYASAR_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'SAR',
        description: `Madar OS - ${plan === 'growth' ? 'Pro' : 'Premium'}`,
        callback_url: callbackUrl,
        metadata: { plan, company_id },
      }),
    })

    const invoice = await moyasarResp.json()
    console.log('Moyasar response:', JSON.stringify(invoice))

    if (invoice.url) {
      return new Response(JSON.stringify({ payment_url: invoice.url, invoice_id: invoice.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.error('Moyasar error:', JSON.stringify(invoice))
    return new Response(JSON.stringify({ error: 'Failed to create invoice', details: invoice }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
