import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { Contact } from '../contacts'
import type { Campaign, CampaignMessage, CampaignStatus } from '../campaigns'

// Campaigns (migration 20261117150000) and the sends logged for them in outreach_messages.
// Demo mode keeps both in memory and "sends" right away so the tour can show results.

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoCampaigns: Campaign[] = []
let demoMessages: CampaignMessage[] = []
let demoSeeded = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

/** A finished campaign, a running journey and one scheduled next week, built from the tour's own contacts. */
export function seedDemoCampaigns(contacts: Contact[]) {
  if (demoSeeded || contacts.length < 3) return
  demoSeeded = true
  const people = contacts.filter((c) => c.phone).slice(0, 8).map((c) => ({ key: c.key, phone: c.phone, name: c.name }))
  if (people.length === 0) return
  const done: Campaign = {
    id: 'demo-camp-1', name: 'عرض نهاية الشهر', kind: 'once', status: 'done', segment_ids: ['demo-seg-returning'], recipients: people,
    steps: [{ template_id: 'demo-t1', params: ['{name}', 'الخميس 8 مساءً'], delay_days: 0 }], stop_on_reply: false,
    scheduled_at: ago(9), finished_at: ago(9), created_by_name: 'أحمد الزهراني', created_at: ago(10),
  }
  const journey: Campaign = {
    id: 'demo-camp-2', name: 'رحلة العملاء الجدد', kind: 'journey', status: 'running', segment_ids: [], recipients: people.slice(0, 5),
    steps: [{ template_id: 'demo-t1', params: ['{name}', 'اليوم'], delay_days: 0 }, { template_id: 'demo-t1', params: ['{name}', 'بكرة'], delay_days: 3 }, { template_id: 'demo-t1', params: ['{name}', 'الأسبوع الجاي'], delay_days: 7 }],
    stop_on_reply: true, scheduled_at: ago(4), finished_at: null, created_by_name: 'ريم', created_at: ago(4),
  }
  const next: Campaign = {
    id: 'demo-camp-3', name: 'تذكير العملاء المنقطعين', kind: 'once', status: 'scheduled', segment_ids: ['demo-seg-quiet'], recipients: people.slice(2),
    steps: [{ template_id: 'demo-t1', params: ['{name}', 'هالأسبوع'], delay_days: 0 }], stop_on_reply: false,
    scheduled_at: new Date(Date.now() + 5 * 86_400_000).toISOString(), finished_at: null, created_by_name: 'أحمد الزهراني', created_at: ago(1),
  }
  demoCampaigns = [next, journey, done]
  demoMessages = [
    ...people.map((p, i) => ({ campaign_id: done.id, step: 0, to_phone: p.phone, status: (i === 3 ? 'failed' : 'sent') as 'sent' | 'failed', created_at: ago(9) })),
    ...journey.recipients.map((p) => ({ campaign_id: journey.id, step: 0, to_phone: p.phone, status: 'sent' as const, created_at: ago(4) })),
    ...journey.recipients.slice(0, 3).map((p) => ({ campaign_id: journey.id, step: 1, to_phone: p.phone, status: 'sent' as const, created_at: ago(1) })),
  ]
  notify()
}

export function useCampaigns(companyId: string | null, isDemo: boolean) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(isDemo ? demoCampaigns : [])
  const [messages, setMessages] = useState<CampaignMessage[]>(isDemo ? demoMessages : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setCampaigns([...demoCampaigns]); setMessages([...demoMessages]); setLoading(false); return }
    if (!companyId) return
    const [c, m] = await Promise.all([
      supabase.from('client_campaigns').select('id, name, kind, status, segment_ids, recipients, steps, stop_on_reply, scheduled_at, finished_at, created_by_name, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('outreach_messages').select('campaign_id, step, to_phone, status, created_at')
        .eq('company_id', companyId).not('campaign_id', 'is', null).order('created_at', { ascending: false }).limit(5000),
    ])
    setLoading(false)
    if (c.error || m.error) { setAvailable(false); return }
    setAvailable(true)
    setCampaigns((c.data || []) as Campaign[])
    setMessages((m.data || []) as CampaignMessage[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { campaigns, messages, available, loading, reload: load }
}

export type CampaignInput = Omit<Campaign, 'id' | 'created_at' | 'finished_at'> & { id?: string }

export async function saveCampaign(companyId: string | null, isDemo: boolean, c: CampaignInput): Promise<string> {
  const row = {
    name: c.name.trim(), kind: c.kind, status: c.status, segment_ids: c.segment_ids, recipients: c.recipients, steps: c.steps,
    stop_on_reply: c.stop_on_reply, scheduled_at: c.scheduled_at, created_by_name: c.created_by_name,
  }
  if (!row.name) throw new Error('empty')
  if (isDemo) {
    const id = c.id || demoId()
    demoCampaigns = c.id
      ? demoCampaigns.map((x) => (x.id === c.id ? { ...x, ...row } : x))
      : [{ id, created_at: new Date().toISOString(), finished_at: null, ...row }, ...demoCampaigns]
    notify(); return id
  }
  if (!companyId) throw new Error('no company')
  if (c.id) {
    const { error } = await supabase.from('client_campaigns').update({ ...row, updated_at: new Date().toISOString() }).eq('id', c.id).eq('company_id', companyId)
    if (error) throw error
    notify(); return c.id
  }
  const { data, error } = await supabase.from('client_campaigns').insert({ company_id: companyId, ...row }).select('id').single()
  if (error) throw error
  notify()
  return (data as { id: string }).id
}

export async function setCampaignStatus(companyId: string | null, isDemo: boolean, id: string, status: CampaignStatus) {
  if (isDemo) { demoCampaigns = demoCampaigns.map((x) => (x.id === id ? { ...x, status } : x)); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('client_campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

export async function deleteCampaign(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoCampaigns = demoCampaigns.filter((x) => x.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('client_campaigns').delete().eq('id', id).eq('company_id', companyId).eq('status', 'draft')
  if (error) throw error
  notify()
}

/**
 * Starts sending a campaign that is due now instead of waiting for the next scheduled run.
 * Returns how many messages went out in this run. In the tour every first step "sends" at once.
 */
export async function runCampaignNow(isDemo: boolean, id: string): Promise<{ sent: number; failed: number }> {
  if (isDemo) {
    const c = demoCampaigns.find((x) => x.id === id)
    if (!c) return { sent: 0, failed: 0 }
    const at = new Date().toISOString()
    const fresh = c.recipients.map((r) => ({ campaign_id: id, step: 0, to_phone: r.phone, status: 'sent' as const, created_at: at }))
    demoMessages = [...fresh, ...demoMessages]
    demoCampaigns = demoCampaigns.map((x) => (x.id === id ? { ...x, status: x.steps.length > 1 ? 'running' : 'done', finished_at: x.steps.length > 1 ? null : at } : x))
    notify()
    return { sent: fresh.length, failed: 0 }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaigns-runner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_id: id }),
  })
  const out = await res.json().catch(() => ({}))
  notify()
  if (!res.ok) throw new Error(out.error === 'not found' ? 'الحملة غير موجودة' : out.error || 'تعذّر بدء الإرسال، بيكمل الإرسال تلقائيًا خلال دقائق')
  return { sent: out.sent || 0, failed: out.failed || 0 }
}
