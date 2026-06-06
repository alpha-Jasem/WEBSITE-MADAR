import { useState } from 'react'
import { Building, Calendar, MessageSquare, Bot, Users, Bell, CreditCard, Settings as SettingsIcon, Loader2, RefreshCw } from 'lucide-react'
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
  const [saving1, setSaving1] = useState(false)
  const [success1, setSuccess1] = useState(false)

  const handleSaveClinic = async () => {
    if (!companyId) { showToast('معرّف العيادة غير متاح', 'error'); return }
    setSaving1(true); setSuccess1(false)
    try {
      const patch: Record<string, string> = { name: clinicName }
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
        <div style={{ width: 220, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '8px', flexShrink: 0 }}>
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
                  <input defaultValue="جدة" style={{ ...inputStyle, background: '#F8FAFC', color: '#94A3B8' }} disabled />
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>سيتم تفعيل التعديل قريباً</span>
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
                    onClick={() => showToast('جاري إعادة المزامنة...', 'info')}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#FFFFFF', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                  >
                    <RefreshCw size={13} />
                    إعادة المزامنة
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
                  <select style={{ ...inputStyle }}>
                    <option>24 ساعة قبل الموعد</option>
                    <option>12 ساعة قبل الموعد</option>
                    <option>3 ساعات قبل الموعد</option>
                  </select>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>إعداد التوقيت سيتم تفعيله قريباً</span>
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
              <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>إدارة المستخدمين المتعددين (موظفي الاستقبال، الأطباء) ستكون متاحة قريباً.</div>
              </div>
              <button
                onClick={() => showToast('ميزة إضافة المستخدمين ستُفعّل قريباً', 'info')}
                style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
              >
                إضافة مستخدم
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

          {/* 8. الفوترة */}
          {activeSection === 'billing' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>الباقة والفوترة</h2>
              <div style={{ padding: '20px', borderRadius: 12, background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#4F46E5', fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>
                  {isAIPro ? 'باقة الحجز الذكي 24/7' : 'باقة نمو الحجوزات'}
                </div>
                <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>حساب نشط</div>
                <div style={{ marginTop: 12, fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>
                  {isAIPro ? '١٦,٩٩٩ ريال / سنة' : '٩,٩٩٩ ريال / سنة'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!isAIPro && (
                  <button
                    onClick={() => showToast('سيتواصل معك فريقنا لترقية الباقة', 'info')}
                    style={{ padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                  >
                    ترقية إلى الحجز الذكي 24/7
                  </button>
                )}
                <button
                  onClick={() => window.open('https://wa.me/966546666005?text=' + encodeURIComponent('مرحباً، أريد الاستفسار عن الفوترة لنظام Clinic OS'), '_blank', 'noopener,noreferrer')}
                  style={{ padding: '10px 20px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}
                >
                  تواصل عبر واتساب
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
