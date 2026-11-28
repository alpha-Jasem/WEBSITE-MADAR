import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Download, Eye, FileText, Globe, LayoutGrid, List, Pause, Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Play, Search, SlidersHorizontal } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useVoiceRead, voiceRead, type VoiceAgent, type VoiceCallDetail, type VoiceCallSummary } from '@/lib/queries/voicePlatform'
import { Badge, Button, Card, Dialog, Select } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage } from './shared/night'
import { HeadCard, NB_CSS } from './shared/nbPage'
import './growth.css'

// Call log from the voice platform: every call of the company's agents, with search, filters,
// list or card view, bulk CSV export, the recording and the transcript. Reads go through nabrah-read.

const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'
const PAGE = 50
const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  completed: { label: 'مكتملة', tone: 'success' }, no_answer: { label: 'لا يوجد رد', tone: 'danger' }, busy: { label: 'مشغول', tone: 'warning' },
  failed: { label: 'فشلت', tone: 'danger' }, queued: { label: 'في الانتظار', tone: 'neutral' }, ringing: { label: 'يرن', tone: 'neutral' }, 'in-progress': { label: 'جارية', tone: 'neutral' },
}
const TYPE: Record<string, string> = { inbound: 'وارد', outbound: 'صادر', web: 'ويب' }
const fmtWhen = (iso: string) => new Date(iso).toLocaleString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fmtDur = (s: number | null) => { const n = Math.round(Number(s) || 0); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` }
const tagNames = (c: VoiceCallSummary) => (c.tags ?? []).map((t) => (typeof t === 'string' ? t : t?.name ?? '')).filter((t) => t && !t.startsWith('madar_'))

function TypeIcon({ c }: { c: VoiceCallSummary }) {
  const missed = c.status !== 'completed' && c.status !== 'in-progress'
  const Icon = missed ? PhoneMissed : c.call_type === 'web' ? Globe : c.call_type === 'outbound' ? PhoneOutgoing : c.call_type === 'inbound' ? PhoneIncoming : Phone
  return (
    <span aria-label={TYPE[c.call_type] ?? c.call_type} title={TYPE[c.call_type] ?? c.call_type}
      style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', border: '1px solid var(--line-2)', color: missed ? 'var(--bad)' : 'var(--sky, var(--ink))' }}>
      <Icon size={15} />
    </span>
  )
}

function demoCalls(): VoiceCallSummary[] {
  const now = Date.now()
  return Array.from({ length: 18 }, (_, i) => ({
    id: `demo-call-${i}`, created_at: new Date(now - i * 5.3 * 3600_000).toISOString(), duration: i % 5 === 0 ? 4 : 40 + ((i * 29) % 160),
    call_type: i % 4 === 0 ? 'outbound' : i % 7 === 0 ? 'web' : 'inbound', status: i % 5 === 0 ? 'no_answer' : 'completed',
    call_from: i % 7 === 0 ? '' : `+96655${String(1000000 + i * 7919).slice(0, 7)}`, call_to: '920000000', agent_id: i % 3 ? 'demo-a1' : 'demo-a2',
    agent_name: i % 3 ? 'وكيل الاستقبال' : 'وكيل المتابعة', tags: i % 3 === 0 ? ['حجز موعد'] : [],
  }))
}

const CL_CSS = `
.cl-view { display: flex; gap: 2px; border: 1px solid var(--line); border-radius: 12px; padding: 3px; }
.cl-view button { width: 34px; height: 34px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); display: grid; place-items: center; cursor: pointer; }
.cl-view button[aria-pressed="true"] { background: var(--hover-bg); color: var(--ink); }
.cl-adv { border-top: 1px solid var(--line); padding-top: 14px; display: grid; gap: 12px; }
.cl-adv-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.cl-adv-head b { display: block; font-size: 14px; color: var(--ink); } .cl-adv-head small { color: var(--muted); font-size: 12.5px; }
.cl-link { border: 0; background: none; color: var(--muted); font: inherit; font-size: 12.5px; cursor: pointer; padding: 0; text-decoration: underline; }
.cl-link:disabled { opacity: .4; cursor: default; text-decoration: none; }
.cl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.cl-f { display: grid; gap: 6px; font-size: 12px; color: var(--muted); }
.cl-f input, .cl-f select { height: 42px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; font-size: 13.5px; padding: 0 12px; min-width: 0; }
`

export function DashboardV2VoiceCallLogs() {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] : agentsRead.data?.agents ?? []
  const [showFilters, setShowFilters] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [status, setStatus] = useState('')
  const [callType, setCallType] = useState('')
  const [days, setDays] = useState(30)
  const [q, setQ] = useState('')
  // Advanced filters (applied to what is loaded): exact call date range, call id, tags, from and to numbers.
  const [dFrom, setDFrom] = useState('')
  const [dTo, setDTo] = useState('')
  const [idQ, setIdQ] = useState('')
  const [tagQ, setTagQ] = useState('')
  const [fromNum, setFromNum] = useState('')
  const [toNum, setToNum] = useState('')
  const advActive = [dFrom, dTo, idQ, tagQ, fromNum, toNum].filter(Boolean).length
  const clearAdv = () => { setDFrom(''); setDTo(''); setIdQ(''); setTagQ(''); setFromNum(''); setToNum('') }
  const [view, setView] = useState<'list' | 'cards'>('list')
  const [pages, setPages] = useState(1)
  const [rows, setRows] = useState<VoiceCallSummary[] | null>(null)
  const [more, setMore] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<VoiceCallDetail | null>(null)
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => { if (dFrom) { const need = Math.ceil((Date.now() - Date.parse(dFrom)) / 86_400_000) + 1; if (need > days) setDays(Math.min(366, need)) } }, [dFrom, days])
  const agentIds = (agentId ? [agentId] : agents.map((a) => a.agent_id)).join(',')
  useEffect(() => { setPages(1); setPicked(new Set()) }, [agentId, status, callType, days])
  useEffect(() => {
    if (isDemo) {
      setRows(demoCalls().filter((c) => (!agentId || c.agent_id === agentId) && (!status || c.status === status) && (!callType || c.call_type === callType)))
      setMore(false); return
    }
    if (agentsRead.loading) return
    const ids = agentIds ? agentIds.split(',') : []
    if (ids.length === 0) { setRows([]); setMore(false); return }
    let off = false
    setRows(null)
    const name = new Map(agents.map((a) => [a.agent_id, a.name]))
    Promise.all(ids.map(async (id) => {
      const out: VoiceCallSummary[] = []
      let full = false
      for (let p = 0; p < pages; p++) {
        const r = await voiceRead<{ calls: VoiceCallSummary[] }>('calls', { agent_id: id, limit: PAGE, offset: p * PAGE, days, ...(status ? { status } : {}), ...(callType ? { call_type: callType } : {}) })
        const got = r.calls ?? []
        out.push(...got.map((c) => ({ ...c, agent_id: c.agent_id || id, agent_name: c.agent_name || name.get(id) })))
        full = got.length === PAGE
        if (!full) break
      }
      return { out, full }
    })).then((res) => {
      if (off) return
      setRows(res.flatMap((r) => r.out).sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at)))
      setMore(res.some((r) => r.full))
    }).catch(() => { if (!off) { setRows([]); pushToast({ kind: 'danger', title: 'ما قدرنا نجيب المكالمات' }) } })
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, agentIds, agentsRead.loading, status, callType, days, pages])

  // Search by number, call id, agent or tag, within what is loaded.
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const tags = tagQ.split(/[,،]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
    const from = dFrom ? Date.parse(dFrom) : 0
    const to = dTo ? Date.parse(dTo) + 86_400_000 : 0
    return (rows ?? []).filter((c) => {
      if (term && ![c.call_from, c.call_to, c.id, c.agent_name, ...tagNames(c)].some((v) => String(v ?? '').toLowerCase().includes(term))) return false
      const at = Date.parse(c.created_at)
      if (from && at < from) return false
      if (to && at >= to) return false
      if (idQ && !c.id.toLowerCase().includes(idQ.trim().toLowerCase())) return false
      if (tags.length && !tags.every((t) => tagNames(c).some((n) => n.toLowerCase().includes(t)))) return false
      if (fromNum && c.call_from !== fromNum) return false
      if (toNum && c.call_to !== toNum) return false
      return true
    })
  }, [rows, q, dFrom, dTo, idQ, tagQ, fromNum, toNum])
  const numbers = useMemo(() => ({
    from: [...new Set((rows ?? []).map((c) => c.call_from).filter(Boolean))] as string[],
    to: [...new Set((rows ?? []).map((c) => c.call_to).filter(Boolean))] as string[],
  }), [rows])
  const allPicked = list.length > 0 && list.every((c) => picked.has(c.id))
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  function exportCsv() {
    const chosen = picked.size ? list.filter((c) => picked.has(c.id)) : list
    const head = ['التاريخ', 'الوكيل', 'المتصل', 'الوجهة', 'النوع', 'الحالة', 'الوسوم', 'المدة (ث)', 'معرّف المكالمة']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = chosen.map((c) => [fmtWhen(c.created_at), c.agent_name, c.call_from, c.call_to, TYPE[c.call_type] ?? c.call_type, STATUS[c.status]?.label ?? c.status, tagNames(c).join('، '), Math.round(Number(c.duration) || 0), c.id].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `call-logs-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function play(c: VoiceCallSummary) {
    if (playing?.id === c.id) { setPlaying(null); return }
    if (isDemo) { pushToast({ kind: 'info', title: 'التسجيلات تشتغل في حسابك الحقيقي فقط' }); return }
    try {
      const r = await voiceRead<{ url: string | null }>('recording', { call_id: c.id })
      if (!r.url) { pushToast({ kind: 'info', title: 'ما فيه تسجيل لهذي المكالمة' }); return }
      setPlaying({ id: c.id, url: r.url })
    } catch { pushToast({ kind: 'danger', title: 'ما قدرنا نجيب التسجيل' }) }
  }

  async function view1(c: VoiceCallSummary) {
    if (isDemo) { setOpen({ ...c, transcript: [{ role: 'agent', message: 'هلا والله، كيف أقدر أخدمك؟' }, { role: 'user', message: 'أبي أحجز موعد بكرة.' }, { role: 'agent', message: 'أبشر، الساعة كم يناسبك؟' }] }); return }
    try { setOpen((await voiceRead<{ call: VoiceCallDetail }>('call', { call_id: c.id })).call) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا نفتح المكالمة' }) }
  }
  async function copyId(c: VoiceCallSummary) {
    try { await navigator.clipboard.writeText(c.id); pushToast({ kind: 'success', title: 'انسخ معرّف المكالمة' }) } catch { pushToast({ kind: 'info', title: c.id }) }
  }

  const th = { textAlign: 'start' as const, padding: '12px', fontSize: 12, color: 'var(--dim)', fontWeight: 600, whiteSpace: 'nowrap' as const }
  const td = { padding: '12px', fontSize: 13, borderTop: '1px solid var(--line)', verticalAlign: 'middle' as const }
  const sub = { fontSize: 11.5, color: 'var(--dim)', marginTop: 2 }
  const recPill = (c: VoiceCallSummary) => (
    <button type="button" className="gr-btn" disabled={c.status !== 'completed'} onClick={() => void play(c)} aria-label={playing?.id === c.id ? 'إيقاف التسجيل' : 'تشغيل التسجيل'}>
      {playing?.id === c.id ? <><Pause /> قيد التشغيل</> : <><Play /> لم يتم التشغيل</>}
    </button>
  )
  const actions = (c: VoiceCallSummary) => (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      <button type="button" className="gr-btn" aria-label="عرض المكالمة" onClick={() => void view1(c)}><Eye /></button>
      <button type="button" className="gr-btn" aria-label="النص" disabled={c.status !== 'completed'} onClick={() => void view1(c)}><FileText /></button>
      <button type="button" className="gr-btn" aria-label="نسخ معرّف المكالمة" onClick={() => void copyId(c)}><Copy /></button>
    </span>
  )

  return (
    <NightPage>
      <style>{NB_CSS + CL_CSS}</style>
      <HeadCard title="سجل المكالمات" sub="سجل شامل مع التصدير والتصفية المتقدمة وإجراءات جماعية لمكالمات مساحة العمل.">
        <button type="button" className="nb-btn sec" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal size={15} /> الفلاتر المتقدمة{advActive > 0 ? ` (${advActive})` : ''} {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button type="button" className="nb-btn" disabled={list.length === 0} onClick={exportCsv}><Download size={15} /> {picked.size ? `تصدير CSV (${picked.size})` : 'تصدير CSV'}</button>
      </HeadCard>

      <div className="nb-card" style={{ display: 'grid', gap: 14 }}>
        <div className="nb-filters">
          <label className="nb-search"><Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالرقم أو معرّف المكالمة أو الوكيل أو الوسوم…" aria-label="بحث في المكالمات" />
          </label>
          <div className="cl-view" role="group" aria-label="طريقة العرض">
            <button type="button" aria-pressed={view === 'list'} aria-label="عرض جدول" onClick={() => setView('list')}><List size={15} /></button>
            <button type="button" aria-pressed={view === 'cards'} aria-label="عرض بطاقات" onClick={() => setView('cards')}><LayoutGrid size={15} /></button>
          </div>
          <select className="nb-select" aria-label="الوكلاء" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">{`الوكلاء (${agents.length})`}</option>
            {agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name}</option>)}
          </select>
          <select className="nb-select" aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">الحالة</option>
            {['completed', 'no_answer', 'busy', 'failed'].map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </select>
          <select className="nb-select" aria-label="أنواع المكالمات" value={callType} onChange={(e) => setCallType(e.target.value)}>
            <option value="">أنواع المكالمات</option>
            {Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {showFilters && (
          <div className="cl-adv">
            <div className="cl-adv-head">
              <div><b>الفلاتر المتقدمة</b><small>قم بتضييق سجل المكالمات باستخدام الحقول الدقيقة ونطاقات التاريخ.</small></div>
              <button type="button" className="cl-link" disabled={advActive === 0} onClick={clearAdv}>مسح الفلاتر المتقدمة</button>
            </div>
            <div className="cl-grid">
              <label className="cl-f">تاريخ المكالمة، من<input type="date" value={dFrom} max={dTo || undefined} onChange={(e) => setDFrom(e.target.value)} /></label>
              <label className="cl-f">تاريخ المكالمة، إلى<input type="date" value={dTo} min={dFrom || undefined} onChange={(e) => setDTo(e.target.value)} /></label>
              <label className="cl-f">معرّف المكالمة<input value={idQ} onChange={(e) => setIdQ(e.target.value)} placeholder="معرّف المكالمة" /></label>
              <label className="cl-f">الوسوم<input value={tagQ} onChange={(e) => setTagQ(e.target.value)} placeholder="وسوم (مفصولة بفاصلة)" /></label>
              <label className="cl-f">من
                <select value={fromNum} onChange={(e) => setFromNum(e.target.value)}><option value="">من</option>{numbers.from.map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
              <label className="cl-f">إلى
                <select value={toNum} onChange={(e) => setToNum(e.target.value)}><option value="">إلى</option>{numbers.to.map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </label>
            </div>
          </div>
        )}
      </div>

      {playing && <audio src={playing.url} controls autoPlay style={{ width: '100%' }} onEnded={() => setPlaying(null)} />}

      {view === 'list' ? (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>
                <th style={{ ...th, width: 40 }}><input type="checkbox" aria-label="تحديد الكل" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(list.map((c) => c.id)))} /></th>
                {['المتصل', 'الوجهة', 'الحالة', 'الوسوم', 'التسجيل', 'المدة', 'إجراءات'].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows == null && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--dim)' }}>جارِ التحميل…</td></tr>}
                {rows != null && list.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--dim)' }}>ما فيه مكالمات بهالفلاتر.</td></tr>}
                {list.map((c) => {
                  const st = STATUS[c.status] ?? { label: c.status, tone: 'neutral' as const }
                  return (
                    <tr key={c.id}>
                      <td style={td}><input type="checkbox" aria-label="تحديد المكالمة" checked={picked.has(c.id)} onChange={() => toggle(c.id)} /></td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TypeIcon c={c} />
                          <div><div style={{ direction: 'ltr', textAlign: 'end' }}>{c.call_from || '—'}</div><div style={sub}>{fmtWhen(c.created_at)}</div></div>
                        </div>
                      </td>
                      <td style={td}><b style={{ fontWeight: 600 }}>{c.agent_name || '—'}</b><div style={{ ...sub, direction: 'ltr', textAlign: 'end' }}>{c.call_to || '—'}</div></td>
                      <td style={td}><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td style={td}>{tagNames(c).join('، ') || '—'}</td>
                      <td style={td}>{recPill(c)}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{fmtDur(c.duration)}</td>
                      <td style={td}>{actions(c)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="gr-grid">
          {rows == null && <div className="np-empty">جارِ التحميل…</div>}
          {rows != null && list.length === 0 && <div className="np-empty">ما فيه مكالمات بهالفلاتر.</div>}
          {list.map((c) => {
            const st = STATUS[c.status] ?? { label: c.status, tone: 'neutral' as const }
            return (
              <div key={c.id} className="gr-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" aria-label="تحديد المكالمة" checked={picked.has(c.id)} onChange={() => toggle(c.id)} />
                  <TypeIcon c={c} />
                  <div style={{ flex: 1, minWidth: 0 }}><b>{c.agent_name || '—'}</b><div style={sub}>{fmtWhen(c.created_at)}</div></div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ direction: 'ltr' }}>{c.call_from || '—'} → {c.call_to || '—'}</span><b style={{ color: 'var(--ink)' }}>{fmtDur(c.duration)}</b>
                </div>
                <div className="gr-acts">{recPill(c)}{actions(c)}</div>
              </div>
            )
          })}
        </div>
      )}
      {more && <div style={{ textAlign: 'center' }}><Button variant="secondary" onClick={() => setPages((p) => p + 1)}>تحميل المزيد</Button></div>}

      <Dialog open={!!open} title="تفاصيل المكالمة" width={620} onClose={() => setOpen(null)}>
        {open && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtWhen(open.created_at)} · {open.agent_name || ''} · {fmtDur(open.duration)}</div>
            <div style={{ display: 'grid', gap: 8, maxHeight: '55vh', overflowY: 'auto' }}>
              {(open.transcript ?? []).length === 0 && <div className="np-empty">ما فيه نص لهذي المكالمة.</div>}
              {(open.transcript ?? []).map((m, i) => {
                const agent = /agent|assistant|bot/i.test(m.role)
                return (
                  <div key={i} style={{ justifySelf: agent ? 'end' : 'start', maxWidth: '85%', background: agent ? 'var(--raise)' : 'var(--panel-2)', borderRadius: 10, padding: '8px 12px', fontSize: 13, lineHeight: 1.8 }}>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>{agent ? 'الوكيل' : 'العميل'}</div>{m.message}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}
