import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Car, Stethoscope, Briefcase, Check, Copy,
  Mail, Phone, Calendar, Zap, Users2, MessageSquare,
  ShieldOff, ShieldCheck, TrendingUp, AlertTriangle, Loader2, RotateCcw, QrCode, ExternalLink,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company, Plan, CompanyStatus } from '../../../types'

// ─── Car wash message templates ───────────────────────────────────────────────

const CW_VAR_TO_DISPLAY: Record<string, string> = {
  '{{customer_name}}':  '[اسم العميل]',
  '{{company_name}}':   '[اسم المغسلة]',
  '{{service}}':        '[اسم الخدمة]',
  '{{total}}':          '[المبلغ الإجمالي]',
  '{{payment_method}}': '[طريقة الدفع]',
}
const CW_DISPLAY_TO_VAR = Object.fromEntries(Object.entries(CW_VAR_TO_DISPLAY).map(([k, v]) => [v, k]))
const cwToDisplay = (t: string) => Object.entries(CW_VAR_TO_DISPLAY).reduce((s, [k, v]) => s.split(k).join(v), t)
const cwToTemplate = (t: string) => Object.entries(CW_DISPLAY_TO_VAR).reduce((s, [k, v]) => s.split(k).join(v), t)

const CW_PREVIEW: Record<string, string> = {
  '[اسم العميل]': 'فهد', '[اسم المغسلة]': 'مغسلة الوفاء',
  '[اسم الخدمة]': 'غسيل بريميوم', '[المبلغ الإجمالي]': '60.00', '[طريقة الدفع]': 'مدى',
}
const cwRenderPreview = (t: string) => Object.entries(CW_PREVIEW).reduce((s, [k, v]) => s.split(k).join(v), t)

const CW_DEFAULT_TEMPLATES: Record<string, string> = {
  car_ready:             '🚗 سيارتك جاهزة [اسم العميل]!\n\nتفضل استلامها من [اسم المغسلة] 😊',
  delivery_receipt:      '🧾 فاتورة غسيل سيارة\n[اسم المغسلة]\n\nالخدمة: [اسم الخدمة]\nالإجمالي: [المبلغ الإجمالي] ر.س\nطريقة الدفع: [طريقة الدفع] ✅\n\nشكراً لزيارتكم — نراكم قريباً 🙏',
  delivery_receipt_free: '🎁 غسلة مجانية!\n[اسم المغسلة]\n\nالخدمة: [اسم الخدمة]\nالإجمالي: 0 ر.س 🎉\n\nشكراً على ولاؤك — نراكم قريباً 🙏',
  loyalty_milestone:     '🎉 مبروك [اسم العميل]!\n\nاستكملت 5 غسلات في [اسم المغسلة] 🚗✨\nغسلتك القادمة مجانية!\n\nما عليك إلا تذكر الموظف عند وصولك 😊',
  review_request:        '⭐ شكراً لزيارة [اسم المغسلة] [اسم العميل]!\n\nرأيك يهمنا — قيّمنا على Google في ثانية واحدة 🙏',
}

const CW_TEMPLATE_DEFS = [
  { key: 'car_ready',             label: 'السيارة جاهزة',  color: '#8B5CF6', vars: ['[اسم العميل]', '[اسم المغسلة]'], note: '' },
  { key: 'delivery_receipt',      label: 'فاتورة التسليم', color: '#22D3EE', vars: ['[اسم العميل]', '[اسم المغسلة]', '[اسم الخدمة]', '[المبلغ الإجمالي]', '[طريقة الدفع]'], note: '' },
  { key: 'delivery_receipt_free', label: 'غسلة مجانية',    color: '#10B981', vars: ['[اسم العميل]', '[اسم المغسلة]', '[اسم الخدمة]'], note: '' },
  { key: 'loyalty_milestone',     label: 'إنجاز الولاء',   color: '#F59E0B', vars: ['[اسم العميل]', '[اسم المغسلة]'], note: '' },
  { key: 'review_request',        label: 'طلب التقييم',    color: '#F59E0B', vars: ['[اسم العميل]', '[اسم المغسلة]'], note: 'رابط Google Maps يُضاف تلقائياً من إعداد الولاء' },
] as const

