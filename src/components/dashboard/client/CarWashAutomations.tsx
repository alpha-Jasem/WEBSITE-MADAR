import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Car, Star, ClipboardCheck, Receipt, MessageSquare, Users2, Clock, ChevronDown, ChevronUp, Check, Loader2, QrCode, ShieldCheck, Copy, ExternalLink, Send } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { usePlanGate } from '../../../hooks/usePlanGate'
import { FeatureLock } from '../../dash/FeatureLock'
import { logAudit } from '../../../lib/auditLog'
import { ClientInsightPanel, ClientPageHeader, ClientPanel } from './ClientUI'

// ─── Static automation definitions ───────────────────────────────────────────

type AutomationKey =
  | 'car_ready' | 'delivery_receipt' | 'loyalty_milestone' | 'daily_closing'
  | 'review_request' | 'daily_reactivation' | 'post_followup'

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
    key: 'post_followup', label: 'متابعة بعد الخدمة', section: 'scheduled',
    icon: MessageSquare, color: '#14B8A6',
    description: 'يُرسل رسالة متابعة للعملاء بعد انتهاء الخدمة',
    whenLabel: 'كل ساعة — زيارات منجزة',
  },
]

const CAMPAIGN_TEMPLATES = [
  {
    title: 'رجّع العملاء الغائبين',
    desc: 'للعملاء الذين لم يزوروا المغسلة من فترة.',
    text: 'اشتقنا لخدمتك في مغسلتنا. حياك الله في أي وقت، وفريقنا جاهز للعناية بسيارتك.',
  },
  {
    title: 'طلب تقييم Google',
    desc: 'بعد زيارة ناجحة أو تسليم ممتاز.',
    text: 'شكراً لزيارتك. إذا أعجبتك الخدمة يسعدنا تقييمك على Google، رأيك يساعدنا نطور خدمتنا.',
  },
  {
    title: 'رسالة شكر بعد الزيارة',
    desc: 'رسالة لطيفة تبني علاقة مع العميل.',
    text: 'شكراً لاختيارك مغسلتنا اليوم. نتمنى أن تكون الخدمة نالت رضاك، ونسعد بخدمتك دائماً.',
  },
  {
    title: 'تذكير الولاء',
    desc: 'لتشجيع العميل يكمل زياراته القادمة.',
    text: 'زياراتك محفوظة في برنامج الولاء. كل زيارة تقربك أكثر من مكافأتك القادمة.',
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

  const saveSelfCheckin = async (nextSelfCheckin = selfCheckin) => {
    if (!companyId) return
    const full = { ...automations, self_checkin: nextSelfCheckin }
    await supabase.from('companies').update({ cw_automations: full } as any).eq('id', companyId)
    logAudit(companyId, 'self_checkin_updated', { newValue: nextSelfCheckin })
  }

  const updateSelfCheckin = (updater: (current: typeof selfCheckin) => typeof selfCheckin) => {
    setSelfCheckin(current => {
      const next = updater(current)
      saveSelfCheckin(next)
      return next
    })
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
  const copyTemplate = async (text: string) => {
    await navigator.clipboard?.writeText(text)
  }
  const enabledCount = DEFS.filter(def => automations[def.key]?.enabled !== false).length
  const disabledCount = DEFS.length - enabledCount
  const messagesUsed = company?.messages_used || 0
  const messageLimit = company?.message_limit || 2000
  const remainingMessages = Math.max(0, messageLimit - messagesUsed)
  const usagePercent = messageLimit > 0 ? Math.min(100, Math.round((messagesUsed / messageLimit) * 100)) : 0
  const automationInsights = [
    { title: 'رسائل واتساب الأساسية', description: `${enabledCount} من ${DEFS.length} رسائل تلقائية مفعلة. هذه الرسائل تقلل متابعة الموظف اليدوية.`, tone: disabledCount > 2 ? 'amber' as const : 'green' as const },
    stats.deliveries > 0
      ? { title: 'إيصالات التسليم تعمل مع التشغيل', description: `${stats.deliveries} عملية تسليم هذا الشهر، تأكد أن إيصال التسليم مفعل دائماً.`, tone: 'blue' as const }
      : { title: 'اختبر أول تسليم', description: 'بعد أول تسليم ستظهر بيانات الإيصالات والتقييمات هنا.', tone: 'slate' as const },
    stats.reviews > 0
      ? { title: 'التقييمات بدأت تتحرك', description: `${stats.reviews} طلب تقييم مرسل. راقب Google Maps وارفع التقييم العام.`, tone: 'green' as const }
      : { title: 'فعّل طلب التقييم', description: 'طلب التقييم بعد الخدمة من أقوى أدوات رفع ثقة العملاء محلياً.', tone: 'amber' as const },
  ]

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <ClientPageHeader
        eyebrow="مركز واتساب"
        title="واتساب والرسائل"
        description="شغّل رسائل العملاء الأساسية، راقب استخدام الباقة، واستخدم قوالب حملات جاهزة بدون أي إعدادات تقنية."
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
          icon={Send}
          title="المتبقي من الباقة"
          value={`${remainingMessages.toLocaleString('ar-SA')} رسالة`}
          hint={`${messagesUsed.toLocaleString('ar-SA')} مستخدمة من ${messageLimit.toLocaleString('ar-SA')} (${usagePercent}%)`}
          color={usagePercent > 85 ? '#F59E0B' : '#0EA5E9'}
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
          <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— تقييم، متابعة، وتنشيط عملاء بدون متابعة يومية</span>
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

      {/* Campaign templates */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
              حملات يدوية آمنة
            </span>
            <span style={{ fontSize: 11, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>— صاحب المغسلة يراجع ويرسل بنفسه</span>
          </div>
          <Link to="/client/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, background: '#0F172A', color: '#FFFFFF', textDecoration: 'none', fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: 700 }}>
            <Send size={13} />
            فتح العملاء وإرسال حملة
            <ExternalLink size={12} />
          </Link>
        </div>

        <ClientPanel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {CAMPAIGN_TEMPLATES.map(template => (
              <div key={template.title} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, color: '#0F172A', fontFamily: 'Cairo, sans-serif', fontWeight: 800 }}>{template.title}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.6 }}>{template.desc}</p>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.75, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10 }}>
                  {template.text}
                </p>
                <button onClick={() => copyTemplate(template.text)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 10px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: 12, fontWeight: 700 }}>
                  <Copy size={13} />
                  نسخ القالب
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, padding: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 12 }}>
            <AlertTriangle size={16} color="#D97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#92400E', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8 }}>
              لا يوجد عرض أو خصم يُرسل تلقائياً من مدار. أي خصم أو التزام مالي يكتبه صاحب المغسلة ويراجعه قبل الضغط على إرسال.
            </p>
          </div>
        </ClientPanel>
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
              onClick={() => updateSelfCheckin(s => ({ ...s, enabled: !s.enabled }))}
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
                  onClick={() => updateSelfCheckin(s => ({ ...s, approval_required: !s.approval_required }))}
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
                    onChange={e => updateSelfCheckin(s => ({ ...s, anti_spam_minutes: Math.max(1, Math.min(60, Number(e.target.value))) }))}
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
