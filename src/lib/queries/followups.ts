import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { agentWrite } from './voicePlatform'

// WhatsApp follow-ups after a voice call (agent_followups). Saving one also points the agent's
// post-analysis callback at the nabrah-followup function. Demo mode keeps them in memory.

export interface Followup {
  id: string; agent_id: string; name: string; template_id: string
  params: string[]; recipient: string; conditions: string[]; enabled: boolean; created_at?: string
}
export interface FollowupSend { followup_id: string; status: 'sent' | 'failed' | 'skipped'; error: string | null; created_at: string }
export interface AgentFields { variables: string[]; analysis: { name: string; type: string; group: string }[] }

let demo: Followup[] = [
  { id: 'demo-f1', agent_id: 'demo-a1', name: 'تأكيد الحجز بعد المكالمة', template_id: 'demo-t1', params: ['{{analysis.customer_name}}', '{{analysis.booking_time}}'], recipient: 'customer', conditions: ['booked'], enabled: true, created_at: '2026-11-20T10:00:00Z' },
]
export const DEMO_FIELDS: AgentFields = {
  variables: ['customer_name'],
  analysis: [
    { name: 'booked', type: 'boolean', group: 'booking' },
    { name: 'interested', type: 'boolean', group: 'booking' },
    { name: 'customer_name', type: 'string', group: 'booking' },
    { name: 'booking_time', type: 'string', group: 'booking' },
  ],
}
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useFollowups(companyId: string | null, isDemo: boolean) {
  const [list, setList] = useState<Followup[]>(isDemo ? demo : [])
  const [sends, setSends] = useState<FollowupSend[]>([])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    if (isDemo) { setList([...demo]); setLoading(false); return }
    if (!companyId) return
    const [f, s] = await Promise.all([
      supabase.from('agent_followups').select('id, agent_id, name, template_id, params, recipient, conditions, enabled, created_at').eq('company_id', companyId).order('created_at'),
      supabase.from('agent_followup_sends').select('followup_id, status, error, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(500),
    ])
    setError(!!f.error)
    setList((f.data || []) as Followup[])
    setSends((s.data || []) as FollowupSend[])
    setLoading(false)
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { list, sends, loading, error }
}

/** Saves the follow-up, then links the agent. Returns false when the row saved but linking the agent failed. */
export async function saveFollowup(companyId: string | null, isDemo: boolean, f: Omit<Followup, 'id' | 'created_at'> & { id?: string }): Promise<boolean> {
  const row = { agent_id: f.agent_id, name: f.name.trim(), template_id: f.template_id, params: f.params, recipient: f.recipient, conditions: f.conditions, enabled: f.enabled }
  if (isDemo) {
    demo = f.id ? demo.map((x) => (x.id === f.id ? { ...x, ...row } : x)) : [...demo, { id: `demo-${Date.now()}`, created_at: new Date().toISOString(), ...row }]
    notify(); return true
  }
  if (!companyId) throw new Error('no company')
  const { error } = f.id
    ? await supabase.from('agent_followups').update({ ...row, updated_at: new Date().toISOString() }).eq('id', f.id).eq('company_id', companyId)
    : await supabase.from('agent_followups').insert({ company_id: companyId, ...row })
  if (error) throw error
  notify()
  // The agent starts calling back after its analysis; a failure here is reported but the follow-up stays saved.
  try { await agentWrite('followup_hook', { agent_id: f.agent_id }); return true } catch { return false }
}

export async function setFollowupEnabled(companyId: string | null, isDemo: boolean, id: string, enabled: boolean) {
  if (isDemo) { demo = demo.map((x) => (x.id === id ? { ...x, enabled } : x)); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('agent_followups').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

export async function deleteFollowup(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demo = demo.filter((x) => x.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('agent_followups').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}
