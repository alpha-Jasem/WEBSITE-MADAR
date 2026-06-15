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

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-sky-100 bg-white/94 shadow-[0_18px_45px_rgba(13,27,62,0.08)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
              scrolled ? 'bg-transparent' : 'bg-white/72 shadow-sm backdrop-blur-xl'
            }`}
          >
            <img src="/logo-main.png" alt="Madar.software" className="h-11 w-auto object-contain" />
            <div>
              <p className="font-sora text-lg font-black leading-none">
                Madar<span className="text-[#00BFFF]"> OS</span>
              </p>
              <p className="mt-1 text-[11px] font-bold text-slate-500 font-tajawal">{subtitle}</p>
            </div>
          </Link>

          <nav
            className={`hidden items-center gap-1 rounded-2xl px-2 py-2 text-sm font-black font-cairo lg:flex ${
              scrolled ? 'bg-slate-50 text-slate-700' : 'bg-white/72 text-[#0D1B3E] shadow-sm backdrop-blur-xl'
            }`}
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

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={`hidden rounded-2xl px-4 py-3 text-sm font-black shadow-sm font-cairo sm:inline-flex ${
                scrolled ? 'border border-sky-100 bg-white text-[#0D1B3E]' : 'border border-sky-100 bg-white/78 text-[#0D1B3E]'
              }`}
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/trial"
              className="hidden items-center gap-2 rounded-2xl bg-[#007BFF] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(0,123,255,0.28)] font-cairo sm:inline-flex"
            >
              ابدأ تجربتك
              <ChevronLeft size={16} />
            </Link>
            <button
              onClick={() => setMobileMenu(true)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl lg:hidden border ${scrolled ? 'bg-slate-100 text-[#0D1B3E] border-slate-200' : 'bg-white/72 text-[#0D1B3E] border-sky-100'}`}
              aria-label="فتح القائمة"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenu && (
        <div
          className="fixed inset-0 z-[60] bg-[#071322]/50 p-4 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenu(false)}
        >
          <div
            className="mr-auto h-full w-[82vw] max-w-sm rounded-[28px] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <img src="/logo-main.png" alt="Madar.software" className="h-12" />
              <button onClick={() => setMobileMenu(false)} className="rounded-2xl bg-slate-100 p-3">
                <X size={18} />
              </button>
            </div>
            <div className="mt-8 grid gap-2 font-cairo">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenu(false)}
                  className="rounded-2xl bg-sky-50 px-4 py-4 font-black"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/login"
                className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center font-black text-[#0D1B3E]"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/trial"
                className="rounded-2xl bg-[#007BFF] px-4 py-4 text-center font-black text-white"
              >
                ابدأ تجربة 3 أيام
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
