import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../../../lib/supabase'

export interface PulseLead {
  id: string
  name: string
  phone: string
  is_mobile: boolean
  status: string
  next_follow_up: string | null
  meeting_at: string | null
}

interface Pulse {
  due: PulseLead[]
  meetingsToday: PulseLead[]
  newToday: number
  waiting: number
  reload: () => void
}

const PulseContext = createContext<Pulse>({ due: [], meetingsToday: [], newToday: 0, waiting: 0, reload: () => {} })

export const useAdminPulse = () => useContext(PulseContext)

const COLS = 'id, name, phone, is_mobile, status, next_follow_up, meeting_at'

// Live counts from the Outreach tables; they feed the sidebar badges, the bell and the home screen.
export function AdminPulseProvider({ children }: { children: ReactNode }) {
  const [due, setDue] = useState<PulseLead[]>([])
  const [meetingsToday, setMeetingsToday] = useState<PulseLead[]>([])
  const [newToday, setNewToday] = useState(0)
  const [waiting, setWaiting] = useState(0)

  const reload = useCallback(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + 86400000)
    const [d, m, n, w] = await Promise.all([
      supabase.from('outreach_leads').select(COLS).lte('next_follow_up', end.toISOString())
        .in('status', ['new', 'contacted', 'no_answer', 'replied']).order('next_follow_up').limit(200),
      supabase.from('outreach_leads').select(COLS).eq('status', 'meeting')
        .gte('meeting_at', start.toISOString()).lt('meeting_at', end.toISOString()).order('meeting_at'),
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).gte('created_at', start.toISOString()),
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('is_mobile', true),
    ])
    setDue((d.data ?? []) as PulseLead[])
    setMeetingsToday((m.data ?? []) as PulseLead[])
    setNewToday(n.count ?? 0)
    setWaiting(w.count ?? 0)
  }, [])

  useEffect(() => {
    reload()
    const id = window.setInterval(reload, 60000)
    return () => window.clearInterval(id)
  }, [reload])

  const value = useMemo(() => ({ due, meetingsToday, newToday, waiting, reload }), [due, meetingsToday, newToday, waiting, reload])
  return <PulseContext.Provider value={value}>{children}</PulseContext.Provider>
}
