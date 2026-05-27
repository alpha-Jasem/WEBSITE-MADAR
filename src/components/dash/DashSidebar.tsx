import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Crown, LogOut, Sparkles, TrendingUp, Users, ShieldCheck } from 'lucide-react'
import { signOut } from '../../lib/supabase'
import type { Company } from '../../types'
import { PLAN_LABELS } from '../../lib/constants'
import { useActiveProfile } from '../../context/ActiveProfileContext'
import { StaffSwitchModal as StaffSwitchModalLazy } from '../dashboard/client/StaffSwitchModal'
import { useState } from 'react'

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
  const { profile, returnToOwner } = useActiveProfile()
  const [showSwitch, setShowSwitch] = useState(false)
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
              {role === 'admin' ? 'Admin command center' : 'بوابة العميل'}
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
          {/* Active profile indicator */}
          {role === 'client' && !profile.isOwner && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 10, marginBottom: 8,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#818CF8', flexShrink: 0 }}>
                {profile.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</div>
                <div style={{ fontSize: 10, color: '#6366F1', fontFamily: 'Tajawal, sans-serif' }}>{profile.permissions.length} صلاحية</div>
              </div>
              <button
                type="button"
                onClick={() => { returnToOwner(company?.owner_name || 'المالك'); onClose() }}
                title="رجوع للمالك"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', padding: 2 }}
              >
                <ShieldCheck size={15} />
              </button>
            </div>
          )}

          <div className="dash-user-card">
            <div className="dash-user-avatar">
              {profile.isOwner ? (company?.owner_name?.[0] ?? 'A') : profile.name[0]}
            </div>
            <div>
              <strong>{profile.isOwner ? (company?.owner_name ?? 'Admin') : profile.name}</strong>
              <span>{role === 'admin' ? 'Admin' : profile.isOwner ? planLabel : `${profile.permissions.length} صلاحية`}</span>
            </div>
            <ChevronDown size={15} />
          </div>

          {/* Switch user button — only for client car wash */}
          {role === 'client' && (
            <button
              type="button"
              onClick={() => { setShowSwitch(true) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                padding: '9px 12px', borderRadius: 10, marginTop: 6,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontSize: 12, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)')}
            >
              <Users size={14} />
              تبديل المستخدم
            </button>
          )}

          <button
            type="button"
            className="dash-logout-btn"
            onClick={async () => {
              await signOut()
              navigate('/login')
            }}
          >
            <LogOut size={15} />
            تسجيل الخروج
          </button>
        </div>

        {/* Staff switch modal */}
        {showSwitch && role === 'client' && (
          <StaffSwitchModalLazy onClose={() => { setShowSwitch(false); onClose() }} />
        )}
      </aside>
    </>
  )
}
