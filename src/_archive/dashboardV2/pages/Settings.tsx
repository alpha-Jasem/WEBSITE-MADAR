import { useEffect, useRef, useState } from 'react'
import { Camera, Plus, Trash2, Users, ShieldCheck, ShieldOff, Building2, Clock, Sparkles as SparklesIcon } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { supabase } from '@/lib/supabase'
import {
  updateClinicCompany, uploadCompanyLogo, updateClinicWorkingHours,
  useClinicStaff, inviteStaffMember, updateStaffMember, removeStaffMember,
} from '@/lib/clinicOSQueries'
import { Card, Button, Input, Select, Switch, Badge, Dialog, type BadgeTone } from '@/_archive/dashboardV2/components/primitives'
import { useToast, Avatar } from '@/_archive/dashboardV2/components/uiExtras'

const DAYS: { key: string; label: string }[] = [
  { key: 'sun', label: 'الأحد' }, { key: 'mon', label: 'الإثنين' }, { key: 'tue', label: 'الثلاثاء' },
  { key: 'wed', label: 'الأربعاء' }, { key: 'thu', label: 'الخميس' }, { key: 'fri', label: 'الجمعة' }, { key: 'sat', label: 'السبت' },
]

interface DayHours { open: boolean; start: string; end: string }
type WorkingHours = Record<string, DayHours>

const DEFAULT_HOURS: WorkingHours = Object.fromEntries(
  DAYS.map((d) => [d.key, { open: d.key !== 'fri', start: '09:00', end: '21:00' }]),
)

const ROLE_LABEL: Record<string, string> = { owner: 'مالك', manager: 'مدير', staff: 'موظف' }
const ROLE_TONE: Record<string, BadgeTone> = { owner: 'brand', manager: 'success', staff: 'neutral' }
const ROLE_OPTIONS = [{ value: 'staff', label: 'موظف' }, { value: 'manager', label: 'مدير' }]

const SECTIONS = [
  { key: 'business', label: 'بيانات العمل', icon: Building2 },
  { key: 'hours', label: 'ساعات العمل', icon: Clock },
  { key: 'team', label: 'الفريق والصلاحيات', icon: Users },
  { key: 'security', label: 'الأمان', icon: ShieldCheck },
  { key: 'ai', label: 'تفضيلات الذكاء الاصطناعي', icon: SparklesIcon },
] as const
type SectionKey = typeof SECTIONS[number]['key']

