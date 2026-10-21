import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { dateShort, timeShort } from '../../../lib/format'

interface Settings {
  enabled: boolean; send_outbound: boolean; auto_reply: boolean; start_hour: number; end_hour: number
  ramp_start: number; ramp_step: number; ramp_every_days: number; max_cap: number; min_delay_s: number; max_delay_s: number
  reply_cap: number; agent_id: string | null; target: 'outreach' | 'no_website'; campaign_id: string | null
  started_on: string | null; pause_reason: string | null; reply_to_new_inbound: boolean
}
interface KapsoStatus { ok?: boolean; error?: string; number?: { name: string; status: string; quality: string | null; display: string | null }; webhook?: { registered: boolean; active: boolean }; template?: { name: string; status: string; category: string; reason?: string } | null; template_name?: string }
interface Conv { id: string; lead_id: string | null; phone: string; state: 'active' | 'paused' | 'stopped' | 'escalated' | 'done'; last_in_at: string | null; last_out_at: string | null; auto_replies: number }
interface Msg { id: string; direction: 'in' | 'out'; body: string; status: string; kind: string; created_at: string }
interface Agent { id: string; name: string; status: string }

const STATE_LABEL: Record<Conv['state'], { label: string; cls: string }> = {
  active: { label: 'الإيجنت يرد', cls: 'mc-g' }, paused: { label: 'أنت متولٍ', cls: 'mc-a' }, stopped: { label: 'طلب التوقف', cls: 'mc-n2' },
  escalated: { label: 'ينتظرك', cls: 'mc-a' }, done: { label: 'منتهية', cls: 'mc-n2' },
}
const DAY = 86400000

