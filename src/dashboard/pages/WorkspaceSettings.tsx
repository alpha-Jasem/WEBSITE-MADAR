import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Check } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { PERMISSION_GROUPS, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PRESETS } from '@/lib/permissions'
import {
  DEFAULT_PREFS, deleteCustomField, deleteLeadStage, FIELD_TYPE_LABELS, NOTIFY_LABELS, saveCompanyPrefs, saveCustomField, saveLeadStage,
  useCompanyPrefs, useCustomFields, useLeadStages, type CompanyPrefs, type CustomField, type FieldType, type LeadStage,
} from '@/lib/queries/workspaceSettings'
import { Button, Card, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { Chip, NightPage, PageHead, Seg, Toggle } from './shared/night'
import './growth.css'

type Tab = 'stages' | 'fields' | 'branding' | 'notify' | 'perms'
const COLORS = ['#7aa2ff', '#4ade80', '#f5b84a', '#f87171', '#c084fc', '#38bdf8', '#fb923c', '#94a3b8']

const CSS = `
.ws-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; }
.ws-row + .ws-row { margin-top: 8px; }
.ws-dot { width: 12px; height: 12px; border-radius: 50%; flex: none; }
.ws-grow { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.ws-grow small { display: block; color: var(--text-tertiary); font-size: 12px; }
.ws-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.ws-color { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.ws-color[aria-pressed="true"] { border-color: var(--ink); box-shadow: 0 0 0 2px var(--panel); }
.ws-matrix { width: 100%; border-collapse: collapse; font-size: 13px; }
.ws-matrix th, .ws-matrix td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: center; }
.ws-matrix th:first-child, .ws-matrix td:first-child { text-align: start; }
.ws-matrix tr.grp td { background: var(--fill-hover, rgba(255,255,255,.04)); font-weight: 700; text-align: start; }
.ws-scroll { overflow-x: auto; }
`

/** Workspace settings: lead stages, custom fields, branding, notification preferences, and who may do what. */
export function DashboardV2WorkspaceSettings() {
  const { companyId, isDemo, can } = useWorkspace()
  const [tab, setTab] = useState<Tab>('stages')
  const canEdit = can('team.manage')
  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="إعدادات مساحة العمل" sub="مراحل العملاء، حقول إضافية، الهوية، التنبيهات، وصلاحيات كل دور"
        actions={<Seg label="القسم" value={tab} onChange={setTab} options={[['stages', 'المراحل'], ['fields', 'الحقول'], ['branding', 'الهوية'], ['notify', 'التنبيهات'], ['perms', 'الصلاحيات']] as const} />} />
      {!canEdit && tab !== 'perms' && <Card style={{ padding: 12, marginBottom: 12 }}><div className="np-empty">تقدر تشوف الإعدادات، والتعديل لصاحب الحساب.</div></Card>}
      {tab === 'stages' && <Stages companyId={companyId} isDemo={isDemo} canEdit={canEdit} />}
      {tab === 'fields' && <Fields companyId={companyId} isDemo={isDemo} canEdit={canEdit} />}
      {tab === 'branding' && <Branding companyId={companyId} isDemo={isDemo} canEdit={canEdit} />}
      {tab === 'notify' && <Notify companyId={companyId} isDemo={isDemo} canEdit={canEdit} />}
      {tab === 'perms' && <Perms />}
    </NightPage>
  )
}

interface P { companyId: string | null; isDemo: boolean; canEdit: boolean }

