import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Megaphone, Plus, Send, Pause, Play, Copy, Trash2, ChevronRight, ChevronLeft, Route, CalendarDays, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useConversationData } from '@/lib/queries/conversations'
import { fillTemplate, useWaTemplates, type WaTemplate } from '@/lib/queries/outreach'
import { segmentMembers, useContacts, useSegments } from '@/lib/queries/segments'
import { deleteCampaign, runCampaignNow, saveCampaign, seedDemoCampaigns, setCampaignStatus, useCampaigns } from '@/lib/queries/campaigns'
import {
  campaignStats, dedupeRecipients, parseTyped, sendsPerDay, stepParams, STATUS_LABELS,
  type Campaign, type CampaignStats, type CampaignStep, type CampaignStatus,
} from '@/lib/campaigns'
import { normalizePhone } from '@/lib/callAnalysis'
import { Badge, Button, Card, Dialog, type BadgeTone } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, Seg, Kpi, fmtNum } from './shared/night'
import { fmtFull, fmtWhen } from './conversations/model'
import './growth.css'

const STATUS_TONE: Record<CampaignStatus, BadgeTone> = { draft: 'neutral', scheduled: 'brand', running: 'warning', paused: 'neutral', done: 'success', cancelled: 'danger' }
type Tab = 'list' | 'calendar' | 'analytics'

