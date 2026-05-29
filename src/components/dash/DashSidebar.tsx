import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronDown, LogOut, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { signOut, supabase } from '../../lib/supabase'
import type { Company } from '../../types'
import { PLAN_LABELS } from '../../lib/constants'
import { useActiveProfile } from '../../context/ActiveProfileContext'

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

interface StaffUser {
  id: string
  full_name: string
  pin: string | null
  permissions: string[]
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#00BFFF',
  growth: '#1565C0',
  enterprise: '#F59E0B',
}

export const DashSidebar = ({ navItems, open, onClose, role = 'admin', company }: Props) => {
  const navigate = useNavigate()
  const { profile, switchToProfile, returnToOwner } = useActiveProfile()
  const plan = company?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[plan] ?? 'Starter'
  const isPremium = plan === 'enterprise'
  const planColor = PLAN_COLORS[plan] ?? '#00BFFF'
  const companyId = (company as any)?.id ?? null

  const [dropOpen, setDropOpen] = useState(false)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dropOpen && !staffLoaded && companyId && role === 'client') {
      supabase
        .from('company_users')
        .select('id, full_name, pin, permissions')
        .eq('company_id', companyId)
        .then(({ data }) => {
          setStaff((data as StaffUser[]) || [])
          setStaffLoaded(true)
        })
    }
  }, [dropOpen, staffLoaded, companyId, role])

  const toggleDrop = () => {
    if (role !== 'client') return
    setDropOpen(prev => !prev)
    setSelected(null)
    setPin('')
    setPinError(false)
  }

  const handlePinDigit = (digit: string) => {
    if (!selected || pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setPinError(false)
    if (next.length === 4) {
      setTimeout(() => {
        const ok = switchToProfile(selected.id, selected.full_name, selected.permissions || [], next, selected.pin)
        if (ok) {
          setDropOpen(false)
          setSelected(null)
          setPin('')
          onClose()
        } else {
          setPinError(true)
          setPin('')
        }
      }, 100)
    }
  }

  const handleReturnToOwner = () => {
    returnToOwner(company?.owner_name || 'المالك')
    setDropOpen(false)
    onClose()
  }

  return (
    <>
      {open && <div className="dash-overlay" onClick={onClose} />}

      <aside className={`dash-sidebar dash-sidebar-${role}${open ? ' open' : ''}`}>
        <div className="dash-sidebar-brand">
          <img className="dash-sidebar-logo-img" src="/logo-main.png" alt="Madar.software" />
          <div>
            <p className="dash-sidebar-name">Madar<span>.software</span></p>
            <p className="dash-sidebar-sub">{role === 'admin' ? 'مركز الإدارة' : 'بوابة العميل'}</p>
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
              <span className="dash-nav-icon"><Icon size={17} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {role === 'client' && company && !isPremium && (
          <div className="dash-upgrade-card" style={{ borderColor: `${planColor}44` }}>
            <div className="dash-upgrade-card-head">
              <div className="dash-upgrade-icon" style={{ background: `${planColor}22`, border: `1px solid ${planColor}44` }}>
                <TrendingUp size={16} style={{ color: planColor }} />
              </div>
              <span style={{ color: planColor, background: `${planColor}18` }}>{planLabel}</span>
            </div>
            <strong>{plan === 'starter' ? 'ارتق إلى Pro' : 'ارتق إلى Premium'}</strong>
            <p>
              {plan === 'starter'
                ? 'افتح التقارير الكاملة، المالية، وأداء الموظفين.'
                : 'افتح رؤى AI، تعدد الفروع، والتقارير المتقدمة.'}
            </p>
            <button type="button" onClick={() => { navigate('/client/upgrade'); onClose() }}>
              <Sparkles size={12} />
              {plan === 'starter' ? 'ترقية إلى Pro' : 'ترقية إلى Premium'}
            </button>
          </div>
        )}

        <div className="dash-sidebar-footer" ref={dropRef}>
          {role === 'client' && dropOpen && (
            <div className="dash-profile-switcher">
              <div className="dash-profile-switcher-head">
                {selected ? (
                  <div>
                    <strong>أدخل الرقم السري</strong>
                    <span>{selected.full_name}</span>
                  </div>
                ) : (
                  <span>تبديل المستخدم</span>
                )}
              </div>

              {!selected ? (
                <div className="dash-profile-list">
                  {!profile.isOwner && (
                    <button type="button" className="dash-owner-return" onClick={handleReturnToOwner}>
                      <ShieldCheck size={13} />
                      رجوع لحساب المالك
                    </button>
                  )}

                  {!staffLoaded ? (
                    <p className="dash-profile-empty">جاري التحميل...</p>
                  ) : staff.length === 0 ? (
                    <p className="dash-profile-empty">لا يوجد مستخدمون - أضفهم من الإعدادات</p>
                  ) : staff.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className={`dash-staff-row${profile.userId === user.id ? ' active' : ''}`}
                      onClick={() => { setSelected(user); setPin(''); setPinError(false) }}
                    >
                      <span className="dash-staff-avatar">{user.full_name[0]}</span>
                      <span>
                        <strong>{user.full_name}</strong>
                        <small>{(user.permissions || []).length} صلاحية</small>
                      </span>
                      {profile.userId === user.id && <em>نشط</em>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="dash-pin-pad">
                  <div className="dash-pin-dots">
                    {[0, 1, 2, 3].map(index => (
                      <span key={index} className={index < pin.length ? (pinError ? 'error' : 'filled') : ''} />
                    ))}
                  </div>

                  {pinError && (
                    <div className="dash-pin-error">
                      <AlertCircle size={12} />
                      <span>PIN غير صحيح</span>
                    </div>
                  )}

                  <div className="dash-pin-grid">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((digit, index) => (
                      <button
                        key={`${digit}-${index}`}
                        type="button"
                        disabled={!digit}
                        onClick={() => {
                          if (digit === '⌫') {
                            setPin(value => value.slice(0, -1))
                            setPinError(false)
                            return
                          }
                          handlePinDigit(digit)
                        }}
                      >
                        {digit}
                      </button>
                    ))}
                  </div>

                  <button type="button" className="dash-pin-back" onClick={() => { setSelected(null); setPin(''); setPinError(false) }}>
                    رجوع
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            className="dash-user-card"
            onClick={toggleDrop}
            style={role === 'client' ? { cursor: 'pointer', userSelect: 'none' } : undefined}
          >
            <div className="dash-user-avatar">
              {profile.isOwner ? (company?.owner_name?.[0] ?? 'A') : profile.name[0]}
            </div>
            <div>
              <strong>{profile.isOwner ? (company?.owner_name ?? 'Admin') : profile.name}</strong>
              <span>{role === 'admin' ? 'إدارة' : profile.isOwner ? planLabel : `${profile.permissions.length} صلاحية`}</span>
            </div>
            {role === 'client' && (
              <ChevronDown size={15} style={{ transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            )}
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
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  )
}
