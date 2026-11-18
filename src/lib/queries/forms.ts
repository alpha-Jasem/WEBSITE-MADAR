import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Lead forms on the company's own website (migration 20261118130000, public edge function lead-form,
// script public/forms/embed.js). Demo mode keeps forms and submissions in memory.

export type FormKind = 'popup' | 'inline' | 'button'
export type FieldType = 'text' | 'phone' | 'email' | 'textarea'
export interface FormField { key: string; label: string; type: FieldType; required: boolean }
export interface LeadForm {
  id: string
  name: string
  kind: FormKind
  title: string
  subtitle: string | null
  fields: FormField[]
  button_text: string
  success_text: string
  settings: { delay_seconds?: number; color?: string; position?: 'right' | 'left'; button_label?: string }
  active: boolean
  submit_count: number
  created_at: string
}
export interface FormSubmission { id: string; form_id: string; name: string | null; phone: string | null; email: string | null; data: Record<string, string>; page_url: string | null; created_at: string }

export const KIND_LABELS: Record<FormKind, string> = { popup: 'نافذة منبثقة', inline: 'داخل الصفحة', button: 'زر عائم' }

/** Fields people can switch on; name and phone are what the agent needs to reach out. */
export const FIELD_PRESETS: FormField[] = [
  { key: 'name', label: 'الاسم', type: 'text', required: true },
  { key: 'phone', label: 'رقم الجوال', type: 'phone', required: true },
  { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: false },
  { key: 'city', label: 'المدينة', type: 'text', required: false },
  { key: 'message', label: 'وش تحتاج؟', type: 'textarea', required: false },
]

export const BLANK_FORM: Omit<LeadForm, 'id' | 'submit_count' | 'created_at'> = {
  name: 'نموذج الموقع', kind: 'popup', title: 'تبي نتواصل معك؟', subtitle: 'اترك رقمك ويوصلك ردنا على واتساب خلال دقائق',
  fields: FIELD_PRESETS.slice(0, 2), button_text: 'أرسل', success_text: 'وصلنا طلبك، بنتواصل معك خلال دقائق',
  settings: { delay_seconds: 8, color: '#111827', position: 'right', button_label: 'تواصل معنا' }, active: true,
}

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const ago = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
let demoForms: LeadForm[] = [
  { ...BLANK_FORM, id: 'demo-form-1', fields: [...FIELD_PRESETS.slice(0, 2), FIELD_PRESETS[4]], submit_count: 3, created_at: ago(60 * 24 * 6) },
]
let demoSubs: FormSubmission[] = [
  { id: 'demo-sub-1', form_id: 'demo-form-1', name: 'نورة القحطاني', phone: '0551234567', email: null, data: { name: 'نورة القحطاني', phone: '0551234567', message: 'أبي أعرف الأسعار' }, page_url: 'https://example.com/prices', created_at: ago(14) },
  { id: 'demo-sub-2', form_id: 'demo-form-1', name: 'فهد العتيبي', phone: '0509876543', email: null, data: { name: 'فهد العتيبي', phone: '0509876543' }, page_url: 'https://example.com/', created_at: ago(190) },
  { id: 'demo-sub-3', form_id: 'demo-form-1', name: 'سارة الشهري', phone: '0533344455', email: null, data: { name: 'سارة الشهري', phone: '0533344455', message: 'متى أقرب موعد؟' }, page_url: 'https://example.com/book', created_at: ago(60 * 26) },
]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useLeadForms(companyId: string | null, isDemo: boolean) {
  const [forms, setForms] = useState<LeadForm[]>(isDemo ? demoForms : [])
  const [subs, setSubs] = useState<FormSubmission[]>(isDemo ? demoSubs : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setForms([...demoForms]); setSubs([...demoSubs]); setLoading(false); return }
    if (!companyId) return
    const [f, s] = await Promise.all([
      supabase.from('lead_forms').select('id, name, kind, title, subtitle, fields, button_text, success_text, settings, active, submit_count, created_at').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase.from('lead_form_submissions').select('id, form_id, name, phone, email, data, page_url, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(300),
    ])
    setLoading(false)
    if (f.error) { setAvailable(false); return }
    setAvailable(true)
    setForms((f.data || []) as LeadForm[])
    setSubs((s.data || []) as FormSubmission[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  useEffect(() => {
    if (isDemo || !companyId) return
    const ch = supabase.channel(`lead_forms_${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_form_submissions', filter: `company_id=eq.${companyId}` }, () => { void load() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [companyId, isDemo, load])
  return { forms, subs, available, loading }
}

export type FormInput = Omit<LeadForm, 'id' | 'submit_count' | 'created_at'> & { id?: string }

export async function saveLeadForm(companyId: string | null, isDemo: boolean, f: FormInput) {
  const row = {
    name: f.name.trim() || 'نموذج الموقع', kind: f.kind, title: f.title.trim(), subtitle: f.subtitle?.trim() || null, fields: f.fields,
    button_text: f.button_text.trim() || 'أرسل', success_text: f.success_text.trim() || 'وصلنا طلبك', settings: f.settings, active: f.active,
  }
  if (isDemo) {
    demoForms = f.id ? demoForms.map((x) => (x.id === f.id ? { ...x, ...row } : x)) : [{ id: demoId(), submit_count: 0, created_at: new Date().toISOString(), ...row }, ...demoForms]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const { error } = f.id
    ? await supabase.from('lead_forms').update({ ...row, updated_at: new Date().toISOString() }).eq('id', f.id).eq('company_id', companyId)
    : await supabase.from('lead_forms').insert({ company_id: companyId, ...row })
  if (error) throw error
  notify()
}

export async function deleteLeadForm(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoForms = demoForms.filter((x) => x.id !== id); demoSubs = demoSubs.filter((x) => x.form_id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('lead_forms').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

export function embedCode(id: string) {
  return `<script src="${window.location.origin}/forms/embed.js" data-form="${id}" async></script>`
}
