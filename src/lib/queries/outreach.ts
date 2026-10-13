import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// WhatsApp outreach: the Meta-approved templates a company registered, and the log of what was sent.
// Sending goes through the whatsapp-outreach edge function (the voice platform owns the number).

export interface WaTemplate {
  id: string
  name: string
  language: string
  label: string
  body: string
  param_labels: string[]
  enabled: boolean
}

export interface OutreachRow {
  id: string
  template_name: string
  template_label: string | null
  to_phone: string
  recipient_name: string | null
  status: 'sent' | 'failed'
  error: string | null
  sent_by_name: string | null
  created_at: string
}

export interface SendResult { phone: string; status: 'sent' | 'failed' | 'ready' | 'invalid'; error?: string | null }

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoTemplates: WaTemplate[] = [
  { id: 'demo-t1', name: 'visit_reminder', language: 'ar', label: 'تذكير بزيارة', body: 'مرحبًا {{1}}، نذكرك بزيارتك يوم {{2}}. للتغيير رد على هذي الرسالة.', param_labels: ['اسم العميل', 'اليوم والوقت'], enabled: true },
]
let demoLog: OutreachRow[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** How many {{n}} placeholders a template body uses (the highest number). */
export function placeholderCount(body: string): number {
  let max = 0
  for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1]))
  return max
}

/** The body with the given values filled in, for the preview. */
export function fillTemplate(body: string, values: string[]): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => values[Number(n) - 1] || `{{${n}}}`)
}

export function useWaTemplates(companyId: string | null, isDemo: boolean) {
  const [templates, setTemplates] = useState<WaTemplate[]>(isDemo ? demoTemplates : [])
  const [available, setAvailable] = useState(true)
  const load = useCallback(async () => {
    if (isDemo) { setTemplates([...demoTemplates]); return }
    if (!companyId) return
    const { data, error } = await supabase.from('whatsapp_templates').select('id, name, language, label, body, param_labels, enabled').eq('company_id', companyId).order('created_at')
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setTemplates((data || []) as WaTemplate[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { templates, available }
}

export async function saveWaTemplate(companyId: string | null, isDemo: boolean, t: Omit<WaTemplate, 'id' | 'enabled'> & { id?: string }) {
  const row = { name: t.name.trim(), language: t.language, label: t.label.trim(), body: t.body.trim(), param_labels: t.param_labels }
  if (isDemo) {
    demoTemplates = t.id
      ? demoTemplates.map((x) => (x.id === t.id ? { ...x, ...row } : x))
      : [...demoTemplates, { id: demoId(), enabled: true, ...row }]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const { error } = t.id
    ? await supabase.from('whatsapp_templates').update(row).eq('id', t.id).eq('company_id', companyId)
    : await supabase.from('whatsapp_templates').insert({ company_id: companyId, ...row })
  if (error) throw error
  notify()
}

export async function deleteWaTemplate(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoTemplates = demoTemplates.filter((x) => x.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

export function useOutreachLog(companyId: string | null, isDemo: boolean) {
  const [rows, setRows] = useState<OutreachRow[]>(isDemo ? demoLog : [])
  const load = useCallback(async () => {
    if (isDemo) { setRows([...demoLog]); return }
    if (!companyId) return
    const { data } = await supabase.from('outreach_messages')
      .select('id, template_name, template_label, to_phone, recipient_name, status, error, sent_by_name, created_at')
      .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50)
    setRows((data || []) as OutreachRow[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return rows
}

/** Sends (or just checks, with dryRun) a template to the recipients. Throws with a readable reason. */
export async function sendOutreach(
  isDemo: boolean, template: WaTemplate,
  recipients: { phone: string; name?: string; params: string[] }[],
  opts: { dryRun?: boolean; sentBy?: string } = {},
): Promise<{ results: SendResult[]; from?: string }> {
  if (isDemo) {
    const results: SendResult[] = recipients.map((r) => ({ phone: r.phone, status: opts.dryRun ? 'ready' : 'sent' }))
    if (!opts.dryRun) {
      demoLog = [...recipients.map((r) => ({
        id: demoId(), template_name: template.name, template_label: template.label, to_phone: r.phone, recipient_name: r.name || null,
        status: 'sent' as const, error: null, sent_by_name: opts.sentBy || 'أنت', created_at: new Date().toISOString(),
      })), ...demoLog]
      notify()
    }
    return { results, from: '+966 5x xxx xxxx' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-outreach`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: template.id, recipients, dry_run: !!opts.dryRun, sent_by: opts.sentBy }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    const reason: Record<string, string> = {
      'no linked agent': 'ما فيه وكيل مربوط بحسابك.',
      'no whatsapp number assigned to the agent': 'ما فيه رقم واتساب مربوط بالوكيل في المنصة.',
      'template not found': 'القالب غير موجود أو معطّل.',
    }
    throw new Error(reason[out.error] || out.error || 'تعذّر الإرسال')
  }
  if (!opts.dryRun) notify()
  return { results: out.results || [], from: out.from }
}
