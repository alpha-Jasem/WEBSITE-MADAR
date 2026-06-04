import { useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClinicOS } from '../../../context/ClinicOSContext'

export const ClinicOSTopbar = ({ pageTitle }: { pageTitle?: string }) => {
  const { demoUser, logout } = useClinicOS()
  const [showMenu, setShowMenu] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/clinic-os/login')
  }

  return (
    <header style={{ height: 60, background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0, direction: 'rtl' }}>
      {/* Left: title */}
      <div style={{ display: 'flex', align: 'center', gap: 8 }}>
        {pageTitle && <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{pageTitle}</h1>}
      </div>

      {/* Right: search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 12px', width: 220 }}>
          <Search size={14} style={{ color: '#94A3B8' }} />
          <input
            placeholder="بحث عن مريض، موعد..."
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }}
          />
        </div>

        {/* Branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}>
          <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>الفرع الرئيسي</span>
          <ChevronDown size={13} style={{ color: '#94A3B8' }} />
        </div>

        {/* Notifications */}
        <button style={{ position: 'relative', width: 36, height: 36, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Bell size={16} style={{ color: '#475569' }} />
          <span style={{ position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '1.5px solid white' }} />
        </button>

        {/* User */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={12} style={{ color: 'white' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', lineHeight: 1.2 }}>{demoUser?.name || 'د. أحمد الحربي'}</div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>مدير العيادة</div>
            </div>
            <ChevronDown size={13} style={{ color: '#94A3B8' }} />
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, direction: 'rtl' }}>
              <button onClick={handleLogout} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif' }}>
                <LogOut size={14} />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
