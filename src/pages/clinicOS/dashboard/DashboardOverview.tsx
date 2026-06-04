import { useState } from 'react'
import { Calendar, Users, CheckCircle, MessageSquare, AlertTriangle, Bot, Phone, TrendingUp, Plus, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge, SourceBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { ActivityFeed } from '../../../components/clinicOS/ui/ActivityFeed'
import { UpgradeCard } from '../../../components/clinicOS/ui/UpgradeCard'
import { AppointmentDrawer } from '../../../components/clinicOS/ui/AppointmentDrawer'
import { DEMO_APPOINTMENTS, DEMO_STATS, WEEKLY_CHART_DATA, DEMO_DOCTORS } from '../../../lib/clinicOSDemoData'
import { useClinicOS } from '../../../context/ClinicOSContext'
import type { Appointment } from '../../../types/clinicOS'

const TODAY = new Date().toISOString().split('T')[0]
const todayAppts = DEMO_APPOINTMENTS.filter(a => a.appointment_date === TODAY)
const needsReview = todayAppts.filter(a => a.status === 'needs_review')

export const DashboardOverview = () => {
  const { userName, packageType } = useClinicOS()
  const isAIPro = packageType === 'ai_pro'
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'صباح الخير'
    if (h < 17) return 'مساء الخير'
    return 'مساء النور'
  }

  const kpis = [
    { icon: Calendar, label: 'مواعيد اليوم', value: DEMO_STATS.today_appointments, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE', trend: { value: '+12%', direction: 'up' as const } },
    { icon: CheckCircle, label: 'مؤكدة', value: DEMO_STATS.confirmed, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0', trend: { value: '+5%', direction: 'up' as const } },
    { icon: Clock, label: 'قيد الانتظار', value: DEMO_STATS.pending, color: '#B45309', bgColor: '#FFFBEB', borderColor: '#FDE68A' },
    { icon: Users, label: 'مرضى جدد هذا الشهر', value: DEMO_STATS.new_patients_month, color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE', trend: { value: '+3', direction: 'up' as const } },
    { icon: MessageSquare, label: 'رسائل واتساب', value: DEMO_STATS.whatsapp_messages, color: '#0369A1', bgColor: '#EFF9FF', borderColor: '#BAE6FD' },
    { icon: AlertTriangle, label: 'تحتاج مراجعة', value: DEMO_STATS.needs_review, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
    ...(isAIPro ? [
      { icon: Bot, label: 'حجوزات ذكية اليوم', value: DEMO_STATS.ai_bookings_today!, color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE', trend: { value: '78%', direction: 'up' as const } },
      { icon: Phone, label: 'مكالمات اليوم', value: DEMO_STATS.calls_handled!, color: '#0369A1', bgColor: '#EFF9FF', borderColor: '#BAE6FD' },
    ] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, direction: 'rtl' }}>
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>
          {greeting()} 👋 {userName || 'مدير العيادة'}
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>هذا ملخص تشغيل العيادة اليوم · {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </motion.div>

      {/* KPI Grid */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {kpis.map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
            <StatCard {...k} />
          </motion.div>
        ))}
      </motion.div>

      {/* Priorities */}
      {needsReview.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ padding: '14px 18px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertTriangle size={18} style={{ color: '#C2410C', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#9A3412', fontFamily: 'Cairo, sans-serif' }}>{needsReview.length} موعد يحتاج مراجعة</span>
            <span style={{ fontSize: 13, color: '#B45309', fontFamily: 'Tajawal, sans-serif', marginRight: 8 }}>— دانة السلمي: تعارض في الجدول مع د. نورة</span>
          </div>
          <button style={{ padding: '6px 14px', borderRadius: 8, background: '#C2410C', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>مراجعة الآن</button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Today's appointments */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>مواعيد اليوم</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{todayAppts.length} موعد</span>
              <button style={{ padding: '5px 12px', borderRadius: 7, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>عرض الكل</button>
            </div>
          </div>
          <div>
            {todayAppts.slice(0, 8).map((appt, i) => (
              <div key={appt.id} onClick={() => setSelectedAppt(appt)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < 7 ? '1px solid #F8FAFC' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: '#4F46E5', minWidth: 42, fontFamily: 'Cairo, sans-serif' }}>{appt.start_time}</span>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E580, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{appt.patient_name.charAt(0)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{appt.patient_name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{appt.service_name} · {appt.doctor_name}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <SourceBadge source={appt.source} />
                  <StatusBadge status={appt.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* AI Status or Upgrade */}
          {isAIPro ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>الحجز الذكي</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>متصل</span>
                </div>
              </div>
              {[
                { label: 'مكالمات اليوم', value: '٣٧' },
                { label: 'حجوزات مكتملة', value: '٢٨' },
                { label: 'نسبة النجاح', value: '٧٨٪' },
                { label: 'تحتاج مراجعة', value: '٥' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{value}</span>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <UpgradeCard compact />
            </motion.div>
          )}

          {/* Weekly chart */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>المواعيد هذا الأسبوع</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={WEEKLY_CHART_DATA} barSize={10}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontFamily: 'Tajawal', fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="appointments" name="مواعيد" fill="#EEF2FF" radius={[4,4,0,0]} />
                <Bar dataKey="completed" name="مكتمل" fill="#4F46E5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Doctor availability */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 12 }}>الأطباء اليوم</div>
            {DEMO_DOCTORS.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E580, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{doc.name.split(' ')[1]?.charAt(0) || 'د'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                </div>
                <StatusBadge status={doc.status || 'available'} size="sm" />
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Activity Feed */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>آخر الأنشطة</div>
        <ActivityFeed />
      </motion.div>

      {selectedAppt && <AppointmentDrawer appointment={selectedAppt} onClose={() => setSelectedAppt(null)} />}
    </div>
  )
}
