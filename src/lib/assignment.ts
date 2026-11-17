// Smart assignment for a team: who gets the next conversation, and whether a conversation has waited
// too long. Pure functions (no network) so they are easy to test; the inbox supplies the inputs.

export type AssignStrategy = 'least_busy' | 'round_robin'

export interface AssignmentRule {
  team_id: string
  enabled: boolean
  strategy: AssignStrategy
  /** Most open conversations one person may hold; 0 means no limit. */
  max_open: number
  /** Minutes an assigned conversation may wait for the first reply; 0 means no limit. */
  sla_minutes: number
  /** This team receives every new conversation (one team per company). Runs on the server. */
  assign_new: boolean
  /** An unassigned conversation goes to whoever sends it the first reply. */
  assign_on_reply: boolean
  /** A closed chat whose customer writes again. Runs on the server. */
  reopen_action: ReopenAction
  /** What happens when the reply limit passes. Runs on the server every minute. */
  sla_action: SlaAction
}

export type ReopenAction = 'none' | 'reassign' | 'prefer_original' | 'keep'
export type SlaAction = 'notify' | 'reassign' | 'unassign'

export const REOPEN_LABELS: Record<ReopenAction, string> = {
  none: 'بدون إجراء — تبقى مغلقة كما هي',
  prefer_original: 'تفتح وترجع لنفس الموظف إذا كان عنده مجال',
  keep: 'تفتح وتبقى مع نفس الموظف',
  reassign: 'تفتح وتروح لموظف ثاني',
}
export const SLA_ACTION_LABELS: Record<SlaAction, string> = {
  notify: 'تنبيه فقط (علامة حمراء)',
  reassign: 'تنتقل لموظف ثاني',
  unassign: 'تنشال من الموظف وترجع للانتظار',
}

export const DEFAULT_RULE: Omit<AssignmentRule, 'team_id'> = {
  enabled: false, strategy: 'least_busy', max_open: 0, sla_minutes: 0,
  assign_new: false, assign_on_reply: false, reopen_action: 'none', sla_action: 'notify',
}

export const STRATEGY_LABELS: Record<AssignStrategy, string> = {
  least_busy: 'الأقل انشغالًا',
  round_robin: 'بالتناوب',
}

interface PickInput {
  /** Login ids of the team's members, in a stable order. */
  members: string[]
  /** Open conversations each member currently holds. Missing means zero. */
  loads: Record<string, number>
  /** Who got the previous conversation of this team (for round robin). */
  lastAssigneeId: string | null
  rule: Pick<AssignmentRule, 'strategy' | 'max_open'>
  /** Members who are busy, on a break or offline right now; they are skipped. */
  unavailable?: Iterable<string>
}

/** The member who should get the next conversation, or null when nobody can take it. */
export function pickAssignee({ members, loads, lastAssigneeId, rule, unavailable }: PickInput): string | null {
  const open = (id: string) => loads[id] || 0
  const away = new Set(unavailable || [])
  const eligible = members.filter((id) => !away.has(id) && (rule.max_open <= 0 || open(id) < rule.max_open))
  if (eligible.length === 0) return null

  if (rule.strategy === 'round_robin') {
    const last = members.indexOf(lastAssigneeId || '')
    // Walk the full member list starting after the last person and take the first who is eligible.
    for (let step = 1; step <= members.length; step++) {
      const id = members[(last + step) % members.length]
      if (eligible.includes(id)) return id
    }
    return null
  }

  // Least busy; ties go to whoever comes first in the team list.
  return eligible.reduce((best, id) => (open(id) < open(best) ? id : best), eligible[0])
}

export type Presence = 'online' | 'busy' | 'break' | 'offline'
export const PRESENCE_LABELS: Record<Presence, string> = { online: 'متصل', busy: 'مشغول', break: 'استراحة', offline: 'غير متصل' }
/** Only people marked online get new conversations; someone who never set a status counts as online. */
export const isAvailable = (p: Presence | undefined) => !p || p === 'online'

export type SlaState = 'none' | 'ok' | 'late'

/**
 * Whether an assigned conversation is still inside its reply window.
 * `assignedAt` is when it was handed over; `repliedAt` the first reply after that, if any.
 */
export function slaState(input: { assignedAt: string | null; repliedAt: string | null; slaMinutes: number; now?: number }): { state: SlaState; waitedMin: number } {
  const { assignedAt, repliedAt, slaMinutes } = input
  if (!assignedAt || slaMinutes <= 0) return { state: 'none', waitedMin: 0 }
  const end = repliedAt ? new Date(repliedAt).getTime() : (input.now ?? Date.now())
  const waitedMin = Math.max(0, Math.floor((end - new Date(assignedAt).getTime()) / 60_000))
  return { state: waitedMin > slaMinutes ? 'late' : 'ok', waitedMin }
}
