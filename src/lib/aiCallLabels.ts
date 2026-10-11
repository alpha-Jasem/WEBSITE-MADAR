import type { AICallIntent, AICallResult } from '@/types/dashboard'

export const AI_CALL_RESULT_LABEL: Record<AICallResult, string> = {
  booked: 'حجز موعد', rescheduled: 'أُعيدت جدولة الموعد', cancelled: 'أُلغي الموعد',
  referred: 'حُوّلت لموظف', no_action: 'بدون إجراء', failed: 'فشلت',
}

export const AI_CALL_INTENT_LABEL: Record<AICallIntent, string> = {
  new_booking: 'حجز جديد', reschedule: 'إعادة جدولة', cancellation: 'إلغاء موعد',
  inquiry: 'استفسار', follow_up: 'متابعة', other: 'أخرى',
}

export function aiCallResultLabel(result?: AICallResult | null) {
  return result ? AI_CALL_RESULT_LABEL[result] ?? result : '—'
}

export function aiCallIntentLabel(intent?: AICallIntent | null) {
  return intent ? AI_CALL_INTENT_LABEL[intent] ?? intent : ''
}
