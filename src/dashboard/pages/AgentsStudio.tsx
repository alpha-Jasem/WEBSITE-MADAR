import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Bot, Copy, Mic, Pencil, PhoneOff, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { agentWrite, useVoiceRead, voiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { Badge, Button, Card, Dialog, Input, Select, Switch } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'
import { CallPanel } from '@/dashboard/components/CallPanel'
import { useWebCall } from './VoicePlatformPages'
import './growth.css'

// The voice agents: a card per agent (call, edit, copy, delete) and a seven-section editor.
// Reads go through nabrah-read, changes through nabrah-agent. Demo mode keeps everything in memory.

type Agent = VoiceAgent & Record<string, unknown>
const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

const DEMO_AGENTS: Agent[] = [
  { agent_id: 'demo-a1', name: 'وكيل الاستقبال', version: 'v1', created_at: '2026-09-06T10:00:00Z', last_update: '2026-10-20T10:00:00Z', agent_type: 'basic', voice_id: 'demo-v1', languages: ['ar'],
    start_first: true, allow_interruptions: true, first_sentence: 'هلا والله، معك وكيل الاستقبال. كيف أقدر أخدمك؟', who_are_you: 'أنت وكيل الاستقبال في الشركة، صوتك ودود ومختصر.',
    goal: 'تجاوب على أسئلة العميل وتحجز له موعد، وتحوّله لموظف إذا طلب.', steps: 'رحّب، اسأل عن الحاجة، جاوب أو احجز، ثم اختم المكالمة.', stack: 'latest', speech_speed: 1, max_call_duration: 600 },
  { agent_id: 'demo-a2', name: 'وكيل المتابعة', version: 'v1', created_at: '2026-08-26T10:00:00Z', last_update: '2026-08-29T10:00:00Z', agent_type: 'basic', voice_id: 'demo-v2', languages: ['ar', 'en'],
    start_first: true, allow_interruptions: true, first_sentence: 'مرحبا، أتصل أتابع معك طلبك الأخير.', who_are_you: 'أنت وكيل متابعة.', goal: 'تتأكد إن العميل راضي.', steps: 'عرّف بنفسك، اسأل، سجّل الرد.', stack: 'latest', speech_speed: 1, max_call_duration: 300 },
]
const DEMO_VOICES = [{ id: 'demo-v1', name: 'سلطان (رجالي، سعودي)' }, { id: 'demo-v2', name: 'دانة (نسائي، سعودي)' }]
let demoAgents = DEMO_AGENTS

const LANGS: [string, string][] = [['ar', 'العربية'], ['en', 'الإنجليزية'], ['ur', 'الأردية'], ['ms', 'الملايو'], ['fr', 'الفرنسية'], ['de', 'الألمانية'], ['es', 'الإسبانية'], ['tr', 'التركية'], ['id', 'الإندونيسية']]
const errText = (e: unknown) => (e instanceof Error && e.message === 'forbidden' ? 'ما عندك صلاحية تعديل الوكلاء' : 'ما قدرنا نكمل، حاول مرة ثانية')

function useAgentList() {
  const { companyId, isDemo } = useWorkspace()
  const [tick, setTick] = useState(0)
  const r = useVoiceRead<{ agents: Agent[] }>(isDemo ? null : `${companyId || 'admin'}-${tick}`, 'agents')
  return { agents: isDemo ? demoAgents : r.data?.agents ?? [], loading: !isDemo && r.loading, error: r.error, reload: () => setTick((t) => t + 1) }
}

// ---------------------------------------------------------------- list
export function DashboardV2AgentsList() {
  const { isDemo } = useWorkspace()
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { agents, loading, error, reload } = useAgentList()
  const call = useWebCall()
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<Agent | null>(null)
  const [, force] = useState(0)

  async function copy(a: Agent) {
    if (isDemo) { demoAgents = [...demoAgents, { ...a, agent_id: `demo-${Date.now()}`, name: `نسخة من ${a.name}`, created_at: new Date().toISOString() }]; force((n) => n + 1); return }
    setBusy(a.agent_id)
    try { await agentWrite('copy', { agent_id: a.agent_id }); pushToast({ kind: 'success', title: 'انسخ الوكيل' }); reload() }
    catch (e) { pushToast({ kind: 'danger', title: errText(e) }) }
    finally { setBusy(null) }
  }
  async function remove(a: Agent) {
    setConfirmDel(null)
    if (isDemo) { demoAgents = demoAgents.filter((x) => x.agent_id !== a.agent_id); force((n) => n + 1); return }
    setBusy(a.agent_id)
    try { await agentWrite('delete', { agent_id: a.agent_id, confirm: true }); pushToast({ kind: 'success', title: 'انحذف الوكيل' }); reload() }
    catch (e) { pushToast({ kind: 'danger', title: errText(e) }) }
    finally { setBusy(null) }
  }

  return (
    <NightPage>
      <PageHead title="وكلاء الصوت" sub="أنشئ وأدر وكلاء المحادثة لهذه المساحة."
        actions={<Button onClick={() => navigate(`${base}/agents/new`)}><Plus size={14} /> وكيل جديد</Button>} />
      {!loading && <div style={{ fontSize: 13, color: 'var(--muted)' }}><b style={{ color: 'var(--ink)', fontSize: 18 }}>{agents.length}</b> وكلاء في هذه المساحة</div>}
      {error && !isDemo && <Card style={{ padding: 16 }}><div className="np-empty">ما قدرنا نجيب الوكلاء الحين.</div></Card>}
      {!loading && !error && agents.length === 0 && <Card><EmptyState icon={<Bot size={20} />} title="ما عندك وكلاء بعد" description="أنشئ أول وكيل يرد على مكالمات عملائك." /></Card>}
      <div className="gr-grid">
        {agents.map((a) => {
          const live = call.agentId === a.agent_id && call.state !== 'idle'
          return (
            <div key={a.agent_id} className="gr-card">
              <h4>{a.name} <Badge tone="neutral">{String(a.version || 'v1')}</Badge></h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                <div><span style={{ color: 'var(--dim)' }}>تاريخ الإنشاء</span><div style={{ color: 'var(--ink)' }}>{fmtDate(a.created_at)}</div></div>
                <div><span style={{ color: 'var(--dim)' }}>آخر تحديث</span><div style={{ color: 'var(--ink)' }}>{fmtDate(a.last_update)}</div></div>
              </div>
              <div className="gr-acts">
                {live
                  ? <button type="button" className="gr-btn primary" onClick={() => void call.hangUp()}><PhoneOff /> {call.state === 'connecting' ? 'جاري الاتصال…' : 'إنهاء'}</button>
                  : <button type="button" className="gr-btn" disabled={call.state !== 'idle'} onClick={() => void call.start(a.agent_id)}><Mic /> اتصال</button>}
                <button type="button" className="gr-btn" onClick={() => navigate(`${base}/agents/${encodeURIComponent(a.agent_id)}/edit`)}><Pencil /> تعديل</button>
                <button type="button" className="gr-btn" disabled={busy === a.agent_id} onClick={() => void copy(a)}><Copy /> نسخ</button>
                <button type="button" className="gr-btn" disabled={busy === a.agent_id} onClick={() => setConfirmDel(a)}><Trash2 /> حذف</button>
              </div>
            </div>
          )
        })}
      </div>
      <Dialog open={!!confirmDel} title="تحذف الوكيل؟" onClose={() => setConfirmDel(null)}
        footer={<><Button variant="secondary" onClick={() => setConfirmDel(null)}>إلغاء</Button><Button variant="danger" onClick={() => confirmDel && void remove(confirmDel)}>حذف نهائي</Button></>}>
        <p style={{ margin: 0, lineHeight: 1.8 }}>«{confirmDel?.name}» بينحذف نهائيًا مع إعداداته، وما يمكن استرجاعه. المكالمات اللي تجيه بتوقف.</p>
      </Dialog>
      <CallPanel state={call.state} speaker={call.speaker} level={call.level} seconds={call.seconds} agentName={agents.find((x) => x.agent_id === call.agentId)?.name ?? ''} onHangUp={() => void call.hangUp()} />
    </NightPage>
  )
}

// ---------------------------------------------------------------- editor
const SECTIONS = ['الهوية والشخصية', 'المعرفة', 'الصوت واللغة', 'الوسوم', 'الأدوات والتحليل', 'خطافات الويب', 'مراجعة قبل الحفظ']
const area: CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 90, borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'inherit', padding: 10, font: 'inherit', fontSize: 13.5, lineHeight: 1.8, resize: 'vertical' }
const EMPTY: Agent = { agent_id: '', name: '', agent_type: 'basic', languages: ['ar'], start_first: true, allow_interruptions: true, first_sentence: '', who_are_you: '', goal: '', steps: '', stack: 'latest', speech_speed: 1, max_call_duration: 600 }

