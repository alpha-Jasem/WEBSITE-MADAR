import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PanelRight, ChevronLeft, Ellipsis, Sun, Moon, Search, HelpCircle, AudioLines, Sparkles,
  Link2, Keyboard, Gift, MessageCircle, ExternalLink,
} from 'lucide-react'
import { NotificationCenter } from './NotificationCenter'
import { AccountMenu } from './AccountMenu'
import { TopProgressBar, Tooltip, requestOpenSearch, useToast } from './uiExtras'
import { requestOpenShortcuts, requestOpenSupport, useShellPrimary } from './shellActions'
import { openWhatsNew, useWhatsNewUnread } from './WhatsNew'

const SUPPORT_WHATSAPP = 'https://wa.me/966546666005'

export const TOPBAR_CSS = `
  .dv2-top { position: sticky; top: 0; z-index: 30; flex: none; background: var(--topbar-bg); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line); padding: env(safe-area-inset-top, 0px) 16px 0 20px; min-height: 52px; box-sizing: border-box;
    display: flex; align-items: center; gap: 6px; }
  .dv2-top-start { display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1 1 auto; }
  .dv2-crumbs { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13.5px; color: var(--dim); padding-inline-start: 4px; }
  .dv2-crumbs > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 200px; }
  .dv2-crumbs b { color: var(--ink); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dv2-crumbs svg { flex: none; color: var(--dim); opacity: .7; }
  .dv2-top-actions { display: flex; align-items: center; gap: 2px; flex: none; }
  .dv2-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent; display: grid;
    place-items: center; position: relative; color: var(--muted); cursor: pointer; padding: 0; flex: none; }
  .dv2-icon-btn svg { width: 17px; height: 17px; }
  .dv2-icon-btn:hover, .dv2-icon-btn[aria-expanded="true"] { color: var(--ink); background: var(--hover-bg); }
  .dv2-icon-btn.sm { width: 28px; height: 28px; }
  .dv2-icon-btn.sm svg { width: 16px; height: 16px; }
  .dv2-icon-btn.sm .dv2-udot { top: 3px; inset-inline-end: 3px; }
  .dv2-udot { position: absolute; top: 6px; inset-inline-end: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--sky);
    box-shadow: 0 0 0 2px var(--abyss); pointer-events: none; }
  .dv2-ghost { height: 32px; border-radius: 8px; border: 1px solid transparent; background: transparent; display: inline-flex; align-items: center;
    gap: 6px; padding: 0 10px; color: var(--muted); font: inherit; font-weight: 500; font-size: 13px; cursor: pointer; white-space: nowrap; flex: none; }
  .dv2-ghost svg { width: 15px; height: 15px; flex: none; }
  .dv2-ghost:hover { color: var(--ink); background: var(--hover-bg); }
  .dv2-ghost.is-ai svg { color: var(--ai); }
  .dv2-pri { height: 32px; border-radius: 8px; border: 0; background: var(--pri-bg); color: var(--pri-fg); display: inline-flex; align-items: center;
    gap: 6px; padding: 0 12px; font: inherit; font-weight: 500; font-size: 13px; cursor: pointer; white-space: nowrap; flex: none; }
  .dv2-pri svg { width: 15px; height: 15px; }
  .dv2-pri:hover:not(:disabled) { background: var(--pri-hover); }
  .dv2-pri:disabled { opacity: .45; cursor: default; }
  .dv2-sep { width: 1px; height: 18px; background: var(--line); margin: 0 6px; flex: none; }
  .dv2-avatar-btn { margin-inline-start: 6px; }

  /* dropdowns (page "⋯" and help) */
  .dv2-dd-wrap { position: relative; display: inline-flex; }
  .dv2-dd { position: absolute; top: calc(100% + 6px); min-width: 220px; background: var(--panel); border: 1px solid var(--line-2); border-radius: 10px;
    box-shadow: var(--shadow-lg); padding: 5px; z-index: 1300; }
  .dv2-dd.at-start { inset-inline-start: 0; }
  .dv2-dd.at-end { inset-inline-end: 0; }
  .dv2-dd-item { display: flex; align-items: center; gap: 10px; width: 100%; height: 34px; padding: 0 10px; border: 0; background: none; border-radius: 7px;
    color: var(--ink); font: inherit; font-size: 13px; text-align: start; cursor: pointer; position: relative; }
  .dv2-dd-item svg { width: 15px; height: 15px; color: var(--muted); flex: none; }
  .dv2-dd-item:hover, .dv2-dd-item:focus-visible { background: var(--hover-bg); outline: none; }
  .dv2-dd-item .dv2-dd-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sky); margin-inline-start: auto; }
  .dv2-dd-sep { height: 1px; background: var(--line); margin: 4px 2px; }

  @media (max-width: 1180px) {
    .dv2-ghost .dv2-ghost-label { display: none; }
    .dv2-ghost { padding: 0; width: 32px; justify-content: center; }
  }
  @media (max-width: 900px) {
    .dv2-top { padding: env(safe-area-inset-top, 0px) 8px 0 10px; min-height: 52px; gap: 4px; }
    .dv2-crumbs > span, .dv2-crumbs > svg { display: none; }
    .dv2-crumbs b { font-size: 15px; font-weight: 600; }
    .dv2-top-wide { display: none !important; }
  }
`

