import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Search, CheckCircle2, Ticket, Copy, Sparkles, Download, Phone, MessageCircle, Globe, Inbox } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useSupportTickets } from '@/lib/dashboardQueries'
import { useConversationData, markCallReviewed } from '@/lib/queries/conversations'
import { aiCallIntentLabel, aiCallResultLabel } from '@/lib/aiCallLabels'
import { exportRowsToExcel } from '@/lib/exportExcel'
import { useToast, ContactActions } from '@/dashboard/components/uiExtras'
import type { AICallLog, SupportTicket } from '@/types/dashboard'
import {
  buildConversations, itemChip, fmtFull, fmtDuration, copyText, CHANNEL_LABEL, MSG_TYPE_LABEL, MSG_STATUS_LABEL,
  type ConvChannel, type ConvItem,
} from './model'
import { Chip, ChannelIcon, ConvRow, Sk } from './ui'

type Filter = 'all' | 'needs' | ConvChannel

const PAGE = 40
const PROVIDER_LABEL: Record<string, string> = { nabrah: 'نبرة', elevenlabs: 'ElevenLabs' }

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

  const items = useMemo(() => buildConversations(calls, messages, {
    includePhone: mode === 'calls' || showVoice,
    includeMessages: mode === 'all',
  }), [calls, messages, mode, showVoice])

  const openId = params.get('id')
  const filter = (params.get('filter') as Filter) || 'all'
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE)

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value == null || value === '' || (key === 'filter' && value === 'all')) next.delete(key)
    else next.set(key, value)
    setParams(next)
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (filter === 'needs' && !i.needsAction) return false
      if (filter !== 'all' && filter !== 'needs' && i.channel !== filter) return false
      if (q && !`${i.name} ${i.phone} ${i.summary}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, filter, search])

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
    const back = (
      <button type="button" className="nx-link" style={{ alignSelf: 'flex-start' }} onClick={() => setParam('id', null)}>
        <ChevronRight size={16} /> {mode === 'calls' ? 'سجل المكالمات' : 'المحادثات'}
      </button>
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
        {mode === 'calls' && (
          <button type="button" className="nx-btn" onClick={handleExport}><Download /> تصدير Excel</button>
        )}
      </div>

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
        <label className="nx-search">
          <Search size={14} />
          <input
            className="nx-input" placeholder="ابحث بالاسم أو الرقم" value={search} aria-label="بحث"
            onChange={(e) => { setSearch(e.target.value); setLimit(PAGE) }}
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
            <div className="nx-list">
              {filtered.slice(0, limit).map((i) => <ConvRow key={i.key} item={i} onOpen={open} />)}
            </div>
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

function ConversationDetail({ item, isDemo, showTickets, tickets, onTicket }: {
  item: ConvItem
  isDemo: boolean
  showTickets: boolean
  tickets: SupportTicket[]
  onTicket: (path: string) => void
}) {
  const pushToast = useToast()
  const [saving, setSaving] = useState(false)
  const call = item.call
  const [chipLabel, chipTone] = itemChip(item)

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
    item.phone ? <span key="p" className="nx-num" dir="ltr">{item.phone}</span> : null,
    CHANNEL_LABEL[item.channel],
    fmtFull(item.time),
    call && call.duration_seconds > 0 ? `المدة ${fmtDuration(call.duration_seconds)}` : null,
  ].filter(Boolean)

  const fields: [string, string][] = call ? ([
    ['القناة', CHANNEL_LABEL[item.channel]],
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

  return (
    <>
      <div className="nx-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="nx-h1">{item.name}</h1>
          <p className="nx-h1-sub">
            {subParts.map((p, i) => <span key={i}>{i > 0 && ' · '}{p}</span>)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip tone={chipTone}>{chipLabel}</Chip>
        </div>
      </div>

      <div className="nx-detail">
        <div className="nx-card">
          <h3><ChannelIcon channel={item.channel} size={14} /> {call ? (item.channel === 'phone' ? 'نص المكالمة' : 'المحادثة') : 'رسائل واتساب'}</h3>
          {/* No recording URL is stored for calls yet, so there is no audio player. */}
          {call ? (
            call.transcript && call.transcript.length > 0 ? (
              <div className="nx-thread">
                {call.transcript.map((m, i) => (
                  <div key={i} className={`nx-msg ${m.speaker === 'agent' ? 'a' : 'c'}`}>
                    <span className="nx-msg-who">{m.speaker === 'agent' ? 'الموظف الذكي' : item.name}</span>
                    {m.text}
                    {m.time && <small className="nx-num">{m.time}</small>}
                  </div>
                ))}
              </div>
            ) : <div className="nx-empty">ما فيه نص محفوظ لهذه {item.channel === 'phone' ? 'المكالمة' : 'المحادثة'}.</div>
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
          )}
        </div>

        <div className="nx-stack">
          <div className="nx-card">
            <h3><Sparkles size={16} style={{ color: 'var(--ai)' }} /> الملخص</h3>
            {call?.summary && <p style={{ margin: '0 0 14px', lineHeight: 1.7 }}>{call.summary}</p>}
            {fields.length > 0 ? (
              <dl className="nx-kv">
                {fields.map(([k, v]) => <FieldRow key={k} k={k} v={v} />)}
              </dl>
            ) : !call?.summary && <div className="nx-empty">ما فيه تفاصيل مستخرجة.</div>}
          </div>

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

function FieldRow({ k, v }: { k: string; v: string }) {
  return <><dt>{k}</dt><dd>{v}</dd></>
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
