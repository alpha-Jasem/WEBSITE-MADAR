import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  PanelRight, Search, Sparkles, MessageSquareText, BookOpen, Gift, Keyboard, MessageCircle, Link2, ExternalLink,
} from 'lucide-react'
import { NotificationCenter } from './NotificationCenter'
import { AccountMenu, ACCOUNT_MENU_CSS, type ThemePref } from './AccountMenu'
import { ShellMenu, SHELL_MENU_CSS, type MenuEntry } from './ShellMenu'
import { USAGE_RING_CSS } from './UsageRingAvatar'
import { FeedbackDialog, FEEDBACK_CSS } from './FeedbackDialog'
import { TopProgressBar, Tooltip, requestOpenSearch, useToast } from './uiExtras'
import { requestOpenShortcuts, requestOpenSupport, useShellPrimary } from './shellActions'
import { openWhatsNew, useWhatsNewUnread } from './WhatsNew'
import { MADAR_WHATSAPP_NUMBER } from '@/lib/constants'

const SUPPORT_WHATSAPP = `https://wa.me/${MADAR_WHATSAPP_NUMBER}`
const EASE_STD = 'cubic-bezier(.4,0,.2,1)'

export const TOPBAR_CSS = `
  .dv2-top { position: sticky; top: 0; z-index: 30; flex: none; isolation: isolate;
    border-bottom: 1px solid var(--line); padding: env(safe-area-inset-top, 0px) 20px 0 16px; min-height: 62px; box-sizing: border-box;
    display: flex; align-items: center; gap: 8px; }
  /* the blur lives on a layer behind the bar, so the bar itself never becomes the
     containing block of the fixed overlays that open from it */
  .dv2-top::before { content: ''; position: absolute; inset: 0; z-index: -1; background: var(--topbar-bg);
    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  .dv2-top-start { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1 1 auto; }
  .dv2-title { display: grid; min-width: 0; font-size: 16px; font-weight: 500; color: var(--ink); line-height: 1.3; }
  .dv2-title > span { grid-area: 1 / 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .dv2-top-actions { display: flex; align-items: center; gap: 8px; flex: none; }

  .dv2-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent; display: grid;
    place-items: center; position: relative; color: var(--muted); cursor: pointer; padding: 0; flex: none;
    transition: background-color 150ms ${EASE_STD}, color 150ms ${EASE_STD}, border-color 150ms ${EASE_STD} !important; }
  .dv2-icon-btn svg { width: 18px; height: 18px; }
  .dv2-icon-btn:hover, .dv2-icon-btn[aria-expanded="true"] { color: var(--ink); background: var(--hover-bg); }
  .dv2-toggle svg { transition: transform 180ms ${EASE_STD} !important; }
  .dv2-toggle.is-collapsed svg { transform: scaleX(-1); }

  /* end-side pills and the bell: 40px, hairline border, radius 10 */
  .dv2-pill { height: 40px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--ink);
    display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; font: inherit; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap; flex: none; position: relative; box-sizing: border-box;
    transition: background-color 150ms ${EASE_STD}, border-color 150ms ${EASE_STD}, color 150ms ${EASE_STD} !important; }
  .dv2-pill svg { width: 17px; height: 17px; flex: none; }
  .dv2-pill:hover, .dv2-pill[aria-expanded="true"] { background: var(--panel-2); border-color: var(--line-2); }
  .dv2-scope[data-theme="light"] .dv2-pill { background: #fff; }
  .dv2-scope[data-theme="light"] .dv2-pill:hover, .dv2-scope[data-theme="light"] .dv2-pill[aria-expanded="true"] { background: var(--panel-2); }
  .dv2-pill.is-ai svg { color: var(--sky); }
  .dv2-pill .dv2-pill-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sky); flex: none; animation: dv2-dot-in 240ms ${EASE_STD} both; }
  /* like the reference: text-only pills on wide screens, icon-only below 1100px */
  .dv2-pill .dv2-pill-ico-narrow { display: none; }
  .sm-trail .dv2-pill-dot { display: block; width: 7px; height: 7px; border-radius: 50%; background: var(--sky); }
  .dv2-top-end .dv2-icon-btn { width: 40px; height: 40px; border-radius: 10px; border-color: var(--line); background: var(--panel); color: var(--ink); }
  .dv2-scope[data-theme="light"] .dv2-top-end .dv2-icon-btn { background: #fff; }
  .dv2-top-end .dv2-icon-btn:hover, .dv2-top-end .dv2-icon-btn[aria-expanded="true"] { background: var(--panel-2); border-color: var(--line-2); }
  .dv2-udot { position: absolute; top: 8px; inset-inline-end: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--sky);
    box-shadow: 0 0 0 2px var(--panel); pointer-events: none; animation: dv2-dot-in 240ms ${EASE_STD} both; }
  .dv2-scope[data-theme="light"] .dv2-udot { box-shadow: 0 0 0 2px #fff; }
  @keyframes dv2-dot-in { from { transform: scale(0); } 60% { transform: scale(1.15); } to { transform: scale(1); } }

  .dv2-pri { height: 40px; border-radius: 10px; border: 0; background: var(--pri-bg); color: var(--pri-fg); display: inline-flex; align-items: center;
    gap: 7px; padding: 0 14px; font: inherit; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; flex: none;
    transition: background-color 150ms ${EASE_STD}, opacity 150ms ${EASE_STD} !important; }
  .dv2-pri svg { width: 16px; height: 16px; }
  .dv2-pri:hover:not(:disabled) { background: var(--pri-hover); }
  .dv2-pri:disabled { opacity: .45; cursor: default; }
  .dv2-sep { width: 1px; height: 22px; background: var(--line); flex: none; margin: 0 2px; }

  @media (max-width: 1100px) {
    .dv2-pill .dv2-pill-label { display: none; }
    .dv2-pill .dv2-pill-ico-narrow { display: block; }
    .dv2-pill { width: 40px; padding: 0; }
    .dv2-pill .dv2-pill-dot { position: absolute; top: 8px; inset-inline-end: 9px; }
  }
  @media (max-width: 900px) {
    .dv2-top { padding: env(safe-area-inset-top, 0px) 10px 0 8px; min-height: 56px; gap: 6px; }
    .dv2-top-actions { gap: 6px; }
    .dv2-title { font-size: 15.5px; font-weight: 600; }
    .dv2-top-wide { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dv2-toggle svg, .dv2-pill, .dv2-icon-btn, .dv2-pri { transition: none !important; }
    .dv2-udot, .dv2-pill .dv2-pill-dot { animation: none; }
  }
` + SHELL_MENU_CSS + ACCOUNT_MENU_CSS + USAGE_RING_CSS + FEEDBACK_CSS

