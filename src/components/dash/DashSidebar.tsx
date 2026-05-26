import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Crown, LogOut, Sparkles, TrendingUp } from 'lucide-react'
import { signOut } from '../../lib/supabase'
import type { Company } from '../../types'
import { PLAN_LABELS } from '../../lib/constants'

export interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  end?: boolean
}

interface Props {
  navItems: NavItem[]
  open: boolean
  onClose: () => void
  role?: 'admin' | 'client'
  company?: Company | null
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#06B6D4',
  growth: '#6366F1',
  enterprise: '#F59E0B',
}

export const DashSidebar = ({ navItems, open, onClose, role = 'admin', company }: Props) => {
  const navigate = useNavigate()
  const plan = company?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[plan] ?? 'Starter'
  const isPremium = plan === 'enterprise'
  const planColor = PLAN_COLORS[plan] ?? '#06B6D4'

  return (
    <>
      {open && <div className="dash-overlay" onClick={onClose} />}

      <aside className={`dash-sidebar dash-sidebar-${role}${open ? ' open' : ''}`}>
        <div className="dash-sidebar-brand">
          <img className="dash-sidebar-logo-img" src="/logo-main.png" alt="Madar.software" />
          <div>
            <p className="dash-sidebar-name">
              Madar<span>.software</span>
            </p>
            <p className="dash-sidebar-sub">
              {role === 'admin' ? 'Admin command center' : 'Client portal'}
            </p>
          </div>
        </div>

        <nav className="dash-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `dash-nav-link${isActive ? ' active' : ''}`}
            >
              <span className="dash-nav-icon">
                <Icon size={17} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Upgrade card — only for non-premium clients */}
        {role === 'client' && company && !isPremium && (
          <div className="dash-upgrade-card" style={{ borderColor: planColor + '44' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="dash-upgrade-icon" style={{ background: planColor + '22', border: `1px solid ${planColor}44` }}>
                <TrendingUp size={16} style={{ color: planColor }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: planColor, fontFamily: 'Sora, sans-serif', background: planColor + '18', padding: '2px 8px', borderRadius: 99 }}>
                {planLabel}
              </span>
            </div>
            <strong style={{ color: '#F1F5F9' }}>
              {plan === 'starter' ? 'ارتقِ إلى Pro' : 'ارتقِ إلى Premium'}
            </strong>
            <p style={{ color: '#475569' }}>
              {plan === 'starter'
                ? 'افتح التقارير الكاملة، المالية، وأداء الموظفين.'
                : 'افتح رؤى AI، تعدد الفروع، والتقارير المتقدمة.'}
            </p>
            <button
              type="button"
              onClick={() => { navigate('/client/upgrade'); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', width: '100%', justifyContent: 'center', marginTop: 4 }}
            >
              <Sparkles size={12} />
              {plan === 'starter' ? 'ترقية إلى Pro' : 'ترقية إلى Premium'}
            </button>
          </div>
        )}

        <div className="dash-sidebar-footer">
          <div className="dash-user-card">
            <div className="dash-user-avatar">{company?.owner_name?.[0] ?? 'A'}</div>
            <div>
              <strong>{company?.owner_name ?? 'Admin'}</strong>
              <span>{role === 'admin' ? 'Admin' : planLabel}</span>
            </div>
            <ChevronDown size={15} />
          </div>

          <button
            type="button"
            className="dash-logout-btn"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
