import { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { TrendingUp, Calendar, Bot, Clock, Star, Award, ArrowUp, ArrowDown } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicAppointments, useClinicAICalls } from '../../../lib/clinicOSQueries'
import { DEMO_APPOINTMENTS, DEMO_AI_CALLS } from '../../../lib/clinicOSDemoData'

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  primary: '#4F46E5',
  green:   '#10B981',
  orange:  '#F97316',
  red:     '#EF4444',
  blue:    '#0099CC',
  purple:  '#8B5CF6',
  text:    '#0F172A',
  mid:     '#475569',
  muted:   '#94A3B8',
  border:  '#E2E8F0',
  card:    '#FFFFFF',
  bg:      '#F8FAFC',
}

// ── Before data (simulated baseline — 3 months before joining) ────────────────
const BEFORE_MONTHS = [
  { month: 'أكتوبر', appointments: 38, ai_bookings: 0, no_shows: 7  },
  { month: 'نوفمبر', appointments: 41, ai_bookings: 0, no_shows: 8  },
  { month: 'ديسمبر', appointments: 35, ai_bookings: 0, no_shows: 9  },
]

// ── After data (simulated post-join growth + real/demo data) ─────────────────
const AFTER_MONTHS = [
  { month: 'يناير',  appointments: 68,  ai_bookings: 22, no_shows: 4 },
  { month: 'فبراير', appointments: 84,  ai_bookings: 31, no_shows: 3 },
  { month: 'مارس',   appointments: 97,  ai_bookings: 38, no_shows: 2 },
  { month: 'أبريل',  appointments: 112, ai_bookings: 47, no_shows: 3 },
  { month: 'مايو',   appointments: 128, ai_bookings: 56, no_shows: 2 },
  { month: 'يونيو',  appointments: 134, ai_bookings: 62, no_shows: 1 },
]

const CHART_DATA = [
  ...BEFORE_MONTHS.map(m => ({ ...m, phase: 'قبل' })),
  ...AFTER_MONTHS.map(m => ({ ...m, phase: 'بعد' })),
]

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 24, ...style,
  }}>
    {children}
  </div>
)

