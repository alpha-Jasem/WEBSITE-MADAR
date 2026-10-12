import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { BUILT_IN_TAGS, CUSTOM_TAG_PREFIX, TAG_COLORS, parseKeywords, type TagRule } from '@/lib/callTags'
import { deleteTagRule, newCustomTagKey, saveTagRule, useTagRules } from '@/lib/queries/tagRules'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightStyles } from '../shared/night'

/** A row of colour swatches; the picked colour is what the tag chip uses everywhere. */
function Swatches({ value, onPick, disabled }: { value: string; onPick: (c: string) => void; disabled?: boolean }) {
  return (
    <span className="nx-swatches" role="group" aria-label="لون الوسم">
      {TAG_COLORS.map((c) => (
        <button key={c.id} type="button" className="nx-swatch" data-c={c.id} aria-pressed={value === c.id} aria-label={c.label} title={c.label}
          disabled={disabled} onClick={() => onPick(c.id)} />
      ))}
    </span>
  )
}

/** Settings for the automatic conversation tags: turn built-in tags off, rename them, add your own with keywords. */
export function TagManager() {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const { rules, available } = useTagRules(companyId, isDemo)
  const [label, setLabel] = useState('')
  const [keywords, setKeywords] = useState('')
  const [color, setColor] = useState('blue')
  const [busy, setBusy] = useState(false)
  const byKey = new Map(rules.map((r) => [r.tag_key, r]))
  const custom = rules.filter((r) => r.tag_key.startsWith(CUSTOM_TAG_PREFIX))

  async function run(fn: () => Promise<void>, ok?: string) {
    setBusy(true)
    try { await fn(); if (ok) pushToast({ kind: 'success', title: ok }) }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  const patchBuiltIn = (id: string, defLabel: string, patch: Partial<TagRule>) =>
    run(() => saveTagRule(companyId, isDemo, { tag_key: id, label: defLabel, enabled: true, ...byKey.get(id), ...patch }))

  if (!available) return <div className="nx-empty">إدارة الوسوم تتفعّل بعد تحديث قاعدة البيانات.</div>

  return (
    <div className="nx-tagmgr">
      <NightStyles />
      <p className="nx-tagmgr-hint">الوكيل يوسم كل محادثة تلقائيًا من ملخصها. هنا تقدر تطفي وسم، تغيّر اسمه، أو تضيف وسومك أنت بكلمات تدل عليها.</p>

      <h4>وسومك الخاصة</h4>
      {custom.length === 0 && <div className="nx-empty" style={{ marginBottom: 10 }}>ما أضفت وسوم بعد.</div>}
      {custom.map((r) => (
        <div key={r.tag_key} className="nx-tagrow">
          <input className="nx-input" defaultValue={r.label} aria-label="اسم الوسم" disabled={busy}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.label) void run(() => saveTagRule(companyId, isDemo, { ...r, label: v }), 'انحفظ الوسم') }} />
          <input className="nx-input" defaultValue={r.keywords || ''} aria-label="كلمات الوسم" placeholder="كلمات مفصولة بفاصلة، مثل: تمويل، بنك، قرض" disabled={busy}
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== (r.keywords || '')) void run(() => saveTagRule(companyId, isDemo, { ...r, keywords: v }), 'انحفظ الوسم') }} />
          <Swatches value={r.color || 'blue'} disabled={busy} onPick={(c) => void run(() => saveTagRule(companyId, isDemo, { ...r, color: c }))} />
          <label className="nx-tagon"><input type="checkbox" checked={r.enabled} disabled={busy}
            onChange={(e) => void run(() => saveTagRule(companyId, isDemo, { ...r, enabled: e.target.checked }))} /> مفعّل</label>
          <button type="button" className="nx-btn sm" aria-label="حذف الوسم" disabled={busy}
            onClick={() => void run(() => deleteTagRule(companyId, isDemo, r.tag_key), 'انحذف الوسم')}><Trash2 size={14} /></button>
        </div>
      ))}
      <form className="nx-tagrow add" onSubmit={(e) => {
        e.preventDefault()
        if (!label.trim() || parseKeywords(keywords).length === 0) { pushToast({ kind: 'danger', title: 'اكتب اسم الوسم وكلمة وحدة على الأقل' }); return }
        void run(async () => {
          await saveTagRule(companyId, isDemo, { tag_key: newCustomTagKey(), label: label.trim(), keywords: keywords.trim(), enabled: true, color })
          setLabel('')
          setKeywords('')
          setColor('blue')
        }, 'انضاف الوسم')
      }}>
        <input className="nx-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم الوسم، مثل: تمويل بنكي" aria-label="اسم الوسم الجديد" />
        <input className="nx-input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="كلمات مفصولة بفاصلة" aria-label="كلمات الوسم الجديد" />
        <Swatches value={color} onPick={setColor} />
        <button type="submit" className="nx-btn" disabled={busy}><Plus size={14} /> إضافة</button>
      </form>

      <h4 style={{ marginTop: 20 }}>الوسوم الجاهزة</h4>
      {BUILT_IN_TAGS.map((t) => {
        const r = byKey.get(t.id)
        const on = r?.enabled !== false
        return (
          <div key={t.id} className="nx-tagrow builtin">
            <input className="nx-input" defaultValue={r?.label || t.label} aria-label={`اسم وسم ${t.label}`} disabled={busy}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== (r?.label || t.label)) void patchBuiltIn(t.id, t.label, { label: v }) }} />
            <Swatches value={r?.color || t.color} disabled={busy} onPick={(c) => void patchBuiltIn(t.id, t.label, { color: c })} />
            <label className="nx-tagon"><input type="checkbox" checked={on} disabled={busy}
              onChange={(e) => void patchBuiltIn(t.id, t.label, { enabled: e.target.checked })} /> مفعّل</label>
            {r
              ? <button type="button" className="nx-btn sm" aria-label="رجّع الافتراضي" title="رجّع الافتراضي" disabled={busy}
                onClick={() => void run(() => deleteTagRule(companyId, isDemo, t.id))}><RotateCcw size={14} /></button>
              : <span />}
          </div>
        )
      })}
    </div>
  )
}
