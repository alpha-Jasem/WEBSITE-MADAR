import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, DollarSign, Target, Clock,
  Phone, Mail, FileText, CheckCircle2, ChevronLeft,
  Building2, ArrowUpRight, MoreHorizontal, Plus,
} from 'lucide-react'

// ─── Mock data ────────────────────────────────────────────────────────────────

const forecastData = [
  { month: 'مايو',    actual: 89,  forecast: 89 },
  { month: 'يونيو',   actual: 102, forecast: 102 },
  { month: 'يوليو',   actual: 118, forecast: 118 },
  { month: 'أغسطس',   actual: null, forecast: 138 },
  { month: 'سبتمبر',  actual: null, forecast: 155 },
  { month: 'أكتوبر',  actual: null, forecast: 172 },
]

const activityData = [
  { day: 'السبت',    calls: 4, proposals: 2, contracts: 0 },
  { day: 'الأحد',    calls: 7, proposals: 3, contracts: 1 },
  { day: 'الاثنين',  calls: 5, proposals: 4, contracts: 2 },
  { day: 'الثلاثاء', calls: 9, proposals: 2, contracts: 1 },
  { day: 'الأربعاء', calls: 6, proposals: 5, contracts: 3 },
  { day: 'الخميس',   calls: 8, proposals: 3, contracts: 2 },
  { day: 'الجمعة',   calls: 3, proposals: 1, contracts: 0 },
]

type Stage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won'

interface Deal {
  id: string
  company: string
  value: number
  owner: string
  closeDate: string
  probability: number
  stage: Stage
  service: string
}

const initialDeals: Deal[] = [
  { id:'1', company:'شركة النور للتجارة',   value:24000, owner:'أحمد',  closeDate:'2026-06-15', probability:90, stage:'negotiation', service:'واتساب AI' },
  { id:'2', company:'عيادة الرعاية',         value:18000, owner:'سارة',  closeDate:'2026-06-20', probability:70, stage:'proposal',     service:'حجوزات'    },
  { id:'3', company:'مجموعة الخليج',         value:42000, owner:'خالد',  closeDate:'2026-07-01', probability:40, stage:'contacted',    service:'CRM'       },
  { id:'4', company:'شركة ألفا للتقنية',    value:15000, owner:'نورة',  closeDate:'2026-06-10', probability:95, stage:'won',          service:'واتساب AI' },
  { id:'5', company:'مطاعم الذوق الراقي',   value:9500,  owner:'أحمد',  closeDate:'2026-07-10', probability:30, stage:'new',          service:'حجوزات'    },
  { id:'6', company:'شركة البناء الحديث',   value:31000, owner:'سارة',  closeDate:'2026-06-28', probability:60, stage:'proposal',     service:'تقارير'    },
  { id:'7', company:'مركز اللياقة BeFit',   value:12000, owner:'خالد',  closeDate:'2026-07-15', probability:50, stage:'contacted',    service:'CRM'       },
  { id:'8', company:'عيادات الصحة الذهبية', value:28000, owner:'نورة',  closeDate:'2026-06-25', probability:75, stage:'negotiation',  service:'حجوزات'    },
]

