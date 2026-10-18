import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { writeAudit } from '../../../lib/deals'
import { parseBankNotice } from '../../../lib/commercial'
import { splitVat } from '../../../lib/collections'
import { dateShort, nf, timeShort } from '../../../lib/format'

interface Notice { id: string; received_at: string; sender: string; amount: number | null; reference: string; excerpt: string; status: string; matched_payment_id: string | null; note: string; source: string }
const ST: Record<string, { label: string; cls: string }> = {
  awaiting_verification: { label: 'بانتظار التحقق', cls: 'mc-a' }, matched: { label: 'طُوبق', cls: 'mc-b' }, confirmed: { label: 'مؤكد', cls: 'mc-g' }, rejected: { label: 'مرفوض', cls: 'mc-n2' }, duplicate: { label: 'مكرر', cls: 'mc-n2' },
}

// Bank transfer notices. A notice is never collection: it can only become a pending payment that the owner then verifies.
export const AdminBankNotices = () => {
  const [rows, setRows] = useState<Notice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sender, setSender] = useState('')
  const [parsed, setParsed] = useState<{ amount: string; reference: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('bank_notifications').select('*').order('received_at', { ascending: false }).limit(300)
    setError(e ? 'تعذّر تحميل الإشعارات.' : null)
    setRows(((data ?? []) as Notice[]).map(r => ({ ...r, amount: r.amount === null ? null : Number(r.amount) })))
  }, [])
  useEffect(() => { load() }, [load])

  const parse = () => { const p = parseBankNotice(text); setParsed({ amount: p.amount ? String(p.amount) : '', reference: p.reference }) }

  const save = async () => {
    if (!parsed) return
    const { data: u } = await supabase.auth.getUser()
    const amount = Number(parsed.amount)
    const { error: e } = await supabase.from('bank_notifications').insert({
      source: 'manual', sender: sender.trim(), amount: amount > 0 ? amount : null, reference: parsed.reference.trim(), excerpt: text.trim().slice(0, 600), created_by: u.user?.id,
    })
    if (e) { setError(e.code === '23505' ? 'هذا الإشعار (المرجع والمبلغ) مسجل مسبقًا.' : 'تعذّر حفظ الإشعار.'); return }
    setText(''); setSender(''); setParsed(null); load()
  }

  // Matching creates a pending payment (never a confirmed one). The reference unique index prevents double recording.
  const toPayment = async (n: Notice) => {
    if (!n.amount) { setError('لا يوجد مبلغ في هذا الإشعار.'); return }
    const { data: u } = await supabase.auth.getUser()
    const s = splitVat(n.amount, 15, true)
    const { data: pay, error: e } = await supabase.from('payments').insert({
      customer_name: n.sender || 'غير محدد', method: 'bank_transfer', total_amount: s.total, net_amount: s.net, tax_amount: s.tax, vat_included: true, vat_rate: 15,
      reference: n.reference, note: 'من إشعار بنكي، بانتظار التحقق من مصدر مالي موثوق', received_at: n.received_at, created_by: u.user?.id,
    }).select('id').single()
    if (e || !pay) { setError(e?.code === '23505' ? 'يوجد دفعة بنفس المرجع مسبقًا.' : 'تعذّر إنشاء الدفعة.'); return }
    await supabase.from('bank_notifications').update({ status: 'matched', matched_payment_id: pay.id }).eq('id', n.id)
    await writeAudit('notice_to_pending_payment', 'bank_notification', n.id, null, { payment_id: pay.id })
    load()
  }
  const setStatus = async (n: Notice, status: 'rejected' | 'duplicate') => {
    await supabase.from('bank_notifications').update({ status }).eq('id', n.id)
    load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>إشعارات التحويل</h3><span className="mc-st mc-n2">القراءة التلقائية من البريد غير مفعّلة</span></div>
        <div className="mc-delta" style={{ padding: '0 20px 12px', lineHeight: 1.8 }}>
          إشعار البريد ليس إثبات تسوية. الصق نص الإشعار هنا، وسيُستخرج المبلغ والمرجع للمراجعة، ثم يتحول إلى دفعة «بانتظار التحقق» فقط. التأكيد من «المالية» بعد تحقق من مصدر مالي موثوق.
          الربط التلقائي ببريد الإنماء يحتاج بريد الحساب وصلاحية قراءة محددة منك.
        </div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 10 }}>
          <label className="mc-field">نص الإشعار<textarea value={text} onChange={e => { setText(e.target.value); setParsed(null) }} style={{ height: 110 }} /></label>
          <div className="mc-grid2">
            <label className="mc-field">اسم المرسل (إن ظهر)<input value={sender} onChange={e => setSender(e.target.value)} /></label>
            <div style={{ display: 'flex', alignItems: 'end' }}><button className="mc-btn2 p" disabled={!text.trim()} onClick={parse}>استخرج المبلغ والمرجع</button></div>
          </div>
          {parsed && (
            <div className="mc-grid2">
              <label className="mc-field">المبلغ (راجعه)<input type="number" value={parsed.amount} onChange={e => setParsed({ ...parsed, amount: e.target.value })} /></label>
              <label className="mc-field">المرجع (راجعه)<input dir="ltr" value={parsed.reference} onChange={e => setParsed({ ...parsed, reference: e.target.value })} /></label>
              <div style={{ gridColumn: '1 / -1' }}>{!parsed.amount && <div className="mc-delta" style={{ color: 'var(--amber-ink)' }}>لم يُقرأ مبلغ. أدخله يدويًا أو لا تحفظ.</div>}<button className="mc-btn2 p" onClick={save} disabled={!Number(parsed.amount)}>حفظ الإشعار</button></div>
            </div>
          )}
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>السجل</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>الوصول</th><th>المرسل</th><th>المبلغ</th><th>المرجع</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="mc-flat">لا توجد إشعارات. هذه الصفحة لا تعرض رصيد الحساب البنكي الفعلي.</td></tr>}
              {rows.map(n => (
                <tr key={n.id}>
                  <td>{dateShort(n.received_at)} {timeShort(n.received_at)}</td><td>{n.sender || '—'}</td><td><b>{n.amount ? nf(n.amount) : '—'}</b></td><td dir="ltr" style={{ textAlign: 'right' }}>{n.reference || '—'}</td>
                  <td><span className={`mc-st ${ST[n.status]?.cls}`}>{ST[n.status]?.label}</span></td>
                  <td>{n.status === 'awaiting_verification' && <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => toPayment(n)}>حوّل لدفعة بانتظار التحقق</button><button className="mc-btn2" onClick={() => setStatus(n, 'duplicate')}>مكرر</button><button className="mc-btn2" onClick={() => setStatus(n, 'rejected')}>رفض</button></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}
