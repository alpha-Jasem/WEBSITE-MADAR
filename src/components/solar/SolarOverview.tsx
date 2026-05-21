import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Calendar, ChevronRight, Cpu, TrendingUp, Users, Wrench, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null; created_at?: string | null }
type Appointment = { id: string; customer_name: string; service_name?: string | null; scheduled_at?: string | null; status?: string | null; price?: number | null }
type Staff = { id: string; name: string; role?: string | null; performance_score?: number | null }
type Service = { id: string; name: string; revenue?: number | null; color_hex?: string | null }

function SparkLine({ color }: { color: string }) {
  const data = Array.from({ length: 8 }, (_, i) => ({ v: Math.random() * 60 + 20 + i * 3 }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AnimNum({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let f = 0
    const s = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - s) / 1200, 1)
      setD(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) f = requestAnimationFrame(tick)
    }
    f = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(f)
  }, [value])
  return <>{prefix}{d.toLocaleString('en-US')}{suffix}</>
}

function PowerRing({ score, name, role }: { score: number; name: string; role?: string | null }) {
  const r = 28
  const c = 2 * Math.PI * r
  const gold = '#f3a64f'
  return (
    <div className="se-power-item">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(243,166,79,0.15)" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none"
          stroke={gold}
          strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * score) / 100 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          transform="rotate(-90 36 36)"
          style={{ filter: `drop-shadow(0 0 6px ${gold})` }}
        />
        <text x="36" y="40" textAnchor="middle" fill={gold} fontSize="12" fontWeight="700">{score}%</text>
      </svg>
      <p className="se-power-name">{name.split(' ')[0]}</p>
      <span className="se-power-role">{role}</span>
    </div>
  )
}

