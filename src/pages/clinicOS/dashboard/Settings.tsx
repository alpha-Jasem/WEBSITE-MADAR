import { useState } from 'react'
import { Building, Calendar, MessageSquare, Bot, Users, Bell, CreditCard, Settings as SettingsIcon, Loader2, RefreshCw, X, Send, CheckCircle2, Star, Zap, Sparkles } from 'lucide-react'
import { UpgradeCard } from '../../../components/clinicOS/ui/UpgradeCard'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useToast } from '../../../lib/useToast'
import { supabase } from '../../../lib/supabase'

const SECTIONS = [
  { id: 'clinic',        icon: Building,      label: 'بيانات العيادة' },
  { id: 'booking',       icon: SettingsIcon,  label: 'قواعد الحجز' },
  { id: 'calendar',      icon: Calendar,      label: 'إعدادات التقويم' },
  { id: 'whatsapp',      icon: MessageSquare, label: 'إعدادات واتساب' },
  { id: 'ai',            icon: Bot,           label: 'إعدادات الحجز الذكي' },
  { id: 'users',         icon: Users,         label: 'المستخدمون' },
  { id: 'notifications', icon: Bell,          label: 'الإشعارات' },
  { id: 'billing',       icon: CreditCard,    label: 'الباقة والفوترة' },
]

const inputStyle = {
  padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
  fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' as const, width: '100%', boxSizing: 'border-box' as const,
}
const labelStyle = { fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }
const fieldWrap = { display: 'flex', flexDirection: 'column' as const, gap: 5 }

const ComingSoon = () => (
  <div style={{ padding: '6px 10px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', display: 'inline-block' }}>
    قريباً
  </div>
)

