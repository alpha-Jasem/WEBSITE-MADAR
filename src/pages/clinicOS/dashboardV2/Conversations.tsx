import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicAICalls, useClinicMessages } from '../../../lib/clinicOSQueries'
import type { MessageLog, MessageStatus } from '../../../types/clinicOS'
import { Card, Badge, Dialog, Button, type BadgeTone } from '../../../components/clinicOS/v2/primitives'

const MSG_STATUS_LABEL: Record<MessageStatus, string> = { pending: 'قيد الإرسال', sent: 'أُرسلت', delivered: 'تم التسليم', read: 'تمت القراءة', failed: 'فشلت' }
const MSG_STATUS_TONE: Record<MessageStatus, BadgeTone> = { pending: 'neutral', sent: 'neutral', delivered: 'success', read: 'success', failed: 'danger' }
const MSG_TYPE_LABEL: Record<string, string> = {
  confirmation: 'تأكيد موعد', reminder_24h: 'تذكير 24 ساعة', reminder_3h: 'تذكير 3 ساعات', reschedule: 'إعادة جدولة',
  cancellation: 'إلغاء', follow_up: 'متابعة', review_request: 'طلب تقييم', waitlist_offer: 'عرض قائمة انتظار', manual: 'يدوي',
}

export function DashboardV2Conversations() {
  const { companyId, isDemo } = useClinicOS()
  const { data: aiCalls } = useClinicAICalls(companyId, isDemo)
  const { data: messages } = useClinicMessages(companyId, isDemo)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeMessage, setActiveMessage] = useState<MessageLog | null>(null)

  const calls = aiCalls || []
  const msgs = messages || []
  const active = calls.find((c) => c.id === activeId) || calls[0]

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 112px)' }}>
      <Card style={{ width: 300, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', fontWeight: 700, borderBottom: '1px solid var(--border-default)' }}>المحادثات</div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {calls.map((c) => (
            <div key={c.id} onClick={() => setActiveId(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', cursor: 'pointer',
              background: c.id === (active?.id) ? 'var(--brand-50)' : 'transparent', borderBottom: '1px solid var(--border-default)',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--slate-200)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.patient_name || c.phone}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.summary || c.intent}
                </div>
              </div>
              <div style={{ color: 'var(--brand-500)' }}><Phone size={14} /></div>
            </div>
          ))}
          {calls.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد مكالمات ذكاء اصطناعي بعد</div>}
        </div>
      </Card>

      <Card style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{active ? (active.patient_name || active.phone) : 'اختر محادثة'}</div>
          {active && <Badge tone="brand">تمت الإدارة بواسطة AI</Badge>}
        </div>
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {active?.transcript && active.transcript.length > 0 ? (
            active.transcript.map((m, i) => {
              const mine = m.speaker === 'agent'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 10 }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: 'var(--radius-lg)', fontSize: 13.5, lineHeight: 1.5,
                    background: mine ? 'var(--brand-100)' : 'var(--slate-100)', color: mine ? 'var(--brand-700)' : 'var(--text-primary)',
                  }}>{m.text}</div>
                </div>
              )
            })
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, marginTop: 40 }}>
              {active ? 'لا يوجد نص محادثة مسجّل لهذه المكالمة' : 'لا توجد محادثات بعد'}
            </div>
          )}
        </div>
      </Card>

      <Card style={{ width: 300, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', fontWeight: 700, borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={16} style={{ color: '#25D366' }} /> رسائل واتساب
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {msgs.slice(0, 20).map((m) => (
            <div key={m.id} onClick={() => setActiveMessage(m)} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-default)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.recipient_name}</div>
                <Badge tone={MSG_STATUS_TONE[m.status]}>{MSG_STATUS_LABEL[m.status]}</Badge>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{MSG_TYPE_LABEL[m.message_type] || m.message_type}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body}</div>
            </div>
          ))}
          {msgs.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد رسائل بعد</div>}
        </div>
      </Card>

      <Dialog
        open={!!activeMessage} title={activeMessage?.recipient_name || ''} onClose={() => setActiveMessage(null)}
        footer={<Button onClick={() => setActiveMessage(null)}>إغلاق</Button>}
      >
        {activeMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge tone={MSG_STATUS_TONE[activeMessage.status]}>{MSG_STATUS_LABEL[activeMessage.status]}</Badge>
              <Badge tone="neutral">{MSG_TYPE_LABEL[activeMessage.message_type] || activeMessage.message_type}</Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{activeMessage.recipient_phone}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, background: 'var(--slate-50)', padding: 14, borderRadius: 'var(--radius-md)' }}>{activeMessage.body}</div>
            {activeMessage.sent_at && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>وقت الإرسال</span>
                <span style={{ fontWeight: 600 }}>{new Date(activeMessage.sent_at).toLocaleString('ar-SA')}</span>
              </div>
            )}
            {activeMessage.failed_reason && (
              <div style={{ fontSize: 12, color: 'var(--danger-500)' }}>سبب الفشل: {activeMessage.failed_reason}</div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
