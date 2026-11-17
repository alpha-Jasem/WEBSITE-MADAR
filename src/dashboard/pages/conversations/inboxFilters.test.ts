import { describe, expect, it } from 'vitest'
import { activeFilterCount, matchesFilters, NO_FILTERS } from './inboxFilters'
import type { ConvItem } from './model'
import type { ConvEvent, ConvState } from '@/lib/queries/inbox'

const now = Date.parse('2026-11-17T12:00:00Z')
const item = (over: Partial<ConvItem> = {}) => ({ key: 'k', channel: 'whatsapp', time: '2026-11-16T12:00:00Z', tags: [{ id: 't1', label: 'مبيعات' }], ...over }) as ConvItem
const open: ConvState = { status: 'open', snoozeUntil: null, assigneeId: 'u1', assigneeName: 'ريم', teamId: 'team1', teamName: 'الدعم' }
const reply = { kind: 'reply' } as ConvEvent

describe('matchesFilters', () => {
  it('passes everything with no filters', () => {
    expect(matchesFilters(item(), [], open, NO_FILTERS, now)).toBe(true)
  })
  it('awaiting reply drops closed and already-answered conversations', () => {
    const f = { ...NO_FILTERS, awaiting: true }
    expect(matchesFilters(item(), [], open, f, now)).toBe(true)
    expect(matchesFilters(item(), [reply], open, f, now)).toBe(false)
    expect(matchesFilters(item(), [], { ...open, status: 'closed' }, f, now)).toBe(false)
  })
  it('filters by team, assignee, channel and tag', () => {
    expect(matchesFilters(item(), [], open, { ...NO_FILTERS, teamId: 'team2' }, now)).toBe(false)
    expect(matchesFilters(item(), [], open, { ...NO_FILTERS, assigneeId: 'u1' }, now)).toBe(true)
    expect(matchesFilters(item(), [], open, { ...NO_FILTERS, channel: 'phone' }, now)).toBe(false)
    expect(matchesFilters(item(), [], open, { ...NO_FILTERS, tagId: 't1' }, now)).toBe(true)
  })
  it('filters by date range', () => {
    expect(matchesFilters(item(), [], open, { ...NO_FILTERS, days: 7 }, now)).toBe(true)
    expect(matchesFilters(item({ time: '2026-10-01T00:00:00Z' }), [], open, { ...NO_FILTERS, days: 30 }, now)).toBe(false)
  })
  it('counts active filters', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...NO_FILTERS, awaiting: true, days: 7 })).toBe(2)
  })
})
