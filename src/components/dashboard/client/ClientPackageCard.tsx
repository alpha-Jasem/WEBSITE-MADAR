import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, MessageSquare, RefreshCw, ArrowUpRight, Stethoscope, Car, Building2, Briefcase, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

const PLAN_CONFIG = {
  starter: {
    label: 'ابتدائي',
    price: '299',
    color: '#06B6D4',
    glow: 'rgba(6,182,212,0.15)',
    border: 'rgba(6,182,212,0.25)',
    features: ['1,000 رسالة / شهر', 'واتساب أوتوماتيك', 'CRM أساسي', 'تقارير شهرية', 'دعم بالبريد الإلكتروني'],
  },
  growth: {
    label: 'نمو',
    price: '799',
    color: '#4F6EF7',
    glow: 'rgba(79,110,247,0.15)',
    border: 'rgba(79,110,247,0.25)',
    features: ['4,000 رسالة / شهر', 'واتساب + حجز ذكي', 'CRM متقدم + CRM leads', 'ذكاء اصطناعي (Claude AI)', 'تذكيرات تلقائية', 'تقارير أسبوعية', 'دعم أولوية'],
  },
  enterprise: {
    label: 'مؤسسي',
    price: '1,999',
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.15)',
    border: 'rgba(245,158,11,0.25)',
    features: ['10,000 رسالة / شهر', 'كل مميزات نمو', 'متعدد الوكلاء', 'API مخصص', 'لوحة تحليلات متقدمة', 'متابعة ما بعد الخدمة', 'دعم مباشر 24/7'],
  },
}

const BUSINESS_ICONS: Record<string, React.ElementType> = {
  clinic: Stethoscope,
  car_wash: Car,
  real_estate: Building2,
  other: Briefcase,
}

const BUSINESS_LABELS: Record<string, string> = {
  clinic: 'عيادة طبية',
  car_wash: 'مغسلة سيارات',
  real_estate: 'شركة عقارية',
  other: 'أخرى',
}

interface Props {
  company: Company
}

