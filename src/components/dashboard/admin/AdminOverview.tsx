import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Building2, Zap, Users2, TrendingUp, ArrowUpRight,
  AlertTriangle, Activity, Brain, Sparkles, Play,
  ChevronRight, Send, X, Maximize2, Video,
  Target, MessageSquare, BarChart2, Wifi,
} from 'lucide-react'
import { Player } from '@remotion/player'
import { WeeklyReport } from './remotion/WeeklyReport'
import { fetchAdminStats, fetchCompanies, fetchLogs } from '../../../lib/supabase'
import { mockAdminStats, mockCompanies, mockLogs } from '../../../lib/mockData'
import type { DashboardStats, Company, Log } from '../../../types'

// ─── Data ────────────────────────────────────────────────────────────────────

const revenueData = [
  { month: 'يناير', revenue: 42, leads: 180 },
  { month: 'فبراير', revenue: 58, leads: 220 },
  { month: 'مارس',  revenue: 51, leads: 190 },
  { month: 'أبريل', revenue: 74, leads: 310 },
  { month: 'مايو',  revenue: 89, leads: 420 },
  { month: 'يونيو', revenue: 102, leads: 380 },
  { month: 'يوليو', revenue: 118, leads: 460 },
]

const serviceData = [
  { name: 'واتساب AI', value: 38, color: '#00BFFF' },
  { name: 'حجوزات',    value: 27, color: '#F59E0B' },
  { name: 'CRM',        value: 20, color: '#8B5CF6' },
  { name: 'تقارير',     value: 15, color: '#10B981' },
]

const weeklyBar = [
  { day: 'السبت',    msgs: 320 },
  { day: 'الأحد',    msgs: 480 },
  { day: 'الاثنين',  msgs: 560 },
  { day: 'الثلاثاء', msgs: 390 },
  { day: 'الأربعاء', msgs: 720 },
  { day: 'الخميس',   msgs: 640 },
  { day: 'الجمعة',   msgs: 310 },
]

const predictions = [
  { label: 'الإيراد المتوقع — أغسطس', value: '145K ريال', prob: 87, color: '#00BFFF', icon: TrendingUp },
  { label: 'عملاء جدد متوقعون',        value: '520 عميل', prob: 74, color: '#F59E0B', icon: Users2 },
  { label: 'نمو رسائل واتساب',          value: '+34%',     prob: 91, color: '#10B981', icon: MessageSquare },
]

const aiInsights = [
  { text: 'إيراد يوليو ارتفع 16% عن يونيو — أعلى أداء منذ التأسيس', type: 'success' },
  { text: 'شركة Alpha Corp لم تفتح تقاريرها منذ 12 يوم — تواصل معها', type: 'warning' },
  { text: 'خدمة CRM بنسبة 20% فقط — فرصة توسع كبيرة', type: 'info' },
]

const liveActivity = [
  { id: 1, text: 'عميل جديد — شركة النور للتجارة', time: 'الآن',   color: '#10B981', icon: Building2 },
  { id: 2, text: 'أتمتة واتساب نفّذت 48 رسالة',      time: 'دقيقتان', color: '#00BFFF', icon: Zap },
  { id: 3, text: 'تقرير أسبوعي جُهِّز تلقائياً',     time: '5 دقائق', color: '#F59E0B', icon: BarChart2 },
  { id: 4, text: 'تنبيه: استخدام API قارب الحد',      time: '8 دقائق', color: '#F43F5E', icon: AlertTriangle },
  { id: 5, text: 'حجز جديد — عيادة الرعاية',          time: '12 دق',   color: '#8B5CF6', icon: Target },
]

const aiMessages = [
  'الإيراد في تصاعد مستمر — نمو 16% شهرياً 📈',
  'أنصح بزيادة ميزانية واتساب AI بسبب أعلى ROI',
  'شركة Alpha Corp بحاجة متابعة فورية',
  'أفضل وقت للتواصل مع العملاء: الأربعاء 10-12 ص',
]

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const end = value
    const duration = 1200
    const step = (end / duration) * 16
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplay(end); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [value])
  return <>{display.toLocaleString('en')}{suffix}</>
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
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

