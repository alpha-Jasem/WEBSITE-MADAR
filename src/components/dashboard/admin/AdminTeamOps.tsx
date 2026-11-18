import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateLong, dateShort, nf, timeShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

// Team tools from Faisal's developer console, rebuilt on real data: meetings, weekly availability,
// team chat and the team list. Everything is admins-only (RLS on every table).

type Tab = 'meetings' | 'availability' | 'chat' | 'team'
interface Member { id: string; email: string; full_name: string | null }
interface Meeting {
  id: string; company_name: string | null; contact_name: string; phone: string | null; email: string | null; service: string | null
  starts_at: string; duration_min: number; host_id: string | null; status: 'upcoming' | 'done' | 'cancelled'; source: 'manual' | 'site' | 'whatsapp' | 'outreach'; notes: string | null
}
interface Day { on: boolean; from: string; to: string }
interface Avail { days: Day[]; duration_min: number; email_alerts: boolean }
interface Msg { id: string; from_id: string; to_id: string | null; body: string; read_at: string | null; created_at: string }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SOURCE: Record<Meeting['source'], string> = { manual: 'يدوي', site: 'الموقع', whatsapp: 'واتساب', outreach: 'Outreach' }
const DEFAULT_AVAIL: Avail = {
  days: DAYS.map((_, i) => ({ on: i < 5, from: '10:00', to: '17:00' })), duration_min: 30, email_alerts: true,
}
const nameOf = (m: Member | undefined) => m?.full_name?.trim() || m?.email?.split('@')[0] || 'عضو'
/** "2026-11-20T14:30" typed in Riyadh time -> UTC ISO. */
const fromLocalInput = (v: string) => new Date(`${v}:00+03:00`).toISOString()

