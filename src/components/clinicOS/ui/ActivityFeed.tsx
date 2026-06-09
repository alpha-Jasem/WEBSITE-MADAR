import { useMemo } from 'react'
import { CheckCircle, Clock, MessageSquare, Calendar, AlertCircle, Phone } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicTodayAppointments, useClinicMessages } from '../../../lib/clinicOSQueries'
import type { Appointment, MessageLog } from '../../../types/clinicOS'

interface FeedItem {
  id: string
  time: string
  text: string
  type: 'booked' | 'confirmed' | 'message' | 'review' | 'call' | 'cancelled'
  sortKey: number
}

const ICON_MAP = {
  booked:    { icon: Calendar,      color: '#4F46E5', bg: '#EEF2FF' },
  confirmed: { icon: CheckCircle,   color: '#059669', bg: '#ECFDF5' },
  message:   { icon: MessageSquare, color: '#0369A1', bg: '#EFF9FF' },
  review:    { icon: AlertCircle,   color: '#C2410C', bg: '#FFF7ED' },
  call:      { icon: Phone,         color: '#7C3AED', bg: '#F5F3FF' },
  cancelled: { icon: Clock,         color: '#DC2626', bg: '#FEF2F2' },
}

const SAMPLE_FEED: FeedItem[] = [
  { id: '1', time: 'الآن',     text: 'تم إرسال تأكيد واتساب لـ ليلى الغامدي',           type: 'message',   sortKey: Date.now() },
  { id: '2', time: '5د',       text: 'حجز ذكي: رنا الشهري — تنظيف أسنان 6:40 م',        type: 'call',      sortKey: Date.now() - 5 * 60_000 },
  { id: '3', time: '12د',      text: 'تم تأكيد موعد عبدالعزيز الفهد',                   type: 'confirmed', sortKey: Date.now() - 12 * 60_000 },
  { id: '4', time: '25د',      text: 'طلب مراجعة: دانة السلمي — تعارض في الجدول',       type: 'review',    sortKey: Date.now() - 25 * 60_000 },
  { id: '5', time: '41د',      text: 'موعد جديد: سامي العنزي — كشف عام 10:40',          type: 'booked',    sortKey: Date.now() - 41 * 60_000 },
  { id: '6', time: '1س',       text: 'حجز ذكي: تركي الدوسري — تنظيف أسنان',            type: 'call',      sortKey: Date.now() - 60 * 60_000 },
  { id: '7', time: '1س 20د',   text: 'تأكيد واتساب لـ يوسف العتيبي تم الإرسال',        type: 'message',   sortKey: Date.now() - 80 * 60_000 },
  { id: '8', time: '2س',       text: 'إلغاء موعد خالد الرشيد — طلب المريض',            type: 'cancelled', sortKey: Date.now() - 120 * 60_000 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoOrTime: string): string {
  const now = Date.now()
  let ts: number

  // Try ISO datetime first; fall back to treating as "today HH:MM"
  const parsed = Date.parse(isoOrTime)
  if (!isNaN(parsed)) {
    ts = parsed
  } else {
    // Assume it's a time string "HH:MM" for today
    const today = new Date().toISOString().split('T')[0]
    ts = Date.parse(`${today}T${isoOrTime}`)
  }

  if (isNaN(ts)) return ''

  const diffMs = now - ts
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `${diffMin}د`
  const hrs = Math.floor(diffMin / 60)
  const mins = diffMin % 60
  return mins > 0 ? `${hrs}س ${mins}د` : `${hrs}س`
}

function appointmentToFeedItem(a: Appointment): FeedItem {
  let type: FeedItem['type'] = 'booked'
  let text = `موعد: ${a.patient_name} — ${a.service_name}`

  if (a.status === 'confirmed') {
    type = 'confirmed'
    text = `تم تأكيد موعد ${a.patient_name}`
  } else if (a.status === 'cancelled') {
    type = 'cancelled'
    text = `إلغاء موعد ${a.patient_name}`
  } else if (a.status === 'needs_review') {
    type = 'review'
    text = `طلب مراجعة: ${a.patient_name} — ${a.needs_review_reason ?? a.service_name}`
  } else if (a.source === 'ai_booking') {
    type = 'call'
    text = `حجز ذكي: ${a.patient_name} — ${a.service_name} ${a.start_time}`
  }

  const sortTs = Date.parse(a.created_at) || Date.parse(`${a.appointment_date}T${a.start_time}`) || 0

  return {
    id: `appt-${a.id}`,
    time: formatRelativeTime(a.created_at || `${a.appointment_date}T${a.start_time}`),
    text,
    type,
    sortKey: sortTs,
  }
}

function messageToFeedItem(m: MessageLog): FeedItem {
  const typeLabel: Record<string, string> = {
    confirmation: 'تأكيد',
    reminder_24h: 'تذكير 24س',
    reminder_3h:  'تذكير 3س',
    reschedule:   'إعادة جدولة',
    cancellation: 'إلغاء',
    follow_up:    'متابعة',
    review_request: 'طلب تقييم',
    waitlist_offer: 'عرض قائمة الانتظار',
    manual:       'رسالة يدوية',
  }
  const label = typeLabel[m.message_type] ?? m.message_type
  const sortTs = Date.parse(m.created_at) || 0

  return {
    id: `msg-${m.id}`,
    time: formatRelativeTime(m.sent_at ?? m.created_at),
    text: `تم إرسال ${label} واتساب لـ ${m.recipient_name}`,
    type: 'message',
    sortKey: sortTs,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ActivityFeed = () => {
  const { companyId, isDemo } = useClinicOS()
  const { data: appointments } = useClinicTodayAppointments(companyId, isDemo)
  const { data: messages } = useClinicMessages(companyId, isDemo)

  const feed = useMemo<FeedItem[]>(() => {
    // Demo mode or no real data: use SAMPLE_FEED
    if (isDemo || (!appointments?.length && !messages?.length)) {
      return SAMPLE_FEED
    }

    const items: FeedItem[] = [
      ...(appointments ?? []).map(appointmentToFeedItem),
      ...(messages ?? []).map(messageToFeedItem),
    ]

    return items
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, 8)
  }, [isDemo, appointments, messages])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {feed.map((item, i) => {
        const cfg = ICON_MAP[item.type]
        const Icon = cfg.icon
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < feed.length - 1 ? '1px solid #F1F5F9' : 'none',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: cfg.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={14} style={{ color: cfg.color }} />
              </div>
              {i < feed.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 32,
                    transform: 'translateX(-50%)',
                    width: 1,
                    height: 'calc(100% + 10px)',
                    background: '#F1F5F9',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <p
                style={{
                  fontSize: 12,
                  color: '#334155',
                  fontFamily: 'Tajawal, sans-serif',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {item.text}
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                color: '#94A3B8',
                flexShrink: 0,
                paddingTop: 6,
                fontFamily: 'Tajawal, sans-serif',
              }}
            >
              {item.time}
            </span>
          </div>
        )
      })}
    </div>
  )
}
