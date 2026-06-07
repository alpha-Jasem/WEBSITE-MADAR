import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Bot, Users, UserCheck,
  Stethoscope, CalendarDays, MessageSquare, Settings, Lock, Plus, X, TrendingUp, Sparkles,
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
    { path: '/reports',        icon: TrendingUp,      label: 'التقارير' },
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

      {/* Upgrade Card / Active Badge */}
      <div style={{ padding: '8px 10px 12px', borderTop: '1px solid #F1F5F9' }}>
        {!isAIPro ? (
          /* ── Upgrade Card ── */
          <div style={{
            borderRadius: 14,
            background: 'linear-gradient(145deg, #EEF2FF 0%, #F5F3FF 100%)',
            border: '1px solid #C7D2FE',
            padding: '14px 14px 12px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow blob */}
            <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{
                fontSize: 10, padding: '2px 9px', borderRadius: 20,
                background: 'rgba(79,70,229,0.12)', color: '#4F46E5',
                fontWeight: 800, fontFamily: 'Cairo, sans-serif',
                border: '1px solid rgba(79,70,229,0.2)',
              }}>
                واتساب
              </span>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'white', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <TrendingUp size={13} style={{ color: '#4F46E5' }} />
              </div>
            </div>

            {/* Text */}
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 4, lineHeight: 1.35 }}>
              ارتق إلى AI Pro
            </div>
            <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.5, marginBottom: 12 }}>
              {isDemo ? 'جرّب الحجز الذكي بالكامل مع وكيل AI يستقبل مكالماتك.' : 'وكيل AI يحجز بدلاً عنك ٢٤/٧ بدون موظف استقبال.'}
            </div>

            {/* CTA Button */}
            <a
              href={`https://wa.me/966546666005?text=${encodeURIComponent('مرحباً 👋\nأريد الترقية إلى باقة AI Voice + واتساب.\nيرجى إرسال تفاصيل الترقية.')}`}
              target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', padding: '9px 0', borderRadius: 9,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: 'white', fontSize: 12, fontWeight: 800,
                fontFamily: 'Cairo, sans-serif', textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              }}
            >
              <Sparkles size={12} />
              ثبّت الاشتراك الآن
            </a>
          </div>
        ) : (
          /* ── Active AI Pro Badge ── */
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', border: '1px solid #C4B5FD' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', fontFamily: 'Cairo, sans-serif', marginBottom: 2 }}>AI Voice + واتساب</div>
            <div style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'Tajawal, sans-serif' }}>{isDemo ? 'وضع التجربة' : 'حساب نشط ✓'}</div>
          </div>
        )}
      </div>
    </aside>
  )
}
