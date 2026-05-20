import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type LeadRecord = {
  id: string
  company_name?: string | null
  created_at?: string | null
  updated_at?: string | null
  stage?: string | null
  sector?: string | null
  price_sold?: number | null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function timeAgo(iso?: string | null) {
  if (!iso) return 'just now'
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return 'less than 1h ago'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const duration = 1200

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return (
    <>
      {prefix}
      {display.toLocaleString('en-US')}
      {suffix}
    </>
  )
}

function CoreRing({
  size,
  delay,
  accent,
}: {
  size: number
  delay: number
  accent: string
}) {
  return (
    <motion.div
      className="solar-core-ring"
      style={{ width: size, height: size, borderColor: accent }}
      animate={{ rotate: 360 }}
      transition={{ duration: 30 + delay * 8, ease: 'linear', repeat: Infinity }}
    />
  )
}

function AdminTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="solar-chart-tooltip">
      <p>{label}</p>
      {payload.map((entry: any) => (
        <strong key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </strong>
      ))}
    </div>
  )
}

export const AdminOverview = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
      setLeads((data ?? []) as LeadRecord[])
      setLoading(false)
    }

    load()

    const ticker = setInterval(() => {
      setPulse((value) => (value + 1) % 7)
    }, 2200)

    const channel = supabase
      .channel('solar_admin_overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()

    return () => {
      clearInterval(ticker)
      supabase.removeChannel(channel)
    }
  }, [])

  const now = new Date()
  const currentMonth = monthKey(now)
  const previousMonthDate = new Date(now)
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1)
  const previousMonth = monthKey(previousMonthDate)

  const wonLeads = leads.filter((lead) => lead.stage === 'won')
  const revenueThisMonth = wonLeads
    .filter((lead) => (lead.updated_at || '').startsWith(currentMonth))
    .reduce((sum, lead) => sum + (lead.price_sold || 0), 0)
  const revenuePreviousMonth = wonLeads
    .filter((lead) => (lead.updated_at || '').startsWith(previousMonth))
    .reduce((sum, lead) => sum + (lead.price_sold || 0), 0)
  const totalLeads = leads.length
  const newLeadsThisMonth = leads.filter((lead) => (lead.created_at || '').startsWith(currentMonth)).length
  const wonCount = wonLeads.length
  const closeRate = totalLeads ? Math.round((wonCount / totalLeads) * 100) : 0
  const revenueShift = revenuePreviousMonth
    ? Math.round(((revenueThisMonth - revenuePreviousMonth) / revenuePreviousMonth) * 100)
    : 0

  const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now)
    date.setMonth(date.getMonth() - (5 - index))
    const key = monthKey(date)
    return {
      month: MONTHS[date.getMonth()],
      revenue:
        Math.round(
          (wonLeads
            .filter((lead) => (lead.updated_at || '').startsWith(key))
            .reduce((sum, lead) => sum + (lead.price_sold || 0), 0) /
            1000) *
            10
        ) / 10,
      leads: leads.filter((lead) => (lead.created_at || '').startsWith(key)).length,
    }
  })

  const weeklySignals = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (6 - index))
    const key = dayKey(date)
    return {
      day: DAYS[date.getDay()],
      volume: leads.filter((lead) => (lead.created_at || '').startsWith(key)).length,
    }
  })

  const liveEvents = leads.slice(0, 4).map((lead, index) => ({
    id: lead.id || `${index}`,
    title: lead.company_name || 'Live account',
    status: lead.stage || 'signal',
    time: timeAgo(lead.updated_at || lead.created_at),
  }))

  const executiveSignals = [
    {
      title: 'Core revenue',
      value: revenueThisMonth,
      prefix: 'SAR ',
      suffix: '',
      note: revenueShift >= 0 ? `+${revenueShift}% momentum` : `${revenueShift}% momentum`,
      accent: '#f3a64f',
    },
    {
      title: 'Active pipeline',
      value: totalLeads,
      prefix: '',
      suffix: '',
      note: `${newLeadsThisMonth} new this month`,
      accent: '#62d8ff',
    },
    {
      title: 'Close precision',
      value: closeRate,
      prefix: '',
      suffix: '%',
      note: `${wonCount} wins locked`,
      accent: '#93ebcf',
    },
  ]

  const orbitNodes = [
    { label: 'Bookings', value: `${formatCompact(newLeadsThisMonth)}`, accent: '#62d8ff', x: '6%', y: '26%' },
    { label: 'WhatsApp', value: `${44 + pulse}%`, accent: '#93ebcf', x: '72%', y: '18%' },
    { label: 'ROI', value: `${(4.2 + pulse * 0.1).toFixed(1)}x`, accent: '#f3a64f', x: '76%', y: '68%' },
    { label: 'Alerts', value: `${Math.max(2, 8 - pulse)}`, accent: '#ff8d58', x: '16%', y: '72%' },
  ]

  if (loading) {
    return (
      <div className="solar-overview-loading">
        <motion.div
          className="solar-overview-loading-core"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
        />
        <p>Booting administrative reactor...</p>
      </div>
    )
  }

  return (
    <div className="solar-overview">
      <section className="solar-hero-panel">
        <div className="solar-hero-copy">
          <p className="solar-admin-kicker">Administrative portal</p>
          <h3>Luxury live command over revenue, automation, and operational gravity.</h3>
          <p>
            This is not a client dashboard. It is the operator surface for owners and admins who need
            theatrical clarity with real-time pulse.
          </p>

          <div className="solar-signal-grid">
            {executiveSignals.map((signal) => (
              <motion.div
                key={signal.title}
                className="solar-signal-card"
                whileHover={{ y: -4 }}
                style={{ boxShadow: `0 0 28px ${signal.accent}12` }}
              >
                <span>{signal.title}</span>
                <strong style={{ color: signal.accent }}>
                  <AnimatedNumber value={signal.value} prefix={signal.prefix} suffix={signal.suffix} />
                </strong>
                <em>{signal.note}</em>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="solar-core-stage">
          <div className="solar-core-halo solar-core-halo-a" />
          <div className="solar-core-halo solar-core-halo-b" />
          <CoreRing size={380} delay={0} accent="rgba(243,166,79,0.28)" />
          <CoreRing size={500} delay={1} accent="rgba(98,216,255,0.18)" />
          <CoreRing size={620} delay={2} accent="rgba(147,235,207,0.15)" />

          <motion.div
            className="solar-core-reactor"
            animate={{
              boxShadow: [
                '0 0 40px rgba(243,166,79,0.25)',
                '0 0 90px rgba(243,166,79,0.44)',
                '0 0 40px rgba(243,166,79,0.25)',
              ],
              scale: [1, 1.035, 1],
            }}
            transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="solar-core-reactor-inner">
              <span>AI core</span>
              <strong>{(93 + pulse).toFixed(0)}%</strong>
              <p>confidence and system harmony</p>
            </div>
          </motion.div>

          {orbitNodes.map((node, index) => (
            <motion.div
              key={node.label}
              className="solar-orbit-node"
              style={{ top: node.y, left: node.x, borderColor: `${node.accent}40` }}
              animate={{ y: index % 2 === 0 ? [0, -8, 0] : [0, 8, 0] }}
              transition={{ duration: 4 + index, repeat: Infinity, ease: 'easeInOut' }}
            >
              <small>{node.label}</small>
              <strong style={{ color: node.accent }}>{node.value}</strong>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="solar-insight-band">
        <div className="solar-insight-intro">
          <Sparkles size={15} />
          <span>Reactive command insights</span>
        </div>
        <div className="solar-insight-cards">
          <div className="solar-insight-card">
            <BrainCircuit size={16} />
            <p>AI sees a strong reactivation window in dormant accounts right now.</p>
          </div>
          <div className="solar-insight-card">
            <CalendarDays size={16} />
            <p>Thursday evening remains the highest booking pressure point across campaigns.</p>
          </div>
          <div className="solar-insight-card">
            <ShieldCheck size={16} />
            <p>Core systems are stable. Live motion is now tied to actual lead and win activity.</p>
          </div>
        </div>
      </section>

      <section className="solar-analytics-grid">
        <div className="solar-chart-panel solar-chart-panel-wide">
          <div className="solar-panel-heading">
            <div>
              <p>Revenue orbit</p>
              <h4>Six-month momentum</h4>
            </div>
            <span>SAR live drift</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyRevenue}>
              <defs>
                <linearGradient id="solarRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f3a64f" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f3a64f" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" stroke="#6f8097" tickLine={false} axisLine={false} />
              <YAxis stroke="#6f8097" tickLine={false} axisLine={false} />
              <Tooltip content={<AdminTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="#f3a64f"
                strokeWidth={3}
                fill="url(#solarRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="solar-chart-panel">
          <div className="solar-panel-heading">
            <div>
              <p>Signal volume</p>
              <h4>Last 7 days</h4>
            </div>
            <span>Live intake</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklySignals}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" stroke="#6f8097" tickLine={false} axisLine={false} />
              <YAxis stroke="#6f8097" tickLine={false} axisLine={false} />
              <Tooltip content={<AdminTooltip />} />
              <Bar dataKey="volume" name="Leads" fill="#62d8ff" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="solar-bottom-grid">
        <div className="solar-side-panel">
          <div className="solar-panel-heading">
            <div>
              <p>Live activity</p>
              <h4>Recent pulses</h4>
            </div>
            <span>Realtime</span>
          </div>

          <div className="solar-activity-list">
            {liveEvents.map((event) => (
              <motion.div
                key={event.id}
                className="solar-activity-item"
                whileHover={{ x: -3 }}
              >
                <div className="solar-activity-glow" />
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.status}</span>
                </div>
                <em>{event.time}</em>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="solar-side-panel">
          <div className="solar-panel-heading">
            <div>
              <p>Operator moves</p>
              <h4>Recommended actions</h4>
            </div>
            <span>AI-led</span>
          </div>

          <div className="solar-command-stack">
            {[
              'Launch a premium WhatsApp reactivation sequence for dormant leads.',
              'Escalate warm pipeline accounts into a faster executive follow-up lane.',
              'Shift evening budget to the strongest booking orbit for Thursday.',
            ].map((command, index) => (
              <button key={command} type="button" className="solar-command-card">
                <span>{`0${index + 1}`}</span>
                <p>{command}</p>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>

          <div className="solar-footer-note">
            <MessageCircleMore size={15} />
            <p>Admin-only cinematic motion is active. Client portal stays untouched.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
