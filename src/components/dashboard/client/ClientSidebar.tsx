import { LayoutDashboard, BarChart2, MessageSquare, Receipt, Settings, LogOut } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useLanguage } from '../../../context/LanguageContext'

const navItems = [
  { icon: LayoutDashboard, ar: 'الرئيسية', en: 'Dashboard', to: '/client' },
  { icon: BarChart2, ar: 'المشروع', en: 'Project Status', to: '/client/project' },
  { icon: MessageSquare, ar: 'الرسائل', en: 'Messages', to: '/client/messages' },
  { icon: Receipt, ar: 'الفواتير', en: 'Invoices', to: '/client/invoices' },
]

export const ClientSidebar = () => {
  const { language, t } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <aside className="w-56 h-screen glass border-e border-white/8 flex flex-col py-4">
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center">
            <span className="text-primary-400 font-bold text-xs font-outfit">MA</span>
          </div>
          <div>
            <p className={`text-sm font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
              {t('محمد الأحمدي', 'Mohammed A.')}
            </p>
            <p className={`text-xs text-slate-600 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
              {t('عميل', 'Client')}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ icon: Icon, ar, en, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/client'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            <span className={language === 'ar' ? 'font-tajawal' : 'font-work'}>
              {language === 'ar' ? ar : en}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 border-t border-white/8 pt-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all text-sm"
        >
          <LogOut size={16} />
          <span className={language === 'ar' ? 'font-tajawal' : 'font-work'}>
            {t('تسجيل الخروج', 'Logout')}
          </span>
        </button>
      </div>
    </aside>
  )
}
