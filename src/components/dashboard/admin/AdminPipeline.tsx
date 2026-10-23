import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, type Deal } from '../../../lib/deals'
import { DEAL_STAGES, STAGE_LABEL, isClosed, stageRank, type DealStage } from '../../../lib/dealStages'
import { dateShort, nf, riyadhDayStart, sar, timeShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { McIcon } from './mcIcons'

const LOST_REASONS = ['السعر', 'عندهم نظام حالياً', 'غير مهتم', 'قرار لاحقاً', 'طلب التوقف', 'أخرى']
// The board shows four working columns plus "won"; the nine stored stages are unchanged underneath, so Outreach sync, Jarvis and reports keep working.
const LANES: { key: string; label: string; stages: DealStage[] }[] = [
  { key: 'new', label: 'جديد', stages: ['new'] },
  { key: 'contact', label: 'تواصل', stages: ['contacted', 'interested'] },
  { key: 'meeting', label: 'اجتماع', stages: ['qualified'] },
  { key: 'offer', label: 'عرض ودفع', stages: ['offer_sent', 'negotiation', 'awaiting_payment'] },
  { key: 'won', label: 'مغلق بنجاح', stages: ['won'] },
]
const FLOW: DealStage[] = ['new', 'contacted', 'interested', 'qualified', 'offer_sent', 'negotiation', 'awaiting_payment', 'won']
const nextOf = (s: DealStage): DealStage | null => { const i = FLOW.indexOf(s); return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null }
const VIEW_KEY = 'madar_deals_view'
type View = 'board' | 'list'
type Sort = 'stage' | 'next' | 'updated'

interface DealEvent { id: string; type: string; data: Record<string, unknown>; created_at: string }

const EVENT_LABEL: Record<string, string> = {
  created: 'أُنشئت الصفقة', handover_to_owner: 'توليتها أنت', handover_to_agent: 'أُعيدت للإيجنت', next_step: 'تحديث الخطوة القادمة',
}

const readView =(): View => { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'board' } catch { return 'board' } }
const isOwner = (d: Deal) => !!d.agent_paused || d.owner_type === 'owner'

