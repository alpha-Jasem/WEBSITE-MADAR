import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, MessageSquare } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

type Message = { role: 'user' | 'assistant'; content: string }

interface Props {
  route: string
  accentColor: string
  productName: string
}

export const AiChatWidget = ({ route, accentColor, productName }: Props) => {
  const [isOpen, setIsOpen]               = useState(false)
  const [messages, setMessages]           = useState<Message[]>([])
  const [input, setInput]                 = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greet = `أهلاً! أنا مساعد مدار لـ Clinic OS 🦷\nأقدر أشرح لك كيف تشتغل نورة وباقي مميزات النظام. وش تبي تعرف؟`
      setMessages([{ role: 'assistant', content: greet }])
    }
  }, [isOpen, messages.length, route])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setIsLoading(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/madar-ai-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          agent_type: 'sales_website',
          message: text,
          conversation_id: conversationId,
          route,
        }),
      })

      const data = await res.json()
      if (data.conversation_id) setConversationId(data.conversation_id)
      const reply = data.reply || 'تعذّر الحصول على رد الآن، حاول مجدداً.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'حدث خطأ في الاتصال. تحقق من الإنترنت وأعد المحاولة.' }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, conversationId, route])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'rgba(8,14,28,0.98)',
              border: `1px solid ${accentColor}30`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}15`,
              height: 480,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ background: `${accentColor}0A`, borderBottom: `1px solid ${accentColor}18` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, #0D1B3E, ${accentColor})` }}>
                  <Bot size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold font-cairo leading-none">مساعد {productName}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[10px] font-work" style={{ color: accentColor }}>متصل الآن</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0"
              style={{ scrollbarWidth: 'none' }}>
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: `linear-gradient(135deg, #0D1B3E, ${accentColor})` }}>
                        <Bot size={11} className="text-white" />
                      </div>
                    )}
                    <div
                      className="max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap font-tajawal"
                      style={msg.role === 'assistant'
                        ? { background: 'rgba(255,255,255,0.06)', color: '#E2E8F0', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 16px 16px 16px' }
                        : { background: `linear-gradient(135deg, #0D1B3E, ${accentColor})`, color: 'white', borderRadius: '16px 4px 16px 16px' }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, #0D1B3E, ${accentColor})` }}>
                    <Bot size={11} className="text-white" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl flex items-center gap-1"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: accentColor }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${accentColor}12` }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${accentColor}20` }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="اسألني عن النظام..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none font-tajawal"
                  dir="rtl"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={send}
                  disabled={!input.trim() || isLoading}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, #0D1B3E, ${accentColor})` }}
                >
                  <Send size={11} className="text-white" />
                </motion.button>
              </div>
              <p className="text-center text-[9px] mt-1.5 font-work" style={{ color: 'rgba(255,255,255,0.2)' }}>
                مدعوم بـ Madar AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
        style={{ background: `linear-gradient(135deg, #0D1B3E, ${accentColor})`, boxShadow: `0 8px 24px ${accentColor}40` }}
        whileHover={{ scale: 1.1, boxShadow: `0 12px 32px ${accentColor}55` }}
        whileTap={{ scale: 0.95 }}
        aria-label="فتح مساعد AI"
      >
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{ background: accentColor }} />

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <MessageSquare size={22} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  )
}
