import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Inbox macros: a saved list of steps run on a conversation with one click. Backed by inbox_macros
// (migration 20261126120000). Demo mode keeps them in memory so the sales tour stays clickable.

export type MacroActionType = 'note' | 'reply' | 'status' | 'transfer'

export interface MacroAction {
  type: MacroActionType
  /** note / reply: the text. status: open | closed | waiting. transfer: an optional reason. */
  value: string
  /** transfer: the team the conversation goes to. */
  team_id?: string
}

export interface Macro { id: string; name: string; description: string | null; actions: MacroAction[]; created_at: string }

export const ACTION_LABELS: Record<MacroActionType, string> = {
  note: 'ملاحظة داخلية',
  reply: 'رد للعميل',
  status: 'تغيير الحالة',
  transfer: 'تحويل لفريق',
}
export const STATUS_CHOICES: [string, string][] = [['open', 'مفتوحة'], ['waiting', 'بانتظار العميل'], ['closed', 'مغلقة']]

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoMacros: Macro[] = [
  { id: 'demo-macro-price', name: 'إرسال الأسعار وانتظار الرد', description: 'رد جاهز ثم بانتظار العميل', created_at: new Date().toISOString(),
    actions: [{ type: 'reply', value: 'أهلًا فيك، هذي أسعارنا ونسعد بخدمتك. قل لنا وش يناسبك ونرتب لك.' }, { type: 'status', value: 'waiting' }] },
  { id: 'demo-macro-done', name: 'تم الحل وإغلاق', description: 'ملاحظة ثم إغلاق المحادثة', created_at: new Date().toISOString(),
    actions: [{ type: 'note', value: 'تم الحل مع العميل.' }, { type: 'status', value: 'closed' }] },
]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useMacros(companyId: string | null, isDemo: boolean) {
  const [macros, setMacros] = useState<Macro[]>(isDemo ? demoMacros : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setMacros([...demoMacros]); setLoading(false); return }
    if (!companyId) return
    const { data, error } = await supabase.from('inbox_macros').select('id, name, description, actions, created_at').eq('company_id', companyId).order('created_at')
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setMacros((data || []) as Macro[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { macros, available, loading }
}

export async function saveMacro(companyId: string | null, isDemo: boolean, m: { id?: string; name: string; description?: string | null; actions: MacroAction[] }) {
  const name = m.name.trim()
  if (!name) throw new Error('اكتب اسم الماكرو')
  if (!m.actions.length) throw new Error('أضف خطوة واحدة على الأقل')
  const actions = m.actions.map((a) => ({ ...a, value: a.value.trim() }))
  if (isDemo) {
    const row: Macro = { id: m.id || demoId(), name, description: m.description?.trim() || null, actions, created_at: new Date().toISOString() }
    demoMacros = m.id ? demoMacros.map((x) => (x.id === m.id ? { ...row, created_at: x.created_at } : x)) : [...demoMacros, row]
    notify()
    return
  }
  if (!companyId) throw new Error('no company')
  const row = { company_id: companyId, name, description: m.description?.trim() || null, actions }
  const { error } = m.id
    ? await supabase.from('inbox_macros').update(row).eq('company_id', companyId).eq('id', m.id)
    : await supabase.from('inbox_macros').insert(row)
  if (error) throw error
  notify()
}

export async function deleteMacro(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoMacros = demoMacros.filter((m) => m.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('inbox_macros').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
  notify()
}
