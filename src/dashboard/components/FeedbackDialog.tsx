import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { MADAR_WHATSAPP_NUMBER } from '@/lib/constants'
import { useToast } from './uiExtras'
import { usePresence } from './ShellMenu'

/*
 * "ملاحظات": a short note to the Madar team. There is no feedback table, so sending
 * opens the existing WhatsApp support chat with the note filled in (nothing is stored
 * here), then thanks the person. Same fade + scale(.95 → 1) keyframes as the menus.
 */

export const FEEDBACK_CSS = `
  .fb-scrim { position: fixed; inset: 0; z-index: 1420; background: var(--scrim); }
  @keyframes fb-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fb-fade-out { from { opacity: 1; } to { opacity: 0; } }
  .fb-scrim[data-state="open"] { animation: fb-fade-in .15s ease both; }
  .fb-scrim[data-state="closed"] { animation: fb-fade-out .15s ease both; }
  .fb-wrap { position: fixed; inset: 0; z-index: 1421; display: grid; place-items: start center; padding: 12vh 16px 16px; pointer-events: none; }
  .fb-card { pointer-events: auto; width: min(440px, 100%); box-sizing: border-box; border-radius: 12px; background: var(--panel); color: var(--ink);
    box-shadow: 0 0 0 1px var(--sm-ring, rgba(0,0,0,.06)), 0 1px 2px rgba(0,0,0,.06), 0 24px 48px -16px rgba(0,0,0,.35); padding: 16px; font-family: var(--font-body); }
  .fb-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .fb-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .fb-sub { margin: 0 0 12px; font-size: 13px; color: var(--muted); line-height: 1.6; }
  .fb-text { width: 100%; min-height: 120px; resize: vertical; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--line-2); padding: 10px 12px;
    font: inherit; font-size: 14px; line-height: 1.6; background: var(--abyss) !important; color: var(--ink); }
  .fb-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  .fb-btn { height: 36px; padding: 0 14px; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid var(--line);
    background: var(--panel); color: var(--ink); transition: background-color 150ms cubic-bezier(.4,0,.2,1), opacity 150ms !important; }
  .fb-btn:hover { background: var(--hover-bg-strong, var(--hover-bg)); }
  .fb-btn.is-pri { background: var(--pri-bg); color: var(--pri-fg); border-color: transparent; }
  .fb-btn.is-pri:hover:not(:disabled) { background: var(--pri-hover); }
  .fb-btn:disabled { opacity: .45; cursor: default; }
  .fb-x { width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: var(--muted); display: grid; place-items: center; cursor: pointer; }
  .fb-x:hover { background: var(--hover-bg); color: var(--ink); }
`

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { companyName } = useWorkspace()
  const pushToast = useToast()
  const { mounted, state, onAnimationEnd } = usePresence(open)
  const [text, setText] = useState('')
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => { setRoot(document.querySelector<HTMLElement>('.dv2-app') || document.body) }, [])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => areaRef.current?.focus())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(id); document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  function send() {
    const body = text.trim()
    if (!body) return
    const msg = `ملاحظات على لوحة مدار${companyName ? ` (${companyName})` : ''}:\n${body}`
    window.open(`https://wa.me/${MADAR_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
    pushToast({ kind: 'success', title: 'شكرًا على ملاحظاتك', description: 'انفتحت رسالتك في واتساب، أرسلها وتوصل لفريق مدار.' })
    setText('')
    onClose()
  }

  if (!root || !mounted) return null
  return createPortal(
    <>
      <div className="fb-scrim" data-state={state} onClick={onClose} />
      <div className="fb-wrap">
        <div
          className="fb-card sm-anim" data-state={state} onAnimationEnd={onAnimationEnd}
          role="dialog" aria-modal="true" aria-labelledby="fb-title" dir="rtl"
        >
          <div className="fb-head">
            <h2 id="fb-title">ملاحظاتك تهمنا</h2>
            <button type="button" className="fb-x" onClick={onClose} aria-label="إغلاق"><X size={17} /></button>
          </div>
          <p className="fb-sub">وش عجبك، وش ناقص، أو وش تبي نضيف؟ تنفتح رسالتك في واتساب جاهزة لفريق مدار.</p>
          <textarea
            ref={areaRef} className="fb-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب ملاحظتك هنا..."
            aria-label="الملاحظة" maxLength={2000}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
          />
          <div className="fb-foot">
            <button type="button" className="fb-btn" onClick={onClose}>إلغاء</button>
            <button type="button" className="fb-btn is-pri" onClick={send} disabled={!text.trim()}>إرسال</button>
          </div>
        </div>
      </div>
    </>,
    root,
  )
}
