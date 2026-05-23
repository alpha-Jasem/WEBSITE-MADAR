import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Crown, Headphones, LogOut } from 'lucide-react'
import { signOut } from '../../lib/supabase'

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
}

export const DashSidebar = ({ navItems, open, onClose, role = 'admin' }: Props) => {
  const navigate = useNavigate()

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
              {role === 'admin' ? 'Admin command center' : 'Client portal'}
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

        {(role === 'admin' || role === 'client') && (
          <div className="dash-upgrade-card">
            <div className="dash-upgrade-icon">
              {role === 'admin' ? <Crown size={18} /> : <Headphones size={18} />}
            </div>
            <strong>{role === 'admin' ? 'Upgrade to Pro' : 'Need Help?'}</strong>
            <p>
              {role === 'admin'
                ? 'Unlock advanced AI operations, voice agents, and revenue automation.'
                : 'Our support team is here for you whenever you need setup help.'}
            </p>
            <button type="button">{role === 'admin' ? 'Upgrade Now' : 'Contact Support'}</button>
          </div>
        )}

        <div className="dash-sidebar-footer">
          <div className="dash-user-card">
            <div className="dash-user-avatar">A</div>
            <div>
              <strong>Aiden Carter</strong>
              <span>{role === 'admin' ? 'Admin' : 'Client'}</span>
            </div>
            <ChevronDown size={15} />
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
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
