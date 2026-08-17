import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DURATION_MEDIUM, EASE_OUT } from './motionTokens'
import {
  LayoutDashboard, CalendarDays, Users, MessageSquare, Star, BarChart3,
  Wallet, BellRing, Plug, Settings, ChevronDown, LogOut, CreditCard, Menu, X,
  Wrench, History, Sun, Moon, AlertTriangle, ChevronsRight, ChevronsLeft, Plus, CalendarCheck2, Ticket,
  PhoneCall, MessageCircle, Bot, SlidersHorizontal, LayoutGrid, PhoneIncoming, PhoneOutgoing, ClipboardList, BookOpen,
  Inbox,
} from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicSupportTickets, useClinicTodayAppointments, useRazLeads } from '@/lib/clinicOSQueries'
import { NotificationCenter } from './NotificationCenter'
import { AccountMenu } from './AccountMenu'
import { SupportChat } from './SupportChat'
import { GlobalSearch } from './GlobalSearch'
import { OnboardingWizard } from './OnboardingWizard'
import {
  ToastProvider, requestOpenSearch, TopProgressBar, ShortcutsOverlay, WhatsNewBadge, Fab, Tooltip,
} from './uiExtras'
import '@/styles/dashboardV2Tokens.css'

const THEME_KEY = 'dv2_theme'
const COLLAPSE_KEY = 'dv2_sidebar_collapsed'

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  badge?: number
  soon?: boolean
}

