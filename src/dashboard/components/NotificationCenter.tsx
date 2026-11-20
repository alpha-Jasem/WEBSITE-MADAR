import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarCheck2, Star, CalendarX2, CheckCheck, MessageSquare, Ticket, AlertTriangle, Megaphone, Plug, Zap } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/dashboardQueries'
import type { NotificationSeverity } from '@/types/dashboard'

const ICON_BY_TYPE: Record<string, ReactNode> = {
  new_conversation: <MessageSquare size={15} />,
  needs_review: <AlertTriangle size={15} />,
  ticket_assigned: <Ticket size={15} />,
  automation: <Zap size={15} />,
  automation_failed: <AlertTriangle size={15} />,
  campaign_finished: <Megaphone size={15} />,
  integration_expired: <Plug size={15} />,
  no_show_alert: <CalendarX2 size={15} />,
  new_booking: <CalendarCheck2 size={15} />,
  negative_review: <Star size={15} />,
  no_show: <CalendarX2 size={15} />,
}

const DOT_BY_SEVERITY: Record<NotificationSeverity, string> = {
  info: 'var(--sky)', success: 'var(--ok)', warning: 'var(--warn)', critical: 'var(--bad)',
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

function NotificationRow({ n, onClick }: { n: NonNullable<ReturnType<typeof useNotifications>['data']>[number]; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line)', width: '100%', textAlign: 'start',
        cursor: 'pointer', border: 0, borderBottomWidth: 1, font: 'inherit', color: 'inherit',
        background: n.read_at ? 'transparent' : 'var(--hover-bg)',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: `color-mix(in srgb, ${DOT_BY_SEVERITY[n.severity]} 16%, transparent)`, color: DOT_BY_SEVERITY[n.severity],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{ICON_BY_TYPE[n.notification_type] || <Bell size={14} />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>{n.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n.message}</div>
        <div style={{ fontSize: 10.5, color: 'var(--dim)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
      </div>
      {!n.read_at && <span aria-label="غير مقروء" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bad)', flexShrink: 0, marginTop: 4 }} />}
    </button>
  )
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const { companyId, isDemo } = useWorkspace()
  const { data: notifications, refetch } = useNotifications(companyId, isDemo)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Demo data can't be saved, so reading is remembered here for the session.
  const [demoRead, setDemoRead] = useState<Set<string>>(new Set())
  const rows = (notifications || []).map((n) => (isDemo && demoRead.has(n.id) ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
  const unread = rows.filter((n) => !n.read_at)
  const read = rows.filter((n) => n.read_at)
  const unreadCount = unread.length

  // Stored routes come as '/dashboard/x', '/x' or 'x'; always land inside the current dashboard (demo included).
  const base = isDemo ? '/demo-review' : '/dashboard'
  function target(route?: string) {
    if (!route) return null
    const path = route.replace(/^\/?(dashboard|demo-review)(\/|$)/, '').replace(/^\//, '')
    return path ? `${base}/${path}` : base
  }

  async function openNotification(id: string, route?: string) {
    setOpen(false)
    const to = target(route)
    if (to) navigate(to)
    if (isDemo) { setDemoRead((p) => new Set(p).add(id)); return }
    try { await markNotificationRead(id); refetch() } catch { /* stays unread; the next refresh shows it */ }
  }

  async function markAll() {
    if (isDemo) { setDemoRead(new Set(rows.map((n) => n.id))); return }
    if (!companyId) return
    try { await markAllNotificationsRead(companyId); refetch() } catch { /* stays unread */ }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="dv2-icon-btn" aria-label={unreadCount > 0 ? `الإشعارات: ${unreadCount} غير مقروءة` : 'الإشعارات'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell size={17} />
        {unreadCount > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: 3, insetInlineEnd: 3, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 99, background: 'var(--bad)', color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: '16px', textAlign: 'center', boxSizing: 'border-box' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
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
                position: 'absolute', top: '130%', insetInlineEnd: 0, width: 'min(340px, calc(100vw - 32px))', maxHeight: 420, overflowY: 'auto',
                background: 'var(--panel)', borderRadius: 12, boxShadow: '0 12px 32px rgba(0,0,0,.35)', zIndex: 1300,
                border: '1px solid var(--line-2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>الإشعارات</span>
                {unreadCount > 0 && (
                  <button type="button" onClick={markAll} style={{ fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 0, font: 'inherit' }}>
                    <CheckCheck size={12} /> تعليم الكل كمقروء
                  </button>
                )}
              </div>
              {rows.length === 0 && (
                <div style={{ padding: '34px 20px', textAlign: 'center', color: 'var(--dim)', fontSize: 12.5, lineHeight: 1.8 }}>
                  <Bell size={22} style={{ opacity: 0.5, marginBottom: 6 }} /><br />كل شيء تحت السيطرة. سنخبرك هنا عند وصول محادثة جديدة أو ما يحتاج مراجعتك.
                </div>
              )}
              {unread.length > 0 && (
                <div>
                  {read.length > 0 && <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--dim)' }}>غير مقروءة</div>}
                  {unread.map((n) => <NotificationRow key={n.id} n={n} onClick={() => openNotification(n.id, n.route)} />)}
                </div>
              )}
              {read.length > 0 && (
                <div>
                  {unread.length > 0 && <div style={{ padding: '8px 14px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--dim)' }}>مقروءة سابقاً</div>}
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
