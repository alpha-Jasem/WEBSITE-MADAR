import { useState, type ReactNode } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, MessageSquare, Star, BarChart3,
  Wallet, BellRing, Plug, Settings, Bell, ChevronDown, LogOut, CreditCard,
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicSupportTickets } from '../../../lib/clinicOSQueries'
import '../../../styles/dashboardV2Tokens.css'

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
  const { companyId, clinicName, userName, isDemo, logout } = useClinicOS()
  const [profileOpen, setProfileOpen] = useState(false)
  const { data: tickets } = useClinicSupportTickets(companyId, isDemo)
  const openTicketCount = (tickets || []).filter((t) => t.status === 'open').length

  const base = '/clinic-os/dashboard'
  const NAV: NavItem[] = [
    { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={17} /> },
    { label: 'الحجوزات', path: `${base}/bookings`, icon: <CalendarDays size={17} /> },
    { label: 'العملاء', path: `${base}/patients`, icon: <Users size={17} /> },
    { label: 'المحادثات', path: `${base}/conversations`, icon: <MessageSquare size={17} /> },
    { label: 'AI Google Reviews', path: `${base}/reviews`, icon: <Star size={17} />, badge: openTicketCount || undefined },
    { label: 'التقارير والتحليلات', path: `${base}/reports`, icon: <BarChart3 size={17} /> },
    { label: 'الإيرادات', path: `${base}/revenue`, icon: <Wallet size={17} /> },
    { label: 'Madar Agent Usage', path: `${base}/plan-usage`, icon: <CreditCard size={17} /> },
    { label: 'التذكيرات', path: `${base}/reminders`, icon: <BellRing size={17} /> },
    { label: 'التكاملات', path: `${base}/integrations`, icon: <Plug size={17} /> },
    { label: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={17} /> },
  ]

  return (
    <div className="dv2-scope" dir="rtl" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <nav style={{
        width: 240, background: 'var(--gradient-dark)', height: '100%', display: 'flex',
        flexDirection: 'column', padding: '20px 14px', boxSizing: 'border-box',
        fontFamily: 'var(--font-body)', color: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
          <img src="/logo-main.png" alt="مدار" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>مدار</div>
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
          padding: '0 24px', background: 'var(--surface-page)', borderBottom: '1px solid var(--border-default)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            لوحة تحكم مدار — نسخة تجريبية جديدة
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <Bell size={18} />
            </div>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