function Stages({ companyId, isDemo, canEdit }: P) {
  const pushToast = useToast()
  const { stages, available } = useLeadStages(companyId, isDemo)
  const [d, setD] = useState<(Omit<LeadStage, 'id'> & { id?: string }) | null>(null)
  async function submit() {
    if (!d) return
    try { await saveLeadStage(companyId, isDemo, d); setD(null); pushToast({ kind: 'success', title: 'انحفظت المرحلة' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined }) }
  }
  if (!available) return <Card style={{ padding: 16 }}><div className="np-empty">المراحل تتفعّل بعد تحديث قاعدة البيانات.</div></Card>
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <b>مراحل العميل المحتمل</b>
        {canEdit && <Button onClick={() => setD({ label: '', color: COLORS[0], position: stages.length, is_won: false, is_lost: false })}><Plus size={14} /> مرحلة</Button>}
      </div>
      {stages.length === 0 ? <EmptyState title="ما عندك مراحل بعد" description="رتّب رحلة العميل من أول تواصل لين الحجز أو الشراء." /> : stages.map((s) => (
        <div key={s.id} className="ws-row">
          <i className="ws-dot" style={{ background: s.color }} />
          <div className="ws-grow">{s.label}{(s.is_won || s.is_lost) && <small>{s.is_won ? 'مرحلة نجاح' : 'مرحلة خسارة'}</small>}</div>
          {canEdit && <>
            <button type="button" className="gr-btn" aria-label="تعديل" onClick={() => setD({ ...s })}><Pencil /></button>
            <button type="button" className="gr-btn" aria-label="حذف" onClick={() => { if (window.confirm?.(`تحذف مرحلة «${s.label}»؟`)) void deleteLeadStage(companyId, isDemo, s.id) }}><Trash2 /></button>
          </>}
        </div>
      ))}
      <Dialog open={!!d} title={d?.id ? 'تعديل المرحلة' : 'مرحلة جديدة'} onClose={() => setD(null)}
        footer={<><Button variant="ghost" onClick={() => setD(null)}>إلغاء</Button><Button onClick={() => void submit()}>حفظ</Button></>}>
        {d && <div style={{ display: 'grid', gap: 12 }}>
          <Input label="اسم المرحلة" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
          <div className="ws-colors">{COLORS.map((c) => <button key={c} type="button" className="ws-color" style={{ background: c }} aria-label={c} aria-pressed={d.color === c} onClick={() => setD({ ...d, color: c })} />)}</div>
          <Toggle label="مرحلة نجاح (حجز أو شراء)" checked={d.is_won} onChange={(v) => setD({ ...d, is_won: v, is_lost: v ? false : d.is_lost })} />
          <Toggle label="مرحلة خسارة" checked={d.is_lost} onChange={(v) => setD({ ...d, is_lost: v, is_won: v ? false : d.is_won })} />
        </div>}
      </Dialog>
    </Card>
  )
}

