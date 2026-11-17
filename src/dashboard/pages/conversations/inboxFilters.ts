import type { ConvEvent, ConvState, ConvStatus } from '@/lib/queries/inbox'
import type { ConvItem } from './model'

// The inbox list: four tabs with counts plus a filter drawer.

export type InboxTab = 'all' | 'mine' | 'unassigned' | 'participated'
export const INBOX_TABS: InboxTab[] = ['all', 'mine', 'unassigned', 'participated']
export const TAB_LABEL: Record<InboxTab, string> = { all: 'الكل', mine: 'خاصتي', unassigned: 'غير مسندة', participated: 'شاركت فيها' }

export interface InboxFilters {
  /** Open and nobody from the team has replied yet. */
  awaiting: boolean
  status: '' | ConvStatus
  teamId: string
  assigneeId: string
  channel: string
  tagId: string
  /** Days back from now; 0 means any time. */
  days: number
}
export const NO_FILTERS: InboxFilters = { awaiting: false, status: '', teamId: '', assigneeId: '', channel: '', tagId: '', days: 0 }

export function activeFilterCount(f: InboxFilters) {
  return [f.awaiting, f.status, f.teamId, f.assigneeId, f.channel, f.tagId, f.days].filter(Boolean).length
}

export function matchesFilters(i: ConvItem, evs: ConvEvent[], st: ConvState, f: InboxFilters, now = Date.now()) {
  if (f.awaiting && (st.status !== 'open' || evs.some((e) => e.kind === 'reply'))) return false
  if (f.status && st.status !== f.status) return false
  if (f.teamId && st.teamId !== f.teamId) return false
  if (f.assigneeId && st.assigneeId !== f.assigneeId) return false
  if (f.channel && i.channel !== f.channel) return false
  if (f.tagId && !i.tags.some((t) => t.id === f.tagId)) return false
  if (f.days && now - new Date(i.time).getTime() > f.days * 86_400_000) return false
  return true
}
