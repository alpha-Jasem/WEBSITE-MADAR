import { useState } from 'react'
import { MessageCircle, Calendar, Star, Phone, Instagram } from 'lucide-react'
import { Card, Badge, Button } from '../../../components/clinicOS/v2/primitives'

interface Integration { id: string; icon: React.ReactNode; name: string; desc: string; status: 'متصل' | 'غير متصل' }

const INITIAL: Integration[] = [
  { id: 'whatsapp', icon: <MessageCircle size={18} />, name: 'WhatsApp Business', desc: 'استقبال وإرسال رسائل العملاء تلقائياً', status: 'متصل' },
  { id: 'gcal', icon: <Calendar size={18} />, name: 'Google Calendar', desc: 'مزامنة الحجوزات مع تقويم العمل', status: 'متصل' },
  { id: 'gbp', icon: <Star size={18} />, name: 'Google Business Profile', desc: 'إدارة التقييمات والردود الآلية', status: 'غير متصل' },
  { id: 'voip', icon: <Phone size={18} />, name: 'مركز الاتصال (VoIP)', desc: 'الرد الآلي على المكالمات الواردة', status: 'غير متصل' },
  { id: 'instagram', icon: <Instagram size={18} />, name: 'Instagram', desc: 'استقبال رسائل الاستفسار من إنستغرام', status: 'غير متصل' },
]

export function DashboardV2Integrations() {
  const [items, setItems] = useState(INITIAL)
  function toggle(id: string) {
    setItems((is) => is.map((i) => (i.id === id ? { ...i, status: i.status === 'متصل' ? 'غير متصل' : 'متصل' } : i)))
  }
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 'var(--text-heading-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>التكاملات</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>اربط قنوات التواصل والأدوات الخارجية بمدار</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {items.map((i) => (
          <Card key={i.id} interactive>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--brand-100)', color: 'var(--brand-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{i.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{i.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, maxWidth: 220 }}>{i.desc}</div>
                </div>
              </div>
              <Badge tone={i.status === 'متصل' ? 'success' : 'neutral'}>{i.status}</Badge>
            </div>
            <Button size="sm" variant={i.status === 'متصل' ? 'secondary' : 'primary'} onClick={() => toggle(i.id)} style={{ marginTop: 14 }}>
              {i.status === 'متصل' ? 'قطع الاتصال' : 'ربط الآن'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
