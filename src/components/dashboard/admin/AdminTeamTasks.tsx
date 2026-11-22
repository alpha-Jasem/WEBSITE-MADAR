import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort, nf } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

// Team task board (from the developers' console): plain tasks created by hand, assigned to an admin. They live in
// admin_tasks marked is_team, and are never synced to the task app; the command deck keeps the personal list.

interface Member { id: string; email: string; full_name: string | null }
interface Task {
  id: string; title: string; notes: string | null; due_at: string | null; priority: 'low' | 'medium' | 'high'
  done: boolean; in_progress: boolean; assignee_id: string | null; created_by: string | null; created_at: string; source: string | null
}
type View = 'all' | 'mine' | 'open'
const PRIORITY: Record<Task['priority'], string> = { high: 'عالية', medium: 'عادية', low: 'منخفضة' }
const nameOf = (m: Member | undefined) => m?.full_name?.trim() || m?.email?.split('@')[0] || 'غير مسندة'
/** A date typed in Riyadh time -> end of that day in UTC. */
const dueFromInput = (v: string) => (v ? new Date(`${v}T23:59:00+03:00`).toISOString() : null)
const inputFromDue = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 3 * 3600_000).toISOString().slice(0, 10) : '')

const BLANK = { title: '', notes: '', due: '', priority: 'medium' as Task['priority'], assignee_id: '' }

