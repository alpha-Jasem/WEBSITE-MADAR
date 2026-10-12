import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { useOnOpenSupportRequest } from './shellActions'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const DEMO_REPLY = 'هذا عرض تجريبي — سجّل دخولك بحسابك عشان تتكلم فعلياً مع دعم مدار الذكي المرتبط ببيانات حسابك.'

export function SupportChat() {
  const location = useLocation()
  const { companyId, isDemo } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'أهلاً! أنا دعم مدار الذكي. اسألني عن أي شي بخصوص حسابك — الحجوزات، الاستخدام، أو أي مشكلة تواجهك.' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // The top bar's "اسأل مدار" and help menu open the panel.
  useOnOpenSupportRequest(useCallback(() => setOpen(true), []))

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')

    if (isDemo || !companyId) {
      setSending(true)
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'assistant', content: DEMO_REPLY }])
        setSending(false)
      }, 500)
      return
    }

    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('madar-ai-assistant', {
        body: { portal: 'client', route: location.pathname, company_id: companyId, message: text, conversation_id: conversationId },
      })
      if (error || data?.error) {
        setMessages((m) => [...m, { role: 'assistant', content: 'تعذّر الرد الآن، حاول مرة أخرى بعد قليل.' }])
      } else {
        setConversationId(data.conversation_id)
        setRemaining(data.usage?.remaining ?? null)
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'تعذّر الاتصال بالدعم الآن.' }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="dv2-floating" style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1400 }}>
      <style>{`
        @keyframes dv2-panel-in {
          from { opacity: 0; transform: translateY(8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dv2-chat-panel {
          transform-origin: bottom left;
          animation: dv2-panel-in 180ms var(--ease-out, ease) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dv2-chat-panel { animation: none; }
        }
      `}</style>
      {open && (
        <div className="dv2-chat-panel" style={{
          width: 340, height: 460, background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', background: 'var(--panel-2)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>دعم مدار الذكي</div>
                <div style={{ fontSize: 10.5, color: 'var(--ok)' }}>متاح الآن</div>
              </div>
            </div>
            <span onClick={() => setOpen(false)} style={{ cursor: 'pointer' }}><X size={17} /></span>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 12px', borderRadius: 'var(--radius-lg)', fontSize: 13, lineHeight: 1.6,
                  background: m.role === 'user' ? 'var(--pri-bg)' : 'var(--raise)',
                  color: m.role === 'user' ? 'var(--pri-fg)' : 'var(--text-primary)',
                }}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>جارِ الكتابة...</div>
            )}
          </div>
          {remaining != null && remaining < 15 && (
            <div style={{ fontSize: 10.5, color: 'var(--warning-500)', padding: '0 14px 6px', textAlign: 'center' }}>
              متبقٍ {remaining} رسالة اليوم
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border-default)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="اكتب رسالتك..."
              style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={send} disabled={sending}
              style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--pri-bg)', color: 'var(--pri-fg)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}
            ><Send size={15} /></button>
          </div>
        </div>
      )}
      <div className={open ? undefined : 'dv2-chat-launcher'} style={{ position: 'relative', width: 44, height: 44, marginInlineStart: 'auto' }}>
        <div
          className="dv2-agent-btn"
          role="button"
          tabIndex={0}
          aria-label={open ? 'إغلاق الدعم' : 'دعم مدار'}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) } }}
          style={{
            position: 'relative', width: 44, height: 44, borderRadius: '50%', background: 'var(--panel-2)', color: 'var(--text-primary)',
            border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-md)',
          }}
        >
          {open ? <X size={19} /> : <MessageCircle size={19} />}
        </div>
      </div>
    </div>
  )
}
