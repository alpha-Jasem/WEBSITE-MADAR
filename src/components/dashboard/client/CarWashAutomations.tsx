import { useEffect, useState } from 'react'
import { Car, Star, ClipboardCheck, Receipt, Zap, MessageSquare, Users2, Clock, ChevronDown, ChevronUp, Save, Check, Loader2, RotateCcw, Play, Pause } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
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
  messageKey?: string       // key in cw_message_templates
  messageKey2?: string      // second template key (free wash)
  hasTimingHours?: boolean  // delay_hours config
  aiGenerated?: boolean     // weekly promo — no message editing
}

const DEFS: AutomationDef[] = [
  // ── Webhook-based ──────────────────────────────────────────────────────
  {
    key: 'car_ready', label: 'إشعار السيارة جاهزة', section: 'webhook',
    icon: Car, color: '#22D3EE',
    description: 'يُرسل للعميل فور وصول سيارته لحالة "جاهزة" في لوحة التشغيل',
    whenLabel: 'عند الضغط على "جاهزة"',
    messageKey: 'car_ready',
  },
  {
    key: 'delivery_receipt', label: 'إيصال التسليم', section: 'webhook',
    icon: Receipt, color: '#10B981',
    description: 'يُرسل فاتورة واتساب للعميل فور تسليم سيارته وتأكيد الدفع',
    whenLabel: 'عند تأكيد التسليم والدفع',
    messageKey: 'delivery_receipt',
    messageKey2: 'delivery_receipt_free',
  },
  {
    key: 'loyalty_milestone', label: 'إنجاز الولاء', section: 'webhook',
    icon: Star, color: '#F59E0B',
    description: 'يُرسل تهنئة للعميل عند اكتمال 5 غسلات واستحقاقه غسلة مجانية',
    whenLabel: 'عند اكتمال 5 غسلات',
    messageKey: 'loyalty_milestone',
  },
  {
    key: 'daily_closing', label: 'ملخص اليوم للمالك', section: 'webhook',
    icon: ClipboardCheck, color: '#8B5CF6',
    description: 'يُرسل ملخص المبيعات والأرباح ليومياً للمالك عند إغلاق اليوم',
    whenLabel: 'عند إغلاق اليوم',
  },
  // ── Scheduled ─────────────────────────────────────────────────────────
  {
    key: 'review_request', label: 'طلب تقييم Google', section: 'scheduled',
    icon: Star, color: '#F59E0B',
    description: 'يُرسل رابط التقييم تلقائياً بعد فترة محددة من تسليم السيارة',
    whenLabel: 'بعد X ساعات من التسليم',
    hasTimingHours: true,
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

const DEFAULT_TEMPLATES: Record<string, string> = {
  car_ready: '🚗 سيارتك جاهزة {{customer_name}}!\n\nتفضل استلامها من {{company_name}} 😊',
  delivery_receipt: '🧾 فاتورة غسيل سيارة\n{{company_name}}\n\nالخدمة: {{service}}\nالإجمالي: {{total}} ر.س\nطريقة الدفع: {{payment_method}} ✅\n\nشكراً لزيارتكم — نراكم قريباً 🙏',
  delivery_receipt_free: '🎁 غسلة مجانية!\n{{company_name}}\n\nالخدمة: {{service}}\nالإجمالي: 0 ر.س 🎉\n\nشكراً على ولاؤك — نراكم قريباً 🙏',
  loyalty_milestone: '🎉 مبروك {{customer_name}}!\n\nاستكملت 5 غسلات في {{company_name}} 🚗✨\nغسلتك القادمة مجانية!\n\nما عليك إلا تذكر الموظف عند وصولك 😊',
}

const VARS: Record<string, string[]> = {
  car_ready: ['{{customer_name}}', '{{company_name}}'],
  delivery_receipt: ['{{customer_name}}', '{{company_name}}', '{{service}}', '{{total}}', '{{payment_method}}'],
  delivery_receipt_free: ['{{customer_name}}', '{{company_name}}', '{{service}}'],
  loyalty_milestone: ['{{customer_name}}', '{{company_name}}'],
}

const SECTION_STYLE = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18,
  padding: '20px 22px',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CarWashAutomations() {
  const { companyId, company, loading: authLoading } = useClientCompany()

  const [automations, setAutomations] = useState<Record<string, { enabled: boolean; delay_hours?: number }>>(
    () => Object.fromEntries(DEFS.map(d => [d.key, { enabled: true, ...(d.hasTimingHours ? { delay_hours: 2 } : {}) }]))
  )
  const [templates, setTemplates] = useState<Record<string, string>>(DEFAULT_TEMPLATES)
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
          .select('cw_automations, cw_message_templates')
          .eq('id', companyId).single(),
        supabase.from('cw_visits')
          .select('id, review_sent')
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
        const tmpl = (co as any).cw_message_templates || {}
        if (Object.keys(tmpl).length > 0) {
          setTemplates(prev => ({ ...prev, ...tmpl }))
        }
      }

      if (visits) {
        setStats({
          deliveries: visits.length,
          reviews: visits.filter((v: any) => v.review_sent).length,
        })
      }
      setLoading(false)
    }
    load()
  }, [authLoading, companyId])

  const toggleEnabled = (key: string) => {
    setAutomations(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }))
  }

  const setDelayHours = (key: string, val: number) => {
    setAutomations(prev => ({ ...prev, [key]: { ...prev[key], delay_hours: val } }))
  }

  const saveAll = async () => {
    if (!companyId) return
    setSaving(true)
    await Promise.all([
      supabase.from('companies').update({ cw_automations: automations } as any).eq('id', companyId),
      supabase.from('companies').update({ cw_message_templates: templates } as any).eq('id', companyId),
    ])
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif', margin: 0 }}>الأتمتة</h1>
          <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', marginTop: 4 }}>
            تحكم كامل في رسائل الواتساب التلقائية — تشغيل، إيقاف، تعديل النص، ضبط التوقيت
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
              templates={templates}
              setTemplates={setTemplates}
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {scheduledDefs.map(def => (
            <AutomationCard key={def.key} def={def}
              enabled={automations[def.key]?.enabled ?? true}
              onToggle={() => toggleEnabled(def.key)}
              expanded={expanded === def.key}
              onExpand={() => setExpanded(expanded === def.key ? null : def.key)}
              templates={templates}
              setTemplates={setTemplates}
              stat={getStats(def.key)}
              delayHours={automations[def.key]?.delay_hours}
              onDelayHoursChange={def.hasTimingHours ? (v) => setDelayHours(def.key, v) : undefined}
            />
          ))}
        </div>
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
  templates: Record<string, string>
  setTemplates: React.Dispatch<React.SetStateAction<Record<string, string>>>
  stat: { label: string; value: number } | null
  delayHours?: number
  onDelayHoursChange?: (v: number) => void
}

