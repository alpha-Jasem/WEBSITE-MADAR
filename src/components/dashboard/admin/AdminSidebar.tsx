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
      { to: '/admin',             icon: LayoutDashboard, label: 'نظرة عامة',         accent: '#F59E0B' },
      { to: '/admin/analytics',   icon: BarChart3,        label: 'التقارير',           accent: '#00BFFF' },
    ]
  },
  {
    label: 'إدارة العملاء',
    links: [
      { to: '/admin/companies',   icon: Building2,        label: 'الشركات',            accent: '#00BFFF' },
      { to: '/admin/leads',       icon: Users2,           label: 'العملاء المحتملون',  accent: '#10B981' },
      { to: '/admin/pipeline',    icon: GitBranch,        label: 'خط المبيعات',        accent: '#8B5CF6' },
      { to: '/admin/messages',    icon: MessageSquare,    label: 'المحادثات',          accent: '#EC4899' },
    ]
  },
  {
    label: 'الأتمتة والتشغيل',
    links: [
      { to: '/admin/automations', icon: Zap,              label: 'الأتمتة',            accent: '#F59E0B' },
      { to: '/admin/n8n',         icon: Workflow,         label: 'n8n Workflows',      accent: '#EA580C' },
      { to: '/admin/logs',        icon: Activity,         label: 'السجلات',            accent: '#F43F5E' },
    ]
  },
  {
    label: 'النظام',
    links: [
      { to: '/admin/settings',    icon: Settings,         label: 'الإعدادات',          accent: '#94A3B8' },
    ]
  },
]

export const AdminSidebar = () => {
  const navigate = useNavigate()

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: '#0A0C12', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <img src="/logo-main.png" alt="Madar"
            style={{ height: 36, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.4))' }} />
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

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-[9px] font-tajawal tracking-widest uppercase px-3 mb-2"
              style={{ color: 'rgba(255,255,255,0.2)' }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map(({ to, icon: Icon, label, accent }) => (
                <NavLink key={to} to={to} end={to === '/admin'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer group relative"
                  style={({ isActive }) => isActive
                    ? { background: `${accent}12`, color: 'white', borderRight: `2px solid ${accent}` }
                    : { color: 'rgba(255,255,255,0.35)' }
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: isActive ? `${accent}20` : 'rgba(255,255,255,0.04)' }}>
                        <Icon size={14} style={{ color: isActive ? accent : 'rgba(255,255,255,0.3)' }} />
                      </div>
                      <span className="flex-1 text-[13px]">{label}</span>
                      {isActive
                        ? <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                        : <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
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
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {/* System status */}
        <div className="px-3 py-3 rounded-xl mb-3"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.35)' }}>حالة النظام</p>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-xs font-tajawal text-emerald-400">جميع الأنظمة تعمل</p>
        </div>

        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F43F5E'; (e.currentTarget as HTMLElement).style.background = 'rgba(244,63,94,0.08)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={15} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
