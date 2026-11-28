import { useEffect, useMemo, useRef, useState } from 'react'
import { DashboardV2Reminders } from './Reminders'
import { ArrowRight, MessageCircle, Pencil, Plus, Trash2, BellRing } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useVoiceRead, agentWrite, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { useWaTemplates, placeholderCount } from '@/lib/queries/outreach'
import { useFollowups, saveFollowup, setFollowupEnabled, deleteFollowup, DEMO_FIELDS, type AgentFields, type Followup } from '@/lib/queries/followups'
import { Button, Card, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { EmptyState, SkeletonRows, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, Toggle, Chip } from './shared/night'
import { HeadCard, NB_CSS, SearchCard } from './shared/nbPage'
import './growth.css'

// المتابعات: a WhatsApp template sent automatically after a call, per agent, when the call's analysis matches.
// List + editor on one page. The sending happens in the nabrah-followup function.

const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] as VoiceAgent[]
const CALL_TOKENS: [string, string][] = [
  ['{{customer.phone}}', 'رقم العميل'], ['{{call.from}}', 'المتصل'], ['{{call.to}}', 'الوجهة'],
  ['{{call.duration}}', 'المدة'], ['{{agent.name}}', 'اسم الوكيل'],
]
const STATUS: Record<string, string> = { sent: 'انرسلت', failed: 'فشل الإرسال', skipped: 'ما انطبقت' }
type Draft = Omit<Followup, 'id' | 'created_at'> & { id?: string }
const EMPTY: Draft = { agent_id: '', name: '', template_id: '', params: [], recipient: 'customer', conditions: [], enabled: true }

