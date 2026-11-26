import { useState } from 'react'
import { Plus, Pencil, Trash2, Zap, ArrowUp, ArrowDown, X } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTeams } from '@/lib/queries/teams'
import { ACTION_LABELS, deleteMacro, saveMacro, STATUS_CHOICES, useMacros, type Macro, type MacroAction, type MacroActionType } from '@/lib/queries/macros'
import { Badge, Button, Card, Dialog, Input, Select } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'
import './growth.css'

interface Draft { id?: string; name: string; description: string; actions: MacroAction[] }
const NEW_DRAFT: Draft = { name: '', description: '', actions: [{ type: 'reply', value: '' }] }
const TYPE_OPTIONS = (Object.keys(ACTION_LABELS) as MacroActionType[]).map((t) => ({ value: t, label: ACTION_LABELS[t] }))

/** Macros: a saved list of steps (reply, note, status, transfer) run on a conversation with one click from the inbox. */
export function DashboardV2Macros() {
  const { companyId, isDemo, can } = useWorkspace()
  const pushToast = useToast()
  const { macros, available, loading } = useMacros(companyId, isDemo)
  const { teams } = useTeams(companyId, isDemo)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const canEdit = can('conversations.transfer')
  const teamName = (id?: string) => teams.find((t) => t.id === id)?.name || 'فريق'

  const describe = (a: MacroAction) =>
    a.type === 'status' ? `الحالة: ${STATUS_CHOICES.find(([v]) => v === a.value)?.[1] || a.value}`
      : a.type === 'transfer' ? `تحويل إلى ${teamName(a.team_id)}`
      : `${ACTION_LABELS[a.type]}: ${a.value.length > 40 ? `${a.value.slice(0, 40)}…` : a.value}`

  function setAction(i: number, patch: Partial<MacroAction>) {
    setDraft((d) => d && ({ ...d, actions: d.actions.map((a, k) => (k === i ? { ...a, ...patch } : a)) }))
  }
  function changeType(i: number, type: MacroActionType) {
    setAction(i, { type, value: type === 'status' ? 'closed' : '', team_id: type === 'transfer' ? teams[0]?.id : undefined })
  }
  function move(i: number, d: -1 | 1) {
    setDraft((cur) => {
      if (!cur) return cur
      const j = i + d
      if (j < 0 || j >= cur.actions.length) return cur
      const next = [...cur.actions]; [next[i], next[j]] = [next[j], next[i]]
      return { ...cur, actions: next }
    })
  }

  async function submit() {
    if (!draft) return
    for (const a of draft.actions) {
      if ((a.type === 'note' || a.type === 'reply') && !a.value.trim()) { pushToast({ kind: 'danger', title: 'اكتب نص كل خطوة' }); return }
      if (a.type === 'transfer' && !a.team_id) { pushToast({ kind: 'danger', title: 'اختر الفريق في خطوة التحويل' }); return }
    }
    setBusy(true)
    try {
      await saveMacro(companyId, isDemo, draft)
      pushToast({ kind: 'success', title: draft.id ? 'انحفظت التعديلات' : 'انحفظ الماكرو' })
      setDraft(null)
    } catch (e) { pushToast({ kind: 'danger', title: 'ما انحفظ الماكرو', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  async function remove(m: Macro) {
    if (!window.confirm?.(`تحذف الماكرو «${m.name}»؟`)) return
    try { await deleteMacro(companyId, isDemo, m.id); pushToast({ kind: 'success', title: 'انحذف الماكرو' }) }
    catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
  }

  return (
    <NightPage>
      <PageHead
        title="الماكرو"
        sub="خطوات جاهزة تنفّذها على أي محادثة بضغطة من البريد الوارد: رد، ملاحظة، تغيير حالة، أو تحويل لفريق"
        actions={available && canEdit ? <Button onClick={() => setDraft({ ...NEW_DRAFT, actions: [{ type: 'reply', value: '' }] })}><Plus size={14} /> ماكرو جديد</Button> : undefined}
      />

      {!available && <Card style={{ padding: 16 }}><div className="np-empty">الماكرو يتفعّل بعد تحديث قاعدة البيانات.</div></Card>}

      {available && macros.length === 0 && !loading && (
        <Card><EmptyState icon={<Zap size={20} />} title="ما عندك ماكرو بعد" description="اجمع الخطوات المتكررة في ماكرو واحد، مثل: ردّ بالأسعار ثم انتظر العميل." /></Card>
      )}

      {available && macros.length > 0 && (
        <div className="gr-grid">
          {macros.map((m) => (
            <div key={m.id} className="gr-card">
              <h4>{m.name} <Badge tone="brand">{m.actions.length} خطوات</Badge></h4>
              {m.description && <p>{m.description}</p>}
              <ol style={{ margin: '8px 0 0', paddingInlineStart: 18, display: 'grid', gap: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                {m.actions.map((a, i) => <li key={i}>{describe(a)}</li>)}
              </ol>
              {canEdit && (
                <div className="gr-acts">
                  <button type="button" className="gr-btn" onClick={() => setDraft({ id: m.id, name: m.name, description: m.description || '', actions: m.actions.map((a) => ({ ...a })) })}><Pencil /> تعديل</button>
                  <button type="button" className="gr-btn" onClick={() => void remove(m)}><Trash2 /> حذف</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={!!draft} title={draft?.id ? 'تعديل الماكرو' : 'ماكرو جديد'} onClose={() => setDraft(null)} width={560}
        footer={<><Button variant="ghost" onClick={() => setDraft(null)}>إلغاء</Button><Button disabled={busy} onClick={() => void submit()}>حفظ</Button></>}
      >
        {draft && (
          <div style={{ display: 'grid', gap: 12 }}>
            <Input label="اسم الماكرو" value={draft.name} placeholder="مثال: إرسال الأسعار وانتظار الرد" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input label="وصف قصير (اختياري)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <div style={{ display: 'grid', gap: 10 }}>
              <b style={{ fontSize: 13 }}>الخطوات (تُنفَّذ بالترتيب)</b>
              {draft.actions.map((a, i) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 10, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <Select label={`الخطوة ${i + 1}`} style={{ flex: 1 }} options={TYPE_OPTIONS} value={a.type} onChange={(e) => changeType(i, e.target.value as MacroActionType)} />
                    <button type="button" className="gr-btn" aria-label="لفوق" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></button>
                    <button type="button" className="gr-btn" aria-label="لتحت" disabled={i === draft.actions.length - 1} onClick={() => move(i, 1)}><ArrowDown /></button>
                    <button type="button" className="gr-btn" aria-label="حذف الخطوة" disabled={draft.actions.length === 1} onClick={() => setDraft({ ...draft, actions: draft.actions.filter((_, k) => k !== i) })}><X /></button>
                  </div>
                  {(a.type === 'note' || a.type === 'reply') && (
                    <textarea rows={3} value={a.value} placeholder={a.type === 'reply' ? 'نص الرد الذي يوصل للعميل' : 'ملاحظة يشوفها فريقك فقط'}
                      onChange={(e) => setAction(i, { value: e.target.value })}
                      style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'transparent', color: 'inherit', padding: 10, font: 'inherit' }} />
                  )}
                  {a.type === 'status' && <Select label="الحالة الجديدة" options={STATUS_CHOICES.map(([value, label]) => ({ value, label }))} value={a.value} onChange={(e) => setAction(i, { value: e.target.value })} />}
                  {a.type === 'transfer' && (
                    teams.length === 0
                      ? <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>أنشئ فريقًا من صفحة الفريق أولًا.</span>
                      : <>
                        <Select label="الفريق" options={teams.map((t) => ({ value: t.id, label: t.name }))} value={a.team_id || ''} onChange={(e) => setAction(i, { team_id: e.target.value })} />
                        <Input label="سبب التحويل (اختياري)" value={a.value} onChange={(e) => setAction(i, { value: e.target.value })} />
                      </>
                  )}
                </div>
              ))}
              <Button variant="secondary" onClick={() => setDraft({ ...draft, actions: [...draft.actions, { type: 'note', value: '' }] })}><Plus size={14} /> أضف خطوة</Button>
            </div>
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}

export default DashboardV2Macros
