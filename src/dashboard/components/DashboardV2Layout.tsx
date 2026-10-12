import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION_MEDIUM, EASE_OUT } from './motionTokens'
import {
  LayoutDashboard, CalendarDays, Users, MessageSquare, Star, BarChart3,
  Wallet, BellRing, Settings, AlertTriangle, Plus, Ticket,
  ClipboardList, BookOpen, MoreHorizontal, X, Wrench, Sparkles, Contact, Bot, Plug, Search,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSupportTickets } from '@/lib/dashboardQueries'
import { CLINIC_PLANS, getUsageMetrics, usagePercentage } from '@/lib/clinicOSProduct'
import { useOrbSeed, type ThemePref } from './AccountMenu'
import { OrbAvatar } from './OrbAvatar'
import { SupportChat } from './SupportChat'
import { GlobalSearch } from './GlobalSearch'
import { OnboardingWizard } from './OnboardingWizard'
import { TopBar, TOPBAR_CSS } from './TopBar'
import { WhatsNew } from './WhatsNew'
import { RELEASES } from '@/dashboard/whatsNew'
import {
  ToastProvider, requestOpenSearch, ShortcutsOverlay, Fab, Tooltip,
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

  /* sidebar — compact, a shade darker than the canvas, grouped rows */
  .dv2-side { flex: none; width: 252px; height: 100%; overflow-y: auto; background: var(--side);
    border-inline-end: 1px solid var(--line); padding: 14px 10px 10px; display: flex; flex-direction: column; gap: 1px;
    transition: width 200ms var(--ease-out); scrollbar-width: thin; scrollbar-color: var(--line-2) transparent; box-sizing: border-box; }
  .dv2-side.is-collapsed { width: 64px; padding-inline: 10px; }
  .dv2-logo { display: flex; align-items: center; gap: 9px; padding: 2px 8px 12px; font-family: var(--font-display);
    font-weight: 600; font-size: 15px; color: var(--ink); }
  .dv2-logo img { width: 24px; height: 24px; object-fit: contain; flex: none; }
  .dv2-side.is-collapsed .dv2-logo { justify-content: center; padding-inline: 0; }
  .dv2-side-search { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px; margin: 0 0 8px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--panel); color: var(--dim); font-size: 13px; cursor: pointer; width: 100%; text-align: start; flex: none; }
  .dv2-side-search:hover { border-color: var(--line-2); color: var(--muted); }
  .dv2-side-search > span { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .dv2-kbd { font-size: 10.5px; font-weight: 500; color: var(--dim); border: 1px solid var(--line-2); border-radius: 5px; padding: 0 5px; line-height: 17px; font-family: var(--font-body); direction: ltr; }
  .dv2-side.is-collapsed .dv2-side-search { justify-content: center; padding: 0; }
  .dv2-ctx { display: flex; align-items: center; gap: 10px; padding: 8px; margin-bottom: 4px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--panel); min-width: 0; flex: none; }
  .dv2-ctx-txt { min-width: 0; flex: 1; }
  .dv2-ctx b { display: block; font-size: 13px; font-weight: 600; color: var(--ink); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.4; }
  .dv2-ctx small { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dim); line-height: 1.4; white-space: nowrap; overflow: hidden; }
  .dv2-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ok); flex: none; }
  .dv2-dot.warn { background: var(--warn); }
  .dv2-dot.bad { background: var(--bad); }
  .dv2-side.is-collapsed .dv2-ctx { padding: 4px 0; justify-content: center; border-color: transparent; background: none; }
  .dv2-nav-group { font-size: 11.5px; color: var(--dim); padding: 14px 10px 4px; font-weight: 500; }
  .dv2-side.is-collapsed .dv2-nav-group { height: 1px; padding: 0; margin: 10px 6px; background: var(--line); overflow: hidden; color: transparent; }
  .dv2-nav { display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; border-radius: 8px; color: var(--muted);
    font-weight: 500; font-size: 13.5px; border: 0; background: none; text-align: start; width: 100%; cursor: pointer; position: relative; flex: none; }
  .dv2-nav svg { flex: none; width: 16px; height: 16px; }
  .dv2-nav:hover { background: var(--hover-bg); color: var(--ink); }
  .dv2-nav.is-active { background: var(--nav-active-bg); color: var(--ink); }
  .dv2-side.is-collapsed .dv2-nav { justify-content: center; padding: 0; }
  .dv2-badge { font-style: normal; font-size: 11px; background: var(--raise); color: var(--ink); border-radius: 999px; padding: 0 6px;
    font-weight: 500; min-width: 18px; text-align: center; line-height: 17px; font-variant-numeric: tabular-nums; border: 1px solid var(--line-2); box-sizing: border-box; }
  .dv2-nav .dv2-badge { margin-inline-start: auto; }
  .dv2-side.is-collapsed .dv2-nav .dv2-badge { position: absolute; top: 1px; inset-inline-end: 2px; min-width: 0; padding: 0 4px; font-size: 9.5px; line-height: 14px; }
  .dv2-side-foot { margin-top: auto; padding: 10px 12px; border-radius: 10px; background: var(--panel); border: 1px solid var(--line); font-size: 12px; color: var(--muted); flex: none; }
  .dv2-side-foot b { color: var(--ink); font-variant-numeric: tabular-nums; font-weight: 500; }
  .dv2-meter { height: 4px; background: var(--raise); border-radius: 99px; overflow: hidden; margin-top: 8px; }
  .dv2-meter i { display: block; height: 100%; background: var(--ink); border-radius: 99px; }
  .dv2-meter.is-hot i { background: var(--warn); }
  .dv2-link { background: none; border: 0; color: var(--muted); font-weight: 500; padding: 0; cursor: pointer; font-size: 12px; margin-top: 8px; }
  .dv2-link:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; }

  /* main column — the scroller, so the top bar can stay sticky over it */
  .dv2-col { flex: 1; min-width: 0; height: 100%; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; }
  .dv2-content { flex: 1; width: 100%; max-width: 1360px; padding: 28px 32px 110px; box-sizing: border-box; position: relative; }

  /* phone tab bar + "more" sheet */
  .dv2-tabbar { display: none; }
  /* above the floating chat launcher (1400) so the sheet is never covered */
  .dv2-sheet-scrim { position: fixed; inset: 0; z-index: 1405; background: var(--scrim); }
  .dv2-sheet { position: fixed; inset-inline: 0; bottom: 0; z-index: 1410; background: var(--panel); border-top: 1px solid var(--line-2);
    border-radius: 16px 16px 0 0; padding: 10px 12px calc(18px + env(safe-area-inset-bottom, 0px)); max-height: 78vh; overflow-y: auto; }
  .dv2-sheet-grip { width: 36px; height: 4px; border-radius: 99px; background: var(--line-2); margin: 0 auto 8px; }
  .dv2-sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 6px; }
  .dv2-sheet-head h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
  .dv2-sheet .dv2-nav { height: 44px; font-size: 14px; }
  .dv2-mobile-only { display: none !important; }

  @media (max-width: 900px) {
    .dv2-side { display: none; }
    .dv2-content { padding: 18px 16px calc(150px + env(safe-area-inset-bottom, 0px)); }
    .dv2-tabbar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); position: fixed; bottom: 0; inset-inline: 0; z-index: 1300;
      background: var(--tabbar-bg); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-top: 1px solid var(--line);
      padding: 4px 6px calc(4px + env(safe-area-inset-bottom, 0px)); }
    .dv2-tabbar button { background: none; border: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10.5px;
      color: var(--dim); padding: 7px 0 5px; position: relative; cursor: pointer; min-width: 0; font-weight: 500; border-radius: 8px; }
    .dv2-tabbar button svg { width: 19px; height: 19px; }
    .dv2-tabbar button span.dv2-tab-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dv2-tabbar button.is-active { color: var(--ink); }
    .dv2-tabbar .dv2-badge { position: absolute; top: 2px; inset-inline-end: 22%; font-size: 9.5px; min-width: 16px; padding: 0 4px; line-height: 15px; }
    /* floating buttons and toasts clear the tab bar */
    .dv2-floating { bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important; }
    .dv2-desktop-only { display: none !important; }
    .dv2-mobile-only { display: grid !important; }
    .dv2-header-subtitle { display: none; }
    .dv2-responsive-grid { grid-template-columns: 1fr !important; }
    .dv2-responsive-grid-2 { grid-template-columns: 1fr 1fr !important; }
    .dv2-kpi-hero-grid { grid-template-columns: 1fr !important; }
  }
  /* the top bar's "اسأل مدار" replaces the floating chat launcher on wide screens */
  @media (min-width: 901px) {
    .dv2-chat-launcher { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dv2-side, .dv2-nav { transition: none; }
  }
`

/** Titles for routes that aren't in the sidebar, for the top-bar breadcrumb. */
const EXTRA_TITLES: Record<string, string> = {
  'plan-usage': 'الباقة والاستخدام',
  'audit-log': 'سجل التدقيق',
  'calls-analytics': 'تحليلات المكالمات',
  'whatsapp-analytics': 'تحليلات واتساب',
  tools: 'الأدوات',
  'analysis-groups': 'مجموعات التحليل',
  'inbound-services': 'الخدمات الواردة',
  'outbound-services': 'الخدمات الصادرة',
}

export function DashboardV2Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId, isDemo, accountError, refreshAccount, businessType, hasModule, packageType, usageMetrics, companyName, companyLogoUrl } = useWorkspace()
  const showBookings = hasModule('bookings')
  // Theme preference: light / dark / follow the system ("تلقائي"), set from the account menu.
  const [themePref, setThemePref] = useState<ThemePref>(() => {
    const v = readStored(THEME_KEY)
    return v === 'light' || v === 'system' ? v : 'dark'
  })
  const [systemDark, setSystemDark] = useState(() => {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches } catch { return true }
  })
  useEffect(() => {
    if (themePref !== 'system') return
    let mq: MediaQueryList
    try { mq = window.matchMedia('(prefers-color-scheme: dark)') } catch { return }
    const onChange = () => setSystemDark(mq.matches)
    onChange()
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [themePref])
  const theme: 'light' | 'dark' = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref
  const [collapsed, setCollapsed] = useState(() => readStored(COLLAPSE_KEY) === '1')
  const [moreOpen, setMoreOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const { data: tickets } = useSupportTickets(companyId, isDemo)
  const openTicketCount = (tickets || []).filter((t) => t.status === 'open').length
  const orbSeed = useOrbSeed()
  // The phone sheet: "more" (items not in the tab bar) or the full menu (from the top-bar toggle).
  const [sheetMode, setSheetMode] = useState<'more' | 'all'>('more')
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

  function changeTheme(pref: ThemePref) {
    setThemePref(pref)
    writeStored(THEME_KEY, pref)
  }
  function toggleCollapsed() {
    setCollapsed((v) => {
      writeStored(COLLAPSE_KEY, v ? '0' : '1')
      return !v
    })
  }
  /** Top-bar toggle: collapses the sidebar on desktop, opens the full menu on phones. */
  function toggleSidebar() {
    let phone = false
    try { phone = window.matchMedia('(max-width: 900px)').matches } catch { /* old browser: treat as desktop */ }
    if (phone) { setSheetMode('all'); setMoreOpen(true) } else toggleCollapsed()
  }

  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  // Grouped like a product console: overview, daily operations, the AI agent, setup.
  const ALL_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    { title: 'نظرة عامة', items: [
      { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={16} /> },
      { label: 'تحليلات الوكيل', short: 'التحليلات', path: `${base}/agent-analytics`, icon: <Sparkles size={16} />, module: 'voice' },
      { label: 'التقارير والتحليلات', short: 'التقارير', path: `${base}/reports`, icon: <BarChart3 size={16} />, module: 'reports' },
      { label: 'الإيرادات', path: `${base}/revenue`, icon: <Wallet size={16} />, module: 'revenue' },
    ] },
    { title: 'التشغيل', items: [
      { label: 'المحادثات', path: `${base}/conversations`, icon: <MessageSquare size={16} />, module: 'conversations' },
      { label: bookingsLabel(businessType), path: `${base}/bookings`, icon: <CalendarDays size={16} />, module: 'bookings' },
      { label: 'العملاء', path: `${base}/patients`, icon: <Users size={16} />, module: 'customers' },
      { label: 'التذاكر', path: `${base}/tickets`, icon: <Ticket size={16} />, badge: openTicketCount || undefined, module: 'tickets' },
      { label: 'تقييمات Google', path: `${base}/reviews`, icon: <Star size={16} />, module: 'reviews' },
      { label: 'المتابعات', path: `${base}/reminders`, icon: <BellRing size={16} />, module: 'reminders' },
    ] },
    { title: 'الوكيل الذكي', items: [
      { label: 'إعدادات الوكيل', short: 'الوكيل', path: `${base}/agents`, icon: <Bot size={16} /> },
      { label: 'قاعدة المعرفة', short: 'المعرفة', path: `${base}/knowledge-base`, icon: <BookOpen size={16} />, module: 'knowledge_base' },
      { label: 'سجل المكالمات', path: `${base}/call-logs`, icon: <ClipboardList size={16} />, module: 'voice' },
      { label: 'العملاء من المحادثات', short: 'عملاء المحادثات', path: `${base}/agent-users`, icon: <Contact size={16} />, module: 'voice' },
    ] },
    { title: 'الإعداد', items: [
      { label: 'الخدمات', path: `${base}/services`, icon: <Wrench size={16} />, module: 'services' },
      { label: 'التكاملات', path: `${base}/integrations`, icon: <Plug size={16} /> },
      { label: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={16} /> },
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
  const planName = CLINIC_PLANS[packageType]?.name
  const ctxTone = topPct >= 100 ? 'bad' : topPct >= 80 ? 'warn' : ''

  // Top-bar title: the current page.
  const activeItem = allItems.find((it) => isActive(it.path))
  const subPath = location.pathname.slice(base.length + 1).split('/')[0]
  const pageTitle = activeItem?.label || EXTRA_TITLES[subPath] || 'الرئيسية'
  const company = companyName || 'مدار'
  const hasPageNews = RELEASES.some((r) => r.link && r.link === subPath)

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
        {!collapsed && <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
        {item.badge != null && <i className="dv2-badge">{item.badge}</i>}
      </button>
    )
    return collapsed
      ? <Tooltip key={item.path} label={item.label} side="bottom" style={{ display: 'flex', width: '100%' }}>{btn}</Tooltip>
      : btn
  }

  return (
    // ToastProvider sits inside the scope so its toast stack inherits the tokens.
    <div className="dv2-scope dv2-app" dir="rtl" data-theme={theme} style={{ ['--side-w' as string]: collapsed ? '64px' : '252px' }}>
    <ToastProvider>
      <style>{SHELL_CSS + TOPBAR_CSS}</style>

      <aside className={`dv2-side${collapsed ? ' is-collapsed' : ''}`} aria-label="القائمة الرئيسية">
        <div className="dv2-logo">
          <img src="/logo-main.png" alt="" />
          {!collapsed && 'مدار'}
        </div>
        <button type="button" className="dv2-side-search" onClick={() => requestOpenSearch()} aria-label="ابحث أو أنشئ">
          <Search size={15} />
          {!collapsed && <><span>ابحث أو أنشئ</span><kbd className="dv2-kbd">⌘K</kbd></>}
        </button>
        <div className="dv2-ctx" title={company}>
          <OrbAvatar seed={orbSeed} size={collapsed ? 26 : 28} imageUrl={companyLogoUrl || null} />
          {!collapsed && (
            <div className="dv2-ctx-txt">
              <b>{company}</b>
              <small><i className={`dv2-dot${ctxTone ? ` ${ctxTone}` : ''}`} />{planName ? `باقة ${planName}` : 'مساحة العمل'}</small>
            </div>
          )}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title || gi} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.title && <div className="dv2-nav-group">{group.title}</div>}
              {group.items.map(navButton)}
            </div>
          ))}
        </nav>

        {topMetric && !collapsed && (
          <div className="dv2-side-foot" style={{ marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{topMetric.label}</span>
              <b dir="ltr">{topMetric.used.toLocaleString('en')} / {topMetric.limit.toLocaleString('en')}</b>
            </div>
            <div className={`dv2-meter${topPct >= 80 ? ' is-hot' : ''}`}><i style={{ width: `${topPct}%` }} /></div>
            <button type="button" className="dv2-link" onClick={() => navigate(`${base}/plan-usage`)}>تفاصيل الباقة</button>
          </div>
        )}
      </aside>

      <div className="dv2-col" ref={colRef}>
        <TopBar
          base={base}
          routeKey={location.pathname}
          pageTitle={pageTitle}
          hasPageNews={hasPageNews}
          themePref={themePref}
          onThemeChange={changeTheme}
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleSidebar}
        />
        {!isDemo && accountError && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flex: 'none',
            padding: '10px 20px', background: 'var(--bad-bg)', borderBottom: '1px solid var(--danger-200)',
            color: 'var(--bad)', fontSize: 13, fontWeight: 500,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {accountError}</span>
            <button type="button" className="dv2-link" onClick={() => refreshAccount()} style={{ color: 'inherit', textDecoration: 'underline', marginTop: 0, fontSize: 13 }}>إعادة المحاولة</button>
          </div>
        )}
        <main className="dv2-content dv2-main">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
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
          <button type="button" className={moreActive || moreOpen ? 'is-active' : undefined} onClick={() => { setSheetMode('more'); setMoreOpen(true) }} aria-haspopup="dialog" aria-expanded={moreOpen}>
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
              key="sheet" className="dv2-sheet" role="dialog" aria-modal="true" aria-label={sheetMode === 'all' ? 'القائمة' : 'المزيد'}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            >
              <div className="dv2-sheet-grip" />
              <div className="dv2-sheet-head">
                <h3>{sheetMode === 'all' ? 'القائمة' : 'المزيد'}</h3>
                <button type="button" className="dv2-icon-btn" onClick={() => setMoreOpen(false)} aria-label="إغلاق"><X size={18} /></button>
              </div>
              {(sheetMode === 'all' ? NAV_GROUPS : moreGroups).map((g, gi) => (
                <div key={g.title || gi} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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

      <GlobalSearch base={base} />
      <SupportChat />
      <WhatsNew base={base} />
      <OnboardingWizard />
      <ShortcutsOverlay />
      {showBookings && (
        <span className="dv2-mobile-only"><Fab actions={[{ label: 'موعد جديد', icon: <Plus size={15} />, onClick: () => navigate(`${base}/bookings?new=1`) }]} /></span>
      )}
    </ToastProvider>
    </div>
  )
}
