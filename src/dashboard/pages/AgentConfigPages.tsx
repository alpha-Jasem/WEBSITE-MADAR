import { useState, type ReactNode } from 'react'
import { Plus, Pencil, Trash2, Wrench, ListChecks, PhoneIncoming, PhoneOutgoing, Search, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import {
  useAgentTools, saveAgentTool, deleteAgentTool, useAnalysisGroups, saveAnalysisGroup, deleteAnalysisGroup, syncAnalysisGroups,
  useVoiceServices, saveVoiceService, deleteVoiceService, voiceServiceCall, STATUS_LABELS,
  type AgentTool, type AnalysisGroup, type AnalysisField, type ToolParam, type VoiceService, type ServiceStatus,
} from '@/lib/queries/agentConfig'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { Badge, Button, Card, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage } from './shared/night'
import './growth.css'

const textarea = { width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'inherit', padding: 10, font: 'inherit' } as const

const CFG_CSS = `
.cfg-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 22px 24px; }
.cfg-head h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--ink); }
.cfg-head p { margin: 4px 0 0; font-size: 13.5px; color: var(--muted); max-width: 64ch; }
.cfg-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.cfg-new { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px; border-radius: 12px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.cfg-new:focus-visible, .cfg-list .gr-btn:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.cfg-search { display: flex; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 6px 8px; }
.cfg-search label { flex: 1; display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 0 12px; height: 42px; border: 1px solid var(--line); color: var(--muted); }
.cfg-search input { flex: 1; border: 0; outline: 0; background: transparent; color: var(--ink); font: inherit; font-size: 14px; min-width: 0; }
.cfg-list { display: grid; gap: 12px; }
.cfg-list .gr-card { display: grid; grid-template-columns: 1fr auto; column-gap: 16px; row-gap: 6px; align-items: center; border-radius: 20px; padding: 16px 20px; background: var(--panel); }
.cfg-list .gr-card h4 { font-size: 15.5px; font-weight: 700; }
.cfg-list .gr-card > .gr-acts { grid-column: 2; grid-row: 1 / span 6; margin: 0; flex-wrap: nowrap; }
.cfg-list .gr-btn { height: 38px; padding: 0 14px; border-radius: 12px; background: var(--panel); }
.cfg-list .gr-btn.del { width: 38px; padding: 0; justify-content: center; color: var(--bad, #dc2626); background: color-mix(in srgb, var(--bad, #dc2626) 10%, transparent); border-color: color-mix(in srgb, var(--bad, #dc2626) 25%, var(--line)); }
@media (max-width: 640px) { .cfg-list .gr-card { grid-template-columns: 1fr; } .cfg-list .gr-card > .gr-acts { grid-column: 1; grid-row: auto; } }
`

/** Shared list page, laid out like the voice platform's: a header card, a search box, then one wide row per item. */
function ConfigPage<T extends { id: string }>({ title, sub, createLabel, available, loading, items, emptyIcon, emptyTitle, emptyText, canEdit, onNew, renderCard, dialog, extraActions, searchPlaceholder, searchIcon, emptyAction }: {
  title: string; sub: string; createLabel: string; available: boolean; loading: boolean; items: T[]; emptyIcon: ReactNode
  emptyTitle: string; emptyText: string; canEdit: boolean; onNew: () => void; renderCard: (item: T) => ReactNode; dialog: ReactNode; extraActions?: ReactNode; searchPlaceholder?: string; searchIcon?: ReactNode; emptyAction?: ReactNode
}) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = needle ? items.filter((it) => [(it as { name?: string }).name, (it as { description?: string | null }).description, (it as { phone?: string }).phone, (it as { url?: string }).url].some((v) => String(v ?? '').toLowerCase().includes(needle))) : items
  return (
    <NightPage>
      <style>{CFG_CSS}</style>
      <div className="cfg-head">
        <div><h1>{title}</h1><p>{sub}</p></div>
        {available && canEdit && <div className="cfg-acts">{extraActions}<button type="button" className="cfg-new" onClick={onNew}><Plus size={16} /> {createLabel}</button></div>}
      </div>
      {available && items.length > 0 && (
        <div className="cfg-search"><label>{searchIcon ?? <Search size={16} />}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder || 'ابحث بالاسم…'} aria-label="بحث" /></label></div>
      )}
      {!available && <Card style={{ padding: 16 }}><div className="np-empty">هذي الصفحة تتفعّل بعد تحديث قاعدة البيانات.</div></Card>}
      {available && items.length === 0 && !loading && <Card><EmptyState icon={emptyIcon} title={emptyTitle} description={emptyText} action={emptyAction} /></Card>}
      {available && items.length > 0 && shown.length === 0 && <Card><div className="np-empty">ما فيه نتائج تطابق البحث.</div></Card>}
      {available && shown.length > 0 && <div className="cfg-list">{shown.map(renderCard)}</div>}
      {dialog}
    </NightPage>
  )
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="gr-acts">
      <button type="button" className="gr-btn" onClick={onEdit}><Pencil /> تعديل</button>
      <button type="button" className="gr-btn del" onClick={onDelete} aria-label="حذف" title="حذف"><Trash2 /></button>
    </div>
  )
}

