import { useEffect, useState } from 'react'
import { Car, Star, ClipboardCheck, Receipt, Zap, MessageSquare, Users2, Clock, ChevronDown, ChevronUp, Save, Check, Loader2, Play, Pause } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'

// ─── Static automation definitions ───────────────────────────────────────────

type AutomationKey =
  | 'car_ready' | 'delivery_receipt' | 'loyalty_milestone' | 'daily_closing'
  | 'review_request' | 'daily_reactivation' | 'weekly_promo' | 'post_followup'

interface AutomationDef {
  key: AutomationKey
  label: string
  description: string
  whenLabel: string
  section: 'webhook' | 'scheduled'
  icon: React.ElementType
  color: string
  aiGenerated?: boolean
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
    key: 'delivery_receipt', label: 'إيصال التسليم', section: 'webhook',
    icon: Receipt, color: '#10B981',
    description: 'يُرسل فاتورة واتساب للعميل فور تسليم سيارته وتأكيد الدفع',
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
    key: 'review_request', label: 'طلب تقييم Google', section: 'scheduled',
    icon: Star, color: '#F59E0B',
    description: 'يُرسل رابط التقييم تلقائياً بعد فترة من تسليم السيارة',
    whenLabel: 'بعد التسليم بفترة قصيرة',
  },
  {
    key: 'daily_reactivation', label: 'تنشيط العملاء', section: 'scheduled',
    icon: Users2, color: '#6366F1',
    description: 'يُرسل رسالة يومية للعملاء غير النشطين لاستعادتهم',
    whenLabel: 'يومياً الساعة 10ص',
  },
  {
    key: 'weekly_promo', label: 'عرض أسبوعي AI', section: 'scheduled',
    icon: Zap, color: '#EC4899',
    description: 'يُولّد الذكاء الاصطناعي عرضاً جذاباً أسبوعياً ويرسله للعملاء',
    whenLabel: 'كل خميس الساعة 9ص',
    aiGenerated: true,
  },
  {
    key: 'post_followup', label: 'متابعة بعد الخدمة', section: 'scheduled',
    icon: MessageSquare, color: '#14B8A6',
    description: 'يُرسل رسالة متابعة للعملاء بعد انتهاء الخدمة',
    whenLabel: 'كل ساعة — زيارات منجزة',
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{ deliveries: number; reviews: number }>({ deliveries: 0, reviews: 0 })

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

  const toggleEnabled = (key: string) => {
    setAutomations(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
  }

  const saveAll = async () => {
    if (!companyId) return
    setSaving(true)
    await supabase.from('companies').update({ cw_automations: automations } as any).eq('id', companyId)
    logAudit(companyId, 'automations_updated', { newValue: automations })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (authLoading || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10 }}>
      <Loader2 size={18} className="animate-spin" color="#22D3EE" />
      <span style={{ color: '#475569', fontFamily: 'Tajawal, sans-serif', fontSize: 14 }}>جاري التحميل...</span>
    </div>
  )

  const webhookDefs = DEFS.filter(d => d.section === 'webhook')
  const scheduledDefs = DEFS.filter(d => d.section === 'scheduled')

  const getStats = (key: string) => {
    if (key === 'delivery_receipt') return { label: 'تسليم هذا الشهر', value: stats.deliveries }
    if (key === 'review_request') return { label: 'تقييم طُلب', value: stats.reviews }
    return null
  }

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>الأتمتة</h1>
          <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>
            تحكم في تشغيل وإيقاف رسائل الواتساب التلقائية
          </p>
        </div>
        <button onClick={saveAll} disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(34,211,238,0.12)', color: saved ? '#10B981' : '#22D3EE', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? 'تم الحفظ ✓' : 'حفظ الكل'}
        </button>
      </div>

      {/* Webhook section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D3EE' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            مرتبطة بلوحة التشغيل
          </span>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— تُرسل عند أحداث معينة</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {webhookDefs.map(def => (
            <AutomationCard key={def.key} def={def}
              enabled={automations[def.key]?.enabled ?? true}
              onToggle={() => toggleEnabled(def.key)}
              expanded={expanded === def.key}
              onExpand={() => setExpanded(expanded === def.key ? null : def.key)}
              stat={getStats(def.key)}
            />
          ))}
        </div>
      </div>

      {/* Scheduled section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B5CF6' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            مجدولة تلقائياً
          </span>
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— تعمل بدون أي تدخل</span>
          {!can.scheduledAutomations && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#818CF8', fontFamily: 'Sora, sans-serif', fontWeight: 700, marginRight: 4 }}>
              Pro
            </span>
          )}
        </div>
        <FeatureLock
          locked={!can.scheduledAutomations}
          requiredPlan="pro"
          featureName="الأتمتة المجدولة"
          benefit="فعّل رسائل إعادة التنشيط، طلب التقييم، والمتابعة التلقائية — ووفّر ساعات من العمل اليدوي"
          companyName={company?.name}
          currentPlan={planLabel}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scheduledDefs.map(def => (
              <AutomationCard key={def.key} def={def}
                enabled={automations[def.key]?.enabled ?? true}
                onToggle={() => toggleEnabled(def.key)}
                expanded={expanded === def.key}
                onExpand={() => setExpanded(expanded === def.key ? null : def.key)}
                stat={getStats(def.key)}
              />
            ))}
          </div>
        </FeatureLock>
      </div>
    </div>
  )
}

// ─── Automation Card ──────────────────────────────────────────────────────────

interface CardProps {
  def: AutomationDef
  enabled: boolean
  onToggle: () => void
  expanded: boolean
  onExpand: () => void
  stat: { label: string; value: number } | null
}

function AutomationCard({ def, enabled, onToggle, expanded, onExpand, stat }: CardProps) {
  const hasSettings = !!def.aiGenerated

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
          {/* Toggle */}
          <button onClick={onToggle}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${enabled ? 'rgba(16,185,129,0.3)' : '#E2E8F0'}`, background: enabled ? 'rgba(16,185,129,0.1)' : '#F8FAFC', color: enabled ? '#10B981' : '#475569', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
            {enabled ? <><Play size={11} fill="#10B981" /> شغّال</> : <><Pause size={11} /> موقوف</>}
          </button>
        </div>
      </div>

      {/* Description */}
      {!expanded && (
        <p style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: '10px 0 0', lineHeight: 1.7 }}>
          {def.description}
        </p>
      )}

      {/* Expanded — AI-generated note only */}
      {expanded && def.aiGenerated && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E2E8F0' }}>
          <div style={{ padding: '12px 14px', background: 'rgba(236,72,153,0.06)', borderRadius: 12, border: '1px solid rgba(236,72,153,0.2)' }}>
            <p style={{ fontSize: 12, color: '#F472B6', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
              ✨ هذه الرسالة يُولّدها الذكاء الاصطناعي تلقائياً كل أسبوع — لا تحتاج تعديلاً يدوياً
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
