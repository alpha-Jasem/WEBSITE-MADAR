import { useState } from 'react'
import { Bot } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics, usagePercentage } from '@/lib/clinicOSProduct'
import { Card, Badge } from '@/dashboard/components/primitives'
import { Skeleton } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Meter, Kpi } from './shared/night'

const nf = new Intl.NumberFormat('en-US')

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

  const plan = CLINIC_PLANS[packageType]
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const overall = isSubscribed || isDemo || metrics.length > 0 ? getOverallUsage(packageType, metrics) : 0

  const combinedPercent = overall

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
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>يظهر الاستخدام أول ما ينربط وكيل صوتي بحسابك</div>
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

        </Card>
      </div>

    </NightPage>
  )
}