export function DashboardV2Settings() {
  const {
    companyId, clinicName, clinicPhone, clinicEmail, clinicCity, clinicLogoUrl, clinicSettings,
    isDemo, isOwner, refreshAccount,
  } = useClinicOS()
  const { data: staff, refetch: refetchStaff } = useClinicStaff(companyId, isDemo)

  const [form, setForm] = useState({ name: clinicName, phone: clinicPhone, email: clinicEmail, city: clinicCity })
  const [prefs, setPrefs] = useState({ ai: true, reviews: true, sms: false })
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS)
  const [logoUrl, setLogoUrl] = useState(clinicLogoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const pushToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeSection, setActiveSection] = useState<SectionKey>('business')
  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [staffForm, setStaffForm] = useState({ full_name: '', email: '', role: 'staff' })
  const [invitingStaff, setInvitingStaff] = useState(false)

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [mfaChecking, setMfaChecking] = useState(true)
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false)
  const [mfaEnrolling, setMfaEnrolling] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null)
  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaVerifying, setMfaVerifying] = useState(false)
  const [mfaError, setMfaError] = useState('')

  useEffect(() => {
    if (isDemo) { setMfaChecking(false); return }
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaEnabled(Boolean(data?.totp?.some((f) => f.status === 'verified')))
      setMfaChecking(false)
    })
  }, [isDemo])

  async function startMfaEnrollment() {
    setMfaEnrolling(true)
    setMfaError('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error || !data) {
      pushToast({ kind: 'danger', title: 'تعذّر بدء التفعيل' })
      setMfaEnrolling(false)
      return
    }
    setMfaFactorId(data.id)
    setMfaQrCode(data.totp.qr_code)
    setMfaSecret(data.totp.secret)
    setMfaDialogOpen(true)
    setMfaEnrolling(false)
  }

  async function confirmMfaEnrollment() {
    if (!mfaFactorId || mfaCode.trim().length !== 6) {
      setMfaError('أدخل رمز التحقق المكوّن من 6 أرقام.')
      return
    }
    setMfaVerifying(true)
    setMfaError('')
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
    if (challengeError || !challenge) {
      setMfaError('تعذّر التحقق، حاول مرة أخرى.')
      setMfaVerifying(false)
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode.trim() })
    if (verifyError) {
      setMfaError('رمز التحقق غير صحيح.')
      setMfaVerifying(false)
      return
    }
    setMfaEnabled(true)
    setMfaDialogOpen(false)
    setMfaCode('')
    setMfaVerifying(false)
    pushToast({ kind: 'success', title: 'تم تفعيل التحقق بخطوتين' })
  }

  async function disableMfa() {
    setMfaVerifying(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const totp = data?.totp?.find((f) => f.status === 'verified')
    if (totp) await supabase.auth.mfa.unenroll({ factorId: totp.id })
    setMfaEnabled(false)
    setMfaVerifying(false)
    pushToast({ kind: 'success', title: 'تم إيقاف التحقق بخطوتين' })
  }

  useEffect(() => {
    setForm({ name: clinicName, phone: clinicPhone, email: clinicEmail, city: clinicCity })
    setLogoUrl(clinicLogoUrl)
    const savedHours = clinicSettings?.working_hours as WorkingHours | undefined
    if (savedHours) setHours({ ...DEFAULT_HOURS, ...savedHours })
  }, [clinicName, clinicPhone, clinicEmail, clinicCity, clinicLogoUrl, clinicSettings])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !companyId || isDemo) return
    setUploadingLogo(true)
    try {
      const url = await uploadCompanyLogo(companyId, file)
      setLogoUrl(url)
      pushToast({ kind: 'success', title: 'تم رفع الشعار' })
    } catch (err) {
      pushToast({ kind: 'danger', title: 'تعذّر رفع الشعار', description: err instanceof Error ? err.message : undefined })
    } finally {
      setUploadingLogo(false)
    }
  }

  async function save() {
    if (isDemo || !companyId) {
      pushToast({ kind: 'success', title: 'تم حفظ الإعدادات (عرض تجريبي)' })
      return
    }
    setSaving(true)
    try {
      await updateClinicCompany(companyId, { name: form.name, owner_phone: form.phone, owner_email: form.email, city: form.city })
      await updateClinicWorkingHours(companyId, clinicSettings, hours)
      await refreshAccount()
      pushToast({ kind: 'success', title: 'تم حفظ الإعدادات' })
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر حفظ الإعدادات' })
    } finally {
      setSaving(false)
    }
  }

  async function addStaff() {
    if (!staffForm.full_name.trim() || !staffForm.email.trim() || !companyId) return
    setInvitingStaff(true)
    try {
      if (isDemo) {
        pushToast({ kind: 'success', title: 'تمت الدعوة (عرض تجريبي)' })
      } else {
        await inviteStaffMember({ company_id: companyId, email: staffForm.email, full_name: staffForm.full_name, role: staffForm.role })
        await refetchStaff()
        pushToast({ kind: 'success', title: 'تم إرسال دعوة عبر البريد الإلكتروني' })
      }
      setStaffDialogOpen(false)
      setStaffForm({ full_name: '', email: '', role: 'staff' })
    } catch (err) {
      pushToast({ kind: 'danger', title: 'تعذّرت الدعوة', description: err instanceof Error ? err.message : undefined })
    } finally {
      setInvitingStaff(false)
    }
  }

  async function changeStaffRole(id: string, role: string) {
    if (isDemo) return
    await updateStaffMember(id, { role })
    refetchStaff()
  }

  async function deleteStaff(id: string) {
    if (isDemo) return
    await removeStaffMember(id)
    refetchStaff()
  }

  const Rail = (
    <div className="dv2-settings-rail" style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {SECTIONS.map((s) => {
        const Icon = s.icon
        const active = activeSection === s.key
        return (
          <div
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
              background: active ? 'var(--brand-50)' : 'transparent',
              color: active ? 'var(--brand-700)' : 'var(--text-secondary)',
            }}
          >
            <Icon size={16} /> {s.label}
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الإعدادات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>بيانات عملك، ساعات العمل، والفريق</div>
      </div>

      <div className="dv2-settings-layout" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <style>{`@media (max-width: 800px) { .dv2-settings-layout { flex-direction: column; } .dv2-settings-rail { width: 100% !important; flex-direction: row !important; overflow-x: auto; } }`}</style>
        {Rail}

        <div style={{ flex: 1, minWidth: 0 }}>
      {activeSection === 'business' && (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>بيانات العمل</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 64, height: 64, borderRadius: 'var(--radius-lg)', background: 'var(--slate-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              backgroundImage: logoUrl ? `url(${logoUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
              border: '1px solid var(--border-default)', flexShrink: 0, position: 'relative', overflow: 'hidden',
            }}
          >
            {!logoUrl && <Camera size={22} style={{ color: 'var(--text-tertiary)' }} />}
          </div>
          <div>
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? 'جارِ الرفع...' : 'رفع شعار جديد'}
            </Button>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>PNG أو JPG، مربّع الشكل يفضل</div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="اسم النشاط" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Input label="رقم الجوال" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={{ flex: 1 }} />
            <Input label="البريد الإلكتروني" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <Input label="المدينة" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
        </div>
        <Button onClick={save} disabled={saving} style={{ marginTop: 18 }}>{saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}</Button>
      </Card>
      )}

      {activeSection === 'hours' && (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>ساعات العمل</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DAYS.map((d) => {
            const day = hours[d.key] || DEFAULT_HOURS[d.key]
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 80, fontSize: 13, fontWeight: 600 }}>{d.label}</div>
                <Switch checked={day.open} onChange={(v) => setHours((h) => ({ ...h, [d.key]: { ...day, open: v } }))} />
                {day.open ? (
                  <>
                    <input type="time" value={day.start} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...day, start: e.target.value } }))}
                      style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: 13 }} />
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>إلى</span>
                    <input type="time" value={day.end} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...day, end: e.target.value } }))}
                      style={{ padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)', fontSize: 13 }} />
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>مغلق</span>
                )}
              </div>
            )
          })}
        </div>
        <Button onClick={save} disabled={saving} style={{ marginTop: 18 }}>{saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}</Button>
      </Card>
      )}

      {activeSection === 'team' && (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> الفريق والصلاحيات</div>
          {isOwner && <Button size="sm" variant="secondary" onClick={() => setStaffDialogOpen(true)}><Plus size={14} /> دعوة موظف</Button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(staff || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>لا يوجد فريق مضاف بعد</div>}
          {(staff || []).map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
              <Avatar name={s.full_name} size={32} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.full_name}</div>
              {!s.auth_user_id && <Badge tone="warning">بانتظار القبول</Badge>}
              <Badge tone={ROLE_TONE[s.role] || 'neutral'}>{ROLE_LABEL[s.role] || s.role}</Badge>
              {isOwner ? (
                <>
                  <Select options={ROLE_OPTIONS} value={s.role} onChange={(e) => changeStaffRole(s.id, e.target.value)} style={{ width: 110 }} />
                  <span onClick={() => deleteStaff(s.id)} style={{ cursor: 'pointer', color: 'var(--danger-500)' }}><Trash2 size={15} /></span>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
      )}

      {activeSection === 'security' && (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              {mfaEnabled ? <ShieldCheck size={16} style={{ color: 'var(--success-500)' }} /> : <ShieldOff size={16} style={{ color: 'var(--text-tertiary)' }} />}
              الأمان — التحقق بخطوتين
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4, maxWidth: 400 }}>
              يطلب رمزاً إضافياً من تطبيق مصادقة (Google Authenticator) عند تسجيل الدخول، حتى لو سُرقت كلمة المرور.
            </div>
          </div>
          {!mfaChecking && (
            mfaEnabled ? (
              <Button variant="secondary" size="sm" onClick={disableMfa} disabled={mfaVerifying}>إيقاف</Button>
            ) : (
              <Button size="sm" onClick={startMfaEnrollment} disabled={mfaEnrolling || isDemo}>{mfaEnrolling ? 'جارِ التجهيز...' : 'تفعيل الآن'}</Button>
            )
          )}
        </div>
      </Card>
      )}

      {activeSection === 'ai' && (
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>تفضيلات الذكاء الاصطناعي</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>الرد الآلي على واتساب والمكالمات</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>يتيح للذكاء الاصطناعي حجز المواعيد تلقائياً</div>
            </div>
            <Switch checked={prefs.ai} onChange={(v) => setPrefs((p) => ({ ...p, ai: v }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>الردود الآلية على تقييمات Google</div>
            <Switch checked={prefs.reviews} onChange={(v) => setPrefs((p) => ({ ...p, reviews: v }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>تذكيرات SMS الاحتياطية</div>
            <Switch checked={prefs.sms} onChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
          </div>
        </div>
        <Button onClick={save} disabled={saving} style={{ marginTop: 18 }}>{saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}</Button>
      </Card>
      )}
        </div>
      </div>

      <Dialog
        open={staffDialogOpen} title="دعوة موظف" onClose={() => setStaffDialogOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setStaffDialogOpen(false)}>إلغاء</Button><Button onClick={addStaff} disabled={invitingStaff}>{invitingStaff ? 'جارِ الإرسال...' : 'إرسال الدعوة'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>سيصل للموظف بريد إلكتروني لتعيين كلمة مرور وتسجيل الدخول بحسابه الخاص.</div>
          <Input label="الاسم الكامل" value={staffForm.full_name} onChange={(e) => setStaffForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="البريد الإلكتروني" type="email" value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} />
          <Select label="الصلاحية" options={ROLE_OPTIONS} value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} />
        </div>
      </Dialog>

      <Dialog
        open={mfaDialogOpen} title="تفعيل التحقق بخطوتين" onClose={() => setMfaDialogOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setMfaDialogOpen(false)}>إلغاء</Button><Button onClick={confirmMfaEnrollment} disabled={mfaVerifying}>{mfaVerifying ? 'جارِ التحقق...' : 'تأكيد وتفعيل'}</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            امسح الرمز بتطبيق مصادقة (Google Authenticator، Authy، أو ما شابه) ثم أدخل الرمز المكوّن من 6 أرقام.
          </div>
          {mfaQrCode && (
            <img src={mfaQrCode} alt="QR" style={{ width: 180, height: 180, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
          )}
          {mfaSecret && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', wordBreak: 'break-all' }}>
              أو أدخل هذا الرمز يدوياً: <b style={{ color: 'var(--text-secondary)' }}>{mfaSecret}</b>
            </div>
          )}
          <Input
            label="رمز التحقق" placeholder="000000" value={mfaCode}
            onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError('') }}
            style={{ width: 160, textAlign: 'center' }}
          />
          {mfaError && <div style={{ fontSize: 12, color: 'var(--danger-500)' }}>{mfaError}</div>}
        </div>
      </Dialog>
    </div>
  )
}
