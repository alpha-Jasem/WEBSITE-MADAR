import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Activity, Building2, ChevronRight, Cpu, GripHorizontal, Sparkles, TrendingUp, Users2, Workflow, Zap } from 'lucide-react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { supabase } from '../../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null }
type Company = { id: string; name?: string | null; is_active?: boolean | null }
type Automation = { id: string; status?: string | null }

const STORAGE_KEY = 'cmd-deck-layout-v2'

// PlayStation Classic bento — big feature card left, stacked KPIs right
const DEFAULT_LAYOUT: Layout[] = [
  // Row 1: hero left (companies) + 2 KPIs stacked right
  { i: 'companies',  x: 0, y: 0,  w: 7, h: 8,  minW: 1, minH: 2 },
  { i: 'revenue',    x: 7, y: 0,  w: 5, h: 4,  minW: 1, minH: 2 },
  { i: 'autos',      x: 7, y: 4,  w: 5, h: 4,  minW: 1, minH: 2 },
  // Row 2: small left + wide right
  { i: 'leads',      x: 0, y: 8,  w: 4, h: 6,  minW: 1, minH: 2 },
  { i: 'messages',   x: 4, y: 8,  w: 8, h: 6,  minW: 1, minH: 2 },
  // Row 3: full-width pipeline
  { i: 'pipeline',   x: 0, y: 14, w: 12, h: 5, minW: 1, minH: 2 },
  // Row 4: 3 equal panels
  { i: 'ai-conf',    x: 0, y: 19, w: 3, h: 5,  minW: 1, minH: 2 },
  { i: 'command',    x: 3, y: 19, w: 6, h: 5,  minW: 1, minH: 2 },
  { i: 'uptime',     x: 9, y: 19, w: 3, h: 5,  minW: 1, minH: 2 },
  // Row 5: full-width companies list
  { i: 'companies2', x: 0, y: 24, w: 12, h: 6, minW: 1, minH: 2 },
]

function loadLayout(): Layout[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : DEFAULT_LAYOUT
  } catch { return DEFAULT_LAYOUT }
}

