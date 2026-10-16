import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export interface RealtimeSource { table: string; filter?: string }

/**
 * Keeps a list fresh from Supabase Realtime. Any insert/update/delete on the given
 * tables calls `refetch` (debounced). The channel is rebuilt after errors or a dropped
 * connection, and everything is refetched when the tab wakes up, the network returns or
 * the channel reconnects, so nothing is missed while it was asleep. While the channel is
 * down a slow poll covers the gap. Returns whether the live channel is connected.
 */
export function useRealtimeRefetch(
  name: string,
  sources: RealtimeSource[],
  refetch: () => void,
  enabled: boolean,
): boolean {
  const [live, setLive] = useState(false)
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  const key = JSON.stringify(sources)

  useEffect(() => {
    if (!enabled) { setLive(false); return }
    const list = JSON.parse(key) as RealtimeSource[]
    let disposed = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let attempt = 0
    let wasDown = false
    const instance = Math.random().toString(36).slice(2)

    const refresh = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => { if (!disposed) refetchRef.current() }, 200)
    }

    const connect = () => {
      if (disposed) return
      if (channel) { void supabase.removeChannel(channel); channel = null }
      const ch = supabase.channel(`rt_${name}_${instance}_${attempt}`)
      for (const s of list) {
        ch.on('postgres_changes',
          { event: '*', schema: 'public', table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
          refresh)
      }
      ch.subscribe((status) => {
        if (disposed || ch !== channel) return
        if (status === 'SUBSCRIBED') {
          attempt = 0
          setLive(true)
          if (wasDown) { wasDown = false; refresh() }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setLive(false)
          wasDown = true
          clearTimeout(retryTimer)
          retryTimer = setTimeout(() => { attempt += 1; connect() }, Math.min(1000 * 2 ** attempt, 30_000))
        }
      })
      channel = ch
    }

    const wake = () => {
      if (document.visibilityState === 'hidden') return
      refresh()
    }
    const online = () => { wasDown = true; attempt = 0; connect(); refresh() }

    connect()
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('online', online)
    // Safety net: if the socket is silently stuck, still pick up changes.
    const poll = setInterval(() => { if (document.visibilityState === 'visible') refetchRef.current() }, 60_000)

    return () => {
      disposed = true
      clearTimeout(retryTimer); clearTimeout(debounceTimer); clearInterval(poll)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', online)
      if (channel) void supabase.removeChannel(channel)
      setLive(false)
    }
  }, [name, key, enabled])

  return live
}