// Deals of the agency's own sales (not the customers' data). Source: public.deals.
export const AdminPipeline = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLost, setShowLost] = useState(false)
  const [adding, setAdding] = useState(false)
  const [lostFor, setLostFor] = useState<Deal | null>(null)
  const [wonFor, setWonFor] = useState<Deal | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [events, setEvents] = useState<DealEvent[]>([])
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_phone: '', service: '' })
  const [view, setView] = useState<View>(readView)
  const [sort, setSort] = useState<Sort>('stage')
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('deals').select('*').order('updated_at', { ascending: false }).limit(500)
    if (e) setError('تعذّر تحميل الصفقات. تحقق من الاتصال وأعد المحاولة.')
    else { setError(null); setDeals((data ?? []) as Deal[]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtimeRefetch('admin_pipeline', [{ table: 'deals' }, { table: 'agent_drafts' }, { table: 'deal_events' }], load, true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const byStage = useMemo(() => {
    const map = new Map<DealStage, Deal[]>()
    DEAL_STAGES.forEach(s => map.set(s, []))
    deals.forEach(d => map.get(d.stage)?.push(d))
    return map
  }, [deals])

  const patchDeal = async (deal: Deal, patch: Partial<Deal>, event?: { type: string; data: Record<string, unknown> }) => {
    setDeals(ds => ds.map(d => (d.id === deal.id ? { ...d, ...patch } : d)))
    const { error: e } = await supabase.from('deals').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', deal.id)
    if (e) { setError('تعذّر حفظ التغيير.'); load(); return }
    if (event) await logDealEvent(deal.id, event.type, event.data)
  }

  const moveStage = (deal: Deal, stage: DealStage) => {
    if (stage === 'lost') { setLostFor(deal); return }
    if (stage === 'won') { setWonFor(deal); return }
    patchDeal(deal, { stage, closed_at: isClosed(stage) ? new Date().toISOString() : null, lost_reason: '' },
      { type: 'stage_change', data: { from: deal.stage, to: stage } })
  }

  // "I take the deal": the owner holds it, the agent stops, and scheduled drafts for it are cancelled until it is handed back.
  const takeDeal = async (deal: Deal) => {
    await patchDeal(deal, { owner_type: 'owner', agent_paused: true } as Partial<Deal>, { type: 'handover_to_owner', data: {} })
    await supabase.from('agent_drafts').update({ status: 'cancelled' }).eq('deal_id', deal.id).in('status', ['draft', 'approved'])
  }
  const giveBack = (deal: Deal) => patchDeal(deal, { owner_type: 'agent', agent_paused: false } as Partial<Deal>, { type: 'handover_to_agent', data: {} })

  const openDeal = async (deal: Deal) => {
    setOpenId(deal.id)
    setEvents([])
    const { data } = await supabase.from('deal_events').select('id, type, data, created_at').eq('deal_id', deal.id).order('created_at', { ascending: false }).limit(15)
    setEvents((data ?? []) as DealEvent[])
  }

  const addDeal = async () => {
    if (!form.company_name.trim()) return
    const { data, error: e } = await supabase.from('deals').insert({ ...form, source: 'manual' }).select('*').single()
    if (e || !data) { setError('تعذّرت إضافة الصفقة.'); return }
    await logDealEvent(data.id, 'created', { source: 'manual' })
    setForm({ company_name: '', contact_name: '', contact_phone: '', service: '' })
    setAdding(false)
    load()
  }

  const changeView = (v: View) => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* storage unavailable */ }
  }

  /* ---------- drag and drop between stages ---------- */
  const drop = (lane: (typeof LANES)[number]) => {
    const d = deals.find(x => x.id === dragId)
    if (d && !lane.stages.includes(d.stage)) moveStage(d, lane.stages[0])
    setDragId(null)
    setOver(null)
  }
  const laneDnD = (lane: (typeof LANES)[number]) => ({
    onDragOver: (e: DragEvent) => { if (!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== lane.key) setOver(lane.key) },
    onDragLeave: (e: DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(o => (o === lane.key ? null : o)) },
    onDrop: (e: DragEvent) => { e.preventDefault(); drop(lane) },
  })

  const open = deals.filter(d => !isClosed(d.stage))
  const stale = open.filter(d => !d.next_step && !d.next_step_at).length
  const priced = open.filter(d => d.value_net != null)
  const pipelineValue = priced.reduce((sum, d) => sum + (d.value_net ?? 0), 0)
  const today = riyadhDayStart()
  const late = (d: Deal) => !!d.next_step_at && new Date(d.next_step_at) < today && !isClosed(d.stage)
  const current = deals.find(d => d.id === openId) ?? null

  const card = (d: Deal, showStage = false) => {
    const next = nextOf(d.stage)
    return (
      <div
        key={d.id}
        role="button"
        tabIndex={0}
        className={`jv-deal ${dragId === d.id ? 'is-drag' : ''} ${openId === d.id ? 'is-open' : ''}`}
        draggable
        onDragStart={e => { e.dataTransfer.setData('text/plain', d.id); e.dataTransfer.effectAllowed = 'move'; setDragId(d.id) }}
        onDragEnd={() => { setDragId(null); setOver(null) }}
        onClick={() => openDeal(d)}
        onKeyDown={e => { if (e.key === 'Enter') openDeal(d) }}
      >
        <b>{d.company_name}</b>
        <small>{d.contact_name || '—'}{d.contact_phone && <> · <span className="jv-ltr">+{d.contact_phone}</span></>}</small>
        {d.next_step || d.next_step_at
          ? <span className={`jv-next ${late(d) ? 'late' : ''}`}>{d.next_step || 'خطوة قادمة'}{d.next_step_at && ` · ${dateShort(d.next_step_at)}`}</span>
          : <span className="jv-next none">بلا خطوة قادمة</span>}
        {(showStage || isOwner(d) || d.lost_reason) && (
          <span className="jv-tags">
            {showStage && <i className="stage">{STAGE_LABEL[d.stage]}</i>}
            {isOwner(d) && <i>بيدك</i>}
            {d.lost_reason && <i>السبب: {d.lost_reason}</i>}
          </span>
        )}
        {!isClosed(d.stage) && (
          <span className="jv-quick" onClick={e => e.stopPropagation()}>
            {next && <button type="button" onClick={() => moveStage(d, next)}>{STAGE_LABEL[next]} ←</button>}
            <button type="button" className="lose" onClick={() => setLostFor(d)}>خسارة</button>
          </span>
        )}
      </div>
    )
  }

  const sorted = useMemo(() => {
    const list = deals.filter(d => showLost || d.stage !== 'lost')
    const t = (s: string | null) => (s ? new Date(s).getTime() : Infinity)
    return [...list].sort((a, b) =>
      sort === 'stage' ? stageRank(b.stage) - stageRank(a.stage)
        : sort === 'next' ? t(a.next_step_at) - t(b.next_step_at)
          : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  }, [deals, sort, showLost])

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="sec-title">الصفقات</div>
          <div className="sec-sub">مبيعات وكالة مدار فقط. المصدر: جدول deals</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="jv-seg" role="tablist" aria-label="طريقة العرض">
            <button role="tab" aria-selected={view === 'board'} className={view === 'board' ? 'on' : ''} onClick={() => changeView('board')}>لوحة</button>
            <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')}>قائمة</button>
          </div>
          <button className="btn btn-ghost" onClick={() => setShowLost(s => !s)}>{showLost ? 'إخفاء الخسائر' : `الخسائر (${nf(byStage.get('lost')!.length)})`}</button>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>إضافة صفقة</button>
        </div>
      </div>

      {error && <div className="card card-pad" style={{ borderColor: 'rgba(240,80,60,.4)', marginBottom: 14 }}>{error}</div>}

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat"><div className="stat-label">صفقات مفتوحة</div><div className="stat-value num">{nf(open.length)}</div></div>
        <div className="stat"><div className="stat-label">بلا خطوة قادمة</div><div className="stat-value num" style={stale ? { color: 'var(--red)' } : undefined}>{nf(stale)}</div></div>
        <div className="stat"><div className="stat-label">مغلقة بنجاح</div><div className="stat-value num">{nf(byStage.get('won')!.length)}</div></div>
        <div className="stat">
          <div className="stat-label">قيمة معروضة (صافي)</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{priced.length ? sar(pipelineValue) : 'لا توجد أسعار'}</div>
        </div>
      </div>

      {loading ? <div className="muted">جاري التحميل…</div> : deals.length === 0 ? (
        <div className="card card-pad">لا توجد صفقات بعد. تُنشأ تلقائيًا عند أول تواصل من Outreach، أو أضف صفقة يدويًا.</div>
      ) : view === 'board' ? (
        <>
          <div className="mc-board jv-board">
            {LANES.map(lane => {
              const list = lane.stages.flatMap(st => byStage.get(st)!)
              return (
                <section key={lane.key} className={`jv-lane ${over === lane.key ? 'is-over' : ''}`} aria-label={lane.label} {...laneDnD(lane)}>
                  <div className="jv-lane-h"><span>{lane.label}</span><span className="num">{nf(list.length)}</span></div>
                  <div className="jv-lane-b">
                    {list.map(d => card(d, lane.stages.length > 1))}
                    {list.length === 0 && <div className="jv-lane-empty">{dragId ? 'أفلتها هنا' : 'لا شيء هنا'}</div>}
                  </div>
                </section>
              )
            })}
          </div>
          {showLost && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>الخسائر</div>
              <div className="jv-lostgrid">{byStage.get('lost')!.map(d => card(d))}</div>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="jv-listbar">
            <span className="muted">{nf(sorted.length)} صفقة</span>
            <label className="muted">ترتيب حسب{' '}
              <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="ترتيب الصفقات">
                <option value="stage">المرحلة</option>
                <option value="next">الخطوة القادمة</option>
                <option value="updated">آخر تحديث</option>
              </select>
            </label>
          </div>
          <div className="scroll">
            <table className="tbl jv-list">
              <thead><tr><th>الشركة</th><th>المرحلة</th><th>الخطوة القادمة</th><th>الموعد</th><th>آخر تواصل</th><th>القيمة</th></tr></thead>
              <tbody>
                {sorted.map(d => (
                  <tr key={d.id} onClick={() => openDeal(d)} className={openId === d.id ? 'is-open' : ''}>
                    <td><b>{d.company_name}</b>{isOwner(d) && <span className="jv-tags"><i>بيدك</i></span>}<div className="muted" style={{ fontSize: 12 }}>{d.contact_name || '—'}</div></td>
                    <td><span className="jv-stage">{STAGE_LABEL[d.stage]}</span></td>
                    <td>{d.next_step || <span style={{ color: 'var(--red)' }}>بلا خطوة قادمة</span>}</td>
                    <td className={late(d) ? 'jv-late' : ''}>{d.next_step_at ? dateShort(d.next_step_at) : '—'}</td>
                    <td>{d.last_contact_at ? dateShort(d.last_contact_at) : '—'}</td>
                    <td className="num">{d.value_net != null ? sar(d.value_net) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {current && (
        <>
          <div className="jv-drawer-bg" onClick={() => setOpenId(null)} />
          <aside className="jv-drawer" role="dialog" aria-label={current.company_name} key={current.id}>
            <div className="jv-drawer-h">
              <div>
                <b>{current.company_name}</b>
                <small>{current.contact_name || '—'}{current.service && ` · ${current.service}`}</small>
              </div>
              <button className="jv-x" onClick={() => setOpenId(null)} aria-label="إغلاق"><McIcon name="close" size={18} /></button>
            </div>
            {current.contact_phone && <a className="btn btn-ghost" href={`tel:+${current.contact_phone}`}><McIcon name="phone" size={16} /><span className="jv-ltr">+{current.contact_phone}</span></a>}
            <label className="jv-f">المرحلة
              <select value={current.stage} onChange={e => moveStage(current, e.target.value as DealStage)}>
                {DEAL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="jv-f">الخطوة القادمة
              <input
                defaultValue={current.next_step}
                placeholder="الخطوة القادمة…"
                onBlur={e => { if (e.target.value !== current.next_step) patchDeal(current, { next_step: e.target.value }, { type: 'next_step', data: { text: e.target.value } }) }}
              />
            </label>
            <label className="jv-f">موعد الخطوة
              <input
                type="date"
                defaultValue={current.next_step_at ? current.next_step_at.slice(0, 10) : ''}
                onBlur={e => patchDeal(current, { next_step_at: e.target.value ? new Date(`${e.target.value}T10:00:00+03:00`).toISOString() : null })}
              />
            </label>
            {current.value_net != null && <div className="jv-kv"><span>القيمة (صافي)</span><b>{sar(current.value_net)}</b></div>}
            {current.lost_reason && <div className="jv-kv"><span>سبب الخسارة</span><b>{current.lost_reason}</b></div>}
            {isOwner(current)
              ? <button className="btn btn-ghost" onClick={() => giveBack(current)}>بيدك الآن · أعدها للإيجنت</button>
              : <button className="btn btn-primary" onClick={() => takeDeal(current)}>أتولى الصفقة</button>}
            <div className="jv-hist">
              <b>السجل</b>
              {current.last_contact_at && <div>آخر تواصل: {dateShort(current.last_contact_at)} {timeShort(current.last_contact_at)}</div>}
              {events.length === 0 ? <div>لا توجد أحداث مسجلة.</div> : events.map(ev => (
                <div key={ev.id}>{dateShort(ev.created_at)} · {ev.type === 'stage_change' ? `${STAGE_LABEL[ev.data.from as DealStage] ?? ''} ← ${STAGE_LABEL[ev.data.to as DealStage] ?? ''}` : EVENT_LABEL[ev.type] ?? ev.type}</div>
              ))}
            </div>
          </aside>
        </>
      )}

      {adding && (
        <div className="pal-bg" onClick={() => setAdding(false)}>
          <div className="pal" style={{ padding: 20, display: 'grid', gap: 10 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700 }}>صفقة جديدة</div>
            {([['company_name', 'اسم الشركة'], ['contact_name', 'جهة الاتصال'], ['contact_phone', 'الجوال (966…)'], ['service', 'الخدمة']] as const).map(([k, label]) => (
              <input key={k} placeholder={label} aria-label={label} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', color: 'var(--ink)' }} />
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="btn btn-primary" onClick={addDeal} disabled={!form.company_name.trim()}>إضافة</button>
            </div>
          </div>
        </div>
      )}

      {wonFor && (
        <div className="pal-bg" onClick={() => setWonFor(null)}>
          <div className="pal" style={{ padding: 20, display: 'grid', gap: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700 }}>إغلاق الصفقة بنجاح: {wonFor.company_name}</div>
            <div className="muted" style={{ fontSize: 13 }}>تُسجَّل الصفقة كعميل مغلق بنجاح. تقدر تعيد فتحها من اللوحة الجانبية.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setWonFor(null)}>إلغاء</button>
              <button className="btn btn-primary" onClick={() => {
                patchDeal(wonFor, { stage: 'won', closed_at: new Date().toISOString(), lost_reason: '' }, { type: 'stage_change', data: { from: wonFor.stage, to: 'won' } })
                setWonFor(null)
              }}>تأكيد الإغلاق</button>
            </div>
          </div>
        </div>
      )}

      {lostFor && (
        <div className="pal-bg" onClick={() => setLostFor(null)}>
          <div className="pal" style={{ padding: 20, display: 'grid', gap: 12 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700 }}>سبب الخسارة: {lostFor.company_name}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LOST_REASONS.map(r => (
                <button key={r} className="btn btn-ghost" onClick={() => {
                  patchDeal(lostFor, { stage: 'lost', lost_reason: r, closed_at: new Date().toISOString() }, { type: 'stage_change', data: { from: lostFor.stage, to: 'lost', reason: r } })
                  setLostFor(null)
                }}>{r}</button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={() => setLostFor(null)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  )
}
