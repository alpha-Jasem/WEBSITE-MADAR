import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, Pencil, Trash2, Users, Send, X, Search } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTeams } from '@/lib/queries/teams'
import { useLeadStages } from '@/lib/queries/workspaceSettings'
import { deleteSegment, saveSegment, segmentMembers, useContacts, useSegments, type Segment } from '@/lib/queries/segments'
import {
  describeRules, EMPTY_RULES, FIELD_ORDER, FIELDS, NO_VALUE, OP_LABELS, SEGMENT_TEMPLATES,
  type Choice, type Condition, type FieldId, type RuleGroup, type SegmentRules,
} from '@/lib/segments'
import type { Contact } from '@/lib/contacts'
import { Badge, Button, Card, Dialog } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, Seg, fmtNum } from './shared/night'
import { fmtWhen } from './conversations/model'
import './growth.css'

interface Draft { id?: string; name: string; description: string; kind: Segment['kind']; rules: SegmentRules; member_keys: string[] }
const NEW_DRAFT: Draft = { name: '', description: '', kind: 'dynamic', rules: EMPTY_RULES, member_keys: [] }

/** Options for the fields whose values come from the company's own data (tags, teams). */
function useChoices(contacts: Contact[]) {
  const { companyId, isDemo } = useWorkspace()
  const { teams } = useTeams(companyId, isDemo)
  const { stages } = useLeadStages(companyId, isDemo)
  return useMemo(() => {
    const tags = new Map<string, string>()
    for (const c of contacts) c.tagIds.forEach((id, i) => tags.set(id, c.tagLabels[i] || id))
    const out: Partial<Record<FieldId, Choice[]>> = {
      tag: [...tags].map(([value, label]) => ({ value, label })),
      team: teams.map((t) => ({ value: t.id, label: t.name })),
      stage: stages.map((s) => ({ value: s.id, label: s.label })),
    }
    const lookup = (field: FieldId, value: string) => out[field]?.find((o) => o.value === value)?.label || value
    return { options: out, lookup }
  }, [contacts, teams, stages])
}

