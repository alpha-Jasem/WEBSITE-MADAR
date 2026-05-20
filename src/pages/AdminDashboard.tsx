import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Building2,
  FlameKindling,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Users2,
  Workflow,
  Zap,
} from 'lucide-react'
import { AdminOverview } from '../components/dashboard/admin/AdminOverview'
import { AdminCommandDeck } from '../components/dashboard/admin/AdminCommandDeck'
import { AdminCompanies } from '../components/dashboard/admin/AdminCompanies'
import { AdminAutomations } from '../components/dashboard/admin/AdminAutomations'
import { AdminLeads } from '../components/dashboard/admin/AdminLeads'
import { AdminLogs } from '../components/dashboard/admin/AdminLogs'
import { AdminSettings } from '../components/dashboard/admin/AdminSettings'
import { AdminN8n } from '../components/dashboard/admin/AdminN8n'
import { AdminPipeline } from '../components/dashboard/admin/AdminPipeline'
import { SolarOverview } from '../components/solar/SolarOverview'
import { signOut } from '../lib/supabase'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Command Deck', accent: '#f3a64f', end: true },
  { to: '/admin/forge', icon: FlameKindling, label: 'Celestial Forge', accent: '#f3a64f' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Signal Analytics', accent: '#65d6ff' },
  { to: '/admin/companies', icon: Building2, label: 'Accounts', accent: '#8de2cb' },
  { to: '/admin/leads', icon: Users2, label: 'Live Pipeline', accent: '#f3a64f' },
  { to: '/admin/pipeline', icon: GitBranch, label: 'Orbit Flow', accent: '#6eb5ff' },
  { to: '/admin/messages', icon: MessageSquare, label: 'Messages', accent: '#88f0d0' },
  { to: '/admin/automations', icon: Zap, label: 'Automations', accent: '#f3a64f' },
  { to: '/admin/n8n', icon: Workflow, label: 'n8n Reactor', accent: '#ff8f54' },
  { to: '/admin/logs', icon: Activity, label: 'System Logs', accent: '#65d6ff' },
  { to: '/admin/settings', icon: Settings, label: 'Control Room', accent: '#8c97ab' },
]

function AdminRail() {
  const navigate = useNavigate()

  return (
    <aside className="solar-admin-rail">
      <div className="solar-admin-brand">
        <div className="solar-admin-brand-mark">
          <BrainCircuit size={18} />
        </div>
        <div>
          <p className="solar-admin-kicker">Madar Admin</p>
          <h1>Solar Engine Core</h1>
        </div>
      </div>

      <div className="solar-admin-rail-copy">
        Luxury control surface for operators, campaigns, and AI orchestration.
      </div>

      <nav className="solar-admin-nav">
        {navItems.map(({ to, icon: Icon, label, accent, end }) => (
          <NavLink key={to} to={to} end={end} className="solar-admin-nav-link">
            {({ isActive }) => (
              <motion.div
                className={`solar-admin-nav-inner ${isActive ? 'is-active' : ''}`}
                whileHover={{ x: -2 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                style={
                  isActive
                    ? {
                        borderColor: `${accent}55`,
                        boxShadow: `0 0 30px ${accent}22`,
                      }
                    : undefined
                }
              >
                <span
                  className="solar-admin-nav-icon"
                  style={
                    isActive
                      ? {
                          color: accent,
                          background: `${accent}1c`,
                          borderColor: `${accent}40`,
                        }
                      : undefined
                  }
                >
                  <Icon size={15} />
                </span>
                <span>{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="solar-admin-status">
        <div className="solar-admin-status-pulse" />
        <div>
          <p>Core online</p>
          <span>Realtime systems stable</span>
        </div>
      </div>

      <button
        type="button"
        className="solar-admin-logout"
        onClick={async () => {
          await signOut()
          navigate('/login')
        }}
      >
        <LogOut size={15} />
        Exit control room
      </button>
    </aside>
  )
}

export const AdminDashboard = () => {
  const location = useLocation()
  const isForge = location.pathname.startsWith('/admin/forge')
  const isCommand = location.pathname === '/admin' || location.pathname === '/admin/'
  const isHud = isForge || isCommand
  const currentPage = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )

  return (
    <div className={`solar-admin-shell${isHud ? ' is-forge' : ''}`} dir="ltr">
      {!isHud && (
        <div className="solar-admin-background">
          <div className="solar-admin-ambient solar-admin-ambient-a" />
          <div className="solar-admin-ambient solar-admin-ambient-b" />
          <div className="solar-admin-ambient solar-admin-ambient-c" />
          <div className="solar-admin-grid" />
        </div>
      )}

      <AdminRail />

      <div className="solar-admin-main">
        <header className="solar-admin-topbar">
          <div>
            <p className="solar-admin-kicker">Administrative portal only</p>
            <h2>{currentPage?.label ?? 'Command Deck'}</h2>
          </div>

          <div className="solar-admin-topbar-meta">
            <span>Luxury mode</span>
            <span>Live motion enabled</span>
          </div>
        </header>

        <main className="solar-admin-content">
          <Routes>
            <Route index element={<AdminCommandDeck />} />
            <Route path="forge" element={<SolarOverview />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="automations" element={<AdminAutomations />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="n8n" element={<AdminN8n />} />
            <Route path="analytics" element={<AdminOverview />} />
            <Route path="pipeline" element={<AdminPipeline />} />
            <Route path="messages" element={<AdminOverview />} />
            <Route path="*" element={<AdminOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
