import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertCircle, Bell, ChevronDown, Menu, MessageSquare, ShieldCheck, X } from 'lucide-react'
import { DashSidebar, type NavItem } from './DashSidebar'
import { useClientCompany } from '../../hooks/useClientCompany'
import { MadarAIAssistant } from './MadarAIAssistant'
import { MadarAgentWidget } from './MadarAgentWidget'
import { useActiveProfile } from '../../context/ActiveProfileContext'
import { PLAN_LABELS } from '../../lib/constants'
import { supabase } from '../../lib/supabase'

interface Props {
  navItems: NavItem[]
  mobileNavItems?: NavItem[]
  role?: 'admin' | 'client'
  pageTitle: string
  children: React.ReactNode
  topbarRight?: React.ReactNode
}

interface StaffUser {
  id: string
  full_name: string
  pin: string | null
  permissions: string[]
}

export const DashShell = ({ navItems, role = 'admin', pageTitle, children, topbarRight }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { company } = useClientCompany()
  const { profile, switchToProfile, returnToOwner } = useActiveProfile()
  const companyId = (company as any)?.id ?? null
  const planLabel = PLAN_LABELS[company?.plan ?? 'starter'] ?? 'Starter'
  const [profileOpen, setProfileOpen] = useState(false)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const topProfileRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => { setProfileOpen(false); setSelected(null); setPin(''); setPinError(false) }, [location.pathname])

  useEffect(() => {
    if (!profileOpen || staffLoaded || !companyId || role !== 'client') return
    supabase
      .from('company_users')
      .select('id, full_name, pin, permissions')
      .eq('company_id', companyId)
      .then(({ data }) => {
        setStaff((data as StaffUser[]) || [])
        setStaffLoaded(true)
      })
  }, [profileOpen, staffLoaded, companyId, role])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!topProfileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
        setSelected(null)
        setPin('')
        setPinError(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handlePinDigit = (digit: string) => {
    if (!selected || pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setPinError(false)
    if (next.length === 4) {
      setTimeout(() => {
        const ok = switchToProfile(selected.id, selected.full_name, selected.permissions || [], next, selected.pin)
        if (ok) {
          setProfileOpen(false)
          setSelected(null)
          setPin('')
        } else {
          setPinError(true)
          setPin('')
        }
      }, 100)
    }
  }

  const handleReturnToOwner = () => {
    returnToOwner(company?.owner_name || 'المالك')
    setProfileOpen(false)
    setSelected(null)
    setPin('')
  }

  const renderClientTopbarControls = () => (
    <>
      <button type="button" className="dash-topbar-icon" aria-label="الإشعارات">
        <Bell size={17} />
        <em>0</em>
      </button>
      <button type="button" className="dash-topbar-icon" aria-label="الرسائل">
        <MessageSquare size={17} />
        <em>0</em>
      </button>
      <div className="dash-topbar-profile-wrap" ref={topProfileRef}>
        <button
          type="button"
          className="dash-topbar-profile"
          onClick={() => {
            setProfileOpen(prev => !prev)
            setSelected(null)
            setPin('')
            setPinError(false)
          }}
        >
          <span className="dash-user-avatar dash-topbar-avatar">
            {profile.isOwner ? (company?.owner_name?.[0] ?? 'م') : profile.name[0]}
          </span>
          <span className="dash-topbar-profile-copy">
            <strong>{profile.isOwner ? (company?.owner_name ?? 'مدير المغسلة') : profile.name}</strong>
            <small>{profile.isOwner ? planLabel : `${profile.permissions.length} صلاحية`}</small>
          </span>
          <ChevronDown size={14} style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {profileOpen && (
          <div className="dash-profile-switcher dash-topbar-switcher">
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
      </div>
    </>
  )

  return (
    <div className={`dash-shell dash-shell-${role}`} dir="rtl">
      <DashSidebar
        navItems={navItems}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={role}
        company={role === 'client' ? company : undefined}
      />

      <div className="dash-main">
        <header className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="dash-hamburger"
              onClick={() => setMenuOpen(true)}
              aria-label="فتح القائمة"
            >
              {menuOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
            <span className="dash-topbar-title">{pageTitle}</span>
          </div>

          <div className="dash-topbar-right">
            {topbarRight}
            {role === 'client' ? renderClientTopbarControls() : (
              <span className="dash-topbar-badge">إدارة</span>
            )}
          </div>
        </header>

        <main className="dash-content">
          {children}
        </main>
      </div>
      {role === 'client' ? (
        <MadarAgentWidget
          agentType="client_support"
          companyId={company?.id ?? null}
          pageTitle={pageTitle}
        />
      ) : (
        <MadarAIAssistant
          role={role}
          companyId={null}
          pageTitle={pageTitle}
        />
      )}
    </div>
  )
}
