import { parseStatus, type ConvEvent } from './queries/inbox'

// How the team handles assigned conversations, from the inbox events. Pure, so it is easy to test.

export interface AssignmentStats {
  total: number
  /** Average minutes from handing a conversation to a person until their first reply; null without data. */
  avgReplyMin: number | null
  /** Share of conversations with a reply limit that were answered in time; null when no team has a limit. */
  slaPct: number | null
  closed: number
  open: number
  waiting: number
}

export interface MemberLoad { id: string; open: number; today: number }

interface Conv { key: string; evs: ConvEvent[] }

function lastOf(evs: ConvEvent[], kinds: ConvEvent['kind'][]) {
  for (let i = evs.length - 1; i >= 0; i--) if (kinds.includes(evs[i].kind)) return evs[i]
  return null
}

/** Assignment stats over conversations assigned or transferred within the last `days`. */
export function assignmentStats(all: Map<string, ConvEvent[]>, opts: { days: number; slaFor: (teamId: string | null) => number; now?: number }): AssignmentStats {
  const now = opts.now ?? Date.now()
  const since = new Date(now - opts.days * 86_400_000).toISOString()
  const convs: Conv[] = []
  for (const [key, evs] of all) {
    if (evs.some((e) => (e.kind === 'assign' || e.kind === 'transfer') && e.created_at >= since)) convs.push({ key, evs })
  }
  let replySum = 0, replyN = 0, slaN = 0, slaMet = 0, closed = 0, waiting = 0
  for (const { evs } of convs) {
    const given = evs.find((e) => (e.kind === 'assign' || e.kind === 'transfer') && e.assignee_user_id && e.created_at >= since)
    const reply = given ? evs.find((e) => e.kind === 'reply' && e.created_at > given.created_at) : undefined
    const st = lastOf(evs, ['status'])
    const isClosed = st?.body === 'closed'
    if (isClosed) closed++
    const owner = lastOf(evs, ['assign', 'transfer'])
    if (!isClosed && !owner?.assignee_user_id) waiting++
    if (given && reply) { replySum += (Date.parse(reply.created_at) - Date.parse(given.created_at)) / 60_000; replyN++ }
    const team = lastOf(evs, ['transfer'])?.team_id || null
    const sla = opts.slaFor(team)
    if (given && sla > 0) {
      const end = reply ? Date.parse(reply.created_at) : now
      const waited = (end - Date.parse(given.created_at)) / 60_000
      // A conversation still inside its limit without a reply is not counted yet.
      if (reply || waited > sla) { slaN++; if (waited <= sla) slaMet++ }
    }
  }
  return {
    total: convs.length,
    avgReplyMin: replyN ? Math.round((replySum / replyN) * 10) / 10 : null,
    slaPct: slaN ? Math.round((slaMet / slaN) * 100) : null,
    closed, open: convs.length - closed, waiting,
  }
}

/** Open conversations each person holds now, and how many they were given in the last 24 hours. */
export function memberLoads(all: Map<string, ConvEvent[]>, memberIds: string[], now = Date.now()): MemberLoad[] {
  const dayAgo = new Date(now - 86_400_000).toISOString()
  const map = new Map(memberIds.map((id) => [id, { id, open: 0, today: 0 }]))
  for (const evs of all.values()) {
    const owner = lastOf(evs, ['assign', 'transfer'])
    // Only conversations in play count: not closed, not waiting for the customer, not snoozed.
    const st = lastOf(evs, ['status'])
    const active = !st || parseStatus(st.body).status === 'open'
    const m = owner?.assignee_user_id ? map.get(owner.assignee_user_id) : undefined
    if (m && active) m.open++
    for (const e of evs) {
      if ((e.kind === 'assign' || e.kind === 'transfer') && e.assignee_user_id && e.created_at >= dayAgo) {
        const g = map.get(e.assignee_user_id)
        if (g) g.today++
      }
    }
  }
  return [...map.values()]
}
