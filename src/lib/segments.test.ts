import { describe, expect, it } from 'vitest'
import { describeRules, matchesRules, type SegmentRules } from './segments'
import { buildContactList, type Contact } from './contacts'
import type { ConvItem } from '@/dashboard/pages/conversations/model'
import type { Customer } from '@/types/dashboard'

const now = Date.parse('2026-11-17T12:00:00Z')
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()
const contact = (over: Partial<Contact> = {}): Contact => ({
  key: '0500000000', name: 'سارة', phone: '0500000000', type: 'new', visits: 1, firstAt: daysAgo(3), lastAt: daysAgo(3),
  channels: ['whatsapp'], tagIds: ['sales'], tagLabels: ['مبيعات'], status: 'open', teamId: null, assigneeId: null, ...over,
})
const one = (field: string, op: string, value?: string | number): SegmentRules =>
  ({ match: 'all', groups: [{ match: 'all', conditions: [{ field, op, value } as never] }] })

describe('matchesRules', () => {
  it('matches everyone with no conditions', () => {
    expect(matchesRules(contact(), { match: 'all', groups: [{ match: 'all', conditions: [] }] }, now)).toBe(true)
  })
  it('checks relative dates', () => {
    expect(matchesRules(contact(), one('last_contact', 'within', 7), now)).toBe(true)
    expect(matchesRules(contact(), one('last_contact', 'before', 7), now)).toBe(false)
    expect(matchesRules(contact({ lastAt: null }), one('last_contact', 'never'), now)).toBe(true)
  })
  it('checks numbers, lists and enums', () => {
    expect(matchesRules(contact({ visits: 3 }), one('visits', 'gt', 2), now)).toBe(true)
    expect(matchesRules(contact(), one('channel', 'not_has', 'phone'), now)).toBe(true)
    expect(matchesRules(contact(), one('tag', 'has', 'sales'), now)).toBe(true)
    expect(matchesRules(contact(), one('assigned', 'empty'), now)).toBe(true)
    expect(matchesRules(contact(), one('type', 'is', 'returning'), now)).toBe(false)
  })
  it('joins groups with and/or and negates a group', () => {
    const rules: SegmentRules = {
      match: 'any',
      groups: [
        { match: 'all', conditions: [{ field: 'type', op: 'is', value: 'returning' }] },
        { match: 'all', negate: true, conditions: [{ field: 'channel', op: 'has', value: 'phone' }] },
      ],
    }
    expect(matchesRules(contact(), rules, now)).toBe(true)
    expect(matchesRules(contact({ channels: ['phone'] }), rules, now)).toBe(false)
  })
})

describe('describeRules', () => {
  it('reads as Arabic', () => {
    expect(describeRules(one('last_contact', 'within', 30))).toBe('آخر تواصل خلال آخر «30 يوم»')
    expect(describeRules({ match: 'all', groups: [] })).toBe('كل العملاء')
  })
})

describe('buildContactList', () => {
  it('merges a saved customer with their conversations by phone', () => {
    const customers = [{ id: 'c1', company_id: 'x', name: 'سارة', phone: '+966500000000', patient_type: 'new', tags: ['vip'], no_show_count: 0, total_visits: 0, created_at: daysAgo(40) }] as Customer[]
    const items = [
      { key: 'call:1', channel: 'whatsapp', name: 'سارة', phone: '0500000000', time: daysAgo(2), tags: [{ id: 't', label: 'مبيعات' }] },
      { key: 'call:2', channel: 'phone', name: 'Unknown', phone: '0500000000', time: daysAgo(10), tags: [] },
      { key: 'call:3', channel: 'web', name: 'زائر', phone: '', time: daysAgo(1), tags: [] },
    ] as unknown as ConvItem[]
    const list = buildContactList(customers, items, new Map())
    expect(list).toHaveLength(2)
    const sara = list.find((c) => c.customerId === 'c1')!
    expect(sara.visits).toBe(2)
    expect(sara.channels.sort()).toEqual(['phone', 'whatsapp'])
    expect(sara.convKey).toBe('chat:0500000000')
    expect(sara.tagIds).toEqual(['c:vip', 't'])
    expect(sara.lastAt).toBe(daysAgo(2))
  })
})
