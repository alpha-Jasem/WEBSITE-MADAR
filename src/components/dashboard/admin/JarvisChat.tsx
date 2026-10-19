import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { McIcon } from './mcIcons'

interface Msg { role: 'user' | 'assistant'; content: string; changes?: string[]; error?: boolean }

// Minimal typing for the browser speech API (not in lib.dom for every target).
interface SpeechRec { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void }
const speechCtor = (): (new () => SpeechRec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// Jarvis follows what the owner says and edits the dashboard accordingly (tasks, goal, deals, follow-ups, notes).
export function JarvisChat({ onChanged, context, compact, suggestions }: { onChanged: () => void; context?: { lead_name: string; lead_phone?: string; on_call?: boolean }; compact?: boolean; suggestions?: string[] }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const canSpeak = typeof window !== 'undefined' && !!speechCtor()

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])
  useEffect(() => () => { recRef.current?.stop() }, [])

  const send = async (raw?: string) => {
    const message = (raw ?? text).trim()
    if (!message || busy) return
    setText('')
    const history = msgs.filter(m => !m.error).slice(-10).map(m => ({ role: m.role, content: m.content }))
    setMsgs(m => [...m, { role: 'user', content: message }])
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('jarvis-command', { body: { message, history, context } })
    setBusy(false)
    if (error || !data?.reply) {
      setMsgs(m => [...m, { role: 'assistant', content: 'ما قدرت أتصل بالخادم. تأكد من الإنترنت وحاول مرة ثانية.', error: true }])
      return
    }
    setMsgs(m => [...m, { role: 'assistant', content: data.reply as string, changes: data.changes as string[] | undefined, error: !!data.error }])
    if ((data.changes as string[] | undefined)?.length) onChanged()
  }

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return }
    const Ctor = speechCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'ar-SA'
    rec.interimResults = false
    rec.onresult = e => {
      const said = Array.from(e.results).map(r => r[0]?.transcript ?? '').join(' ').trim()
      if (said) void send(said)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <div className={`mc-jc ${compact ? 'mc-jc-compact' : ''}`}>
      {msgs.length > 0 && (
        <div className="mc-jc-log" role="log" aria-live="polite">
          {msgs.slice(-6).map((m, i) => (
            <div key={i} className={`mc-jc-m ${m.role === 'user' ? 'mc-u' : 'mc-a'} ${m.error ? 'mc-e' : ''}`}>
              <span>{m.content}</span>
              {m.changes && m.changes.length > 0 && (
                <ul>{m.changes.map((c, j) => <li key={j}>{c}</li>)}</ul>
              )}
            </div>
          ))}
          {busy && <div className="mc-jc-m mc-a"><span className="mc-jc-dots"><i /><i /><i /></span></div>}
          <div ref={endRef} />
        </div>
      )}
      {suggestions && msgs.length === 0 && (
        <div className="mc-chips">{suggestions.map(x => <button key={x} type="button" className="mc-chipbtn" onClick={() => void send(x)}>{x}</button>)}</div>
      )}
      <form className="mc-jc-in" onSubmit={e => { e.preventDefault(); void send() }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={context ? `قل لجارفيس عن ${context.lead_name}… مثل: ذكرني بكرة` : 'قل لجارفيس… مثل: أضف مهمة اتصل بالنخبة بكرة 4 العصر'} aria-label="اكتب لجارفيس" maxLength={600} disabled={busy} />
        {canSpeak && (
          <button type="button" className={`mc-jc-mic ${listening ? 'mc-on' : ''}`} onClick={toggleMic} aria-label={listening ? 'إيقاف التسجيل' : 'تحدّث لجارفيس'} aria-pressed={listening}>
            <McIcon name="mic" size={18} />
          </button>
        )}
        <button type="submit" className="mc-jc-send" disabled={busy || !text.trim()} aria-label="إرسال"><McIcon name="arrow" size={18} /></button>
      </form>
    </div>
  )
}