export const AdminTeamOps = ({ initialTab = 'meetings' }: { initialTab?: Tab }) => {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [me, setMe] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [avail, setAvail] = useState<Avail>(DEFAULT_AVAIL)
  const [allAvail, setAllAvail] = useState<Record<string, Avail>>({})
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [mtTab, setMtTab] = useState<'upcoming' | 'done'>('upcoming')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_name: '', phone: '', service: '', starts: '', host_id: '' })
  const [to, setTo] = useState<string>('all')
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser()
    setMe(u.user?.id ?? null)
    const [mem, mt, av, ms, leads] = await Promise.all([
      supabase.from('users').select('id, email, full_name').eq('role', 'admin'),
      supabase.from('meetings').select('*').order('starts_at', { ascending: false }).limit(300),
      supabase.from('staff_availability').select('*'),
      supabase.from('team_messages').select('*').order('created_at', { ascending: true }).limit(500),
      supabase.from('outreach_leads').select('id, name, phone, meeting_at, status').not('meeting_at', 'is', null).limit(300),
    ])
    if (mt.error || ms.error) { setError('تعذّر تحميل البيانات. غالبًا تحديث قاعدة البيانات لم يُطبَّق بعد.'); return }
    setError(null)
    setMembers((mem.data ?? []) as Member[])
    const fromLeads: Meeting[] = ((leads.data ?? []) as { id: string; name: string; phone: string; meeting_at: string; status: string }[]).map(l => ({
      id: `lead-${l.id}`, company_name: null, contact_name: l.name, phone: l.phone, email: null, service: null, starts_at: l.meeting_at,
      duration_min: 30, host_id: null, status: l.status === 'meeting' ? 'upcoming' : 'done', source: 'outreach', notes: null,
    }))
    setMeetings([...((mt.data ?? []) as Meeting[]), ...fromLeads])
    const map: Record<string, Avail> = {}
    ;(av.data ?? []).forEach((r: { user_id: string; days: Day[]; duration_min: number; email_alerts: boolean }) => { map[r.user_id] = { days: r.days, duration_min: r.duration_min, email_alerts: r.email_alerts } })
    setAllAvail(map)
    if (u.user?.id && map[u.user.id]) setAvail(map[u.user.id])
    setMsgs((ms.data ?? []) as Msg[])
  }, [])
  useEffect(() => { void load() }, [load])
  useRealtimeRefetch('admin_team_ops', [{ table: 'meetings' }, { table: 'team_messages' }, { table: 'staff_availability' }], load, true)
  useEffect(() => { if (tab === 'chat') endRef.current?.scrollIntoView({ block: 'end' }) }, [tab, msgs.length, to])

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const unread = msgs.filter(m => m.to_id === me && !m.read_at).length
  const flash = (t: string) => { setNote(t); window.setTimeout(() => setNote(null), 3000) }

  // ─── meetings ───
  const shown = meetings.filter(m => (mtTab === 'upcoming') === (m.status === 'upcoming'))
    .sort((a, b) => (mtTab === 'upcoming' ? Date.parse(a.starts_at) - Date.parse(b.starts_at) : Date.parse(b.starts_at) - Date.parse(a.starts_at)))
  async function addMeeting() {
    if (!form.contact_name.trim() || !form.starts) { setError('اكتب اسم العميل والموعد.'); return }
    const { error: e } = await supabase.from('meetings').insert({
      company_name: form.company_name.trim() || null, contact_name: form.contact_name.trim(), phone: form.phone.trim() || null,
      service: form.service.trim() || null, starts_at: fromLocalInput(form.starts), host_id: form.host_id || me, source: 'manual',
    })
    if (e) { setError('تعذّر حفظ الاجتماع.'); return }
    setAdding(false); setForm({ company_name: '', contact_name: '', phone: '', service: '', starts: '', host_id: '' }); setError(null); void load()
  }
  async function setStatus(m: Meeting, status: 'done' | 'cancelled') {
    if (m.source === 'outreach') return
    const { error: e } = await supabase.from('meetings').update({ status }).eq('id', m.id)
    if (e) setError('تعذّر تحديث الاجتماع.'); else void load()
  }

  // ─── availability ───
  const setDay = (i: number, patch: Partial<Day>) => setAvail(a => ({ ...a, days: a.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) }))
  async function saveAvail() {
    if (!me) return
    const { error: e } = await supabase.from('staff_availability').upsert({ user_id: me, days: avail.days, duration_min: avail.duration_min, email_alerts: avail.email_alerts, updated_at: new Date().toISOString() })
    if (e) setError('تعذّر حفظ الأوقات.'); else { setError(null); flash('انحفظت أوقاتك') }
  }

  // ─── chat ───
  const thread = useMemo(() => msgs.filter(m => (to === 'all' ? m.to_id === null : (m.from_id === me && m.to_id === to) || (m.from_id === to && m.to_id === me))), [msgs, to, me])
  useEffect(() => {
    const ids = thread.filter(m => m.to_id === me && !m.read_at).map(m => m.id)
    if (tab !== 'chat' || !ids.length) return
    void supabase.from('team_messages').update({ read_at: new Date().toISOString() }).in('id', ids)
  }, [thread, tab, me])
  async function send() {
    const body = text.trim()
    if (!body || !me) return
    const { error: e } = await supabase.from('team_messages').insert({ from_id: me, to_id: to === 'all' ? null : to, body })
    if (e) { setError('تعذّر إرسال الرسالة.'); return }
    setText(''); setError(null); void load()
  }
  const unreadFrom = (id: string) => msgs.filter(m => m.from_id === id && m.to_id === me && !m.read_at).length

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      {note && <div className="mc-banner" style={{ background: 'rgba(52,211,153,.14)', color: 'var(--green)' }}>{note}</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>الفريق</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist">
              {([['meetings', 'الاجتماعات'], ['availability', 'أوقات التوفر'], ['chat', unread ? `محادثة الفريق (${nf(unread)})` : 'محادثة الفريق'], ['team', 'أعضاء الفريق']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'mc-on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            {tab === 'meetings' && <button className="mc-btn2 p" onClick={() => setAdding(true)}>اجتماع جديد</button>}
            {tab === 'availability' && <button className="mc-btn2 p" onClick={saveAvail}>حفظ</button>}
          </div>
        </div>

        {tab === 'meetings' && (
          <div style={{ padding: '0 20px 20px' }}>
            <div className="mc-tabs" style={{ marginBottom: 12 }}>
              {([['upcoming', 'القادمة'], ['done', 'السابقة']] as const).map(([k, l]) => <button key={k} className={mtTab === k ? 'mc-on' : ''} onClick={() => setMtTab(k)}>{l}</button>)}
            </div>
            <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
              <thead><tr><th>العميل</th><th>الموعد</th><th>المضيف</th><th>المصدر</th><th>الحالة</th><th /></tr></thead>
              <tbody>
                {shown.length === 0 && <tr><td colSpan={6} className="mc-flat">{mtTab === 'upcoming' ? 'ما فيه اجتماعات قادمة.' : 'ما فيه اجتماعات سابقة.'}</td></tr>}
                {shown.map(m => (
                  <tr key={m.id}>
                    <td><b>{m.company_name || m.contact_name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{m.company_name ? m.contact_name : ''} {m.service ? `· ${m.service}` : ''} <span dir="ltr">{m.phone || ''}</span></div></td>
                    <td>{dateLong(m.starts_at)}<div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{timeShort(m.starts_at)} · {nf(m.duration_min)} د</div></td>
                    <td>{m.host_id ? nameOf(byId.get(m.host_id)) : '—'}</td>
                    <td>{SOURCE[m.source]}</td>
                    <td>{m.status === 'upcoming' ? 'قادم' : m.status === 'done' ? 'تم' : 'ملغي'}</td>
                    <td>{m.status === 'upcoming' && m.source !== 'outreach' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="mc-btn2 p" onClick={() => setStatus(m, 'done')}>تم</button>
                        <button className="mc-btn2" onClick={() => setStatus(m, 'cancelled')}>إلغاء</button>
                      </span>
                    )}</td>
                  </tr>
                ))}
              </tbody></table></div>
            <div className="mc-delta" style={{ marginTop: 10 }}>اجتماعات Outreach تظهر هنا للقراءة. تعديلها يتم من صفحة العميل في Outreach.</div>
          </div>
        )}

        {tab === 'availability' && (
          <div style={{ padding: '0 20px 20px', display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}>
            <div>
              <b style={{ display: 'block', marginBottom: 8 }}>جدولي الأسبوعي</b>
              {DAYS.map((d, i) => (
                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 110, cursor: 'pointer' }}>
                    <input type="checkbox" checked={avail.days[i].on} onChange={e => setDay(i, { on: e.target.checked })} /> {d}
                  </label>
                  {avail.days[i].on ? (
                    <>
                      <input type="time" value={avail.days[i].from} onChange={e => setDay(i, { from: e.target.value })} className="mc-inp" dir="ltr" aria-label={`${d} من`} />
                      <span style={{ color: 'var(--ink-3)' }}>إلى</span>
                      <input type="time" value={avail.days[i].to} onChange={e => setDay(i, { to: e.target.value })} className="mc-inp" dir="ltr" aria-label={`${d} إلى`} />
                    </>
                  ) : <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>غير متاح</span>}
                </div>
              ))}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14, maxWidth: 220 }}>مدة الاجتماع
                <select className="mc-inp" value={avail.duration_min} onChange={e => setAvail(a => ({ ...a, duration_min: Number(e.target.value) }))}>
                  {[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} دقيقة</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={avail.email_alerts} onChange={e => setAvail(a => ({ ...a, email_alerts: e.target.checked }))} /> أبغى إشعار على البريد عند حجز اجتماع
              </label>
            </div>
            <div>
              <b style={{ display: 'block', marginBottom: 8 }}>الأوقات المتاحة للعملاء الآن</b>
              {DAYS.map((d, i) => {
                const rows = members.filter(m => allAvail[m.id]?.days?.[i]?.on)
                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                    <span style={{ width: 90 }}>{d}</span>
                    {rows.length === 0 ? <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>لا أحد</span> : rows.map(m => (
                      <span key={m.id} className="mc-chip">{nameOf(m).split(' ')[0]} <span dir="ltr">{allAvail[m.id].days[i].from}–{allAvail[m.id].days[i].to}</span></span>
                    ))}
                  </div>
                )
              })}
              <div className="mc-delta" style={{ marginTop: 10 }}>العميل لا يحجز من الموقع من هنا للحين. الأوقات تُحفظ لتوزيع الاجتماعات بين الفريق عند تفعيل الحجز من الموقع.</div>
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'minmax(160px,220px) minmax(0,1fr)', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className={`mc-chipbtn${to === 'all' ? ' mc-on' : ''}`} onClick={() => setTo('all')}>كل الفريق</button>
              {members.filter(m => m.id !== me).map(m => (
                <button key={m.id} className={`mc-chipbtn${to === m.id ? ' mc-on' : ''}`} onClick={() => setTo(m.id)}>
                  {nameOf(m)}{unreadFrom(m.id) ? ` (${nf(unreadFrom(m.id))})` : ''}
                </button>
              ))}
              {members.filter(m => m.id !== me).length === 0 && <div className="mc-delta">ما فيه أعضاء ثانيين لسه. أضف عضوًا للفريق عشان تبدأ المحادثة الخاصة.</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div style={{ minHeight: 280, maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }} aria-live="polite">
                {thread.length === 0 && <div className="mc-flat">ابدأ المحادثة.</div>}
                {thread.map(m => {
                  const mineMsg = m.from_id === me
                  return (
                    <div key={m.id} style={{ alignSelf: mineMsg ? 'flex-start' : 'flex-end', maxWidth: '82%', background: mineMsg ? 'var(--brand-grad)' : 'var(--fill)', border: mineMsg ? 0 : '1px solid var(--line)', borderRadius: 14, padding: '8px 12px' }}>
                      {!mineMsg && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 2 }}>{nameOf(byId.get(m.from_id))}</div>}
                      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</div>
                      <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>{dateShort(m.created_at)} · {timeShort(m.created_at)}</div>
                    </div>
                  )
                })}
                <div ref={endRef} />
              </div>
              <form onSubmit={e => { e.preventDefault(); void send() }} style={{ display: 'flex', gap: 8 }}>
                <input className="mc-inp" style={{ flex: 1 }} value={text} onChange={e => setText(e.target.value)} placeholder={to === 'all' ? 'اكتب لكل الفريق' : `اكتب لـ ${nameOf(byId.get(to))}`} aria-label="رسالة" autoComplete="off" maxLength={4000} />
                <button className="mc-btn2 p" disabled={!text.trim()}>إرسال</button>
              </form>
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ overflowX: 'auto' }}><table className="mc-tbl">
              <thead><tr><th>العضو</th><th>البريد</th><th>اجتماعات قادمة</th><th>اجتماعات تمت</th></tr></thead>
              <tbody>
                {members.length === 0 && <tr><td colSpan={4} className="mc-flat">ما فيه أعضاء.</td></tr>}
                {members.map(m => (
                  <tr key={m.id}>
                    <td><b>{nameOf(m)}</b>{m.id === me ? ' (أنت)' : ''}</td>
                    <td dir="ltr" style={{ textAlign: 'right' }}>{m.email}</td>
                    <td>{nf(meetings.filter(x => x.host_id === m.id && x.status === 'upcoming').length)}</td>
                    <td>{nf(meetings.filter(x => x.host_id === m.id && x.status === 'done').length)}</td>
                  </tr>
                ))}
              </tbody></table></div>
            <div className="mc-delta" style={{ marginTop: 10 }}>إضافة عضو جديد للفريق تحتاج إنشاء حساب له، وما تتم من هنا للحين.</div>
          </div>
        )}
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" role="dialog" aria-modal="true" aria-label="اجتماع جديد" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: 0 }}>اجتماع جديد</h3>
            <input className="mc-inp" placeholder="اسم العميل" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            <input className="mc-inp" placeholder="الشركة (اختياري)" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} />
            <input className="mc-inp" dir="ltr" placeholder="الجوال" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="mc-inp" placeholder="الخدمة" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} />
            <label style={{ display: 'grid', gap: 4 }}>الموعد (بتوقيت الرياض)<input className="mc-inp" type="datetime-local" dir="ltr" value={form.starts} onChange={e => setForm({ ...form, starts: e.target.value })} /></label>
            <label style={{ display: 'grid', gap: 4 }}>المضيف
              <select className="mc-inp" value={form.host_id || me || ''} onChange={e => setForm({ ...form, host_id: e.target.value })}>
                {members.map(m => <option key={m.id} value={m.id}>{nameOf(m)}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" onClick={addMeeting}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

