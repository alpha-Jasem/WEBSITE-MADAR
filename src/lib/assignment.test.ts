import { describe, expect, it } from 'vitest'
import { pickAssignee, slaState } from './assignment'

const members = ['a', 'b', 'c']

describe('pickAssignee', () => {
  it('least busy picks the person with fewest open conversations', () => {
    expect(pickAssignee({ members, loads: { a: 3, b: 1, c: 2 }, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 0 } })).toBe('b')
  })
  it('least busy breaks ties by team order', () => {
    expect(pickAssignee({ members, loads: { a: 1, b: 1, c: 1 }, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 0 } })).toBe('a')
  })
  it('round robin goes to the next person after the last one', () => {
    expect(pickAssignee({ members, loads: {}, lastAssigneeId: 'a', rule: { strategy: 'round_robin', max_open: 0 } })).toBe('b')
    expect(pickAssignee({ members, loads: {}, lastAssigneeId: 'c', rule: { strategy: 'round_robin', max_open: 0 } })).toBe('a')
  })
  it('round robin starts at the first member when there is no history', () => {
    expect(pickAssignee({ members, loads: {}, lastAssigneeId: null, rule: { strategy: 'round_robin', max_open: 0 } })).toBe('a')
  })
  it('round robin skips someone at the limit', () => {
    expect(pickAssignee({ members, loads: { b: 2 }, lastAssigneeId: 'a', rule: { strategy: 'round_robin', max_open: 2 } })).toBe('c')
  })
  it('returns null when everyone is at the limit or the team is empty', () => {
    expect(pickAssignee({ members, loads: { a: 2, b: 2, c: 2 }, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 2 } })).toBeNull()
    expect(pickAssignee({ members: [], loads: {}, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 0 } })).toBeNull()
  })
})

describe('pickAssignee availability', () => {
  it('skips people who are away, for both strategies', () => {
    expect(pickAssignee({ members, loads: { a: 0, b: 1, c: 2 }, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 0 }, unavailable: ['a'] })).toBe('b')
    expect(pickAssignee({ members, loads: {}, lastAssigneeId: 'a', rule: { strategy: 'round_robin', max_open: 0 }, unavailable: ['b'] })).toBe('c')
    expect(pickAssignee({ members, loads: {}, lastAssigneeId: null, rule: { strategy: 'least_busy', max_open: 0 }, unavailable: members })).toBeNull()
  })
})

describe('slaState', () => {
  const t0 = '2026-11-17T10:00:00.000Z'
  const at = (min: number) => new Date(new Date(t0).getTime() + min * 60_000).getTime()
  it('has no state without a limit or an assignment', () => {
    expect(slaState({ assignedAt: t0, repliedAt: null, slaMinutes: 0, now: at(99) }).state).toBe('none')
    expect(slaState({ assignedAt: null, repliedAt: null, slaMinutes: 10, now: at(99) }).state).toBe('none')
  })
  it('is ok inside the window and late after it', () => {
    expect(slaState({ assignedAt: t0, repliedAt: null, slaMinutes: 10, now: at(9) })).toEqual({ state: 'ok', waitedMin: 9 })
    expect(slaState({ assignedAt: t0, repliedAt: null, slaMinutes: 10, now: at(11) })).toEqual({ state: 'late', waitedMin: 11 })
  })
  it('measures up to the first reply when there is one', () => {
    expect(slaState({ assignedAt: t0, repliedAt: new Date(at(5)).toISOString(), slaMinutes: 10, now: at(99) })).toEqual({ state: 'ok', waitedMin: 5 })
    expect(slaState({ assignedAt: t0, repliedAt: new Date(at(30)).toISOString(), slaMinutes: 10, now: at(99) }).state).toBe('late')
  })
})
