import { useEffect, useState } from 'react'
import { X, User, ShieldCheck, Wrench, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { useActiveProfile } from '../../../context/ActiveProfileContext'

interface StaffUser {
  id: string
  full_name: string
  pin: string | null
  permissions: string[]
}

interface Props {
  onClose: () => void
}

export function StaffSwitchModal({ onClose }: Props) {
  const { companyId, company } = useClientCompany()
  const { switchToProfile, returnToOwner, profile } = useActiveProfile()
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [selected, setSelected] = useState<StaffUser | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    supabase
      .from('company_users')
      .select('id, full_name, pin, permissions')
      .eq('company_id', companyId)
      .then(({ data }) => {
        setStaff((data as StaffUser[]) || [])
        setLoading(false)
      })
  }, [companyId])

  const handleSelect = (user: StaffUser) => {
    setSelected(user)
    setPin('')
    setError('')
  }

  const handlePinInput = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 4) setTimeout(() => attemptSwitch(selected!, next), 100)
  }

  const attemptSwitch = (user: StaffUser, enteredPin: string) => {
    const perms = Array.isArray(user.permissions) ? user.permissions : []
    const ok = switchToProfile(user.id, user.full_name, perms, enteredPin, user.pin)
    if (ok) {
      onClose()
    } else {
      setError('PIN غير صحيح — حاول مجدداً')
      setPin('')
    }
  }

  const handleReturnToOwner = () => {
    returnToOwner(company?.owner_name || 'المالك')
    onClose()
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div dir="rtl" style={{
        background: '#0C0F1A', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} color="#6366F1" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
                {selected ? 'أدخل PIN' : 'تبديل المستخدم'}
              </h3>
              <p style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
                {selected ? selected.full_name : 'اختر مستخدماً للتبديل'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {/* Return to owner */}
          {!profile.isOwner && !selected && (
            <button onClick={handleReturnToOwner} style={{
              width: '100%', padding: '12px', borderRadius: 12, marginBottom: 16,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              color: '#F59E0B', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <ShieldCheck size={15} />
              رجوع لحساب المالك
            </button>
          )}

          {/* Staff list */}
          {!selected && (
            loading ? (
              <p style={{ textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13, padding: '20px 0' }}>جاري التحميل...</p>
            ) : staff.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Wrench size={28} color="#334155" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>لا يوجد مستخدمون — أضفهم من الإعدادات</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {staff.map(u => (
                  <button key={u.id} onClick={() => handleSelect(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                    borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)',
                    background: profile.userId === u.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer', textAlign: 'right', width: '100%',
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#818CF8',
                    }}>
                      {u.full_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>
                        {u.full_name}
                        {profile.userId === u.id && <span style={{ fontSize: 10, color: '#22D3EE', marginRight: 6 }}>● نشط</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                        {(u.permissions || []).length} صلاحية
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* PIN pad */}
          {selected && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 24 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: i < pin.length ? '#6366F1' : 'rgba(255,255,255,0.1)',
                    border: `2px solid ${i < pin.length ? '#6366F1' : 'rgba(255,255,255,0.15)'}`,
                    transition: 'all 0.15s',
                  }} />
                ))}
              </div>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 16 }}>
                  <AlertCircle size={13} color="#EF4444" />
                  <span style={{ fontSize: 12, color: '#EF4444', fontFamily: 'Tajawal, sans-serif' }}>{error}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
                  <button key={i} onClick={() => {
                    if (d === '') return
                    if (d === '⌫') { setPin(p => p.slice(0,-1)); setError(''); return }
                    handlePinInput(d)
                  }} disabled={d === ''} style={{
                    padding: '16px', borderRadius: 12, fontSize: d === '⌫' ? 18 : 20, fontWeight: 700, fontFamily: 'Sora, sans-serif',
                    background: d === '' ? 'transparent' : 'rgba(255,255,255,0.05)',
                    border: d === '' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: d === '⌫' ? '#94A3B8' : '#F1F5F9', cursor: d === '' ? 'default' : 'pointer',
                  }}>
                    {d}
                  </button>
                ))}
              </div>
              <button onClick={() => { setSelected(null); setPin(''); setError('') }} style={{
                width: '100%', marginTop: 14, padding: '10px', borderRadius: 10,
                background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
                color: '#64748B', fontFamily: 'Tajawal, sans-serif', fontSize: 13, cursor: 'pointer',
              }}>
                رجوع
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
