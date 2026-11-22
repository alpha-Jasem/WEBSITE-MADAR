import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeRefetch } from '../../../lib/realtime'

// Shared reusable message texts for the team (from the developers' console "mail templates"), kept simple:
// a title, a kind, and the text. Copy with one click and paste into WhatsApp, email or a note.

interface Snippet { id: string; title: string; body: string; kind: 'whatsapp' | 'email' | 'note'; created_by: string | null }
const KIND: Record<Snippet['kind'], string> = { whatsapp: 'واتساب', email: 'بريد', note: 'ملاحظة' }
const BLANK = { title: '', body: '', kind: 'whatsapp' as Snippet['kind'] }

export function AdminTeamSnippets({ onError, onCopied }: { onError: (m: string | null) => void; onCopied: (m: string) => void }) {
  const [rows, setRows] = useState<Snippet[]>([])
  const [filter, setFilter] = useState<'all' | Snippet['kind']>('all')
  const [draft, setDraft] = useState<(typeof BLANK & { id?: string }) | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('admin_snippets').select('id, title, body, kind, created_by').order('created_at', { ascending: false }).limit(200)
    if (error) { onError('تعذّر تحميل القوالب. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    setRows((data ?? []) as Snippet[])
  }, [onError])
  useEffect(() => { void load() }, [load])
  useRealtimeRefetch('admin_team_snippets', [{ table: 'admin_snippets' }], load, true)

  async function save() {
    if (!draft || !draft.title.trim() || !draft.body.trim()) { onError('اكتب العنوان والنص.'); return }
    setBusy(true)
    const row = { title: draft.title.trim().slice(0, 120), body: draft.body.trim().slice(0, 4000), kind: draft.kind }
    const { error } = draft.id ? await supabase.from('admin_snippets').update(row).eq('id', draft.id) : await supabase.from('admin_snippets').insert(row)
    setBusy(false)
    if (error) { onError('تعذّر حفظ القالب.'); return }
    onError(null); setDraft(null); void load()
  }
  async function remove(s: Snippet) {
    if (!window.confirm(`حذف القالب «${s.title}»؟`)) return
    const { error } = await supabase.from('admin_snippets').delete().eq('id', s.id)
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
          {([['all', 'الكل'], ['whatsapp', 'واتساب'], ['email', 'بريد'], ['note', 'ملاحظات']] as const).map(([k, l]) => (
            <button key={k} className={filter === k ? 'mc-on' : ''} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <button className="mc-btn2 p" onClick={() => setDraft({ ...BLANK, kind: filter === 'all' ? 'whatsapp' : filter })}>قالب جديد</button>
      </div>
      {shown.length === 0 && <div className="mc-flat">ما فيه قوالب بعد. احفظ النصوص اللي تكررها عشان تنسخها بضغطة.</div>}
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
            <h3 style={{ margin: 0 }}>{draft.id ? 'تعديل القالب' : 'قالب جديد'}</h3>
            <input className="mc-inp" placeholder="العنوان" value={draft.title} maxLength={120} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <select className="mc-inp" value={draft.kind} aria-label="النوع" onChange={(e) => setDraft({ ...draft, kind: e.target.value as Snippet['kind'] })}>
              {(Object.keys(KIND) as Snippet['kind'][]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}
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
