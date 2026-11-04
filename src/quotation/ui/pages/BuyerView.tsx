import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import '@/styles/dashboardV2Tokens.css'
import { initQuotation, getQt, buyerRespond } from '../../store'
import { live } from '../../liveApi'
import type { QtLine } from '../../types'
import { QuoteDocument, type DocData } from '../QuoteDocument'
import { QtStyles, fmtDate } from '../common'

/**
 * What the buyer opens from the link: the current version only, accept it or ask for a change.
 * Live links read through qt_public_quote (no costs); the demo reads the in-memory sample.
 */
export function BuyerView({ demo }: { demo?: boolean }) {
  const { token = '' } = useParams()
  const [doc, setDoc] = useState<(DocData & { status: string; acceptedBy?: string | null }) | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'accept' | 'change' | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    if (demo) {
      await initQuotation({ demo: true, companyId: null, companyName: '', actor: '', isOwner: true, role: null })
      const s = getQt()
      const q = s.quotes.find((x) => x.publicToken === token)
      if (!q) { setState('missing'); return }
      setDoc({
        companyName: s.companyName, customerName: s.customers.find((c) => c.id === q.customerId)?.name ?? '', number: q.number, version: q.version,
        date: q.updatedAt, validUntil: q.validUntil, currency: q.currency, vatRate: q.vatRate, discountPct: q.discountPct,
        lines: q.lines.map((l) => ({ ...l, unitCost: undefined })), paymentTerms: q.paymentTerms, deliveryTerms: q.deliveryTerms, lang: q.lang,
        nameEnFor: (pid) => s.products.find((p) => p.id === pid)?.nameEn, status: q.docStatus, acceptedBy: q.acceptedBy,
      })
      setState('ready'); return
    }
    try {
      const r = await live.publicQuote(token)
      if (!r) { setState('missing'); return }
      setDoc({
        companyName: r.company?.name ?? '', logoUrl: r.company?.logo_url, customerName: r.customer?.name ?? '', number: r.number, version: r.version,
        date: new Date().toISOString(), validUntil: r.valid_until, currency: r.currency, vatRate: Number(r.vat_rate), discountPct: Number(r.discount_pct),
        lines: (r.lines ?? []) as QtLine[], paymentTerms: r.payment_terms, deliveryTerms: r.delivery_terms, lang: r.lang, status: r.doc_status, acceptedBy: r.accepted_by,
      })
      setState('ready')
    } catch { setState('missing') }
  }
  useEffect(() => { void load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!doc || !mode || busy) return
    setBusy(true)
    const r = await buyerRespond(token, doc.version, mode === 'accept' ? { kind: 'accept', name } : { kind: 'change', name, note })
    setResult(r); setBusy(false)
    if (r.ok) setMode(null)
  }

  const expired = doc && doc.validUntil < new Date().toISOString().slice(0, 10)
  const open = doc && doc.status === 'sent' && !expired

  return (
    <div className="dv2-scope" data-theme="light" dir="rtl" style={{ minHeight: '100dvh', background: '#F5F5F5', padding: '24px 16px 48px' }}>
      <QtStyles />
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gap: 16 }}>
        {state === 'loading' && <p style={{ textAlign: 'center', color: '#555' }}>جارٍ فتح العرض…</p>}
        {state === 'missing' && <div className="qt-card" style={{ textAlign: 'center' }}><b>الرابط غير صالح أو العرض لم يعد متاحًا.</b></div>}
        {doc && (
          <>
            {demo && <div className="qt-issue approval">هذه معاينة تجريبية لصفحة العميل. لا تُرسل أي رسالة.</div>}
            <QuoteDocument d={doc} />
            <div className="qt-card" style={{ background: '#fff' }}>
              {result && <div className={`qt-issue ${result.ok ? '' : 'blocking'}`} role="status" style={result.ok ? { background: 'var(--ok-bg)', color: 'var(--ok)', marginBottom: 12 } : { marginBottom: 12 }}>{result.message}</div>}
              {doc.status === 'accepted' && !result && <p style={{ margin: 0 }}>تم قبول هذا العرض{doc.acceptedBy ? ` من ${doc.acceptedBy}` : ''}.</p>}
              {expired && doc.status !== 'accepted' && <p style={{ margin: 0 }}>انتهت صلاحية العرض في {fmtDate(doc.validUntil)}. اطلب نسخة محدّثة من الشركة.</p>}
              {doc.status !== 'sent' && doc.status !== 'accepted' && !expired && !result && <p style={{ margin: 0 }}>هذا العرض قيد التحديث حاليًا. سيصلك رابط النسخة الجديدة.</p>}
              {open && !result?.ok && (
                mode == null ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" className="qt-btn pri" onClick={() => setMode('accept')}>قبول العرض (النسخة {doc.version})</button>
                    <button type="button" className="qt-btn" onClick={() => setMode('change')}>طلب تعديل</button>
                  </div>
                ) : (
                  <form style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void submit() }}>
                    <label className="qt-field"><span className="qt-label">الاسم</span><input className="qt-input" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                    {mode === 'change' && <label className="qt-field"><span className="qt-label">التعديل المطلوب</span><textarea className="qt-textarea" required value={note} onChange={(e) => setNote(e.target.value)} /></label>}
                    {mode === 'accept' && <p style={{ margin: 0, fontSize: 13, color: '#555' }}>بالضغط على «تأكيد القبول» توافق على النسخة {doc.version} بالقيمة والشروط الظاهرة أعلاه. يُسجَّل اسمك ووقت القبول.</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="qt-btn pri" disabled={busy || !name.trim() || (mode === 'change' && !note.trim())}>{mode === 'accept' ? 'تأكيد القبول' : 'إرسال طلب التعديل'}</button>
                      <button type="button" className="qt-btn ghost" onClick={() => setMode(null)}>رجوع</button>
                    </div>
                  </form>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
