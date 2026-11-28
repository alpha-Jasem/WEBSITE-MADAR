import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeRefetch } from '../../../lib/realtime'

type Status = 'open' | 'answered' | 'closed'
interface Row {
  id: string; company_id: string; email: string | null; kind: string; subject: string; details: string; reference: string | null
  status: Status; admin_reply: string | null; replied_at: string | null; created_at: string; companies: { name: string } | null
}

const STATUS: Record<Status | 'all', string> = { all: 'الكل', open: 'مفتوح', answered: 'تم الرد', closed: 'مغلق' }
const BADGE: Record<Status, string> = { open: 'amber', answered: 'green', closed: 'gray' }
const KIND: Record<string, string> = { unsure: 'غير متأكد', agents: 'الوكلاء والمكالمات', whatsapp: 'واتساب والمحادثة', developers: 'المطورون', billing: 'الفوترة والباقة', other: 'أخرى' }

export const AdminSupport = () => {
  const [rows, setRows] = useState<Row[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const { data, error: err } = await supabase.from('support_requests')
      .select('id, company_id, email, kind, subject, details, reference, status, admin_reply, replied_at, created_at, companies(name)')
      .order('created_at', { ascending: false }).limit(200)
    setError(err ? 'تعذّر تحميل الطلبات: ' + err.message : null)
    setRows(err ? [] : ((data ?? []) as unknown as Row[]))
  }
  useEffect(() => { void load() }, [])
  useRealtimeRefetch('admin_support', [{ table: 'support_requests' }], () => void load(), true)

  const shown = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter])
  const count = (s: Status) => rows.filter((r) => r.status === s).length

  async function save(r: Row, patch: Partial<Pick<Row, 'status' | 'admin_reply' | 'replied_at'>>) {
    setBusy(true)
    const { error: err } = await supabase.from('support_requests').update(patch).eq('id', r.id)
    setBusy(false)
    if (err) { setError('تعذّر الحفظ: ' + err.message); return }
    setError(null); await load()
  }
  async function send(r: Row) {
    const text = reply.trim()
    if (!text) return
    await save(r, { admin_reply: text, replied_at: new Date().toISOString(), status: 'answered' })
  }

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div><div className="sec-title">طلبات الدعم</div><div className="sec-sub">طلبات العملاء من «مركز المساعدة» في لوحتهم، والرد عليها</div></div>
      </div>
      {error && <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'rgba(240,80,60,.4)' }}>{error}</div>}
      <div className="row gap-3" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {(['open', 'answered', 'closed', 'all'] as const).map((s) => (
          <button key={s} className={`pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{STATUS[s]} <span className="cnt">{s === 'all' ? rows.length : count(s)}</span></button>
        ))}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {shown.length === 0 && <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink-3)' }}>{rows.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد طلبات في هذه الحالة'}</div>}
        {shown.map((r) => (
          <div key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
            <button type="button" onClick={() => { setOpenId(openId === r.id ? null : r.id); setReply(r.admin_reply ?? '') }}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', width: 'calc(100% - 32px)' }} aria-expanded={openId === r.id}>
              <span className={`badge ${BADGE[r.status]}`}>{STATUS[r.status]}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 14 }}>{r.subject}</b>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.companies?.name ?? 'شركة'} · {KIND[r.kind] ?? r.kind} · {new Date(r.created_at).toLocaleString('ar-SA')}</span>
              </span>
            </button>
            {openId === r.id && (
              <div style={{ padding: '0 16px 16px', display: 'grid', gap: 12 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{r.details}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.email ? `البريد: ${r.email}` : ''}{r.reference ? ` · المرجع: ${r.reference}` : ''}</div>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="اكتب ردك للعميل…" maxLength={4000}
                  style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', font: 'inherit', fontSize: 13 }} />
                <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
                  <button className="btn" disabled={busy || !reply.trim()} onClick={() => void send(r)}>{r.admin_reply ? 'تحديث الرد' : 'إرسال الرد'}</button>
                  {r.status !== 'closed'
                    ? <button className="btn btn-ghost" disabled={busy} onClick={() => void save(r, { status: 'closed' })}>إغلاق الطلب</button>
                    : <button className="btn btn-ghost" disabled={busy} onClick={() => void save(r, { status: r.admin_reply ? 'answered' : 'open' })}>إعادة فتح</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
