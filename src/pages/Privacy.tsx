import { useLanguage } from '../context/LanguageContext'
import { Navbar } from '../components/public/Navbar'
import { Footer } from '../components/public/Footer'
import { Shield } from 'lucide-react'

export const Privacy = () => {
  const { language, t } = useLanguage()
  const font = language === 'ar' ? 'font-tajawal' : 'font-work'
  const heading = language === 'ar' ? 'font-cairo' : 'font-sora'

  return (
    <div style={{ background: '#050810', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.25)' }}>
            <Shield size={18} style={{ color: '#00BFFF' }} />
          </div>
          <h1 className={`text-3xl font-bold ${heading}`}>{t('سياسة الخصوصية', 'Privacy Policy')}</h1>
        </div>

        <p className={`text-sm mb-8 ${font}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t('آخر تحديث: مايو 2026', 'Last updated: May 2026')}
        </p>

        <div className={`space-y-8 text-sm leading-loose ${font}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('١. المعلومات التي نجمعها', '1. Information We Collect')}</h2>
            <p>{t(
              'نجمع المعلومات التي تقدمها لنا مباشرةً عند التواصل معنا عبر واتساب أو البريد الإلكتروني أو نموذج التواصل، وتشمل: الاسم، رقم الهاتف، البريد الإلكتروني، واسم الشركة.',
              'We collect information you provide directly when contacting us via WhatsApp, email, or contact form, including: name, phone number, email address, and company name.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٢. كيف نستخدم معلوماتك', '2. How We Use Your Information')}</h2>
            <p>{t(
              'نستخدم معلوماتك لتقديم خدماتنا، والتواصل معك بشأن مشروعك، وإرسال تحديثات ذات صلة بخدماتنا. لن نبيع معلوماتك لأطراف ثالثة.',
              'We use your information to provide our services, communicate with you about your project, and send relevant service updates. We will never sell your information to third parties.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٣. حماية البيانات', '3. Data Protection')}</h2>
            <p>{t(
              'نطبق إجراءات أمنية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو الإفصاح أو التعديل أو الحذف.',
              'We implement appropriate security measures to protect your information from unauthorized access, disclosure, alteration, or deletion.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٤. ملفات تعريف الارتباط', '4. Cookies')}</h2>
            <p>{t(
              'يستخدم موقعنا ملفات تعريف الارتباط لتحسين تجربتك. يمكنك التحكم في هذه الملفات من خلال إعدادات متصفحك.',
              'Our website uses cookies to improve your experience. You can control these files through your browser settings.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٥. حقوقك', '5. Your Rights')}</h2>
            <p>{t(
              'يحق لك طلب الاطلاع على بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت. للتواصل معنا: info@madar.software',
              'You have the right to request access, correction, or deletion of your personal data at any time. Contact us at: info@madar.software'
            )}</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