export const SolarOverview = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [aiCmd, setAiCmd] = useState('')

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: a }, { data: s }, { data: sv }] = await Promise.all([
        supabase.from('crm_leads').select('id,stage,price_sold,created_at').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('scheduled_at').limit(4),
        supabase.from('staff').select('*').order('performance_score', { ascending: false }),
        supabase.from('services').select('*').order('revenue', { ascending: false }),
      ])
      setLeads((l ?? []) as Lead[])
      setAppointments((a ?? []) as Appointment[])
      setStaff((s ?? []) as Staff[])
      setServices((sv ?? []) as Service[])
    }
    load()
    const ch = supabase.channel('solar_overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const returningRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 68
  const avgOrder = wonLeads.length ? Math.round(revenue / wonLeads.length) : 213
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayAppts = appointments.filter(a => (a.scheduled_at || '').startsWith(todayStr))

  const formatTime = (iso?: string | null) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="se-hud-page">

      {/* ═══ HERO — full viewport video, nothing on top ═══ */}
      <div className="se-hero">
        <video src="/assets/solar-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" />
        <div className="se-hero-grad" />
      </div>

      {/* ═══ CONTENT — scrolls below the hero ═══ */}
      <div className="se-content-section">

        {/* Main grid */}
        <div className="se-main-grid">

          {/* Left column */}
          <div className="se-left-col">
            <motion.div className="se-kpi-card" whileHover={{ scale: 1.02 }}>
              <div className="se-kpi-header">
                <Calendar size={13} color="#f3a64f" />
                <span>APPOINTMENTS</span>
              </div>
              <strong className="se-kpi-big">
                <AnimNum value={todayAppts.length || appointments.length || 32} />
              </strong>
              <p className="se-kpi-sub">Today</p>
              <div className="se-mini-bars">
                {[4, 7, 5, 9, 6, 8, 11, 7].map((v, i) => (
                  <motion.div key={i} className="se-mini-bar"
                    style={{ height: v * 4 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05 }} />
                ))}
              </div>
            </motion.div>

            <motion.div className="se-kpi-card" whileHover={{ scale: 1.02 }}>
              <div className="se-kpi-header">
                <Users size={13} color="#f3a64f" />
                <span>CUSTOMERS</span>
              </div>
              <strong className="se-kpi-big">
                <AnimNum value={leads.length || 2142} />
              </strong>
              <p className="se-kpi-sub se-positive">+18.6%</p>
              <div className="se-mini-bars">
                {[5, 8, 6, 10, 7, 9, 12, 9].map((v, i) => (
                  <motion.div key={i} className="se-mini-bar"
                    style={{ height: v * 4 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.05 }} />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Center spacer */}
          <div className="se-center-spacer" />

          {/* Right column */}
          <div className="se-right-col">
            {[
              { label: "TODAY'S REVENUE", value: revenue || 45231, prefix: 'SAR ', delta: '+23.6%', color: '#f3a64f', icon: TrendingUp },
              { label: 'RETURNING RATE', value: returningRate, suffix: '%', delta: '+8.7%', color: '#f3a64f', icon: Users },
              { label: 'AVG ORDER VALUE', value: avgOrder || 213, prefix: 'SAR ', delta: '+16.3%', color: '#f3a64f', icon: Cpu },
            ].map((k) => (
              <motion.div key={k.label} className="se-metric-card" whileHover={{ scale: 1.02 }}>
                <div className="se-metric-header">
                  <span>{k.label}</span>
                  <k.icon size={13} color={k.color} />
                </div>
                <strong className="se-metric-val" style={{ color: k.color }}>
                  <AnimNum value={k.value} prefix={k.prefix || ''} suffix={k.suffix || ''} />
                </strong>
                <p className="se-positive">{k.delta}</p>
                <SparkLine color={k.color} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="se-action-row">
          <div className="se-ai-panel">
            <div className="se-robot-wrap">
              <video src="/assets/ai-robot.mp4" autoPlay loop muted playsInline className="se-robot-video" />
            </div>
            <div className="se-ai-content">
              <p className="se-ai-title">AI COMMAND CENTER</p>
              <p className="se-ai-msg">
                {leads.filter(l => l.stage === 'new').length || 28} inactive customers detected. Launch win-back campaign?
              </p>
              <input
                className="se-ai-input"
                placeholder="Enter command..."
                value={aiCmd}
                onChange={e => setAiCmd(e.target.value)}
              />
              <button type="button" className="se-ai-btn">EXECUTE COMMAND</button>
            </div>
          </div>

          <div className="se-auto-panel">
            <p className="se-panel-label">ACTIVE AUTOMATIONS</p>
            <div className="se-auto-count">
              <Zap size={18} color="#f3a64f" />
              <strong>18</strong>
            </div>
            <p className="se-auto-sub">Running smoothly</p>
            <div className="se-auto-bar-wrap">
              <motion.div className="se-auto-bar"
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ duration: 1.2 }} />
            </div>
          </div>
        </div>

        {/* Core Calendar */}
        <div className="se-calendar-panel">
          <p className="se-panel-label">CORE CALENDAR</p>
          <div className="se-cal-timeline">
            {['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '5 PM'].map(t => (
              <span key={t} className="se-cal-tick">{t}</span>
            ))}
          </div>
          <div className="se-cal-cards">
            {(appointments.length ? appointments : [
              { id: '1', customer_name: 'Ahmed Al-Rashid', service_name: 'Premium Wash', scheduled_at: new Date().toISOString(), status: 'confirmed', price: 1200 },
              { id: '2', customer_name: 'Sara Khalid', service_name: 'Exterior Detail', scheduled_at: new Date(Date.now() + 9000000).toISOString(), status: 'confirmed', price: 950 },
              { id: '3', customer_name: 'Khalid Mohammed', service_name: 'Full Clinic Check', scheduled_at: new Date(Date.now() + 14400000).toISOString(), status: 'pending', price: 1800 },
              { id: '4', customer_name: 'Faisal Nasser', service_name: 'Ceramic Coating', scheduled_at: new Date(Date.now() + 23400000).toISOString(), status: 'confirmed', price: 750 },
            ]).slice(0, 4).map(apt => (
              <motion.div key={apt.id} className="se-cal-card" whileHover={{ y: -2 }}>
                <strong>{apt.service_name}</strong>
                <p>{apt.customer_name}</p>
                <span>{formatTime(apt.scheduled_at)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom grid */}
        <div className="se-bottom-grid">
          <div className="se-services-panel">
            <p className="se-panel-label">POWERED SERVICES</p>
            {(services.length ? services : [
              { id: '1', name: 'Premium Wash', revenue: 12450, color_hex: '#f3a64f' },
              { id: '2', name: 'Exterior Detail', revenue: 9230, color_hex: '#f3a64f' },
              { id: '3', name: 'Full Clinic Check', revenue: 8790, color_hex: '#f3a64f' },
              { id: '4', name: 'Ceramic Coating', revenue: 7910, color_hex: '#f3a64f' },
            ]).map(svc => {
              const maxRev = Math.max(...(services.length ? services : [{ revenue: 12450 }]).map(s => s.revenue || 1))
              const pct = Math.round(((svc.revenue || 0) / maxRev) * 100)
              return (
                <div key={svc.id} className="se-svc-row">
                  <div className="se-svc-icon" style={{ background: 'rgba(243,166,79,0.12)', borderColor: 'rgba(243,166,79,0.3)' }}>
                    <Wrench size={12} color="#f3a64f" />
                  </div>
                  <span className="se-svc-name">{svc.name}</span>
                  <div className="se-svc-track">
                    <motion.div className="se-svc-fill"
                      style={{ background: '#f3a64f' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1 }} />
                  </div>
                  <span className="se-svc-rev">SAR {(svc.revenue || 0).toLocaleString()}</span>
                </div>
              )
            })}
          </div>

          <div className="se-staff-panel">
            <div className="se-panel-head-row">
              <p className="se-panel-label">STAFF POWER LEVELS</p>
              <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            </div>
            <div className="se-power-grid">
              {(staff.length ? staff : [
                { id: '1', name: 'Khalid M.', role: 'Sales Lead', performance_score: 92 },
                { id: '2', name: 'Ahmad R.', role: 'Account Mgr', performance_score: 87 },
                { id: '3', name: 'Sara A.', role: 'Support', performance_score: 78 },
                { id: '4', name: 'Faisal T.', role: 'Automation', performance_score: 74 },
              ]).slice(0, 4).map(s => (
                <PowerRing key={s.id} score={s.performance_score || 80} name={s.name} role={s.role} />
              ))}
            </div>
          </div>
        </div>

        <div className="se-footer-banner">
          SOLAR ENERGY · CENTRAL INTELLIGENCE · UNSTOPPABLE FORCE
        </div>

      </div>
    </div>
  )
}
