import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { loadDoNotContact, writeAudit } from '../../../lib/deals'
import { riyadhDayStart, dateShort, timeShort, nf } from '../../../lib/format'

interface Agent { id: string; name: string; role: 'seller' | 'supervisor'; status: 'draft' | 'active' | 'paused' | 'stopped'; daily_message_cap: number; min_price: number | null; max_discount_pct: number | null; spend_cap: number | null; can_promise_scope: boolean }
interface Draft { id: string; agent_id: string; lead_id: string; body: string; status: string; is_trial: boolean; review_note: string; created_at: string; sent_at: string | null }
interface Lead { id: string; name: string; phone: string; is_mobile: boolean; rating: number | null; reviews: number | null; category: string; website: string; status: string }
interface Campaign { id: string; name: string; service: string; offer: string }

const A_STATUS: Record<string, { label: string; cls: string }> = { draft: { label: 'مسودة', cls: 'mc-n2' }, active: { label: 'يعمل', cls: 'mc-g' }, paused: { label: 'متوقف مؤقتًا', cls: 'mc-a' }, stopped: { label: 'مُوقف', cls: 'mc-n2' } }
const D_STATUS: Record<string, { label: string; cls: string }> = { draft: { label: 'بانتظار مراجعتك', cls: 'mc-a' }, approved: { label: 'معتمدة', cls: 'mc-g' }, rejected: { label: 'مرفوضة', cls: 'mc-n2' }, cancelled: { label: 'أُلغيت', cls: 'mc-n2' }, sent: { label: 'أُرسلت', cls: 'mc-b' } }
const EMPTY = { name: '', cap: '50', min_price: '', max_discount: '', spend_cap: '' }

function draftBody(agent: string, lead: Lead, c: Campaign | undefined) {
  const offer = c ? [c.service, c.offer].filter(Boolean).join(' — ') : 'حلول مدار لخدمة العملاء والمبيعات'
  const site = !lead.website ? ' لاحظت أن نشاطكم ما عنده موقع إلكتروني.' : ''
  return `مرحباً، أنا ${agent} من مدار.${site} نقدم ${offer} لنشاط مثل ${lead.name}. هل يناسبك أوضح لك الفكرة في دقيقتين؟`
}

