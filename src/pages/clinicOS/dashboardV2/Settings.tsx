import { useEffect, useRef, useState } from 'react'
import { Camera, Plus, Trash2, Users } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  updateClinicCompany, uploadCompanyLogo, updateClinicWorkingHours,
  useClinicStaff, addStaffMember, updateStaffMember, removeStaffMember,
} from '../../../lib/clinicOSQueries'
import { Card, Button, Input, Select, Switch, Toast, Badge, Dialog, type BadgeTone } from '../../../components/clinicOS/v2/primitives'

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
const ROLE_OPTIONS = [{ value: 'staff', label: 'موظف' }, { value: 'manager', label: 'مدير' }, { value: 'owner', label: 'مالك' }]

export function DashboardV2Settings() {
  const {
    companyId, clinicName, clinicPhone, clinicEmail, clinicCity, clinicLogoUrl, clinicSettings,
    isDemo, refreshAccount,
  } = useClinicOS()
  const { data: staff, refetch: refetchStaff } = useClinicStaff(companyId, isDemo)

  const [form, setForm] = useState({ name: clinicName, phone: clinicPhone, email: clinicEmail, city: clinicCity })
  const [prefs, setPrefs] = useState({ ai: true, reviews: true, sms: false })
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS)
  const [logoUrl, setLogoUrl] = useState(clinicLogoUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [staffDialogOpen, setStaffDialogOpen] = useState(false)
  const [staffForm, setStaffForm] = useState({ full_name: '', role: 'staff' })

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
      setToast('تم رفع الشعار')
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'تعذّر رفع الشعار')
    } finally {
      setUploadingLogo(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  async function save() {
    if (isDemo || !companyId) {
      setToast('تم حفظ الإعدادات (عرض تجريبي)')
      setTimeout(() => setToast(null), 2500)
      return
    }
    setSaving(true)
    try {
      await updateClinicCompany(companyId, { name: form.name, owner_phone: form.phone, owner_email: form.email, city: form.city })
      await updateClinicWorkingHours(companyId, clinicSettings, hours)
      await refreshAccount()
      setToast('تم حفظ الإعدادات')
    } catch {
      setToast('تعذّر حفظ الإعدادات')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  async function addStaff() {
    if (!staffForm.full_name.trim() || !companyId) return
    try {
      if (isDemo) {
        setToast('تمت الإضافة (عرض تجريبي)')
      } else {
        await addStaffMember({ company_id: companyId, full_name: staffForm.full_name, role: staffForm.role })
        await refetchStaff()
        setToast('تمت إضافة الموظف')
      }
      setStaffDialogOpen(false)
      setStaffForm({ full_name: '', role: 'staff' })
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'تعذّرت الإضافة')
    } finally {
      setTimeout(() => setToast(null), 2500)
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

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الإعدادات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>بيانات عملك، ساعات العمل، والفريق</div>
      </div>

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
      </Card>

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
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> الفريق والصلاحيات</div>
          <Button size="sm" variant="secondary" onClick={() => setStaffDialogOpen(true)}><Plus size={14} /> إضافة موظف</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(staff || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>لا يوجد فريق مضاف بعد</div>}
          {(staff || []).map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.full_name}</div>
              <Badge tone={ROLE_TONE[s.role] || 'neutral'}>{ROLE_LABEL[s.role] || s.role}</Badge>
              <Select options={ROLE_OPTIONS} value={s.role} onChange={(e) => changeStaffRole(s.id, e.target.value)} style={{ width: 110 }} />
              <span onClick={() => deleteStaff(s.id)} style={{ cursor: 'pointer', color: 'var(--danger-500)' }}><Trash2 size={15} /></span>
            </div>
          ))}
        </div>
      </Card>

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
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}</Button>

      <Dialog
        open={staffDialogOpen} title="إضافة موظف" onClose={() => setStaffDialogOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setStaffDialogOpen(false)}>إلغاء</Button><Button onClick={addStaff}>إضافة</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="الاسم الكامل" value={staffForm.full_name} onChange={(e) => setStaffForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Select label="الصلاحية" options={ROLE_OPTIONS} value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value }))} />
        </div>
      </Dialog>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="success" title={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
