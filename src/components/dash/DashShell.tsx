import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { DashSidebar, type NavItem } from './DashSidebar'

interface Props {
  navItems: NavItem[]
  mobileNavItems?: NavItem[]
  role?: 'admin' | 'client'
  pageTitle: string
  children: React.ReactNode
  topbarRight?: React.ReactNode
}

export const DashShell = ({ navItems, role = 'admin', pageTitle, children, topbarRight }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <div className="dash-shell">
      <DashSidebar
        navItems={navItems}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        role={role}
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
            <span className="dash-topbar-badge">
              {role === 'admin' ? 'Admin' : 'Client'}
            </span>
          </div>
        </header>

        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  )
}