// Control room for the WhatsApp Web bridge: master switch, pacing, the Chrome extension token, and the conversations the agent is handling.
export const AdminWhatsApp = () => {
  const [s, setS] = useState<Settings | null>(null)
  const [kapso, setKapso] = useState<KapsoStatus | null>(null)
  const [convs, setConvs] = useState<Conv[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<Agent[]>([])
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
  const [sentToday, setSentToday] = useState({ first: 0, reply: 0 })
  const [open, setOpen] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const start = new Date(Date.now() + 3 * 3600000); start.setUTCHours(0, 0, 0, 0)
    const dayStart = new Date(start.getTime() - 3 * 3600000).toISOString()
    const [st, cv, ag, cp, first, reply] = await Promise.all([
      supabase.from('wa_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('wa_conversations').select('*').order('last_in_at', { ascending: false, nullsFirst: false }).limit(60),
      supabase.from('sales_agents').select('id, name, status'),
      supabase.from('campaigns').select('id, name'),
      supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'sent').eq('kind', 'first').gte('sent_at', dayStart),
      supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'sent').eq('kind', 'reply').gte('sent_at', dayStart),
    ])
    if (st.data) setS(st.data as Settings)
    setConvs((cv.data ?? []) as Conv[]); setAgents((ag.data ?? []) as Agent[]); setCampaigns((cp.data ?? []) as { id: string; name: string }[])
    setSentToday({ first: first.count ?? 0, reply: reply.count ?? 0 })
    const ids = ((cv.data ?? []) as Conv[]).map(c => c.lead_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data } = await supabase.from('outreach_leads').select('id, name').in('id', ids)
      setNames(Object.fromEntries((data ?? []).map(l => [l.id as string, l.name as string])))
    }
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_whatsapp', [{ table: 'wa_settings' }, { table: 'wa_conversations' }, { table: 'wa_messages' }], load, true)

  const kapsoCall = useCallback(async (action: string) => {
    const { data, error } = await supabase.functions.invoke('kapso-admin', { body: { action } })
    return (error ? { error: error.message } : data) as KapsoStatus & { status?: number }
  }, [])
  const refreshKapso = useCallback(async () => setKapso(await kapsoCall('status')), [kapsoCall])
  useEffect(() => { refreshKapso() }, [refreshKapso])
  const connectWebhook = async () => {
    setBusy(true); setNote(null)
    const r = await kapsoCall('register_webhook')
    setBusy(false)
    setNote(r.ok ? { ok: true, text: 'رُبط الـ webhook. رسائل العملاء تصل الآن للإيجنت.' } : { ok: false, text: 'تعذّر ربط الـ webhook.' })
    refreshKapso()
  }
  const submitTemplate = async () => {
    setBusy(true); setNote(null)
    const r = await kapsoCall('create_template')
    setBusy(false)
    setNote(r.ok ? { ok: true, text: 'أُرسل القالب لـ Meta للاعتماد. عادةً من دقائق إلى يوم.' } : { ok: false, text: 'تعذّر إرسال القالب.' })
    refreshKapso()
  }

  const cap = useMemo(() => {
    if (!s) return 0
    const started = s.started_on ? new Date(s.started_on + 'T00:00:00Z').getTime() : Date.now()
    const days = Math.max(0, Math.floor((Date.now() - started) / DAY))
    return Math.min(s.max_cap, s.ramp_start + Math.floor(days / s.ramp_every_days) * s.ramp_step)
  }, [s])

  const patch = (p: Partial<Settings>) => setS(cur => (cur ? { ...cur, ...p } : cur))
  const save = async (extra: Partial<Settings> = {}) => {
    if (!s) return
    setBusy(true); setNote(null)
    const next = { ...s, ...extra }
    if (next.enabled && !next.started_on) next.started_on = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10)
    if (next.enabled) next.pause_reason = null
    const { error } = await supabase.from('wa_settings').update({ ...next, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    if (error) { setNote({ ok: false, text: 'تعذّر الحفظ: تأكد أن ساعة النهاية بعد البداية وأن الفاصل الأقصى لا يقل عن الأدنى.' }); return }
    setS(next); setNote({ ok: true, text: 'تم الحفظ.' })
  }
  const toggle = async () => {
    if (!s) return
    if (!s.enabled) {
      if (!kapso?.number || kapso.number.status !== 'CONNECTED') { setNote({ ok: false, text: 'رقم واتساب غير متصل بـ Kapso.' }); return }
      if (!kapso.webhook?.active) { setNote({ ok: false, text: 'اربط الـ webhook أولًا حتى تصل رسائل العملاء.' }); return }
      if (s.send_outbound && !s.agent_id) { setNote({ ok: false, text: 'اختر الإيجنت الذي يرسل (يجب أن يكون «يعمل») أو أوقف الإرسال الجديد وابقِ الردود فقط.' }); return }
    }
    await save({ enabled: !s.enabled })
  }


  const setState = async (c: Conv, state: Conv['state']) => { await supabase.from('wa_conversations').update({ state }).eq('id', c.id); load() }
  const openConv = async (c: Conv) => {
    if (open === c.id) { setOpen(null); return }
    setOpen(c.id)
    const { data } = await supabase.from('wa_messages').select('id, direction, body, status, kind, created_at').eq('conversation_id', c.id).order('created_at').limit(40)
    setMsgs((data ?? []) as Msg[])
  }

  if (!s) return <div className="mc-flat">جاري التحميل…</div>
  const agent = agents.find(a => a.id === s.agent_id)
  const tplOk = kapso?.template?.status === 'APPROVED'
  const num = (k: keyof Settings, min?: number, max?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    patch({ [k]: Number.isFinite(v) ? Math.min(max ?? 1e6, Math.max(min ?? 0, v)) : 0 } as Partial<Settings>)
  }

  return (
    <div>
      {note && <div className="mc-banner" style={note.ok ? { background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.35)', color: 'var(--green)' } : undefined}>{note.text}</div>}
      {s.pause_reason && <div className="mc-banner">توقف الإرسال تلقائيًا: {s.pause_reason}</div>}

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph">
          <h3>واتساب عبر Chrome</h3>
          <span className={`mc-st ${s.enabled ? 'mc-g' : 'mc-n2'}`}>{s.enabled ? 'الإرسال يعمل' : 'الإرسال متوقف'}</span>
        </div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-delta" style={{ lineHeight: 1.8 }}>
            الإيجنت يرد ويرسل عبر <b>واتساب الرسمي (Kapso)</b> على الخادم، 24 ساعة، حتى لو الكمبيوتر مطفأ. العميل الذي يراسلك يردّ عليه الإيجنت فورًا. أما أول رسالة لعميل لم يراسلك فتخرج بقالب معتمد من Meta، وتوقف الإرسال إذا رفض العميل أو طلب موظفًا، وكل شيء يخضع للحد اليومي وساعات العمل.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`mc-btn2 ${s.enabled ? '' : 'p'}`} onClick={toggle} disabled={busy}>{s.enabled ? 'إيقاف الإرسال الآن' : 'تشغيل الإرسال'}</button>
            <span className="mc-st mc-n2">اليوم: {sentToday.first} من {cap} رسالة جديدة · {sentToday.reply} رد</span>
            <span className={`mc-st ${kapso?.number?.status === 'CONNECTED' ? 'mc-g' : 'mc-a'}`}>{kapso?.number ? (kapso.number.status === 'CONNECTED' ? 'الرقم متصل' : 'الرقم: ' + kapso.number.status) : kapso?.error ? 'تعذّر الاتصال بـ Kapso' : 'جاري الفحص…'}</span>
            {s.enabled && agent && agent.status !== 'active' && <span className="mc-st mc-a">الإيجنت «{agent.name}» غير مفعّل</span>}
          </div>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>الإعدادات والحدود</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            <label className="mc-field">الإيجنت المرسل
              <select value={s.agent_id ?? ''} onChange={e => patch({ agent_id: e.target.value || null })}>
                <option value="">اختر إيجنتًا</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} ({a.status === 'active' ? 'يعمل' : 'غير مفعّل'})</option>)}
              </select>
            </label>
            <label className="mc-field">قائمة الاستهداف
              <select value={s.target} onChange={e => patch({ target: e.target.value as Settings['target'] })}>
                <option value="outreach">Outreach (وكيل ذكاء اصطناعي)</option>
                <option value="no_website">بدون موقع (موقع إلكتروني)</option>
              </select>
            </label>
            <label className="mc-field">الحملة (اختياري)
              <select value={s.campaign_id ?? ''} onChange={e => patch({ campaign_id: e.target.value || null })}>
                <option value="">بدون حملة</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="mc-field">من الساعة (الرياض)<input type="number" min={0} max={23} value={s.start_hour} onChange={num('start_hour', 0, 23)} /></label>
            <label className="mc-field">إلى الساعة<input type="number" min={1} max={24} value={s.end_hour} onChange={num('end_hour', 1, 24)} /></label>
          </div>
          <div className="mc-delta">الحد اليومي للرسائل الجديدة اليوم: <b>{cap}</b>. يبدأ من الرقم الأول ويزيد كل فترة حتى الحد الأقصى.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <label className="mc-field">يبدأ بـ<input type="number" min={1} value={s.ramp_start} onChange={num('ramp_start', 1, 500)} /></label>
            <label className="mc-field">يزيد بمقدار<input type="number" min={0} value={s.ramp_step} onChange={num('ramp_step', 0, 100)} /></label>
            <label className="mc-field">كل (أيام)<input type="number" min={1} value={s.ramp_every_days} onChange={num('ramp_every_days', 1, 30)} /></label>
            <label className="mc-field">الحد الأقصى يوميًا<input type="number" min={1} max={500} value={s.max_cap} onChange={num('max_cap', 1, 500)} /></label>
            <label className="mc-field">فاصل أدنى (ثانية)<input type="number" min={15} value={s.min_delay_s} onChange={num('min_delay_s', 15, 3600)} /></label>
            <label className="mc-field">فاصل أقصى (ثانية)<input type="number" min={15} value={s.max_delay_s} onChange={num('max_delay_s', 15, 7200)} /></label>
            <label className="mc-field">حد الردود يوميًا<input type="number" min={1} value={s.reply_cap} onChange={num('reply_cap', 1, 2000)} /></label>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={s.send_outbound} onChange={e => patch({ send_outbound: e.target.checked })} />
            <span><b>إرسال رسائل جديدة</b><span className="mc-delta"> · الإيجنت يبدأ المحادثة مع عملاء القائمة</span></span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={s.auto_reply} onChange={e => patch({ auto_reply: e.target.checked })} />
            <span><b>الرد التلقائي</b><span className="mc-delta"> · يرد فقط في المحادثات التي بدأها هو، وبعد 12 ردًّا أو عند طلب موظف يتوقف وينبهك</span></span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={s.reply_to_new_inbound} onChange={e => patch({ reply_to_new_inbound: e.target.checked })} />
            <span><b>الرد على من يراسل الرقم أول مرة</b><span className="mc-delta"> · عملاء كتبوا لك من إعلان أو موقع أو بحث، ويُسجَّلون كعملاء جدد</span></span>
          </label>
          <div><button className="mc-btn2 p" onClick={() => save()} disabled={busy}>حفظ الإعدادات</button></div>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>الربط مع Kapso</h3><button className="mc-btn2" onClick={refreshKapso}>تحديث الحالة</button></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          {kapso?.error && <div className="mc-delta">تعذّر الاتصال: {kapso.error === 'kapso_not_configured' ? 'مفتاح Kapso غير مضبوط على الخادم.' : kapso.error}</div>}
          {kapso?.number && (
            <div className="mc-act" style={{ cursor: 'default' }}>
              <div className="mc-m"><b>{kapso.number.name?.trim() || 'رقم واتساب'}</b><small dir="ltr" style={{ textAlign: 'right' }}>{kapso.number.display ?? ''} · جودة الرقم: {kapso.number.quality ?? 'غير معروفة'}</small></div>
              <span className={`mc-st ${kapso.number.status === 'CONNECTED' ? 'mc-g' : 'mc-a'}`}>{kapso.number.status === 'CONNECTED' ? 'متصل' : kapso.number.status}</span>
            </div>
          )}
          <div className="mc-act" style={{ cursor: 'default' }}>
            <div className="mc-m"><b>استقبال الرسائل (webhook)</b><small>يوصّل ردود العملاء للإيجنت لحظيًا</small></div>
            {kapso?.webhook?.active ? <span className="mc-st mc-g">مربوط</span> : <button className="mc-btn2 p" onClick={connectWebhook} disabled={busy}>اربط الآن</button>}
          </div>
          <div className="mc-act" style={{ cursor: 'default' }}>
            <div className="mc-m"><b>قالب الرسالة الأولى</b><small>{kapso?.template ? `${kapso.template.name} · ${kapso.template.category}${kapso.template.reason && kapso.template.reason !== 'NONE' ? ' · ' + kapso.template.reason : ''}` : 'لم يُرسل للاعتماد بعد'}</small></div>
            {kapso?.template ? <span className={`mc-st ${tplOk ? 'mc-g' : kapso.template.status === 'REJECTED' ? 'mc-n2' : 'mc-a'}`}>{tplOk ? 'معتمد' : kapso.template.status === 'PENDING' ? 'بانتظار Meta' : kapso.template.status}</span> : <button className="mc-btn2 p" onClick={submitTemplate} disabled={busy}>أرسله للاعتماد</button>}
          </div>
          <div className="mc-delta" style={{ lineHeight: 1.9 }}>
            الرسالة الأولى لعميل لم يراسلك لا تخرج إلا بعد اعتماد القالب. <b>للتجربة بدون عملاء:</b> فعّل «تشغيل الإرسال» مع إلغاء «إرسال رسائل جديدة»، ثم أرسل من جوالك الشخصي رسالة إلى رقم النشاط{kapso?.number?.display ? ` (${kapso.number.display})` : ''} واكتب سؤال عميل. يرد الإيجنت خلال ثوانٍ، وتظهر المحادثة في الأسفل.
          </div>
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>المحادثات ({convs.length})</h3></div>
        {convs.length === 0 && <div className="mc-flat">لا توجد محادثات بعد. تظهر هنا بعد أول رسالة يرسلها الإيجنت.</div>}
        {convs.map(c => (
          <div key={c.id}>
            <div className="mc-act" style={{ cursor: 'pointer' }} onClick={() => openConv(c)}>
              <div className="mc-m">
                <b>{c.lead_id ? names[c.lead_id] ?? c.phone : c.phone}</b>
                <small>+{c.phone} · آخر رد منه: {c.last_in_at ? `${dateShort(c.last_in_at)} ${timeShort(c.last_in_at)}` : 'لا يوجد'} · ردود الإيجنت: {c.auto_replies}</small>
              </div>
              <span className={`mc-st ${STATE_LABEL[c.state].cls}`}>{STATE_LABEL[c.state].label}</span>
            </div>
            {open === c.id && (
              <div style={{ padding: '0 20px 16px', display: 'grid', gap: 8 }}>
                <div className="mc-jc-log" style={{ maxHeight: 320 }}>
                  {msgs.map(m => (
                    <div key={m.id} className={`mc-jc-m ${m.direction === 'in' ? 'mc-u' : 'mc-a'} ${m.status === 'failed' ? 'mc-e' : ''}`} style={{ maxWidth: '90%' }}>
                      <small style={{ display: 'block', opacity: .7 }}>{m.direction === 'in' ? 'العميل' : 'الإيجنت'}{m.status === 'queued' ? ' · بانتظار الإرسال' : m.status === 'failed' ? ' · فشل' : ''}</small>
                      <span style={{ whiteSpace: 'pre-line' }}>{m.body}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.state !== 'paused' && <button className="mc-btn2" onClick={() => setState(c, 'paused')}>أتولى المحادثة (يتوقف الإيجنت)</button>}
                  {(c.state === 'paused' || c.state === 'escalated') && <button className="mc-btn2 p" onClick={() => setState(c, 'active')}>أعد الإيجنت للمحادثة</button>}
                  {c.state !== 'done' && <button className="mc-btn2" onClick={() => setState(c, 'done')}>أنهِ المحادثة</button>}
                  <a className="mc-btn2" href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer">افتح في واتساب</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </article>
    </div>
  )
}