function AICopilot({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'مرحباً! أنا مساعدك الذكي. سألتُ الأرقام — هذا الأسبوع استثنائي 🚀' },
    { role: 'ai', text: aiMessages[0] },
  ])
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      const reply = aiMessages[Math.floor(Math.random() * aiMessages.length)]
      setMessages(m => [...m, { role: 'ai', text: reply }])
      setTyping(false)
    }, 1400)
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

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
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="#00BFFF" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo' }}>AI Copilot</div>
            <div style={{ fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              مباشر
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{
              alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: m.role === 'ai' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: m.role === 'ai' ? 'rgba(0,191,255,0.08)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${m.role === 'ai' ? 'rgba(0,191,255,0.15)' : 'rgba(245,158,11,0.2)'}`,
              fontSize: 13, color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Tajawal', lineHeight: 1.6, direction: 'rtl',
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
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="اسأل عن أي شيء..."
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

// ─── Remotion Modal ───────────────────────────────────────────────────────────

function VideoModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 800, background: 'rgba(6,8,20,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderRadius: 24, border: '1px solid rgba(0,191,255,0.2)', overflow: 'hidden', boxShadow: '0 0 80px rgba(0,191,255,0.12), 0 40px 120px rgba(0,0,0,0.7)' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Video size={16} color="#F59E0B" />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: 'Cairo' }}>التقرير الأسبوعي — Remotion</span>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24 }}>
          <Player
            component={WeeklyReport}
            inputProps={{ data }}
            durationInFrames={150}
            compositionWidth={720}
            compositionHeight={405}
            fps={30}
            style={{ width: '100%', borderRadius: 16, overflow: 'hidden' }}
            controls
            autoPlay
          />
          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12, fontFamily: 'Tajawal' }}>
            تم التوليد تلقائياً بواسطة Madar AI — يمكن تصدير الفيديو بجودة 4K
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminOverview = () => {
  const [stats, setStats] = useState<DashboardStats>(mockAdminStats)
  const [companies, setCompanies] = useState<Company[]>(mockCompanies)
  const [logs, setLogs] = useState<Log[]>(mockLogs)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [activeInsight, setActiveInsight] = useState(0)
  const [liveItems, setLiveItems] = useState(liveActivity.slice(0, 3))

  useEffect(() => {
    fetchAdminStats().then(d => { if (d) setStats(d) })
    fetchCompanies().then(d => { if (d.length) setCompanies(d) })
    fetchLogs(20).then(d => { if (d.length) setLogs(d) })
  }, [])

  // rotate AI insights
  useEffect(() => {
    const t = setInterval(() => setActiveInsight(i => (i + 1) % aiInsights.length), 4000)
    return () => clearInterval(t)
  }, [])

  // simulate live activity
  useEffect(() => {
    const t = setInterval(() => {
      const next = liveActivity[Math.floor(Math.random() * liveActivity.length)]
      setLiveItems(prev => [{ ...next, id: Date.now() }, ...prev].slice(0, 5))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const kpis = [
    { label: 'الإيراد الشهري', value: stats.total_revenue ?? 142, suffix: 'K', color: '#00BFFF', icon: TrendingUp, delta: '+34%', spark: [42, 58, 51, 74, 89, 102, 118] },
    { label: 'عملاء محتملون',  value: stats.total_leads ?? 1840,  suffix: '',  color: '#F59E0B', icon: Users2,    delta: '+18%', spark: [120, 180, 160, 240, 310, 280, 350] },
    { label: 'أنظمة أتمتة',    value: stats.active_automations ?? 67, suffix: '', color: '#8B5CF6', icon: Zap, delta: '+8%',  spark: [40, 45, 50, 55, 58, 63, 67] },
    { label: 'إجمالي الشركات', value: stats.total_companies ?? 24, suffix: '',  color: '#10B981', icon: Building2, delta: '+12%', spark: [10, 13, 15, 17, 19, 21, 24] },
  ]

  const videoData = {
    revenue: stats.total_revenue ?? 142,
    leads: stats.total_leads ?? 1840,
    automations: stats.active_automations ?? 67,
    companies: stats.total_companies ?? 24,
    growth: 34,
    topService: 'واتساب AI',
    weeklyMsgs: 3420,
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

        {/* ── Top bar: AI insight + actions ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: 16,
            background: 'rgba(0,191,255,0.08)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
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
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setVideoOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                color: '#F59E0B', fontSize: 12, fontFamily: 'Cairo', fontWeight: 600, cursor: 'pointer',
              }}>
              <Video size={13} />
              تقرير أسبوعي
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setCopilotOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 10,
                background: copilotOpen ? 'rgba(0,191,255,0.15)' : 'rgba(0,191,255,0.08)',
                border: `1px solid rgba(0,191,255,${copilotOpen ? '0.4' : '0.2'})`,
                color: '#00BFFF', fontSize: 12, fontFamily: 'Cairo', fontWeight: 600, cursor: 'pointer',
              }}>
              <Brain size={13} />
              AI Copilot
            </motion.button>
          </div>
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
                background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)',
                position: 'relative', overflow: 'hidden', cursor: 'default',
              }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}50, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${kpi.color}14`, border: `1px solid ${kpi.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={15} color={kpi.color} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 20, fontFamily: 'Work Sans' }}>
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
            style={{ padding: '20px 20px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.4), transparent)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>الإيراد الشهري</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '2px 0 0' }}>آخر 7 أشهر — بالألف ريال</p>
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
            <div dir="ltr" style={{ direction: 'ltr', width: '100%', marginTop: 12 }}>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#00BFFF" strokeWidth={2} fill="rgba(0,191,255,0.1)" isAnimationActive={false} dot={false} />
                  <Area type="monotone" dataKey="leads"   name="العملاء" stroke="#F59E0B" strokeWidth={2} fill="rgba(245,158,11,0.08)" isAnimationActive={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Donut */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.4), transparent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 2px' }}>توزيع الخدمات</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '0 0 8px' }}>نسبة الاستخدام</p>
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
          </motion.div>
        </div>

        {/* ── Bar + Predictions + Live ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

          {/* Bar chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 2px' }}>الرسائل الأسبوعية</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '0 0 12px' }}>آخر 7 أيام</p>
            <div dir="ltr" style={{ direction: 'ltr', width: '100%' }}>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={weeklyBar} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="msgs" name="الرسائل" fill="#8B5CF6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI Predictions */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Brain size={14} color="#10B981" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>توقعات AI</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {predictions.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal' }}>{p.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.color, fontFamily: 'Work Sans' }}>{p.value}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.prob}%` }}
                      transition={{ delay: 0.7 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', borderRadius: 999, background: p.color }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal', marginTop: 3 }}>احتمالية {p.prob}%</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Live Activity */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            style={{ padding: '20px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.4), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>نشاط مباشر</h3>
              </div>
              <Wifi size={13} color="#10B981" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence>
                {liveItems.map((item) => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
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
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

      </div>

      {/* ── AI Copilot Panel ── */}
      <AnimatePresence>
        {copilotOpen && <AICopilot onClose={() => setCopilotOpen(false)} />}
      </AnimatePresence>

      {/* ── Video Modal ── */}
      <AnimatePresence>
        {videoOpen && <VideoModal data={videoData} onClose={() => setVideoOpen(false)} />}
      </AnimatePresence>
    </>
  )
}
