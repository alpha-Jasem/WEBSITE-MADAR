import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

export type RequestKind = 'unsure' | 'agents' | 'whatsapp' | 'developers' | 'billing' | 'other'
export type RequestStatus = 'open' | 'answered' | 'closed'

export interface SupportRequest {
  id: string
  kind: RequestKind
  subject: string
  details: string
  status: RequestStatus
  admin_reply: string | null
  replied_at: string | null
  created_at: string
}

export const KIND_LABELS: Record<RequestKind, string> = {
  unsure: 'غير متأكد', agents: 'الوكلاء والمكالمات', whatsapp: 'واتساب والمحادثة', developers: 'المطورون', billing: 'الفوترة والباقة', other: 'أخرى',
}
export const STATUS_LABELS: Record<RequestStatus, string> = { open: 'مفتوح', answered: 'تم الرد', closed: 'مغلق' }

const DEMO: SupportRequest[] = []

/** The customer's own support requests, newest first, and a way to send a new one. */
export function useSupportRequests(companyId: string | null, isDemo: boolean, email: string) {
  const [items, setItems] = useState<SupportRequest[]>(isDemo ? DEMO : [])
  const [loading, setLoading] = useState(!isDemo)

  const load = useCallback(async () => {
    if (isDemo) { setLoading(false); return }
    if (!companyId) return
    const { data } = await supabase.from('support_requests').select('id, kind, subject, details, status, admin_reply, replied_at, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(100)
    setItems((data ?? []) as SupportRequest[])
    setLoading(false)
  }, [companyId, isDemo])
  useEffect(() => { void load() }, [load])

  const send = useCallback(async (r: { kind: RequestKind; subject: string; details: string; reference: string }) => {
    const row = { kind: r.kind, subject: r.subject.trim().slice(0, 200), details: r.details.trim().slice(0, 5000), reference: r.reference.trim().slice(0, 300) || null }
    if (isDemo || !companyId) {
      setItems((l) => [{ id: `demo-${Date.now()}`, kind: row.kind, subject: row.subject, details: row.details, status: 'open', admin_reply: null, replied_at: null, created_at: new Date().toISOString() }, ...l])
      return
    }
    const { error } = await supabase.from('support_requests').insert({ company_id: companyId, email, ...row })
    if (error) throw error
    await load()
  }, [companyId, isDemo, email, load])

  return { items, loading, send }
}
