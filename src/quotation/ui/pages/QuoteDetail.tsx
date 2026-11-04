import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Bot, Copy, Printer, Send, Trash2, X, Check } from 'lucide-react'
import { NightPage, CardTitle, EmptyLine, Seg } from '@/dashboard/pages/shared/night'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useQt, editQuote, decideApproval, markSent, setDocStatus } from '../../store'
import { evaluate } from '../../pricing'
import { lineFromProduct } from '../../matching'
import { runAgentCommand } from '../../agent'
import type { QtLine } from '../../types'
import { QuoteStatus, fmtAgo, fmtDate, fmtDuration, fmtMoney, prepSeconds } from '../common'
import { QuoteDocument } from '../QuoteDocument'

export function QtQuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDemo, companyLogoUrl } = useWorkspace()
  const base = isDemo ? '/quotation-demo' : '/quotation'
  const q = useQt((s) => s.quotes.find((x) => x.id === id))
  const settings = useQt((s) => s.settings)
  const products = useQt((s) => s.products)
  const customers = useQt((s) => s.customers)
  const companyName = useQt((s) => s.companyName)
  const canSeeCosts = useQt((s) => s.canSeeCosts)
  const canApprove = useQt((s) => s.canApprove)
  const approval = useQt((s) => s.approvals.find((a) => a.quoteId === id && a.status === 'pending'))
  const lastDecision = useQt((s) => s.approvals.find((a) => a.quoteId === id && a.status !== 'pending'))
  const versions = useQt((s) => s.versions.filter((v) => v.quoteId === id).sort((a, b) => b.version - a.version))
  const events = useQt((s) => s.events.filter((e) => e.quoteId === id))

  const [draft, setDraft] = useState<QtLine[] | null>(null)
  const [discount, setDiscount] = useState<number | null>(null)
  const [chat, setChat] = useState<{ from: 'me' | 'agent'; text: string }[]>([])
  const [cmd, setCmd] = useState('')
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'doc' | 'history'>('doc')
  useEffect(() => { setDraft(null); setDiscount(null) }, [id, q?.version])

  const lines = draft ?? q?.lines ?? []
  const disc = discount ?? q?.discountPct ?? 0
  const verdict = useMemo(() => evaluate(lines, disc, settings), [lines, disc, settings])
  if (!q) return <NightPage><EmptyLine>العرض غير موجود. <button type="button" className="qt-link" onClick={() => navigate(`${base}/quotes`)}>كل العروض</button></EmptyLine></NightPage>

  const locked = q.docStatus === 'accepted'
  const dirty = draft != null || discount != null
  const customer = customers.find((c) => c.id === q.customerId)
  const link = `${window.location.origin}${isDemo ? '/quotation-demo/view/' : '/q/'}${q.publicToken}`
  const upd = (lineId: string, patch: Partial<QtLine>) => setDraft(lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)))

  async function save() {
    await editQuote(q!.id, { lines, discountPct: disc }, 'تعديل البنود')
  }
  async function send() {
    if (dirty) await save()
    await markSent(q!.id)
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked: the link is shown below */ }
  }
  async function runCmd() {
    const text = cmd.trim()
    if (!text) return
    setCmd('')
    const r = runAgentCommand(text, lines, products)
    setChat((c) => [...c, { from: 'me', text }, { from: 'agent', text: r.reply }])
    if (r.changed) await editQuote(q!.id, { lines: r.lines ?? lines, discountPct: r.discountPct ?? disc }, `الوكيل: ${text}`)
  }

  const prep = prepSeconds(q)

  return (
    <NightPage>
      <div className="np-head">
        <div>
          <button type="button" className="np-link qt-no-print" onClick={() => navigate(`${base}/quotes`)}><ArrowRight size={14} /> العروض</button>
          <h1 className="np-h1" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="qt-num">{q.number}</span><QuoteStatus q={q} />
          </h1>
          <p className="np-sub">{customer?.name} · النسخة {q.version} · صالح حتى {fmtDate(q.validUntil)} · زمن التجهيز {fmtDuration(prep)}{q.issuedAuto ? ' · أصدره الوكيل تلقائيًا' : ''}</p>
        </div>
        <div className="np-actions qt-no-print">
          <Seg label="لغة المستند" options={[['ar', 'عربي'], ['en', 'English']] as const} value={q.lang} onChange={(lang) => editQuote(q.id, { lang }, lang === 'en' ? 'تحويل المستند للإنجليزية' : 'تحويل المستند للعربية')} />
          <button type="button" className="qt-btn" onClick={() => { setTab('doc'); setTimeout(() => window.print(), 50) }}><Printer size={15} /> PDF</button>
          {(q.docStatus === 'ready' || q.docStatus === 'sent') && (
            <button type="button" className="qt-btn pri" onClick={send}>{copied ? <Check size={15} /> : <Send size={15} />} {q.docStatus === 'sent' ? (copied ? 'نُسخ الرابط' : 'نسخ رابط العرض') : 'إرسال للعميل'}</button>
          )}
        </div>
      </div>

      {verdict.needsApproval && !dirty && !approval && lastDecision?.status === 'approved' && lastDecision.reasons.join('|') === verdict.issues.filter((i) => i.level === 'approval').map((i) => i.message).join('|') ? (
        <div className="qt-card qt-no-print">
          <b style={{ color: 'var(--ok)' }}>وافق {lastDecision.decidedBy} على: {lastDecision.reasons.join('، ')}</b>
          <p className="np-sub">{fmtAgo(lastDecision.decidedAt!)}</p>
        </div>
      ) : verdict.issues.length > 0 && !locked && (
        <div className="qt-card qt-no-print" style={{ display: 'grid', gap: 8 }}>
          <CardTitle>{verdict.needsInfo ? 'ينتظر معلومة قبل التجهيز' : lastDecision?.status === 'rejected' && !approval ? 'رُفض الاستثناء: عدّل العرض ليعاد التحقق' : 'يحتاج موافقة قبل الإصدار'}</CardTitle>
          {verdict.issues.map((i, n) => <div key={n} className={`qt-issue ${i.level}`}>{i.message}</div>)}
          {approval && canApprove && !dirty && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" className="qt-btn pri" onClick={() => decideApproval(approval.id, 'approved')}><Check size={15} /> موافقة على الاستثناء</button>
              <button type="button" className="qt-btn danger" onClick={() => decideApproval(approval.id, 'rejected')}><X size={15} /> رفض</button>
            </div>
          )}
          {approval && !canApprove && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>أُرسل طلب الموافقة للمدير.</p>}
        </div>
      )}

      <div className="np-grid-2">
        <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
          <div className="qt-card qt-no-print">
            <CardTitle aside={dirty ? 'تعديلات غير محفوظة' : undefined}>البنود والحسابات</CardTitle>
            <div className="np-table-wrap">
              <table className="np-table" style={{ minWidth: 560 }}>
                <thead><tr><th>البند</th><th>الكمية</th><th>السعر</th><th>خصم %</th><th>الإجمالي</th><th /></tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id}>
                      <td style={{ minWidth: 180 }}>
                        {l.productId ? <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{l.description}</b> : (
                          <select className="qt-select" disabled={locked} value="" onChange={(e) => { const p = products.find((x) => x.id === e.target.value); if (p) setDraft(lines.map((x) => (x.id === l.id ? { ...lineFromProduct(p, x.qty, x.requested, x.sourceRef), id: x.id } : x))) }}>
                            <option value="">«{l.requested}»: اختر منتجًا</option>
                            {(l.candidates?.length ? products.filter((p) => l.candidates!.some((c) => c.productId === p.id)) : products.filter((p) => p.active)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        )}
                        <small style={{ display: 'block', color: 'var(--dim)' }}>طلب العميل: «{l.requested}»{l.sourceRef ? ` · ${l.sourceRef}` : ''}</small>
                        {l.productId && l.unitPrice == null && <small style={{ display: 'block', color: 'var(--warn)' }}>بدون سعر معتمد في الكتالوج</small>}
                      </td>
                      <td><input className="qt-input qt-num" style={{ width: 76 }} type="number" min={0} disabled={locked} value={l.qty} onChange={(e) => upd(l.id, { qty: Number(e.target.value) })} aria-label="الكمية" /></td>
                      <td><span className="qt-num">{l.unitPrice == null ? '—' : fmtMoney(l.unitPrice)}</span></td>
                      <td><input className="qt-input qt-num" style={{ width: 64 }} type="number" min={0} max={100} disabled={locked} value={l.discountPct} onChange={(e) => upd(l.id, { discountPct: Number(e.target.value) })} aria-label="خصم البند" /></td>
                      <td><span className="qt-num">{fmtMoney(verdict.totals.lines[i]?.net ?? 0)}</span></td>
                      <td>{!locked && <button type="button" className="qt-btn ghost sm" aria-label="حذف البند" onClick={() => setDraft(lines.filter((x) => x.id !== l.id))}><Trash2 size={14} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 14 }}>
              <label className="qt-field" style={{ width: 140 }}><span className="qt-label">خصم العرض %</span>
                <input className="qt-input qt-num" type="number" min={0} max={100} disabled={locked} value={disc} onChange={(e) => setDiscount(Number(e.target.value))} />
              </label>
              <div style={{ minWidth: 240, fontSize: 13 }}>
                <Row k="المجموع" v={fmtMoney(verdict.totals.subtotal)} />
                {verdict.totals.discount > 0 && <Row k="خصم العرض" v={`−${fmtMoney(verdict.totals.discount)}`} />}
                <Row k={`الضريبة ${settings.vatRate}%`} v={fmtMoney(verdict.totals.vat)} />
                <Row k="الإجمالي" v={fmtMoney(verdict.totals.total)} strong />
                {canSeeCosts && <Row k="الهامش (داخلي)" v={verdict.totals.marginPct == null ? 'التكلفة ناقصة' : `${fmtMoney(verdict.totals.margin!)} · ${verdict.totals.marginPct}%`} muted />}
              </div>
            </div>
            {dirty && !locked && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="qt-btn ghost" onClick={() => { setDraft(null); setDiscount(null) }}>تراجع</button>
                <button type="button" className="qt-btn pri" onClick={save}>حفظ وإعادة التحقق</button>
              </div>
            )}
          </div>

          {!locked && (
            <div className="qt-card qt-no-print">
              <CardTitle><Bot size={16} /> اطلب من الوكيل</CardTitle>
              <div style={{ display: 'grid', gap: 8, marginBottom: chat.length ? 12 : 0 }} aria-live="polite">
                {chat.map((m, i) => (
                  <div key={i} style={{ alignSelf: 'start', justifySelf: m.from === 'me' ? 'start' : 'end', maxWidth: '85%', padding: '8px 12px', borderRadius: 10, fontSize: 13, background: m.from === 'me' ? 'var(--raise)' : 'var(--ai-bg)', color: m.from === 'me' ? 'var(--ink)' : 'var(--ai)' }}>{m.text}</div>
                ))}
              </div>
              <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); void runCmd() }}>
                <input className="qt-input" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="مثال: غيّر كمية الكراسي إلى 50 · اقترح بديل أقل تكلفة للكرسي" aria-label="أمر للوكيل" />
                <button type="submit" className="qt-btn pri" disabled={!cmd.trim() || dirty}>تنفيذ</button>
              </form>
              {dirty && <small style={{ color: 'var(--dim)' }}>احفظ تعديلاتك أولًا.</small>}
            </div>
          )}

          {q.docStatus === 'sent' && (
            <div className="qt-card qt-no-print">
              <CardTitle>رابط العرض للعميل</CardTitle>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="qt-input qt-num" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="رابط العرض" />
                <button type="button" className="qt-btn" onClick={() => navigator.clipboard?.writeText(link)} aria-label="نسخ"><Copy size={15} /></button>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>يقدر العميل يقبل النسخة الحالية أو يطلب تعديلًا. ما يرسل النظام أي رسالة بنفسه.</p>
              <button type="button" className="qt-btn danger sm" style={{ marginTop: 10 }} onClick={() => setDocStatus(q.id, 'rejected', 'سجّل الفريق أن العميل رفض العرض')}>تسجيل رفض العميل</button>
            </div>
          )}
          {locked && <div className="qt-card"><b style={{ color: 'var(--ok)' }}>قبِل {q.acceptedBy} النسخة {q.acceptedVersion}</b><p className="np-sub">{fmtDate(q.acceptedAt)}. العرض مقفل؛ أي تغيير يحتاج عرضًا جديدًا.</p></div>}
        </div>

        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <span className="qt-no-print"><Seg label="العرض" options={[['doc', 'معاينة المستند'], ['history', 'النسخ والسجل']] as const} value={tab} onChange={setTab} /></span>
          {tab === 'doc' ? (
            <QuoteDocument d={{
              companyName, logoUrl: companyLogoUrl, customerName: customer?.name ?? '', number: q.number, version: q.version, date: q.createdAt, validUntil: q.validUntil,
              currency: q.currency, vatRate: q.vatRate, discountPct: disc, lines, paymentTerms: q.paymentTerms, deliveryTerms: q.deliveryTerms, lang: q.lang,
              nameEnFor: (pid) => products.find((p) => p.id === pid)?.nameEn,
            }} />
          ) : (
            <div className="qt-card">
              <CardTitle>النسخ</CardTitle>
              {versions.length === 0 ? <EmptyLine>—</EmptyLine> : versions.map((v) => (
                <div key={v.version} className="np-row"><div className="np-row-main"><b>النسخة {v.version}: {v.note}</b><small>{v.by} · {fmtAgo(v.at)}{v.total ? ` · ${fmtMoney(v.total)}` : ''}</small></div></div>
              ))}
              <CardTitle style={{ marginTop: 16 }}>السجل</CardTitle>
              {events.length === 0 ? <EmptyLine>—</EmptyLine> : events.map((e) => (
                <div key={e.id} className="np-row"><div className="np-row-main"><b style={{ fontSize: 13 }}>{e.body}</b><small>{e.actor} · {fmtAgo(e.at)}</small></div></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NightPage>
  )
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '3px 0', fontWeight: strong ? 600 : 400, color: muted ? 'var(--muted)' : 'var(--text-primary)', borderTop: strong ? '1px solid var(--line)' : undefined }}>
      <span>{k}</span><span className="qt-num">{v}</span>
    </div>
  )
}
