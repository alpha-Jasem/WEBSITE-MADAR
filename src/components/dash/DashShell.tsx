import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Bell, ChevronDown, LogOut, Menu, MessageSquare, Settings, ShieldCheck, X } from 'lucide-react'
import { DashSidebar, type NavItem } from './DashSidebar'
import { useClientCompany } from '../../hooks/useClientCompany'
import { MadarAIAssistant } from './MadarAIAssistant'
import { MadarAgentWidget } from './MadarAgentWidget'
import { useActiveProfile } from '../../context/ActiveProfileContext'
import { PLAN_LABELS, MADAR_WHATSAPP_NUMBER } from '../../lib/constants'
import { useDailyUsage } from '../../hooks/useDailyUsage'
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
  const navigate = useNavigate()
  const { company } = useClientCompany()
  const { profile, switchToProfile, returnToOwner } = useActiveProfile()
  const companyId = (company as any)?.id ?? null
  const planKey = company?.plan ?? 'starter'
  const planLabel = PLAN_LABELS[planKey] ?? 'Starter'
  const [profileOpen, setProfileOpen] = useState(false)
  const [showStaffSwitcher, setShowStaffSwitcher] = useState(false)
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [staffLoaded, setStaffLoaded] = useState(false)
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const topProfileRef = useRef<HTMLDivElement>(null)

  const dailyUsage = useDailyUsage(role === 'client' ? companyId : null, planKey)

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => { setProfileOpen(false); setShowStaffSwitcher(false); setSelected(null); setPin(''); setPinError(false) }, [location.pathname])

  useEffect(() => {
    if ((!profileOpen && !showStaffSwitcher) || staffLoaded || !companyId || role !== 'client') return
    supabase
      .from('company_users')
      .select('id, full_name, pin, permissions')
      .eq('company_id', companyId)
      .then(({ data }) => {
        setStaff((data as StaffUser[]) || [])
        setStaffLoaded(true)
      })
  }, [profileOpen, showStaffSwitcher, staffLoaded, companyId, role])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!topProfileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
        setShowStaffSwitcher(false)
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

  const { maxPct, ringColor, carsPct, qrPct, screenPct, whatsappPct, cars, qr, screenUpdates, whatsapp, limits, topMetric } = dailyUsage
  const circumference = 2 * Math.PI * 15
  const letter = profile.isOwner ? (company?.owner_name?.[0] ?? 'م') : profile.name[0]

  const getStatusMessage = () => {
    if (maxPct >= 100) return { text: 'تم الوصول إلى الحد اليومي. بعض الخدمات قد تتوقف مؤقتاً.', color: '#EF4444' }
    if (maxPct >= 90) return { text: 'أنت قريب جداً من الحد اليومي. تواصل مع الإدارة لرفع الحد.', color: '#F97316' }
    if (maxPct >= 70) return { text: 'اقتربت من حد الاستخدام اليومي. تابع الأرقام بعناية.', color: '#F59E0B' }
    return { text: 'استخدامك اليوم ضمن الحد المسموح. كل شيء يعمل بشكل طبيعي.', color: '#16A34A' }
  }

  const statusMsg = getStatusMessage()

  const MiniBar = ({ pct, color }: { pct: number; color: string }) => (
    <div style={{ height: 4, borderRadius: 4, background: '#EEF2F8', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  )

  const renderClientTopbarControls = () => (
    <>
      <button type="button" className="dash-topbar-icon" aria-label="الإشعارات">
        <Bell size={17} />
      </button>
      <button type="button" className="dash-topbar-icon" aria-label="الرسائل">
        <MessageSquare size={17} />
      </button>
      <div className="dash-topbar-profile-wrap" ref={topProfileRef}>
        <button
          type="button"
          className="dash-topbar-profile"
          onClick={() => {
            setProfileOpen(prev => !prev)
            setShowStaffSwitcher(false)
            setSelected(null)
            setPin('')
            setPinError(false)
          }}
        >
          {/* Avatar with SVG progress ring */}
          <div style={{ position: 'relative', width: 36, height: 36 }} title={`استخدام اليوم: ${maxPct}%`}>
            <svg width="36" height="36" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#E2EBF6" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={ringColor}
                strokeWidth="2.5"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${circumference * (1 - maxPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <span className="dash-user-avatar dash-topbar-avatar" style={{ width: 28, height: 28, position: 'absolute', inset: 4, fontSize: 13, lineHeight: '28px' }}>
              {letter}
            </span>
          </div>
          <span className="dash-topbar-profile-copy">
            <strong>{profile.isOwner ? (company?.owner_name ?? 'مدير المغسلة') : profile.name}</strong>
            <small>{profile.isOwner ? planLabel : `${profile.permissions.length} صلاحية`}</small>
          </span>
          <ChevronDown size={14} style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </button>

        {profileOpen && !showStaffSwitcher && !selected && (
          <div className="dash-profile-switcher dash-topbar-switcher" style={{ width: 280, padding: 0, overflow: 'hidden' }}>
            {/* Section 1: User info */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #EEF2F8', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
                <svg width="40" height="40" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                  <circle cx="20" cy="20" r="17" fill="none" stroke="#E2EBF6" strokeWidth="2.5" />
                  <circle cx="20" cy="20" r="17" fill="none" stroke={ringColor} strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 17}`}
                    strokeDashoffset={`${2 * Math.PI * 17 * (1 - maxPct / 100)}`}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                </svg>
                <span className="dash-user-avatar" style={{ width: 30, height: 30, position: 'absolute', inset: 5, fontSize: 14, lineHeight: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {letter}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0D1B3E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile.isOwner ? (company?.owner_name ?? 'مدير المغسلة') : profile.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  {profile.isOwner ? (company?.name ?? '') : `${profile.permissions.length} صلاحية`}
                </div>
                <div style={{ fontSize: 10, color: ringColor, fontWeight: 600, marginTop: 1 }}>
                  {planLabel} · {maxPct}% استخدام اليوم
                </div>
              </div>
            </div>

            {/* Section 2: Daily usage */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEF2F8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>استخدام اليوم</span>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>يُصفَّر عند 12:00 صباحاً</span>
              </div>

              {/* Overall bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: ringColor, lineHeight: 1 }}>{maxPct}%</span>
                <div style={{ flex: 1 }}>
                  <MiniBar pct={maxPct} color={ringColor} />
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 3 }}>أعلى مقياس: {topMetric}</div>
                </div>
              </div>

              {/* 4 metric rows */}
              {[
                { label: 'السيارات', val: cars, limit: limits.cars, pct: carsPct },
                { label: 'QR', val: qr, limit: limits.qr, pct: qrPct },
                { label: 'الشاشة', val: screenUpdates, limit: limits.screenUpdates, pct: screenPct },
                { label: 'واتساب', val: whatsapp, limit: limits.whatsapp, pct: whatsappPct },
              ].map(({ label, val, limit, pct }) => {
                const c = getRingColorLocal(pct)
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#475569', width: 52, textAlign: 'right', flexShrink: 0 }}>{label}</span>
                    <MiniBar pct={pct} color={c} />
                    <span style={{ fontSize: 10, color: '#94A3B8', width: 52, textAlign: 'left', flexShrink: 0 }}>{val}/{limit}</span>
                  </div>
                )
              })}
            </div>

            {/* Section 3: Status message */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #EEF2F8', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusMsg.color, marginTop: 5, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>{statusMsg.text}</p>
            </div>

            {/* Section 4: Quick actions */}
            <div style={{ padding: '8px 0' }}>
              <button type="button" onClick={() => { navigate('/client/settings'); setProfileOpen(false) }}
                style={{ width: '100%', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0D1B3E', textAlign: 'right' }}>
                <Settings size={14} color="#64748B" />
                الإعدادات والباقة
              </button>

              {maxPct >= 100 && (
                <a href={`https://wa.me/${MADAR_WHATSAPP_NUMBER}?text=أحتاج%20رفع%20حد%20الاستخدام%20اليومي`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ width: '100%', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', fontSize: 13, color: '#EF4444', fontWeight: 600 }}>
                  <span style={{ fontSize: 14 }}>📲</span>
                  تواصل مع الإدارة
                </a>
              )}

              <button type="button" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
                style={{ width: '100%', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#EF4444', textAlign: 'right' }}>
                <LogOut size={14} />
                تسجيل الخروج
              </button>

              <div style={{ borderTop: '1px solid #EEF2F8', marginTop: 4, padding: '6px 16px 2px' }}>
                {!profile.isOwner && (
                  <button type="button" className="dash-owner-return" onClick={handleReturnToOwner}
                    style={{ marginBottom: 4, fontSize: 11 }}>
                    <ShieldCheck size={12} />
                    رجوع لحساب المالك
                  </button>
                )}
                <button type="button" onClick={() => setShowStaffSwitcher(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748B', padding: 0, textDecoration: 'underline' }}>
                  تبديل المستخدم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff switcher panel */}
        {profileOpen && showStaffSwitcher && (
          <div className="dash-profile-switcher dash-topbar-switcher">
            <div className="dash-profile-switcher-head">
              {selected ? (
                <div>
                  <strong>أدخل الرقم السري</strong>
                  <span>{selected.full_name}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>تبديل المستخدم</span>
                  <button type="button" onClick={() => setShowStaffSwitcher(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#64748B', padding: 0 }}>
                    رجوع
                  </button>
                </div>
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

  function getRingColorLocal(pct: number): string {
    if (pct >= 100) return '#EF4444'
    if (pct >= 90) return '#F97316'
    if (pct >= 70) return '#F59E0B'
    return '#0099CC'
  }

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
      {role !== 'client' && (
        <MadarAIAssistant
          role={role}
          companyId={null}
          pageTitle={pageTitle}
        />
      )}
    </div>
  )
}
