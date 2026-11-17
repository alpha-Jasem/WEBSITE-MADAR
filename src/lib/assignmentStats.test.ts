import { describe, expect, it } from 'vitest'
import { assignmentStats, memberLoads } from './assignmentStats'
import type { ConvEvent } from './queries/inbox'

const now = Date.parse('2026-11-17T12:00:00Z')
const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString()
let n = 0
const ev = (key: string, kind: ConvEvent['kind'], minAgo: number, extra: Partial<ConvEvent> = {}): ConvEvent =>
  ({ id: String(n++), conversation_key: key, kind, body: '', created_at: at(minAgo), ...extra })

const all = new Map<string, ConvEvent[]>([
  // Answered after 5 minutes, then closed.
  ['a', [ev('a', 'transfer', 60, { team_id: 't', assignee_user_id: 'u1' }), ev('a', 'reply', 55), ev('a', 'status', 50, { body: 'closed' })]],
  // Answered after 30 minutes: late for a 15 minute limit.
  ['b', [ev('b', 'transfer', 90, { team_id: 't', assignee_user_id: 'u2' }), ev('b', 'reply', 60)]],
  // Unassigned inside the team, still open.
  ['c', [ev('c', 'transfer', 10, { team_id: 't' })]],
  // Older than the window.
  ['old', [ev('old', 'assign', 60 * 24 * 30, { assignee_user_id: 'u1' })]],
])

describe('assignmentStats', () => {
  const s = assignmentStats(all, { days: 7, slaFor: () => 15, now })
  it('counts conversations in the window', () => {
    expect(s.total).toBe(3)
    expect(s.closed).toBe(1)
    expect(s.open).toBe(2)
    expect(s.waiting).toBe(1)
  })
  it('averages first reply and measures the reply limit', () => {
    expect(s.avgReplyMin).toBe(17.5)
    expect(s.slaPct).toBe(50)
  })
  it('has no limit share when no team sets one', () => {
    expect(assignmentStats(all, { days: 7, slaFor: () => 0, now }).slaPct).toBeNull()
  })
})

describe('memberLoads', () => {
  it('counts open conversations and today assignments per person', () => {
    const l = memberLoads(all, ['u1', 'u2', 'u3'], now)
    expect(l).toEqual([{ id: 'u1', open: 1, today: 1 }, { id: 'u2', open: 1, today: 1 }, { id: 'u3', open: 0, today: 0 }])
  })
})
