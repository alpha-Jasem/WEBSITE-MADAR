import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, Send, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { pageGuideFor } from '@/dashboard/pageGuide'
import { GlassOrb } from './GlassOrb'
import { useOnOpenSupportRequest } from './shellActions'

// «اسأل مدار»: the glass orb in the corner. It knows which page the customer is on, opens on a welcome screen
// with questions for that page, and answers with the page in mind. Replies are plain text, not heavy bubbles.
// The window grows out of the orb when it opens and shrinks back into it when it closes.

interface ChatMessage {
  role: 'user' | 'assistant' | 'note'
  content: string
}

const CLOSE_MS = 240

export function SupportChat() {
  const location = useLocation()
  const { companyId, isDemo } = useWorkspace()
  const guide = pageGuideFor(location.pathname)
  const [open, setOpen] = useState(false)
  // The window stays in the page while it plays its closing animation.
  const [mounted, setMounted] = useState(false)
  const [hover, setHover] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  // The question cards show until the customer asks something on the current page.
  const [askedHere, setAskedHere] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastTitle = useRef(guide.title)
  const closeTimer = useRef<number>(0)

  const openChat = useCallback(() => { window.clearTimeout(closeTimer.current); setMounted(true); setOpen(true) }, [])
  const closeChat = useCallback(() => {
    setOpen(false)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setMounted(false), CLOSE_MS)
  }, [])
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  useOnOpenSupportRequest(openChat)

  // Moving to another page: say so in the chat (once there is a conversation) and offer that page's questions.
  useEffect(() => {
    if (lastTitle.current === guide.title) return
    lastTitle.current = guide.title
    setAskedHere(false)
    setMessages((m) => (m.length ? [...m, { role: 'note', content: `انتقلت إلى «${guide.title}»` }] : m))
  }, [guide.title])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeChat() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeChat])

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

  const welcome = messages.length === 0
  const cards = !askedHere && !sending && (
    <div className="sc-cards">
      {guide.ask.map((q) => (
        <button key={q} type="button" className="sc-card" onClick={() => void send(q)}>
          <i aria-hidden="true">?</i><span>{q}</span><ArrowLeft size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="dv2-floating" style={{ position: 'fixed', bottom: 18, left: 18, zIndex: 1400 }}>
      <style>{`
        @keyframes sc-in { from { opacity: 0; transform: translateY(18px) scale(.82); } to { opacity: 1; transform: none; } }
        @keyframes sc-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(18px) scale(.82); } }
        @keyframes sc-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes sc-breathe { 50% { transform: scale(1.18); opacity: .85; } }
        @keyframes sc-dot { 0%,80%,100% { transform: translateY(0); opacity: .3; } 40% { transform: translateY(-4px); opacity: 1; } }
        .sc-panel { width: min(390px, calc(100vw - 36px)); height: min(580px, calc(100dvh - 110px)); margin-bottom: 14px; display: flex; flex-direction: column; border-radius: 24px; overflow: hidden;
          background: #0e1022; color: #f2f4ff; border: 1px solid #23284d; box-shadow: 0 30px 70px rgba(4,6,30,.65); transform-origin: bottom left;
          animation: sc-in ${CLOSE_MS + 60}ms cubic-bezier(.2,.85,.25,1.1) both; }
        .sc-panel.closing { animation: sc-out ${CLOSE_MS}ms cubic-bezier(.4,0,.8,.4) both; pointer-events: none; }
        .sc-panel .sc-hero > *, .sc-panel .sc-card { animation: sc-rise .45s cubic-bezier(.2,.8,.2,1) both; }
        .sc-panel .sc-hero > :nth-child(2) { animation-delay: .08s; } .sc-panel .sc-hero > :nth-child(3) { animation-delay: .14s; }
        .sc-panel .sc-card:nth-child(1) { animation-delay: .12s; } .sc-panel .sc-card:nth-child(2) { animation-delay: .18s; } .sc-panel .sc-card:nth-child(3) { animation-delay: .24s; }
        .sc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 14px 0; font-size: 12px; color: #8e95c0; }
        .sc-top button { border: 0; background: none; color: inherit; padding: 6px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; transition: background .15s, color .15s, transform .2s; }
        .sc-top button:hover { background: rgba(255,255,255,.08); color: #fff; transform: rotate(90deg); }
        .sc-top .mid { display: inline-flex; align-items: center; gap: 8px; min-width: 0; } .sc-top .mid b { color: #e4e7ff; font-size: 13px; font-weight: 700; }
        .sc-hero { text-align: center; padding: 6px 22px 8px; display: grid; justify-items: center; gap: 6px; }
        .sc-hero .o { position: relative; width: 84px; height: 84px; }
        .sc-hero .o::before { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: radial-gradient(circle, #22d3ee, #7c5cff 70%); filter: blur(18px); opacity: .55; animation: sc-breathe 4s ease-in-out infinite; }
        .sc-hero .o canvas { position: relative; }
        .sc-hero h3 { margin: 4px 0 0; font-weight: 900; font-size: 22px; } .sc-hero p { margin: 0; color: #9aa0c4; font-size: 13px; line-height: 1.8; }
        .sc-body { flex: 1; overflow-y: auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 14px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.16) transparent; }
        .sc-cards { display: grid; gap: 10px; align-content: start; }
        .sc-card { display: flex; align-items: center; gap: 12px; text-align: start; width: 100%; padding: 13px 14px; border-radius: 16px; background: #151833; border: 1px solid #262b55; color: inherit; font: inherit; font-size: 13.5px; cursor: pointer; transition: border-color .15s, transform .15s; }
        .sc-card:hover { border-color: #5a7bff; transform: translateX(-3px); }
        .sc-card i { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; flex: none; background: linear-gradient(135deg, rgba(34,211,238,.2), rgba(155,77,255,.27)); font-style: normal; font-weight: 700; color: #bfe9ff; }
        .sc-card svg { margin-inline-start: auto; color: #6d75a8; flex: none; }
        .sc-you, .sc-ans, .sc-note { animation: sc-rise .35s cubic-bezier(.2,.8,.2,1) both; }
        .sc-you { align-self: flex-end; max-width: 90%; background: #1f2450; border-radius: 14px; padding: 8px 13px; font-size: 13.5px; line-height: 1.8; white-space: pre-wrap; }
        .sc-ans { display: grid; grid-template-columns: 22px 1fr; gap: 10px; font-size: 13.5px; line-height: 1.95; color: #e3e6fb; white-space: pre-wrap; }
        .sc-ans .av { width: 22px; height: 22px; border-radius: 50%; margin-top: 5px; background: conic-gradient(#22d3ee, #5a7bff, #9b4dff, #22d3ee); box-shadow: 0 0 12px rgba(90,123,255,.5); }
        .sc-note { text-align: center; font-size: 11.5px; color: #8e95c0; }
        .sc-dots { display: inline-flex; gap: 4px; padding: 8px 2px; } .sc-dots i { width: 6px; height: 6px; border-radius: 50%; background: #9fb4ff; opacity: .4; animation: sc-dot 1s infinite; } .sc-dots i:nth-child(2) { animation-delay: .15s; } .sc-dots i:nth-child(3) { animation-delay: .3s; }
        .sc-in { margin: 4px 14px 14px; display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 14px; background: #151833; border: 1px solid #2b3160; border-radius: 18px; transition: border-color .15s; }
        .sc-in:focus-within { border-color: #5a7bff; }
        .sc-in input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: #f2f4ff; font: inherit; font-size: 13.5px; padding: 8px 4px; }
        .sc-in input::placeholder { color: #7e86b6; }
        .sc-send { width: 38px; height: 38px; border: 0; border-radius: 12px; color: #fff; cursor: pointer; background: linear-gradient(135deg, #22d3ee, #5a7bff 55%, #9b4dff); display: grid; place-items: center; transition: transform .15s; }
        .sc-send:hover:not(:disabled) { transform: scale(1.06); } .sc-send:disabled { opacity: .55; cursor: default; }
        .sc-launch { position: absolute; left: 0; bottom: 0; display: flex; align-items: center; border: 0; background: none; padding: 0; cursor: pointer; color: inherit; font: inherit;
          transition: opacity .22s ease, transform .3s cubic-bezier(.3,1.4,.5,1); }
        .sc-launch.hide { opacity: 0; transform: scale(.5); pointer-events: none; }
        .sc-orb { position: relative; width: 56px; height: 56px; transition: transform .35s cubic-bezier(.3,1.5,.5,1); }
        .sc-launch:hover .sc-orb { transform: scale(1.08); }
        .sc-halo { position: absolute; inset: 6px; border-radius: 50%; filter: blur(12px); opacity: .6; background: radial-gradient(circle, #22d3ee, #7c5cff 70%); animation: sc-breathe 4s ease-in-out infinite; }
        .sc-orb > canvas { position: relative; z-index: 1; }
        .sc-launch:focus-visible, .sc-card:focus-visible, .sc-top button:focus-visible, .sc-send:focus-visible { outline: 3px solid #7aa2ff; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .sc-panel, .sc-panel.closing, .sc-panel *, .sc-launch, .sc-halo { animation: none !important; transition: none !important; } }
      `}</style>

      {mounted && (
        <div className={`sc-panel${open ? '' : ' closing'}`} role="dialog" aria-label="اسأل مدار">
          <div className="sc-top">
            {welcome
              ? <span>{guide.title}</span>
              : <span className="mid"><GlassOrb size={26} energy={sending ? 1 : 0.5} /><b>اسأل مدار</b><span>· {guide.title}</span></span>}
            <button type="button" onClick={closeChat} aria-label="إغلاق"><X size={16} /></button>
          </div>
          {welcome && (
            <div className="sc-hero">
              <span className="o"><GlassOrb size={84} energy={0.5} /></span>
              <h3>كيف أساعدك؟</h3>
              <p>أنت في «{guide.title}». اختر سؤالًا أو اكتب سؤالك.</p>
            </div>
          )}
          <div ref={scrollRef} className="sc-body">
            {welcome && cards}
            {messages.map((m, i) => m.role === 'note'
              ? <div key={i} className="sc-note">{m.content}</div>
              : m.role === 'user'
                ? <div key={i} className="sc-you">{m.content}</div>
                : <div key={i} className="sc-ans"><span className="av" /><div>{m.content}</div></div>)}
            {sending && <div className="sc-ans"><span className="av" /><span className="sc-dots"><i /><i /><i /></span></div>}
            {!welcome && cards}
          </div>
          {remaining != null && remaining < 15 && <div style={{ fontSize: 10.5, color: '#ffb547', padding: '0 14px 4px', textAlign: 'center' }}>متبقٍ {remaining} رسالة اليوم</div>}
          <div className="sc-in">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void send() }}
              placeholder="اكتب سؤالك…" aria-label="رسالتك لمدار" />
            <button type="button" className="sc-send" onClick={() => void send()} disabled={sending} aria-label="إرسال"><Send size={16} /></button>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <button type="button" className={`sc-launch dv2-chat-launcher${open ? ' hide' : ''}`} aria-label="اسأل مدار" tabIndex={open ? -1 : 0} onClick={openChat}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}>
          <span className="sc-orb"><span className="sc-halo" /><GlassOrb size={56} energy={hover ? 0.7 : 0} /></span>
        </button>
      </div>
    </div>
  )
}
