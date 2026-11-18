import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Code2, Pencil, Plus, Trash2, Zap } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button, Input, Dialog } from '@/dashboard/components/primitives'
import { useToast, ContactActions } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, EmptyLine, Seg, Toggle, Chip, Kpi, fmtNum } from './shared/night'
import {
  useLeadForms, saveLeadForm, deleteLeadForm, embedCode, KIND_LABELS, FIELD_PRESETS, BLANK_FORM,
  type FormInput, type FormKind, type LeadForm,
} from '@/lib/queries/forms'

const CSS = `
.lf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.lf-card { background: var(--panel-2); border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.lf-card b { font-size: 14px; font-weight: 600; color: var(--ink); }
.lf-card small { color: var(--muted); font-size: 12.5px; }
.lf-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lf-icon { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; display: grid; place-items: center; }
.lf-icon:hover { background: var(--hover-bg); color: var(--ink); }
.lf-code { direction: ltr; text-align: left; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; overflow-x: auto; white-space: pre-wrap; word-break: break-all; color: var(--text-primary); }
.lf-hint { font-size: 12px; color: var(--text-tertiary); line-height: 1.7; }
.lf-field { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; color: var(--text-primary); }
.lf-field:last-child { border-bottom: 0; }
.lf-field label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.lf-field .req { margin-inline-start: auto; color: var(--muted); font-size: 12.5px; }
.lf-preview { background: #fff; color: #16181d; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--line); }
.lf-preview h3 { margin: 0; font-size: 17px; color: #16181d; }
.lf-preview p { margin: 0; font-size: 13px; color: #5b6170; line-height: 1.7; }
.lf-preview span { font-size: 12.5px; color: #30343c; }
.lf-preview i { display: block; height: 36px; border: 1px solid #d5d8de; border-radius: 9px; margin-top: 4px; }
.lf-preview i.tall { height: 64px; }
.lf-preview button { border: 0; border-radius: 9px; padding: 10px; color: #fff; font: inherit; font-weight: 600; }
.lf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lf-table th { text-align: start; font-weight: 500; color: var(--muted); padding: 8px; border-bottom: 1px solid var(--line); white-space: nowrap; }
.lf-table td { padding: 10px 8px; border-bottom: 1px solid var(--line); color: var(--text-primary); vertical-align: top; }
.lf-scroll { overflow-x: auto; }
.lf-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.lf-color { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.lf-color[aria-pressed="true"] { border-color: var(--ink); }
`

const COLORS = ['#111827', '#1d4ed8', '#0f766e', '#15803d', '#b45309', '#be123c', '#7c3aed']
const fmtTime = (iso: string) => new Date(iso).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' })

