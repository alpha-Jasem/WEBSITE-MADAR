import { useEffect, useState } from 'react'
import { Car, Star, ClipboardCheck, Receipt, Zap, MessageSquare, Users2, Clock, ChevronDown, ChevronUp, Save, Check, Loader2, Play, Pause, QrCode, ShieldCheck } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import { ClientButton, ClientInsightPanel, ClientPageHeader, ClientPanel } from './ClientUI'

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

  const toggleEnabled = (key: string) => {
    setAutomations(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
  }

  const saveAll = async () => {
    if (!companyId) return
    setSaving(true)
    const full = { ...automations, self_checkin: selfCheckin }
    await supabase.from('companies').update({ cw_automations: full } as any).eq('id', companyId)
    logAudit(companyId, 'automations_updated', { newValue: full })
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
  const enabledCount = DEFS.filter(def => automations[def.key]?.enabled !== false).length
  const disabledCount = DEFS.length - enabledCount
  const automationInsights = [
    { title: 'نسبة التشغيل', description: `${enabledCount} من ${DEFS.length} أتمتة مفعلة. كلما زادت الأتمتة قل ضغط الموظف.`, tone: disabledCount > 2 ? 'amber' as const : 'green' as const },
    stats.deliveries > 0
      ? { title: 'إيصالات التسليم تعمل مع التشغيل', description: `${stats.deliveries} عملية تسليم هذا الشهر، تأكد أن إيصال التسليم مفعل دائماً.`, tone: 'blue' as const }
      : { title: 'اختبر أول تسليم', description: 'بعد أول تسليم ستظهر بيانات الإيصالات والتقييمات هنا.', tone: 'slate' as const },
    stats.reviews > 0
      ? { title: 'التقييمات بدأت تتحرك', description: `${stats.reviews} طلب تقييم مرسل. راقب Google Maps وارفع التقييم العام.`, tone: 'green' as const }
      : { title: 'فعّل طلب التقييم', description: 'طلب التقييم بعد الخدمة من أقوى أدوات رفع مبيعات المغسلة محلياً.', tone: 'amber' as const },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <ClientPageHeader
        eyebrow="محرك الواتساب"
        title="الأتمتة"
        description="تحكم في تشغيل وإيقاف رسائل العملاء التلقائية بدون تعقيد."
        actions={(
          <ClientButton onClick={saveAll} disabled={saving} tone={saved ? 'success' : 'primary'}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? 'تم الحفظ' : 'حفظ الكل'}
          </ClientButton>
        )}
      />

      <ClientInsightPanel
        title="حالة محرك الرسائل"
        description="خلاصة عملية تساعد المالك يعرف هل الأتمتة تبيع وتوفر وقت فعلاً."
        items={automationInsights}
      />

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

      {/* Self Check-in Settings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0EA5E9' }} />
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            التسجيل الذاتي عبر QR
          </span>
        </div>
        <ClientPanel>

          {/* Enable toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: selfCheckin.enabled ? 'rgba(14,165,233,0.12)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QrCode size={16} color={selfCheckin.enabled ? '#0EA5E9' : '#94A3B8'} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>تفعيل التسجيل الذاتي</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>العميل يسجل سيارته بنفسه عبر QR Code</p>
              </div>
            </div>
            <button
              onClick={() => setSelfCheckin(s => ({ ...s, enabled: !s.enabled }))}
              style={{ width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: selfCheckin.enabled ? '#0EA5E9' : '#E2E8F0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s, left 0.2s', right: selfCheckin.enabled ? 3 : 'auto', left: selfCheckin.enabled ? 'auto' : 3 }} />
            </button>
          </div>

          {selfCheckin.enabled && (
            <>
              {/* Approval required */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: selfCheckin.approval_required ? 'rgba(245,158,11,0.1)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={16} color={selfCheckin.approval_required ? '#F59E0B' : '#94A3B8'} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>اعتماد الموظف مطلوب</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
                      {selfCheckin.approval_required ? 'السيارة تنتظر موافقة الموظف قبل دخول المسار' : 'السيارة تدخل المسار مباشرة بعد التسجيل'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelfCheckin(s => ({ ...s, approval_required: !s.approval_required }))}
                  style={{ width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: selfCheckin.approval_required ? '#F59E0B' : '#E2E8F0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                >
                  <span style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'right 0.2s, left 0.2s', right: selfCheckin.approval_required ? 3 : 'auto', left: selfCheckin.approval_required ? 'auto' : 3 }} />
                </button>
              </div>

              {/* Anti-spam minutes */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTop: '1px solid #E2E8F0' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>فترة الحماية من التكرار</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>لا يُسمح لنفس الرقم بالتسجيل مرتين خلال هذه الفترة</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <input
                    type="number"
                    min={1} max={60}
                    value={selfCheckin.anti_spam_minutes}
                    onChange={e => setSelfCheckin(s => ({ ...s, anti_spam_minutes: Math.max(1, Math.min(60, Number(e.target.value))) }))}
                    style={{ width: 56, textAlign: 'center', padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A', fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, outline: 'none' }}
                  />
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>دقيقة</span>
                </div>
              </div>
            </>
          )}
        </ClientPanel>
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
