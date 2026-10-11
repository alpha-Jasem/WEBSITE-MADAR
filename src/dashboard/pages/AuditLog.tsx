import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { History, UserCog, CalendarPlus, Wrench, ShieldCheck, Search } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuditLog } from '@/lib/dashboardQueries'
import { Card, Badge, Input, type BadgeTone } from '@/dashboard/components/primitives'
import { EmptyState, SkeletonRows } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, useIsNarrow } from './shared/night'

const ICON_BY_ACTION: Record<string, React.ReactNode> = {
  'appointment.created': <CalendarPlus size={15} />,
  'staff.added': <UserCog size={15} />,
  'staff.removed': <UserCog size={15} />,
  'service.created': <Wrench size={15} />,
  'service.updated': <Wrench size={15} />,
  'subscription.activated': <ShieldCheck size={15} />,
}

const LABEL_BY_ACTION: Record<string, string> = {
  'appointment.created': 'حجز جديد',
  'staff.added': 'إضافة موظف',
  'staff.removed': 'حذف موظف',
  'service.created': 'إضافة خدمة',
  'service.updated': 'تحديث خدمة',
  'subscription.activated': 'تفعيل اشتراك',
}

const TONE_BY_ACTOR: Record<string, BadgeTone> = { user: 'brand', admin: 'warning', system: 'neutral' }
const ACTOR_LABEL: Record<string, string> = { user: 'فريقك', admin: 'إدارة مدار', system: 'النظام' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function DashboardV2AuditLog() {
  const { companyId, isDemo } = useWorkspace()
  const { data: logs, loading } = useAuditLog(companyId, isDemo)
  const [query, setQuery] = useState('')

  const narrow = useIsNarrow()
  const rows = logs || []
  const shown = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter((l) => (l.note || '').toLowerCase().includes(q) || (LABEL_BY_ACTION[l.action] || l.action).toLowerCase().includes(q))
  }, [rows, query])

  return (
    <NightPage>
      <PageHead
        title="سجل التدقيق"
        sub="كل عملية مهمة تصير على حسابك — من سواها ومتى"
        actions={<Input placeholder="بحث بالحدث..." icon={<Search size={15} />} value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: narrow ? '100%' : 240 }} />}
      />

      <Card style={{ padding: loading ? 0 : '20px 24px' }}>
        {loading && <SkeletonRows rows={6} columns={3} />}
        {!loading && shown.length === 0 && (
          <EmptyState icon={<History size={20} />} title="لا توجد أحداث مطابقة" description="جرّب تغيير كلمة البحث، أو ارجع لاحقاً بعد أول نشاط على حسابك." />
        )}
        {!loading && shown.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 16, bottom: 16, insetInlineStart: 15, width: 2, background: 'var(--border-default)' }} />
            {shown.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.03 }}
                style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: i < shown.length - 1 ? 22 : 0 }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--info-bg)', color: 'var(--sky)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1,
                  boxShadow: '0 0 0 3px var(--surface-card)',
                }}>{ICON_BY_ACTION[log.action] || <History size={15} />}</div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{LABEL_BY_ACTION[log.action] || log.action}</span>
                      <Badge tone={TONE_BY_ACTOR[log.actor_type] || 'neutral'}>{ACTOR_LABEL[log.actor_type] || log.actor_type}</Badge>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</div>
                  </div>
                  {log.note && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{log.note}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </NightPage>
  )
}