function Fields({ companyId, isDemo, canEdit }: P) {
  const pushToast = useToast()
  const { fields, available } = useCustomFields(companyId, isDemo)
  const [d, setD] = useState<(Omit<CustomField, 'id' | 'options'> & { id?: string; optionsText: string }) | null>(null)
  async function submit() {
    if (!d) return
    try {
      await saveCustomField(companyId, isDemo, { id: d.id, label: d.label, field_type: d.field_type, position: d.position, options: d.optionsText.split('\n') })
      setD(null); pushToast({ kind: 'success', title: 'انحفظ الحقل' })
    } catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظ', description: e instanceof Error ? e.message : undefined }) }
  }
  if (!available) return <Card style={{ padding: 16 }}><div className="np-empty">الحقول تتفعّل بعد تحديث قاعدة البيانات.</div></Card>
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <b>حقول إضافية للعميل</b>
        {canEdit && <Button onClick={() => setD({ label: '', field_type: 'text', optionsText: '', position: fields.length })}><Plus size={14} /> حقل</Button>}
      </div>
      {fields.length === 0 ? <EmptyState title="ما عندك حقول إضافية" description="أضف معلومة تهمك عن عميلك، مثل المدينة أو مصدر العميل." /> : fields.map((f) => (
        <div key={f.id} className="ws-row">
          <div className="ws-grow">{f.label}<small>{FIELD_TYPE_LABELS[f.field_type]}{f.options.length ? ` · ${f.options.join('، ')}` : ''}</small></div>
          {canEdit && <>
            <button type="button" className="gr-btn" aria-label="تعديل" onClick={() => setD({ id: f.id, label: f.label, field_type: f.field_type, position: f.position, optionsText: f.options.join('\n') })}><Pencil /></button>
            <button type="button" className="gr-btn" aria-label="حذف" onClick={() => { if (window.confirm?.(`تحذف حقل «${f.label}»؟`)) void deleteCustomField(companyId, isDemo, f.id) }}><Trash2 /></button>
          </>}
        </div>
      ))}
      <Dialog open={!!d} title={d?.id ? 'تعديل الحقل' : 'حقل جديد'} onClose={() => setD(null)}
        footer={<><Button variant="ghost" onClick={() => setD(null)}>إلغاء</Button><Button onClick={() => void submit()}>حفظ</Button></>}>
        {d && <div style={{ display: 'grid', gap: 12 }}>
          <Input label="اسم الحقل" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} />
          <Select label="النوع" options={(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((v) => ({ value: v, label: FIELD_TYPE_LABELS[v] }))} value={d.field_type} onChange={(e) => setD({ ...d, field_type: e.target.value as FieldType })} />
          {d.field_type === 'select' && (
            <label style={{ display: 'grid', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>الخيارات (واحد في كل سطر)
              <textarea rows={4} value={d.optionsText} onChange={(e) => setD({ ...d, optionsText: e.target.value })}
                style={{ borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'inherit', padding: 10, font: 'inherit' }} />
            </label>
          )}
        </div>}
      </Dialog>
    </Card>
  )
}

function usePrefsDraft({ companyId, isDemo }: P) {
  const { prefs, available, loading } = useCompanyPrefs(companyId, isDemo)
  const [draft, setDraft] = useState<CompanyPrefs>(DEFAULT_PREFS)
  const [busy, setBusy] = useState(false)
  const pushToast = useToast()
  useEffect(() => { setDraft(prefs) }, [prefs])
  async function save() {
    setBusy(true)
    try { await saveCompanyPrefs(companyId, isDemo, draft); pushToast({ kind: 'success', title: 'انحفظت الإعدادات' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظت', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }
  return { draft, setDraft, available, loading, busy, save }
}

function Branding(p: P) {
  const { draft, setDraft, available, busy, save } = usePrefsDraft(p)
  if (!available) return <Card style={{ padding: 16 }}><div className="np-empty">الهوية تتفعّل بعد تحديث قاعدة البيانات.</div></Card>
  return (
    <Card style={{ padding: 16, display: 'grid', gap: 14, maxWidth: 560 }}>
      <b>الهوية البصرية</b>
      <Input label="الاسم الظاهر" value={draft.display_name} placeholder="اسم شركتك كما يظهر لفريقك" onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
      <Input label="رابط الشعار" value={draft.logo_url} placeholder="https://…/logo.png" onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} />
      <div style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>اللون الأساسي</span>
        <div className="ws-colors">{COLORS.map((c) => <button key={c} type="button" className="ws-color" style={{ background: c }} aria-label={c} aria-pressed={draft.brand_color === c} disabled={!p.canEdit} onClick={() => setDraft({ ...draft, brand_color: c })} />)}</div>
      </div>
      {draft.logo_url && <img src={draft.logo_url} alt="" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />}
      {p.canEdit && <div><Button disabled={busy} onClick={() => void save()}><Check size={14} /> حفظ</Button></div>}
    </Card>
  )
}

function Notify(p: P) {
  const { draft, setDraft, available, busy, save } = usePrefsDraft(p)
  if (!available) return <Card style={{ padding: 16 }}><div className="np-empty">التنبيهات تتفعّل بعد تحديث قاعدة البيانات.</div></Card>
  return (
    <Card style={{ padding: 16, display: 'grid', gap: 12, maxWidth: 560 }}>
      <b>متى توصلك تنبيهات؟</b>
      {NOTIFY_LABELS.map(([k, label, hint]) => (
        <div key={k} className="ws-row">
          <div className="ws-grow">{label}<small>{hint}</small></div>
          <Toggle label={label} checked={draft.notify[k]} disabled={!p.canEdit} onChange={(v) => setDraft({ ...draft, notify: { ...draft.notify, [k]: v } })} />
        </div>
      ))}
      {p.canEdit && <div><Button disabled={busy} onClick={() => void save()}><Check size={14} /> حفظ</Button></div>}
    </Card>
  )
}

/** Read-only: what each role may do today (from the roles' presets). Per-person changes are made in the Team page. */
function Perms() {
  const roles = Object.keys(ROLE_PRESETS)
  return (
    <Card style={{ padding: 16 }}>
      <b>ماذا يقدر كل دور يسوي</b>
      <p style={{ margin: '6px 0 12px', color: 'var(--text-tertiary)', fontSize: 13 }}>صاحب الحساب عنده كل الصلاحيات. تغيير صلاحيات شخص بعينه من صفحة «الفريق والصلاحيات».</p>
      <div className="ws-scroll">
        <table className="ws-matrix">
          <thead><tr><th>الصلاحية</th>{roles.map((r) => <th key={r} title={ROLE_DESCRIPTIONS[r]}>{ROLE_LABELS[r] || r}</th>)}</tr></thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => (
              <>
                <tr key={g.id} className="grp"><td colSpan={roles.length + 1}>{g.label}</td></tr>
                {g.items.map((it) => (
                  <tr key={it.key}><td>{it.label}</td>{roles.map((r) => <td key={r}>{ROLE_PRESETS[r].includes(it.key) ? <Chip tone="ok">نعم</Chip> : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}</td>)}</tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default DashboardV2WorkspaceSettings