function UpgradeModal({ company, onClose }: { company: Company; onClose: () => void }) {
  const currentPlan = company.plan ?? 'starter'
  const [requested, setRequested] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const requestUpgrade = async (targetPlan: string) => {
    if (targetPlan === currentPlan) return
    setLoading(true)
    setRequested(targetPlan)
    await supabase.from('crm_leads').upsert({
      company_id: company.id,
      full_name: company.owner_name ?? company.name,
      stage: 'upgrade_requested',
      notes: `طلب ترقية من ${PLAN_CONFIG[currentPlan as keyof typeof PLAN_CONFIG]?.label} إلى ${PLAN_CONFIG[targetPlan as keyof typeof PLAN_CONFIG]?.label}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl p-6 relative"
        style={{ background: '#0C0D14', border: '1px solid rgba(255,255,255,0.1)' }}
        dir="rtl">

        <button onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] cursor-pointer transition-all">
          <X size={16} />
        </button>

        {done ? (
          <div className="py-8 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: '#10B981' }} />
            <h2 className="text-xl font-bold text-white font-cairo mb-2">تم استلام طلبك!</h2>
            <p className="text-slate-400 font-tajawal text-sm">سيتواصل معك فريق MADAR قريباً لإتمام الترقية</p>
            <button onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl text-sm font-bold text-white font-cairo cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)' }}>
              حسناً
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white font-cairo mb-1">ترقية الباقة</h2>
            <p className="text-sm text-slate-500 font-tajawal mb-6">اختر الباقة التي تناسبك</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.entries(PLAN_CONFIG) as [string, typeof PLAN_CONFIG.starter][]).map(([key, plan]) => {
                const isCurrent = key === currentPlan
                return (
                  <div key={key} className="rounded-xl p-4 flex flex-col gap-3"
                    style={{
                      background: isCurrent ? `${plan.color}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isCurrent ? plan.border : 'rgba(255,255,255,0.07)'}`,
                    }}>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-widest font-work"
                          style={{ color: plan.color }}>{plan.label}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-tajawal"
                            style={{ background: `${plan.color}20`, color: plan.color }}>حالي</span>
                        )}
                      </div>
                      <p className="text-lg font-bold text-white font-work">
                        {plan.price} <span className="text-xs text-slate-500 font-tajawal">ر.س/شهر</span>
                      </p>
                    </div>

                    <ul className="space-y-1.5 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check size={11} className="mt-0.5 flex-shrink-0" style={{ color: plan.color }} />
                          <span className="text-xs text-slate-400 font-tajawal">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => requestUpgrade(key)}
                      disabled={isCurrent || loading}
                      className="w-full py-2 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={isCurrent
                        ? { background: `${plan.color}20`, color: plan.color }
                        : { background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`, color: '#fff' }}>
                      {loading && requested === key ? 'جاري الإرسال...' : isCurrent ? 'باقتك الحالية' : 'اطلب الترقية'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

export const ClientPackageCard = ({ company }: Props) => {
  const [showUpgrade, setShowUpgrade] = useState(false)
  const plan = PLAN_CONFIG[company.plan as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.starter
  const used = company.messages_used ?? 0
  const limit = company.message_limit ?? 1000
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const isWarning = pct >= 85
  const isNearLimit = pct >= 95

  const resetDate = company.plan_reset_at
    ? new Date(company.plan_reset_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const BusinessIcon = BUSINESS_ICONS[company.business_type ?? 'other'] ?? Briefcase

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${plan.border}`, boxShadow: `0 0 40px ${plan.glow}` }}
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${plan.color}, ${plan.color}88)` }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold tracking-widest uppercase font-work px-2.5 py-1 rounded-full"
                  style={{ color: plan.color, background: `${plan.color}18`, border: `1px solid ${plan.border}` }}>
                  {plan.label}
                </span>
                <span className="text-xs text-slate-600 font-tajawal">الباقة الحالية</span>
              </div>
              <h2 className="text-xl font-bold text-white font-cairo">{company.name}</h2>
              <p className="text-xs text-slate-500 font-tajawal mt-0.5">{company.owner_name}</p>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                style={{ background: `${plan.color}12`, border: `1px solid ${plan.border}` }}>
                <BusinessIcon size={13} style={{ color: plan.color }} />
                <span className="text-xs font-tajawal" style={{ color: plan.color }}>
                  {BUSINESS_LABELS[company.business_type ?? 'other']}
                </span>
              </div>
              <span className="text-lg font-bold font-work" style={{ color: plan.color }}>
                {plan.price} <span className="text-xs text-slate-500 font-tajawal">ر.س / شهر</span>
              </span>
            </div>
          </div>

          {/* Usage bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare size={13} className="text-slate-500" />
                <span className="text-sm font-tajawal text-white">استخدام الرسائل</span>
              </div>
              <span className={`text-sm font-bold font-work ${isNearLimit ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-slate-300'}`}>
                {pct}%
              </span>
            </div>

            <div className="h-3 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  background: isNearLimit
                    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                    : isWarning
                      ? 'linear-gradient(90deg, #F59E0B, #EF4444)'
                      : `linear-gradient(90deg, ${plan.color}, ${plan.color}bb)`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-tajawal">
                {used.toLocaleString('ar')} رسالة مستخدمة
              </span>
              <span className="text-xs text-slate-500 font-tajawal">
                من {limit.toLocaleString('ar')}
              </span>
            </div>

            {isNearLimit && (
              <p className="text-xs text-red-400 font-tajawal mt-2 text-center">
                ⚠️ وصلت لحد الباقة تقريباً — تواصل معنا للترقية
              </p>
            )}
            {isWarning && !isNearLimit && (
              <p className="text-xs text-yellow-400 font-tajawal mt-2 text-center">
                تقترب من الحد الشهري — فكر في الترقية
              </p>
            )}
          </div>

          {/* Features + reset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 font-tajawal mb-2.5">مميزات الباقة</p>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <Check size={12} style={{ color: plan.color, flexShrink: 0 }} />
                    <span className="text-xs text-slate-300 font-tajawal">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-between">
              {resetDate && (
                <div className="flex items-start gap-2 p-3 rounded-xl mb-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <RefreshCw size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 font-tajawal">تجديد الباقة</p>
                    <p className="text-xs text-white font-tajawal mt-0.5">{resetDate}</p>
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowUpgrade(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`, color: '#fff' }}
              >
                <ArrowUpRight size={15} />
                ترقية الباقة
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showUpgrade && <UpgradeModal company={company} onClose={() => setShowUpgrade(false)} />}
      </AnimatePresence>
    </>
  )
}
