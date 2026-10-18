import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NumberFlow from '@number-flow/react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'
import { useAdminPulse } from './adminPulse'
import { Icon } from './PlasmaAdminShell'
import type { Deal } from '../../../lib/deals'
import { STAGE_LABEL, isClosed, stageRank, type DealStage } from '../../../lib/dealStages'
import { buildBrief } from '../../../lib/jarvis'
import { dateLong, dateShort, greetingFor, monthKey, nf, riyadhDayStart, sar, timeShort } from '../../../lib/format'

interface Check { key: string; label: string; status: 'not_configured' | 'unchecked' | 'ok' | 'degraded' | 'failed'; detail: string; latency_ms: number | null; last_checked_at: string | null }
interface Goal { id: string; target: number }
interface ActivityRow { created_at: string; last_contacted_at: string | null }
type Period = 'day' | 'week' | 'month'

const CHECK_BADGE: Record<Check['status'], { label: string; badge: string }> = {
  ok: { label: 'متصل', badge: 'green' },
  degraded: { label: 'متدهور', badge: 'amber' },
  failed: { label: 'فشل', badge: 'red' },
  unchecked: { label: 'غير مفحوص', badge: 'amber' },
  not_configured: { label: 'غير مهيأ', badge: 'amber' },
}

const PLAN_VALUE: Record<string, number> = { starter: 299, growth: 799, enterprise: 1999 }
const usageOf = (c: Company) => (c.message_limit ? Math.round(((c.messages_used || 0) / c.message_limit) * 100) : 0)

function buildSeries(rows: ActivityRow[], period: Period) {
  const now = new Date()
  if (period === 'day') {
    const start = riyadhDayStart(now).getTime()
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, added: 0, contacted: 0 }))
    const idx = (iso: string) => Math.floor((new Date(iso).getTime() - start) / 3600000)
    rows.forEach(r => {
      const a = idx(r.created_at); if (a >= 0 && a < 24) hours[a].added++
      if (r.last_contacted_at) { const c = idx(r.last_contacted_at); if (c >= 0 && c < 24) hours[c].contacted++ }
    })
    return hours.slice(0, Math.max(6, Math.floor((now.getTime() - start) / 3600000) + 1))
  }
  const days = period === 'week' ? 7 : 30
  const today = riyadhDayStart(now).getTime()
  const buckets = Array.from({ length: days }, (_, i) => {
    const t = today - (days - 1 - i) * 86400000
    return { t, label: dateShort(new Date(t + 3600000)), added: 0, contacted: 0 }
  })
  const idx = (iso: string) => Math.floor((new Date(iso).getTime() - buckets[0].t) / 86400000)
  rows.forEach(r => {
    const a = idx(r.created_at); if (a >= 0 && a < days) buckets[a].added++
    if (r.last_contacted_at) { const c = idx(r.last_contacted_at); if (c >= 0 && c < days) buckets[c].contacted++ }
  })
  return buckets
}

