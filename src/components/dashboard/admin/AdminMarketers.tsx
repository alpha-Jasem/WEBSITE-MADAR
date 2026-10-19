import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { writeAudit } from '../../../lib/deals'
import { dateShort, nf } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

interface Marketer { id: string; auth_user_id: string | null; name: string; phone: string; email: string; status: string; referral_code: string | null; commission_rule: { type?: string; value?: number; hold_days?: number } }
interface Referral { id: string; marketer_id: string; company_name: string; contact_phone: string; status: string; attribution_note: string; submitted_at: string }
interface Commission { id: string; marketer_id: string; amount: number; base_amount: number; status: string; hold_until: string | null; reason: string; created_at: string; adjustment_of: string | null }
interface Statement { id: string; marketer_id: string; period: string; total: number; status: string; paid_reference: string }
type Tab = 'marketers' | 'referrals' | 'commissions' | 'statements'

const M_ST: Record<string, string> = { applied: 'طلب انضمام', approved: 'معتمد', active: 'مفعّل', suspended: 'موقوف' }
const R_ST: Record<string, string> = { under_review: 'قيد المراجعة', accepted: 'مقبولة', conflict: 'تعارض', rejected: 'مرفوضة' }
const C_ST: Record<string, string> = { pending_verification: 'قيد التحقق', on_hold: 'معلقة', due: 'مستحقة', approved: 'معتمدة للصرف', paid: 'مدفوعة', cancelled: 'ملغاة', adjusted: 'تسوية' }
const code = () => 'M' + Math.random().toString(36).slice(2, 7).toUpperCase()

