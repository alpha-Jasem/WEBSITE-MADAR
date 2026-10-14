import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

// Teams inside a company (sales, support, ...) and who belongs to each. Conversations are transferred to a
// team from the inbox. Backed by company_teams / company_team_members (migration 20261015120000).
// Demo mode keeps them in memory so the sales tour stays clickable.

export interface CompanyTeam { id: string; name: string; color: string; description: string | null }
export interface TeamMembership { team_id: string; auth_user_id: string }

export const TEAM_COLORS = ['#7aa2ff', '#4ade80', '#f5b84a', '#f87171', '#c084fc', '#38bdf8', '#fb923c', '#94a3b8']

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoTeams: CompanyTeam[] = [
  { id: 'demo-team-support', name: 'خدمة العملاء', color: '#7aa2ff', description: 'الرد على الاستفسارات اليومية' },
  { id: 'demo-team-sales', name: 'المبيعات', color: '#4ade80', description: 'العملاء المهتمين بالحجز والشراء' },
]
let demoMembers: TeamMembership[] = []
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useTeams(companyId: string | null, isDemo: boolean) {
  const [teams, setTeams] = useState<CompanyTeam[]>(isDemo ? demoTeams : [])
  const [members, setMembers] = useState<TeamMembership[]>(isDemo ? demoMembers : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)

  const load = useCallback(async () => {
    if (isDemo) { setTeams([...demoTeams]); setMembers([...demoMembers]); setLoading(false); return }
    if (!companyId) return
    const [t, m] = await Promise.all([
      supabase.from('company_teams').select('id, name, color, description').eq('company_id', companyId).order('created_at'),
      supabase.from('company_team_members').select('team_id, auth_user_id').eq('company_id', companyId),
    ])
    if (t.error || m.error) { setAvailable(false); setLoading(false); return }
    setAvailable(true)
    setTeams((t.data || []) as CompanyTeam[])
    setMembers((m.data || []) as TeamMembership[])
    setLoading(false)
  }, [companyId, isDemo])

  useEffect(() => {
    void load()
    listeners.add(load)
    return () => { listeners.delete(load) }
  }, [load])

  const byTeam = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const m of members) map.set(m.team_id, [...(map.get(m.team_id) || []), m.auth_user_id])
    return map
  }, [members])
  const myTeamIds = useCallback((userId: string | null) => new Set(members.filter((m) => m.auth_user_id === userId).map((m) => m.team_id)), [members])

  return { teams, members, byTeam, myTeamIds, available, loading }
}

export async function saveTeam(companyId: string | null, isDemo: boolean, t: { id?: string; name: string; color: string; description?: string }): Promise<string> {
  const row = { name: t.name.trim(), color: t.color, description: t.description?.trim() || null }
  if (!row.name) throw new Error('empty')
  if (isDemo) {
    const id = t.id || demoId()
    demoTeams = t.id ? demoTeams.map((x) => (x.id === t.id ? { ...x, ...row } : x)) : [...demoTeams, { id, ...row }]
    notify(); return id
  }
  if (!companyId) throw new Error('no company')
  if (t.id) {
    const { error } = await supabase.from('company_teams').update(row).eq('id', t.id).eq('company_id', companyId)
    if (error) throw error
    notify(); return t.id
  }
  const { data, error } = await supabase.from('company_teams').insert({ company_id: companyId, ...row }).select('id').single()
  if (error) throw error
  notify()
  return (data as { id: string }).id
}

export async function deleteTeam(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoTeams = demoTeams.filter((t) => t.id !== id); demoMembers = demoMembers.filter((m) => m.team_id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('company_teams').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

/** Replaces the member list of a team. */
export async function setTeamMembers(companyId: string | null, isDemo: boolean, teamId: string, userIds: string[]) {
  if (isDemo) {
    demoMembers = [...demoMembers.filter((m) => m.team_id !== teamId), ...userIds.map((u) => ({ team_id: teamId, auth_user_id: u }))]
    notify(); return
  }
  if (!companyId) throw new Error('no company')
  const del = await supabase.from('company_team_members').delete().eq('team_id', teamId).eq('company_id', companyId)
  if (del.error) throw del.error
  if (userIds.length) {
    const ins = await supabase.from('company_team_members').insert(userIds.map((u) => ({ team_id: teamId, company_id: companyId, auth_user_id: u })))
    if (ins.error) throw ins.error
  }
  notify()
}
