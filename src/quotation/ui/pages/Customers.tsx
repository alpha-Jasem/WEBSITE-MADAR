import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Upload, Download, FileSpreadsheet, Search } from 'lucide-react'
import { NightPage, PageHead, EmptyLine } from '@/dashboard/pages/shared/night'
import { useQt, upsertCustomer, importCustomers, verdictFor } from '../../store'
import type { QtCustomer, QtQuote } from '../../types'
import { readSheet, previewCustomers, downloadSheet, type CustomerImport } from '../../importer'
import { Field, fmtDate, fmtMoney } from '../common'

/** The whole customer list as an Excel file, with each customer's quotes and accepted value. */
export function exportCustomers(customers: QtCustomer[], quotes: QtQuote[]) {
  const rows = customers.map((c) => {
    const mine = quotes.filter((q) => q.customerId === c.id)
    const won = mine.filter((q) => q.docStatus === 'accepted').reduce((s, q) => s + verdictFor(q).totals.total, 0)
    return {
      'اسم العميل': c.name, 'الشخص المسؤول': c.contactName ?? '', 'الجوال': c.phone ?? '', 'البريد': c.email ?? '',
      'عدد العروض': mine.length, 'قيمة المقبول': Number(won.toFixed(2)), 'تاريخ الإضافة': c.createdAt.slice(0, 10),
    }
  })
  return downloadSheet(rows.length ? rows : [{ 'اسم العميل': '', 'الشخص المسؤول': '', 'الجوال': '', 'البريد': '' }], `عملاء-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function QtCustomers() {
  const customers = useQt((s) => s.customers)
  const quotes = useQt((s) => s.quotes)
  const [params, setParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(params.get('import') === '1')
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '' })
  const [query, setQuery] = useState('')
  const [file, setFile] = useState<{ name: string; preview: CustomerImport } | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function add() {
    if (!form.name.trim()) return
    await upsertCustomer({ name: form.name.trim(), contactName: form.contactName || undefined, phone: form.phone || undefined, email: form.email || undefined })
    setForm({ name: '', contactName: '', phone: '', email: '' }); setAdding(false)
  }

  async function pick(f: File | undefined) {
    if (!f) return
    setNote(null)
    try {
      setFile({ name: f.name, preview: previewCustomers(await readSheet(f)) })
    } catch {
      setFile(null); setNote({ ok: false, text: 'ما قدرنا نقرأ الملف. استخدم ملف Excel أو CSV.' })
    }
  }

  async function confirmImport() {
    if (!file?.preview.rows.length) return
    setBusy(true)
    try {
      const n = await importCustomers(file.preview.rows)
      setNote({ ok: true, text: `تمت إضافة وتحديث ${n} عميل.` })
      setFile(null); setImporting(false)
      if (params.get('import')) { params.delete('import'); setParams(params, { replace: true }) }
    } catch (e) {
      setNote({ ok: false, text: `ما اكتمل الاستيراد: ${e instanceof Error ? e.message : 'خطأ غير معروف'}` })
    } finally { setBusy(false) }
  }

  const q = query.trim()
  const list = q ? customers.filter((c) => c.name.includes(q) || (c.contactName ?? '').includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q.toLowerCase())) : customers

  return (
    <NightPage>
      <PageHead title="العملاء" sub={`${customers.length} عميل`} actions={<>
        <button type="button" className="qt-btn" onClick={() => { setImporting((v) => !v); setAdding(false) }}><Upload size={15} /> استيراد Excel</button>
        <button type="button" className="qt-btn" onClick={() => exportCustomers(customers, quotes)}><Download size={15} /> تصدير</button>
        <button type="button" className="qt-btn pri" onClick={() => { setAdding((v) => !v); setImporting(false) }}><Plus size={15} /> عميل جديد</button>
      </>} />

      {note && <div className="qt-note" data-ok={note.ok}>{note.text}</div>}

      {importing && (
        <div className="qt-card">
          <input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = '' }} />
          {!file ? (
            <button type="button" className="qt-drop" onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]) }}>
              <FileSpreadsheet size={28} />
              <b>اختر ملف Excel أو اسحبه هنا</b>
              <small>أعمدة مثل: اسم العميل، الشخص المسؤول، الجوال، البريد. العميل الموجود بنفس الاسم يتحدّث بدل ما يتكرر.</small>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <FileSpreadsheet size={18} style={{ color: 'var(--sky)' }} />
                <b style={{ fontWeight: 500 }}>{file.name}</b>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>{file.preview.rows.length} عميل جاهز{file.preview.errors.length ? ` · ${file.preview.errors.length} سطر متروك` : ''}</span>
              </div>
              {file.preview.rows.length === 0 && <EmptyLine>ما لقينا عمود لاسم العميل. سمِّ العمود «اسم العميل» أو «الاسم».</EmptyLine>}
              {file.preview.rows.length > 0 && (
                <div className="np-table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table className="np-table">
                    <thead><tr><th>العميل</th><th>المسؤول</th><th>الجوال</th><th>البريد</th></tr></thead>
                    <tbody>{file.preview.rows.slice(0, 50).map((r, i) => (
                      <tr key={i}><td className="strong">{r.name}</td><td>{r.contactName || '—'}</td><td><span className="qt-num">{r.phone || '—'}</span></td><td>{r.email || '—'}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              {file.preview.errors.length > 0 && (
                <small style={{ color: 'var(--warn)' }}>{file.preview.errors.slice(0, 5).map((e) => `سطر ${e.row}: ${e.message}`).join(' · ')}{file.preview.errors.length > 5 ? ' …' : ''}</small>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="qt-btn ghost" onClick={() => setFile(null)}>ملف آخر</button>
                <button type="button" className="qt-btn pri" disabled={busy || !file.preview.rows.length} onClick={confirmImport}>{busy ? 'جاري الاستيراد…' : `استيراد ${file.preview.rows.length} عميل`}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {adding && (
        <div className="qt-card">
          <div className="np-form-grid">
            <Field label="اسم الشركة أو العميل"><input className="qt-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="الشخص المسؤول"><input className="qt-input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></Field>
            <Field label="الجوال" hint="بالصيغة الدولية 966XXXXXXXXX"><input className="qt-input qt-num" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="البريد"><input className="qt-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="qt-btn ghost" onClick={() => setAdding(false)}>إلغاء</button>
            <button type="button" className="qt-btn pri" disabled={!form.name.trim()} onClick={add}>حفظ</button>
          </div>
        </div>
      )}

      <div className="qt-card">
        {customers.length > 0 && (
          <label style={{ position: 'relative', display: 'block', marginBottom: 12 }}>
            <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: 11, color: 'var(--dim)' }} />
            <input className="qt-input" style={{ paddingInlineStart: 34 }} placeholder="ابحث بالاسم أو الجوال أو البريد" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث في العملاء" />
          </label>
        )}
        {customers.length === 0 ? <EmptyLine>ما فيه عملاء بعد. استورد قائمتك من Excel، أو يُضاف العميل تلقائيًا عند أول عرض له.</EmptyLine> : list.length === 0 ? <EmptyLine>ما فيه نتائج</EmptyLine> : (
          <div className="np-table-wrap">
            <table className="np-table">
              <thead><tr><th>العميل</th><th>المسؤول</th><th>التواصل</th><th>العروض</th><th>المقبول</th><th>منذ</th></tr></thead>
              <tbody>
                {list.slice(0, 300).map((c) => {
                  const mine = quotes.filter((x) => x.customerId === c.id)
                  const won = mine.filter((x) => x.docStatus === 'accepted').reduce((s, x) => s + verdictFor(x).totals.total, 0)
                  return (
                    <tr key={c.id}>
                      <td className="strong">{c.name}</td>
                      <td>{c.contactName || '—'}</td>
                      <td><span className="qt-num">{c.phone || c.email || '—'}</span></td>
                      <td>{mine.length}</td>
                      <td><span className="qt-num">{won ? fmtMoney(won) : '—'}</span></td>
                      <td>{fmtDate(c.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {list.length > 300 && <EmptyLine>يظهر أول 300. استخدم البحث أو التصدير للباقي.</EmptyLine>}
          </div>
        )}
      </div>
    </NightPage>
  )
}
