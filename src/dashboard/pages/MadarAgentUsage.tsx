import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics, usagePercentage } from '@/lib/clinicOSProduct'
import { supabase } from '@/lib/supabase'
import { Card, Badge } from '@/dashboard/components/primitives'
import { Skeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Meter, Kpi } from './shared/night'

const nf = new Intl.NumberFormat('en-US')
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--raise)" strokeWidth={stroke} />
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
          background: 'var(--surface-inverse)', color: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-md)',
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
  } = useWorkspace()

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
    return (
      <NightPage>
      <PageHead title="الباقة والاستهلاك" sub="استهلاك مساعد مدار الذكي — المكالمات الصوتية ورسائل واتساب/AI" />
      <div className="np-grid-2" style={{ gridTemplateColumns: undefined }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width={180} height={180} radius="50%" />
        </Card>
        <Card>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <Skeleton width="40%" height={13} style={{ marginBottom: 8 }} />
              <Skeleton width="100%" height={8} radius="var(--radius-full)" />
            </div>
          ))}
        </Card>
      </div>
      </NightPage>
    )
  }

  return (
    <NightPage>
      <PageHead
        title="الباقة والاستهلاك"
        icon={<Bot size={22} style={{ color: 'var(--ai)' }} />}
        sub="استهلاك مساعد مدار الذكي — المكالمات الصوتية ورسائل واتساب/AI، بشكل حي"
      />

      <div className="np-kpis">
        <Kpi label="الباقة الحالية" value={isSubscribed ? plan.name : 'Free'} />
        <Kpi label="السعر السنوي" value={isSubscribed ? `${nf.format(plan.annualPrice)} ر.س` : '0 ر.س'} />
        <Kpi label="دورة الاستخدام" value={<span style={{ fontSize: 15 }}>{usageCycleStart && usageCycleEnd ? `${usageCycleStart} - ${usageCycleEnd}` : 'تبدأ بعد التفعيل'}</span>} />
        <Kpi label="انتهاء الاشتراك" value={<span style={{ fontSize: 15 }}>{subscriptionEndDate || 'غير مفعّل'}</span>} />
      </div>

      <div className="np-grid-2" style={{ gridTemplateColumns: undefined }}>
        <Card delay={0}>
          <div style={{ fontWeight: 700, marginBottom: 6, textAlign: 'center', color: 'var(--text-primary)' }}>الاستهلاك الإجمالي</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', marginBottom: 10 }}>مرّر الفأرة للتفاصيل</div>
          <CircularGauge percent={combinedPercent} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <Badge tone={isSubscribed ? 'success' : 'neutral'}>{isSubscribed ? plan.name : 'Free'}</Badge>
          </div>
        </Card>

        <Card delay={0.08}>
          <CardTitle>تفاصيل الاستخدام هذا الشهر</CardTitle>
          {metrics.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>تظهر الحدود فور تفعيل الاشتراك</div>
          )}
          {metrics.map((m) => {
            const p = usagePercentage(m)
            return (
              <Meter
                key={m.key} label={m.label} value={p}
                display={<span dir="ltr">{nf.format(m.used)} / {m.limit ? nf.format(m.limit) : 'غير مفعّل'}</span>}
                color={p >= 100 ? 'var(--bad)' : p >= 80 ? 'var(--warn)' : undefined}
              />
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
              <div className="np-meter">
                <i style={{ width: `${elevenlabsPercent}%`, ...(elevenlabsPercent >= 80 ? { background: elevenlabsPercent >= 100 ? 'var(--bad)' : 'var(--warn)' } : {}) }} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: elevenlabsError ? 'var(--danger-500)' : 'var(--text-tertiary)' }}>
                {elevenlabsError ? 'تعذّر جلب بيانات الحساب — تواصل مع فريق الدعم' : 'سيبدأ العرض فور أول استخدام لمدار ايجنت'}
              </div>
            )}
          </div>
        </Card>
      </div>

    </NightPage>
  )
}
