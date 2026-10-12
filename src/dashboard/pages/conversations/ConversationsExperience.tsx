import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronRight, ChevronUp, ChevronDown, Search, CheckCircle2, Ticket, Copy, Download, Phone, MessageCircle, Globe, Inbox, List, Table2,
  ClipboardCheck, ScrollText, LayoutGrid,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSupportTickets } from '@/lib/dashboardQueries'
import { useConversationData, markCallReviewed } from '@/lib/queries/conversations'
import { aiCallIntentLabel, aiCallResultLabel } from '@/lib/aiCallLabels'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { useToast, ContactActions } from '@/dashboard/components/uiExtras'
import type { AICallLog, SupportTicket } from '@/types/dashboard'
import {
  buildConversations, itemChip, fmtFull, fmtDay, fmtDuration, copyText, CHANNEL_LABEL, MSG_TYPE_LABEL, MSG_STATUS_LABEL,
  type ConvChannel, type ConvItem,
} from './model'
import { Chip, ChannelIcon, ConvRow, Sk, TagChips } from './ui'
import { TagManager } from './TagManager'
import { useTagRules } from '@/lib/queries/tagRules'
import { Dialog } from '@/dashboard/components/primitives'
import { RecordingPlayer } from './RecordingPlayer'
import { ConvTable } from './ConvTable'
import { ConversationAnalysis, ConversationOverview, VerdictCard } from './DetailTabs'
import { VERDICT_LABEL, normalizePhone } from '@/lib/callAnalysis'
import '../analytics/analytics.css'

type Filter = 'all' | 'needs' | ConvChannel
type EvalFilter = 'all' | 'success' | 'failure' | 'none'
type View = 'list' | 'table'
type DetailTab = 'overview' | 'transcript' | 'analysis'

const PAGE = 40
const PROVIDER_LABEL: Record<string, string> = { nabrah: 'نبرة', elevenlabs: 'المنصة الصوتية' }

/** The unified conversations experience. `calls` mode backs /call-logs: the same list
 *  and detail, limited to the agent's calls, with an Excel export. */
