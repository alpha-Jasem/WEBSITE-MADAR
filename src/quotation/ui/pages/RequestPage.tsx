import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileUp, Check } from 'lucide-react'
import '@/styles/dashboardV2Tokens.css'
import { initQuotation, getQt, upsertCustomer, createQuoteFromRequest } from '../../store'
import { live, fileToAgent, type AgentFile } from '../../liveApi'
import { parseRequest, type RequestItem } from '../../matching'
import { readSheet, requestItemsFromRows } from '../../importer'
import { QtStyles } from '../common'

/**
 * The company's public "request a quote" page (a link or an embed on its website). The agent reads the
 * request, matches it to the catalog and leaves a draft quote in the dashboard. Nothing is priced here.
 */
export function RequestPage({ demo }: { demo?: boolean }) {
  const { companyId = '' } = useParams()
  const [company, setCompany] = useState<{ name: string; logo_url: string | null } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [form, setForm] = useState({ name: '', phone: '', org: '', email: '', text: '' })
  const [fileName, setFileName] = useState('')
  const [fileItems, setFileItems] = useState<RequestItem[]>([])
  const [pdf, setPdf] = useState<AgentFile | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ number: string; quoteId?: string } | null>(null)
  const keyRef = useRef(crypto.randomUUID())
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      if (demo) {
        await initQuotation({ demo: true, companyId: null, companyName: '', actor: '', isOwner: true, role: null })
        setCompany({ name: getQt().companyName, logo_url: null }); setState('ready'); return
      }
      const c = await live.rfqCompany(companyId)
      if (c) { setCompany(c); setState('ready') } else setState('missing')
    })()
  }, [companyId, demo])

  async function onFile(f: File | undefined) {
    setError('')
    if (!f) return
    try {
      if (/\.pdf$/i.test(f.name)) {
        if (demo) { setError('في التجربة ارفع Excel أو اكتب البنود.'); return }
        if (f.size > 5 * 1024 * 1024) { setError('الملف أكبر من 5 ميجا.'); return }
        setPdf(await fileToAgent(f)); setFileItems([])
      } else {
        const items = requestItemsFromRows(await readSheet(f), f.name)
        if (!items.length) { setError('ما لقينا بنودًا في الملف. تأكد أن فيه عمود «البند» أو «الاسم» و«الكمية».'); return }
        setFileItems(items); setPdf(null)
      }
      setFileName(f.name)
    } catch {
      setError('تعذر قراءة الملف.')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (!form.text.trim() && !fileItems.length && !pdf) { setError('اكتب الأصناف المطلوبة أو ارفع ملفًا.'); return }
    setBusy(true)
    try {
      if (demo) {
        const c = await upsertCustomer({ name: form.org.trim() || form.name.trim(), contactName: form.org.trim() ? form.name.trim() : undefined, phone: form.phone, email: form.email || undefined })
        const q = await createQuoteFromRequest({ idempotencyKey: keyRef.current, customerId: c.id, items: [...parseRequest(form.text), ...fileItems] })
        setDone({ number: q.number, quoteId: q.id })
        return
      }
      const r = await live.intake({ company_id: companyId, key: keyRef.current, ...form, file: pdf, items: fileItems })
      if (r.ok && r.number) setDone({ number: r.number })
      else setError(r.message || 'تعذر إرسال الطلب، حاول مرة ثانية.')
    } finally {
      setBusy(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="dv2-scope rq" data-theme="light" dir="rtl">
      <QtStyles />
      <style>{RQ_CSS}</style>
      <main className="rq-wrap">
        {state === 'loading' && <p className="rq-muted" style={{ textAlign: 'center' }}>جارٍ الفتح…</p>}
        {state === 'missing' && <div className="qt-card" style={{ textAlign: 'center' }}><b>الرابط غير صالح.</b></div>}
        {company && (
          <>
            <header className="rq-head">
              {company.logo_url ? <img src={company.logo_url} alt="" /> : <span className="rq-mark">{company.name.trim().charAt(0)}</span>}
              <div>
                <h1>اطلب عرض سعر</h1>
                <p className="rq-muted">{company.name}</p>
              </div>
            </header>
            {demo && <div className="qt-issue approval">صفحة تجريبية: الطلب يظهر في لوحة التجربة فقط.</div>}

            {done ? (
              <div className="qt-card rq-done" role="status">
                <span className="rq-ok"><Check size={22} /></span>
                <h2>وصل طلبك</h2>
                <p>رقم الطلب <b className="qt-num">{done.number}</b>. نراجعه ونرسل لك عرض السعر على جوالك.</p>
                {demo && done.quoteId && <Link className="qt-btn pri" to={`/quotation-demo/q/${done.quoteId}`}>افتح العرض في لوحة التجربة</Link>}
              </div>
            ) : (
              <form className="qt-card rq-form" onSubmit={submit}>
                <div className="rq-grid">
                  <label className="qt-field"><span className="qt-label">الاسم</span><input className="qt-input" required value={form.name} onChange={set('name')} autoComplete="name" /></label>
                  <label className="qt-field"><span className="qt-label">رقم الجوال</span><input className="qt-input qt-num" required inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="05XXXXXXXX" autoComplete="tel" /></label>
                  <label className="qt-field"><span className="qt-label">اسم الشركة (اختياري)</span><input className="qt-input" value={form.org} onChange={set('org')} autoComplete="organization" /></label>
                  <label className="qt-field"><span className="qt-label">البريد (اختياري)</span><input className="qt-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" /></label>
                </div>
                <label className="qt-field">
                  <span className="qt-label">الأصناف المطلوبة</span>
                  <textarea className="qt-textarea" value={form.text} onChange={set('text')} placeholder={'اكتب كل صنف مع الكمية، مثل:\n40 كرسي مكتب شبكي\n40 مكتب 140 سم'} />
                </label>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                <button type="button" className="qt-drop" onClick={() => fileRef.current?.click()}>
                  <FileUp size={22} />
                  <b>{fileName || 'أو ارفع قائمة الطلب'}</b>
                  <small>{fileName ? (pdf ? 'بنقرأ الملف ونطابق الأصناف' : `${fileItems.length} بند`) : 'ملف Excel أو PDF، حتى 5 ميجا'}</small>
                </button>
                {error && <p className="qt-note" role="alert">{error}</p>}
                <button type="submit" className="qt-btn pri rq-send" disabled={busy}>{busy ? 'جارٍ قراءة الطلب…' : 'إرسال الطلب'}</button>
              </form>
            )}
            <p className="rq-foot">يعمل بواسطة مدار</p>
          </>
        )}
      </main>
    </div>
  )
}

const RQ_CSS = `
.rq { min-height: 100dvh; background: #F3F5FA; color: #0A0F2C; }
.rq-wrap { max-width: 640px; margin: 0 auto; padding: 32px 16px 40px; display: grid; gap: 16px; }
.rq-head { display: flex; align-items: center; gap: 14px; }
.rq-head img, .rq-mark { width: 52px; height: 52px; border-radius: 14px; object-fit: contain; background: #fff; flex: none; }
.rq-mark { display: grid; place-items: center; font-size: 22px; font-weight: 600; background: #0A0F2C; color: #E9ECF2; }
.rq-head h1 { margin: 0; font-size: 22px; font-weight: 600; }
.rq-muted { margin: 2px 0 0; color: #5B6478; font-size: 14px; }
.rq .qt-card { background: #fff; border-color: #E3E7F0; }
.rq-form { display: grid; gap: 14px; }
.rq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rq-send { height: 46px; font-size: 15px; }
.rq-done { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 32px 20px; }
.rq-done h2 { margin: 0; font-size: 19px; }
.rq-done p { margin: 0 0 8px; color: #5B6478; line-height: 1.8; }
.rq-ok { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--ok-bg); color: var(--ok); }
.rq-foot { text-align: center; font-size: 12px; color: #8F98AF; margin: 0; }
@media (max-width: 560px) { .rq-grid { grid-template-columns: 1fr; } }
`
