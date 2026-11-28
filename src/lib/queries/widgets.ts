import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Website widgets (الإضافات). A company can have several web-call widgets and several chat widgets.
// One row each in site_widget_items: name, public key, agent, allowed websites, direct link, and a
// `config` object holding the look and texts (read by public/widget/call.js, call.html, chat.html and embed.js).

export type WidgetKind = 'call' | 'chat'
export type Corner = 'br' | 'bl' | 'tr' | 'tl'
export type Size = 'sm' | 'md' | 'lg'
export type ThemeMode = 'auto' | 'light' | 'dark'
export type FontKey = 'system' | 'rounded' | 'serif' | 'mono'

// ─── web call ───

export interface CallPanel {
  template: string
  layout: 'classic' | 'centered' | 'compact'
  fill: 'header' | 'full' | 'soft' | 'dark'
  curve: boolean
  brand: string
  avatar: 'icon' | 'image'
  avatarImage: string
  avatarShape: 'circle' | 'rounded'
  title: string
  subOn: boolean
  sub: string
  font: FontKey
  indicator: 'ribbons' | 'bars' | 'orb' | 'dot'
  indicatorOn: boolean
  muteOn: boolean
  btnStyle: 'filled' | 'soft'
  endColor: string
  btnRadius: number
  width: number
  radius: number
  shadow: 'none' | 'soft' | 'strong'
  bg: string
  theme: ThemeMode
}

export interface CallConfig {
  icon: 'phone' | 'chat' | 'headset' | 'mic' | 'spark'
  iconUrl: string
  color: string
  position: Corner
  size: Size
  theme: ThemeMode
  label: string
  panel: CallPanel
}

export const CALL_TEMPLATES: { key: string; label: string; patch: Partial<CallPanel> }[] = [
  { key: 'standard', label: 'قياسي', patch: { layout: 'classic', fill: 'header', curve: false, btnStyle: 'soft', radius: 22, shadow: 'soft', theme: 'auto', bg: '' } },
  { key: 'glossy', label: 'لامع', patch: { layout: 'centered', fill: 'soft', curve: false, btnStyle: 'soft', radius: 26, shadow: 'soft', theme: 'light', bg: '' } },
  { key: 'wave', label: 'موجة', patch: { layout: 'classic', fill: 'header', curve: true, btnStyle: 'soft', radius: 24, shadow: 'soft', theme: 'auto', bg: '' } },
  { key: 'bold', label: 'جريء', patch: { layout: 'classic', fill: 'full', curve: false, btnStyle: 'filled', radius: 22, shadow: 'strong', theme: 'dark', bg: '' } },
  { key: 'soft', label: 'ناعم', patch: { layout: 'centered', fill: 'soft', curve: false, btnStyle: 'soft', radius: 30, shadow: 'none', theme: 'light', bg: '' } },
  { key: 'glow', label: 'إضاءة', patch: { layout: 'classic', fill: 'dark', curve: false, btnStyle: 'filled', radius: 22, shadow: 'strong', theme: 'dark', bg: '' } },
]

export const DEFAULT_CALL_PANEL: CallPanel = {
  template: 'standard', layout: 'classic', fill: 'header', curve: false, brand: '#4f46e5', avatar: 'icon', avatarImage: '', avatarShape: 'circle',
  title: 'تحدث معنا', subOn: true, sub: 'متصل بوكيل مباشر', font: 'system', indicator: 'ribbons', indicatorOn: true, muteOn: true,
  btnStyle: 'soft', endColor: '', btnRadius: 22, width: 288, radius: 22, shadow: 'soft', bg: '', theme: 'auto',
}

export const DEFAULT_CALL_CONFIG: CallConfig = {
  icon: 'phone', iconUrl: '', color: '#4f46e5', position: 'br', size: 'md', theme: 'auto', label: '', panel: DEFAULT_CALL_PANEL,
}

export function callConfig(c: unknown): CallConfig {
  const o = (c && typeof c === 'object' ? c : {}) as Partial<CallConfig>
  return { ...DEFAULT_CALL_CONFIG, ...o, panel: { ...DEFAULT_CALL_PANEL, ...(o.panel || {}) } }
}

