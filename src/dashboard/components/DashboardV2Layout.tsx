import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION_MEDIUM, EASE_OUT } from './motionTokens'
import {
  LayoutDashboard, CalendarDays, Users, MessageSquare, Star, BarChart3,
  Wallet, BellRing, Settings, AlertTriangle, ChevronsRight, ChevronsLeft, Plus, CalendarCheck2, Ticket,
  ClipboardList, BookOpen, Sun, Moon, MoreHorizontal, X, Wrench, Sparkles, Contact,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSupportTickets, useTodayBookings } from '@/lib/dashboardQueries'
import { getUsageMetrics, usagePercentage } from '@/lib/clinicOSProduct'
import { NotificationCenter } from './NotificationCenter'
import { AccountMenu } from './AccountMenu'
import { SupportChat } from './SupportChat'
import { GlobalSearch } from './GlobalSearch'
import { OnboardingWizard } from './OnboardingWizard'
import {
  ToastProvider, requestOpenSearch, TopProgressBar, ShortcutsOverlay, WhatsNewBadge, Fab, Tooltip,
} from './uiExtras'
import { bookingsLabel, type ModuleId } from '@/dashboard/modules'
import '@/styles/dashboardV2Tokens.css'

// New keys: the old ones were written on every mount, so every existing user has
// "light" / "collapsed" stored and would never see the Night defaults.
const THEME_KEY = 'dv2_theme_night'
const COLLAPSE_KEY = 'dv2_sidebar_collapsed_v2'

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  badge?: number
  /** Shorter label for the phone tab bar. */
  short?: string
  /** Shown only when the company has this module; items without one are always shown. */
  module?: ModuleId
}

function readStored(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function writeStored(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* private mode: keep the in-memory value */ }
}

/** Lets env(safe-area-inset-*) resolve on notched phones while the dashboard is mounted, without changing the public site's viewport. */
function useViewportFitCover() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
    if (!meta || meta.content.includes('viewport-fit')) return
    const original = meta.content
    meta.content = `${original}, viewport-fit=cover`
    return () => { meta.content = original }
  }, [])
}

