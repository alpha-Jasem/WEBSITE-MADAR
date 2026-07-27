import { useEffect, useState } from 'react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { updateClinicCompany } from '../../../lib/clinicOSQueries'
import { Card, Button, Input, Switch, Toast } from '../../../components/clinicOS/v2/primitives'

export function DashboardV2Settings() {
  const { companyId, clinicName, clinicPhone, clinicEmail, clinicCity, isDemo, refreshAccount } = useClinicOS()
  const [form, setForm] = useState({ name: clinicName, phone: clinicPhone, email: clinicEmail, city: clinicCity })
  const [prefs, setPrefs] = useState({ ai: true, reviews: true, sms: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setForm({ name: clinicName, phone: clinicPhone, email: clinicEmail, city: clinicCity })
  }, [clinicName, clinicPhone, clinicEmail, clinicCity])

  async function save() {
    if (isDemo || !companyId) {
      setToast('تم حفظ الإعدادات (عرض تجريبي)')
      setTimeout(() => setToast(null), 2500)
      return
    }
    setSaving(true)
    try {
      await updateClinicCompany(companyId, { name: form.name, owner_phone: form.phone, owner_email: form.email, city: form.city })
      await refreshAccount()
      setToast('تم حفظ الإعدادات')
    } catch {
      setToast('تعذّر حفظ الإعدادات')
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>الإعدادات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>بيانات عملك وتفضيلات الذكاء الاصطناعي</div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>بيانات العمل</div>
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

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="success" title={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
