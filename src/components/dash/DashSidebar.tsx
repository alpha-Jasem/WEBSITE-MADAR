import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronDown, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Company } from '../../types'
import { PLAN_LABELS } from '../../lib/constants'
import { useActiveProfile } from '../../context/ActiveProfileContext'
import { useDailyUsage } from '../../hooks/useDailyUsage'

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
  ownerReturn?: boolean
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#00BFFF',
  growth: '#1565C0',
  enterprise: '#F59E0B',
}

const TXT = {
  owner: '\u0627\u0644\u0645\u0627\u0644\u0643',
  adminCenter: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0625\u062f\u0627\u0631\u0629',
  clientPortal: '\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0639\u0645\u064a\u0644',
  upgradePro: '\u0627\u0646\u062a\u0642\u0644 \u0625\u0644\u0649 Pro',
  upgradePremium: '\u0627\u0646\u062a\u0642\u0644 \u0625\u0644\u0649 Premium',
  trialPrefix: '\u062a\u062c\u0631\u0628\u062a\u0643 \u0627\u0644\u0645\u062c\u0627\u0646\u064a\u0629 \u0641\u0639\u0627\u0644\u0629\u060c \u0628\u0627\u0642\u064a ',
  trialSuffix: ' \u064a\u0648\u0645 \u0644\u062a\u062b\u0628\u064a\u062a \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643.',
  starterCopy: '\u0627\u0641\u062a\u062d \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0643\u0627\u0645\u0644\u0629\u060c \u0627\u0644\u0645\u0627\u0644\u064a\u0629\u060c \u0648\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u0648\u0638\u0641\u064a\u0646.',
  premiumCopy: '\u0627\u0641\u062a\u062d \u0631\u0624\u0649 AI\u060c \u062a\u0639\u062f\u062f \u0627\u0644\u0641\u0631\u0648\u0639\u060c \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u0629.',
  buttonPro: '\u062a\u0631\u0642\u064a\u0629 \u0625\u0644\u0649 Pro',
  buttonPremium: '\u062a\u0631\u0642\u064a\u0629 \u0625\u0644\u0649 Premium',
  enterPin: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064a',
  switchUser: '\u062a\u0628\u062f\u064a\u0644 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645',
  returnOwner: '\u0631\u062c\u0648\u0639 \u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0627\u0644\u0643',
  loading: '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...',
  emptyUsers: '\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646 - \u0623\u0636\u0641\u0647\u0645 \u0645\u0646 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',
  permission: '\u0635\u0644\u0627\u062d\u064a\u0629',
  active: '\u0646\u0634\u0637',
  pinWrong: 'PIN \u063a\u064a\u0631 \u0635\u062d\u064a\u062d',
  back: '\u0631\u062c\u0648\u0639',
  admin: '\u0625\u062f\u0627\u0631\u0629',
  logout: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c',
}

export const DashSidebar = ({ navItems, open, onClose, role = 'admin', company }: Props) => {
  const navigate = useNavigate()
  const { profile, switchToProfile, returnToOwner } = useActiveProfile()
  const plan = company?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[plan] ?? 'Starter'
  const isPremium = plan === 'enterprise'
  const planColor = PLAN_COLORS[plan] ?? '#00BFFF'
  const companyId = (company as any)?.id ?? null
  const dailyUsage = useDailyUsage(role === 'client' ? companyId : null, plan)
  const { maxPct, ringColor } = dailyUsage
  const circumference = 2 * Math.PI * 17
  const trialEndsAt = (company as any)?.trial_ends_at ?? company?.plan_reset_at
  const trialDaysLeft = role === 'client' && company?.status === 'trial' && plan === 'starter' && trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

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
        const ok = selected.ownerReturn
          ? returnToOwner(company?.owner_name || TXT.owner, next, selected.pin)
          : switchToProfile(selected.id, selected.full_name, selected.permissions || [], next, selected.pin)
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
    const ownerPin = String(((company as any)?.cw_automations || {})?.owner_pin || '')
    if (ownerPin) {
      setSelected({
        id: 'owner',
        full_name: company?.owner_name || TXT.owner,
        pin: ownerPin,
        permissions: [],
        ownerReturn: true,
      })
      setPin('')
      setPinError(false)
      return
    }
    returnToOwner(company?.owner_name || TXT.owner)
    setDropOpen(false)
    onClose()
  }

  return (
    <>
      {open && <div className="dash-overlay" onClick={onClose} />}

      <aside className={'dash-sidebar dash-sidebar-' + role + (open ? ' open' : '')}>
        <div className="dash-sidebar-brand">
          <img className="dash-sidebar-logo-img" src="/logo-main.png" alt="Madar.software" />
          <div>
            <p className="dash-sidebar-name">Madar<span>.software</span></p>
            <p className="dash-sidebar-sub">{role === 'admin' ? TXT.adminCenter : TXT.clientPortal}</p>
          </div>
        </div>

        <nav className="dash-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => 'dash-nav-link' + (isActive ? ' active' : '')}
            >
              <span className="dash-nav-icon"><Icon size={17} /></span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-footer" ref={dropRef}>
          {role === 'client' && dropOpen && (
            <div className="dash-profile-switcher">
              <div className="dash-profile-switcher-head">
                {selected ? (
                  <div>
                    <strong>{TXT.enterPin}</strong>
                    <span>{selected.full_name}</span>
                  </div>
                ) : (
                  <span>{TXT.switchUser}</span>
                )}
              </div>

              {!selected ? (
                <div className="dash-profile-list">
                  {!profile.isOwner && (
                    <button type="button" className="dash-owner-return" onClick={handleReturnToOwner}>
                      <ShieldCheck size={13} />
                      {TXT.returnOwner}
                    </button>
                  )}

                  {!staffLoaded ? (
                    <p className="dash-profile-empty">{TXT.loading}</p>
                  ) : staff.length === 0 ? (
                    <p className="dash-profile-empty">{TXT.emptyUsers}</p>
                  ) : staff.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className={'dash-staff-row' + (profile.userId === user.id ? ' active' : '')}
                      onClick={() => { setSelected(user); setPin(''); setPinError(false) }}
                    >
                      <span className="dash-staff-avatar">{user.full_name[0]}</span>
                      <span>
                        <strong>{user.full_name}</strong>
                        <small>{(user.permissions || []).length} {TXT.permission}</small>
                      </span>
                      {profile.userId === user.id && <em>{TXT.active}</em>}
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
                      <span>{TXT.pinWrong}</span>
                    </div>
                  )}

                  <div className="dash-pin-grid">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Back'].map((digit, index) => (
                      <button
                        key={digit + '-' + index}
                        type="button"
                        disabled={!digit}
                        onClick={() => {
                          if (digit === 'Back') {
                            setPin(value => value.slice(0, -1))
                            setPinError(false)
                            return
                          }
                          handlePinDigit(digit)
                        }}
                      >
                        {digit === 'Back' ? '\u232b' : digit}
                      </button>
                    ))}
                  </div>

                  <button type="button" className="dash-pin-back" onClick={() => { setSelected(null); setPin(''); setPinError(false) }}>
                    {TXT.back}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  )
}