export function AdminTeamTasks({ members, me, onError }: { members: Member[]; me: string | null; onError: (m: string | null) => void }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('open')
  const [draft, setDraft] = useState<(typeof BLANK & { id?: string }) | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('admin_tasks')
      .select('id, title, notes, due_at, priority, done, in_progress, assignee_id, created_by, created_at, source')
      .eq('is_team', true)
      .order('created_at', { ascending: false }).limit(400)
    if (error) { onError('تعذّر تحميل المهام. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    setTasks((data ?? []) as Task[])
  }, [onError])
  useEffect(() => { void load() }, [load])
  useRealtimeRefetch('admin_team_tasks', [{ table: 'admin_tasks' }], load, true)

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const now = Date.now()
  const rank = (t: Task) => (t.in_progress ? 0 : 1)
  const shown = tasks
    .filter((t) => (view === 'mine' ? t.assignee_id === me && !t.done : view === 'open' ? !t.done : true))
    .sort((a, b) => Number(a.done) - Number(b.done) || rank(a) - rank(b)
      || (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity))
  const open = tasks.filter((t) => !t.done)

  async function patch(t: Task, p: Partial<Task>) {
    const { error } = await supabase.from('admin_tasks').update({ ...p, updated_at: new Date().toISOString() }).eq('id', t.id)
    if (error) onError('تعذّر تحديث المهمة.'); else { onError(null); void load() }
  }
  const toggleDone = (t: Task) => patch(t, { done: !t.done, in_progress: false, done_at: t.done ? null : new Date().toISOString() } as Partial<Task>)

  async function save() {
    if (!draft || !draft.title.trim()) { onError('اكتب عنوان المهمة.'); return }
    setBusy(true)
    const row = {
      title: draft.title.trim().slice(0, 200), notes: draft.notes.trim() || null, due_at: dueFromInput(draft.due),
      priority: draft.priority, assignee_id: draft.assignee_id || null, updated_at: new Date().toISOString(),
    }
    const { error } = draft.id
      ? await supabase.from('admin_tasks').update(row).eq('id', draft.id)
      : await supabase.from('admin_tasks').insert({ ...row, created_by: me, is_team: true })
    setBusy(false)
    if (error) { onError('تعذّر حفظ المهمة.'); return }
    onError(null); setDraft(null); void load()
  }
  async function remove(t: Task) {
    if (!window.confirm(`حذف المهمة «${t.title}»؟`)) return
    const { error } = await supabase.from('admin_tasks').delete().eq('id', t.id)
    if (error) onError('تعذّر حذف المهمة.'); else { onError(null); void load() }
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="mc-tabs">
          {([['open', `المفتوحة (${nf(open.length)})`], ['mine', `مهامي (${nf(open.filter((t) => t.assignee_id === me).length)})`], ['all', 'الكل']] as const).map(([k, l]) => (
            <button key={k} className={view === k ? 'mc-on' : ''} onClick={() => setView(k)}>{l}</button>
          ))}
        </div>
        <button className="mc-btn2 p" onClick={() => setDraft({ ...BLANK, assignee_id: me || '' })}>مهمة جديدة</button>
      </div>

      {shown.length === 0 && <div className="mc-flat">{view === 'mine' ? 'ما عندك مهام مفتوحة.' : 'ما فيه مهام هنا.'}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((t) => {
          const late = !t.done && t.due_at && Date.parse(t.due_at) < now
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--fill)', opacity: t.done ? 0.6 : 1, flexWrap: 'wrap' }}>
              <input type="checkbox" checked={t.done} onChange={() => void toggleDone(t)} aria-label={`إنجاز ${t.title}`} style={{ width: 18, height: 18, cursor: 'pointer' }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <b style={{ textDecoration: t.done ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>{t.title}</b>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12, color: 'var(--ink-3)' }}>
                  {t.in_progress && !t.done && <span className="mc-chip">قيد التنفيذ</span>}
                  {t.priority === 'high' && !t.done && <span className="mc-chip" style={{ color: 'var(--red, #f87171)' }}>أولوية {PRIORITY.high}</span>}
                  {t.due_at && <span style={{ color: late ? 'var(--red, #f87171)' : undefined }}>{late ? 'متأخرة · ' : 'تستحق '}{dateShort(t.due_at)}</span>}
                </div>
                {t.notes && <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{t.notes}</div>}
              </div>
              <select className="mc-inp" style={{ width: 'auto', maxWidth: 150 }} value={t.assignee_id || ''} aria-label="المسؤول"
                onChange={(e) => void patch(t, { assignee_id: e.target.value || null })}>
                <option value="">غير مسندة</option>
                {members.map((m) => <option key={m.id} value={m.id}>{nameOf(m)}{m.id === me ? ' (أنا)' : ''}</option>)}
              </select>
              <span style={{ display: 'flex', gap: 6 }}>
                {!t.done && <button className="mc-btn2" onClick={() => void patch(t, { in_progress: !t.in_progress })}>{t.in_progress ? 'إيقاف' : 'ابدأ'}</button>}
                <button className="mc-btn2" onClick={() => setDraft({ id: t.id, title: t.title, notes: t.notes || '', due: inputFromDue(t.due_at), priority: t.priority, assignee_id: t.assignee_id || '' })}>تعديل</button>
                <button className="mc-btn2" aria-label={`حذف ${t.title}`} onClick={() => void remove(t)}>حذف</button>
              </span>
            </div>
          )
        })}
      </div>

      {draft && (
        <div className="mc-modal-bg" onClick={() => setDraft(null)}>
          <div className="mc-modal" role="dialog" aria-modal="true" aria-label={draft.id ? 'تعديل مهمة' : 'مهمة جديدة'} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{draft.id ? 'تعديل المهمة' : 'مهمة جديدة'}</h3>
            <input className="mc-inp" placeholder="عنوان المهمة" value={draft.title} maxLength={200} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <textarea className="mc-inp" rows={3} placeholder="تفاصيل (اختياري)" value={draft.notes} maxLength={4000} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            <label style={{ display: 'grid', gap: 4 }}>المسؤول
              <select className="mc-inp" value={draft.assignee_id} onChange={(e) => setDraft({ ...draft, assignee_id: e.target.value })}>
                <option value="">غير مسندة</option>
                {members.map((m) => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
              <label style={{ display: 'grid', gap: 4 }}>الاستحقاق<input className="mc-inp" type="date" dir="ltr" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 4 }}>الأولوية
                <select className="mc-inp" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Task['priority'] })}>
                  {(Object.keys(PRIORITY) as Task['priority'][]).map((p) => <option key={p} value={p}>{PRIORITY[p]}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setDraft(null)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={busy} onClick={() => void save()}>{busy ? 'جارِ الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
