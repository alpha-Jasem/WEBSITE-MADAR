import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface Ev { type: string; slots?: string[]; label?: string; dry_run?: boolean; link?: string; business?: string }
interface Msg { role: 'user' | 'assistant'; content: string; events?: Ev[]; flag?: string; error?: boolean }
interface Lead { id: string; name: string; category: string | null; website: string | null }

const STARTERS = ['السلام عليكم، وش تقدمون بالضبط؟', 'كم السعر؟', 'أبغى أحجز معكم موعد', 'ما عندي موقع، تقدرون تسوون لي؟', 'إنت إنسان ولا روبوت؟']

// A live test of the sales agent: you are the customer. Booking is a dry run unless you switch on a real calendar booking.
export const AdminAgentTest = () => {
  const [target, setTarget] = useState<'outreach' | 'no_website'>('outreach')
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadId, setLeadId] = useState('')
  const [real, setReal] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let q = supabase.from('outreach_leads').select('id, name, category, website').eq('is_mobile', true).eq('in_focus', true).order('rating', { ascending: false, nullsFirst: false }).limit(150)
    q = target === 'no_website' ? q.eq('website', '') : q.neq('website', '')
    q.then(({ data }) => { setLeads((data ?? []) as Lead[]); setLeadId('') })
  }, [target])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs, busy])

  const send = async (raw?: string) => {
    const message = (raw ?? text).trim()
    if (!message || busy) return
    setText('')
    const next: Msg[] = [...msgs, { role: 'user', content: message }]
    setMsgs(next); setBusy(true)
    const { data, error } = await supabase.functions.invoke('agent-draft', {
      body: { action: 'chat', target, lead_id: leadId || undefined, real_booking: real, messages: next.filter(m => !m.error).map(m => ({ role: m.role, content: m.content })) },
    })
    setBusy(false)
    if (error || !data?.reply) {
      setMsgs(m => [...m, { role: 'assistant', content: data?.detail ? `تعذّر الرد: ${data.detail}` : 'تعذّر الرد الآن. تأكد من رصيد OpenAI وحاول مرة ثانية.', error: true }])
      return
    }
    setMsgs(m => [...m, { role: 'assistant', content: data.reply as string, events: data.events as Ev[] | undefined, flag: data.flag as string | undefined }])
  }

  return (
    <div>
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>جرّب الإيجنت</h3><span className="mc-st mc-n2">لا يُرسل شيء لأحد</span></div>
        <div className="mc-delta" style={{ padding: '0 20px 10px', lineHeight: 1.8 }}>أنت العميل وهو يرد عليك. يعتمد على «معرفة الإيجنت» ومعلومات العميل المختار. يقدر يقترح مواعيد حقيقية من تقويمك، ويحجز (تجريبيًا ما لم تفعّل الحجز الحقيقي)، ويجهّز نموذج موقع بالرابط إذا النشاط بلا موقع أو طلب ذلك.</div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <label className="mc-field">قائمة الاستهداف
              <select value={target} onChange={e => { setTarget(e.target.value as 'outreach' | 'no_website'); setMsgs([]) }}>
                <option value="outreach">Outreach (يبيع وكيل الذكاء الاصطناعي)</option>
                <option value="no_website">بدون موقع (يبيع موقعًا إلكترونيًا)</option>
              </select>
            </label>
            <label className="mc-field">العميل
              <select value={leadId} onChange={e => { setLeadId(e.target.value); setMsgs([]) }}>
                <option value="">نشاط تجريبي عام</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name}{l.category ? ` · ${l.category}` : ''}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={real} onChange={e => setReal(e.target.checked)} />
            <span><b>حجز حقيقي في تقويمي</b><span className="mc-delta"> · إذا فعّلته ينشئ حدثًا فعليًا باسم «(اختبار الإيجنت)»</span></span>
          </label>

          <div className="mc-jc-log" style={{ maxHeight: 460, minHeight: 120 }} role="log" aria-live="polite">
            {msgs.length === 0 && <div className="mc-delta">ابدأ بكتابة أول رسالة من العميل، أو اضغط على اقتراح:</div>}
            {msgs.map((m, i) => (
              <div key={i} className={`mc-jc-m ${m.role === 'user' ? 'mc-u' : 'mc-a'} ${m.error ? 'mc-e' : ''}`} style={{ maxWidth: '90%' }}>
                <small style={{ display: 'block', opacity: .7, marginBottom: 2 }}>{m.role === 'user' ? 'العميل (أنت)' : 'الإيجنت'}{m.flag === 'escalate' ? ' · يرفع للمسؤول' : m.flag === 'stop' ? ' · توقف' : ''}</small>
                <span style={{ whiteSpace: 'pre-line' }}>{m.content}</span>
                {m.events?.map((e, j) => (
                  <div key={j} style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: 'var(--fill-2)', border: '1px dashed var(--line-2)', fontSize: 12.5, lineHeight: 1.7 }}>
                    {e.type === 'slots' && <>📅 اطّلع على تقويمك الحقيقي واقترح: {e.slots?.slice(0, 3).join(' · ')}</>}
                    {e.type === 'booking' && (e.dry_run ? <>🗓 كان سيحجز (تجريبي): {e.label}</> : <>🗓 حجز فعلي: {e.label} {e.link && <a href={e.link} target="_blank" rel="noreferrer" style={{ color: 'var(--link)' }}>افتح الحدث</a>}</>)}
                    {e.type === 'site' && <>🌐 جهّز نموذج موقع لـ{e.business}: <a href={e.link} target="_blank" rel="noreferrer" style={{ color: 'var(--link)' }}>افتح المعاينة</a></>}
                  </div>
                ))}
              </div>
            ))}
            {busy && <div className="mc-jc-m mc-a"><span className="mc-jc-dots"><i /><i /><i /></span></div>}
            <div ref={endRef} />
          </div>

          {msgs.length === 0 && <div className="mc-chips">{STARTERS.map(s => <button key={s} className="mc-chipbtn" onClick={() => void send(s)}>{s}</button>)}</div>}
          <form className="mc-jc-in" onSubmit={e => { e.preventDefault(); void send() }}>
            <input value={text} onChange={e => setText(e.target.value)} placeholder="اكتب كأنك العميل…" aria-label="رسالة العميل" maxLength={600} disabled={busy} />
            <button type="submit" className="mc-jc-send" disabled={busy || !text.trim()} aria-label="إرسال">←</button>
          </form>
          {msgs.length > 0 && <div><button className="mc-btn2" onClick={() => setMsgs([])}>محادثة جديدة</button></div>}
        </div>
      </article>
    </div>
  )
}
