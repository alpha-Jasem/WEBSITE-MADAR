import { useEffect, useState } from 'react'
import { User, Bell, Shield, Link2, Copy, Check, Mail, Loader2, MapPin, ClipboardList, Save, Users, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getClientIndustryTemplate } from '../../../lib/clientIndustryTemplates'
import { CarWashSetup } from './CarWashSetup'

const PLAN_LIMITS: Record<string, string> = {
  starter: '2,000 رسالة/شهر',
  growth: '10,000 رسالة/شهر',
  enterprise: 'غير محدود',
}

export const ClientSettings = () => {
  const { company, companyId } = useClientCompany()
  const [tab, setTab] = useState<'account' | 'setup' | 'team'>('account')
  const [copied, setCopied] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [notifGranted, setNotifGranted] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted')
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

  // Team management
  const CW_PAGES = [
    { path: '/client',            label: 'لوحة المغسلة'  },
    { path: '/client/queue',      label: 'لوحة التشغيل'  },
    { path: '/client/leads',      label: 'عملاء المغسلة' },
    { path: '/client/finance',    label: 'المالية'        },
    { path: '/client/reports',    label: 'التقارير'      },
    { path: '/client/workers',    label: 'الموظفون'      },
    { path: '/client/automations',label: 'الأتمتة'       },
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
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">الإعدادات</h1>
        <p className="text-sm text-slate-500 font-tajawal">إعدادات الحساب والتكاملات</p>
      </div>

      {/* Tabs — car wash only */}
      {isCarWash && (
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
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
          <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
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
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Plus size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>إضافة مستخدم جديد</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>الاسم</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: محمد العتيبي" dir="rtl"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#F1F5F9', outline: 'none', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box' }} />
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
                    style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, fontSize: 20, letterSpacing: 8, background: 'rgba(255,255,255,0.04)', border: `1px solid ${newPin.length === 4 ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}`, color: '#F1F5F9', outline: 'none', fontFamily: 'Sora, sans-serif', boxSizing: 'border-box' }} />
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
                        background: on ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.08)'}`,
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
                background: !newName.trim() || newPin.length !== 4 ? 'rgba(255,255,255,0.04)' : 'rgba(34,211,238,0.12)',
                color: !newName.trim() || newPin.length !== 4 ? '#334155' : '#22D3EE',
                fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700, alignSelf: 'flex-start',
              }}>
                {savingTeam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                إضافة
              </button>
            </div>
          </div>

          {/* Members list */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={15} color="#8B5CF6" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>المستخدمون</h3>
              <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Sora, sans-serif' }}>({teamMembers.length})</span>
            </div>
            {teamMembers.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13 }}>
                لا يوجد مستخدمون — أضف أول مستخدم من الأعلى
              </div>
            ) : (
              teamMembers.map((m, i) => (
                <div key={m.id} style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  {/* Member row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#818CF8', flexShrink: 0 }}>
                      {m.full_name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif' }}>{m.full_name}</div>
                      <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{(m.permissions || []).length} صلاحية · PIN: {'•'.repeat(4)}</div>
                    </div>
                    <button onClick={() => setEditingId(editingId === m.id ? null : m.id)} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'Cairo, sans-serif', cursor: 'pointer',
                      background: editingId === m.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${editingId === m.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
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
                            background: on ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.07)'}`,
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
