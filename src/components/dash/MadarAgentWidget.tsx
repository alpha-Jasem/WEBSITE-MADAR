import { FormEvent, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Headphones, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { askMadarAgent, type MadarAgentType } from '../../lib/aiAgents'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  agentType: MadarAgentType
  companyId?: string | null
  publicToken?: string | null
  queueId?: string | null
  pageTitle?: string
  compact?: boolean
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function config(agentType: MadarAgentType, pathname: string) {
  if (agentType === 'sales_website') {
    return {
      title: 'وكيل مبيعات مدار AI',
      badge: 'موقع مدار',
      button: 'اسأل مدار AI',
      greeting: 'أهلاً، أقدر أشرح لك كيف مدار OS يساعد مغسلتك، وأجهز لك تجربة مناسبة.',
      placeholder: 'اكتب اسم النشاط أو سؤالك...',
      suggestions: ['كيف يخدم المغسلة؟', 'أبغى تجربة مجانية', 'كم يناسبني من باقة؟'],
    }
  }
  if (agentType === 'end_customer') {
    return {
      title: 'مساعد المغسلة',
      badge: 'خدمة العميل',
      button: 'مساعدة',
      greeting: pathname.includes('/status') ? 'أهلاً، أقدر أوضح لك حالة سيارتك وخطوة الاستلام.' : 'أهلاً، أساعدك في التسجيل السريع واختيار الخدمة.',
      placeholder: 'اسأل عن التسجيل أو حالة السيارة...',
      suggestions: pathname.includes('/status') ? ['وين وصلت سيارتي؟', 'متى أستلم؟', 'كيف أقيم الخدمة؟'] : ['كيف أسجل؟', 'هل اللوحة مطلوبة؟', 'كيف أختار الخدمة؟'],
    }
  }
  return {
    title: 'دعم مدار AI',
    badge: 'بوابة المغسلة',
    button: 'دعم مدار AI',
    greeting: 'أنا وكيل دعم مدار. أساعدك في QR، التشغيل، العملاء، المالية، واتساب، والإعدادات.',
    placeholder: 'اكتب المشكلة أو السؤال...',
    suggestions: ['ليش QR ما يشتغل؟', 'افتح تذكرة دعم', 'اشرح هذه الصفحة'],
  }
}

export const MadarAgentWidget = ({ agentType, companyId, publicToken, queueId, pageTitle, compact = false }: Props) => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const cfg = useMemo(() => config(agentType, location.pathname), [agentType, location.pathname])
  const visibleMessages = [{ id: 'welcome', role: 'assistant' as const, content: cfg.greeting }, ...chatMessages].slice(-10)

  const sendMessage = async (text: string) => {
    const clean = text.trim()
    if (!clean || sending) return
    const userMessage: ChatMessage = { id: createId(), role: 'user', content: clean }
    setChatMessages(prev => [...prev, userMessage])
    setInput('')
    setError('')
    setNotice('')
    setSending(true)

    try {
      const response = await askMadarAgent({
        agent_type: agentType,
        route: `${location.pathname}${location.search}`,
        company_id: companyId,
        public_token: publicToken,
        queue_id: queueId,
        message: clean,
        conversation_id: conversationId,
      })
      setConversationId(response.conversation_id)
      setRemaining(response.usage?.remaining ?? null)
      setChatMessages(prev => [...prev, { id: createId(), role: 'assistant', content: response.reply }])
      if (response.ticket_id) setNotice('تم فتح تذكرة دعم ووصلت للإدارة.')
      if (response.lead_id) setNotice('تم تسجيل طلبك كفرصة مبيعات وسنتواصل معك.')
      requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرسالة الآن.')
      setChatMessages(prev => [...prev, { id: createId(), role: 'assistant', content: 'تعذر تشغيل الوكيل الآن. حاول بعد قليل.' }])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <div className={`madar-ai-assistant madar-agent-${agentType}${compact ? ' compact' : ''}`} dir="rtl">
      {open && (
        <section className="madar-ai-window" aria-label={cfg.title}>
          <header className="madar-ai-head">
            <div>
              <span>{agentType === 'client_support' ? <Headphones size={18} /> : <Bot size={18} />}</span>
              <div>
                <strong>{cfg.title}</strong>
                <small>{pageTitle || cfg.badge}</small>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق الوكيل">
              <X size={18} />
            </button>
          </header>

          <div className="madar-ai-suggestions">
            {cfg.suggestions.map(suggestion => (
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
                الوكيل يراجع السياق...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {notice && <p className="madar-ai-usage">{notice}</p>}
          {error && <p className="madar-ai-error">{error}</p>}
          {remaining !== null && <p className="madar-ai-usage">المتبقي اليوم: {remaining} رسالة</p>}

          <form className="madar-ai-composer" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder={cfg.placeholder}
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
        <span>{cfg.button}</span>
      </button>
    </div>
  )
}
