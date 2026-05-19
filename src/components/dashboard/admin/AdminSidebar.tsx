import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Zap, Users2, FileText,
  LogOut, Settings, Activity, MessageSquare, BarChart3,
  GitBranch, ChevronRight, Workflow
} from 'lucide-react'
import { signOut } from '../../../lib/supabase'

const sections = [
  {
    label: 'الرئيسية',
    links: [
      { to: '/admin',             icon: LayoutDashboard, label: 'نظرة عامة',        accent: '#F59E0B' },
      { to: '/admin/analytics',   icon: BarChart3,       label: 'التقارير',          accent: '#00BFFF' },
    ]
  },
  {
    label: 'إدارة العملاء',
    links: [
      { to: '/admin/companies',   icon: Building2,       label: 'الشركات',           accent: '#00BFFF' },
      { to: '/admin/leads',       icon: Users2,          label: 'العملاء المحتملون', accent: '#10B981' },
      { to: '/admin/pipeline',    icon: GitBranch,       label: 'خط المبيعات',       accent: '#8B5CF6' },
      { to: '/admin/messages',    icon: MessageSquare,   label: 'المحادثات',         accent: '#EC4899' },
    ]
  },
  {
    label: 'الأتمتة والتشغيل',
    links: [
      { to: '/admin/automations', icon: Zap,             label: 'الأتمتة',           accent: '#F59E0B' },
      { to: '/admin/n8n',         icon: Workflow,        label: 'n8n Workflows',     accent: '#EA580C' },
      { to: '/admin/logs',        icon: Activity,        label: 'السجلات',           accent: '#F43F5E' },
    ]
  },
  {
    label: 'النظام',
    links: [
      { to: '/admin/settings',    icon: Settings,        label: 'الإعدادات',         accent: '#94A3B8' },
    ]
  },
]

export const AdminSidebar = () => {
  const navigate = useNavigate()

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderLeft: '1px solid rgba(255,255,255,0.15)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.08), 4px 0 32px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo-main.png" alt="Madar"
            style={{ height: 36, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }} />
          <div>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1 }}>
              <span className="shimmer-text">Madar</span>
              <span className="shimmer-text-blue">.software</span>
            </span>
            <p className="text-[10px] font-tajawal mt-0.5" style={{ color: '#F59E0B' }}>
              لوحة الإدارة
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[9px] font-tajawal tracking-widest uppercase px-3 mb-2"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map(({ to, icon: Icon, label, accent }) => (
                <NavLink key={to} to={to} end={to === '/admin'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer group relative overflow-hidden"
                  style={({ isActive }) => isActive
                    ? {
                        background: `rgba(255,255,255,0.12)`,
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: 'white',
                        borderRight: `2px solid ${accent}`,
                        boxShadow: `0 0 20px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.15)`,
                      }
                    : { color: 'rgba(255,255,255,0.55)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: `linear-gradient(90deg, ${accent}10, transparent)`,
                          pointerEvents: 'none',
                        }} />
                      )}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: isActive ? `${accent}25` : 'rgba(255,255,255,0.08)',
                          border: isActive ? `1px solid ${accent}40` : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isActive ? `0 0 12px ${accent}30` : 'none',
                        }}
                      >
                        <Icon size={14} style={{ color: isActive ? accent : 'rgba(255,255,255,0.45)' }} />
                      </div>
                      <span className="flex-1 text-[13px] relative z-10">{label}</span>
                      {isActive
                        ? <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                        : <ChevronRight size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      }
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
        <div className="px-3 py-3 rounded-xl mb-3"
          style={{
            background: 'rgba(16,185,129,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.45)' }}>حالة النظام</p>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs font-tajawal text-emerald-400">جميع الأنظمة تعمل</p>
        </div>

        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = '#F43F5E'
            el.style.background = 'rgba(244,63,94,0.1)'
            el.style.backdropFilter = 'blur(12px)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'rgba(255,255,255,0.45)'
            el.style.background = 'transparent'
          }}
        >
          <LogOut size={15} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
