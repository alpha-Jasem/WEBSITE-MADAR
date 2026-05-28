import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Zap, Users2, BarChart3, Settings, LogOut, ChevronRight, Calendar, MessageSquare, Wrench } from 'lucide-react'
import { signOut } from '../../../lib/supabase'

const links = [
  { to: '/client',                    icon: LayoutDashboard, label: 'نظرة عامة',          end: true },
  { to: '/client/setup',              icon: Wrench,          label: 'إعداد النظام',         end: false },
  { to: '/client/appointments',       icon: Calendar,        label: 'المواعيد',             end: false },
  { to: '/client/conversations',      icon: MessageSquare,   label: 'المحادثات الحية',      end: false },
  { to: '/client/automations',        icon: Zap,             label: 'أتمتتي',               end: false },
  { to: '/client/leads',              icon: Users2,          label: 'العملاء المحتملون',     end: false },
  { to: '/client/reports',            icon: BarChart3,       label: 'التقارير',             end: false },
  { to: '/client/settings',           icon: Settings,        label: 'الإعدادات',            end: false },
]

export const ClientSidebarNew = () => {
  const navigate = useNavigate()

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0"
      style={{ background: 'rgba(5,6,10,0.98)', borderLeft: '1px solid #E2E8F0' }}>

      <div className="p-5 border-b" style={{ borderColor: '#F8FAFC' }}>
        <div className="flex items-center gap-3">
          <div style={{ background: 'white', borderRadius: 8, padding: '3px 8px' }}>
            <img src="/logo.jpeg" alt="MADAR" style={{ height: 28, width: 'auto' }} />
          </div>
          <div>
            <p className="text-xs font-bold text-white font-sora">MADAR</p>
            <p className="text-[10px] font-tajawal text-primary-400">بوابة العميل</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-tajawal transition-all cursor-pointer ${isActive
                ? 'text-white'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: 'rgba(79,110,247,0.12)', color: '#4F6EF7', borderRight: '2px solid #4F6EF7' }
              : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={12} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: '#F8FAFC' }}>
        <button onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all font-tajawal cursor-pointer">
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
