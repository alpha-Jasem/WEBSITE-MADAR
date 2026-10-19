import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { dateShort, timeShort } from '../../../lib/format'

interface Settings {
  enabled: boolean; send_outbound: boolean; auto_reply: boolean; start_hour: number; end_hour: number
  ramp_start: number; ramp_step: number; ramp_every_days: number; max_cap: number; min_delay_s: number; max_delay_s: number
  reply_cap: number; agent_id: string | null; target: 'outreach' | 'no_website'; campaign_id: string | null
  started_on: string | null; pause_reason: string | null
}
interface Device { id: string; name: string; last_seen_at: string | null; last_status: string | null; revoked: boolean }
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
  const [devices, setDevices] = useState<Device[]>([])
  const [convs, setConvs] = useState<Conv[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [agents, setAgents] = useState<Agent[]>([])
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
  const [sentToday, setSentToday] = useState({ first: 0, reply: 0 })
  const [open, setOpen] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const start = new Date(Date.now() + 3 * 3600000); start.setUTCHours(0, 0, 0, 0)
    const dayStart = new Date(start.getTime() - 3 * 3600000).toISOString()
    const [st, dv, cv, ag, cp, first, reply] = await Promise.all([
      supabase.from('wa_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('wa_devices').select('id, name, last_seen_at, last_status, revoked').eq('revoked', false).order('created_at', { ascending: false }),
      supabase.from('wa_conversations').select('*').order('last_in_at', { ascending: false, nullsFirst: false }).limit(60),
      supabase.from('sales_agents').select('id, name, status'),
      supabase.from('campaigns').select('id, name'),
      supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'sent').eq('kind', 'first').gte('sent_at', dayStart),
      supabase.from('wa_messages').select('id', { count: 'exact', head: true }).eq('direction', 'out').eq('status', 'sent').eq('kind', 'reply').gte('sent_at', dayStart),
    ])
    if (st.data) setS(st.data as Settings)
    setDevices((dv.data ?? []) as Device[]); setConvs((cv.data ?? []) as Conv[]); setAgents((ag.data ?? []) as Agent[]); setCampaigns((cp.data ?? []) as { id: string; name: string }[])
    setSentToday({ first: first.count ?? 0, reply: reply.count ?? 0 })
    const ids = ((cv.data ?? []) as Conv[]).map(c => c.lead_id).filter(Boolean) as string[]
    if (ids.length) {
      const { data } = await supabase.from('outreach_leads').select('id, name').in('id', ids)
      setNames(Object.fromEntries((data ?? []).map(l => [l.id as string, l.name as string])))
    }
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_whatsapp', [{ table: 'wa_settings' }, { table: 'wa_conversations' }, { table: 'wa_messages' }, { table: 'wa_devices' }], load, true)

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
      if (devices.length === 0) { setNote({ ok: false, text: 'أنشئ رمز جهاز وثبّت الإضافة أولًا.' }); return }
      if (s.send_outbound && !s.agent_id) { setNote({ ok: false, text: 'اختر الإيجنت الذي يرسل (يجب أن يكون «يعمل») أو أوقف الإرسال الجديد وابقِ الردود فقط.' }); return }
    }
    await save({ enabled: !s.enabled })
  }

  const newDevice = async () => {
    setBusy(true); setNote(null)
    const { data, error } = await supabase.functions.invoke('wa-bridge', { body: { action: 'create_device', name: 'Chrome' } })
    setBusy(false)
    if (error || !data?.token) { setNote({ ok: false, text: 'تعذّر إنشاء الرمز.' }); return }
    setToken(data.token as string); load()
  }
  const revoke = async (id: string) => { await supabase.functions.invoke('wa-bridge', { body: { action: 'revoke_device', id } }); load() }

  const setState = async (c: Conv, state: Conv['state']) => { await supabase.from('wa_conversations').update({ state }).eq('id', c.id); load() }
  const openConv = async (c: Conv) => {
    if (open === c.id) { setOpen(null); return }
    setOpen(c.id)
    const { data } = await supabase.from('wa_messages').select('id, direction, body, status, kind, created_at').eq('conversation_id', c.id).order('created_at').limit(40)
    setMsgs((data ?? []) as Msg[])
  }

  if (!s) return <div className="mc-flat">جاري التحميل…</div>
  const agent = agents.find(a => a.id === s.agent_id)
  const lastSeen = devices.map(d => d.last_seen_at).filter(Boolean).sort().pop()
  const online = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 3 * 60000 : false
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
            الإيجنت يرسل ويرد من واتساب ويب في متصفحك عبر إضافة مدار، حتى وأنت نايم، بشرط أن يبقى الكمبيوتر شغالًا وChrome مفتوحًا على واتساب ويب.
            <b> تنبيه:</b> هذا ليس القناة الرسمية. واتساب قد يقيّد أو يحظر الرقم مع الرسائل الجماعية لأرقام لم تتواصل معك. خففنا الخطر بحد يومي يرتفع تدريجيًا وفواصل عشوائية وساعات عمل وإيقاف تلقائي، لكنه لا يُلغى. الأفضل رقم ثانوي.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`mc-btn2 ${s.enabled ? '' : 'p'}`} onClick={toggle} disabled={busy}>{s.enabled ? 'إيقاف الإرسال الآن' : 'تشغيل الإرسال'}</button>
            <span className="mc-st mc-n2">اليوم: {sentToday.first} من {cap} رسالة جديدة · {sentToday.reply} رد</span>
            <span className={`mc-st ${online ? 'mc-g' : 'mc-a'}`}>{online ? 'الإضافة متصلة' : devices.length ? 'الإضافة غير متصلة' : 'لا يوجد جهاز'}</span>
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
          <div><button className="mc-btn2 p" onClick={() => save()} disabled={busy}>حفظ الإعدادات</button></div>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>ربط Chrome</h3><button className="mc-btn2" onClick={newDevice} disabled={busy}>إنشاء رمز جهاز</button></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 10 }}>
          <ol className="mc-delta" style={{ lineHeight: 2, margin: 0, paddingInlineStart: 20 }}>
            <li>في Chrome افتح <b>chrome://extensions</b> وفعّل «وضع المطوّر».</li>
            <li>اضغط «تحميل إضافة غير مضغوطة» واختر مجلد <b>extensions/madar-whatsapp</b> من مشروع مدار.</li>
            <li>اضغط «إنشاء رمز جهاز» هنا، وألصق الرمز في نافذة الإضافة واحفظ.</li>
            <li>افتح <b>web.whatsapp.com</b> وسجّل الدخول، واترك التبويب مفتوحًا. تظهر شارة «مدار» أسفل الصفحة تبين ما يفعله.</li>
          </ol>
          {token && (
            <div style={{ padding: 12, borderRadius: 12, background: 'var(--fill)', border: '1px solid var(--line-2)', direction: 'ltr', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12.5 }}>
              {token}
              <div className="mc-delta" style={{ direction: 'rtl', marginTop: 6 }}>انسخه الآن. لن يظهر مرة ثانية.</div>
            </div>
          )}
          {devices.map(d => (
            <div key={d.id} className="mc-act" style={{ cursor: 'default' }}>
              <div className="mc-m"><b>{d.name}</b><small>آخر اتصال: {d.last_seen_at ? `${dateShort(d.last_seen_at)} ${timeShort(d.last_seen_at)}` : 'لم يتصل بعد'}{d.last_status ? ` · ${d.last_status}` : ''}</small></div>
              <button className="mc-btn2" onClick={() => revoke(d.id)}>إلغاء الجهاز</button>
            </div>
          ))}
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