interface DropItem { label: string; icon: ReactNode; onClick: () => void; dot?: boolean; sepBefore?: boolean }

function Dropdown({ trigger, label, items, align, dot }: {
  trigger: ReactNode
  label: string
  items: DropItem[]
  align: 'start' | 'end'
  dot?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div className="dv2-dd-wrap" ref={ref}>
      <button type="button" className={`dv2-icon-btn${align === 'start' ? ' sm' : ''}`} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {trigger}
        {dot && !open && <span className="dv2-udot" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu" className={`dv2-dd at-${align}`}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            {items.map((it) => (
              <div key={it.label}>
                {it.sepBefore && <div className="dv2-dd-sep" />}
                <button type="button" role="menuitem" className="dv2-dd-item" onClick={() => { setOpen(false); it.onClick() }}>
                  {it.icon}<span>{it.label}</span>{it.dot && <i className="dv2-dd-dot" aria-label="جديد" />}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The dashboard top bar. Start: sidebar toggle, "company › page" and a page menu.
 * End: theme, notifications, help, "معاينة الوكيل", "اسأل مدار", the page's one
 * primary action (if it set one) and the account orb.
 */
export function TopBar({ base, routeKey, company, pageTitle, theme, onToggleTheme, sidebarCollapsed, onToggleSidebar }: {
  base: string
  routeKey: string
  company: string
  pageTitle: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}) {
  const navigate = useNavigate()
  const pushToast = useToast()
  const primary = useShellPrimary()
  const unread = useWhatsNewUnread()

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      pushToast({ kind: 'success', title: 'تم نسخ الرابط' })
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر نسخ الرابط' })
    }
  }

  const whatsNewItem: DropItem = { label: 'ما الجديد في مدار', icon: <Gift />, onClick: openWhatsNew, dot: unread }
  const pageItems: DropItem[] = [
    { label: 'نسخ رابط الصفحة', icon: <Link2 />, onClick: copyLink },
    { label: 'فتح في تبويب جديد', icon: <ExternalLink />, onClick: () => window.open(window.location.href, '_blank', 'noopener') },
    { ...whatsNewItem, sepBefore: true },
  ]
  const helpItems: DropItem[] = [
    whatsNewItem,
    { label: 'اختصارات لوحة المفاتيح', icon: <Keyboard />, onClick: requestOpenShortcuts },
    { label: 'اسأل مدار', icon: <Sparkles />, onClick: requestOpenSupport, sepBefore: true },
    { label: 'تواصل مع فريق الدعم', icon: <MessageCircle />, onClick: () => window.open(SUPPORT_WHATSAPP, '_blank', 'noopener,noreferrer') },
  ]

  return (
    <header className="dv2-top">
      <TopProgressBar triggerKey={routeKey} />
      <div className="dv2-top-start">
        <Tooltip label={sidebarCollapsed ? 'إظهار القائمة' : 'إخفاء القائمة'} side="bottom">
          <button type="button" className="dv2-icon-btn" onClick={onToggleSidebar} aria-label="القائمة الجانبية"><PanelRight /></button>
        </Tooltip>
        <div className="dv2-crumbs" aria-label="المسار">
          <span>{company}</span>
          <ChevronLeft size={14} />
          <b aria-current="page">{pageTitle}</b>
        </div>
        <Dropdown trigger={<Ellipsis />} label="خيارات الصفحة" items={pageItems} align="start" dot={unread} />
      </div>

      <div className="dv2-top-actions">
        <button type="button" className="dv2-icon-btn dv2-mobile-only" onClick={() => requestOpenSearch()} aria-label="بحث"><Search /></button>
        <Tooltip label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} side="bottom">
          <button type="button" className="dv2-icon-btn" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}>
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </Tooltip>
        <NotificationCenter />
        <span className="dv2-top-wide" style={{ display: 'contents' }}>
          <Dropdown trigger={<HelpCircle />} label="المساعدة" items={helpItems} align="end" dot={unread} />
          <span className="dv2-sep" />
          <Tooltip label="جرّب الوكيل بمكالمة تجريبية" side="bottom">
            <button type="button" className="dv2-ghost" onClick={() => navigate(`${base}/agents?test=1`)} aria-label="معاينة الوكيل">
              <AudioLines /><span className="dv2-ghost-label">معاينة الوكيل</span>
            </button>
          </Tooltip>
          <button type="button" className="dv2-ghost is-ai" onClick={requestOpenSupport} aria-label="اسأل مدار">
            <Sparkles /><span className="dv2-ghost-label">اسأل مدار</span>
          </button>
          {primary && (
            <button type="button" className="dv2-pri" onClick={primary.onClick} disabled={primary.disabled} style={{ marginInlineStart: 4 }}>
              {primary.icon}{primary.label}
            </button>
          )}
        </span>
        <span className="dv2-avatar-btn" style={{ display: 'flex' }}><AccountMenu base={base} /></span>
      </div>
    </header>
  )
}
