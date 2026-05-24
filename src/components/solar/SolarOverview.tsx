import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { GripHorizontal } from 'lucide-react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { supabase } from '../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null }
type Appointment = { id: string; customer_name: string; service_name?: string | null; scheduled_at?: string | null }
type Staff = { id: string; name: string; performance_score?: number | null }
type Service = { id: string; name: string; revenue?: number | null }
type Automation = { id: string; status?: string | null }

const STORAGE_KEY = 'forge-layout-v4'

// 🌌 Nebula Cluster — stars of varying sizes, no strict rows
const DEFAULT_LAYOUT: Layout[] = [
  // Giant star — top left
  { i: 'appts',    x: 0,  y: 0,  w: 6, h: 9,  minW: 1, minH: 2 },
  // Medium — top right cluster
  { i: 'revenue',  x: 6,  y: 0,  w: 3, h: 5,  minW: 1, minH: 2 },
  { i: 'radar',    x: 9,  y: 0,  w: 3, h: 4,  minW: 1, minH: 2 },
  // Mid cluster — shifting right
  { i: 'customers',x: 6,  y: 5,  w: 3, h: 4,  minW: 1, minH: 2 },
  { i: 'returning',x: 9,  y: 4,  w: 3, h: 5,  minW: 1, minH: 2 },
  // Lower scatter
  { i: 'robot',    x: 0,  y: 9,  w: 2, h: 5,  minW: 1, minH: 2 },
  { i: 'ai',       x: 2,  y: 9,  w: 4, h: 5,  minW: 1, minH: 2 },
  { i: 'avg',      x: 6,  y: 9,  w: 3, h: 4,  minW: 1, minH: 2 },
  { i: 'autos',    x: 9,  y: 9,  w: 3, h: 5,  minW: 1, minH: 2 },
  // Full-width belt
  { i: 'calendar', x: 0,  y: 14, w: 12, h: 5, minW: 2, minH: 2 },
  // Bottom — unequal split
  { i: 'services', x: 0,  y: 19, w: 5, h: 7,  minW: 1, minH: 3 },
  { i: 'staff',    x: 5,  y: 19, w: 7, h: 7,  minW: 1, minH: 3 },
]

function loadLayout(): Layout[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_LAYOUT }
  catch { return DEFAULT_LAYOUT }
}

function SparkLine({ color = '#f3a64f' }: { color?: string }) {
  const data = Array.from({ length: 10 }, (_, i) => ({ v: 30 + i * 6 + Math.random() * 20 }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MiniBarChart() {
  const bars = [4, 6, 5, 8, 7, 10, 8, 11, 9, 13]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginTop: 8 }}>
      {bars.map((h, i) => (
        <motion.div key={i}
          style={{ flex: 1, background: 'rgba(243,166,79,0.55)', borderRadius: 2 }}
          initial={{ height: 0 }} animate={{ height: h * 2.6 }}
          transition={{ delay: i * 0.04, duration: 0.4 }} />
      ))}
    </div>
  )
}

function PowerRing({ value }: { value: number }) {
  const r = 28; const circ = 2 * Math.PI * r; const pct = Math.min(value, 100) / 100
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(243,166,79,0.12)" strokeWidth={5} />
      <circle cx={36} cy={36} r={r} fill="none" stroke="#f3a64f" strokeWidth={5}
        strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ filter: 'drop-shadow(0 0 4px rgba(243,166,79,0.8))' }} />
      <text x={36} y={40} textAnchor="middle" fill="#f3a64f" fontSize={12} fontWeight={700}>{value}%</text>
    </svg>
  )
}

