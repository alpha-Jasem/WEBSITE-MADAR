import { FormEvent, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { askMadarAssistant, type AssistantPortal } from '../../lib/aiAssistant'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  role: AssistantPortal
  companyId?: string | null
  pageTitle?: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function pageSuggestions(role: AssistantPortal, pathname: string) {
  if (role === 'admin') {
    if (pathname.includes('/pipeline')) return ['حلل خط المبيعات', 'ما الفرص التي تحتاج متابعة؟', 'اقترح إجراء اليوم']
    if (pathname.includes('/n8n')) return ['افحص صحة الأتمتة', 'ما المشاكل التي تحتاج انتباهي؟', 'اشرح هذه الصفحة']
    if (pathname.includes('/settings')) return ['كيف أرتب إعدادات المنصة؟', 'ما الذي ينقص التحكم؟', 'اقترح تحسينات للمدير']
    return ['حلل صحة المنصة', 'ما أفضل قرار الآن؟', 'كيف أرفع المبيعات؟']
  }

  if (pathname.includes('/queue')) return ['حلل تشغيل اليوم', 'كيف أسرع المسار؟', 'ما السيارات التي تحتاج انتباهي؟']
  if (pathname.includes('/finance')) return ['حلل المالية اليوم', 'كيف أرفع متوسط الفاتورة؟', 'ما المصروفات المقلقة؟']
  if (pathname.includes('/reports')) return ['استخرج أهم قرار من التقرير', 'ما الاتجاهات المهمة؟', 'اقترح خطة أسبوعية']
  if (pathname.includes('/leads')) return ['كيف أزيد رجوع العملاء؟', 'حلل العملاء', 'اقترح حملة واتساب']
  return ['حلل الداشبورد', 'وش أفضل قرار الآن؟', 'كيف أرفع مبيعات المغسلة؟']
}

export const MadarAIAssistant = ({ role, companyId, pageTitle }: Props) => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const greeting = role === 'admin'
    ? 'أنا مساعد مدار AI للإدارة. أقدر أساعدك في الشركات، المبيعات، الاشتراكات، OTP، n8n، وصحة المنصة.'
    : 'أنا مساعد مدار AI للمغسلة. أقدر أحلل التشغيل، المالية، العملاء، الموظفين، التقارير، والأتمتة من الصفحة الحالية.'

  const suggestions = useMemo(() => pageSuggestions(role, location.pathname), [role, location.pathname])
  const messages = useMemo<ChatMessage[]>(() => [
    { id: 'welcome', role: 'assistant', content: greeting },
  ], [greeting])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const visibleMessages = [...messages, ...chatMessages].slice(-10)

  const sendMessage = async (text: string) => {
    const clean = text.trim()
    if (!clean || sending) return
    if (role === 'client' && !companyId) {
      setError('لم يتم تحميل بيانات الشركة بعد.')
      return
    }

    const userMessage: ChatMessage = { id: createId(), role: 'user', content: clean }
    setChatMessages(prev => [...prev, userMessage])
    setInput('')
    setError('')
    setSending(true)

    try {
      const response = await askMadarAssistant({
        portal: role,
        route: `${location.pathname}${location.search}`,
        company_id: role === 'client' ? companyId : null,
        message: clean,
        conversation_id: conversationId,
      })
      setConversationId(response.conversation_id)
      setRemaining(response.usage?.remaining ?? null)
      setChatMessages(prev => [...prev, { id: createId(), role: 'assistant', content: response.reply }])
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرسالة الآن.')
      setChatMessages(prev => [...prev, {
        id: createId(),
        role: 'assistant',
        content: 'المساعد غير متاح الآن. تحقق من الإعدادات أو حاول بعد قليل.',
      }])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <div className="madar-ai-assistant" dir="rtl">
      {open && (
        <section className="madar-ai-window" aria-label="مساعد مدار AI">
          <header className="madar-ai-head">
            <div>
              <span><Bot size={18} /></span>
              <div>
                <strong>مساعد مدار AI</strong>
                <small>{pageTitle || (role === 'admin' ? 'لوحة الإدارة' : 'بوابة العميل')}</small>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق المساعد">
              <X size={18} />
            </button>
          </header>

          <div className="madar-ai-suggestions">
            {suggestions.map(suggestion => (
              <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} disabled={sending}>
                <Sparkles size={13} />
                {suggestion}
              </button>
            ))}
          </div>

          <div className="madar-ai-messages">
            {visibleMessages.map(message => (
              <div key={message.id} className={`madar-ai-message ${message.role}`}>
                {message.content}
              </div>
            ))}
            {sending && (
              <div className="madar-ai-message assistant loading">
                <Loader2 size={15} />
                يقرأ بيانات الصفحة...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && <p className="madar-ai-error">{error}</p>}
          {remaining !== null && <p className="madar-ai-usage">المتبقي اليوم: {remaining} رسالة</p>}

          <form className="madar-ai-composer" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="اسأل عن التشغيل، المبيعات، المالية..."
              maxLength={900}
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="إرسال">
              {sending ? <Loader2 size={17} className="madar-ai-spin" /> : <Send size={17} />}
            </button>
          </form>
        </section>
      )}

      <button className="madar-ai-fab" type="button" onClick={() => setOpen(value => !value)}>
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        <span>مساعد مدار AI</span>
      </button>
    </div>
  )
}
