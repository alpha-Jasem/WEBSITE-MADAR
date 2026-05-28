import { useEffect, useState } from 'react'
import { Car, Clock, Star, Plus, Trash2, Check, Loader2, MapPin, Save, Receipt } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { logAudit } from '../../../lib/auditLog'
import type { CWService } from '../../../types'

type WorkingHours = { open: string; close: string; closed: boolean }
type DayHours = Record<string, WorkingHours>

const DAYS = [
  { key: 'saturday',  label: 'السبت'    },
  { key: 'sunday',    label: 'الأحد'    },
  { key: 'monday',    label: 'الاثنين'  },
  { key: 'tuesday',   label: 'الثلاثاء' },
  { key: 'wednesday', label: 'الأربعاء' },
  { key: 'thursday',  label: 'الخميس'  },
  { key: 'friday',    label: 'الجمعة'  },
]

const DEFAULT_HOURS: DayHours = Object.fromEntries(
  DAYS.map(d => [d.key, { open: '08:00', close: '22:00', closed: d.key === 'friday' }])
)


const SECTION_STYLE = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 18,
  padding: '22px 24px',
}

export function CarWashSetup() {
  const { companyId, company, loading: authLoading } = useClientCompany()

  const [tab, setTab] = useState<'services' | 'hours' | 'loyalty' | 'vat'>('services')

  // Services (table-based)
  const [services, setServices] = useState<CWService[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [savingServices, setSavingServices] = useState(false)
  const [servicesSaved, setServicesSaved] = useState(false)

  // Hours
  const [hours, setHours] = useState<DayHours>(DEFAULT_HOURS)
  const [savingHours, setSavingHours] = useState(false)
  const [hoursSaved, setHoursSaved] = useState(false)

  // Loyalty
  const [loyaltyThreshold, setLoyaltyThreshold] = useState(5)
  const [reviewUrl, setReviewUrl] = useState('')
  const [savingLoyalty, setSavingLoyalty] = useState(false)
  const [loyaltySaved, setLoyaltySaved] = useState(false)

  // VAT
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [vatRate, setVatRate] = useState(15)
  const [priceIncludesVat, setPriceIncludesVat] = useState(false)
  const [savingVat, setSavingVat] = useState(false)
  const [vatSaved, setVatSaved] = useState(false)

  // Monthly target
  const [monthlyTarget, setMonthlyTarget] = useState(0)


  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)

      const [{ data: svcData }, { data: co }] = await Promise.all([
        supabase.from('cw_services').select('*').eq('company_id', companyId).order('created_at'),
        supabase.from('companies')
          .select('cw_hours, cw_loyalty_threshold, google_maps_url, tax_enabled, vat_rate, price_includes_vat, cw_message_templates, cw_monthly_target')
          .eq('id', companyId).single(),
      ])

      if (svcData) setServices(svcData as CWService[])

      if (co) {
        const c = co as any
        if (c.cw_hours) setHours(c.cw_hours)
        if (c.cw_loyalty_threshold) setLoyaltyThreshold(c.cw_loyalty_threshold)
        if (c.google_maps_url) setReviewUrl(c.google_maps_url)
        setTaxEnabled(!!c.tax_enabled)
        if (c.vat_rate) setVatRate(c.vat_rate)
        setPriceIncludesVat(!!c.price_includes_vat)
        if (c.cw_monthly_target) setMonthlyTarget(c.cw_monthly_target)
      }
      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  // Services: save all (INSERT new, UPDATE existing, DELETE removed)
  const saveServices = async () => {
    if (!companyId) return
    setSavingServices(true)

    const toInsert = services.filter(s => !s.id || s.id === '')
    const toUpdate = services.filter(s => s.id && s.id !== '')

    await Promise.all([
      ...toInsert.map(s => supabase.from('cw_services').insert({ company_id: companyId, name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active })),
      ...toUpdate.map(s => supabase.from('cw_services').update({ name: s.name, price: s.price, duration_minutes: s.duration_minutes, active: s.active }).eq('id', s.id)),
      ...removedIds.map(id => supabase.from('cw_services').delete().eq('id', id)),
    ])

    setRemovedIds([])
    // Reload services to get fresh IDs
    const { data } = await supabase.from('cw_services').select('*').eq('company_id', companyId).order('created_at')
    if (data) setServices(data as CWService[])

    logAudit(companyId, 'service_updated')
    setSavingServices(false)
    setServicesSaved(true)
    setTimeout(() => setServicesSaved(false), 3000)
  }

  const addService = () => setServices(prev => [...prev, { id: '', company_id: companyId ?? '', name: '', price: 0, duration_minutes: 20, active: true, created_at: '' }])

  const removeService = (i: number) => {
    const svc = services[i]
    if (svc.id) setRemovedIds(prev => [...prev, svc.id])
    setServices(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateService = (i: number, field: keyof CWService, val: string | number | boolean) =>
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const saveHours = async () => {
    if (!companyId) return
    setSavingHours(true)
    await supabase.from('companies').update({ cw_hours: hours } as any).eq('id', companyId)
    setSavingHours(false)
    setHoursSaved(true)
    setTimeout(() => setHoursSaved(false), 3000)
  }

  const saveLoyalty = async () => {
    if (!companyId) return
    setSavingLoyalty(true)
    await supabase.from('companies').update({ cw_loyalty_threshold: loyaltyThreshold, google_maps_url: reviewUrl, cw_monthly_target: monthlyTarget } as any).eq('id', companyId)
    setSavingLoyalty(false)
    setLoyaltySaved(true)
    setTimeout(() => setLoyaltySaved(false), 3000)
  }

  const saveVat = async () => {
    if (!companyId) return
    setSavingVat(true)
    await supabase.from('companies').update({ tax_enabled: taxEnabled, vat_rate: vatRate, price_includes_vat: priceIncludesVat } as any).eq('id', companyId)
    logAudit(companyId, 'tax_settings_changed', { newValue: { tax_enabled: taxEnabled, vat_rate: vatRate, price_includes_vat: priceIncludesVat } })
    setSavingVat(false)
    setVatSaved(true)
    setTimeout(() => setVatSaved(false), 3000)
  }

  const TABS = [
    { key: 'services', label: 'الخدمات',     icon: Car     },
    { key: 'hours',    label: 'أوقات العمل', icon: Clock   },
    { key: 'loyalty',  label: 'الولاء',       icon: Star    },
    { key: 'vat',      label: 'الضريبة',      icon: Receipt },
  ] as const

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
      <Loader2 size={18} className="animate-spin" color="#22D3EE" />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري التحميل...</span>
    </div>
  )

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إعداد المغسلة</h1>
        <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>الخدمات، أوقات العمل، الولاء، والضريبة</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, minWidth: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(34,211,238,0.12)' : 'transparent',
                color: active ? '#22D3EE' : '#475569',
                fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
              }}>
              <t.icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Services Tab */}
      {tab === 'services' && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>الخدمات والأسعار</span>
            </div>
            <button onClick={addService}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(34,211,238,0.25)', background: 'rgba(34,211,238,0.08)', color: '#22D3EE', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
              <Plus size={13} /> إضافة خدمة
            </button>
          </div>

          {services.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13, padding: '20px 0' }}>لا توجد خدمات — أضف خدمتك الأولى</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 60px 32px', gap: 10, padding: '0 4px' }}>
                {['اسم الخدمة', 'السعر (ر.س)', 'الوقت (دقيقة)', 'مفعّل', ''].map(h => (
                  <span key={h} style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
              {services.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 60px 32px', gap: 10, alignItems: 'center' }}>
                  <input value={s.name} onChange={e => updateService(i, 'name', e.target.value)}
                    placeholder="اسم الخدمة"
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input type="number" value={s.price} onChange={e => updateService(i, 'price', Number(e.target.value))}
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <input type="number" value={s.duration_minutes} onChange={e => updateService(i, 'duration_minutes', Number(e.target.value))}
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => updateService(i, 'active', !s.active)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: s.active ? 'rgba(16,185,129,0.15)' : '#FFFFFF', color: s.active ? '#10B981' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={13} />
                    </button>
                  </div>
                  <button onClick={() => removeService(i)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={saveServices} disabled={savingServices}
            style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: servicesSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', color: servicesSaved ? '#10B981' : '#22D3EE', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {savingServices ? <Loader2 size={14} className="animate-spin" /> : servicesSaved ? <Check size={14} /> : <Save size={14} />}
            {servicesSaved ? 'تم الحفظ ✓' : 'حفظ الخدمات'}
          </button>
        </div>
      )}

      {/* Hours Tab */}
      {tab === 'hours' && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Clock size={15} color="#8B5CF6" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>أوقات العمل</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map(d => {
              const h = hours[d.key] || { open: '08:00', close: '22:00', closed: false }
              return (
                <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px', gap: 12, alignItems: 'center', padding: '10px 14px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #E2E8F0', opacity: h.closed ? 0.5 : 1 }}>
                  <span style={{ fontSize: 13, color: '#1E293B', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{d.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>فتح</span>
                    <input type="time" value={h.open} disabled={h.closed}
                      onChange={e => setHours(prev => ({ ...prev, [d.key]: { ...prev[d.key], open: e.target.value } }))}
                      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', color: '#1E293B', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>غلق</span>
                    <input type="time" value={h.close} disabled={h.closed}
                      onChange={e => setHours(prev => ({ ...prev, [d.key]: { ...prev[d.key], close: e.target.value } }))}
                      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 10px', color: '#1E293B', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none' }} />
                  </div>
                  <button onClick={() => setHours(prev => ({ ...prev, [d.key]: { ...prev[d.key], closed: !h.closed } }))}
                    style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'Cairo, sans-serif', background: h.closed ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)', color: h.closed ? '#EF4444' : '#10B981' }}>
                    {h.closed ? 'مغلق' : 'مفتوح'}
                  </button>
                </div>
              )
            })}
          </div>
          <button onClick={saveHours} disabled={savingHours}
            style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: hoursSaved ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.12)', color: hoursSaved ? '#10B981' : '#8B5CF6', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {savingHours ? <Loader2 size={14} className="animate-spin" /> : hoursSaved ? <Check size={14} /> : <Save size={14} />}
            {hoursSaved ? 'تم الحفظ ✓' : 'حفظ أوقات العمل'}
          </button>
        </div>
      )}

      {/* Loyalty Tab */}
      {tab === 'loyalty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={SECTION_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Star size={15} color="#F59E0B" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>برنامج الولاء (5+1 مجاناً)</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>
                  عدد الغسلات المدفوعة للحصول على الغسلة المجانية
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="number" min={2} max={20} value={loyaltyThreshold}
                    onChange={e => setLoyaltyThreshold(Number(e.target.value))}
                    style={{ width: 80, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '8px 12px', color: '#0F172A', fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
                    كل <strong style={{ color: '#F59E0B' }}>{loyaltyThreshold}</strong> غسلات مدفوعة = الغسلة <strong style={{ color: '#10B981' }}>التالية مجانية</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {Array.from({ length: loyaltyThreshold + 1 }, (_, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === loyaltyThreshold ? 'rgba(245,158,11,0.15)' : 'rgba(34,211,238,0.1)', border: `1px solid ${i === loyaltyThreshold ? 'rgba(245,158,11,0.4)' : 'rgba(34,211,238,0.25)'}` }}>
                    {i === loyaltyThreshold ? <Star size={14} color="#F59E0B" fill="#F59E0B" /> : <Car size={12} color="#22D3EE" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={SECTION_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MapPin size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>رابط Google Maps للتقييم</span>
            </div>
            <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 12 }}>
              سيُرسل هذا الرابط للعملاء بعد الزيارة لطلب التقييم على Google.
            </p>
            <input value={reviewUrl} onChange={e => setReviewUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..." dir="ltr"
              style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px', color: '#1E293B', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={SECTION_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 15 }}>🎯</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>هدف الإيراد الشهري</span>
            </div>
            <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 14 }}>
              حدّد الهدف الشهري لإيرادات المغسلة — سيظهر شريط التقدم في لوحة التشغيل.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={0}
                value={monthlyTarget}
                onChange={e => setMonthlyTarget(Number(e.target.value))}
                placeholder="5000"
                dir="ltr"
                style={{ width: 140, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 14px', color: '#0F172A', fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>ريال سعودي / الشهر</span>
            </div>
          </div>
          <button onClick={saveLoyalty} disabled={savingLoyalty}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: loyaltySaved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)', color: loyaltySaved ? '#10B981' : '#F59E0B', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {savingLoyalty ? <Loader2 size={14} className="animate-spin" /> : loyaltySaved ? <Check size={14} /> : <Save size={14} />}
            {loyaltySaved ? 'تم الحفظ ✓' : 'حفظ إعدادات الولاء'}
          </button>
        </div>
      )}

      {/* VAT Tab */}
      {tab === 'vat' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={SECTION_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Receipt size={15} color="#6366F1" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>إعدادات ضريبة القيمة المضافة (VAT)</span>
            </div>

            {/* Enable/Disable toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#FAFAFA', borderRadius: 14, border: '1px solid #E2E8F0', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 14, color: '#0F172A', fontFamily: 'Cairo, sans-serif', fontWeight: 600, margin: 0 }}>تفعيل الضريبة</p>
                <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: '4px 0 0' }}>هل مغسلتك مسجّلة في هيئة الزكاة والضريبة؟</p>
              </div>
              <button
                onClick={() => setTaxEnabled(v => !v)}
                style={{ width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: taxEnabled ? '#6366F1' : '#E2E8F0', position: 'relative', transition: 'background 0.2s' }}>
                <span style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s, left 0.2s', right: taxEnabled ? 3 : 'auto', left: taxEnabled ? 'auto' : 3 }} />
              </button>
            </div>

            {taxEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* VAT Rate */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>نسبة الضريبة %</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" value={vatRate} min={0} max={100}
                      onChange={e => setVatRate(Number(e.target.value))}
                      style={{ width: 80, background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '8px 12px', color: '#0F172A', fontSize: 20, fontFamily: 'Sora, sans-serif', fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                    <span style={{ fontSize: 18, color: '#6366F1', fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>%</span>
                    <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>الضريبة المعتمدة في المملكة 15%</p>
                  </div>
                </div>

                {/* Price includes VAT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#FAFAFA', borderRadius: 14, border: '1px solid #E2E8F0' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#0F172A', fontFamily: 'Cairo, sans-serif', fontWeight: 600, margin: 0 }}>الأسعار تشمل الضريبة</p>
                    <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: '4px 0 0' }}>
                      {priceIncludesVat
                        ? `مثال: سعر 115 ر.س = ${(115 / 1.15).toFixed(2)} ر.س + ${(115 - 115/1.15).toFixed(2)} ر.س ضريبة`
                        : `مثال: سعر 100 ر.س + ${vatRate}% = ${(100 * (1 + vatRate/100)).toFixed(2)} ر.س للعميل`}
                    </p>
                  </div>
                  <button
                    onClick={() => setPriceIncludesVat(v => !v)}
                    style={{ width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: priceIncludesVat ? '#6366F1' : '#E2E8F0', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s, left 0.2s', right: priceIncludesVat ? 3 : 'auto', left: priceIncludesVat ? 'auto' : 3 }} />
                  </button>
                </div>

                {/* Summary */}
                <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.08)', borderRadius: 14, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: '#A5B4FC', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.8 }}>
                    ✓ ستظهر الضريبة في الإيصالات والتقارير<br/>
                    ✓ صافي الربح يُحسب على المبلغ قبل الضريبة<br/>
                    ✓ يمكنك تغيير الإعداد في أي وقت
                  </p>
                </div>
              </div>
            )}
          </div>

          <button onClick={saveVat} disabled={savingVat}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: vatSaved ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: vatSaved ? '#10B981' : '#6366F1', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {savingVat ? <Loader2 size={14} className="animate-spin" /> : vatSaved ? <Check size={14} /> : <Save size={14} />}
            {vatSaved ? 'تم الحفظ ✓' : 'حفظ إعدادات الضريبة'}
          </button>
        </div>
      )}

    </div>
  )
}
