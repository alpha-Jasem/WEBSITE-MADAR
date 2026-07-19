import { useLanguage } from '../../context/LanguageContext'
import { openWhatsAppChat } from '../../lib/whatsapp'
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const navLinks = [
  { ar: 'الرئيسية',       en: 'Home',           href: '#hero' },
  { ar: 'لوحة التحكم',    en: 'Dashboard',      href: '#dashboard' },
  { ar: 'المقارنة',       en: 'Comparison',     href: '#compare' },
  { ar: 'الباقات',        en: 'Plans',          href: '#plans' },
  { ar: 'تسجيل الدخول',  en: 'Login',          href: '/login' },
]

const services = [
  { ar: 'مساعد استقبال AI على واتساب', en: 'AI Receptionist on WhatsApp' },
  { ar: 'إدارة المواعيد والحجوزات',    en: 'Appointment & Booking Management' },
  { ar: 'تذكيرات تلقائية للعملاء',     en: 'Automated Reminders' },
  { ar: 'CRM العملاء والمتابعة',        en: 'Client CRM & Follow-Up' },
  { ar: 'تقارير العيادة وإحصاءات AI', en: 'Clinic Reports & AI Analytics' },
  { ar: 'لوحة تشغيل يومية للعيادة',  en: 'Daily Clinic Operations Dashboard' },
]

export const Footer = () => {
  const { language, t } = useLanguage()
  const year = 2026

  const scrollTo = (href: string) => {
    if (href.startsWith('/')) {
      window.location.href = href
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
                'نظام عربي متكامل لتشغيل العيادات — مساعد استقبال AI، إدارة المواعيد، ومتابعة العملاء.',
                'A complete Arabic system for clinics — AI receptionist, appointment management, and client follow-up.'
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
                    onMouseEnter={e => (e.currentTarget.style.color = '#00BFFF')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
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
                <a href="mailto:Jasemaltubaishi@gmail.com"
                  className="flex items-center gap-2.5 text-sm transition-colors group"
                  style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <Mail size={13} style={{ color: '#00BFFF' }} className="flex-shrink-0" />
                  <span className="font-work">Jasemaltubaishi@gmail.com</span>
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

            <motion.a
              href="/trial"
              whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(0,191,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: 'linear-gradient(135deg, #0D1B3E, #00BFFF)', boxShadow: '0 0 20px rgba(0,191,255,0.2)', textDecoration: 'none' }}
            >
              {t('ابدأ تجربتك المجانية', 'Start Free Trial')}
              <ArrowUpRight size={14} />
            </motion.a>
          </div>
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
