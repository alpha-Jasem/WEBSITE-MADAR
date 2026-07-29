import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarCheck2, Star, CalendarX2, CheckCheck } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/clinicOSQueries'
import type { NotificationSeverity } from '@/types/clinicOS'

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

function NotificationRow({ n, onClick }: { n: NonNullable<ReturnType<typeof useClinicNotifications>['data']>[number]; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
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
  )
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const { companyId, isDemo } = useClinicOS()
  const { data: notifications, refetch } = useClinicNotifications(companyId, isDemo)
  const [open, setOpen] = useState(false)

  const rows = notifications || []
  const unread = rows.filter((n) => !n.read_at)
  const read = rows.filter((n) => n.read_at)
  const unreadCount = unread.length

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
          <span style={{ position: 'absolute', top: -4, insetInlineEnd: -4, width: 14, height: 14 }}>
            <motion.span
              animate={{ scale: [1, 1.9], opacity: [0.55, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--danger-500)' }}
            />
            <span style={{
              position: 'absolute', inset: 0, background: 'var(--danger-500)', color: '#fff',
              borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          </span>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: '130%', insetInlineEnd: 0, width: 320, maxHeight: 420, overflowY: 'auto',
                background: '#fff', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 1300,
                border: '1px solid var(--border-default)',
              }}
            >
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
              {unread.length > 0 && (
                <div>
                  {read.length > 0 && <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>غير مقروءة</div>}
                  {unread.map((n) => <NotificationRow key={n.id} n={n} onClick={() => openNotification(n.id, n.route)} />)}
                </div>
              )}
              {read.length > 0 && (
                <div>
                  {unread.length > 0 && <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>مقروءة سابقاً</div>}
                  {read.map((n) => <NotificationRow key={n.id} n={n} onClick={() => openNotification(n.id, n.route)} />)}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
