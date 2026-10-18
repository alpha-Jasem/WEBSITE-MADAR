import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAdminPulse } from './adminPulse'
import { McIcon, type McIconName } from './mcIcons'
import type { Deal } from '../../../lib/deals'
import { STAGE_LABEL, isClosed, stageRank, type DealStage } from '../../../lib/dealStages'
import { buildBrief } from '../../../lib/jarvis'
import { bucketWindow, collectionSeries, dailyCollection, goalProgress, pctChange, sumConfirmed, type PaymentRow, type Period } from '../../../lib/collections'
import { dateShort, monthKey, nf, riyadhDayStart, sar, timeShort } from '../../../lib/format'

interface Task { id: string; title: string; due_at: string | null; priority: 'high' | 'medium' | 'low'; done: boolean; done_at: string | null }
interface Check { key: string; label: string; status: string }

const PRIORITY = {
  high: { label: '', color: '#ff6b6b' },
  medium: { label: 'متوسط', color: '#f5b942' },
  low: { label: 'منخفض', color: '#5b8cff' },
} as const
const TILE_ICON: Record<string, McIconName> = { meetings: 'cal', payments: 'bank', overdue: 'phone', due: 'phone', nextstep: 'doc', integrations: 'gear', first: 'users', goal: 'target' }
const DAY = 86400000