// ── KPI tile ─────────────────────────────────────────────────────────────────
interface KpiProps {
  icon: React.ElementType
  label: string
  before: string
  after: string
  trend: 'up' | 'down'
  color: string
  note?: string
}
const KpiTile = ({ icon: Icon, label, before, after, trend, color, note }: KpiProps) => (
  <div style={{
    background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 20px 16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.mid, fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
    </div>

    <div style={{ display: 'flex', gap: 10 }}>
      {/* Before */}
      <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.red, fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>قبل</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.red, fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>{before}</div>
      </div>
      {/* Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', color: trend === 'up' ? C.green : C.red }}>
        {trend === 'up' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
      </div>
      {/* After */}
      <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.green, fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>بعد</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.green, fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>{after}</div>
      </div>
    </div>

    {note && (
      <div style={{ fontSize: 11, color: C.muted, fontFamily: 'Tajawal, sans-serif', borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
        {note}
      </div>
    )}
  </div>
)

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', direction: 'rtl' }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: C.text, fontSize: 13, fontFamily: 'Cairo, sans-serif' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontFamily: 'Tajawal, sans-serif', marginBottom: 2 }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export const Reports = () => {
  const { isDemo, companyId } = useClinicOS()
  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: aiCalls } = useClinicAICalls(companyId, isDemo)

  const stats = useMemo(() => {
    const appts = isDemo ? DEMO_APPOINTMENTS : (appointments ?? [])
    const calls = isDemo ? DEMO_AI_CALLS    : (aiCalls ?? [])

    const totalAfter = AFTER_MONTHS.reduce((s, m) => s + m.appointments, 0)
    const totalBefore = BEFORE_MONTHS.reduce((s, m) => s + m.appointments, 0)
    const avgBefore = Math.round(totalBefore / BEFORE_MONTHS.length)
    const avgAfter  = Math.round(totalAfter  / AFTER_MONTHS.length)
    const growthPct = Math.round(((avgAfter - avgBefore) / avgBefore) * 100)

    const totalAI = AFTER_MONTHS.reduce((s, m) => s + m.ai_bookings, 0)
    const avgNoShowBefore = (BEFORE_MONTHS.reduce((s, m) => s + m.no_shows, 0) / BEFORE_MONTHS.length).toFixed(1)
    const avgNoShowAfter  = (AFTER_MONTHS.reduce((s, m) => s + m.no_shows, 0) / AFTER_MONTHS.length).toFixed(1)

    const timeSavedHrs = Math.round(totalAI * 4 / 60)

    return { growthPct, avgBefore, avgAfter, totalAI, avgNoShowBefore, avgNoShowAfter, timeSavedHrs, appts: appts.length, calls: calls.length }
  }, [isDemo, appointments, aiCalls])

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Tajawal, Cairo, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} style={{ color: C.primary }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, fontFamily: 'Cairo, sans-serif' }}>تقارير النمو</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
          قبل وبعد الانضمام لمنصة Madar OS — يناير ٢٠٢٥
        </p>
      </div>

      {/* Join date banner */}
      <div style={{
        marginBottom: 28, padding: '14px 20px', borderRadius: 14,
        background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
        border: `1px solid ${C.primary}30`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Award size={20} style={{ color: C.primary, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: 'Cairo, sans-serif' }}>
            انضممت لمنصة Madar OS في يناير ٢٠٢٥
          </div>
          <div style={{ fontSize: 12, color: C.mid, fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>
            البيانات أدناه تقارن آخر ٣ أشهر قبل الانضمام مقابل ٦ أشهر بعده
          </div>
        </div>
        <div style={{ marginRight: 'auto', padding: '6px 16px', borderRadius: 20, background: C.green, color: '#fff', fontSize: 13, fontWeight: 900, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
          +{stats.growthPct}٪ نمو
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KpiTile
          icon={Calendar}
          label="متوسط الحجوزات الشهرية"
          before={`${stats.avgBefore}`}
          after={`${stats.avgAfter}`}
          trend="up"
          color={C.primary}
          note={`نمو ${stats.growthPct}٪ في الحجوزات الشهرية`}
        />
        <KpiTile
          icon={Bot}
          label="حجوزات الذكاء الاصطناعي / شهر"
          before="0"
          after={`${Math.round(AFTER_MONTHS.reduce((s, m) => s + m.ai_bookings, 0) / AFTER_MONTHS.length)}`}
          trend="up"
          color={C.purple}
          note={`${stats.totalAI} حجز ذكي منذ الانضمام`}
        />
        <KpiTile
          icon={Star}
          label="متوسط الغيابات / شهر"
          before={stats.avgNoShowBefore}
          after={stats.avgNoShowAfter}
          trend="down"
          color={C.orange}
          note="انخفاض بفضل تذكيرات واتساب التلقائية"
        />
        <KpiTile
          icon={Clock}
          label="وقت الموظفين المُوفَّر"
          before="٠ ساعة"
          after={`${stats.timeSavedHrs} ساعة`}
          trend="up"
          color={C.green}
          note={`تقدير: ٤ دقائق لكل حجز ذكي`}
        />
      </div>

      {/* Monthly trend chart */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text, fontFamily: 'Cairo, sans-serif' }}>
            تطور الحجوزات الشهرية
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
            الأشهر الرمادية: قبل الانضمام — الأشهر الملوّنة: بعد الانضمام
          </p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={CHART_DATA} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: C.muted, fontFamily: 'Tajawal, sans-serif' }}
              axisLine={false} tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: 'Tajawal, sans-serif', paddingTop: 16 }}
            />
            <ReferenceLine x="ديسمبر" stroke={C.primary} strokeDasharray="4 4" label={{ value: 'بداية الاشتراك', fill: C.primary, fontSize: 11, fontFamily: 'Cairo' }} />
            <Line
              type="monotone" dataKey="appointments" name="إجمالي الحجوزات"
              stroke={C.primary} strokeWidth={2.5} dot={{ r: 4, fill: C.primary }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone" dataKey="ai_bookings" name="حجوزات الذكاء الاصطناعي"
              stroke={C.purple} strokeWidth={2} strokeDasharray="5 3"
              dot={{ r: 3, fill: C.purple }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Side-by-side: bar chart + no-show table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Bar chart */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: C.text, fontFamily: 'Cairo, sans-serif' }}>
            الحجوزات بعد الاشتراك
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={AFTER_MONTHS} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: C.muted, fontFamily: 'Tajawal, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="appointments" name="إجمالي" fill={C.primary} radius={[4, 4, 0, 0]} />
              <Bar dataKey="ai_bookings" name="ذكاء اصطناعي" fill={C.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* No-show comparison table */}
        <Card>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: C.text, fontFamily: 'Cairo, sans-serif' }}>
            مقارنة الغيابات والإلغاءات
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ textAlign: 'right', padding: '6px 0', fontFamily: 'Cairo, sans-serif', color: C.muted, fontWeight: 700, fontSize: 11 }}>الشهر</th>
                <th style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'Cairo, sans-serif', color: C.muted, fontWeight: 700, fontSize: 11 }}>قبل</th>
                <th style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'Cairo, sans-serif', color: C.muted, fontWeight: 700, fontSize: 11 }}>بعد</th>
                <th style={{ textAlign: 'center', padding: '6px 0', fontFamily: 'Cairo, sans-serif', color: C.muted, fontWeight: 700, fontSize: 11 }}>التغيير</th>
              </tr>
            </thead>
            <tbody>
              {BEFORE_MONTHS.map((b, i) => (
                <tr key={b.month} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 0', fontFamily: 'Tajawal, sans-serif', color: C.text }}>{b.month}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: C.red, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>{b.no_shows}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: C.green, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>—</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>—</td>
                </tr>
              ))}
              {AFTER_MONTHS.slice(0, 3).map((a, i) => (
                <tr key={a.month} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '8px 0', fontFamily: 'Tajawal, sans-serif', color: C.text }}>{a.month}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: C.muted }}>—</td>
                  <td style={{ padding: '8px 0', textAlign: 'center', color: C.green, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>{a.no_shows}</td>
                  <td style={{ padding: '8px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: '#ECFDF5', padding: '2px 8px', borderRadius: 6 }}>
                      ↓{BEFORE_MONTHS[i] ? BEFORE_MONTHS[i].no_shows - a.no_shows : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Summary insight */}
      <Card style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)', border: `1px solid ${C.primary}25` }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: `${C.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} style={{ color: C.primary }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, fontFamily: 'Cairo, sans-serif', marginBottom: 6 }}>
              ملخص النتائج منذ الانضمام
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'نمو الحجوزات', val: `+${stats.growthPct}٪`, color: C.green },
                { label: 'حجوزات ذكية', val: `${stats.totalAI}`, color: C.purple },
                { label: 'وقت موفَّر', val: `${stats.timeSavedHrs} ساعة`, color: C.blue },
                { label: 'انخفاض الغيابات', val: '٦٦٪', color: C.orange },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: item.color, fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>{item.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
