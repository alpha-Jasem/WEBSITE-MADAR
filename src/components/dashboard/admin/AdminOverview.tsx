import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, Zap, Users2, TrendingUp,
  AlertTriangle, Brain, Sparkles,
  Send, X,
  Target, MessageSquare, Wifi,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ColdLeadAlert } from '../shared/ColdLeadAlert'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const PIE_COLORS = ['#00BFFF','#F59E0B','#8B5CF6','#10B981','#F43F5E','#6B7280','#EC4899']

const STAGE_AR: Record<string, string> = {
  new_lead: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل',
  meeting_booked: 'موعد محجوز', demo_done: 'تم العرض', proposal_sent: 'عرض أُرسل',
  negotiation: 'تفاوض', won: 'مغلق ✅', lost: 'خسارة ❌', on_hold: 'معلّق',
}
const STAGE_COLORS: Record<string, string> = {
  won: '#10B981', lost: '#F43F5E', meeting_booked: '#8B5CF6',
  new_lead: '#6B7280', contacted: '#00BFFF', default: '#F59E0B',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}
function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  return h < 1 ? 'منذ أقل من ساعة' : h < 24 ? `منذ ${h} ساعة` : `منذ ${Math.floor(h / 24)} يوم`
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = (value / 1200) * 16
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString('en')}{suffix}</>
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length || data.every(v => v === 0)) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const w = 80, h = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ direction: 'ltr' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
    </svg>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-tajawal"
      style={{ background: '#1A1D26', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="mb-1 opacity-50">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

// ─── AI Copilot Panel ────────────────────────────────────────────────────────

function AICopilot({ stats, onClose }: { stats: any; onClose: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: `مرحباً! عندي ${stats.totalLeads} عميل في قاعدة البيانات و${stats.wonLeads} صفقة مغلقة.` },
    { role: 'ai', text: stats.revenueThis > 0 ? `الإيراد هذا الشهر ${stats.revenueThis.toLocaleString('ar')} ريال.` : 'لا توجد صفقات مغلقة هذا الشهر بعد — حسّن مرحلة الإغلاق.' },
  ])
  const [typing, setTyping] = useState(false)

  const send = async () => {
    if (!input.trim() || typing) return
    const userMsg = input.trim()
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setInput('')
    setTyping(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ message: userMsg, stats }),
        }
      )
      const { reply } = await res.json()
      setMessages(m => [...m, { role: 'ai', text: reply }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'تعذّر الاتصال بـ Claude API.' }])
    } finally {
      setTyping(false)
    }
  }

  return (
    <motion.div
      initial={{ x: 360, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 360, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 200 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, zIndex: 50,
        background: 'rgba(13,16,23,0.97)',
        borderLeft: '1px solid rgba(0,191,255,0.15)',
        backdropFilter: 'blur(24px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="#00BFFF" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo' }}>AI Copilot</div>
            <div style={{ fontSize: 11, color: '#10B981' }}>بيانات حقيقية</div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: m.role === 'ai' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: m.role === 'ai' ? 'rgba(0,191,255,0.08)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${m.role === 'ai' ? 'rgba(0,191,255,0.15)' : 'rgba(245,158,11,0.2)'}`,
              fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: 'Tajawal', lineHeight: 1.6, direction: 'rtl',
            }}>
            {m.text}
          </motion.div>
        ))}
        {typing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ alignSelf: 'flex-end', padding: '10px 14px', borderRadius: '16px 4px 16px 16px', background: 'rgba(0,191,255,0.08)', border: '1px solid rgba(0,191,255,0.15)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#00BFFF' }}
                  animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="اسأل عن البيانات..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '10px 14px', fontSize: 13, color: 'white',
              fontFamily: 'Tajawal', outline: 'none', direction: 'rtl',
            }}
          />
          <button onClick={send} style={{
            width: 36, height: 36, borderRadius: 10, background: 'rgba(0,191,255,0.15)',
            border: '1px solid rgba(0,191,255,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
          }}>
            <Send size={14} color="#00BFFF" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminOverview = () => {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [activeInsight, setActiveInsight] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActiveInsight(i => (i + 1) % 3), 4000)
    return () => clearInterval(t)
  }, [])

  // ── Fetch + Realtime ──
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('crm_leads')
        .select('*')
        .order('updated_at', { ascending: false })
      setLeads(data || [])
      setLoading(false)
    }
    load()
    const channel = supabase.channel('admin_overview_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Compute stats ──
  const now = new Date()
  const thisMonthKey = monthKey(now)
  const prevDate = new Date(now); prevDate.setMonth(prevDate.getMonth() - 1)
  const prevMonthKey = monthKey(prevDate)

  const wonLeads     = leads.filter(l => l.stage === 'won')
  const revenueThis  = wonLeads.filter(l => (l.updated_at || '').startsWith(thisMonthKey)).reduce((s, l) => s + (l.price_sold || 0), 0)
  const revenuePrev  = wonLeads.filter(l => (l.updated_at || '').startsWith(prevMonthKey)).reduce((s, l) => s + (l.price_sold || 0), 0)
  const revChgPct    = revenuePrev ? Math.round((revenueThis - revenuePrev) / revenuePrev * 100) : 0
  const totalLeads   = leads.length
  const leadsThisMonth = leads.filter(l => (l.created_at || '').startsWith(thisMonthKey)).length
  const leadsPrev    = leads.filter(l => (l.created_at || '').startsWith(prevMonthKey)).length
  const leadChgPct   = leadsPrev ? Math.round((leadsThisMonth - leadsPrev) / leadsPrev * 100) : 0

  // ── Revenue chart — last 7 months ──
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setMonth(d.getMonth() - (6 - i))
    const key = monthKey(d)
    const rev = wonLeads.filter(l => (l.updated_at || '').startsWith(key)).reduce((s, l) => s + (l.price_sold || 0), 0) / 1000
    return {
      month: MONTHS_AR[d.getMonth()],
      revenue: Math.round(rev * 10) / 10,
      leads: leads.filter(l => (l.created_at || '').startsWith(key)).length,
    }
  })

  // ── Sector distribution ──
  const sectorMap: Record<string, number> = {}
  leads.forEach(l => { const s = l.sector || 'أخرى'; sectorMap[s] = (sectorMap[s] || 0) + 1 })
  const serviceData = Object.entries(sectorMap).map(([name, count], i) => ({
    name,
    value: leads.length ? Math.round(count / leads.length * 100) : 0,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  // ── Weekly new leads (last 7 days) ──
  const weeklyBar = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i))
    const key = dayKey(d)
    return { day: DAYS_AR[d.getDay()], leads: leads.filter(l => (l.created_at || '').startsWith(key)).length }
  })

  // ── Live activity — 5 most recently updated ──
  const liveItems = leads.slice(0, 5).map(l => ({
    id: l.id,
    text: `${l.company_name || 'عميل'} — ${STAGE_AR[l.stage] || l.stage}${l.price_sold ? ' · ' + l.price_sold.toLocaleString('ar') + ' ر.س' : ''}`,
    time: timeAgo(l.updated_at || l.created_at),
    color: STAGE_COLORS[l.stage] || STAGE_COLORS.default,
    icon: l.stage === 'won' ? Target : l.stage === 'lost' ? AlertTriangle : Building2,
  }))

  // ── AI insights (from real data) ──
  const closeRate = leads.filter(l => ['qualified','meeting_booked','demo_done','proposal_sent','negotiation','won','lost'].includes(l.stage)).length
    ? Math.round(wonLeads.length / leads.filter(l => ['qualified','meeting_booked','demo_done','proposal_sent','negotiation','won','lost'].includes(l.stage)).length * 100)
    : 0
  const aiInsights = [
    { text: totalLeads > 0 ? `${totalLeads} عميل إجمالاً · ${wonLeads.length} صفقة مغلقة · نسبة إغلاق ${closeRate}%` : 'لا توجد بيانات بعد — أضف أول عميل من CRM', type: 'info' },
    { text: leadsThisMonth > 0 ? `${leadsThisMonth} عميل جديد هذا الشهر` : 'لم يُضف أي عميل هذا الشهر بعد', type: leadsThisMonth > 0 ? 'success' : 'warning' },
    { text: revenueThis > 0 ? `إيراد ${(revenueThis / 1000).toFixed(1)}K ريال من صفقات هذا الشهر` : 'لا توجد صفقات مغلقة هذا الشهر بعد', type: revenueThis > 0 ? 'success' : 'info' },
  ]

  // ── KPI cards ──
  const kpis = [
    {
      label: 'الإيراد الشهري', value: Math.round(revenueThis / 1000), suffix: revenueThis >= 1000 ? 'K' : '',
      color: '#00BFFF', icon: TrendingUp,
      delta: revChgPct ? `${revChgPct > 0 ? '+' : ''}${revChgPct}%` : '—',
      spark: revenueData.map(d => d.revenue),
    },
    {
      label: 'عملاء محتملون', value: totalLeads, suffix: '',
      color: '#F59E0B', icon: Users2,
      delta: leadChgPct ? `${leadChgPct > 0 ? '+' : ''}${leadChgPct}%` : '—',
      spark: revenueData.map(d => d.leads),
    },
    {
      label: 'صفقات مغلقة', value: wonLeads.length, suffix: '',
      color: '#8B5CF6', icon: Zap,
      delta: `${closeRate}% إغلاق`,
      spark: Array(7).fill(wonLeads.length > 0 ? 1 : 0),
    },
    {
      label: 'هذا الشهر', value: leadsThisMonth, suffix: '',
      color: '#10B981', icon: Building2,
      delta: leadsThisMonth > 0 ? `${leadsThisMonth} جديد` : '—',
      spark: weeklyBar.map(d => d.leads),
    },
  ]

  const statsForCopilot = { totalLeads, wonLeads: wonLeads.length, revenueThis, leadsThisMonth, closeRate }

  // ── 3-month comparison ──
  const threeMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now); d.setMonth(d.getMonth() - (2 - i))
    const key = monthKey(d)
    const monthLeads = leads.filter(l => (l.created_at || '').startsWith(key)).length
    const monthWon   = wonLeads.filter(l => (l.updated_at || '').startsWith(key)).length
    const monthRev   = wonLeads.filter(l => (l.updated_at || '').startsWith(key)).reduce((s, l) => s + (l.price_sold || 0), 0)
    return { month: MONTHS_AR[d.getMonth()], leads: monthLeads, won: monthWon, revenue: Math.round(monthRev / 1000 * 10) / 10 }
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(0,191,255,0.2)', borderTopColor: '#00BFFF', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal' }}>جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

        {/* ── Top bar: AI insight ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: 16,
            background: 'rgba(0,191,255,0.08)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,191,255,0.22)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={13} color="#00BFFF" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={activeInsight}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Tajawal', margin: 0 }}>
                <span style={{ color: aiInsights[activeInsight].type === 'success' ? '#10B981' : aiInsights[activeInsight].type === 'warning' ? '#F59E0B' : '#00BFFF', fontWeight: 700 }}>
                  {aiInsights[activeInsight].type === 'success' ? '✓ ' : aiInsights[activeInsight].type === 'warning' ? '⚠ ' : '◈ '}
                </span>
                {aiInsights[activeInsight].text}
              </motion.p>
            </AnimatePresence>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setCopilotOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              background: copilotOpen ? 'rgba(0,191,255,0.15)' : 'rgba(0,191,255,0.08)',
              border: `1px solid rgba(0,191,255,${copilotOpen ? '0.4' : '0.2'})`,
              color: '#00BFFF', fontSize: 12, fontFamily: 'Cairo', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
            <Brain size={13} />
            AI Copilot
          </motion.button>
        </motion.div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpis.map((kpi, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', damping: 20 }}
              whileHover={{ y: -3, boxShadow: `0 12px 40px ${kpi.color}18` }}
              style={{
                padding: '20px 22px', borderRadius: 18,
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)',
                border: '1px solid rgba(255,255,255,0.14)',
                position: 'relative', overflow: 'hidden', cursor: 'default',
              }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}50, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${kpi.color}14`, border: `1px solid ${kpi.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={15} color={kpi.color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: kpi.delta === '—' ? '#666' : '#10B981', background: kpi.delta === '—' ? 'rgba(255,255,255,0.05)' : 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 20, fontFamily: 'Work Sans' }}>
                  {kpi.delta}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: -0.5, fontFamily: 'Sora', lineHeight: 1.1, marginBottom: 4 }}>
                <AnimatedNumber value={kpi.value} suffix={kpi.suffix} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal', marginBottom: 12 }}>{kpi.label}</div>
              <div style={{ direction: 'ltr' }}>
                <Sparkline data={kpi.spark} color={kpi.color} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Main Charts Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

          {/* Area chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            style={{ padding: '20px 20px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>الإيراد الشهري</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '2px 0 0' }}>آخر 7 أشهر — بالألف ريال (صفقات مغلقة)</p>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#00BFFF', fontFamily: 'Tajawal' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00BFFF', display: 'inline-block' }} />إيراد
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#F59E0B', fontFamily: 'Tajawal' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />عملاء
                </span>
              </div>
            </div>
            {revenueData.every(d => d.revenue === 0 && d.leads === 0) ? (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Tajawal' }}>لا توجد بيانات بعد — أغلق صفقات لترى الرسم البياني</p>
              </div>
            ) : (
              <div dir="ltr" style={{ direction: 'ltr', width: '100%', marginTop: 12 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#00BFFF" strokeWidth={2} fill="rgba(0,191,255,0.1)" isAnimationActive={false} dot={false} />
                    <Area type="monotone" dataKey="leads" name="العملاء" stroke="#F59E0B" strokeWidth={2} fill="rgba(245,158,11,0.08)" isAnimationActive={false} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Donut — sector distribution */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 2px' }}>توزيع القطاعات</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '0 0 8px' }}>من بيانات العملاء الفعلية</p>
            {serviceData.length === 0 ? (
              <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'Tajawal', textAlign: 'center' }}>لا توجد بيانات بعد</p>
              </div>
            ) : (
              <>
                <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={serviceData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                        {serviceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {serviceData.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'Tajawal' }}>{s.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: 'Work Sans' }}>{s.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* ── Bar + Live Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Weekly new leads bar chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 2px' }}>العملاء الجدد يومياً</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '0 0 12px' }}>آخر 7 أيام</p>
            <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={weeklyBar} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="leads" name="عملاء جدد" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Live Activity */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>نشاط مباشر</h3>
              </div>
              <Wifi size={13} color="#10B981" />
            </div>
            {liveItems.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'Tajawal' }}>لا يوجد نشاط بعد</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liveItems.map((item) => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}14`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <item.icon size={12} color={item.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Tajawal', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal', margin: 0 }}>{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Cold Lead Alert ── */}
        <ColdLeadAlert leads={leads} />

        {/* ── 3-Month Comparison ── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 2px' }}>مقارنة الأشهر الثلاثة الأخيرة</h3>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '0 0 16px' }}>العملاء · المغلقة · الإيراد (ألف ريال)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {threeMonths.map((m, i) => (
              <div key={i} style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Cairo', marginBottom: 12 }}>{m.month}</p>
                {[
                  { label: 'عملاء جدد', value: m.leads, color: '#00BFFF' },
                  { label: 'صفقات مغلقة', value: m.won, color: '#10B981' },
                  { label: 'الإيراد (K)', value: m.revenue, color: '#F59E0B' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'Tajawal' }}>{item.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: item.color, fontFamily: 'Sora' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div dir="ltr" style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={threeMonths} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="leads"   name="عملاء"   fill="#00BFFF" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="won"     name="مغلقة"   fill="#10B981" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="revenue" name="إيراد K" fill="#F59E0B" radius={[3,3,0,0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

      {/* ── AI Copilot Panel ── */}
      <AnimatePresence>
        {copilotOpen && <AICopilot stats={statsForCopilot} onClose={() => setCopilotOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
