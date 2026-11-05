import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, FileSpreadsheet, X, Check, HelpCircle } from 'lucide-react'
import { useQt, createQuoteFromRequest, upsertCustomer } from '../store'
import { matchItem, parseRequest, type RequestItem } from '../matching'
import { readSheet, requestItemsFromRows } from '../importer'
import { live, fileToAgent, type AgentFile } from '../liveApi'
import { Field } from './common'

/**
 * The agent journey inside the dashboard: understand the request, show what was understood, ask only
 * about what's unclear, then prepare the quote once the buyer's information is complete.
 */
export function NewQuoteDialog({ open, onClose, base }: { open: boolean; onClose: () => void; base: string }) {
  const navigate = useNavigate()
  const customers = useQt((s) => s.customers)
  const products = useQt((s) => s.products)
  const mode = useQt((s) => s.mode)
  const [customerId, setCustomerId] = useState('')
  const [newCustomer, setNewCustomer] = useState('')
  const [text, setText] = useState('')
  const [fileItems, setFileItems] = useState<RequestItem[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [pdf, setPdf] = useState<AgentFile | null>(null)
  const [reading, setReading] = useState(false)
  const [note, setNote] = useState('')
  const [step, setStep] = useState<'request' | 'review'>('request')
  const [items, setItems] = useState<(RequestItem & { pick?: string })[]>([])
  const [busy, setBusy] = useState(false)
  const keyRef = useRef(crypto.randomUUID())
  const fileRef = useRef<HTMLInputElement>(null)

  const reviewed = useMemo(() => items.map((it) => {
    const m = matchItem(it.text, products)
    const product = it.pick ? products.find((p) => p.id === it.pick) ?? null : m.product
    return { ...it, product, candidates: m.candidates }
  }), [items, products])

  if (!open) return null

  const reset = () => {
    setCustomerId(''); setNewCustomer(''); setText(''); setFileItems([]); setFileName(''); setFileError(''); setPdf(null); setNote(''); setStep('request'); setItems([]); keyRef.current = crypto.randomUUID()
  }
  const close = () => { reset(); onClose() }

  async function onFile(f: File | undefined) {
    setFileError('')
    if (!f) return
    if (/\.pdf$/i.test(f.name)) {
      if (mode !== 'live') { setFileError('قراءة ملفات PDF تعمل في الحساب الفعلي. في التجربة ارفع Excel أو الصق البنود كنص.'); return }
      if (f.size > 5 * 1024 * 1024) { setFileError('الملف أكبر من 5 ميجا.'); return }
      setPdf(await fileToAgent(f)); setFileItems([]); setFileName(f.name)
      return
    }
    try {
      const rows = await readSheet(f)
      const its = requestItemsFromRows(rows, f.name)
      if (its.length === 0) { setFileError('ما لقيت بنودًا في الملف. تأكد أن فيه عمود «البند» أو «الاسم».'); return }
      setFileItems(its); setFileName(f.name); setPdf(null)
    } catch {
      setFileError('تعذر قراءة الملف.')
    }
  }

  /** Live: the agent reads the message or PDF and picks catalog products; otherwise (or if it fails) line-by-line reading. */
  async function toReview() {
    setNote('')
    let read: (RequestItem & { pick?: string })[] | null = null
    if (mode === 'live' && (text.trim() || pdf)) {
      setReading(true)
      const r = await live.understand(text, pdf)
      setReading(false)
      if (!r.error) read = r.items.map((i) => ({ text: i.text, qty: i.qty, sourceRef: i.sourceRef ?? 'نص الطلب', pick: i.productId ?? undefined }))
      else if (pdf) { setFileError('ما قدر الوكيل يقرأ الملف. الصق البنود كنص أو ارفع Excel.'); return }
      else setNote('الوكيل ما رد هالمرة، فقرأت الطلب سطرًا بسطر. راجع البنود.')
    }
    setItems([...(read ?? parseRequest(text)), ...fileItems])
    setStep('review')
  }

  const unresolved = reviewed.filter((r) => !r.product || !(r.qty && r.qty > 0))
  const canCreate = (customerId || newCustomer.trim()) && reviewed.length > 0

  async function create() {
    if (busy) return
    setBusy(true)
    try {
      const cust = customerId ? customers.find((c) => c.id === customerId)! : await upsertCustomer({ name: newCustomer.trim() })
      const finalItems = reviewed.map((r) => ({ text: r.text, qty: r.qty, sourceRef: r.sourceRef, productId: r.product?.id }))
      const q = await createQuoteFromRequest({ idempotencyKey: keyRef.current, customerId: cust.id, items: finalItems })
      close()
      navigate(`${base}/q/${q.id}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="qt-new-title" className="qt-modal-scrim" onClick={close}>
      <style>{`.qt-modal-scrim{position:fixed;inset:0;z-index:1300;background:var(--scrim);display:flex;align-items:center;justify-content:center;padding:16px}
        .qt-modal{background:var(--surface-raised);border:1px solid var(--line-2);border-radius:14px;width:640px;max-width:100%;max-height:calc(100dvh - 32px);overflow:auto;padding:20px}
        .qt-rev{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line)}
        .qt-rev:last-child{border-bottom:0}`}</style>
      <div className="qt-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 id="qt-new-title" style={{ margin: 0, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}><Bot size={18} /> إنشاء عرض بالوكيل</h2>
          <button type="button" className="qt-btn ghost sm" onClick={close} aria-label="إغلاق"><X size={16} /></button>
        </div>

        {step === 'request' ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="np-form-grid">
              <Field label="العميل">
                <select className="qt-select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">عميل جديد…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              {!customerId && <Field label="اسم العميل الجديد"><input className="qt-input" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="مثال: شركة البناء الحديث" /></Field>}
            </div>
            <Field label="طلب العميل" hint="بند في كل سطر مع الكمية، مثل: 40 كرسي مكتب شبكي، أو الصق رسالة العميل كما هي.">
              <textarea className="qt-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={'40 كرسي مكتب شبكي\n40 مكتب عمل 140 سم\nتركيب وتوصيل: 2'} />
            </Field>
            <div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <button type="button" className="qt-btn" onClick={() => fileRef.current?.click()}><FileSpreadsheet size={15} /> إرفاق ملف (Excel أو PDF)</button>
              {fileName && <span style={{ marginInlineStart: 10, fontSize: 12.5, color: 'var(--muted)' }}>{fileName}{pdf ? ': يقرأه الوكيل' : `: ${fileItems.length} بند`}</span>}
              {fileError && <p style={{ color: 'var(--warn)', fontSize: 12.5, margin: '8px 0 0' }}>{fileError}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="qt-btn ghost" onClick={close}>إلغاء</button>
              <button type="button" className="qt-btn pri" disabled={reading || (!text.trim() && fileItems.length === 0 && !pdf)} onClick={toReview}>{reading ? 'الوكيل يقرأ الطلب…' : 'فهم الطلب'}</button>
            </div>
          </div>
        ) : (
          <div>
            {note && <p className="qt-issue blocking" style={{ margin: '0 0 10px' }}>{note}</p>}
            <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: 13 }}>هذا اللي فهمه الوكيل. {unresolved.length ? `فيه ${unresolved.length} بند يحتاج توضيح، والباقي جاهز.` : 'كل البنود واضحة.'}</p>
            <div>
              {reviewed.map((r, i) => (
                <div key={i} className="qt-rev">
                  <span style={{ marginTop: 3, color: r.product && r.qty ? 'var(--ok)' : 'var(--warn)' }}>{r.product && r.qty ? <Check size={16} /> : <HelpCircle size={16} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5 }}>«{r.text}» <small style={{ color: 'var(--dim)' }}>{r.sourceRef}</small></div>
                    {r.product
                      ? <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>← {r.product.name} {r.product.sku && <span className="qt-num">({r.product.sku})</span>}{r.product.unitPrice == null && <b style={{ color: 'var(--warn)' }}> · بدون سعر معتمد</b>}</div>
                      : r.candidates.length > 0
                        ? <select className="qt-select" style={{ marginTop: 6 }} value={r.pick || ''} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, pick: e.target.value || undefined } : x)))}>
                            <option value="">أي منتج تقصد؟</option>
                            {r.candidates.map((c) => <option key={c.productId} value={c.productId}>{c.name}</option>)}
                          </select>
                        : <div style={{ fontSize: 12.5, color: 'var(--warn)' }}>غير موجود في الكتالوج. بيبقى في العرض كبند ينتظر قرارك.</div>}
                  </div>
                  <input className="qt-input qt-num" style={{ width: 80 }} type="number" min={0} aria-label="الكمية" value={r.qty ?? ''} placeholder="الكمية"
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: e.target.value === '' ? null : Number(e.target.value) } : x)))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button type="button" className="qt-btn ghost" onClick={() => setStep('request')}>رجوع</button>
              <button type="button" className="qt-btn pri" disabled={!canCreate || busy} onClick={create}>{busy ? 'جارٍ التجهيز…' : 'تأكيد الطلب وتجهيز العرض'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
