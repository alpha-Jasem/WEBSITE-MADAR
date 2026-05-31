import { supabase } from './supabase'

export type AssistantPortal = 'client' | 'admin'

export type AssistantRequest = {
  portal: AssistantPortal
  route: string
  message: string
  company_id?: string | null
  conversation_id?: string | null
}

export type AssistantResponse = {
  reply: string
  conversation_id: string
  usage?: {
    remaining: number
    limit: number
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'

const friendlyErrors: Record<string, string> = {
  daily_limit_reached: 'وصلت للحد اليومي لمساعد مدار AI.',
  openai_not_configured: 'المساعد غير متاح الآن، تحقق من إعدادات OpenAI.',
  missing_auth: 'سجل الدخول مرة أخرى لاستخدام مساعد مدار AI.',
  invalid_auth: 'انتهت الجلسة، سجل الدخول مرة أخرى.',
  forbidden: 'ليس لديك صلاحية لاستخدام المساعد هنا.',
  missing_company_id: 'لم يتم تحديد الشركة الحالية للمساعد.',
  openai_request_failed: 'المساعد غير متاح الآن، حاول بعد قليل.',
}

export async function askMadarAssistant(payload: AssistantRequest): Promise<AssistantResponse> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error(friendlyErrors.missing_auth)

  const response = await fetch(`${supabaseUrl}/functions/v1/madar-ai-assistant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const key = typeof body?.error === 'string' ? body.error : ''
    throw new Error(friendlyErrors[key] || body?.message || 'تعذر تشغيل مساعد مدار AI الآن.')
  }

  return body as AssistantResponse
}
