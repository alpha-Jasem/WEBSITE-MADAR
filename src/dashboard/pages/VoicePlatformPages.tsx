import { useEffect, useRef, useState } from 'react'
import { Megaphone, Mic, PhoneOff, Plus, Rocket, Trash2, Code2, Copy } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { useVoiceRead, type VoiceAgent, type VoiceCallSummary } from '@/lib/queries/voicePlatform'
import {
  useVoiceCampaigns, saveVoiceCampaign, deleteVoiceCampaign, refreshVoiceCampaigns, useVoiceServices, CAMPAIGN_STATUS_LABELS,
  type VoiceCampaign, type CampaignStatus,
} from '@/lib/queries/agentConfig'
import { Badge, Button, Card, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'
import './growth.css'

const textarea = { width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'inherit', padding: 10, font: 'inherit' } as const
const STATUS_AR: Record<string, string> = { completed: 'مكتملة', no_answer: 'ما ردّ', busy: 'مشغول', failed: 'فشلت', in_progress: 'جارية', queued: 'بالانتظار' }
const CAMPAIGN_TONE: Record<CampaignStatus, 'neutral' | 'warning' | 'success' | 'danger'> = { draft: 'neutral', launching: 'warning', launched: 'success', failed: 'danger' }

/** Saudi mobile numbers typed any common way (05..., 9665..., +9665...) become +9665...; anything else must already be +country. */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s()-]/g, '')
  const n = /^05\d{8}$/.test(s) ? `+966${s.slice(1)}` : /^9665\d{8}$/.test(s) ? `+${s}` : /^00\d+$/.test(s) ? `+${s.slice(2)}` : s
  return /^\+\d{8,15}$/.test(n) ? n : null
}

/** The voice agents this account may use (empty in demo mode). */
function useAgents() {
  const { companyId, isDemo } = useWorkspace()
  const r = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? [{ agent_id: 'demo-agent', name: 'وكيل تجريبي' }] : r.data?.agents ?? []
  return { agents, loading: r.loading, error: r.error }
}

// ---------------------------------------------------------------- outbound campaigns
type CampaignDraft = { name: string; agent_id: string; call_from: string; numbersText: string }

