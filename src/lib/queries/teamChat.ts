import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRealtimeRefetch } from '../realtime'

// Company team chat: channels where teammates talk to each other. Backed by company_team_chat
// (migration 20261126120000); new messages arrive live. Demo mode keeps them in memory.

export interface ChatMessage { id: string; channel: string; from_id: string; from_name: string; body: string; created_at: string }

export const CHAT_CHANNELS: [string, string][] = [['general', 'عام'], ['sales', 'المبيعات'], ['support', 'الدعم'], ['urgent', 'عاجل']]

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString()
let demoChat: ChatMessage[] = [
  { id: 'dc1', channel: 'general', from_id: 'demo-sara', from_name: 'سارة', body: 'صباح الخير، اليوم عندنا ضغط على الحجوزات.', created_at: ago(95) },
  { id: 'dc2', channel: 'general', from_id: 'demo-khaled', from_name: 'خالد', body: 'أنا أتولى الاستفسارات الجديدة، وأنتم على المتابعات.', created_at: ago(88) },
  { id: 'dc3', channel: 'sales', from_id: 'demo-sara', from_name: 'سارة', body: 'العميل طلب عرض سعر للشركات، من يتابعه؟', created_at: ago(40) },
]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

export function useTeamChat(companyId: string | null, isDemo: boolean, channel: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [available, setAvailable] = useState(true)
  const load = useCallback(async () => {
    if (isDemo) { setMessages(demoChat.filter((m) => m.channel === channel)); return }
    if (!companyId) return
    const { data, error } = await supabase.from('company_team_chat')
      .select('id, channel, from_id, from_name, body, created_at').eq('company_id', companyId).eq('channel', channel)
      .order('created_at', { ascending: false }).limit(200)
    if (error) { setAvailable(false); setMessages([]); return }
    setAvailable(true)
    setMessages(((data || []) as ChatMessage[]).reverse())
  }, [companyId, isDemo, channel])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  useRealtimeRefetch(`team_chat_${companyId}_${channel}`, [{ table: 'company_team_chat', filter: `company_id=eq.${companyId}` }],
    () => { void load() }, !isDemo && !!companyId)
  return { messages, available }
}

export async function sendTeamMessage(companyId: string | null, isDemo: boolean, input: { channel: string; fromId: string; fromName: string; body: string }) {
  const body = input.body.trim()
  if (!body) return
  if (isDemo) {
    demoChat = [...demoChat, { id: demoId(), channel: input.channel, from_id: input.fromId, from_name: input.fromName, body, created_at: new Date().toISOString() }]
    notify()
    return
  }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('company_team_chat').insert({ company_id: companyId, channel: input.channel, from_id: input.fromId, from_name: input.fromName, body })
  if (error) throw error
  notify()
}

export async function deleteTeamMessage(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoChat = demoChat.filter((m) => m.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('company_team_chat').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
  notify()
}