function useSaver(onDone: () => void) {
  const pushToast = useToast()
  const [busy, setBusy] = useState(false)
  async function run(job: () => Promise<void>, okTitle: string) {
    setBusy(true)
    try { await job(); pushToast({ kind: 'success', title: okTitle }); onDone() }
    catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظ', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }
  async function del(name: string, job: () => Promise<void>) {
    if (!window.confirm?.(`تحذف «${name}»؟`)) return
    try { await job(); pushToast({ kind: 'success', title: 'انحذف' }) } catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
  }
  return { busy, run, del, pushToast }
}

function DialogShell({ open, title, onClose, busy, onSave, children }: { open: boolean; title: string; onClose: () => void; busy: boolean; onSave: () => void; children: ReactNode }) {
  return (
    <Dialog open={open} title={title} onClose={onClose} width={560}
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button disabled={busy} onClick={onSave}>حفظ</Button></>}>
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </Dialog>
  )
}

// ---------------------------------------------------------------- tools
type ToolDraft = { id?: string; name: string; description: string; method: AgentTool['method']; url: string; params: ToolParam[]; enabled: boolean }
const NEW_TOOL: ToolDraft = { name: '', description: '', method: 'GET', url: 'https://', params: [], enabled: true }

/** Tools: HTTP endpoints the voice agent can call during a conversation (check a price, create a booking...). */
export function DashboardV2Tools() {
  const { companyId, isDemo, can } = useWorkspace()
  const { items, available, loading } = useAgentTools(companyId, isDemo)
  const [draft, setDraft] = useState<ToolDraft | null>(null)
  const { busy, run, del, pushToast } = useSaver(() => setDraft(null))

  function submit() {
    if (!draft) return
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(draft.name)) { pushToast({ kind: 'danger', title: 'اسم الأداة بحروف إنجليزية صغيرة وأرقام و _ فقط' }); return }
    if (!draft.description.trim()) { pushToast({ kind: 'danger', title: 'اكتب وصفًا يفهم منه الوكيل متى يستخدمها' }); return }
    if (!/^https:\/\/\S+\.\S+/.test(draft.url)) { pushToast({ kind: 'danger', title: 'الرابط لازم يبدأ بـ https://' }); return }
    if (draft.params.some((p) => !p.name.trim())) { pushToast({ kind: 'danger', title: 'اكتب اسم كل معامل' }); return }
    void run(() => saveAgentTool(companyId, isDemo, { ...draft, description: draft.description.trim(), url: draft.url.trim() }), 'انحفظت الأداة')
  }
  const setParam = (i: number, patch: Partial<ToolParam>) => setDraft((d) => d && { ...d, params: d.params.map((p, k) => (k === i ? { ...p, ...patch } : p)) })

  const [syncing, setSyncing] = useState(false)
  /** Pushes the enabled tools to the company's linked voice agent. */
  async function syncToAgent() {
    if (isDemo) { pushToast({ kind: 'info', title: 'في العرض التجريبي ما نزامن مع وكيل حقيقي' }); return }
    setSyncing(true)
    try {
      const { data, error } = await supabase.functions.invoke('agent-tools-sync', { body: {} })
      if (error) throw error
      if (data?.reason === 'no_linked_agent') pushToast({ kind: 'danger', title: 'ما فيه وكيل صوت مربوط بحسابك' })
      else if (data?.error) pushToast({ kind: 'danger', title: 'تعذّرت المزامنة', description: String(data.error).slice(0, 160) })
      else {
        const r = (data?.results?.[0] || {}) as { create?: string[]; update?: string[]; remove?: string[] }
        pushToast({ kind: 'success', title: 'انربطت الأدوات بالوكيل', description: `جديدة ${r.create?.length || 0}، محدّثة ${r.update?.length || 0}، محذوفة ${r.remove?.length || 0}` })
      }
    } catch { pushToast({ kind: 'danger', title: 'تعذّرت المزامنة' }) }
    finally { setSyncing(false) }
  }

  return (
    <ConfigPage
      extraActions={<Button variant="secondary" disabled={syncing} onClick={() => void syncToAgent()}>ربط بالوكيل</Button>}
      title="الأدوات" sub="نقاط HTTP يستدعيها الوكيل أثناء المحادثة، مثل جلب سعر أو التحقق من موعد. بعد أي تعديل اضغط «ربط بالوكيل»" createLabel="أداة جديدة" searchPlaceholder="ابحث في الأدوات بالاسم…"
      available={available} loading={loading} items={items} canEdit={can('agent.settings')} onNew={() => setDraft({ ...NEW_TOOL, params: [] })}
      emptyIcon={<Wrench size={20} />} emptyTitle="ما عندك أدوات بعد" emptyText="أضف أداة ليقدر الوكيل يجلب معلومة من نظامك أو ينفّذ إجراء."
      renderCard={(t) => (
        <div key={t.id} className="gr-card">
          <h4><span dir="ltr">{t.name}</span> <Badge tone="brand">{t.method}</Badge>{!t.enabled && <Badge tone="neutral">موقوفة</Badge>}</h4>
          <p>{t.description}</p>
          <p dir="ltr" style={{ textAlign: 'start', overflowWrap: 'anywhere' }}>{t.url}</p>
          {t.params.length > 0 && <p>المعاملات: {t.params.map((p) => p.name + (p.required ? '*' : '')).join('، ')}</p>}
          {can('agent.settings') && <CardActions onEdit={() => setDraft({ id: t.id, name: t.name, description: t.description, method: t.method, url: t.url, params: t.params.map((p) => ({ ...p })), enabled: t.enabled })}
            onDelete={() => void del(t.name, () => deleteAgentTool(companyId, isDemo, t.id))} />}
        </div>
      )}
      dialog={
        <DialogShell open={!!draft} title={draft?.id ? 'تعديل الأداة' : 'أداة جديدة'} onClose={() => setDraft(null)} busy={busy} onSave={submit}>
          {draft && <>
            <Input label="اسم الأداة (إنجليزي)" value={draft.name} placeholder="check_price" onChange={(e) => setDraft({ ...draft, name: e.target.value.toLowerCase() })} />
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>متى يستخدمها الوكيل؟
              <textarea rows={2} style={textarea} value={draft.description} placeholder="يجلب سعر الخدمة عندما يسأل العميل عن السعر" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Select label="الطريقة" style={{ width: 120 }} options={['GET', 'POST', 'PUT', 'DELETE'].map((v) => ({ value: v, label: v }))} value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value as AgentTool['method'] })} />
              <Input label="الرابط" style={{ flex: 1 }} value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
            </div>
            <b style={{ fontSize: 13 }}>المعاملات التي يرسلها الوكيل</b>
            {draft.params.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Input label="الاسم" style={{ flex: 1 }} value={p.name} onChange={(e) => setParam(i, { name: e.target.value })} />
                <Input label="الوصف" style={{ flex: 2 }} value={p.description} onChange={(e) => setParam(i, { description: e.target.value })} />
                <button type="button" className="gr-btn" aria-label={p.required ? 'إجباري' : 'اختياري'} onClick={() => setParam(i, { required: !p.required })}>{p.required ? 'إجباري' : 'اختياري'}</button>
                <button type="button" className="gr-btn" aria-label="حذف المعامل" onClick={() => setDraft({ ...draft, params: draft.params.filter((_, k) => k !== i) })}><X /></button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setDraft({ ...draft, params: [...draft.params, { name: '', description: '', required: true }] })}><Plus size={14} /> أضف معامل</Button>
          </>}
        </DialogShell>
      }
    />
  )
}