/** Outbound campaigns: one agent calls a list of numbers from one of the company's outbound lines. */
export function DashboardV2CallCampaigns() {
  const { companyId, isDemo, can } = useWorkspace()
  const pushToast = useToast()
  const { items, available, loading } = useVoiceCampaigns(companyId, isDemo)
  const { items: services } = useVoiceServices(companyId, isDemo)
  const lines = services.filter((s) => s.direction === 'outbound' && (s.status === 'active' || isDemo))
  const { agents } = useAgents()
  const [draft, setDraft] = useState<CampaignDraft | null>(null)
  const [confirm, setConfirm] = useState<VoiceCampaign | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canEdit = can('integrations.manage')
  const agentName = (id: string) => agents.find((a) => a.agent_id === id)?.name || 'وكيل'

  const parsed = draft ? draft.numbersText.split(/[\n,،;]+/).map((x) => x.trim()).filter(Boolean) : []
  const good = [...new Set(parsed.map(normalizePhone).filter((x): x is string => !!x))]
  const bad = parsed.length - parsed.map(normalizePhone).filter(Boolean).length

  async function save() {
    if (!draft) return
    if (!draft.name.trim() || !draft.agent_id || !draft.call_from) { pushToast({ kind: 'danger', title: 'اكتب الاسم واختر الوكيل والرقم' }); return }
    if (good.length === 0 || good.length > 100) { pushToast({ kind: 'danger', title: 'أضف من 1 إلى 100 رقم صحيح' }); return }
    setBusy(true)
    try {
      await saveVoiceCampaign(companyId, isDemo, { name: draft.name.trim(), agent_id: draft.agent_id, call_from: draft.call_from, numbers: good, status: 'draft', tag: null, call_ids: [], error: null, launched_at: null })
      pushToast({ kind: 'success', title: 'انحفظت الحملة كمسودة' }); setDraft(null)
    } catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  async function launch(c: VoiceCampaign) {
    if (isDemo) { pushToast({ kind: 'info', title: 'في العرض التجريبي ما نتصل بأرقام حقيقية' }); setConfirm(null); return }
    setBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('nabrah-call', { body: { op: 'launch_campaign', campaign_id: c.id } })
      if (error || data?.error) {
        const msg: Record<string, string> = { 'number not active': 'رقم الاتصال مو مفعّل في خدمات الصادر', 'agent not linked': 'الوكيل مو مربوط بحسابك', 'already launched': 'الحملة انطلقت من قبل' }
        pushToast({ kind: 'danger', title: 'ما انطلقت الحملة', description: msg[String(data?.error)] })
      } else pushToast({ kind: 'success', title: 'انطلقت الحملة', description: `${data?.launched ?? 0} مكالمة` })
      refreshVoiceCampaigns()
    } catch { pushToast({ kind: 'danger', title: 'ما انطلقت الحملة' }) }
    finally { setBusy(false); setConfirm(null) }
  }

  return (
    <NightPage>
      <PageHead title="حملات الاتصال" sub="يتصل وكيل الصوت بقائمة أرقام من أحد خطوط الصادر عندك، وتتابع نتيجة كل مكالمة هنا"
        actions={available && canEdit ? <Button onClick={() => setDraft({ name: '', agent_id: agents[0]?.agent_id || '', call_from: lines[0]?.phone || '', numbersText: '' })}><Plus size={14} /> حملة جديدة</Button> : undefined} />
      {!available && <Card style={{ padding: 16 }}><div className="np-empty">هذي الصفحة تتفعّل بعد تحديث قاعدة البيانات.</div></Card>}
      {available && !loading && items.length === 0 && <Card><EmptyState icon={<Megaphone size={20} />} title="ما عندك حملات بعد" description="أنشئ حملة، احفظها كمسودة، وأطلقها لما تكون جاهز." /></Card>}
      {items.length > 0 && (
        <div className="gr-grid">
          {[...items].reverse().map((c) => (
            <div key={c.id} className="gr-card">
              <h4>{c.name} <Badge tone={CAMPAIGN_TONE[c.status]}>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge></h4>
              <p>{agentName(c.agent_id)} · من <span dir="ltr">{c.call_from}</span> · {c.numbers.length} رقم</p>
              {c.status === 'failed' && <p>تعذّر الإطلاق. تقدر ترجعها مسودة وتحاول مرة ثانية.</p>}
              <div className="gr-acts">
                {c.status === 'draft' && canEdit && <button type="button" className="gr-btn" onClick={() => setConfirm(c)}><Rocket /> إطلاق</button>}
                {c.status === 'failed' && canEdit && <button type="button" className="gr-btn" onClick={() => void saveVoiceCampaign(companyId, isDemo, { ...c, status: 'draft', error: null })}>رجّعها مسودة</button>}
                {c.status === 'launched' && <button type="button" className="gr-btn" onClick={() => setOpenId(openId === c.id ? null : c.id)}>النتائج</button>}
                {c.status !== 'launched' && c.status !== 'launching' && canEdit && <button type="button" className="gr-btn" onClick={() => void deleteVoiceCampaign(companyId, isDemo, c.id)}><Trash2 /> حذف</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {openId && (() => { const c = items.find((x) => x.id === openId); return c?.tag ? <CampaignResults campaign={c} /> : null })()}

      <Dialog open={!!draft} title="حملة اتصال جديدة" onClose={() => setDraft(null)} width={560}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>إلغاء</Button><Button disabled={busy} onClick={() => void save()}>حفظ كمسودة</Button></>}>
        {draft && <div style={{ display: 'grid', gap: 12 }}>
          <Input label="اسم الحملة" value={draft.name} placeholder="مثال: متابعة عملاء الشهر" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Select label="الوكيل اللي يتصل" options={agents.map((a) => ({ value: a.agent_id, label: a.name }))} value={draft.agent_id} onChange={(e) => setDraft({ ...draft, agent_id: e.target.value })} />
          {lines.length === 0
            ? <div className="np-empty">ما عندك خط صادر مفعّل. أضفه من «خدمات الصادر» أولًا.</div>
            : <Select label="يتصل من الرقم" options={lines.map((l) => ({ value: l.phone, label: `${l.name} (${l.phone})` }))} value={draft.call_from} onChange={(e) => setDraft({ ...draft, call_from: e.target.value })} />}
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>الأرقام (رقم بكل سطر، حتى 100)
            <textarea rows={6} dir="ltr" style={textarea} value={draft.numbersText} placeholder={'0500000000\n+966500000001'} onChange={(e) => setDraft({ ...draft, numbersText: e.target.value })} />
          </label>
          <small style={{ color: 'var(--text-tertiary)' }}>{good.length} رقم صحيح{bad > 0 ? ` · ${bad} غير صحيح ويتجاهل` : ''}</small>
        </div>}
      </Dialog>

      <Dialog open={!!confirm} title="تطلق الحملة؟" onClose={() => setConfirm(null)} width={460}
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>إلغاء</Button><Button disabled={busy} onClick={() => confirm && void launch(confirm)}><Rocket size={14} /> اتصل الآن</Button></>}>
        {confirm && <div style={{ display: 'grid', gap: 6, fontSize: 13.5 }}>
          <div>«{confirm.name}»: {agentName(confirm.agent_id)} يتصل بـ <b>{confirm.numbers.length}</b> رقم من <span dir="ltr">{confirm.call_from}</span>.</div>
          <div>المكالمات تبدأ فورًا وتُحسب من رصيد الدقائق، وما تقدر توقفها بعد الإطلاق من هنا.</div>
        </div>}
      </Dialog>
    </NightPage>
  )
}

function CampaignResults({ campaign }: { campaign: VoiceCampaign }) {
  const r = useVoiceRead<{ calls: VoiceCallSummary[]; total_count?: number }>(`cmp-${campaign.id}`, 'calls', { agent_id: campaign.agent_id, tag: campaign.tag, limit: 50 })
  const calls = r.data?.calls ?? []
  const counts = calls.reduce<Record<string, number>>((m, c) => ({ ...m, [c.status]: (m[c.status] || 0) + 1 }), {})
  return (
    <Card style={{ padding: 16, display: 'grid', gap: 10 }}>
      <h3 className="np-h3">نتائج «{campaign.name}» <span className="np-aside">{r.data?.total_count ?? calls.length} مكالمة</span>
        <Button variant="ghost" size="sm" onClick={() => void r.reload()}>تحديث</Button></h3>
      {r.loading && <div className="np-empty">جاري التحميل…</div>}
      {r.error && <div className="np-empty">تعذّر جلب النتائج.</div>}
      {calls.length > 0 && <div className="np-kpis">{Object.entries(counts).map(([s, n]) => <div key={s} className="np-kpi"><span>{STATUS_AR[s] || s}</span><b>{n}</b></div>)}</div>}
      {calls.map((c) => (
        <div key={c.id} className="np-row" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="np-row-main"><b dir="ltr">{c.call_to}</b><small>{c.duration != null ? `${c.duration}ث` : '—'}</small></div>
          <Badge tone={c.status === 'completed' ? 'success' : 'warning'}>{STATUS_AR[c.status] || c.status}</Badge>
        </div>
      ))}
      {!r.loading && calls.length === 0 && !r.error && <div className="np-empty">ما وصلت نتائج بعد. المكالمات تظهر هنا أول ما تبدأ.</div>}
    </Card>
  )
}

// ---------------------------------------------------------------- web calls
/** Web calls: talk to a voice agent from the browser, the same experience a site visitor gets from the call widget. */
export function DashboardV2WebCalls() {
  const { isDemo } = useWorkspace()
  const pushToast = useToast()
  const { agents, loading } = useAgents()
  const [agentId, setAgentId] = useState('')
  const [state, setState] = useState<'idle' | 'connecting' | 'live'>('idle')
  const roomRef = useRef<{ disconnect: () => Promise<void> | void } | null>(null)
  const audioEls = useRef<HTMLMediaElement[]>([])
  const selected = agentId || agents[0]?.agent_id || ''

  async function hangUp() {
    try { await roomRef.current?.disconnect() } catch { /* already gone */ }
    roomRef.current = null
    audioEls.current.forEach((el) => el.remove()); audioEls.current = []
    setState('idle')
  }
  useEffect(() => () => { void hangUp() }, [])

  async function start() {
    if (isDemo) { pushToast({ kind: 'info', title: 'المكالمة التجريبية تشتغل في حسابك الحقيقي فقط' }); return }
    if (!selected) return
    setState('connecting')
    try {
      const { data, error } = await supabase.functions.invoke('nabrah-call', { body: { op: 'web_call', agent_id: selected } })
      if (error || !data?.token || !data?.url) throw new Error('token')
      const { Room, RoomEvent, Track } = await import('livekit-client')
      const room = new Room()
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio) return
        const el = track.attach(); el.style.display = 'none'; document.body.appendChild(el); audioEls.current.push(el)
      })
      room.on(RoomEvent.Disconnected, () => { void hangUp() })
      await room.connect(data.url, data.token)
      await room.localParticipant.setMicrophoneEnabled(true)
      roomRef.current = room
      setState('live')
    } catch {
      pushToast({ kind: 'danger', title: 'ما قدرنا نبدأ المكالمة', description: 'تأكد إن المتصفح سمح بالمايكروفون' })
      await hangUp()
    }
  }

  return (
    <NightPage>
      <PageHead title="مكالمات الويب" sub="كلّم وكيل الصوت من المتصفح مباشرة، بنفس التجربة اللي يحصل عليها زائر موقعك من زر الاتصال" />
      <Card style={{ padding: 20, display: 'grid', gap: 14, maxWidth: 520 }}>
        {!loading && agents.length === 0 && !isDemo && <div className="np-empty">ما فيه وكلاء صوت مربوطين بحسابك.</div>}
        {agents.length > 0 && <Select label="الوكيل" options={agents.map((a) => ({ value: a.agent_id, label: a.name }))} value={selected} onChange={(e) => setAgentId(e.target.value)} />}
        {state === 'live'
          ? <Button variant="secondary" onClick={() => void hangUp()}><PhoneOff size={14} /> إنهاء المكالمة</Button>
          : <Button disabled={state === 'connecting' || !selected} onClick={() => void start()}><Mic size={14} /> {state === 'connecting' ? 'جاري الاتصال…' : 'ابدأ مكالمة'}</Button>}
        {state === 'live' && <div className="np-empty">المكالمة شغّالة. تكلّم، والوكيل يسمعك ويرد.</div>}
        <small style={{ color: 'var(--text-tertiary)' }}>المكالمة تُحسب من رصيد الدقائق وتظهر في سجل المكالمات بعد ما تنتهي. لزر الاتصال على موقعك افتح «الإضافات».</small>
      </Card>
    </NightPage>
  )
}

// ---------------------------------------------------------------- API reference
interface ApiOp { name: string; scope: 'read' | 'write'; description: string; arguments: Record<string, { type?: string; description?: string }>; required: string[]; endpoint: string }

/** API reference: every operation of the Madar public API, read live from the API itself. */
export function DashboardV2ApiReference() {
  const pushToast = useToast()
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/madar-api`
  const [ops, setOps] = useState<ApiOp[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetch(base).then((r) => r.json()).then((d) => setOps(d.operations || [])).catch(() => setFailed(true))
  }, [base])
  const copy = (t: string) => { navigator.clipboard?.writeText(t).then(() => pushToast({ kind: 'success', title: 'انسخ' }), () => undefined) }
  const curl = (o: ApiOp) => {
    const args = Object.fromEntries(o.required.map((k) => [k, '...']))
    return o.scope === 'write' || o.required.length
      ? `curl -X POST ${base}${o.endpoint} \\\n  -H "Authorization: Bearer mk_..." \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(args)}'`
      : `curl ${base}${o.endpoint} \\\n  -H "Authorization: Bearer mk_..."`
  }

  return (
    <NightPage>
      <PageHead title="مرجع API" sub="كل العمليات المتاحة في واجهة مدار البرمجية. أنشئ مفتاحك من «المطورون والأتمتة» ثم أرسله في ترويسة Authorization" />
      <Card style={{ padding: 16, display: 'grid', gap: 6, fontSize: 13 }}>
        <div>العنوان الأساسي: <code dir="ltr">{base}/v1/&lt;operation&gt;</code></div>
        <div>المفاتيح بصلاحية <b>قراءة</b> تستدعي عمليات القراءة فقط، وبصلاحية <b>كتابة</b> تستدعي الكل. المعاملات في رابط الطلب (GET) أو جسمه بصيغة JSON (POST).</div>
      </Card>
      {failed && <Card style={{ padding: 16 }}><div className="np-empty">تعذّر جلب قائمة العمليات.</div></Card>}
      {!ops && !failed && <Card style={{ padding: 16 }}><div className="np-empty">جاري التحميل…</div></Card>}
      {ops?.map((o) => (
        <Card key={o.name} style={{ padding: 16, display: 'grid', gap: 8 }}>
          <h3 className="np-h3"><Code2 size={16} /> <span dir="ltr">{o.name}</span> <Badge tone={o.scope === 'write' ? 'warning' : 'neutral'}>{o.scope === 'write' ? 'كتابة' : 'قراءة'}</Badge></h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{o.description}</div>
          {Object.keys(o.arguments || {}).length > 0 && (
            <div style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
              {Object.entries(o.arguments).map(([k, v]) => (
                <div key={k}><code dir="ltr">{k}</code> <span style={{ color: 'var(--text-tertiary)' }}>{v.type || ''}{o.required.includes(k) ? ' · مطلوب' : ''}</span>{v.description ? ` — ${v.description}` : ''}</div>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <pre dir="ltr" style={{ margin: 0, padding: 12, borderRadius: 10, background: 'var(--raise)', fontSize: 12, overflowX: 'auto', textAlign: 'left' }}>{curl(o)}</pre>
            <button type="button" className="gr-btn" style={{ position: 'absolute', top: 6, right: 6 }} aria-label="نسخ" onClick={() => copy(curl(o))}><Copy /></button>
          </div>
        </Card>
      ))}
    </NightPage>
  )
}
