import { useEffect, useState } from 'react'
import { User, Bell, Shield, Link2, Copy, Check, Mail, Loader2, MapPin, ClipboardList, Save, Users, Plus, Trash2, Eye, EyeOff, QrCode, ExternalLink, Image as ImageIcon, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../../../lib/clientIndustryTemplates'
import { CarWashSetup } from './CarWashSetup'
import { PLAN_LABELS } from '../../../lib/constants'
import { getSelfCheckinSettings, getSelfCheckinUrl } from '../../../lib/selfCheckin'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { CarWashLaunchChecklist } from './CarWashLaunchChecklist'
import { ClientPageHeader } from './ClientUI'

const PLAN_LIMITS: Record<string, string> = {
  starter: '2,000 رسالة/شهر',
  growth: '10,000 رسالة/شهر',
  enterprise: 'غير محدود',
}

export const ClientSettings = () => {
  const { company, companyId } = useClientCompany()
  const [tab, setTab] = useState<'account' | 'setup' | 'team'>('account')
  const [copied, setCopied] = useState(false)
  const [copiedCheckin, setCopiedCheckin] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [notifGranted, setNotifGranted] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const [mapsUrl, setMapsUrl] = useState('')
  const [savingMaps, setSavingMaps] = useState(false)
  const [mapsSaved, setMapsSaved] = useState(false)
  const [selfEnabled, setSelfEnabled] = useState(true)
  const [selfApproval, setSelfApproval] = useState(true)
  const [selfSpamMinutes, setSelfSpamMinutes] = useState(10)
  const [savingSelfCheckin, setSavingSelfCheckin] = useState(false)
  const [selfSaved, setSelfSaved] = useState(false)
  const [serviceCount, setServiceCount] = useState(0)
  const [workerCount, setWorkerCount] = useState(0)
  const [identityName, setIdentityName] = useState('')
  const [identityLogoUrl, setIdentityLogoUrl] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [identitySaved, setIdentitySaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState('')

  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const isCarWash = template.type === 'car_wash'
  const { can, planLabel } = usePlanGate()

  useEffect(() => {
    if (company && (company as any).google_maps_url) {
      setMapsUrl((company as any).google_maps_url)
    }
    setIdentityName(company?.name || '')
    setIdentityLogoUrl((company as any)?.logo_url || '')
    const settings = getSelfCheckinSettings(company as any)
    setSelfEnabled(settings.enabled)
    setSelfApproval(settings.approvalRequired)
    setSelfSpamMinutes(settings.antiSpamMinutes)
  }, [company])

  useEffect(() => {
    if (!companyId || !isCarWash) return
    Promise.all([
      supabase.from('cw_services').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
      supabase.from('cw_workers').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
    ]).then(([services, workers]) => {
      setServiceCount(services.count || 0)
      setWorkerCount(workers.count || 0)
    })
  }, [companyId, isCarWash])

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

  const checkinUrl = getSelfCheckinUrl(company as any)
  const checkinQrUrl = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(checkinUrl)}`
    : ''

  const copyWebhook = () => {
    if (!webhookUrl) return
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const saveIdentity = async () => {
    if (!companyId || !identityName.trim()) return
    setSavingIdentity(true)
    await supabase.from('companies').update({
      name: identityName.trim(),
      logo_url: identityLogoUrl || null,
    } as any).eq('id', companyId)
    setSavingIdentity(false)
    setIdentitySaved(true)
    setTimeout(() => setIdentitySaved(false), 2500)
  }

  const uploadLogo = async (file: File | null) => {
    if (!companyId || !file) return
    setLogoError('')
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      setLogoError('ارفع شعار بصيغة PNG أو JPG أو WEBP أو SVG.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('حجم الشعار لازم يكون أقل من 2MB.')
      return
    }

    setUploadingLogo(true)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${companyId}/logo-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('company-assets').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      setLogoError('تعذر رفع الشعار. حاول مرة ثانية.')
      setUploadingLogo(false)
      return
    }

    const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
    const publicUrl = data.publicUrl
    setIdentityLogoUrl(publicUrl)
    await supabase.from('companies').update({
      name: identityName.trim() || company?.name,
      logo_url: publicUrl,
    } as any).eq('id', companyId)
    setUploadingLogo(false)
    setIdentitySaved(true)
    setTimeout(() => setIdentitySaved(false), 2500)
  }

  const removeLogo = async () => {
    if (!companyId) return
    setIdentityLogoUrl('')
    await supabase.from('companies').update({ logo_url: null } as any).eq('id', companyId)
    setIdentitySaved(true)
    setTimeout(() => setIdentitySaved(false), 2500)
  }

  const copyCheckin = () => {
    if (!checkinUrl) return
    navigator.clipboard.writeText(checkinUrl)
    setCopiedCheckin(true)
    setTimeout(() => setCopiedCheckin(false), 2000)
  }

  const saveSelfCheckin = async () => {
    if (!companyId || !company) return
    setSavingSelfCheckin(true)
    const current = ((company as any).cw_automations || {}) as Record<string, any>
    const next = {
      ...current,
      self_checkin: {
        enabled: selfEnabled,
        approval_required: selfApproval,
        anti_spam_minutes: selfSpamMinutes,
      },
    }
    await supabase.from('companies').update({ cw_automations: next } as any).eq('id', companyId)
    setSavingSelfCheckin(false)
    setSelfSaved(true)
    setTimeout(() => setSelfSaved(false), 2500)
  }

  const escHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const printCheckinKit = () => {
    if (!checkinUrl || !company) return
    const printWindow = window.open('', '_blank', 'width=720,height=900')
    if (!printWindow) return
    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>QR التسجيل الذاتي - ${identityName || company.name}</title>
          <style>
            body{margin:0;background:#eef6ff;font-family:Cairo,Tajawal,Arial,sans-serif;color:#0D1B3E}
            .sheet{width:794px;min-height:1123px;margin:0 auto;padding:54px;box-sizing:border-box;background:linear-gradient(160deg,#fff,#eef8ff)}
            .logo{width:170px;padding:10px 16px;border-radius:18px;background:#fff;box-shadow:0 12px 30px rgba(13,27,62,.12)}
            .hero{margin-top:44px}
            .eyebrow{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(0,191,255,.12);color:#0077AA;font-weight:900}
            h1{margin:18px 0 10px;font-size:54px;line-height:1.05;font-weight:900}
            p{margin:0;color:#415169;font-size:22px;line-height:1.8}
            .qr{margin:48px auto 26px;width:360px;height:360px;padding:18px;border-radius:34px;background:#fff;border:1px solid #d8e8f7;display:block}
            .url{direction:ltr;text-align:center;word-break:break-all;font:700 15px monospace;color:#1565C0;background:#fff;border:1px solid #d8e8f7;border-radius:16px;padding:14px}
            .steps{display:grid;gap:14px;margin-top:34px}
            .step{display:flex;gap:12px;align-items:center;padding:16px;border-radius:18px;background:#fff;border:1px solid #e1edf8;font-size:20px;font-weight:800}
            .num{width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#00BFFF,#1565C0);color:#fff;display:grid;place-items:center;font-weight:900}
            .foot{margin-top:44px;text-align:center;color:#6b7d95;font-size:15px}
          </style>
        </head>
        <body>
          <div class="sheet">
            <img class="logo" src="${escHtml(identityLogoUrl || `${window.location.origin}/logo-main.png`)}" />
            <div class="hero">
              <span class="eyebrow">مدار OS للتسجيل الذاتي</span>
              <h1>${escHtml(identityName || company.name)}</h1>
              <p>امسح الرمز وسجل سيارتك خلال أقل من دقيقة. سيظهر رقمك مباشرة على شاشة التشغيل.</p>
            </div>
            <img class="qr" src="${escHtml(checkinQrUrl)}" />
            <div class="url">${escHtml(checkinUrl)}</div>
            <div class="steps">
              <div class="step"><span class="num">1</span> امسح رمز QR من جوالك</div>
              <div class="step"><span class="num">2</span> اختر الخدمة واكتب بيانات السيارة</div>
              <div class="step"><span class="num">3</span> احتفظ برقم التذكرة وتابع الشاشة</div>
            </div>
            <div class="foot">Powered by Madar OS</div>
          </div>
          <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const requestNotifPermission = async () => {
    const perm = await Notification.requestPermission()
    setNotifGranted(perm === 'granted')
  }

  // Team management
  const CW_PAGES = [
    { path: '/client',            label: 'الرئيسية'  },
    { path: '/client/queue',      label: 'لوحة التشغيل'  },
    { path: '/client/queue-display', label: 'شاشة العرض' },
    { path: '/client/leads',      label: 'العملاء' },
    { path: '/client/finance',    label: 'المالية'        },
    { path: '/client/reports',    label: 'التقارير'      },
    { path: '/client/workers',    label: 'الموظفون'      },
    { path: '/client/automations',label: 'واتساب'       },
    { path: '/client/settings',   label: 'الإعدادات'     },
  ]

  interface StaffMember { id: string; full_name: string; pin: string | null; permissions: string[] }
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([])
  const [teamLoaded, setTeamLoaded] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPerms, setNewPerms] = useState<string[]>(['/client/queue'])
  const [showPin, setShowPin] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const loadTeam = async () => {
    if (!companyId) return
    const { data } = await supabase
      .from('company_users')
      .select('id, full_name, pin, permissions')
      .eq('company_id', companyId)
      .order('created_at')
    setTeamMembers((data as StaffMember[]) || [])
    setTeamLoaded(true)
  }

  useEffect(() => {
    if (tab === 'team' && !teamLoaded) loadTeam()
  }, [tab])

  const togglePerm = (path: string) =>
    setNewPerms(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])

  const toggleMemberPerm = async (member: StaffMember, path: string) => {
    const updated = member.permissions.includes(path)
      ? member.permissions.filter(p => p !== path)
      : [...member.permissions, path]
    await supabase.from('company_users').update({ permissions: updated } as any).eq('id', member.id)
    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: updated } : m))
  }

  const addMember = async () => {
    if (!newName.trim() || newPin.length !== 4 || !companyId) return
    setSavingTeam(true)
    const { data, error } = await supabase.from('company_users').insert({
      company_id: companyId,
      full_name: newName.trim(),
      pin: newPin,
      permissions: newPerms,
      role: 'staff',
    } as any).select()
    if (!error) {
      setNewName(''); setNewPin(''); setNewPerms(['/client/queue'])
      await loadTeam()
    } else {
      console.error('addMember error:', error)
    }
    setSavingTeam(false)
  }

  const deleteMember = async (id: string) => {
    await supabase.from('company_users').delete().eq('id', id)
    setTeamMembers(prev => prev.filter(m => m.id !== id))
    if (editingId === id) setEditingId(null)
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
      <ClientPageHeader
        eyebrow="مركز التحكم"
        title="الإعدادات"
        description="إعدادات الحساب، QR، الفريق، التقييمات، والصلاحيات التشغيلية."
      />

      {/* Tabs — car wash only */}
      {isCarWash && (
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
          {[
            { key: 'account', label: 'إعدادات الحساب', icon: User },
            { key: 'setup',   label: 'إعداد المغسلة',  icon: ClipboardList },
            { key: 'team',    label: 'إدارة الفريق',   icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as typeof tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: tab === key ? '2px solid #22D3EE' : '2px solid transparent', color: tab === key ? '#22D3EE' : '#475569', transition: 'all 0.15s', marginBottom: -1 }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {isCarWash && tab === 'setup' ? <CarWashSetup /> : null}
      {(!isCarWash || tab === 'account') && <>

      {isCarWash && <CarWashLaunchChecklist compact />}

      {/* Company info */}
      {company && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Building2 size={16} className="text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-cairo">هوية المغسلة</h3>
                <p className="text-xs text-slate-500 font-tajawal">تظهر في صفحة التسجيل الذاتي، QR، شاشة العرض، وصفحة متابعة العميل.</p>
              </div>
            </div>
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E2E8F0' }}>
              {identityLogoUrl ? (
                <img src={identityLogoUrl} alt={identityName || 'شعار المغسلة'} className="h-full w-full object-contain p-1.5" />
              ) : (
                <ImageIcon size={22} className="text-slate-400" />
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-500 font-tajawal">اسم المغسلة الظاهر للعميل</span>
              <input
                value={identityName}
                onChange={e => setIdentityName(e.target.value)}
                placeholder="مثال: مغسلة النخبة"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 font-tajawal"
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 font-tajawal">شعار المغسلة</span>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-700 transition-colors hover:bg-cyan-100 font-cairo">
                  {uploadingLogo ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                  {uploadingLogo ? 'جاري رفع الشعار...' : 'رفع شعار من الجهاز'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={e => uploadLogo(e.target.files?.[0] || null)}
                    disabled={uploadingLogo}
                  />
                </label>
                {identityLogoUrl && (
                  <button onClick={removeLogo}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 font-cairo">
                    <Trash2 size={15} />
                    حذف الشعار
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 font-tajawal">سيظهر الشعار في رابط QR وصفحة متابعة العميل وشاشة العرض. الحد الأقصى 2MB.</p>
              {logoError && <p className="text-xs font-bold text-red-600 font-tajawal">{logoError}</p>}
            </div>
          </div>

          <button onClick={saveIdentity} disabled={savingIdentity || !identityName.trim()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo disabled:opacity-50"
            style={{ background: identitySaved ? 'rgba(16,185,129,0.12)' : 'rgba(0,191,255,0.12)', color: identitySaved ? '#059669' : '#0099CC', border: `1px solid ${identitySaved ? 'rgba(16,185,129,0.25)' : 'rgba(0,191,255,0.25)'}` }}>
            {savingIdentity ? <Loader2 size={14} className="animate-spin" /> : identitySaved ? <Check size={14} /> : <Save size={14} />}
            {identitySaved ? 'تم حفظ الهوية' : 'حفظ هوية المغسلة'}
          </button>
        </div>
      )}

      {company && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <User size={16} className="text-primary-400" />
            <h3 className="text-sm font-bold text-slate-900 font-cairo">معلومات الشركة</h3>
          </div>
          {[
            { label: 'الشركة', value: company.name },
            { label: 'القطاع', value: company.industry === 'car_wash' || company.business_type === 'car_wash' ? 'مغسلة سيارات' : company.industry },
            { label: 'الباقة', value: `${PLAN_LABELS[company.plan] ?? company.plan} — ${(company.message_limit || 2000).toLocaleString()} رسالة/شهر` },
            { label: 'الحالة', value: company.status === 'active' ? 'نشط' : company.status },
            { label: 'الرسائل المستخدمة', value: `${(company.messages_used || 0).toLocaleString()} / ${(company.message_limit || 2000).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
              <span className="text-sm text-slate-400 font-tajawal">{label}</span>
              <span className="text-sm text-slate-900 font-tajawal">{value}</span>
            </div>
          ))}
        </div>
      )}

      {isCarWash && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2.5 mb-2">
            <ClipboardList size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 font-cairo">قائمة جاهزية المغسلة</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {[
              { label: 'إضافة الخدمات والأسعار', done: serviceCount > 0, hint: `${serviceCount} خدمة نشطة` },
              { label: 'إضافة الموظفين', done: workerCount > 0, hint: `${workerCount} موظف نشط` },
              { label: 'تجهيز QR التسجيل الذاتي', done: !!checkinUrl && can.selfCheckin, hint: can.selfCheckin ? 'جاهز للطباعة' : 'يتطلب Growth' },
              { label: 'رابط Google Maps للتقييم', done: !!mapsUrl, hint: mapsUrl ? 'مضاف' : 'اختياري لكنه مهم' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold font-tajawal" style={{ color: '#0D1B3E' }}>{item.label}</p>
                  <p className="text-xs font-tajawal" style={{ color: '#64748B' }}>{item.hint}</p>
                </div>
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: item.done ? 'rgba(16,185,129,0.12)' : '#F1F5F9', color: item.done ? '#059669' : '#94A3B8' }}>
                  <Check size={14} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook URL — hidden for car wash */}
      {!isCarWash && <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Link2 size={16} className="text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-900 font-cairo">رابط Webhook الخاص بك</h3>
        </div>
        <p className="text-xs text-slate-500 font-tajawal">أرسل بيانات العملاء من أي نموذج خارجي إلى هذا الرابط وسيدخل CRM تلقائياً.</p>
        {webhookUrl ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-[#1565C0] font-mono break-all" dir="ltr">
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
        <div className="p-3 rounded-xl text-xs text-slate-500 font-tajawal space-y-1" style={{ background: '#FAFAFA' }}>
          <p className="font-semibold text-slate-400">مثال على الاستخدام (POST):</p>
          <pre className="text-[10px] text-slate-600 font-mono" dir="ltr">{`{ "company_name": "شركة X", "phone": "05XXXXXXXX", "sector": "صحة", "source": "موقع" }`}</pre>
        </div>
      </div>}

      {isCarWash && (
        <FeatureLock
          locked={!can.selfCheckin}
          requiredPlan="pro"
          featureName="التسجيل الذاتي QR"
          benefit="متاح في باقة Growth: العملاء يسجلون سياراتهم بأنفسهم وتدخل مباشرة في لوحة التشغيل."
          companyName={company?.name}
          currentPlan={planLabel}
        >
          <div className="p-5 rounded-2xl space-y-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-2.5">
              <QrCode size={16} className="text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-cairo">رابط التسجيل الذاتي QR</h3>
                <p className="text-xs text-slate-500 font-tajawal">اطبع هذا الرمز عند مدخل المغسلة ليُسجل العميل سيارته بنفسه.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="rounded-xl p-3 text-sm font-bold font-tajawal" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0D1B3E' }}>
                <input type="checkbox" checked={selfEnabled} onChange={e => setSelfEnabled(e.target.checked)} style={{ marginLeft: 8 }} />
                تفعيل التسجيل الذاتي
              </label>
              <label className="rounded-xl p-3 text-sm font-bold font-tajawal" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0D1B3E' }}>
                <input type="checkbox" checked={selfApproval} onChange={e => setSelfApproval(e.target.checked)} style={{ marginLeft: 8 }} />
                اعتماد الموظف أولاً
              </label>
              <label className="rounded-xl p-3 text-sm font-bold font-tajawal" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0D1B3E' }}>
                منع التكرار
                <input type="number" min={3} max={60} value={selfSpamMinutes} onChange={e => setSelfSpamMinutes(Number(e.target.value) || 10)} style={{ width: 64, marginRight: 8 }} />
                د
              </label>
            </div>

            <button onClick={saveSelfCheckin} disabled={savingSelfCheckin}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
              style={{ background: selfSaved ? 'rgba(16,185,129,0.12)' : 'rgba(0,191,255,0.12)', color: selfSaved ? '#059669' : '#0099CC', border: `1px solid ${selfSaved ? 'rgba(16,185,129,0.25)' : 'rgba(0,191,255,0.25)'}` }}>
              {savingSelfCheckin ? <Loader2 size={14} className="animate-spin" /> : selfSaved ? <Check size={14} /> : <Save size={14} />}
              {selfSaved ? 'تم حفظ إعدادات QR' : 'حفظ إعدادات QR'}
            </button>

            {checkinUrl ? (
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="rounded-2xl p-3" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <img src={checkinQrUrl} alt="QR التسجيل الذاتي" className="w-full rounded-xl" />
                </div>
                <div className="space-y-3">
                  <code className="block rounded-xl px-3 py-2 text-xs font-mono break-all" dir="ltr" style={{ background: '#FFFFFF', color: '#0D1B3E', border: '1px solid #E2E8F0' }}>
                    {checkinUrl}
                  </code>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={copyCheckin}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
                      style={{ background: copiedCheckin ? 'rgba(16,185,129,0.12)' : 'rgba(0,191,255,0.12)', color: copiedCheckin ? '#059669' : '#0099CC', border: `1px solid ${copiedCheckin ? 'rgba(16,185,129,0.25)' : 'rgba(0,191,255,0.25)'}` }}>
                      {copiedCheckin ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCheckin ? 'تم النسخ' : 'نسخ الرابط'}
                    </button>
                    <a href={checkinUrl} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
                      style={{ background: '#FFFFFF', color: '#0D1B3E', border: '1px solid #E2E8F0' }}>
                      <ExternalLink size={14} />
                      فتح صفحة التسجيل
                    </a>
                    <button onClick={printCheckinKit}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
                      style={{ background: '#0D1B3E', color: '#FFFFFF', border: '1px solid #0D1B3E' }}>
                      <QrCode size={14} />
                      طباعة لوحة QR
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 font-tajawal">لم يتم إنشاء token عام لهذه المغسلة بعد. أنشئه من لوحة الإدارة.</p>
            )}
          </div>
        </FeatureLock>
      )}

      {/* Send Email via Resend — hidden for car wash */}
      {!isCarWash && <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Mail size={16} className="text-yellow-400" />
          <h3 className="text-sm font-bold text-slate-900 font-cairo">إرسال إيميل</h3>
        </div>
        <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
          placeholder="البريد الإلكتروني للمستلم"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none font-tajawal"
          dir="rtl" />
        <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
          placeholder="الموضوع"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none font-tajawal"
          dir="rtl" />
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
          placeholder="نص الرسالة..." rows={4} dir="rtl"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none font-tajawal resize-none" />
        <button onClick={sendEmail} disabled={sendingEmail || !emailTo || !emailSubject}
          className="w-full py-2.5 rounded-xl text-sm font-bold font-tajawal text-white cursor-pointer disabled:opacity-40 transition-all"
          style={{ background: emailSent ? '#10B981' : 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
          {sendingEmail ? <Loader2 size={14} className="animate-spin mx-auto" /> : emailSent ? 'تم الإرسال ✅' : 'إرسال الإيميل'}
        </button>
      </div>}

      {/* Car Wash: Google Maps URL */}
      {isCarWash && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <MapPin size={16} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 font-cairo">رابط Google Maps للمغسلة</h3>
          </div>
          <p className="text-xs text-slate-500 font-tajawal">سيُرسل هذا الرابط تلقائياً للعملاء بعد كل غسلة لطلب التقييم.</p>
          <div className="flex items-center gap-2">
            <input
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              dir="ltr"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500/50 font-mono transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={saveMapsUrl}
              disabled={savingMaps || !mapsUrl}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer disabled:opacity-40"
              style={{ background: mapsSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', border: `1px solid ${mapsSaved ? 'rgba(16,185,129,0.3)' : 'rgba(34,211,238,0.25)'}`, color: mapsSaved ? '#10B981' : '#22D3EE' }}
            >
              {savingMaps ? <Loader2 size={14} className="animate-spin" /> : mapsSaved ? <Check size={14} /> : <Save size={14} />}
              {mapsSaved ? 'تم الحفظ ✓' : 'حفظ'}
            </motion.button>
          </div>
          {mapsUrl && (
            <p className="text-xs text-slate-600 font-mono break-all" dir="ltr">{mapsUrl}</p>
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <Bell size={16} className="text-purple-400" />
          <h3 className="text-sm font-bold text-slate-900 font-cairo">الإشعارات</h3>
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
      <div className="p-5 rounded-2xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 font-cairo">الأمان</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-400 font-tajawal">تغيير كلمة المرور</span>
              <button
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (session?.user?.email) {
                    await supabase.auth.resetPasswordForEmail(session.user.email)
                    alert('تم إرسال رابط تغيير كلمة المرور لبريدك الإلكتروني')
                  }
                }}
                className="text-xs text-primary-400 hover:text-primary-300 font-tajawal cursor-pointer">
                إرسال رابط التغيير
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400 font-tajawal">المصادقة الثنائية</span>
              <span className="text-xs text-slate-600 font-tajawal">قريباً</span>
            </div>
        </div>
      </div>
      </>}

      {/* Team Management Tab */}
      {isCarWash && tab === 'team' && (
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Add member form */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Plus size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>إضافة مستخدم جديد</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>الاسم</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: محمد العتيبي" dir="rtl"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box' }} />
              </div>
              {/* PIN */}
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>
                  PIN (4 أرقام) <span style={{ color: '#475569', fontSize: 11 }}>— يستخدمه للدخول</span>
                </label>
                <div style={{ position: 'relative', maxWidth: 160 }}>
                  <input type={showPin ? 'text' : 'password'} value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="• • • •" dir="ltr" maxLength={4} inputMode="numeric"
                    style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, fontSize: 20, letterSpacing: 8, background: '#FFFFFF', border: `1px solid ${newPin.length === 4 ? 'rgba(34,211,238,0.4)' : '#E2E8F0'}`, color: '#0F172A', outline: 'none', fontFamily: 'Sora, sans-serif', boxSizing: 'border-box' }} />
                  <button onClick={() => setShowPin(v => !v)} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}>
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              {/* Permissions */}
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 10 }}>الصلاحيات — اختر الصفحات المسموحة</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CW_PAGES.map(p => {
                    const on = newPerms.includes(p.path)
                    return (
                      <button key={p.path} onClick={() => togglePerm(p.path)} style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer',
                        background: on ? 'rgba(34,211,238,0.15)' : '#FFFFFF',
                        border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : '#E2E8F0'}`,
                        color: on ? '#22D3EE' : '#64748B', fontWeight: on ? 600 : 400,
                      }}>
                        {on ? '✓ ' : ''}{p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button onClick={addMember} disabled={!newName.trim() || newPin.length !== 4 || savingTeam} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: 'none',
                cursor: !newName.trim() || newPin.length !== 4 ? 'not-allowed' : 'pointer',
                background: !newName.trim() || newPin.length !== 4 ? '#FFFFFF' : 'rgba(34,211,238,0.12)',
                color: !newName.trim() || newPin.length !== 4 ? '#334155' : '#22D3EE',
                fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700, alignSelf: 'flex-start',
              }}>
                {savingTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                إضافة
              </button>
            </div>
          </div>

          {/* Members list */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} color="#8B5CF6" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>المستخدمون</h3>
              <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Sora, sans-serif' }}>({teamMembers.length})</span>
            </div>
            {teamMembers.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
                لا يوجد مستخدمون — أضف أول مستخدم من الأعلى
              </div>
            ) : (
              teamMembers.map((m, i) => (
                <div key={m.id} style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  {/* Member row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#818CF8', flexShrink: 0 }}>
                      {m.full_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', fontFamily: 'Tajawal, sans-serif' }}>{m.full_name}</div>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{(m.permissions || []).length} صلاحية · PIN: {'•'.repeat(4)}</div>
                    </div>
                    <button onClick={() => setEditingId(editingId === m.id ? null : m.id)} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                      background: editingId === m.id ? 'rgba(99,102,241,0.15)' : '#FFFFFF',
                      border: `1px solid ${editingId === m.id ? 'rgba(99,102,241,0.3)' : '#E2E8F0'}`,
                      color: editingId === m.id ? '#818CF8' : '#64748B', marginLeft: 6,
                    }}>
                      {editingId === m.id ? 'إخفاء' : 'تعديل'}
                    </button>
                    <button onClick={() => deleteMember(m.id)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* Permission toggles */}
                  {editingId === m.id && (
                    <div style={{ padding: '0 22px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {CW_PAGES.map(p => {
                        const on = (m.permissions || []).includes(p.path)
                        return (
                          <button key={p.path} onClick={() => toggleMemberPerm(m, p.path)} style={{
                            padding: '6px 13px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer',
                            background: on ? 'rgba(34,211,238,0.15)' : '#F8FAFC',
                            border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : '#F8FAFC'}`,
                            color: on ? '#22D3EE' : '#475569', fontWeight: on ? 600 : 400,
                          }}>
                            {on ? '✓ ' : ''}{p.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