/** Campaigns: a 5-step wizard, the list with results, a calendar and analytics. */
export function DashboardV2Campaigns() {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const [params, setParams] = useSearchParams()
  const { campaigns, messages, available, loading } = useCampaigns(companyId, isDemo)
  const { templates } = useWaTemplates(companyId, isDemo)
  const { segments } = useSegments(companyId, isDemo)
  const { contacts } = useContacts(companyId, isDemo)
  const { calls } = useConversationData(companyId, isDemo)
  const [tab, setTab] = useState<Tab>('list')
  const [wizard, setWizard] = useState<WizardInit | null>(null)
  const [detail, setDetail] = useState<Campaign | null>(null)

  useEffect(() => { if (isDemo) seedDemoCampaigns(contacts) }, [isDemo, contacts])

  // ?new=1&segment=<id> from the segments page opens the wizard with that segment chosen.
  useEffect(() => {
    if (params.get('new') !== '1') return
    const seg = params.get('segment')
    setWizard({ segment_ids: seg ? [seg] : [] })
    params.delete('new'); params.delete('segment'); setParams(params, { replace: true })
  }, [params, setParams])

  // When each person wrote to us, for counting replies.
  const contactTimes = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const c of calls || []) {
      const p = normalizePhone(c.phone)
      if (!p) continue
      const list = m.get(p)
      if (list) list.push(c.call_time); else m.set(p, [c.call_time])
    }
    return m
  }, [calls])
  const stats = useMemo(() => new Map(campaigns.map((c) => [c.id, campaignStats(c, messages, contactTimes)])), [campaigns, messages, contactTimes])

  async function act(c: Campaign, what: 'pause' | 'resume' | 'cancel' | 'delete' | 'now') {
    try {
      if (what === 'pause') await setCampaignStatus(companyId, isDemo, c.id, 'paused')
      if (what === 'resume') await setCampaignStatus(companyId, isDemo, c.id, 'running')
      if (what === 'cancel') { if (!window.confirm(`إلغاء «${c.name}»؟ اللي انرسل ما يرجع، والباقي ما ينرسل.`)) return; await setCampaignStatus(companyId, isDemo, c.id, 'cancelled') }
      if (what === 'delete') { await deleteCampaign(companyId, isDemo, c.id) }
      if (what === 'now') {
        const r = await runCampaignNow(isDemo, c.id)
        pushToast({ kind: 'success', title: `انرسلت ${fmtNum(r.sent)} رسالة`, description: isDemo ? 'عرض تجريبي: ما انرسل شيء فعليًا.' : r.failed ? `${fmtNum(r.failed)} ما وصلت` : undefined })
      }
    } catch (e) { pushToast({ kind: 'danger', title: 'ما تم', description: e instanceof Error ? e.message : undefined }) }
  }

  return (
    <NightPage>
      <PageHead
        title="الحملات"
        sub="أرسل قوالب واتساب المعتمدة لشرائح عملائك مرة وحدة أو على مراحل، وتابع مين رد"
        actions={available ? <Button onClick={() => setWizard({ segment_ids: [] })}><Plus size={14} /> حملة جديدة</Button> : undefined}
      />

      {!available && <Card style={{ padding: 16 }}><div className="np-empty">الحملات تتفعّل بعد تحديث قاعدة البيانات.</div></Card>}

      {available && (
        <>
          <div style={{ marginBottom: 14 }}>
            <Seg label="عرض الحملات" value={tab} onChange={setTab} options={[['list', 'الحملات'], ['calendar', 'التقويم'], ['analytics', 'التحليلات']] as const} />
          </div>

          {tab === 'list' && (
            <Card style={{ padding: 0 }}>
              {campaigns.length === 0 && !loading ? (
                <div style={{ padding: 20 }}>
                  <EmptyState icon={<Megaphone size={20} />} title="ما سويت حملة بعد" description="اختر شريحة وقالب معتمد، وحدد متى ترسل." />
                </div>
              ) : (
                <div className="np-table-wrap">
                  <table className="np-table" style={{ minWidth: 820 }}>
                    <thead><tr><th>الحملة</th><th>الحالة</th><th>الجمهور</th><th>انرسلت</th><th>ردوا</th><th>الموعد</th><th /></tr></thead>
                    <tbody>
                      {campaigns.map((c) => {
                        const s = stats.get(c.id)!
                        const sent = s.steps.reduce((n, x) => n + x.sent, 0)
                        return (
                          <tr key={c.id} className="clickable" onClick={() => setDetail(c)}>
                            <td className="strong">
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{c.kind === 'journey' ? <Route size={14} /> : <Send size={14} />}{c.name}</span>
                              {c.kind === 'journey' && <small style={{ color: 'var(--text-tertiary)' }}>{fmtNum(c.steps.length)} مراحل</small>}
                            </td>
                            <td><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
                            <td className="np-num">{fmtNum(c.recipients.length)}</td>
                            <td className="np-num">{fmtNum(sent)}{s.steps.some((x) => x.failed) && <small style={{ color: 'var(--bad)' }}> · {fmtNum(s.steps.reduce((n, x) => n + x.failed, 0))} فشلت</small>}</td>
                            <td className="np-num">{s.replyRate == null ? '—' : `${fmtNum(s.replied)} (${s.replyRate}%)`}</td>
                            <td>{c.scheduled_at ? fmtWhen(c.scheduled_at) : '—'}</td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <span className="gr-acts" style={{ flexWrap: 'nowrap' }}>
                                {c.status === 'draft' && <button type="button" className="gr-btn" aria-label="حذف المسودة" onClick={() => void act(c, 'delete')}><Trash2 /></button>}
                                {(c.status === 'scheduled' || c.status === 'running') && <button type="button" className="gr-btn" onClick={() => void act(c, 'pause')}><Pause /> إيقاف</button>}
                                {c.status === 'paused' && <button type="button" className="gr-btn" onClick={() => void act(c, 'resume')}><Play /> استئناف</button>}
                                <button type="button" className="gr-btn" aria-label="نسخ الحملة" title="نسخة جديدة" onClick={() => setWizard({ copyOf: c, segment_ids: c.segment_ids })}><Copy /></button>
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {tab === 'calendar' && <CampaignCalendar campaigns={campaigns} onOpen={setDetail} />}
          {tab === 'analytics' && <CampaignAnalytics campaigns={campaigns} messages={messages} stats={stats} />}
        </>
      )}

      {wizard && (
        <Wizard init={wizard} templates={templates} segments={segments} contacts={contacts}
          onClose={() => setWizard(null)} onTemplates={() => navigate(`${base}/outreach`)}
          onDone={async (id, now) => { setWizard(null); if (now) { const c = { id } as Campaign; await act(c, 'now') } }} />
      )}

      <Dialog open={!!detail} width={760} title={detail?.name || ''} onClose={() => setDetail(null)}>
        {detail && <CampaignDetail c={detail} s={stats.get(detail.id)!} templates={templates} messages={messages}
          onAct={(w) => { void act(detail, w); setDetail(null) }} />}
      </Dialog>
    </NightPage>
  )
}

// ─── wizard ────────────────────────────────────────────────────────────────────

interface WizardInit { segment_ids: string[]; copyOf?: Campaign }
const STEPS = ['الإعداد', 'الجمهور', 'المحتوى', 'الموعد', 'المراجعة'] as const

function Wizard({ init, templates, segments, contacts, onClose, onDone, onTemplates }: {
  init: WizardInit
  templates: WaTemplate[]
  segments: ReturnType<typeof useSegments>['segments']
  contacts: ReturnType<typeof useContacts>['contacts']
  onClose: () => void
  onDone: (id: string, now: boolean) => Promise<void>
  onTemplates: () => void
}) {
  const { companyId, isDemo, userName } = useWorkspace()
  const pushToast = useToast()
  const src = init.copyOf
  const [step, setStep] = useState(0)
  const [name, setName] = useState(src ? `${src.name} (نسخة)` : '')
  const [kind, setKind] = useState<Campaign['kind']>(src?.kind || 'once')
  const [segIds, setSegIds] = useState<string[]>(init.segment_ids)
  const [typed, setTyped] = useState('')
  const [steps, setSteps] = useState<CampaignStep[]>(src?.steps || [{ template_id: '', params: [], delay_days: 0 }])
  const [stopOnReply, setStopOnReply] = useState(src?.stop_on_reply ?? true)
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [at, setAt] = useState(() => { const d = new Date(Date.now() + 86_400_000); d.setMinutes(0, 0, 0); return toLocalInput(d) })
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)

  const recipients = useMemo(() => {
    const fromSegs = segments.filter((s) => segIds.includes(s.id)).flatMap((s) => segmentMembers(s, contacts)).map((c) => ({ phone: c.phone, name: c.name }))
    return dedupeRecipients([...fromSegs, ...parseTyped(typed)])
  }, [segments, segIds, contacts, typed])
  const noPhone = useMemo(() => segments.filter((s) => segIds.includes(s.id)).flatMap((s) => segmentMembers(s, contacts)).filter((c) => !c.phone).length, [segments, segIds, contacts])

  const tplOf = (id: string) => templates.find((t) => t.id === id)
  const stepReady = (s: CampaignStep) => { const t = tplOf(s.template_id); return !!t && (t.param_labels || []).every((_, i) => (s.params[i] || '').trim()) }
  const valid = [
    !!name.trim(),
    recipients.length > 0,
    steps.length > 0 && steps.every(stepReady),
    when === 'now' || Date.parse(at) > Date.now(),
    consent,
  ]
  const setStepAt = (i: number, patch: Partial<CampaignStep>) => setSteps((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  async function save(status: CampaignStatus) {
    setBusy(true)
    try {
      const id = await saveCampaign(companyId, isDemo, {
        name, kind, status, segment_ids: segIds, recipients, steps: kind === 'once' ? steps.slice(0, 1) : steps,
        stop_on_reply: kind === 'journey' && stopOnReply,
        scheduled_at: status === 'draft' ? null : when === 'now' ? new Date().toISOString() : new Date(at).toISOString(),
        created_by_name: userName || null,
      })
      pushToast({ kind: 'success', title: status === 'draft' ? 'انحفظت كمسودة' : when === 'now' ? 'بدأ الإرسال' : 'انجدولت الحملة' })
      await onDone(id, status !== 'draft' && when === 'now')
    } catch (e) {
      pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined })
    } finally { setBusy(false) }
  }

  const firstTpl = tplOf(steps[0]?.template_id)
  return (
    <Dialog open width={860} title={src ? 'نسخة من حملة' : 'حملة جديدة'} onClose={onClose}>
      <nav className="gr-steps" aria-label="مراحل الحملة">
        {STEPS.map((l, i) => (
          <button key={l} type="button" className={`gr-step${i < step ? ' done' : ''}`} aria-current={i === step ? 'step' : undefined}
            disabled={i > step && !valid.slice(0, i).every(Boolean)} onClick={() => setStep(i)}>
            <i>{i < step ? '✓' : i + 1}</i>{l}
          </button>
        ))}
      </nav>

      <div className="gr-body">
        {step === 0 && (
          <>
            <label className="gr-field"><span>اسم الحملة (داخلي)</span><input className="gr-in" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: عرض رمضان للعملاء العائدين" /></label>
            <label className="gr-opt"><input type="radio" name="kind" checked={kind === 'once'} onChange={() => setKind('once')} />
              <span><b>رسالة وحدة</b><small>قالب واحد يوصل للكل مرة وحدة، الآن أو بموعد تحدده.</small></span></label>
            <label className="gr-opt"><input type="radio" name="kind" checked={kind === 'journey'} onChange={() => { setKind('journey'); if (steps.length < 2) setSteps((s) => [...s, { template_id: '', params: [], delay_days: 3 }]) }} />
              <span><b>رحلة عميل</b><small>عدة رسائل متتابعة بينها أيام، وتوقف تلقائيًا لمن يرد عليك.</small></span></label>
          </>
        )}

        {step === 1 && (
          <>
            <div className="gr-field"><span>الشرائح</span>
              {segments.length === 0 ? <div className="np-empty">ما عندك شرائح. تقدر تكتب الأرقام تحت، أو تسوي شريحة من صفحة الشرائح.</div> : (
                <div className="gr-chips">
                  {segments.map((s) => (
                    <button key={s.id} type="button" className="gr-chip" aria-pressed={segIds.includes(s.id)}
                      onClick={() => setSegIds((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id]))}>
                      {s.name} · {fmtNum(segmentMembers(s, contacts).length)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="gr-field"><span>أرقام إضافية (رقم في كل سطر، أو: الاسم، الرقم)</span>
              <textarea className="gr-in" rows={3} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={'0501234567\nمحمد، 0551234567'} /></label>
            <div className="gr-sentence">
              الجمهور: <b>{fmtNum(recipients.length)}</b> رقم بعد حذف المكرر{noPhone > 0 && ` · ${fmtNum(noPhone)} عميل بدون رقم ما راح يوصلهم شيء`}.
              الأشخاص يثبتون لحظة الجدولة؛ لو تغيّرت الشريحة بعدها ما يتغير جمهور هذي الحملة.
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {templates.length === 0 && (
              <div className="gr-sentence">ما عندك قوالب مسجلة. <button type="button" className="gr-btn" onClick={onTemplates}>سجّل قالب معتمد من Meta</button></div>
            )}
            {(kind === 'once' ? steps.slice(0, 1) : steps).map((s, i) => {
              const t = tplOf(s.template_id)
              return (
                <div key={i}>
                  {i > 0 && (
                    <div className="gr-wait">
                      بعد <input className="gr-in" type="number" min={1} style={{ width: 70 }} value={s.delay_days} onChange={(e) => setStepAt(i, { delay_days: Math.max(1, Number(e.target.value) || 1) })} /> يوم من الرسالة السابقة
                    </div>
                  )}
                  <div className="gr-jstep">
                    <div className="gr-jstep-head">
                      {kind === 'journey' && <b>الرسالة {i + 1}</b>}
                      <select className="gr-sel" aria-label="القالب" value={s.template_id} onChange={(e) => setStepAt(i, { template_id: e.target.value, params: [] })} style={{ flex: 1, minWidth: 180 }}>
                        <option value="">اختر قالبًا…</option>
                        {templates.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                      {kind === 'journey' && steps.length > 2 && <button type="button" className="gr-x" aria-label="حذف الرسالة" onClick={() => setSteps((l) => l.filter((_, j) => j !== i))}><X size={14} /></button>}
                    </div>
                    {t && (t.param_labels || []).map((l, pi) => (
                      <label key={pi} className="gr-field"><span>{l}</span>
                        <input className="gr-in" value={s.params[pi] || ''} placeholder={pi === 0 ? 'اكتب {name} لاسم كل عميل' : ''}
                          onChange={(e) => { const p = [...s.params]; p[pi] = e.target.value; setStepAt(i, { params: p }) }} /></label>
                    ))}
                    {t && <div className="gr-bubble">{fillTemplate(t.body, stepParams(s, recipients[0]?.name || 'سارة'))}</div>}
                  </div>
                </div>
              )
            })}
            {kind === 'journey' && (
              <>
                <div><button type="button" className="gr-btn" onClick={() => setSteps((l) => [...l, { template_id: '', params: [], delay_days: 3 }])}><Plus /> رسالة ثانية</button></div>
                <label className="gr-opt"><input type="checkbox" checked={stopOnReply} onChange={(e) => setStopOnReply(e.target.checked)} />
                  <span><b>أوقف الرحلة لمن يرد</b><small>إذا كتب لك العميل بعد أي رسالة، ما توصله الرسائل اللي بعدها.</small></span></label>
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <label className="gr-opt"><input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} /><span><b>أرسل الآن</b><small>تبدأ أول ما تأكد.</small></span></label>
            <label className="gr-opt"><input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /><span><b>جدولها</b><small>بتوقيت السعودية.</small></span></label>
            {when === 'later' && <label className="gr-field"><span>الموعد</span><input className="gr-in" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} style={{ maxWidth: 260 }} /></label>}
            {when === 'later' && !valid[3] && <div style={{ color: 'var(--bad)', fontSize: 12.5 }}>اختر وقت في المستقبل.</div>}
          </>
        )}

        {step === 4 && (
          <>
            <dl className="gr-review">
              <dt>الحملة</dt><dd>{name} · {kind === 'once' ? 'رسالة وحدة' : `رحلة من ${fmtNum(steps.length)} رسائل`}</dd>
              <dt>الجمهور</dt><dd>{fmtNum(recipients.length)} رقم{segIds.length > 0 && ` من ${segments.filter((s) => segIds.includes(s.id)).map((s) => s.name).join('، ')}`}</dd>
              <dt>الرسائل</dt><dd>{(kind === 'once' ? steps.slice(0, 1) : steps).map((s, i) => `${i ? `بعد ${s.delay_days} يوم: ` : ''}${tplOf(s.template_id)?.label || ''}`).join(' ← ')}</dd>
              <dt>الموعد</dt><dd>{when === 'now' ? 'الآن' : fmtFull(new Date(at).toISOString())}</dd>
              {kind === 'journey' && <><dt>عند الرد</dt><dd>{stopOnReply ? 'توقف الرحلة له' : 'تكمل الرحلة'}</dd></>}
            </dl>
            {firstTpl && <div className="gr-bubble">{fillTemplate(firstTpl.body, stepParams(steps[0], recipients[0]?.name || ''))}</div>}
            <label className="gr-opt"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span><b>أؤكد إن هؤلاء العملاء وافقوا يستقبلون رسائلنا</b><small>الرسائل تطلع فعليًا من رقم الوكيل ولا يمكن التراجع عنها. الإرسال بدون موافقة يعرّض رقمك للحظر من واتساب.</small></span></label>
          </>
        )}
      </div>

      <div className="gr-foot">
        <span style={{ display: 'flex', gap: 8 }}>
          {step > 0 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)}><ChevronRight size={14} /> السابق</Button>}
          {!!name.trim() && <Button variant="ghost" disabled={busy} onClick={() => void save('draft')}>حفظ كمسودة</Button>}
        </span>
        {step < 4
          ? <Button disabled={!valid[step]} onClick={() => setStep((s) => s + 1)}>التالي <ChevronLeft size={14} /></Button>
          : <Button disabled={!valid.every(Boolean) || busy} onClick={() => void save('scheduled')}><Send size={14} /> {when === 'now' ? 'أرسل الآن' : 'جدول الحملة'}</Button>}
      </div>
    </Dialog>
  )
}

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// ─── detail ────────────────────────────────────────────────────────────────────

function CampaignDetail({ c, s, templates, messages, onAct }: {
  c: Campaign; s: CampaignStats; templates: WaTemplate[]; messages: ReturnType<typeof useCampaigns>['messages']
  onAct: (w: 'pause' | 'resume' | 'cancel' | 'now') => void
}) {
  const byPhone = useMemo(() => {
    const m = new Map<string, Map<number, 'sent' | 'failed'>>()
    for (const x of messages) if (x.campaign_id === c.id) {
      const p = normalizePhone(x.to_phone)
      if (!m.has(p)) m.set(p, new Map())
      m.get(p)!.set(x.step, x.status)
    }
    return m
  }, [messages, c.id])
  return (
    <div className="gr-body">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge>
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>{c.scheduled_at ? `الموعد ${fmtFull(c.scheduled_at)}` : 'بدون موعد'}{c.created_by_name ? ` · سوّاها ${c.created_by_name}` : ''}</span>
        <span className="gr-acts" style={{ marginInlineStart: 'auto' }}>
          {c.status === 'scheduled' && c.scheduled_at && Date.parse(c.scheduled_at) > Date.now() && <button type="button" className="gr-btn" onClick={() => onAct('now')}><Send /> أرسل الآن</button>}
          {(c.status === 'scheduled' || c.status === 'running') && <button type="button" className="gr-btn" onClick={() => onAct('pause')}><Pause /> إيقاف</button>}
          {c.status === 'paused' && <button type="button" className="gr-btn" onClick={() => onAct('resume')}><Play /> استئناف</button>}
          {!['done', 'cancelled', 'draft'].includes(c.status) && <button type="button" className="gr-btn" onClick={() => onAct('cancel')}><X /> إلغاء</button>}
        </span>
      </div>
      <div className="np-kpis">
        <Kpi label="الجمهور" value={fmtNum(s.recipients)} />
        <Kpi label="وصلتهم رسالة" value={fmtNum(s.reached)} hint={s.pending ? `${fmtNum(s.pending)} باقي` : 'ما فيه باقي'} />
        <Kpi label="ردوا" value={s.replyRate == null ? '—' : `${s.replyRate}%`} hint={`${fmtNum(s.replied)} شخص كتب لك بعد الرسالة`} />
        <Kpi label="فشلت" value={fmtNum(s.steps.reduce((n, x) => n + x.failed, 0))} hint="رقم غلط أو واتساب رفض" />
      </div>
      {c.steps.length > 1 && (
        <div>
          <CardTitle>مراحل الرحلة</CardTitle>
          {c.steps.map((st, i) => (
            <div key={i} className="np-usage-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-default)' }}>
              <span>{i + 1}. {templates.find((t) => t.id === st.template_id)?.label || 'قالب'}{i > 0 ? ` · بعد ${st.delay_days} يوم` : ''}</span>
              <b className="np-num">{fmtNum(s.steps[i]?.sent || 0)} انرسلت{s.steps[i]?.failed ? ` · ${fmtNum(s.steps[i].failed)} فشلت` : ''}</b>
            </div>
          ))}
          {c.stop_on_reply && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>اللي يرد ما توصله الرسائل اللي بعدها.</div>}
        </div>
      )}
      <div className="np-table-wrap">
        <table className="np-table" style={{ minWidth: 480 }}>
          <thead><tr><th>العميل</th><th>الرقم</th>{c.steps.map((_, i) => <th key={i}>{c.steps.length > 1 ? `رسالة ${i + 1}` : 'الحالة'}</th>)}</tr></thead>
          <tbody>
            {c.recipients.slice(0, 200).map((r) => {
              const st = byPhone.get(normalizePhone(r.phone))
              return (
                <tr key={r.key}>
                  <td>{r.name || '—'}</td>
                  <td dir="ltr" className="np-num" style={{ textAlign: 'end' }}>{r.phone}</td>
                  {c.steps.map((_, i) => {
                    const v = st?.get(i)
                    return <td key={i}>{v === 'sent' ? <Badge tone="success">انرسلت</Badge> : v === 'failed' ? <Badge tone="danger">فشلت</Badge> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── calendar ──────────────────────────────────────────────────────────────────

const DOW = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
/** Saudi calendar day of an instant. */
const sDay = (iso: string) => new Date(Date.parse(iso) + 3 * 3600_000).toISOString().slice(0, 10)

function CampaignCalendar({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (c: Campaign) => void }) {
  const today = sDay(new Date().toISOString())
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }))
  const first = new Date(Date.UTC(ym.y, ym.m, 1))
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000)
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10))
  const byDay = new Map<string, { c: Campaign; label: string }[]>()
  for (const c of campaigns) {
    if (!c.scheduled_at || c.status === 'cancelled') continue
    // A journey shows each of its messages on the day it is due.
    let offset = 0
    c.steps.forEach((st, i) => {
      offset += i === 0 ? 0 : st.delay_days
      const d = sDay(new Date(Date.parse(c.scheduled_at!) + offset * 86_400_000).toISOString())
      const list = byDay.get(d) || []
      list.push({ c, label: c.steps.length > 1 ? `${c.name} (${i + 1})` : c.name })
      byDay.set(d, list)
    })
  }
  const move = (n: number) => setYm(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() } })
  return (
    <Card>
      <CardTitle aside={<span className="gr-acts"><button type="button" className="gr-btn" aria-label="الشهر السابق" onClick={() => move(-1)}><ChevronRight /></button><button type="button" className="gr-btn" aria-label="الشهر التالي" onClick={() => move(1)}><ChevronLeft /></button></span>}>
        <CalendarDays size={16} /> {MONTHS[ym.m]} {ym.y}
      </CardTitle>
      <div className="gr-cal">
        {DOW.map((d) => <div key={d} className="gr-dow">{d}</div>)}
        {days.map((d) => (
          <div key={d} className={`${Number(d.slice(5, 7)) - 1 !== ym.m ? 'is-out' : ''}${d === today ? ' is-today' : ''}`}>
            <span className="gr-day">{Number(d.slice(8))}</span>
            {(byDay.get(d) || []).map(({ c, label }, i) => (
              <button key={i} type="button" className={`gr-ev${c.status === 'done' ? ' sent' : c.status === 'draft' || c.status === 'paused' ? ' draft' : ''}`} title={label} onClick={() => onOpen(c)}>{label}</button>
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── analytics ─────────────────────────────────────────────────────────────────

function CampaignAnalytics({ campaigns, messages, stats }: { campaigns: Campaign[]; messages: ReturnType<typeof useCampaigns>['messages']; stats: Map<string, CampaignStats> }) {
  const [days, setDays] = useState<number>(30)
  const since = Date.now() - days * 86_400_000
  const recent = messages.filter((m) => Date.parse(m.created_at) >= since)
  const sent = recent.filter((m) => m.status === 'sent').length
  const failed = recent.length - sent
  const all = [...stats.values()]
  const reached = all.reduce((n, s) => n + s.reached, 0)
  const replied = all.reduce((n, s) => n + s.replied, 0)
  const series = sendsPerDay(messages, days)
  const max = Math.max(1, ...series.map((x) => x.sent + x.failed))
  const ranked = campaigns.filter((c) => (stats.get(c.id)?.reached || 0) > 0).sort((a, b) => (stats.get(b.id)!.replyRate || 0) - (stats.get(a.id)!.replyRate || 0))
  return (
    <>
      <Card style={{ marginBottom: 16 }}>
        <CardTitle aside={<Seg label="الفترة" value={days} onChange={setDays} options={[[7, '7 أيام'], [30, '30 يوم'], [90, '90 يوم']] as const} />}>نتائج الحملات</CardTitle>
        <div className="np-kpis">
          <Kpi label="رسائل انرسلت" value={fmtNum(sent)} hint={`خلال آخر ${days} يوم`} />
          <Kpi label="نسبة الفشل" value={recent.length ? `${Math.round((failed / recent.length) * 100)}%` : '—'} hint={`${fmtNum(failed)} رسالة ما وصلت`} />
          <Kpi label="نسبة الرد" value={reached ? `${Math.round((replied / reached) * 100)}%` : '—'} hint={`${fmtNum(replied)} من ${fmtNum(reached)} كتبوا لك بعدها`} />
          <Kpi label="حملات نشطة" value={fmtNum(campaigns.filter((c) => c.status === 'running' || c.status === 'scheduled').length)} hint="مجدولة أو قيد الإرسال" />
        </div>
        <div className="gr-bars" role="img" aria-label="الرسائل المرسلة يوميًا">
          {series.map((x) => (
            <div key={x.day} title={`${x.day}: ${x.sent} انرسلت${x.failed ? `، ${x.failed} فشلت` : ''}`}>
              {x.failed > 0 && <i className="fail" style={{ height: `${(x.failed / max) * 100}%` }} />}
              <i style={{ height: `${(x.sent / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 8, lineHeight: 1.7 }}>
          «الرد» يعني العميل بدأ محادثة معك بعد ما وصلته الرسالة. حالات الوصول والقراءة من واتساب ما تنعرض هنا لأن الرقم مربوط بمنصة الوكيل.
        </div>
      </Card>
      <Card>
        <CardTitle>أفضل الحملات بنسبة الرد</CardTitle>
        {ranked.length === 0 ? <div className="np-empty">ما فيه حملات انرسلت بعد.</div> : (
          <div className="np-table-wrap">
            <table className="np-table" style={{ minWidth: 520 }}>
              <thead><tr><th>الحملة</th><th>وصلت</th><th>ردوا</th><th>نسبة الرد</th></tr></thead>
              <tbody>
                {ranked.map((c) => { const s = stats.get(c.id)!; return (
                  <tr key={c.id}><td className="strong">{c.name}</td><td className="np-num">{fmtNum(s.reached)}</td><td className="np-num">{fmtNum(s.replied)}</td><td className="np-num">{s.replyRate}%</td></tr>
                ) })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
