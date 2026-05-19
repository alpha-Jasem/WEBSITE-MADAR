import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from 'remotion'

interface ReportData {
  revenue: number
  leads: number
  automations: number
  companies: number
  growth: number
  topService: string
  weeklyMsgs: number
}

const BRAND_BLUE  = '#00BFFF'
const BRAND_GOLD  = '#F59E0B'
const BRAND_DARK  = '#0B0D12'
const BRAND_CARD  = '#13161E'

function Counter({ value, frame, startFrame }: { value: number; frame: number; startFrame: number }) {
  const progress = interpolate(frame, [startFrame, startFrame + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <>{Math.round(value * progress).toLocaleString('ar-SA')}</>
}

function Slide({ children, frame, startAt }: { children: React.ReactNode; frame: number; startAt: number }) {
  const opacity = interpolate(frame, [startAt, startAt + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(frame, [startAt, startAt + 25], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>
}

export const WeeklyReport: React.FC<{ data: ReportData }> = ({ data }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } })
  const barProgress = interpolate(frame, [60, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const bars = [
    { label: 'السبت',    value: 320,  color: BRAND_BLUE },
    { label: 'الأحد',    value: 480,  color: BRAND_BLUE },
    { label: 'الاثنين',  value: 560,  color: BRAND_GOLD },
    { label: 'الثلاثاء', value: 390,  color: BRAND_BLUE },
    { label: 'الأربعاء', value: 720,  color: BRAND_GOLD },
    { label: 'الخميس',  value: 640,  color: BRAND_BLUE },
    { label: 'الجمعة',   value: 310,  color: BRAND_BLUE },
  ]
  const maxBar = Math.max(...bars.map(b => b.value))

  return (
    <AbsoluteFill style={{ background: BRAND_DARK, fontFamily: 'Cairo, Tajawal, sans-serif', direction: 'rtl' }}>

      {/* Grid bg */}
      <AbsoluteFill style={{
        backgroundImage: 'linear-gradient(rgba(0,191,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow top-right */}
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,191,255,0.12) 0%, transparent 65%)',
        filter: 'blur(60px)',
      }} />

      <div style={{ padding: '48px 64px', height: '100%', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ transform: `scale(${logoScale})`, transformOrigin: 'right center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${BRAND_BLUE}20`, border: `1px solid ${BRAND_BLUE}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: BRAND_BLUE }} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: -0.5 }}>Madar.software</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>لوحة الإدارة</div>
              </div>
            </div>
          </div>
          <Slide frame={frame} startAt={10}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>التقرير الأسبوعي</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: BRAND_GOLD }}>أسبوع رائع 🚀</div>
            </div>
          </Slide>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'الإيراد الشهري', value: data.revenue, suffix: 'K ريال', color: BRAND_BLUE, start: 15 },
            { label: 'عملاء محتملون', value: data.leads,    suffix: '',        color: BRAND_GOLD, start: 25 },
            { label: 'أنظمة نشطة',   value: data.automations, suffix: '',     color: '#8B5CF6',  start: 35 },
            { label: 'رسائل الأسبوع', value: data.weeklyMsgs, suffix: '',    color: '#10B981',  start: 45 },
          ].map((kpi, i) => (
            <Slide key={i} frame={frame} startAt={kpi.start}>
              <div style={{
                background: BRAND_CARD, borderRadius: 16,
                border: `1px solid rgba(255,255,255,0.07)`,
                padding: '20px 24px',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}60, transparent)` }} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{kpi.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>
                  <Counter value={kpi.value} frame={frame} startFrame={kpi.start} />{kpi.suffix}
                </div>
              </div>
            </Slide>
          ))}
        </div>

        {/* Bar chart */}
        <Slide frame={frame} startAt={55}>
          <div style={{ background: BRAND_CARD, borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', padding: '24px 28px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>الرسائل الأسبوعية</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>أداء كل يوم</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
              {bars.map((b, i) => {
                const h = (b.value / maxBar) * 100 * barProgress
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: '100%', height: h, borderRadius: '6px 6px 0 0',
                      background: b.color, opacity: 0.85, transition: 'height 0.3s',
                    }} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{b.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Slide>

        {/* Footer */}
        <Slide frame={frame} startAt={80}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>تم التوليد تلقائياً بواسطة Madar AI</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 12, color: '#10B981' }}>مباشر</span>
            </div>
          </div>
        </Slide>
      </div>
    </AbsoluteFill>
  )
}
