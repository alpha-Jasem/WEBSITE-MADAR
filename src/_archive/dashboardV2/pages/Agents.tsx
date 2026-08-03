import { Bot, Plus } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { Card, Badge, Button } from '@/_archive/dashboardV2/components/primitives'
import { useToast } from '@/_archive/dashboardV2/components/uiExtras'

export function DashboardV2Agents() {
  const { clinicName } = useClinicOS()
  const pushToast = useToast()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700 }}>الوكلاء</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>وكلاء الذكاء الاصطناعي المتصلين بمساحة العمل</div>
        </div>
        <Button variant="primary" onClick={() => pushToast({ kind: 'info', title: 'إضافة وكلاء إضافيين قادمة قريبًا' })}>
          <Plus size={15} /> وكيل جديد
        </Button>
      </div>

      <Card style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--gradient-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bot size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>مها</span>
              <Badge tone="success">متصلة</Badge>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 2 }}>الوكيل الصوتي — ElevenLabs Conversational AI · {clinicName || 'عيادتك'}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