export function DashboardV2Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId, clinicName, userName, isDemo, accountError, refreshAccount, logout } = useClinicOS()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'dark') || 'light')
  // `collapsed` is the pinned preference; hovering the rail expands it temporarily
  // without changing that preference.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) !== '0')
  const [hoverExpanded, setHoverExpanded] = useState(false)
  // The mobile drawer is opened deliberately, so it always shows full labels —
  // an icon-only drawer would be pointless there.
  const expanded = !collapsed || hoverExpanded || mobileNavOpen
  const { data: tickets } = useClinicSupportTickets(companyId, isDemo)
  const openTicketCount = (tickets || []).filter((t) => t.status === 'open').length
  const { data: leads } = useRazLeads()
  const newLeadCount = (leads || []).filter((l) => l.status === 'new').length
  const { data: todayAppointments } = useClinicTodayAppointments(companyId, isDemo)
  const todayCount = (todayAppointments || []).length

  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])
  useEffect(() => { localStorage.setItem(THEME_KEY, theme) }, [theme])
  useEffect(() => { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        requestOpenSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    { title: '', items: [
      { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={17} /> },
    ] },
    { title: 'نظرة عامة', items: [
      { label: 'تحليلات المكالمات', path: `${base}/calls-analytics`, icon: <PhoneCall size={17} /> },
      { label: 'تحليلات واتساب', path: `${base}/whatsapp-analytics`, icon: <MessageCircle size={17} /> },
    ] },
    { title: 'البناء', items: [
      { label: 'الوكلاء', path: `${base}/agents`, icon: <Bot size={17} /> },
      { label: 'قاعدة المعرفة', path: `${base}/knowledge-base`, icon: <BookOpen size={17} /> },
      { label: 'الأدوات', path: `${base}/tools`, icon: <SlidersHorizontal size={17} /> },
      { label: 'مجموعات التحليل', path: `${base}/analysis-groups`, icon: <LayoutGrid size={17} /> },
      { label: 'المتابعات', path: `${base}/reminders`, icon: <BellRing size={17} /> },
    ] },
    { title: 'القنوات', items: [
      { label: 'الخدمات الواردة', path: `${base}/inbound-services`, icon: <PhoneIncoming size={17} /> },
      { label: 'الخدمات الصادرة', path: `${base}/outbound-services`, icon: <PhoneOutgoing size={17} /> },
    ] },
    { title: 'التفاعل', items: [
      { label: 'الحجوزات', path: `${base}/bookings`, icon: <CalendarDays size={17} /> },
      { label: 'العملاء', path: `${base}/patients`, icon: <Users size={17} /> },
      { label: 'طلبات العملاء', path: `${base}/leads`, icon: <Inbox size={17} />, badge: newLeadCount || undefined },
      { label: 'المحادثات', path: `${base}/conversations`, icon: <MessageSquare size={17} /> },
      { label: 'AI Google Reviews', path: `${base}/reviews`, icon: <Star size={17} /> },
      { label: 'سجل المكالمات', path: `${base}/call-logs`, icon: <ClipboardList size={17} /> },
      { label: 'التذاكر', path: `${base}/tickets`, icon: <Ticket size={17} />, badge: openTicketCount || undefined },
    ] },
    { title: 'الأعمال', items: [
      { label: 'الخدمات', path: `${base}/services`, icon: <Wrench size={17} /> },
      { label: 'التقارير والتحليلات', path: `${base}/reports`, icon: <BarChart3 size={17} /> },
      { label: 'الإيرادات', path: `${base}/revenue`, icon: <Wallet size={17} /> },
    ] },
    { title: 'النظام', items: [
      { label: 'Madar Agent Usage', path: `${base}/plan-usage`, icon: <CreditCard size={17} /> },
      { label: 'التكاملات', path: `${base}/integrations`, icon: <Plug size={17} /> },
      { label: 'سجل التدقيق', path: `${base}/audit-log`, icon: <History size={17} /> },
      { label: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={17} /> },
    ] },
  ]
  const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

  return (
    <ToastProvider>
    <div className="dv2-scope" dir="rtl" data-theme={theme} style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .dv2-hamburger { display: none; }
        .dv2-backdrop { display: none; }
        .dv2-sidebar-spacer { display: block; }
        @media (max-width: 900px) {
          .dv2-sidebar-spacer { display: none; }
          .dv2-sidebar { position: fixed !important; inset-inline-start: 0; top: 0; bottom: 0; z-index: 1300;
            transition: transform .25s var(--ease-out); transform: translateX(100%); }
          .dv2-sidebar.open { transform: translateX(0) !important; }
          .dv2-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(4,9,26,.5); z-index: 1200; }
          .dv2-hamburger { display: flex !important; }
          .dv2-header-subtitle { display: none; }
          .dv2-global-search { display: none; }
          .dv2-main { padding: 14px !important; }
          .dv2-responsive-grid { grid-template-columns: 1fr !important; }
          .dv2-responsive-grid-2 { grid-template-columns: 1fr 1fr !important; }
          .dv2-kpi-hero-grid { grid-template-columns: 1fr !important; }
          .dv2-desktop-only { display: none !important; }
        }
        .dv2-nav-item { position: relative; transition: background-color 150ms ease, color 150ms ease; }
        .dv2-nav-item:hover { background: rgba(229,229,229,.7) !important; color: #171717 !important; }
        @media (prefers-reduced-motion: reduce) {
          .dv2-nav-item { transition: none; }
        }
        /* On desktop the rail is taken out of flow and centred, so expanding it on
           hover overlays the page instead of shoving every column sideways.
           A spacer keeps the layout width reserved. */
        @media (min-width: 901px) {
          /* Two classes so this beats the .dv2-sidebar-glass rule declared below. */
          .dv2-sidebar.dv2-sidebar-glass {
            position: fixed;
            top: 50%;
            transform: translateY(-50%);
            inset-inline-start: 16px;
            margin: 0 !important;
            z-index: 40;
          }
        }
        /* Floating rail: detached from the viewport edges and centred vertically,
           so it reads as a card rather than a wall. */
        .dv2-sidebar-glass {
          position: relative;
          background: #ffffff;
          border: 1px solid var(--border-default);
          border-radius: 22px;
          box-shadow: 0 18px 44px -20px rgba(13,27,62,.28), 0 2px 8px rgba(13,27,62,.05);
        }
        .dv2-sidebar-glass > * { position: relative; z-index: 1; }
        @media (max-width: 900px) {
          /* On mobile it becomes a full-height drawer again, so drop the float. */
          .dv2-sidebar-glass {
            border-radius: 0;
            border: none;
            border-inline-end: 1px solid var(--border-default);
            margin: 0 !important;
            max-height: none !important;
            height: 100% !important;
            align-self: stretch !important;
          }
        }
      `}</style>
      {mobileNavOpen && <div className="dv2-backdrop open" onClick={() => setMobileNavOpen(false)} />}
      {/* Reserves the rail's footprint so hover-expansion doesn't reflow the page. */}
      <div
        className="dv2-sidebar-spacer"
        aria-hidden
        style={{
          width: collapsed ? 76 + 32 : 264 + 32,
          flexShrink: 0,
          transition: 'width 200ms var(--ease-out, ease)',
        }}
      />
      <nav
        className={`dv2-sidebar dv2-sidebar-glass${mobileNavOpen ? ' open' : ''}`}
        onMouseEnter={() => setHoverExpanded(true)}
        onMouseLeave={() => { setHoverExpanded(false); setProfileOpen(false) }}
        style={{
          width: expanded ? 264 : 76,
          // Centred floating rail: sized to its content, capped to the viewport.
          alignSelf: 'center',
          height: 'auto',
          maxHeight: 'calc(100vh - 32px)',
          margin: '16px 16px 16px 0',
          display: 'flex',
          flexDirection: 'column', padding: '18px 14px', boxSizing: 'border-box',
          fontFamily: 'var(--font-body)', color: 'var(--text-primary)', flexShrink: 0,
          transition: 'width 200ms var(--ease-out, ease)',
          // Hover-expansion floats over the content instead of pushing it.
          zIndex: collapsed ? 40 : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-main.png" alt="مدار" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
            {expanded && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>مدار</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#737373', letterSpacing: '.18em', textTransform: 'uppercase' }}>لوحة العيادة</div>
              </div>
            )}
          </div>
          <span className="dv2-hamburger" onClick={() => setMobileNavOpen(false)} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={20} />
          </span>
        </div>

        <div
          onClick={() => setProfileOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: expanded ? '10px 12px' : '10px',
            justifyContent: expanded ? 'space-between' : 'center',
            borderRadius: 14, cursor: 'pointer', border: '1px solid #E5E5E5', background: '#FAFAFA',
            boxShadow: '0 1px 2px rgba(0,0,0,.04)',
            marginTop: 14, position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: 'var(--gradient-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, color: '#fff',
            }}>{(clinicName || userName || 'م')[0]}</div>
            {expanded && (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#737373', letterSpacing: '.09em', textTransform: 'uppercase' }}>العيادة</div>
                <div style={{ fontSize: 14, fontWeight: 400, color: '#171717', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {clinicName || (isDemo ? 'عرض تجريبي' : 'عيادتي')}
                </div>
              </div>
            )}
          </div>
          {expanded && <ChevronDown size={13} style={{ opacity: 0.5, flexShrink: 0, color: '#737373' }} />}
          {profileOpen && (
            <div style={{
              position: 'absolute', top: '110%', insetInlineStart: 0, insetInlineEnd: 0,
              background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-default)',
              overflow: 'hidden', color: '#171717', minWidth: expanded ? undefined : 150, zIndex: 10,
            }}>
              <div
                onClick={logout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                <LogOut size={14} /> تسجيل الخروج
              </div>
            </div>
          )}
        </div>

        <div
          style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 1, marginTop: 18, flex: 1, overflowY: 'auto' }}
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title || gi}>
              {group.title && expanded && (
                <div style={{
                  fontSize: 11, fontWeight: 600, color: '#737373', letterSpacing: '.12em',
                  padding: '0 8px', margin: gi === 0 ? '0 0 8px' : '20px 0 8px', textTransform: 'uppercase',
                }}>{group.title}</div>
              )}
              {group.items.map((item) => {
                const active = location.pathname === item.path
                const row = (
                  <div
                    key={item.path}
                    className="dv2-nav-item"
                    onClick={() => navigate(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: expanded ? '8px 12px' : '8px',
                      justifyContent: expanded ? 'flex-start' : 'center',
                      borderRadius: 14, cursor: 'pointer',
                      fontSize: 14, fontWeight: 500,
                      color: active ? '#171717' : '#525252',
                      background: active ? 'rgba(229,229,229,.9)' : 'transparent',
                      boxShadow: active ? 'inset 0 0 0 1px rgba(0,0,0,.06)' : undefined,
                    }}
                  >
                    <span className="dv2-nav-icon" style={{ display: 'flex' }}>{item.icon}</span>
                    {expanded && <span style={{ flex: 1 }}>{item.label}</span>}
                    {expanded && item.badge != null && (
                      <span style={{
                        background: 'var(--danger-500)', color: '#fff', borderRadius: 'var(--radius-full)',
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                      }}>{item.badge}</span>
                    )}
                  </div>
                )
                return expanded ? row : <Tooltip key={item.path} label={item.label} side="bottom">{row}</Tooltip>
              })}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #E5E5E5', marginTop: 8, paddingTop: 8 }}>
          <span
            className="dv2-desktop-only"
            onClick={() => setCollapsed((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', marginTop: 2,
              borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 11.5,
            }}
          >
            {collapsed
              ? (expanded ? <><ChevronsLeft size={15} /> تثبيت القائمة</> : <ChevronsLeft size={15} />)
              : <><ChevronsRight size={15} /> طي القائمة</>}
          </span>
        </div>

      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface-canvas)' }}>
        <header style={{
          height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: 'var(--surface-page)', borderBottom: '1px solid var(--border-default)', gap: 12,
          position: 'relative',
        }}>
          <TopProgressBar triggerKey={location.pathname} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span className="dv2-hamburger" onClick={() => setMobileNavOpen(true)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Menu size={20} />
            </span>
            <div className="dv2-header-subtitle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              لوحة تحكم مدار
            </div>
            <div className="dv2-global-search" style={{ flex: 1, minWidth: 0 }}><GlobalSearch base={base} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <Tooltip label="حجوزات اليوم">
              <span
                onClick={() => navigate(`${base}/bookings`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', cursor: 'pointer',
                  borderRadius: 'var(--radius-full)', background: 'var(--brand-50)', color: 'var(--brand-700)',
                  fontSize: 12.5, fontWeight: 700,
                }}
              >
                <CalendarCheck2 size={14} /> {todayCount}
              </span>
            </Tooltip>
            <motion.span
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.82, rotate: 15 }}
              style={{ cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', overflow: 'hidden' }}
            >
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
            </motion.span>
            <WhatsNewBadge />
            <NotificationCenter />
            <AccountMenu base={base} />
          </div>
        </header>
        {!isDemo && accountError && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            padding: '10px 20px', background: 'var(--danger-50, #FEF2F2)', borderBottom: '1px solid var(--danger-200, #FECACA)',
            color: 'var(--danger-600, #DC2626)', fontSize: 13, fontWeight: 600, flexShrink: 0,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={16} /> {accountError}</span>
            <span onClick={() => refreshAccount()} style={{ cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>إعادة المحاولة</span>
          </div>
        )}
        <main className="dv2-main" style={{ flex: 1, overflowY: 'auto', padding: 24, position: 'relative' }}>
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
      <SupportChat />
      <OnboardingWizard />
      <ShortcutsOverlay />
      <Fab actions={[{ label: 'حجز جديد', icon: <Plus size={15} />, onClick: () => navigate(`${base}/bookings?new=1`) }]} />
    </div>
    </ToastProvider>
  )
}
