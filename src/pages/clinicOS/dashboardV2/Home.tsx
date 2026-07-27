import { useMemo, useState } from 'react'
import {
  CalendarCheck2, CalendarX2, Users, Wallet, ArrowUp, ArrowDown, Download,
  CalendarDays, MessageSquare, PhoneCall, MessageCircle, Star,
} from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import {
  useClinicAppointments, useClinicWeeklyChart, useClinicAICalls, useClinicMessages,
} from '../../../lib/clinicOSQueries'
import { Card, Badge, Button, Toast, type BadgeTone } from '../../../components/clinicOS/v2/primitives'

type Period = 'أسبوعي' | 'شهري'

interface Kpi {
  label: string
  value: string
  delta?: string
  up?: boolean
  icon: React.ReactNode
  tone: BadgeTone
  emphasis?: boolean
  ready?: boolean
}

const TONE_BG: Record<BadgeTone, [string, string]> = {
  brand: ['var(--brand-100)', 'var(--brand-600)'],
  success: ['var(--success-100)', 'var(--success-500)'],
  danger: ['var(--danger-100)', 'var(--danger-500)'],
  warning: ['var(--warning-100)', 'var(--warning-500)'],
  neutral: ['var(--slate-100)', 'var(--slate-600)'],
}

function KpiCard({ k }: { k: Kpi }) {
  const [bg, fg] = TONE_BG[k.tone] || TONE_BG.brand
  return (
    <Card emphasis={k.emphasis} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{k.label}</div>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-full)', background: bg, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{k.icon}</div>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-display-sm)',
        color: k.ready === false ? 'var(--text-tertiary)' : 'var(--text-primary)', marginTop: 10,
      }}>{k.value}</div>
      {k.delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 'var(--text-caption)' }}>
          <span style={{ color: k.up ? 'var(--success-500)' : 'var(--danger-500)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
            {k.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{k.delta}
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>مقارنة بالأسبوع الماضي</span>
        </div>
      )}
      {k.ready === false && (
        <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', marginTop: 6 }}>
          جاهزة لاستقبال البيانات
        </div>
      )}
    </Card>
  )
}

function LineChart({ data }: { data: number[] }) {
  const w = 560, h = 160, pad = 6
  const max = Math.max(1, ...data)
  const pts = data.map((v, i) => [i / Math.max(1, data.length - 1) * (w - 2 * pad) + pad, h - pad - (v / max) * (h - 2 * pad)])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ')
  const area = pts.length ? `${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z` : ''
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="dv2-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-300)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--brand-300)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {pts.length > 0 && <path d={area} fill="url(#dv2-area)" />}
      {pts.length > 0 && <path d={path} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" />}
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--brand-500)" />)}
    </svg>
  )
}

function Donut({ sources }: { sources: { label: string; pct: number; color: string }[] }) {
  let acc = 0
  const stops = sources.map((s) => {
    const start = acc
    acc += s.pct
    return `${s.color} ${start}% ${acc}%`
  }).join(',')
  const total = sources.reduce((a, s) => a + s.pct, 0)
  return (
    <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        background: total > 0 ? `conic-gradient(${stops})` : 'var(--slate-100)',
      }} />
      <div style={{
        position: 'absolute', inset: 22, background: '#fff', borderRadius: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>{total}%</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>موزّعة</div>
      </div>
    </div>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 130, fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{ width: (max > 0 ? value / max * 100 : 0) + '%', height: '100%', background: 'var(--brand-500)', borderRadius: 'var(--radius-full)' }} />
      </div>
      <div style={{ width: 30, fontSize: 'var(--text-body-sm)', fontWeight: 600, textAlign: 'left' }}>{value}</div>
    </div>
  )
}

const SOURCE_COLORS: Record<string, string> = {
  ai_booking: 'var(--brand-500)',
  whatsapp: '#2fbfa0',
  website: 'var(--indigo-500)',
  reception: '#c9b6f5',
  manual: 'var(--slate-400)',
}
const SOURCE_LABELS: Record<string, string> = {
  ai_booking: 'حجز بالذكاء الاصطناعي',
  whatsapp: 'واتساب',
  website: 'الموقع الإلكتروني',
  reception: 'الاستقبال',
  manual: 'يدوي',
}

