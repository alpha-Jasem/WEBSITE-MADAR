import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useConversationData } from '@/lib/queries/conversations'
import {
  contactKey, contactName, collectedValue, sentimentKind, SENTIMENT_LABEL, sentimentTone, type SentimentKind,
} from '@/lib/callAnalysis'
import type { AICallChannel, AICallLog } from '@/types/dashboard'
import { NightPage, PageHead, EmptyLine, useIsNarrow } from './shared/night'
import { Chip, ChannelIcon, Sk } from './conversations/ui'
import { CHANNEL_LABEL, fmtWhen } from './conversations/model'
import { SortTh, nextSort, type SortDir } from './analytics/ui'
import './home/night.css'
import './analytics/analytics.css'

interface Contact {
  key: string
  name: string
  phone: string
  /** Platform user id, shown when there is no phone (web visitors). */
  userId: string
  last: string
  count: number
  sentiment: SentimentKind | null
  channels: AICallChannel[]
  lastCall: AICallLog
}

type SortKey = 'name' | 'last' | 'count'

function buildContacts(calls: AICallLog[]): Contact[] {
  const groups = new Map<string, AICallLog[]>()
  for (const c of calls) {
    const k = contactKey(c)
    const list = groups.get(k)
    if (list) list.push(c); else groups.set(k, [c])
  }
  const out: Contact[] = []
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => b.call_time.localeCompare(a.call_time))
    const latest = sorted[0]
    const name = sorted.map(contactName).find(Boolean) || ''
    const phone = sorted.map((c) => c.phone || collectedValue(c, 'contact_number', 'phone')).find(Boolean) || ''
    const userId = sorted.map((c) => c.analysis?.user_id || '').find(Boolean) || ''
    const sentiment = sorted.map(sentimentKind).find((s) => s != null) ?? null
    const channels = [...new Set(sorted.map((c) => c.channel || 'phone'))] as AICallChannel[]
    out.push({ key, name: name || phone || 'زائر بدون اسم', phone, userId, last: latest.call_time, count: list.length, sentiment, channels, lastCall: latest })
  }
  return out
}

/** People the agent has spoken with, grouped by platform user id or phone, newest first. */
export function DashboardV2AgentUsers() {
  const { companyId, isDemo } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/clinic-os/dashboard'
  const narrow = useIsNarrow()
  const { calls, callsLoading } = useConversationData(companyId, isDemo)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'last', dir: 'desc' })

  const contacts = useMemo(() => buildContacts(calls), [calls])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromT = from ? new Date(`${from}T00:00:00`).getTime() : null
    const toT = to ? new Date(`${to}T23:59:59`).getTime() : null
    const list = contacts.filter((c) => {
      if (q && !`${c.name} ${c.phone} ${c.key}`.toLowerCase().includes(q)) return false
      const t = new Date(c.last).getTime()
      if (fromT != null && t < fromT) return false
      if (toT != null && t > toT) return false
      return true
    })
    const m = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sort.key === 'name') return m * a.name.localeCompare(b.name, 'ar')
      if (sort.key === 'count') return m * (a.count - b.count) || b.last.localeCompare(a.last)
      return m * a.last.localeCompare(b.last)
    })
  }, [contacts, search, sort, from, to])

  function open(c: Contact) {
    const q = c.phone || c.userId || c.name
    navigate(`${base}/conversations?q=${encodeURIComponent(q)}`)
  }
  const onSort = (k: SortKey) => setSort((s) => nextSort(s, k))
  const returning = contacts.filter((c) => c.count > 1).length

  return (
    <NightPage>
      <PageHead
        title="العملاء من المحادثات"
        sub={contacts.length
          ? `${contacts.length} عميل تواصلوا مع الموظف الذكي${returning ? `، منهم ${returning} رجعوا أكثر من مرة` : ''}`
          : 'كل من تواصل مع الموظف الذكي، مجمّعين حسب الرقم'}
      />

      <div className="np-filters">
        <label className="nx-search">
          <Search size={14} />
          <input className="nx-input" placeholder="ابحث بالاسم أو الرقم" value={search} aria-label="بحث" onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="ax-date">
          <span>آخر تواصل من</span>
          <input type="date" className="nx-input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="ax-date">
          <span>إلى</span>
          <input type="date" className="nx-input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
        {(from || to) && <button type="button" className="nx-link" onClick={() => { setFrom(''); setTo('') }}>مسح التاريخ</button>}
      </div>

      <div className="nx-card">
        {callsLoading && calls.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{Array.from({ length: 6 }).map((_, i) => <Sk key={i} h={46} />)}</div>
        ) : rows.length === 0 ? (
          <EmptyLine>
            <Users size={22} style={{ display: 'block', margin: '0 auto 6px' }} />
            {contacts.length === 0 ? 'ما فيه عملاء بعد. أول ما يرد الموظف على أحد يظهر هنا.' : 'ما فيه عملاء يطابقون البحث.'}
          </EmptyLine>
        ) : narrow ? (
          <div className="nx-list">
            {rows.map((c) => (
              <button key={c.key} type="button" className="ax-user" onClick={() => open(c)}>
                <span className="ax-avatar" aria-hidden="true">{initial(c.name)}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.name}</b>
                  <small><span dir="ltr" className="nx-num">{c.phone || c.userId || '—'}</span> · {c.count} {c.count === 1 ? 'محادثة' : 'محادثات'}</small>
                </span>
                <span className="ax-end">
                  {c.sentiment ? <Chip tone={sentimentTone(c.sentiment)}>{SENTIMENT_LABEL[c.sentiment]}</Chip> : null}
                  <small style={{ color: 'var(--dim)' }}>{fmtWhen(c.last)}</small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="np-table-wrap">
            <table className="np-table">
              <thead>
                <tr>
                  <SortTh k="name" label="العميل" sort={sort} onSort={onSort} />
                  <th>الرقم / المعرّف</th>
                  <th>القنوات</th>
                  <SortTh k="last" label="آخر تواصل" sort={sort} onSort={onSort} />
                  <th>آخر مشاعر</th>
                  <SortTh k="count" label="المحادثات" sort={sort} onSort={onSort} />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.key} className="clickable" tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => { if (e.key === 'Enter') open(c) }}>
                    <td className="strong">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span className="ax-avatar" aria-hidden="true">{initial(c.name)}</span>{c.name}
                      </span>
                    </td>
                    <td><span dir="ltr" className="nx-num">{c.phone || c.userId || '—'}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 4 }} title={c.channels.map((ch) => CHANNEL_LABEL[ch]).join('، ')}>
                        {c.channels.map((ch) => <ChannelIcon key={ch} channel={ch} size={13} />)}
                      </span>
                    </td>
                    <td>{fmtWhen(c.last)}</td>
                    <td>{c.sentiment ? <Chip tone={sentimentTone(c.sentiment)}>{SENTIMENT_LABEL[c.sentiment]}</Chip> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>
                    <td className="nx-num strong">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </NightPage>
  )
}

function initial(name: string) {
  const ch = name.trim().replace(/^ال/, '').charAt(0)
  return /[0-9+]/.test(ch) || !ch ? '؟' : ch
}