export function ConversationsExperience({ mode }: { mode: 'all' | 'calls' }) {
  const { companyId, isDemo, hasModule } = useWorkspace()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const showVoice = hasModule('voice')
  const showTickets = hasModule('tickets')

  const { calls, messages, loading } = useConversationData(companyId, isDemo)
  const { data: tickets } = useSupportTickets(showTickets ? companyId : null, isDemo && showTickets)

  const { rules: tagRules } = useTagRules(companyId, isDemo)
  const [tagsOpen, setTagsOpen] = useState(false)
  const items = useMemo(() => buildConversations(calls, messages, {
    includePhone: mode === 'calls' || showVoice,
    includeMessages: mode === 'all',
    tagRules,
  }), [calls, messages, mode, showVoice, tagRules])

  const openId = params.get('id')
  const filter = (params.get('filter') as Filter) || 'all'
  const evalFilter = (params.get('eval') as EvalFilter) || 'all'
  const tagFilter = params.get('tag') || 'all'
  const view: View = params.get('view') === 'table' ? 'table' : 'list'
  const search = params.get('q') || ''
  const [limit, setLimit] = useState(PAGE)

  function setParam(key: string, value: string | null, replace = false) {
    const next = new URLSearchParams(params)
    const isDefault = ((key === 'filter' || key === 'eval' || key === 'tag') && value === 'all') || (key === 'view' && value === 'list')
    if (value == null || value === '' || isDefault) next.delete(key)
    else next.set(key, value)
    if (key === 'id') next.delete('tab')
    setParams(next, { replace })
  }

  const channelsPresent = useMemo(() => new Set(items.map((i) => i.channel)), [items])
  const needsCount = items.filter((i) => i.needsAction).length
  const filterOptions: [Filter, string][] = [
    ['all', 'الكل'],
    ['needs', 'تحتاج تدخل'],
    ...((mode === 'calls' ? channelsPresent.has('phone') : showVoice) ? [['phone', 'مكالمات'] as [Filter, string]] : []),
    ...((mode === 'all' || channelsPresent.has('whatsapp')) ? [['whatsapp', 'واتساب'] as [Filter, string]] : []),
    ...((mode === 'all' || channelsPresent.has('web')) ? [['web', 'الموقع'] as [Filter, string]] : []),
  ]

  const hasVerdicts = useMemo(() => items.some((i) => i.verdict !== 'none'), [items])
  const evalOptions: [EvalFilter, string][] = [
    ['all', 'كل التقييمات'], ['success', VERDICT_LABEL.success], ['failure', VERDICT_LABEL.failure], ['none', 'بدون تقييم'],
  ]

  const tagOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>()
    for (const i of items) for (const t of i.tags) {
      const e = map.get(t.id)
      if (e) e.count += 1; else map.set(t.id, { ...t, count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [items])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qPhone = /^[\d\s+()-]{6,}$/.test(q) ? normalizePhone(q) : ''
    return items.filter((i) => {
      if (filter === 'needs' && !i.needsAction) return false
      if (filter !== 'all' && filter !== 'needs' && i.channel !== filter) return false
      if (tagFilter !== 'all' && !i.tags.some((t) => t.id === tagFilter)) return false
      if (evalFilter === 'success' || evalFilter === 'failure') { if (i.verdict !== evalFilter) return false }
      else if (evalFilter === 'none' && (i.verdict === 'success' || i.verdict === 'failure')) return false
      if (q && !i.haystack.includes(q) && !(qPhone && i.haystack.includes(qPhone))) return false
      return true
    })
  }, [items, filter, evalFilter, tagFilter, search])

  function open(item: ConvItem) { setParam('id', item.key) }

  function handleExport() {
    const rows = filtered.filter((i) => i.call).map((i) => i.call!)
    if (rows.length === 0) { pushToast({ kind: 'info', title: 'لا توجد بيانات للتصدير' }); return }
    exportRowsToExcel('سجل-المكالمات', [{
      name: 'المكالمات',
      rows: rows.map((c) => ({
        العميل: c.patient_name || '', الهاتف: c.phone, القناة: CHANNEL_LABEL[c.channel || 'phone'],
        الوقت: new Date(c.call_time).toLocaleString('ar-SA'), 'المدة (ث)': c.duration_seconds,
        النية: aiCallIntentLabel(c.intent), النتيجة: aiCallResultLabel(c.result),
        'تحتاج مراجعة': c.needs_review ? 'نعم' : 'لا', 'سبب المراجعة': c.review_reason || '', الملخص: c.summary || '',
      })),
    }])
    pushToast({ kind: 'success', title: 'تم تصدير السجل' })
  }

  // ─── detail ───
  if (openId) {
    const item = items.find((i) => i.key === openId)
    // Step through the same list the person came from (filters and search stay in the URL).
    const seq = filtered.some((i) => i.key === openId) ? filtered : items
    const pos = seq.findIndex((i) => i.key === openId)
    const back = (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="nx-link" onClick={() => setParam('id', null)}>
          <ChevronRight size={16} /> {mode === 'calls' ? 'سجل المكالمات' : 'المحادثات'}
        </button>
        {pos >= 0 && seq.length > 1 && (
          <span className="ax-pager">
            <button type="button" className="nx-icon-btn" aria-label="المحادثة السابقة" title="السابقة" disabled={pos === 0}
              onClick={() => setParam('id', seq[pos - 1].key, true)}><ChevronUp size={15} /></button>
            <span className="nx-num">{pos + 1} / {seq.length}</span>
            <button type="button" className="nx-icon-btn" aria-label="المحادثة التالية" title="التالية" disabled={pos === seq.length - 1}
              onClick={() => setParam('id', seq[pos + 1].key, true)}><ChevronDown size={15} /></button>
          </span>
        )}
      </div>
    )
    if (!item) {
      return (
        <div className="nx-page">
          {back}
          {loading ? <DetailSkeleton /> : (
            <div className="nx-card"><div className="nx-empty">ما لقينا هذه المحادثة. يمكن انحذفت أو أقدم من آخر 100 سجل.</div></div>
          )}
        </div>
      )
    }
    return (
      <div className="nx-page">
        {back}
        <ConversationDetail
          item={item} isDemo={isDemo} showTickets={showTickets} tickets={tickets || []}
          onTicket={(path) => navigate(`${base}/tickets${path}`)}
          tab={(params.get('tab') as DetailTab) || null} onTab={(t) => setParam('tab', t, true)}
        />
      </div>
    )
  }

  // ─── list ───
  const title = mode === 'calls' ? 'سجل المكالمات' : 'المحادثات'
  const subtitle = mode === 'calls'
    ? 'كل مكالمة رد عليها الموظف الذكي، بالنص والملخص والنتيجة'
    : `كل اللي رد عليه الموظف الذكي، ${showVoice ? 'مكالمات وواتساب وموقع' : 'واتساب وموقع'} في مكان واحد`

  return (
    <div className="nx-page">
      <div className="nx-head">
        <div>
          <h1 className="nx-h1">{title}</h1>
          <p className="nx-h1-sub">{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="nx-seg" role="group" aria-label="طريقة العرض">
            <button type="button" aria-pressed={view === 'list'} onClick={() => setParam('view', 'list', true)}><List size={13} /> قائمة</button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setParam('view', 'table', true)}><Table2 size={13} /> جدول</button>
          </div>
          {mode === 'calls' && (
            <button type="button" className="nx-btn" onClick={handleExport}><Download /> تصدير Excel</button>
          )}
        </div>
      </div>

      <Dialog open={tagsOpen} title="إدارة الوسوم" onClose={() => setTagsOpen(false)}>
        <TagManager />
      </Dialog>

      <div className="nx-filters">
        <div className="nx-seg" role="group" aria-label="تصفية">
          {filterOptions.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setParam('filter', k); setLimit(PAGE) }}>
              {k === 'phone' && <Phone size={13} />}
              {k === 'whatsapp' && <MessageCircle size={13} />}
              {k === 'web' && <Globe size={13} />}
              {l}
              {k === 'needs' && needsCount > 0 && <span className="nx-count nx-num">{needsCount}</span>}
            </button>
          ))}
        </div>
        <button type="button" className="nx-btn" onClick={() => setTagsOpen(true)}>إدارة الوسوم</button>
        {tagOptions.length > 0 && (
          <select
            className="nx-input" style={{ width: 'auto', minWidth: 130 }} aria-label="الوسم" value={tagFilter}
            onChange={(e) => { setParam('tag', e.target.value); setLimit(PAGE) }}
          >
            <option value="all">كل الوسوم</option>
            {tagOptions.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.count})</option>)}
          </select>
        )}
        {hasVerdicts && (
          <select
            className="nx-input" style={{ width: 'auto', minWidth: 140 }} aria-label="التقييم" value={evalFilter}
            onChange={(e) => { setParam('eval', e.target.value); setLimit(PAGE) }}
          >
            {evalOptions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        )}
        <label className="nx-search">
          <Search size={14} />
          <input
            className="nx-input" placeholder="ابحث بالاسم أو الرقم أو الموضوع" value={search} aria-label="بحث"
            onChange={(e) => { setParam('q', e.target.value, true); setLimit(PAGE) }}
          />
        </label>
      </div>

      <div className="nx-card">
        {loading && items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={46} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="nx-empty">
            <Inbox size={22} style={{ display: 'block', margin: '0 auto 6px' }} />
            {items.length === 0
              ? (mode === 'calls' ? 'ما فيه مكالمات بعد. أول ما يرد الموظف على مكالمة تظهر هنا.' : 'ما فيه محادثات بعد. أول ما يرد الموظف على عميل تظهر هنا.')
              : filter === 'needs' && !search ? 'كل شي تمام، ما فيه شي ينتظرك.' : 'ما فيه محادثات تطابق البحث.'}
          </div>
        ) : (
          <>
            {view === 'table'
              ? <ConvTable items={filtered.slice(0, limit)} onOpen={open} />
              : (
                <div className="nx-list">
                  {filtered.slice(0, limit).map((i) => <ConvRow key={i.key} item={i} onOpen={open} />)}
                </div>
              )}
            {filtered.length > limit && (
              <div className="nx-more">
                <button type="button" className="nx-btn sm" onClick={() => setLimit((l) => l + PAGE)}>
                  عرض المزيد ({filtered.length - limit})
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── detail view ──────────────────────────────────────────────────────────────

function ConversationDetail({ item, isDemo, showTickets, tickets, onTicket, tab, onTab }: {
  item: ConvItem
  isDemo: boolean
  showTickets: boolean
  tickets: SupportTicket[]
  onTicket: (path: string) => void
  tab: DetailTab | null
  onTab: (t: DetailTab) => void
}) {
  const pushToast = useToast()
  const [saving, setSaving] = useState(false)
  const call = item.call
  const [chipLabel, chipTone] = itemChip(item)
  const tabs: [DetailTab, string, ReactNode][] = call
    ? [['overview', 'نظرة عامة', <LayoutGrid key="o" size={14} />], ['transcript', item.channel === 'phone' ? 'نص المكالمة' : 'المحادثة', <ScrollText key="t" size={14} />], ['analysis', 'التحليل', <ClipboardCheck key="a" size={14} />]]
    : [['transcript', 'الرسائل', <ScrollText key="t" size={14} />], ['overview', 'نظرة عامة', <LayoutGrid key="o" size={14} />]]
  const active: DetailTab = tab && tabs.some(([k]) => k === tab) ? tab : tabs[0][0]

  async function copyPhone() {
    if (!item.phone) return
    const ok = await copyText(item.phone)
    pushToast(ok ? { kind: 'success', title: 'تم نسخ الرقم', description: item.phone } : { kind: 'danger', title: 'تعذّر النسخ', description: item.phone })
  }

  async function reviewed(c: AICallLog) {
    setSaving(true)
    try {
      await markCallReviewed(c, isDemo)
      pushToast({ kind: 'success', title: 'تم تعليمها كمراجَعة', description: isDemo ? 'عرض تجريبي: التغيير ما ينحفظ.' : undefined })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'ما قدرنا نحفظ المراجعة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const ticket = call ? tickets.find((t) => t.ai_call_id === call.id) : undefined
  const subParts = [
    item.call?.analysis?.title ? item.name : null,
    item.phone ? <span key="p" className="nx-num" dir="ltr">{item.phone}</span> : null,
    CHANNEL_LABEL[item.channel],
    fmtFull(item.time),
    call && call.duration_seconds > 0 ? `المدة ${fmtDuration(call.duration_seconds)}` : null,
  ].filter(Boolean)

  const fields: [string, string][] = call ? ([
    ['النية', aiCallIntentLabel(call.intent)],
    ['النتيجة', call.result ? aiCallResultLabel(call.result) : ''],
    ['الخدمة المطلوبة', call.service_requested || ''],
    ['المختص المطلوب', call.doctor_requested || ''],
    ['الموعد المفضّل', [call.preferred_date, call.preferred_time].filter(Boolean).join(' · ')],
    ['سبب المراجعة', call.needs_review || call.status !== 'completed' ? call.review_reason || '' : ''],
    ['المزوّد', call.provider ? PROVIDER_LABEL[call.provider] || call.provider : ''],
  ] as [string, string][]).filter(([, v]) => v) : ([
    ['القناة', 'واتساب'],
    ['عدد الرسائل', String(item.messages?.length || 0)],
    ['آخر رسالة', item.messages?.length ? MSG_TYPE_LABEL[item.messages[item.messages.length - 1].message_type] || '' : ''],
    ['سبب الفشل', item.messages?.find((m) => m.status === 'failed')?.failed_reason || ''],
  ] as [string, string][]).filter(([, v]) => v)

  const transcript = call ? (
    <>
      {!isDemo && call.provider === 'elevenlabs' && call.external_id && item.channel !== 'whatsapp' && call.analysis?.has_audio !== false && <RecordingPlayer callId={call.id} />}
      {call.transcript && call.transcript.length > 0 ? (
        <div className="nx-thread">
          <div className="ax-started">بدأت المحادثة عبر {CHANNEL_LABEL[item.channel]}</div>
          <span className="ax-day">{fmtDay(item.time)}</span>
          {call.transcript.map((m, i) => (
            <div key={i} className={`nx-msg ${m.speaker === 'agent' ? 'a' : 'c'}`}>
              <span className="nx-msg-who">{m.speaker === 'agent' ? 'الموظف الذكي' : item.name}</span>
              {m.text}
              {m.time && <small className="nx-num">{m.time}</small>}
            </div>
          ))}
        </div>
      ) : <div className="nx-empty">ما فيه نص محفوظ لهذه {item.channel === 'phone' ? 'المكالمة' : 'المحادثة'}.</div>}
    </>
  ) : (
    <div className="nx-thread">
      {(item.messages || []).map((m) => (
        <div key={m.id} className="nx-msg a">
          <span className="nx-msg-who">{MSG_TYPE_LABEL[m.message_type] || 'رسالة'}</span>
          {m.body}
          <small>{fmtFull(m.sent_at || m.created_at)} · {MSG_STATUS_LABEL[m.status]}</small>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="nx-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="nx-h1">{item.call?.analysis?.title ? item.title : item.name}</h1>
          <p className="nx-h1-sub">
            {subParts.map((p, i) => <span key={i}>{i > 0 && ' · '}{p}</span>)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {item.tags.length > 0 && <TagChips tags={item.tags} />}
          <Chip tone={chipTone}>{chipLabel}</Chip>
        </div>
      </div>

      <div className="nx-detail">
        <div className="nx-card">
          <div className="ax-tabs" role="tablist" aria-label="تفاصيل المحادثة">
            {tabs.map(([k, l, icon]) => (
              <button key={k} type="button" role="tab" aria-selected={active === k} onClick={() => onTab(k)}>{icon}{l}</button>
            ))}
          </div>
          {active === 'transcript' && transcript}
          {active === 'overview' && <ConversationOverview item={item} fields={fields} status={<Chip tone={chipTone}>{chipLabel}</Chip>} onCopy={copyText} />}
          {active === 'analysis' && call && <ConversationAnalysis call={call} />}
        </div>

        <div className="nx-stack">
          {call && <VerdictCard call={call} onAnalysis={() => onTab('analysis')} />}

          <div className="nx-card">
            <h3>الإجراءات</h3>
            <div className="nx-acts-col">
              {call && (call.needs_review || call.status === 'needs_review') && (
                <button type="button" className="nx-btn pri" disabled={saving} onClick={() => reviewed(call)}>
                  <CheckCircle2 /> {saving ? 'جارِ الحفظ…' : 'تم المراجعة'}
                </button>
              )}
              {call && showTickets && (
                ticket ? (
                  <button type="button" className="nx-btn" onClick={() => onTicket(`?ticket=${encodeURIComponent(ticket.id)}`)}>
                    <Ticket /> التذكرة: {ticket.subject}
                  </button>
                ) : (
                  <button type="button" className="nx-btn" onClick={() => onTicket(`?new=1&call=${encodeURIComponent(call.id)}`)}>
                    <Ticket /> افتح تذكرة
                  </button>
                )
              )}
              {item.phone && (
                <div className="nx-phone">
                  <ContactActions phone={item.phone} message={`مرحباً ${item.name !== item.phone ? item.name : ''}، نتواصل معك بخصوص تواصلك الأخير.`} size={30} />
                  <b>{item.phone}</b>
                  <button type="button" className="nx-icon-btn" aria-label="نسخ الرقم" title="نسخ الرقم" onClick={copyPhone}><Copy size={14} /></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="nx-detail">
      <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Sk h={18} w="40%" /><Sk h={54} w="70%" /><Sk h={54} w="60%" /><Sk h={54} w="75%" />
      </div>
      <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Sk h={18} w="30%" /><Sk h={14} /><Sk h={14} w="80%" /><Sk h={14} w="60%" />
      </div>
    </div>
  )
}
