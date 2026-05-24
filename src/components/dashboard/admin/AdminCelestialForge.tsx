import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Activity, Brain, Calendar, ChevronRight, Cpu, Database, FlameKindling, Layers, Sparkles, Target, TrendingUp, Zap } from 'lucide-react'
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

type AutomationRecord = {
  id: string
  name?: string | null
  status?: string | null
}

function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: { value: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const duration = 1400
    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(value * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{prefix}{decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString('en-US')}{suffix}</>
}

function GaugeArc({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel: string }) {
  const r = 44
  const circumference = 2 * Math.PI * r
  const arc = circumference * 0.75
  const dashOffset = arc - (arc * Math.min(value, 100)) / 100

  return (
    <div className="forge-gauge">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
          strokeDasharray={`${arc} ${circumference}`} strokeDashoffset={circumference * 0.125}
          strokeLinecap="round" transform="rotate(135 55 55)" />
        <motion.circle
          cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${arc} ${circumference}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round" transform="rotate(135 55 55)"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="55" y="50" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="Cairo, sans-serif">
          {value.toFixed(1)}%
        </text>
        <text x="55" y="66" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="Cairo, sans-serif">
          OPTIMAL
        </text>
      </svg>
      <p className="forge-gauge-label">{label}</p>
      <span className="forge-gauge-sub">{sublabel}</span>
    </div>
  )
}

function ForgeRing({ size, duration, reverse, color }: { size: number; duration: number; reverse?: boolean; color: string }) {
  return (
    <motion.div
      className="forge-ring"
      style={{ width: size, height: size, borderColor: color }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, ease: 'linear', repeat: Infinity }}
    />
  )
}

