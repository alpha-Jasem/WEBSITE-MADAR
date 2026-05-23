import { useEffect, useState } from 'react'
import { Car, Clock, Star, Plus, Trash2, Check, Loader2, MapPin, Save } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

type Service = {
  id?: string
  name: string
  price: number
  duration_minutes: number
  active: boolean
}

type WorkingHours = {
  open: string
  close: string
  closed: boolean
}

type DayHours = Record<string, WorkingHours>

const DEFAULT_SERVICES: Service[] = [
  { name: 'غسيل عادي', price: 25, duration_minutes: 20, active: true },
  { name: 'غسيل بريميوم', price: 45, duration_minutes: 35, active: true },
  { name: 'غسيل داخلي وخارجي', price: 70, duration_minutes: 60, active: true },
  { name: 'تلميع', price: 120, duration_minutes: 90, active: true },
  { name: 'غسيل محرك', price: 50, duration_minutes: 45, active: false },
]

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
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18,
  padding: '22px 24px',
}

export function CarWashSetup() {
  const { companyId, loading: authLoading } = useClientCompany()

  const [tab, setTab] = useState<'services' | 'hours' | 'loyalty'>('services')

  // Services
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES)
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

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)
      const { data: company } = await supabase
        .from('companies')
        .select('cw_services, cw_hours, cw_loyalty_threshold, google_maps_url')
        .eq('id', companyId)
        .single()

      if (company) {
        const c = company as any
        if (c.cw_services) setServices(c.cw_services)
        if (c.cw_hours) setHours(c.cw_hours)
        if (c.cw_loyalty_threshold) setLoyaltyThreshold(c.cw_loyalty_threshold)
        if (c.google_maps_url) setReviewUrl(c.google_maps_url)
      }

      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  const saveServices = async () => {
    if (!companyId) return
    setSavingServices(true)
    await supabase.from('companies').update({ cw_services: services } as any).eq('id', companyId)
    setSavingServices(false)
    setServicesSaved(true)
    setTimeout(() => setServicesSaved(false), 3000)
  }

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
    await supabase.from('companies').update({ cw_loyalty_threshold: loyaltyThreshold, google_maps_url: reviewUrl } as any).eq('id', companyId)
    setSavingLoyalty(false)
    setLoyaltySaved(true)
    setTimeout(() => setLoyaltySaved(false), 3000)
  }

  const addService = () => setServices(prev => [...prev, { name: '', price: 0, duration_minutes: 20, active: true }])
  const removeService = (i: number) => setServices(prev => prev.filter((_, idx) => idx !== i))
  const updateService = (i: number, field: keyof Service, val: string | number | boolean) =>
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s))

  const TABS = [
    { key: 'services', label: 'الخدمات والأسعار', icon: Car },
    { key: 'hours',    label: 'أوقات العمل',      icon: Clock },
    { key: 'loyalty',  label: 'الولاء والتقييم',   icon: Star },
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
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إعداد المغسلة</h1>
        <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>أضف خدماتك وأوقات عملك وإعدادات الولاء</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 6 }}>
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(34,211,238,0.12)' : 'transparent',
                color: active ? '#22D3EE' : '#475569',
                fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: active ? 700 : 500,
                transition: 'all 0.15s',
              }}>
              <t.icon size={14} />
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
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>الخدمات والأسعار</span>
            </div>
            <button onClick={addService}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(34,211,238,0.25)', background: 'rgba(34,211,238,0.08)', color: '#22D3EE', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
              <Plus size={13} /> إضافة خدمة
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 60px 32px', gap: 10, padding: '0 4px' }}>
              {['اسم الخدمة', 'السعر (ر.س)', 'الوقت (دقيقة)', 'مفعّل', ''].map(h => (
                <span key={h} style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{h}</span>
              ))}
            </div>

            {services.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 60px 32px', gap: 10, alignItems: 'center' }}>
                <input value={s.name} onChange={e => updateService(i, 'name', e.target.value)}
                  placeholder="اسم الخدمة"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', color: '#E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                <input type="number" value={s.price} onChange={e => updateService(i, 'price', Number(e.target.value))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', color: '#E2E8F0', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                <input type="number" value={s.duration_minutes} onChange={e => updateService(i, 'duration_minutes', Number(e.target.value))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', color: '#E2E8F0', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => updateService(i, 'active', !s.active)}
                    style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: s.active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)', color: s.active ? '#10B981' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>أوقات العمل</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS.map(d => {
              const h = hours[d.key] || { open: '08:00', close: '22:00', closed: false }
              return (
                <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 80px', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', opacity: h.closed ? 0.5 : 1 }}>
                  <span style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{d.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>فتح</span>
                    <input type="time" value={h.open} disabled={h.closed}
                      onChange={e => setHours(prev => ({ ...prev, [d.key]: { ...prev[d.key], open: e.target.value } }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', color: '#E2E8F0', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>غلق</span>
                    <input type="time" value={h.close} disabled={h.closed}
                      onChange={e => setHours(prev => ({ ...prev, [d.key]: { ...prev[d.key], close: e.target.value } }))}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', color: '#E2E8F0', fontSize: 12, fontFamily: 'Sora, sans-serif', outline: 'none' }} />
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
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>برنامج الولاء</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>
                  عدد الزيارات للحصول على الغسيل المجاني
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="number" min={2} max={20} value={loyaltyThreshold}
                    onChange={e => setLoyaltyThreshold(Number(e.target.value))}
                    style={{ width: 80, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#F1F5F9', fontSize: 18, fontFamily: 'Sora, sans-serif', fontWeight: 700, outline: 'none', textAlign: 'center' }} />
                  <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
                    كل <strong style={{ color: '#F59E0B' }}>{loyaltyThreshold - 1}</strong> زيارات والـ<strong style={{ color: '#10B981' }}>{loyaltyThreshold}</strong> مجانية
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {Array.from({ length: loyaltyThreshold }, (_, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === loyaltyThreshold - 1 ? 'rgba(245,158,11,0.15)' : 'rgba(34,211,238,0.1)', border: `1px solid ${i === loyaltyThreshold - 1 ? 'rgba(245,158,11,0.4)' : 'rgba(34,211,238,0.25)'}` }}>
                    {i === loyaltyThreshold - 1
                      ? <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      : <Car size={12} color="#22D3EE" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={SECTION_STYLE}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <MapPin size={15} color="#22D3EE" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>رابط Google Maps للتقييم</span>
            </div>
            <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 12 }}>
              سيُرسل هذا الرابط تلقائياً للعملاء بعد كل زيارة لطلب التقييم على Google.
            </p>
            <input value={reviewUrl} onChange={e => setReviewUrl(e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              dir="ltr"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', color: '#E2E8F0', fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button onClick={saveLoyalty} disabled={savingLoyalty}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: loyaltySaved ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)', color: loyaltySaved ? '#10B981' : '#F59E0B', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
            {savingLoyalty ? <Loader2 size={14} className="animate-spin" /> : loyaltySaved ? <Check size={14} /> : <Save size={14} />}
            {loyaltySaved ? 'تم الحفظ ✓' : 'حفظ إعدادات الولاء'}
          </button>
        </div>
      )}
    </div>
  )
}
