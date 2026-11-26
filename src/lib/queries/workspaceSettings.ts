import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Workspace settings: lead stages, custom fields, branding and notification preferences.
// Backed by lead_stages / custom_fields / company_prefs (migration 20261126120000); only the account owner writes.
// Demo mode keeps them in memory.

export interface LeadStage { id: string; label: string; color: string; position: number; is_won: boolean; is_lost: boolean }
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'yes_no'
export interface CustomField { id: string; label: string; field_type: FieldType; options: string[]; position: number }
export interface NotifyPrefs { new_conversation: boolean; needs_review: boolean; assigned_to_me: boolean; sla_breach: boolean; daily_summary: boolean }
export interface CompanyPrefs { display_name: string; logo_url: string; brand_color: string; notify: NotifyPrefs }

export const FIELD_TYPE_LABELS: Record<FieldType, string> = { text: 'نص', number: 'رقم', date: 'تاريخ', select: 'قائمة اختيار', yes_no: 'نعم / لا' }
export const NOTIFY_LABELS: [keyof NotifyPrefs, string, string][] = [
  ['new_conversation', 'محادثة جديدة', 'يوصلك تنبيه لما يكتب عميل جديد'],
  ['needs_review', 'محادثة تحتاج مراجعة', 'لما يحتاج الوكيل تدخلك'],
  ['assigned_to_me', 'محادثة أُسندت لي', 'لما تُسند لك محادثة'],
  ['sla_breach', 'تأخر الرد عن المهلة', 'لما تتجاوز محادثة مهلة أول رد'],
  ['daily_summary', 'ملخص يومي', 'ملخص نهاية اليوم'],
]
export const DEFAULT_PREFS: CompanyPrefs = {
  display_name: '', logo_url: '', brand_color: '#7aa2ff',
  notify: { new_conversation: true, needs_review: true, assigned_to_me: true, sla_breach: true, daily_summary: false },
}

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoStages: LeadStage[] = [
  { id: 'ds1', label: 'جديد', color: '#7aa2ff', position: 0, is_won: false, is_lost: false },
  { id: 'ds2', label: 'مهتم', color: '#f5b84a', position: 1, is_won: false, is_lost: false },
  { id: 'ds3', label: 'تم الحجز', color: '#4ade80', position: 2, is_won: true, is_lost: false },
  { id: 'ds4', label: 'خسرناه', color: '#f87171', position: 3, is_won: false, is_lost: true },
]
let demoFields: CustomField[] = [
  { id: 'df1', label: 'المدينة', field_type: 'text', options: [], position: 0 },
  { id: 'df2', label: 'مصدر العميل', field_type: 'select', options: ['إعلان', 'صديق', 'بحث قوقل'], position: 1 },
]
let demoPrefs: CompanyPrefs = { ...DEFAULT_PREFS, display_name: 'شركة نموذجية' }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function useRows<T>(table: 'lead_stages' | 'custom_fields', cols: string, demo: () => T[], companyId: string | null, isDemo: boolean) {
  const [rows, setRows] = useState<T[]>(isDemo ? demo() : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setRows(demo()); setLoading(false); return }
    if (!companyId) return
    const { data, error } = await supabase.from(table).select(cols).eq('company_id', companyId).order('position')
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setRows((data || []) as unknown as T[])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, isDemo, table, cols])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { rows, available, loading }
}

export function useLeadStages(companyId: string | null, isDemo: boolean) {
  const { rows, available, loading } = useRows<LeadStage>('lead_stages', 'id, label, color, position, is_won, is_lost', () => [...demoStages], companyId, isDemo)
  return { stages: rows, available, loading }
}

export async function saveLeadStage(companyId: string | null, isDemo: boolean, s: { id?: string; label: string; color: string; position: number; is_won: boolean; is_lost: boolean }) {
  const label = s.label.trim()
  if (!label) throw new Error('اكتب اسم المرحلة')
  if (isDemo) {
    demoStages = s.id ? demoStages.map((x) => (x.id === s.id ? { ...x, ...s, label } : x)) : [...demoStages, { ...s, id: demoId(), label }]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const row = { company_id: companyId, label, color: s.color, position: s.position, is_won: s.is_won, is_lost: s.is_lost }
  const { error } = s.id ? await supabase.from('lead_stages').update(row).eq('company_id', companyId).eq('id', s.id) : await supabase.from('lead_stages').insert(row)
  if (error) throw error
  notify()
}

export async function deleteLeadStage(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoStages = demoStages.filter((s) => s.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('lead_stages').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
  notify()
}

export function useCustomFields(companyId: string | null, isDemo: boolean) {
  const { rows, available, loading } = useRows<CustomField>('custom_fields', 'id, label, field_type, options, position', () => [...demoFields], companyId, isDemo)
  return { fields: rows, available, loading }
}

export async function saveCustomField(companyId: string | null, isDemo: boolean, f: { id?: string; label: string; field_type: FieldType; options: string[]; position: number }) {
  const label = f.label.trim()
  if (!label) throw new Error('اكتب اسم الحقل')
  const options = f.field_type === 'select' ? f.options.map((o) => o.trim()).filter(Boolean) : []
  if (f.field_type === 'select' && !options.length) throw new Error('أضف خيارًا واحدًا على الأقل')
  if (isDemo) {
    demoFields = f.id ? demoFields.map((x) => (x.id === f.id ? { ...x, ...f, label, options } : x)) : [...demoFields, { ...f, id: demoId(), label, options }]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const row = { company_id: companyId, label, field_type: f.field_type, options, position: f.position }
  const { error } = f.id ? await supabase.from('custom_fields').update(row).eq('company_id', companyId).eq('id', f.id) : await supabase.from('custom_fields').insert(row)
  if (error) throw error
  notify()
}

export async function deleteCustomField(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoFields = demoFields.filter((f) => f.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('custom_fields').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
  notify()
}

export function useCompanyPrefs(companyId: string | null, isDemo: boolean) {
  const [prefs, setPrefs] = useState<CompanyPrefs>(isDemo ? demoPrefs : DEFAULT_PREFS)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setPrefs(demoPrefs); setLoading(false); return }
    if (!companyId) return
    const { data, error } = await supabase.from('company_prefs').select('display_name, logo_url, brand_color, notify').eq('company_id', companyId).maybeSingle()
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    if (data) setPrefs({ display_name: data.display_name || '', logo_url: data.logo_url || '', brand_color: data.brand_color || DEFAULT_PREFS.brand_color, notify: { ...DEFAULT_PREFS.notify, ...(data.notify as Partial<NotifyPrefs> | null) } })
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { prefs, available, loading }
}

export async function saveCompanyPrefs(companyId: string | null, isDemo: boolean, p: CompanyPrefs) {
  if (isDemo) { demoPrefs = p; notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('company_prefs').upsert({
    company_id: companyId, display_name: p.display_name.trim() || null, logo_url: p.logo_url.trim() || null,
    brand_color: /^#[0-9a-fA-F]{6}$/.test(p.brand_color) ? p.brand_color : null, notify: p.notify, updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id' })
  if (error) throw error
  notify()
}
