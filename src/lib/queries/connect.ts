import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// "When X happens, do Y" rules between Madar and other systems (table connect_rules, run by the
// connect-runner edge function), plus the company's API keys for the REST API, CLI and MCP.
// Demo mode keeps everything in memory so the sales tour stays clickable.

export type TriggerEvent =
  | 'conversation.new' | 'conversation.needs_review' | 'conversation.transferred'
  | 'ticket.created' | 'booking.created' | 'customer.created' | 'review.new'
export type ActionType = 'webhook' | 'transfer' | 'ticket' | 'whatsapp' | 'notify'

export interface ConnectRule {
  id: string
  name: string
  trigger_event: TriggerEvent
  conditions: { channel?: string; contains?: string; priority?: string }
  action_type: ActionType
  action_config: Record<string, unknown>
  enabled: boolean
  run_count: number
  last_run_at: string | null
}
export interface ConnectRun { id: string; rule_id: string | null; event: string | null; status: 'ok' | 'failed'; detail: string | null; created_at: string }
export interface ApiKeyRow { id: string; name: string; key_prefix: string; permissions: string[]; active: boolean; last_used_at: string | null; created_at: string }

export const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  'conversation.new': 'وصلت محادثة جديدة',
  'conversation.needs_review': 'محادثة تحتاج مراجعة',
  'conversation.transferred': 'حُوّلت محادثة لفريق',
  'ticket.created': 'انفتحت تذكرة',
  'booking.created': 'انحجز موعد',
  'customer.created': 'انضاف عميل جديد',
  'review.new': 'وصل تقييم جديد',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  webhook: 'أرسل لخدمة خارجية', transfer: 'حوّل لفريق', ticket: 'افتح تذكرة', whatsapp: 'أرسل واتساب للعميل', notify: 'أرسل إشعار داخل اللوحة',
}

export const WEBHOOK_PRESETS: { id: string; label: string; hint: string }[] = [
  { id: 'slack', label: 'Slack', hint: 'في Slack: Apps ← Incoming Webhooks ← أنشئ رابط وانسخه' },
  { id: 'discord', label: 'Discord', hint: 'في Discord: إعدادات القناة ← التكاملات ← Webhooks ← انسخ الرابط' },
  { id: 'telegram', label: 'Telegram', hint: 'أنشئ بوت من @BotFather وخذ التوكن، وحط رقم المحادثة (chat id)' },
  { id: 'sheets', label: 'Google Sheets', hint: 'انشر Google Apps Script كتطبيق ويب يستقبل POST، وحط رابطه' },
  { id: 'zapier', label: 'Zapier', hint: 'في Zapier: Webhooks by Zapier ← Catch Hook ← انسخ الرابط' },
  { id: 'make', label: 'Make', hint: 'في Make: Webhooks ← Custom webhook ← انسخ الرابط' },
  { id: 'n8n', label: 'n8n', hint: 'في n8n: عقدة Webhook بطريقة POST، وانسخ رابط الإنتاج' },
  { id: 'generic', label: 'رابط مخصص', hint: 'أي رابط https يستقبل POST بصيغة JSON' },
]

