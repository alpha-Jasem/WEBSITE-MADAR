import { useState } from 'react'
import { Phone, CheckCircle, AlertCircle, XCircle, TrendingUp, Clock, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { UpgradeCard } from '../../../components/clinicOS/ui/UpgradeCard'
import { EmptyState } from '../../../components/clinicOS/ui/EmptyState'
import { useClinicAICalls, updateAICallStatus } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useToast } from '../../../lib/useToast'
import { notifyAICallReviewed } from '../../../lib/clinicN8n'
import type { AICallLog } from '../../../types/clinicOS'

const HOURLY_DATA = [
  { h: '8ص', calls: 4, booked: 3 }, { h: '9ص', calls: 6, booked: 5 }, { h: '10ص', calls: 5, booked: 4 },
  { h: '11ص', calls: 3, booked: 2 }, { h: '12ظ', calls: 2, booked: 1 }, { h: '1م', calls: 4, booked: 3 },
  { h: '2م', calls: 5, booked: 4 }, { h: '3م', calls: 4, booked: 3 }, { h: '4م', calls: 4, booked: 3 },
]

const FAILURE_REASONS = [
  { reason: 'قطع المتصل المكالمة', count: 8 },
  { reason: 'لا توقيت متاح', count: 6 },
  { reason: 'طلب غير واضح', count: 4 },
  { reason: 'تحويل إلى موظف', count: 3 },
]

const TABS = ['نظرة عامة', 'المكالمات', 'المحادثات', 'تحتاج مراجعة', 'الإعدادات']

