import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics, usagePercentage } from '../../../lib/clinicOSProduct'
import { supabase } from '../../../lib/supabase'
import { Card, Badge } from '../../../components/clinicOS/v2/primitives'

const nf = new Intl.NumberFormat('ar-SA')
const POLL_MS = 60_000

interface AgentVoiceUsage {
  character_count: number | null
  character_limit: number | null
  next_reset_unix: number | null
  tier: string | null
}

function CircularGauge({ percent, size = 180, stroke = 16 }: { percent: number; size?: number; stroke?: number }) {
  const [hover, setHover] = useState(false)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = c - (clamped / 100) * c
  const color = clamped >= 100 ? 'var(--danger-500)' : clamped >= 80 ? 'var(--warning-500)' : 'var(--success-500)'
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', width: size, height: size, margin: '0 auto', cursor: 'default' }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--slate-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 400ms var(--ease-out), stroke 400ms var(--ease-out)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--text-primary)' }}>{clamped}%</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>مستخدم</div>
      </div>
      {hover && (
        <div style={{
          position: 'absolute', top: '105%', insetInlineStart: '50%', transform: 'translateX(-50%)',
          background: 'var(--slate-900)', color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-md)',
          fontSize: 12, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-lg)', zIndex: 10,
        }}>
          متبقٍ {100 - clamped}% من حدك الشهري
        </div>
      )}
    </div>
  )
}

export function DashboardV2MadarAgentUsage() {
  const {
    packageType, isDemo, isSubscribed, usageMetrics, usageCycleStart, usageCycleEnd,
    subscriptionEndDate, accountLoading,
  } = useClinicOS()

  const [elevenlabs, setElevenlabs] = useState<AgentVoiceUsage | null>(null)
  const [elevenlabsLoading, setElevenlabsLoading] = useState(!isDemo)
  const [elevenlabsError, setElevenlabsError] = useState(false)

  useEffect(() => {
    if (accountLoading) return
    if (isDemo) {
      setElevenlabs({ character_count: 48200, character_limit: 100000, next_reset_unix: null, tier: 'creator' })
      setElevenlabsLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.functions.invoke('clinic-usage', { body: {} })
      if (cancelled) return
      if (error || !data || data.error) {
        setElevenlabsError(true)
      } else {
        setElevenlabsError(false)
        if (data.elevenlabs) setElevenlabs(data.elevenlabs)
      }
      setElevenlabsLoading(false)
    }
    load()
    const interval = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [isDemo, accountLoading])

  const plan = CLINIC_PLANS[packageType]
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const overall = isSubscribed || isDemo ? getOverallUsage(packageType, metrics) : 0

  const elevenlabsPercent = elevenlabs?.character_limit
    ? Math.min(100, Math.round(((elevenlabs.character_count || 0) / elevenlabs.character_limit) * 100))
    : null

  const combinedPercent = elevenlabsPercent != null ? Math.max(overall, elevenlabsPercent) : overall

  if (accountLoading) {
    return <Card><div style={{ padding: 30, textAlign: 'center', color: 'var(--text-tertiary)' }}>جاري تحميل بيانات الاستخدام...</div></Card>
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={20} style={{ color: 'var(--brand-500)' }} /> Madar Agent Usage
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          استهلاك مساعد مدار الذكي — المكالمات الصوتية ورسائل واتساب/AI، بشكل حي
        </div>
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>الاستهلاك الإجمالي</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 10 }}>مرّر الفأرة للتفاصيل</div>
          <CircularGauge percent={combinedPercent} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <Badge tone={isSubscribed ? 'success' : 'neutral'}>{isSubscribed ? plan.name : 'Free'}</Badge>
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>تفاصيل الاستخدام هذا الشهر</div>
          {metrics.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>تظهر الحدود فور تفعيل الاشتراك</div>
          )}
          {metrics.map((m) => {
            const p = usagePercentage(m)
            return (
              <div key={m.key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                  <span style={{ fontWeight: 700 }}>{nf.format(m.used)} / {m.limit ? nf.format(m.limit) : 'غير مفعّل'}</span>
                </div>
                <div style={{ height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: `${p}%`, height: '100%', background: p >= 100 ? 'var(--danger-500)' : p >= 80 ? 'var(--warning-500)' : 'var(--success-500)' }} />
                </div>
              </div>
            )
          })}

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                استهلاك المكالمات الصوتية (حرف)
                {elevenlabsLoading && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(جارِ التحديث...)</span>}
              </span>
              {!elevenlabsLoading && (
                <Badge tone={elevenlabs?.character_limit ? 'success' : elevenlabsError ? 'danger' : 'neutral'}>
                  {elevenlabs?.character_limit ? 'متصل بمدار ايجنت' : elevenlabsError ? 'تعذّر الاتصال' : 'بانتظار أول استخدام'}
                </Badge>
              )}
            </div>
            {elevenlabs?.character_limit && (
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {nf.format(elevenlabs.character_count || 0)} / {nf.format(elevenlabs.character_limit)}
              </div>
            )}
            {elevenlabsPercent != null ? (
              <div style={{ height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${elevenlabsPercent}%`, height: '100%', background: elevenlabsPercent >= 100 ? 'var(--danger-500)' : elevenlabsPercent >= 80 ? 'var(--warning-500)' : 'var(--brand-500)' }} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: elevenlabsError ? 'var(--danger-500)' : 'var(--text-tertiary)' }}>
                {elevenlabsError ? 'تعذّر جلب بيانات الحساب — تواصل مع فريق الدعم' : 'سيبدأ العرض فور أول استخدام لمدار ايجنت'}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="dv2-responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>الباقة الحالية</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{isSubscribed ? plan.name : 'Free'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>السعر السنوي</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>{isSubscribed ? `${nf.format(plan.annualPrice)} ر.س` : '0 ر.س'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>دورة الاستخدام</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{usageCycleStart && usageCycleEnd ? `${usageCycleStart} - ${usageCycleEnd}` : 'تبدأ بعد التفعيل'}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>انتهاء الاشتراك</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{subscriptionEndDate || 'غير مفعّل'}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
