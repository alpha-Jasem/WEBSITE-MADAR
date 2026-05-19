import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Globe, Calendar, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'

const navLinks = [
  { ar: 'الرئيسية',    en: 'Home',         href: '#hero' },
  { ar: 'الخدمات',     en: 'Services',     href: '#services' },
  { ar: 'كيف يعمل',   en: 'How It Works', href: '#how-it-works' },
  { ar: 'أعمالنا',     en: 'Case Studies', href: '#case-studies' },
]

export const Navbar = () => {
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeHash, setActiveHash] = useState('#hero')
  const { language, toggleLanguage, t } = useLanguage()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleNavClick = (href: string) => {
    setActiveHash(href)
    setMobileOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  const openWhatsApp = () => window.open('https://wa.me/966546666005', '_blank')

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4"
      >
        <div
          className={`w-full max-w-6xl flex items-center justify-between px-5 rounded-2xl transition-all duration-500 ${
            scrolled
              ? 'shadow-[0_4px_32px_rgba(0,191,255,0.1)]'
              : 'shadow-[0_2px_16px_rgba(0,0,0,0.3)]'
          }`}
          style={{
            height: 68,
            overflow: 'visible',
            background: scrolled ? 'rgba(5,8,16,0.96)' : 'rgba(5,8,16,0.80)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center cursor-pointer flex-shrink-0"
            onClick={() => handleNavClick('#hero')}
          >
            <img
              src="/logo-main.png"
              alt="Madar.software"
              style={{ height: 56, width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 rounded-xl px-2 py-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {navLinks.map(link => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                  language === 'ar' ? 'font-cairo' : 'font-work'
                }`}
                style={{ color: activeHash === link.href ? 'white' : 'rgba(255,255,255,0.5)' }}
              >
                {activeHash === link.href && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.3)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{language === 'ar' ? link.ar : link.en}</span>
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              <Globe size={13} />
              <span>{language === 'ar' ? 'EN' : 'عر'}</span>
            </motion.button>

            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,191,255,0.4)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
              >
                <LogIn size={13} />
                <span>{t('تسجيل الدخول', 'Login')}</span>
              </motion.button>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,191,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={openWhatsApp}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 4px 16px rgba(0,153,204,0.3)' }}
            >
              <Calendar size={13} />
              <span>{t('احجز مكالمة', 'Book a Call')}</span>
            </motion.button>
          </div>

          {/* Mobile toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <button onClick={toggleLanguage} className="p-2 cursor-pointer" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Globe size={18} />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 cursor-pointer" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed top-[76px] inset-x-4 z-40 rounded-2xl px-4 py-4"
            style={{
              background: 'rgba(5,8,16,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.4)',
            }}
          >
            <nav className="flex flex-col gap-1">
              {navLinks.map(link => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className={`px-4 py-3 rounded-xl text-start text-sm font-medium transition-colors cursor-pointer ${
                    language === 'ar' ? 'font-cairo' : 'font-work'
                  }`}
                  style={{
                    color: activeHash === link.href ? 'white' : 'rgba(255,255,255,0.55)',
                    background: activeHash === link.href ? 'rgba(0,191,255,0.1)' : 'transparent',
                  }}
                >
                  {language === 'ar' ? link.ar : link.en}
                </button>
              ))}
              <div className="h-px my-2" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <button className={`w-full px-4 py-3 rounded-xl text-sm font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                  style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)' }}>
                  <LogIn size={14} />
                  {t('تسجيل الدخول', 'Login')}
                </button>
              </Link>
              <button
                onClick={() => { openWhatsApp(); setMobileOpen(false) }}
                className={`w-full px-4 py-3 rounded-xl text-white text-sm font-semibold cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
                style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)' }}
              >
                {t('احجز مكالمة استراتيجية', 'Book a Strategy Call')}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
