import { CheckCircle, Clock, MessageSquare, Calendar, AlertCircle, Phone } from 'lucide-react'

interface FeedItem {
  id: string
  time: string
  text: string
  type: 'booked' | 'confirmed' | 'message' | 'review' | 'call' | 'cancelled'
}

const ICON_MAP = {
  booked: { icon: Calendar, color: '#4F46E5', bg: '#EEF2FF' },
  confirmed: { icon: CheckCircle, color: '#059669', bg: '#ECFDF5' },
  message: { icon: MessageSquare, color: '#0369A1', bg: '#EFF9FF' },
  review: { icon: AlertCircle, color: '#C2410C', bg: '#FFF7ED' },
  call: { icon: Phone, color: '#7C3AED', bg: '#F5F3FF' },
  cancelled: { icon: Clock, color: '#DC2626', bg: '#FEF2F2' },
}

const SAMPLE_FEED: FeedItem[] = [
  { id: '1', time: 'الآن',     text: 'تم إرسال تأكيد واتساب لـ ليلى الغامدي', type: 'message' },
  { id: '2', time: '5د',      text: 'حجز ذكي: رنا الشهري — تنظيف أسنان 6:40 م', type: 'call' },
  { id: '3', time: '12د',     text: 'تم تأكيد موعد عبدالعزيز الفهد', type: 'confirmed' },
  { id: '4', time: '25د',     text: 'طلب مراجعة: دانة السلمي — تعارض في الجدول', type: 'review' },
  { id: '5', time: '41د',     text: 'موعد جديد: سامي العنزي — كشف عام 10:40', type: 'booked' },
  { id: '6', time: '1س',      text: 'حجز ذكي: تركي الدوسري — تنظيف أسنان', type: 'call' },
  { id: '7', time: '1س 20د',  text: 'تأكيد واتساب لـ يوسف العتيبي تم الإرسال', type: 'message' },
  { id: '8', time: '2س',      text: 'إلغاء موعد خالد الرشيد — طلب المريض', type: 'cancelled' },
]

export const ActivityFeed = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
    {SAMPLE_FEED.map((item, i) => {
      const cfg = ICON_MAP[item.type]
      const Icon = cfg.icon
      return (
        <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < SAMPLE_FEED.length - 1 ? '1px solid #F1F5F9' : 'none', alignItems: 'flex-start' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={14} style={{ color: cfg.color }} />
            </div>
            {i < SAMPLE_FEED.length - 1 && (
              <div style={{ position: 'absolute', left: '50%', top: 32, transform: 'translateX(-50%)', width: 1, height: 'calc(100% + 10px)', background: '#F1F5F9' }} />
            )}
          </div>
          <div style={{ flex: 1, paddingTop: 6 }}>
            <p style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif', margin: 0, lineHeight: 1.5 }}>{item.text}</p>
          </div>
          <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, paddingTop: 6, fontFamily: 'Tajawal, sans-serif' }}>{item.time}</span>
        </div>
      )
    })}
  </div>
)
