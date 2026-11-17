import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { useCustomers } from '../dashboardQueries'
import { useConversationData } from './conversations'
import { useConversationEvents } from './inbox'
import { buildConversations } from '@/dashboard/pages/conversations/model'
import { buildContactList, type Contact } from '../contacts'
import { matchesRules, type SegmentRules } from '../segments'

// Saved customer segments. Dynamic ones keep their conditions and are worked out again whenever they
// are read; static ones keep a fixed list of people (by phone key). Backed by customer_segments
// (migration 20261117150000). Demo mode keeps them in memory.

export interface Segment {
  id: string
  name: string
  description: string | null
  kind: 'dynamic' | 'static'
  rules: SegmentRules
  member_keys: string[]
  created_at: string
}

const demoId = () => `demo-${Math.random().toString(36).slice(2, 10)}`
let demoSegments: Segment[] = [
  { id: 'demo-seg-returning', name: 'العملاء العائدون', description: 'تواصلوا معنا أكثر من مرة', kind: 'dynamic',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'type', op: 'is', value: 'returning' }] }] }, member_keys: [], created_at: new Date().toISOString() },
  { id: 'demo-seg-quiet', name: 'انقطعوا عنا', description: 'آخر تواصل قبل أكثر من 14 يوم', kind: 'dynamic',
    rules: { match: 'all', groups: [{ match: 'all', conditions: [{ field: 'last_contact', op: 'before', value: 14 }] }] }, member_keys: [], created_at: new Date().toISOString() },
]
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Everyone the company knows, merged from saved customers and conversations. */
export function useContacts(companyId: string | null, isDemo: boolean) {
  const { data: customers, loading: cl } = useCustomers(companyId, isDemo)
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const { events } = useConversationEvents(companyId, isDemo)
  const contacts = useMemo<Contact[]>(() => {
    const items = buildConversations(calls || [], [], { includePhone: true, includeMessages: false })
    return buildContactList(customers || [], items, events)
  }, [customers, calls, events])
  return { contacts, loading: cl || callsLoading }
}

/** The people in a segment right now. */
export function segmentMembers(seg: Pick<Segment, 'kind' | 'rules' | 'member_keys'>, contacts: Contact[], now = Date.now()): Contact[] {
  if (seg.kind === 'static') {
    const keys = new Set(seg.member_keys)
    return contacts.filter((c) => keys.has(c.key))
  }
  return contacts.filter((c) => matchesRules(c, seg.rules, now))
}

export function useSegments(companyId: string | null, isDemo: boolean) {
  const [segments, setSegments] = useState<Segment[]>(isDemo ? demoSegments : [])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(!isDemo)
  const load = useCallback(async () => {
    if (isDemo) { setSegments([...demoSegments]); setLoading(false); return }
    if (!companyId) return
    const { data, error } = await supabase.from('customer_segments')
      .select('id, name, description, kind, rules, member_keys, created_at').eq('company_id', companyId).order('created_at')
    setLoading(false)
    if (error) { setAvailable(false); return }
    setAvailable(true)
    setSegments((data || []) as Segment[])
  }, [companyId, isDemo])
  useEffect(() => { void load(); listeners.add(load); return () => { listeners.delete(load) } }, [load])
  return { segments, available, loading }
}

export async function saveSegment(companyId: string | null, isDemo: boolean, seg: Omit<Segment, 'id' | 'created_at'> & { id?: string }): Promise<string> {
  const row = { name: seg.name.trim(), description: seg.description?.trim() || null, kind: seg.kind, rules: seg.rules, member_keys: seg.member_keys }
  if (!row.name) throw new Error('empty')
  if (isDemo) {
    const id = seg.id || demoId()
    demoSegments = seg.id ? demoSegments.map((s) => (s.id === seg.id ? { ...s, ...row } : s)) : [...demoSegments, { id, created_at: new Date().toISOString(), ...row }]
    notify(); return id
  }
  if (!companyId) throw new Error('no company')
  if (seg.id) {
    const { error } = await supabase.from('customer_segments').update({ ...row, updated_at: new Date().toISOString() }).eq('id', seg.id).eq('company_id', companyId)
    if (error) throw error
    notify(); return seg.id
  }
  const { data, error } = await supabase.from('customer_segments').insert({ company_id: companyId, ...row }).select('id').single()
  if (error) throw error
  notify()
  return (data as { id: string }).id
}

export async function deleteSegment(companyId: string | null, isDemo: boolean, id: string) {
  if (isDemo) { demoSegments = demoSegments.filter((s) => s.id !== id); notify(); return }
  if (!companyId) throw new Error('no company')
  const { error } = await supabase.from('customer_segments').delete().eq('id', id).eq('company_id', companyId)
  if (error) throw error
  notify()
}

/** Adds people to a static segment (keeps the ones already in it). */
export async function addToStaticSegment(companyId: string | null, isDemo: boolean, seg: Segment, keys: string[]) {
  const member_keys = [...new Set([...seg.member_keys, ...keys])]
  await saveSegment(companyId, isDemo, { ...seg, member_keys })
}
