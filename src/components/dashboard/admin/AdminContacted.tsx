import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { syncDealForLead, recordContact, loadDoNotContact } from '../../../lib/deals'
import { dateShort, timeShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

type Status = 'contacted' | 'no_answer' | 'replied' | 'meeting'
interface Lead {
  id: string; name: string; phone: string; is_mobile: boolean; category: string; city: string; rating: number | null
  status: Status; last_contacted_at: string | null; contact_count: number; next_follow_up: string | null; meeting_at: string | null
  notes: string; source_url: string; address: string; contact_name: string; campaign: string; source: string
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  contacted: { label: 'تم التواصل', cls: 'mc-b' }, no_answer: { label: 'لا يرد', cls: 'mc-a' }, replied: { label: 'رد علينا', cls: 'mc-g' }, meeting: { label: 'اجتماع', cls: 'mc-b' },
}
const DAY = 86400000
const mapsUrl = (l: Lead) => /google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(l.source_url || '')
  ? l.source_url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.name, l.address, l.city].filter(Boolean).join(' '))}`
const ago = (iso: string | null) => {
  if (!iso) return '—'
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  return h < 1 ? 'قبل دقائق' : h < 24 ? `قبل ${Math.round(h)} ساعة` : `قبل ${Math.round(h / 24)} يوم`
}

// Everyone the owner has already reached: one table, overdue follow-ups first, with the quick actions needed to continue.
export const AdminContacted = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Lead[]>([])
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | Status | 'late'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(60)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('outreach_leads')
      .select('id, name, phone, is_mobile, category, city, rating, status, last_contacted_at, contact_count, next_follow_up, meeting_at, notes, source_url, address, contact_name, campaign, source')
      .in('status', ['contacted', 'no_answer', 'replied', 'meeting']).limit(3000)
    setError(e ? 'تعذّر تحميل القائمة.' : null)
    setRows((data ?? []) as Lead[]); setLoading(false)
  }, [])
  useEffect(() => { load(); loadDoNotContact().then(setBlocked).catch(() => undefined) }, [load])
  useRealtimeRefetch('admin_contacted', [{ table: 'outreach_leads' }], load, true)

  const isLate = (l: Lead) => !!l.next_follow_up && new Date(l.next_follow_up).getTime() < Date.now() && l.status !== 'meeting'
  const counts = useMemo(() => ({
    all: rows.length, late: rows.filter(isLate).length,
    contacted: rows.filter(r => r.status === 'contacted').length, no_answer: rows.filter(r => r.status === 'no_answer').length,
    replied: rows.filter(r => r.status === 'replied').length, meeting: rows.filter(r => r.status === 'meeting').length,
  }), [rows])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(l => (filter === 'all' ? true : filter === 'late' ? isLate(l) : l.status === filter))
      .filter(l => !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || (l.category || '').toLowerCase().includes(q))
      .sort((a, b) => {
        // overdue follow-ups first, then the nearest upcoming one, then the most recently contacted
        const fa = a.next_follow_up ? new Date(a.next_follow_up).getTime() : Infinity
        const fb = b.next_follow_up ? new Date(b.next_follow_up).getTime() : Infinity
        if (fa !== fb) return fa - fb
        return new Date(b.last_contacted_at ?? 0).getTime() - new Date(a.last_contacted_at ?? 0).getTime()
      })
  }, [rows, filter, search])

  const patch = async (l: Lead, p: Partial<Lead>) => {
    setRows(rs => rs.map(r => (r.id === l.id ? { ...r, ...p } : r)))
    const { error: e } = await supabase.from('outreach_leads').update({ ...p, updated_at: new Date().toISOString() }).eq('id', l.id)
    if (e) { setError('تعذّر حفظ التغيير.'); load(); return false }
    return true
  }
  const setStatus = async (l: Lead, status: Status) => {
    const ok = await patch(l, { status, ...(status === 'meeting' ? { next_follow_up: null } : {}) })
    if (ok) await syncDealForLead({ id: l.id, name: l.name, phone: l.phone, contact_name: l.contact_name, campaign: l.campaign, source: l.source }, status)
  }
  const setFollow = (l: Lead, days: number | null) => {
    if (days === null) { patch(l, { next_follow_up: null }); return }
    const d = new Date(); d.setHours(10, 0, 0, 0)
    patch(l, { next_follow_up: new Date(d.getTime() + days * DAY).toISOString() })
  }
  // every new attempt counts and pushes the next reminder two days out
  const contacted = (l: Lead, channel: 'call' | 'whatsapp') => {
    recordContact({ id: l.id, name: l.name, phone: l.phone }, channel)
    const d = new Date(); d.setHours(10, 0, 0, 0)
    patch(l, { last_contacted_at: new Date().toISOString(), contact_count: (l.contact_count || 0) + 1, next_follow_up: new Date(d.getTime() + 2 * DAY).toISOString() })
  }
  const whatsapp = (l: Lead) => {
    const text = `مرحباً مرة ثانية 👋 أتابع معك بخصوص ${l.name}. وش رأيك نرتب مكالمة قصيرة نوريك فيها كيف يشتغل الوكيل؟`
    window.open(`https://wa.me/${l.phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    contacted(l, 'whatsapp')
  }
  const saveNote = (l: Lead, text: string) => { if (text !== l.notes) patch(l, { notes: text }) }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card">
        <div className="mc-ph"><h3>تم التواصل ({counts.all})</h3><span className="mc-delta">المتأخرة أولًا، ثم الأقرب موعدًا</span></div>
        <div style={{ padding: '0 20px 10px', display: 'grid', gap: 10 }}>
          <div className="mc-chips">
            {([['all', 'الكل', counts.all], ['late', 'متابعة متأخرة', counts.late], ['contacted', 'تم التواصل', counts.contacted], ['no_answer', 'لا يرد', counts.no_answer], ['replied', 'رد علينا', counts.replied], ['meeting', 'اجتماع', counts.meeting]] as [typeof filter, string, number][]).map(([k, label, n]) => (
              <button key={k} className={`mc-chipbtn ${filter === k ? 'mc-on' : ''}`} onClick={() => { setFilter(k); setLimit(60) }}>{label} {n}</button>
            ))}
          </div>
          <div className="mc-field"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم أو النشاط" aria-label="بحث" /></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>العميل</th><th>إجراءات</th><th>الحالة</th><th>آخر تواصل</th><th>مرات</th><th>المتابعة القادمة</th><th>ملاحظة</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="mc-flat">جاري التحميل…</td></tr>}
              {!loading && shown.length === 0 && <tr><td colSpan={7} className="mc-flat">لا يوجد عملاء في هذا التصنيف.</td></tr>}
              {shown.slice(0, limit).map(l => {
                const late = isLate(l)
                const block = blocked.has(l.phone)
                return (
                  <tr key={l.id}>
                    <td><b>{l.name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{l.category}{l.city ? ` · ${l.city}` : ''}</div><div dir="ltr" style={{ textAlign: 'right', fontSize: 12.5 }}>+{l.phone}</div></td>
                    <td>
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 112 }}>
                        {block ? <span className="mc-st mc-n2">ممنوع التواصل</span> : <>
                          <a className="mc-btn2 p" href={`tel:+${l.phone}`} onClick={() => contacted(l, 'call')}>📞 اتصال</a>
                          <button className="mc-btn2" disabled={!l.is_mobile} onClick={() => whatsapp(l)}>واتساب</button>
                        </>}
                        <a className="mc-btn2" href={mapsUrl(l)} target="_blank" rel="noreferrer">📍</a>
                        <button className="mc-btn2" onClick={() => navigate(`/admin/outreach?q=${encodeURIComponent(l.name)}`)}>اجتماع / تفاصيل</button>
                      </span>
                    </td>
                    <td>
                      <select value={l.status} onChange={e => setStatus(l, e.target.value as Status)} aria-label="الحالة" style={{ minHeight: 34 }}>
                        {(Object.keys(STATUS) as Status[]).map(k => <option key={k} value={k}>{STATUS[k].label}</option>)}
                      </select>
                    </td>
                    <td>{l.last_contacted_at ? <>{ago(l.last_contacted_at)}<div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{dateShort(l.last_contacted_at)} {timeShort(l.last_contacted_at)}</div></> : '—'}</td>
                    <td>{l.contact_count || 0}</td>
                    <td>
                      {l.status === 'meeting' && l.meeting_at ? <span className="mc-st mc-b">اجتماع {dateShort(l.meeting_at)} {timeShort(l.meeting_at)}</span>
                        : l.next_follow_up ? <span className={`mc-st ${late ? 'mc-a' : 'mc-n2'}`}>{late ? 'متأخرة · ' : ''}{dateShort(l.next_follow_up)}</span> : <span className="mc-delta">بلا موعد</span>}
                      <select aria-label="تحديد المتابعة" value="" onChange={e => { const v = e.target.value; if (v) setFollow(l, v === 'none' ? null : Number(v)) }} style={{ minHeight: 32, marginTop: 6, width: '100%' }}>
                        <option value="">تحديد المتابعة…</option>
                        <option value="1">غدًا</option><option value="3">بعد ٣ أيام</option><option value="7">بعد أسبوع</option>
                        {l.next_follow_up && <option value="none">إلغاء الموعد</option>}
                      </select>
                    </td>
                    <td><textarea defaultValue={l.notes} rows={2} placeholder="ملاحظة" aria-label="ملاحظة" onBlur={e => saveNote(l, e.target.value)} style={{ minWidth: 120, width: '100%' }} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {shown.length > limit && <div style={{ padding: 14, textAlign: 'center' }}><button className="mc-btn2" onClick={() => setLimit(n => n + 60)}>عرض المزيد ({shown.length - limit})</button></div>}
      </article>
    </div>
  )
}
