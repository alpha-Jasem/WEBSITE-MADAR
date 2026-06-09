import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  QrCode,
  Save,
  ShieldCheck,
  ShieldOff,
  ToggleLeft,
  ToggleRight,
  Zap,
  X,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLog'
import { getSelfCheckinSettings, getSelfCheckinUrl } from '../../../lib/selfCheckin'
import type { Company, CompanyStatus, Plan } from '../../../types'

const PLAN_CONFIG: Record<Plan, { label: string; color: string; limit: number; price: string }> = {
  starter: { label: 'Starter', color: '#06B6D4', limit: 2000, price: '299' },
  growth: { label: 'Pro', color: '#4F6EF7', limit: 10000, price: '799' },
  enterprise: { label: 'Premium', color: '#F59E0B', limit: 50000, price: '1,999' },
}

const BUSINESS_LABELS: Record<string, string> = {
  clinic: 'عيادة',
  car_wash: 'مغسلة سيارات',
  real_estate: 'عقاري',
  other: 'أخرى',
}

const STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'نشط',
  trial: 'تجريبي',
  suspended: 'موقوف',
}

const FEATURE_FLAGS = [
  {
    key: 'self_checkin',
    title: 'QR التسجيل الذاتي',
    desc: 'يسمح لعميل المغسلة بتسجيل سيارته من الجوال.',
    recommended: 'Pro',
  },
  {
    key: 'wallet',
    title: 'المحفظة الرقمية',
    desc: 'مرحلة ثانية: رصيد العميل النهائي والخصم التلقائي.',
    recommended: 'Add-on',
  },
  {
    key: 'memberships',
    title: 'اشتراكات العملاء الشهرية',
    desc: 'مرحلة ثانية: باقات غسلات شهرية وتذكير واتساب.',
    recommended: 'Add-on',
  },
  {
    key: 'online_payments',
    title: 'الدفع الإلكتروني',
    desc: 'مرحلة ثانية: Apple Pay / Google Pay عبر مزود دفع.',
    recommended: 'Add-on',
  },
  {
    key: 'cash_pos',
    title: 'كاش ونقطة بيع',
    desc: 'المسار الحالي للدفع عند التسليم.',
    recommended: 'أساسي',
  },
] as const

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }
  return (
    <button type="button" onClick={copy} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100">
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
    </button>
  )
}

interface Props {
  company: Company
  onClose: () => void
  onUpdated: () => void
}

