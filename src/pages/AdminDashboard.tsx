import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Building2, Zap, Users2,
  LogOut, Settings, Activity, MessageSquare, BarChart3,
  GitBranch, Workflow, Menu, X, ChevronLeft
} from 'lucide-react'
import { AdminOverview }    from '../components/dashboard/admin/AdminOverview'
import { AdminCompanies }   from '../components/dashboard/admin/AdminCompanies'
import { AdminAutomations } from '../components/dashboard/admin/AdminAutomations'
import { AdminLeads }       from '../components/dashboard/admin/AdminLeads'
import { AdminLogs }        from '../components/dashboard/admin/AdminLogs'
import { AdminSettings }    from '../components/dashboard/admin/AdminSettings'
import { AdminN8n }         from '../components/dashboard/admin/AdminN8n'
import { signOut }          from '../lib/supabase'

const navItems = [
  { to: '/admin',             icon: LayoutDashboard, label: 'نظرة عامة',        accent: '#F59E0B',  end: true },
  { to: '/admin/analytics',   icon: BarChart3,       label: 'التقارير',          accent: '#00BFFF' },
  { to: '/admin/companies',   icon: Building2,       label: 'الشركات',           accent: '#00BFFF' },
  { to: '/admin/leads',       icon: Users2,          label: 'العملاء المحتملون', accent: '#10B981' },
  { to: '/admin/pipeline',    icon: GitBranch,       label: 'خط المبيعات',       accent: '#8B5CF6' },
  { to: '/admin/messages',    icon: MessageSquare,   label: 'المحادثات',         accent: '#EC4899' },
  { to: '/admin/automations', icon: Zap,             label: 'الأتمتة',           accent: '#F59E0B' },
  { to: '/admin/n8n',         icon: Workflow,        label: 'n8n Workflows',     accent: '#EA580C' },
  { to: '/admin/logs',        icon: Activity,        label: 'السجلات',           accent: '#F43F5E' },
  { to: '/admin/settings',    icon: Settings,        label: 'الإعدادات',         accent: '#94A3B8' },
]

function GarageNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()

  const go = (to: string) => {
    navigate(to)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Garage panel — slides down from top */}
          <motion.div
            key="garage"
            initial={{ y: '-100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260, mass: 0.8 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(48px) saturate(200%)',
              WebkitBackdropFilter: 'blur(48px) saturate(200%)',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.1) inset',
              paddingBottom: 28,
            }}
          >
            {/* Top bar inside panel */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 32px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo-main.png" alt="Madar"
                  style={{ height: 32, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' }} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
                  Madar<span style={{ color: '#00BFFF' }}>.software</span>
                </span>
              </div>
              <button onClick={onClose} style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Nav grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              padding: '20px 32px',
            }}>
              {navItems.map(({ to, icon: Icon, label, accent, end }, i) => {
                const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                return (
                  <motion.button
                    key={to}
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', damping: 20 }}
                    onClick={() => go(to)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '14px 10px', borderRadius: 16, cursor: 'pointer',
                      background: isActive ? `rgba(255,255,255,0.12)` : 'rgba(255,255,255,0.04)',
                      border: isActive ? `1px solid ${accent}50` : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isActive ? `0 0 24px ${accent}25, inset 0 1px 0 rgba(255,255,255,0.1)` : 'none',
                      transition: 'all 0.2s',
                      position: 'relative', overflow: 'hidden',
                    }}
                    whileHover={{ scale: 1.04, background: 'rgba(255,255,255,0.1)' } as any}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isActive && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                      }} />
                    )}
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: isActive ? `${accent}20` : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isActive ? accent + '40' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isActive ? `0 0 16px ${accent}35` : 'none',
                    }}>
                      <Icon size={16} style={{ color: isActive ? accent : 'rgba(255,255,255,0.5)' }} />
                    </div>
                    <span style={{
                      fontSize: 11, fontFamily: 'Tajawal', fontWeight: isActive ? 700 : 400,
                      color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                      textAlign: 'center', lineHeight: 1.3,
                    }}>
                      {label}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* Status + logout row */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                <span style={{ fontSize: 12, color: '#10B981', fontFamily: 'Tajawal' }}>جميع الأنظمة تعمل</span>
              </div>
              <button
                onClick={async () => { await signOut(); navigate('/login') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                  color: '#F43F5E', fontSize: 12, fontFamily: 'Tajawal', cursor: 'pointer',
                }}
              >
                <LogOut size={13} />
                تسجيل الخروج
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export const AdminDashboard = () => {
  const [navOpen, setNavOpen] = useState(false)
  const location = useLocation()

  const currentPage = navItems.find(n =>
    n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )

  return (
    <div style={{ background: '#060810', direction: 'rtl', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>

      {/* ── Aurora Background ── */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, #0d1530 0%, #080c1a 60%)' }} />
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 750, height: 750, borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%', background: 'radial-gradient(ellipse, rgba(0,191,255,0.45) 0%, rgba(0,140,220,0.2) 40%, transparent 70%)', filter: 'blur(55px)', animation: 'aurora1 14s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', top: '20%', left: '35%', width: 650, height: 550, borderRadius: '40% 60% 30% 70% / 60% 40% 60% 40%', background: 'radial-gradient(ellipse, rgba(140,80,255,0.38) 0%, rgba(100,50,220,0.15) 50%, transparent 70%)', filter: 'blur(65px)', animation: 'aurora2 18s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 700, height: 600, borderRadius: '50% 50% 40% 60% / 40% 60% 50% 50%', background: 'radial-gradient(ellipse, rgba(0,220,130,0.32) 0%, rgba(0,180,90,0.14) 50%, transparent 70%)', filter: 'blur(60px)', animation: 'aurora3 16s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', top: '5%', right: '10%', width: 450, height: 380, background: 'radial-gradient(ellipse, rgba(245,158,11,0.28) 0%, rgba(230,120,0,0.1) 50%, transparent 70%)', filter: 'blur(50px)', animation: 'aurora4 12s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
      </div>

      <style>{`
        @keyframes aurora1 { 0% { transform: translate(0,0) scale(1) rotate(0deg); } 100% { transform: translate(80px,60px) scale(1.15) rotate(8deg); } }
        @keyframes aurora2 { 0% { transform: translate(0,0) scale(1) rotate(0deg); } 100% { transform: translate(-60px,80px) scale(1.1) rotate(-6deg); } }
        @keyframes aurora3 { 0% { transform: translate(0,0) scale(1) rotate(0deg); } 100% { transform: translate(-80px,-50px) scale(1.2) rotate(10deg); } }
        @keyframes aurora4 { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(40px,30px) scale(1.15); } }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        height: 56,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(32px) saturate(180%)',
        WebkitBackdropFilter: 'blur(32px) saturate(180%)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
      }}>
        {/* Logo + menu btn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNavOpen(o => !o)}
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: navOpen ? 'rgba(0,191,255,0.15)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${navOpen ? 'rgba(0,191,255,0.35)' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: navOpen ? '0 0 20px rgba(0,191,255,0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <motion.div animate={{ rotate: navOpen ? 90 : 0 }} transition={{ type: 'spring', damping: 18 }}>
              {navOpen ? <X size={16} color="#00BFFF" /> : <Menu size={16} color="rgba(255,255,255,0.7)" />}
            </motion.div>
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo-main.png" alt="Madar"
              style={{ height: 28, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))' }} />
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
              Madar<span style={{ color: '#00BFFF' }}>.software</span>
            </span>
          </div>
        </div>

        {/* Current page breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {currentPage && (
            <>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal' }}>لوحة الإدارة</span>
              <ChevronLeft size={12} style={{ color: 'rgba(255,255,255,0.2)', transform: 'scaleX(-1)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: currentPage.accent, fontFamily: 'Tajawal' }}>
                {currentPage.label}
              </span>
            </>
          )}
        </div>

        {/* Status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 11, color: '#10B981', fontFamily: 'Tajawal' }}>مباشر</span>
        </div>
      </div>

      {/* ── Garage Nav ── */}
      <GarageNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* ── Main content (full width) ── */}
      <main style={{ position: 'relative', zIndex: 10, paddingTop: 56 }}>
        <div style={{ padding: '28px 40px', maxWidth: 1400, margin: '0 auto' }}>
          <Routes>
            <Route index              element={<AdminOverview />} />
            <Route path="companies"   element={<AdminCompanies />} />
            <Route path="automations" element={<AdminAutomations />} />
            <Route path="leads"       element={<AdminLeads />} />
            <Route path="logs"        element={<AdminLogs />} />
            <Route path="settings"    element={<AdminSettings />} />
            <Route path="n8n"         element={<AdminN8n />} />
            <Route path="analytics"   element={<AdminOverview />} />
            <Route path="pipeline"    element={<AdminLeads />} />
            <Route path="messages"    element={<AdminLogs />} />
            <Route path="*"           element={<AdminOverview />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}
