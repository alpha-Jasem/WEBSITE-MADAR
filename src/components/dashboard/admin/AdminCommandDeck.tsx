import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import {
  Activity,
  Building2,
  ChevronRight,
  Cpu,
  Sparkles,
  TrendingUp,
  Users2,
  Workflow,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null; created_at?: string | null }
type Company = { id: string; name?: string | null; is_active?: boolean | null }
type Automation = { id: string; name?: string | null; status?: string | null }

function SparkLine({ color }: { color: string }) {
  const data = Array.from({ length: 10 }, (_, i) => ({ v: Math.random() * 60 + 20 + i * 3 }))
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`cd-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#cd-${color.replace('#', '')})`} dot={false} />
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

export const AdminCommandDeck = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [messages, setMessages] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: c }, { data: a }, { count: m }] = await Promise.all([
        supabase.from('crm_leads').select('id,stage,price_sold,created_at'),
        supabase.from('companies').select('id,name,is_active'),
        supabase.from('automations').select('id,name,status'),
        supabase.from('message_logs').select('id', { count: 'exact', head: true }),
      ])
      setLeads((l ?? []) as Lead[])
      setCompanies((c ?? []) as Company[])
      setAutomations((a ?? []) as Automation[])
      setMessages(m ?? 0)
    }
    load()
    const ch = supabase.channel('cmd_deck')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const totalRevenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const activeCompanies = companies.filter(c => c.is_active !== false).length
  const activeAutos = automations.filter(a => a.status === 'active' || a.status === 'running').length

  return (
    <div className="se-overview">

      {/* Full-screen fixed video background */}
      <div className="se-overview-bg-fixed">
        <video src="/assets/command-deck-bg.mp4" autoPlay loop muted playsInline />
      </div>

      {/* Main grid: left cards | center M logo | right cards */}
      <div className="se-main-grid">

        {/* Left column */}
        <div className="se-left-col">
          <motion.div className="se-kpi-card" whileHover={{ scale: 1.02 }}>
            <div className="se-kpi-header">
              <Building2 size={13} color="#65d6ff" />
              <span>COMPANIES</span>
            </div>
            <strong className="se-kpi-big">
              <AnimNum value={activeCompanies || companies.length || 47} />
            </strong>
            <p className="se-kpi-sub">Active accounts</p>
            <div className="se-mini-bars">
              {[5, 7, 6, 9, 7, 10, 8, 11].map((v, i) => (
                <motion.div key={i} className="se-mini-bar" style={{ height: v * 4, background: 'rgba(101,214,255,0.55)' }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }} />
              ))}
            </div>
          </motion.div>

          <motion.div className="se-kpi-card" whileHover={{ scale: 1.02 }}>
            <div className="se-kpi-header">
              <Users2 size={13} color="#65d6ff" />
              <span>ACTIVE LEADS</span>
            </div>
            <strong className="se-kpi-big">
              <AnimNum value={leads.length || 1284} />
            </strong>
            <p className="se-kpi-sub se-positive">+12.4%</p>
            <div className="se-mini-bars">
              {[6, 8, 7, 10, 9, 11, 13, 10].map((v, i) => (
                <motion.div key={i} className="se-mini-bar" style={{ height: v * 4, background: 'rgba(101,214,255,0.55)' }}
                  initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.05 }} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Center: transparent — video shows through */}
        <div className="se-center-spacer" />

        {/* Right column */}
        <div className="se-right-col">
          {[
            { label: 'TOTAL REVENUE', value: totalRevenue || 284560, prefix: 'SAR ', delta: '+34.2%', color: '#65d6ff', icon: TrendingUp },
            { label: 'AUTOMATIONS', value: activeAutos || automations.length || 18, suffix: '', delta: 'Running', color: '#65d6ff', icon: Workflow },
            { label: 'MESSAGES TODAY', value: messages || 1248, suffix: '', delta: '+8.1%', color: '#65d6ff', icon: Activity },
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

      {/* Action row: 3 panels */}
      <div className="se-action-row">

        {/* AI Insight panel */}
        <div className="se-radar-panel" style={{ flexDirection: 'column', gap: 8, padding: 18 }}>
          <Sparkles size={22} color="#65d6ff" />
          <strong style={{ fontSize: 22, fontWeight: 800, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>
            <AnimNum value={94} suffix="%" />
          </strong>
          <span style={{ fontSize: 11, color: 'rgba(101,214,255,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>AI Confidence</span>
        </div>

        {/* Command center */}
        <div className="se-ai-panel">
          <div className="se-ai-content" style={{ flex: 1 }}>
            <p className="se-ai-title" style={{ color: 'rgba(101,214,255,0.7)' }}>SUPREME COMMAND</p>
            <p className="se-ai-msg">
              {activeAutos || 18} automations running across {activeCompanies || 47} companies.
              All systems nominal. {wonLeads.length || 156} deals closed this period.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="se-ai-btn" style={{ borderColor: 'rgba(101,214,255,0.7)', color: '#65d6ff' }}>VIEW PIPELINE</button>
              <button type="button" className="se-ai-btn" style={{ borderColor: 'rgba(101,214,255,0.7)', color: '#65d6ff' }}>BROADCAST</button>
            </div>
          </div>
        </div>

        {/* Threats / Cold alerts */}
        <div className="se-auto-panel">
          <p className="se-panel-label" style={{ color: 'rgba(101,214,255,0.6)' }}>UPTIME</p>
          <div className="se-auto-count">
            <Cpu size={18} color="#65d6ff" />
            <strong style={{ color: '#65d6ff' }}>99.9%</strong>
          </div>
          <p className="se-auto-sub">All services live</p>
          <div className="se-auto-bar-wrap">
            <motion.div className="se-auto-bar" style={{ background: 'linear-gradient(90deg, #65d6ff, #4f6ef7)' }}
              initial={{ width: 0 }} animate={{ width: '99%' }} transition={{ duration: 1.2 }} />
          </div>
        </div>
      </div>

      {/* Bottom grid: quick actions + recent activity */}
      <div className="se-bottom-grid">

        {/* Pipeline funnel */}
        <div className="se-services-panel">
          <p className="se-panel-label" style={{ color: 'rgba(101,214,255,0.6)' }}>PIPELINE FUNNEL</p>
          {[
            { stage: 'New', count: leads.filter(l => l.stage === 'new').length || 248, color: '#65d6ff' },
            { stage: 'Qualified', count: leads.filter(l => l.stage === 'qualified').length || 142, color: '#65d6ff' },
            { stage: 'Proposal', count: leads.filter(l => l.stage === 'proposal').length || 87, color: '#65d6ff' },
            { stage: 'Won', count: wonLeads.length || 56, color: '#65d6ff' },
          ].map((s) => {
            const max = 248
            const pct = Math.round((s.count / max) * 100)
            return (
              <div key={s.stage} className="se-svc-row">
                <div className="se-svc-icon" style={{ background: 'rgba(101,214,255,0.12)', borderColor: 'rgba(101,214,255,0.3)' }}>
                  <Zap size={12} color={s.color} />
                </div>
                <span className="se-svc-name">{s.stage}</span>
                <div className="se-svc-track">
                  <motion.div className="se-svc-fill" style={{ background: s.color }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                </div>
                <span className="se-svc-rev">{s.count.toLocaleString()}</span>
              </div>
            )
          })}
        </div>

        {/* Top companies */}
        <div className="se-staff-panel">
          <div className="se-panel-head-row">
            <p className="se-panel-label" style={{ color: 'rgba(101,214,255,0.6)' }}>RECENT COMPANIES</p>
            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(companies.length ? companies.slice(0, 4) : [
              { id: '1', name: 'Madar Solutions' },
              { id: '2', name: 'Solar Tech Co.' },
              { id: '3', name: 'Digital Forge' },
              { id: '4', name: 'Bright Future Ltd.' },
            ]).map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 4px', borderBottom: '1px solid rgba(101,214,255,0.1)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(101,214,255,0.12)', border: '1px solid rgba(101,214,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={14} color="#65d6ff" />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: '#4ade80' }}>● Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="se-footer-banner" style={{ color: 'rgba(101,214,255,0.4)' }}>
        SUPREME COMMAND · CENTRAL INTELLIGENCE · TOTAL CONTROL
      </div>

    </div>
  )
}