// ─── chat ───

export interface ChatTexts {
  welcome: string
  offline: string
  ended: string
  preIntro: string
  placeholder: string
  newChat: string
}

export type FieldMode = 'hidden' | 'optional' | 'required'

export interface ChatConfig {
  displayName: string
  replyLimit: number
  handoff: boolean
  template: string
  header: 'gradient' | 'solid' | 'plain'
  brand: string
  position: Corner
  size: Size
  theme: ThemeMode
  font: FontKey
  radius: number
  shadow: boolean
  glass: boolean
  logoUrl: string
  texts: ChatTexts
  chips: string[]
  prechat: { on: boolean; name: FieldMode; email: FieldMode; phone: FieldMode; consent: string }
  voice: boolean
  voiceAgentId: string
}

export const CHAT_TEMPLATES: { key: string; label: string; patch: Partial<ChatConfig> }[] = [
  { key: 'help', label: 'مركز المساعدة', patch: { header: 'gradient', radius: 24, theme: 'auto', glass: false, brand: '#6d28d9' } },
  { key: 'messenger', label: 'ماسنجر', patch: { header: 'solid', radius: 20, theme: 'light', glass: false, brand: '#4f6bff' } },
  { key: 'islands', label: 'جُزر', patch: { header: 'plain', radius: 28, theme: 'light', glass: false, brand: '#f97316' } },
  { key: 'assistant', label: 'مساعد', patch: { header: 'plain', radius: 16, theme: 'light', glass: false, brand: '#111827' } },
  { key: 'pastel', label: 'باستيل', patch: { header: 'plain', radius: 30, theme: 'light', glass: false, brand: '#ec4899' } },
  { key: 'night', label: 'ليلي', patch: { header: 'solid', radius: 20, theme: 'dark', glass: true, brand: '#facc15' } },
]

export const DEFAULT_CHAT_CONFIG: ChatConfig = {
  displayName: '', replyLimit: 40, handoff: true, template: 'help', header: 'gradient', brand: '#6d28d9', position: 'br', size: 'md', theme: 'auto',
  font: 'system', radius: 24, shadow: true, glass: false, logoUrl: '',
  texts: {
    welcome: 'هلا! كيف نقدر نساعدك اليوم؟', offline: 'ما فيه أحد متاح الحين، بنرجع لك قريب.', ended: 'انتهت المحادثة. أرسل رسالة لبدء محادثة جديدة.',
    preIntro: 'عرّفنا عليك قبل ما نبدأ.', placeholder: 'اكتب رسالتك…', newChat: 'محادثة جديدة',
  },
  chips: [], prechat: { on: false, name: 'optional', email: 'optional', phone: 'optional', consent: '' }, voice: false, voiceAgentId: '',
}

export function chatConfig(c: unknown): ChatConfig {
  const o = (c && typeof c === 'object' ? c : {}) as Partial<ChatConfig>
  return { ...DEFAULT_CHAT_CONFIG, ...o, texts: { ...DEFAULT_CHAT_CONFIG.texts, ...(o.texts || {}) }, prechat: { ...DEFAULT_CHAT_CONFIG.prechat, ...(o.prechat || {}) }, chips: Array.isArray(o.chips) ? o.chips : [] }
}

// ─── rows ───

export interface WidgetItem {
  id: string
  kind: WidgetKind
  name: string
  public_key: string
  enabled: boolean
  agent_id: string
  allowed_origins: string[]
  direct_link: boolean
  config: Record<string, unknown>
  created_at: string
}

export type WidgetDraft = Pick<WidgetItem, 'name' | 'enabled' | 'agent_id' | 'allowed_origins' | 'direct_link' | 'config'>

const COLS = 'id, kind, name, public_key, enabled, agent_id, allowed_origins, direct_link, config, created_at'
const BASE = 'https://madar.software/widget'

