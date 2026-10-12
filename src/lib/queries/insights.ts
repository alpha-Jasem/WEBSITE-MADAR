import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Platform-generated topics and period summaries for the agent analytics page, served by
// the agent-insights edge function. When the company has no linked agent (or the platform
// has nothing yet) the function answers { available: false } and the page falls back to
// what it computes from the call rows itself.

export interface PlatformTopic {
  id: string
  label: string
  description: string | null
  count: number
  /** Average sentiment, -1..1. */
  sentiment: number | null
  frustration: number | null
  positive: number
  neutral: number
  negative: number
  success_rate: number | null
}

export interface PlatformSummary {
  /** May contain **bold** markdown. */
  title: string | null
  short: string | null
  long: string | null
  conversations: number | null
  avg_duration_secs: number | null
  termination_reasons: Record<string, number> | null
  window_start: number | null
  window_end: number | null
  generated_at: number | null
}

export interface AgentInsights {
  available: boolean
  reason?: string
  days: number
  topics: PlatformTopic[]
  summaries: PlatformSummary[]
}

const UNAVAILABLE = (days: number, reason: string): AgentInsights => ({ available: false, reason, days, topics: [], summaries: [] })

async function fetchInsights(days: 7 | 30): Promise<AgentInsights> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return UNAVAILABLE(days, 'no_session')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-insights`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ days }),
  })
  if (!res.ok) return UNAVAILABLE(days, `http_${res.status}`)
  const body = await res.json().catch(() => null)
  if (!body || typeof body !== 'object') return UNAVAILABLE(days, 'bad_response')
  return {
    available: !!body.available,
    reason: body.reason,
    days: body.days ?? days,
    topics: Array.isArray(body.topics) ? body.topics : [],
    summaries: Array.isArray(body.summaries) ? body.summaries : [],
  }
}

/** Platform insights for the last `days`. Demo mode returns fixtures and makes no request. */
export function useAgentInsights(days: 7 | 30, isDemo: boolean, enabled = true) {
  const [state, setState] = useState<{ data: AgentInsights | null; loading: boolean }>({ data: null, loading: enabled && !isDemo })
  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false }); return }
    if (isDemo) { setState({ data: demoInsights(days), loading: false }); return }
    let alive = true
    setState((s) => ({ data: s.data, loading: true }))
    fetchInsights(days)
      .catch(() => UNAVAILABLE(days, 'network'))
      .then((data) => { if (alive) setState({ data, loading: false }) })
    return () => { alive = false }
  }, [days, isDemo, enabled])
  return state
}

/** success_rate may arrive as 0..1 or 0..100; returns a whole percentage. */
export function successPct(rate: number | null | undefined): number | null {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return null
  return Math.round(rate <= 1 ? rate * 100 : rate)
}

// ─── demo fixtures (fictional) ──────────────────────────────────────────────

function demoInsights(days: 7 | 30): AgentInsights {
  const k = days === 30 ? 4 : 1
  const now = Math.floor(Date.now() / 1000)
  return {
    available: true,
    days,
    topics: [
      { id: 'd1', label: 'حجز المواعيد', description: 'طلبات حجز موعد وتأكيد الوقت المناسب', count: 6 * k, sentiment: 0.42, frustration: 0.05, positive: 5 * k, neutral: 1 * k, negative: 0, success_rate: 0.92 },
      { id: 'd2', label: 'الأسعار وطرق الدفع', description: 'أسئلة عن أسعار الخدمات والباقات وخيارات الدفع على دفعات', count: 4 * k, sentiment: 0.08, frustration: 0.12, positive: 2 * k, neutral: 2 * k, negative: 0, success_rate: 0.64 },
      { id: 'd3', label: 'تفاصيل الخدمات', description: 'استفسارات عن محتوى الخدمة ومدتها وتوفر مواعيد للاستشارة', count: 3 * k, sentiment: -0.06, frustration: 0.24, positive: 0, neutral: 2 * k, negative: 1 * k, success_rate: 0.33 },
      { id: 'd4', label: 'التأجيل والاسترجاع', description: 'طلبات تأجيل مواعيد واسترجاع الدفعة المقدمة', count: 1 * k, sentiment: -0.58, frustration: 0.72, positive: 0, neutral: 0, negative: 1 * k, success_rate: 0 },
      { id: 'd5', label: 'مواعيد العمل', description: 'أسئلة سريعة عن ساعات العمل والموقع', count: 2 * k, sentiment: 0.1, frustration: 0, positive: 1 * k, neutral: 1 * k, negative: 0, success_rate: null },
    ],
    summaries: [{
      title: `الوكيل أنجز **${days === 30 ? 'معظم الحجوزات' : 'أغلب طلبات الحجز'}** والاستفسارات عن تفاصيل الخدمات تحتاج متابعة`,
      short: 'أغلب المحادثات كانت لحجز مواعيد وانتهت بتأكيد الموعد. الأسئلة عن تفاصيل الخدمات والأسعار تكررت، وبعضها انتهى بدون بيانات تواصل.',
      long: 'خلال الفترة تعامل الوكيل مع طلبات الحجز بكفاءة واقترح أوقاتاً متاحة مباشرة. أكثر ما يحتاج تحسيناً: زوار الموقع الذين يسألون عن تفاصيل الخدمة ثم يغادرون قبل ترك رقم، وطلبات الاسترجاع التي تحتاج تحويلاً للإدارة. يُقترح إضافة إجابة عن مدة الخدمات وأسعارها في قاعدة المعرفة، وطلب رقم التواصل في بداية المحادثة.',
      conversations: 16 * k,
      avg_duration_secs: 152,
      termination_reasons: { 'end_call tool was called.': 9 * k, websocket_disconnect: 4 * k, last_agent_message_timeout: 3 * k },
      window_start: now - days * 86400, window_end: now, generated_at: now - 3600,
    }],
  }
}
