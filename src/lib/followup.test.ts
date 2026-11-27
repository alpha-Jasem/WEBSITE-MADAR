import { describe, expect, it } from 'vitest'
import { conditionsMet, customerNumber, flattenAnalysis, renderParam, waNumber } from '../../supabase/functions/_shared/followup'

describe('call follow-ups', () => {
  const results = [
    { source: 'system', name: 'system', results: [{ name: 'follow_up_required', value: true }] },
    { source: 'user', name: 'booking', results: [{ booked: 'true', customer_name: 'سارة', booking_time: 'الأحد 4 العصر' }] },
  ]

  it('flattens analysis groups in either result shape', () => {
    const a = flattenAnalysis(results)
    expect(a.follow_up_required).toBe(true)
    expect(a.booked).toBe('true')
    expect(a['booking.customer_name']).toBe('سارة')
  })

  it('sends only when every condition is true', () => {
    const a = flattenAnalysis(results)
    expect(conditionsMet([], a)).toBe(true)
    expect(conditionsMet(['booked', 'follow_up_required'], a)).toBe(true)
    expect(conditionsMet(['booked', 'missing'], a)).toBe(false)
  })

  it('picks the customer number by call direction', () => {
    expect(customerNumber({ call_type: 'inbound', call_from: '0551234567', call_to: '+966110000000' })).toBe('966551234567')
    expect(customerNumber({ call_type: 'outbound', call_from: '+966110000000', call_to: '+966 55 123 4567' })).toBe('966551234567')
    expect(waNumber('12')).toBeNull()
  })

  it('fills call, variable and analysis tokens', () => {
    const call = { call_type: 'inbound', call_from: '0551234567', duration: 125, agent_name: 'وكيل الاستقبال', variables: { branch: 'العليا' }, analysis_results: results }
    const a = flattenAnalysis(results)
    expect(renderParam('{{analysis.customer_name}}', call, a)).toBe('سارة')
    expect(renderParam('{{var.branch}} - {{agent.name}}', call, a)).toBe('العليا - وكيل الاستقبال')
    expect(renderParam('{{call.duration}}', call, a)).toBe('2 دقيقة')
    expect(renderParam('{{analysis.nothing}}', call, a)).toBe('')
  })
})