function Block({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Card style={{ padding: 18, display: 'grid', gap: 12 }}>
      <div><b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{title}</b>{sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}</div>
      {children}
    </Card>
  )
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
      <span style={{ color: 'var(--text-secondary, var(--muted))', fontWeight: 600 }}>{label}</span>
      {children}
      {hint && <small style={{ color: 'var(--dim)' }}>{hint}</small>}
    </label>
  )
}
function Range({ value, min, max, step, onChange, fmt }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1 }} aria-valuetext={fmt(value)} />
      <b style={{ minWidth: 64, textAlign: 'center', fontSize: 13 }}>{fmt(value)}</b>
    </div>
  )
}
const names = (list: unknown): string[] => Array.isArray(list) ? list.map((x) => (x && typeof x === 'object' ? String((x as Record<string, unknown>).name ?? (x as Record<string, unknown>).title ?? '') : String(x))).filter(Boolean) : []

export function DashboardV2AgentEditor() {
  const { agentId = 'new' } = useParams()
  const isNew = agentId === 'new'
  const { isDemo, companyId } = useWorkspace()
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const [step, setStep] = useState(0)
  const [seen, setSeen] = useState(1)
  const [a, setA] = useState<Agent | null>(isNew ? { ...EMPTY } : null)
  const [voices, setVoices] = useState<{ id: string; name: string }[]>(isDemo ? DEMO_VOICES : [])
  const [saving, setSaving] = useState(false)
  const [tagText, setTagText] = useState('')

  useEffect(() => {
    if (isNew) return
    if (isDemo) { setA(demoAgents.find((x) => x.agent_id === agentId) ?? null); return }
    voiceRead<{ agent: Agent }>('agent', { agent_id: agentId }).then((r) => setA(r.agent)).catch(() => setA(null))
  }, [agentId, isDemo, isNew, companyId])
  useEffect(() => {
    if (isDemo) return
    agentWrite<{ voices: unknown }>('voices').then((r) => {
      const list = Array.isArray(r.voices) ? r.voices : (r.voices as { voices?: unknown[] })?.voices ?? []
      setVoices((list as Record<string, unknown>[]).map((v) => ({ id: String(v.id ?? v.voice_id ?? ''), name: String(v.name ?? v.display_name ?? v.id ?? '') })).filter((v) => v.id))
    }).catch(() => setVoices([]))
  }, [isDemo])

  const set = (k: string, v: unknown) => setA((cur) => (cur ? { ...cur, [k]: v } : cur))
  const s = (k: string) => String(a?.[k] ?? '')
  const b = (k: string) => a?.[k] === true
  const n = (k: string, d: number) => (typeof a?.[k] === 'number' ? (a[k] as number) : d)
  const langs = useMemo(() => (Array.isArray(a?.languages) ? (a!.languages as string[]) : []), [a])
  const tags = Array.isArray(a?.tags) ? (a!.tags as string[]) : []
  const variables = Array.isArray(a?.variables) ? (a!.variables as { name: string; type?: string; default_value?: string }[]) : []
  const hook = (k: string) => ((a?.[k] && typeof a[k] === 'object') ? (a[k] as { url?: string; parameters?: unknown[] }) : { url: '', parameters: [] })
  const voiceId = s('voice_id') || String((a?.voice_object as { id?: string } | undefined)?.id ?? '')

  function go(i: number) { setStep(i); setSeen((x) => Math.max(x, i + 1)); window.scrollTo?.({ top: 0 }) }
  const missing = !s('name').trim() || !s('first_sentence').trim() || !s('who_are_you').trim() || !s('goal').trim() || !s('steps').trim() || langs.length === 0

  async function save() {
    if (!a) return
    if (missing) { pushToast({ kind: 'danger', title: 'كمّل الحقول المطلوبة في «الهوية والشخصية»' }); go(0); return }
    const fields: Record<string, unknown> = { ...a }
    for (const k of ['agent_id', 'version', 'created_at', 'last_update', 'project_id', 'created_by_email', 'tools', 'system_tools', 'analysis_groups', 'knowledge_bases', 'voice_object']) delete fields[k]
    if (voiceId) fields.voice_id = voiceId
    if (isDemo) {
      demoAgents = isNew ? [...demoAgents, { ...a, agent_id: `demo-${Date.now()}`, created_at: new Date().toISOString(), last_update: new Date().toISOString() }]
        : demoAgents.map((x) => (x.agent_id === a.agent_id ? { ...a, last_update: new Date().toISOString() } : x))
      pushToast({ kind: 'success', title: 'انحفظ (عرض تجريبي)' }); navigate(`${base}/agents`); return
    }
    setSaving(true)
    try {
      await agentWrite(isNew ? 'create' : 'update', isNew ? { fields } : { agent_id: a.agent_id, fields })
      pushToast({ kind: 'success', title: isNew ? 'انشأ الوكيل' : 'انحفظت التعديلات' })
      navigate(`${base}/agents`)
    } catch (e) { pushToast({ kind: 'danger', title: errText(e) }) }
    finally { setSaving(false) }
  }

  if (!a) return <NightPage><PageHead title="تعديل الوكيل" /><Card style={{ padding: 16 }}><div className="np-empty">جارِ تحميل الوكيل…</div></Card></NightPage>

  const sections: ReactNode[] = [
    <>
      <Block title="الأساسيات" sub="الاسم، النوع، الصوت، وكيف تبدأ المحادثة.">
        <Input label="الاسم الظاهر *" value={s('name')} onChange={(e) => set('name', e.target.value)} />
        <Select label="نوع الوكيل *" options={[{ value: 'basic', label: 'أساسي' }]} value={s('agent_type') || 'basic'} onChange={(e) => set('agent_type', e.target.value)} />
        <Select label="الصوت *" options={[{ value: '', label: voices.length ? 'اختر صوت' : 'الصوت الحالي' }, ...voices.map((v) => ({ value: v.id, label: v.name }))]} value={voiceId} onChange={(e) => set('voice_id', e.target.value)} />
        <Field label="اللغات *" hint="فعّل كل لغة يجب أن يدعمها الوكيل.">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LANGS.map(([code, label]) => {
              const on = langs.includes(code)
              return <button key={code} type="button" aria-pressed={on} className={`gr-btn${on ? ' primary' : ''}`} onClick={() => set('languages', on ? langs.filter((x) => x !== code) : [...langs, code])}>{label}</button>
            })}
          </div>
        </Field>
        <Switch checked={b('start_first')} onChange={(v) => set('start_first', v)} label="الوكيل يتحدث أولًا" />
        <Switch checked={b('allow_interruptions')} onChange={(v) => set('allow_interruptions', v)} label="السماح بمقاطعة المتصل" />
      </Block>
      <Block title="الشخصية والنص" sub="ما يقوله الوكيل وكيف يعرّف نفسه.">
        <Field label="الجملة الأولى *"><textarea style={{ ...area, minHeight: 60 }} value={s('first_sentence')} onChange={(e) => set('first_sentence', e.target.value)} /></Field>
        <Field label="الهوية *"><textarea style={area} value={s('who_are_you')} onChange={(e) => set('who_are_you', e.target.value)} /></Field>
        <Field label="الهدف والحدود *"><textarea style={area} value={s('goal')} onChange={(e) => set('goal', e.target.value)} /></Field>
        <Field label="سير العمل *"><textarea style={{ ...area, minHeight: 140 }} value={s('steps')} onChange={(e) => set('steps', e.target.value)} /></Field>
      </Block>
      <Block title="النموذج والكلام" sub="إصدار النموذج وسرعة الكلام.">
        <Select label="حزمة النموذج" options={[{ value: 'latest', label: 'الأحدث' }]} value={s('stack') || 'latest'} onChange={(e) => set('stack', e.target.value)} />
        <Field label="سرعة الكلام"><Range value={n('speech_speed', 1)} min={0.7} max={1.3} step={0.05} onChange={(v) => set('speech_speed', v)} fmt={(v) => `${v.toFixed(2)}×`} /></Field>
      </Block>
      <Block title="حدود المكالمة" sub="امنع المكالمات من أن تستمر أطول من اللازم.">
        <Field label="الحد الأقصى لمدة المكالمة" hint="تنتهي المكالمة تلقائيًا عند هذه المدة. من دقيقة إلى 30 دقيقة، والافتراضي 10 دقائق.">
          <Range value={Math.round(n('max_call_duration', 600) / 60)} min={1} max={30} step={1} onChange={(v) => set('max_call_duration', v * 60)} fmt={(v) => `${v} دقيقة`} />
        </Field>
      </Block>
    </>,
    <>
      <Block title="معرفة مرجعية" sub="نص طويل يُضاف لتعليمات الوكيل: أسعار، دوام، سياسات…">
        <Field label="المعرفة المرجعية"><textarea style={{ ...area, minHeight: 220 }} value={s('support_data')} onChange={(e) => set('support_data', e.target.value)} /></Field>
      </Block>
      <Block title="قواعد المعرفة" sub="قواعد المعرفة المرتبطة بهذا الوكيل (تُستخدم في محادثات واتساب).">
        {names(a.knowledge_bases).length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{names(a.knowledge_bases).map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}</div> : <div className="np-empty">ما فيه قواعد معرفة مرتبطة.</div>}
      </Block>
    </>,
    <Block title="بيئة الصوت" sub="أصوات اختيارية تعطي المكالمة طابع طبيعي.">
      <Switch checked={b('background_ambient')} onChange={(v) => set('background_ambient', v)} label="ضجيج الخلفية" />
      {b('background_ambient') && <Field label="مستوى الخلفية"><Range value={n('background_ambient_volume', 0.5)} min={0} max={1} step={0.05} onChange={(v) => set('background_ambient_volume', v)} fmt={(v) => `${v.toFixed(2)}×`} /></Field>}
      <Switch checked={b('thinking_sound')} onChange={(v) => set('thinking_sound', v)} label="صوت التفكير" />
      {b('thinking_sound') && <Field label="مستوى صوت التفكير"><Range value={n('thinking_sound_volume', 0.5)} min={0} max={1} step={0.05} onChange={(v) => set('thinking_sound_volume', v)} fmt={(v) => `${v.toFixed(2)}×`} /></Field>}
    </Block>,
    <Block title="وسوم المحادثة" sub="وسوم اختيارية تُستخرج من المكالمات للتحليل.">
      <Switch checked={b('enable_tags')} onChange={(v) => set('enable_tags', v)} label="تفعيل استخراج الوسوم" />
      {b('enable_tags') && <>
        <Field label="تعليمات الوسم"><textarea style={area} value={s('tags_prompt')} onChange={(e) => set('tags_prompt', e.target.value)} /></Field>
        <Field label="الوسوم">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => <button key={t} type="button" className="gr-btn" aria-label={`حذف الوسم ${t}`} onClick={() => set('tags', tags.filter((x) => x !== t))}>{t} ×</button>)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input placeholder="اكتب وسم واضغط إضافة" value={tagText} onChange={(e) => setTagText(e.target.value)} style={{ flex: 1 }} />
            <Button variant="secondary" onClick={() => { const t = tagText.trim(); if (t && !tags.includes(t)) set('tags', [...tags, t]); setTagText('') }}>إضافة وسوم</Button>
          </div>
        </Field>
      </>}
    </Block>,
    <>
      <Block title="أدوات مخصصة" sub="أدوات يستدعيها الوكيل أثناء المكالمة. تُدار من صفحة «الأدوات».">
        {names(a.tools).length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{names(a.tools).map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}</div> : <div className="np-empty">ما فيه أدوات مرتبطة.</div>}
      </Block>
      <Block title="مجموعات التحليل" sub="تحليل يجري بعد كل مكالمة. تُدار من صفحة «مجموعات التحليل».">
        {names(a.analysis_groups).length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{names(a.analysis_groups).map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}</div> : <div className="np-empty">ما فيه مجموعات تحليل مرتبطة.</div>}
      </Block>
      <Block title="أدوات مدمجة" sub="قدرات المنصة مثل التحويل أو جمع البيانات.">
        {names(a.system_tools).length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{names(a.system_tools).map((x) => <Badge key={x} tone="neutral">{x}</Badge>)}</div> : <div className="np-empty">ما فيه أدوات مدمجة مفعّلة.</div>}
      </Block>
      <Block title="التذاكر" sub="يسمح للوكيل بفتح تذاكر وفق التعليمات.">
        <Switch checked={b('enable_ticket_creation')} onChange={(v) => set('enable_ticket_creation', v)} label="تفعيل إنشاء التذاكر" />
        {b('enable_ticket_creation') && <Field label="متى يفتح تذكرة"><textarea style={area} value={s('ticket_prompt')} onChange={(e) => set('ticket_prompt', e.target.value)} /></Field>}
      </Block>
    </>,
    <>
      <Block title="متغيرات القالب" sub="أسماء وقيم افتراضية تستخدمها في النصوص بصيغة {{name}}.">
        {variables.length === 0 && <div className="np-empty">ما فيه متغيرات بعد.</div>}
        {variables.map((v, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) auto', gap: 8, alignItems: 'end' }}>
            <Input label="الاسم" value={v.name} onChange={(e) => set('variables', variables.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input label="القيمة الافتراضية" value={v.default_value ?? ''} onChange={(e) => set('variables', variables.map((x, j) => (j === i ? { ...x, default_value: e.target.value } : x)))} />
            <button type="button" className="gr-btn" aria-label="حذف المتغير" onClick={() => set('variables', variables.filter((_, j) => j !== i))}><Trash2 /></button>
          </div>
        ))}
        <div><Button variant="secondary" onClick={() => set('variables', [...variables, { name: '', type: 'string', default_value: '' }])}><Plus size={14} /> إضافة متغير</Button></div>
      </Block>
      {([['pre_call_callback', 'خطاف قبل المكالمة'], ['post_call_callback', 'خطاف بعد المكالمة'], ['post_analysis_callback', 'خطاف بعد التحليل']] as const).map(([k, label]) => (
        <Block key={k} title={label} sub="رابط HTTPS اختياري يستقبل بيانات المكالمة.">
          <Input label="رابط الاستدعاء" placeholder="https://" value={hook(k).url ?? ''} onChange={(e) => set(k, { ...hook(k), url: e.target.value, parameters: hook(k).parameters ?? [] })} />
        </Block>
      ))}
    </>,
    <Block title="مراجعة قبل الحفظ" sub="ملخص للقراءة فقط. تأكد إن كل شي صحيح ثم احفظ.">
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0,1fr)', gap: '8px 16px', margin: 0, fontSize: 13 }}>
        {([
          ['الاسم الظاهر', s('name')], ['نوع الوكيل', s('agent_type') === 'basic' ? 'أساسي' : s('agent_type')],
          ['الصوت', voices.find((v) => v.id === voiceId)?.name || '—'], ['اللغات', langs.map((c) => LANGS.find(([x]) => x === c)?.[1] || c).join('، ')],
          ['الوكيل يتحدث أولًا', b('start_first') ? 'نعم' : 'لا'], ['السماح بالمقاطعة', b('allow_interruptions') ? 'نعم' : 'لا'],
          ['الجملة الأولى', s('first_sentence')], ['الهوية', s('who_are_you')], ['الهدف والحدود', s('goal')], ['سير العمل', s('steps')],
          ['سرعة الكلام', `${n('speech_speed', 1).toFixed(2)}×`], ['الحد الأقصى للمكالمة', `${Math.round(n('max_call_duration', 600) / 60)} دقيقة`],
          ['ضجيج الخلفية', b('background_ambient') ? 'نعم' : 'لا'], ['صوت التفكير', b('thinking_sound') ? 'نعم' : 'لا'],
          ['الوسوم', b('enable_tags') ? (tags.join('، ') || 'مفعّلة') : 'لا'], ['إنشاء التذاكر', b('enable_ticket_creation') ? 'نعم' : 'لا'],
          ['المتغيرات', String(variables.length)],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--dim)' }}>{k}</dt>
            <dd style={{ margin: 0, color: 'var(--ink)', whiteSpace: 'pre-wrap', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{v || '—'}</dd>
          </div>
        ))}
      </dl>
    </Block>,
  ]

  return (
    <NightPage>
      <PageHead title={isNew ? 'وكيل جديد' : 'تعديل الوكيل'} sub={isNew ? 'كمّل كل قسم بالترتيب، أو ارجع لأي قسم فتحته.' : `أنت تعدّل ${s('name')}`}
        actions={<Button variant="secondary" onClick={() => navigate(`${base}/agents`)}><ArrowRight size={14} /> العودة إلى الوكلاء</Button>} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <nav aria-label="الأقسام" style={{ flex: '1 1 200px', maxWidth: 260, display: 'grid', gap: 4 }}>
          {SECTIONS.map((title, i) => (
            <button key={title} type="button" aria-current={step === i ? 'step' : undefined} disabled={!isNew ? false : i >= seen}
              onClick={() => go(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'start', border: 0, borderRadius: 10, padding: '9px 10px', font: 'inherit', fontSize: 13.5, cursor: 'pointer',
                background: step === i ? 'var(--raise)' : 'none', color: step === i ? 'var(--ink)' : 'var(--muted)', opacity: isNew && i >= seen ? 0.45 : 1 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11.5, border: '1px solid var(--line-2)' }}>{i + 1}</span>{title}
            </button>
          ))}
        </nav>
        <div style={{ flex: '999 1 520px', minWidth: 0, display: 'grid', gap: 14 }}>
          <div><b style={{ fontSize: 18, color: 'var(--ink)' }}>{SECTIONS[step]}</b></div>
          {sections[step]}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Button variant="secondary" disabled={step === 0} onClick={() => go(step - 1)}>رجوع</Button>
            {step < SECTIONS.length - 1
              ? <Button onClick={() => go(step + 1)}>متابعة</Button>
              : <Button disabled={saving} onClick={() => void save()}>{saving ? 'جارِ الحفظ…' : isNew ? 'إنشاء الوكيل' : 'حفظ التعديلات'}</Button>}
          </div>
        </div>
      </div>
    </NightPage>
  )
}
