import { useState, useEffect } from 'react'
import { Check, Lock, Sparkles, Crown, Zap, Loader2, CheckCircle2, AlertCircle, CreditCard, Wallet, Repeat, Smartphone } from 'lucide-react'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { supabase } from '../../../lib/supabase'
import { MADAR_WHATSAPP_NUMBER } from '../../../lib/constants'

const PLANS = [
  {
    id: 'starter' as const,
    label: 'Starter',
    labelAr: 'تشغيل أساسي',
    price: '299',
    badge: null,
    icon: Zap,
    color: '#06B6D4',
    border: 'rgba(6,182,212,0.3)',
    glow: 'rgba(6,182,212,0.1)',
    features: [
      { text: 'لوحة تشغيل سيارات أساسية', included: true },
      { text: 'إضافة السيارات من الموظف', included: true },
      { text: 'كاش ونقطة بيع عند التسليم', included: true },
      { text: 'رقم تذكرة داخلي لكل سيارة', included: true },
      { text: 'برنامج الولاء الأساسي', included: true },
      { text: 'إشعارات واتساب "سيارتك جاهزة"', included: true },
      { text: 'إدارة الموظفين الأساسية', included: true },
      { text: 'إيرادات اليوم', included: true },
      { text: 'QR تسجيل ذاتي للعميل', included: false },
      { text: 'تقارير مالية متقدمة', included: false },
    ],
  },
  {
    id: 'growth' as const,
    label: 'Pro',
    labelAr: 'تشغيل ذكي',
    price: '799',
    badge: 'الأكثر شعبية 🔥',
    icon: Sparkles,
    color: '#6366F1',
    border: '#6366F1',
    glow: 'rgba(99,102,241,0.2)',
    features: [
      { text: 'كل مميزات Starter', included: true },
      { text: 'QR تسجيل ذاتي سريع للعميل', included: true },
      { text: 'صفحة حالة Live للعميل', included: true },
      { text: 'رقم تذكرة واضح مثل A-014', included: true },
      { text: 'تتبع المصاريف والربح الصافي', included: true },
      { text: 'أداء الموظفين والعمولات', included: true },
      { text: 'إغلاق يومي مع مطابقة الكاش', included: true },
      { text: 'رسوم بيانية للإيرادات', included: true },
      { text: 'تقارير PDF / CSV', included: true },
      { text: 'الاشتراكات والمحفظة الرقمية', included: false },
      { text: 'تعدد الفروع', included: false },
    ],
  },
  {
    id: 'enterprise' as const,
    label: 'Premium',
    labelAr: 'مغاسل متقدمة',
    price: '1,999',
    badge: '👑 Enterprise',
    icon: Crown,
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.5)',
    glow: 'rgba(245,158,11,0.15)',
    features: [
      { text: 'كل مميزات Pro', included: true },
      { text: 'تعدد الفروع', included: true },
      { text: 'Admin Health لكل الفروع', included: true },
      { text: 'صلاحيات موظفين متقدمة', included: true },
      { text: 'حد رسائل أعلى', included: true },
      { text: 'رؤى AI متقدمة', included: true },
      { text: 'تقارير مخصصة', included: true },
      { text: 'API مخصص', included: true },
      { text: 'دعم أولوية 24/7', included: true },
      { text: 'White Label اختياري', included: true },
      { text: 'إضافات المحفظة والاشتراكات حسب التفعيل', included: true },
    ],
  },
]

const ADD_ONS = [
  {
    key: 'wallet',
    icon: Wallet,
    title: 'المحفظة الرقمية',
    desc: 'رصيد للعميل النهائي يخصم منه تلقائياً عند الزيارة.',
    color: '#10B981',
  },
  {
    key: 'memberships',
    icon: Repeat,
    title: 'اشتراكات العملاء الشهرية',
    desc: 'باقات 4 أو 8 غسلات أو Unlimited مع تذكير واتساب.',
    color: '#F59E0B',
  },
  {
    key: 'online_payments',
    icon: Smartphone,
    title: 'Apple Pay / Google Pay',
    desc: 'دفع مسبق عبر مزود الدفع وربطه بمحفظة العميل.',
    color: '#6366F1',
  },
]

const PLAN_LABEL_MAP: Record<string, string> = {
  starter: 'Starter',
  growth: 'Pro',
  enterprise: 'Premium',
}

const UNLOCKED_BY_PLAN: Record<string, string[]> = {
  growth: ['التسجيل الذاتي QR', 'صفحة حالة Live للعميل', 'تقارير مالية وVAT', 'إغلاق اليوم', 'أداء الموظفين'],
  enterprise: ['تعدد الفروع', 'صلاحيات متقدمة', 'رؤى AI', 'تقارير مخصصة', 'دعم أولوية'],
}