export const callSnippet = (key: string) => `<script src="${BASE}/call.js" data-key="${key}" async></script>`
export const chatSnippet = (key: string) => `<script src="${BASE}/embed.js" data-key="${key}" async></script>`
export const directLink = (key: string) => `${BASE}/call.html?key=${key}`
export const snippetOf = (w: Pick<WidgetItem, 'kind' | 'public_key'>) => (w.kind === 'call' ? callSnippet(w.public_key) : chatSnippet(w.public_key))

/** Splits the allowed-websites box into clean origins; `bad` is the first entry that is not a website address. */
export function parseOrigins(text: string): { list: string[]; bad: string | null } {
  const list = text.split(/[\n,\s]+/).map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
  return { list, bad: list.find((o) => !/^https?:\/\/[^/\s]+$/i.test(o)) ?? null }
}

const demoRow = (kind: WidgetKind, i: number): WidgetItem => ({
  id: `demo-${kind}-${i}`, kind, name: kind === 'call' ? 'خط الدعم' : 'دعم الموقع', public_key: `00000000-0000-4000-8000-00000000000${i}`,
  enabled: true, agent_id: kind === 'call' ? 'demo-a1' : '', allowed_origins: [], direct_link: false,
  config: kind === 'call' ? DEFAULT_CALL_CONFIG as unknown as Record<string, unknown> : DEFAULT_CHAT_CONFIG as unknown as Record<string, unknown>, created_at: new Date().toISOString(),
})

export function useWidgetItems(companyId: string | null, isDemo: boolean, kind: WidgetKind) {
  const [items, setItems] = useState<WidgetItem[]>(() => (isDemo ? [demoRow(kind, 1)] : []))
  const [loading, setLoading] = useState(!isDemo)
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo) { setLoading(false); return }
    if (!companyId) return
    const { data, error } = await supabase.from('site_widget_items').select(COLS).eq('company_id', companyId).eq('kind', kind).order('created_at', { ascending: false })
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setItems((data ?? []).map((r) => ({ ...r, agent_id: r.agent_id || '', allowed_origins: r.allowed_origins || [], config: (r.config || {}) as Record<string, unknown> })) as WidgetItem[])
  }, [companyId, isDemo, kind])
  useEffect(() => { void load() }, [load])

  const clean = (d: WidgetDraft) => ({
    name: d.name.trim().slice(0, 60), enabled: d.enabled, agent_id: d.agent_id || null,
    allowed_origins: d.allowed_origins.slice(0, 20), direct_link: d.direct_link, config: d.config, updated_at: new Date().toISOString(),
  })

  const create = useCallback(async (d: WidgetDraft): Promise<WidgetItem> => {
    if (isDemo || !companyId) {
      const row = { ...demoRow(kind, Date.now() % 1000), id: `demo-${Date.now()}`, ...d, created_at: new Date().toISOString() }
      setItems((l) => [row, ...l]); return row
    }
    const { data, error } = await supabase.from('site_widget_items').insert({ company_id: companyId, kind, ...clean(d) }).select(COLS).single()
    if (error) throw error
    const row = { ...data, agent_id: data.agent_id || '', config: (data.config || {}) as Record<string, unknown> } as WidgetItem
    setItems((l) => [row, ...l]); return row
  }, [companyId, isDemo, kind]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback(async (id: string, d: Partial<WidgetDraft>): Promise<void> => {
    const prev = items.find((x) => x.id === id)
    if (!prev) return
    const next: WidgetDraft = { name: prev.name, enabled: prev.enabled, agent_id: prev.agent_id, allowed_origins: prev.allowed_origins, direct_link: prev.direct_link, config: prev.config, ...d }
    if (!isDemo && companyId) {
      const { error } = await supabase.from('site_widget_items').update(clean(next)).eq('id', id).eq('company_id', companyId)
      if (error) throw error
    }
    setItems((l) => l.map((x) => (x.id === id ? { ...x, ...next } : x)))
  }, [items, companyId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!isDemo && companyId) {
      const { error } = await supabase.from('site_widget_items').delete().eq('id', id).eq('company_id', companyId)
      if (error) throw error
    }
    setItems((l) => l.filter((x) => x.id !== id))
  }, [companyId, isDemo])

  return { items, loading, available, create, update, remove, reload: load }
}