/** Customer segments: saved groups of customers by conditions, with a live count before saving. */
export function DashboardV2Segments() {
  const { companyId, isDemo, can } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const pushToast = useToast()
  const { contacts, loading } = useContacts(companyId, isDemo)
  const { segments, available } = useSegments(companyId, isDemo)
  const { options, lookup } = useChoices(contacts)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [viewing, setViewing] = useState<Segment | null>(null)
  const [busy, setBusy] = useState(false)

  const counts = useMemo(() => new Map(segments.map((s) => [s.id, segmentMembers(s, contacts).length])), [segments, contacts])

  async function submit() {
    if (!draft) return
    if (!draft.name.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم الشريحة' }); return }
    setBusy(true)
    try {
      await saveSegment(companyId, isDemo, { ...draft, description: draft.description || null })
      pushToast({ kind: 'success', title: draft.id ? 'انحفظت التعديلات' : 'انحفظت الشريحة' })
      setDraft(null)
    } catch (e) {
      pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined })
    } finally { setBusy(false) }
  }

  async function remove(s: Segment) {
    if (!window.confirm(`حذف شريحة «${s.name}»؟ العملاء أنفسهم ما ينحذفون.`)) return
    try { await deleteSegment(companyId, isDemo, s.id); pushToast({ kind: 'success', title: 'انحذفت الشريحة' }) }
    catch { pushToast({ kind: 'danger', title: 'ما انحذفت' }) }
  }

  return (
    <NightPage>
      <PageHead
        title="الشرائح"
        sub={`${fmtNum(contacts.length)} عميل · قسّم عملاءك بشروط وتتحدث الشريحة تلقائيًا، ثم أرسل لها حملة`}
        actions={available ? <Button onClick={() => setDraft({ ...NEW_DRAFT })}><Plus size={14} /> شريحة جديدة</Button> : undefined}
      />

      {!available && <Card style={{ padding: 16 }}><div className="np-empty">الشرائح تتفعّل بعد تحديث قاعدة البيانات.</div></Card>}

      {available && segments.length === 0 && !loading && (
        <Card>
          <EmptyState icon={<Layers size={20} />} title="ما عندك شرائح بعد" description="ابدأ من قالب جاهز أو سوّ شريحتك بشروطك." />
          <div className="gr-chips" style={{ justifyContent: 'center', marginTop: 12 }}>
            {SEGMENT_TEMPLATES.map((t) => (
              <button key={t.id} type="button" className="gr-chip" onClick={() => setDraft({ ...NEW_DRAFT, name: t.label, description: t.description, rules: t.rules })}>{t.label}</button>
            ))}
          </div>
        </Card>
      )}

      {available && segments.length > 0 && (
        <div className="gr-grid">
          {segments.map((s) => (
            <div key={s.id} className="gr-card">
              <h4>{s.name} <Badge tone={s.kind === 'dynamic' ? 'brand' : 'neutral'}>{s.kind === 'dynamic' ? 'تتحدث تلقائيًا' : 'قائمة ثابتة'}</Badge></h4>
              <div className="gr-count">{fmtNum(counts.get(s.id) || 0)}<small>عميل</small></div>
              <p>{s.kind === 'dynamic' ? describeRules(s.rules, lookup) : s.description || 'عملاء اخترتهم بنفسك'}</p>
              <div className="gr-acts">
                <button type="button" className="gr-btn" onClick={() => setViewing(s)}><Users /> الأعضاء</button>
                <button type="button" className="gr-btn" onClick={() => setDraft({ id: s.id, name: s.name, description: s.description || '', kind: s.kind, rules: s.rules, member_keys: s.member_keys })}><Pencil /> تعديل</button>
                {can('outreach.send') && <button type="button" className="gr-btn" onClick={() => navigate(`${base}/campaigns?new=1&segment=${encodeURIComponent(s.id)}`)}><Send /> حملة</button>}
                <button type="button" className="gr-btn" aria-label={`حذف ${s.name}`} onClick={() => void remove(s)}><Trash2 /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!draft} width={980} title={draft?.id ? 'تعديل الشريحة' : 'شريحة جديدة'} onClose={() => setDraft(null)}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>إلغاء</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? 'جارِ الحفظ…' : 'حفظ'}</Button></>}>
        {draft && <SegmentEditor draft={draft} onChange={setDraft} contacts={contacts} options={options} lookup={lookup} />}
      </Dialog>

      <Dialog open={!!viewing} width={720} title={viewing ? `أعضاء «${viewing.name}»` : ''} onClose={() => setViewing(null)}>
        {viewing && <MemberTable list={segmentMembers(viewing, contacts)} onOpen={(c) => c.convKey && navigate(`${base}/conversations?id=${encodeURIComponent(c.convKey)}`)} />}
      </Dialog>
    </NightPage>
  )
}

function MemberTable({ list, onOpen }: { list: Contact[]; onOpen: (c: Contact) => void }) {
  if (list.length === 0) return <div className="np-empty">ما فيه أحد ينطبق عليه الآن.</div>
  return (
    <div className="np-table-wrap">
      <table className="np-table" style={{ minWidth: 520 }}>
        <thead><tr><th>العميل</th><th>الجوال</th><th>آخر تواصل</th><th>عدد التواصل</th></tr></thead>
        <tbody>
          {list.slice(0, 300).map((c) => (
            <tr key={c.key} className={c.convKey ? 'clickable' : undefined} onClick={() => onOpen(c)}>
              <td className="strong">{c.name}</td>
              <td dir="ltr" className="np-num" style={{ textAlign: 'end' }}>{c.phone || '—'}</td>
              <td>{c.lastAt ? fmtWhen(c.lastAt) : '—'}</td>
              <td className="np-num">{fmtNum(c.visits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {list.length > 300 && <div className="np-empty">يظهر أول 300 من {fmtNum(list.length)}.</div>}
    </div>
  )
}

function SegmentEditor({ draft, onChange, contacts, options, lookup }: {
  draft: Draft; onChange: (d: Draft) => void; contacts: Contact[]
  options: Partial<Record<FieldId, Choice[]>>; lookup: (f: FieldId, v: string) => string
}) {
  const [q, setQ] = useState('')
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  const setRules = (rules: SegmentRules) => set({ rules })
  const setGroup = (gi: number, g: RuleGroup | null) =>
    setRules({ ...draft.rules, groups: g ? draft.rules.groups.map((x, i) => (i === gi ? g : x)) : draft.rules.groups.filter((_, i) => i !== gi) })
  const members = useMemo(() => segmentMembers(draft, contacts), [draft, contacts])
  const picked = new Set(draft.member_keys)
  const filtered = contacts.filter((c) => !q || c.name.includes(q) || c.phone.includes(q))

  return (
    <div className="gr-editor">
      <div className="gr-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <label className="gr-field"><span>اسم الشريحة</span><input className="gr-in" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثال: عملاء الرياض المتكررون" /></label>
          <label className="gr-field"><span>وصف (اختياري)</span><input className="gr-in" value={draft.description} onChange={(e) => set({ description: e.target.value })} /></label>
        </div>
        <Seg label="نوع الشريحة" value={draft.kind} onChange={(kind) => set({ kind })}
          options={[['dynamic', 'تتحدث تلقائيًا بالشروط'], ['static', 'قائمة ثابتة أختارها']] as const} />

        {draft.kind === 'dynamic' ? (
          <>
            <div className="gr-chips">
              <span style={{ fontSize: 12, color: 'var(--dim)', alignSelf: 'center' }}>ابدأ من:</span>
              {SEGMENT_TEMPLATES.map((t) => <button key={t.id} type="button" className="gr-chip" onClick={() => set({ rules: t.rules, name: draft.name || t.label })}>{t.label}</button>)}
            </div>
            {draft.rules.groups.length > 1 && (
              <label className="gr-field" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <span>العميل يدخل الشريحة إذا انطبقت</span>
                <select className="gr-sel" value={draft.rules.match} onChange={(e) => setRules({ ...draft.rules, match: e.target.value as 'all' | 'any' })}>
                  <option value="all">كل المجموعات</option><option value="any">أي مجموعة منها</option>
                </select>
              </label>
            )}
            {draft.rules.groups.map((g, gi) => (
              <div key={gi}>
                {gi > 0 && <div className="gr-join">{draft.rules.match === 'all' ? 'و' : 'أو'}</div>}
                <GroupEditor group={g} onChange={(ng) => setGroup(gi, ng)} canRemove={draft.rules.groups.length > 1} options={options} />
              </div>
            ))}
            <div><button type="button" className="gr-btn" onClick={() => setRules({ ...draft.rules, groups: [...draft.rules.groups, { match: 'all', conditions: [] }] })}><Plus /> مجموعة شروط</button></div>
          </>
        ) : (
          <>
            <label className="gr-field"><span>اختر العملاء ({fmtNum(picked.size)})</span>
              <span style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', insetInlineStart: 10, top: 10, color: 'var(--dim)' }} />
                <input className="gr-in" style={{ width: '100%', paddingInlineStart: 30 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الجوال" />
              </span>
            </label>
            <div className="gr-pick">
              {filtered.slice(0, 200).map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={picked.has(c.key)} onChange={() => {
                    const n = new Set(picked); n.has(c.key) ? n.delete(c.key) : n.add(c.key); set({ member_keys: [...n] })
                  }} />
                  {c.name}<small dir="ltr">{c.phone}</small>
                </label>
              ))}
              {filtered.length === 0 && <div className="np-empty">ما فيه نتائج.</div>}
            </div>
          </>
        )}
      </div>

      <aside className="gr-preview" aria-live="polite">
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>معاينة قبل الحفظ</div>
        <div className="gr-count">{fmtNum(members.length)}<small>عميل ينطبق عليهم الآن</small></div>
        {draft.kind === 'dynamic' && <div className="gr-sentence">{describeRules(draft.rules, lookup)}</div>}
        <ul>
          {members.slice(0, 12).map((c) => <li key={c.key}>{c.name}<span>{c.lastAt ? fmtWhen(c.lastAt) : '—'}</span></li>)}
        </ul>
        {members.length > 12 && <div style={{ fontSize: 12, color: 'var(--dim)' }}>و{fmtNum(members.length - 12)} غيرهم</div>}
        {draft.kind === 'dynamic' && <div style={{ fontSize: 11.5, color: 'var(--dim)', lineHeight: 1.7 }}>الشريحة تتحدث لحالها: أي عميل جديد تنطبق عليه الشروط يدخل، واللي ما عادت تنطبق عليه يطلع.</div>}
      </aside>
    </div>
  )
}

function GroupEditor({ group, onChange, canRemove, options }: {
  group: RuleGroup; onChange: (g: RuleGroup | null) => void; canRemove: boolean; options: Partial<Record<FieldId, Choice[]>>
}) {
  const setCond = (ci: number, c: Condition | null) =>
    onChange({ ...group, conditions: c ? group.conditions.map((x, i) => (i === ci ? c : x)) : group.conditions.filter((_, i) => i !== ci) })
  return (
    <div className="gr-group">
      <div className="gr-group-head">
        <select className="gr-sel" value={group.match} onChange={(e) => onChange({ ...group, match: e.target.value as 'all' | 'any' })} aria-label="ربط الشروط">
          <option value="all">كل الشروط</option><option value="any">أي شرط</option>
        </select>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={!!group.negate} onChange={(e) => onChange({ ...group, negate: e.target.checked })} /> استثني من ينطبق عليه
        </label>
        {canRemove && <button type="button" className="gr-x" style={{ marginInlineStart: 'auto' }} aria-label="حذف المجموعة" onClick={() => onChange(null)}><X size={14} /></button>}
      </div>
      {group.conditions.length === 0 && <div style={{ fontSize: 12, color: 'var(--dim)' }}>بدون شروط، تشمل كل العملاء.</div>}
      {group.conditions.map((c, ci) => (
        <div key={ci}>
          {ci > 0 && <div className="gr-join">{group.match === 'all' ? 'و' : 'أو'}</div>}
          <ConditionRow cond={c} onChange={(nc) => setCond(ci, nc)} options={options} />
        </div>
      ))}
      <div><button type="button" className="gr-btn" onClick={() => onChange({ ...group, conditions: [...group.conditions, { field: 'last_contact', op: 'within', value: 30 }] })}><Plus /> شرط</button></div>
    </div>
  )
}

function ConditionRow({ cond, onChange, options }: { cond: Condition; onChange: (c: Condition | null) => void; options: Partial<Record<FieldId, Choice[]>> }) {
  const f = FIELDS[cond.field]
  const choices = f.options || options[cond.field] || []
  const needsValue = !NO_VALUE.includes(cond.op)
  return (
    <div className="gr-cond">
      <select className="gr-sel" aria-label="الحقل" value={cond.field} onChange={(e) => {
        const field = e.target.value as FieldId
        const nf = FIELDS[field]
        const first = (nf.options || options[field] || [])[0]?.value
        onChange({ field, op: nf.ops[0], value: nf.kind === 'number' ? 1 : nf.kind === 'days' ? 30 : first ?? '' })
      }}>
        {FIELD_ORDER.map((id) => <option key={id} value={id}>{FIELDS[id].label}</option>)}
      </select>
      <select className="gr-sel" aria-label="الشرط" value={cond.op} onChange={(e) => onChange({ ...cond, op: e.target.value as Condition['op'] })}>
        {f.ops.map((op) => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
      </select>
      {!needsValue ? <span /> : f.kind === 'enum' || f.kind === 'list' ? (
        <select className="gr-sel" aria-label="القيمة" value={String(cond.value ?? '')} onChange={(e) => onChange({ ...cond, value: e.target.value })}>
          {choices.length === 0 && <option value="">ما فيه خيارات</option>}
          {choices.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : f.kind === 'number' || f.kind === 'days' ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input className="gr-in" type="number" min={0} style={{ width: '100%' }} aria-label="القيمة" value={String(cond.value ?? '')} onChange={(e) => onChange({ ...cond, value: Number(e.target.value) })} />
          {f.kind === 'days' && <small style={{ color: 'var(--dim)' }}>يوم</small>}
        </span>
      ) : (
        <input className="gr-in" aria-label="القيمة" value={String(cond.value ?? '')} onChange={(e) => onChange({ ...cond, value: e.target.value })} />
      )}
      <button type="button" className="gr-x" aria-label="حذف الشرط" onClick={() => onChange(null)}><X size={14} /></button>
    </div>
  )
}
