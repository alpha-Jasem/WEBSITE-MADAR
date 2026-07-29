import { useEffect, useState } from 'react'
import { CheckCircle2, MapPin, Wrench, PartyPopper } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicBranches, useClinicServices, createBranch, createService, updateClinicWorkingHours } from '@/lib/clinicOSQueries'
import { Card, Button, Input } from './primitives'

const STEPS = ['الفرع', 'أول خدمة', 'ساعات العمل', 'جاهز'] as const

const DEFAULT_HOURS = Object.fromEntries(
  ['sun', 'mon', 'tue', 'wed', 'thu', 'sat'].map((d) => [d, { open: true, start: '09:00', end: '21:00' }])
    .concat([['fri', { open: false, start: '09:00', end: '21:00' }]]),
)

function dismissKey(companyId: string) { return `dv2_onboarding_dismissed_${companyId}` }

export function OnboardingWizard() {
  const { companyId, isDemo, clinicName, accountLoading } = useClinicOS()
  const { data: branches, refetch: refetchBranches } = useClinicBranches(companyId, isDemo)
  const { data: services, refetch: refetchServices } = useClinicServices(companyId, isDemo)

  const [dismissed, setDismissed] = useState(true)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [branchForm, setBranchForm] = useState({ name: clinicName || '', address: '' })
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '30' })

  useEffect(() => {
    if (!companyId) return
    setDismissed(localStorage.getItem(dismissKey(companyId)) === '1')
  }, [companyId])

  const shouldShow = !isDemo && !accountLoading && !dismissed && companyId
    && (branches || []).length === 0 && (services || []).length === 0

  if (!shouldShow) return null

  async function finish() {
    if (companyId) localStorage.setItem(dismissKey(companyId), '1')
    setDismissed(true)
  }

  async function saveBranch() {
    if (!branchForm.name.trim() || !companyId) return
    setSaving(true)
    try {
      await createBranch({ company_id: companyId, name: branchForm.name, address: branchForm.address })
      await refetchBranches()
      setStep(1)
    } finally { setSaving(false) }
  }

  async function saveService() {
    if (!serviceForm.name.trim() || !companyId) return
    setSaving(true)
    try {
      await createService({
        clinic_id: companyId, name: serviceForm.name, category: 'عام',
        duration_minutes: Number(serviceForm.duration) || 30, buffer_minutes: 0,
        price: Number(serviceForm.price) || 0, active: true, requires_approval: false,
        available_for_ai: true, available_for_whatsapp: true,
      })
      await refetchServices()
      setStep(2)
    } finally { setSaving(false) }
  }

  async function saveHours() {
    if (!companyId) return
    setSaving(true)
    try {
      await updateClinicWorkingHours(companyId, {}, DEFAULT_HOURS)
      setStep(3)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,13,19,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Card style={{ width: 440, maxWidth: '100%' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 'var(--radius-full)', background: i <= step ? 'var(--brand-500)' : 'var(--slate-100)' }} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><MapPin size={20} /></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>أهلاً بك في مدار 👋</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>خلّنا نجهّز حسابك بدقيقة — ابدأ بإضافة فرعك الأول.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              <Input label="اسم الفرع" placeholder="مثال: الفرع الرئيسي" value={branchForm.name} onChange={(e) => setBranchForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="العنوان" placeholder="الحي، المدينة" value={branchForm.address} onChange={(e) => setBranchForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={finish}>تخطي الإعداد</Button>
              <Button onClick={saveBranch} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'التالي'}</Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Wrench size={20} /></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>أضف أول خدمة</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>هذي تظهر بقائمة الحجوزات وتُستخدم لحساب إيراداتك تلقائياً.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              <Input label="اسم الخدمة" placeholder="مثال: كشف عام" value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} />
              <div style={{ display: 'flex', gap: 12 }}>
                <Input label="السعر (ر.س)" type="number" value={serviceForm.price} onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))} style={{ flex: 1 }} />
                <Input label="المدة (دقيقة)" type="number" value={serviceForm.duration} onChange={(e) => setServiceForm((f) => ({ ...f, duration: e.target.value }))} style={{ flex: 1 }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={() => setStep(2)}>تخطي</Button>
              <Button onClick={saveService} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'التالي'}</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><CheckCircle2 size={20} /></div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>ساعات العمل</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>نقدر نبدأ بساعات افتراضية (9ص - 9م، الجمعة مغلقة) وتقدر تعدّلها لاحقاً من الإعدادات.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="secondary" onClick={() => setStep(3)}>تخطي</Button>
              <Button onClick={saveHours} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'استخدام الافتراضي'}</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-full)', background: 'var(--success-100)', color: 'var(--success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><PartyPopper size={24} /></div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>جاهز! 🎉</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>حسابك جاهز الآن. تقدر تضيف بقية خدماتك وفروعك في أي وقت من القائمة الجانبية.</div>
            <Button onClick={finish}>ابدأ استخدام مدار</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
