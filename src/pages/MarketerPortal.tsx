import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dateShort, nf } from '../lib/format'
import '../styles/admin-mc.css'

interface Me { id: string; name: string; status: string; referral_code: string | null }
interface Referral { id: string; company_name: string; status: string; submitted_at: string }
interface Commission { id: string; amount: number; status: string; hold_until: string | null; created_at: string }
interface Statement { id: string; period: string; total: number; status: string; paid_reference: string }

const R_ST: Record<string, string> = { under_review: 'قيد المراجعة', accepted: 'مقبولة', conflict: 'قيد المراجعة', rejected: 'مرفوضة' }
const C_ST: Record<string, string> = { pending_verification: 'قيد التحقق', on_hold: 'معلقة', due: 'مستحقة', approved: 'معتمدة للصرف', paid: 'مدفوعة', cancelled: 'ملغاة', adjusted: 'تسوية' }

// A marketer sees only their own referral status, commissions and payout statements (enforced by row-level security).
export default function MarketerPortal() {
  const [me, setMe] = useState<Me | null>(null)
  const [refs, setRefs] = useState<Referral[]>([])
  const [coms, setComs] = useState<Commission[]>([])
  const [sts, setSts] = useState<Statement[]>([])
  const [form, setForm] = useState({ company_name: '', contact_phone: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [m, r, c, s] = await Promise.all([
      supabase.from('marketers').select('id, name, status, referral_code').maybeSingle(),
      supabase.from('referrals').select('id, company_name, status, submitted_at').order('submitted_at', { ascending: false }),
      supabase.from('commissions').select('id, amount, status, hold_until, created_at').order('created_at', { ascending: false }),
      supabase.from('payout_statements').select('id, period, total, status, paid_reference').order('created_at', { ascending: false }),
    ])
    setMe((m.data ?? null) as Me | null); setRefs((r.data ?? []) as Referral[])
    setComs(((c.data ?? []) as Commission[]).map(x => ({ ...x, amount: Number(x.amount) }))); setSts(((s.data ?? []) as Statement[]).map(x => ({ ...x, total: Number(x.total) })))
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const submit = async () => {
    if (!me || !form.company_name.trim()) return
    const { error: e } = await supabase.from('referrals').insert({ marketer_id: me.id, company_name: form.company_name.trim(), contact_phone: form.contact_phone.trim() })
    if (e) { setError('تعذّر إرسال الإحالة. تأكد أن حسابك مفعّل.'); return }
    setForm({ company_name: '', contact_phone: '' }); setError(null); load()
  }

  const due = coms.filter(c => ['due', 'approved'].includes(c.status)).reduce((s, c) => s + c.amount, 0)
  const paid = coms.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0)

  return (
    <div className="mc-root" dir="rtl" style={{ minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gap: 14 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div><h1 style={{ margin: 0, font: '800 24px var(--head)' }}>بوابة المسوّق</h1><div style={{ color: 'var(--ink-3)', fontSize: 13 }}>{me ? `${me.name} · رمز الإحالة ${me.referral_code ?? '—'}` : ''}</div></div>
          <button className="mc-btn2" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}>تسجيل الخروج</button>
        </header>
        {error && <div className="mc-banner">{error}</div>}
        {loading ? <div className="mc-flat">جاري التحميل…</div> : !me ? (
          <div className="mc-card mc-flat">هذا الحساب غير مربوط بملف مسوّق. تواصل مع إدارة مدار.</div>
        ) : (
          <>
            <div className="mc-kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              <div className="mc-card mc-kpi"><span>مستحق / معتمد للصرف</span><div className="mc-big">{nf(due)} <small>ر.س</small></div></div>
              <div className="mc-card mc-kpi"><span>مدفوع</span><div className="mc-big">{nf(paid)} <small>ر.س</small></div></div>
              <div className="mc-card mc-kpi"><span>الإحالات</span><div className="mc-big">{nf(refs.length)}</div></div>
            </div>
            <article className="mc-card">
              <div className="mc-ph"><h3>إحالة جديدة</h3></div>
              <div style={{ padding: '0 20px 18px', display: 'grid', gap: 10 }}>
                <div className="mc-grid2">
                  <label className="mc-field">اسم الشركة<input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} /></label>
                  <label className="mc-field">جوالها<input dir="ltr" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></label>
                </div>
                <div><button className="mc-btn2 p" disabled={me.status !== 'active' || !form.company_name.trim()} onClick={submit}>إرسال للمراجعة</button>{me.status !== 'active' && <span className="mc-delta" style={{ marginInlineStart: 10 }}>حسابك غير مفعّل بعد.</span>}</div>
              </div>
            </article>
            <article className="mc-card">
              <div className="mc-ph"><h3>إحالاتي</h3></div>
              <table className="mc-tbl"><tbody>
                {refs.length === 0 && <tr><td className="mc-flat">لا توجد إحالات.</td></tr>}
                {refs.map(r => <tr key={r.id}><td><b>{r.company_name}</b></td><td>{dateShort(r.submitted_at)}</td><td>{R_ST[r.status]}</td></tr>)}
              </tbody></table>
            </article>
            <article className="mc-card">
              <div className="mc-ph"><h3>عمولاتي وكشوف الصرف</h3></div>
              <table className="mc-tbl"><tbody>
                {coms.length === 0 && sts.length === 0 && <tr><td className="mc-flat">لا توجد عمولات بعد. تُستحق بعد تحصيل مؤكد وانتهاء فترة التعليق.</td></tr>}
                {coms.map(c => <tr key={c.id}><td><b>{nf(c.amount)} ر.س</b></td><td>{C_ST[c.status]}</td><td>{c.hold_until ? `حتى ${dateShort(c.hold_until)}` : ''}</td></tr>)}
                {sts.map(s => <tr key={s.id}><td>كشف {s.period}</td><td><b>{nf(s.total)} ر.س</b></td><td>{s.status === 'paid' ? `مدفوع (${s.paid_reference})` : s.status === 'approved' ? 'معتمد' : 'مسودة'}</td></tr>)}
              </tbody></table>
            </article>
          </>
        )}
      </div>
    </div>
  )
}
