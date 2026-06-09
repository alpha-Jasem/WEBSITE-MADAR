import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Zap, Users2, BarChart3, Settings, LogOut, ChevronRight, Calendar, MessageSquare, Wrench, Car, Stethoscope } from 'lucide-react'
import { signOut } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

export const ClientSidebarNew = () => {
  const navigate = useNavigate()
  const { company } = useClientCompany()

  const isCarWash = company?.business_type === 'car_wash' || company?.industry === 'car_wash'
  const flags = ((company as any)?.cw_automations?.feature_flags || {}) as Record<string, boolean>
  const whatsappEnabled = !isCarWash || Boolean(flags.whatsapp || flags.wa_enabled)

  const links = [
    { to: '/client',               icon: LayoutDashboard, label: 'الرئيسية',            end: true,  show: true },
    { to: '/client/setup',         icon: Wrench,          label: 'إعداد النظام',         end: false, show: true },
    { to: '/client/appointments',  icon: Calendar,        label: 'المواعيد',             end: false, show: !isCarWash },
    { to: '/client/conversations', icon: MessageSquare,   label: 'المحادثات الحية',      end: false, show: whatsappEnabled },
    { to: '/client/automations',   icon: Zap,             label: 'واتساب',               end: false, show: whatsappEnabled },
    { to: '/client/leads',         icon: Users2,          label: 'العملاء المحتملون',     end: false, show: !isCarWash },
    { to: '/client/reports',       icon: BarChart3,       label: 'التقارير',             end: false, show: true },
    { to: '/client/settings',      icon: Settings,        label: 'الإعدادات',            end: false, show: true },
  ].filter(l => l.show)
  const accent    = isCarWash ? '#00BFFF' : '#10B981'
  const ProductIcon = isCarWash ? Car : Stethoscope
  const productName = isCarWash ? 'Car Wash OS' : 'Clinic OS'

  return (
    <aside className="w-64 flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0"
      style={{ background: 'rgba(5,6,10,0.98)', borderLeft: '1px solid #E2E8F0' }}>

      <div className="p-5 border-b" style={{ borderColor: '#0D1B3E' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, #0D1B3E, ${accent})` }}>
            <ProductIcon size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white font-sora">{productName}</p>
            <p className="text-[10px] font-tajawal" style={{ color: `${accent}99` }}>powered by Madar</p>
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
              ? { background: `${accent}14`, color: accent, borderRight: `2px solid ${accent}` }
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