const SaveBtn = ({ onClick, saving, success }: { onClick: () => void; saving?: boolean; success?: boolean }) => (
  <button
    onClick={onClick}
    disabled={saving}
    style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 24px', borderRadius: 8,
      background: success ? '#059669' : '#4F46E5',
      color: 'white', border: 'none', fontSize: 13, fontWeight: 700,
      cursor: saving ? 'not-allowed' : 'pointer',
      fontFamily: 'Cairo, sans-serif', opacity: saving ? 0.7 : 1, transition: 'background 0.3s',
    }}
  >
    {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
    {success ? 'تم الحفظ ✓' : saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
  </button>
)

export const Settings = () => {
  const [activeSection, setActiveSection] = useState('clinic')
  const { packageType, companyId, clinicName: contextClinicName, userName } = useClinicOS()
  const isAIPro = packageType === 'ai_pro'
  const { showToast } = useToast()

  // ── Section 1: Clinic Info ────────────────────────────────────────────────
  const [clinicName, setClinicName]   = useState(contextClinicName || '')
  const [clinicPhone, setClinicPhone] = useState('')
  const [clinicEmail, setClinicEmail] = useState('')
  const [clinicCity, setClinicCity]   = useState('جدة')
  const [saving1, setSaving1] = useState(false)
  const [success1, setSuccess1] = useState(false)

  const handleSaveClinic = async () => {
    if (!companyId) { showToast('معرّف العيادة غير متاح', 'error'); return }
    setSaving1(true); setSuccess1(false)
    try {
      const patch: Record<string, string> = { name: clinicName, city: clinicCity }
      if (clinicPhone) patch.owner_phone = clinicPhone
      if (clinicEmail) patch.owner_email = clinicEmail
      const { error } = await supabase.from('companies').update(patch).eq('id', companyId)
      if (error) throw error
      setSuccess1(true)
      showToast('تم حفظ بيانات العيادة', 'success')
      setTimeout(() => setSuccess1(false), 2500)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ', 'error')
    } finally { setSaving1(false) }
  }

  // ── Add User Modal ────────────────────────────────────────────────────────
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName,  setNewUserName]  = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole,  setNewUserRole]  = useState('receptionist')
  const [sendingInvite, setSendingInvite] = useState(false)
  const handleSendInvite = async () => {
    if (!newUserName.trim() || !newUserEmail.trim()) { showToast('يرجى ملء الاسم والبريد', 'error'); return }
    setSendingInvite(true)
    await new Promise(r => setTimeout(r, 800))
    setSendingInvite(false)
    setShowAddUser(false)
    setNewUserName(''); setNewUserEmail(''); setNewUserRole('receptionist')
    showToast(`تم إرسال دعوة إلى ${newUserEmail}`, 'success')
  }

  // ── Calendar Resync ───────────────────────────────────────────────────────
  const [resyncing, setResyncing] = useState(false)
  const [resyncDone, setResyncDone] = useState(false)
  const handleResync = async () => {
    setResyncing(true); setResyncDone(false)
    await new Promise(r => setTimeout(r, 1800))
    setResyncing(false); setResyncDone(true)
    showToast('تمت إعادة مزامنة Google Calendar', 'success')
    setTimeout(() => setResyncDone(false), 3000)
  }

  // ── Section 2: Booking Rules ──────────────────────────────────────────────
  const [saving2, setSaving2] = useState(false)
  const [success2, setSuccess2] = useState(false)
  const BR_KEY = 'clinicos_booking_rules'
  const defaultBR = () => {
    try { return JSON.parse(localStorage.getItem(BR_KEY) || '{}') } catch { return {} }
  }
  const [bApptDuration, setBApptDuration]     = useState<string>(() => defaultBR().apptDuration || '30 دقيقة')
  const [bBufferTime, setBBufferTime]         = useState<string>(() => defaultBR().bufferTime || '5 دقائق')
  const [bMinAdvance, setBMinAdvance]         = useState<string>(() => defaultBR().minAdvance || '2 ساعة')
  const [bMaxAdvance, setBMaxAdvance]         = useState<string>(() => defaultBR().maxAdvance || '30 يوم')
  const [bAutoConfirm, setBAutoConfirm]       = useState<boolean>(() => defaultBR().autoConfirm ?? true)
  const [bAllowCancel, setBAllowCancel]       = useState<boolean>(() => defaultBR().allowCancel ?? true)
  const [bWaitlist, setBWaitlist]             = useState<boolean>(() => defaultBR().waitlist ?? true)
  const handleSaveBooking = async () => {
    setSaving2(true)
    const rules = { apptDuration: bApptDuration, bufferTime: bBufferTime, minAdvance: bMinAdvance, maxAdvance: bMaxAdvance, autoConfirm: bAutoConfirm, allowCancel: bAllowCancel, waitlist: bWaitlist }
    localStorage.setItem(BR_KEY, JSON.stringify(rules))
    await new Promise(r => setTimeout(r, 300))
    setSaving2(false); setSuccess2(true)
    showToast('تم حفظ قواعد الحجز', 'success')
    setTimeout(() => setSuccess2(false), 2500)
  }

  // ── Section 4: WhatsApp ───────────────────────────────────────────────────
  const [waPhone, setWaPhone] = useState('')
  const [saving4, setSaving4] = useState(false)
  const [success4, setSuccess4] = useState(false)
  const handleSaveWhatsApp = async () => {
    if (!companyId) { showToast('معرّف العيادة غير متاح', 'error'); return }
    setSaving4(true); setSuccess4(false)
    try {
      const patch: Record<string, string> = {}
      if (waPhone) patch.owner_phone = waPhone
      if (Object.keys(patch).length) {
        const { error } = await supabase.from('companies').update(patch).eq('id', companyId)
        if (error) throw error
      }
      setSuccess4(true)
      showToast('تم حفظ إعدادات واتساب', 'success')
      setTimeout(() => setSuccess4(false), 2500)
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ', 'error')
    } finally { setSaving4(false) }
  }

  // ── Section 5: AI ─────────────────────────────────────────────────────────
  const AI_KEY = 'clinicos_ai_settings'
  const defaultAI = () => { try { return JSON.parse(localStorage.getItem(AI_KEY) || '{}') } catch { return {} } }
  const [aiMaxCalls, setAiMaxCalls]       = useState<string>(() => defaultAI().maxCalls || '50')
  const [aiLang, setAiLang]               = useState<string>(() => defaultAI().lang || 'العربية')
  const [aiAutoBook, setAiAutoBook]       = useState<boolean>(() => defaultAI().autoBook ?? true)
  const [aiSendConfirm, setAiSendConfirm] = useState<boolean>(() => defaultAI().sendConfirm ?? true)
  const [saving5, setSaving5] = useState(false)
  const [success5, setSuccess5] = useState(false)
  const handleSaveAI = async () => {
    setSaving5(true)
    const s = { maxCalls: aiMaxCalls, lang: aiLang, autoBook: aiAutoBook, sendConfirm: aiSendConfirm }
    localStorage.setItem(AI_KEY, JSON.stringify(s))
    await new Promise(r => setTimeout(r, 300))
    setSaving5(false); setSuccess5(true)
    showToast('تم حفظ إعدادات الحجز الذكي', 'success')
    setTimeout(() => setSuccess5(false), 2500)
  }

  // ── Section 7: Notifications ──────────────────────────────────────────────
  const NOTIF_KEY = 'clinicos_notif_settings'
  const defaultNotif = () => { try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') } catch { return {} } }
  const [notifConfirm, setNotifConfirm]   = useState<boolean>(() => defaultNotif().confirm ?? true)
  const [notif24h, setNotif24h]           = useState<boolean>(() => defaultNotif().h24 ?? true)
  const [notif3h, setNotif3h]             = useState<boolean>(() => defaultNotif().h3 ?? true)
  const [notifNoShow, setNotifNoShow]     = useState<boolean>(() => defaultNotif().noShow ?? false)
  const [saving7, setSaving7] = useState(false)
  const [success7, setSuccess7] = useState(false)

  // ── Upgrade Modal ─────────────────────────────────────────────────────────
  const [showUpgrade, setShowUpgrade] = useState(false)
  const handleSaveNotif = async () => {
    setSaving7(true)
    localStorage.setItem(NOTIF_KEY, JSON.stringify({ confirm: notifConfirm, h24: notif24h, h3: notif3h, noShow: notifNoShow }))
    await new Promise(r => setTimeout(r, 300))
    setSaving7(false); setSuccess7(true)
    showToast('تم حفظ إعدادات الإشعارات', 'success')
    setTimeout(() => setSuccess7(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, direction: 'rtl' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الإعدادات</h1>
        <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة تفضيلات العيادة وقواعد الحجز والمستخدمين</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '8px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {SECTIONS.map(s => {
              const Icon = s.icon
              return (
                <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, marginBottom: 2, border: 'none', background: activeSection === s.id ? '#EEF2FF' : 'transparent', color: activeSection === s.id ? '#4F46E5' : '#475569', fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500, cursor: 'pointer', fontFamily: 'Tajawal, Cairo, sans-serif', textAlign: 'right' }}>
                  <Icon size={15} />
                  {s.label}
                </button>
              )
            })}
          </div>

          {/* Upgrade Button */}
          {!isAIPro && (
            <div style={{ padding: '8px 4px 4px' }}>
              <div style={{ position: 'relative', padding: 3 }}>
                {/* Corner brackets */}
                {[['0','0'],['0','auto'],['auto','0'],['auto','auto']].map(([t,b], i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: t === '0' ? 0 : 'auto', bottom: b === '0' ? 0 : 'auto',
                    right: i % 2 === 0 ? 0 : 'auto', left: i % 2 !== 0 ? 0 : 'auto',
                    width: 8, height: 8,
                    borderTop: (t === '0') ? '2px solid #8B5CF6' : 'none',
                    borderBottom: (t !== '0') ? '2px solid #8B5CF6' : 'none',
                    borderRight: (i % 2 === 0) ? '2px solid #8B5CF6' : 'none',
                    borderLeft: (i % 2 !== 0) ? '2px solid #8B5CF6' : 'none',
                  }} />
                ))}
                <button
                  onClick={() => setShowUpgrade(true)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 9,
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(79,70,229,0.08))',
                    border: '1px solid rgba(139,92,246,0.25)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 0 16px rgba(139,92,246,0.15)',
                  }}
                >
                  <Zap size={13} style={{ color: '#8B5CF6' }} />
                  <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Cairo, sans-serif', background: 'linear-gradient(135deg, #8B5CF6, #4F46E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Upgrade
                  </span>
                  <Star size={10} style={{ color: '#F59E0B' }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px' }}>

          {/* 1. بيانات العيادة */}
          {activeSection === 'clinic' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>بيانات العيادة</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>اسم العيادة</label>
                  <input value={clinicName} onChange={e => setClinicName(e.target.value)} style={inputStyle} placeholder={contextClinicName || 'عيادات نور للأسنان'} />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>رقم الهاتف</label>
                  <input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} style={inputStyle} placeholder="05xxxxxxxx" type="tel" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>البريد الإلكتروني</label>
                  <input value={clinicEmail} onChange={e => setClinicEmail(e.target.value)} style={inputStyle} placeholder="info@clinic.sa" type="email" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>المدينة</label>
                  <input value={clinicCity} onChange={e => setClinicCity(e.target.value)} style={inputStyle} placeholder="جدة" />
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <SaveBtn onClick={handleSaveClinic} saving={saving1} success={success1} />
              </div>
            </div>
          )}

          {/* 2. قواعد الحجز */}
          {activeSection === 'booking' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>قواعد الحجز</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'مدة الموعد الافتراضية', val: bApptDuration, set: setBApptDuration },
                  { label: 'وقت الانتظار بين المواعيد', val: bBufferTime, set: setBBufferTime },
                  { label: 'أقل وقت للحجز المسبق', val: bMinAdvance, set: setBMinAdvance },
                  { label: 'أقصى حجز مسبق', val: bMaxAdvance, set: setBMaxAdvance },
                ].map(f => (
                  <div key={f.label} style={fieldWrap}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={f.val} onChange={e => f.set(e.target.value)} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'تأكيد تلقائي للمواعيد', val: bAutoConfirm, set: setBAutoConfirm },
                  { label: 'السماح بإلغاء المريض', val: bAllowCancel, set: setBAllowCancel },
                  { label: 'تفعيل قائمة الانتظار', val: bWaitlist, set: setBWaitlist },
                ].map(item => (
                  <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{item.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <SaveBtn onClick={handleSaveBooking} saving={saving2} success={success2} />
              </div>
            </div>
          )}

          {/* 3. التقويم */}
          {activeSection === 'calendar' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>إعدادات التقويم</h2>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>Google Calendar — متصل</div>
                    <div style={{ fontSize: 12, color: '#065F46', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>المزامنة تعمل تلقائياً مع كل حجز واتساب</div>
                  </div>
                  <button
                    onClick={handleResync}
                    disabled={resyncing}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: resyncDone ? '#ECFDF5' : '#FFFFFF', color: resyncDone ? '#059669' : '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: resyncing ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', opacity: resyncing ? 0.8 : 1 }}
                  >
                    <RefreshCw size={13} style={{ animation: resyncing ? 'spin 1s linear infinite' : 'none' }} />
                    {resyncing ? 'جارٍ المزامنة...' : resyncDone ? 'تمت المزامنة ✓' : 'إعادة المزامنة'}
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>
                كل موعد يُحجز عبر واتساب يُضاف تلقائياً لـ Google Calendar. أي وقت محجوز في التقويم يُغلق أمام الحجوزات الجديدة.
              </p>
            </div>
          )}

          {/* 4. واتساب */}
          {activeSection === 'whatsapp' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>إعدادات واتساب</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={fieldWrap}>
                  <label style={labelStyle}>رقم واتساب العيادة</label>
                  <input value={waPhone} onChange={e => setWaPhone(e.target.value)} style={inputStyle} placeholder="966xxxxxxxxx" type="tel" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>وقت التذكير</label>
                  <select
                    value={(() => { try { return JSON.parse(localStorage.getItem('clinicos_wa_settings') || '{}').reminderTime || '24h' } catch { return '24h' } })()}
                    onChange={e => { const s = (() => { try { return JSON.parse(localStorage.getItem('clinicos_wa_settings') || '{}') } catch { return {} } })(); localStorage.setItem('clinicos_wa_settings', JSON.stringify({ ...s, reminderTime: e.target.value })) }}
                    style={{ ...inputStyle }}
                  >
                    <option value="24h">24 ساعة قبل الموعد</option>
                    <option value="12h">12 ساعة قبل الموعد</option>
                    <option value="3h">3 ساعات قبل الموعد</option>
                    <option value="1h">ساعة واحدة قبل الموعد</option>
                  </select>
                </div>
              </div>
              <SaveBtn onClick={handleSaveWhatsApp} saving={saving4} success={success4} />
            </div>
          )}

          {/* 5. الحجز الذكي */}
          {activeSection === 'ai' && (
            isAIPro ? (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>إعدادات الحجز الذكي</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>أقصى مكالمات/يوم</label>
                    <input value={aiMaxCalls} onChange={e => setAiMaxCalls(e.target.value)} style={inputStyle} type="number" min={1} />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>لغة المساعد</label>
                    <select value={aiLang} onChange={e => setAiLang(e.target.value)} style={{ ...inputStyle }}>
                      <option>العربية</option>
                      <option>الإنجليزية</option>
                    </select>
                  </div>
                  <div style={fieldWrap}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', ...labelStyle }}>
                      <input type="checkbox" checked={aiAutoBook} onChange={e => setAiAutoBook(e.target.checked)} style={{ width: 16, height: 16 }} />
                      حجز تلقائي بدون تأكيد يدوي
                    </label>
                  </div>
                  <div style={fieldWrap}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', ...labelStyle }}>
                      <input type="checkbox" checked={aiSendConfirm} onChange={e => setAiSendConfirm(e.target.checked)} style={{ width: 16, height: 16 }} />
                      إرسال تأكيد واتساب فور الحجز
                    </label>
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <SaveBtn onClick={handleSaveAI} saving={saving5} success={success5} />
                </div>
              </div>
            ) : <UpgradeCard compact />
          )}

          {/* 6. المستخدمون */}
          {activeSection === 'users' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>المستخدمون والصلاحيات</h2>
              {/* Real user */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{(userName || 'م').charAt(0)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{userName || 'مدير العيادة'}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>الحساب الحالي</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontFamily: 'Cairo, sans-serif', border: '1px solid #C7D2FE' }}>مالك</span>
              </div>
              <button
                onClick={() => setShowAddUser(true)}
                style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
              >
                + إضافة مستخدم
              </button>
            </div>
          )}

          {/* 7. الإشعارات */}
          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>الإشعارات</h2>
              {[
                { label: 'إرسال تأكيد الحجز', val: notifConfirm, set: setNotifConfirm },
                { label: 'تذكير 24 ساعة قبل الموعد', val: notif24h, set: setNotif24h },
                { label: 'تذكير 3 ساعات قبل الموعد', val: notif3h, set: setNotif3h },
                { label: 'إشعار عدم حضور المريض', val: notifNoShow, set: setNotifNoShow },
              ].map(n => (
                <label key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{n.label}</span>
                  <input type="checkbox" checked={n.val} onChange={e => n.set(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </label>
              ))}
              <div style={{ marginTop: 20 }}>
                <SaveBtn onClick={handleSaveNotif} saving={saving7} success={success7} />
              </div>
            </div>
          )}

          {/* Add User Modal */}
          {showAddUser && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, direction: 'rtl' }} onClick={e => { if (e.target === e.currentTarget) setShowAddUser(false) }}>
              <div style={{ background: '#FFFFFF', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إضافة مستخدم جديد</h3>
                  <button onClick={() => setShowAddUser(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} style={{ color: '#64748B' }} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>الاسم الكامل</label>
                    <input value={newUserName} onChange={e => setNewUserName(e.target.value)} style={inputStyle} placeholder="د. سارة الأحمدي" />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>البريد الإلكتروني</label>
                    <input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} style={{ ...inputStyle, direction: 'ltr' }} placeholder="sara@clinic.sa" type="email" />
                  </div>
                  <div style={fieldWrap}>
                    <label style={labelStyle}>الصلاحية</label>
                    <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} style={{ ...inputStyle }}>
                      <option value="receptionist">موظف استقبال</option>
                      <option value="doctor">طبيب</option>
                      <option value="manager">مدير فرع</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                  <button onClick={handleSendInvite} disabled={sendingInvite} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 10, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: sendingInvite ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif', opacity: sendingInvite ? 0.7 : 1 }}>
                    {sendingInvite ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                    {sendingInvite ? 'جارٍ الإرسال...' : 'إرسال الدعوة'}
                  </button>
                  <button onClick={() => setShowAddUser(false)} style={{ padding: '11px 18px', borderRadius: 10, background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
                </div>
              </div>
            </div>
          )}

          {/* 8. الفوترة */}
          {activeSection === 'billing' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الباقة والفوترة</h2>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: '0 0 24px 0' }}>باقتك الحالية واستكشاف خيارات الترقية</p>

              {/* Current Package Banner */}
              <div style={{
                padding: '14px 18px', borderRadius: 10, marginBottom: 24,
                background: isAIPro ? 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' : 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                border: isAIPro ? '1px solid #C4B5FD' : '1px solid #A7F3D0',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: isAIPro ? '#8B5CF620' : '#10B98120', border: isAIPro ? '1px solid #8B5CF640' : '1px solid #10B98140', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isAIPro ? <Zap size={16} style={{ color: '#8B5CF6' }} /> : <MessageSquare size={16} style={{ color: '#10B981' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isAIPro ? '#6D28D9' : '#065F46', fontFamily: 'Cairo, sans-serif' }}>
                    باقتك الحالية: {isAIPro ? 'AI Voice + واتساب' : 'باقة واتساب'}
                  </div>
                  <div style={{ fontSize: 12, color: isAIPro ? '#7C3AED' : '#059669', fontFamily: 'Tajawal, sans-serif', marginTop: 1 }}>الحساب نشط</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontFamily: 'Cairo, sans-serif', background: isAIPro ? '#8B5CF620' : '#10B98120', color: isAIPro ? '#7C3AED' : '#059669', border: isAIPro ? '1px solid #8B5CF640' : '1px solid #10B98140' }}>نشط</span>
              </div>

              {/* Package Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

                {/* WhatsApp Package */}
                <div style={{
                  borderRadius: 14, border: !isAIPro ? '2px solid #10B981' : '1px solid #E2E8F0',
                  background: !isAIPro ? '#FAFFFE' : '#FAFAFA',
                  overflow: 'hidden', position: 'relative',
                }}>
                  {!isAIPro && (
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#10B981', color: 'white', fontWeight: 800, fontFamily: 'Cairo, sans-serif' }}>باقتك الحالية</span>
                    </div>
                  )}
                  <div style={{ padding: '20px 18px 16px', background: !isAIPro ? 'rgba(16,185,129,0.06)' : 'transparent', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#10B98115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={15} style={{ color: '#10B981' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>باقة واتساب</div>
                        <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>WhatsApp Booking</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>
                      ٩٩٩ <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>ريال / شهر</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'حجز مواعيد تلقائي عبر واتساب ٢٤/٧',
                      'تأكيدات وتذكيرات للمرضى',
                      'داشبورد إدارة كامل',
                      'تقارير أسبوعية للحجوزات',
                      'دعم عبر واتساب',
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <CheckCircle2 size={13} style={{ color: '#10B981', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Pro Package */}
                <div style={{
                  borderRadius: 14, border: isAIPro ? '2px solid #8B5CF6' : '1px solid #E2E8F0',
                  background: isAIPro ? '#FDFCFF' : '#FAFAFA',
                  overflow: 'hidden', position: 'relative',
                }}>
                  {isAIPro && (
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#8B5CF6', color: 'white', fontWeight: 800, fontFamily: 'Cairo, sans-serif' }}>باقتك الحالية</span>
                    </div>
                  )}
                  {!isAIPro && (
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', fontWeight: 800, fontFamily: 'Cairo, sans-serif', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={8} /> الأفضل
                      </span>
                    </div>
                  )}
                  <div style={{ padding: '20px 18px 16px', background: isAIPro ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.03)', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: '#8B5CF615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={15} style={{ color: '#8B5CF6' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>AI Voice + واتساب</div>
                        <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>AI Pro Package</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>
                      ١٩٩٩ <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>ريال / شهر</span>
                    </div>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      'وكيل AI يستقبل المكالمات ويحجز',
                      'حجز واتساب تلقائي ٢٤/٧',
                      'تحليلات AI متقدمة وتقارير ذكية',
                      'داشبورد AI مع سجل المكالمات',
                      'أولوية في الدعم التقني',
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <CheckCircle2 size={13} style={{ color: '#8B5CF6', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.5 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  {!isAIPro && (
                    <div style={{ padding: '0 18px 18px' }}>
                      <a
                        href={`https://wa.me/966546666005?text=${encodeURIComponent('مرحباً 👋\nأريد الترقية من باقة واتساب إلى باقة AI Voice + واتساب.\nيرجى إرسال تفاصيل الترقية.')}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px', borderRadius: 9, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', textDecoration: 'none' }}
                      >
                        <Zap size={13} />
                        ترقّ الآن
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Support */}
              <div style={{ padding: '14px 18px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>استفسار عن الفوترة أو تجديد الاشتراك؟</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>فريقنا متاح على واتساب من الأحد إلى الخميس</div>
                </div>
                <a
                  href={`https://wa.me/966546666005?text=${encodeURIComponent('مرحباً، أريد الاستفسار عن الفوترة لنظام Clinic OS')}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: '#25D36615', color: '#128C7E', border: '1px solid #25D36630', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <MessageSquare size={13} />
                  تواصل معنا
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Upgrade Modal ───────────────────────────────────────────────────── */}
      {showUpgrade && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowUpgrade(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(5,6,10,0.88)', backdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, direction: 'rtl',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 820,
            background: '#0D0F14',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            padding: '48px 40px 40px',
            boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
            position: 'relative',
          }}>
            {/* Close */}
            <button onClick={() => setShowUpgrade(false)} style={{ position: 'absolute', top: 18, left: 18, width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 20, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', marginBottom: 16 }}>
                <Zap size={12} style={{ color: '#8B5CF6' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA', fontFamily: 'Cairo, sans-serif', letterSpacing: '0.06em' }}>اختر باقتك</span>
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif', margin: '0 0 8px' }}>
                طوّر عيادتك مع الباقة المناسبة
              </h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
                اختر الباقة اللي تناسب احتياجاتك وابدأ فوراً
              </p>
            </div>

            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* WhatsApp Card */}
              <div style={{
                borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: !isAIPro ? '1.5px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                padding: 24, position: 'relative', overflow: 'hidden',
              }}>
                {!isAIPro && (
                  <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 2, background: 'linear-gradient(90deg, #10B981, transparent)' }} />
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif' }}>باقة واتساب</span>
                    {!isAIPro && <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 800, fontFamily: 'Cairo, sans-serif', border: '1px solid rgba(16,185,129,0.3)' }}>باقتك الحالية</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal, sans-serif', marginBottom: 16 }}>فوترة شهرية</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif' }}>٩٩٩</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal, sans-serif' }}>ريال / شهر</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal, sans-serif', marginTop: 6 }}>مثالي للعيادات الصغيرة</div>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {['حجز مواعيد تلقائي عبر واتساب ٢٤/٧','تأكيدات وتذكيرات للمرضى','داشبورد إدارة كامل','تقارير أسبوعية للحجوزات','دعم عبر واتساب'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={10} style={{ color: '#10B981' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={!isAIPro}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                    background: !isAIPro ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                    color: !isAIPro ? '#10B981' : 'rgba(255,255,255,0.3)',
                    fontSize: 13, fontWeight: 800, cursor: !isAIPro ? 'default' : 'not-allowed',
                    fontFamily: 'Cairo, sans-serif',
                    border: !isAIPro ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {!isAIPro ? '✓ باقتك الحالية' : 'الباقة الأساسية'}
                </button>
              </div>

              {/* AI Pro Card — highlighted */}
              <div style={{
                borderRadius: 16,
                background: 'rgba(139,92,246,0.06)',
                border: isAIPro ? '1.5px solid #8B5CF6' : '1.5px solid rgba(139,92,246,0.5)',
                padding: 24, position: 'relative', overflow: 'hidden',
                boxShadow: '0 0 40px rgba(139,92,246,0.12)',
              }}>
                {/* Glow blob */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: 2, background: 'linear-gradient(90deg, transparent, #8B5CF6, #4F46E5, transparent)' }} />

                {/* Badge */}
                <div style={{ position: 'absolute', top: 18, left: 18 }}>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'linear-gradient(135deg,#8B5CF6,#4F46E5)', color: 'white', fontWeight: 800, fontFamily: 'Cairo, sans-serif' }}>الأكثر طلباً</span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif' }}>AI Voice + واتساب</span>
                    {isAIPro && <span style={{ fontSize: 10, padding: '2px 9px', borderRadius: 20, background: 'rgba(139,92,246,0.2)', color: '#A78BFA', fontWeight: 800, fontFamily: 'Cairo, sans-serif', border: '1px solid rgba(139,92,246,0.4)' }}>باقتك الحالية</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal, sans-serif', marginBottom: 16 }}>فوترة شهرية</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 900, color: '#FAFAFA', fontFamily: 'Cairo, sans-serif' }}>١٩٩٩</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal, sans-serif' }}>ريال / شهر</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal, sans-serif', marginTop: 6 }}>للعيادات اللي تبي يكون كل شي تلقائي</div>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {['وكيل AI يستقبل المكالمات ويحجز','حجز واتساب تلقائي ٢٤/٧','تحليلات AI متقدمة وتقارير ذكية','سجل مكالمات كامل مع ملخص AI','أولوية في الدعم التقني'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={10} style={{ color: '#A78BFA' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: 'Tajawal, sans-serif' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {isAIPro ? (
                  <button disabled style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.12)', color: '#A78BFA', fontSize: 13, fontWeight: 800, cursor: 'default', fontFamily: 'Cairo, sans-serif' }}>
                    ✓ باقتك الحالية
                  </button>
                ) : (
                  <a
                    href={`https://wa.me/966546666005?text=${encodeURIComponent('مرحباً 👋\nأريد الترقية إلى باقة AI Voice + واتساب.\nيرجى إرسال تفاصيل الترقية.')}`}
                    target="_blank" rel="noreferrer"
                    onClick={() => setShowUpgrade(false)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      width: '100%', padding: '12px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #8B5CF6, #4F46E5)',
                      color: 'white', fontSize: 13, fontWeight: 800,
                      fontFamily: 'Cairo, sans-serif', textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
                    }}
                  >
                    <Sparkles size={14} />
                    ثبّت الاشتراك الآن — ١٩٩٩ ر.س/شهر
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
