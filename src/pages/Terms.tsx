import { useLanguage } from '../context/LanguageContext'
import { Navbar } from '../components/public/Navbar'
import { Footer } from '../components/public/Footer'
import { FileText } from 'lucide-react'

export const Terms = () => {
  const { language, t } = useLanguage()
  const font = language === 'ar' ? 'font-tajawal' : 'font-work'
  const heading = language === 'ar' ? 'font-cairo' : 'font-sora'

  return (
    <div style={{ background: '#050810', minHeight: '100vh', color: 'white' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.25)' }}>
            <FileText size={18} style={{ color: '#00BFFF' }} />
          </div>
          <h1 className={`text-3xl font-bold ${heading}`}>{t('شروط الاستخدام', 'Terms of Service')}</h1>
        </div>

        <p className={`text-sm mb-8 ${font}`} style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t('آخر تحديث: مايو 2026', 'Last updated: May 2026')}
        </p>

        <div className={`space-y-8 text-sm leading-loose ${font}`} style={{ color: 'rgba(255,255,255,0.7)' }}>
          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('١. قبول الشروط', '1. Acceptance of Terms')}</h2>
            <p>{t(
              'باستخدامك لموقع MADAR وخدماتنا، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا.',
              'By using MADAR\'s website and services, you agree to be bound by these terms and conditions. If you do not agree to these terms, please do not use our services.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٢. وصف الخدمات', '2. Description of Services')}</h2>
            <p>{t(
              'تقدم MADAR خدمات أتمتة الأعمال بالذكاء الاصطناعي تشمل: وكلاء AI للعملاء، أتمتة واتساب، حجز المواعيد الذكي، أتمتة CRM، ومساعدي المبيعات. تُقدَّم الخدمات وفق اتفاقيات مخصصة لكل عميل.',
              'MADAR provides AI-powered business automation services including: AI customer agents, WhatsApp automation, smart appointment booking, CRM automation, and sales assistants. Services are delivered under custom agreements per client.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٣. الملكية الفكرية', '3. Intellectual Property')}</h2>
            <p>{t(
              'جميع المحتويات والتصميمات والأنظمة المبنية من قِبل MADAR هي ملكية فكرية لشركة MADAR ما لم يُتفق على خلاف ذلك كتابيًا.',
              'All content, designs, and systems built by MADAR are the intellectual property of MADAR unless otherwise agreed in writing.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٤. حدود المسؤولية', '4. Limitation of Liability')}</h2>
            <p>{t(
              'لا تتحمل MADAR المسؤولية عن أي أضرار غير مباشرة أو عرضية ناتجة عن استخدام خدماتنا. تُحدَّد المسؤولية القصوى بقيمة المبلغ المدفوع مقابل الخدمة.',
              'MADAR is not liable for any indirect or incidental damages resulting from the use of our services. Maximum liability is limited to the amount paid for the service.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٥. التعديلات', '5. Modifications')}</h2>
            <p>{t(
              'تحتفظ MADAR بحق تعديل هذه الشروط في أي وقت. سيتم إخطار العملاء الحاليين بأي تغييرات جوهرية عبر البريد الإلكتروني.',
              'MADAR reserves the right to modify these terms at any time. Current clients will be notified of any material changes via email.'
            )}</p>
          </section>

          <section>
            <h2 className={`text-lg font-bold text-white mb-3 ${heading}`}>{t('٦. التواصل', '6. Contact')}</h2>
            <p>{t(
              'لأي استفسارات حول هذه الشروط: info@madar.software',
              'For any inquiries about these terms: info@madar.software'
            )}</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
