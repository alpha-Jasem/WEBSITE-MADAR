import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CUSTOM_TAG_PREFIX, type TagRule } from '../callTags'

// Demo mode keeps its rules in memory so the settings screen is clickable without touching Supabase.
let demoRules: TagRule[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** The company's tag overrides. `available` is false until the conversation_tag_rules table exists. */
export function useTagRules(companyId: string | null, isDemo: boolean) {
  const [rules, setRules] = useState<TagRule[]>(isDemo ? demoRules : [])
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo) { setRules([...demoRules]); return }
    if (!companyId) return
    const { data, error } = await supabase.from('conversation_tag_rules')
      .select('tag_key, label, keywords, enabled, color').eq('company_id', companyId).order('created_at')
    if (error) { setAvailable(false); setRules([]); return }
    setAvailable(true)
    setRules((data || []) as TagRule[])
  }, [companyId, isDemo])

  useEffect(() => {
    void load()
    listeners.add(load)
    return () => { listeners.delete(load) }
  }, [load])

  return { rules, available, reload: load }
}

/** Creates or updates one rule (a built-in override or a custom tag). */
export async function saveTagRule(companyId: string | null, isDemo: boolean, rule: TagRule) {
  if (isDemo) {
    demoRules = [...demoRules.filter((r) => r.tag_key !== rule.tag_key), rule]
    notify()
    return
  }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('conversation_tag_rules').upsert({
    company_id: companyId, tag_key: rule.tag_key, label: rule.label.trim(),
    keywords: rule.keywords?.trim() || null, enabled: rule.enabled, color: rule.color || null,
  }, { onConflict: 'company_id,tag_key' })
  if (error) throw error
  notify()
}

/** Removes a rule: a custom tag disappears, a built-in one goes back to its default. */
export async function deleteTagRule(companyId: string | null, isDemo: boolean, tagKey: string) {
  if (isDemo) { demoRules = demoRules.filter((r) => r.tag_key !== tagKey); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('conversation_tag_rules').delete().eq('company_id', companyId).eq('tag_key', tagKey)
  if (error) throw error
  notify()
}

export const newCustomTagKey = () => `${CUSTOM_TAG_PREFIX}${Math.random().toString(36).slice(2, 8)}`
