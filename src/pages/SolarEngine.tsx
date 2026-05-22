import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart2,
  Bot,
  Calendar,
  Heart,
  Home,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react'
import { signOut } from '../lib/supabase'
import { SolarOverview } from '../components/solar/SolarOverview'
import { SolarCustomers } from '../components/solar/SolarCustomers'
import { SolarAppointments } from '../components/solar/SolarAppointments'
import { SolarServices } from '../components/solar/SolarServices'
import { SolarStaff } from '../components/solar/SolarStaff'
import { SolarAnalytics } from '../components/solar/SolarAnalytics'
import { SolarAiAssistant } from '../components/solar/SolarAiAssistant'
import { SolarAutomation } from '../components/solar/SolarAutomation'
import { SolarLoyalty } from '../components/solar/SolarLoyalty'
import { SolarSettings } from '../components/solar/SolarSettings'

const NAV = [
  { to: '/solar', label: 'Overview', icon: Home, end: true },
  { to: '/solar/customers', label: 'Customers', icon: Users },
  { to: '/solar/appointments', label: 'Appointments', icon: Calendar },
  { to: '/solar/services', label: 'Services', icon: Wrench },
  { to: '/solar/automation', label: 'Automation', icon: Zap },
  { to: '/solar/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/solar/ai', label: 'AI Assistant', icon: Bot },
  { to: '/solar/staff', label: 'Staff', icon: Shield },
  { to: '/solar/loyalty', label: 'Loyalty', icon: Heart },
  { to: '/solar/settings', label: 'Settings', icon: Settings },
]

function SolarSidebar() {
  const navigate = useNavigate()
  return (
    <aside className="se-sidebar">
      <div className="se-brand">
        <div className="se-brand-icon">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="se-brand-sub">Madar</p>
          <h1 className="se-brand-title">Solar Engine</h1>
        </div>
      </div>

      <nav className="se-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="se-nav-link">
            {({ isActive }) => (
              <motion.div
                className={`se-nav-item ${isActive ? 'se-nav-active' : ''}`}
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <Icon size={16} />
                <span>{label}</span>
                {isActive && <motion.div className="se-nav-dot" layoutId="se-active-dot" />}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="se-sidebar-status">
        <div className="se-status-dot" />
        <p>System Status: <strong>OPTIMAL</strong></p>
      </div>

      <button
        type="button"
        className="se-logout"
        onClick={async () => { await signOut(); navigate('/login') }}
      >
        <LogOut size={14} />
        Exit
      </button>
    </aside>
  )
}

export const SolarEngine = () => {
  return (
    <div className="se-shell">
      {/* Background video */}
      <div className="se-bg">
        <video
          className="se-bg-video"
          src="/assets/solar-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="se-bg-overlay" />
      </div>

      <SolarSidebar />

      <main className="se-main">
        <Routes>
          <Route index element={<SolarOverview />} />
          <Route path="customers" element={<SolarCustomers />} />
          <Route path="appointments" element={<SolarAppointments />} />
          <Route path="services" element={<SolarServices />} />
          <Route path="automation" element={<SolarAutomation />} />
          <Route path="analytics" element={<SolarAnalytics />} />
          <Route path="ai" element={<SolarAiAssistant />} />
          <Route path="staff" element={<SolarStaff />} />
          <Route path="loyalty" element={<SolarLoyalty />} />
          <Route path="settings" element={<SolarSettings />} />
        </Routes>
      </main>
    </div>
  )
}
