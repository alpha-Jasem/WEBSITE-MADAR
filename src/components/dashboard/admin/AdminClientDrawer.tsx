import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, Car, Stethoscope, Briefcase, Check, Copy,
  Mail, Phone, Calendar, Zap, Users2, MessageSquare,
  ShieldOff, ShieldCheck, TrendingUp, AlertTriangle, Loader2,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company, Plan, CompanyStatus } from '../../../types'

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

  const [saving, setSaving] = useState(false)
  const [activePlan, setActivePlan] = useState<Plan>(company.plan)
  const [planChanged, setPlanChanged] = useState(false)
  const [feedback, setFeedback] = useState('')

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