/** Ready-made rules: one click fills the builder. */
export const RECIPES: { title: string; desc: string; rule: Omit<ConnectRule, 'id' | 'enabled' | 'run_count' | 'last_run_at'> }[] = [
  { title: 'نبّه Slack لما محادثة تحتاج مراجعة', desc: 'ما يفوتك عميل منزعج أو طلب يحتاج بشر.',
    rule: { name: 'مراجعة ← Slack', trigger_event: 'conversation.needs_review', conditions: {}, action_type: 'webhook', action_config: { preset: 'slack' } } },
  { title: 'سجّل كل حجز في Google Sheets', desc: 'جدول يتحدّث لحاله مع كل حجز جديد.',
    rule: { name: 'حجوزات ← Sheets', trigger_event: 'booking.created', conditions: {}, action_type: 'webhook', action_config: { preset: 'sheets' } } },
  { title: 'حوّل محادثات واتساب الجديدة للمبيعات', desc: 'كل محادثة واتساب جديدة تروح لفريقك مباشرة.',
    rule: { name: 'واتساب ← فريق', trigger_event: 'conversation.new', conditions: { channel: 'whatsapp' }, action_type: 'transfer', action_config: {} } },
  { title: 'افتح تذكرة لأي محادثة تحتاج مراجعة', desc: 'تتابعها من التذاكر بدل ما تضيع.',
    rule: { name: 'مراجعة ← تذكرة', trigger_event: 'conversation.needs_review', conditions: {}, action_type: 'ticket', action_config: { priority: 'high', subject: '{{summary_text}}' } } },
  { title: 'أرسل تيليجرام لما ينفتح تذكرة عاجلة', desc: 'إشعار فوري على جوالك.',
    rule: { name: 'تذكرة عاجلة ← Telegram', trigger_event: 'ticket.created', conditions: { priority: 'high' }, action_type: 'webhook', action_config: { preset: 'telegram' } } },
  { title: 'أرسل كل عميل جديد لـ Zapier أو Make', desc: 'اربطه بأي CRM أو أداة ثانية.',
    rule: { name: 'عميل جديد ← Zapier', trigger_event: 'customer.created', conditions: {}, action_type: 'webhook', action_config: { preset: 'zapier' } } },
]

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoRules: ConnectRule[] = []
let demoRuns: ConnectRun[] = []
let demoKeys: ApiKeyRow[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useConnectRules(companyId: string | null, isDemo: boolean) {
  const [rules, setRules] = useState<ConnectRule[]>(isDemo ? demoRules : [])
  const [runs, setRuns] = useState<ConnectRun[]>(isDemo ? demoRuns : [])
  const [available, setAvailable] = useState(true)
  const load = useCallback(async () => {
    if (isDemo) { setRules([...demoRules]); setRuns([...demoRuns]); return }
    if (!companyId) return
    const [r, l] = await Promise.all([
      supabase.from('connect_rules').select('id, name, trigger_event, conditions, action_type, action_config, enabled, run_count, last_run_at').eq('company_id', companyId).order('created_at'),
      supabase.from('connect_runs').select('id, rule_id, event, status, detail, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30),
    ])
    if (r.error) { setAvailable(false); return }
    setAvailable(true)
    setRules((r.data || []) as ConnectRule[])
    setRuns((l.data || []) as ConnectRun[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { rules, runs, available }
}

export async function saveConnectRule(companyId: string | null, isDemo: boolean, r: Omit<ConnectRule, 'id' | 'run_count' | 'last_run_at'> & { id?: string }) {
  const row = { name: r.name.trim(), trigger_event: r.trigger_event, conditions: r.conditions, action_type: r.action_type, action_config: r.action_config, enabled: r.enabled }
  if (isDemo) {
    demoRules = r.id ? demoRules.map((x) => (x.id === r.id ? { ...x, ...row } : x)) : [...demoRules, { id: demoId(), run_count: 0, last_run_at: null, ...row }]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const { error } = r.id
    ? await supabase.from('connect_rules').update(row).eq('id', r.id).eq('company_id', companyId)
    : await supabase.from('connect_rules').insert({ company_id: companyId, ...row })
  if (error) throw error
  notify()
}

export async function deleteConnectRule(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoRules = demoRules.filter((x) => x.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('connect_rules').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

export async function toggleConnectRule(companyId: string | null, isDemo: boolean, id: string, enabled: boolean) {
  if (isDemo) { demoRules = demoRules.map((x) => (x.id === id ? { ...x, enabled } : x)); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('connect_rules').update({ enabled }).eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

/** Runs one rule with a sample event so you can see it work before real events arrive. */
export async function testConnectRule(isDemo: boolean, rule: ConnectRule): Promise<{ status: 'ok' | 'failed'; detail: string }> {
  if (isDemo) {
    demoRuns = [{ id: demoId(), rule_id: rule.id, event: rule.trigger_event, status: 'ok', detail: 'تجربة (نسخة تجريبية)', created_at: new Date().toISOString() }, ...demoRuns]
    notify()
    return { status: 'ok', detail: 'تجربة ناجحة (نسخة تجريبية، ما انرسل شي فعليًا)' }
  }
  const { data: s } = await supabase.auth.getSession()
  const token = s.session?.access_token
  if (!token) throw new Error('سجّل دخولك من جديد')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-runner`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '', 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: rule.id }),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || 'تعذّرت التجربة')
  notify()
  return out
}

// ─── API keys ─────────────────────────────────────────────────────────────────

export function useApiKeys(companyId: string | null, isDemo: boolean) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(isDemo ? demoKeys : [])
  const load = useCallback(async () => {
    if (isDemo) { setKeys([...demoKeys]); return }
    if (!companyId) return
    const { data } = await supabase.from('api_keys').select('id, name, key_prefix, permissions, active, last_used_at, created_at').eq('company_id', companyId).eq('active', true).order('created_at', { ascending: false })
    setKeys((data || []) as ApiKeyRow[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return keys
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Creates a key and returns it once; only its hash is stored. */
export async function createApiKey(companyId: string | null, isDemo: boolean, name: string, write: boolean): Promise<string> {
  const raw = new Uint8Array(24)
  crypto.getRandomValues(raw)
  const key = 'mk_live_' + [...raw].map((b) => b.toString(16).padStart(2, '0')).join('')
  const permissions = [write ? 'write:all' : 'read:all']
  if (isDemo) {
    demoKeys = [{ id: demoId(), name, key_prefix: key.slice(0, 11), permissions, active: true, last_used_at: null, created_at: new Date().toISOString() }, ...demoKeys]
    notify(); return key
  }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('api_keys').insert({ company_id: companyId, name: name.trim() || 'مفتاح API', key_prefix: key.slice(0, 11), key_hash: await sha256(key), permissions })
  if (error) throw error
  notify()
  return key
}

export async function revokeApiKey(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoKeys = demoKeys.filter((k) => k.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('api_keys').update({ active: false }).eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}
