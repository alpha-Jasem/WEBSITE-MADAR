import { useState } from 'react'
import { Plus } from 'lucide-react'
import { NightPage, PageHead, EmptyLine } from '@/dashboard/pages/shared/night'
import { useQt, upsertCustomer, verdictFor } from '../../store'
import { Field, fmtDate, fmtMoney } from '../common'

export function QtCustomers() {
  const customers = useQt((s) => s.customers)
  const quotes = useQt((s) => s.quotes)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '' })

  async function add() {
    if (!form.name.trim()) return
    await upsertCustomer({ name: form.name.trim(), contactName: form.contactName || undefined, phone: form.phone || undefined, email: form.email || undefined })
    setForm({ name: '', contactName: '', phone: '', email: '' }); setAdding(false)
  }

  return (
    <NightPage>
      <PageHead title="العملاء" sub={`${customers.length} عميل`} actions={<button type="button" className="qt-btn pri" onClick={() => setAdding((v) => !v)}><Plus size={15} /> عميل جديد</button>} />
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
        {customers.length === 0 ? <EmptyLine>ما فيه عملاء بعد. يُضاف العميل تلقائيًا عند أول عرض له.</EmptyLine> : (
          <div className="np-table-wrap">
            <table className="np-table">
              <thead><tr><th>العميل</th><th>المسؤول</th><th>التواصل</th><th>العروض</th><th>المقبول</th><th>منذ</th></tr></thead>
              <tbody>
                {customers.map((c) => {
                  const mine = quotes.filter((q) => q.customerId === c.id)
                  const won = mine.filter((q) => q.docStatus === 'accepted').reduce((s, q) => s + verdictFor(q).totals.total, 0)
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
          </div>
        )}
      </div>
    </NightPage>
  )
}
