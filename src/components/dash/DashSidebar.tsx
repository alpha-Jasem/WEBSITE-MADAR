import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Sparkles, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react'
import { signOut, supabase } from '../../lib/supabase'
import type { Company } from '../../types'
import { PLAN_LABELS } from '../../lib/constants'
import { useActiveProfile } from '../../context/ActiveProfileContext'
import { useState, useEffect, useRef } from 'react'

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
  starter: '#06B6D4',
  growth: '#6366F1',
  enterprise: '#F59E0B',
}

export const DashSidebar = ({ navItems, open, onClose, role = 'admin', company }: Props) => {
  const navigate = useNavigate()
  const { profile, switchToProfile, returnToOwner } = useActiveProfile()
  const plan = company?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[plan] ?? 'Starter'
  const isPremium = plan === 'enterprise'
  const planColor = PLAN_COLORS[plan] ?? '#06B6D4'

  // Inline dropdown state
  const [dropOpen, setDropOpen] = useState(false)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  const companyId = (company as any)?.id ?? null

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
    setDropOpen(p => !p)
    setSelected(null)
    setPin('')
    setPinError(false)
  }

  const handlePinDigit = (digit: string) => {
    if (!selected) return
    if (pin.length >= 4) return
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

        {/* Upgrade card */}
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
            <strong style={{ color: '#0F172A' }}>
              {plan === 'starter' ? 'ارتقِ إلى Pro' : 'ارتقِ إلى Premium'}
            </strong>
            <p style={{ color: '#64748B' }}>
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

        <div className="dash-sidebar-footer" ref={dropRef}>

          {/* Inline user switcher dropdown */}
          {role === 'client' && dropOpen && (
            <div dir="rtl" style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: 14, marginBottom: 8, overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(15,23,42,0.08)',
            }}>
              {/* Header */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontFamily: 'Tajawal, sans-serif' }}>
                {selected ? (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>أدخل الرقم السري</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{selected.full_name}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>تبديل المستخدم</div>
                )}
              </div>

              {!selected ? (
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Return to owner */}
                  {!profile.isOwner && (
                    <button onClick={handleReturnToOwner} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
                      borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)',
                      background: 'rgba(245,158,11,0.06)', color: '#D97706',
                      fontFamily: 'Tajawal, sans-serif', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', width: '100%',
                    }}>
                      <ShieldCheck size={13} />
                      رجوع لحساب المالك
                    </button>
                  )}

                  {/* Staff list */}
                  {!staffLoaded ? (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#94A3B8', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>جاري التحميل...</div>
                  ) : staff.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: '#94A3B8', fontSize: 12, fontFamily: 'Tajawal, sans-serif' }}>لا يوجد مستخدمون — أضفهم من الإعدادات</div>
                  ) : staff.map(u => (
                    <button key={u.id} onClick={() => { setSelected(u); setPin(''); setPinError(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                        borderRadius: 10, border: '1px solid #E2E8F0',
                        background: profile.userId === u.id ? 'rgba(99,102,241,0.07)' : '#F8FAFC',
                        cursor: 'pointer', width: '100%', textAlign: 'right',
                      }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff',
                      }}>
                        {u.full_name[0]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: 'Tajawal, sans-serif' }}>
                          {u.full_name}
                          {profile.userId === u.id && <span style={{ fontSize: 10, color: '#6366F1', marginRight: 6 }}>● نشط</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{(u.permissions || []).length} صلاحية</div>
                      </div>
                      <ChevronDown size={12} color="#CBD5E1" style={{ transform: 'rotate(-90deg)' }} />
                    </button>
                  ))}
                </div>
              ) : (
                /* PIN pad */
                <div style={{ padding: '12px 14px' }}>
                  {/* Dots */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: i < pin.length ? (pinError ? '#EF4444' : '#6366F1') : '#E2E8F0',
                        border: `2px solid ${i < pin.length ? (pinError ? '#EF4444' : '#6366F1') : '#CBD5E1'}`,
                        transition: 'all 0.15s',
                      }} />
                    ))}
                  </div>

                  {pinError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', marginBottom: 10 }}>
                      <AlertCircle size={12} color="#EF4444" />
                      <span style={{ fontSize: 11, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>PIN غير صحيح</span>
                    </div>
                  )}

                  {/* Numpad */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                      <button key={i} onClick={() => {
                        if (d === '') return
                        if (d === '⌫') { setPin(p => p.slice(0, -1)); setPinError(false); return }
                        handlePinDigit(d)
                      }} disabled={d === ''} style={{
                        padding: '12px 0', borderRadius: 10,
                        fontSize: d === '⌫' ? 16 : 18, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                        background: d === '' ? 'transparent' : '#F8FAFC',
                        border: d === '' ? 'none' : '1px solid #E2E8F0',
                        color: d === '⌫' ? '#94A3B8' : '#0F172A',
                        cursor: d === '' ? 'default' : 'pointer',
                      }}>
                        {d}
                      </button>
                    ))}
                  </div>

                  <button onClick={() => { setSelected(null); setPin(''); setPinError(false) }} style={{
                    width: '100%', marginTop: 8, padding: '8px', borderRadius: 8,
                    background: 'transparent', border: '1px solid #E2E8F0',
                    color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontSize: 12, cursor: 'pointer',
                  }}>
                    رجوع
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User card — click to toggle dropdown */}
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
              <span>{role === 'admin' ? 'Admin' : profile.isOwner ? planLabel : `${profile.permissions.length} صلاحية`}</span>
            </div>
            <ChevronDown size={15} style={{ transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
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
