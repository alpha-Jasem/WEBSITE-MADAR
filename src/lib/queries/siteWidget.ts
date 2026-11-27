import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

export interface SiteWidget {
  public_key: string
  enabled: boolean
  title: string
  greeting: string
  color: string
  position: 'right' | 'left'
  logo_url: string
  chips: string[]
}

export const DEFAULT_WIDGET: SiteWidget = {
  public_key: '',
  enabled: false,
  title: 'تحدث معنا',
  greeting: 'أهلًا بك! كيف أقدر أساعدك؟',
  color: '#4f6bff',
  position: 'right',
  logo_url: '',
  chips: ['وش الأسعار؟', 'أبي أحجز موعد', 'وين موقعكم؟'],
}

const DEMO_KEY = '00000000-0000-4000-8000-000000000000'
const DEMO_WIDGET: SiteWidget = { ...DEFAULT_WIDGET, public_key: DEMO_KEY } // one stable object, so effects keyed on it don't re-run

export function embedSnippet(key: string) {
  return `<script src="https://madar.software/widget/embed.js" data-key="${key}" async></script>`
}

export function useSiteWidget(companyId: string | null, isDemo: boolean) {
  // isDemo can flip after the first render (while the account loads), so demo values are derived, not initial state.
  const [data, setData] = useState<SiteWidget | null>(null)
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo || !companyId) return
    const { data: row, error } = await supabase
      .from('site_widgets')
      .select('public_key, enabled, title, greeting, color, position, logo_url, chips')
      .eq('company_id', companyId)
      .maybeSingle()
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setData(row ? { ...DEFAULT_WIDGET, ...row, logo_url: row.logo_url || '', chips: Array.isArray(row.chips) ? row.chips : [] } as SiteWidget : null)
  }, [companyId, isDemo])
  useEffect(() => { void load() }, [load])

  /** Saves the settings; the first save also creates the company's public key. */
  const save = useCallback(async (next: SiteWidget): Promise<SiteWidget> => {
    if (isDemo || !companyId) { setData({ ...next, public_key: next.public_key || DEMO_KEY }); return { ...next, public_key: next.public_key || DEMO_KEY } }
    const { data: row, error } = await supabase
      .from('site_widgets')
      .upsert({
        company_id: companyId, enabled: next.enabled, title: next.title.trim().slice(0, 40), greeting: next.greeting.trim().slice(0, 200),
        color: next.color, position: next.position, logo_url: next.logo_url.trim() || null,
        chips: next.chips.map((c) => c.trim()).filter(Boolean).slice(0, 4), updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
      .select('public_key, enabled, title, greeting, color, position, logo_url, chips')
      .single()
    if (error) throw error
    const saved = { ...DEFAULT_WIDGET, ...row, logo_url: row.logo_url || '' } as SiteWidget
    setData(saved)
    return saved
  }, [companyId, isDemo])

  return {
    data: data ?? (isDemo ? DEMO_WIDGET : null),
    loading: isDemo ? false : loading,
    available, save,
  }
}

// ─── web-call widget: same row and public key, its own settings ───

export interface CallWidget {
  public_key: string
  call_enabled: boolean
  call_agent_id: string
  call_label: string
  call_allowed_origins: string[]
  color: string
  position: 'right' | 'left'
}

export const DEFAULT_CALL: CallWidget = { public_key: '', call_enabled: false, call_agent_id: '', call_label: 'اتصل بنا', call_allowed_origins: [], color: '#4f6bff', position: 'right' }

/** The embed line; the button's look is written into it, so changing the look needs a new copy. */
export function callSnippet(w: Pick<CallWidget, 'public_key' | 'call_label' | 'color' | 'position'>) {
  const esc = (s: string) => s.replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]!))
  return `<script src="https://madar.software/widget/call.js" data-key="${w.public_key}" data-label="${esc(w.call_label)}" data-color="${w.color}" data-position="${w.position}" async></script>`
}

const CALL_COLS = 'public_key, call_enabled, call_agent_id, call_label, call_allowed_origins, color, position'

export function useCallWidget(companyId: string | null, isDemo: boolean) {
  const [data, setData] = useState<CallWidget | null>(null)
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo || !companyId) return
    const { data: row, error } = await supabase.from('site_widgets').select(CALL_COLS).eq('company_id', companyId).maybeSingle()
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setData(row ? { ...DEFAULT_CALL, ...row, call_agent_id: row.call_agent_id || '', call_allowed_origins: row.call_allowed_origins || [] } as CallWidget : null)
  }, [companyId, isDemo])
  useEffect(() => { void load() }, [load])

  /** Saves only the call settings, so the chat widget's settings stay as they are. */
  const save = useCallback(async (next: CallWidget): Promise<CallWidget> => {
    const clean = { ...next, call_label: next.call_label.trim().slice(0, 30) || 'اتصل بنا', call_allowed_origins: next.call_allowed_origins.map((o) => o.trim()).filter(Boolean).slice(0, 20) }
    if (isDemo || !companyId) { const d = { ...clean, public_key: clean.public_key || DEMO_KEY }; setData(d); return d }
    const { data: row, error } = await supabase
      .from('site_widgets')
      .upsert({
        company_id: companyId, call_enabled: clean.call_enabled, call_agent_id: clean.call_agent_id || null,
        call_label: clean.call_label, call_allowed_origins: clean.call_allowed_origins, updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
      .select(CALL_COLS)
      .single()
    if (error) throw error
    const saved = { ...DEFAULT_CALL, ...row, call_agent_id: row.call_agent_id || '', call_allowed_origins: row.call_allowed_origins || [] } as CallWidget
    setData(saved)
    return saved
  }, [companyId, isDemo])

  return { data: data ?? (isDemo ? { ...DEFAULT_CALL, public_key: DEMO_KEY } : null), loading: isDemo ? false : loading, available, save }
}
