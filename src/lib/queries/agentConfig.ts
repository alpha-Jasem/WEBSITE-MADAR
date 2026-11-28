import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Voice-agent configuration lists: HTTP tools the agent can call, call-analysis groups, and the
// inbound/outbound call services (a company's numbers). Backed by agent_tools, analysis_groups and
// voice_services (migration 20261127100000). Demo mode keeps them in memory so the sales tour stays clickable.

export interface ToolParam { name: string; description: string; required: boolean }
export interface AgentTool {
  id: string; name: string; description: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE'; url: string
  params: ToolParam[]; enabled: boolean; created_at: string
}

export interface AnalysisField { name: string; type: 'text' | 'number' | 'yes_no'; description: string }
export interface AnalysisGroup { id: string; name: string; description: string | null; fields: AnalysisField[]; created_at: string; nabrah_id?: string | null; agent_ids: string[] }

export type ServiceStatus = 'pending' | 'active' | 'paused'
export interface VoiceService {
  id: string; direction: 'inbound' | 'outbound'; name: string; phone: string; provider: string
  status: ServiceStatus; notes: string | null; created_at: string
}

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const now = () => new Date().toISOString()

/** One company-scoped list: load, save (insert or update by id) and delete, with a shared in-memory copy for demo mode. */
function makeStore<T extends { id: string; created_at: string }>(table: string, columns: string, demoSeed: T[]) {
  let demo = demoSeed
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())

  function useList(companyId: string | null, isDemo: boolean) {
    const [items, setItems] = useState<T[]>(isDemo ? demo : [])
    const [available, setAvailable] = useState(true)
    const [loading, setLoading] = useState(!isDemo)
    const load = useCallback(async () => {
      if (isDemo) { setItems([...demo]); setLoading(false); return }
      if (!companyId) return
      const { data, error } = await supabase.from(table).select(columns).eq('company_id', companyId).order('created_at')
      setLoading(false)
      if (error) { setAvailable(false); return }
      setAvailable(true)
      setItems((data || []) as unknown as T[])
    }, [companyId, isDemo])
    useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
    return { items, available, loading }
  }

  async function save(companyId: string | null, isDemo: boolean, row: Omit<T, 'id' | 'created_at'> & { id?: string }) {
    if (isDemo) {
      const full = { ...row, id: row.id || demoId(), created_at: now() } as unknown as T
      demo = row.id ? demo.map((x) => (x.id === row.id ? { ...full, created_at: x.created_at } : x)) : [...demo, full]
      notify()
      return
    }
    if (!companyId) throw new Error('no company')
    const { id, ...fields } = row
    const { error } = id
      ? await supabase.from(table).update(fields).eq('company_id', companyId).eq('id', id)
      : await supabase.from(table).insert({ ...fields, company_id: companyId })
    if (error) throw error
    notify()
  }

  async function remove(companyId: string | null, isDemo: boolean, id: string) {
    if (isDemo) { demo = demo.filter((x) => x.id !== id); notify(); return }
    if (!companyId) throw new Error('no company')
    const { error } = await supabase.from(table).delete().eq('company_id', companyId).eq('id', id)
    if (error) throw error
    notify()
  }

  return { useList, save, remove, refresh: notify }
}

const tools = makeStore<AgentTool>('agent_tools', 'id, name, description, method, url, params, enabled, created_at', [
  { id: 'demo-tool-price', name: 'check_price', description: 'يجلب سعر الخدمة التي سأل عنها العميل', method: 'GET', url: 'https://example.com/api/prices',
    params: [{ name: 'service', description: 'اسم الخدمة', required: true }], enabled: true, created_at: now() },
])
export const useAgentTools = tools.useList
export const saveAgentTool = tools.save
export const deleteAgentTool = tools.remove

const groups = makeStore<AnalysisGroup>('analysis_groups', 'id, name, description, fields, created_at, nabrah_id, agent_ids', [
  { id: 'demo-group-sales', name: 'تأهيل العميل', description: 'ما يُستخرج من كل مكالمة بيع', created_at: now(), agent_ids: [],
    fields: [{ name: 'مهتم؟', type: 'yes_no', description: 'هل أبدى العميل اهتمامًا بالشراء' }, { name: 'الميزانية', type: 'number', description: 'الميزانية التي ذكرها بالريال' }] },
])
export const useAnalysisGroups = groups.useList
export const saveAnalysisGroup = groups.save
export const deleteAnalysisGroup = groups.remove

/** Calls the analysis-sync function: with no argument it pushes every group to the voice platform and attaches
 *  each to its chosen agents; with deleteId it removes that group everywhere (platform, agents and the row). */
export async function syncAnalysisGroups(deleteId?: string): Promise<void> {
  const { data: s } = await supabase.auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analysis-sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify(deleteId ? { delete_id: deleteId } : {}),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok || out.error || out.synced === false) throw new Error(String(out.error || 'تعذّرت المزامنة مع المنصة الصوتية').slice(0, 200))
  groups.refresh()
}

const services = makeStore<VoiceService>('voice_services', 'id, direction, name, phone, provider, status, notes, created_at', [
  { id: 'demo-svc-in', direction: 'inbound', name: 'الرقم الموحد', phone: '920000000', provider: 'مزوّد الاتصال', status: 'active', notes: 'تحويل المكالمات إلى وكيل الصوت', created_at: now() },
  { id: 'demo-svc-out', direction: 'outbound', name: 'حملة المتابعة', phone: '0500000000', provider: 'مزوّد الاتصال', status: 'pending', notes: null, created_at: now() },
])
export const useVoiceServices = services.useList
export const saveVoiceService = services.save
export const deleteVoiceService = services.remove

export const STATUS_LABELS: Record<ServiceStatus, string> = { pending: 'قيد الربط', active: 'يعمل', paused: 'موقوف' }

export type CampaignStatus = 'draft' | 'launching' | 'launched' | 'failed'
export interface VoiceCampaign {
  id: string; name: string; agent_id: string; call_from: string; numbers: string[]; status: CampaignStatus
  tag: string | null; call_ids: string[]; error: string | null; launched_at: string | null; created_at: string
}
const campaigns = makeStore<VoiceCampaign>('voice_campaigns', 'id, name, agent_id, call_from, numbers, status, tag, call_ids, error, launched_at, created_at', [
  { id: 'demo-cmp-1', name: 'متابعة عملاء الشهر', agent_id: 'demo-agent', call_from: '0500000000', numbers: ['+966500000001', '+966500000002', '+966500000003'],
    status: 'draft', tag: null, call_ids: [], error: null, launched_at: null, created_at: now() },
])
export const useVoiceCampaigns = campaigns.useList
export const saveVoiceCampaign = campaigns.save
export const deleteVoiceCampaign = campaigns.remove
export const refreshVoiceCampaigns = campaigns.refresh
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = { draft: 'مسودة', launching: 'جاري الإطلاق', launched: 'أُطلقت', failed: 'فشل الإطلاق' }
