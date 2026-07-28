import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck2, Star, CalendarX2, CheckCheck } from 'lucide-react'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useClinicNotifications, markNotificationRead, markAllNotificationsRead } from '../../../lib/clinicOSQueries'
import type { NotificationSeverity } from '../../../types/clinicOS'

const ICON_BY_TYPE: Record<string, React.ReactNode> = {
  new_booking: <CalendarCheck2 size={15} />,
  negative_review: <Star size={15} />,
  no_show: <CalendarX2 size={15} />,
}

const DOT_BY_SEVERITY: Record<NotificationSeverity, string> = {
  info: 'var(--brand-500)', success: 'var(--success-500)', warning: 'var(--warning-500)', critical: 'var(--danger-500)',
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  return `منذ ${Math.floor(hours / 24)} يوم`
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const { companyId, isDemo } = useClinicOS()
  const { data: notifications, refetch } = useClinicNotifications(companyId, isDemo)
  const [open, setOpen] = useState(false)

  const rows = notifications || []
  const unreadCount = rows.filter((n) => !n.read_at).length

  async function openNotification(id: string, route?: string) {
    if (!isDemo) { await markNotificationRead(id); refetch() }
    setOpen(false)
    if (route) navigate(route)
  }

  async function markAll() {
    if (companyId && !isDemo) { await markAllNotificationsRead(companyId); refetch() }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setOpen((v) => !v)} style={{ position: 'relative', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, insetInlineEnd: -4, background: 'var(--danger-500)', color: '#fff',
            borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </div>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
          <div style={{
            position: 'absolute', top: '130%', insetInlineEnd: 0, width: 320, maxHeight: 420, overflowY: 'auto',
            background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 1300,
            border: '1px solid var(--border-default)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>الإشعارات</span>
              {unreadCount > 0 && (
                <span onClick={markAll} style={{ fontSize: 11, color: 'var(--brand-600)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCheck size={12} /> تعليم الكل كمقروء
                </span>
              )}
            </div>
            {rows.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>لا توجد إشعارات بعد</div>
            )}
            {rows.map((n) => (
              <div
                key={n.id}
                onClick={() => openNotification(n.id, n.route)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--border-default)',
                  cursor: 'pointer', background: n.read_at ? 'transparent' : 'var(--brand-50)',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                  background: DOT_BY_SEVERITY[n.severity] + '22', color: DOT_BY_SEVERITY[n.severity],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{ICON_BY_TYPE[n.notification_type] || <Bell size={14} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read_at && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-500)', flexShrink: 0, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
