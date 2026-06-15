import { useEffect, useState } from 'react'
import { Car, Clock, Star, Plus, Trash2, Check, Loader2, MapPin, Save, Receipt, QrCode, Copy, ExternalLink, FileText, Printer, BarChart2, type LucideIcon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { useDailyUsage } from '../../../hooks/useDailyUsage'
import { logAudit } from '../../../lib/auditLog'
import { getSelfCheckinUrl } from '../../../lib/selfCheckin'
import { sanitizeDecimalInput, sanitizeNameText, toSafeNumber } from '../../../lib/formSanitizers'
import type { CWService } from '../../../types'

type SetupTab = 'services' | 'hours' | 'loyalty' | 'vat' | 'qr' | 'invoice' | 'print' | 'plan'
type CarWashSetupProps = {
  title?: string
  description?: string
  visibleTabs?: SetupTab[]
}

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
  DAYS.map(d => [d.key, { open: '00:00', close: '23:59', closed: false }])
)


const SECTION_STYLE = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 18,
  padding: '22px 24px',
}

export function CarWashSetup({ title = 'إعداد المغسلة', description = 'الخدمات، أوقات العمل، الولاء، والضريبة', visibleTabs }: CarWashSetupProps = {}) {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { planLabel } = usePlanGate()
  const dailyUsage = useDailyUsage(companyId, planLabel)
  const SAUDI_VAT_RATE = 15

  const [tab, setTab] = useState<SetupTab>(visibleTabs?.[0] ?? 'invoice')
  const [copiedUrl, setCopiedUrl] = useState(false)

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
  const [loyaltyFreeServiceId, setLoyaltyFreeServiceId] = useState('')
  const [reviewUrl, setReviewUrl] = useState('')
  const [savingLoyalty, setSavingLoyalty] = useState(false)
  const [loyaltySaved, setLoyaltySaved] = useState(false)

  // VAT
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [vatRate, setVatRate] = useState(SAUDI_VAT_RATE)
  const [priceIncludesVat, setPriceIncludesVat] = useState(true)
  const [savingVat, setSavingVat] = useState(false)
  const [vatSaved, setVatSaved] = useState(false)

  // Monthly target
  const [monthlyTarget, setMonthlyTarget] = useState(0)

  // Invoice settings
  const [invVatNumber, setInvVatNumber] = useState('')
  const [invCommercialReg, setInvCommercialReg] = useState('')
  const [invAddress, setInvAddress] = useState('')
  const [invFooter, setInvFooter] = useState('')
  const [invOwnerPhone, setInvOwnerPhone] = useState('')
  const [invLayout, setInvLayout] = useState<'a4' | 'thermal'>('a4')
  const [invFontSize, setInvFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [invShowPhone, setInvShowPhone] = useState(true)
  const [invHeaderColor, setInvHeaderColor] = useState('#1E293B')
  const [invLogoUrl, setInvLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [savingInv, setSavingInv] = useState(false)
  const [invSaved, setInvSaved] = useState(false)


  // QR self-checkin settings
  const [qrEnabled, setQrEnabled] = useState(true)
  const [qrRequireApproval, setQrRequireApproval] = useState(true)
  const [qrPreventDuplicate, setQrPreventDuplicate] = useState(true)
  const [qrWaitMinutes, setQrWaitMinutes] = useState(10)
  const [savingQr, setSavingQr] = useState(false)
  const [qrSaved, setQrSaved] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [localCheckinToken, setLocalCheckinToken] = useState('')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      setLoading(true)

      const [{ data: svcData }, { data: co }] = await Promise.all([
        supabase.from('cw_services').select('*').eq('company_id', companyId).order('created_at'),
        supabase.from('companies')
          .select('cw_hours, cw_loyalty_threshold, google_maps_url, tax_enabled, vat_rate, price_includes_vat, cw_message_templates, cw_monthly_target, vat_number, commercial_reg, address, print_footer, owner_phone, cw_invoice_settings, cw_automations')
          .eq('id', companyId).single(),
      ])

      if (svcData) setServices(svcData as CWService[])

      if (co) {
        const c = co as any
        if (c.cw_hours) setHours(c.cw_hours)
        if (c.cw_loyalty_threshold) setLoyaltyThreshold(c.cw_loyalty_threshold)
        if (c.cw_automations?.loyalty?.free_service_id) setLoyaltyFreeServiceId(c.cw_automations.loyalty.free_service_id)
        if (c.google_maps_url) setReviewUrl(c.google_maps_url)
        setTaxEnabled(!!c.tax_enabled)
        setVatRate(SAUDI_VAT_RATE)
        setPriceIncludesVat(c.price_includes_vat !== false)
        if (c.cw_monthly_target) setMonthlyTarget(c.cw_monthly_target)
        setInvVatNumber(c.vat_number || '')
        setInvCommercialReg(c.commercial_reg || '')
        setInvAddress(c.address || '')
        setInvFooter(c.print_footer || '')
        setInvOwnerPhone(c.owner_phone || '')
        const inv = (c as any).cw_invoice_settings ?? {}
        setInvLayout(inv.layout ?? 'a4')
        setInvFontSize(inv.font_size ?? 'medium')
        setInvShowPhone(inv.show_customer_phone !== false)
        setInvHeaderColor(inv.header_color ?? '#1E293B')
        setInvLogoUrl(inv.logo_url ?? '')
        const sc = (c as any).cw_automations?.self_checkin ?? {}
        setQrEnabled(sc.enabled !== false)
        setQrRequireApproval(sc.require_approval !== false)
        setQrPreventDuplicate(sc.prevent_duplicate !== false)
        setQrWaitMinutes(sc.wait_minutes ?? 10)
      }
      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  // Services: save all (INSERT new, UPDATE existing, DELETE removed)
  const saveServices = async () => {
    if (!companyId) return
    setSavingServices(true)

    const normalizedServices = services.map(service => ({
      ...service,
      name: sanitizeNameText(service.name).trim(),
      price: toSafeNumber(service.price),
      duration_minutes: Math.round(toSafeNumber(service.duration_minutes, 20, 1, 600)),
    }))

    if (normalizedServices.some(service => !service.name || service.price < 0)) {
      alert('تأكد أن اسم الخدمة نص صحيح والسعر رقم صحيح.')
      setSavingServices(false)
      return
    }

    const toInsert = normalizedServices.filter(s => !s.id || s.id === '')
    const toUpdate = normalizedServices.filter(s => s.id && s.id !== '')

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
    const { data: coData } = await supabase.from('companies').select('cw_automations').eq('id', companyId).single()
    const existingAuto = (coData as any)?.cw_automations || {}
    await supabase.from('companies').update({
      cw_loyalty_threshold: loyaltyThreshold,
      google_maps_url: reviewUrl,
      cw_monthly_target: monthlyTarget,
      cw_automations: { ...existingAuto, loyalty: { ...existingAuto.loyalty, free_service_id: loyaltyFreeServiceId } },
    } as any).eq('id', companyId)
    setSavingLoyalty(false)
    setLoyaltySaved(true)
    setTimeout(() => setLoyaltySaved(false), 3000)
  }

  const saveVat = async () => {
    if (!companyId) return
    setSavingVat(true)
    await supabase.from('companies').update({ tax_enabled: taxEnabled, vat_rate: SAUDI_VAT_RATE, price_includes_vat: true } as any).eq('id', companyId)
    setVatRate(SAUDI_VAT_RATE)
    setPriceIncludesVat(true)
    logAudit(companyId, 'tax_settings_changed', { newValue: { tax_enabled: taxEnabled, vat_rate: SAUDI_VAT_RATE, price_includes_vat: true } })
    setSavingVat(false)
    setVatSaved(true)
    setTimeout(() => setVatSaved(false), 3000)
  }

  const saveInvoiceSettings = async () => {
    if (!companyId) return
    setSavingInv(true)
    await supabase.from('companies').update({
      vat_number: invVatNumber.trim() || null,
      commercial_reg: invCommercialReg.trim() || null,
      address: invAddress.trim() || null,
      print_footer: invFooter.trim() || null,
      owner_phone: invOwnerPhone.trim() || null,
      cw_invoice_settings: {
        layout: invLayout,
        font_size: invFontSize,
        show_customer_phone: invShowPhone,
        header_color: invHeaderColor,
        logo_url: invLogoUrl || null,
      },
    } as any).eq('id', companyId)
    logAudit(companyId, 'invoice_settings_updated', {})
    setSavingInv(false)
    setInvSaved(true)
    setTimeout(() => setInvSaved(false), 2500)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${companyId}-${Date.now()}.${ext}`
    await supabase.storage.from('company-assets').upload(path, file, { upsert: true })
    const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
    setInvLogoUrl(data.publicUrl)
    setUploadingLogo(false)
  }

  const saveQrSettings = async () => {
    if (!companyId) return
    setSavingQr(true)
    const { data: co } = await supabase.from('companies').select('cw_automations').eq('id', companyId).single()
    const existing = (co as any)?.cw_automations ?? {}
    await supabase.from('companies').update({
      cw_automations: { ...existing, self_checkin: { enabled: qrEnabled, require_approval: qrRequireApproval, prevent_duplicate: qrPreventDuplicate, wait_minutes: qrWaitMinutes } }
    } as any).eq('id', companyId)
    setSavingQr(false)
    setQrSaved(true)
    setTimeout(() => setQrSaved(false), 2500)
  }

  const generateCheckinToken = async () => {
    if (!companyId) return
    setGeneratingToken(true)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const token = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const { error } = await supabase.from('companies').update({ public_checkin_token: token } as any).eq('id', companyId)
    if (!error) setLocalCheckinToken(token)
    setGeneratingToken(false)
  }

  useEffect(() => {
    if (visibleTabs?.length && !visibleTabs.includes(tab)) setTab(visibleTabs[0])
  }, [visibleTabs, tab])

  const ALL_TABS: { key: SetupTab; label: string; icon: LucideIcon }[] = [
    { key: 'services', label: 'الخدمات',        icon: Car       },
    { key: 'loyalty',  label: 'الولاء',          icon: Star      },
    { key: 'vat',      label: 'الضريبة',         icon: Receipt   },
    { key: 'invoice',  label: 'الفاتورة',        icon: FileText  },
    { key: 'print',    label: 'الطباعة',         icon: Printer   },
    { key: 'qr',       label: 'رمز QR',          icon: QrCode    },
    { key: 'plan',     label: 'الباقة والاستخدام', icon: BarChart2 },
  ]
  const SETTINGS_ONLY_TABS: SetupTab[] = ['invoice', 'print', 'qr', 'plan']
  const TABS = visibleTabs?.length ? ALL_TABS.filter(t => visibleTabs.includes(t.key)) : ALL_TABS.filter(t => SETTINGS_ONLY_TABS.includes(t.key))


  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>{description}</p>
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
          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)' }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.8, color: '#0369A1', fontFamily: 'Tajawal, sans-serif' }}>
              اكتب السعر النهائي الذي يدفعه العميل. إذا كتبت 25 ر.س فالإجمالي للعميل 25 ر.س، والنظام يفصل VAT داخلياً في الفواتير والتقارير.
            </p>
          </div>

          {services.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13, padding: '20px 0' }}>لا توجد خدمات — أضف خدمتك الأولى</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 60px 32px', gap: 10, padding: '0 4px' }}>
                {['اسم الخدمة', 'السعر شامل الضريبة', 'مفعّل', ''].map(h => (
                  <span key={h} style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
              {services.map((s, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 60px 32px', gap: 10, alignItems: 'center' }}>
                  <input value={s.name} onChange={e => updateService(i, 'name', sanitizeNameText(e.target.value))}
                    placeholder="اسم الخدمة"
                    type="text"
                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                  <div style={{ position: 'relative' }}>
                    <input type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" value={String(s.price ?? '')} onChange={e => updateService(i, 'price', toSafeNumber(sanitizeDecimalInput(e.target.value)))}
                      placeholder="0"
                      dir="ltr"
                      style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px 8px 36px', color: '#1E293B', fontSize: 13, fontFamily: 'Sora, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', pointerEvents: 'none' }}>ر.س</span>
                  </div>
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
                  <input type="text" inputMode="numeric" pattern="[0-9]*" min={2} max={20} value={loyaltyThreshold}
                    onChange={e => setLoyaltyThreshold(Math.round(toSafeNumber(sanitizeDecimalInput(e.target.value), 5, 2, 20)))}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Star size={15} color="#F59E0B" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>نوع الخدمة المجانية</span>
            </div>
            <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 12 }}>
              اختر الخدمة التي يحصل عليها العميل مجاناً عند اكتمال نقاط الولاء.
            </p>
            {services.length === 0 ? (
              <p style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>لا توجد خدمات — أضف خدمات أولاً من تبويب الخدمات.</p>
            ) : (
              <select
                value={loyaltyFreeServiceId}
                onChange={e => setLoyaltyFreeServiceId(e.target.value)}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10, padding: '10px 12px', color: '#0F172A', fontSize: 13, fontFamily: 'Cairo, sans-serif', outline: 'none', cursor: 'pointer' }}>
                <option value="">— اختر الخدمة المجانية —</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — {s.price} ر.س</option>
                ))}
              </select>
            )}
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
                  <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>نسبة الضريبة</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 86, background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 10, padding: '8px 12px', color: '#0F172A', fontSize: 20, fontFamily: 'Sora, sans-serif', fontWeight: 700, textAlign: 'center' }}>
                      {SAUDI_VAT_RATE}%
                    </div>
                    <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>ثابتة حسب ضريبة القيمة المضافة في السعودية، ولا تتغير من لوحة المغسلة.</p>
                  </div>
                </div>

                {/* Price includes VAT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 14, border: '1px solid rgba(16,185,129,0.22)' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#065F46', fontFamily: 'Cairo, sans-serif', fontWeight: 700, margin: 0 }}>الأسعار شاملة الضريبة دائماً</p>
                    <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: '4px 0 0' }}>
                      مثال: سعر 25 ر.س = {(25 / (1 + vatRate/100)).toFixed(2)} ر.س قبل الضريبة + {(25 - 25 / (1 + vatRate/100)).toFixed(2)} ر.س VAT، والإجمالي للعميل يبقى 25 ر.س.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <Check size={14} />
                    السعر النهائي
                  </div>
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

      {/* Print Settings Tab */}
      {tab === 'print' && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Printer size={15} color="#22D3EE" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>إعدادات الطباعة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* التخطيط */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>تخطيط الطباعة</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['a4', 'A4 (ورقة عادية)'], ['thermal', 'حراري 80mm']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => setInvLayout(val)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `2px solid ${invLayout === val ? '#22D3EE' : '#E2E8F0'}`, background: invLayout === val ? 'rgba(34,211,238,0.08)' : '#fff', color: invLayout === val ? '#0099CC' : '#475569', fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>
                {invLayout === 'thermal' ? 'تخطيط ضيق 80mm مناسب لطابعات الإيصالات الحرارية' : 'تخطيط A4 احترافي للطباعة على الورق العادي أو إرسال PDF'}
              </p>
            </div>

            {/* حجم الخط */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>حجم الخط</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['small', 'صغير'], ['medium', 'متوسط'], ['large', 'كبير']] as const).map(([val, lbl]) => (
                  <button key={val} onClick={() => setInvFontSize(val)}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `2px solid ${invFontSize === val ? '#22D3EE' : '#E2E8F0'}`, background: invFontSize === val ? 'rgba(34,211,238,0.08)' : '#fff', color: invFontSize === val ? '#0099CC' : '#475569', fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* إظهار رقم العميل */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>إظهار رقم جوال العميل</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>يظهر في الفاتورة بجانب اسم العميل</p>
              </div>
              <button onClick={() => setInvShowPhone(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: invShowPhone ? '#22D3EE' : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: invShowPhone ? 23 : 3 }} />
              </button>
            </div>

            {/* لون الترويسة */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>لون الترويسة</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {['#1E293B', '#0F4C81', '#065F46', '#7C3AED', '#9A3412', '#1a1a1a'].map(color => (
                  <button key={color} onClick={() => setInvHeaderColor(color)}
                    style={{ width: 36, height: 36, borderRadius: 10, border: `3px solid ${invHeaderColor === color ? '#22D3EE' : 'transparent'}`, background: color, cursor: 'pointer', outline: invHeaderColor === color ? '2px solid #22D3EE' : 'none', outlineOffset: 2 }} />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="color" value={invHeaderColor} onChange={e => setInvHeaderColor(e.target.value)}
                    style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E2E8F0', cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{invHeaderColor}</span>
                </div>
              </div>
            </div>

            {/* معاينة اللون */}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: invHeaderColor, color: '#fff', textAlign: 'center', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700 }}>
              معاينة الترويسة — {company?.name ?? 'اسم المغسلة'}
            </div>

            <button onClick={saveInvoiceSettings} disabled={savingInv}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', background: invSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', color: invSaved ? '#10B981' : '#0099CC', cursor: savingInv ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, opacity: savingInv ? 0.7 : 1, alignSelf: 'flex-start' }}>
              {savingInv ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : invSaved ? <Check size={14} /> : <Save size={14} />}
              {savingInv ? 'جاري الحفظ...' : invSaved ? 'تم الحفظ ✓' : 'حفظ إعدادات الطباعة'}
            </button>
          </div>
        </div>
      )}

      {/* QR Tab */}
      {tab === 'qr' && (() => {
        const effectiveCompany = localCheckinToken
          ? { ...(company as any), public_checkin_token: localCheckinToken }
          : company
        const checkinUrl = getSelfCheckinUrl(effectiveCompany as any)
        const qrSrc = checkinUrl
          ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=14&data=${encodeURIComponent(checkinUrl)}`
          : ''
        const toggleRow = (label: string, value: boolean, onChange: (v: boolean) => void) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 13, color: '#1E293B', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{label}</span>
            <button onClick={() => onChange(!value)}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: value ? '#22D3EE' : '#CBD5E1', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: value ? 23 : 3 }} />
            </button>
          </div>
        )
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* QR Settings Card */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <QrCode size={15} color="#22D3EE" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>إعدادات التسجيل الذاتي</span>
              </div>
              {toggleRow('تفعيل التسجيل الذاتي عبر QR', qrEnabled, setQrEnabled)}
              {toggleRow('اعتماد موظف قبل الإضافة للقائمة', qrRequireApproval, setQrRequireApproval)}
              {toggleRow('منع تكرار نفس السيارة', qrPreventDuplicate, setQrPreventDuplicate)}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0' }}>
                <span style={{ fontSize: 13, color: '#1E293B', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>وقت الانتظار المسموح (دقيقة)</span>
                <input type="number" min={1} max={120} value={qrWaitMinutes} onChange={e => setQrWaitMinutes(Number(e.target.value))}
                  style={{ width: 70, padding: '6px 10px', borderRadius: 9, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'monospace', outline: 'none', textAlign: 'center' }} />
              </div>
              <button onClick={saveQrSettings} disabled={savingQr}
                style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', background: qrSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', color: qrSaved ? '#10B981' : '#22D3EE', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
                {savingQr ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : qrSaved ? <Check size={14} /> : <Save size={14} />}
                {savingQr ? 'جاري الحفظ...' : qrSaved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
              </button>
            </div>

            {/* QR Code display */}
            <div style={{ ...SECTION_STYLE, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <QrCode size={16} color="#22D3EE" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>رمز QR للتسجيل الذاتي</span>
              </div>
              <p style={{ margin: 0, color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 13, maxWidth: 380, lineHeight: 1.7 }}>
                ضع هذا الرمز عند مدخل المغسلة أو أرسله للعملاء — يسجلون سيارتهم ويحصلون على رقم تذكرتهم بأنفسهم.
              </p>
              {checkinUrl ? (
                <>
                  <img src={qrSrc} alt="QR Code"
                    style={{ width: 200, height: 200, borderRadius: 18, background: '#FFFFFF', padding: 10, boxShadow: '0 8px 32px rgba(13,27,62,0.12)', border: '1px solid #E2E8F0' }} />
                  <div style={{ width: '100%', maxWidth: 420, background: '#F1F5F9', borderRadius: 12, padding: '10px 14px', border: '1px solid #E2E8F0', fontFamily: 'Sora, sans-serif', fontSize: 11, color: '#475569', wordBreak: 'break-all', textAlign: 'left', direction: 'ltr' }}>
                    {checkinUrl}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button onClick={() => { navigator.clipboard.writeText(checkinUrl); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: copiedUrl ? 'rgba(16,185,129,0.1)' : '#FFFFFF', color: copiedUrl ? '#10B981' : '#475569', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                      {copiedUrl ? 'تم النسخ ✓' : 'نسخ الرابط'}
                    </button>
                    <a href={checkinUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#0099CC', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <ExternalLink size={14} /> فتح الصفحة
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                  <QrCode size={40} color="#CBD5E1" />
                  <p style={{ margin: 0, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontSize: 13, textAlign: 'center' }}>
                    لا يوجد رمز QR بعد — أنشئ رمزاً لتفعيل التسجيل الذاتي
                  </p>
                  <button
                    onClick={generateCheckinToken}
                    disabled={generatingToken}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 14, border: 'none', cursor: generatingToken ? 'wait' : 'pointer', background: 'linear-gradient(135deg, #0099CC, #22D3EE)', color: '#fff', fontFamily: 'Cairo, sans-serif', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(0,153,204,0.3)' }}
                  >
                    {generatingToken ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <QrCode size={15} />}
                    {generatingToken ? 'جاري الإنشاء...' : 'إنشاء رمز QR'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Invoice Settings Tab */}
      {tab === 'invoice' && (
        <div style={SECTION_STYLE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <FileText size={15} color="#22D3EE" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>بيانات الفاتورة</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Logo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 8 }}>شعار المغسلة (يظهر في الفاتورة)</label>
              {invLogoUrl && (
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={invLogoUrl} alt="logo" style={{ maxHeight: 52, maxWidth: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <button onClick={() => setInvLogoUrl('')} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif' }}>حذف</button>
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif', cursor: 'pointer' }}>
                {uploadingLogo ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <MapPin size={14} />}
                {uploadingLogo ? 'جاري الرفع...' : invLogoUrl ? 'تغيير الصورة' : 'رفع صورة الشعار'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {[
              { label: 'الرقم الضريبي', value: invVatNumber, set: setInvVatNumber, placeholder: '3XXXXXXXXXXXXXXXXX' },
              { label: 'السجل التجاري', value: invCommercialReg, set: setInvCommercialReg, placeholder: '10XXXXXXXX' },
              { label: 'رقم هاتف المالك', value: invOwnerPhone, set: setInvOwnerPhone, placeholder: '05XXXXXXXX' },
              { label: 'العنوان', value: invAddress, set: setInvAddress, placeholder: 'المدينة، الحي، الشارع' },
            ].map(field => (
              <div key={field.label}>
                <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  dir="rtl"
                  value={field.value}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.placeholder}
                  style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginBottom: 6 }}>
                نص تذييل الفاتورة
              </label>
              <textarea
                dir="rtl"
                rows={3}
                value={invFooter}
                onChange={e => setInvFooter(e.target.value)}
                placeholder="شكراً لزيارتكم — نراكم قريباً"
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: '9px 12px', color: '#1E293B', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#0369A1', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>
                هذه البيانات تظهر تلقائياً في كل فاتورة تطبعها. الرقم الضريبي والسجل التجاري مطلوبان للفواتير الرسمية في المملكة.
              </p>
            </div>

            <button
              onClick={saveInvoiceSettings}
              disabled={savingInv}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 22px', borderRadius: 12, border: 'none', background: invSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', color: invSaved ? '#10B981' : '#0099CC', cursor: savingInv ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'Cairo, sans-serif', fontWeight: 700, opacity: savingInv ? 0.7 : 1, alignSelf: 'flex-start' }}
            >
              {savingInv ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : invSaved ? <Check size={14} /> : <Save size={14} />}
              {savingInv ? 'جاري الحفظ...' : invSaved ? 'تم الحفظ ✓' : 'حفظ بيانات الفاتورة'}
            </button>
          </div>
        </div>
      )}

      {/* Plan & Usage Tab */}
      {tab === 'plan' && (() => {
        const metrics = [
          { label: 'السيارات', used: dailyUsage.cars, limit: dailyUsage.limits.cars, pct: dailyUsage.carsPct, color: '#0099CC' },
          { label: 'QR', used: dailyUsage.qr, limit: dailyUsage.limits.qr, pct: dailyUsage.qrPct, color: '#7C3AED' },
          { label: 'الشاشة', used: dailyUsage.screenUpdates, limit: dailyUsage.limits.screenUpdates, pct: dailyUsage.screenPct, color: '#F59E0B' },
          { label: 'واتساب', used: dailyUsage.whatsapp, limit: dailyUsage.limits.whatsapp, pct: dailyUsage.whatsappPct, color: '#10B981' },
        ]
        const checklist: { label: string; done: boolean; hint: string; tabKey?: SetupTab; essential: boolean }[] = [
          { label: 'خدمة واحدة على الأقل مضافة', done: services.length > 0, hint: 'أضف الخدمات من المالية', essential: true },
          { label: 'الرقم الضريبي في الفاتورة', done: !!invVatNumber, hint: 'افتح تبويب الفاتورة', tabKey: 'invoice', essential: true },
          { label: 'QR التسجيل الذاتي مفعّل', done: qrEnabled, hint: 'افتح إعدادات QR', tabKey: 'qr', essential: true },
          { label: 'رابط Google Maps للتقييم', done: !!reviewUrl, hint: 'أضف الرابط من المالية → الولاء', essential: false },
          { label: 'هدف الإيراد الشهري محدد', done: monthlyTarget > 0, hint: 'حدده من المالية → تحليل مالي', essential: false },
        ]
        const essentialDone = checklist.filter(c => c.essential && c.done).length
        const essentialTotal = checklist.filter(c => c.essential).length
        const totalDone = checklist.filter(c => c.done).length
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Plan card */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart2 size={15} color="#22D3EE" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>باقتك الحالية</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart2 size={22} color="#22D3EE" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{planLabel}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>يتم إعادة تصفير الاستخدام يومياً عند 12:00 صباحاً</p>
                </div>
              </div>
            </div>

            {/* Daily usage */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>استخدام اليوم</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: dailyUsage.ringColor, fontFamily: 'Sora, sans-serif' }}>{dailyUsage.maxPct}%</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.map(m => (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{m.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{m.used} / {m.limit}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: m.color, width: `${Math.min(m.pct, 100)}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Readiness checklist */}
            <div style={SECTION_STYLE}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Check size={15} color="#10B981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>جاهزية الحساب للتشغيل</span>
              </div>

              {/* Dual progress bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>أساسي</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10B981', fontFamily: 'Sora, sans-serif' }}>{essentialDone}/{essentialTotal}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: '#10B981', width: `${Math.round((essentialDone / essentialTotal) * 100)}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>كامل</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0099CC', fontFamily: 'Sora, sans-serif' }}>{totalDone}/{checklist.length}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: '#0099CC', width: `${Math.round((totalDone / checklist.length) * 100)}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {checklist.map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: item.done ? 'rgba(16,185,129,0.06)' : '#FAFAFA', border: `1px solid ${item.done ? 'rgba(16,185,129,0.18)' : '#E2E8F0'}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', background: item.done ? '#10B981' : '#E2E8F0', flexShrink: 0 }}>
                      <Check size={12} color={item.done ? '#fff' : '#94A3B8'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontFamily: 'Tajawal, sans-serif', fontWeight: 600, color: item.done ? '#065F46' : '#1E293B' }}>{item.label}</p>
                      {!item.done && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{item.hint}</p>}
                    </div>
                    {!item.done && item.tabKey && (
                      <button onClick={() => setTab(item.tabKey!)}
                        style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.08)', color: '#0099CC', fontSize: 11.5, fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        فتح
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {totalDone === checklist.length && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#065F46', fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>مغسلتك جاهزة للتشغيل الكامل ✓</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
