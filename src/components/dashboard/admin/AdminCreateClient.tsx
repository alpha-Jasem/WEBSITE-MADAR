import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

type Product = 'voice_ai' | 'quotation'
interface Made { company: string; product: Product; email: string; password: string; url: string }
interface Account { id: string; name: string; owner_name: string; owner_email: string; status: string; business_type: string; plan: string; created_at: string; auth_user_id: string | null; products?: string[] }

const PRODUCTS: { id: Product; label: string; hint: string }[] = [
  { id: 'voice_ai', label: 'مدار Voice AI', hint: 'وكيل يرد على الواتساب والمكالمات، مع لوحته' },
  { id: 'quotation', label: 'مدار Quotation', hint: 'لوحة عروض الأسعار، مفصولة بالكامل عن لوحة الوكيل' },
]
const TYPES = [['clinic', 'عيادة'], ['real_estate', 'عقار'], ['ecommerce', 'تجارة إلكترونية'], ['other', 'أخرى']] as const
const PLANS = [['starter', 'ابتدائي'], ['growth', 'نمو'], ['enterprise', 'مؤسسي']] as const
const STATUS: Record<string, string> = { active: 'نشطة', trial: 'تجريبية', suspended: 'موقوفة' }
const EMPTY = { company_name: '', owner_name: '', email: '', phone: '' }

// No look-alike characters (0/O, 1/l/I), so a password read aloud or typed from a message is not mistyped.
const makePassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

