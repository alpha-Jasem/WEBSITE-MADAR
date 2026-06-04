import { useState } from 'react'
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { StatusBadge } from '../../../components/clinicOS/ui/StatusBadge'
import { EmptyState } from '../../../components/clinicOS/ui/EmptyState'
import { DEMO_MESSAGES } from '../../../lib/clinicOSDemoData'

const TABS = ['صندوق الوارد', 'المجدولة', 'القوالب', 'الفاشلة', 'السجل']

const TEMPLATES = [
  { id: 't1', name: 'تأكيد الموعد', body: 'تم تأكيد موعدك في [اسم العيادة] يوم [التاريخ] الساعة [الوقت]. نتطلع لاستقبالك! 😊' },
  { id: 't2', name: 'تذكير 24 ساعة', body: 'نذكرك بموعدك غداً في [اسم العيادة] الساعة [الوقت]. هل تريد التأكيد؟' },
  { id: 't3', name: 'تذكير 3 ساعات', body: 'تذكير: موعدك اليوم الساعة [الوقت] في [اسم العيادة] بعد 3 ساعات.' },
  { id: 't4', name: 'إلغاء الموعد', body: 'تم إلغاء موعدك في [اسم العيادة] بنجاح. لحجز موعد جديد تواصل معنا.' },
  { id: 't5', name: 'إعادة جدولة', body: 'تم تعديل موعدك إلى [التاريخ] الساعة [الوقت] في [اسم العيادة].' },
  { id: 't6', name: 'طلب تقييم', body: 'شكراً لزيارتك [اسم العيادة] 😊 نسعد بتقييم تجربتك معنا: [رابط]' },
  { id: 't7', name: 'عرض قائمة انتظار', body: 'مرحباً، يوجد موعد متاح الساعة [الوقت]، هل ترغب بالحجز؟' },
]

const SCHEDULED = [
  { id: 's1', patient: 'عبدالعزيز الفهد', type: 'تذكير 24 ساعة', time: 'غداً 07:00', status: 'pending' as const },
  { id: 's2', patient: 'رنا الشهري', type: 'تذكير 3 ساعات', time: 'اليوم 15:40', status: 'pending' as const },
  { id: 's3', patient: 'سلمى البقمي', type: 'تذكير 24 ساعة', time: 'غداً 07:00', status: 'pending' as const },
  { id: 's4', patient: 'يوسف العتيبي', type: 'متابعة', time: 'بعد غد 10:00', status: 'pending' as const },
]

export const Messages = () => {
  const [activeTab, setActiveTab] = useState(0)
  const failed = DEMO_MESSAGES.filter(m => m.status === 'failed')

  const stats = {
    sent: DEMO_MESSAGES.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
    scheduled: SCHEDULED.length,
    pending: DEMO_MESSAGES.filter(m => m.status === 'pending').length,
    failed: failed.length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الرسائل</h1>
        <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة رسائل واتساب والتأكيدات والتذكيرات</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { icon: CheckCircle, label: 'تم الإرسال', value: stats.sent, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Clock, label: 'مجدولة', value: stats.scheduled, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: MessageSquare, label: 'معلقة', value: stats.pending, color: '#B45309', bgColor: '#FFFBEB', borderColor: '#FDE68A' },
          { icon: AlertCircle, label: 'فاشلة', value: stats.failed, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: MessageSquare, label: 'ردود مستلمة', value: 7, color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E2E8F0' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === i ? 800 : 500, color: activeTab === i ? '#4F46E5' : '#64748B', fontFamily: 'Cairo, sans-serif', borderBottom: `2px solid ${activeTab === i ? '#4F46E5' : 'transparent'}`, marginBottom: -1, position: 'relative' }}>
            {t}
            {t === 'الفاشلة' && stats.failed > 0 && <span style={{ position: 'absolute', top: 6, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{stats.failed}</span>}
          </button>
        ))}
      </div>

      {/* Inbox */}
      {activeTab === 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {DEMO_MESSAGES.filter(m => m.status !== 'failed').map((msg, i) => (
            <motion.div key={msg.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: '1px solid #F8FAFC', alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #25D36620, #25D366)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={14} style={{ color: '#25D366' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{msg.recipient_name}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <p style={{ fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif', margin: '0 0 6px 0', lineHeight: 1.6 }}>{msg.body}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={msg.status} size="sm" />
                  <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{msg.recipient_phone}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Scheduled */}
      {activeTab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SCHEDULED.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E2E8F0', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <Clock size={16} style={{ color: '#4F46E5', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{s.patient}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{s.type} · {s.time}</div>
              </div>
              <StatusBadge status={s.status} size="sm" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Templates */}
      {activeTab === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {TEMPLATES.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: '16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}>{t.name}</div>
              <p style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: '0 0 12px 0', minHeight: 52 }}>{t.body}</p>
              <button style={{ padding: '6px 14px', borderRadius: 7, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تعديل</button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Failed */}
      {activeTab === 3 && (
        failed.length === 0 ? (
          <EmptyState icon={CheckCircle} title="لا رسائل فاشلة" body="كل الرسائل تم إرسالها بنجاح." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {failed.map((msg, i) => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #FECACA', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center' }}>
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{msg.recipient_name} · {msg.recipient_phone}</div>
                  <div style={{ fontSize: 12, color: '#DC2626', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{msg.failed_reason}</div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  <RefreshCw size={12} /> إعادة الإرسال
                </button>
              </motion.div>
            ))}
          </div>
        )
      )}

      {/* History = same as inbox for demo */}
      {activeTab === 4 && activeTab === 4 && (
        <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['المريض', 'النوع', 'الوقت', 'الحالة'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_MESSAGES.map((msg, i) => (
                <tr key={msg.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{msg.recipient_name}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{msg.message_type}</td>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{msg.sent_at ? new Date(msg.sent_at).toLocaleString('ar-SA') : '—'}</td>
                  <td style={{ padding: '11px 16px' }}><StatusBadge status={msg.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
