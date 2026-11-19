import { useEffect, useMemo, useState } from 'react'
import { Radio } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useConversationData } from '@/lib/queries/conversations'
import { useCompanyStaff } from '@/lib/dashboardQueries'
import { usePresence } from '@/lib/queries/presence'
import { PRESENCE_LABELS, type Presence } from '@/lib/assignment'
import { Avatar } from '@/dashboard/components/uiExtras'
import { CHANNEL_LABEL } from './conversations/model'
import { NightPage, PageHead, CardTitle, EmptyLine, Kpi, fmtNum } from './shared/night'
import { Chip } from './conversations/ui'
import './home/night.css'

const LIVE_WINDOW_MIN = 30
const PRESENCE_TONE: Record<Presence, 'ok' | 'warn' | 'bad' | 'dim'> = { online: 'ok', busy: 'warn', break: 'dim', offline: 'dim' }

const ago = (iso: string, now: number) => {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))
  return m < 1 ? 'الآن' : m < 60 ? `قبل ${m} د` : `قبل ${Math.floor(m / 60)} س`
}

/** Live operations: what is happening right now and who is available to take it. */
export function DashboardV2LiveOps() {
  const { companyId, isDemo } = useWorkspace()
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const staffQ = useCompanyStaff(companyId, isDemo)
  const { presence } = usePresence(companyId, isDemo)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const staff = staffQ.data || []
  const uid = (s: { id: string; auth_user_id?: string }) => (isDemo ? s.id : s.auth_user_id || '')
  const stateOf = (id: string): Presence => presence[id] || 'online'

  const { live, today, review } = useMemo(() => {
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const sorted = [...calls].sort((a, b) => +new Date(b.call_time) - +new Date(a.call_time))
    return {
      live: sorted.filter((c) => now - +new Date(c.call_time) <= LIVE_WINDOW_MIN * 60_000),
      today: sorted.filter((c) => +new Date(c.call_time) >= +dayStart).length,
      review: sorted.filter((c) => c.needs_review).length,
    }
  }, [calls, now])

  const counts = useMemo(() => {
    const c: Record<Presence, number> = { online: 0, busy: 0, break: 0, offline: 0 }
    for (const s of staff) c[stateOf(uid(s))] += 1
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, presence, isDemo])

  return (
    <NightPage>
      <PageHead icon={<Radio size={22} style={{ color: 'var(--sky)' }} />} title="المراقبة الحية" sub="اللي يصير الحين، ومن متاح يستلم. تتحدث الصفحة تلقائيًا." />

      <div className="np-kpis">
        <Kpi label={`محادثات آخر ${LIVE_WINDOW_MIN} دقيقة`} value={fmtNum(live.length)} />
        <Kpi label="محادثات اليوم" value={fmtNum(today)} />
        <Kpi label="تحتاج مراجعة" value={fmtNum(review)} valueStyle={review ? { color: 'var(--warn)' } : undefined} />
        <Kpi label="فريق متاح الحين" value={fmtNum(counts.online)} hint={`${fmtNum(counts.busy)} مشغول · ${fmtNum(counts.break)} استراحة · ${fmtNum(counts.offline)} غير متصل`} />
      </div>

      <div className="nx-card">
        <CardTitle aside={`${fmtNum(live.length)} محادثة`}>المحادثات الجارية</CardTitle>
        {callsLoading && calls.length === 0 ? <EmptyLine>جاري التحميل…</EmptyLine>
          : live.length === 0 ? <EmptyLine>ما فيه محادثات في آخر {LIVE_WINDOW_MIN} دقيقة.</EmptyLine> : (
            <div className="np-table-wrap">
              <table className="np-table">
                <thead><tr><th>العميل</th><th>القناة</th><th>الموضوع</th><th>المدة</th><th>منذ</th></tr></thead>
                <tbody>
                  {live.slice(0, 12).map((c) => (
                    <tr key={c.id}>
                      <td>{c.caller_name || c.patient_name || c.phone}</td>
                      <td>{CHANNEL_LABEL[c.channel || 'phone']}</td>
                      <td>{c.analysis?.title || c.intent || '—'}</td>
                      <td className="np-num">{c.duration_seconds ? `${Math.floor(c.duration_seconds / 60)}:${String(c.duration_seconds % 60).padStart(2, '0')}` : '—'}</td>
                      <td>{ago(c.call_time, now)}{c.needs_review && <> <Chip tone="warn">مراجعة</Chip></>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="nx-card">
        <CardTitle aside={`${fmtNum(staff.length)} عضو`}>حالة الفريق</CardTitle>
        {staff.length === 0 ? <EmptyLine>ما أضفت أحد في الفريق بعد.</EmptyLine> : (
          <div className="np-table-wrap">
            <table className="np-table">
              <thead><tr><th>العضو</th><th>الدور</th><th>الحالة</th></tr></thead>
              <tbody>
                {staff.map((s) => {
                  const st = stateOf(uid(s))
                  return (
                    <tr key={s.id}>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Avatar name={s.full_name || '—'} size={26} />{s.full_name || '—'}</span></td>
                      <td>{s.role}</td>
                      <td><Chip tone={PRESENCE_TONE[st]}>{PRESENCE_LABELS[st]}</Chip></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NightPage>
  )
}