function AutomationCard({ def, enabled, onToggle, expanded, onExpand, templates, setTemplates, stat, delayHours, onDelayHoursChange }: CardProps) {
  const hasSettings = !!(def.messageKey || def.hasTimingHours)

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
            <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', fontFamily: 'Cairo, sans-serif' }}>{def.label}</span>
            {stat && (
              <span style={{ fontSize: 11, color: def.color, fontFamily: 'Sora, sans-serif', padding: '2px 8px', borderRadius: 6, background: `${def.color}15` }}>
                {stat.value} {stat.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Clock size={10} color="#475569" />
            <span style={{ fontSize: 11, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>
              {def.hasTimingHours && delayHours ? `بعد ${delayHours} ساعة من التسليم` : def.whenLabel}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasSettings && (
            <button onClick={onExpand}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 11, fontFamily: 'Tajawal, sans-serif' }}>
              ضبط
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          {/* Toggle */}
          <button onClick={onToggle}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${enabled ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`, background: enabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', color: enabled ? '#10B981' : '#475569', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
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

      {/* Expanded settings */}
      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Timing */}
          {def.hasTimingHours && onDelayHoursChange && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginBottom: 10, fontWeight: 600 }}>
                ⏱️ إرسال طلب التقييم بعد كم ساعة من التسليم؟
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {[1, 2, 4, 6, 12, 24].map(h => (
                  <button key={h} onClick={() => onDelayHoursChange(h)}
                    style={{ width: 44, height: 36, borderRadius: 10, border: `1px solid ${delayHours === h ? def.color : 'rgba(255,255,255,0.08)'}`, background: delayHours === h ? `${def.color}20` : 'transparent', color: delayHours === h ? def.color : '#475569', cursor: 'pointer', fontSize: 13, fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
                    {h}
                  </button>
                ))}
                <span style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>ساعة</span>
              </div>
            </div>
          )}

          {/* Message templates */}
          {def.messageKey && !def.aiGenerated && (
            <TemplateEditor
              label={def.messageKey2 ? 'رسالة الدفع المعتاد' : 'نص الرسالة'}
              templateKey={def.messageKey}
              templates={templates}
              setTemplates={setTemplates}
              color={def.color}
              vars={VARS[def.messageKey] || []}
              defaultText={DEFAULT_TEMPLATES[def.messageKey] || ''}
            />
          )}
          {def.messageKey2 && !def.aiGenerated && (
            <TemplateEditor
              label='رسالة الغسلة المجانية'
              templateKey={def.messageKey2}
              templates={templates}
              setTemplates={setTemplates}
              color='#10B981'
              vars={VARS[def.messageKey2] || []}
              defaultText={DEFAULT_TEMPLATES[def.messageKey2] || ''}
            />
          )}

          {def.aiGenerated && (
            <div style={{ padding: '12px 14px', background: 'rgba(236,72,153,0.06)', borderRadius: 12, border: '1px solid rgba(236,72,153,0.2)' }}>
              <p style={{ fontSize: 12, color: '#F472B6', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
                ✨ هذه الرسالة يُولّدها الذكاء الاصطناعي تلقائياً كل أسبوع — لا تحتاج تعديلاً يدوياً
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Template Editor ──────────────────────────────────────────────────────────

interface TemplateEditorProps {
  label: string
  templateKey: string
  templates: Record<string, string>
  setTemplates: React.Dispatch<React.SetStateAction<Record<string, string>>>
  color: string
  vars: string[]
  defaultText: string
}

function TemplateEditor({ label, templateKey, templates, setTemplates, color, vars, defaultText }: TemplateEditorProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{label}</label>
        <button onClick={() => setTemplates(prev => ({ ...prev, [templateKey]: defaultText }))}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: 11, fontFamily: 'Tajawal, sans-serif' }}>
          <RotateCcw size={10} /> افتراضي
        </button>
      </div>
      {/* Variable chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
        {vars.map(v => (
          <button key={v} onClick={() => setTemplates(prev => ({ ...prev, [templateKey]: (prev[templateKey] || defaultText) + v }))}
            style={{ padding: '2px 8px', borderRadius: 5, border: `1px solid ${color}33`, background: `${color}11`, color, fontSize: 10, fontFamily: 'monospace', cursor: 'pointer', direction: 'ltr' }}>
            {v}
          </button>
        ))}
      </div>
      <textarea
        value={templates[templateKey] ?? defaultText}
        onChange={e => setTemplates(prev => ({ ...prev, [templateKey]: e.target.value }))}
        rows={4}
        dir="auto"
        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'Tajawal, sans-serif', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.8 }}
      />
    </div>
  )
}
