import { useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface Props {
  pageTitle?: string
  onMenuToggle?: () => void
  showMenuBtn?: boolean
}

export const ClinicOSTopbar = ({ pageTitle, onMenuToggle, showMenuBtn }: Props) => {
  const { userName, logout } = useClinicOS()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <header style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, direction: 'rtl', gap: 8 }}>
      {/* Right side: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showMenuBtn && (
          <button
            onClick={onMenuToggle}
            style={{ width: 36, height: 36, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Menu size={18} style={{ color: '#475569' }} />
          </button>
        )}
        {pageTitle && (
          <h1 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0, whiteSpace: 'nowrap' }}>
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Left side: search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* Search — hide on very small screens */}
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px', width: 200 }}>
          <Search size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            placeholder="بحث..."
            style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }}
          />
        </div>

        {/* Notifications */}
        <button style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Bell size={15} style={{ color: '#475569' }} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: '#EF4444', border: '1.5px solid white' }} />
        </button>

        {/* User */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}
          >
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={11} style={{ color: 'white' }} />
            </div>
            <span className="hide-on-mobile" style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>
              {userName || 'مدير'}
            </span>
            <ChevronDown size={12} style={{ color: '#94A3B8' }} />
          </button>
          {showMenu && (
            <div style={{ position: 'fixed', top: 56, right: 16, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, direction: 'rtl' }}>
              <button onClick={logout} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif' }}>
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
