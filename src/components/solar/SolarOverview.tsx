import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null }
type Appointment = { id: string; customer_name: string; service_name?: string | null; scheduled_at?: string | null }
type Staff = { id: string; name: string; performance_score?: number | null }
type Service = { id: string; name: string; revenue?: number | null }
type Automation = { id: string; status?: string | null }

function SparkLine({ color = '#f3a64f' }: { color?: string }) {
  const data = Array.from({ length: 10 }, (_, i) => ({ v: 30 + i * 6 + Math.random() * 20 }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MiniBarChart({ color = 'rgba(243,166,79,0.6)' }: { color?: string }) {
  const bars = [4, 6, 5, 8, 7, 10, 8, 11, 9, 13]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 8 }}>
      {bars.map((h, i) => (
        <motion.div key={i} style={{ flex: 1, background: color, borderRadius: 2 }}
          initial={{ height: 0 }} animate={{ height: h * 2.8 }}
          transition={{ delay: i * 0.04, duration: 0.4 }} />
      ))}
    </div>
  )
}

function PowerRing({ value }: { value: number }) {
  const r = 28; const circ = 2 * Math.PI * r
  const pct = Math.min(value, 100) / 100
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(243,166,79,0.12)" strokeWidth={5} />
      <circle cx={36} cy={36} r={r} fill="none" stroke="#f3a64f" strokeWidth={5}
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ filter: 'drop-shadow(0 0 4px rgba(243,166,79,0.8))' }} />
      <text x={36} y={40} textAnchor="middle" fill="#f3a64f" fontSize={12} fontWeight={700}>
        {value}%
      </text>
    </svg>
  )
}

function RadarRing() {
  const rings = [1, 0.75, 0.5, 0.25]
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      {rings.map((s, i) => (
        <circle key={i} cx={55} cy={55} r={52 * s} fill="none"
          stroke={`rgba(101,214,255,${0.08 + i * 0.04})`} strokeWidth={1} />
      ))}
      <line x1={55} y1={3} x2={55} y2={107} stroke="rgba(101,214,255,0.1)" strokeWidth={1} />
      <line x1={3} y1={55} x2={107} y2={55} stroke="rgba(101,214,255,0.1)" strokeWidth={1} />
      <motion.circle cx={55} cy={55} r={52} fill="none"
        stroke="rgba(101,214,255,0.35)" strokeWidth={1.5}
        strokeDasharray="8 6"
        animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        style={{ transformOrigin: '55px 55px' }} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const x = 55 + 38 * Math.cos(rad); const y = 55 + 38 * Math.sin(rad)
        return <circle key={i} cx={x} cy={y} r={3} fill="#65d6ff"
          style={{ filter: 'drop-shadow(0 0 4px #65d6ff)' }} />
      })}
      <circle cx={55} cy={55} r={6} fill="#f3a64f"
        style={{ filter: 'drop-shadow(0 0 8px #f3a64f)' }} />
    </svg>
  )
}

function formatTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const MOCK_APPTS: Appointment[] = [
  { id: '1', customer_name: 'Ahmed', service_name: 'Premium Wash', scheduled_at: new Date(Date.now() - 2*3600000).toISOString() },
  { id: '2', customer_name: 'Sara', service_name: 'Exterior Detail', scheduled_at: new Date(Date.now() - 0.5*3600000).toISOString() },
  { id: '3', customer_name: 'Khalid', service_name: 'Full Clinic Check', scheduled_at: new Date(Date.now() + 1*3600000).toISOString() },
  { id: '4', customer_name: 'Faisal', service_name: 'Ceramic Coating', scheduled_at: new Date(Date.now() + 2.5*3600000).toISOString() },
]
const MOCK_SERVICES: Service[] = [
  { id: '1', name: 'Premium Wash', revenue: 12450 },
  { id: '2', name: 'Exterior Detail', revenue: 9230 },
  { id: '3', name: 'Full Clinic Check', revenue: 8790 },
  { id: '4', name: 'Ceramic Coating', revenue: 7910 },
]
const MOCK_STAFF: Staff[] = [
  { id: '1', name: 'Khalid M.', performance_score: 92 },
  { id: '2', name: 'Ahmad R.', performance_score: 87 },
  { id: '3', name: 'Sara A.', performance_score: 78 },
  { id: '4', name: 'Faisal T.', performance_score: 74 },
]

