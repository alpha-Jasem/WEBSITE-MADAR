import { useMemo, useState } from 'react'
import { Columns3 } from 'lucide-react'
import { VERDICT_LABEL, verdictTone, sentimentKind, SENTIMENT_LABEL, sentimentTone } from '@/lib/callAnalysis'
import { NightStyles } from '../shared/night'
import { SortTh, nextSort, type SortDir } from '../analytics/ui'
import { CHANNEL_LABEL, fmtDuration, fmtWhen, type ConvItem } from './model'
import { Chip, ChannelIcon, TagChips } from './ui'

type Key = 'title' | 'time' | 'duration' | 'messages'
type Col = 'tags' | 'channel' | 'time' | 'duration' | 'messages' | 'verdict' | 'sentiment'

const COLS: [Col, string][] = [
  ['tags', 'الوسوم'], ['channel', 'القناة'], ['time', 'التاريخ'], ['duration', 'المدة'], ['messages', 'الرسائل'], ['verdict', 'التقييم'], ['sentiment', 'المشاعر'],
]
const COLS_KEY = 'conv_table_hidden_cols'

function readHidden(): Col[] {
  try { const v = JSON.parse(localStorage.getItem(COLS_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}

/** The conversation list as a sortable table: one row per conversation with its verdict and mood. */
export function ConvTable({ items, onOpen }: { items: ConvItem[]; onOpen: (i: ConvItem) => void }) {
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>({ key: 'time', dir: 'desc' })
  const [hidden, setHidden] = useState<Col[]>(readHidden)
  const show = (c: Col) => !hidden.includes(c)
  function toggleCol(c: Col) {
    const next = hidden.includes(c) ? hidden.filter((x) => x !== c) : [...hidden, c]
    setHidden(next)
    try { localStorage.setItem(COLS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  }
  const rows = useMemo(() => {
    const m = sort.dir === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      switch (sort.key) {
        case 'title': return m * a.title.localeCompare(b.title, 'ar')
        case 'duration': return m * ((a.call?.duration_seconds || 0) - (b.call?.duration_seconds || 0))
        case 'messages': return m * (a.messageCount - b.messageCount)
        default: return m * (new Date(a.time).getTime() - new Date(b.time).getTime())
      }
    })
  }, [items, sort])
  const onSort = (k: Key) => setSort((s) => nextSort(s, k))

  return (
    <>
    <NightStyles />
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
      <details className="ax-cols">
        <summary className="nx-btn sm"><Columns3 /> تخصيص الجدول</summary>
        <div className="ax-cols-menu" role="group" aria-label="الأعمدة الظاهرة">
          {COLS.map(([c, l]) => (
            <label key={c}><input type="checkbox" checked={show(c)} onChange={() => toggleCol(c)} /> {l}</label>
          ))}
        </div>
      </details>
    </div>
    <div className="np-table-wrap">
      <table className="np-table" style={{ minWidth: 300 + (COLS.length - hidden.length) * 80 }}>
        <thead>
          <tr>
            <SortTh k="title" label="العنوان" sort={sort} onSort={onSort} />
            {show('tags') && <th>الوسوم</th>}
            {show('channel') && <th>القناة</th>}
            {show('time') && <SortTh k="time" label="التاريخ" sort={sort} onSort={onSort} />}
            {show('duration') && <SortTh k="duration" label="المدة" sort={sort} onSort={onSort} />}
            {show('messages') && <SortTh k="messages" label="الرسائل" sort={sort} onSort={onSort} />}
            {show('verdict') && <th>التقييم</th>}
            {show('sentiment') && <th>المشاعر</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const mood = i.call ? sentimentKind(i.call) : null
            return (
              <tr key={i.key} className="clickable" tabIndex={0} onClick={() => onOpen(i)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(i) }}>
                <td style={{ maxWidth: 300 }}>
                  <span className="ax-title-cell" style={{ display: 'block' }} title={i.title}>{i.title}</span>
                  <span className="ax-sub">{i.name}</span>
                </td>
                {show('tags') && <td>{i.tags.length ? <TagChips tags={i.tags} /> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>}
                {show('channel') && (
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      <ChannelIcon channel={i.channel} size={13} />{CHANNEL_LABEL[i.channel]}
                    </span>
                  </td>
                )}
                {show('time') && <td style={{ whiteSpace: 'nowrap' }}>{fmtWhen(i.time)}</td>}
                {show('duration') && <td className="nx-num">{i.call && i.call.duration_seconds > 0 ? fmtDuration(i.call.duration_seconds) : '—'}</td>}
                {show('messages') && <td className="nx-num">{i.messageCount || '—'}</td>}
                {show('verdict') && <td>{i.verdict === 'none' ? <span style={{ color: 'var(--dim)' }}>—</span> : <Chip tone={verdictTone(i.verdict)}>{VERDICT_LABEL[i.verdict]}</Chip>}</td>}
                {show('sentiment') && <td>{mood ? <Chip tone={sentimentTone(mood)}>{SENTIMENT_LABEL[mood]}</Chip> : <span style={{ color: 'var(--dim)' }}>—</span>}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}
