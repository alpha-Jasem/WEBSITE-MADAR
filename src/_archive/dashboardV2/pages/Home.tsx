import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  CalendarCheck2, CalendarX2, Users, Wallet, ArrowUp, ArrowDown, Download,
  CalendarDays, MessageSquare, Star, FileSpreadsheet, Printer,
  Plus, Settings as SettingsIcon, Ticket, Search, UserPlus, Wrench as WrenchIcon,
} from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import {
  useClinicAppointments, useClinicWeeklyChart, useClinicPreviousWeekChart, useClinicAICalls, useClinicMessages,
  useClinicNotifications, useClinicIntegrations, useClinicSupportTickets, createSupportTicket,
} from '@/lib/clinicOSQueries'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { Card, Badge, Button, Dialog, Input, Select, type BadgeTone } from '@/_archive/dashboardV2/components/primitives'
import { CountUp, useToast, Avatar, Sparkline, LiveDot, Menu, KpiCardSkeleton, requestOpenSearch, Skeleton } from '@/_archive/dashboardV2/components/uiExtras'
import {
  Donut, RadialDial, AgentHeroCard, AiPerformanceCard, TodayTimeline, SystemHealthRow, ActivityFeed, InsightBanner, TicketPreviewCard, timeAgo,
} from './HomeWidgets'
import type { Appointment, TicketPriority } from '@/types/clinicOS'

type Period = 'أسبوعي' | 'شهري'

type KpiVariant = 'lift-glow' | 'count-spin' | 'pulse-ring' | 'tilt-shift' | 'sheen'

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
  variant: KpiVariant
  footer?: React.ReactNode
}

const TONE_BG: Record<BadgeTone, [string, string]> = {
  brand: ['var(--brand-100)', 'var(--brand-600)'],
  success: ['var(--success-100)', 'var(--success-500)'],
  danger: ['var(--danger-100)', 'var(--danger-500)'],
  warning: ['var(--warning-100)', 'var(--warning-500)'],
  neutral: ['var(--slate-100)', 'var(--slate-600)'],
}

const KPI_EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
const KPI_EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1]