export const AIBooking = () => {
  const { packageType, companyId, clinicName, isDemo } = useClinicOS()
  const { showToast } = useToast()
  const { data: DEMO_AI_CALLS = [], refetch } = useClinicAICalls(companyId, isDemo)
  const [activeTab, setActiveTab] = useState(0)
  const [selectedCall, setSelectedCall] = useState<AICallLog | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleReviewAction = async (call: AICallLog, action: 'confirmed' | 'rejected') => {
    if (isDemo) {
      showToast(action === 'confirmed' ? 'تم تأكيد الحجز' : 'تم رفض الطلب', action === 'confirmed' ? 'success' : 'warning')
      return
    }
    setProcessingId(call.id)
    try {
      await updateAICallStatus(call.id, action)
      notifyAICallReviewed(call.phone, action, clinicName || 'العيادة', companyId || '')
      showToast(action === 'confirmed' ? 'تم تأكيد الحجز وإشعار المريض' : 'تم رفض الطلب', action === 'confirmed' ? 'success' : 'warning')
      refetch()
    } catch {
      showToast('حدث خطأ، حاول مرة أخرى', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, '')
    window.open('https://wa.me/966' + clean.replace(/^0/, ''), '_blank', 'noopener,noreferrer')
  }

  if (packageType !== 'ai_pro') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl', maxWidth: 600, margin: '40px auto' }}>
        <UpgradeCard
          title="الحجز الذكي 24/7"
          subtitle="استقبل حجوزات المرضى على مدار الساعة. نظام ذكي يستقبل المكالمات، يتحقق من الجدول، يحجز الموعد، ويرسل تأكيد واتساب تلقائياً."
        />
      </div>
    )
  }

  const needsReviewCalls = DEMO_AI_CALLS.filter(c => c.needs_review)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الحجز الذكي</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>متابعة طلبات الحجز الصوتية والنتائج والحالات التي تحتاج مراجعة</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>النظام متصل</span>
          <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>آخر طلب: ٥ دقائق</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          { icon: Phone, label: 'مكالمات اليوم', value: 37, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: CheckCircle, label: 'حجوزات مكتملة', value: 28, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0', trend: { value: '78%', direction: 'up' as const } },
          { icon: TrendingUp, label: 'نسبة النجاح', value: '78%', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
          { icon: AlertCircle, label: 'تحتاج مراجعة', value: 5, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
          { icon: XCircle, label: 'مكالمات فاشلة', value: 4, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: Clock, label: 'متوسط المكالمة', value: '١:٤٢', color: '#0369A1', bgColor: '#EFF9FF', borderColor: '#BAE6FD', subtitle: 'دقيقة:ثانية' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === i ? 800 : 500, color: activeTab === i ? '#4F46E5' : '#64748B', fontFamily: 'Cairo, sans-serif', borderBottom: `2px solid ${activeTab === i ? '#4F46E5' : 'transparent'}`, marginBottom: -1, position: 'relative' }}>
            {t}
            {t === 'تحتاج مراجعة' && needsReviewCalls.length > 0 && <span style={{ position: 'absolute', top: 6, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{needsReviewCalls.length}</span>}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>المكالمات بالساعة</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={HOURLY_DATA} barSize={12}>
                <XAxis dataKey="h" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'Tajawal' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontFamily: 'Tajawal', fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="calls" name="مكالمات" fill="#EEF2FF" radius={[4,4,0,0]} />
                <Bar dataKey="booked" name="حجوزات" fill="#4F46E5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '18px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>أسباب الفشل</div>
            {FAILURE_REASONS.map(r => (
              <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', marginBottom: 4 }}>{r.reason}</div>
                  <div style={{ height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#4F46E5', borderRadius: 3, width: `${(r.count / 10) * 100}%` }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', minWidth: 20 }}>{r.count}</span>
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Calls tab */}
      {activeTab === 1 && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['الوقت', 'الجوال', 'المريض', 'الطلب', 'النتيجة', 'المدة', 'الحالة'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_AI_CALLS.map((call, i) => (
                <tr key={call.id} onClick={() => setSelectedCall(call)} style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{new Date(call.call_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{call.phone}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#0F172A', fontWeight: 600, fontFamily: 'Cairo, sans-serif' }}>{call.patient_name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{call.service_requested || 'غير محدد'}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={call.result} size="sm" /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={call.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Needs review tab */}
      {activeTab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {needsReviewCalls.length === 0 ? (
            <EmptyState icon={CheckCircle} title="لا توجد حالات تحتاج مراجعة" body="النظام الذكي معالج كل الطلبات بنجاح." />
          ) : needsReviewCalls.map((call, i) => (
            <motion.div key={call.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #FED7AA', padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <AlertCircle size={15} style={{ color: '#C2410C' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{call.patient_name || call.phone}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#9A3412', fontFamily: 'Tajawal, sans-serif', margin: '0 0 8px 0' }}>{call.review_reason}</p>
                  {call.summary && <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>{call.summary}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button disabled={processingId === call.id} onClick={() => handleReviewAction(call, 'confirmed')} style={{ padding: '7px 14px', borderRadius: 8, background: processingId === call.id ? '#F1F5F9' : '#ECFDF5', color: processingId === call.id ? '#94A3B8' : '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: processingId === call.id ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>تأكيد</button>
                  <button onClick={() => handleWhatsApp(call.phone)} style={{ padding: '7px 14px', borderRadius: 8, background: '#EFF9FF', color: '#0369A1', border: '1px solid #BAE6FD', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>واتساب</button>
                  <button disabled={processingId === call.id} onClick={() => handleReviewAction(call, 'rejected')} style={{ padding: '7px 14px', borderRadius: 8, background: processingId === call.id ? '#F1F5F9' : '#FEF2F2', color: processingId === call.id ? '#94A3B8' : '#DC2626', border: '1px solid #FECACA', fontSize: 12, fontWeight: 700, cursor: processingId === call.id ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>رفض</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 4 && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'اسم المساعد', type: 'text', value: 'المساعد الذكي' },
              { label: 'رسالة الترحيب', type: 'text', value: 'أهلاً وسهلاً، عيادات نور للأسنان، كيف أساعدك؟' },
              { label: 'اللغة', type: 'select', options: ['العربية', 'الإنجليزية'] },
              { label: 'نبرة المساعد', type: 'select', options: ['احترافي', 'ودود', 'رسمي'] },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}>
                    {f.options?.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input defaultValue={f.value} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                )}
              </div>
            ))}
          </div>
          <button onClick={() => showToast('تم حفظ إعدادات المساعد الذكي', 'success')} style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>حفظ الإعدادات</button>
        </div>
      )}

      {/* Call detail drawer */}
      {selectedCall && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', direction: 'rtl' }}>
          <div onClick={() => setSelectedCall(null)} style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} />
          <div style={{ width: 420, background: '#FFFFFF', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تفاصيل المكالمة</h2>
              <button onClick={() => setSelectedCall(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748B' }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <StatusBadge status={selectedCall.status} />
              <p style={{ fontSize: 14, color: '#334155', fontFamily: 'Tajawal, sans-serif', marginTop: 8 }}>{selectedCall.phone} · {new Date(selectedCall.call_time).toLocaleTimeString('ar-SA')}</p>
              {selectedCall.summary && <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: 8, marginTop: 8 }}>
                <p style={{ fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.7 }}>{selectedCall.summary}</p>
              </div>}
            </div>
            {selectedCall.transcript && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', marginBottom: 12 }}>نص المحادثة</div>
                {selectedCall.transcript.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, flexDirection: line.speaker === 'agent' ? 'row' : 'row-reverse' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: line.speaker === 'agent' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MessageSquare size={12} style={{ color: line.speaker === 'agent' ? 'white' : '#64748B' }} />
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 10, background: line.speaker === 'agent' ? '#EEF2FF' : '#F8FAFC', maxWidth: '80%' }}>
                      <p style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.6 }}>{line.text}</p>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{line.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
