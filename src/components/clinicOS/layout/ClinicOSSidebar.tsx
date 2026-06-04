import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Bot, Users, UserCheck,
  Stethoscope, CalendarDays, MessageSquare, Settings, Lock, Plus
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  locked?: boolean
}

export const ClinicOSSidebar = ({ onNewAppointment }: { onNewAppointment?: () => void }) => {
  const { packageType } = useClinicOS()
  const isAIPro = packageType === 'ai_pro'

  const navItems: NavItem[] = [
    { to: '/clinic-os/dashboard',              icon: LayoutDashboard, label: 'الرئيسية' },
    { to: '/clinic-os/dashboard/appointments', icon: Calendar,        label: 'المواعيد' },
    { to: '/clinic-os/dashboard/ai-booking',   icon: Bot,             label: 'الحجز الذكي', locked: !isAIPro },
    { to: '/clinic-os/dashboard/patients',     icon: Users,           label: 'المرضى' },
    { to: '/clinic-os/dashboard/doctors',      icon: UserCheck,       label: 'الأطباء' },
    { to: '/clinic-os/dashboard/services',     icon: Stethoscope,     label: 'الخدمات' },
    { to: '/clinic-os/dashboard/calendar',     icon: CalendarDays,    label: 'التقويم' },
    { to: '/clinic-os/dashboard/messages',     icon: MessageSquare,   label: 'الرسائل' },
    { to: '/clinic-os/dashboard/settings',     icon: Settings,        label: 'الإعدادات' },
  ]

  return (
    <aside style={{ width: 220, background: '#FFFFFF', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0, direction: 'rtl' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Stethoscope size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', lineHeight: 1.2 }}>Clinic OS</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>نظام الحجز الذكي</div>
          </div>
        </div>
      </div>

      {/* New Appointment */}
      <div style={{ padding: '12px 12px 8px' }}>
        <button
          onClick={onNewAppointment}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <Plus size={15} />
          موعد جديد
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {navItems.map(item => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/clinic-os/dashboard'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9, marginBottom: 2,
                textDecoration: 'none', fontSize: 13, fontWeight: 600,
                fontFamily: 'Tajawal, Cairo, sans-serif',
                background: isActive ? '#EEF2FF' : 'transparent',
                color: isActive ? '#4F46E5' : item.locked ? '#CBD5E1' : '#475569',
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; if (!el.style.background.includes('EEF2FF')) el.style.background = '#F8FAFC' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; if (!el.style.background.includes('EEF2FF')) el.style.background = 'transparent' }}
            >
              <Icon size={16} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.locked && <Lock size={12} style={{ color: '#CBD5E1' }} />}
            </NavLink>
          )
        })}
      </nav>

      {/* Package badge */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: isAIPro ? 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' : '#F8FAFC', border: `1px solid ${isAIPro ? '#C7D2FE' : '#E2E8F0'}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: isAIPro ? '#7C3AED' : '#94A3B8', fontFamily: 'Cairo, sans-serif', marginBottom: 2 }}>
            {isAIPro ? 'باقة الحجز الذكي 24/7' : 'باقة نمو الحجوزات'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>وضع التجربة</div>
        </div>
      </div>
    </aside>
  )
}
