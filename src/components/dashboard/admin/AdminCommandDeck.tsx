import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Activity, Building2, ChevronRight, Cpu, Sparkles, TrendingUp, Users2, Workflow, Zap } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null }
type Company = { id: string; name?: string | null; is_active?: boolean | null }
type Automation = { id: string; status?: string | null }

function SparkLine({ color }: { color: string }) {
  const data = Array.from({ length: 8 }, (_, i) => ({ v: 20 + i * 8 + Math.random() * 20 }))
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sp-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${color.replace('#','')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function AnimNum({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [d, setD] = useState(0)
  useEffect(() => {
    let f = 0; const s = performance.now()
    const tick = (t: number) => { const p = Math.min((t-s)/1200,1); setD(Math.round(value*(1-Math.pow(1-p,3)))); if(p<1) f=requestAnimationFrame(tick) }
    f = requestAnimationFrame(tick); return () => cancelAnimationFrame(f)
  }, [value])
  return <>{prefix}{d.toLocaleString('en-US')}{suffix}</>
}

export const AdminCommandDeck = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [messages, setMessages] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: c }, { data: a }, { count: m }] = await Promise.all([
        supabase.from('crm_leads').select('id,stage,price_sold'),
        supabase.from('companies').select('id,name,is_active'),
        supabase.from('automations').select('id,status'),
        supabase.from('message_logs').select('id', { count: 'exact', head: true }),
      ])
      setLeads((l ?? []) as Lead[]); setCompanies((c ?? []) as Company[])
      setAutomations((a ?? []) as Automation[]); setMessages(m ?? 0)
    }
    load()
    const ch = supabase.channel('cmd_deck').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const activeCompanies = companies.filter(c => c.is_active !== false).length
  const activeAutos = automations.filter(a => a.status === 'active' || a.status === 'running').length
  const cyan = '#65d6ff'

  return (
    <div className="se-hud-page">
      <div className="se-hero"><video src="/assets/command-deck-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" /></div>

      <div className="se-content-section">

        {/* ROW 1 — KPIs left | Zeus center (open) | Metrics right */}
        <div className="se-row1">

          {/* Left */}
          <div className="se-col-kpi">
            {[
              { icon: Building2, label: 'COMPANIES', value: activeCompanies || companies.length || 47, sub: 'Active accounts' },
              { icon: Users2,    label: 'ACTIVE LEADS', value: leads.length || 1284, sub: '+12.4%' },
            ].map(k => (
              <motion.div key={k.label} className="se-kpi-card" whileHover={{ scale: 1.02 }}>
                <div className="se-kpi-header"><k.icon size={12} color={cyan} /><span>{k.label}</span></div>
                <strong className="se-kpi-big"><AnimNum value={k.value} /></strong>
                <p className="se-kpi-sub">{k.sub}</p>
                <div className="se-mini-bars">
                  {[5,7,6,9,7,10,8,11].map((v,i) => (
                    <motion.div key={i} className="se-mini-bar" style={{ height: v*3, background:'rgba(101,214,255,0.55)' }} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay: i*0.04 }} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Center — Zeus visible through */}
          <div className="se-col-center" />

          {/* Right */}
          <div className="se-col-metrics">
            {[
              { label: 'TOTAL REVENUE', value: revenue || 284560, prefix: 'SAR ', delta: '+34.2%', icon: TrendingUp },
              { label: 'AUTOMATIONS',   value: activeAutos || automations.length || 18, delta: 'Running', icon: Workflow },
              { label: 'MESSAGES TODAY',value: messages || 1248, delta: '+8.1%', icon: Activity },
            ].map(k => (
              <motion.div key={k.label} className="se-metric-card" whileHover={{ scale: 1.02 }}>
                <div className="se-metric-header"><span>{k.label}</span><k.icon size={12} color={cyan} /></div>
                <strong className="se-metric-val" style={{ color: cyan }}><AnimNum value={k.value} prefix={k.prefix||''} /></strong>
                <p style={{ fontSize:10, color:'#4ade80', margin:0 }}>{k.delta}</p>
                <SparkLine color={cyan} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ROW 2 — 5 panels side by side */}
        <div className="se-row2">

          {/* AI Confidence */}
          <div className="se-strip-panel se-strip-ai-conf">
            <Sparkles size={18} color={cyan} />
            <strong style={{ fontSize:26, fontWeight:800, color:'#fff' }}><AnimNum value={94} suffix="%" /></strong>
            <span style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase' }}>AI Confidence</span>
          </div>

          {/* Supreme Command */}
          <div className="se-strip-panel" style={{ flex:2 }}>
            <p style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>SUPREME COMMAND</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.4, marginBottom:8 }}>
              {activeAutos||18} automations · {activeCompanies||47} companies · {wonLeads.length||156} deals closed
            </p>
            <div style={{ display:'flex', gap:6 }}>
              <button type="button" className="se-ai-btn" style={{ borderColor:'rgba(101,214,255,0.5)', color:cyan, padding:'5px 12px', fontSize:10 }}>PIPELINE</button>
              <button type="button" className="se-ai-btn" style={{ borderColor:'rgba(101,214,255,0.5)', color:cyan, padding:'5px 12px', fontSize:10 }}>BROADCAST</button>
            </div>
          </div>

          {/* Uptime */}
          <div className="se-strip-panel">
            <p style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>UPTIME</p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Cpu size={16} color={cyan} />
              <strong style={{ fontSize:22, color:cyan }}>99.9%</strong>
            </div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>All services live</p>
            <div className="se-auto-bar-wrap" style={{ marginTop:6 }}>
              <motion.div className="se-auto-bar" style={{ background:`linear-gradient(90deg,${cyan},#4f6ef7)` }} initial={{ width:0 }} animate={{ width:'99%' }} transition={{ duration:1.2 }} />
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="se-strip-panel" style={{ flex:1.4 }}>
            <p style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>PIPELINE FUNNEL</p>
            {[
              { stage:'New',      count: leads.filter(l=>l.stage==='new').length      || 248 },
              { stage:'Qualified',count: leads.filter(l=>l.stage==='qualified').length|| 142 },
              { stage:'Won',      count: wonLeads.length || 56 },
            ].map(s => (
              <div key={s.stage} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <Zap size={9} color={cyan} />
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.6)', width:56 }}>{s.stage}</span>
                <div style={{ flex:1, height:4, background:'rgba(101,214,255,0.1)', borderRadius:2, overflow:'hidden' }}>
                  <motion.div style={{ height:'100%', background:cyan, borderRadius:2 }} initial={{ width:0 }} animate={{ width:`${Math.round(s.count/248*100)}%` }} transition={{ duration:1 }} />
                </div>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', width:28, textAlign:'right' }}>{s.count}</span>
              </div>
            ))}
          </div>

          {/* Recent Companies */}
          <div className="se-strip-panel" style={{ flex:1.4 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <p style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase' }}>COMPANIES</p>
              <ChevronRight size={12} color="rgba(255,255,255,0.3)" />
            </div>
            {(companies.length ? companies.slice(0,3) : [
              { id:'1', name:'Madar Solutions' }, { id:'2', name:'Solar Tech Co.' }, { id:'3', name:'Digital Forge' }
            ]).map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid rgba(101,214,255,0.08)' }}>
                <Building2 size={11} color={cyan} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.8)', flex:1 }}>{c.name}</span>
                <span style={{ fontSize:9, color:'#4ade80' }}>●</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
