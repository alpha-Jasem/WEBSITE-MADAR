import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { pageGuideFor } from '@/dashboard/pageGuide'
import { useOnOpenSupportRequest } from './shellActions'

// «اسأل مدار»: the agent in the corner. It knows which page the customer is on, greets them for it,
// offers questions to start from, and answers with that page in mind.

interface ChatMessage {
  role: 'user' | 'assistant' | 'note'
  content: string
}

export function SupportChat() {
  const location = useLocation()
  const { companyId, isDemo } = useWorkspace()
  const guide = pageGuideFor(location.pathname)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  // Buttons show until the customer asks something on the current page.
  const [askedHere, setAskedHere] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTitle = useRef(guide.title)
  useOnOpenSupportRequest(useCallback(() => setOpen(true), []))

  // Moving to another page: say so in the chat (once there is a conversation) and offer that page's questions.
  useEffect(() => {
    if (lastTitle.current === guide.title) return
    lastTitle.current = guide.title
    setAskedHere(false)
    setMessages((m) => (m.length ? [...m, { role: 'note', content: `انتقلت إلى «${guide.title}»` }] : m))
  }, [guide.title])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open, sending])

  async function send(raw?: string) {
    const text = (raw ?? input).trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setAskedHere(true)

    if (isDemo || !companyId) {
      setSending(true)
      setTimeout(() => {
        setMessages((m) => [...m, { role: 'assistant', content: `أنت الآن في «${guide.title}». ${guide.about}\n\nهذا عرض تجريبي؛ سجّل دخولك بحسابك ويرد عليك مدار حسب صفحتك وبياناتك.` }])
        setSending(false)
      }, 500)
      return
    }

    setSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('madar-ai-assistant', {
        body: { portal: 'client', route: location.pathname, page: { title: guide.title, about: guide.about }, company_id: companyId, message: text, conversation_id: conversationId },
      })
      if (error || data?.error) {
        setMessages((m) => [...m, { role: 'assistant', content: 'تعذّر الرد الآن، حاول مرة أخرى بعد قليل.' }])
      } else {
        setConversationId(data.conversation_id)
        setRemaining(data.usage?.remaining ?? null)
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'تعذّر الاتصال الآن.' }])
    } finally {
      setSending(false)
    }
  }

  const bubble = (role: 'user' | 'assistant') => ({
    maxWidth: '84%', padding: '9px 12px', borderRadius: 'var(--radius-lg)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const,
    background: role === 'user' ? 'var(--pri-bg)' : 'var(--raise)', color: role === 'user' ? 'var(--pri-fg)' : 'var(--text-primary)',
  })

  return (
    <div className="dv2-floating" style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1400 }}>
      <style>{`
        @keyframes dv2-panel-in { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .dv2-chat-panel { transform-origin: bottom left; animation: dv2-panel-in 180ms var(--ease-out, ease) both; }
        .sc-chip { border: 1px solid var(--border-strong); background: var(--panel-2); color: var(--text-primary); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: 12.5px; cursor: pointer; }
        .sc-chip:hover { background: var(--raise); }
        .sc-chip:focus-visible, .sc-launch:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
        .sc-launch { display: inline-flex; align-items: center; gap: 8px; height: 46px; padding: 0 18px 0 14px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--pri-bg); color: var(--pri-fg); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-md); }
        @media (max-width: 900px) { .sc-launch span { display: none; } .sc-launch { width: 46px; padding: 0; justify-content: center; } }
        @media (prefers-reduced-motion: reduce) { .dv2-chat-panel { animation: none; } }
      `}</style>
      {open && (
        <div className="dv2-chat-panel" role="dialog" aria-label="اسأل مدار" style={{
          width: 'min(400px, calc(100vw - 48px))', height: 'min(580px, calc(100dvh - 120px))', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>اسأل مدار</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>أنت الآن في: {guide.title}</div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق" style={{ border: 0, background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 6, borderRadius: 8 }}><X size={18} /></button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              <div style={bubble('assistant')}>{`أهلًا! أنا مدار، أساعدك في أي صفحة.\nأنت الآن في «${guide.title}»: ${guide.about}`}</div>
            </div>
            {messages.map((m, i) => m.role === 'note'
              ? <div key={i} style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{m.content}</div>
              : <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}><div style={bubble(m.role)}>{m.content}</div></div>)}
            {sending && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>جارِ الكتابة...</div>}
            {!askedHere && !sending && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {guide.ask.map((q) => <button key={q} type="button" className="sc-chip" onClick={() => void send(q)}>{q}</button>)}
              </div>
            )}
          </div>

          {remaining != null && remaining < 15 && (
            <div style={{ fontSize: 10.5, color: 'var(--warning-500)', padding: '0 14px 6px', textAlign: 'center' }}>متبقٍ {remaining} رسالة اليوم</div>
          )}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--border-default)' }}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
              placeholder="اسأل عن هذه الصفحة أو أي شيء في مدار..." aria-label="رسالتك لمدار"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: 13, outline: 'none' }}
            />
            <button type="button" onClick={() => void send()} disabled={sending} aria-label="إرسال"
              style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--pri-bg)', color: 'var(--pri-fg)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            ><Send size={15} /></button>
          </div>
        </div>
      )}
      {!open && (
        <button type="button" className="sc-launch dv2-chat-launcher" aria-label="اسأل مدار" onClick={() => setOpen(true)}>
          <Sparkles size={18} /><span>اسأل مدار</span>
        </button>
      )}
    </div>
  )
}
