import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { writeAudit } from '../../../lib/deals'
import { onboardingTemplate } from '../../../lib/commercial'
import { dateShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'

interface Project { id: string; customer_name: string; deal_id: string | null; contract_id: string | null; status: string; clock_rule: string; clock_started_at: string | null; target_date: string | null; invite_status: string; note: string; created_at: string }
interface Item { id: string; project_id: string; service_code: string; title: string; kind: 'step' | 'gate'; status: string; assignee: string; due_at: string | null; required_input: string; blocked_reason: string; last_error: string; retry_count: number }
interface Contract { id: string; number: string; customer_name: string; deal_id: string | null; terms: { lines?: { code: string; name: string }[] } }

const P_STATUS: Record<string, string> = { requirements: 'جمع المتطلبات', building: 'قيد التجهيز', testing: 'اختبار', ready: 'جاهز للإطلاق', live: 'يعمل', paused: 'متوقف' }
const I_STATUS: Record<string, { label: string; cls: string }> = { todo: { label: 'لم يبدأ', cls: 'mc-n2' }, in_progress: { label: 'جارٍ', cls: 'mc-b' }, blocked: { label: 'متعثر', cls: 'mc-a' }, done: { label: 'تم', cls: 'mc-g' } }
const CLOCK: Record<string, string> = { contract_signed: 'من توقيع العقد', payment_confirmed: 'من تأكيد الدفعة', requirements_complete: 'من اكتمال المتطلبات' }
const WHO: Record<string, string> = { owner: 'المالك', agent: 'الإيجنت', client: 'العميل' }
const INVITE: Record<string, string> = { not_created: 'لم يُجهز', created_not_sent: 'ملف جاهز، الدعوة لم تُرسل', sent: 'أُرسلت الدعوة' }

// Delivery workspace per customer. A service cannot go live until its gates (connection, tests, approvals) are done.
export const AdminOnboarding = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pick, setPick] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const [p, i, c] = await Promise.all([
      supabase.from('onboarding_projects').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('onboarding_items').select('*').order('created_at').limit(2000),
      supabase.from('contracts').select('id, number, customer_name, deal_id, terms').neq('status', 'cancelled').limit(200),
    ])
    setError([p, i].some(r => r.error) ? 'تعذّر تحميل البيانات.' : null)
    setProjects((p.data ?? []) as Project[]); setItems((i.data ?? []) as Item[]); setContracts((c.data ?? []) as Contract[])
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_onboarding', [{ table: 'onboarding_projects' }, { table: 'onboarding_items' }, { table: 'contracts' }], load, true)

  const available = contracts.filter(c => !projects.some(p => p.contract_id === c.id))

  const create = async () => {
    const c = contracts.find(x => x.id === pick)
    if (!c) return
    const { data: u } = await supabase.auth.getUser()
    const { data: proj, error: e } = await supabase.from('onboarding_projects').insert({ contract_id: c.id, deal_id: c.deal_id, customer_name: c.customer_name, created_by: u.user?.id }).select('id').single()
    if (e || !proj) { setError('تعذّر إنشاء مساحة التجهيز (ربما أُنشئت لهذا العقد مسبقًا).'); return }
    const lines = c.terms?.lines ?? []
    const rows = (lines.length ? lines : [{ code: 'custom', name: 'الحل المتفق عليه' }]).flatMap(l => onboardingTemplate(l.code, l.name)).map(r => ({ ...r, project_id: proj.id }))
    await supabase.from('onboarding_items').insert(rows)
    await writeAudit('onboarding_created', 'onboarding_project', proj.id, null, { contract: c.number, items: rows.length })
    setAdding(false); setPick(''); setOpen(proj.id); load()
  }

  const setItem = async (it: Item, patch: Partial<Item>) => {
    const { error: e } = await supabase.from('onboarding_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', it.id)
    if (e) setError('تعذّر تحديث الخطوة.')
    // requirements done on the first step starts the delivery clock when that is the agreed rule
    const proj = projects.find(p => p.id === it.project_id)
    if (patch.status === 'done' && proj && proj.clock_rule === 'requirements_complete' && !proj.clock_started_at && it.title.startsWith('جمع متطلبات')) {
      await supabase.from('onboarding_projects').update({ clock_started_at: new Date().toISOString() }).eq('id', proj.id)
    }
    load()
  }
  const setProject = async (p: Project, patch: Partial<Project>) => {
    const { error: e } = await supabase.from('onboarding_projects').update(patch).eq('id', p.id)
    if (e) {
      setError(e.message.includes('go_live_blocked_by_open_gates') ? 'لا يمكن الإطلاق: توجد شروط (ربط/اختبار/اعتماد) لم تكتمل.' : e.message.includes('go_live_requires_gates') ? 'لا يمكن الإطلاق: لا توجد شروط إطلاق لهذا المشروع.' : 'تعذّر تحديث المشروع.')
      return
    }
    if (patch.status) await writeAudit('onboarding_status', 'onboarding_project', p.id, { status: p.status }, { status: patch.status })
    setError(null); load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card">
        <div className="mc-ph"><h3>التجهيز والتسليم</h3><button className="mc-btn2 p" onClick={() => setAdding(true)} disabled={available.length === 0}>مساحة تجهيز لعقد</button></div>
        {available.length === 0 && projects.length === 0 && <div className="mc-flat">لا توجد عقود. تبدأ مساحة التجهيز من عقد أُنشئ من عرض قَبِله العميل.</div>}
        {projects.map(p => {
          const its = items.filter(i => i.project_id === p.id)
          const gates = its.filter(i => i.kind === 'gate'), doneGates = gates.filter(i => i.status === 'done').length
          const blocked = its.filter(i => i.status === 'blocked').length
          return (
            <div key={p.id} style={{ borderTop: '1px solid var(--line)', padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => setOpen(open === p.id ? null : p.id)} style={{ flex: 1, textAlign: 'start', minWidth: 200 }}>
                  <b style={{ font: '700 15px var(--head)' }}>{p.customer_name}</b>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12.5 }}>المرحلة: {P_STATUS[p.status]} · شروط الإطلاق {doneGates}/{gates.length}{blocked ? ` · ${blocked} متعثرة` : ''}</div>
                </button>
                <select aria-label="المرحلة" value={p.status} onChange={e => setProject(p, { status: e.target.value })} style={{ height: 38, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 10px' }}>
                  {Object.entries(P_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {open === p.id && (
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  <div className="mc-grid2">
                    <label className="mc-field">بداية احتساب مدة التنفيذ
                      <select value={p.clock_rule} onChange={e => setProject(p, { clock_rule: e.target.value })}>{Object.entries(CLOCK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </label>
                    <label className="mc-field">الموعد المستهدف<input type="date" defaultValue={p.target_date ?? ''} onBlur={e => setProject(p, { target_date: e.target.value || null })} /></label>
                  </div>
                  <div className="mc-delta">{p.clock_started_at ? `بدأ احتساب المدة ${dateShort(p.clock_started_at)}` : 'لم يبدأ احتساب المدة بعد'} · تأخر متطلبات العميل يؤخر الموعد المستهدف.</div>
                  {its.map(it => (
                    <div key={it.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px dashed var(--line)' }}>
                      <div><b style={{ font: '600 14px var(--head)' }}>{it.title}</b> {it.kind === 'gate' && <span className="mc-st mc-b">شرط إطلاق</span>}
                        <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>المسؤول: {WHO[it.assignee]}{it.required_input ? ` · المطلوب: ${it.required_input}` : ''}{it.blocked_reason ? ` · سبب التعثر: ${it.blocked_reason}` : ''}</div></div>
                      <span className={`mc-st ${I_STATUS[it.status].cls}`}>{I_STATUS[it.status].label}</span>
                      <select aria-label="حالة الخطوة" value={it.status} onChange={e => {
                        const v = e.target.value
                        if (v === 'blocked') { const r = window.prompt('سبب التعثر؟') ?? ''; setItem(it, { status: 'blocked', blocked_reason: r, retry_count: it.retry_count }) } else setItem(it, { status: v })
                      }} style={{ height: 36, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--fill)', color: 'var(--ink)', padding: '0 8px' }}>
                        {Object.entries(I_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="mc-delta" style={{ lineHeight: 1.8 }}>
                    ملف العميل ودعوته: <b>{INVITE[p.invite_status]}</b>. لا تُرسل دعوة تلقائيًا؛ هذا الزر يسجل أنك أرسلتها بنفسك.
                    <span style={{ display: 'inline-flex', gap: 6, marginInlineStart: 10 }}>
                      {p.invite_status === 'not_created' && <button className="mc-btn2" onClick={() => setProject(p, { invite_status: 'created_not_sent' })}>سجّل تجهيز الملف</button>}
                      {p.invite_status === 'created_not_sent' && <button className="mc-btn2 p" onClick={() => setProject(p, { invite_status: 'sent' })}>سجّلت إرسال الدعوة</button>}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </article>

      {adding && (
        <div className="mc-modal-bg" onClick={() => setAdding(false)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <h3>مساحة تجهيز جديدة</h3>
            <label className="mc-field">العقد<select value={pick} onChange={e => setPick(e.target.value)}><option value="">اختر عقدًا</option>{available.map(c => <option key={c.id} value={c.id}>{c.number} · {c.customer_name}</option>)}</select></label>
            <div className="mc-delta">تُنشأ خطوات المتطلبات والتجهيز، وشروط الإطلاق (ربط، اختبار، اعتماد العميل) لكل خدمة في العقد.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="mc-btn2" onClick={() => setAdding(false)}>إلغاء</button>
              <button className="mc-btn2 p" disabled={!pick} onClick={create}>إنشاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