const SHELL_CSS = `
  .dv2-app { display: flex; height: 100vh; height: 100dvh; overflow: hidden; background: var(--surface-canvas);
    padding-inline: env(safe-area-inset-right, 0px) env(safe-area-inset-left, 0px); }

  /* sidebar */
  .dv2-side { flex: none; width: 240px; height: 100%; overflow-y: auto; background: var(--panel);
    border-inline-end: 1px solid var(--line); padding: 20px 14px 14px; display: flex; flex-direction: column; gap: 3px;
    transition: width 200ms var(--ease-out); scrollbar-width: thin; }
  .dv2-side.is-collapsed { width: 76px; padding-inline: 12px; }
  .dv2-logo { display: flex; align-items: center; gap: 10px; padding: 2px 10px 18px; font-family: var(--font-display);
    font-weight: 700; font-size: 17px; color: var(--ink); }
  .dv2-logo img { width: 32px; height: 32px; object-fit: contain; flex: none; }
  .dv2-side.is-collapsed .dv2-logo { justify-content: center; padding-inline: 0; }
  .dv2-nav-group { font-size: 11px; letter-spacing: .05em; color: var(--dim); padding: 14px 12px 4px; font-weight: 600; }
  .dv2-side.is-collapsed .dv2-nav-group { height: 1px; padding: 0; margin: 10px 8px; background: var(--line); overflow: hidden; color: transparent; }
  .dv2-nav { display: flex; align-items: center; gap: 11px; padding: 9px 12px; border-radius: 11px; color: var(--muted);
    font-weight: 500; font-size: 14px; border: 0; background: none; text-align: start; width: 100%; cursor: pointer; position: relative; }
  .dv2-nav svg { flex: none; }
  .dv2-nav:hover { background: var(--hover-bg); color: var(--ink); }
  .dv2-nav.is-active { background: var(--nav-active-bg); color: var(--ink); font-weight: 600; box-shadow: inset -3px 0 0 var(--sky); }
  .dv2-nav.is-active svg { color: var(--sky); }
  .dv2-side.is-collapsed .dv2-nav { justify-content: center; padding: 10px 0; }
  .dv2-badge { font-style: normal; font-size: 11px; background: var(--bad); color: #FFFFFF; border-radius: 999px; padding: 0 7px;
    font-weight: 700; min-width: 20px; text-align: center; line-height: 18px; font-variant-numeric: tabular-nums; }
  .dv2-nav .dv2-badge { margin-inline-start: auto; }
  .dv2-side.is-collapsed .dv2-nav .dv2-badge { position: absolute; top: 3px; inset-inline-end: 6px; min-width: 0; padding: 0 5px; font-size: 10px; line-height: 15px; }
  .dv2-side-foot { margin-top: auto; padding: 12px; border-radius: 13px; background: var(--panel-2); border: 1px solid var(--line); font-size: 12.5px; color: var(--muted); }
  .dv2-side-foot b { color: var(--ink); font-variant-numeric: tabular-nums; }
  .dv2-meter { height: 6px; background: var(--line); border-radius: 99px; overflow: hidden; margin-top: 6px; }
  .dv2-meter i { display: block; height: 100%; background: var(--grad); border-radius: 99px; }
  .dv2-meter.is-hot i { background: linear-gradient(90deg, var(--warn), var(--bad)); }
  .dv2-link { background: none; border: 0; color: var(--sky); font-weight: 600; padding: 0; cursor: pointer; font-size: 12px; margin-top: 8px; }
  .dv2-collapse { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; margin-top: 8px; border: 0; background: none;
    border-radius: 11px; cursor: pointer; color: var(--dim); font-size: 11.5px; width: 100%; }
  .dv2-collapse:hover { color: var(--ink); background: var(--hover-bg); }

  /* main column — the scroller, so the top bar can stay sticky and translucent over it */
  .dv2-col { flex: 1; min-width: 0; height: 100%; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
  .dv2-top { position: sticky; top: 0; z-index: 30; flex: none; background: var(--topbar-bg); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line); padding: calc(12px + env(safe-area-inset-top, 0px)) 28px 12px; display: flex; align-items: center; gap: 12px; }
  .dv2-mlogo { display: none; }
  .dv2-search { flex: 1; max-width: 420px; min-width: 0; }
  .dv2-top-actions { margin-inline-start: auto; display: flex; align-items: center; gap: 8px; flex: none; }
  .dv2-icon-btn { width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); display: grid;
    place-items: center; position: relative; color: var(--muted); cursor: pointer; padding: 0; flex: none; }
  .dv2-icon-btn:hover { color: var(--ink); border-color: var(--line-2); }
  .dv2-today { height: 40px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); display: inline-flex; align-items: center;
    gap: 7px; padding: 0 12px; color: var(--ink); font-weight: 700; font-size: 13px; cursor: pointer; font-variant-numeric: tabular-nums; }
  .dv2-today svg { color: var(--sky); }
  .dv2-today:hover { border-color: var(--line-2); }
  .dv2-content { flex: 1; width: 100%; max-width: 1360px; padding: 24px 28px 110px; box-sizing: border-box; position: relative; }

  /* phone tab bar + "more" sheet */
  .dv2-tabbar { display: none; }
  .dv2-sheet-scrim { position: fixed; inset: 0; z-index: 1350; background: var(--scrim); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
  .dv2-sheet { position: fixed; inset-inline: 0; bottom: 0; z-index: 1360; background: var(--panel-2); border-top: 1px solid var(--line-2);
    border-radius: 20px 20px 0 0; padding: 10px 14px calc(18px + env(safe-area-inset-bottom, 0px)); max-height: 78vh; overflow-y: auto;
    box-shadow: 0 -24px 50px -20px rgba(0,0,0,.6); }
  .dv2-sheet-grip { width: 40px; height: 4px; border-radius: 99px; background: var(--line-2); margin: 0 auto 8px; }
  .dv2-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 6px; }
  .dv2-sheet-head h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--ink); }
  .dv2-sheet .dv2-nav { padding: 12px; }

  @media (max-width: 900px) {
    .dv2-side { display: none; }
    .dv2-top { padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px; }
    .dv2-mlogo { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 16px; color: var(--ink); flex: none; }
    .dv2-mlogo img { width: 28px; height: 28px; object-fit: contain; }
    .dv2-search { display: none; }
    .dv2-top-actions { gap: 6px; }
    .dv2-content { padding: 16px 16px calc(150px + env(safe-area-inset-bottom, 0px)); }
    .dv2-tabbar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); position: fixed; bottom: 0; inset-inline: 0; z-index: 1300;
      background: var(--tabbar-bg); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border-top: 1px solid var(--line);
      padding: 6px 6px calc(6px + env(safe-area-inset-bottom, 0px)); }
    .dv2-tabbar button { background: none; border: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px;
      color: var(--dim); padding: 6px 0; position: relative; cursor: pointer; min-width: 0; font-weight: 500; }
    .dv2-tabbar button span.dv2-tab-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dv2-tabbar button.is-active { color: var(--ink); }
    .dv2-tabbar button.is-active svg { color: var(--sky); }
    .dv2-tabbar .dv2-badge { position: absolute; top: 2px; inset-inline-end: 22%; font-size: 10px; min-width: 18px; padding: 0 5px; line-height: 16px; }
    /* floating buttons and toasts clear the tab bar */
    .dv2-floating { bottom: calc(84px + env(safe-area-inset-bottom, 0px)) !important; }
    .dv2-desktop-only { display: none !important; }
    .dv2-header-subtitle { display: none; }
    .dv2-responsive-grid { grid-template-columns: 1fr !important; }
    .dv2-responsive-grid-2 { grid-template-columns: 1fr 1fr !important; }
    .dv2-kpi-hero-grid { grid-template-columns: 1fr !important; }
  }
  /* desktop: the quick-add button clears the sidebar instead of covering its footer */
  @media (min-width: 901px) {
    .dv2-fab { inset-inline-start: calc(var(--side-w, 240px) + 24px) !important; }
  }
  @media (max-width: 380px) {
    .dv2-mlogo span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dv2-side, .dv2-nav { transition: none; }
  }
`

