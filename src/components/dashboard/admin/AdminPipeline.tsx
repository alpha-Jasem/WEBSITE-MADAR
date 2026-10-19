import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, type Deal } from '../../../lib/deals'
import { DEAL_STAGES, STAGE_LABEL, isClosed, type DealStage } from '../../../lib/dealStages'
import { dateShort, nf, sar, timeShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

const LOST_REASONS = ['السعر', 'عندهم نظام حالياً', 'غير مهتم', 'قرار لاحقاً', 'طلب التوقف', 'أخرى']
const BOARD_STAGES = DEAL_STAGES.filter(s => s !== 'lost') as DealStage[]

interface DealEvent { id: string; type: string; data: Record<string, unknown>; created_at: string }

// Deals of the agency's own sales (not the customers' data). Source: public.deals.
export const AdminPipeline = () => {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showLost, setShowLost] = useState(false)
  const [adding, setAdding] = useState(false)
  const [lostFor, setLostFor] = useState<Deal | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [events, setEvents] = useState<DealEvent[]>([])
  const [form, setForm] = useState({ company_name: '', contact_name: '', contact_phone: '', service: '' })

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('deals').select('*').order('updated_at', { ascending: false }).limit(500)
    if (e) setError('تعذّر تحميل الصفقات. تحقق من الاتصال وأعد المحاولة.')
    else { setError(null); setDeals((data ?? []) as Deal[]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtimeRefetch('admin_pipeline', [{ table: 'deals' }, { table: 'agent_drafts' }, { table: 'deal_events' }], load, true)

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
    if (openId === deal.id) { setOpenId(null); return }
    setOpenId(deal.id)
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

  const open = deals.filter(d => !isClosed(d.stage))
  const stale = open.filter(d => !d.next_step && !d.next_step_at).length
  const priced = open.filter(d => d.value_net != null)
  const pipelineValue = priced.reduce((sum, d) => sum + (d.value_net ?? 0), 0)

  const card = (d: Deal) => (
    <div key={d.id} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => openDeal(d)} style={{ textAlign: 'start', fontWeight: 600, fontSize: 13.5 }}>{d.company_name}</button>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
        {d.contact_name || '—'}
        {d.contact_phone && <> · <a href={`tel:+${d.contact_phone}`} style={{ color: 'var(--primary-ink)' }} className="mono">+{d.contact_phone}</a></>}
      </div>
      <input
        defaultValue={d.next_step}
        placeholder="الخطوة القادمة…"
        aria-label="الخطوة القادمة"
        onBlur={e => { if (e.target.value !== d.next_step) patchDeal(d, { next_step: e.target.value }, { type: 'next_step', data: { text: e.target.value } }) }}
        style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 9px', color: 'var(--ink)', fontSize: 12.5 }}
      />
      <input
        type="date"
        aria-label="موعد الخطوة"
        defaultValue={d.next_step_at ? d.next_step_at.slice(0, 10) : ''}
        onBlur={e => patchDeal(d, { next_step_at: e.target.value ? new Date(`${e.target.value}T10:00:00+03:00`).toISOString() : null })}
        style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 8, padding: '5px 9px', color: 'var(--ink)', fontSize: 12.5 }}
      />
      <select value={d.stage} onChange={e => moveStage(d, e.target.value as DealStage)} aria-label="المرحلة"
        style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', color: 'var(--ink)', fontSize: 12.5 }}>
        {DEAL_STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
      </select>
      {d.lost_reason && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>السبب: {d.lost_reason}</div>}
      {d.agent_paused || d.owner_type === 'owner'
        ? <button className="btn btn-ghost" onClick={() => giveBack(d)} style={{ fontSize: 12 }}>بيدك الآن · أعدها للإيجنت</button>
        : <button className="btn btn-ghost" onClick={() => takeDeal(d)} style={{ fontSize: 12 }}>أتولى الصفقة</button>}
      {openId === d.id && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, display: 'grid', gap: 4, fontSize: 12, color: 'var(--ink-3)' }}>
          {d.last_contact_at && <div>آخر تواصل: {dateShort(d.last_contact_at)} {timeShort(d.last_contact_at)}</div>}
          {events.length === 0 ? <div>لا توجد أحداث مسجلة.</div> : events.map(ev => (
            <div key={ev.id}>{dateShort(ev.created_at)} · {ev.type === 'stage_change' ? `${STAGE_LABEL[ev.data.from as DealStage] ?? ''} ← ${STAGE_LABEL[ev.data.to as DealStage] ?? ''}` : ev.type}</div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 20 }}>
        <div>
          <div className="sec-title">الصفقات</div>
          <div className="sec-sub">مبيعات وكالة مدار فقط. المصدر: جدول deals</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
      ) : (
        <div className="mc-board" style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(240px, 1fr)', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {BOARD_STAGES.map(stage => (
            <div key={stage} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                {STAGE_LABEL[stage]}<span className="muted num">{nf(byStage.get(stage)!.length)}</span>
              </div>
              {byStage.get(stage)!.map(card)}
              {byStage.get(stage)!.length === 0 && <div className="muted" style={{ fontSize: 12 }}>لا شيء هنا</div>}
            </div>
          ))}
        </div>
      )}

      {showLost && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>الخسائر</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>{byStage.get('lost')!.map(card)}</div>
        </div>
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
