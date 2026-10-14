import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, PlayCircle, Sparkles, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { RELEASES, type Release } from '@/dashboard/whatsNew'
import type { ModuleId } from '@/dashboard/modules'
import './whatsNew.css'

/** Holds the id of the newest release this browser has seen. */
export const WHATS_NEW_SEEN_KEY = 'madar_whatsnew_seen'
const OPEN_EVENT = 'madar:whatsnew-open'
const SEEN_EVENT = 'madar:whatsnew-seen'

/** Pages behind a module: hide the "details" link when the company lacks it. */
const LINK_MODULE: Record<string, ModuleId> = {
  'agent-analytics': 'voice',
  'call-logs': 'voice',
  conversations: 'conversations',
  'knowledge-base': 'knowledge_base',
  bookings: 'bookings',
  tickets: 'tickets',
}

function readSeen(): string | null {
  try { return localStorage.getItem(WHATS_NEW_SEEN_KEY) } catch { return null }
}
function markSeen() {
  const newest = RELEASES[0]?.id
  if (!newest) return
  try { localStorage.setItem(WHATS_NEW_SEEN_KEY, newest) } catch { /* private mode: the dot just stays */ }
  window.dispatchEvent(new Event(SEEN_EVENT))
}

export function openWhatsNew() { window.dispatchEvent(new Event(OPEN_EVENT)) }

function subscribeSeen(cb: () => void) {
  window.addEventListener(SEEN_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => { window.removeEventListener(SEEN_EVENT, cb); window.removeEventListener('storage', cb) }
}

/** True while there's a release newer than the last one seen. */
export function useWhatsNewUnread() {
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => null)
  return RELEASES.length > 0 && seen !== RELEASES[0].id
}

const DATE_FMT = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })
function fmtDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? iso : DATE_FMT.format(d)
}

function ReleaseMedia({ item }: { item: Release }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [item.id])
  if (item.video && !failed) {
    return (
      <video
        key={item.id}
        className="wn-video"
        controls
        playsInline
        preload="metadata"
        poster={item.poster}
        onError={() => setFailed(true)}
      >
        <source src={item.video} onError={() => setFailed(true)} />
      </video>
    )
  }
  return (
    <div className="wn-poster" style={item.poster ? { backgroundImage: `url(${item.poster})` } : undefined}>
      <div className="wn-poster-glow" aria-hidden="true" />
      <div className="wn-poster-msg">
        <PlayCircle size={34} strokeWidth={1.5} />
        <span>الفيديو قريبًا</span>
      </div>
    </div>
  )
}

/**
 * "ما الجديد في مدار": a centred popup with the latest releases and a short video each.
 * Opens by itself once per release (newest id stored in localStorage) after the account
 * loads, never on the sales demo unless the URL has ?whatsnew=1. openWhatsNew() reopens it.
 */
export function WhatsNew({ base }: { base: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDemo, accountLoading, companyId, hasModule } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const autoTried = useRef(false)
  const doneRef = useRef<HTMLButtonElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  const show = useCallback(() => {
    lastFocus.current = document.activeElement as HTMLElement | null
    setIndex(0)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    markSeen()
    lastFocus.current?.focus?.()
  }, [])

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, show)
    return () => window.removeEventListener(OPEN_EVENT, show)
  }, [show])

  // Auto-open once per release, after the account has loaded.
  useEffect(() => {
    if (autoTried.current || RELEASES.length === 0) return
    const forced = new URLSearchParams(location.search).get('whatsnew') === '1'
    if (isDemo) {
      autoTried.current = true
      if (forced) show()
      return
    }
    if (accountLoading || !companyId) return
    autoTried.current = true
    // On a phone the popup would cover the page on every first visit; it stays one tap away in the menu.
    const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    if (forced || (!phone && readSeen() !== RELEASES[0].id)) {
      const t = window.setTimeout(show, 700)
      return () => window.clearTimeout(t)
    }
  }, [isDemo, accountLoading, companyId, location.search, show])

  useEffect(() => {
    if (!open) return
    doneRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      // RTL: the left arrow moves forward.
      if (e.key === 'ArrowLeft') setIndex((i) => Math.min(RELEASES.length - 1, i + 1))
      if (e.key === 'ArrowRight') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open || RELEASES.length === 0) return null
  const item = RELEASES[Math.min(index, RELEASES.length - 1)]
  const many = RELEASES.length > 1
  const linkModule = item.link ? LINK_MODULE[item.link.split(/[/?]/)[0]] : undefined
  const showLink = !!item.link && (!linkModule || hasModule(linkModule))

  // Portal into the dashboard scope so the tokens (and the theme) apply.
  const host = document.querySelector('.dv2-scope') || document.body
  return createPortal(
    <div className="wn-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="wn-modal" role="dialog" aria-modal="true" aria-labelledby="wn-title">
        <header className="wn-head">
          <span className="wn-kicker"><Sparkles size={14} /> ما الجديد في مدار</span>
          <button type="button" className="wn-x" onClick={close} aria-label="إغلاق"><X size={18} /></button>
        </header>

        <div className="wn-media" key={item.id}><ReleaseMedia item={item} /></div>

        <div className="wn-body" key={`b-${item.id}`}>
          <div className="wn-meta">
            {index === 0 && <span className="wn-new">جديد</span>}
            <time dateTime={item.date}>{fmtDate(item.date)}</time>
          </div>
          <h2 id="wn-title" className="wn-title">{item.title}</h2>
          <p className="wn-desc">{item.description}</p>
          {showLink && (
            <button type="button" className="wn-link" onClick={() => { close(); navigate(`${base}/${item.link}`) }}>
              ما فهمت؟ شوف التفاصيل <ArrowLeft size={14} />
            </button>
          )}
        </div>

        <footer className="wn-foot">
          {many ? (
            <div className="wn-pager">
              <button type="button" className="wn-ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
                <ChevronRight size={15} /> السابق
              </button>
              <div className="wn-dots" role="tablist" aria-label="التحديثات">
                {RELEASES.map((r, i) => (
                  <button
                    key={r.id} type="button" role="tab" aria-selected={i === index} aria-label={r.title}
                    className={i === index ? 'is-on' : undefined} onClick={() => setIndex(i)}
                  />
                ))}
              </div>
              <button type="button" className="wn-ghost" onClick={() => setIndex((i) => Math.min(RELEASES.length - 1, i + 1))} disabled={index === RELEASES.length - 1}>
                التالي <ChevronLeft size={15} />
              </button>
            </div>
          ) : <span />}
          <button type="button" ref={doneRef} className="wn-done" onClick={close}>تم</button>
        </footer>
      </div>
    </div>,
    host,
  )
}