// Marketers program. Values (rate, hold, attribution) stay unset until the owner approves the terms; payouts are recorded, never executed here.
export const AdminMarketers = () => {
  const [tab, setTab] = useState<Tab>('marketers')
  const [ms, setMs] = useState<Marketer[]>([])
  const [refs, setRefs] = useState<Referral[]>([])
  const [coms, setComs] = useState<Commission[]>([])
  const [sts, setSts] = useState<Statement[]>([])
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [ruleFor, setRuleFor] = useState<Marketer | null>(null)
  const [rule, setRule] = useState({ type: 'percent', value: '', hold_days: '14' })
  const [linkEmail, setLinkEmail] = useState('')
  const [linkFor, setLinkFor] = useState<Marketer | null>(null)
  const [payRef, setPayRef] = useState('')
  const [payFor, setPayFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [m, r, c, s] = await Promise.all([
      supabase.from('marketers').select('*').order('created_at', { ascending: false }),
      supabase.from('referrals').select('*').order('submitted_at', { ascending: false }).limit(300),
      supabase.from('commissions').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('payout_statements').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    setError([m, r, c, s].some(x => x.error) ? 'تعذّر تحميل البيانات.' : null)
    setMs((m.data ?? []) as Marketer[]); setRefs((r.data ?? []) as Referral[])
    setComs(((c.data ?? []) as Commission[]).map(x => ({ ...x, amount: Number(x.amount), base_amount: Number(x.base_amount) })))
    setSts(((s.data ?? []) as Statement[]).map(x => ({ ...x, total: Number(x.total) })))
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_marketers', [{ table: 'marketers' }, { table: 'commissions' }, { table: 'referrals' }, { table: 'payout_statements' }], load, true)

  const mk = (id: string) => ms.find(m => m.id === id)?.name ?? '—'

  const create = async () => {
    if (!form.name.trim()) return
    const { error: e } = await supabase.from('marketers').insert({ ...form, name: form.name.trim(), referral_code: code() })
    if (e) { setError('تعذّر إضافة المسوّق.'); return }
    setAdding(false); setForm({ name: '', phone: '', email: '' }); load()
  }
  const setMStatus = async (m: Marketer, status: string) => {
    const { error: e } = await supabase.from('marketers').update({ status }).eq('id', m.id)
    if (e) { setError('تعذّر تغيير الحالة.'); return }
    await writeAudit(`marketer_${status}`, 'marketer', m.id, { status: m.status }, { status }); load()
  }
  const saveRule = async () => {
    if (!ruleFor) return
    const value = Number(rule.value)
    const { error: e } = await supabase.from('marketers').update({ commission_rule: value > 0 ? { type: rule.type, value, hold_days: Number(rule.hold_days) || 14 } : {} }).eq('id', ruleFor.id)
    if (e) { setError('تعذّر حفظ القاعدة.'); return }
    await writeAudit('marketer_rule_set', 'marketer', ruleFor.id, ruleFor.commission_rule, { type: rule.type, value }); setRuleFor(null); load()
  }
  const link = async () => {
    if (!linkFor) return
    const { data, error: e } = await supabase.functions.invoke('marketer-link', { body: { marketer_id: linkFor.id, email: linkEmail.trim() } })
    if (e || !data?.ok) { setError(data?.error === 'account_not_found' ? 'لا يوجد حساب بهذا البريد. يجب أن يسجّل المسوّق حسابه أولًا.' : 'تعذّر ربط الحساب.'); return }
    setLinkFor(null); setLinkEmail(''); load()
  }

  const decide = async (r: Referral, status: 'accepted' | 'rejected') => {
    const { error: e } = await supabase.from('referrals').update({ status, decided_at: new Date().toISOString() }).eq('id', r.id)
    if (e) {
      // the same company already accepted for another marketer: mark the conflict for review instead of double-attributing
      if (e.code === '23505') { await supabase.from('referrals').update({ status: 'conflict', attribution_note: 'نفس الشركة مقبولة لمسوّق آخر' }).eq('id', r.id); setError('تعارض: هذه الشركة مقبولة لمسوّق آخر، وُسمت «تعارض» للمراجعة.') } else setError('تعذّر تحديث الإحالة.')
    } else await writeAudit(`referral_${status}`, 'referral', r.id, { status: r.status }, { status })
    load()
  }

  const setCom = async (c: Commission, status: string) => {
    const { error: e } = await supabase.from('commissions').update({ status }).eq('id', c.id)
    if (e) setError('تعذّر تحديث العمولة.')
    else await writeAudit(`commission_${status}`, 'commission', c.id, { status: c.status }, { status })
    load()
  }

  const makeStatement = async (m: Marketer) => {
    const approved = coms.filter(c => c.marketer_id === m.id && c.status === 'approved')
    const total = approved.reduce((s, c) => s + c.amount, 0)
    if (total <= 0) { setError('لا توجد عمولات «معتمدة للصرف» لهذا المسوّق.'); return }
    const { error: e } = await supabase.from('payout_statements').insert({ marketer_id: m.id, period: new Date().toISOString().slice(0, 7), total })
    if (e) setError('تعذّر إنشاء الكشف.')
    load()
  }
  const stStatus = async (s: Statement, status: 'approved' | 'paid') => {
    const { data: u } = await supabase.auth.getUser()
    const patch: Record<string, unknown> = { status }
    if (status === 'approved') Object.assign(patch, { approved_by: u.user?.id, approved_at: new Date().toISOString() })
    if (status === 'paid') Object.assign(patch, { paid_at: new Date().toISOString(), paid_reference: payRef.trim() })
    const { error: e } = await supabase.from('payout_statements').update(patch).eq('id', s.id)
    if (e) { setError('تعذّر تحديث الكشف.'); return }
    if (status === 'paid') await supabase.from('commissions').update({ status: 'paid' }).eq('marketer_id', s.marketer_id).eq('status', 'approved')
    await writeAudit(`payout_${status}`, 'payout_statement', s.id, null, { total: s.total, reference: payRef.trim() })
    setPayFor(null); setPayRef(''); load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>المسوّقون بالعمولة</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist">{([['marketers', 'المسوّقون'], ['referrals', 'الإحالات'], ['commissions', 'العمولات'], ['statements', 'كشوف الصرف']] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'mc-on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
            {tab === 'marketers' && <button className="mc-btn2 p" onClick={() => setAdding(true)}>مسوّق جديد</button>}
          </div>
        </div>
        <div className="mc-delta" style={{ padding: '0 20px 10px', lineHeight: 1.8 }}>نسب العمولة وفترة التعليق وقاعدة الإسناد غير معتمدة بعد، فلا تُحتسب عمولة لمسوّق بلا قاعدة. الصرف يُسجل هنا بعد أن تنفذه أنت، ولا تحويل بنكي تلقائي.</div>

        {tab === 'marketers' && (
          <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
            <thead><tr><th>المسوّق</th><th>الرمز</th><th>الحالة</th><th>قاعدة العمولة</th><th>حساب البوابة</th><th /></tr></thead>
            <tbody>
              {ms.length === 0 && <tr><td colSpan={6} className="mc-flat">لا يوجد مسوّقون بعد.</td></tr>}
              {ms.map(m => (
                <tr key={m.id}>
                  <td><b>{m.name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{m.phone} {m.email}</div></td><td dir="ltr" style={{ textAlign: 'right' }}>{m.referral_code}</td><td>{M_ST[m.status]}</td>
                  <td>{m.commission_rule?.value ? `${m.commission_rule.type === 'percent' ? m.commission_rule.value + '%' : m.commission_rule.value + ' ر.س'} · تعليق ${m.commission_rule.hold_days ?? 14} يوم` : 'غير معتمدة'}</td>
                  <td>{m.auth_user_id ? 'مربوط' : 'غير مربوط'}</td>
                  <td><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {m.status === 'applied' && <button className="mc-btn2 p" onClick={() => setMStatus(m, 'approved')}>اعتماد</button>}
                    {m.status === 'approved' && <button className="mc-btn2 p" onClick={() => setMStatus(m, 'active')}>تفعيل</button>}
                    {m.status === 'active' && <button className="mc-btn2" onClick={() => setMStatus(m, 'suspended')}>تعليق</button>}
                    {m.status === 'suspended' && <button className="mc-btn2" onClick={() => setMStatus(m, 'active')}>إعادة تفعيل</button>}
                    <button className="mc-btn2" onClick={() => { setRuleFor(m); setRule({ type: m.commission_rule?.type ?? 'percent', value: m.commission_rule?.value ? String(m.commission_rule.value) : '', hold_days: String(m.commission_rule?.hold_days ?? 14) }) }}>قاعدة العمولة</button>
                    {!m.auth_user_id && <button className="mc-btn2" onClick={() => setLinkFor(m)}>ربط حساب</button>}
                    <button className="mc-btn2" onClick={() => makeStatement(m)}>كشف صرف</button>
                  </span></td>
                </tr>
              ))}
            </tbody></table></div>
        )}

        {tab === 'referrals' && (
          <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
            <thead><tr><th>الشركة</th><th>المسوّق</th><th>الجوال</th><th>التاريخ</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {refs.length === 0 && <tr><td colSpan={6} className="mc-flat">لا توجد إحالات.</td></tr>}
              {refs.map(r => (
                <tr key={r.id}><td><b>{r.company_name}</b>{r.attribution_note && <div style={{ color: 'var(--amber-ink)', fontSize: 12 }}>{r.attribution_note}</div>}</td><td>{mk(r.marketer_id)}</td><td dir="ltr" style={{ textAlign: 'right' }}>{r.contact_phone || '—'}</td><td>{dateShort(r.submitted_at)}</td><td>{R_ST[r.status]}</td>
                  <td>{(r.status === 'under_review' || r.status === 'conflict') && <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => decide(r, 'accepted')}>قبول</button><button className="mc-btn2" onClick={() => decide(r, 'rejected')}>رفض</button></span>}</td></tr>
              ))}
            </tbody></table></div>
        )}

        {tab === 'commissions' && (
          <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
            <thead><tr><th>المسوّق</th><th>الأساس (صافي)</th><th>العمولة</th><th>الحالة</th><th>تنتهي الفترة</th><th>ملاحظة</th><th /></tr></thead>
            <tbody>
              {coms.length === 0 && <tr><td colSpan={7} className="mc-flat">لا توجد عمولات. تنشأ عند تأكيد دفعة صفقة مُحالة بقاعدة معتمدة، ولا تُستحق قبل التحصيل المؤكد.</td></tr>}
              {coms.map(c => (
                <tr key={c.id}><td>{mk(c.marketer_id)}</td><td>{nf(c.base_amount)}</td><td><b>{nf(c.amount)}</b></td><td>{C_ST[c.status]}</td><td>{c.hold_until ? dateShort(c.hold_until) : '—'}</td><td>{c.reason || '—'}</td>
                  <td><span style={{ display: 'flex', gap: 6 }}>
                    {c.status === 'on_hold' && c.hold_until && new Date(c.hold_until) <= new Date() && <button className="mc-btn2" onClick={() => setCom(c, 'due')}>استحقت</button>}
                    {c.status === 'due' && <button className="mc-btn2 p" onClick={() => setCom(c, 'approved')}>اعتماد للصرف</button>}
                    {['pending_verification', 'on_hold', 'due'].includes(c.status) && <button className="mc-btn2" onClick={() => setCom(c, 'cancelled')}>إلغاء</button>}
                  </span></td></tr>
              ))}
            </tbody></table></div>
        )}

        {tab === 'statements' && (
          <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
            <thead><tr><th>المسوّق</th><th>الفترة</th><th>الإجمالي</th><th>الحالة</th><th>مرجع الدفع</th><th /></tr></thead>
            <tbody>
              {sts.length === 0 && <tr><td colSpan={6} className="mc-flat">لا توجد كشوف. أنشئ كشفًا من تبويب المسوّقين بعد اعتماد عمولات للصرف.</td></tr>}
              {sts.map(s => (
                <tr key={s.id}><td>{mk(s.marketer_id)}</td><td>{s.period}</td><td><b>{nf(s.total)}</b></td><td>{s.status === 'draft' ? 'مسودة' : s.status === 'approved' ? 'معتمد' : 'مدفوع'}</td><td dir="ltr" style={{ textAlign: 'right' }}>{s.paid_reference || '—'}</td>
                  <td>{s.status === 'draft' && <button className="mc-btn2 p" onClick={() => stStatus(s, 'approved')}>اعتماد الكشف</button>}
                    {s.status === 'approved' && (payFor === s.id ? <span style={{ display: 'flex', gap: 6 }}><input aria-label="مرجع الدفع" dir="ltr" placeholder="مرجع التحويل" value={payRef} onChange={e => setPayRef(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 10px', width: 140 }} /><button className="mc-btn2 p" disabled={!payRef.trim()} onClick={() => stStatus(s, 'paid')}>سجّلت الدفع</button></span> : <button className="mc-btn2 p" onClick={() => setPayFor(s.id)}>سجّل الدفع بعد تنفيذه</button>)}</td></tr>
              ))}
            </tbody></table></div>
        )}
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>مسوّق جديد</h3>
            <label className="mc-field">الاسم<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <div className="mc-grid2"><label className="mc-field">الجوال<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label className="mc-field">البريد<input dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label></div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button><button className="mc-btn2 p" disabled={!form.name.trim()} onClick={create}>إضافة</button></div>
          </div>
        </div>
      )}
      {ruleFor && (
        <div className="mc-modal-bg" onClick={() => setRuleFor(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>قاعدة عمولة {ruleFor.name}</h3>
            <div className="mc-delta">تُحسب على صافي المبلغ المحصّل المؤكد قبل الضريبة. اتركها فارغة لعدم احتساب عمولة.</div>
            <div className="mc-grid2">
              <label className="mc-field">النوع<select value={rule.type} onChange={e => setRule({ ...rule, type: e.target.value })}><option value="percent">نسبة %</option><option value="fixed">مبلغ ثابت</option></select></label>
              <label className="mc-field">القيمة<input type="number" min={0} value={rule.value} onChange={e => setRule({ ...rule, value: e.target.value })} /></label>
            </div>
            <label className="mc-field">فترة التعليق قبل الاستحقاق (أيام)<input type="number" min={0} value={rule.hold_days} onChange={e => setRule({ ...rule, hold_days: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="mc-btn2" onClick={() => setRuleFor(null)}>إلغاء</button><button className="mc-btn2 p" onClick={saveRule}>حفظ</button></div>
          </div>
        </div>
      )}
      {linkFor && (
        <div className="mc-modal-bg" onClick={() => setLinkFor(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>ربط حساب بوابة لـ{linkFor.name}</h3>
            <div className="mc-delta">يجب أن يكون للمسوّق حساب مسجّل مسبقًا. الربط يمنحه دور مسوّق فقط، بلا وصول لمحادثات أو عملاء غيره.</div>
            <label className="mc-field">بريد حسابه<input dir="ltr" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} /></label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="mc-btn2" onClick={() => setLinkFor(null)}>إلغاء</button><button className="mc-btn2 p" disabled={!linkEmail.includes('@')} onClick={link}>ربط</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
