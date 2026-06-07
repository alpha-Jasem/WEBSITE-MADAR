import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const navLinks = [
  { ar: 'الرئيسية',    en: 'Home',         href: '#hero' },
  { ar: 'الخدمات',     en: 'Services',     href: '#services' },
  { ar: 'كيف يعمل',   en: 'How It Works',  href: '#how-it-works' },
  { ar: 'أعمالنا',     en: 'Case Studies', href: '#case-studies' },
  { ar: 'القطاعات',   en: 'Industries',   href: '#industries' },
  { ar: 'داشبورد العيادات', en: 'Clinic Dashboard', href: 'https://noor-clinic-dashboard.netlify.app' },
]

const services = [
  { ar: 'موظف مبيعات AI للرسائل والمكالمات', en: 'AI Sales Agent for Messages and Calls' },
  { ar: 'مسار التواصل إلى الحجز',     en: 'Contact-to-Booking Flow' },
  { ar: 'حجوزات وتذكيرات تلقائية',    en: 'Automatic Booking and Reminders' },
  { ar: 'CRM يعرف من تتابع',          en: 'CRM Follow-Up Engine' },
  { ar: 'اقتراحات حملات لزيادة الإيراد', en: 'Revenue Campaign Suggestions' },
  { ar: 'لوحات وبوابات متصلة',        en: 'Connected Dashboards and Portals' },
]

export const Footer = () => {
  const { language, t } = useLanguage()
  const year = 2026

  const scrollTo = (href: string) => {
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="relative border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#050810' }}>
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              <img
                src="/logo-main.png"
                alt="Madar"
                style={{ height: 44, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 19, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1 }}>
                <span className="shimmer-text">Madar</span>
                <span className="shimmer-text-blue">.software</span>
              </span>
            </div>
            <p className={`text-sm leading-relaxed mb-5 max-w-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
              {t(
                'نحوّل رسائل ومكالمات شركتك إلى نظام يرد، يحجز، يتابع، ويكشف أين تزيد المبيعات.',
                'We turn your company messages and calls into a system that replies, books, follows up, and shows where sales can grow.'
              )}
            </p>
            <p className={`text-xs italic ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('"لا نبيع AI. نبني نتيجة تشغيلية واضحة."', '"We do not sell AI. We build a clear business outcome."')}
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className={`text-sm font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
              {t('روابط سريعة', 'Quick Links')}
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map(link => (
                <li key={link.href}>
                  <button
                    onClick={() => scrollTo(link.href)}
                    className={`text-sm transition-colors cursor-pointer ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                    style={{ color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#0D1B3E')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#3B5280')}
                  >
                    {language === 'ar' ? link.ar : link.en}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className={`text-sm font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
              {t('خدماتنا', 'Our Services')}
            </h4>
            <ul className="space-y-2.5">
              {services.map((svc, i) => (
                <li key={i}>
                  <span className={`text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {language === 'ar' ? svc.ar : svc.en}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={`text-sm font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-sora'}`} style={{ color: 'white' }}>
              {t('تواصل معنا', 'Contact Us')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:info@madar.software"
                  className="flex items-center gap-2.5 text-sm transition-colors group"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <Mail size={13} style={{ color: '#00BFFF' }} className="flex-shrink-0" />
                  <span className="font-work">info@madar.software</span>
                </a>
              </li>
              <li>
                <button onClick={() => openWhatsAppChat()}
                  className="flex items-center gap-2.5 text-sm transition-colors cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <Phone size={13} style={{ color: '#00BFFF' }} className="flex-shrink-0" />
                  <span className="font-work" dir="ltr">+966 54 666 6005</span>
                </button>
              </li>
              <li className="flex items-center gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                <MapPin size={13} style={{ color: '#00BFFF' }} className="flex-shrink-0" />
                <span className={language === 'ar' ? 'font-tajawal' : 'font-work'}>
                  {t('جدة، المملكة العربية السعودية', 'Jeddah, Saudi Arabia')}
                </span>
              </li>
            </ul>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(0,191,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => openWhatsAppChat()}
              className={`mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: 'linear-gradient(135deg, #0D1B3E, #00BFFF)', boxShadow: '0 0 20px rgba(0,191,255,0.2)' }}
            >
              {t('احصل على خريطة نمو', 'Get a Growth Map')}
              <ArrowUpRight size={14} />
            </motion.button>
          </div>
        </div>

        {/* Regulatory Logos */}
        <div className="py-6 flex flex-wrap items-center justify-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <a href="https://www.cst.gov.sa" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center px-5 py-3 rounded-xl transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
          >
            <img src="/cst-logo.svg" alt="هيئة الاتصالات والفضاء والتقنية" style={{ height: 48, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.75 }} />
          </a>
          <a href="https://www.monshaat.gov.sa" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center px-6 py-3 rounded-full transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
          >
            <img
              src="https://www.monshaat.gov.sa/themes/eportal2_new/assets/imgs/m_Logo.png"
              alt="منشآت — الهيئة العامة للمنشآت الصغيرة والمتوسطة"
              style={{ height: 56, width: 'auto' }}
            />
          </a>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className={`text-xs ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
            {t(`© ${year} MADAR AI Automation. جميع الحقوق محفوظة.`, `© ${year} MADAR AI Automation. All rights reserved.`)}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className={`text-xs transition-colors hover:text-white ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('سياسة الخصوصية', 'Privacy Policy')}
            </Link>
            <Link to="/terms" className={`text-xs transition-colors hover:text-white ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>
              {t('شروط الاستخدام', 'Terms of Service')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