export function DashboardV2Followups() {
  const { companyId, isDemo, canOpen } = useWorkspace()
  const pushToast = useToast()
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []
  const { templates } = useWaTemplates(companyId, isDemo)
  const { list, sends, loading, error } = useFollowups(companyId, isDemo)
  const [agentFilter, setAgentFilter] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [confirmDel, setConfirmDel] = useState<Followup | null>(null)
  const [tab, setTab] = useState<'call' | 'reminders'>('call')
  const [q, setQ] = useState('')
  const chips = canOpen('reminders') ? (
    <div className="nb-tabs" role="tablist" aria-label="نوع المتابعة">
      <button type="button" role="tab" className="nb-tab" aria-selected={tab === 'call'} aria-pressed={tab === 'call'} onClick={() => setTab('call')}>بعد المكالمة</button>
      <button type="button" role="tab" className="nb-tab" aria-selected={tab === 'reminders'} aria-pressed={tab === 'reminders'} onClick={() => setTab('reminders')}><BellRing size={13} /> تذكير المواعيد</button>
    </div>
  ) : null

  const agentName = (id: string) => agents.find((a) => a.agent_id === id)?.name ?? 'وكيل محذوف'
  const shown = list.filter((f) => (!agentFilter || f.agent_id === agentFilter) && (!q.trim() || f.name.toLowerCase().includes(q.trim().toLowerCase())))
  const lastSend = (id: string) => sends.find((s) => s.followup_id === id)
  const sentCount = (id: string) => sends.filter((s) => s.followup_id === id && s.status === 'sent').length

  async function toggle(f: Followup) {
    try { await setFollowupEnabled(companyId, isDemo, f.id, !f.enabled) } catch { pushToast({ kind: 'danger', title: 'تعذّر الحفظ' }) }
  }
  async function remove(f: Followup) {
    setConfirmDel(null)
    try { await deleteFollowup(companyId, isDemo, f.id); pushToast({ kind: 'success', title: 'انحذفت المتابعة' }) } catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
  }

  if (draft) return <FollowupEditor draft={draft} agents={agents} onDone={() => setDraft(null)} />

  if (tab === 'reminders') return (
    <NightPage>
      <style>{NB_CSS}</style>
      <HeadCard title="متابعات واتساب" sub="تذكير العملاء بمواعيدهم تلقائيًا عبر واتساب. اختر القالب المعتمد لكل قاعدة وتبدأ تشتغل." />
      <div className="nb-card">{chips}</div>
      <DashboardV2Reminders embedded />
    </NightPage>
  )

  return (
    <NightPage>
      <style>{NB_CSS}</style>
      <HeadCard title="متابعات واتساب" sub="أنشئ متابعات واتساب تلقائية بعد المكالمة، مرتبطة بالوكلاء والمتغيرات ونتائج التحليل.">
        <button type="button" className="nb-btn" onClick={() => setDraft({ ...EMPTY, agent_id: agentFilter || agents[0]?.agent_id || '' })}><Plus size={16} /> قالب واتساب جديد</button>
      </HeadCard>
      <SearchCard value={q} onChange={setQ} placeholder="ابحث بالاسم أو عنوان الرسالة…">
        {chips}
        <select className="nb-select" aria-label="الوكيل" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
          <option value="">كل الوكلاء</option>
          {agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
        </select>
      </SearchCard>
      {loading && <Card><SkeletonRows rows={3} columns={2} /></Card>}
      {!loading && error && <Card style={{ padding: 16 }}><div className="np-empty">ما قدرنا نجيب المتابعات الحين.</div></Card>}
      {!loading && !error && shown.length === 0 && (
        <Card><EmptyState icon={<MessageCircle size={20} />} title="لا توجد قوالب واتساب بعد" description="لم يتم العثور على قوالب متابعة واتساب لهذه المساحة." /></Card>
      )}
      <div className="gr-grid">
        {shown.map((f) => {
          const tpl = templates.find((t) => t.id === f.template_id)
          const last = lastSend(f.id)
          return (
            <div key={f.id} className="gr-card">
              <h4>{f.name} {!f.enabled && <Chip tone="muted">موقوفة</Chip>}</h4>
              <p>{agentName(f.agent_id)} · {tpl?.label ?? 'قالب محذوف'}</p>
              <div className="gr-chips">
                {f.conditions.length === 0 ? <Chip tone="info">بعد كل مكالمة</Chip> : f.conditions.map((c) => <Chip key={c} tone="ai">{c}</Chip>)}
              </div>
              <p>المستلم: {f.recipient === 'customer' ? 'العميل نفسه' : f.recipient}</p>
              <p>{sentCount(f.id)} رسالة انرسلت{last ? ` · آخر محاولة: ${STATUS[last.status]}` : ''}</p>
              <div className="gr-acts">
                <Toggle checked={f.enabled} label={`تشغيل ${f.name}`} onChange={() => void toggle(f)} />
                <button type="button" className="gr-btn" onClick={() => setDraft({ ...f })}><Pencil /> تعديل</button>
                <button type="button" className="gr-btn" onClick={() => setConfirmDel(f)}><Trash2 /> حذف</button>
              </div>
            </div>
          )
        })}
      </div>
      <Dialog open={!!confirmDel} title="تحذف المتابعة؟" onClose={() => setConfirmDel(null)}
        footer={<><Button variant="secondary" onClick={() => setConfirmDel(null)}>إلغاء</Button><Button variant="danger" onClick={() => confirmDel && void remove(confirmDel)}>حذف</Button></>}>
        <p style={{ margin: 0, lineHeight: 1.8 }}>«{confirmDel?.name}» بتوقف وما بترسل بعد أي مكالمة.</p>
      </Dialog>
    </NightPage>
  )
}

function FollowupEditor({ draft, agents, onDone }: { draft: Draft; agents: VoiceAgent[]; onDone: () => void }) {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const { templates } = useWaTemplates(companyId, isDemo)
  const [f, setF] = useState<Draft>(draft)
  const [fields, setFields] = useState<AgentFields | null>(isDemo ? DEMO_FIELDS : null)
  const [extra, setExtra] = useState('')
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState(0)
  const fixed = f.recipient !== 'customer'
  const [fixedPhone, setFixedPhone] = useState(fixed ? f.recipient : '')
  const loadedFor = useRef('')

  useEffect(() => {
    if (isDemo || !f.agent_id || loadedFor.current === f.agent_id) return
    loadedFor.current = f.agent_id
    setFields(null)
    agentWrite<AgentFields>('fields', { agent_id: f.agent_id }).then(setFields).catch(() => setFields({ variables: [], analysis: [] }))
  }, [f.agent_id, isDemo])

  const tpl = templates.find((t) => t.id === f.template_id)
  const slots = tpl ? placeholderCount(tpl.body) : 0
  const params = Array.from({ length: slots }, (_, i) => f.params[i] ?? '')
  const bools = (fields?.analysis ?? []).filter((a) => a.type === 'boolean')
  const tokens = useMemo(() => [
    ...CALL_TOKENS,
    ...(fields?.variables ?? []).map((v): [string, string] => [`{{var.${v}}}`, `متغير: ${v}`]),
    ...(fields?.analysis ?? []).filter((a) => a.type !== 'boolean').map((a): [string, string] => [`{{analysis.${a.name}}}`, `تحليل: ${a.name}`]),
  ], [fields])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }))
  const setParam = (i: number, v: string) => set('params', params.map((p, j) => (j === i ? v : p)))
  const insert = (tok: string) => { if (slots) setParam(focus, `${params[focus] ?? ''}${tok}`) }
  const toggleCond = (name: string) => set('conditions', f.conditions.includes(name) ? f.conditions.filter((c) => c !== name) : [...f.conditions, name])
  function addExtra() {
    const name = extra.trim()
    if (name && !f.conditions.includes(name)) set('conditions', [...f.conditions, name])
    setExtra('')
  }

  const digits = fixedPhone.replace(/\D/g, '')
  const recipient = fixed ? digits : 'customer'
  const ready = f.agent_id && f.name.trim() && f.template_id && params.every((p) => p.trim()) && (!fixed || (digits.length >= 8 && digits.length <= 15))

  async function save() {
    if (!ready) return
    setSaving(true)
    try {
      const linked = await saveFollowup(companyId, isDemo, { ...f, params, recipient })
      pushToast(linked ? { kind: 'success', title: 'انحفظت المتابعة' } : { kind: 'danger', title: 'انحفظت، بس ما قدرنا نربطها بالوكيل. احفظها مرة ثانية' })
      onDone()
    } catch {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ' })
    } finally { setSaving(false) }
  }

  return (
    <NightPage>
      <button type="button" className="gr-btn" style={{ alignSelf: 'flex-start' }} onClick={onDone}><ArrowRight /> العودة إلى المتابعات</button>
      <PageHead title={draft.id ? 'تعديل قالب واتساب' : 'إنشاء قالب واتساب'} sub="اختر الوكيل والقالب المعتمد، والمستلم، وشروط الإرسال بعد المكالمة." />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 280px)', gap: 16, alignItems: 'start' }} className="fu-grid">
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 18, display: 'grid', gap: 12 }}>
            <Select label="الوكيل" value={f.agent_id} onChange={(e) => { set('agent_id', e.target.value); set('conditions', []) }}
              options={[{ value: '', label: 'اختر وكيلًا' }, ...agents.map((a) => ({ value: a.agent_id, label: a.name }))]} />
            <Input label="اسم المتابعة" value={f.name} placeholder="مثال: تأكيد الحجز" onChange={(e) => set('name', e.target.value)} />
            <Select label="قالب واتساب المعتمد" value={f.template_id} onChange={(e) => { set('template_id', e.target.value); set('params', []) }}
              options={[{ value: '', label: templates.length ? 'اختر قالب' : 'ما فيه قوالب، أضف قالب من «الرسائل الصادرة»' }, ...templates.map((t) => ({ value: t.id, label: `${t.label} (${t.language})` }))]} />
            {tpl && <div className="np-empty" style={{ textAlign: 'start', lineHeight: 1.8 }}>{tpl.body}</div>}
            <Select label="المستلم" value={fixed ? 'fixed' : 'customer'} onChange={(e) => set('recipient', e.target.value === 'fixed' ? (digits || '0') : 'customer')}
              options={[{ value: 'customer', label: 'العميل نفسه (رقم المكالمة)' }, { value: 'fixed', label: 'رقم ثابت (مثل رقم المدير)' }]} />
            {fixed && <Input label="الرقم" value={fixedPhone} placeholder="05xxxxxxxx" onChange={(e) => setFixedPhone(e.target.value)} />}
          </Card>

          {slots > 0 && (
            <Card style={{ padding: 18, display: 'grid', gap: 12 }}>
              <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>قيم القالب</b>
              {params.map((p, i) => (
                <div key={i} onFocus={() => setFocus(i)}>
                  <Input label={`قيمة «${tpl?.param_labels[i] || `المتغير ${i + 1}`}»`} value={p} onChange={(e) => setParam(i, e.target.value)} />
                </div>
              ))}
              <small style={{ color: 'var(--dim)' }}>اضغط على عنصر لإضافته للحقل اللي أنت فيه:</small>
              <div className="gr-chips">
                {tokens.map(([tok, label]) => <button key={tok} type="button" className="gr-chip" onClick={() => insert(tok)}>{label}</button>)}
              </div>
            </Card>
          )}

          <Card style={{ padding: 18, display: 'grid', gap: 12 }}>
            <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>شروط التشغيل</b>
            <small style={{ color: 'var(--muted)' }}>بدون شروط تنرسل بعد كل مكالمة. اضغط على حقل تحليل عشان ما تنرسل إلا لما يكون «نعم».</small>
            {!f.agent_id ? <div className="np-empty">اختر وكيلًا لتحميل حقول التحليل.</div>
              : fields === null ? <SkeletonRows rows={1} columns={3} />
              : bools.length === 0 ? <div className="np-empty">لا توجد حقول تحليل مرتبطة بهذا الوكيل. اربط مجموعة تحليل من صفحة الوكيل.</div>
              : <div className="gr-chips">{bools.map((a) => <button key={a.name} type="button" className="gr-chip" aria-pressed={f.conditions.includes(a.name)} onClick={() => toggleCond(a.name)}>{a.name}</button>)}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><Input label="شرط إضافي (اسم حقل نعم/لا)" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
              <Button variant="secondary" onClick={addExtra}>إضافة</Button>
            </div>
            {f.conditions.length > 0 && <div className="gr-chips">{f.conditions.map((c) => <button key={c} type="button" className="gr-chip" aria-pressed="true" onClick={() => toggleCond(c)}>{c} ×</button>)}</div>}
          </Card>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button disabled={!ready || saving} onClick={() => void save()}>{saving ? 'جارِ الحفظ…' : draft.id ? 'حفظ' : 'إنشاء'}</Button>
            <Button variant="secondary" onClick={onDone}>إلغاء</Button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Card style={{ padding: 18, display: 'grid', gap: 10 }}>
            <b style={{ fontSize: 14, color: 'var(--ink)' }}>إحصائيات السياق</b>
            {[['متغيرات الوكيل', fields?.variables.length ?? 0], ['حقول التحليل', fields?.analysis.length ?? 0], ['شروط التشغيل', f.conditions.length]].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>{k}</span><b>{v}</b></div>
            ))}
          </Card>
          <Card style={{ padding: 18, display: 'grid', gap: 8, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.8 }}>
            <b style={{ fontSize: 14, color: 'var(--ink)' }}>نصائح</b>
            <span>استخدم العناصر الجاهزة بدل كتابة الرموز بيدك.</span>
            <span>القالب لازم يكون معتمد من ميتا، والإرسال من رقم واتساب شركتك.</span>
            <span>حفظ المتابعة يربط الوكيل بمدار بعد تحليل كل مكالمة، ويستبدل أي رابط «بعد التحليل» حطيته في خطافات الويب.</span>
          </Card>
        </div>
      </div>
      <style>{`@media (max-width: 860px) { .fu-grid { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </NightPage>
  )
}
