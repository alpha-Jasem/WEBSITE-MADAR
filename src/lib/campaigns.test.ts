import { describe, expect, it } from 'vitest'
import { campaignStats, dedupeRecipients, parseTyped, sendsPerDay, stepParams, type CampaignMessage } from './campaigns'

const c = {
  id: 'c1',
  recipients: [{ key: '0500000001', phone: '0500000001', name: 'أ' }, { key: '0500000002', phone: '0500000002', name: 'ب' }, { key: '0500000003', phone: '0500000003', name: 'ج' }],
  steps: [{ template_id: 't', params: [], delay_days: 0 }, { template_id: 't2', params: [], delay_days: 2 }],
}
const msg = (step: number, phone: string, status: 'sent' | 'failed', at: string): CampaignMessage => ({ campaign_id: 'c1', step, to_phone: phone, status, created_at: at })

describe('campaignStats', () => {
  const messages = [
    msg(0, '966500000001', 'sent', '2026-11-10T10:00:00Z'),
    msg(0, '966500000002', 'sent', '2026-11-10T10:00:00Z'),
    msg(0, '966500000003', 'failed', '2026-11-10T10:00:00Z'),
    msg(1, '966500000001', 'sent', '2026-11-12T10:00:00Z'),
    { ...msg(0, '966500000009', 'sent', '2026-11-10T10:00:00Z'), campaign_id: 'other' },
  ]
  const s = campaignStats(c, messages, new Map([['0500000001', ['2026-11-11T09:00:00Z']], ['0500000002', ['2026-11-09T09:00:00Z']]]))
  it('counts each step and what is left', () => {
    expect(s.steps).toEqual([{ sent: 2, failed: 1 }, { sent: 1, failed: 0 }])
    expect(s.pending).toBe(2)
  })
  it('counts a reply only after the first message', () => {
    expect(s.reached).toBe(2)
    expect(s.replied).toBe(1)
    expect(s.replyRate).toBe(50)
  })
})

describe('helpers', () => {
  it('fills the name and falls back', () => {
    expect(stepParams({ template_id: 't', params: ['هلا {name}', 'غدًا'], delay_days: 0 }, '')).toEqual(['هلا عميلنا', 'غدًا'])
  })
  it('dedupes numbers in any format and drops junk', () => {
    expect(dedupeRecipients([{ phone: '0501234567' }, { phone: '+966 50 123 4567' }, { phone: 'abc' }]).map((r) => r.key)).toEqual(['0501234567'])
  })
  it('reads typed lines with or without a name', () => {
    expect(parseTyped('محمد، 0551234567\n0501234567\n')).toEqual([{ name: 'محمد', phone: '0551234567' }, { name: '', phone: '0501234567' }])
  })
  it('buckets sends by Saudi day', () => {
    const rows = sendsPerDay([msg(0, '1', 'sent', '2026-11-16T22:00:00Z'), msg(0, '1', 'failed', '2026-11-17T08:00:00Z')], 2, Date.parse('2026-11-17T12:00:00Z'))
    expect(rows).toEqual([{ day: '2026-11-16', sent: 0, failed: 0 }, { day: '2026-11-17', sent: 1, failed: 1 }])
  })
})