/** Creates a client's login and its company in one step, for the product picked. Lists every account and can delete one. */
export const AdminCreateClient = () => {
  const [product, setProduct] = useState<Product>('voice_ai')
  const [type, setType] = useState('other')
  const [plan, setPlan] = useState('starter')
  const [form, setForm] = useState(EMPTY)
  const [password, setPassword] = useState(makePassword)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [made, setMade] = useState<Made | null>(null)
  const [copied, setCopied] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [me, setMe] = useState<string | null>(null)
  const [del, setDel] = useState<Account | null>(null)
  const [confirmName, setConfirmName] = useState('')

  const load = useCallback(async () => {
    const cols = 'id, name, owner_name, owner_email, status, business_type, plan, created_at, auth_user_id'
    // The products column arrives with the Quotation database update; until then every account is Voice AI.
    const withProducts = await supabase.from('companies').select(`${cols}, products`).order('created_at', { ascending: false })
    const res = withProducts.error ? await supabase.from('companies').select(cols).order('created_at', { ascending: false }) : withProducts
    if (res.error) { setError('تعذّر تحميل الحسابات.'); return }
    setAccounts((res.data ?? []) as unknown as Account[])
  }, [])
  useEffect(() => { load(); supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)) }, [load])
  useRealtimeRefetch('admin_create_client', [{ table: 'companies' }], load, true)

  const valid = form.company_name.trim() && form.owner_name.trim() && form.email.includes('@')

  const call = async (fn: string, body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, out: await res.json().catch(() => ({})) as { error?: string } }
  }

  const create = async () => {
    setBusy(true); setError(null)
    try {
      const { ok, out } = await call('admin-create-client', {
        email: form.email.trim().toLowerCase(), password, company_name: form.company_name.trim(), owner_name: form.owner_name.trim(),
        owner_phone: form.phone.trim(), business_type: product === 'quotation' ? 'other' : type, plan: product === 'quotation' ? 'starter' : plan,
        // Voice AI is the column default, so only Quotation sends it (and needs the products column).
        ...(product === 'quotation' ? { products: ['quotation'] } : {}),
      })
      if (!ok) {
        setError(/already.*registered/i.test(out.error ?? '') ? 'هذا البريد مسجّل من قبل. استخدم بريدًا ثانيًا للعميل.'
          : /products/i.test(out.error ?? '') ? 'منتج Quotation يحتاج تحديث قاعدة البيانات أولًا.' : out.error || 'تعذّر إنشاء الحساب.')
        return
      }
      setMade({ company: form.company_name.trim(), product, email: form.email.trim().toLowerCase(), password, url: `${window.location.origin}/login` })
      setForm(EMPTY); setPassword(makePassword()); setCopied(false); load()
    } catch { setError('خطأ في الاتصال بالخادم.') } finally { setBusy(false) }
  }

  const remove = async () => {
    if (!del) return
    setBusy(true); setError(null)
    try {
      const { ok, out } = await call('admin-delete-client', { company_id: del.id, confirm_name: confirmName })
      if (!ok) { setError(out.error || 'تعذّر الحذف.'); return }
      setDel(null); setConfirmName(''); load()
    } catch { setError('خطأ في الاتصال بالخادم.') } finally { setBusy(false) }
  }

  const message = made && [
    `حسابك في ${PRODUCTS.find(p => p.id === made.product)!.label} جاهز.`,
    `الرابط: ${made.url}`,
    `البريد: ${made.email}`,
    `كلمة المرور: ${made.password}`,
    'غيّر كلمة المرور بعد أول دخول.',
  ].join('\n')

  const copy = async () => {
    try { await navigator.clipboard.writeText(message ?? ''); setCopied(true) } catch { setError('تعذّر النسخ. انسخ البيانات يدويًا.') }
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}

      {made && (
        <article className="mc-card" style={{ marginBottom: 16, border: '1px solid var(--green)', background: 'color-mix(in srgb, var(--green) 14%, transparent)' }}>
          <div className="mc-ph"><h3 style={{ color: 'var(--green)' }}>تم إنشاء الحساب: {made.company}</h3><div className="mc-phr"><button className="mc-btn2 p" onClick={copy}>{copied ? 'تم النسخ' : 'نسخ بيانات الدخول'}</button></div></div>
          <div style={{ padding: '0 20px 16px', lineHeight: 2 }}>
            <div>الرابط: <b dir="ltr">{made.url}</b></div>
            <div>البريد: <b dir="ltr">{made.email}</b></div>
            <div>كلمة المرور: <b dir="ltr">{made.password}</b></div>
            <div className="mc-delta">كلمة المرور تظهر هنا مرة واحدة فقط. انسخها وأرسلها للعميل قبل ما تغادر الصفحة.</div>
          </div>
        </article>
      )}

      <article className="mc-card">
        <div className="mc-ph"><h3>إنشاء عميل</h3></div>
        <div style={{ padding: '0 20px 20px', display: 'grid', gap: 14 }}>
          <div className="mc-grid2">
            {PRODUCTS.map(p => (
              <button key={p.id} type="button" className={`mc-btn2 ${product === p.id ? 'p' : ''}`} style={{ textAlign: 'right', padding: 14, height: 'auto', display: 'block' }} onClick={() => setProduct(p.id)}>
                <b>{p.label}</b><div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{p.hint}</div>
              </button>
            ))}
          </div>

          <label className="mc-field">اسم الشركة<input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></label>
          <div className="mc-grid2">
            <label className="mc-field">اسم المالك<input value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></label>
            <label className="mc-field">الجوال<input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <label className="mc-field">البريد (هو اسم الدخول)<input dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>

          {product === 'voice_ai' && (
            <div className="mc-grid2">
              <label className="mc-field">نوع النشاط<select value={type} onChange={e => setType(e.target.value)}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="mc-field">الباقة<select value={plan} onChange={e => setPlan(e.target.value)}>{PLANS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
            </div>
          )}

          <label className="mc-field">كلمة المرور (تنولّد تلقائيًا)
            <span style={{ display: 'flex', gap: 8 }}>
              <input dir="ltr" value={password} onChange={e => setPassword(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="mc-btn2" onClick={() => setPassword(makePassword())}>توليد جديدة</button>
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="mc-btn2 p" disabled={!valid || password.length < 8 || busy} onClick={create}>{busy && !del ? 'جاري الإنشاء…' : 'إنشاء العميل'}</button>
          </div>
        </div>
      </article>

      <article className="mc-card" style={{ marginTop: 16 }}>
        <div className="mc-ph"><h3>الحسابات ({accounts.length})</h3></div>
        <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
          <thead><tr><th>الشركة</th><th>المنتج</th><th>الحالة</th><th>أُنشئت</th><th /></tr></thead>
          <tbody>
            {accounts.length === 0 && <tr><td colSpan={5} className="mc-flat">لا توجد حسابات.</td></tr>}
            {accounts.map(a => (
              <tr key={a.id}>
                <td><b>{a.name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }} dir="ltr">{a.owner_email || '—'}</div></td>
                <td>{a.products?.includes('quotation') ? (a.products.includes('voice_ai') ? 'Voice AI + Quotation' : 'Quotation') : 'Voice AI'}</td>
                <td>{STATUS[a.status] ?? a.status}{!a.auth_user_id && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>بدون حساب دخول</div>}</td>
                <td>{dateShort(a.created_at)}</td>
                <td>{a.auth_user_id && a.auth_user_id === me ? <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>حسابك</span> : <button className="mc-btn2" onClick={() => { setDel(a); setConfirmName(''); setError(null) }}>حذف</button>}</td>
              </tr>
            ))}
          </tbody></table></div>
      </article>

      {del && (
        <div className="mc-modal-bg" onClick={() => setDel(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>حذف «{del.name}»</h3>
            <div className="mc-delta" style={{ lineHeight: 1.8 }}>حذف نهائي: تروح الشركة وكل بياناتها (المحادثات، المكالمات، الحجوزات، العملاء) وحساب الدخول. ما فيه تراجع.</div>
            <label className="mc-field">اكتب اسم الشركة للتأكيد<input value={confirmName} onChange={e => setConfirmName(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setDel(null)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={confirmName.trim() !== del.name.trim() || busy} onClick={remove}>{busy ? 'جاري الحذف…' : 'حذف نهائي'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
