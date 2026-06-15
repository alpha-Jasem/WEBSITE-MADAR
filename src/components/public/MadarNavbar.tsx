import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Menu, X } from 'lucide-react'

interface NavLink {
  href: string
  label: string
}

interface Props {
  navLinks: NavLink[]
  subtitle?: string
}

export const MadarNavbar = ({ navLinks, subtitle = 'نظام تشغيل ذكي' }: Props) => {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 70)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenu])

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-500 border-b border-sky-100/60 bg-white/92 shadow-[0_4px_24px_rgba(13,27,62,0.07)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 rounded-2xl px-3 py-2 transition"
          >
            <img src="/logo-main.png" alt="Madar.software" className="h-11 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-black leading-none text-[#0D1B3E]">
                Madar<span className="text-[#00BFFF]">.software</span>
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">{subtitle}</p>
            </div>
          </Link>

          {/* Desktop nav links */}
          <nav
            className="hidden items-center gap-1 rounded-2xl px-2 py-2 text-sm font-black font-cairo lg:flex bg-slate-50 text-slate-700"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-xl px-4 py-2 transition hover:bg-white hover:text-[#0099CC]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              to="/login"
              className="inline-flex rounded-2xl px-4 py-3 text-sm font-black shadow-sm font-cairo border border-sky-100 bg-white text-[#0D1B3E]"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/trial"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#007BFF] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(0,123,255,0.28)] font-cairo"
            >
              ابدأ تجربتك
              <ChevronLeft size={16} />
            </Link>
          </div>

          {/* Mobile: hamburger only */}
          <button
            onClick={() => setMobileMenu(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl lg:hidden border bg-slate-100 text-[#0D1B3E] border-slate-200"
            aria-label="فتح القائمة"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,19,34,0.75)' }}
          onClick={() => setMobileMenu(false)}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '80vw',
              maxWidth: 320,
              background: '#fff',
              padding: '20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflowY: 'auto',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button
                onClick={() => setMobileMenu(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 12, padding: 10, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
              >
                <X size={18} color="#0D1B3E" />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#0D1B3E', fontFamily: 'sans-serif' }}>Madar <span style={{ color: '#00BFFF' }}>OS</span></span>
                <img src="/logo-main.png" alt="Madar" style={{ height: 36, objectFit: 'contain' }} />
              </div>
            </div>

            {/* Nav links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenu(false)}
                  style={{
                    display: 'block',
                    padding: '13px 16px',
                    borderRadius: 14,
                    background: '#F8FAFF',
                    color: '#0D1B3E',
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: 'none',
                    fontFamily: 'Cairo, Tajawal, sans-serif',
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA buttons — pushed to bottom */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
              <Link
                to="/login"
                onClick={() => setMobileMenu(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: 14,
                  border: '1.5px solid #E2E8F0',
                  background: '#fff',
                  color: '#0D1B3E',
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  fontFamily: 'Cairo, Tajawal, sans-serif',
                }}
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/trial"
                onClick={() => setMobileMenu(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: 14,
                  background: '#007BFF',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                  fontFamily: 'Cairo, Tajawal, sans-serif',
                }}
              >
                ابدأ تجربة 3 أيام مجانية
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
