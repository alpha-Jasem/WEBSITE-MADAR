import { motion } from 'framer-motion'
import { ArrowDown, Zap } from 'lucide-react'
import { Navbar } from '../components/public/Navbar'
import { ProductsSection } from '../components/public/ProductsSection'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'

export const PlatformHome = () => {
  const { t, language } = useLanguage()

  const scrollToProducts = () => {
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ background: '#05060A', minHeight: '100vh', direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      <Navbar />

      {/* Hero */}
      <section id="hero" className="relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: 100 }}>

        {/* Background grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(0,191,255,0.07) 0%, transparent 60%), linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: 'auto, 60px 60px, 60px 60px',
          }} />

        {/* Glow blob */}
        <div className="absolute pointer-events-none"
          style={{ top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,191,255,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl mx-auto px-4"
        >
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.22)' }}
          >
            <Zap size={12} style={{ color: '#00BFFF' }} />
            <span className={`text-xs font-semibold tracking-widest uppercase ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ color: '#00BFFF' }}>
              AI Operating Systems
            </span>
          </motion.div>

          {/* H1 */}
          <h1 className={`text-4xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}
            style={{ color: 'white' }}>
            {t(
              <>نظّم عملك.<br /><span className="gradient-text-blue">اترك الذكاء الاصطناعي</span><br />يشغّله.</>,
              <>Run Your Business.<br /><span className="gradient-text-blue">Let AI</span> Operate It.</>
            )}
          </h1>

          {/* Subtitle */}
          <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
            style={{ color: 'rgba(255,255,255,0.5)' }}>
            {t(
              'منصة Madar OS — أنظمة تشغيل مبنية لكل قطاع. جاهزة للتشغيل الفوري. بدون تعقيد.',
              'Madar OS Platform — purpose-built operating systems for every sector. Ready to run. No complexity.'
            )}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={scrollToProducts}
              whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(0,191,255,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold text-white cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ background: 'linear-gradient(135deg, #0D1B3E, #0099CC)', boxShadow: '0 4px 24px rgba(0,153,204,0.3)' }}
            >
              <span>{t('استكشف المنتجات', 'Explore Products')}</span>
              <ArrowDown size={16} />
            </motion.button>

            <motion.button
              onClick={() => window.open('https://wa.me/966546666005', '_blank')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 px-7 py-4 rounded-2xl text-base font-medium cursor-pointer ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }}
            >
              {t('احجز جلسة مجانية', 'Book a Free Session')}
            </motion.button>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-16"
          >
            {[
              { value: t('٢ قطاعات', '2 Sectors'), label: t('مغاسل، عيادات', 'Car Wash · Clinic') },
              { value: t('٢٤/٧', '24/7'), label: t('ذكاء اصطناعي لا ينام', 'AI that never sleeps') },
              { value: t('١١+ workflow', '11+ Workflows'), label: t('أتمتة جاهزة لكل قطاع', 'Ready per sector') },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-sora'}`}>{stat.value}</div>
                <div className={`text-xs mt-0.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`} style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer"
          onClick={scrollToProducts}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          >
            <ArrowDown size={18} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* Products */}
      <ProductsSection />

      <Footer />
    </div>
  )
}