export const SolarOverview = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPTS)
  const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF)
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES)
  const [automations, setAutomations] = useState<Automation[]>([])

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: ap }, { data: st }, { data: sv }, { data: au }] = await Promise.all([
        supabase.from('crm_leads').select('id,stage,price_sold'),
        supabase.from('appointments').select('id,customer_name,service_name,scheduled_at'),
        supabase.from('staff').select('id,name,performance_score'),
        supabase.from('services').select('id,name,revenue'),
        supabase.from('automations').select('id,status'),
      ])
      if (l?.length) setLeads(l as Lead[])
      if (ap?.length) setAppointments(ap as Appointment[])
      if (st?.length) setStaff(st as Staff[])
      if (sv?.length) setServices(sv as Service[])
      if (au?.length) setAutomations(au as Automation[])
    }
    load()
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const activeAutos = automations.filter(a => a.status === 'active' || a.status === 'running').length
  const maxRev = Math.max(...services.map(s => s.revenue || 0), 1)

  return (
    <div className="se-overview">
      {/* Fixed video background */}
      <div className="se-hero">
        <video src="/assets/command-deck-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" />
      </div>

      {/* Header Banner */}
      <div className="se-header-banner">
        <div className="se-header-num">03</div>
        <div className="se-header-center">
          <h1 className="se-header-title">SOLAR ENGINE CORE</h1>
          <p className="se-header-sub">POWERFUL · CENTRALIZED · ALIVE</p>
        </div>
        <div className="se-status-pill">
          SYSTEM STATUS &nbsp;<span className="se-status-ok">OPTIMAL</span>
        </div>
      </div>

      {/* Main 3-column grid */}
      <div className="se-main-grid">
        {/* Left — KPI cards */}
        <div className="se-kpi-col">
          <div className="se-kpi-card">
            <span className="se-card-label">APPOINTMENTS</span>
            <strong className="se-kpi-val">{appointments.length || 32}</strong>
            <span className="se-kpi-hint">Today</span>
            <MiniBarChart />
          </div>
          <div className="se-kpi-card">
            <span className="se-card-label">CUSTOMERS</span>
            <strong className="se-kpi-val">{(leads.length || 2142).toLocaleString()}</strong>
            <span className="se-kpi-hint" style={{ color: '#4ade80' }}>+18.6%</span>
            <MiniBarChart />
          </div>
        </div>

        {/* Center — Zeus visible through background */}
        <div className="se-zeus-col" />

        {/* Right — metric cards */}
        <div className="se-metric-col">
          <div className="se-metric-card">
            <span className="se-card-label">TODAY'S REVENUE</span>
            <strong className="se-metric-val">SAR {(revenue || 45231).toLocaleString()}</strong>
            <span className="se-metric-hint" style={{ color: '#4ade80' }}>+23.6%</span>
            <SparkLine />
          </div>
          <div className="se-metric-card">
            <span className="se-card-label">RETURNING RATE</span>
            <strong className="se-metric-val">68%</strong>
            <span className="se-metric-hint" style={{ color: '#4ade80' }}>+8.7%</span>
            <SparkLine />
          </div>
          <div className="se-metric-card">
            <span className="se-card-label">AVG ORDER VALUE</span>
            <strong className="se-metric-val">SAR 213</strong>
            <span className="se-metric-hint" style={{ color: '#4ade80' }}>+16.3%</span>
            <SparkLine />
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="se-action-row">
        {/* Radar */}
        <div className="se-radar-panel">
          <RadarRing />
        </div>

        {/* Robot */}
        <div className="se-robot-panel">
          <img src="/assets/ai-robot.png" alt="AI" className="se-robot-img"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>

        {/* AI Command */}
        <div className="se-ai-panel">
          <span className="se-card-label">AI COMMAND CENTER</span>
          <p className="se-ai-msg">
            {leads.filter(l => l.stage === 'new').length || 28} inactive customers detected.
            Launch win-back campaign?
          </p>
          <button type="button" className="se-ai-btn">EXECUTE COMMAND</button>
        </div>

        {/* Automations */}
        <div className="se-auto-panel">
          <span className="se-card-label">ACTIVE AUTOMATIONS</span>
          <strong className="se-auto-count">{activeAutos || 18}</strong>
          <span className="se-auto-hint">Running smoothly</span>
          <div className="se-auto-bar-wrap">
            <motion.div className="se-auto-bar"
              initial={{ width: 0 }} animate={{ width: '88%' }}
              transition={{ duration: 1.2 }} />
          </div>
        </div>
      </div>

      {/* Core Calendar */}
      <div className="se-calendar-panel">
        <span className="se-card-label" style={{ marginBottom: 12, display: 'block' }}>CORE CALENDAR</span>
        <div className="se-timeline-hours">
          {['9 AM','10 AM','11 AM','12 PM','1 PM','2 PM','3 PM','5 PM'].map(h => (
            <span key={h} className="se-timeline-hour">{h}</span>
          ))}
        </div>
        <div className="se-timeline">
          {(appointments.length ? appointments : MOCK_APPTS).slice(0, 4).map(a => (
            <div key={a.id} className="se-appt-tile">
              <strong>{a.service_name || 'Service'}</strong>
              <span>{a.customer_name}</span>
              <span className="se-appt-time">{formatTime(a.scheduled_at)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="se-bottom-grid">
        {/* Powered Services */}
        <div className="se-services-panel">
          <span className="se-card-label" style={{ marginBottom: 12, display: 'block' }}>POWERED SERVICES</span>
          {(services.length ? services : MOCK_SERVICES).slice(0, 4).map(s => (
            <div key={s.id} className="se-service-row">
              <div className="se-service-icon">
                <svg width={16} height={16} viewBox="0 0 16 16">
                  <circle cx={8} cy={8} r={7} fill="rgba(243,166,79,0.15)" stroke="rgba(243,166,79,0.5)" strokeWidth={1} />
                  <circle cx={8} cy={8} r={3} fill="#f3a64f" />
                </svg>
              </div>
              <span className="se-service-name">{s.name}</span>
              <div className="se-service-bar-wrap">
                <motion.div className="se-service-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(((s.revenue || 0) / maxRev) * 100)}%` }}
                  transition={{ duration: 0.8 }} />
              </div>
              <span className="se-service-rev">SAR {(s.revenue || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Staff Power Levels */}
        <div className="se-staff-panel">
          <span className="se-card-label" style={{ marginBottom: 12, display: 'block' }}>STAFF POWER LEVELS</span>
          <div className="se-staff-grid">
            {(staff.length ? staff : MOCK_STAFF).slice(0, 4).map(s => (
              <div key={s.id} className="se-staff-card">
                <PowerRing value={s.performance_score || 0} />
                <span className="se-staff-name">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="se-footer-banner">
        SOLAR ENERGY · CENTRAL INTELLIGENCE · UNSTOPPABLE FORCE
      </div>
    </div>
  )
}