function buildWhatsAppUrl(companyName: string, currentPlan: string, requestedPlan: string) {
  const msg = `أهلاً، أود ترقية باقتي في Madar OS.\n\nالمنشأة: ${companyName}\nالباقة الحالية: ${currentPlan}\nالباقة المطلوبة: ${requestedPlan}\n\nأرجو المساعدة في الترقية.`
  return `https://wa.me/${MADAR_WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export const PricingPage = () => {
  const { company, companyId } = useClientCompany()
  const currentPlan = company?.plan ?? 'starter'
  const currentLabel = PLAN_LABEL_MAP[currentPlan] ?? 'Starter'
  const companyName = company?.name ?? 'منشأتي'
  const isTrial = company?.status === 'trial'
  const isSubscribed = company?.status === 'active'
  const featureFlags = ((company?.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
  const visibleAddons = ADD_ONS.filter(addon => Boolean(featureFlags[addon.key]))
  const trialDaysLeft = company?.status === 'trial' && company?.plan_reset_at
    ? Math.max(0, Math.ceil((new Date(company.plan_reset_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null

  const planOrder = ['starter', 'growth', 'enterprise']
  const currentIndex = planOrder.indexOf(currentPlan)

  const [payingPlan, setPayingPlan] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | null>(null)
  const [successPlan, setSuccessPlan] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment_success') === '1') {
      setPaymentStatus('success')
      setSuccessPlan(params.get('plan'))
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('payment_failed') === '1') {
      setPaymentStatus('failed')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handlePay = async (planId: string) => {
    if (!companyId) return
    setPayingPlan(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-moyasar-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ plan: planId, company_id: companyId }),
        }
      )
      const data = await resp.json()
      if (data.payment_url) {
        window.location.href = data.payment_url
      } else {
        // Fallback to WhatsApp if payment gateway not configured
        const waUrl = buildWhatsAppUrl(companyName, currentLabel, PLAN_LABEL_MAP[planId] ?? planId)
        window.open(waUrl, '_blank')
        setPayingPlan(null)
      }
    } catch {
      setPayingPlan(null)
    }
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Payment status banners */}
      {paymentStatus === 'success' && (
        <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(0,191,255,0.08))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CheckCircle2 size={22} color="#10B981" style={{ marginTop: 2 }} />
          <div className="flex-1">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#10B981', fontFamily: 'Cairo, sans-serif', margin: 0 }}>
              تم الدفع بنجاح
            </p>
            <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
              تم ترقية باقتك إلى {successPlan ? PLAN_LABEL_MAP[successPlan] ?? successPlan : ''}. هذه أهم المميزات التي أصبحت متاحة الآن:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(UNLOCKED_BY_PLAN[successPlan || ''] || ['مميزات الباقة الجديدة']).map(item => (
                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 font-tajawal">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {paymentStatus === 'failed' && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} color="#EF4444" />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', fontFamily: 'Cairo, sans-serif', margin: 0 }}>لم يتم إتمام الدفع</p>
            <p style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
              يمكنك المحاولة مجدداً أو التواصل معنا عبر واتساب.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-tajawal mb-4" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
          <Sparkles size={12} /> {isTrial ? `تجربتك الحالية: ${currentLabel}` : `باقتك الحالية: ${currentLabel}`}
        </div>
        <h1 className="text-3xl font-bold text-slate-900 font-cairo mb-3">باقات مدار للمغاسل</h1>
        <p className="text-slate-400 font-tajawal text-base max-w-lg mx-auto leading-relaxed">
          اختر مستوى التشغيل المناسب لمغسلتك. ابدأ بالكاش ونقطة البيع، ثم فعّل QR والتقارير والإضافات المتقدمة عند الحاجة.
        </p>
        {trialDaysLeft !== null && (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-sky-100 bg-white px-5 py-4 text-right shadow-sm">
            <p className="text-sm font-bold text-slate-900 font-cairo">أنت الآن في تجربة Pro المجانية</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">
              باقي {trialDaysLeft} يوم على التجربة. عند الدفع تتحول الباقة إلى اشتراك نشط وتبقى إعدادات المغسلة كما هي.
            </p>
          </div>
        )}
        {isSubscribed && (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-right shadow-sm">
            <p className="text-sm font-bold text-emerald-800 font-cairo">اشتراكك مفعل</p>
            <p className="mt-1 text-xs leading-5 text-emerald-700 font-tajawal">
              تم تفعيل الاشتراك على باقة {currentLabel}. تم إيقاف الدفع من هذه الصفحة حتى لا يتم خصم اشتراك ثاني بالغلط.
            </p>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan, idx) => {
          const isCurrent = plan.id === currentPlan
          const isCurrentPaid = isCurrent && !isTrial
          const canActivateTrialPlan = isTrial
          const isTrialCurrent = isCurrent && isTrial
          const isUpgrade = !isSubscribed && idx > currentIndex
          const isDowngrade = idx < currentIndex
          const isPro = plan.id === 'growth'

          return (
            <div
              key={plan.id}
              style={{
                background: isPro ? `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))` : '#F8FAFC',
                border: `1px solid ${(isCurrentPaid || isTrialCurrent) ? plan.color : isPro ? plan.border : '#E2E8F0'}`,
                borderRadius: 20,
                padding: '28px 24px',
                position: 'relative',
                boxShadow: isPro ? `0 0 40px ${plan.glow}` : (isCurrentPaid || isTrialCurrent) ? `0 0 20px ${plan.glow}` : 'none',
                transform: isPro ? 'scale(1.03)' : 'scale(1)',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: isPro ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : `rgba(245,158,11,0.2)`,
                  border: isPro ? 'none' : '1px solid rgba(245,158,11,0.4)',
                  color: isPro ? '#fff' : '#F59E0B',
                  padding: '4px 14px', borderRadius: 99,
                  fontSize: 11, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              {(isCurrentPaid || isTrialCurrent) && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: '#F4F6FB',
                  padding: '4px 14px', borderRadius: 99,
                  fontSize: 11, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {isTrialCurrent ? 'تجربة حالية' : 'باقتك الحالية ✓'}
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: 42, height: 42, borderRadius: 12, background: plan.color + '20', border: `1px solid ${plan.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <plan.icon size={20} color={plan.color} />
                </div>
                <div>
                  <p style={{ color: plan.color, fontSize: 13, fontWeight: 700, fontFamily: 'Cairo, sans-serif', margin: 0 }}>{plan.label}</p>
                  <p style={{ color: '#475569', fontSize: 11, fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{plan.labelAr}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', fontFamily: 'Sora, sans-serif' }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>ر.س / شهر</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2.5 mb-7">
                {plan.features.map((feat, fi) => (
                  <div key={fi} className="flex items-start gap-2.5">
                    {feat.included
                      ? <Check size={14} style={{ color: plan.color, flexShrink: 0, marginTop: 2 }} />
                      : <Lock size={12} style={{ color: '#334155', flexShrink: 0, marginTop: 3 }} />
                    }
                    <span style={{ fontSize: 12, color: feat.included ? '#334155' : '#94A3B8', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.5 }}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isSubscribed ? (
                <div style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: '#FFFFFF', border: '1px solid #BBF7D0', color: '#047857', fontSize: 13, fontFamily: 'Tajawal, sans-serif', textAlign: 'center', fontWeight: 700 }}>
                  {isCurrent ? 'تم الاشتراك في هذه الباقة ✓' : 'الاشتراك مفعل بالفعل'}
                </div>
              ) : isCurrentPaid ? (
                <div style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#475569', fontSize: 13, fontFamily: 'Tajawal, sans-serif', textAlign: 'center', fontWeight: 600 }}>
                  باقتك الحالية ✓
                </div>
              ) : (isUpgrade || canActivateTrialPlan) ? (
                <button
                  onClick={() => handlePay(plan.id)}
                  disabled={payingPlan !== null}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '11px 0', borderRadius: 12, border: isPro ? 'none' : `1px solid ${plan.border}`,
                    background: isPro ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : `rgba(${plan.id === 'enterprise' ? '245,158,11' : '6,182,212'},0.15)`,
                    color: isPro ? '#fff' : plan.color,
                    fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
                    boxShadow: isPro ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
                    cursor: payingPlan !== null ? 'not-allowed' : 'pointer',
                    opacity: payingPlan !== null && payingPlan !== plan.id ? 0.5 : 1,
                  }}
                >
                  {payingPlan === plan.id
                    ? <><Loader2 size={14} className="animate-spin" /> جاري التوجيه...</>
                    : <><CreditCard size={14} /> {canActivateTrialPlan ? 'ثبّت الاشتراك الآن' : 'ادفع الآن'} — {plan.price} ر.س/شهر</>
                  }
                </button>
              ) : (
                <div style={{ width: '100%', padding: '11px 0', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', fontSize: 13, fontFamily: 'Tajawal, sans-serif', textAlign: 'center' }}>
                  {isDowngrade ? 'باقة أقل' : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {visibleAddons.length > 0 && (
        <div className="rounded-3xl p-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="mb-4 flex flex-col gap-1 text-right">
            <p className="text-sm font-bold text-slate-900 font-cairo">إضافات مفعلة لحسابك</p>
            <p className="text-xs text-slate-500 font-tajawal">هذه تظهر فقط للحسابات التي فعّل لها صاحب النظام إضافات مدفوعة من لوحة الإدارة.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {visibleAddons.map(addon => (
              <div key={addon.title} className="rounded-2xl p-4" style={{ background: '#FFFFFF', border: `1px solid ${addon.color}33` }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${addon.color}18`, border: `1px solid ${addon.color}33` }}>
                    <addon.icon size={18} style={{ color: addon.color }} />
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold font-tajawal" style={{ color: addon.color, background: `${addon.color}12` }}>
                    مفعلة
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 font-cairo">{addon.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 font-tajawal">{addon.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom trust section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[
          { icon: '🚀', title: 'إعداد فوري', desc: 'فريقنا يعدّ نظامك خلال 24 ساعة' },
          { icon: '🔒', title: 'بدون عقود', desc: 'يمكنك الإلغاء في أي وقت' },
          { icon: '💬', title: 'دعم مباشر', desc: 'على واتساب — طوال أوقات العمل' },
        ].map(item => (
          <div key={item.title} className="p-4 rounded-2xl text-center" style={{ background: '#FAFAFA', border: '1px solid #E2E8F0' }}>
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="text-sm font-bold text-slate-900 font-cairo mb-1">{item.title}</p>
            <p className="text-xs text-slate-500 font-tajawal">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
