import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeRefetch } from '../../../lib/realtime'

// Shared reusable message texts for the team (from the developers' console "mail templates"), kept simple:
// a title, a kind, and the text. Copy with one click and paste into WhatsApp, email or a note.

interface Snippet { id: string; title: string; body: string; kind: string; created_by: string | null }
export const SNIPPET_KINDS: Record<string, string> = { whatsapp: 'واتساب', email: 'بريد', note: 'ملاحظة' }
export const SKILL_KINDS: Record<string, string> = { playbook: 'دليل عمل', prompt: 'تعليمات وكيل', checklist: 'قائمة تحقق' }

export function AdminTeamSnippets({ onError, onCopied, table = 'admin_snippets', kinds = SNIPPET_KINDS, emptyText = 'ما فيه قوالب بعد. احفظ النصوص اللي تكررها عشان تنسخها بضغطة.', newLabel = 'قالب جديد' }: {
  onError: (m: string | null) => void; onCopied: (m: string) => void; table?: string; kinds?: Record<string, string>; emptyText?: string; newLabel?: string
}) {
  const KIND = kinds
  const kindKeys = Object.keys(kinds)
  const BLANK = { title: '', body: '', kind: kindKeys[0] }
  const [rows, setRows] = useState<Snippet[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [draft, setDraft] = useState<(typeof BLANK & { id?: string }) | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('id, title, body, kind, created_by').order('created_at', { ascending: false }).limit(200)
    if (error) { onError('تعذّر تحميل القوالب. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    setRows((data ?? []) as Snippet[])
  }, [onError])
  useEffect(() => { void load() }, [load])
  useRealtimeRefetch(`admin_team_${table}`, [{ table }], load, true)

  async function save() {
    if (!draft || !draft.title.trim() || !draft.body.trim()) { onError('اكتب العنوان والنص.'); return }
    setBusy(true)
    const row = { title: draft.title.trim().slice(0, 120), body: draft.body.trim().slice(0, 4000), kind: draft.kind }
    const { error } = draft.id ? await supabase.from(table).update(row).eq('id', draft.id) : await supabase.from(table).insert(row)
    setBusy(false)
    if (error) { onError('تعذّر حفظ القالب.'); return }
    onError(null); setDraft(null); void load()
  }
  async function remove(s: Snippet) {
    if (!window.confirm(`حذف القالب «${s.title}»؟`)) return
    const { error } = await supabase.from(table).delete().eq('id', s.id)
    if (error) onError('تعذّر حذف القالب.'); else { onError(null); void load() }
  }
  async function copy(s: Snippet) {
    try { await navigator.clipboard.writeText(s.body); onCopied('انسخ النص') } catch { onError('ما قدرنا ننسخ، حدد النص وانسخه بنفسك.') }
  }

  const shown = rows.filter((r) => filter === 'all' || r.kind === filter)
  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="mc-tabs">
          {([['all', 'الكل'], ...kindKeys.map((k) => [k, KIND[k]])] as string[][]).map(([k, l]) => (
            <button key={k} className={filter === k ? 'mc-on' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <button className="mc-btn2 p" onClick={() => setDraft({ ...BLANK, kind: filter === 'all' ? kindKeys[0] : filter })}>{newLabel}</button>
      </div>
      {shown.length === 0 && <div className="mc-flat">{emptyText}</div>}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))' }}>
        {shown.map((s) => (
          <div key={s.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12, background: 'var(--fill)', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <b style={{ overflowWrap: 'anywhere' }}>{s.title}</b><span className="mc-chip">{KIND[s.kind]}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 120, overflow: 'hidden' }}>{s.body}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
              <button className="mc-btn2 p" onClick={() => void copy(s)}>نسخ</button>
              <button className="mc-btn2" onClick={() => setDraft({ id: s.id, title: s.title, body: s.body, kind: s.kind })}>تعديل</button>
              <button className="mc-btn2" aria-label={`حذف ${s.title}`} onClick={() => void remove(s)}>حذف</button>
            </div>
          </div>
        ))}
      </div>
      {draft && (
        <div className="mc-modal-bg" onClick={() => setDraft(null)}>
          <div className="mc-modal" role="dialog" aria-modal="true" aria-label={draft.id ? 'تعديل قالب' : 'قالب جديد'} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>{draft.id ? 'تعديل' : newLabel}</h3>
            <input className="mc-inp" placeholder="العنوان" value={draft.title} maxLength={120} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <select className="mc-inp" value={draft.kind} aria-label="النوع" onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
              {kindKeys.map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
            </select>
            <textarea className="mc-inp" rows={7} placeholder="النص" value={draft.body} maxLength={4000} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setDraft(null)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={busy} onClick={() => void save()}>{busy ? 'جارِ الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
