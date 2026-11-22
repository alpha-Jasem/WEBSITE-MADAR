import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { nf, timeShort, dateShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

// Attendance (clock in / out) and a real-numbers team scoreboard: hours worked, tasks done, meetings held, per admin.
// Nothing here is invented: no points, only counts read from the tables. Deals are team-wide because the deal
// table does not record which admin closed it.

interface Member { id: string; email: string; full_name: string | null }
interface Shift { id: string; user_id: string; clock_in: string; clock_out: string | null }
const nameOf = (m: Member | undefined) => m?.full_name?.trim() || m?.email?.split('@')[0] || 'عضو'
const hoursOf = (s: Shift, now: number) => Math.max(0, ((s.clock_out ? Date.parse(s.clock_out) : now) - Date.parse(s.clock_in)) / 3600_000)
const fmtH = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}س ${String(m % 60).padStart(2, '0')}د` }
const monthStartIso = () => { const d = new Date(Date.now() + 3 * 3600_000); return new Date(`${d.toISOString().slice(0, 7)}-01T00:00:00+03:00`).toISOString() }

export function AdminTeamPerformance({ members, me, onError, onNote }: { members: Member[]; me: string | null; onError: (m: string | null) => void; onNote: (m: string) => void }) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [tasks, setTasks] = useState<{ assignee_id: string | null; done: boolean; done_at: string | null }[]>([])
  const [meetings, setMeetings] = useState<{ host_id: string | null; status: string; starts_at: string }[]>([])
  const [wonDeals, setWonDeals] = useState<number | null>(null)
  const [tick, setTick] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const from = useMemo(monthStartIso, [])

  const load = useCallback(async () => {
    const [a, t, m, d] = await Promise.all([
      supabase.from('staff_attendance').select('id, user_id, clock_in, clock_out').gte('clock_in', from).order('clock_in', { ascending: false }).limit(1000),
      supabase.from('admin_tasks').select('assignee_id, done, done_at').eq('is_team', true).limit(2000),
      supabase.from('meetings').select('host_id, status, starts_at').gte('starts_at', from).limit(1000),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('stage', 'won').gte('closed_at', from),
    ])
    if (a.error) { onError('تعذّر تحميل الحضور. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    onError(null)
    setShifts((a.data ?? []) as Shift[]); setTasks((t.data ?? []) as typeof tasks); setMeetings((m.data ?? []) as typeof meetings)
    setWonDeals(d.error ? null : d.count ?? 0)
  }, [from, onError])
  useEffect(() => { void load() }, [load])
  useRealtimeRefetch('admin_team_perf', [{ table: 'staff_attendance' }, { table: 'admin_tasks' }, { table: 'meetings' }], load, true)
  useEffect(() => { const id = window.setInterval(() => setTick(Date.now()), 30_000); return () => window.clearInterval(id) }, [])

  const openShift = shifts.find((s) => s.user_id === me && !s.clock_out)
  async function clock() {
    if (!me) return
    setBusy(true)
    const { error } = openShift
      ? await supabase.from('staff_attendance').update({ clock_out: new Date().toISOString() }).eq('id', openShift.id)
      : await supabase.from('staff_attendance').insert({ user_id: me })
    setBusy(false)
    if (error) { onError('تعذّر تسجيل الحضور.'); return }
    onNote(openShift ? 'سُجّل انصرافك' : 'سُجّل حضورك'); void load()
  }

  const rows = members.map((m) => {
    const mine = shifts.filter((s) => s.user_id === m.id)
    const here = mine.find((s) => !s.clock_out)
    const days = new Set(mine.map((s) => s.clock_in.slice(0, 10))).size
    return {
      m, here, days, hours: mine.reduce((n, s) => n + hoursOf(s, tick), 0),
      tasksDone: tasks.filter((t) => t.assignee_id === m.id && t.done && t.done_at && t.done_at >= from).length,
      tasksOpen: tasks.filter((t) => t.assignee_id === m.id && !t.done).length,
      meetingsDone: meetings.filter((x) => x.host_id === m.id && x.status === 'done').length,
    }
  })
  const max = (k: 'hours' | 'tasksDone' | 'meetingsDone') => Math.max(1, ...rows.map((r) => r[k]))
  const Bar = ({ v, of }: { v: number; of: number }) => (
    <div style={{ height: 6, borderRadius: 99, background: 'var(--fill-2)', overflow: 'hidden', marginTop: 4 }}><i style={{ display: 'block', height: '100%', width: `${Math.min(100, (v / of) * 100)}%`, background: 'var(--brand-grad)' }} /></div>
  )
  const recent = shifts.slice(0, 8)

  return (
    <div style={{ padding: '0 20px 20px', display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 14, border: '1px solid var(--line)', borderRadius: 14, background: 'var(--fill)' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <b>{openShift ? 'أنت على رأس العمل' : 'أنت خارج الدوام'}</b>
          <div className="mc-delta">{openShift ? `منذ ${timeShort(openShift.clock_in)} · ${fmtH(hoursOf(openShift, tick))}` : 'سجّل حضورك عند بدء العمل وانصرافك عند الانتهاء.'}</div>
        </div>
        <button className="mc-btn2 p" disabled={busy || !me} onClick={() => void clock()}>{openShift ? 'تسجيل انصراف' : 'تسجيل حضور'}</button>
      </div>

      <div>
        <b style={{ display: 'block', marginBottom: 8 }}>أداء هذا الشهر</b>
        <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
          <thead><tr><th>العضو</th><th>الحالة</th><th>أيام الحضور</th><th>ساعات العمل</th><th>مهام منجزة</th><th>مهام مفتوحة</th><th>اجتماعات تمت</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="mc-flat">ما فيه أعضاء.</td></tr>}
            {rows.map((r) => (
              <tr key={r.m.id}>
                <td><b>{nameOf(r.m)}</b>{r.m.id === me ? ' (أنت)' : ''}</td>
                <td>{r.here ? <span className="mc-chip" style={{ color: 'var(--green)' }}>على رأس العمل</span> : <span style={{ color: 'var(--ink-3)' }}>غير متصل</span>}</td>
                <td>{nf(r.days)}</td>
                <td style={{ minWidth: 120 }}>{fmtH(r.hours)}<Bar v={r.hours} of={max('hours')} /></td>
                <td style={{ minWidth: 100 }}>{nf(r.tasksDone)}<Bar v={r.tasksDone} of={max('tasksDone')} /></td>
                <td>{nf(r.tasksOpen)}</td>
                <td style={{ minWidth: 100 }}>{nf(r.meetingsDone)}<Bar v={r.meetingsDone} of={max('meetingsDone')} /></td>
              </tr>
            ))}
          </tbody></table></div>
        <div className="mc-delta" style={{ marginTop: 8 }}>
          صفقات مغلقة هذا الشهر للفريق كله: {wonDeals == null ? 'غير متاح' : nf(wonDeals)}. الصفقة لا تسجّل من أغلقها، فلا نوزعها على الأعضاء.
        </div>
      </div>

      <div>
        <b style={{ display: 'block', marginBottom: 8 }}>آخر سجلات الحضور</b>
        {recent.length === 0 ? <div className="mc-flat">ما فيه سجلات حضور هذا الشهر.</div> : (
          <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
            <thead><tr><th>العضو</th><th>اليوم</th><th>حضور</th><th>انصراف</th><th>المدة</th></tr></thead>
            <tbody>{recent.map((s) => (
              <tr key={s.id}>
                <td>{nameOf(members.find((m) => m.id === s.user_id))}</td><td>{dateShort(s.clock_in)}</td><td>{timeShort(s.clock_in)}</td>
                <td>{s.clock_out ? timeShort(s.clock_out) : 'مستمر'}</td><td>{fmtH(hoursOf(s, tick))}</td>
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
    </div>
  )
}