export const AdminCommandDeck = () => {
  const navigate = useNavigate()
  const pulse = useAdminPulse()
  const [deals, setDeals] = useState<Deal[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [period, setPeriod] = useState<Period>('week')
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [editGoal, setEditGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    pulse.reload()
    const since = new Date(Date.now() - 31 * 86400000).toISOString()
    const [d, c, k, g, a] = await Promise.all([
      supabase.from('deals').select('*').limit(1000),
      supabase.from('companies').select('*'),
      supabase.from('integration_checks').select('*').order('key'),
      supabase.from('agency_goals').select('id, target').eq('period', monthKey()).eq('kind', 'collections').maybeSingle(),
      supabase.from('outreach_leads').select('created_at, last_contacted_at').or(`created_at.gte.${since},last_contacted_at.gte.${since}`).limit(5000),
    ])
    const failed = [d, c, k].some(r => r.error)
    setLoadError(failed ? 'تعذّر تحميل جزء من البيانات. الأرقام المعروضة قد تكون ناقصة.' : null)
    setDeals((d.data ?? []) as Deal[])
    setCompanies((c.data ?? []) as Company[])
    setChecks((k.data ?? []) as Check[])
    setGoal((g.data ?? null) as Goal | null)
    setActivity((a.data ?? []) as ActivityRow[])
    setLoading(false)
  }, [pulse.reload])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  const runChecks = async () => {
    setChecking(true)
    await supabase.functions.invoke('integration-health', { body: {} })
    const { data } = await supabase.from('integration_checks').select('*').order('key')
    setChecks((data ?? []) as Check[])
    setChecking(false)
  }

  const saveGoal = async () => {
    const target = Number(goalInput)
    if (!Number.isFinite(target) || target < 0) return
    const { data } = await supabase.from('agency_goals')
      .upsert({ period: monthKey(), kind: 'collections', target, updated_at: new Date().toISOString() }, { onConflict: 'period,kind' })
      .select('id, target').single()
    if (data) setGoal(data as Goal)
    setEditGoal(false)
  }

  const open = useMemo(() => deals.filter(d => !isClosed(d.stage)), [deals])
  const monthStart = useMemo(() => new Date(`${monthKey()}-01T00:00:00+03:00`), [])
  const wonThisMonth = deals.filter(d => d.stage === 'won' && d.closed_at && new Date(d.closed_at) >= monthStart).length
  const qualified = deals.filter(d => ['qualified', 'offer_sent', 'negotiation', 'awaiting_payment'].includes(d.stage)).length
  const noNextStep = open.filter(d => !d.next_step && !d.next_step_at).length
  const closest = useMemo(
    () => open.filter(d => stageRank(d.stage) >= stageRank('qualified'))
      .sort((a, b) => stageRank(b.stage) - stageRank(a.stage) || (b.last_contact_at ?? '').localeCompare(a.last_contact_at ?? '')).slice(0, 5),
    [open],
  )

  const real = companies.filter(c => !(c as Company & { is_demo?: boolean }).is_demo)
  const demoCount = companies.length - real.length
  const mrr = real.reduce((s, c) => s + (PLAN_VALUE[c.plan] ?? 0), 0)
  const nearLimit = real.filter(c => usageOf(c) >= 80).length

  const failing = checks.filter(c => c.status === 'failed' || c.status === 'degraded').map(c => c.label)
  const overdue = pulse.due.filter(l => l.next_follow_up && new Date(l.next_follow_up) < riyadhDayStart()).length
  const brief = buildBrief({
    dueToday: pulse.due.length - overdue, overdue, meetingsToday: pulse.meetingsToday.length, waitingFirstContact: pulse.waiting,
    dealsWithoutNextStep: noNextStep, qualifiedDeals: qualified, activeDeals: open.length, hasMonthlyGoal: !!goal, integrationsFailing: failing,
  })
  const series = useMemo(() => buildSeries(activity, period), [activity, period])
  const now = new Date()

  const dealReason = (d: Deal) => `${STAGE_LABEL[d.stage as DealStage]}${d.next_step ? ` · ${d.next_step}` : ' · بلا خطوة قادمة'}`

  return (
    <div className="page fade-in cd">
      <div className="cd-hero">
        <div>
          <div className="cd-date">{dateLong(now)}</div>
          <h2>{greetingFor(Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Riyadh' }).format(now)))}، جاسم</h2>
        </div>
        <div className="cd-hero-actions">
          <button className="btn btn-primary cd-cta" onClick={() => navigate('/admin/outreach')}><Icon id="plus" size={16} /> جيب عملاء</button>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'تحديث…' : 'تحديث'}</button>
        </div>
      </div>

      {loadError && <div className="card card-pad cd-warn">{loadError}</div>}

      {/* KPIs: every number below is read from a table, or says why it is not available */}
      <div className="cd-kpis">
        <div className="cd-kpi static">
          <span>المحصل هذا الشهر</span>
          <b className="cd-na">غير مفعّل</b>
          <small>لا يوجد سجل دفعات بعد. يبدأ مع المرحلة 3 (التحصيل المؤكد).</small>
        </div>
        <div className="cd-kpi static">
          <span>الهدف الشهري</span>
          {editGoal ? (
            <div className="cd-goal-edit">
              <input type="number" min={0} value={goalInput} onChange={e => setGoalInput(e.target.value)} aria-label="الهدف الشهري بالريال" autoFocus />
              <button className="btn btn-primary" onClick={saveGoal}>حفظ</button>
            </div>
          ) : goal ? (
            <><b className="num">{sar(goal.target)}</b><button className="cd-link" onClick={() => { setGoalInput(String(goal.target)); setEditGoal(true) }}>تعديل الهدف</button></>
          ) : (
            <><b className="cd-na">لم يُحدد</b><button className="cd-link" onClick={() => { setGoalInput(''); setEditGoal(true) }}>حدد الهدف</button></>
          )}
        </div>
        <button className="cd-kpi" onClick={() => navigate('/admin/pipeline')}>
          <span>صفقات مغلقة هذا الشهر</span><b className="num"><NumberFlow value={wonThisMonth} locales="en-US" /></b>
        </button>
        <button className="cd-kpi" onClick={() => navigate('/admin/pipeline')}>
          <span>عملاء مؤهلون (مؤهل فما فوق)</span><b className="num"><NumberFlow value={qualified} locales="en-US" /></b>
        </button>
      </div>

      <div className="cd-grid">
        {/* Jarvis */}
        <section className={`card cd-jarvis tone-${brief.tone}`}>
          <div className="cd-orb" aria-hidden="true"><i /><i /><i /></div>
          <div className="cd-jarvis-body">
            <div className="cd-jarvis-title">جارفيس <small>ملخص من بياناتك الفعلية</small></div>
            <p>{brief.summary}</p>
            <div className="cd-actions">
              {brief.actions.length === 0 && <div className="cd-empty">لا توجد إجراءات مقترحة الآن.</div>}
              {brief.actions.map((a, i) => (
                <Link key={a.id} to={a.to} className="cd-action">
                  <span className="cd-action-n">{i + 1}</span>
                  <span><b>{a.title}</b><small>{a.reason}</small></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Today tasks (Todoist) */}
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>مهام اليوم</h3><small>مزامنة Todoist</small></div><span className="badge amber">غير مهيأ</span></div>
          <div className="cd-empty">لم يُربط Todoist بعد. يحتاج توكن الحساب والمشروع الذي تختاره، ثم تظهر هنا مهامك وتتزامن في الاتجاهين.</div>
        </section>
      </div>

      <div className="cd-grid">
        {/* Activity chart */}
        <section className="card card-pad cd-panel">
          <div className="cd-head">
            <div><h3>نشاط العملاء</h3><small>المصدر: outreach_leads (تاريخ الإضافة وآخر تواصل)</small></div>
            <div className="cd-seg" role="tablist" aria-label="الفترة">
              {([['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={period === k} className={period === k ? 'on' : ''} onClick={() => setPeriod(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 220, direction: 'ltr' }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAdd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f8dff" stopOpacity={0.45} /><stop offset="100%" stopColor="#4f8dff" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gCon" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b7bff" stopOpacity={0.4} /><stop offset="100%" stopColor="#9b7bff" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#8794b3', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#8794b3', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0b1530', border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, direction: 'rtl' }} labelStyle={{ color: '#e8eefc' }}
                  formatter={(v: number, name: string) => [nf(v), name === 'added' ? 'عملاء أُضيفوا' : 'تواصل']} />
                <Area type="monotone" dataKey="added" stroke="#4f8dff" strokeWidth={2} fill="url(#gAdd)" activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="contacted" stroke="#9b7bff" strokeWidth={2} fill="url(#gCon)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="cd-legend"><span><i style={{ background: '#4f8dff' }} />عملاء أُضيفوا</span><span><i style={{ background: '#9b7bff' }} />تواصل</span></div>
        </section>

        {/* Needs the owner */}
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>إجراءات تحتاجك</h3><small>متابعات واجتماعات اليوم</small></div><Link to="/admin/outreach" className="cd-link">الكل ←</Link></div>
          {pulse.meetingsToday.map(m => (
            <div key={m.id} className="cd-row meet">
              <div className="cd-time">{m.meeting_at ? timeShort(m.meeting_at) : ''}</div>
              <div className="cd-main"><b>{m.name}</b><small>اجتماع اليوم</small></div>
              <a className="cd-ic call" href={`tel:+${m.phone}`} aria-label={`اتصل بـ ${m.name}`}><Icon id="phone" size={16} /></a>
            </div>
          ))}
          {pulse.due.slice(0, 5).map(l => (
            <div key={l.id} className="cd-row">
              <div className={`cd-dot ${l.next_follow_up && new Date(l.next_follow_up) < riyadhDayStart() ? 'late' : ''}`} />
              <div className="cd-main"><b>{l.name}</b><small>متابعة {l.next_follow_up ? dateShort(l.next_follow_up) : ''}</small></div>
              <div className="cd-contact">
                <a className="cd-ic call" href={`tel:+${l.phone}`} aria-label={`اتصل بـ ${l.name}`}><Icon id="phone" size={16} /></a>
                {l.is_mobile && <a className="cd-ic wa" href={`https://wa.me/${l.phone}`} target="_blank" rel="noreferrer">واتساب</a>}
              </div>
            </div>
          ))}
          {pulse.due.length === 0 && pulse.meetingsToday.length === 0 && <div className="cd-empty">لا يوجد شيء معلّق.</div>}
        </section>

      </div>

      <div className="cd-grid4">
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>فريق مبيعات AI</h3><small>أداء الإيجنتات</small></div><span className="badge amber">لم يبدأ</span></div>
          <div className="cd-empty">لا يوجد إيجنت بيع يعمل بعد. المرحلة 2: إيجنت واحد وتجربة على 5 شركات قبل أي توسع.</div>
        </section>
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>الأقرب للإغلاق</h3><small>صفقات من مرحلة «مؤهل» فما فوق</small></div><Link to="/admin/pipeline" className="cd-link">الصفقات ←</Link></div>
          {loading ? <div className="cd-empty">جاري التحميل…</div> : closest.length === 0 ? (
            <div className="cd-empty">لا توجد صفقات مؤهلة بعد.</div>
          ) : closest.map(d => (
            <div key={d.id} className="cd-row">
              <div className="cd-main"><b>{d.company_name}</b><small>{dealReason(d)}</small></div>
              <span className={`badge ${d.stage === 'awaiting_payment' ? 'green' : 'violet'}`}>{STAGE_LABEL[d.stage as DealStage]}</span>
            </div>
          ))}
        </section>
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>تقويم اليوم</h3><small>الاجتماعات المؤكدة</small></div><Link to="/admin/outreach" className="cd-link">عرض الكل ←</Link></div>
          {pulse.meetingsToday.length === 0 ? <div className="cd-empty">لا توجد اجتماعات اليوم.</div> : pulse.meetingsToday.map(m => (
            <div key={m.id} className="cd-row">
              <div className="cd-time">{m.meeting_at ? timeShort(m.meeting_at) : ''}</div>
              <div className="cd-main"><b>{m.name}</b><small>اجتماع تعريفي</small></div>
            </div>
          ))}
        </section>
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>أخبار AI</h3><small>مصادر موثقة بروابط وتواريخ</small></div><span className="badge amber">غير مهيأ</span></div>
          <div className="cd-empty">لا يوجد مصدر أخبار مضبوط. لن تُعرض أخبار بلا رابط وتاريخ نشر.</div>
        </section>
      </div>

      <div className="cd-grid">
        {/* Integration health */}
        <section className="card card-pad cd-panel">
          <div className="cd-head">
            <div><h3>صحة التكاملات</h3><small>فحوص فعلية مع وقت آخر تحقق</small></div>
            <button className="btn btn-ghost" onClick={runChecks} disabled={checking}>{checking ? 'جاري الفحص…' : 'افحص الآن'}</button>
          </div>
          {checks.length === 0 ? <div className="cd-empty">لم يُجرَ أي فحص بعد. اضغط «افحص الآن».</div> : checks.map(c => {
            const st = CHECK_BADGE[c.status]
            return (
              <div key={c.key} className="cd-row">
                <div className={`cd-dot ${c.status === 'ok' ? 'ok' : c.status === 'failed' ? 'late' : 'warn'}`} />
                <div className="cd-main"><b>{c.label}</b><small>{c.detail}{c.last_checked_at ? ` · ${dateShort(c.last_checked_at)} ${timeShort(c.last_checked_at)}` : ''}</small></div>
                <span className={`badge ${st.badge}`}>{st.label}</span>
              </div>
            )
          })}
        </section>

        {/* Business + not configured modules */}
        <section className="card card-pad cd-panel">
          <div className="cd-head"><div><h3>الأعمال</h3><small>العملاء التجريبيون مستبعدون من الأرقام المالية</small></div><Link to="/admin/companies" className="cd-link">الشركات ←</Link></div>
          <div className="cd-mini">
            <div><b className="num">{nf(real.length)}</b><span>عملاء حقيقيون</span></div>
            <div><b className="num">{nf(demoCount)}</b><span>شركات تجريبية</span></div>
            <div><b className="num">{real.length ? sar(mrr) : '—'}</b><span>إيراد شهري متوقع (تقديري)</span></div>
            <div><b className="num">{nf(nearLimit)}</b><span>قريبة من حد الرسائل</span></div>
          </div>
          {real.length === 0 && <div className="cd-empty">لا يوجد عملاء حقيقيون بعد، فلا أرقام مالية لتعرض.</div>}
        </section>
      </div>
    </div>
  )
}
