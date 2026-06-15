import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Send, CheckCircle, Loader2, Phone, Mail, User, MessageSquare, Briefcase } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { supabase } from '../../lib/supabase'
import { notifyAdminNewLead, openWhatsAppChat } from '../../lib/whatsapp'
import type { LeadFormData } from '../../types'

const serviceOptions = {
  ar: [
    { value: 'website', label: 'موقع أو بوابة مرتبطة بالمبيعات' },
    { value: 'ai', label: 'موظف AI يرد على الرسائل والمكالمات' },
    { value: 'automation', label: 'أتمتة واتساب + مكالمات + CRM' },
    { value: 'package', label: 'نظام كامل للرد والحجز والمتابعة' },
    { value: 'other', label: 'أحتاج تشخيص مناسب' },
  ],
  en: [
    { value: 'website', label: 'Website or sales-connected portal' },
    { value: 'ai', label: 'AI agent for messages and calls' },
    { value: 'automation', label: 'WhatsApp + calls + CRM automation' },
    { value: 'package', label: 'Full reply, booking, follow-up system' },
    { value: 'other', label: 'I need the right diagnosis' },
  ],
}

export const LeadForm = () => {
  const { language, t } = useLanguage()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  const [form, setForm] = useState<LeadFormData>({ name: '', email: '', phone: '', service: '', message: '' })
  const [errors, setErrors] = useState<Partial<LeadFormData>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validate = () => {
    const newErrors: Partial<LeadFormData> = {}
    if (!form.name.trim()) newErrors.name = t('الاسم مطلوب', 'Name is required')
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = t('بريد إلكتروني غير صالح', 'Invalid email')
    if (!form.phone.trim() || form.phone.length < 10) newErrors.phone = t('رقم جوال غير صالح', 'Invalid phone number')
    if (!form.service) newErrors.service = t('الخدمة مطلوبة', 'Service is required')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await supabase.from('leads').insert([{ ...form, status: 'new', source: 'website' }])
      notifyAdminNewLead(form)
      setSuccess(true)
      setForm({ name: '', email: '', phone: '', service: '', message: '' })
    } catch {
      // silently fail if Supabase not configured — still show success
      notifyAdminNewLead(form)
      setSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  const opts = language === 'ar' ? serviceOptions.ar : serviceOptions.en

  return (
    <section id="contact" className="lead-growth-section py-24 px-4 sm:px-6 lg:px-8 relative" ref={ref}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(79,110,247,0.4) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="lead-growth-heading text-center mb-12"
        >
          <span className={`lead-growth-eyebrow inline-block text-sm font-semibold tracking-widest uppercase mb-3 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('ابدأ من أين يضيع العميل', 'Start Where Customers Leak')}
          </span>
          <h2 className={`lead-growth-title text-4xl sm:text-5xl font-bold mb-4 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
            {t('احصل على خريطة نمو مجانية لشركتك', 'Get a Free Growth Map for Your Business')}
          </h2>
          <p className={`lead-growth-copy text-lg ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
            {t('أرسل لنا وضعك الحالي، ونرجع لك بتشخيص واضح: أين تضيع الرسائل والمكالمات، ماذا نؤتمت أولاً، وكيف نحولها إلى حجوزات.', 'Send us your current situation and we will return with a clear diagnosis: where messages and calls leak, what to automate first, and how to turn them into bookings.')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lead-growth-card glass rounded-2xl p-8 md:p-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            {[
              {
                title: t('تشخيص عملي خلال 24 ساعة', 'Practical Diagnosis Within 24 Hours'),
                desc: t('وليس كلام عام عن الذكاء الاصطناعي', 'No generic AI talk'),
              },
              {
                title: t('خطة واضحة قبل الدفع', 'Clear Plan Before Payment'),
                desc: t('تعرف ما سنبنيه وما الرقم المستهدف', 'Know what we will build and what number we target'),
              },
              {
                title: t('واتساب أو اتصال لمن يريد السرعة', 'WhatsApp or Call for Faster Action'),
                desc: t('نبدأ النقاش من رسالة أو مكالمة', 'Start from one message or call'),
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className={`text-sm font-semibold text-[#0D1B3E] mb-1 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>{item.title}</p>
                <p className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{item.desc}</p>
              </div>
            ))}
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={36} className="text-emerald-400" />
              </div>
              <h3 className={`text-2xl font-bold text-[#0D1B3E] mb-3 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                {t('وصلتنا الرسالة. الخطوة التالية تشخيص النمو', 'Received. Next Step: Growth Diagnosis')}
              </h3>
              <p className={`text-slate-400 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {t('سنتواصل معك خلال 24 ساعة بخطوة واضحة لما يمكن أتمتته أولاً', 'We will contact you within 24 hours with a clear first automation step')}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSuccess(false)}
                className={`mt-6 px-6 py-3 rounded-xl glass border border-white/15 text-slate-300 hover:text-white text-sm transition-all ${language === 'ar' ? 'font-cairo' : 'font-work'}`}
              >
                {t('إرسال رسالة أخرى', 'Send Another Message')}
              </motion.button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {/* Name */}
                <div>
                  <label className={`block text-sm font-medium text-slate-600 mb-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    <User size={13} className="inline me-1.5 opacity-60" />
                    {t('الاسم الكامل', 'Full Name')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder={t('أدخل اسمك الكامل', 'Enter your full name')}
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-[#0D1B3E] placeholder:text-slate-400 focus:outline-none transition-all text-sm ${
                      errors.name ? 'border-red-500/60 focus:border-red-400' : 'border-slate-200 focus:border-sky-400'
                    } ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className={`block text-sm font-medium text-slate-600 mb-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    <Mail size={13} className="inline me-1.5 opacity-60" />
                    {t('البريد الإلكتروني', 'Email Address')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-[#0D1B3E] placeholder:text-slate-400 focus:outline-none transition-all text-sm ${
                      errors.email ? 'border-red-500/60 focus:border-red-400' : 'border-slate-200 focus:border-sky-400'
                    } font-work`}
                    dir="ltr"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className={`block text-sm font-medium text-slate-600 mb-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    <Phone size={13} className="inline me-1.5 opacity-60" />
                    {t('رقم الجوال (واتساب)', 'WhatsApp Number')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-[#0D1B3E] placeholder:text-slate-400 focus:outline-none transition-all text-sm font-work ${
                      errors.phone ? 'border-red-500/60 focus:border-red-400' : 'border-slate-200 focus:border-sky-400'
                    }`}
                    dir="ltr"
                  />
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                </div>

                {/* Service */}
                <div>
                  <label className={`block text-sm font-medium text-slate-600 mb-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    <Briefcase size={13} className="inline me-1.5 opacity-60" />
                    {t('ما النتيجة التي تريدها؟', 'What outcome do you want?')} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.service}
                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-[#0D1B3E] focus:outline-none transition-all text-sm cursor-pointer ${
                      errors.service ? 'border-red-500/60' : 'border-slate-200 focus:border-sky-400'
                    } ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                  >
                    <option value="" className="bg-white">
                      {t('اختر الهدف...', 'Select outcome...')}
                    </option>
                    {opts.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors.service && <p className="text-xs text-red-400 mt-1">{errors.service}</p>}
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className={`block text-sm font-medium text-slate-600 mb-1.5 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                  <MessageSquare size={13} className="inline me-1.5 opacity-60" />
                  {t('صف الوضع الحالي باختصار', 'Briefly Describe the Current Situation')}
                  <span className={`text-slate-600 text-xs ms-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                    {t('(اختياري)', '(optional)')}
                  </span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('مثال: عندنا واتساب واتصالات كثيرة ونحتاج رد وحجز ومتابعة تلقائية...', 'Example: We receive many WhatsApp inquiries and calls and need replies, booking, and automatic follow-up...')}
                  rows={4}
                  className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-[#0D1B3E] placeholder:text-slate-400 focus:outline-none focus:border-sky-400 transition-all resize-none text-sm ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(79,110,247,0.4)' }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-bold text-base shadow-glow transition-all flex items-center justify-center gap-3 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('جاري الإرسال...', 'Sending...')}
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {t('احصل على خريطة النمو المجانية', 'Get My Free Growth Map')}
                  </>
                )}
              </motion.button>

              <p className={`text-center text-xs text-slate-600 mt-4 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                {t('سنراجع وضعك ونرسل لك الخطوة الأعلى أثراً. بياناتك محمية وسرية تماماً.', 'We will review your situation and send the highest-impact next step. Your data is protected and confidential.')}
              </p>

              <button
                type="button"
                onClick={() => openWhatsAppChat(t('مرحباً، أريد خريطة نمو لنظام يرد على الرسائل والمكالمات ويحجز ويتابع العملاء تلقائياً', 'Hello, I want a growth map for a system that handles messages and calls, books, and follows up automatically'))}
                className={`mt-4 w-full rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3 text-sm text-slate-200 transition-all hover:bg-white/[0.06] ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}
              >
                {t('أو ابدأ مباشرة من واتساب', 'Or Start Directly on WhatsApp')}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
