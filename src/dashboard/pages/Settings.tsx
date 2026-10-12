import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus, Trash2, Users, ShieldCheck, ShieldOff, Sparkles as SparklesIcon, Plug, History, Check, ChevronLeft } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import {
  updateCompany, uploadCompanyLogo, updateWorkingHours,
  useCompanyStaff, inviteStaffMember, updateStaffMember, removeStaffMember, useIntegrations,
} from '@/lib/dashboardQueries'
import { CLINIC_PLANS, getUsageMetrics, usagePercentage } from '@/lib/clinicOSProduct'
import { isIntegrationVisible } from '@/dashboard/modules'
import { Card, Button, Input, Select, Badge, Dialog, type BadgeTone } from '@/dashboard/components/primitives'
import { useToast, Avatar } from '@/dashboard/components/uiExtras'
import { TagManager } from './conversations/TagManager'
import { NightPage, PageHead, CardTitle, Meter, Toggle, Chip, EmptyLine, fmtNum } from './shared/night'

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

const SETTINGS_CSS = `
.st-logo { width: 64px; height: 64px; border-radius: var(--radius-lg); background-color: var(--panel-2); background-size: cover; background-position: center;
  border: 1px solid var(--line-2); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; padding: 0; overflow: hidden; }
.st-hour-row { display: grid; grid-template-columns: 90px auto minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
.st-hour-row:last-child { border-bottom: 0; }
.st-hour-row b { font-weight: 600; font-size: 13.5px; color: var(--text-primary); }
.st-time { width: 100%; min-width: 0; box-sizing: border-box; padding: 6px 10px; border-radius: var(--radius-md); border: 1px solid var(--border-strong); font-size: 13px; font-variant-numeric: tabular-nums; }
.st-icon-btn { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 0; background: var(--bad-bg); color: var(--bad); cursor: pointer; padding: 0; flex: none; }
@media (max-width: 900px) {
  .st-time { min-height: 40px; }
  .st-icon-btn { width: 40px; height: 40px; }
}
@media (max-width: 520px) {
  .st-hour-row { grid-template-columns: 62px auto minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
  .st-time { padding: 6px; font-size: 12.5px; }
}
`

