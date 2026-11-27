import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// The company's WhatsApp number and whether the inbox can reply freely (function whatsapp-status).
// Demo mode shows a connected number so the tour has something to look at.

export interface WaStatus {
  agent_linked: boolean
  connected: boolean
  can_reply: boolean
  phone_number?: string | null
  name?: string | null
  token_expired?: boolean
  messaging?: boolean
  /** The agent answering on the number, when it is the company's own inbox. */
  agent_id?: string | null
  agent_name?: string | null
}

const DEMO: WaStatus = { agent_linked: true, connected: true, can_reply: true, phone_number: '+966 5X XXX XXXX', name: 'اسم نشاطك', token_expired: false, messaging: true, agent_id: 'demo-a1', agent_name: 'وكيل الاستقبال' }

export function useWaStatus(isDemo: boolean) {
  const [status, setStatus] = useState<WaStatus | null>(isDemo ? DEMO : null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setStatus(DEMO); setLoading(false); return }
    setLoading(true)
    try {
      const { data: s } = await supabase.auth.getSession()
      const token = s.session?.access_token
      if (!token) throw new Error('سجّل دخولك من جديد')
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
        body: '{}',
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || 'تعذّر قراءة الحالة')
      setStatus(out as WaStatus)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر قراءة الحالة')
    } finally { setLoading(false) }
  }, [isDemo])
  useEffect(() => { void load() }, [load])
  return { status, error, loading, reload: load }
}