const FORGE_CALENDAR = [
  { time: '10:00 AM', label: 'Strategy Sync', icon: Target },
  { time: '12:00 PM', label: 'Data Convergence', icon: Database },
  { time: '02:00 PM', label: 'Model Calibration', icon: Brain },
  { time: '04:30 PM', label: 'Insight Delivery', icon: Sparkles },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const AdminCelestialForge = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [automations, setAutomations] = useState<AutomationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [{ data: leadsData }, { data: autoData }] = await Promise.all([
        supabase.from('crm_leads').select('*').order('updated_at', { ascending: false }),
        supabase.from('automations').select('id, name, status'),
      ])
      setLeads((leadsData ?? []) as LeadRecord[])
      setAutomations((autoData ?? []) as AutomationRecord[])
      setLoading(false)
    }
    load()

    const ticker = setInterval(() => setPulse(v => (v + 1) % 10), 1800)
    const channel = supabase
      .channel('celestial_forge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()

    return () => { clearInterval(ticker); supabase.removeChannel(channel) }
  }, [])

  const now = new Date()
  const wonLeads = leads.filter(l => l.stage === 'won')
  const forgeOutput = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const totalLeads = leads.length
  const closeRate = totalLeads ? (wonLeads.length / totalLeads) * 100 : 0
  const activeAuto = automations.filter(a => a.status === 'active').length
  const roiGenerated = forgeOutput * 0.49

  const completeLeads = leads.filter(l => l.company_name && l.stage && l.sector).length
  const dataRefinery = totalLeads ? (completeLeads / totalLeads) * 100 : 96.1
  const progressed = leads.filter(l => l.stage !== 'new').length
  const modelSmelter = totalLeads ? (progressed / totalLeads) * 100 : 92.4
  const insightExtractor = Math.min(closeRate + 30, 99.9) || 95.7
  const qualifiedLeads = leads.filter(l => ['qualified', 'won'].includes(l.stage || '')).length
  const decisionCrafter = qualifiedLeads ? (wonLeads.length / qualifiedLeads) * 100 : 91.3

  const topProjects = leads
    .filter(l => l.stage !== 'won' && l.stage !== 'lost' && l.company_name)
    .slice(0, 3)
    .map((l, i) => ({
      name: l.company_name!,
      progress: Math.max(30, 87 - i * 13),
      sector: l.sector || 'General',
    }))

  if (topProjects.length < 3) {
    const fillers = [
      { name: 'Market Expansion Model', progress: 87, sector: 'Strategy' },
      { name: 'Customer Lifetime Value', progress: 74, sector: 'Analytics' },
      { name: 'Supply Chain Optimization', progress: 68, sector: 'Operations' },
    ]
    while (topProjects.length < 3) topProjects.push(fillers[topProjects.length])
  }

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now)
    d.setMonth(d.getMonth() - (5 - i))
    const key = monthKey(d)
    const rev = wonLeads
      .filter(l => (l.updated_at || '').startsWith(key))
      .reduce((s, l) => s + (l.price_sold || 0), 0)
    return { month: MONTHS[d.getMonth()], output: Math.round(rev / 1000) }
  })

  const engines = [
    { label: 'Compute Engine', status: 'MAX', color: '#f3a64f', icon: Cpu },
    { label: 'Learning Engine', status: 'MAX', color: '#f3a64f', icon: Brain },
    { label: 'Inference Engine', status: 'HIGH', color: '#62d8ff', icon: Activity },
    { label: 'Optimization Engine', status: 'HIGH', color: '#62d8ff', icon: Zap },
  ]

  const kpis = [
    {
      label: 'FORGE OUTPUT',
      value: forgeOutput / 1000,
      prefix: 'SAR ',
      suffix: 'K',
      decimals: 1,
      delta: '+23.6%',
      color: '#f3a64f',
      icon: TrendingUp,
    },
    {
      label: 'PREDICTION ACCURACY',
      value: Math.max(closeRate, 12),
      prefix: '',
      suffix: '%',
      decimals: 1,
      delta: '+8.9%',
      color: '#93ebcf',
      icon: Target,
    },
    {
      label: 'MODELS ACTIVE',
      value: Math.max(automations.length, 1),
      prefix: '',
      suffix: '',
      decimals: 0,
      delta: 'AI Models Running',
      color: '#62d8ff',
      icon: Brain,
    },
    {
      label: 'AUTOMATIONS',
      value: Math.max(activeAuto, 1),
      prefix: '',
      suffix: '',
      decimals: 0,
      delta: 'Running',
      color: '#a78bfa',
      icon: Zap,
    },
    {
      label: 'DATA INGESTION',
      value: Math.max(totalLeads * 0.0214, 0.5),
      prefix: '',
      suffix: 'TB',
      decimals: 2,
      delta: '+16.8%',
      color: '#f472b6',
      icon: Database,
    },
    {
      label: 'ROI GENERATED',
      value: roiGenerated / 1000,
      prefix: 'SAR ',
      suffix: 'K',
      decimals: 1,
      delta: '+13.3%',
      color: '#fb923c',
      icon: Layers,
    },
  ]

  if (loading) {
    return (
      <div className="forge-loading">
        <motion.div
          className="forge-loading-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
        />
        <p>Igniting the Celestial Forge...</p>
      </div>
    )
  }

  return (
    <div className="forge-shell">
      {/* Header */}
      <div className="forge-header">
        <div className="forge-header-left">
          <FlameKindling size={20} color="#f3a64f" />
          <div>
            <p className="forge-eyebrow">Intelligence System</p>
            <h2 className="forge-title">INTELLIGENCE FORGE</h2>
          </div>
        </div>
        <div className="forge-header-right">
          <div className="forge-status-badge">
            <span className="forge-status-dot" />
            FORGE ACTIVE
          </div>
          <span className="forge-meta">System Status: Forging Optimal</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="forge-kpi-row">
        {kpis.map((k) => (
          <motion.div
            key={k.label}
            className="forge-kpi-card"
            style={{ '--accent': k.color } as React.CSSProperties}
            whileHover={{ y: -3 }}
          >
            <k.icon size={14} color={k.color} />
            <p className="forge-kpi-label">{k.label}</p>
            <strong className="forge-kpi-value" style={{ color: k.color }}>
              <AnimatedNumber value={k.value} prefix={k.prefix} suffix={k.suffix} decimals={k.decimals} />
            </strong>
            <span className="forge-kpi-delta">{k.delta}</span>
          </motion.div>
        ))}
      </div>

      {/* Core + Chart */}
      <div className="forge-mid-grid">
        {/* Central reactor */}
        <div className="forge-core-wrap">
          <div className="forge-core-stage">
            <ForgeRing size={300} duration={28} color="rgba(243,166,79,0.30)" />
            <ForgeRing size={230} duration={20} reverse color="rgba(98,216,255,0.22)" />
            <ForgeRing size={160} duration={14} color="rgba(243,166,79,0.40)" />

            <motion.div
              className="forge-monogram"
              animate={{ boxShadow: ['0 0 40px rgba(243,166,79,0.3)', '0 0 90px rgba(243,166,79,0.55)', '0 0 40px rgba(243,166,79,0.3)'] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span>M</span>
              <small>{(93 + pulse % 7).toFixed(0)}%</small>
            </motion.div>
          </div>

          {/* Forge Control Gauges */}
          <div className="forge-control-section">
            <p className="forge-section-label">FORGE CONTROL</p>
            <div className="forge-gauges-row">
              <GaugeArc value={dataRefinery} color="#f3a64f" label="DATA REFINERY" sublabel="Refining raw data" />
              <GaugeArc value={modelSmelter} color="#62d8ff" label="MODEL SMELTER" sublabel="Running & tuning" />
              <GaugeArc value={insightExtractor} color="#93ebcf" label="INSIGHT EXTRACTOR" sublabel="Extracting value" />
              <GaugeArc value={decisionCrafter} color="#a78bfa" label="DECISION CRAFTER" sublabel="Shaping decisions" />
            </div>
          </div>
        </div>

        {/* Revenue chart */}
        <div className="forge-chart-panel">
          <p className="forge-section-label">FORGE OUTPUT TRAJECTORY</p>
          <p className="forge-chart-sub">6-month revenue orbit (SAR k)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="forgeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f3a64f" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f3a64f" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="#4a5568" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis stroke="#4a5568" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(243,166,79,0.3)', borderRadius: 8, color: '#fff' }}
                labelStyle={{ color: '#f3a64f' }}
              />
              <Area type="monotone" dataKey="output" name="Output (k)" stroke="#f3a64f" strokeWidth={2.5} fill="url(#forgeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="forge-bottom-grid">
        {/* Forge Calendar */}
        <div className="forge-panel">
          <div className="forge-panel-head">
            <Calendar size={14} color="#f3a64f" />
            <p>FORGE CALENDAR</p>
          </div>
          <div className="forge-calendar-list">
            {FORGE_CALENDAR.map((item) => (
              <motion.div key={item.label} className="forge-cal-item" whileHover={{ x: 3 }}>
                <item.icon size={13} color="#f3a64f" />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.time}</span>
                </div>
                <ChevronRight size={13} color="rgba(255,255,255,0.3)" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Active Forge Projects */}
        <div className="forge-panel">
          <div className="forge-panel-head">
            <Target size={14} color="#62d8ff" />
            <p>ACTIVE FORGE PROJECTS</p>
          </div>
          <div className="forge-project-list">
            {topProjects.map((p) => (
              <div key={p.name} className="forge-project-item">
                <div className="forge-project-meta">
                  <strong>{p.name}</strong>
                  <span>{p.progress}%</span>
                </div>
                <div className="forge-progress-track">
                  <motion.div
                    className="forge-progress-fill"
                    style={{ background: p.progress > 80 ? '#f3a64f' : p.progress > 65 ? '#62d8ff' : '#93ebcf' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progress}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </div>
                <span className="forge-project-sector">{p.sector}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Forge Engines */}
        <div className="forge-panel">
          <div className="forge-panel-head">
            <Cpu size={14} color="#93ebcf" />
            <p>FORGE ENGINES</p>
          </div>
          <div className="forge-engine-list">
            {engines.map((e) => (
              <motion.div key={e.label} className="forge-engine-item" whileHover={{ x: 3 }}>
                <e.icon size={14} color={e.color} />
                <span>{e.label}</span>
                <div className="forge-engine-badge" style={{ color: e.color, borderColor: `${e.color}40`, background: `${e.color}12` }}>
                  {e.status}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="forge-engine-foot">
            <span className="forge-status-dot" />
            <p>All forge systems operating at peak capacity</p>
          </div>
        </div>
      </div>
    </div>
  )
}