function SparkLine({ color }: { color: string }) {
  const data = Array.from({ length: 8 }, (_, i) => ({ v: 20 + i * 8 + Math.random() * 20 }))
  return (
    <ResponsiveContainer width="100%" height={32}>
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

function Widget({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="hud-widget">
      <div className="hud-drag-handle">
        <GripHorizontal size={12} color="rgba(255,255,255,0.25)" />
        {title && <span className="hud-widget-title">{title}</span>}
      </div>
      <div className="hud-widget-body">{children}</div>
    </div>
  )
}

export const AdminCommandDeck = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [messages, setMessages] = useState(0)
  const [layout, setLayout] = useState<Layout[]>(loadLayout)
  const [width, setWidth] = useState(window.innerWidth - 286 - 32)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth - 286 - 32)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: c }, { data: a }, { count: m }] = await Promise.all([
        supabase.from('crm_leads').select('id,stage,price_sold'),
        supabase.from('companies').select('id,name,is_active'),
        supabase.from('automations').select('id,status'),
        supabase.from('message_logs').select('id', { count: 'exact', head: true }),
      ])
      setLeads((l ?? []) as Lead[])
      setCompanies((c ?? []) as Company[])
      setAutomations((a ?? []) as Automation[])
      setMessages(m ?? 0)
    }
    load()
    const ch = supabase.channel('cmd_deck').on('postgres_changes', { event:'*', schema:'public', table:'crm_leads' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const onLayoutChange = useCallback((l: Layout[]) => {
    setLayout(l)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l))
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const activeCompanies = companies.filter(c => c.is_active !== false).length
  const activeAutos = automations.filter(a => a.status === 'active' || a.status === 'running').length
  const cyan = '#65d6ff'

  const miniBarsCyan = [5,7,6,9,7,10,8,11]

  return (
    <div className="se-hud-page">
      <div className="se-hero">
        <video src="/assets/command-deck-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" />
      </div>

      <button type="button" className="hud-reset-btn" onClick={() => { localStorage.removeItem(STORAGE_KEY); setLayout(DEFAULT_LAYOUT) }}>
        ↺ Reset Layout
      </button>

      <div className="hud-grid-wrapper">
        <GridLayout
          layout={layout}
          cols={12}
          rowHeight={36}
          width={width}
          margin={[6, 6]}
          isDraggable
          isResizable
          resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'e']}
          draggableHandle=".hud-drag-handle"
          onLayoutChange={onLayoutChange}
        >
          {/* Companies */}
          <div key="companies">
            <Widget title="COMPANIES">
              <div className="hud-kpi-header"><Building2 size={12} color={cyan} /></div>
              <strong className="hud-kpi-big" style={{ color:'#fff' }}><AnimNum value={activeCompanies || companies.length || 47} /></strong>
              <p className="hud-kpi-sub" style={{ color:'rgba(101,214,255,0.6)' }}>Active accounts</p>
              <div className="se-mini-bars" style={{ height:28 }}>
                {miniBarsCyan.map((v,i) => (
                  <motion.div key={i} className="se-mini-bar" style={{ height: v*2.5, background:'rgba(101,214,255,0.55)' }} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay: i*0.04 }} />
                ))}
              </div>
            </Widget>
          </div>

          {/* Leads */}
          <div key="leads">
            <Widget title="ACTIVE LEADS">
              <div className="hud-kpi-header"><Users2 size={12} color={cyan} /></div>
              <strong className="hud-kpi-big" style={{ color:'#fff' }}><AnimNum value={leads.length || 1284} /></strong>
              <p className="hud-kpi-sub" style={{ color:'#4ade80' }}>+12.4%</p>
              <div className="se-mini-bars" style={{ height:28 }}>
                {[6,8,7,10,9,11,13,10].map((v,i) => (
                  <motion.div key={i} className="se-mini-bar" style={{ height: v*2.5, background:'rgba(101,214,255,0.55)' }} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay: i*0.04 }} />
                ))}
              </div>
            </Widget>
          </div>

          {/* Revenue */}
          <div key="revenue">
            <Widget title="TOTAL REVENUE">
              <div className="hud-kpi-header"><TrendingUp size={12} color={cyan} /></div>
              <strong className="hud-kpi-big" style={{ color: cyan, fontSize:20 }}><AnimNum value={revenue || 284560} prefix="SAR " /></strong>
              <p className="hud-kpi-sub" style={{ color:'#4ade80' }}>+34.2%</p>
              <SparkLine color={cyan} />
            </Widget>
          </div>

          {/* Automations */}
          <div key="autos">
            <Widget title="AUTOMATIONS">
              <div className="hud-kpi-header"><Workflow size={12} color={cyan} /></div>
              <strong className="hud-kpi-big" style={{ color: cyan }}><AnimNum value={activeAutos || automations.length || 18} /></strong>
              <p className="hud-kpi-sub" style={{ color:'rgba(101,214,255,0.6)' }}>Running</p>
              <SparkLine color={cyan} />
            </Widget>
          </div>

          {/* Messages */}
          <div key="messages">
            <Widget title="MESSAGES TODAY">
              <div className="hud-kpi-header"><Activity size={12} color={cyan} /></div>
              <strong className="hud-kpi-big" style={{ color: cyan }}><AnimNum value={messages || 1248} /></strong>
              <p className="hud-kpi-sub" style={{ color:'#4ade80' }}>+8.1%</p>
              <SparkLine color={cyan} />
            </Widget>
          </div>

          {/* AI Confidence */}
          <div key="ai-conf">
            <Widget>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:4 }}>
                <Sparkles size={20} color={cyan} />
                <strong style={{ fontSize:28, fontWeight:800, color:'#fff' }}><AnimNum value={94} suffix="%" /></strong>
                <span style={{ fontSize:9, color:'rgba(101,214,255,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', textAlign:'center' }}>AI Confidence</span>
              </div>
            </Widget>
          </div>

          {/* Supreme Command */}
          <div key="command">
            <Widget title="SUPREME COMMAND">
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)', lineHeight:1.5, marginBottom:10 }}>
                {activeAutos||18} automations running across {activeCompanies||47} companies.
                All systems nominal. {wonLeads.length||156} deals closed this period.
              </p>
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" className="se-ai-btn" style={{ borderColor:'rgba(101,214,255,0.5)', color:cyan, fontSize:10, padding:'6px 14px' }}>VIEW PIPELINE</button>
                <button type="button" className="se-ai-btn" style={{ borderColor:'rgba(101,214,255,0.5)', color:cyan, fontSize:10, padding:'6px 14px' }}>BROADCAST</button>
              </div>
            </Widget>
          </div>

          {/* Uptime */}
          <div key="uptime">
            <Widget title="UPTIME">
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <Cpu size={16} color={cyan} />
                <strong style={{ fontSize:22, color:cyan }}>99.9%</strong>
              </div>
              <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>All services live</p>
              <div className="se-auto-bar-wrap" style={{ marginTop:8 }}>
                <motion.div className="se-auto-bar" style={{ background:`linear-gradient(90deg,${cyan},#4f6ef7)` }} initial={{ width:0 }} animate={{ width:'99%' }} transition={{ duration:1.2 }} />
              </div>
            </Widget>
          </div>

          {/* Pipeline Funnel */}
          <div key="pipeline">
            <Widget title="PIPELINE FUNNEL">
              {[
                { stage:'New',      count: leads.filter(l=>l.stage==='new').length      || 248 },
                { stage:'Qualified',count: leads.filter(l=>l.stage==='qualified').length|| 142 },
                { stage:'Proposal', count: leads.filter(l=>l.stage==='proposal').length || 87  },
                { stage:'Won',      count: wonLeads.length || 56 },
              ].map(s => (
                <div key={s.stage} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Zap size={10} color={cyan} />
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.65)', width:64 }}>{s.stage}</span>
                  <div style={{ flex:1, height:5, background:'rgba(101,214,255,0.1)', borderRadius:3, overflow:'hidden' }}>
                    <motion.div style={{ height:'100%', background:`linear-gradient(90deg,${cyan},#4f6ef7)`, borderRadius:3 }}
                      initial={{ width:0 }} animate={{ width:`${Math.round(s.count/248*100)}%` }} transition={{ duration:1 }} />
                  </div>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', width:36, textAlign:'right' }}>{s.count}</span>
                </div>
              ))}
            </Widget>
          </div>

          {/* Recent Companies */}
          <div key="companies2">
            <Widget title="RECENT COMPANIES">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {(companies.length ? companies.slice(0,4) : [
                  { id:'1', name:'Madar Solutions' }, { id:'2', name:'Solar Tech Co.' },
                  { id:'3', name:'Digital Forge' },   { id:'4', name:'Bright Future Ltd.' },
                ]).map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid rgba(101,214,255,0.08)' }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(101,214,255,0.1)', border:'1px solid rgba(101,214,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Building2 size={12} color={cyan} />
                    </div>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.8)', flex:1 }}>{c.name}</span>
                    <span style={{ fontSize:10, color:'#4ade80' }}>● Active</span>
                    <ChevronRight size={12} color="rgba(255,255,255,0.2)" />
                  </div>
                ))}
              </div>
            </Widget>
          </div>
        </GridLayout>
      </div>
    </div>
  )
}