const PLAN_CONFIG: Record<Plan, { label: string; color: string; limit: number; price: string }> = {
  starter:    { label: 'ابتدائي', color: '#06B6D4', limit: 1000,  price: '299'   },
  growth:     { label: 'نمو',     color: '#4F6EF7', limit: 4000,  price: '799'   },
  enterprise: { label: 'مؤسسي',  color: '#F59E0B', limit: 10000, price: '1,999' },
}

const BUSINESS_ICONS: Record<string, React.ElementType> = {
  clinic: Stethoscope, car_wash: Car, real_estate: Building2, other: Briefcase,
}
const BUSINESS_LABELS: Record<string, string> = {
  clinic: 'عيادة طبية', car_wash: 'مغسلة سيارات', real_estate: 'شركة عقارية', other: 'أخرى',
}
const STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'نشط', trial: 'تجريبي', suspended: 'موقوف',
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-white/10 transition-colors">
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-500" />}
    </button>
  )
}

interface Props {
  company: Company
  onClose: () => void
  onUpdated: () => void
}

export function AdminClientDrawer({ company, onClose, onUpdated }: Props) {
  const plan = PLAN_CONFIG[company.plan]
  const used = company.messages_used ?? 0
  const limit = company.message_limit ?? plan.limit
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isRed = pct >= 85
  const BusinessIcon = BUSINESS_ICONS[company.business_type ?? 'other'] ?? Briefcase
  const checkinUrl = company.webhook_token ? `${window.location.origin}/checkin/${company.webhook_token}` : ''
  const checkinQrUrl = checkinUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(checkinUrl)}` : ''

  const [saving, setSaving] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan>(company.plan)
  const [planChanged, setPlanChanged] = useState(false)
  const [feedback, setFeedback] = useState('')

  const [cwTemplates, setCwTemplates] = useState<Record<string, string>>(CW_DEFAULT_TEMPLATES)
  const [savingTmpl, setSavingTmpl] = useState(false)
  const [tmplSaved, setTmplSaved] = useState(false)

  useEffect(() => {
    if (company?.business_type !== 'car_wash') return
    const raw = (company as any).cw_message_templates || {}
    const display: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) display[k] = cwToDisplay(v as string)
    setCwTemplates({ ...CW_DEFAULT_TEMPLATES, ...display })
  }, [company])

  const saveCwTemplates = async () => {
    setSavingTmpl(true)
    const toSave: Record<string, string> = {}
    for (const [k, v] of Object.entries(cwTemplates)) toSave[k] = cwToTemplate(v)
    await supabase.from('companies').update({ cw_message_templates: toSave } as any).eq('id', company.id)
    setSavingTmpl(false); setTmplSaved(true)
    setTimeout(() => setTmplSaved(false), 3000)
  }

  const PLAN_LIMIT: Record<Plan, number> = { starter: 1000, growth: 4000, enterprise: 10000 }

  const toggleStatus = async () => {
    const next: CompanyStatus = company.status === 'active' ? 'suspended' : 'active'
    setSaving(true)
    const { error } = await supabase.from('companies').update({ status: next }).eq('id', company.id)
    setSaving(false)
    if (!error) { setFeedback(next === 'active' ? 'تم التفعيل ✅' : 'تم التوقيف ⛔'); onUpdated() }
    else setFeedback('حدث خطأ')
    setTimeout(() => setFeedback(''), 2000)
  }

  const savePlan = async () => {
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      plan: activePlan,
      message_limit: PLAN_LIMIT[activePlan],
    }).eq('id', company.id)
    setSaving(false)
    if (!error) { setFeedback('تم تحديث الباقة ✅'); setPlanChanged(false); onUpdated() }
    else setFeedback('حدث خطأ')
    setTimeout(() => setFeedback(''), 2000)
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="flex-1" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

        {/* Drawer */}
        <motion.aside
          className="relative w-full max-w-md h-full overflow-y-auto flex flex-col"
          style={{ background: '#0C0D14', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 sticky top-0 z-10"
            style={{ background: '#0C0D14', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}88)` }}>
                {company.name[0]}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white font-cairo">{company.name}</h2>
                <p className="text-xs text-slate-500 font-tajawal">{company.owner_name}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors">
              <X size={15} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-5">

            {/* Status + Business type row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-slate-500 font-tajawal mb-1.5">نوع النشاط</p>
                <div className="flex items-center gap-2">
                  <BusinessIcon size={14} style={{ color: plan.color }} />
                  <span className="text-xs text-white font-tajawal">{BUSINESS_LABELS[company.business_type ?? 'other']}</span>
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs text-slate-500 font-tajawal mb-1.5">الحالة</p>
                <span className={`text-xs font-bold font-work ${company.status === 'active' ? 'text-emerald-400' : company.status === 'trial' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {STATUS_LABELS[company.status]}
                </span>
              </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="px-4 py-2.5 text-xs text-slate-500 font-tajawal"
                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                بيانات التواصل
              </p>
              <div className="divide-y divide-white/[0.05]">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-slate-500" />
                    <span className="text-xs text-white font-work">{company.owner_email}</span>
                  </div>
                  <CopyBtn value={company.owner_email} />
                </div>
                {company.owner_phone && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-500" />
                      <span className="text-xs text-white font-work">{company.owner_phone}</span>
                    </div>
                    <CopyBtn value={company.owner_phone} />
                  </div>
                )}
                <div className="flex items-center gap-2 px-4 py-3">
                  <Calendar size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-400 font-tajawal">
                    انضم {new Date(company.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-slate-500" />
                  <span className="text-xs text-slate-400 font-tajawal">استخدام الرسائل</span>
                </div>
                <span className={`text-xs font-bold font-work ${isRed ? 'text-red-400' : 'text-slate-300'}`}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }}
                  style={{ background: isRed ? 'linear-gradient(90deg,#EF4444,#DC2626)' : `linear-gradient(90deg,${plan.color},${plan.color}aa)` }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-tajawal">
                <span>{used.toLocaleString('ar')} مستخدم</span>
                <span>من {limit.toLocaleString('ar')}</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {[
                { icon: Users2,       value: company.monthly_leads,       label: 'عملاء' },
                { icon: Zap,          value: company.automations_count,   label: 'أتمتة' },
                { icon: TrendingUp,   value: company.monthly_messages,    label: 'رسائل' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="p-3 rounded-xl text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon size={13} className="text-slate-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-white font-work">{value ?? 0}</p>
                  <p className="text-xs text-slate-500 font-tajawal">{label}</p>
                </div>
              ))}
            </div>

            {company.business_type === 'car_wash' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,191,255,0.24)' }}>
                <div className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'rgba(0,191,255,0.08)', borderBottom: '1px solid rgba(0,191,255,0.14)' }}>
                  <QrCode size={12} className="text-cyan-400" />
                  <p className="text-xs text-cyan-300 font-tajawal">رابط التسجيل الذاتي للعميل النهائي</p>
                </div>
                <div className="p-4 space-y-3">
                  {checkinUrl ? (
                    <>
                      <div className="flex items-start gap-3">
                        <img src={checkinQrUrl} alt="QR" className="h-24 w-24 rounded-lg bg-white p-1" />
                        <div className="min-w-0 flex-1">
                          <code className="block break-all rounded-lg px-3 py-2 text-[10px] text-cyan-200 font-mono" dir="ltr" style={{ background: 'rgba(255,255,255,0.05)' }}>{checkinUrl}</code>
                          <div className="mt-2 flex gap-2">
                            <CopyBtn value={checkinUrl} />
                            <a href={checkinUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-slate-300 hover:bg-white/10">
                              <ExternalLink size={12} />
                              فتح
                            </a>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-slate-500 font-tajawal">لا يوجد webhook_token لهذه الشركة. أضف token قبل طباعة QR.</p>
                  )}
                </div>
              </div>
            )}

            {/* Car wash message templates (admin only) */}
            {company.business_type === 'car_wash' && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={11} className="text-slate-500" />
                    <p className="text-xs text-slate-500 font-tajawal">رسائل الواتساب</p>
                  </div>
                  <button onClick={saveCwTemplates} disabled={savingTmpl}
                    className="flex items-center gap-1.5 text-xs font-bold font-cairo px-3 py-1 rounded-lg cursor-pointer transition-all"
                    style={{ background: tmplSaved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.1)', color: tmplSaved ? '#10B981' : '#22D3EE', border: `1px solid ${tmplSaved ? 'rgba(16,185,129,0.2)' : 'rgba(34,211,238,0.2)'}` }}>
                    {savingTmpl ? <Loader2 size={10} className="animate-spin" /> : tmplSaved ? <Check size={10} /> : null}
                    {tmplSaved ? 'تم الحفظ' : 'حفظ'}
                  </button>
                </div>
                <div className="p-3 space-y-4" dir="rtl">
                  {CW_TEMPLATE_DEFS.map(def => (
                    <div key={def.key}>
                      <p className="text-xs font-bold font-cairo mb-1.5" style={{ color: def.color }}>{def.label}</p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {def.vars.map(v => (
                          <button key={v} onClick={() => setCwTemplates(p => ({ ...p, [def.key]: (p[def.key] ?? '') + v }))}
                            className="text-xs font-tajawal px-2 py-0.5 rounded cursor-pointer"
                            style={{ border: `1px solid ${def.color}33`, background: `${def.color}11`, color: def.color }}>
                            {v}
                          </button>
                        ))}
                        <button onClick={() => setCwTemplates(p => ({ ...p, [def.key]: CW_DEFAULT_TEMPLATES[def.key] }))}
                          className="flex items-center gap-1 text-xs font-tajawal px-2 py-0.5 rounded cursor-pointer ml-auto"
                          style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#475569' }}>
                          <RotateCcw size={9} /> افتراضي
                        </button>
                      </div>
                      <textarea
                        value={cwTemplates[def.key] ?? ''}
                        onChange={e => setCwTemplates(p => ({ ...p, [def.key]: e.target.value }))}
                        rows={3} dir="auto"
                        className="w-full text-xs font-tajawal rounded-lg outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '8px 10px', color: '#E2E8F0', lineHeight: 1.8, boxSizing: 'border-box' }}
                      />
                      <pre className="text-xs font-tajawal mt-1 px-2"
                        style={{ color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0 }}>
                        {cwRenderPreview(cwTemplates[def.key] ?? '')}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Change plan */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="px-4 py-2.5 text-xs text-slate-500 font-tajawal"
                style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                تغيير الباقة
              </p>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.entries(PLAN_CONFIG) as [Plan, typeof PLAN_CONFIG[Plan]][]).map(([id, p]) => {
                  const active = activePlan === id
                  return (
                    <button key={id} onClick={() => { setActivePlan(id); setPlanChanged(id !== company.plan) }}
                      className="relative py-2.5 px-1 rounded-lg text-center transition-all cursor-pointer"
                      style={{
                        border: `1px solid ${active ? p.color + '60' : 'rgba(255,255,255,0.07)'}`,
                        background: active ? `${p.color}12` : 'transparent',
                      }}>
                      {id === company.plan && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: p.color }}>
                          <Check size={8} color="#000" />
                        </div>
                      )}
                      <p className="text-xs font-bold font-work mb-0.5" style={{ color: p.color }}>{p.label}</p>
                      <p className="text-xs text-slate-500 font-tajawal">{(p.limit / 1000).toFixed(0)}K</p>
                    </button>
                  )
                })}
              </div>
              {planChanged && (
                <div className="px-3 pb-3">
                  <button onClick={savePlan} disabled={saving}
                    className="w-full py-2 rounded-lg text-xs font-bold font-cairo flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
                    style={{ background: PLAN_CONFIG[activePlan].color, color: '#000' }}>
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    حفظ الباقة الجديدة
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={toggleStatus} disabled={saving}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-cairo cursor-pointer transition-all hover:opacity-90"
                style={{
                  border: `1px solid ${company.status === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  background: company.status === 'active' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                  color: company.status === 'active' ? '#EF4444' : '#10B981',
                }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> :
                  company.status === 'active' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                {company.status === 'active' ? 'تعليق الحساب' : 'تفعيل الحساب'}
              </button>
              <button
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-cairo cursor-pointer transition-all hover:opacity-90"
                style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#F59E0B' }}
                onClick={() => { navigator.clipboard.writeText(company.owner_email); setFeedback('تم نسخ البريد ✅'); setTimeout(() => setFeedback(''), 1500) }}>
                <Mail size={13} />
                نسخ الإيميل
              </button>
            </div>

            {/* Warning if near limit */}
            {pct >= 85 && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-400 font-cairo">تنبيه استخدام الرسائل</p>
                  <p className="text-xs text-red-400/70 font-tajawal mt-0.5">
                    استخدم {pct}% من الحد الشهري — فكّر في ترقية الباقة
                  </p>
                </div>
              </div>
            )}

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-xl text-center text-sm font-tajawal text-emerald-400"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  )
}
