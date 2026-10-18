import { describe, expect, it } from 'vitest'
import { buildBrief, type BriefFacts } from './jarvis'

const base: BriefFacts = {
  dueToday: 0, overdue: 0, meetingsToday: 0, waitingFirstContact: 0, dealsWithoutNextStep: 0,
  qualifiedDeals: 0, activeDeals: 0, hasMonthlyGoal: true, integrationsFailing: [],
}

describe('buildBrief', () => {
  it('is calm and suggests nothing invented when there is no data', () => {
    const b = buildBrief(base)
    expect(b.tone).toBe('calm')
    expect(b.actions).toHaveLength(0)
    expect(b.summary).toContain('جلب عملاء')
  })

  it('puts meetings first and explains every action', () => {
    const b = buildBrief({ ...base, meetingsToday: 2, overdue: 3, dueToday: 1, dealsWithoutNextStep: 4, activeDeals: 5 })
    expect(b.actions[0].id).toBe('meetings')
    expect(b.actions.length).toBeLessThanOrEqual(3)
    for (const a of b.actions) expect(a.reason.length).toBeGreaterThan(5)
  })

  it('flags an alert when a follow-up is overdue or an integration is failing', () => {
    expect(buildBrief({ ...base, overdue: 1 }).tone).toBe('alert')
    const b = buildBrief({ ...base, integrationsFailing: ['n8n'] })
    expect(b.tone).toBe('alert')
    expect(b.actions[0].id).toBe('integrations')
  })

  it('asks for a monthly goal only when there is room and none is set', () => {
    expect(buildBrief({ ...base, hasMonthlyGoal: false }).actions.map(a => a.id)).toContain('goal')
    expect(buildBrief({ ...base, hasMonthlyGoal: true }).actions.map(a => a.id)).not.toContain('goal')
  })
})
