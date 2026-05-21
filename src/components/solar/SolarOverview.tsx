import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Calendar, ChevronRight, Cpu, TrendingUp, Users, Wrench, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Lead = { id: string; stage?: string | null; price_sold?: number | null }
type Appointment = { id: string; customer_name: string; service_name?: string | null; scheduled_at?: string | null }
type Staff = { id: string; name: string; role?: string | null; performance_score?: number | null }
type Service = { id: string; name: string; revenue?: number | null }

function SparkLine({ color }: { color: string }) {
  const data = Array.from({ length: 8 }, (_, i) => ({ v: 20 + i * 8 + Math.random() * 20 }))
  return (
    <ResponsiveContainer width="100%" height={28}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${color.replace('#','')})`} dot={false} />
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

function PowerRing({ score, name }: { score: number; name: string }) {
  const r = 22; const c = 2 * Math.PI * r; const gold = '#f3a64f'
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(243,166,79,0.15)" strokeWidth="4" />
        <motion.circle cx="28" cy="28" r={r} fill="none" stroke={gold} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * score) / 100 }}
          transition={{ duration:1.4, ease:'easeOut' }} transform="rotate(-90 28 28)"
          style={{ filter:`drop-shadow(0 0 4px ${gold})` }} />
        <text x="28" y="32" textAnchor="middle" fill={gold} fontSize="10" fontWeight="700">{score}%</text>
      </svg>
      <p style={{ fontSize:9, color:'rgba(255,255,255,0.7)', margin:0 }}>{name.split(' ')[0]}</p>
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
        supabase.from('crm_leads').select('id,stage,price_sold').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('scheduled_at').limit(3),
        supabase.from('staff').select('*').order('performance_score', { ascending: false }),
        supabase.from('services').select('*').order('revenue', { ascending: false }),
      ])
      setLeads((l ?? []) as Lead[]); setAppointments((a ?? []) as Appointment[])
      setStaff((s ?? []) as Staff[]); setServices((sv ?? []) as Service[])
    }
    load()
    const ch = supabase.channel('solar_ov').on('postgres_changes', { event:'*', schema:'public', table:'appointments' }, load).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const wonLeads = leads.filter(l => l.stage === 'won')
  const revenue = wonLeads.reduce((s, l) => s + (l.price_sold || 0), 0)
  const returningRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 68
  const avgOrder = wonLeads.length ? Math.round(revenue / wonLeads.length) : 213
  const gold = '#f3a64f'

  return (
    <div className="se-hud-page">
      <div className="se-hero"><video src="/assets/solar-bg.mp4" autoPlay loop muted playsInline className="se-hero-video" /></div>

      <div className="se-content-section">

        {/* ROW 1 — KPIs left | circuit center (open) | Metrics right */}
        <div className="se-row1">

          {/* Left */}
          <div className="se-col-kpi">
            {[
              { icon: Calendar, label: 'APPOINTMENTS', value: appointments.length || 32, sub: 'Today' },
              { icon: Users,    label: 'CUSTOMERS',    value: leads.length || 2142,      sub: '+18.6%' },
            ].map(k => (
              <motion.div key={k.label} className="se-kpi-card" whileHover={{ scale: 1.02 }}>
                <div className="se-kpi-header"><k.icon size={12} color={gold} /><span>{k.label}</span></div>
                <strong className="se-kpi-big" style={{ color:'#fff' }}><AnimNum value={k.value} /></strong>
                <p className="se-kpi-sub">{k.sub}</p>
                <div className="se-mini-bars">
                  {[4,7,5,9,6,8,11,7].map((v,i) => (
                    <motion.div key={i} className="se-mini-bar" style={{ height: v*3 }} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay: i*0.04 }} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Center — circuit board visible through */}
          <div className="se-col-center" />

          {/* Right */}
          <div className="se-col-metrics">
            {[
              { label:"TODAY'S REVENUE", value: revenue || 45231, prefix:'SAR ', delta:'+23.6%', icon: TrendingUp },
              { label:'RETURNING RATE',  value: returningRate,    suffix:'%',   delta:'+8.7%',  icon: Users },
              { label:'AVG ORDER VALUE', value: avgOrder || 213,  prefix:'SAR ', delta:'+16.3%', icon: Cpu },
            ].map(k => (
              <motion.div key={k.label} className="se-metric-card" whileHover={{ scale: 1.02 }}>
                <div className="se-metric-header"><span>{k.label}</span><k.icon size={12} color={gold} /></div>
                <strong className="se-metric-val" style={{ color: gold }}><AnimNum value={k.value} prefix={k.prefix||''} suffix={k.suffix||''} /></strong>
                <p style={{ fontSize:10, color:'#4ade80', margin:0 }}>{k.delta}</p>
                <SparkLine color={gold} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* ROW 2 — 5 panels side by side */}
        <div className="se-row2">

          {/* AI Command — robot + input */}
          <div className="se-strip-panel" style={{ flex:2, flexDirection:'row', gap:10 }}>
            <video src="/assets/ai-robot.mp4" autoPlay loop muted playsInline style={{ width:70, height:90, objectFit:'cover', borderRadius:8, flexShrink:0 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1 }}>
              <p style={{ fontSize:9, color:'rgba(243,166,79,0.7)', letterSpacing:'0.1em', textTransform:'uppercase' }}>AI COMMAND CENTER</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.7)', lineHeight:1.4 }}>
                {leads.filter(l=>l.stage==='new').length||28} inactive customers detected
              </p>
              <input className="se-ai-input" style={{ fontSize:11, padding:'4px 8px' }} placeholder="Enter command..." value={aiCmd} onChange={e => setAiCmd(e.target.value)} />
              <button type="button" className="se-ai-btn" style={{ fontSize:9, padding:'4px 10px' }}>EXECUTE</button>
            </div>
          </div>

          {/* Automations */}
          <div className="se-strip-panel">
            <p style={{ fontSize:9, color:'rgba(243,166,79,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>AUTOMATIONS</p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <Zap size={16} color={gold} />
              <strong style={{ fontSize:22, color:gold }}>18</strong>
            </div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>Running smoothly</p>
            <div className="se-auto-bar-wrap" style={{ marginTop:6 }}>
              <motion.div className="se-auto-bar" initial={{ width:0 }} animate={{ width:'78%' }} transition={{ duration:1.2 }} />
            </div>
          </div>

          {/* Services */}
          <div className="se-strip-panel" style={{ flex:1.5 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <p style={{ fontSize:9, color:'rgba(243,166,79,0.6)', letterSpacing:'0.12em', textTransform:'uppercase' }}>SERVICES</p>
            </div>
            {(services.length ? services.slice(0,3) : [
              { id:'1', name:'Premium Wash',  revenue:12450 },
              { id:'2', name:'Exterior Detail',revenue:9230 },
              { id:'3', name:'Ceramic Coating',revenue:7910 },
            ]).map(s => {
              const max = 12450
              return (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <Wrench size={9} color={gold} />
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.6)', width:70, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{s.name}</span>
                  <div style={{ flex:1, height:4, background:'rgba(243,166,79,0.1)', borderRadius:2, overflow:'hidden' }}>
                    <motion.div style={{ height:'100%', background:gold, borderRadius:2 }} initial={{ width:0 }} animate={{ width:`${Math.round((s.revenue||0)/max*100)}%` }} transition={{ duration:1 }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Staff rings */}
          <div className="se-strip-panel" style={{ flex:1.5 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
              <p style={{ fontSize:9, color:'rgba(243,166,79,0.6)', letterSpacing:'0.12em', textTransform:'uppercase' }}>STAFF</p>
              <ChevronRight size={11} color="rgba(255,255,255,0.3)" />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'space-around' }}>
              {(staff.length ? staff.slice(0,4) : [
                { id:'1', name:'Khalid M.', performance_score:92 },
                { id:'2', name:'Ahmad R.',  performance_score:87 },
                { id:'3', name:'Sara A.',   performance_score:78 },
                { id:'4', name:'Faisal T.', performance_score:74 },
              ]).map(s => <PowerRing key={s.id} score={s.performance_score||80} name={s.name} />)}
            </div>
          </div>

          {/* Next appointments */}
          <div className="se-strip-panel" style={{ flex:1.4 }}>
            <p style={{ fontSize:9, color:'rgba(243,166,79,0.6)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>NEXT APPTS</p>
            {(appointments.length ? appointments.slice(0,3) : [
              { id:'1', customer_name:'Ahmed Al-Rashid', service_name:'Premium Wash',   scheduled_at: new Date().toISOString() },
              { id:'2', customer_name:'Sara Khalid',     service_name:'Exterior Detail', scheduled_at: new Date(Date.now()+9000000).toISOString() },
              { id:'3', customer_name:'Khalid M.',       service_name:'Full Check',      scheduled_at: new Date(Date.now()+14400000).toISOString() },
            ]).map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 0', borderBottom:'1px solid rgba(243,166,79,0.08)' }}>
                <Calendar size={9} color={gold} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.8)', margin:0, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{a.service_name}</p>
                  <p style={{ fontSize:9, color:'rgba(255,255,255,0.4)', margin:0 }}>{a.customer_name.split(' ')[0]}</p>
                </div>
                <span style={{ fontSize:9, color:gold }}>{new Date(a.scheduled_at||'').toLocaleTimeString('en-US',{ hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
