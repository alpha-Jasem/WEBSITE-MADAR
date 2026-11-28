import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { pageGuideFor } from '@/dashboard/pageGuide'
import { GlassOrb } from './GlassOrb'
import { useOnOpenSupportRequest } from './shellActions'

// «اسأل مدار»: the glass orb in the corner. It knows which page the customer is on, greets them for it,
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
  const [hover, setHover] = useState(false)
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
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

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

  return (
    <div className="dv2-floating" style={{ position: 'fixed', bottom: 18, left: 18, zIndex: 1400 }}>
      <style>{`
        @keyframes sc-pop { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
        @keyframes sc-breathe { 50% { transform: scale(1.18); opacity: .85; } }
        @keyframes sc-dot { 0%,80%,100% { transform: translateY(0); opacity: .3; } 40% { transform: translateY(-4px); opacity: 1; } }
        .sc-panel { position: relative; width: min(390px, calc(100vw - 40px)); height: min(560px, calc(100dvh - 150px)); margin-bottom: 14px; display: flex; flex-direction: column; border-radius: 26px; overflow: hidden;
          background: rgba(16,18,34,.84); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); border: 1px solid rgba(255,255,255,.14); color: #f2f4ff;
          box-shadow: 0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1); transform-origin: bottom left; animation: sc-pop .3s cubic-bezier(.2,.9,.3,1.2) both; }
        .sc-panel::before { content: ""; position: absolute; inset: -30% -10% auto; height: 60%; background: radial-gradient(closest-side, rgba(34,211,238,.45), transparent), radial-gradient(closest-side at 85% 50%, rgba(124,92,255,.5), transparent); filter: blur(22px); opacity: .55; pointer-events: none; }
        .sc-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 14px 16px 6px; }
        .sc-head b { font-weight: 800; font-size: 17px; display: block; } .sc-head small { color: #c9ccdf; font-size: 12px; }
        .sc-x { margin-inline-start: auto; width: 32px; height: 32px; border-radius: 10px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: inherit; cursor: pointer; }
        .sc-where { position: relative; margin: 6px 16px 0; align-self: flex-start; font-size: 12px; padding: 4px 11px; border-radius: 99px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: #e6e8f5; }
        .sc-msgs { position: relative; flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding: 14px; }
        .sc-m { max-width: 86%; padding: 10px 13px; border-radius: 16px; font-size: 13.5px; line-height: 1.8; white-space: pre-wrap; }
        .sc-m.bot { align-self: flex-start; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.08); }
        .sc-m.me { align-self: flex-end; color: #fff; background: linear-gradient(135deg, #22d3ee, #5a7bff 55%, #9b4dff); }
        .sc-note { text-align: center; font-size: 11.5px; color: #9aa0c4; }
        .sc-dots { display: inline-flex; gap: 4px; padding: 6px 2px; } .sc-dots i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .4; animation: sc-dot 1s infinite; } .sc-dots i:nth-child(2) { animation-delay: .15s; } .sc-dots i:nth-child(3) { animation-delay: .3s; }
        .sc-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .sc-chip { border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.06); color: inherit; border-radius: 99px; padding: 7px 13px; font: inherit; font-size: 12.5px; cursor: pointer; transition: transform .15s, background .15s; }
        .sc-chip:hover { background: rgba(34,211,238,.28); transform: translateY(-2px); }
        .sc-in { position: relative; display: flex; gap: 8px; padding: 12px; border-top: 1px solid rgba(255,255,255,.12); }
        .sc-in input { flex: 1; min-width: 0; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); border-radius: 14px; padding: 10px 14px; color: #f2f4ff; font: inherit; font-size: 13.5px; }
        .sc-in input::placeholder { color: #9aa0c4; }
        .sc-send { width: 44px; border: 0; border-radius: 14px; color: #fff; cursor: pointer; background: linear-gradient(135deg, #22d3ee, #5a7bff 55%, #9b4dff); display: grid; place-items: center; }
        .sc-launch { display: flex; align-items: center; gap: 2px; flex-direction: row-reverse; border: 0; background: none; padding: 0; cursor: pointer; color: inherit; font: inherit; }
        .sc-orb { position: relative; width: 56px; height: 56px; transition: transform .35s cubic-bezier(.3,1.5,.5,1); }
        .sc-launch:hover .sc-orb { transform: scale(1.08); }
        .sc-halo { position: absolute; inset: 6px; border-radius: 50%; filter: blur(12px); opacity: .6; background: radial-gradient(circle, #22d3ee, #7c5cff 70%); animation: sc-breathe 4s ease-in-out infinite; }
        .sc-orb > canvas { position: relative; z-index: 1; }
        .sc-launch:focus-visible, .sc-chip:focus-visible, .sc-x:focus-visible, .sc-send:focus-visible, .sc-in input:focus-visible { outline: 3px solid #7aa2ff; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .sc-panel { animation: none; } .sc-halo, .sc-dots i { animation: none; } }
      `}</style>

      {open && (
        <div className="sc-panel" role="dialog" aria-label="اسأل مدار">
          <div className="sc-head">
            <GlassOrb size={40} energy={sending ? 1 : 0.6} />
            <div><b>اسأل مدار</b><small>مرشدك في لوحة التحكم</small></div>
            <button type="button" className="sc-x" onClick={() => setOpen(false)} aria-label="إغلاق">✕</button>
          </div>
          <div className="sc-where">أنت الآن في: {guide.title}</div>
          <div ref={scrollRef} className="sc-msgs">
            <div className="sc-m bot">{`أهلًا! أنا مدار، أساعدك في أي صفحة.\nأنت الآن في «${guide.title}»: ${guide.about}`}</div>
            {messages.map((m, i) => m.role === 'note'
              ? <div key={i} className="sc-note">{m.content}</div>
              : <div key={i} className={`sc-m ${m.role === 'user' ? 'me' : 'bot'}`}>{m.content}</div>)}
            {sending && <div className="sc-m bot"><span className="sc-dots"><i /><i /><i /></span></div>}
            {!askedHere && !sending && (
              <div className="sc-chips">{guide.ask.map((q) => <button key={q} type="button" className="sc-chip" onClick={() => void send(q)}>{q}</button>)}</div>
            )}
          </div>
          {remaining != null && remaining < 15 && <div style={{ position: 'relative', fontSize: 10.5, color: '#ffb547', padding: '0 14px 6px', textAlign: 'center' }}>متبقٍ {remaining} رسالة اليوم</div>}
          <div className="sc-in">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
              placeholder="اسأل عن هذه الصفحة أو أي شيء في مدار..." aria-label="رسالتك لمدار" />
            <button type="button" className="sc-send" onClick={() => void send()} disabled={sending} aria-label="إرسال"><Send size={16} /></button>
          </div>
        </div>
      )}

      {!open && (
        <button type="button" className="sc-launch dv2-chat-launcher" aria-label="اسأل مدار" onClick={() => setOpen(true)}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
          <span className="sc-orb"><span className="sc-halo" /><GlassOrb size={56} energy={hover ? 0.7 : 0} /></span>
        </button>
      )}
    </div>
  )
}
