import { useEffect, useState } from 'react'
import { User, Shield, Link2, Copy, Check, Mail, Loader2, MapPin, ClipboardList, Save, Users, Plus, Trash2, Eye, EyeOff, QrCode, ExternalLink, Image as ImageIcon, Building2, Car, FileText } from 'lucide-react'
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

type SettingsTab = 'account' | 'carwash' | 'finance' | 'print' | 'team'

const CW_PAGES = [
  { path: '/client',               label: 'الرئيسية'      },
  { path: '/client/queue',         label: 'لوحة التشغيل' },
  { path: '/client/queue-display', label: 'شاشة العرض'   },
  { path: '/client/leads',         label: 'العملاء'       },
  { path: '/client/finance',       label: 'المالية'       },
  { path: '/client/reports',       label: 'التقارير'      },
  { path: '/client/workers',       label: 'الموظفون'      },
  { path: '/client/automations',   label: 'واتساب'        },
  { path: '/client/settings',      label: 'الإعدادات'     },
]

export const ClientSettings = () => {
  const { company, companyId } = useClientCompany()
  const [tab, setTab] = useState<SettingsTab>('account')

  const template = getClientIndustryTemplate(company?.business_type, company?.industry)
  const isCarWash = template.type === 'car_wash'
  const { can, planLabel } = usePlanGate()

  // ── Account tab ────────────────────────────────────────────────────────────
  const [copied, setCopied]             = useState(false)
  const [emailTo, setEmailTo]           = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]       = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent]       = useState(false)

  // ── Car Wash tab ───────────────────────────────────────────────────────────
  const [copiedCheckin, setCopiedCheckin]       = useState(false)
  const [mapsUrl, setMapsUrl]                   = useState('')
  const [savingMaps, setSavingMaps]             = useState(false)
  const [mapsSaved, setMapsSaved]               = useState(false)
  const [selfEnabled, setSelfEnabled]           = useState(true)
  const [selfApproval, setSelfApproval]         = useState(true)
  const [selfSpamMinutes, setSelfSpamMinutes]   = useState(10)
  const [savingSelfCheckin, setSavingSelfCheckin] = useState(false)
  const [selfSaved, setSelfSaved]               = useState(false)
  const [serviceCount, setServiceCount]         = useState(0)
  const [workerCount, setWorkerCount]           = useState(0)
  const [identityName, setIdentityName]         = useState('')
  const [identityLogoUrl, setIdentityLogoUrl]   = useState('')
  const [savingIdentity, setSavingIdentity]     = useState(false)
  const [identitySaved, setIdentitySaved]       = useState(false)
  const [uploadingLogo, setUploadingLogo]       = useState(false)
  const [logoError, setLogoError]               = useState('')

  // ── Print tab ──────────────────────────────────────────────────────────────
  const [printFooter, setPrintFooter]         = useState('')
  const [printSize, setPrintSize]             = useState<'thermal' | 'a4'>('thermal')
  const [printShowVat, setPrintShowVat]         = useState(true)
  const [printFontSize, setPrintFontSize]       = useState<'small' | 'medium' | 'large'>('medium')
  const [printShowPhone, setPrintShowPhone]     = useState(true)
  const [printHeaderColor, setPrintHeaderColor] = useState('#1E293B')
  const [printShowPlate, setPrintShowPlate]     = useState(true)
  const [printShowWorker, setPrintShowWorker]   = useState(true)
  const [printShowQr, setPrintShowQr]           = useState(false)
  const [printLogoUrl, setPrintLogoUrl]         = useState('')
  const [savingPrint, setSavingPrint]         = useState(false)
  const [printSaved, setPrintSaved]           = useState(false)

  // ── Team tab ───────────────────────────────────────────────────────────────
  interface StaffMember { id: string; full_name: string; pin: string | null; permissions: string[] }
  const [teamMembers, setTeamMembers]   = useState<StaffMember[]>([])
  const [teamLoaded, setTeamLoaded]     = useState(false)
  const [newName, setNewName]           = useState('')
  const [newPin, setNewPin]             = useState('')
  const [newPerms, setNewPerms]         = useState<string[]>(['/client/queue'])
  const [showPin, setShowPin]           = useState(false)
  const [savingTeam, setSavingTeam]     = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [ownerPin, setOwnerPin]         = useState('')
  const [savingOwnerPin, setSavingOwnerPin] = useState(false)

  // ── Load company data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!company) return
    setMapsUrl((company as any).google_maps_url || '')
    setIdentityName(company?.name || '')
    setIdentityLogoUrl((company as any)?.logo_url || '')
    const settings = getSelfCheckinSettings(company as any)
    setSelfEnabled(settings.enabled)
    setSelfApproval(settings.approvalRequired)
    setSelfSpamMinutes(settings.antiSpamMinutes)
    const ps = ((company as any)?.cw_automations?.print_settings || {}) as any
    setPrintFooter(ps.footer || '')
    setPrintSize(ps.size || 'thermal')
    setPrintShowVat(ps.show_vat !== false)
    const inv = ((company as any)?.cw_invoice_settings || {}) as any
    setPrintFontSize(inv.font_size || 'medium')
    setPrintShowPhone(inv.show_customer_phone !== false)
    setPrintHeaderColor(inv.header_color || '#1E293B')
    setPrintShowPlate(inv.show_plate !== false)
    setPrintShowWorker(inv.show_worker !== false)
    setPrintShowQr(inv.show_qr === true)
    setPrintLogoUrl(inv.logo_url || '')
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

  useEffect(() => {
    if (tab === 'team' && !teamLoaded) loadTeam()
    if (tab === 'team') setOwnerPin(String(((company as any)?.cw_automations || {})?.owner_pin || ''))
  }, [tab])

  // ── Actions ────────────────────────────────────────────────────────────────
  const webhookUrl = companyId && company?.webhook_token
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbound-lead?token=${company.webhook_token}`
    : ''

  const checkinUrl    = getSelfCheckinUrl(company as any)
  const checkinQrUrl  = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(checkinUrl)}`
    : ''

  const saveMapsUrl = async () => {
    if (!companyId || !mapsUrl) return
    setSavingMaps(true)
    await supabase.from('companies').update({ google_maps_url: mapsUrl } as any).eq('id', companyId)
    setSavingMaps(false); setMapsSaved(true)
    setTimeout(() => setMapsSaved(false), 3000)
  }

  const saveIdentity = async () => {
    if (!companyId || !identityName.trim()) return
    setSavingIdentity(true)
    await supabase.from('companies').update({ name: identityName.trim(), logo_url: identityLogoUrl || null } as any).eq('id', companyId)
    setSavingIdentity(false); setIdentitySaved(true)
    setTimeout(() => setIdentitySaved(false), 2500)
  }

  const uploadLogo = async (file: File | null) => {
    if (!companyId || !file) return
    setLogoError('')
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) { setLogoError('ارفع شعار بصيغة PNG أو JPG أو WEBP أو SVG.'); return }
    if (file.size > 2 * 1024 * 1024) { setLogoError('حجم الشعار لازم يكون أقل من 2MB.'); return }
    setUploadingLogo(true)
    const saveInline = async () => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      setIdentityLogoUrl(dataUrl)
      await supabase.from('companies').update({ name: identityName.trim() || company?.name, logo_url: dataUrl } as any).eq('id', companyId)
      setUploadingLogo(false); setIdentitySaved(true)
      setTimeout(() => setIdentitySaved(false), 2500)
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${companyId}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('company-assets').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { await saveInline().catch(() => { setLogoError('تعذر رفع الشعار. حاول مرة ثانية.'); setUploadingLogo(false) }); return }
    const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
    setIdentityLogoUrl(data.publicUrl)
    await supabase.from('companies').update({ name: identityName.trim() || company?.name, logo_url: data.publicUrl } as any).eq('id', companyId)
    setUploadingLogo(false); setIdentitySaved(true)
    setTimeout(() => setIdentitySaved(false), 2500)
  }

  const removeLogo = async () => {
    if (!companyId) return
    setIdentityLogoUrl('')
    await supabase.from('companies').update({ logo_url: null } as any).eq('id', companyId)
    setIdentitySaved(true); setTimeout(() => setIdentitySaved(false), 2500)
  }

  const saveSelfCheckin = async () => {
    if (!companyId || !company) return
    setSavingSelfCheckin(true)
    const current = ((company as any).cw_automations || {}) as Record<string, any>
    await supabase.from('companies').update({ cw_automations: { ...current, self_checkin: { enabled: selfEnabled, approval_required: selfApproval, anti_spam_minutes: selfSpamMinutes } } } as any).eq('id', companyId)
    setSavingSelfCheckin(false); setSelfSaved(true)
    setTimeout(() => setSelfSaved(false), 2500)
  }

  const copyCheckin = () => {
    if (!checkinUrl) return
    navigator.clipboard.writeText(checkinUrl)
    setCopiedCheckin(true); setTimeout(() => setCopiedCheckin(false), 2000)
  }

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const printCheckinKit = () => {
    if (!checkinUrl || !company) return
    const win = window.open('', '_blank', 'width=720,height=900')
    if (!win) return
    win.document.write(`<html dir="rtl"><head><title>QR التسجيل الذاتي</title><style>body{margin:0;background:#eef6ff;font-family:Cairo,Tajawal,Arial,sans-serif;color:#0D1B3E}.sheet{width:794px;min-height:1123px;margin:0 auto;padding:54px;box-sizing:border-box;background:linear-gradient(160deg,#fff,#eef8ff)}.logo{width:170px;padding:10px 16px;border-radius:18px;background:#fff;box-shadow:0 12px 30px rgba(13,27,62,.12)}.hero{margin-top:44px}.eyebrow{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(0,191,255,.12);color:#0077AA;font-weight:900}h1{margin:18px 0 10px;font-size:54px;line-height:1.05;font-weight:900}p{margin:0;color:#415169;font-size:22px;line-height:1.8}.qr{margin:48px auto 26px;width:360px;height:360px;padding:18px;border-radius:34px;background:#fff;border:1px solid #d8e8f7;display:block}.url{direction:ltr;text-align:center;word-break:break-all;font:700 15px monospace;color:#1565C0;background:#fff;border:1px solid #d8e8f7;border-radius:16px;padding:14px}.steps{display:grid;gap:14px;margin-top:34px}.step{display:flex;gap:12px;align-items:center;padding:16px;border-radius:18px;background:#fff;border:1px solid #e1edf8;font-size:20px;font-weight:800}.num{width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#00BFFF,#1565C0);color:#fff;display:grid;place-items:center;font-weight:900}.foot{margin-top:44px;text-align:center;color:#6b7d95;font-size:15px}</style></head><body><div class="sheet"><img class="logo" src="${escHtml(identityLogoUrl || `${window.location.origin}/logo-main.png`)}" /><div class="hero"><span class="eyebrow">مدار OS للتسجيل الذاتي</span><h1>${escHtml(identityName || company.name)}</h1><p>امسح الرمز وسجل سيارتك خلال أقل من دقيقة. سيظهر رقمك مباشرة على شاشة التشغيل.</p></div><img class="qr" src="${escHtml(checkinQrUrl)}" /><div class="url">${escHtml(checkinUrl)}</div><div class="steps"><div class="step"><span class="num">1</span> امسح رمز QR من جوالك</div><div class="step"><span class="num">2</span> اختر الخدمة واكتب بيانات السيارة</div><div class="step"><span class="num">3</span> احتفظ برقم التذكرة وتابع الشاشة</div></div><div class="foot">Powered by Madar OS</div></div><script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script></body></html>`)
    win.document.close()
  }

  const savePrintSettings = async () => {
    if (!companyId || !company) return
    setSavingPrint(true)
    const current = ((company as any).cw_automations || {}) as Record<string, any>
    await supabase.from('companies').update({
      cw_automations: { ...current, print_settings: { footer: printFooter, size: printSize, show_vat: printShowVat } },
      cw_invoice_settings: { layout: printSize, font_size: printFontSize, show_customer_phone: printShowPhone, header_color: printHeaderColor, show_plate: printShowPlate, show_worker: printShowWorker, show_qr: printShowQr, logo_url: printLogoUrl },
    } as any).eq('id', companyId)
    setSavingPrint(false); setPrintSaved(true)
    setTimeout(() => setPrintSaved(false), 2500)
  }

  const loadTeam = async () => {
    if (!companyId) return
    const { data } = await supabase.from('company_users').select('id, full_name, pin, permissions').eq('company_id', companyId).order('created_at')
    setTeamMembers((data as StaffMember[]) || [])
    setTeamLoaded(true)
  }

  const saveOwnerPin = async () => {
    if (!companyId || ownerPin.length !== 4) return
    setSavingOwnerPin(true)
    const nextAuto = { ...(((company as any)?.cw_automations || {}) as Record<string, any>), owner_pin: ownerPin }
    await supabase.from('companies').update({ cw_automations: nextAuto } as any).eq('id', companyId)
    setSavingOwnerPin(false)
  }

  const togglePerm = (path: string) =>
    setNewPerms(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path])

  const toggleMemberPerm = async (member: StaffMember, path: string) => {
    const updated = member.permissions.includes(path) ? member.permissions.filter(p => p !== path) : [...member.permissions, path]
    await supabase.from('company_users').update({ permissions: updated } as any).eq('id', member.id)
    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, permissions: updated } : m))
  }

  const addMember = async () => {
    if (!newName.trim() || newPin.length !== 4 || !companyId) return
    setSavingTeam(true)
    const { error } = await supabase.from('company_users').insert({ company_id: companyId, full_name: newName.trim(), pin: newPin, permissions: newPerms, role: 'staff' } as any).select()
    if (!error) { setNewName(''); setNewPin(''); setNewPerms(['/client/queue']); await loadTeam() }
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
        body: JSON.stringify({ to: emailTo, subject: emailSubject, html: `<div dir="rtl" style="font-family:sans-serif;padding:24px">${emailBody.replace(/\n/g, '<br>')}</div>`, company_id: companyId }),
      })
      setEmailSent(true); setEmailTo(''); setEmailSubject(''); setEmailBody('')
      setTimeout(() => setEmailSent(false), 3000)
    } catch { /* silent */ }
    setSendingEmail(false)
  }

  // ── Tab bar items ──────────────────────────────────────────────────────────
  const CW_TABS: { key: SettingsTab; label: string; icon: typeof User }[] = [
    { key: 'account', label: 'الحساب',   icon: User      },
    { key: 'carwash', label: 'المغسلة',  icon: Car       },
    { key: 'finance', label: 'المالية',  icon: ClipboardList },
    { key: 'print',   label: 'الطباعة',  icon: FileText  },
    { key: 'team',    label: 'الفريق',   icon: Users     },
  ]

  const panelStyle = { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 18, padding: '20px 22px' }
  const saveBtnStyle = (saved: boolean, accent = '#22D3EE') => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 6,
    padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer' as const,
    background: saved ? 'rgba(16,185,129,0.12)' : `${accent}18`,
    color: saved ? '#059669' : accent,
    fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700,
  })

  return (
    <div className="space-y-6">
      <ClientPageHeader eyebrow="مركز التحكم" title="الإعدادات" description="إعدادات الحساب، المغسلة، المالية، الطباعة، والفريق." />

      {/* Tab bar — car wash only */}
      {isCarWash && (
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', paddingBottom: 0, overflowX: 'auto' }}>
          {CW_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: tab === key ? '2px solid #22D3EE' : '2px solid transparent', color: tab === key ? '#22D3EE' : '#475569', transition: 'all 0.15s', marginBottom: -1, whiteSpace: 'nowrap' as const }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ TAB: الحساب ══════════════════════════════════════════════════════ */}
      {(!isCarWash || tab === 'account') && (
        <div className="space-y-5" dir="rtl">

          {/* Plan / company info */}
          {company && (
            <div style={panelStyle} className="space-y-3">
              <div className="flex items-center gap-2.5 mb-2">
                <User size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 font-cairo">معلومات الحساب</h3>
              </div>
              {[
                { label: 'الشركة',  value: company.name },
                { label: 'الباقة',  value: `${PLAN_LABELS[company.plan] ?? company.plan} — ${(company.message_limit || 2000).toLocaleString()} رسالة/شهر` },
                { label: 'الحالة',  value: company.status === 'active' ? 'نشط ✓' : company.status },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                  <span className="text-sm text-slate-400 font-tajawal">{label}</span>
                  <span className="text-sm font-bold text-slate-900 font-tajawal">{value}</span>
                </div>
              ))}

              {/* Messages usage bar */}
              {(() => {
                const used  = company.messages_used  ?? 0
                const limit = company.message_limit  ?? 2000
                const remaining = Math.max(0, limit - used)
                const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
                const barColor = pct >= 95 ? '#EF4444' : pct >= 85 ? '#F59E0B' : '#0EA5E9'
                return (
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-500 font-tajawal">المتبقي من الباقة</span>
                      <span className="text-xs font-bold font-work" style={{ color: barColor }}>
                        {remaining.toLocaleString('ar-SA')} رسالة
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: '#E2E8F0' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-tajawal">
                        {used.toLocaleString('ar-SA')} مستخدمة
                      </span>
                      <span className="text-[11px] text-slate-400 font-tajawal">
                        من {limit.toLocaleString('ar-SA')} ({pct}%)
                      </span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Webhook — non-car-wash only */}
          {!isCarWash && webhookUrl && (
            <div style={panelStyle} className="space-y-3">
              <div className="flex items-center gap-2.5 mb-1">
                <Link2 size={16} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 font-cairo">رابط Webhook الخاص بك</h3>
              </div>
              <p className="text-xs text-slate-500 font-tajawal">أرسل بيانات العملاء من أي نموذج خارجي إلى هذا الرابط وسيدخل CRM تلقائياً.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] text-blue-700 font-mono break-all" dir="ltr">{webhookUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  className="p-2 rounded-lg cursor-pointer flex-shrink-0 transition-colors"
                  style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: copied ? '#10B981' : '#06B6D4' }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ═══ TAB: المغسلة ═════════════════════════════════════════════════════ */}
      {isCarWash && tab === 'carwash' && (
        <div className="space-y-5" dir="rtl">

          {/* Identity */}
          <div style={panelStyle} className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Building2 size={16} className="text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-cairo">هوية المغسلة</h3>
                  <p className="text-xs text-slate-500 font-tajawal">الاسم والشعار يظهران في صفحة QR وشاشة العرض ومتابعة العميل.</p>
                </div>
              </div>
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #E2E8F0' }}>
                {identityLogoUrl
                  ? <img src={identityLogoUrl} alt={identityName || 'شعار المغسلة'} className="h-full w-full object-contain p-1.5" />
                  : <ImageIcon size={22} className="text-slate-400" />}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-500 font-tajawal">اسم المغسلة</span>
                <input value={identityName} onChange={e => setIdentityName(e.target.value)} placeholder="مثال: مغسلة النخبة"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-cyan-400 font-tajawal" />
              </label>
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 font-tajawal">شعار المغسلة</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-700 font-cairo">
                    {uploadingLogo ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                    {uploadingLogo ? 'جاري رفع الشعار...' : 'رفع شعار'}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={e => uploadLogo(e.target.files?.[0] || null)} disabled={uploadingLogo} />
                  </label>
                  {identityLogoUrl && (
                    <button onClick={removeLogo} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 font-cairo">
                      <Trash2 size={15} /> حذف الشعار
                    </button>
                  )}
                </div>
                {logoError && <p className="text-xs font-bold text-red-600 font-tajawal">{logoError}</p>}
              </div>
            </div>

            <button onClick={saveIdentity} disabled={savingIdentity || !identityName.trim()} style={saveBtnStyle(identitySaved)}>
              {savingIdentity ? <Loader2 size={14} className="animate-spin" /> : identitySaved ? <Check size={14} /> : <Save size={14} />}
              {identitySaved ? 'تم حفظ الهوية' : 'حفظ هوية المغسلة'}
            </button>
          </div>

          {/* Google Maps URL */}
          <div style={panelStyle} className="space-y-3">
            <div className="flex items-center gap-2.5 mb-1">
              <MapPin size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 font-cairo">رابط Google Maps للمغسلة</h3>
            </div>
            <p className="text-xs text-slate-500 font-tajawal">سيُرسل تلقائياً للعملاء بعد كل غسلة لطلب التقييم.</p>
            <div className="flex items-center gap-2">
              <input value={mapsUrl} onChange={e => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/..." dir="ltr"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-cyan-500/50 font-mono transition-colors" />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={saveMapsUrl} disabled={savingMaps || !mapsUrl}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer disabled:opacity-40"
                style={{ background: mapsSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', border: `1px solid ${mapsSaved ? 'rgba(16,185,129,0.3)' : 'rgba(34,211,238,0.25)'}`, color: mapsSaved ? '#10B981' : '#22D3EE' }}>
                {savingMaps ? <Loader2 size={14} className="animate-spin" /> : mapsSaved ? <Check size={14} /> : <Save size={14} />}
                {mapsSaved ? 'تم الحفظ ✓' : 'حفظ'}
              </motion.button>
            </div>
          </div>

          {/* QR self check-in */}
          <FeatureLock locked={!can.selfCheckin} requiredPlan="pro" featureName="التسجيل الذاتي QR" benefit="متاح في باقة Growth: العملاء يسجلون سياراتهم بأنفسهم وتدخل مباشرة في لوحة التشغيل." companyName={company?.name} currentPlan={planLabel}>
            <div style={panelStyle} className="space-y-4">
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
              <button onClick={saveSelfCheckin} disabled={savingSelfCheckin} style={saveBtnStyle(selfSaved)}>
                {savingSelfCheckin ? <Loader2 size={14} className="animate-spin" /> : selfSaved ? <Check size={14} /> : <Save size={14} />}
                {selfSaved ? 'تم حفظ إعدادات QR' : 'حفظ إعدادات QR'}
              </button>
              {checkinUrl ? (
                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="rounded-2xl p-3" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <img src={checkinQrUrl} alt="QR التسجيل الذاتي" className="w-full rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <code className="block rounded-xl px-3 py-2 text-xs font-mono break-all" dir="ltr" style={{ background: '#FFFFFF', color: '#0D1B3E', border: '1px solid #E2E8F0' }}>{checkinUrl}</code>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={copyCheckin} style={saveBtnStyle(copiedCheckin)}>
                        {copiedCheckin ? <Check size={14} /> : <Copy size={14} />}
                        {copiedCheckin ? 'تم النسخ' : 'نسخ الرابط'}
                      </button>
                      <a href={checkinUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
                        style={{ background: '#FFFFFF', color: '#0D1B3E', border: '1px solid #E2E8F0' }}>
                        <ExternalLink size={14} /> فتح الصفحة
                      </a>
                      <button onClick={printCheckinKit}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold font-cairo"
                        style={{ background: '#0D1B3E', color: '#FFFFFF', border: '1px solid #0D1B3E' }}>
                        <QrCode size={14} /> طباعة لوحة QR
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-tajawal">لم يتم إنشاء token عام لهذه المغسلة بعد. أنشئه من لوحة الإدارة.</p>
              )}
            </div>
          </FeatureLock>

          {/* Launch checklist */}
          <CarWashLaunchChecklist compact />
        </div>
      )}

      {/* ═══ TAB: المالية والخدمات ════════════════════════════════════════════ */}
      {isCarWash && tab === 'finance' && (
        <CarWashSetup
          visibleTabs={['services', 'vat', 'loyalty']}
          title="المالية والخدمات"
          description="الخدمات والأسعار، الضريبة، وبرنامج الولاء"
        />
      )}

      {/* ═══ TAB: الطباعة والفاتورة ══════════════════════════════════════════ */}
      {isCarWash && tab === 'print' && (() => {
        const fontSizePx = printFontSize === 'small' ? 11 : printFontSize === 'large' ? 15 : 13
        const isThermal = printSize === 'thermal'
        const companyName = company?.name ?? 'مغسلة نايف'
        const previewStyle: React.CSSProperties = {
          fontFamily: 'Tajawal, Cairo, sans-serif',
          fontSize: fontSizePx,
          direction: 'rtl',
          color: '#1a1a1a',
          background: '#fff',
          padding: isThermal ? '12px 10px' : '16px 20px',
          maxWidth: isThermal ? 280 : '100%',
          margin: isThermal ? '0 auto' : 0,
          lineHeight: 1.55,
        }
        return (
        <div dir="rtl" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 20, alignItems: 'start' }}>

          {/* ─── Live Preview ─── */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 font-tajawal">معاينة مباشرة</span>
              <span className="text-xs font-tajawal px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                {isThermal ? 'حراري 80mm' : 'A4'}
              </span>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 16, padding: isThermal ? 20 : 16, display: 'flex', justifyContent: 'center', minHeight: 420 }}>
              <div style={{ ...previewStyle, boxShadow: '0 2px 16px rgba(0,0,0,0.10)', borderRadius: 6, width: isThermal ? 280 : '100%', transition: 'all 0.2s' }}>

                {/* Header */}
                <div style={{ background: printHeaderColor, color: '#fff', padding: isThermal ? '10px 12px' : '12px 16px', borderRadius: '4px 4px 0 0', marginBottom: 10, textAlign: 'center' }}>
                  {printLogoUrl && (
                    <img src={printLogoUrl} alt="logo" onError={e => (e.currentTarget.style.display = 'none')}
                      style={{ height: 32, objectFit: 'contain', marginBottom: 4, filter: 'brightness(0) invert(1)' }} />
                  )}
                  <div style={{ fontSize: fontSizePx + 4, fontWeight: 800 }}>{companyName}</div>
                  {(company as any)?.address && <div style={{ fontSize: fontSizePx - 1, opacity: 0.85, marginTop: 2 }}>{(company as any).address}</div>}
                  {(company as any)?.vat_number && <div style={{ fontSize: fontSizePx - 1, opacity: 0.8 }}>الرقم الضريبي: {(company as any).vat_number}</div>}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fontSizePx - 1, color: '#555', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
                  <span>رقم الفاتورة: <b>INV-0042</b></span>
                  <span>{new Date().toLocaleDateString('ar-SA')}</span>
                </div>

                {/* Customer */}
                <div style={{ borderTop: '1px dashed #ddd', borderBottom: '1px dashed #ddd', padding: '6px 0', marginBottom: 8, fontSize: fontSizePx - 1 }}>
                  <div>العميل: <b>محمد عبدالله</b></div>
                  {printShowPhone && <div style={{ color: '#555' }}>الجوال: 0501234567</div>}
                  {printShowPlate && <div style={{ color: '#555' }}>لوحة السيارة: <b>أ ب ج 1234</b></div>}
                  {printShowWorker && <div style={{ color: '#555' }}>الموظف: <b>فهد العتيبي</b></div>}
                </div>

                {/* Items table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: fontSizePx - 1, marginBottom: 8 }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5' }}>
                      <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 700 }}>الخدمة</th>
                      {!isThermal && <th style={{ textAlign: 'center', padding: '4px 6px', fontWeight: 700 }}>الكمية</th>}
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 700 }}>المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '4px 6px' }}>غسيل خارجي</td>
                      {!isThermal && <td style={{ textAlign: 'center', padding: '4px 6px' }}>1</td>}
                      <td style={{ textAlign: 'left', padding: '4px 6px' }}>50 ر.س</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 6px' }}>تلميع داخلي</td>
                      {!isThermal && <td style={{ textAlign: 'center', padding: '4px 6px' }}>1</td>}
                      <td style={{ textAlign: 'left', padding: '4px 6px' }}>30 ر.س</td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ borderTop: '1px solid #ddd', paddingTop: 8, fontSize: fontSizePx - 1 }}>
                  {printShowVat && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>المجموع قبل الضريبة</span><span>69.57 ر.س</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                        <span>ضريبة القيمة المضافة 15%</span><span>10.43 ر.س</span>
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: fontSizePx + 1, borderTop: '1px solid #ddd', marginTop: 4, paddingTop: 4 }}>
                    <span>الإجمالي</span><span>80 ر.س</span>
                  </div>
                </div>

                {/* QR */}
                {printShowQr && (
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <div style={{ display: 'inline-block', padding: 6, background: '#fff', border: '1px solid #ddd', borderRadius: 4 }}>
                      <svg width={56} height={56} viewBox="0 0 56 56" fill="none">
                        <rect width={56} height={56} fill="white"/>
                        {[0,8,16,40,48].map(x => [0,8,16,40,48].map(y => (
                          <rect key={`${x}${y}`} x={x} y={y} width={6} height={6} fill="#1a1a1a" opacity={Math.random() > 0.4 ? 1 : 0} />
                        )))}
                        <rect x={0} y={0} width={22} height={22} rx={2} fill="none" stroke="#1a1a1a" strokeWidth={2}/>
                        <rect x={4} y={4} width={14} height={14} fill="#1a1a1a"/>
                        <rect x={34} y={0} width={22} height={22} rx={2} fill="none" stroke="#1a1a1a" strokeWidth={2}/>
                        <rect x={38} y={4} width={14} height={14} fill="#1a1a1a"/>
                        <rect x={0} y={34} width={22} height={22} rx={2} fill="none" stroke="#1a1a1a" strokeWidth={2}/>
                        <rect x={4} y={38} width={14} height={14} fill="#1a1a1a"/>
                      </svg>
                    </div>
                    <div style={{ fontSize: fontSizePx - 3, color: '#888', marginTop: 2 }}>رمز التحقق</div>
                  </div>
                )}

                {/* Footer */}
                {printFooter && (
                  <div style={{ borderTop: '1px dashed #ddd', marginTop: 10, paddingTop: 8, textAlign: 'center', fontSize: fontSizePx - 2, color: '#666' }}>
                    {printFooter}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Settings Panel ─── */}
          <div className="space-y-4">

            {/* Layout */}
            <div style={panelStyle} className="space-y-4">
              <div className="flex items-center gap-2.5 mb-1">
                <FileText size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 font-cairo">إعدادات الطباعة</h3>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 font-tajawal mb-3">تخطيط الإيصال</label>
                <div className="flex gap-3">
                  {([['thermal', 'حراري 80mm'], ['a4', 'A4']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setPrintSize(val)}
                      className="flex-1 p-3 rounded-xl border text-sm font-bold font-cairo transition-all"
                      style={{ background: printSize === val ? 'rgba(99,102,241,0.1)' : '#FFFFFF', border: `1px solid ${printSize === val ? 'rgba(99,102,241,0.4)' : '#E2E8F0'}`, color: printSize === val ? '#6366F1' : '#475569' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 font-tajawal mb-3">حجم الخط</label>
                <div className="flex gap-2">
                  {([['small', 'صغير'], ['medium', 'متوسط'], ['large', 'كبير']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setPrintFontSize(val)}
                      className="flex-1 p-2.5 rounded-xl border text-sm font-bold font-cairo transition-all"
                      style={{ background: printFontSize === val ? 'rgba(99,102,241,0.1)' : '#FFFFFF', border: `1px solid ${printFontSize === val ? 'rgba(99,102,241,0.4)' : '#E2E8F0'}`, color: printFontSize === val ? '#6366F1' : '#475569' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 font-tajawal mb-3">لون الترويسة</label>
                <div className="flex gap-2 flex-wrap items-center">
                  {['#1E293B', '#0F4C81', '#065F46', '#7C3AED', '#9A3412', '#1a1a1a'].map(color => (
                    <button key={color} onClick={() => setPrintHeaderColor(color)}
                      style={{ width: 30, height: 30, borderRadius: 7, background: color, border: `3px solid ${printHeaderColor === color ? '#6366F1' : 'transparent'}`, cursor: 'pointer', outline: printHeaderColor === color ? '2px solid #6366F1' : 'none', outlineOffset: 2 }} />
                  ))}
                  <input type="color" value={printHeaderColor} onChange={e => setPrintHeaderColor(e.target.value)}
                    style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E2E8F0', cursor: 'pointer', padding: 2 }} />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div style={panelStyle} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-cairo mb-1">عناصر الإيصال</h3>

              {([
                [printShowVat,    setPrintShowVat,    'تفاصيل الضريبة',  'المبلغ قبل الضريبة + مبلغ VAT'],
                [printShowPhone,  setPrintShowPhone,  'جوال العميل',     'يظهر بجانب اسم العميل'],
                [printShowPlate,  setPrintShowPlate,  'لوحة السيارة',    'رقم اللوحة يظهر في الفاتورة'],
                [printShowWorker, setPrintShowWorker, 'اسم الموظف',      'من نفّذ الخدمة'],
                [printShowQr,     setPrintShowQr,     'QR Code',         'رمز QR للتحقق من صحة الفاتورة'],
              ] as [boolean, React.Dispatch<React.SetStateAction<boolean>>, string, string][]).map(([val, setter, title, desc]) => (
                <div key={title} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                  <div>
                    <p className="text-sm font-bold text-slate-900 font-cairo">{title}</p>
                    <p className="text-xs text-slate-500 font-tajawal">{desc}</p>
                  </div>
                  <button onClick={() => setter(v => !v)}
                    style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: val ? '#6366F1' : '#E2E8F0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s, left 0.2s', right: val ? 2 : 'auto', left: val ? 'auto' : 2 }} />
                  </button>
                </div>
              ))}

              {/* Logo URL */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 font-cairo">شعار الشركة (لوغو)</p>
                <p className="text-xs text-slate-500 font-tajawal">رابط صورة اللوغو يظهر في رأس الفاتورة بجانب اسم الشركة</p>
                <input type="url" value={printLogoUrl} onChange={e => setPrintLogoUrl(e.target.value)} dir="ltr"
                  placeholder="https://..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 font-mono transition-colors" />
                {printLogoUrl && (
                  <img src={printLogoUrl} alt="logo preview" onError={e => (e.currentTarget.style.display = 'none')}
                    style={{ height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #E2E8F0', padding: 4, background: '#fff' }} />
                )}
              </div>
            </div>

            {/* Footer text */}
            <div style={panelStyle} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-cairo">نص ذيل الفاتورة</h3>
              <textarea value={printFooter} onChange={e => setPrintFooter(e.target.value)} rows={3} dir="rtl" maxLength={200}
                placeholder='مثال: "شكراً لثقتكم — زورونا مجدداً!"'
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-400 font-tajawal resize-none transition-colors" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-tajawal">{printFooter.length}/200 حرف</span>
                <button onClick={savePrintSettings} style={saveBtnStyle(printSaved, '#6366F1')}>
                  {savingPrint ? <Loader2 size={14} className="animate-spin" /> : printSaved ? <Check size={14} /> : <Save size={14} />}
                  {printSaved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ═══ TAB: الفريق ══════════════════════════════════════════════════════ */}
      {isCarWash && tab === 'team' && (
        <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Owner PIN */}
          <div style={{ ...panelStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={15} color="#0B63F6" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>PIN المالك</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginBottom: 14 }}>
              رقم سري مكون من 4 أرقام يُستخدم عند الرجوع لحساب المالك من واجهة الموظفين.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input type={showPin ? 'text' : 'password'} value={ownerPin} onChange={e => setOwnerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="• • • •" dir="ltr" maxLength={4} inputMode="numeric"
                style={{ width: 160, padding: '10px 14px', borderRadius: 10, fontSize: 20, letterSpacing: 8, background: '#FFFFFF', border: `1px solid ${ownerPin.length === 4 ? 'rgba(11,99,246,0.35)' : '#E2E8F0'}`, color: '#0F172A', outline: 'none', fontFamily: 'Sora, sans-serif', boxSizing: 'border-box', textAlign: 'center' }} />
              <button onClick={() => setShowPin(v => !v)} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#475569', cursor: 'pointer' }}>
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={saveOwnerPin} disabled={ownerPin.length !== 4 || savingOwnerPin}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: 'none', cursor: ownerPin.length === 4 ? 'pointer' : 'not-allowed', background: ownerPin.length === 4 ? 'rgba(11,99,246,0.12)' : '#FFFFFF', color: ownerPin.length === 4 ? '#0B63F6' : '#94A3B8', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
                {savingOwnerPin ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                حفظ PIN
              </button>
            </div>
          </div>

          {/* Add member form */}
          <div style={panelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Plus size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>إضافة مستخدم جديد</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>الاسم</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: محمد العتيبي" dir="rtl"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', outline: 'none', fontFamily: 'Tajawal, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 6 }}>
                  PIN (4 أرقام) <span style={{ color: '#475569', fontSize: 11 }}>— يستخدمه للدخول</span>
                </label>
                <div style={{ position: 'relative', maxWidth: 160 }}>
                  <input type={showPin ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="• • • •" dir="ltr" maxLength={4} inputMode="numeric"
                    style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: 10, fontSize: 20, letterSpacing: 8, background: '#FFFFFF', border: `1px solid ${newPin.length === 4 ? 'rgba(34,211,238,0.4)' : '#E2E8F0'}`, color: '#0F172A', outline: 'none', fontFamily: 'Sora, sans-serif', boxSizing: 'border-box' }} />
                  <button onClick={() => setShowPin(v => !v)} style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}>
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', display: 'block', marginBottom: 10 }}>الصلاحيات</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CW_PAGES.map(p => {
                    const on = newPerms.includes(p.path)
                    return (
                      <button key={p.path} onClick={() => togglePerm(p.path)}
                        style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', background: on ? 'rgba(34,211,238,0.15)' : '#FFFFFF', border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : '#E2E8F0'}`, color: on ? '#22D3EE' : '#64748B', fontWeight: on ? 600 : 400 }}>
                        {on ? '✓ ' : ''}{p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button onClick={addMember} disabled={!newName.trim() || newPin.length !== 4 || savingTeam}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: !newName.trim() || newPin.length !== 4 ? 'not-allowed' : 'pointer', background: !newName.trim() || newPin.length !== 4 ? '#FFFFFF' : 'rgba(34,211,238,0.12)', color: !newName.trim() || newPin.length !== 4 ? '#334155' : '#22D3EE', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700, alignSelf: 'flex-start' }}>
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
            ) : teamMembers.map((m, i) => (
              <div key={m.id} style={{ borderBottom: i < teamMembers.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#818CF8', flexShrink: 0 }}>
                    {m.full_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', fontFamily: 'Tajawal, sans-serif' }}>{m.full_name}</div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{(m.permissions || []).length} صلاحية · PIN: {'•'.repeat(4)}</div>
                  </div>
                  <button onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'Cairo, sans-serif', cursor: 'pointer', background: editingId === m.id ? 'rgba(99,102,241,0.15)' : '#FFFFFF', border: `1px solid ${editingId === m.id ? 'rgba(99,102,241,0.3)' : '#E2E8F0'}`, color: editingId === m.id ? '#818CF8' : '#64748B', marginLeft: 6 }}>
                    {editingId === m.id ? 'إخفاء' : 'تعديل الصلاحيات'}
                  </button>
                  <button onClick={() => deleteMember(m.id)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {editingId === m.id && (
                  <div style={{ padding: '0 22px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CW_PAGES.map(p => {
                      const on = (m.permissions || []).includes(p.path)
                      return (
                        <button key={p.path} onClick={() => toggleMemberPerm(m, p.path)}
                          style={{ padding: '6px 13px', borderRadius: 20, fontSize: 12, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer', background: on ? 'rgba(34,211,238,0.15)' : '#F8FAFC', border: `1px solid ${on ? 'rgba(34,211,238,0.4)' : '#F8FAFC'}`, color: on ? '#22D3EE' : '#475569', fontWeight: on ? 600 : 400 }}>
                          {on ? '✓ ' : ''}{p.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
