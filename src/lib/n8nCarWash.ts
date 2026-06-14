// Car Wash n8n Webhooks — fire-and-forget, never block the UI
const N8N_BASE = 'https://keepcalm.app.n8n.cloud/webhook'

async function post(path: string, body: Record<string, unknown>) {
  try {
    await fetch(`${N8N_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // silent
  }
}

/** Sent after a POS or Queue delivery payment is recorded */
export function sendCWInvoice(payload: {
  phone: string
  customer_name: string
  company_name: string
  company_id: string
  invoice_no: string
  services: string
  subtotal: string
  vat: string
  total: string
  payment_method: string
  date: string
  plate?: string | null
  review_url?: string | null
}) {
  // URL: set up your n8n workflow and replace 'cw-invoice' with your path
  void post('cw-invoice', payload as unknown as Record<string, unknown>)
}

/** Sent when a new customer registers via queue */
export function sendCWRegistration(payload: {
  phone: string
  customer_name: string
  company_name: string
  company_id: string
  is_new_customer: true
}) {
  void post('cw-registration', payload as unknown as Record<string, unknown>)
}