export function DashboardV2Forms() {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const { forms, subs, available, loading } = useLeadForms(companyId, isDemo)
  const [draft, setDraft] = useState<FormInput | null>(null)
  const [codeFor, setCodeFor] = useState<LeadForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const names = useMemo(() => new Map(forms.map((f) => [f.id, f.name])), [forms])
  const dayAgo = Date.now() - 86_400_000
  const weekAgo = Date.now() - 7 * 86_400_000
  const today = subs.filter((s) => Date.parse(s.created_at) > dayAgo).length
  const week = subs.filter((s) => Date.parse(s.created_at) > weekAgo).length
  const shown = filter === 'all' ? subs : subs.filter((s) => s.form_id === filter)

  const set = (patch: Partial<FormInput>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const setSettings = (patch: Partial<FormInput['settings']>) => setDraft((d) => (d ? { ...d, settings: { ...d.settings, ...patch } } : d))
  const hasField = (key: string) => !!draft?.fields.some((f) => f.key === key)
  function toggleField(key: string, on: boolean) {
    if (!draft) return
    const preset = FIELD_PRESETS.find((f) => f.key === key)!
    const fields = on ? FIELD_PRESETS.filter((f) => f.key === key || draft.fields.some((x) => x.key === f.key)).map((f) => draft.fields.find((x) => x.key === f.key) || preset) : draft.fields.filter((f) => f.key !== key)
    set({ fields })
  }
  const setRequired = (key: string, required: boolean) => set({ fields: draft!.fields.map((f) => (f.key === key ? { ...f, required } : f)) })

  async function submit() {
    if (!draft) return
    if (!draft.title.trim()) { pushToast({ kind: 'danger', title: 'اكتب عنوان النموذج' }); return }
    if (!draft.fields.some((f) => f.type === 'phone')) { pushToast({ kind: 'danger', title: 'خلّ حقل الجوال', description: 'الوكيل يحتاج الرقم عشان يتواصل مع العميل.' }); return }
    setBusy(true)
    try { await saveLeadForm(companyId, isDemo, draft); setDraft(null); pushToast({ kind: 'success', title: 'انحفظ النموذج' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); pushToast({ kind: 'success', title: 'اننسخ الكود' }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ، حدده وانسخه بنفسك' }) }
  }

  const color = draft?.settings.color || '#111827'

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead
        title="نماذج الموقع" sub="نموذج أو نافذة على موقعك تجمع أرقام المهتمين، ويوصلهم ردك على واتساب خلال ثواني"
        actions={<Button onClick={() => setDraft({ ...BLANK_FORM, fields: [...BLANK_FORM.fields], settings: { ...BLANK_FORM.settings } })}><Plus size={14} /> نموذج جديد</Button>}
      />

      {!available && <Card><EmptyLine>النماذج غير مفعّلة على هذا الحساب بعد.</EmptyLine></Card>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Kpi label="النماذج الشغالة" value={fmtNum(forms.filter((f) => f.active).length)} />
        <Kpi label="عملاء اليوم" value={fmtNum(today)} />
        <Kpi label="آخر 7 أيام" value={fmtNum(week)} />
        <Kpi label="كل الطلبات" value={fmtNum(forms.reduce((n, f) => n + (f.submit_count || 0), 0))} />
      </div>

      <Card>
        <CardTitle aside={<Link to={`${base}/connect`} className="lf-hint" style={{ color: 'var(--sky)' }}><Zap size={13} style={{ verticalAlign: -2 }} /> اربطه برد واتساب تلقائي</Link>}>نماذجك</CardTitle>
        {loading ? <EmptyLine>جارِ التحميل...</EmptyLine> : forms.length === 0 ? (
          <EmptyLine>ما سوّيت نموذج بعد. اضغط «نموذج جديد» وحط الكود في موقعك.</EmptyLine>
        ) : (
          <div className="lf-grid">
            {forms.map((f) => (
              <div key={f.id} className="lf-card">
                <div className="lf-row">
                  <b style={{ flex: 1, minWidth: 0 }}>{f.name}</b>
                  <Toggle checked={f.active} label={`تشغيل ${f.name}`} onChange={(v) => void saveLeadForm(companyId, isDemo, { ...f, active: v }).catch(() => pushToast({ kind: 'danger', title: 'تعذّر التحديث' }))} />
                </div>
                <div className="lf-row">
                  <Chip tone="info">{KIND_LABELS[f.kind]}</Chip>
                  <small>{fmtNum(f.submit_count || 0)} طلب · {f.fields.length} حقول</small>
                </div>
                <small style={{ overflowWrap: 'anywhere' }}>{f.title}</small>
                <div className="lf-row">
                  <Button variant="secondary" size="sm" onClick={() => setCodeFor(f)}><Code2 size={13} /> كود الموقع</Button>
                  <button type="button" className="lf-icon" aria-label={`تعديل ${f.name}`} onClick={() => setDraft({ ...f })}><Pencil size={15} /></button>
                  <button type="button" className="lf-icon" aria-label={`حذف ${f.name}`} onClick={() => { if (window.confirm(`حذف «${f.name}» وكل طلباته؟`)) void deleteLeadForm(companyId, isDemo, f.id) }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle aside={forms.length > 1 ? (
          <select className="ops-input sm" aria-label="النموذج" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ border: '1px solid var(--line-2)', background: 'var(--panel-2)', color: 'var(--ink)', borderRadius: 8, padding: '5px 10px', font: 'inherit', fontSize: 13 }}>
            <option value="all">كل النماذج</option>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        ) : undefined}>آخر الطلبات</CardTitle>
        {shown.length === 0 ? <EmptyLine>ما وصل شي للحين.</EmptyLine> : (
          <div className="lf-scroll">
            <table className="lf-table">
              <thead><tr><th>العميل</th><th>الجوال</th><th>التفاصيل</th><th>النموذج</th><th>الوقت</th><th /></tr></thead>
              <tbody>
                {shown.slice(0, 100).map((s) => (
                  <tr key={s.id}>
                    <td>{s.name || '—'}</td>
                    <td dir="ltr" style={{ textAlign: 'end', fontFamily: 'var(--font-numeral)' }}>{s.phone || '—'}</td>
                    <td style={{ maxWidth: 280, overflowWrap: 'anywhere', color: 'var(--muted)' }}>
                      {Object.entries(s.data || {}).filter(([k]) => k !== 'name' && k !== 'phone').map(([, v]) => v).join(' · ') || '—'}
                    </td>
                    <td>{names.get(s.form_id) || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>{fmtTime(s.created_at)}</td>
                    <td>{s.phone && <ContactActions phone={s.phone} message={`هلا ${s.name || ''}، وصلنا طلبك من موقعنا`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!codeFor} title="حط النموذج في موقعك" onClose={() => setCodeFor(null)} width={560}
        footer={<><Button variant="secondary" onClick={() => setCodeFor(null)}>إغلاق</Button>{codeFor && <Button onClick={() => copy(embedCode(codeFor.id))}>نسخ الكود</Button>}</>}>
        {codeFor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="lf-hint" style={{ margin: 0 }}>
              {codeFor.kind === 'inline' ? 'الصق السطر هذا في المكان اللي تبي النموذج يظهر فيه بالصفحة.' : 'الصق السطر هذا في أي مكان بالموقع، ويفضّل قبل نهاية الصفحة. يشتغل على كل الصفحات اللي فيها الكود.'}
            </p>
            <div className="lf-code">{embedCode(codeFor.id)}</div>
            <p className="lf-hint" style={{ margin: 0 }}>في سلة أو زد: أضفه من إعدادات المتجر ← الأكواد المخصصة. في ووردبريس: أي إضافة لإدراج الأكواد.</p>
          </div>
        )}
      </Dialog>

      <Dialog open={!!draft} title={draft?.id ? 'تعديل النموذج' : 'نموذج جديد'} onClose={() => setDraft(null)} width={640}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>إلغاء</Button><Button onClick={submit} disabled={busy}>{busy ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}>
        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '68vh', overflowY: 'auto', paddingInlineEnd: 4 }}>
            <Input label="اسم النموذج (لك أنت)" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>طريقة الظهور</span>
              <Seg label="طريقة الظهور" value={draft.kind} onChange={(v: FormKind) => set({ kind: v })} options={(Object.keys(KIND_LABELS) as FormKind[]).map((k) => [k, KIND_LABELS[k]] as const)} />
            </div>
            {draft.kind === 'popup' && (
              <Input label="تظهر بعد كم ثانية من فتح الصفحة؟" type="number" value={String(draft.settings.delay_seconds ?? 8)}
                onChange={(e) => setSettings({ delay_seconds: Math.min(120, Math.max(0, Number(e.target.value) || 0)) })} />
            )}
            {draft.kind === 'button' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <Input label="نص الزر العائم" value={draft.settings.button_label || ''} onChange={(e) => setSettings({ button_label: e.target.value })} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>مكان الزر</span>
                  <Seg label="مكان الزر" value={draft.settings.position || 'right'} onChange={(v: 'right' | 'left') => setSettings({ position: v })} options={[['right', 'يمين'], ['left', 'يسار']] as const} />
                </div>
              </div>
            )}
            <Input label="العنوان" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            <Input label="سطر تحت العنوان (اختياري)" value={draft.subtitle || ''} onChange={(e) => set({ subtitle: e.target.value })} />

            <div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>الحقول</span>
              {FIELD_PRESETS.map((p) => {
                const cur = draft.fields.find((f) => f.key === p.key)
                return (
                  <div key={p.key} className="lf-field">
                    <label><input type="checkbox" checked={hasField(p.key)} disabled={p.key === 'phone'} onChange={(e) => toggleField(p.key, e.target.checked)} /> {p.label}</label>
                    {cur && p.key !== 'phone' && (
                      <label className="req"><input type="checkbox" checked={cur.required} onChange={(e) => setRequired(p.key, e.target.checked)} /> مطلوب</label>
                    )}
                    {p.key === 'phone' && <span className="req">دايم مطلوب</span>}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <Input label="نص زر الإرسال" value={draft.button_text} onChange={(e) => set({ button_text: e.target.value })} />
              <Input label="رسالة بعد الإرسال" value={draft.success_text} onChange={(e) => set({ success_text: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>اللون</span>
              <div className="lf-colors" role="group" aria-label="اللون">
                {COLORS.map((c) => <button key={c} type="button" className="lf-color" style={{ background: c }} aria-label={c} aria-pressed={color === c} onClick={() => setSettings({ color: c })} />)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>معاينة</span>
              <div className="lf-preview" style={{ marginTop: 6 }}>
                <h3>{draft.title || 'العنوان'}</h3>
                {draft.subtitle && <p>{draft.subtitle}</p>}
                {draft.fields.map((f) => <span key={f.key}>{f.label}{f.required ? ' *' : ''}<i className={f.type === 'textarea' ? 'tall' : ''} /></span>)}
                <button type="button" style={{ background: color }} tabIndex={-1}>{draft.button_text || 'أرسل'}</button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}
