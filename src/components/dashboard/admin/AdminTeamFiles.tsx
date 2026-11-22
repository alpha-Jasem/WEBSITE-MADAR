import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort, nf } from '../../../lib/format'

// Team file manager on a private storage bucket (admins only). Files open through short-lived signed links.

const BUCKET = 'team-files'
const MAX_BYTES = 25 * 1024 * 1024
interface FileRow { name: string; size: number; created_at: string }
const sizeOf = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} م.ب` : `${Math.max(1, Math.round(n / 1024))} ك.ب`)
/** Storage keys are ASCII only; the original name is kept after a timestamp prefix. */
const keyFor = (name: string) => `${Date.now()}-${name.replace(/[^\w.\-]+/g, '_').slice(-80) || 'file'}`
const shownName = (key: string) => key.replace(/^\d+-/, '')

export function AdminTeamFiles({ onError, onNote }: { onError: (m: string | null) => void; onNote: (m: string) => void }) {
  const [rows, setRows] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
    setLoading(false)
    if (error) { onError('تعذّر تحميل الملفات. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    onError(null)
    setRows((data ?? []).filter((f) => f.name && f.id).map((f) => ({ name: f.name, size: Number((f.metadata as { size?: number } | null)?.size ?? 0), created_at: f.created_at ?? '' })))
  }, [onError])
  useEffect(() => { void load() }, [load])

  async function upload(files: FileList | null) {
    const list = Array.from(files ?? [])
    if (!list.length) return
    if (list.some((f) => f.size > MAX_BYTES)) { onError('الحد الأقصى للملف 25 م.ب.'); return }
    setBusy(true)
    for (const f of list) {
      const { error } = await supabase.storage.from(BUCKET).upload(keyFor(f.name), f, { contentType: f.type || undefined })
      if (error) { onError(`تعذّر رفع ${f.name}.`); setBusy(false); return }
    }
    setBusy(false); onNote('تم الرفع'); if (input.current) input.current.value = ''; void load()
  }
  async function open(r: FileRow) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(r.name, 120)
    if (error || !data) { onError('تعذّر فتح الملف.'); return }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  async function remove(r: FileRow) {
    if (!window.confirm(`حذف «${shownName(r.name)}»؟ لا يمكن التراجع.`)) return
    const { error } = await supabase.storage.from(BUCKET).remove([r.name])
    if (error) onError('تعذّر حذف الملف.'); else { onError(null); void load() }
  }

  return (
    <div style={{ padding: '0 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="mc-delta">ملفات خاصة بالفريق فقط. الحد الأقصى للملف 25 م.ب.</div>
        <div>
          <input ref={input} type="file" multiple hidden onChange={(e) => void upload(e.target.files)} />
          <button className="mc-btn2 p" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'جارِ الرفع...' : 'رفع ملف'}</button>
        </div>
      </div>
      {loading ? <div className="mc-flat">جارِ التحميل...</div> : rows.length === 0 ? <div className="mc-flat">ما فيه ملفات بعد.</div> : (
        <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
          <thead><tr><th>الملف</th><th>الحجم</th><th>أُضيف</th><th /></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.name}>
              <td style={{ overflowWrap: 'anywhere' }}><b>{shownName(r.name)}</b></td><td>{r.size ? sizeOf(r.size) : '—'}</td><td>{r.created_at ? dateShort(r.created_at) : '—'}</td>
              <td><span style={{ display: 'flex', gap: 6 }}>
                <button className="mc-btn2 p" onClick={() => void open(r)}>فتح</button>
                <button className="mc-btn2" aria-label={`حذف ${shownName(r.name)}`} onClick={() => void remove(r)}>حذف</button>
              </span></td>
            </tr>
          ))}</tbody></table></div>
      )}
      <div className="mc-delta" style={{ marginTop: 8 }}>{nf(rows.length)} ملف</div>
    </div>
  )
}
