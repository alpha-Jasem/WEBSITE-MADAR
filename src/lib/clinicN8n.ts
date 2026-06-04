// ─── Clinic OS → n8n Webhooks ────────────────────────────────────────────────
// All calls are fire-and-forget (silent fail) — UI never blocks on these.

const N8N_BASE = 'https://keepcalm.app.n8n.cloud/webhook'

async function post(path: string, body: Record<string, unknown>) {
  try {
    await fetch(`${N8N_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // silent — n8n is optional infra, never break the UI
  }
}

interface ApptPayload {
  patient_phone: string
  patient_name: string
  doctor_name: string
  service_name: string
  appointment_date: string
  start_time: string
  clinic_name: string
  company_id: string
}

// Sent when staff confirms a pending appointment
export function notifyApptConfirmed(p: ApptPayload) {
  return post('clinic-appt-confirmed', p)
}

// Sent when appointment is cancelled
export function notifyApptCancelled(p: ApptPayload) {
  return post('clinic-appt-cancelled', p)
}

// Sent right after a new appointment is created
export function notifyApptCreated(p: ApptPayload) {
  return post('clinic-appt-created', p)
}

// Sent when an AI-review call is confirmed or rejected manually
export function notifyAICallReviewed(phone: string, status: 'confirmed' | 'rejected', clinic_name: string, company_id: string) {
  return post('clinic-ai-call-reviewed', { phone, status, clinic_name, company_id })
}

// Retry a failed WhatsApp message
export function retryWhatsAppMessage(message_id: string, company_id: string) {
  return post('clinic-msg-retry', { message_id, company_id })
}
