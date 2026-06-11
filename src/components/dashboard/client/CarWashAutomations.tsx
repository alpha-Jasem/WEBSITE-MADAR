import { useEffect, useState } from 'react'
import { Car, Star, ClipboardCheck, Receipt, MessageSquare, Users2, Clock, ChevronDown, ChevronUp, Check, Loader2, QrCode, ShieldCheck, Send } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { ClientInsightPanel, ClientPageHeader, ClientPanel } from './ClientUI'

// ─── Static automation definitions ───────────────────────────────────────────

type AutomationKey =
  | 'car_ready' | 'delivery_receipt' | 'loyalty_milestone' | 'daily_closing'
  | 'daily_reactivation'

interface AutomationDef {
  key: AutomationKey
  label: string
  description: string
  whenLabel: string
  section: 'webhook' | 'scheduled'
  icon: React.ElementType
  color: string
}

const DEFS: AutomationDef[] = [
  // ── Webhook-based ──────────────────────────────────────────────────────
  {
    key: 'car_ready', label: 'إشعار السيارة جاهزة', section: 'webhook',
    icon: Car, color: '#22D3EE',
    description: 'يُرسل للعميل فور وصول سيارته لحالة "جاهزة" في لوحة التشغيل',
    whenLabel: 'عند الضغط على "جاهزة"',
  },
  {
    key: 'delivery_receipt', label: 'إيصال التسليم والمتابعة', section: 'webhook',
    icon: Receipt, color: '#10B981',
    description: 'يُرسل الإيصال مع رسالة شكر، متابعة رضا العميل، ورابط تقييم Google إذا كان متوفراً',
    whenLabel: 'عند تأكيد التسليم والدفع',
  },
  {
    key: 'loyalty_milestone', label: 'إنجاز الولاء', section: 'webhook',
    icon: Star, color: '#F59E0B',
    description: 'يُرسل تهنئة للعميل عند اكتمال 5 غسلات واستحقاقه غسلة مجانية',
    whenLabel: 'عند اكتمال 5 غسلات',
  },
  {
    key: 'daily_closing', label: 'ملخص اليوم للمالك', section: 'webhook',
    icon: ClipboardCheck, color: '#8B5CF6',
    description: 'يُرسل ملخص المبيعات والأرباح يومياً للمالك عند إغلاق اليوم',
    whenLabel: 'عند إغلاق اليوم',
  },
  // ── Scheduled ─────────────────────────────────────────────────────────
  {
    key: 'daily_reactivation', label: 'تنشيط العملاء', section: 'scheduled',
    icon: Users2, color: '#6366F1',
    description: 'يُرسل رسالة يومية للعملاء غير النشطين لاستعادتهم',
    whenLabel: 'يومياً الساعة 10ص',
  },
]

