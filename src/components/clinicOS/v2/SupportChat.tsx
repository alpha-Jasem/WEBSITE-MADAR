import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { supabase } from '../../../lib/supabase'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const DEMO_REPLY = 'هذا عرض تجريبي — سجّل دخولك بحساب عيادتك عشان تتكلم فعلياً مع دعم مدار الذكي المرتبط ببيانات حسابك.'

export function SupportChat() {
  const location = useLocation()
  const { companyId, isDemo } = useClinicOS()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'أهلاً! أنا دعم مدار الذكي. اسألني عن أي شي بخصوص حسابك — الحجوزات، الاستخدام، أو أي مشكلة تواجهك.' },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    <div style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1400 }}>
      <style>{`
        @keyframes dv2-agent-pulse {
          0%   { transform: scale(1);    opacity: .55; }
          70%  { transform: scale(1.9);  opacity: 0; }
          100% { transform: scale(1.9);  opacity: 0; }
        }
        @keyframes dv2-agent-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        .dv2-agent-ring {
          position: absolute; inset: 0; border-radius: 50%;
          background: var(--gradient-brand);
          animation: dv2-agent-pulse 2.4s ease-out infinite;
        }
        .dv2-agent-ring.r2 { animation-delay: .8s; }
        .dv2-agent-btn { animation: dv2-agent-breathe 3.2s ease-in-out infinite; }
        .dv2-agent-btn:hover { animation-play-state: paused; }
        @keyframes dv2-panel-in {
          from { opacity: 0; transform: translateY(8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dv2-chat-panel {
          transform-origin: bottom left;
          animation: dv2-panel-in 180ms var(--ease-out, ease) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .dv2-agent-ring, .dv2-agent-btn, .dv2-chat-panel { animation: none; }
        }
      `}</style>
      {open && (
        <div className="dv2-chat-panel" style={{
          width: 340, height: 460, background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', background: 'var(--gradient-brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>دعم مدار الذكي</div>
                <div style={{ fontSize: 10, opacity: 0.85 }}>متاح الآن</div>
              </div>
            </div>
            <span onClick={() => setOpen(false)} style={{ cursor: 'pointer' }}><X size={17} /></span>
          </div>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '9px 12px', borderRadius: 'var(--radius-lg)', fontSize: 13, lineHeight: 1.6,
                  background: m.role === 'user' ? 'var(--brand-500)' : 'var(--slate-100)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
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
                width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--brand-500)', color: '#fff',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}
            ><Send size={15} /></button>
          </div>
        </div>
      )}
      <div style={{ position: 'relative', width: 52, height: 52, marginInlineStart: 'auto' }}>
        {!open && (
          <>
            <span className="dv2-agent-ring" />
            <span className="dv2-agent-ring r2" />
          </>
        )}
        <div
          className="dv2-agent-btn"
          onClick={() => setOpen((v) => !v)}
          style={{
            position: 'relative', width: 52, height: 52, borderRadius: '50%', background: 'var(--gradient-brand)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-lg)',
          }}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
          {!open && (
            <span style={{
              position: 'absolute', top: -2, insetInlineEnd: -2, width: 18, height: 18, borderRadius: '50%',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--gradient-brand, var(--brand-500))',
            }}>
              <Sparkles size={10} style={{ color: 'var(--brand-500)' }} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
