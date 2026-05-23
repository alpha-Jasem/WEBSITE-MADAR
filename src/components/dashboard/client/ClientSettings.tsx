import { useEffect, useState } from 'react'
import { User, Bell, Shield, Link2, Copy, Check, Mail, Loader2, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../../../lib/clientIndustryTemplates'

const PLAN_LIMITS: Record<string, string> = {
  starter: '2,000 رسالة/شهر',
  growth: '10,000 رسالة/شهر',
  enterprise: 'غير محدود',
}

export const ClientSettings = () => {
  const { company, companyId } = useClientCompany()
  const [copied, setCopied] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted')
  const [mapsUrl, setMapsUrl] = useState('')
  const [savingMaps, setSavingMaps] = useState(false)
  const [mapsSaved, setMapsSaved] = useState(false)

  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const isCarWash = template.type === 'car_wash'

  useEffect(() => {
    if (company && (company as any).google_maps_url) {
      setMapsUrl((company as any).google_maps_url)
    }
  }, [company])

  const saveMapsUrl = async () => {
    if (!companyId || !mapsUrl) return
    setSavingMaps(true)
    await supabase.from('companies').update({ google_maps_url: mapsUrl } as any).eq('id', companyId)
    setSavingMaps(false)
    setMapsSaved(true)
    setTimeout(() => setMapsSaved(false), 3000)
  }

  const webhookUrl = companyId && company?.webhook_token
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbound-lead?token=${company.webhook_token}`
    : ''

  const copyWebhook = () => {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const requestNotifPermission = async () => {
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === 'granted')
  }

  const sendEmail = async () => {
    if (!emailTo || !emailSubject) return
    setSendingEmail(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          html: `<div dir="rtl" style="font-family: sans-serif; padding: 24px;">${emailBody.replace(/\n/g, '<br>')}</div>`,
          company_id: companyId,
        }),
      })
      setEmailSent(true)
      setEmailTo(''); setEmailSubject(''); setEmailBody('')
      setTimeout(() => setEmailSent(false), 3000)
    } catch { /* silent */ }
    setSendingEmail(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">الإعدادات</h1>
        <p className="text-sm text-slate-500 font-tajawal">إعدادات الحساب والتكاملات</p>
      </div>

      {/* Company info */}
      {company && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <User size={16} className="text-primary-400" />
            <h3 className="text-sm font-bold text-white font-cairo">معلومات الشركة</h3>
          </div>
          {[
            { label: 'الشركة', value: company.name },
            { label: 'القطاع', value: company.industry },
            { label: 'الباقة', value: `${company.plan} — ${PLAN_LIMITS[company.plan] ?? ''}` },
            { label: 'الحالة', value: company.status },
            { label: 'الرسائل المستخدمة', value: `${(company.messages_used || 0).toLocaleString()} / ${(company.message_limit || 2000).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-slate-400 font-tajawal">{label}</span>
              <span className="text-sm text-white font-tajawal">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Webhook URL */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Link2 size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-white font-cairo">رابط Webhook الخاص بك</h3>
        </div>
        <p className="text-xs text-slate-500 font-tajawal">أرسل بيانات العملاء من أي نموذج خارجي إلى هذا الرابط وسيدخل CRM تلقائياً.</p>
        {webhookUrl ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] text-cyan-400 bg-white/[0.03] px-3 py-2 rounded-lg font-mono break-all" dir="ltr">
              {webhookUrl}
            </code>
            <button onClick={copyWebhook}
              className="p-2 rounded-lg cursor-pointer flex-shrink-0 transition-colors"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: copied ? '#10B981' : '#06B6D4' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-600 font-tajawal">— لا يوجد رابط webhook بعد</p>
        )}
        <div className="p-3 rounded-xl text-xs text-slate-500 font-tajawal space-y-1" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="font-semibold text-slate-400">مثال على الاستخدام (POST):</p>
          <pre className="text-[10px] text-slate-600 font-mono" dir="ltr">{`{ "company_name": "شركة X", "phone": "05XXXXXXXX", "sector": "صحة", "source": "موقع" }`}</pre>
        </div>
      </div>

      {/* Send Email via Resend */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Mail size={16} className="text-yellow-400" />
          <h3 className="text-sm font-bold text-white font-cairo">إرسال إيميل</h3>
        </div>
        <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
          placeholder="البريد الإلكتروني للمستلم"
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-tajawal"
          dir="rtl" />
        <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
          placeholder="الموضوع"
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-tajawal"
          dir="rtl" />
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
          placeholder="نص الرسالة..." rows={4} dir="rtl"
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none font-tajawal resize-none" />
        <button onClick={sendEmail} disabled={sendingEmail || !emailTo || !emailSubject}
          className="w-full py-2.5 rounded-xl text-sm font-bold font-tajawal text-white cursor-pointer disabled:opacity-40 transition-all"
          style={{ background: emailSent ? '#10B981' : 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
          {sendingEmail ? <Loader2 size={14} className="animate-spin mx-auto" /> : emailSent ? 'تم الإرسال ✅' : 'إرسال الإيميل'}
        </button>
      </div>

      {/* Car Wash: Google Maps URL */}
      {isCarWash && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <MapPin size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-cairo">رابط Google Maps للمغسلة</h3>
          </div>
          <p className="text-xs text-slate-500 font-tajawal">سيُرسل هذا الرابط تلقائياً للعملاء بعد كل غسلة لطلب التقييم.</p>
          <div className="flex items-center gap-2">
            <input
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              dir="ltr"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500/50 font-mono transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={saveMapsUrl}
              disabled={savingMaps || !mapsUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer disabled:opacity-40"
              style={{ background: mapsSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', border: `1px solid ${mapsSaved ? 'rgba(16,185,129,0.3)' : 'rgba(34,211,238,0.25)'}`, color: mapsSaved ? '#10B981' : '#22D3EE' }}
            >
              {savingMaps ? <Loader2 size={14} className="animate-spin" /> : mapsSaved ? <Check size={14} /> : <Check size={14} />}
              {mapsSaved ? 'تم الحفظ ✓' : 'حفظ'}
            </motion.button>
          </div>
          {mapsUrl && (
            <p className="text-xs text-slate-600 font-mono break-all" dir="ltr">{mapsUrl}</p>
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Bell size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold text-white font-cairo">الإشعارات</h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 font-tajawal">إشعارات المتصفح عند وصول عميل جديد</span>
          {notifGranted ? (
            <span className="text-xs text-emerald-400 font-tajawal">مفعّلة ✅</span>
          ) : (
            <button onClick={requestNotifPermission}
              className="text-xs text-purple-400 font-tajawal cursor-pointer hover:text-purple-300 transition-colors">
              تفعيل
            </button>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-sm font-bold text-white font-cairo">الأمان</h3>
        </div>
        <div className="space-y-3">
          {['تغيير كلمة المرور', 'المصادقة الثنائية'].map(item => (
            <div key={item} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-slate-400 font-tajawal">{item}</span>
              <button className="text-xs text-primary-400 hover:text-primary-300 font-tajawal cursor-pointer">تعديل</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
