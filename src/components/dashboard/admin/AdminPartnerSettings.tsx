import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { writeAudit } from '../../../lib/deals'

interface Partner {
  display_name: string; contact_email: string | null; public_signup: boolean; trial_without_card: boolean; customers_add_payment_method: boolean
  help_url: string | null; docs_url: string | null; terms_url: string | null; privacy_url: string | null; webhook_url: string | null; connect_redirect_url: string | null
}

const field: React.CSSProperties = { height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 12px' }
const isUrl = (v: string | null) => !v || /^https:\/\/\S+$/.test(v)

/** Partner settings: the name customers see, the public sign-up page, who pays, legal links, and the webhook and connect-link addresses. */
export function AdminPartnerSettings() {
  const [s, setS] = useState<Partner | null>(null)
  const [saved, setSaved] = useState<Partner | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('partner_settings').select('*').eq('id', 1).maybeSingle()
    if (error) { setMissing(true); return }
    if (data) { setS(data as Partner); setSaved(data as Partner) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (missing) return <article className="mc-card"><div className="mc-flat">إعدادات الشريك تتفعّل بعد تحديث قاعدة البيانات.</div></article>
  if (!s || !saved) return <div className="mc-flat">جارٍ التحميل...</div>

  const set = (patch: Partial<Partner>) => setS({ ...s, ...patch })
  const dirty = JSON.stringify(s) !== JSON.stringify(saved)
  const text = (k: keyof Partner, label: string, ph = 'https://…') => (
    <label className="mc-field">{label}<input style={{ ...field, direction: 'ltr', textAlign: 'start' }} value={(s[k] as string | null) ?? ''} placeholder={ph} onChange={e => set({ [k]: e.target.value || null } as Partial<Partner>)} /></label>
  )

  async function save() {
    if (!s || !saved) return
    const urls: (keyof Partner)[] = ['help_url', 'docs_url', 'terms_url', 'privacy_url', 'webhook_url', 'connect_redirect_url']
    if (urls.some(k => !isUrl(s[k] as string | null))) { setMsg('الروابط لازم تبدأ بـ https://'); return }
    if (!s.display_name.trim()) { setMsg('اكتب الاسم الظاهر.'); return }
    setBusy(true)
    const { error } = await supabase.from('partner_settings').update({ ...s, display_name: s.display_name.trim(), updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) { setMsg('تعذّر الحفظ.'); return }
    await writeAudit('partner_settings_changed', 'partner_settings', '1', saved, s)
    setSaved(s); setMsg('انحفظت الإعدادات.')
  }

  return (
    <>
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>الهوية والتواصل</h3><button className="mc-btn2 p" disabled={!dirty || busy} onClick={save}>{busy ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}</button></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-grid2">
            <label className="mc-field">الاسم الظاهر (يظهر بجانب الشعار في مساحات العملاء)<input style={field} value={s.display_name} onChange={e => set({ display_name: e.target.value })} /></label>
            <label className="mc-field">بريد التواصل<input style={{ ...field, direction: 'ltr', textAlign: 'start' }} type="email" value={s.contact_email ?? ''} onChange={e => set({ contact_email: e.target.value || null })} /></label>
          </div>
          {msg && <div className="mc-delta">{msg}</div>}
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>التسجيل والدفع</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={s.public_signup} onChange={e => set({ public_signup: e.target.checked })} />
            تفعيل التسجيل العام <span className="mc-delta">السماح للشركات الجديدة بالتسجيل من صفحة التسجيل</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={s.trial_without_card} onChange={e => set({ trial_without_card: e.target.checked })} />
            تجربة بدون بطاقة <span className="mc-delta">إكمال التسجيل للتجربة دون جمع بيانات الدفع</span>
          </label>
          <label className="mc-field">كيف يدفع العملاء
            <select style={field} value={s.customers_add_payment_method ? 'customer' : 'agency'} onChange={e => set({ customers_add_payment_method: e.target.value === 'customer' })}>
              <option value="customer">العميل يضيف وسيلة الدفع بنفسه</option>
              <option value="agency">نحن ندفع عن العميل (بدون إضافة بطاقة)</option>
            </select>
          </label>
          <div className="mc-delta">هذي القيم محفوظة للإعداد. صفحة التسجيل والفوترة تقرأها عند ربطها بها.</div>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>الروابط القانونية والمساعدة</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-grid2">
            {text('help_url', 'رابط مركز المساعدة')}
            {text('docs_url', 'رابط الوثائق')}
            {text('terms_url', 'رابط شروط الخدمة')}
            {text('privacy_url', 'رابط سياسة الخصوصية')}
          </div>
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>المطوّرون</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-grid2">
            {text('webhook_url', 'عنوان ويب هوك الشريك')}
            {text('connect_redirect_url', 'عنوان التحويل بعد ربط واتساب')}
          </div>
          <div className="mc-delta">يُحفظ العنوان هنا، وإرسال الأحداث إليه يحتاج تفعيلًا من جهة الخادم.</div>
        </div>
      </article>
    </>
  )
}
