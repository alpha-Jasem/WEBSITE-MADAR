import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Zap, Users2, FileText, LogOut, Settings, Activity } from 'lucide-react'
import { signOut } from '../../../lib/supabase'

const links = [
  { to: '/admin',             icon: LayoutDashboard, label: 'نظرة عامة',         color: '#F59E0B' },
  { to: '/admin/companies',   icon: Building2,        label: 'الشركات',           color: '#00BFFF' },
  { to: '/admin/automations', icon: Zap,              label: 'الأتمتة',           color: '#8B5CF6' },
  { to: '/admin/leads',       icon: Users2,           label: 'العملاء المحتملون', color: '#10B981' },
  { to: '/admin/logs',        icon: Activity,         label: 'السجلات',           color: '#F43F5E' },
  { to: '/admin/settings',    icon: Settings,         label: 'الإعدادات',         color: '#94A3B8' },
]

export const AdminSidebar = () => {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: '#0E1017', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MADAR" style={{ height: 44, width: 'auto' }} />
          <div>
            <p className="text-xs font-bold text-white font-sora tracking-widest">MADAR</p>
            <p className="text-[10px] font-tajawal" style={{ color: '#F59E0B' }}>لوحة الإدارة</p>
          </div>
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-tajawal tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.2)' }}>
          القائمة الرئيسية
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to} end={to === '/admin'}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer group"
            style={({ isActive }) => isActive
              ? { background: `${color}18`, color: color, borderRight: `2px solid ${color}` }
              : { color: 'rgba(255,255,255,0.35)' }
            }
          >
            {({ isActive }) => (
              <>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: isActive ? `${color}22` : 'rgba(255,255,255,0.04)' }}>
                  <Icon size={14} style={{ color: isActive ? color : 'rgba(255,255,255,0.35)' }} />
                </div>
                <span className="flex-1">{label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
        {/* Stats summary */}
        <div className="px-3 py-3 rounded-xl mb-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <p className="text-[10px] font-tajawal mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>حالة النظام</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs font-tajawal text-emerald-400">جميع الأنظمة تعمل</p>
          </div>
        </div>

        <button onClick={handleSignOut}
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