export function DashboardV2Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId, isDemo, accountError, refreshAccount, businessType, hasModule, packageType, usageMetrics } = useWorkspace()
  const showBookings = hasModule('bookings')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (readStored(THEME_KEY) === 'light' ? 'light' : 'dark'))
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSE_KEY) === '1')
  const [moreOpen, setMoreOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const { data: tickets } = useSupportTickets(companyId, isDemo)
  const openTicketCount = (tickets || []).filter((t) => t.status === 'open').length
  const { data: todayAppointments } = useTodayBookings(companyId, isDemo)
  const todayCount = (todayAppointments || []).length
  useViewportFitCover()

  useEffect(() => {
    setMoreOpen(false)
    colRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        requestOpenSearch()
      }
      if (e.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      writeStored(THEME_KEY, next)
      return next
    })
  }
  function toggleCollapsed() {
    setCollapsed((v) => {
      writeStored(COLLAPSE_KEY, v ? '0' : '1')
      return !v
    })
  }

  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const ALL_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    { title: '', items: [
      { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={18} /> },
    ] },
    // Grouped by how often it's opened, not by internal architecture: the daily
    // operational work sits at the top, configuration further down.
    { title: 'التشغيل اليومي', items: [
      { label: bookingsLabel(businessType), path: `${base}/bookings`, icon: <CalendarDays size={18} />, module: 'bookings' },
      { label: 'المحادثات', path: `${base}/conversations`, icon: <MessageSquare size={18} />, module: 'conversations' },
      { label: 'العملاء', path: `${base}/patients`, icon: <Users size={18} />, module: 'customers' },
      { label: 'التذاكر', path: `${base}/tickets`, icon: <Ticket size={18} />, badge: openTicketCount || undefined, module: 'tickets' },
      { label: 'تقييمات Google', path: `${base}/reviews`, icon: <Star size={18} />, module: 'reviews' },
      { label: 'سجل المكالمات', path: `${base}/call-logs`, icon: <ClipboardList size={18} />, module: 'voice' },
      { label: 'تحليلات الموظف', short: 'التحليلات', path: `${base}/agent-analytics`, icon: <Sparkles size={18} />, module: 'voice' },
      { label: 'العملاء من المحادثات', short: 'عملاء المحادثات', path: `${base}/agent-users`, icon: <Contact size={18} />, module: 'voice' },
    ] },
    { title: 'التقارير', items: [
      { label: 'التقارير والتحليلات', path: `${base}/reports`, icon: <BarChart3 size={18} />, module: 'reports' },
      { label: 'الإيرادات', path: `${base}/revenue`, icon: <Wallet size={18} />, module: 'revenue' },
    ] },
    { title: 'الإعداد', items: [
      { label: 'قاعدة المعرفة', short: 'المعرفة', path: `${base}/knowledge-base`, icon: <BookOpen size={18} />, module: 'knowledge_base' },
      { label: 'الخدمات', path: `${base}/services`, icon: <Wrench size={18} />, module: 'services' },
      { label: 'المتابعات', path: `${base}/reminders`, icon: <BellRing size={18} />, module: 'reminders' },
      { label: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={18} /> },
    ] },
  ]
  // Drop items for modules this company doesn't have, then any group left empty.
  const NAV_GROUPS = ALL_NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.module || hasModule(it.module)) }))
    .filter((g) => g.items.length > 0)
  const allItems = NAV_GROUPS.flatMap((g) => g.items)

  const isActive = (path: string) =>
    path === base ? location.pathname === base || location.pathname === `${base}/` : location.pathname === path || location.pathname.startsWith(`${path}/`)

  // Phone tab bar: home, conversations, bookings (or customers when the company
  // has no bookings), knowledge base, then "more" with everything else. Slots for
  // modules the company lacks are backfilled from the remaining items.
  const preferred = [base, `${base}/conversations`, showBookings ? `${base}/bookings` : `${base}/patients`, `${base}/knowledge-base`]
  const tabItems = preferred.map((p) => allItems.find((it) => it.path === p)).filter((it): it is NavItem => !!it)
  for (const it of allItems) {
    if (tabItems.length >= 4) break
    if (!tabItems.includes(it)) tabItems.push(it)
  }
  const moreGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((it) => !tabItems.includes(it)) }))
    .filter((g) => g.items.length > 0)
  const moreActive = moreGroups.some((g) => g.items.some((it) => isActive(it.path)))
  const moreBadge = moreGroups.reduce((n, g) => n + g.items.reduce((m, it) => m + (it.badge || 0), 0), 0)

  // Usage meter: the plan metric closest to its monthly limit.
  const metrics = (isDemo ? getUsageMetrics(packageType) : usageMetrics).filter((m) => m.limit > 0)
  const topMetric = metrics.reduce<typeof metrics[number] | null>((best, m) => (!best || usagePercentage(m) > usagePercentage(best) ? m : best), null)
  const topPct = topMetric ? usagePercentage(topMetric) : 0

  const navButton = (item: NavItem) => {
    const btn = (
      <button
        key={item.path}
        type="button"
        className={`dv2-nav${isActive(item.path) ? ' is-active' : ''}`}
        aria-current={isActive(item.path) ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        onClick={() => navigate(item.path)}
      >
        {item.icon}
        {!collapsed && <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>}
        {item.badge != null && <i className="dv2-badge">{item.badge}</i>}
      </button>
    )
    return collapsed
      ? <Tooltip key={item.path} label={item.label} side="bottom" style={{ display: 'flex', width: '100%' }}>{btn}</Tooltip>
      : btn
  }

  return (
    // ToastProvider sits inside the scope so its toast stack inherits the tokens.
    <div className="dv2-scope dv2-app" dir="rtl" data-theme={theme} style={{ ['--side-w' as string]: collapsed ? '76px' : '240px' }}>
    <ToastProvider>
      <style>{SHELL_CSS}</style>

      <aside className={`dv2-side${collapsed ? ' is-collapsed' : ''}`} aria-label="القائمة الرئيسية">
        <div className="dv2-logo">
          <img src="/logo-main.png" alt="" />
          {!collapsed && 'مدار'}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title || gi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {group.title && <div className="dv2-nav-group">{group.title}</div>}
              {group.items.map(navButton)}
            </div>
          ))}
        </nav>

        {topMetric && !collapsed && (
          <div className="dv2-side-foot">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{topMetric.label}</span>
              <b dir="ltr">{topMetric.used.toLocaleString('en')} / {topMetric.limit.toLocaleString('en')}</b>
            </div>
            <div className={`dv2-meter${topPct >= 80 ? ' is-hot' : ''}`}><i style={{ width: `${topPct}%` }} /></div>
            <button type="button" className="dv2-link" onClick={() => navigate(`${base}/plan-usage`)}>تفاصيل الباقة</button>
          </div>
        )}
        <button type="button" className="dv2-collapse" onClick={toggleCollapsed} style={collapsed ? { marginTop: 'auto' } : undefined}>
          {collapsed ? <ChevronsLeft size={15} /> : <><ChevronsRight size={15} /> طي القائمة</>}
        </button>
      </aside>

      <div className="dv2-col" ref={colRef}>
        <header className="dv2-top">
          <TopProgressBar triggerKey={location.pathname} />
          <div className="dv2-mlogo"><img src="/logo-main.png" alt="" /><span>مدار</span></div>
          <div className="dv2-search"><GlobalSearch base={base} /></div>
          <div className="dv2-top-actions">
            {showBookings && (
              <Tooltip label={`${bookingsLabel(businessType)} اليوم`}>
                <button type="button" className="dv2-today" onClick={() => navigate(`${base}/bookings`)} aria-label={`${bookingsLabel(businessType)} اليوم: ${todayCount}`}>
                  <CalendarCheck2 size={16} /> {todayCount}
                </button>
              </Tooltip>
            )}
            <button type="button" className="dv2-icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'} style={{ overflow: 'hidden' }}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex' }}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </motion.span>
              </AnimatePresence>
            </button>
            <span className="dv2-desktop-only"><WhatsNewBadge /></span>
            <NotificationCenter />
            <AccountMenu base={base} />
          </div>
        </header>
        {!isDemo && accountError && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 'none',
            padding: '10px 20px', background: 'var(--bad-bg)', borderBottom: '1px solid var(--danger-200)',
            color: 'var(--bad)', fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {accountError}</span>
            <button type="button" className="dv2-link" onClick={() => refreshAccount()} style={{ color: 'inherit', textDecoration: 'underline', marginTop: 0, fontSize: 13 }}>إعادة المحاولة</button>
          </div>
        )}
        <main className="dv2-content dv2-main">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION_MEDIUM, ease: EASE_OUT }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <nav className="dv2-tabbar" aria-label="التنقل">
        {tabItems.map((it) => (
          <button
            key={it.path}
            type="button"
            className={isActive(it.path) ? 'is-active' : undefined}
            aria-current={isActive(it.path) ? 'page' : undefined}
            onClick={() => navigate(it.path)}
          >
            {it.icon}
            <span className="dv2-tab-label">{it.short || it.label}</span>
            {it.badge != null && <i className="dv2-badge">{it.badge}</i>}
          </button>
        ))}
        {moreGroups.length > 0 && (
          <button type="button" className={moreActive || moreOpen ? 'is-active' : undefined} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
            <MoreHorizontal size={18} />
            <span className="dv2-tab-label">المزيد</span>
            {moreBadge > 0 && <i className="dv2-badge">{moreBadge}</i>}
          </button>
        )}
      </nav>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="scrim" className="dv2-sheet-scrim" onClick={() => setMoreOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            />
            <motion.div
              key="sheet" className="dv2-sheet" role="dialog" aria-modal="true" aria-label="المزيد"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            >
              <div className="dv2-sheet-grip" />
              <div className="dv2-sheet-head">
                <h3>المزيد</h3>
                <button type="button" className="dv2-icon-btn" onClick={() => setMoreOpen(false)} aria-label="إغلاق"><X size={18} /></button>
              </div>
              {moreGroups.map((g, gi) => (
                <div key={g.title || gi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {g.title && <div className="dv2-nav-group">{g.title}</div>}
                  {g.items.map((it) => (
                    <button key={it.path} type="button" className={`dv2-nav${isActive(it.path) ? ' is-active' : ''}`} onClick={() => navigate(it.path)}>
                      {it.icon}
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {it.badge != null && <i className="dv2-badge">{it.badge}</i>}
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SupportChat />
      <OnboardingWizard />
      <ShortcutsOverlay />
      {showBookings && (
        <Fab actions={[{ label: 'حجز جديد', icon: <Plus size={15} />, onClick: () => navigate(`${base}/bookings?new=1`) }]} />
      )}
    </ToastProvider>
    </div>
  )
}