// Sales-agent control: limits, hand-over, emergency stop and the 5-company trial. Drafts are reviewed here; nothing is sent.
export const AdminAgentsControl = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [assigned, setAssigned] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [trialAgent, setTrialAgent] = useState('')
  const [trialCampaign, setTrialCampaign] = useState('')
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [a, d, l, c, as] = await Promise.all([
      supabase.from('sales_agents').select('*').order('created_at'),
      supabase.from('agent_drafts').select('*').order('created_at', { ascending: false }).limit(300),
      supabase.from('outreach_leads').select('id, name, phone, is_mobile, rating, reviews, category, website, status').eq('status', 'new').eq('is_mobile', true).limit(2000),
      supabase.from('campaigns').select('id, name, service, offer'),
      supabase.from('agent_assignments').select('lead_id').is('released_at', null),
    ])
    setError([a, d].some(r => r.error) ? 'تعذّر تحميل البيانات.' : null)
    setAgents((a.data ?? []) as Agent[]); setDrafts((d.data ?? []) as Draft[]); setLeads((l.data ?? []) as Lead[]); setCampaigns((c.data ?? []) as Campaign[])
    setAssigned(new Set((as.data ?? []).map(x => x.lead_id as string)))
  }, [])
  useEffect(() => { load() }, [load])

  const today = riyadhDayStart()
  const sentToday = (id: string) => drafts.filter(x => x.agent_id === id && x.status === 'sent' && x.sent_at && new Date(x.sent_at) >= today).length
  const leadName = useMemo(() => new Map(leads.map(l => [l.id, l.name])), [leads])

  const create = async () => {
    if (!form.name.trim()) return
    const { error: e } = await supabase.from('sales_agents').insert({
      name: form.name.trim(), daily_message_cap: Number(form.cap) || 50, min_price: form.min_price ? Number(form.min_price) : null,
      max_discount_pct: form.max_discount ? Number(form.max_discount) : null, spend_cap: form.spend_cap ? Number(form.spend_cap) : null,
    })
    if (e) { setError('تعذّر إنشاء الإيجنت.'); return }
    setAdding(false); setForm(EMPTY); load()
  }

  const setStatus = async (a: Agent, status: Agent['status']) => {
    const { error: e } = await supabase.from('sales_agents').update({ status }).eq('id', a.id)
    if (e) { setError('تعذّر تغيير الحالة.'); return }
    await writeAudit(`agent_${status}`, 'sales_agent', a.id, { status: a.status }, { status })
    if (status === 'paused' || status === 'stopped') await supabase.from('agent_drafts').update({ status: 'cancelled' }).eq('agent_id', a.id).in('status', ['draft', 'approved'])
    load()
  }

  const emergencyStop = async () => {
    await supabase.from('sales_agents').update({ status: 'stopped' }).neq('status', 'stopped')
    await supabase.from('agent_drafts').update({ status: 'cancelled' }).in('status', ['draft', 'approved'])
    await writeAudit('emergency_stop_all_agents', 'sales_agent', 'all', null, { stopped: true })
    setInfo('أُوقف كل الإيجنتات وأُلغيت الرسائل المجدولة.'); load()
  }

  // Trial: pick 5 qualified companies (new, mobile, not owned by another agent, not on the do-not-contact list) and draft the first message.
  const runTrial = async () => {
    const agent = agents.find(a => a.id === trialAgent)
    if (!agent) return
    const blocked = await loadDoNotContact()
    const c = campaigns.find(x => x.id === trialCampaign)
    const pool = leads.filter(l => !assigned.has(l.id) && !blocked.has(l.phone))
      .sort((a, b) => ((b.rating ?? 0) * Math.log10((b.reviews ?? 0) + 10)) - ((a.rating ?? 0) * Math.log10((a.reviews ?? 0) + 10)))
    const chosen = pool.slice(0, 5)
    if (chosen.length === 0) { setInfo('لا يوجد عملاء مؤهلون متاحون للتجربة.'); return }
    const { error: e1 } = await supabase.from('agent_assignments').insert(chosen.map(l => ({ agent_id: agent.id, lead_id: l.id })))
    if (e1) { setError('تعذّر إسناد العملاء (ربما أُسندوا لإيجنت آخر).'); return }
    const { error: e2 } = await supabase.from('agent_drafts').insert(chosen.map(l => ({ agent_id: agent.id, lead_id: l.id, body: draftBody(agent.name, l, c), is_trial: true })))
    if (e2) { setError('تعذّر إنشاء المسودات.'); return }
    await writeAudit('agent_trial_started', 'sales_agent', agent.id, null, { leads: chosen.length })
    setInfo(`جُهزت ${chosen.length} مسودات للمراجعة. لن يُرسل شيء قبل اعتمادك وتفعيل قناة إرسال رسمية.`); load()
  }

  const review = async (d: Draft, status: 'approved' | 'rejected', note = '') => {
    await supabase.from('agent_drafts').update({ status, review_note: note, reviewed_at: new Date().toISOString() }).eq('id', d.id)
    load()
  }
  const releaseTrial = async (agentId: string) => {
    await supabase.from('agent_assignments').update({ released_at: new Date().toISOString() }).eq('agent_id', agentId).is('released_at', null)
    await supabase.from('agent_drafts').update({ status: 'cancelled' }).eq('agent_id', agentId).in('status', ['draft', 'approved'])
    load()
  }

  const pending = drafts.filter(d => d.status === 'draft')

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      {info && <div className="mc-banner" style={{ background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.35)', color: 'var(--green)' }}>{info}</div>}

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph">
          <h3>التحكم بالإيجنتات</h3>
          <div className="mc-phr"><button className="mc-btn2" onClick={emergencyStop}>إيقاف طارئ للكل</button><button className="mc-btn2 p" onClick={() => setAdding(true)}>إيجنت جديد</button></div>
        </div>
        <div className="mc-delta" style={{ padding: '0 20px 10px', lineHeight: 1.8 }}>البداية بإيجنت بائع واحد. الإرسال الفعلي يحتاج قناة واتساب رسمية وأهلية تواصل، وهو غير مفعّل. الحد اليومي يشمل المتابعات، ولا يضمن منع الحظر.</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>الإيجنت</th><th>الحالة</th><th>الحد اليومي</th><th>أقل سعر</th><th>أقصى خصم</th><th>سقف الإنفاق</th><th /></tr></thead>
            <tbody>
              {agents.length === 0 && <tr><td colSpan={7} className="mc-flat">لا يوجد إيجنتات. أنشئ إيجنت بائع واحد للبدء.</td></tr>}
              {agents.map(a => (
                <tr key={a.id}>
                  <td><b>{a.name}</b><div style={{ color: 'var(--ink-3)', fontSize: 12 }}>{a.role === 'seller' ? 'بائع' : 'مشرف'} · يحتاج موافقتك: استثناء السعر، وعود النطاق، خصم أعلى من الحد</div></td>
                  <td><span className={`mc-st ${A_STATUS[a.status].cls}`}>{A_STATUS[a.status].label}</span></td>
                  <td>{nf(sentToday(a.id))} / {nf(a.daily_message_cap)}</td><td>{a.min_price ?? 'غير محدد'}</td><td>{a.max_discount_pct != null ? `${a.max_discount_pct}%` : 'غير محدد'}</td><td>{a.spend_cap ?? 'غير محدد'}</td>
                  <td><span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {a.status !== 'active' && a.status !== 'stopped' && <button className="mc-btn2 p" onClick={() => setStatus(a, 'active')}>تفعيل</button>}
                    {a.status === 'stopped' && <button className="mc-btn2" onClick={() => setStatus(a, 'draft')}>إعادة كمسودة</button>}
                    {a.status === 'active' && <button className="mc-btn2" onClick={() => setStatus(a, 'paused')}>إيقاف مؤقت</button>}
                    {a.status !== 'stopped' && <button className="mc-btn2" onClick={() => setStatus(a, 'stopped')}>إيقاف</button>}
                    <button className="mc-btn2" onClick={() => releaseTrial(a.id)}>تحرير عملائه</button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>تجربة على 5 شركات</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 10 }}>
          <div className="mc-grid2">
            <label className="mc-field">الإيجنت<select value={trialAgent} onChange={e => setTrialAgent(e.target.value)}><option value="">اختر</option>{agents.filter(a => a.status !== 'stopped').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="mc-field">الحملة (للعرض في الرسالة)<select value={trialCampaign} onChange={e => setTrialCampaign(e.target.value)}><option value="">بدون حملة</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <div><button className="mc-btn2 p" disabled={!trialAgent} onClick={runTrial}>جهّز مسودات 5 شركات</button></div>
          <div className="mc-delta">يختار أعلى 5 عملاء أولوية (جوال، جديد، غير مسند، وغير ممنوع التواصل)، ويمنع إسناد نفس الشركة لإيجنتين.</div>
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>مسودات للمراجعة</h3><span className="mc-st mc-a">{nf(pending.length)} بانتظارك</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="mc-tbl">
            <thead><tr><th>العميل</th><th>الرسالة</th><th>الحالة</th><th>الإنشاء</th><th /></tr></thead>
            <tbody>
              {drafts.length === 0 && <tr><td colSpan={5} className="mc-flat">لا توجد مسودات.</td></tr>}
              {drafts.map(d => (
                <tr key={d.id}>
                  <td><b>{leadName.get(d.lead_id) ?? '—'}</b>{d.is_trial && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>تجربة</div>}</td>
                  <td style={{ maxWidth: 420, lineHeight: 1.7 }}>{d.body}</td>
                  <td><span className={`mc-st ${D_STATUS[d.status].cls}`}>{D_STATUS[d.status].label}</span></td>
                  <td>{dateShort(d.created_at)} {timeShort(d.created_at)}</td>
                  <td>{d.status === 'draft' && <span style={{ display: 'flex', gap: 6 }}><button className="mc-btn2 p" onClick={() => review(d, 'approved')}>اعتماد</button><button className="mc-btn2" onClick={() => review(d, 'rejected')}>رفض</button></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>إيجنت بيع جديد</h3>
            <label className="mc-field">الاسم<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <div className="mc-grid2">
              <label className="mc-field">حد الرسائل اليومي (يشمل المتابعات)<input type="number" min={0} value={form.cap} onChange={e => setForm({ ...form, cap: e.target.value })} /></label>
              <label className="mc-field">سقف الإنفاق<input type="number" min={0} value={form.spend_cap} onChange={e => setForm({ ...form, spend_cap: e.target.value })} /></label>
              <label className="mc-field">أقل سعر صافي<input type="number" min={0} value={form.min_price} onChange={e => setForm({ ...form, min_price: e.target.value })} /></label>
              <label className="mc-field">أقصى خصم %<input type="number" min={0} max={100} value={form.max_discount} onChange={e => setForm({ ...form, max_discount: e.target.value })} /></label>
            </div>
            <div className="mc-delta">يبدأ كمسودة. لا يعد بنطاق أو سعر خارج هذه الحدود دون اعتمادك.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!form.name.trim()} onClick={create}>إنشاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
