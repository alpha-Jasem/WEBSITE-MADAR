import { MessageCircle, Calendar, Star, Phone, Instagram } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicIntegrations, toggleIntegration } from '../../../lib/clinicOSQueries'
import type { IntegrationStatus } from '../../../types/clinicOS'
import { Card, Badge, Button } from '../../../components/clinicOS/v2/primitives'

const ICON_BY_PROVIDER: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={18} />,
  google_calendar: <Calendar size={18} />,
  google_business: <Star size={18} />,
  voip: <Phone size={18} />,
  instagram: <Instagram size={18} />,
}

const DESC_BY_PROVIDER: Record<string, string> = {
  whatsapp: 'استقبال وإرسال رسائل العملاء تلقائياً',
  google_calendar: 'مزامنة الحجوزات مع تقويم العمل',
  google_business: 'إدارة التقييمات والردود الآلية',
  voip: 'الرد الآلي على المكالمات الواردة',
  instagram: 'استقبال رسائل الاستفسار من إنستغرام',
}

export function DashboardV2Integrations() {
  const { companyId, isDemo } = useClinicOS()
  const { data: integrations, refetch } = useClinicIntegrations(companyId, isDemo)

  async function toggle(id: string, current: IntegrationStatus) {
    if (isDemo) return
    await toggleIntegration(id, current === 'connected' ? 'disconnected' : 'connected')
    refetch()
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التكاملات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>اربط قنوات التواصل والأدوات الخارجية بمدار — حالة الاتصال محفوظة فعلياً بحسابك</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        {(integrations || []).map((i) => (
          <Card key={i.id} interactive>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--brand-100)', color: 'var(--brand-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{ICON_BY_PROVIDER[i.provider] || <Star size={18} />}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 220 }}>{DESC_BY_PROVIDER[i.provider] || ''}</div>
                </div>
              </div>
              <Badge tone={i.status === 'connected' ? 'success' : 'neutral'}>{i.status === 'connected' ? 'متصل' : 'غير متصل'}</Badge>
            </div>
            <Button size="sm" variant={i.status === 'connected' ? 'secondary' : 'primary'} onClick={() => toggle(i.id, i.status)} style={{ marginTop: 14 }}>
              {i.status === 'connected' ? 'قطع الاتصال' : 'ربط الآن'}
            </Button>
          </Card>
        ))}
        {(integrations || []).length === 0 && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>جارِ تجهيز التكاملات...</div>}
      </div>
    </div>
  )
}