export function DashboardV2Settings() {
  const {
    companyId, companyName, companyPhone, companyEmail, companyCity, companyLogoUrl, companySettings,
    isDemo, isOwner, refreshAccount, hasModule, packageType, isSubscribed, usageMetrics, usageCycleStart, usageCycleEnd,
  } = useWorkspace()
  const { data: staff, refetch: refetchStaff } = useCompanyStaff(companyId, isDemo)
  const { data: rawIntegrations } = useIntegrations(companyId, isDemo)
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'

  const [form, setForm] = useState({ name: companyName, phone: companyPhone, email: companyEmail, city: companyCity })
  const [prefs, setPrefs] = useState({ ai: true, reviews: true, sms: false })
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS)
  const [logoUrl, setLogoUrl] = useState(companyLogoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const pushToast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setForm({ name: companyName, phone: companyPhone, email: companyEmail, city: companyCity })
    setLogoUrl(companyLogoUrl)
    const savedHours = companySettings?.working_hours as WorkingHours | undefined
    if (savedHours) setHours({ ...DEFAULT_HOURS, ...savedHours })
  }, [companyName, companyPhone, companyEmail, companyCity, companyLogoUrl, companySettings])

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
      await updateCompany(companyId, { name: form.name, owner_phone: form.phone, owner_email: form.email, city: form.city })
      await updateWorkingHours(companyId, companySettings, hours)
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

  const planName = isSubscribed ? CLINIC_PLANS[packageType]?.name ?? packageType : 'Free'
  const metrics = (isDemo ? getUsageMetrics(packageType) : usageMetrics).filter((m) => m.limit > 0 || m.used > 0)
  const integrations = (rawIntegrations || []).filter((i) => isIntegrationVisible(i.provider, hasModule))

  return (
    <NightPage>
      <style>{SETTINGS_CSS}</style>
      <PageHead
        title="الإعدادات"
        sub={companyName || 'بيانات عملك، ساعات العمل، والفريق'}
        actions={<Button onClick={save} disabled={saving}><Check size={15} /> {saving ? 'جارِ الحفظ...' : 'حفظ'}</Button>}
      />

      <div className="np-grid-2">
        <Card>
          <CardTitle>بيانات المنشأة</CardTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <button
              type="button" aria-label="تغيير الشعار" className="st-logo"
              onClick={() => fileInputRef.current?.click()}
              style={{ backgroundImage: logoUrl ? `url(${logoUrl})` : undefined }}
            >
              {!logoUrl && <Camera size={22} style={{ color: 'var(--text-tertiary)' }} />}
            </button>
            <div style={{ minWidth: 0 }}>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? 'جارِ الرفع...' : 'رفع شعار جديد'}
              </Button>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>PNG أو JPG، مربّع الشكل يفضل</div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
          </div>
          <div className="np-form-grid">
            <Input label="اسم المنشأة" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="المدينة" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="رقم الجوال" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </Card>

        <Card>
          <CardTitle aside={<Chip tone={isSubscribed ? 'ok' : 'muted'}>{isSubscribed ? 'مفعّلة' : 'غير مفعّلة'}</Chip>}>الباقة والاستهلاك</CardTitle>
          <div className="np-usage-row" style={{ marginBottom: 12 }}><span>الباقة</span><b>{planName}</b></div>
          {usageCycleStart && usageCycleEnd && (
            <div className="np-usage-row" style={{ marginBottom: 12 }}><span>دورة الاستخدام</span><b className="np-num">{usageCycleStart} - {usageCycleEnd}</b></div>
          )}
          {metrics.length === 0 && <EmptyLine>تظهر حدود الاستهلاك فور تفعيل الاشتراك</EmptyLine>}
          {metrics.map((m) => {
            const p = usagePercentage(m)
            return (
              <Meter
                key={m.key} label={m.label} value={p}
                display={<span dir="ltr">{fmtNum(m.used)} / {m.limit ? fmtNum(m.limit) : '—'}</span>}
                color={p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : undefined}
              />
            )
          })}
          <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/plan-usage`)}>تفاصيل الاستهلاك <ChevronLeft size={14} /></Button>
        </Card>
      </div>

      <Card>
        <CardTitle aside="يستخدمها الوكيل الذكي عند الرد على العملاء">ساعات العمل</CardTitle>
        <div>
          {DAYS.map((d) => {
            const day = hours[d.key] || DEFAULT_HOURS[d.key]
            return (
              <div key={d.key} className="st-hour-row">
                <b>{d.label}</b>
                <Toggle checked={day.open} label={d.label} onChange={(v) => setHours((h) => ({ ...h, [d.key]: { ...day, open: v } }))} />
                {day.open ? (
                  <>
                    <input type="time" aria-label={`${d.label} من`} className="st-time" value={day.start} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...day, start: e.target.value } }))} />
                    <input type="time" aria-label={`${d.label} إلى`} className="st-time" value={day.end} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...day, end: e.target.value } }))} />
                  </>
                ) : (
                  <span style={{ color: 'var(--dim)', gridColumn: 'span 2', fontSize: 13 }}>مغلق</span>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <div className="np-grid-2 even">
        <Card>
          <CardTitle aside={`${fmtNum((staff || []).length)} عضو`}><Users size={16} style={{ color: 'var(--sky)' }} /> الفريق والصلاحيات</CardTitle>
          {(staff || []).length === 0 && <EmptyLine>لا يوجد فريق مضاف بعد</EmptyLine>}
          {(staff || []).map((s) => (
            <div key={s.id} className="np-row" style={{ flexWrap: 'wrap' }}>
              <Avatar name={s.full_name || ''} size={34} />
              <div className="np-row-main"><b>{s.full_name}</b></div>
              {!s.auth_user_id && <Badge tone="warning">بانتظار القبول</Badge>}
              <Badge tone={ROLE_TONE[s.role] || 'neutral'}>{ROLE_LABEL[s.role] || s.role}</Badge>
              {isOwner && (
                <>
                  <Select options={ROLE_OPTIONS} value={s.role} onChange={(e) => changeStaffRole(s.id, e.target.value)} style={{ width: 110 }} />
                  <button type="button" className="st-icon-btn" aria-label={`حذف ${s.full_name}`} onClick={() => deleteStaff(s.id)}><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
          {isOwner && <Button variant="secondary" size="sm" onClick={() => setStaffDialogOpen(true)} style={{ marginTop: 12 }}><Plus size={14} /> دعوة عضو</Button>}
        </Card>

        <Card>
          <CardTitle><SparklesIcon size={16} style={{ color: 'var(--ai)' }} /> التنبيهات والتفضيلات</CardTitle>
          <div className="np-row">
            <div className="np-row-main"><b>الرد الآلي على واتساب والمكالمات</b><small>{hasModule('bookings') ? 'يتيح للوكيل الذكي حجز المواعيد تلقائياً' : 'يتيح للوكيل الذكي الرد على العملاء تلقائياً'}</small></div>
            <Toggle checked={prefs.ai} label="الرد الآلي" onChange={(v) => setPrefs((p) => ({ ...p, ai: v }))} />
          </div>
          {hasModule('reviews') && (
            <div className="np-row">
              <div className="np-row-main"><b>الردود الآلية على تقييمات Google</b></div>
              <Toggle checked={prefs.reviews} label="الردود الآلية على التقييمات" onChange={(v) => setPrefs((p) => ({ ...p, reviews: v }))} />
            </div>
          )}
          {hasModule('reminders') && (
            <div className="np-row">
              <div className="np-row-main"><b>تذكيرات SMS الاحتياطية</b></div>
              <Toggle checked={prefs.sms} label="تذكيرات SMS" onChange={(v) => setPrefs((p) => ({ ...p, sms: v }))} />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle aside="الوكيل يوسم المحادثات تلقائيًا">وسوم المحادثات</CardTitle>
        <TagManager />
      </Card>

      <div className="np-grid-2 even">
        <Card>
          <CardTitle aside={<button type="button" className="np-link" onClick={() => navigate(`${base}/integrations`)}>كل التكاملات <ChevronLeft size={13} /></button>}><Plug size={16} style={{ color: 'var(--sky)' }} /> الربط</CardTitle>
          {integrations.length === 0 && <EmptyLine>جارِ تجهيز التكاملات...</EmptyLine>}
          {integrations.map((i) => {
            const ok = i.status === 'connected'
            return (
              <div key={i.id} className="np-row">
                <div className="np-row-main"><b>{i.name}</b></div>
                <Chip tone={ok ? 'ok' : 'muted'}>{ok ? 'متصل' : 'غير متصل'}</Chip>
                <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/integrations`)}>{ok ? 'إدارة' : 'ربط'}</Button>
              </div>
            )
          })}
        </Card>

        <Card>
          <CardTitle>{mfaEnabled ? <ShieldCheck size={16} style={{ color: 'var(--ok)' }} /> : <ShieldOff size={16} style={{ color: 'var(--text-tertiary)' }} />} الأمان</CardTitle>
          <div className="np-row" style={{ flexWrap: 'wrap' }}>
            <div className="np-row-main" style={{ minWidth: 200 }}>
              <b>التحقق بخطوتين</b>
              <small>يطلب رمزاً إضافياً من تطبيق مصادقة (Google Authenticator) عند تسجيل الدخول، حتى لو سُرقت كلمة المرور.</small>
            </div>
            {!mfaChecking && (
              mfaEnabled ? (
                <Button variant="secondary" size="sm" onClick={disableMfa} disabled={mfaVerifying}>إيقاف</Button>
              ) : (
                <Button size="sm" onClick={startMfaEnrollment} disabled={mfaEnrolling || isDemo}>{mfaEnrolling ? 'جارِ التجهيز...' : 'تفعيل الآن'}</Button>
              )
            )}
          </div>
          <div className="np-row">
            <History size={16} style={{ color: 'var(--sky)', flexShrink: 0 }} />
            <div className="np-row-main"><b>سجل التدقيق</b><small>كل عملية مهمة على حسابك، من سواها ومتى</small></div>
            <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/audit-log`)}>عرض</Button>
          </div>
        </Card>
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
    </NightPage>
  )
}