function KpiCard({ k, index = 0, hero = false }: { k: Kpi; index?: number; hero?: boolean }) {
  const [bg, fg] = TONE_BG[k.tone] || TONE_BG.brand
  const reduced = useReducedMotion()
  const [hovered, setHovered] = useState(false)

  // Each variant maps to a distinct whileHover treatment on the card shell — deliberately not identical.
  const cardWhileHover = reduced ? undefined : ({
    'lift-glow': { y: -4, boxShadow: `0 10px 32px color-mix(in srgb, ${fg} 26%, transparent)` },
    'count-spin': { y: -2 },
    'pulse-ring': undefined,
    'tilt-shift': { x: 4, rotate: -0.6 },
    'sheen': { y: -2 },
  } as Record<KpiVariant, Record<string, unknown> | undefined>)[k.variant]

  const iconWhileHover = reduced ? undefined : (
    k.variant === 'count-spin' ? { rotate: 360, scale: 1.12 } : { rotate: -8, scale: 1.08 }
  )
  const iconTransition = k.variant === 'count-spin'
    ? { duration: 0.34, ease: KPI_EASE_OUT }
    : { type: 'spring' as const, stiffness: 300, damping: 15 }

  return (
    <Card delay={index * 0.06} style={{
      flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden',
      padding: hero ? 'var(--space-8)' : 'var(--space-4)',
      display: hero ? 'flex' : undefined, flexDirection: hero ? 'column' : undefined, justifyContent: hero ? 'space-between' : undefined,
      minHeight: hero ? 200 : undefined,
    }}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={cardWhileHover}
        transition={{ duration: 0.2, ease: KPI_EASE_OUT }}
        style={{ position: 'relative' }}
      >
        {/* pulse-ring: only for the no-show/attention KPI — a warning ring that radiates while hovered */}
        {k.variant === 'pulse-ring' && !reduced && (
          <AnimatePresence>
            {hovered && (
              <motion.div
                aria-hidden
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: KPI_EASE_IN_OUT }}
                style={{
                  position: 'absolute', top: 18, insetInlineEnd: 20, width: 38, height: 38, borderRadius: 'var(--radius-md)',
                  border: `2px solid ${fg}`, pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>
        )}

        {/* sheen: only for the revenue/placeholder KPI — a light sweep across the card while hovered */}
        {k.variant === 'sheen' && !reduced && (
          <motion.div
            aria-hidden
            initial={{ x: '-120%' }}
            animate={hovered ? { x: '120%' } : { x: '-120%' }}
            transition={{ duration: 0.6, ease: KPI_EASE_OUT }}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(120deg, transparent 20%, rgba(255,255,255,.35) 45%, transparent 70%)',
              mixBlendMode: 'overlay',
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {hero ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 'var(--text-body-md)', color: 'var(--text-secondary)', fontWeight: 600 }}>{k.label}</div>
              <motion.div
                whileHover={iconWhileHover}
                transition={iconTransition}
                style={{
                  width: 46, height: 46, borderRadius: 'var(--radius-md)',
                  background: `linear-gradient(145deg, ${bg}, color-mix(in srgb, ${bg} 55%, white))`,
                  color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), 0 4px 14px color-mix(in srgb, ${fg} 28%, transparent)`,
                }}
              >{k.icon}</motion.div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <motion.div
                whileHover={iconWhileHover}
                transition={iconTransition}
                style={{
                  width: 26, height: 26, borderRadius: 'var(--radius-sm)', background: bg, color: fg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >{k.icon}</motion.div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontWeight: 500 }}>{k.label}</div>
            </div>
          )}

          {hero && (
            <div style={{
              fontFamily: 'var(--font-numeral)', fontWeight: 900, fontSize: 'var(--text-display-lg)',
              fontVariantNumeric: 'tabular-nums', marginTop: 16, letterSpacing: 'var(--tracking-tight)',
              color: k.ready === false ? 'var(--text-tertiary)' : 'var(--text-primary)',
            }}>{k.numeric != null ? <CountUp value={k.numeric} suffix={k.suffix} /> : k.value}</div>
          )}

          {!hero && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
              <div style={{
                fontFamily: 'var(--font-numeral)', fontWeight: 700, fontSize: 'var(--text-heading-lg)',
                fontVariantNumeric: 'tabular-nums', letterSpacing: 'var(--tracking-tight)',
                color: k.ready === false ? 'var(--text-tertiary)' : 'var(--text-primary)',
              }}>{k.numeric != null ? <CountUp value={k.numeric} suffix={k.suffix} /> : k.value}</div>
              {k.delta && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, padding: '2px 7px',
                  borderRadius: 'var(--radius-full)', fontSize: 'var(--text-caption)',
                  background: k.up ? 'var(--success-100)' : 'var(--danger-100)',
                  color: k.up ? 'var(--success-500)' : 'var(--danger-500)',
                }}>
                  {k.up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{k.delta}
                </span>
              )}
            </div>
          )}

          {hero && k.delta && (
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
          {!hero && k.delta && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>مقارنة بالأسبوع الماضي</div>
          )}
          {k.ready === false && (
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', marginTop: 6 }}>
              جاهزة لاستقبال البيانات
            </div>
          )}
          {(!k.delta && k.ready !== false) && <div style={{ height: 18 }} />}
          {k.footer}
        </div>

        {k.trend && k.trend.length > 1 && (
          <div style={{ position: 'absolute', insetInlineStart: hero ? 32 : 24, insetInlineEnd: hero ? 32 : 24, bottom: 0, height: hero ? 56 : 32, zIndex: 0, pointerEvents: 'none' }}>
            <Sparkline data={k.trend} color={fg} variant="area" height={hero ? 56 : 32} id={k.label} />
          </div>
        )}
      </motion.div>
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

function SectionSkeleton({ delay = 0, lines = 4, withCircle }: { delay?: number; lines?: number; withCircle?: boolean }) {
  return (
    <Card delay={delay}>
      <Skeleton width="40%" height={14} style={{ marginBottom: 18 }} />
      {withCircle ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <Skeleton width={104} height={104} radius="50%" />
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} width={`${85 - i * 8}%`} height={12} />
        ))}
      </div>
    </Card>
  )
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? value / max * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 130, fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: pct + '%' }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.8 }}
          style={{ height: '100%', background: 'var(--brand-500)', borderRadius: 'var(--radius-full)' }}
        />
      </div>
      <div style={{ width: 30, fontSize: 'var(--text-body-sm)', fontWeight: 600, textAlign: 'left' }}><CountUp value={value} /></div>
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
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [ticketForm, setTicketForm] = useState({ subject: '', description: '', priority: 'normal' as TicketPriority })
  const [savingTicket, setSavingTicket] = useState(false)
  const pushToast = useToast()

  const { data: appointments, loading: appointmentsLoading, live: appointmentsLive } = useClinicAppointments(companyId, undefined, isDemo)
  const { data: weekly, loading: weeklyLoading } = useClinicWeeklyChart(companyId, isDemo)
  const { data: prevWeekly } = useClinicPreviousWeekChart(companyId, isDemo)
  const { data: aiCalls, loading: aiCallsLoading } = useClinicAICalls(companyId, isDemo)
  const { data: messages, live: messagesLive, loading: messagesLoading } = useClinicMessages(companyId, isDemo)
  const { data: notifications, loading: notificationsLoading } = useClinicNotifications(companyId, isDemo)
  const { data: integrations, loading: integrationsLoading } = useClinicIntegrations(companyId, isDemo)
  const { data: tickets, refetch: refetchTickets, loading: ticketsLoading } = useClinicSupportTickets(companyId, isDemo)

  const chartRowLoading = weeklyLoading || aiCallsLoading
  const timelineRowLoading = appointmentsLoading || integrationsLoading
  const feedRowLoading = notificationsLoading || aiCallsLoading || messagesLoading || ticketsLoading

  const appts = appointments || []
  const completed = appts.filter((a) => a.status === 'completed').length
  const noShow = appts.filter((a) => a.status === 'no_show').length
  const attendanceBase = completed + noShow
  const attendanceRate = attendanceBase > 0 ? Math.round((completed / attendanceBase) * 1000) / 10 : null

  const lastNoShow = useMemo(() => {
    const rows = appts.filter((a) => a.status === 'no_show')
    if (rows.length === 0) return null
    return [...rows].sort((a, b) => `${b.appointment_date}T${b.start_time}`.localeCompare(`${a.appointment_date}T${a.start_time}`))[0]
  }, [appts])

  const weeklyData = useMemo(() => (weekly || []).map((w) => w.appointments), [weekly])
  const weeklyLabels = useMemo(() => (weekly || []).map((w) => w.day), [weekly])
  const prevWeeklyData = useMemo(() => (prevWeekly || []).map((w) => w.appointments), [prevWeekly])
  const completedTrend = useMemo(() => (weekly || []).map((w) => w.completed), [weekly])
  const weeklyLabel = period === 'أسبوعي' ? 'آخر 7 أيام' : 'آخر 7 أيام (شهري قريباً)'

  const kpis: Kpi[] = [
    { label: 'إجمالي الحجوزات', value: String(appts.length), numeric: appts.length, icon: <CalendarCheck2 size={17} />, tone: 'brand', emphasis: true, trend: weeklyData, variant: 'lift-glow' },
    { label: 'الحجوزات المكتملة', value: String(completed), numeric: completed, icon: <CalendarCheck2 size={17} />, tone: 'success', trend: completedTrend, variant: 'count-spin' },
    {
      label: 'مواعيد لم تحضر', value: String(noShow), numeric: noShow, icon: <CalendarX2 size={17} />, tone: 'danger', variant: 'pulse-ring',
      footer: (
        <div style={{ borderTop: '1px dashed var(--border-default)', marginTop: 14, paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>آخر موعد لم يُحضَر</div>
          {lastNoShow ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastNoShow.patient_name} — {lastNoShow.service_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                {timeAgo(`${lastNoShow.appointment_date}T${lastNoShow.start_time}`)}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد مواعيد فائتة — كله تمام</div>
          )}
        </div>
      ),
    },
    { label: 'معدل الحضور', value: attendanceRate != null ? `${attendanceRate}%` : '—', numeric: attendanceRate ?? undefined, suffix: '%', icon: <Users size={17} />, tone: 'brand', ready: attendanceRate != null, variant: 'tilt-shift' },
    { label: 'إجمالي الإيرادات', value: 'بانتظار الربط', icon: <Wallet size={17} />, tone: 'warning', ready: false, variant: 'sheen' },
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
  const notifs = notifications || []
  const integrationsList = integrations || []
  const ticketsList = tickets || []

  const todayStr = new Date().toISOString().split('T')[0]
  const todayCalls = useMemo(() => calls.filter((c) => c.call_time.slice(0, 10) === todayStr), [calls, todayStr])
  const todayBookings = useMemo(() => appts.filter((a) => a.appointment_date === todayStr), [appts, todayStr])
  const escalatedToday = todayCalls.filter((c) => c.needs_review).length
  const lastCall = calls.length > 0 ? [...calls].sort((a, b) => new Date(b.call_time).getTime() - new Date(a.call_time).getTime())[0] : null

  const topSource = sources.length > 0 ? [...sources].sort((a, b) => b.pct - a.pct)[0] : undefined

  async function handleCreateTicket() {
    if (!ticketForm.subject.trim() || !companyId) return
    if (isDemo) {
      pushToast({ kind: 'info', title: 'غير متاح بوضع العرض التجريبي' })
      setTicketDialogOpen(false)
      return
    }
    setSavingTicket(true)
    try {
      await createSupportTicket({
        company_id: companyId, subject: ticketForm.subject, description: ticketForm.description, priority: ticketForm.priority,
      })
      pushToast({ kind: 'success', title: 'تم إنشاء التذكرة' })
      setTicketDialogOpen(false)
      setTicketForm({ subject: '', description: '', priority: 'normal' })
      refetchTickets()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر إنشاء التذكرة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSavingTicket(false)
    }
  }

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
            color: 'var(--text-secondary)', background: 'var(--surface-card)',
          }}>
            <CalendarDays size={15} />{weeklyLabel}
          </div>
          <Menu
            trigger={<Button variant="secondary"><Download size={15} /> تصدير تقرير</Button>}
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button variant="primary" size="md" onClick={() => navigate(`${base}/bookings?new=1`)}><Plus size={16} /> حجز جديد</Button>
        <Button variant="secondary" size="md" onClick={() => setTicketDialogOpen(true)}><Ticket size={15} /> تذكرة جديدة</Button>
        <Button variant="secondary" size="md" onClick={() => requestOpenSearch()}><Search size={15} /> بحث</Button>
        <Button variant="secondary" size="md" onClick={() => navigate(`${base}/patients`)}><UserPlus size={15} /> العملاء</Button>
        <Button variant="secondary" size="md" onClick={() => navigate(`${base}/services`)}><WrenchIcon size={15} /> الخدمات</Button>
        <Button variant="secondary" size="md" onClick={() => navigate(`${base}/settings`)}><SettingsIcon size={15} /> الإعدادات</Button>
      </div>

      {appointmentsLoading ? <KpiCardSkeleton /> : (
        <>
          <div className="dv2-kpi-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
            <AgentHeroCard todayCalls={todayCalls.length} todayBookings={todayBookings.length} escalatedToday={escalatedToday} lastCall={lastCall} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'start' }}>
              <KpiCard k={kpis[0]} index={0} />
              <KpiCard k={kpis[1]} index={1} />
              <KpiCard k={kpis[2]} index={2} />
              <Card delay={0.18} style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>معدل الحضور</div>
                <RadialDial pct={kpis[3].numeric ?? 0} sublabel={kpis[3].ready === false ? 'بانتظار بيانات' : undefined} />
                <div style={{ borderTop: '1px dashed var(--border-default)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>الحجوزات المكتملة</div>
                  <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 'var(--text-heading-lg)', marginTop: 2 }}><CountUp value={completed} /></div>
                </div>
                <Button variant="secondary" size="sm" style={{ width: '100%', marginTop: 12 }} onClick={() => navigate(`${base}/bookings`)}>عرض الحجوزات</Button>
              </Card>
              {/* 5 tiles in a 2-col grid would leave an empty cell — the revenue tile spans the full row instead */}
              <div style={{ gridColumn: '1 / -1', display: 'flex' }}>
                <KpiCard k={kpis[4]} index={4} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <InsightBanner weeklyData={weeklyData} prevWeeklyData={prevWeeklyData} topSource={topSource} delay={0.16} />
          </div>
        </>
      )}

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {chartRowLoading ? (
          <>
            <SectionSkeleton delay={0.24} lines={5} />
            <SectionSkeleton delay={0.3} withCircle lines={3} />
            <SectionSkeleton delay={0.36} withCircle lines={3} />
          </>
        ) : (
          <>
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
                <span style={{ fontWeight: 600 }}><CountUp value={s.pct} suffix="%" /></span>
              </div>
            ))}
          </div>
        </Card>

        <AiPerformanceCard calls={calls} delay={0.36} />
          </>
        )}
      </div>

      <div className="dv2-responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        {timelineRowLoading ? (
          <>
            <SectionSkeleton delay={0.42} lines={1} />
            <SectionSkeleton delay={0.46} lines={5} />
          </>
        ) : (
          <>
        <TodayTimeline appointments={appts} delay={0.42} />
        <SystemHealthRow integrations={integrationsList} delay={0.46} />
          </>
        )}
      </div>

      <div className="dv2-responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
        {feedRowLoading ? (
          <>
            <SectionSkeleton delay={0.5} lines={6} />
            <SectionSkeleton delay={0.5} lines={4} />
          </>
        ) : (
          <>
        <ActivityFeed notifications={notifs} calls={calls} messages={messages || []} appointments={appts} delay={0.5} />
        <TicketPreviewCard
          tickets={ticketsList}
          onCreateClick={() => setTicketDialogOpen(true)}
          onViewAllClick={() => navigate(`${base}/tickets`)}
          delay={0.5}
        />
          </>
        )}
      </div>

      <div className="dv2-responsive-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Card delay={0.5}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>أعلى الخدمات حجوزاً</div>
          {services.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد بيانات بعد</div>}
          {services.map(([label, value]) => <Bar key={label} label={label} value={value} max={maxService} />)}
        </Card>

        <Card delay={0.5}>
          <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={16} style={{ color: 'var(--warning-500)' }} /> AI Google Reviews
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '18px 0', textAlign: 'center' }}>
            جاهزة لاستقبال بيانات Google — يُربط عند تفعيل تكامل Google Business Profile.
          </div>
        </Card>

        <Card delay={0.5}>
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

      <Dialog
        open={ticketDialogOpen} title="تذكرة جديدة" onClose={() => setTicketDialogOpen(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setTicketDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreateTicket} disabled={savingTicket}>{savingTicket ? 'جارِ الحفظ...' : 'إنشاء التذكرة'}</Button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="العنوان" placeholder="مثال: مشكلة بربط واتساب" value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))} />
          <Input label="التفاصيل" placeholder="اشرح المشكلة أو الطلب" value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))} />
          <Select
            label="الأولوية" value={ticketForm.priority}
            onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value as TicketPriority }))}
            options={[{ value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' }, { value: 'high', label: 'عالية' }]}
          />
        </div>
      </Dialog>
    </div>
  )
}
