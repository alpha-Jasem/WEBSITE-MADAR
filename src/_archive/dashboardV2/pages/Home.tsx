import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck2, CalendarX2, Users, Wallet, ArrowUp, ArrowDown, Download,
  CalendarDays, MessageSquare, PhoneCall, MessageCircle, Star, FileSpreadsheet, Printer,
} from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import {
  useClinicAppointments, useClinicWeeklyChart, useClinicPreviousWeekChart, useClinicAICalls, useClinicMessages,
} from '@/lib/clinicOSQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card, Badge, Button, type BadgeTone } from '@/_archive/dashboardV2/components/primitives'
import { CountUp, useToast, Avatar, Sparkline, LiveDot, Menu } from '@/_archive/dashboardV2/components/uiExtras'
import type { Appointment } from '@/types/clinicOS'

type Period = 'أسبوعي' | 'شهري'

interface Kpi {
  label: string
  value: string
  numeric?: number
  suffix?: string
  delta?: string
  up?: boolean
  icon: React.ReactNode
  tone: BadgeTone
  emphasis?: boolean
  ready?: boolean
  trend?: number[]
}

const TONE_BG: Record<BadgeTone, [string, string]> = {
  brand: ['var(--brand-100)', 'var(--brand-600)'],
  success: ['var(--success-100)', 'var(--success-500)'],
  danger: ['var(--danger-100)', 'var(--danger-500)'],
  warning: ['var(--warning-100)', 'var(--warning-500)'],
  neutral: ['var(--slate-100)', 'var(--slate-600)'],
}

function KpiCard({ k, index = 0 }: { k: Kpi; index?: number }) {
  const [bg, fg] = TONE_BG[k.tone] || TONE_BG.brand
  return (
    <Card emphasis={k.emphasis} glass glow interactive delay={index * 0.06} style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: index * 0.06 + 0.15, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute', top: -34, insetInlineEnd: -30, width: 110, height: 110, borderRadius: '50%',
          background: `radial-gradient(circle, ${fg} 0%, transparent 70%)`, opacity: 0.14, pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-secondary)' }}>{k.label}</div>
          <motion.div
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            style={{
              width: 38, height: 38, borderRadius: 'var(--radius-md)',
              background: `linear-gradient(145deg, ${bg}, color-mix(in srgb, ${bg} 55%, white))`,
              color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: `0 4px 14px color-mix(in srgb, ${fg} 28%, transparent)`,
            }}
          >{k.icon}</motion.div>
        </div>

        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-display-sm)',
          fontVariantNumeric: 'tabular-nums', marginTop: 10,
          color: k.ready === false ? 'var(--text-tertiary)' : 'var(--text-primary)',
        }}>{k.numeric != null ? <CountUp value={k.numeric} suffix={k.suffix} /> : k.value}</div>

        {k.delta && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 'var(--text-caption)' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, padding: '2px 7px',
              borderRadius: 'var(--radius-full)',
              background: k.up ? 'var(--success-100)' : 'var(--danger-100)',
              color: k.up ? 'var(--success-500)' : 'var(--danger-500)',
            }}>
              {k.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{k.delta}
            </span>
            <span style={{ color: 'var(--text-tertiary)' }}>مقارنة بالأسبوع الماضي</span>
          </div>
        )}
        {k.ready === false && (
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', marginTop: 6 }}>
            جاهزة لاستقبال البيانات
          </div>
        )}
        {(!k.delta && k.ready !== false) && <div style={{ height: 22 }} />}
      </div>

      {k.trend && k.trend.length > 1 && (
        <div style={{ position: 'absolute', insetInlineStart: 24, insetInlineEnd: 24, bottom: 0, height: 32, zIndex: 0, pointerEvents: 'none' }}>
          <Sparkline data={k.trend} color={fg} variant="area" height={32} id={k.label} />
        </div>
      )}
    </Card>
  )
}

