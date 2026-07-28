import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, MessageSquare, Star, BarChart3,
  Wallet, BellRing, Plug, Settings, ChevronDown, LogOut, CreditCard, Menu, X,
  Wrench, History, Sun, Moon, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicSupportTickets } from '../../../lib/clinicOSQueries'
import { NotificationCenter } from './NotificationCenter'
import { AccountMenu } from './AccountMenu'
import { SupportChat } from './SupportChat'
import { GlobalSearch } from './GlobalSearch'
import { OnboardingWizard } from './OnboardingWizard'
import '../../../styles/dashboardV2Tokens.css'

const THEME_KEY = 'dv2_theme'

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
  const { companyId, clinicName, userName, isDemo, accountError, packageType, setPackageType, refreshAccount, logout } = useClinicOS()
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem(THEME_KEY) as 'dark') || 'light')
  const { data: tickets } = useClinicSupportTickets(companyId, isDemo)
  const openTicketCount = (tickets || []).filter((t) => t.status === 'open').length

  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])
  useEffect(() => { localStorage.setItem(THEME_KEY, theme) }, [theme])

  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const NAV: NavItem[] = [
    { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={17} /> },
    { label: 'الحجوزات', path: `${base}/bookings`, icon: <CalendarDays size={17} /> },
    { label: 'العملاء', path: `${base}/patients`, icon: <Users size={17} /> },
    { label: 'المحادثات', path: `${base}/conversations`, icon: <MessageSquare size={17} /> },
    { label: 'AI Google Reviews', path: `${base}/reviews`, icon: <Star size={17} />, badge: openTicketCount || undefined },
    { label: 'الخدمات', path: `${base}/services`, icon: <Wrench size={17} /> },
    { label: 'التقارير والتحليلات', path: `${base}/reports`, icon: <BarChart3 size={17} /> },
    { label: 'الإيرادات', path: `${base}/revenue`, icon: <Wallet size={17} /> },
    { label: 'Madar Agent Usage', path: `${base}/plan-usage`, icon: <CreditCard size={17} /> },
    { label: 'التذكيرات', path: `${base}/reminders`, icon: <BellRing size={17} /> },
    { label: 'التكاملات', path: `${base}/integrations`, icon: <Plug size={17} /> },
    { label: 'سجل التدقيق', path: `${base}/audit-log`, icon: <History size={17} /> },
    { label: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={17} /> },
  ]

  return (
    <div className="dv2-scope" dir="rtl" data-theme={theme} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .dv2-hamburger { display: none; }
        .dv2-backdrop { display: none; }
        @media (max-width: 900px) {
          .dv2-sidebar { position: fixed !important; inset-inline-start: 0; top: 0; bottom: 0; z-index: 1300;
            transition: transform .25s var(--ease-out); transform: translateX(100%); }
          [dir="rtl"] .dv2-sidebar { transform: translateX(100%); }
          .dv2-sidebar.open { transform: translateX(0) !important; }
          .dv2-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(11,13,19,.5); z-index: 1200; }
          .dv2-hamburger { display: flex !important; }
          .dv2-header-subtitle { display: none; }
          .dv2-global-search { display: none; }
          .dv2-main { padding: 14px !important; }
          .dv2-responsive-grid { grid-template-columns: 1fr !important; }
          .dv2-responsive-grid-2 { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      {mobileNavOpen && <div className="dv2-backdrop open" onClick={() => setMobileNavOpen(false)} />}
      <nav className={`dv2-sidebar${mobileNavOpen ? ' open' : ''}`} style={{
        width: 240, background: 'var(--gradient-dark)', height: '100%', display: 'flex',
        flexDirection: 'column', padding: '20px 14px', boxSizing: 'border-box',
        fontFamily: 'var(--font-body)', color: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-main.png" alt="مدار" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>مدار</div>
          </div>
          <span className="dv2-hamburger" onClick={() => setMobileNavOpen(false)} style={{ cursor: 'pointer', color: 'rgba(255,255,255,.7)' }}>
            <X size={20} />
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 24, flex: 1, overflowY: 'auto' }}>
          {NAV.map((item) => {
            const active = location.pathname === item.path
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  fontSize: 'var(--text-body-sm)', fontWeight: 600,
                  background: active ? 'rgba(255,255,255,.08)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,.65)',
                }}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge != null && (
                  <span style={{
                    background: 'var(--danger-500)', color: '#fff', borderRadius: 'var(--radius-full)',
                    fontSize: 10, fontWeight: 700, padding: '1px 6px',
                  }}>{item.badge}</span>
                )}
              </div>
            )
          })}
        </div>

        <div
          onClick={() => setProfileOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)',
            cursor: 'pointer', background: 'rgba(255,255,255,.06)', position: 'relative',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: 'var(--gradient-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{(userName || 'م')[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName || 'مستخدم'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clinicName || (isDemo ? 'عرض تجريبي' : '')}
            </div>
          </div>
          <ChevronDown size={14} style={{ opacity: 0.6 }} />
          {profileOpen && (
            <div style={{
              position: 'absolute', bottom: '110%', insetInlineStart: 0, insetInlineEnd: 0,
              background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden', color: 'var(--text-primary)',
            }}>
              <div
                onClick={logout}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 13, cursor: 'pointer' }}
              >
                <LogOut size={14} /> تسجيل الخروج
              </div>
            </div>
          )}
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface-canvas)' }}>
        <header style={{
          height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: 'var(--surface-page)', borderBottom: '1px solid var(--border-default)', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span className="dv2-hamburger" onClick={() => setMobileNavOpen(true)} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <Menu size={20} />
            </span>
            <div className="dv2-header-subtitle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              لوحة تحكم مدار
            </div>
            <div className="dv2-global-search" style={{ flex: 1, minWidth: 0 }}><GlobalSearch /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            {isDemo && (
              <>
                <div style={{ display: 'flex', background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
                  {([['whatsapp', 'واتساب'], ['ai_pro', 'AI Pro']] as const).map(([id, label]) => (
                    <span
                      key={id}
                      onClick={() => setPackageType(id)}
                      style={{
                        padding: '5px 12px', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        background: packageType === id ? '#fff' : 'transparent',
                        color: packageType === id ? 'var(--brand-600)' : 'var(--text-tertiary)',
                        boxShadow: packageType === id ? 'var(--shadow-sm)' : 'none',
                      }}
                    >{label}</span>
                  ))}
                </div>
                <span
                  onClick={() => window.open('/demo-review/internal-admin', '_blank')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}
                >
                  <ShieldCheck size={15} /> لوحة الإدارة
                </span>
              </>
            )}
            <span onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} style={{ cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <AccountMenu base={base} />
            <NotificationCenter />
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
        <main className="dv2-main" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
      <SupportChat />
      <OnboardingWizard />
    </div>
  )
}
