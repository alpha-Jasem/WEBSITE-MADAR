import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { DEFAULT_RULE, type AssignmentRule } from '../assignment'

// Per-team assignment settings. Backed by team_assignment_rules (migrations 20261117120000, 20261117130000).
// Demo mode keeps them in memory so the sales tour stays clickable.

let demoRules: AssignmentRule[] = [
  { team_id: 'demo-team-support', ...DEFAULT_RULE, enabled: true, max_open: 5, sla_minutes: 15, assign_new: true, assign_on_reply: true, reopen_action: 'prefer_original', sla_action: 'reassign' },
]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function ruleFor(rules: AssignmentRule[], teamId: string): AssignmentRule {
  const r = rules.find((x) => x.team_id === teamId)
  return { ...DEFAULT_RULE, ...r, team_id: teamId }
}

/** The team that receives new conversations, if one is set and switched on. */
export function intakeRule(rules: AssignmentRule[]): AssignmentRule | null {
  return rules.find((r) => r.enabled && r.assign_new) || null
}

export function useAssignmentRules(companyId: string | null, isDemo: boolean) {
  const [rules, setRules] = useState<AssignmentRule[]>(isDemo ? demoRules : [])
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo) { setRules([...demoRules]); return }
    if (!companyId) return
    const { data, error } = await supabase.from('team_assignment_rules').select('*').eq('company_id', companyId)
    if (error) { setAvailable(false); setRules([]); return }
    setAvailable(true)
    setRules(((data || []) as AssignmentRule[]).map((r) => ({ ...DEFAULT_RULE, ...r })))
  }, [companyId, isDemo])

  useEffect(() => {
    void load()
    listeners.add(load)
    return () => { listeners.delete(load) }
  }, [load])

  return { rules, available }
}

export async function saveAssignmentRule(companyId: string | null, isDemo: boolean, rule: AssignmentRule) {
  const clean: AssignmentRule = { ...rule, max_open: Math.max(0, Math.floor(rule.max_open || 0)), sla_minutes: Math.max(0, Math.floor(rule.sla_minutes || 0)) }
  if (isDemo) {
    demoRules = [...demoRules.filter((r) => r.team_id !== clean.team_id).map((r) => (clean.assign_new ? { ...r, assign_new: false } : r)), clean]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  // Only one team takes the new conversations.
  if (clean.assign_new) {
    const off = await supabase.from('team_assignment_rules').update({ assign_new: false }).eq('company_id', companyId).neq('team_id', clean.team_id)
    if (off.error) throw off.error
  }
  const { error } = await supabase.from('team_assignment_rules').upsert({ ...clean, company_id: companyId, updated_at: new Date().toISOString() }, { onConflict: 'team_id' })
  if (error) throw error
  notify()
}