function LineChart({ data, compareData, labels }: { data: number[]; compareData?: number[] | null; labels?: string[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const w = 560, h = 160, pad = 6
  const max = Math.max(1, ...data, ...(compareData || []))
  const toPts = (arr: number[]) => arr.map((v, i) => [i / Math.max(1, arr.length - 1) * (w - 2 * pad) + pad, h - pad - (v / max) * (h - 2 * pad)] as const)
  const pts = toPts(data)
  const comparePts = compareData && compareData.length > 1 ? toPts(compareData) : null
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ')
  const comparePath = comparePts ? comparePts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ',' + p[1]).join(' ') : null
  const area = pts.length ? `${path} L${pts[pts.length - 1][0]},${h} L${pts[0][0]},${h} Z` : ''
  const cellW = w / Math.max(1, data.length)

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="dv2-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-300)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-300)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {pts.length > 0 && <path d={area} fill="url(#dv2-area)" />}
        {comparePath && <path d={comparePath} fill="none" stroke="var(--slate-300)" strokeWidth="2" strokeDasharray="4 4" />}
        {pts.length > 0 && <path d={path} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" />}
        {pts.map((p, i) => (
          <g key={i}>
            {hover === i && <line x1={p[0]} y1={0} x2={p[0]} y2={h} stroke="var(--border-default)" strokeWidth="1" strokeDasharray="3 3" />}
            <circle cx={p[0]} cy={p[1]} r={hover === i ? 4.5 : 2.5} fill="var(--brand-500)" style={{ transition: 'r 120ms ease' }} />
            <rect x={p[0] - cellW / 2} y={0} width={cellW} height={h} fill="transparent" onMouseEnter={() => setHover(i)} style={{ cursor: 'pointer' }} />
          </g>
        ))}
      </svg>
      <AnimatePresence>
        {hover != null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', left: `${(pts[hover][0] / w) * 100}%`, top: `${(pts[hover][1] / h) * 100}%`,
              transform: 'translate(-50%, -130%)', pointerEvents: 'none', zIndex: 5,
              background: 'var(--surface-inverse)', color: '#fff', padding: '6px 10px', borderRadius: 'var(--radius-sm)',
              fontSize: 11.5, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-md)', textAlign: 'center',
            }}
          >
            {labels?.[hover] && <div style={{ opacity: 0.7, fontSize: 10 }}>{labels[hover]}</div>}
            <div style={{ fontWeight: 700 }}>
              {data[hover]}{comparePts && ` (سابقاً ${compareData![hover]})`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Donut({ sources, onSelect }: { sources: { key: string; label: string; pct: number; color: string }[]; onSelect?: (key: string) => void }) {
  let acc = 0
  const stops = sources.map((s) => {
    const start = acc
    acc += s.pct
    return `${s.color} ${start}% ${acc}%`
  }).join(',')
  const total = sources.reduce((a, s) => a + s.pct, 0)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSelect || total === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
    const pct = (angle / 360) * 100
    let acc2 = 0
    for (const s of sources) {
      acc2 += s.pct
      if (pct <= acc2) { onSelect(s.key); return }
    }
  }

  return (
    <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
      <div
        onClick={handleClick}
        style={{
          width: '100%', height: '100%', borderRadius: '50%', cursor: onSelect && total > 0 ? 'pointer' : 'default',
          background: total > 0 ? `conic-gradient(${stops})` : 'var(--slate-100)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 22, background: 'var(--surface-card)', borderRadius: '50%', pointerEvents: 'none',
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
const STATUS_LABEL: Record<string, string> = {
  confirmed: 'مؤكد', pending: 'قيد الانتظار', checked_in: 'تم الوصول', completed: 'مكتمل',
  cancelled: 'ملغى', no_show: 'لم يحضر', rescheduled: 'مؤجل', needs_review: 'يحتاج مراجعة',
}

export function DashboardV2Home() {
  const { companyId, isDemo, clinicName, userName } = useClinicOS()
  const [period, setPeriod] = useState<Period>('أسبوعي')
  const [compare, setCompare] = useState(false)
  const pushToast = useToast()

  const { data: appointments, live: appointmentsLive } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: weekly } = useClinicWeeklyChart(companyId, isDemo)
  const { data: prevWeekly } = useClinicPreviousWeekChart(companyId, isDemo)
  const { data: aiCalls } = useClinicAICalls(companyId, isDemo)
  const { data: messages, live: messagesLive } = useClinicMessages(companyId, isDemo)

  const appts = appointments || []
  const completed = appts.filter((a) => a.status === 'completed').length
  const noShow = appts.filter((a) => a.status === 'no_show').length
  const attendanceBase = completed + noShow
  const attendanceRate = attendanceBase > 0 ? Math.round((completed / attendanceBase) * 1000) / 10 : null

  const weeklyData = useMemo(() => (weekly || []).map((w) => w.appointments), [weekly])
  const weeklyLabels = useMemo(() => (weekly || []).map((w) => w.day), [weekly])
  const prevWeeklyData = useMemo(() => (prevWeekly || []).map((w) => w.appointments), [prevWeekly])
  const completedTrend = useMemo(() => (weekly || []).map((w) => w.completed), [weekly])
  const weeklyLabel = period === 'أسبوعي' ? 'آخر 7 أيام' : 'آخر 7 أيام (شهري قريباً)'

  const kpis: Kpi[] = [
    { label: 'إجمالي الحجوزات', value: String(appts.length), numeric: appts.length, icon: <CalendarCheck2 size={17} />, tone: 'brand', emphasis: true, trend: weeklyData },
    { label: 'الحجوزات المكتملة', value: String(completed), numeric: completed, icon: <CalendarCheck2 size={17} />, tone: 'success', trend: completedTrend },
    { label: 'مواعيد لم تحضر', value: String(noShow), numeric: noShow, icon: <CalendarX2 size={17} />, tone: 'danger' },
    { label: 'معدل الحضور', value: attendanceRate != null ? `${attendanceRate}%` : '—', numeric: attendanceRate ?? undefined, suffix: '%', icon: <Users size={17} />, tone: 'brand', ready: attendanceRate != null },
    { label: 'إجمالي الإيرادات', value: 'بانتظار الربط', icon: <Wallet size={17} />, tone: 'warning', ready: false },
  ]

  const sources = useMemo(() => {
    const counts: Record<string, number> = {}
    appts.forEach((a) => { counts[a.source] = (counts[a.source] || 0) + 1 })
    const total = appts.length || 1
    return Object.entries(counts).map(([key, count]) => ({
      key,
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

  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'

  function goToBookingsBySource(sourceKey: string) {
    navigate(`${base}/bookings?source=${sourceKey}`)
  }

  const EXPORT_COLUMNS = [
    { key: 'patient_name', label: 'العميل' },
    { key: 'service_name', label: 'الخدمة' },
    { key: 'appointment_date', label: 'التاريخ' },
    { key: 'start_time', label: 'الوقت' },
    { key: 'status', label: 'الحالة' },
    { key: 'source', label: 'المصدر' },
  ]

  function appointmentsInRange(range: 'week' | 'month' | 'all'): Appointment[] {
    if (range === 'all') return appts
    const now = new Date()
    const cutoff = new Date(now)
    if (range === 'week') cutoff.setDate(now.getDate() - 7)
    else cutoff.setMonth(now.getMonth() - 1)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    return appts.filter((a) => a.appointment_date >= cutoffStr)
  }

  function exportExcel(range: 'week' | 'month' | 'all') {
    const rows = appointmentsInRange(range)
    if (rows.length === 0) {
      pushToast({ kind: 'info', title: 'لا توجد بيانات للتصدير' })
      return
    }
    exportRowsToExcel(`تقرير-الحجوزات-${range}`, [{
      name: 'الحجوزات',
      rows: rows.map((a) => ({
        العميل: a.patient_name, الخدمة: a.service_name, التاريخ: a.appointment_date,
        الوقت: a.start_time, الحالة: STATUS_LABEL[a.status] || a.status, المصدر: SOURCE_LABELS[a.source] || a.source,
      })),
    }])
    pushToast({ kind: 'success', title: 'تم تصدير التقرير' })
  }

  async function exportPdf(range: 'week' | 'month' | 'all') {
    const rows = appointmentsInRange(range)
    if (rows.length === 0) {
      pushToast({ kind: 'info', title: 'لا توجد بيانات للتصدير' })
      return
    }
    const { printRowsAsPdf } = await import('@/lib/exportPdf')
    printRowsAsPdf('تقرير الحجوزات', EXPORT_COLUMNS, rows.map((a) => ({
      patient_name: a.patient_name, service_name: a.service_name, appointment_date: a.appointment_date,
      start_time: a.start_time, status: STATUS_LABEL[a.status] || a.status, source: SOURCE_LABELS[a.source] || a.source,
    })))
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
          <Menu
            trigger={<Button><Download size={15} /> تصدير تقرير</Button>}
            items={[
              { label: 'Excel — آخر أسبوع', icon: <FileSpreadsheet size={14} />, onClick: () => exportExcel('week') },
              { label: 'Excel — آخر شهر', icon: <FileSpreadsheet size={14} />, onClick: () => exportExcel('month') },
              { label: 'Excel — الكل', icon: <FileSpreadsheet size={14} />, onClick: () => exportExcel('all') },
              { label: 'PDF — آخر أسبوع', icon: <Printer size={14} />, onClick: () => exportPdf('week') },
              { label: 'PDF — الكل', icon: <Printer size={14} />, onClick: () => exportPdf('all') },
            ]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpis.map((k, i) => <KpiCard key={i} k={k} index={i} />)}
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card delay={0.24}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700 }}>الحجوزات</div>
              <LiveDot live={appointmentsLive} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div
                onClick={() => setCompare((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  background: compare ? 'var(--slate-100)' : 'transparent',
                  color: compare ? 'var(--text-primary)' : 'var(--text-tertiary)', border: '1px solid var(--border-default)',
                }}
              >
                <span style={{ width: 8, height: 2, background: 'var(--slate-400)', display: 'inline-block' }} />
                مقارنة بالأسبوع الماضي
              </div>
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
          </div>
          <LineChart data={weeklyData} labels={weeklyLabels} compareData={compare ? prevWeeklyData : null} />
        </Card>

        <Card delay={0.3}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>مصادر الحجوزات</div>
          <Donut sources={sources} onSelect={goToBookingsBySource} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {sources.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد حجوزات بعد</div>}
            {sources.map((s) => (
              <div
                key={s.key}
                onClick={() => goToBookingsBySource(s.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card delay={0.36}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>آخر المحادثات</div>
            <LiveDot live={messagesLive} />
          </div>
          {recentMessages.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد محادثات بعد</div>}
          {recentMessages.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar name={c.recipient_name} size={32} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.recipient_name}</div>
              <div style={{ color: '#2fbf6f' }}><MessageSquare size={15} /></div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 56, textAlign: 'left' }}>
                {new Date(c.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