function Delta({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <div className="mc-delta"><span className="mc-none">لا توجد مقارنة بعد</span></div>
  return <div className="mc-delta"><b style={pct < 0 ? { color: 'var(--red)' } : undefined}>{pct < 0 ? '↓' : '↑'} {nf(Math.abs(pct))}%</b>{label}</div>
}

function Bars({ values, violet }: { values: number[]; violet?: boolean }) {
  const max = Math.max(1, ...values)
  return (
    <div className={`mc-bars ${violet ? 'mc-v' : ''}`} aria-hidden="true">
      {values.map((v, i) => <i key={i} style={{ height: Math.max(4, Math.round((v / max) * 52)) }} />)}
    </div>
  )
}

export const AdminCommandDeck = () => {
  const navigate = useNavigate()
  const pulse = useAdminPulse()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [goal, setGoal] = useState<number | null>(null)
  const [period, setPeriod] = useState<Period>('day')
  const [hover, setHover] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [goalEdit, setGoalEdit] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    pulse.reload()
    const [p, d, t, g, c] = await Promise.all([
      supabase.from('payments').select('id, customer_name, status, total_amount, net_amount, tax_amount, confirmed_at, received_at, reference, method, deal_id').limit(3000),
      supabase.from('deals').select('*').limit(1000),
      supabase.from('admin_tasks').select('id, title, due_at, priority, done, done_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('agency_goals').select('target').eq('period', monthKey()).eq('kind', 'collections').maybeSingle(),
      supabase.from('integration_checks').select('key, label, status'),
    ])
    setError([p, d, t].some(r => r.error) ? 'تعذّر تحميل جزء من البيانات. الأرقام المعروضة قد تكون ناقصة.' : null)
    setPayments(((p.data ?? []) as PaymentRow[]).map(r => ({ ...r, total_amount: Number(r.total_amount) })))
    setDeals((d.data ?? []) as Deal[])
    setTasks((t.data ?? []) as Task[])
    setGoal(g.data ? Number(g.data.target) : null)
    setChecks((c.data ?? []) as Check[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])

  /* ---------- numbers ---------- */
  const now = new Date()
  const today = riyadhDayStart(now)
  const tomorrow = new Date(today.getTime() + DAY)
  const collectedToday = sumConfirmed(payments, today, tomorrow)
  const collectedYesterday = sumConfirmed(payments, new Date(today.getTime() - DAY), today)
  const month = bucketWindow('month', 0, now)
  const collectedMonth = sumConfirmed(payments, month.start, month.end)
  const progress = goalProgress(collectedMonth, goal)
  const spark = dailyCollection(payments, 7, now).map(d => d.total)

  const wonDays = Array.from({ length: 8 }, (_, i) => {
    const s = new Date(today.getTime() - (7 - i) * DAY)
    return deals.filter(x => x.stage === 'won' && x.closed_at && new Date(x.closed_at) >= s && new Date(x.closed_at) < new Date(s.getTime() + DAY)).length
  })
  const wonMonth = deals.filter(x => x.stage === 'won' && x.closed_at && new Date(x.closed_at) >= month.start && new Date(x.closed_at) < month.end).length
  const won7 = wonDays.slice(1).reduce((a, b) => a + b, 0)
  const wonPrev7 = deals.filter(x => x.stage === 'won' && x.closed_at && new Date(x.closed_at) >= new Date(today.getTime() - 14 * DAY) && new Date(x.closed_at) < new Date(today.getTime() - 7 * DAY)).length

  const interested = deals.filter(x => ['interested', 'qualified', 'offer_sent', 'negotiation', 'awaiting_payment'].includes(x.stage))
  const interestedDays = Array.from({ length: 7 }, (_, i) => {
    const s = new Date(today.getTime() - (6 - i) * DAY)
    return interested.filter(x => new Date(x.created_at) >= s && new Date(x.created_at) < new Date(s.getTime() + DAY)).length
  })
  const int7 = interestedDays.reduce((a, b) => a + b, 0)
  const intPrev7 = interested.filter(x => new Date(x.created_at) >= new Date(today.getTime() - 14 * DAY) && new Date(x.created_at) < new Date(today.getTime() - 7 * DAY)).length

  const open = deals.filter(x => !isClosed(x.stage))
  const noNextStep = open.filter(x => !x.next_step && !x.next_step_at).length
  const pending = payments.filter(p => p.status === 'pending_verification')
  const failing = checks.filter(c => c.status === 'failed' || c.status === 'degraded').map(c => c.label)
  const overdue = pulse.due.filter(l => l.next_follow_up && new Date(l.next_follow_up) < today).length

  const brief = buildBrief({
    dueToday: pulse.due.length - overdue, overdue, meetingsToday: pulse.meetingsToday.length, waitingFirstContact: pulse.waiting,
    dealsWithoutNextStep: noNextStep, qualifiedDeals: interested.length, activeDeals: open.length, hasMonthlyGoal: goal !== null,
    integrationsFailing: failing, pendingPayments: pending.length,
  })

  const closest = open.filter(x => stageRank(x.stage) >= stageRank('qualified'))
    .sort((a, b) => stageRank(b.stage) - stageRank(a.stage)).slice(0, 3)

  const series = useMemo(() => collectionSeries(payments, period, now), [payments, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const chartMax = Math.max(1000, ...series.flatMap(s => [s.current, s.previous]))
  const niceMax = Math.ceil((chartMax * 1.2) / 1000) * 1000
  const chartEmpty = series.every(s => s.current === 0 && s.previous === 0)

  const actions: { id: string; icon: McIconName; title: string; sub: string; chip: string; tone: 'a' | 'b'; to: string }[] = []
  pending.slice(0, 2).forEach(p => actions.push({ id: p.id, icon: 'bank', title: 'مراجعة حوالة واردة', sub: `${p.customer_name} · ${sar(p.total_amount)}`, chip: 'بانتظار التحقق', tone: 'a', to: '/admin/finance' }))
  if (overdue > 0) actions.push({ id: 'ov', icon: 'phone', title: 'متابعات متأخرة', sub: `${nf(overdue)} عميل موعد متابعته فات`, chip: 'متأخرة', tone: 'a', to: '/admin/outreach' })
  if (noNextStep > 0) actions.push({ id: 'ns', icon: 'doc', title: 'صفقات بلا خطوة قادمة', sub: `${nf(noNextStep)} صفقة مفتوحة`, chip: 'تحتاج تحديد', tone: 'b', to: '/admin/pipeline' })
  if (failing.length > 0) actions.push({ id: 'ig', icon: 'gear', title: 'تكاملات تحتاج مراجعة', sub: failing.slice(0, 2).join('، '), chip: 'يحتاج مراجعة', tone: 'a', to: '/admin/settings' })
  const shownActions = actions.slice(0, 4)

  const visibleTasks = tasks.filter(t => !t.done || (t.done_at && new Date(t.done_at) >= today)).slice(0, 5)

  /* ---------- writes ---------- */
  const addTask = async () => {
    const title = taskTitle.trim()
    if (!title) return
    const { data: u } = await supabase.auth.getUser()
    const { data, error: e } = await supabase.from('admin_tasks').insert({ title, created_by: u.user?.id }).select('id, title, due_at, priority, done, done_at').single()
    if (e || !data) { setError('تعذّرت إضافة المهمة.'); return }
    setTasks(ts => [data as Task, ...ts])
    setTaskTitle('')
    setAdding(false)
  }
  const toggleTask = async (t: Task) => {
    const done = !t.done
    const done_at = done ? new Date().toISOString() : null
    setTasks(ts => ts.map(x => (x.id === t.id ? { ...x, done, done_at } : x)))
    const { error: e } = await supabase.from('admin_tasks').update({ done, done_at }).eq('id', t.id)
    if (e) load()
  }
  const saveGoal = async () => {
    const target = Number(goalInput)
    if (!Number.isFinite(target) || target <= 0) return
    const { error: e } = await supabase.from('agency_goals').upsert({ period: monthKey(), kind: 'collections', target, updated_at: new Date().toISOString() }, { onConflict: 'period,kind' })
    if (e) { setError('تعذّر حفظ الهدف.'); return }
    setGoal(target)
    setGoalEdit(false)
  }

  /* ---------- chart geometry ---------- */
  const W = 900, H = 250, PL = 52, PB = 30, n = series.length
  const X = (i: number) => PL + 14 + (i * (W - PL - 42)) / Math.max(1, n - 1)
  const Y = (v: number) => H - PB - (v / niceMax) * (H - PB - 16)
  const path = (key: 'current' | 'previous') => series.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(s[key]).toFixed(1)}`).join(' ')
  const area = (key: 'current' | 'previous') => `${path(key)} L${X(n - 1)} ${H - PB} L${X(0)} ${H - PB}Z`
  const label = (s: { start: Date }) => period === 'month' ? s.start.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'long', timeZone: 'Asia/Riyadh' }) : dateShort(new Date(s.start.getTime() + 3600000))
  const hv = hover !== null ? series[hover] : null

  return (
    <div className="mc-deck">
      {error && <div className="mc-banner">{error}</div>}

      {/* KPIs */}
      <section className="mc-kpis">
        <article className="mc-card mc-kpi">
          <div className="mc-h"><div className="mc-ico"><McIcon name="wallet" /></div><span>المحصل اليوم</span></div>
          <div className="mc-big">{nf(collectedToday)} <small>ر.س</small></div>
          <Delta pct={pctChange(collectedToday, collectedYesterday)} label="مقارنة بالأمس" />
          <svg className="mc-spark" viewBox="0 0 140 60" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="mcSg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4f8dff" stopOpacity=".45" /><stop offset="1" stopColor="#4f8dff" stopOpacity="0" /></linearGradient></defs>
            {(() => {
              const mx = Math.max(1, ...spark)
              const pts = spark.map((v, i) => `${(i * 140) / 6},${54 - (v / mx) * 46}`)
              return <><path d={`M${pts.join(' L')} L140 60 L0 60Z`} fill="url(#mcSg)" /><path d={`M${pts.join(' L')}`} fill="none" stroke="#5b8cff" strokeWidth="2" /></>
            })()}
          </svg>
        </article>

        <article className="mc-card mc-kpi">
          <div className="mc-h"><div className="mc-ico"><McIcon name="target" /></div><span>الهدف الشهري</span></div>
          <div className="mc-kg">
            <div className="mc-ring">
              <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="40" fill="none" stroke="rgba(80,120,255,.16)" strokeWidth="9" /><circle cx="48" cy="48" r="40" fill="none" stroke="#3b73ff" strokeWidth="9" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset={251.3 * (1 - (progress ?? 0) / 100)} transform="rotate(-90 48 48)" /></svg>
              <b>{progress === null ? '—' : `${progress}%`}</b>
            </div>
            <div>
              <div className="mc-big" style={{ margin: 0, fontSize: 28 }}>{nf(collectedMonth)} <small>ر.س</small></div>
              {goalEdit ? (
                <div className="mc-addrow" style={{ margin: '6px 0 0' }}>
                  <input type="number" min={1} value={goalInput} onChange={e => setGoalInput(e.target.value)} aria-label="الهدف الشهري بالريال" autoFocus />
                  <button onClick={saveGoal}>حفظ</button>
                </div>
              ) : goal ? (
                <div className="mc-delta">من {sar(goal)} · <button className="mc-linkbtn" onClick={() => { setGoalInput(String(goal)); setGoalEdit(true) }}>تعديل</button></div>
              ) : (
                <div className="mc-delta"><button className="mc-linkbtn" onClick={() => { setGoalInput(''); setGoalEdit(true) }}>حدد هدف الشهر</button></div>
              )}
            </div>
          </div>
          <div className="mc-dots" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ opacity: i < Math.round(((progress ?? 0) / 100) * 12) ? 1 : 0.2 }} />)}</div>
        </article>

        <article className="mc-card mc-kpi mc-hot">
          <div className="mc-h"><div className="mc-ico"><McIcon name="hand" /></div><span>الصفقات المغلقة</span></div>
          <div className="mc-big">{nf(wonMonth)}</div>
          <button className="mc-pillbtn" onClick={() => navigate('/admin/pipeline')}>عرض التفاصيل <McIcon name="arrow" size={14} /></button>
          <Delta pct={pctChange(won7, wonPrev7)} label="مقارنة بالأسبوع الماضي" />
          <Bars values={wonDays} />
        </article>

        <article className="mc-card mc-kpi">
          <div className="mc-h"><div className="mc-ico"><McIcon name="users" /></div><span>العملاء المهتمون</span></div>
          <div className="mc-big">{nf(interested.length)}</div>
          <Delta pct={pctChange(int7, intPrev7)} label="مقارنة بالأسبوع الماضي" />
          <Bars values={interestedDays} violet />
        </article>
      </section>

      {/* tasks + Jarvis */}
      <section className="mc-g2">
        <article className="mc-card">
          <div className="mc-ph"><h3>مهام اليوم</h3><div className="mc-sub"><span className="mc-live mc-off" />Todoist غير متصل</div></div>
          {visibleTasks.length === 0 && <div className="mc-flat">لا توجد مهام لليوم.</div>}
          {visibleTasks.map(t => (
            <div key={t.id} className={`mc-task ${t.done ? 'mc-done' : ''}`}>
              <button className="mc-cb" onClick={() => toggleTask(t)} aria-label={t.done ? 'إلغاء الإكمال' : 'إكمال المهمة'} aria-pressed={t.done}>{t.done && <McIcon name="check" size={12} />}</button>
              <span className="mc-tt">{t.title}</span>
              <span className="mc-pr" style={{ color: PRIORITY[t.priority].color }}><McIcon name="flag" size={16} />{PRIORITY[t.priority].label}</span>
              <span className="mc-tm">{t.due_at ? timeShort(t.due_at) : ''}</span>
            </div>
          ))}
          {adding ? (
            <div className="mc-addrow">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask() }} placeholder="عنوان المهمة" aria-label="عنوان المهمة" autoFocus />
              <button onClick={addTask}>إضافة</button>
            </div>
          ) : (
            <button className="mc-addbtn" onClick={() => setAdding(true)}><McIcon name="plus" size={16} />إضافة مهمة جديدة</button>
          )}
        </article>

        <article className="mc-card mc-jarvis">
          <div className="mc-tiles">
            {brief.actions.length === 0 && <div className="mc-tile"><div className="mc-ico"><McIcon name="check" /></div><div><b>لا إجراءات مقترحة</b><small>{loading ? 'جاري التحميل…' : 'كل شيء تحت السيطرة الآن'}</small></div></div>}
            {brief.actions.map(a => (
              <button key={a.id} className="mc-tile" onClick={() => navigate(a.to)}>
                <div className="mc-ico"><McIcon name={TILE_ICON[a.id] ?? 'doc'} /></div>
                <div><b>{a.title}</b><small>{a.reason}</small></div>
              </button>
            ))}
          </div>
          <div className="mc-jt">
            <h2>جارفيس</h2><h4>أولوياتك اليوم</h4>
            <p>{brief.summary}</p>
            <button className="mc-go" onClick={() => navigate(brief.actions[0]?.to ?? '/admin/outreach')}><McIcon name="arrow" size={16} />أبدأ يومي</button>
          </div>
          <div className="mc-orbwrap"><div className="mc-orb" aria-hidden="true"><span className="mc-r mc-r3" /><span className="mc-core" /><span className="mc-r mc-r1" /><span className="mc-r mc-r2" /></div></div>
        </article>
      </section>

      {/* actions + chart */}
      <section className="mc-g2">
        <article className="mc-card">
          <div className="mc-ph"><h3>إجراءات تحتاجك</h3>{shownActions.length > 0 && <span className="mc-badge3">{nf(actions.length)}</span>}</div>
          {shownActions.length === 0 && <div className="mc-flat">لا توجد إجراءات معلّقة.</div>}
          {shownActions.map(a => (
            <button key={a.id} className="mc-act" onClick={() => navigate(a.to)}>
              <div className="mc-ico"><McIcon name={a.icon} /></div>
              <div className="mc-m"><b>{a.title}</b><small>{a.sub}</small></div>
              <span className={`mc-st mc-${a.tone}`}>{a.chip}</span>
              <McIcon name="chev" size={16} />
            </button>
          ))}
        </article>

        <article className="mc-card">
          <div className="mc-ph">
            <h3>المبيعات والتحصيل</h3>
            <div className="mc-phr">
              <span className="mc-sub"><i className="mc-dotv" />الفترة السابقة</span>
              <div className="mc-tabs" role="tablist" aria-label="الفترة">
                {([['month', 'شهر'], ['week', 'أسبوع'], ['day', 'يوم']] as const).map(([k, l]) => (
                  <button key={k} role="tab" aria-selected={period === k} className={period === k ? 'mc-on' : ''} onClick={() => { setPeriod(k); setHover(null) }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mc-chartbox">
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="رسم التحصيل المؤكد مقابل الفترة السابقة">
              <defs>
                <linearGradient id="mcA1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f6bff" stopOpacity=".5" /><stop offset="1" stopColor="#2f6bff" stopOpacity="0" /></linearGradient>
                <linearGradient id="mcA2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".3" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map(i => {
                const v = (niceMax * i) / 4, y = Y(v)
                return <g key={i}><line className="mc-gridline" x1={PL} x2={W} y1={y} y2={y} /><text className="mc-axis" x={PL - 8} y={y + 4} textAnchor="end" fontSize="12">{nf(v)}</text></g>
              })}
              {series.map((s, i) => <text key={i} className="mc-axis" x={X(i)} y={H - 8} textAnchor="middle" fontSize="12">{label(s)}</text>)}
              <path d={area('previous')} fill="url(#mcA2)" /><path d={path('previous')} fill="none" stroke="#8b5cf6" strokeWidth="2.2" />
              <path d={area('current')} fill="url(#mcA1)" /><path d={path('current')} fill="none" stroke="#4f86ff" strokeWidth="2.4" />
              {series.map((s, i) => <circle key={i} cx={X(i)} cy={Y(s.current)} r="3.5" fill="#4f86ff" />)}
              {hover !== null && <><line x1={X(hover)} x2={X(hover)} y1="16" y2={H - PB} stroke="#4f86ff" strokeDasharray="4 4" /><circle cx={X(hover)} cy={Y(series[hover].current)} r="6" className="mc-dotfill" stroke="#7aa2ff" strokeWidth="2.5" /></>}
              <rect x="0" y="0" width={W} height={H} fill="transparent"
                onMouseMove={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - r.left) / r.width) * W
                  let best = 0, bd = 1e9
                  series.forEach((_, i) => { const d = Math.abs(X(i) - x); if (d < bd) { bd = d; best = i } })
                  setHover(best)
                }}
                onMouseLeave={() => setHover(null)} />
            </svg>
            {chartEmpty && <div className="mc-chartnote">لا يوجد تحصيل مؤكد في هذه الفترة. تظهر هنا الدفعات بعد تأكيدها من «المالية».</div>}
            {hv && hover !== null && (
              <div className="mc-tip" style={{ display: 'block', left: `${Math.max(0, Math.min(78, (X(hover) / W) * 100 - 8))}%`, top: 8 }}>
                <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>المحصل · {label(hv)}</div>
                <b>ر.س {nf(hv.current)}</b>
                <div style={{ color: 'var(--ink-3)', fontSize: 11.5 }}>الفترة السابقة: {nf(hv.previous)}</div>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* four small panels */}
      <section className="mc-g4">
        <article className="mc-card">
          <div className="mc-ph mc-sm"><h3><McIcon name="news" size={20} />أخبار AI</h3></div>
          <div className="mc-news"><div className="mc-ico"><McIcon name="doc" /></div><div><b>لا يوجد مصدر مضبوط</b><small>لن تُعرض أخبار بلا رابط وتاريخ نشر. يحتاج تحديد مصادر موثقة.</small></div></div>
        </article>

        <article className="mc-card">
          <div className="mc-ph mc-sm"><h3><McIcon name="cal" size={20} />تقويم اليوم</h3><button className="mc-linkbtn" onClick={() => navigate('/admin/outreach')}>عرض الكل</button></div>
          {pulse.meetingsToday.length === 0 && <div className="mc-flat">لا توجد اجتماعات اليوم.</div>}
          {pulse.meetingsToday.map(m => (
            <div key={m.id} className="mc-ev">
              <span className="mc-tm">{m.meeting_at ? timeShort(m.meeting_at) : ''}</span><span className="mc-bar" />
              <div><b>{m.name}</b><small><McIcon name="vid" size={14} />اجتماع تعريفي</small></div>
            </div>
          ))}
        </article>

        <article className="mc-card">
          <div className="mc-ph mc-sm"><h3><McIcon name="target" size={20} />العملاء الأقرب للإغلاق</h3></div>
          {closest.length === 0 && <div className="mc-flat">لا توجد صفقات مؤهلة بعد.</div>}
          {closest.map(d => (
            <div key={d.id} className="mc-cl">
              <div className="mc-ph2"><McIcon name="building" size={20} /></div>
              <div className="mc-m"><b>{d.company_name}</b><small>{d.next_step || d.service || d.campaign || 'بلا خطوة قادمة'}</small></div>
              <span className={`mc-st ${d.stage === 'awaiting_payment' ? 'mc-g' : d.stage === 'negotiation' ? 'mc-a' : 'mc-b'}`}>{STAGE_LABEL[d.stage as DealStage]}</span>
            </div>
          ))}
        </article>

        <article className="mc-card">
          <div className="mc-ph mc-sm"><h3><McIcon name="users" size={20} />فريق مبيعات AI</h3></div>
          {['01', '02', '03'].map(k => (
            <div key={k} className="mc-agent">
              <div className="mc-rb"><McIcon name="bot" size={20} /></div>
              <div className="mc-n">{k} إيجنت</div>
              <span className="mc-st mc-n2">غير مفعّل</span>
              <div className="mc-pb"><i style={{ width: '0%' }} /></div>
              <span className="mc-pct">0%</span>
            </div>
          ))}
        </article>
      </section>
    </div>
  )
}