// ---------------------------------------------------------------- analysis groups
type GroupDraft = { id?: string; name: string; description: string; fields: AnalysisField[]; agent_ids: string[] }
const FIELD_TYPES = [{ value: 'text', label: 'نص' }, { value: 'number', label: 'رقم' }, { value: 'yes_no', label: 'نعم / لا' }]
const TYPE_LABEL: Record<AnalysisField['type'], string> = { text: 'نص', number: 'رقم', yes_no: 'نعم / لا' }

/** Analysis groups: a reusable list of facts to pull out of every call (interest, budget, next step...). */
export function DashboardV2AnalysisGroups() {
  const { companyId, isDemo, can } = useWorkspace()
  const { items, available, loading } = useAnalysisGroups(companyId, isDemo)
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = agentsRead.data?.agents ?? []
  const agentName = (id: string) => agents.find((a) => a.agent_id === id)?.name ?? 'وكيل'
  const [draft, setDraft] = useState<GroupDraft | null>(null)
  const { busy, run, del, pushToast } = useSaver(() => setDraft(null))

  function submit() {
    if (!draft) return
    if (!draft.name.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم المجموعة' }); return }
    if (draft.fields.length === 0 || draft.fields.some((f) => !f.name.trim())) { pushToast({ kind: 'danger', title: 'أضف حقلًا واحدًا على الأقل واكتب اسم كل حقل' }); return }
    void run(async () => {
      await saveAnalysisGroup(companyId, isDemo, { id: draft.id, name: draft.name.trim(), description: draft.description.trim() || null, fields: draft.fields, agent_ids: draft.agent_ids })
      if (!isDemo) await syncAnalysisGroups()
    }, 'انحفظت المجموعة وانربطت بالوكلاء')
  }
  const setField = (i: number, patch: Partial<AnalysisField>) => setDraft((d) => d && { ...d, fields: d.fields.map((f, k) => (k === i ? { ...f, ...patch } : f)) })

  return (
    <ConfigPage
      title="مجموعات التحليل" sub="قوالب قابلة لإعادة الاستخدام لما يُستخرج من كل مكالمة، تربطها بوكيل أو أكثر" createLabel="مجموعة جديدة" searchPlaceholder="ابحث في المجموعات بالاسم…"
      available={available} loading={loading} items={items} canEdit={can('agent.settings')} onNew={() => setDraft({ name: '', description: '', fields: [{ name: '', type: 'text', description: '' }], agent_ids: [] })}
      emptyIcon={<ListChecks size={20} />} emptyTitle="ما عندك مجموعات تحليل" emptyText="أنشئ أول مجموعة لتنظيم نتائج المكالمات."
      renderCard={(g: AnalysisGroup) => (
        <div key={g.id} className="gr-card">
          <h4>{g.name} <Badge tone="brand">{g.fields.length} حقول</Badge></h4>
          <p style={{ fontSize: 12.5 }}>{g.agent_ids?.length ? `تشتغل على: ${g.agent_ids.map(agentName).join('، ')}` : 'ما انربطت بأي وكيل بعد'}</p>
          {g.description && <p>{g.description}</p>}
          <ul style={{ margin: 0, paddingInlineStart: 18, display: 'grid', gap: 3, fontSize: 13, color: 'var(--text-secondary)' }}>
            {g.fields.map((f, i) => <li key={i}>{f.name} <span style={{ color: 'var(--text-tertiary)' }}>({TYPE_LABEL[f.type]})</span></li>)}
          </ul>
          {can('agent.settings') && <CardActions onEdit={() => setDraft({ id: g.id, name: g.name, description: g.description || '', fields: g.fields.map((f) => ({ ...f })), agent_ids: [...(g.agent_ids || [])] })}
            onDelete={() => void del(g.name, () => (isDemo || !g.nabrah_id ? deleteAnalysisGroup(companyId, isDemo, g.id) : syncAnalysisGroups(g.id)))} />}
        </div>
      )}
      dialog={
        <DialogShell open={!!draft} title={draft?.id ? 'تعديل المجموعة' : 'مجموعة تحليل جديدة'} onClose={() => setDraft(null)} busy={busy} onSave={submit}>
          {draft && <>
            <Input label="اسم المجموعة" value={draft.name} placeholder="مثال: تأهيل العميل" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="وصف قصير (اختياري)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <b style={{ fontSize: 13 }}>الحقول المطلوب استخراجها</b>
            {draft.fields.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <Input label="الحقل" style={{ flex: 1 }} value={f.name} onChange={(e) => setField(i, { name: e.target.value })} />
                <Select label="النوع" style={{ width: 120 }} options={FIELD_TYPES} value={f.type} onChange={(e) => setField(i, { type: e.target.value as AnalysisField['type'] })} />
                <Input label="ماذا نستخرج" style={{ flex: 2 }} value={f.description} onChange={(e) => setField(i, { description: e.target.value })} />
                <button type="button" className="gr-btn" aria-label="حذف الحقل" disabled={draft.fields.length === 1} onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, k) => k !== i) })}><X /></button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setDraft({ ...draft, fields: [...draft.fields, { name: '', type: 'text', description: '' }] })}><Plus size={14} /> أضف حقل</Button>
            <b style={{ fontSize: 13 }}>الوكلاء اللي يطبّقونها على مكالماتهم</b>
            {isDemo ? <p style={{ fontSize: 12.5, margin: 0, color: 'var(--text-tertiary)' }}>في العرض التجريبي ما نربط بوكلاء حقيقيين.</p>
              : agents.length === 0 ? <p style={{ fontSize: 12.5, margin: 0, color: 'var(--text-tertiary)' }}>{agentsRead.loading ? 'جارِ تحميل الوكلاء…' : 'ما فيه وكلاء مربوطين بحسابك.'}</p>
              : <div style={{ display: 'grid', gap: 6 }}>
                  {agents.map((a) => (
                    <label key={a.agent_id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <input type="checkbox" checked={draft.agent_ids.includes(a.agent_id)}
                        onChange={(e) => setDraft({ ...draft, agent_ids: e.target.checked ? [...draft.agent_ids, a.agent_id] : draft.agent_ids.filter((x) => x !== a.agent_id) })} />
                      {a.name || a.agent_id}
                    </label>
                  ))}
                </div>}
          </>}
        </DialogShell>
      }
    />
  )
}

