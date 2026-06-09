import { supabase } from './supabase'

export type MadarAgentType = 'client_support' | 'sales_website' | 'end_customer'

export type AgentRequest = {
  agent_type: MadarAgentType
  route: string
  message: string
  company_id?: string | null
  public_token?: string | null
  queue_id?: string | null
  conversation_id?: string | null
  visitor_name?: string | null
  visitor_phone?: string | null
}

export type AgentResponse = {
  reply: string
  conversation_id: string
  ticket_id?: string | null
  lead_id?: string | null
  usage?: {
    remaining: number
    limit: number
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'

const friendlyErrors: Record<string, string> = {
  daily_limit_reached: 'وصلت للحد اليومي لهذا الوكيل.',
  openai_not_configured: 'الوكيل غير متاح الآن، تحقق من إعدادات OpenAI.',
  missing_auth: 'سجل الدخول مرة أخرى لاستخدام دعم مدار AI.',
  invalid_public_token: 'رابط المساعد غير صحيح.',
  agent_disabled: 'هذا الوكيل غير مفعل لهذه المنشأة.',
  forbidden: 'ليس لديك صلاحية لاستخدام هذا الوكيل.',
  missing_company_id: 'لم يتم تحديد الشركة الحالية.',
  openai_request_failed: 'الوكيل غير متاح الآن، حاول بعد قليل.',
}

export async function askMadarAgent(payload: AgentRequest): Promise<AgentResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await fetch(`${supabaseUrl}/functions/v1/madar-ai-agents`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const key = typeof body?.error === 'string' ? body.error : ''
    throw new Error(friendlyErrors[key] || body?.message || 'تعذر تشغيل وكيل مدار AI الآن.')
  }

  return body as AgentResponse
}
