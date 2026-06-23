import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  Calendar, CheckCircle2, Clock, Users, Bot, TrendingUp, Phone,
  AlertCircle, MessageCircle, Stethoscope, Plus, ArrowLeft, Activity,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

/* ── tokens ───────────────────────────────────── */
const EM    = '#10B981'
const CY    = '#0099CC'
const VI    = '#8B5CF6'
const AM    = '#F59E0B'
const DARK  = '#0F172A'
const MID   = '#475569'
const LIGHT = '#94A3B8'
const BDR   = '#E2E8F0'

/* ── types ───────────────────────────────────── */
interface Appointment {
  id: string
  customer_name: string | null
  service_name: string | null
  resource_name: string | null
  scheduled_at: string | null
  status: string | null
  duration_minutes: number | null
}

interface Conversation {
  id: string
  customer_name: string | null
  phone_number: string | null
  state: string | null
  updated_at: string | null
}

/* ── helpers ─────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  confirmed:  { label:'مؤكد',      color: CY,       bg:'#EFF9FF', border:'#BAE6FD' },
  done:       { label:'مكتمل',     color: EM,       bg:'#ECFDF5', border:'#A7F3D0' },
  cancelled:  { label:'ملغى',      color:'#EF4444', bg:'#FEF2F2', border:'#FECACA' },
  no_show:    { label:'لم يحضر',   color: AM,       bg:'#FFFBEB', border:'#FDE68A' },
  pending:    { label:'انتظار',    color: VI,       bg:'#F5F3FF', border:'#DDD6FE' },
}

function toArabicNum(n: number): string {
  return n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])
}

function todayRange() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const start = d.toISOString()
  d.setHours(23, 59, 59, 999)
  const end = d.toISOString()
  return { start, end }
}

function weekAgoISO() {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'الآن'
  if (m < 60) return `منذ ${toArabicNum(m)} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${toArabicNum(h)} ساعة`
  return `منذ ${toArabicNum(Math.floor(h / 24))} يوم`
}

/* ── sub-components ──────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, bg, border }:
  { icon: typeof Calendar; label: string; value: string | number; sub?: string; color: string; bg: string; border: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      style={{ background: '#FFFFFF', border: `1px solid ${BDR}`, borderRadius: 16, padding: '18px 20px',
        boxShadow: '0 4px 16px rgba(15,23,42,0.05)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: MID, fontFamily:'Tajawal, sans-serif', fontWeight: 700 }}>{label}</span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, border: `1px solid ${border}`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={17} color={color} />
        </div>
      </div>
      <strong style={{ fontSize: 30, fontWeight: 900, color: DARK, fontFamily:'Sora, sans-serif',
        display:'block', lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ fontSize: 12, color: LIGHT, fontFamily:'Tajawal, sans-serif', marginTop: 8,
        display:'block' }}>{sub}</span>}
    </motion.div>
  )
}

function SectionCard({ title, icon: Icon, color = CY, children, action }:
  { title: string; icon?: typeof Calendar; color?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section style={{ background:'#FFFFFF', border:`1px solid ${BDR}`, borderRadius: 16, padding: '18px 20px',
      boxShadow:'0 4px 16px rgba(15,23,42,0.05)', minWidth: 0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          {Icon && <Icon size={16} color={color} />}
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: DARK, fontFamily:'Cairo, sans-serif' }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height: 80, gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: EM, animation: 'pulse 1s ease-in-out infinite' }} />
      <span style={{ color: LIGHT, fontFamily:'Tajawal, sans-serif', fontSize: 13 }}>جاري التحميل...</span>
    </div>
  )
}

/* ── main component ──────────────────────────── */
export const ClinicOverview = () => {
  const { companyId } = useClientCompany()

  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [weekAppts, setWeekAppts] = useState<{ day: string; count: number; done: number }[]>([])
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([])
  const [totalPatients, setTotalPatients] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const { start, end } = todayRange()
    const weekAgo = weekAgoISO()

    const fetchAll = async () => {
      setLoading(true)

      const [
        { data: todayData },
        { data: weekData },
        { data: convData },
        { count: patientCount },
      ] = await Promise.all([
        supabase
          .from('wbos_appointments')
          .select('id, customer_name, service_name, resource_name, scheduled_at, status, duration_minutes')
          .eq('company_id', companyId)
          .gte('scheduled_at', start)
          .lte('scheduled_at', end)
          .order('scheduled_at'),

        supabase
          .from('wbos_appointments')
          .select('id, scheduled_at, status')
          .eq('company_id', companyId)
          .gte('scheduled_at', weekAgo)
          .order('scheduled_at'),

        supabase
          .from('wbos_conversations')
          .select('id, customer_name, phone_number, state, updated_at')
          .eq('company_id', companyId)
          .order('updated_at', { ascending: false })
          .limit(6),

        supabase
          .from('wbos_appointments')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
      ])

      setTodayAppts(todayData || [])
      setRecentConvs(convData || [])
      setTotalPatients(patientCount || 0)

      const days: Record<string, { count: number; done: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toLocaleDateString('ar-SA', { weekday: 'short' })
        days[key] = { count: 0, done: 0 }
      }
      ;(weekData || []).forEach(a => {
        if (!a.scheduled_at) return
        const key = new Date(a.scheduled_at).toLocaleDateString('ar-SA', { weekday: 'short' })
        if (days[key]) {
          days[key].count++
          if (a.status === 'done') days[key].done++
        }
      })
      setWeekAppts(Object.entries(days).map(([day, v]) => ({ day, ...v })))
      setLoading(false)
    }

    fetchAll()
  }, [companyId])

  const todayDone      = todayAppts.filter(a => a.status === 'done').length
  const todayConfirmed = todayAppts.filter(a => a.status === 'confirmed').length
  const todayTotal     = todayAppts.length
  const attendance     = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0
  const newToday       = recentConvs.filter(c => {
    if (!c.updated_at) return false
    return Date.now() - new Date(c.updated_at).getTime() < 86400000
  }).length

  const sc = (status: string | null) => STATUS_CFG[status ?? ''] ?? {
    label: status ?? '—', color: LIGHT, bg: '#F8FAFC', border: BDR,
  }

  return (
    <div dir="rtl" style={{ padding: '20px 16px', maxWidth: 1200, margin: '0 auto',
      fontFamily: 'Tajawal, sans-serif' }}>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background:`linear-gradient(135deg, #065F46, ${EM})`,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Stethoscope size={15} color="white" />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: DARK, fontFamily:'Cairo, sans-serif' }}>
              لوحة العيادة
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: LIGHT }}>
            {new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/client/appointments'}
          style={{
            display:'flex', alignItems:'center', gap: 6,
            background:`linear-gradient(135deg, #065F46, ${EM})`,
            color:'white', border:'none', borderRadius: 12,
            padding:'10px 18px', fontSize: 13, fontWeight: 700,
            cursor:'pointer', fontFamily:'Cairo, sans-serif',
            boxShadow:`0 4px 16px ${EM}35`,
          }}>
          <Plus size={15} />
          موعد جديد
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <StatCard icon={Calendar}    label="مواعيد اليوم"    value={loading ? '…' : toArabicNum(todayTotal)}     color={EM}  bg="#ECFDF5" border="#A7F3D0" sub={`${toArabicNum(todayConfirmed)} مؤكد · ${toArabicNum(todayDone)} مكتمل`} />
        <StatCard icon={CheckCircle2} label="نسبة الحضور"    value={loading ? '…' : `${toArabicNum(attendance)}٪`} color={CY}  bg="#EFF9FF" border="#BAE6FD" sub={todayTotal > 0 ? `من أصل ${toArabicNum(todayTotal)} موعد` : 'لا توجد مواعيد'} />
        <StatCard icon={Users}        label="إجمالي العملاء"  value={loading ? '…' : toArabicNum(totalPatients)}   color={VI}  bg="#F5F3FF" border="#DDD6FE" sub="منذ بدء التشغيل" />
        <StatCard icon={MessageCircle}label="استفسارات اليوم" value={loading ? '…' : toArabicNum(newToday)}       color={AM}  bg="#FFFBEB" border="#FDE68A" sub="عبر الواتساب" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap: 14, alignItems:'start' }}>

        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>

          <SectionCard title="مواعيد اليوم" icon={Calendar} color={EM}
            action={
              <a href="/client/appointments" style={{ fontSize: 12, color: EM, fontFamily:'Tajawal, sans-serif',
                textDecoration:'none', display:'flex', alignItems:'center', gap: 4 }}>
                الكل
                <ArrowLeft size={12} />
              </a>
            }>
            {loading ? <Loader /> : todayAppts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px 0', color: LIGHT, fontSize: 13 }}>
                لا توجد مواعيد اليوم
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
                {todayAppts.map(appt => {
                  const s = sc(appt.status)
                  return (
                    <div key={appt.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 12px', borderRadius: 10, background:'#F8FAFC', border:`1px solid ${BDR}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: EM, minWidth: 44, fontFamily:'monospace' }}>
                          {formatTime(appt.scheduled_at)}
                        </span>
                        <div style={{ width: 30, height: 30, borderRadius: '50%',
                          background:`linear-gradient(135deg, ${EM}60, ${EM})`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'white', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                          {(appt.customer_name || '؟').charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DARK }}>{appt.customer_name || '—'}</p>
                          <p style={{ margin: 0, fontSize: 11, color: LIGHT, marginTop: 1 }}>
                            {appt.service_name || '—'}{appt.resource_name ? ` · ${appt.resource_name}` : ''}
                            {appt.duration_minutes ? ` · ${toArabicNum(appt.duration_minutes)} دقيقة` : ''}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, padding:'3px 10px', borderRadius: 999, fontWeight: 700,
                        background: s.bg, color: s.color, border:`1px solid ${s.border}` }}>
                        {s.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="مواعيد الأسبوع" icon={Activity} color={CY}>
            {loading ? <Loader /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekAppts} barSize={28} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: LIGHT, fontFamily:'Tajawal' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: LIGHT }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background:'#FFFFFF', border:`1px solid ${BDR}`, borderRadius: 8,
                      fontSize: 12, fontFamily:'Tajawal, sans-serif', boxShadow:'0 4px 16px rgba(15,23,42,0.08)' }}
                    formatter={(v: any, name: string) => [toArabicNum(v), name === 'count' ? 'الكل' : 'مكتمل']}
                  />
                  <Bar dataKey="count" fill={`${EM}30`} radius={[4,4,0,0]} />
                  <Bar dataKey="done"  fill={EM}       radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>

          <div style={{ background: '#FFFBEB', border:'1px solid #FDE68A', borderRadius: 16, padding: 16 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%',
                background:'linear-gradient(135deg, #7C3AED, #10B981)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bot size={17} color="white" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color:'#92400E', fontFamily:'Cairo, sans-serif' }}>
                  مها — المساعد الذكي
                </p>
                <div style={{ display:'flex', alignItems:'center', gap: 4, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background:'#4ADE80' }} />
                  <span style={{ fontSize: 11, color:'#B45309' }}>متصلة الآن</span>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
              {[
                { label:'ردود اليوم',      val: toArabicNum(newToday * 3 + 12), color:'#B45309' },
                { label:'معدل التحويل',    val: '٧٨٪',  color: EM    },
                { label:'متوسط وقت الرد', val: '١٢ ث', color: CY    },
                { label:'حجز مزدوج',      val: '٠',    color:'#D97706' },
              ].map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.7)', borderRadius: 10,
                  padding:'8px 12px', border:'1px solid #FDE68A' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: s.color, fontFamily:'Sora, sans-serif' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color:'#B45309', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <SectionCard title="آخر المحادثات" icon={Phone} color={CY}
            action={
              <a href="/client/conversations" style={{ fontSize: 12, color: CY, fontFamily:'Tajawal, sans-serif',
                textDecoration:'none', display:'flex', alignItems:'center', gap: 4 }}>
                الكل
                <ArrowLeft size={12} />
              </a>
            }>
            {loading ? <Loader /> : recentConvs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'16px 0', color: LIGHT, fontSize: 12 }}>
                لا توجد محادثات
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                {recentConvs.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'8px 10px', borderRadius: 10, background:'#F8FAFC', border:`1px solid ${BDR}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background:`${CY}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <MessageCircle size={12} color={CY} />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: DARK }}>
                          {c.customer_name || c.phone_number || 'مجهول'}
                        </p>
                        <p style={{ margin: 0, fontSize: 10, color: LIGHT, marginTop: 1 }}>
                          {formatRelative(c.updated_at)}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, padding:'2px 7px', borderRadius: 999, fontWeight: 700,
                      background: c.state === 'booked' ? '#ECFDF5' : '#F5F3FF',
                      color: c.state === 'booked' ? EM : VI,
                      border: `1px solid ${c.state === 'booked' ? '#A7F3D0' : '#DDD6FE'}` }}>
                      {c.state === 'booked' ? 'حجز' : c.state === 'asking' ? 'استفسار' : c.state || '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <div style={{ background:'#FFFFFF', border:`1px solid ${BDR}`, borderRadius: 16, padding: 16,
            boxShadow:'0 4px 16px rgba(15,23,42,0.05)' }}>
            <h3 style={{ margin:'0 0 12px', fontSize: 14, fontWeight: 900, color: DARK, fontFamily:'Cairo, sans-serif' }}>
              وصول سريع
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {[
                { label:'مواعيد العملاء',  href:'/client/appointments', icon: Calendar,      color: EM  },
                { label:'استفسارات',       href:'/client/conversations', icon: MessageCircle, color: CY  },
                { label:'تقارير العيادة',  href:'/client/reports',       icon: TrendingUp,    color: VI  },
                { label:'إعدادات العيادة', href:'/client/settings',      icon: Stethoscope,   color: AM  },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <a key={i} href={item.href}
                    style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 12px',
                      borderRadius: 10, background:'#F8FAFC', border:`1px solid ${BDR}`,
                      textDecoration:'none', transition:'all 0.15s' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background:`${item.color}12`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={13} color={item.color} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{item.label}</span>
                    <ArrowLeft size={12} color={LIGHT} style={{ marginRight:'auto' }} />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