/**
 * The dashboard top bar, after a console-style workspace bar.
 * Start: sidebar toggle and the page title. End: the page's one primary action (if it
 * set one), «ما الجديد» (when there's news), «ملاحظات», «الدليل», «اسأل مدار», the bell
 * and the account button (orb inside a plan-usage ring).
 */
export function TopBar({ base, routeKey, pageTitle, hasPageNews, themePref, onThemeChange, sidebarCollapsed, onToggleSidebar }: {
  base: string
  routeKey: string
  pageTitle: string
  /** The current page has an entry in "ما الجديد". */
  hasPageNews: boolean
  themePref: ThemePref
  onThemeChange: (pref: ThemePref) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const pushToast = useToast()
  const primary = useShellPrimary()
  const unread = useWhatsNewUnread()
  const reduced = !!useReducedMotion()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideViaKey, setGuideViaKey] = useState(false)
  const guideRef = useRef<HTMLButtonElement>(null)
  const closeGuide = useCallback((returnFocus: boolean) => {
    setGuideOpen(false)
    if (returnFocus) guideRef.current?.focus({ preventScroll: true })
  }, [])
  const closeFeedback = useCallback(() => setFeedbackOpen(false), [])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      pushToast({ kind: 'success', title: 'تم نسخ الرابط' })
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر نسخ الرابط' })
    }
  }

  const guideItems: MenuEntry[] = [
    { kind: 'item', id: 'news', label: 'ما الجديد في مدار', icon: <Gift />, onSelect: openWhatsNew, trailing: unread ? <i className="dv2-pill-dot" aria-label="جديد" /> : undefined },
    { kind: 'item', id: 'keys', label: 'اختصارات لوحة المفاتيح', icon: <Keyboard />, onSelect: requestOpenShortcuts },
    { kind: 'item', id: 'ask', label: 'اسأل مدار', icon: <Sparkles />, onSelect: requestOpenSupport },
    { kind: 'item', id: 'wa', label: 'الدعم عبر واتساب', icon: <MessageCircle />, onSelect: () => window.open(SUPPORT_WHATSAPP, '_blank', 'noopener,noreferrer') },
    { kind: 'sep', id: 's1' },
    { kind: 'item', id: 'copy', label: 'نسخ رابط الصفحة', icon: <Link2 />, onSelect: () => { void copyLink() } },
    { kind: 'item', id: 'tab', label: 'فتح في تبويب جديد', icon: <ExternalLink />, onSelect: () => window.open(window.location.href, '_blank', 'noopener') },
  ]

  const showNews = unread || hasPageNews

  return (
    <header className="dv2-top">
      <TopProgressBar triggerKey={routeKey} />
      <div className="dv2-top-start">
        <Tooltip label={sidebarCollapsed ? 'إظهار القائمة' : 'إخفاء القائمة'} side="bottom">
          <button type="button" className={`dv2-icon-btn dv2-toggle${sidebarCollapsed ? ' is-collapsed' : ''}`} onClick={onToggleSidebar} aria-label="القائمة الجانبية" aria-pressed={!sidebarCollapsed}>
            <PanelRight />
          </button>
        </Tooltip>
        <div className="dv2-title" aria-current="page">
          <AnimatePresence initial={false}>
            <motion.span
              key={pageTitle}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.15, ease: [0.4, 0, 0.2, 1] }}
            >{pageTitle}</motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="dv2-top-actions dv2-top-end">
        {primary && (
          <span className="dv2-top-wide" style={{ display: 'contents' }}>
            <button type="button" className="dv2-pri" onClick={primary.onClick} disabled={primary.disabled}>
              {primary.icon}{primary.label}
            </button>
            <span className="dv2-sep" />
          </span>
        )}
        <span className="dv2-top-wide" style={{ display: 'contents' }}>
          {showNews && (
            <button type="button" className="dv2-pill" onClick={openWhatsNew} aria-label={unread ? 'ما الجديد — تحديثات جديدة' : 'ما الجديد'}>
              <Gift className={unread ? 'dv2-pill-ico-narrow' : undefined} />
              {unread && <i className="dv2-pill-dot" />}
              <span className="dv2-pill-label">ما الجديد</span>
            </button>
          )}
          <button type="button" className="dv2-pill" onClick={() => setFeedbackOpen(true)} aria-haspopup="dialog" aria-expanded={feedbackOpen} aria-label="ملاحظات">
            <MessageSquareText className="dv2-pill-ico-narrow" /><span className="dv2-pill-label">ملاحظات</span>
          </button>
          <button
            ref={guideRef} type="button" className="dv2-pill" aria-haspopup="menu" aria-expanded={guideOpen} aria-label="الدليل"
            onClick={(e) => { setGuideViaKey(e.detail === 0); setGuideOpen((v) => !v) }}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setGuideViaKey(true); setGuideOpen(true) } }}
          >
            <BookOpen className="dv2-pill-ico-narrow" /><span className="dv2-pill-label">الدليل</span>
          </button>
          <button type="button" className="dv2-pill is-ai" onClick={requestOpenSupport} aria-label="اسأل مدار">
            <Sparkles /><span className="dv2-pill-label">اسأل مدار</span>
          </button>
        </span>
        <button type="button" className="dv2-icon-btn dv2-mobile-only" onClick={() => requestOpenSearch()} aria-label="بحث"><Search /></button>
        <NotificationCenter />
        <AccountMenu base={base} themePref={themePref} onThemeChange={onThemeChange} />
      </div>

      <ShellMenu open={guideOpen} anchorRef={guideRef} onClose={closeGuide} items={guideItems} label="الدليل" width={248} focusFirst={guideViaKey} />
      <FeedbackDialog open={feedbackOpen} onClose={closeFeedback} />
    </header>
  )
}
