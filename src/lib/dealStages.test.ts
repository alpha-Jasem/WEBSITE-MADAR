import { describe, expect, it } from 'vitest'
import { isClosed, nextStage, stageForLeadStatus } from './dealStages'

describe('stageForLeadStatus', () => {
  it('maps every outreach status to a stage', () => {
    expect(stageForLeadStatus('new')).toBe('new')
    expect(stageForLeadStatus('contacted')).toBe('contacted')
    expect(stageForLeadStatus('no_answer')).toBe('contacted')
    expect(stageForLeadStatus('replied')).toBe('interested')
    expect(stageForLeadStatus('meeting')).toBe('qualified')
    expect(stageForLeadStatus('won')).toBe('won')
    expect(stageForLeadStatus('lost')).toBe('lost')
  })
})

describe('nextStage', () => {
  it('moves a deal forward', () => {
    expect(nextStage('new', 'contacted')).toBe('contacted')
    expect(nextStage('contacted', 'meeting')).toBe('qualified')
  })

  it('never pulls a deal back from a later stage', () => {
    expect(nextStage('negotiation', 'contacted')).toBe('negotiation')
    expect(nextStage('offer_sent', 'replied')).toBe('offer_sent')
    expect(nextStage('awaiting_payment', 'no_answer')).toBe('awaiting_payment')
  })

  it('closes a deal as won or lost from any open stage', () => {
    expect(nextStage('negotiation', 'lost')).toBe('lost')
    expect(nextStage('awaiting_payment', 'won')).toBe('won')
  })

  it('does not reopen a closed deal from a status change', () => {
    expect(nextStage('lost', 'contacted')).toBe('lost')
    expect(nextStage('won', 'replied')).toBe('won')
    expect(isClosed('won')).toBe(true)
    expect(isClosed('qualified')).toBe(false)
  })
})