export function AdminClientDrawer({ company, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [activePlan, setActivePlan] = useState<Plan>(company.plan)
  const [activePackageType, setActivePackageType] = useState<string>(company.package_type || 'whatsapp')
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const stored = ((company.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
    return {
      self_checkin: stored.self_checkin ?? Boolean(getSelfCheckinUrl(company as any)),
      wallet: stored.wallet ?? false,
      memberships: stored.memberships ?? false,
      online_payments: stored.online_payments ?? false,
      cash_pos: stored.cash_pos ?? true,
    }
  })

  const plan = PLAN_CONFIG[company.plan]
  const checkinUrl = getSelfCheckinUrl(company as any)
  const checkinQrUrl = checkinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(checkinUrl)}` : ''
  const selfSettings = getSelfCheckinSettings(company as any)
  const messageLimit = company.message_limit || plan.limit
  const usage = messageLimit > 0 ? Math.min(100, Math.round(((company.messages_used || 0) / messageLimit) * 100)) : 0

  const changed = useMemo(() => {
    const stored = ((company.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
    const flagsChanged = FEATURE_FLAGS.some(item => (stored[item.key] ?? (item.key === 'cash_pos')) !== flags[item.key])
    const packageChanged = activePackageType !== (company.package_type || 'whatsapp')
    return activePlan !== company.plan || flagsChanged || packageChanged
  }, [activePlan, company, flags])

  const save = async () => {
    setSaving(true)
    const nextAutomations = {
      ...((company.cw_automations as any) || {}),
      feature_flags: flags,
    }
    const { error } = await supabase
      .from('companies')
      .update({
        plan: activePlan,
        message_limit: PLAN_CONFIG[activePlan].limit,
        cw_automations: nextAutomations,
        ...(company.industry === 'clinic' ? { package_type: activePackageType } : {}),
      } as any)
      .eq('id', company.id)

    setSaving(false)
    if (error) {
      setFeedback('تعذر الحفظ. حاول مرة أخرى.')
      return
    }
    logAudit(company.id, 'company_settings_updated', {
      entityType: 'company',
      entityId: company.id,
      oldValue: {
        plan: company.plan,
        feature_flags: (company.cw_automations as any)?.feature_flags || {},
      },
      newValue: {
        plan: activePlan,
        feature_flags: flags,
      },
    })
    setFeedback('تم حفظ إعدادات الشركة')
    setTimeout(() => setFeedback(''), 1600)
    onUpdated()
  }

  const toggleStatus = async () => {
    const next: CompanyStatus = company.status === 'active' ? 'suspended' : 'active'
    setSaving(true)
    const updatePayload: Record<string, unknown> = { status: next }
    // When activating a clinic, also lock in the selected package
    if (next === 'active' && company.industry === 'clinic') {
      updatePayload.package_type = activePackageType
    }
    const { error } = await supabase.from('companies').update(updatePayload).eq('id', company.id)
    setSaving(false)
    if (!error) {
      logAudit(company.id, 'company_status_updated', {
        entityType: 'company_status',
        entityId: company.id,
        oldValue: { status: company.status },
        newValue: { status: next, ...(next === 'active' && company.industry === 'clinic' ? { package_type: activePackageType } : {}) },
      })
      if (next === 'active') setFeedback('✅ تم تفعيل الحساب!')
      setTimeout(() => setFeedback(''), 3000)
      onUpdated()
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} dir="rtl">
        <div className="flex-1 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

        <motion.aside
          className="relative h-full w-full max-w-xl overflow-y-auto bg-white"
          style={{ borderRight: '1px solid #E2E8F0', boxShadow: '-20px 0 60px rgba(15,23,42,0.18)' }}
          initial={{ x: -520 }}
          animate={{ x: 0 }}
          exit={{ x: -520 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white/95 px-6 py-5 backdrop-blur" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-base font-black text-white" style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)` }}>
                {company.name[0]}
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 font-cairo">{company.name}</h2>
                <p className="text-xs text-slate-500 font-tajawal">{company.owner_name}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
              <X size={17} />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <section className="rounded-3xl p-5" style={{ background: 'linear-gradient(135deg, #F8FBFF, #FFFFFF)', border: '1px solid #E2E8F0' }}>
              <div className="grid grid-cols-2 gap-3">
                <Info label="النشاط" value={BUSINESS_LABELS[company.business_type ?? 'other'] || 'أخرى'} />
                <Info label="الحالة" value={STATUS_LABELS[company.status]} />
                <Info label="الباقة الحالية" value={PLAN_CONFIG[company.plan].label} />
                <Info label="حد الرسائل" value={messageLimit.toLocaleString('en-US')} />
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500 font-sora">
                  <span>{(company.messages_used || 0).toLocaleString('en-US')}</span>
                  <span>{usage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full" style={{ width: `${usage}%`, background: usage >= 85 ? '#EF4444' : plan.color }} />
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
              <div className="mb-4 flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 font-cairo">بيانات التواصل</h3>
              </div>
              <ContactRow icon={Mail} label="الإيميل" value={company.owner_email} />
              {company.owner_phone && <ContactRow icon={Phone} label="الجوال" value={company.owner_phone} />}
            </section>

            {company.industry === 'clinic' ? (
              <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-cairo">باقة العيادة</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'whatsapp', label: 'باقة واتساب',       color: '#10B981', price: '٩,٩٩٩ / سنة' },
                    { id: 'ai_pro',   label: 'AI Voice + واتساب', color: '#7C3AED', price: '١٦,٩٩٩ / سنة' },
                  ].map(pkg => (
                    <button key={pkg.id} type="button" onClick={() => setActivePackageType(pkg.id)}
                      className="rounded-2xl p-3 text-center transition-all"
                      style={{
                        border: `1px solid ${activePackageType === pkg.id ? pkg.color : '#E2E8F0'}`,
                        background: activePackageType === pkg.id ? `${pkg.color}12` : '#FFFFFF',
                      }}>
                      <strong className="block text-sm font-black font-cairo" style={{ color: pkg.color }}>{pkg.label}</strong>
                      <span className="mt-1 block text-[11px] text-slate-500 font-tajawal">{pkg.price}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
                <div className="mb-4 flex items-center gap-2">
                  <CreditCard size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-cairo">الباقة</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG[Plan]][]).map(([id, item]) => (
                    <button key={id} type="button" onClick={() => setActivePlan(id)}
                      className="rounded-2xl p-3 text-center transition-all"
                      style={{
                        border: `1px solid ${activePlan === id ? item.color : '#E2E8F0'}`,
                        background: activePlan === id ? `${item.color}12` : '#FFFFFF',
                      }}>
                      <strong className="block text-sm font-black font-sora" style={{ color: item.color }}>{item.label}</strong>
                      <span className="mt-1 block text-[11px] text-slate-500 font-tajawal">{item.price} ر.س</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-cairo">مركز الميزات المدفوعة</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 font-tajawal">تحكم الإدارة</span>
              </div>
              <div className="space-y-3">
                {FEATURE_FLAGS.map(feature => {
                  const enabled = Boolean(flags[feature.key])
                  return (
                    <button
                      key={feature.key}
                      type="button"
                      onClick={() => setFlags(current => ({ ...current, [feature.key]: !enabled }))}
                      className="flex w-full items-center gap-3 rounded-2xl p-3 text-right transition-colors hover:bg-slate-50"
                      style={{ border: '1px solid #E2E8F0' }}
                    >
                      {enabled ? <ToggleRight size={25} className="text-emerald-600" /> : <ToggleLeft size={25} className="text-slate-400" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-900 font-cairo">{feature.title}</strong>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 font-tajawal">{feature.recommended}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">{feature.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {company.business_type === 'car_wash' && (
              <section className="rounded-3xl bg-white p-5" style={{ border: '1px solid #E2E8F0' }}>
                <div className="mb-4 flex items-center gap-2">
                  <QrCode size={16} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-cairo">QR التسجيل الذاتي</h3>
                </div>
                {checkinUrl ? (
                  <div className="flex gap-4">
                    <img src={checkinQrUrl} alt="QR التسجيل الذاتي" className="h-28 w-28 rounded-2xl bg-white p-2" style={{ border: '1px solid #E2E8F0' }} />
                    <div className="min-w-0 flex-1">
                      <code className="block break-all rounded-2xl bg-slate-50 p-3 text-[11px] text-slate-600" dir="ltr">{checkinUrl}</code>
                      <p className="mt-2 text-xs text-slate-500 font-tajawal">
                        {selfSettings.enabled ? 'مفعّل' : 'موقوف'} - {selfSettings.approvalRequired ? 'يتطلب اعتماد الموظف' : 'يدخل مباشرة'} - منع التكرار {selfSettings.antiSpamMinutes}د
                      </p>
                      <div className="mt-3 flex gap-2">
                        <CopyBtn value={checkinUrl} />
                        <a href={checkinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 font-tajawal">
                          فتح <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-800 font-tajawal">
                    لا يوجد public check-in token أو webhook token. جهّز الرابط قبل طباعة QR للعميل.
                  </p>
                )}
              </section>
            )}

            {/* Activate CTA — prominent for trial clinic accounts */}
            {company.status === 'trial' && (
              <button
                type="button"
                onClick={toggleStatus}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-base font-black font-cairo text-white"
                style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {saving ? 'جارٍ التفعيل...' : `فعّل الحساب وافتحه ← ${company.industry === 'clinic' ? (activePackageType === 'ai_pro' ? 'AI Voice + واتساب' : 'باقة واتساب') : ''}`}
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              {company.status !== 'trial' && (
                <button
                  type="button"
                  onClick={toggleStatus}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold font-cairo"
                  style={{
                    background: company.status === 'active' ? '#FEF2F2' : '#ECFDF5',
                    color: company.status === 'active' ? '#DC2626' : '#059669',
                    border: `1px solid ${company.status === 'active' ? '#FECACA' : '#A7F3D0'}`,
                  }}
                >
                  {company.status === 'active' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                  {company.status === 'active' ? 'تعليق الحساب' : 'إعادة التفعيل'}
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving || !changed}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white font-cairo disabled:opacity-50 ${company.status !== 'trial' ? '' : 'col-span-2'}`}
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #4F6EF7)' }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                حفظ التغييرات
              </button>
            </div>

            {/* WhatsApp notify button — shown after activation */}
            {company.owner_phone && (
              <a
                href={`https://wa.me/966${company.owner_phone.replace(/^0/, '')}?text=${encodeURIComponent(`مرحباً ${company.owner_name} 👋\nتم تفعيل حسابك في نظام مدار بنجاح!\n\nيمكنك الدخول الآن على:\nhttps://madar.ai/clinic-os/login\n\nللدعم والمساعدة تواصل معنا في أي وقت.`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold font-cairo"
                style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', textDecoration: 'none' }}
              >
                <MessageSquare size={15} />
                أبلغ العميل عبر واتساب
              </a>
            )}

            {feedback && (
              <div className="rounded-2xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-700 font-tajawal">
                {feedback}
              </div>
            )}
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3" style={{ border: '1px solid #E2E8F0' }}>
      <p className="text-[11px] text-slate-500 font-tajawal">{label}</p>
      <strong className="mt-1 block text-sm text-slate-900 font-cairo">{value}</strong>
    </div>
  )
}

function ContactRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 py-3 first:border-t-0">
      <Icon size={15} className="text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-500 font-tajawal">{label}</p>
        <p className="truncate text-sm text-slate-900 font-sora" dir="ltr">{value}</p>
      </div>
      <CopyBtn value={value} />
    </div>
  )
}
