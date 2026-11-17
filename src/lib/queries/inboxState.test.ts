import { describe, expect, it } from 'vitest'
import { convState, parseStatus, type ConvEvent } from './inbox'

const ev = (body: string, at: string): ConvEvent => ({ id: at, conversation_key: 'k', kind: 'status', body, created_at: at })

describe('conversation status', () => {
  it('reads every status body', () => {
    expect(parseStatus('closed')).toEqual({ status: 'closed', until: null })
    expect(parseStatus('waiting')).toEqual({ status: 'waiting', until: null })
    expect(parseStatus('snoozed:reply')).toEqual({ status: 'snoozed', until: null })
    expect(parseStatus('snoozed:2026-11-17T12:00:00.000Z')).toEqual({ status: 'snoozed', until: '2026-11-17T12:00:00.000Z' })
    expect(parseStatus('open')).toEqual({ status: 'open', until: null })
  })
  it('a snoozed conversation opens when its time passes', () => {
    const evs = [ev('snoozed:2026-11-17T12:00:00.000Z', '2026-11-17T10:00:00.000Z')]
    expect(convState(evs, { now: Date.parse('2026-11-17T11:00:00Z') }).status).toBe('snoozed')
    expect(convState(evs, { now: Date.parse('2026-11-17T12:01:00Z') }).status).toBe('open')
  })
  it('ignores a conversation time in the future', () => {
    expect(convState([ev('waiting', '2026-11-17T10:00:00.000Z')], { lastCustomerAt: '2026-11-17T13:00:00.000Z', now: Date.parse('2026-11-17T12:00:00Z') }).status).toBe('waiting')
  })
  it('waiting and snoozed open when the customer writes again, closed does not', () => {
    const at = '2026-11-17T10:00:00.000Z'
    const later = '2026-11-17T10:30:00.000Z'
    expect(convState([ev('waiting', at)], { lastCustomerAt: later, now: Date.parse('2026-11-17T12:00:00Z') }).status).toBe('open')
    expect(convState([ev('snoozed:reply', at)], { lastCustomerAt: later, now: Date.parse('2026-11-17T12:00:00Z') }).status).toBe('open')
    expect(convState([ev('snoozed:reply', at)], { lastCustomerAt: '2026-11-17T09:00:00.000Z', now: Date.parse('2026-11-17T12:00:00Z') }).status).toBe('snoozed')
    expect(convState([ev('closed', at)], { lastCustomerAt: later, now: Date.parse('2026-11-17T12:00:00Z') }).status).toBe('closed')
  })
})
