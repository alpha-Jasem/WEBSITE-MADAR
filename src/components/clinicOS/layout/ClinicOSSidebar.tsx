import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Bot, Users, UserCheck,
  Stethoscope, CalendarDays, MessageSquare, Settings, Lock, Plus, X
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
  locked?: boolean
}

interface Props {
  onNewAppointment?: () => void
  onClose?: () => void
}

export const ClinicOSSidebar = ({ onNewAppointment, onClose }: Props) => {
  const { packageType, isDemo, clinicName } = useClinicOS()
  const location = useLocation()
  const isAIPro = packageType === 'ai_pro'

  // Use demo prefix when in /clinic-os/demo, dashboard prefix otherwise
  const inDemo = location.pathname.startsWith('/clinic-os/demo')
  const base = inDemo ? '/clinic-os/demo' : '/clinic-os/dashboard'

  const navItems: NavItem[] = [
    { path: '',                icon: LayoutDashboard, label: 'الرئيسية' },
    { path: '/appointments',   icon: Calendar,        label: 'المواعيد' },
    { path: '/ai-booking',     icon: Bot,             label: 'الحجز الذكي', locked: !isAIPro },
    { path: '/patients',       icon: Users,           label: 'العملاء' },
    { path: '/doctors',        icon: UserCheck,       label: 'الأطباء' },
    { path: '/services',       icon: Stethoscope,     label: 'الخدمات' },
    { path: '/calendar',       icon: CalendarDays,    label: 'التقويم' },
    { path: '/messages',       icon: MessageSquare,   label: 'الرسائل' },
    { path: '/settings',       icon: Settings,        label: 'الإعدادات' },
  ]

  return (
    <aside style={{
      width: 220,
      background: '#FFFFFF',
      borderLeft: '1px solid #E2E8F0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      flexShrink: 0,
      direction: 'rtl',
    }}>
      {/* Logo + close btn */}
      <div style={{ padding: '16px 12px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Stethoscope size={15} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', lineHeight: 1.2 }}>Clinic OS</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
              {clinicName || 'نظام الحجز الذكي'}
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* New Appointment */}
      <div style={{ padding: '10px 10px 6px' }}>
        <button
          onClick={onNewAppointment}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
        >
          <Plus size={15} />
          موعد جديد
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {navItems.map(item => {
          const Icon = item.icon
          const to = base + item.path
          return (
            <NavLink
              key={to}
              to={to}
              end={item.path === ''}
              onClick={onClose}
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
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ padding: '8px 12px', borderRadius: 8, background: isAIPro ? 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' : '#F8FAFC', border: `1px solid ${isAIPro ? '#C7D2FE' : '#E2E8F0'}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: isAIPro ? '#7C3AED' : '#94A3B8', fontFamily: 'Cairo, sans-serif', marginBottom: 2 }}>
            {isAIPro ? 'باقة الحجز الذكي 24/7' : 'باقة نمو الحجوزات'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
            {isDemo ? 'وضع التجربة' : 'حساب نشط ✓'}
          </div>
        </div>
      </div>
    </aside>
  )
}