function RadarRing() {
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      {[1, 0.75, 0.5, 0.25].map((s, i) => (
        <circle key={i} cx={50} cy={50} r={48 * s} fill="none"
          stroke={`rgba(101,214,255,${0.08 + i * 0.04})`} strokeWidth={1} />
      ))}
      <line x1={50} y1={2} x2={50} y2={98} stroke="rgba(101,214,255,0.1)" strokeWidth={1} />
      <line x1={2} y1={50} x2={98} y2={50} stroke="rgba(101,214,255,0.1)" strokeWidth={1} />
      <motion.circle cx={50} cy={50} r={48} fill="none"
        stroke="rgba(101,214,255,0.35)" strokeWidth={1.5} strokeDasharray="8 6"
        animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        style={{ transformOrigin: '50px 50px' }} />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return <circle key={i} cx={50 + 35 * Math.cos(rad)} cy={50 + 35 * Math.sin(rad)}
          r={3} fill="#65d6ff" style={{ filter: 'drop-shadow(0 0 4px #65d6ff)' }} />
      })}
      <circle cx={50} cy={50} r={5} fill="#f3a64f" style={{ filter: 'drop-shadow(0 0 8px #f3a64f)' }} />
    </svg>
  )
}

function formatTime(iso?: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const MOCK_APPTS: Appointment[] = [
  { id: '1', customer_name: 'Ahmed', service_name: 'Premium Wash', scheduled_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: '2', customer_name: 'Sara', service_name: 'Exterior Detail', scheduled_at: new Date(Date.now() - 0.5 * 3600000).toISOString() },
  { id: '3', customer_name: 'Khalid', service_name: 'Full Clinic Check', scheduled_at: new Date(Date.now() + 3600000).toISOString() },
  { id: '4', customer_name: 'Faisal', service_name: 'Ceramic Coating', scheduled_at: new Date(Date.now() + 2.5 * 3600000).toISOString() },
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

function SolarWidget({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="se-widget">
      <div className="hud-drag-handle">
        <GripHorizontal size={11} color="rgba(255,255,255,0.2)" />
        {title && <span className="se-widget-title">{title}</span>}
      </div>
      <div className="se-widget-body">{children}</div>
    </div>
  )
}

export const SolarOverview = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPTS)
  const [staff, setStaff] = useState<Staff[]>(MOCK_STAFF)
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [layout, setLayout] = useState<Layout[]>(loadLayout)
  const calcWidth = () => window.innerWidth < 768 ? window.innerWidth - 24 : window.innerWidth - 286 - 32
  const [width, setWidth] = useState(calcWidth)

  useEffect(() => {
    const onResize = () => setWidth(calcWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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

  const onLayoutChange = useCallback((l: Layout[]) => {
    setLayout(l); localStorage.setItem(STORAGE_KEY, JSON.stringify(l))
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const activeAutos = automations.filter(a => a.status === 'active' || a.status === 'running').length
  const maxRev = Math.max(...services.map(s => s.revenue || 0), 1)

  return (
    <div className="se-hud-page">
      <div className="se-hero">
        <video src="/assets/command-deck-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" />
      </div>

      {/* Fixed header — not part of grid */}
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

      <button type="button" className="hud-reset-btn"
        onClick={() => { localStorage.removeItem(STORAGE_KEY); setLayout(DEFAULT_LAYOUT) }}>
        ↺ Reset Layout
      </button>

      <div className="hud-grid-wrapper">
        <GridLayout layout={layout} cols={12} rowHeight={36} width={width}
          margin={[8, 8]} isDraggable isResizable
          resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'e']}
          draggableHandle=".hud-drag-handle" onLayoutChange={onLayoutChange}>

          {/* Appointments */}
          <div key="appts">
            <SolarWidget title="APPOINTMENTS">
              <strong className="se-kpi-val">{appointments.length || 32}</strong>
              <span className="se-kpi-hint">Today</span>
              <MiniBarChart />
            </SolarWidget>
          </div>

          {/* Customers */}
          <div key="customers">
            <SolarWidget title="CUSTOMERS">
              <strong className="se-kpi-val">{(leads.length || 2142).toLocaleString()}</strong>
              <span className="se-kpi-hint" style={{ color: '#4ade80' }}>+18.6%</span>
              <MiniBarChart />
            </SolarWidget>
          </div>

          {/* Revenue */}
          <div key="revenue">
            <SolarWidget title="TODAY'S REVENUE">
              <strong className="se-kpi-val" style={{ fontSize: 20 }}>
                SAR {(revenue || 45231).toLocaleString()}
              </strong>
              <span className="se-kpi-hint" style={{ color: '#4ade80' }}>+23.6%</span>
              <SparkLine />
            </SolarWidget>
          </div>

          {/* Returning */}
          <div key="returning">
            <SolarWidget title="RETURNING RATE">
              <strong className="se-kpi-val">68%</strong>
              <span className="se-kpi-hint" style={{ color: '#4ade80' }}>+8.7%</span>
              <SparkLine />
            </SolarWidget>
          </div>

          {/* Avg */}
          <div key="avg">
            <SolarWidget title="AVG ORDER VALUE">
              <strong className="se-kpi-val" style={{ fontSize: 20 }}>SAR 213</strong>
              <span className="se-kpi-hint" style={{ color: '#4ade80' }}>+16.3%</span>
              <SparkLine />
            </SolarWidget>
          </div>

          {/* Radar */}
          <div key="radar">
            <SolarWidget>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <RadarRing />
              </div>
            </SolarWidget>
          </div>

          {/* Robot */}
          <div key="robot">
            <SolarWidget>
              <div style={{ height: '100%', overflow: 'hidden', borderRadius: 10 }}>
                <img src="/assets/ai-robot.png" alt="AI"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              </div>
            </SolarWidget>
          </div>

          {/* AI Command */}
          <div key="ai">
            <SolarWidget title="AI COMMAND CENTER">
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 12px' }}>
                {leads.filter(l => l.stage === 'new').length || 28} inactive customers detected.
                Launch win-back campaign?
              </p>
              <button type="button" className="se-ai-btn">EXECUTE COMMAND</button>
            </SolarWidget>
          </div>

          {/* Automations */}
          <div key="autos">
            <SolarWidget title="ACTIVE AUTOMATIONS">
              <strong className="se-auto-count">{activeAutos || 18}</strong>
              <span className="se-auto-hint">Running smoothly</span>
              <div className="se-auto-bar-wrap" style={{ marginTop: 'auto' }}>
                <motion.div className="se-auto-bar"
                  initial={{ width: 0 }} animate={{ width: '88%' }} transition={{ duration: 1.2 }} />
              </div>
            </SolarWidget>
          </div>

          {/* Calendar */}
          <div key="calendar">
            <SolarWidget title="CORE CALENDAR">
              <div className="se-timeline-hours">
                {['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '5 PM'].map(h => (
                  <span key={h} className="se-timeline-hour">{h}</span>
                ))}
              </div>
              <div className="se-timeline">
                {appointments.slice(0, 4).map(a => (
                  <div key={a.id} className="se-appt-tile">
                    <strong>{a.service_name}</strong>
                    <span>{a.customer_name}</span>
                    <span className="se-appt-time">{formatTime(a.scheduled_at)}</span>
                  </div>
                ))}
              </div>
            </SolarWidget>
          </div>

          {/* Services */}
          <div key="services">
            <SolarWidget title="POWERED SERVICES">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {services.slice(0, 4).map(s => (
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
            </SolarWidget>
          </div>

          {/* Staff */}
          <div key="staff">
            <SolarWidget title="STAFF POWER LEVELS">
              <div className="se-staff-grid" style={{ marginTop: 8 }}>
                {staff.slice(0, 4).map(s => (
                  <div key={s.id} className="se-staff-card">
                    <PowerRing value={s.performance_score || 0} />
                    <span className="se-staff-name">{s.name}</span>
                  </div>
                ))}
              </div>
            </SolarWidget>
          </div>

        </GridLayout>
      </div>

      <div className="se-footer-banner">
        SOLAR ENERGY · CENTRAL INTELLIGENCE · UNSTOPPABLE FORCE
      </div>
    </div>
  )
}