const SECTION_STYLE = {
  background: '#F8FAFC',
  border: '1px solid #E2E8F0',
  borderRadius: 18,
  padding: '20px 22px',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CarWashAutomations() {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const { can, planLabel } = usePlanGate()

  // State preserves all DB fields (including admin-set delay_hours) — client only edits `enabled`
  const [automations, setAutomations] = useState<Record<string, { enabled: boolean; delay_hours?: number }>>(
    () => Object.fromEntries(DEFS.map(d => [d.key, { enabled: true }]))
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ deliveries: number; reviews: number }>({ deliveries: 0, reviews: 0 })
  const [selfCheckin, setSelfCheckin] = useState({ enabled: true, approval_required: true, anti_spam_minutes: 10 })

  useEffect(() => {
    if (authLoading || !companyId) return
    const load = async () => {
      const [{ data: co }, { data: visits }] = await Promise.all([
        supabase.from('companies')
          .select('cw_automations')
          .eq('id', companyId).single(),
        supabase.from('cw_visits')
          .select('id, review_request_sent')
          .eq('company_id', companyId)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])

      if (co) {
        const saved = (co as any).cw_automations || {}
        setAutomations(prev => {
          const merged: typeof prev = { ...prev }
          for (const key of Object.keys(merged)) {
            if (saved[key]) merged[key] = { ...merged[key], ...saved[key] }
          }
          return merged
        })
        if (saved.self_checkin) {
          setSelfCheckin(prev => ({ ...prev, ...saved.self_checkin }))
        }
      }

      if (visits) {
        setStats({
          deliveries: visits.length,
          reviews: visits.filter((v: any) => v.review_request_sent).length,
        })
      }
      setLoading(false)
    }
    load()
  }, [authLoading, companyId])


  const webhookDefs = DEFS.filter(d => d.section === 'webhook')
  const scheduledDefs = DEFS.filter(d => d.section === 'scheduled')

  const getStats = (key: string) => {
    if (key === 'delivery_receipt') return { label: 'تسليم هذا الشهر', value: stats.deliveries }
    return null
  }
  const enabledCount = DEFS.filter(def => automations[def.key]?.enabled !== false).length
  const disabledCount = DEFS.length - enabledCount
  const automationInsights = [
    { title: 'رسائل واتساب الأساسية', description: `${enabledCount} من ${DEFS.length} رسائل تلقائية مفعلة. هذه الرسائل تقلل متابعة الموظف اليدوية.`, tone: disabledCount > 2 ? 'amber' as const : 'green' as const },
    stats.deliveries > 0
      ? { title: 'إيصالات التسليم تعمل مع التشغيل', description: `${stats.deliveries} عملية تسليم هذا الشهر، تأكد أن إيصال التسليم مفعل دائماً.`, tone: 'blue' as const }
      : { title: 'اختبر أول تسليم', description: 'بعد أول تسليم ستظهر بيانات الإيصالات والتقييمات هنا.', tone: 'slate' as const },
    { title: 'التقييم والمتابعة مدموجة', description: 'رسالة التسليم تجمع الإيصال، الشكر، متابعة الرضا، ورابط التقييم بدون إزعاج العميل برسائل إضافية.', tone: 'blue' as const },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <ClientPageHeader
        eyebrow="مركز واتساب"
        title="واتساب والرسائل"
        description="راجع رسائل العملاء الأساسية، حالة واتساب، ورابط التسجيل الذاتي بدون إعدادات تقنية مربكة."
      />

      <ClientInsightPanel
        title="حالة رسائل العملاء"
        description="خلاصة عملية لصاحب المغسلة: ما الذي يعمل، وما الذي يحتاج انتباه سريع."
        items={automationInsights}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <StatusTile
          icon={MessageSquare}
          title="حالة واتساب"
          value="جاهز للإرسال"
          hint="الإرسال يعتمد على إعدادات واتساب في النظام."
          color="#10B981"
        />
        <StatusTile
          icon={ShieldCheck}
          title="مسؤولية الحملات"
          value="إرسال يدوي فقط"
          hint="أي عرض أو خصم يكتبه صاحب المغسلة بنفسه قبل الإرسال."
          color="#6366F1"
        />
      </div>

      {/* Automatic messages */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D3EE' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            رسائل مرتبطة بالتشغيل
          </span>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— تُرسل عند حركة السيارة داخل لوحة التشغيل</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {webhookDefs.map(def => (
            <AutomationCard key={def.key} def={def}
              enabled={automations[def.key]?.enabled ?? true}
              expanded={expanded === def.key}
              onExpand={() => setExpanded(expanded === def.key ? null : def.key)}
              stat={getStats(def.key)}
            />
          ))}
        </div>
      </div>

      {/* Scheduled customer care */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            رسائل عناية تلقائية
          </span>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— تنشيط العملاء الغائبين فقط، وباقي المتابعة مدموجة مع التسليم</span>
          {!can.scheduledAutomations && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#818CF8', fontFamily: 'Sora, sans-serif', fontWeight: 700, marginRight: 4 }}>
              Pro
            </span>
          )}
        </div>
        <FeatureLock
          locked={!can.scheduledAutomations}
          requiredPlan="pro"
          featureName="رسائل العناية التلقائية"
          benefit="فعّل رسائل إعادة التنشيط، طلب التقييم، والمتابعة التلقائية — ووفّر ساعات من العمل اليدوي"
          companyName={company?.name}
          currentPlan={planLabel}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scheduledDefs.map(def => (
              <AutomationCard key={def.key} def={def}
                enabled={automations[def.key]?.enabled ?? true}
                expanded={expanded === def.key}
                onExpand={() => setExpanded(expanded === def.key ? null : def.key)}
                stat={getStats(def.key)}
              />
            ))}
          </div>
        </FeatureLock>
      </div>

      {/* Self Check-in Settings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0EA5E9' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            التسجيل الذاتي عبر QR
          </span>
        </div>
        <ClientPanel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: selfCheckin.enabled ? 'rgba(14,165,233,0.12)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <QrCode size={16} color={selfCheckin.enabled ? '#0EA5E9' : '#94A3B8'} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{selfCheckin.enabled ? 'التسجيل الذاتي مفعّل' : 'التسجيل الذاتي غير مفعّل'}</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>رابط QR يسمح للعميل بتسجيل سيارته من جواله.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={16} color="#F59E0B" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>مراجعة الموظف قبل الإدخال</p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>السيارة تظهر للموظف أولاً حتى يعتمدها ويدخلها المسار الصحيح.</p>
              </div>
            </div>
          </div>
        </ClientPanel>
      </div>

    </div>
  )
}

function StatusTile({
  icon: Icon,
  title,
  value,
  hint,
  color,
}: {
  icon: React.ElementType
  title: string
  value: string
  hint: string
  color: string
}) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 16, boxShadow: '0 14px 34px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 16, color: '#0F172A', fontFamily: 'Cairo, sans-serif', fontWeight: 800 }}>{value}</p>
        </div>
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>{hint}</p>
    </div>
  )
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface CardProps {
  def: AutomationDef
  enabled: boolean
  expanded: boolean
  onExpand: () => void
  stat: { label: string; value: number } | null
}

function AutomationCard({ def, enabled, expanded, onExpand, stat }: CardProps) {
  const hasSettings = false

  return (
    <div style={{ ...SECTION_STYLE, opacity: enabled ? 1 : 0.55, transition: 'opacity 0.2s' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon */}
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${def.color}15`, flexShrink: 0 }}>
          <def.icon size={18} color={def.color} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{def.label}</span>
            {stat && (
              <span style={{ fontSize: 11, color: def.color, fontFamily: 'Sora, sans-serif', padding: '2px 8px', borderRadius: 6, background: `${def.color}15` }}>
                {stat.value} {stat.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Clock size={10} color="#475569" />
            <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{def.whenLabel}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasSettings && (
            <button onClick={onExpand}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 11, fontFamily: 'Tajawal, sans-serif' }}>
              تفاصيل
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${enabled ? 'rgba(16,185,129,0.3)' : '#E2E8F0'}`, background: enabled ? 'rgba(16,185,129,0.1)' : '#F8FAFC', color: enabled ? '#10B981' : '#475569', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 700 }}>
            {enabled ? <><Check size={11} /> مفعلة</> : 'غير مفعلة من الإدارة'}
          </span>
        </div>
      </div>

      {/* Description */}
      {!expanded && (
        <p style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: '10px 0 0', lineHeight: 1.7 }}>
          {def.description}
        </p>
      )}

    </div>
  )
}