// ---------------------------------------------------------------- inbound / outbound services
type ServiceDraft = {
  id?: string; name: string; phone: string; provider: string; status: ServiceStatus; notes: string
  transport: 'udp' | 'tcp' | 'tls'; ips: string; username: string; password: string; address: string; channels: string; agent_ids: string[]
  /** True when the service is already a trunk on the platform: only its agents change. */
  linked?: boolean
}
const STATUS_TONE: Record<ServiceStatus, 'success' | 'warning' | 'neutral'> = { active: 'success', pending: 'warning', paused: 'neutral' }

/** Call services: the numbers a company uses for incoming calls (forwarded to the agent) and outgoing calls (campaigns, instant calls). */
export function DashboardV2VoiceServices({ direction, headExtra }: { direction: 'inbound' | 'outbound'; headExtra?: ReactNode }) {
  const { companyId, isDemo, can } = useWorkspace()
  const { items: all, available, loading } = useVoiceServices(companyId, isDemo)
  const items = all.filter((s) => s.direction === direction)
  const { isOwner } = useWorkspace()
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = agentsRead.data?.agents ?? []
  const agentName = (id: string) => agents.find((a) => a.agent_id === id)?.name ?? 'وكيل'
  const [draft, setDraft] = useState<ServiceDraft | null>(null)
  const { busy, run, del, pushToast } = useSaver(() => setDraft(null))
  const inbound = direction === 'inbound'
  const empty: ServiceDraft = { name: '', phone: '', provider: '', status: 'pending', notes: '', transport: 'udp', ips: '', username: '', password: '', address: '', channels: '5', agent_ids: [] }

  /** A real trunk needs the carrier's details; without them the service is saved as a record our team links with you. */
  const wantsTrunk = (d: ServiceDraft) => inbound ? !!(d.ips.trim() || d.username.trim()) : !!d.address.trim()

  function submit() {
    if (!draft) return
    if (draft.linked && draft.id) {
      void run(() => voiceServiceCall({ op: 'set_agents', id: draft.id, agent_ids: draft.agent_ids }), 'انحفظت الوكلاء على الخدمة')
      return
    }
    if (!draft.name.trim() || !draft.phone.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم الخدمة والرقم' }); return }
    if (!isDemo && !draft.id && wantsTrunk(draft)) {
      void run(() => voiceServiceCall({
        op: 'create', direction, name: draft.name.trim(), phone: draft.phone.trim(), provider: draft.provider.trim(), notes: draft.notes.trim(), transport: draft.transport,
        allowed_ips: draft.ips.split(/[\n,]/).map((x) => x.trim()).filter(Boolean), username: draft.username.trim(), password: draft.password,
        address: draft.address.trim(), max_channels: Number(draft.channels) || 0, agent_ids: draft.agent_ids,
      }), 'انربطت الخدمة بالمنصة الصوتية')
      return
    }
    void run(() => saveVoiceService(companyId, isDemo, {
      id: draft.id, direction, name: draft.name.trim(), phone: draft.phone.trim(), provider: draft.provider.trim(), status: draft.status, notes: draft.notes.trim() || null,
    }), 'انحفظت الخدمة')
  }

  const editDraft = (s: VoiceService): ServiceDraft => ({ ...empty, id: s.id, name: s.name, phone: s.phone, provider: s.provider, status: s.status, notes: s.notes || '', agent_ids: [...(s.agent_ids || [])], linked: !!s.nabrah_id })

  return (
    <ConfigPage
      title={inbound ? 'الوارد' : 'الصادر'}
      sub={inbound ? 'وجّه المكالمات الواردة إلى وكلاء المساحة، وافتح أي خدمة لتغيير الوكلاء الذين يردون عليها.' : 'إدارة جذوع الصادر المستخدمة في مكالمات الحملات والاتصال الآلي.'}
      createLabel={inbound ? 'وارد جديد' : 'صادر جديد'} searchPlaceholder="بحث بالاسم أو الرقم…" searchIcon={inbound ? <PhoneIncoming size={16} /> : <PhoneOutgoing size={16} />}
      emptyAction={can('integrations.manage') ? <button type="button" className="cfg-new" onClick={() => setDraft(empty)}><Plus size={16} /> {inbound ? 'وارد جديد' : 'صادر جديد'}</button> : undefined} available={available} loading={loading} items={items} canEdit={can('integrations.manage')} onNew={() => setDraft(empty)} extraActions={headExtra}
      emptyIcon={inbound ? <PhoneIncoming size={20} /> : <PhoneOutgoing size={20} />}
      emptyTitle={inbound ? 'لا توجد خدمات وارد بعد' : 'لا توجد خدمات صادر بعد'} emptyText={inbound ? 'أنشئ خط SIP وارد، ثم اربط وكيلًا أو أكثر للرد على المكالمات.' : 'أنشئ خدمة SIP صادرة للبدء بإجراء المكالمات من مساحة العمل.'}
      renderCard={(s: VoiceService) => (
        <div key={s.id} className="gr-card">
          <h4>{s.name} <Badge tone={STATUS_TONE[s.status]}>{s.nabrah_id ? 'مربوط بالمنصة' : STATUS_LABELS[s.status]}</Badge></h4>
          <p dir="ltr" style={{ textAlign: 'start' }}>{s.phone}</p>
          {s.nabrah_id && <p style={{ fontSize: 12.5 }}>{inbound ? `SIP ${(s.transport || 'udp').toUpperCase()}${s.allowed_ips?.length ? ` · ${s.allowed_ips.length} عنوان IP مسموح` : ''}` : `${s.address || ''} · حتى ${s.max_channels || 0} قنوات`}</p>}
          {inbound && s.nabrah_id && <p style={{ fontSize: 12.5 }}>{s.agent_ids?.length ? `يرد عليها: ${s.agent_ids.map(agentName).join('، ')}` : 'ما انربط عليها وكيل بعد'}</p>}
          {s.provider && <p>المزوّد: {s.provider}</p>}
          {s.notes && <p>{s.notes}</p>}
          {can('integrations.manage') && <CardActions onEdit={() => setDraft(editDraft(s))}
            onDelete={() => void del(s.name, () => (isDemo || !s.nabrah_id ? deleteVoiceService(companyId, isDemo, s.id) : voiceServiceCall({ op: 'delete', id: s.id })))} />}
        </div>
      )}
      dialog={
        <DialogShell open={!!draft} title={draft?.linked ? 'الوكلاء على الخط' : draft?.id ? 'تعديل الخدمة' : inbound ? 'إنشاء خدمة وارد' : 'إنشاء خدمة صادر'} onClose={() => setDraft(null)} busy={busy} onSave={submit}>
          {draft && (draft.linked ? <>
            <p style={{ margin: 0, fontSize: 13 }}>{draft.name} <span dir="ltr">{draft.phone}</span></p>
            {agents.length === 0 ? <p style={{ fontSize: 12.5, margin: 0, color: 'var(--text-tertiary)' }}>ما فيه وكلاء مربوطين بحسابك.</p> : <>
              <b style={{ fontSize: 13 }}>الوكلاء اللي يردون على هذا الخط</b>
              <div style={{ display: 'grid', gap: 6 }}>
                {agents.map((a) => (
                  <label key={a.agent_id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <input type="checkbox" checked={draft.agent_ids.includes(a.agent_id)} onChange={(e) => setDraft({ ...draft, agent_ids: e.target.checked ? [...draft.agent_ids, a.agent_id] : draft.agent_ids.filter((x) => x !== a.agent_id) })} />
                    {a.name || a.agent_id}
                  </label>
                ))}
              </div></>}
          </> : <>
            <Input label="اسم الخدمة" value={draft.name} placeholder={inbound ? 'مثال: الرقم الموحد' : 'مثال: حملة المتابعة'} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="الرقم (بصيغة دولية)" value={draft.phone} placeholder="+9665XXXXXXXX" onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            <Input label="مزوّد الرقم (اختياري)" value={draft.provider} placeholder="مثال: STC" onChange={(e) => setDraft({ ...draft, provider: e.target.value })} />
            {!draft.id && !isDemo && (isOwner ? <>
              <b style={{ fontSize: 13 }}>خط SIP من مزوّد الاتصال (اختياري)</b>
              <p style={{ fontSize: 12.5, margin: 0, color: 'var(--text-tertiary)' }}>{inbound ? 'عبّي عنوان IP المسموح أو اسم المستخدم وكلمة المرور، وننشئ الخط على المنصة الصوتية ونربطه بوكيلك. لو تركتها فاضية نسجّل الرقم ونكمل الربط معك.' : 'عبّي عنوان مزوّد SIP وعدد القنوات، وننشئ الخط على المنصة الصوتية. لو تركتها فاضية نسجّل الرقم ونكمل الربط معك.'}</p>
              <Select label="بروتوكول النقل" options={[{ value: 'udp', label: 'UDP (الافتراضي)' }, { value: 'tcp', label: 'TCP' }, { value: 'tls', label: 'TLS (مشفّر)' }]} value={draft.transport} onChange={(e) => setDraft({ ...draft, transport: e.target.value as ServiceDraft['transport'] })} />
              {inbound
                ? <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>عناوين IP المسموحة (سطر لكل عنوان)
                    <textarea rows={2} dir="ltr" style={textarea} value={draft.ips} placeholder="203.0.113.10" onChange={(e) => setDraft({ ...draft, ips: e.target.value })} />
                  </label>
                : <div style={{ display: 'flex', gap: 8 }}>
                    <Input label="عنوان المزوّد" style={{ flex: 2 }} value={draft.address} placeholder="sip.provider.com" onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
                    <Input label="أقصى قنوات" type="number" style={{ flex: 1 }} value={draft.channels} onChange={(e) => setDraft({ ...draft, channels: e.target.value })} />
                  </div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Input label="اسم مستخدم SIP" style={{ flex: 1 }} value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} />
                <Input label="كلمة مرور SIP" type="password" style={{ flex: 1 }} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
              </div>
              {inbound && wantsTrunk(draft) && agents.length > 0 && <>
                <b style={{ fontSize: 13 }}>الوكلاء اللي يردون على هذا الخط</b>
                <div style={{ display: 'grid', gap: 6 }}>
                {agents.map((a) => (
                  <label key={a.agent_id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <input type="checkbox" checked={draft.agent_ids.includes(a.agent_id)} onChange={(e) => setDraft({ ...draft, agent_ids: e.target.checked ? [...draft.agent_ids, a.agent_id] : draft.agent_ids.filter((x) => x !== a.agent_id) })} />
                    {a.name || a.agent_id}
                  </label>
                ))}
              </div></>}
            </> : <p style={{ fontSize: 12.5, margin: 0, color: 'var(--text-tertiary)' }}>ربط خط SIP لصاحب الحساب فقط. تقدر تسجّل الرقم ونكمل الربط معك.</p>)}
            {!wantsTrunk(draft) && <Select label="الحالة" options={(Object.keys(STATUS_LABELS) as ServiceStatus[]).map((v) => ({ value: v, label: STATUS_LABELS[v] }))} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ServiceStatus })} />}
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>ملاحظات (اختياري)
              <textarea rows={2} style={textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
          </>)}
        </DialogShell>
      }
    />
  )
}