const stages: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'new',         label: 'جديد',      color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
  { id: 'contacted',   label: 'تواصل',     color: '#00BFFF', bg: 'rgba(0,191,255,0.1)'  },
  { id: 'proposal',    label: 'عرض',       color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  { id: 'negotiation', label: 'مفاوضة',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  { id: 'won',         label: 'مُغلقة ✓', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
]

const activityLog = [
  { type: 'call',     icon: Phone,       label: 'مكالمة مع شركة النور للتجارة',  time: 'منذ ساعة',    color: '#00BFFF' },
  { type: 'proposal', icon: FileText,    label: 'عرض أُرسل لعيادة الرعاية',       time: 'منذ 3 ساعات',  color: '#8B5CF6' },
  { type: 'contract', icon: CheckCircle2,label: 'عقد وُقّع — شركة ألفا للتقنية', time: 'أمس 11:30',    color: '#10B981' },
  { type: 'email',    icon: Mail,        label: 'إيميل متابعة — مجموعة الخليج',  time: 'أمس 15:00',    color: '#F59E0B' },
  { type: 'call',     icon: Phone,       label: 'مكالمة مقررة — BeFit',           time: 'غداً 10:00',   color: '#00BFFF' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

const GlassCard = ({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) => (
  <div className={className} style={{
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20,
    ...style,
  }}>
    {children}
  </div>
)

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(10,14,28,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 12, fontFamily: 'Tajawal' }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => p.value != null && (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>{p.name}: <strong>{p.value}K</strong></p>
      ))}
    </div>
  )
}

// ─── Kanban ───────────────────────────────────────────────────────────────────

function KanbanBoard({ deals, onMove }: { deals: Deal[]; onMove: (id: string, stage: Stage) => void }) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, overflowX: 'auto' }}>
      {stages.map(stage => {
        const col = deals.filter(d => d.stage === stage.id)
        const total = col.reduce((s, d) => s + d.value, 0)
        const isOver = dragOver === stage.id
        return (
          <div key={stage.id}
            onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => { if (dragging) { onMove(dragging, stage.id); setDragging(null); setDragOver(null) } }}
            style={{
              background: isOver ? stage.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isOver ? stage.color + '40' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 16, padding: 12, minHeight: 320,
              transition: 'all 0.2s',
            }}
          >
            {/* Column header */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: stage.color, fontFamily: 'Cairo' }}>{stage.label}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 7px', borderRadius: 20, fontFamily: 'Work Sans' }}>{col.length}</span>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal' }}>
                {(total / 1000).toFixed(0)}K ريال
              </p>
              <div style={{ height: 2, borderRadius: 1, background: `${stage.color}30`, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${Math.min(col.length * 20, 100)}%`, background: stage.color, borderRadius: 1, transition: 'width 0.5s' }} />
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.map(deal => (
                <motion.div
                  key={deal.id}
                  layout
                  draggable
                  onDragStart={() => setDragging(deal.id)}
                  onDragEnd={() => setDragging(null)}
                  whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.3)` }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: '12px',
                    cursor: 'grab', opacity: dragging === deal.id ? 0.5 : 1,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${stage.color}60, transparent)` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${stage.color}15`, border: `1px solid ${stage.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={12} style={{ color: stage.color }} />
                    </div>
                    <MoreHorizontal size={12} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'white', fontFamily: 'Cairo', marginBottom: 4, lineHeight: 1.4 }}>{deal.company}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal', marginBottom: 8 }}>{deal.service}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: stage.color, fontFamily: 'Work Sans' }}>{(deal.value / 1000).toFixed(0)}K</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal' }}>{deal.closeDate}</span>
                  </div>
                  <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', width: `${deal.probability}%`, background: stage.color, borderRadius: 2, opacity: 0.7 }} />
                  </div>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal', marginTop: 3 }}>احتمالية {deal.probability}%</p>
                </motion.div>
              ))}
              <button style={{
                width: '100%', padding: '8px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'Tajawal', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Plus size={12} /> إضافة
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const AdminPipeline = () => {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [activeTab, setActiveTab] = useState<'kanban' | 'table'>('kanban')

  const moveDeal = (id: string, stage: Stage) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d))
  }

  const totalPipeline = deals.reduce((s, d) => s + d.value * (d.probability / 100), 0)
  const wonDeals = deals.filter(d => d.stage === 'won')
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0)

  const kpis = [
    { label: 'قيمة الـ Pipeline', value: `${(totalPipeline / 1000).toFixed(0)}K`, suffix: 'ريال', color: '#00BFFF', icon: TrendingUp },
    { label: 'صفقات مُغلقة',      value: wonDeals.length,                          suffix: 'صفقة', color: '#10B981', icon: CheckCircle2 },
    { label: 'إيراد محقق',         value: `${(wonValue / 1000).toFixed(0)}K`,       suffix: 'ريال', color: '#F59E0B', icon: DollarSign },
    { label: 'متوسط دورة البيع',   value: '18',                                     suffix: 'يوم',  color: '#8B5CF6', icon: Clock },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', fontFamily: 'Cairo', margin: 0 }}>خط المبيعات</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal', margin: '4px 0 0' }}>
            {deals.length} صفقة نشطة
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 12, background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.25)',
            color: '#00BFFF', fontSize: 13, fontFamily: 'Cairo', fontWeight: 600, cursor: 'pointer',
          }}>
          <Plus size={15} /> صفقة جديدة
        </motion.button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {kpis.map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <GlassCard style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${kpi.color}50, transparent)` }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${kpi.color}15`, border: `1px solid ${kpi.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={14} style={{ color: kpi.color }} />
                </div>
                <ArrowUpRight size={13} style={{ color: '#10B981' }} />
              </div>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'white', fontFamily: 'Sora', margin: 0, letterSpacing: -0.5 }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Tajawal', margin: '4px 0 0' }}>{kpi.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Forecast */}
        <GlassCard style={{ padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>توقعات الإيراد</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '3px 0 0' }}>فعلي + متوقع بناءً على الـ pipeline</p>
          </div>
          <div dir="ltr" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={forecastData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="actual"   name="فعلي"   stroke="#00BFFF" strokeWidth={2} fill="rgba(0,191,255,0.12)"  isAnimationActive={false} dot={false} connectNulls={false} />
                <Area type="monotone" dataKey="forecast" name="متوقع"  stroke="#8B5CF6" strokeWidth={2} fill="rgba(139,92,246,0.1)" strokeDasharray="6 3" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Activity chart */}
        <GlassCard style={{ padding: '20px' }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: 0 }}>نشاط المبيعات</h3>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Tajawal', margin: '3px 0 0' }}>مكالمات • عروض • عقود</p>
          </div>
          <div dir="ltr" style={{ direction: 'ltr' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={activityData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="calls"     name="مكالمات" fill="#00BFFF" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="proposals" name="عروض"    fill="#8B5CF6" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="contracts" name="عقود"    fill="#10B981" radius={[3,3,0,0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
          {[{ id: 'kanban', label: 'Kanban Board' }, { id: 'table', label: 'جدول الصفقات' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '7px 16px', borderRadius: 9, fontSize: 12, fontFamily: 'Cairo', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === tab.id ? 'rgba(0,191,255,0.15)' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(0,191,255,0.3)' : '1px solid transparent',
                color: activeTab === tab.id ? '#00BFFF' : 'rgba(255,255,255,0.4)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal' }}>
          {activeTab === 'kanban' ? 'اسحب الكرت بين الأعمدة للتحديث' : `${deals.length} صفقة`}
        </span>
      </div>

      {/* Kanban / Table */}
      <AnimatePresence mode="wait">
        {activeTab === 'kanban' ? (
          <motion.div key="kanban" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <KanbanBoard deals={deals} onMove={moveDeal} />
          </motion.div>
        ) : (
          <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Tajawal' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      {['الشركة','الخدمة','القيمة','المسؤول','الإغلاق','الاحتمالية','المرحلة'].map(h => (
                        <th key={h} style={{ padding: '14px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textAlign: 'right' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal, i) => {
                      const stage = stages.find(s => s.id === deal.stage)!
                      return (
                        <motion.tr key={deal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: 'white', fontWeight: 600 }}>{deal.company}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{deal.service}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#F59E0B', fontWeight: 700, fontFamily: 'Work Sans' }}>
                            {deal.value.toLocaleString()} ر
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{deal.owner}</td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Work Sans' }}>{deal.closeDate}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 50, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
                                <div style={{ height: '100%', width: `${deal.probability}%`, borderRadius: 2, background: stage.color }} />
                              </div>
                              <span style={{ fontSize: 11, color: stage.color, fontFamily: 'Work Sans' }}>{deal.probability}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: stage.bg, color: stage.color, fontWeight: 600 }}>
                              {stage.label}
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity log */}
      <GlassCard style={{ padding: '20px' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', fontFamily: 'Cairo', margin: '0 0 16px' }}>آخر الأنشطة</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activityLog.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < activityLog.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${item.color}12`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                {i < activityLog.length - 1 && (
                  <div style={{ position: 'absolute', top: 38, right: 16, width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal', margin: 0 }}>{item.label}</p>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal', flexShrink: 0 }}>{item.time}</span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

    </div>
  )
}
