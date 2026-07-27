import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicAICalls, useClinicMessages } from '../../../lib/clinicOSQueries'
import { Card, Badge } from '../../../components/clinicOS/v2/primitives'

export function DashboardV2Conversations() {
  const { companyId, isDemo } = useClinicOS()
  const { data: aiCalls } = useClinicAICalls(companyId, isDemo)
  const { data: messages } = useClinicMessages(companyId, isDemo)
  const [activeId, setActiveId] = useState<string | null>(null)

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

      <Card style={{ width: 280, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', fontWeight: 700, borderBottom: '1px solid var(--border-default)' }}>رسائل واتساب</div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {msgs.slice(0, 20).map((m) => (
            <div key={m.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.recipient_name}</div>
                <MessageCircle size={13} style={{ color: '#2fbf6f' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body}</div>
            </div>
          ))}
          {msgs.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>لا توجد رسائل بعد</div>}
        </div>
      </Card>
    </div>
  )
}
