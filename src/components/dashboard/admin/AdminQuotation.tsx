import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

interface QtCompany { id: string; name: string; owner_name: string; owner_email: string; status: string; created_at: string; products: string[] }

const STATUS: Record<string, string> = { active: 'نشطة', trial: 'تجريبية', suspended: 'موقوفة' }
const EMPTY = { company_name: '', owner_name: '', email: '', phone: '', password: '' }

/** Quotation clients: companies that have the Quotation product. Their login lands on /quotation, apart from the Voice AI dashboard. */
export const AdminQuotation = () => {
  const [rows, setRows] = useState<QtCompany[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('companies').select('id, name, owner_name, owner_email, status, created_at, products').order('created_at', { ascending: false })
    if (e) { setError('تعذّر التحميل. قاعدة بيانات الكوتيشن لم تُفعَّل بعد.'); return }
    setError(null)
    setRows(((data ?? []) as QtCompany[]).filter(c => Array.isArray(c.products) && c.products.includes('quotation')))
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_quotation', [{ table: 'companies' }], load, true)

  const valid = form.company_name.trim() && form.owner_name.trim() && form.email.includes('@') && form.password.length >= 8

  const create = async () => {
    setBusy(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          email: form.email.trim(), password: form.password, company_name: form.company_name.trim(), owner_name: form.owner_name.trim(),
          owner_phone: form.phone.trim(), business_type: 'other', plan: 'starter', products: ['quotation'],
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) { setError(out.error || 'تعذّر إنشاء الحساب.'); return }
      setCreated(form.company_name.trim()); setAdding(false); setForm(EMPTY); load()
    } catch { setError('خطأ في الاتصال بالخادم.') } finally { setBusy(false) }
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      {created && <div className="mc-banner">تم إنشاء حساب «{created}». يدخل من صفحة الدخول المعتادة، ويفتح له لوحة عروض الأسعار مباشرة.</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>عروض الأسعار</h3>
          <div className="mc-phr">
            <button className="mc-btn2" onClick={() => window.open('/quotation-demo', '_blank', 'noopener')}>معاينة اللوحة التجريبية</button>
            <button className="mc-btn2 p" onClick={() => { setAdding(true); setCreated(null) }}>شركة جديدة</button>
          </div>
        </div>
        <div className="mc-delta" style={{ padding: '0 20px 10px', lineHeight: 1.8 }}>الشركات هنا لها لوحة عروض الأسعار فقط، ومفصولة عن لوحة الوكيل الصوتي: بياناتها وفريقها وتسجيل دخولها.</div>
        <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
          <thead><tr><th>الشركة</th><th>المالك</th><th>الحالة</th><th>أُنشئت</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="mc-flat">لا توجد شركات عروض أسعار بعد.</td></tr>}
            {rows.map(c => (
              <tr key={c.id}>
                <td><b>{c.name}</b></td>
                <td>{c.owner_name}<div style={{ color: 'var(--ink-3)', fontSize: 12 }} dir="ltr">{c.owner_email}</div></td>
                <td>{STATUS[c.status] ?? c.status}</td>
                <td>{dateShort(c.created_at)}</td>
              </tr>
            ))}
          </tbody></table></div>
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>شركة عروض أسعار جديدة</h3>
            <label className="mc-field">اسم الشركة<input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">اسم المالك<input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></label>
              <label className="mc-field">الجوال<input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            </div>
            <label className="mc-field">البريد<input dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label className="mc-field">كلمة المرور (8 أحرف على الأقل)<input dir="ltr" type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!valid || busy} onClick={create}>{busy ? 'جاري الإنشاء…' : 'إنشاء'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
