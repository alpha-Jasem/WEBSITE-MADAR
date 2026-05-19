import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Kanban, FolderOpen, Users, Calendar, MessageSquare, BarChart2, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'

const navItems = [
  { icon: LayoutDashboard, ar: 'نظرة عامة', en: 'Overview', to: '/admin' },
  { icon: Kanban, ar: 'Pipeline', en: 'Pipeline', to: '/admin/pipeline' },
  { icon: FolderOpen, ar: 'المشاريع', en: 'Projects', to: '/admin/projects' },
  { icon: BarChart2, ar: 'التقارير', en: 'Analytics', to: '/admin/analytics' },
]

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { language, t } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen glass border-e border-white/8 flex flex-col py-4 relative overflow-hidden"
    >
      {/* Logo */}
      <div className="px-4 mb-6 flex items-center justify-between">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs font-outfit">DM</span>
              </div>
              <span className={`font-bold text-white text-sm ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                {t('لوحة الإدارة', 'Admin Panel')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-xs font-outfit">DM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ icon: Icon, ar, en, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className={`text-sm overflow-hidden whitespace-nowrap ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                >
                  {language === 'ar' ? ar : en}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 mt-2 border-t border-white/8 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all"
        >
          <LogOut size={17} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
              >
                {t('تسجيل الخروج', 'Logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-16 -end-3 w-6 h-6 rounded-full glass border border-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
      >
        {collapsed
          ? (language === 'ar' ? <ChevronLeft size={12} /> : <ChevronRight size={12} />)
          : (language === 'ar' ? <ChevronRight size={12} /> : <ChevronLeft size={12} />)
        }
      </button>
    </motion.aside>
  )
}
