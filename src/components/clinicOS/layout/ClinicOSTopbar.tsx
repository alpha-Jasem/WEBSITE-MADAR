import { useEffect, useRef, useState } from 'react'
import { Search, Bell, ChevronDown, LogOut, User, Menu, CheckCheck, Calendar, MessageSquare, AlertCircle } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'

interface Props {
  pageTitle?: string
  onMenuToggle?: () => void
  showMenuBtn?: boolean
  onSearch?: (q: string) => void
}

const DEMO_NOTIFS = [
  { id: 'n1', icon: MessageSquare, color: '#25D366', bg: '#ECFDF5', text: 'مريضة جديدة حجزت عبر واتساب', sub: 'سارة العمري — تنظيف أسنان', time: 'منذ ٣ دقائق', read: false },
  { id: 'n2', icon: Calendar,      color: '#4F46E5', bg: '#EEF2FF', text: 'تذكير: ٤ مواعيد غداً الصباح',   sub: 'د. أحمد الزهراني — ٩ص', time: 'منذ ١٢ دقيقة', read: false },
  { id: 'n3', icon: AlertCircle,   color: '#DC2626', bg: '#FEF2F2', text: 'فشل إرسال رسالة تأكيد',         sub: 'خالد المطيري — رقم غير صحيح', time: 'منذ ساعة', read: false },
  { id: 'n4', icon: CheckCheck,    color: '#059669', bg: '#ECFDF5', text: 'تم تأكيد ٦ مواعيد تلقائياً',   sub: 'واتساب — الجلسة الصباحية', time: 'منذ ساعتين', read: true },
]

export const ClinicOSTopbar = ({ pageTitle, onMenuToggle, showMenuBtn, onSearch }: Props) => {
  const { userName, logout } = useClinicOS()
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState(DEMO_NOTIFS)
  const [search, setSearch] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  const unread = notifs.filter(n => !n.read).length

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (menuRef.current  && !menuRef.current.contains(e.target as Node))  setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, direction: 'rtl', gap: 8, position: 'relative', zIndex: 30 }}>
      {/* Right: hamburger + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {showMenuBtn && (
          <button onClick={onMenuToggle} style={{ width: 36, height: 36, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Menu size={18} style={{ color: '#475569' }} />
          </button>
        )}
        {pageTitle && <h1 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0, whiteSpace: 'nowrap' }}>{pageTitle}</h1>}
      </div>

      {/* Left: search + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* Search */}
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 12px', width: 200 }}>
          <Search size={13} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            placeholder="بحث..."
            value={search}
            onChange={e => { setSearch(e.target.value); onSearch?.(e.target.value) }}
            style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }}
          />
        </div>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowNotifs(v => !v)}
            style={{ position: 'relative', width: 34, height: 34, borderRadius: 8, background: showNotifs ? '#EEF2FF' : '#F8FAFC', border: `1px solid ${showNotifs ? '#C7D2FE' : '#E2E8F0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Bell size={15} style={{ color: showNotifs ? '#4F46E5' : '#475569' }} />
            {unread > 0 && <span style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '1.5px solid white' }} />}
          </button>

          {showNotifs && (
            <div style={{ position: 'absolute', top: 42, left: 0, width: 320, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', direction: 'rtl' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>الإشعارات {unread > 0 && <span style={{ fontSize: 11, background: '#EF4444', color: 'white', borderRadius: 20, padding: '1px 7px', marginRight: 4 }}>{unread}</span>}</span>
                {unread > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>تعيين الكل كمقروء</button>}
              </div>
              {notifs.map(n => {
                const Icon = n.icon
                return (
                  <div key={n.id} onClick={() => markRead(n.id)} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: n.read ? '#FFFFFF' : '#F8FAFF', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={e => (e.currentTarget.style.background = n.read ? '#FFFFFF' : '#F8FAFF')}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} style={{ color: n.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 2 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{n.sub}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: '#CBD5E1', fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap' }}>{n.time}</span>
                      {!n.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F46E5' }} />}
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: '10px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>الإشعارات المباشرة ستكون نشطة بعد التفعيل</span>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={11} style={{ color: 'white' }} />
            </div>
            <span className="hide-on-mobile" style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{userName || 'مدير'}</span>
            <ChevronDown size={12} style={{ color: '#94A3B8' }} />
          </button>
          {showMenu && (
            <div style={{ position: 'absolute', top: 42, left: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '6px', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200, direction: 'rtl' }}>
              <button onClick={logout} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 7, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#DC2626', fontFamily: 'Tajawal, sans-serif' }}>
                <LogOut size={14} /> تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