export function DashboardV2Home() {
  const { companyId, isDemo, clinicName, userName } = useClinicOS()
  const [period, setPeriod] = useState<Period>('أسبوعي')
  const [toast, setToast] = useState<{ title: string; description?: string } | null>(null)

  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: weekly } = useClinicWeeklyChart(companyId, isDemo)
  const { data: aiCalls } = useClinicAICalls(companyId, isDemo)
  const { data: messages } = useClinicMessages(companyId, isDemo)

  const appts = appointments || []
  const completed = appts.filter((a) => a.status === 'completed').length
  const noShow = appts.filter((a) => a.status === 'no_show').length
  const attendanceBase = completed + noShow
  const attendanceRate = attendanceBase > 0 ? Math.round((completed / attendanceBase) * 1000) / 10 : null

  const kpis: Kpi[] = [
    { label: 'إجمالي الحجوزات', value: String(appts.length), icon: <CalendarCheck2 size={17} />, tone: 'brand', emphasis: true },
    { label: 'الحجوزات المكتملة', value: String(completed), icon: <CalendarCheck2 size={17} />, tone: 'success' },
    { label: 'مواعيد لم تحضر', value: String(noShow), icon: <CalendarX2 size={17} />, tone: 'danger' },
    { label: 'معدل الحضور', value: attendanceRate != null ? `${attendanceRate}%` : '—', icon: <Users size={17} />, tone: 'brand', ready: attendanceRate != null },
    { label: 'إجمالي الإيرادات', value: 'بانتظار الربط', icon: <Wallet size={17} />, tone: 'warning', ready: false },
  ]

  const weeklyData = useMemo(() => (weekly || []).map((w) => w.appointments), [weekly])
  const weeklyLabel = period === 'أسبوعي' ? 'آخر 7 أيام' : 'آخر 7 أيام (شهري قريباً)'

  const sources = useMemo(() => {
    const counts: Record<string, number> = {}
    appts.forEach((a) => { counts[a.source] = (counts[a.source] || 0) + 1 })
    const total = appts.length || 1
    return Object.entries(counts).map(([key, count]) => ({
      label: SOURCE_LABELS[key] || key,
      pct: Math.round((count / total) * 100),
      color: SOURCE_COLORS[key] || 'var(--slate-400)',
    }))
  }, [appts])

  const calls = aiCalls || []
  const aiStats = [
    { label: 'مكالمات الذكاء الاصطناعي', value: String(calls.length), icon: <PhoneCall size={16} /> },
    { label: 'تم إنجازها بنجاح', value: String(calls.filter((c) => c.status === 'completed').length), icon: <MessageCircle size={16} /> },
    { label: 'انتهت بحجز موعد', value: String(calls.filter((c) => c.result === 'booked').length), icon: <CalendarCheck2 size={16} /> },
    { label: 'تحتاج مراجعة بشرية', value: String(calls.filter((c) => c.needs_review).length), icon: <Users size={16} /> },
  ]

  const services = useMemo(() => {
    const counts: Record<string, number> = {}
    appts.forEach((a) => { counts[a.service_name] = (counts[a.service_name] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [appts])
  const maxService = Math.max(1, ...services.map(([, v]) => v))

  const recentMessages = (messages || []).slice(0, 5)

  function exportReport() {
    setToast({ title: 'قريباً', description: 'تصدير التقارير سيتوفر مع ربط بيانات الإيرادات.' })
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
            مرحباً {userName || ''}
          </div>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
            إليك نظرة عامة على أداء {clinicName || 'عملك'} اليوم.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 13,
            color: 'var(--text-secondary)', background: '#fff',
          }}>
            <CalendarDays size={15} />{weeklyLabel}
          </div>
          <Button onClick={exportReport}><Download size={15} /> تصدير تقرير</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpis.map((k, i) => <KpiCard key={i} k={k} />)}
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700 }}>الحجوزات</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['أسبوعي', 'شهري'] as Period[]).map((p) => (
                <div key={p} onClick={() => setPeriod(p)} style={{
                  padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, cursor: 'pointer',
                  background: p === period ? 'var(--brand-100)' : 'transparent',
                  color: p === period ? 'var(--brand-600)' : 'var(--text-tertiary)', fontWeight: 600,
                }}>{p}</div>
              ))}
            </div>
          </div>
          <LineChart data={weeklyData} />
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>مصادر الحجوزات</div>
          <Donut sources={sources} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {sources.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد حجوزات بعد</div>}
            {sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            أداء الذكاء الاصطناعي <Badge tone="brand">AI</Badge>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {aiStats.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{a.icon}</div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{a.label}</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>أعلى الخدمات حجوزاً</div>
          {services.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد بيانات بعد</div>}
          {services.map(([label, value]) => <Bar key={label} label={label} value={value} max={maxService} />)}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={16} style={{ color: 'var(--warning-500)' }} /> AI Google Reviews
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '18px 0', textAlign: 'center' }}>
            جاهزة لاستقبال بيانات Google — يُربط عند تفعيل تكامل Google Business Profile.
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>آخر المحادثات</div>
          </div>
          {recentMessages.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد محادثات بعد</div>}
          {recentMessages.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.recipient_name}</div>
              <div style={{ color: '#2fbf6f' }}><MessageSquare size={15} /></div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 56, textAlign: 'left' }}>
                {new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, insetInlineStart: 24, zIndex: 100 }}>
          <Toast tone="brand" title={toast.title} description={toast.description} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  )
}
