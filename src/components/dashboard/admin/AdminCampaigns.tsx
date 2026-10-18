import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort } from '../../../lib/format'

interface Campaign { id: string; name: string; sector: string; city: string; source: string; service: string; offer: string; price_net: number | null; max_discount_pct: number | null; status: string; created_at: string }

const SOURCE: Record<string, string> = { google_maps: 'خرائط قوقل', linkedin: 'LinkedIn', both: 'الاثنان', manual: 'يدوي' }
const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'mc-n2' }, running: { label: 'تعمل', cls: 'mc-g' }, paused: { label: 'متوقفة مؤقتًا', cls: 'mc-a' }, done: { label: 'منتهية', cls: 'mc-b' },
}
const EMPTY = { name: '', sector: '', city: 'جدة', source: 'google_maps', service: '', offer: '', price_net: '', max_discount_pct: '' }

// Campaign settings are stored here as drafts. Running a campaign (agents, sending) is a later phase.
export const AdminCampaigns = () => {
  const [rows, setRows] = useState<Campaign[]>([])
  const [form, setForm] = useState(EMPTY)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false })
    setError(e ? 'تعذّر تحميل الحملات.' : null)
    setRows((data ?? []) as Campaign[])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.name.trim()) return
    const { data: u } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('campaigns').insert({
      name: form.name.trim(), sector: form.sector.trim(), city: form.city.trim(), source: form.source, service: form.service.trim(), offer: form.offer.trim(),
      price_net: form.price_net ? Number(form.price_net) : null, max_discount_pct: form.max_discount_pct ? Number(form.max_discount_pct) : null, created_by: u.user?.id,
    })
    if (e) { setError('تعذّر حفظ الحملة.'); return }
    setForm(EMPTY)
    setAdding(false)
    load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card">
        <div className="mc-ph"><h3>الحملات</h3><button className="mc-btn2 p" onClick={() => setAdding(true)}>حملة جديدة</button></div>
        <div className="mc-delta" style={{ padding: '0 20px 10px' }}>تُحفظ هنا إعدادات الحملة كمسودة. جلب العملاء الآن من «المبيعات ← Outreach»، وتشغيل الإيجنتات في المرحلة 2.</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>الحملة</th><th>القطاع</th><th>المدينة</th><th>المصدر</th><th>السعر (صافي)</th><th>أقصى خصم</th><th>الحالة</th><th>الإنشاء</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="mc-flat">جاري التحميل…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="mc-flat">لا توجد حملات بعد.</td></tr>}
              {rows.map(c => (
                <tr key={c.id}>
                  <td><b>{c.name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{c.service}{c.offer ? ` · ${c.offer}` : ''}</div></td>
                  <td>{c.sector || '—'}</td><td>{c.city || '—'}</td><td>{SOURCE[c.source] ?? c.source}</td>
                  <td>{c.price_net != null ? `${c.price_net.toLocaleString('en-US')} ر.س` : 'غير محدد'}</td>
                  <td>{c.max_discount_pct != null ? `${c.max_discount_pct}%` : 'غير محدد'}</td>
                  <td><span className={`mc-st ${STATUS[c.status]?.cls ?? ''}`}>{STATUS[c.status]?.label ?? c.status}</span></td>
                  <td>{dateShort(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>حملة جديدة (مسودة)</h3>
            <label className="mc-field">اسم الحملة<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">القطاع<input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} /></label>
              <label className="mc-field">المدينة<input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
            </div>
            <label className="mc-field">المصدر<select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>{Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="mc-field">الخدمة<input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} /></label>
            <label className="mc-field">العرض<input value={form.offer} onChange={e => setForm({ ...form, offer: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">السعر الصافي المعتمد<input type="number" min={0} value={form.price_net} onChange={e => setForm({ ...form, price_net: e.target.value })} /></label>
              <label className="mc-field">أقصى خصم %<input type="number" min={0} max={100} value={form.max_discount_pct} onChange={e => setForm({ ...form, max_discount_pct: e.target.value })} /></label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!form.name.trim()} onClick={save}>حفظ كمسودة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
