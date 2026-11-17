import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRealtimeRefetch } from '../realtime'
import type { Presence } from '../assignment'

// Who is available right now (online, busy, on a break, offline). Smart assignment only hands new
// conversations to people who are online. Backed by company_user_presence (migration 20261117140000).

let demoPresence: Record<string, Presence> = { 'staff-3': 'break' }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function usePresence(companyId: string | null, isDemo: boolean) {
  const [map, setMap] = useState<Record<string, Presence>>(isDemo ? demoPresence : {})
  const [available, setAvailable] = useState(true)

  const load = useCallback(async () => {
    if (isDemo) { setMap({ ...demoPresence }); return }
    if (!companyId) return
    const { data, error } = await supabase.from('company_user_presence').select('auth_user_id, status').eq('company_id', companyId)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setMap(Object.fromEntries((data || []).map((r: { auth_user_id: string; status: Presence }) => [r.auth_user_id, r.status])))
  }, [companyId, isDemo])

  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  useRealtimeRefetch(`presence_${companyId}`, [{ table: 'company_user_presence', filter: `company_id=eq.${companyId}` }],
    () => { void load() }, !isDemo && !!companyId && available)

  return { presence: map, available }
}

export async function setMyPresence(companyId: string | null, isDemo: boolean, userId: string | null, status: Presence) {
  if (!userId) throw new Error('no user')
  if (isDemo) { demoPresence = { ...demoPresence, [userId]: status }; notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('company_user_presence')
    .upsert({ company_id: companyId, auth_user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'company_id,auth_user_id' })
  if (error) throw error
  notify()
}
