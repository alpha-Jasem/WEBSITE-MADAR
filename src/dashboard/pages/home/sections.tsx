import type { ReactNode } from 'react'
import {
  Bot, Phone, PhoneOff, Users, Ticket, BarChart3, MessageSquare, Clock, Check, Copy, AlertTriangle, Sparkles, Settings, ListChecks,
} from 'lucide-react'
import type { AICallLog, SupportTicket } from '@/types/dashboard'
import type { UsageMetric } from '@/lib/clinicOSProduct'
import { type ConvItem, type ConvChannel, CHANNEL_LABEL, hourLabel } from '../conversations/model'
import { ConvRow, Chip, Sk } from '../conversations/ui'
import './night.css'

export type Period = 'today' | 'week' | 'month'
export const PERIOD_WORD: Record<Period, string> = { today: 'اليوم', week: 'هالأسبوع', month: 'هالشهر' }

const fmtN = (n: number) => n.toLocaleString('en')

// ─── alert banner ───────────────────────────────────────────────────────────

export interface HomeAlert { tone: 'warn' | 'bad'; title: string; text: string; action: string; onAction: () => void }

export function AlertBanner({ alert }: { alert: HomeAlert }) {
  return (
    <div className={`nx-alert ${alert.tone}`} role="status">
      <AlertTriangle size={20} />
      <p><b>{alert.title}</b> {alert.text}</p>
      <button type="button" className="nx-btn sm" onClick={alert.onAction}>{alert.action}</button>
    </div>
  )
}

// ─── agent card ─────────────────────────────────────────────────────────────

export function AgentCard({ status, statusTone, active, channels, stats, onCalls, onSettings }: {
  status: string
  statusTone: 'ok' | 'dim'
  active: boolean
  channels: ConvChannel[]
  stats: { value: string; label: string }[]
  onCalls: () => void
  onSettings: () => void
}) {
  return (
    <div className="nx-card nx-agent">
      <div className="nx-agent-top">
        <div className={`nx-orb ${active ? '' : 'off'}`}><Bot size={26} /></div>
        <div style={{ minWidth: 0 }}>
          <h4>موظف الاستقبال الذكي</h4>
          <span className="nx-status" style={{ color: statusTone === 'ok' ? 'var(--ok)' : 'var(--dim)' }}>{status}</span>
        </div>
        {channels.length > 0 && (
          <div className="nx-channels" aria-label="القنوات النشطة آخر 30 يوم">
            {channels.map((c) => <Chip key={c} tone="dim">{CHANNEL_LABEL[c]}</Chip>)}
          </div>
        )}
      </div>
      <div className="nx-stats3">
        {stats.map((s) => <div key={s.label} className="nx-stat"><b>{s.value}</b><span>{s.label}</span></div>)}
      </div>
      <div className="nx-agent-acts">
        <button type="button" className="nx-btn pri" onClick={onCalls}><Phone /> سجل المكالمات</button>
        <button type="button" className="nx-btn" onClick={onSettings}><Settings /> إعدادات الموظف</button>
      </div>
    </div>
  )
}

// ─── KPI tiles ──────────────────────────────────────────────────────────────

export interface KpiTile { label: string; value: string; note: string; trend?: 'up' | 'down' }

export function KpiTiles({ tiles, wide }: { tiles: KpiTile[]; wide?: boolean }) {
  return (
    <div className={`nx-kpis ${wide ? 'wide' : ''}`}>
      {tiles.map((k) => (
        <div key={k.label} className="nx-kpi">
          <span>{k.label}</span>
          <b>{k.value}</b>
          <i className={k.trend || ''}>{k.note}</i>
        </div>
      ))}
    </div>
  )
}

// ─── needs-your-action inbox ────────────────────────────────────────────────

export type InboxKind = 'human' | 'lost' | 'ticket'
export interface InboxEntry {
  key: string
  kind: InboxKind
  title: string
  sub: string
  call?: AICallLog
  ticket?: SupportTicket
  linkedTicket?: SupportTicket
}

const KIND: Record<InboxKind, [string, string, ReactNode]> = {
  human: ['var(--warn)', 'var(--warn-bg)', <Users size={17} />],
  lost: ['var(--bad)', 'var(--bad-bg)', <PhoneOff size={17} />],
  ticket: ['var(--info)', 'var(--info-bg)', <Ticket size={17} />],
}

export function NeedsAction({ entries, total, busyId, onOpenCall, onReviewed, onOpenTicket, onCopy, onViewAll }: {
  entries: InboxEntry[]
  total: number
  busyId: string | null
  onOpenCall: (call: AICallLog) => void
  onReviewed: (call: AICallLog) => void
  onOpenTicket: (ticket: SupportTicket) => void
  onCopy: (phone: string) => void
  onViewAll: () => void
}) {
  return (
    <div className="nx-card">
      <h3>
        <AlertTriangle size={17} style={{ color: 'var(--warn)' }} /> يحتاج تدخلك
        <span className="nx-aside">{total > 0 ? `${fmtN(total)} ${total === 1 ? 'شي' : 'أشياء'} · الأهم أولًا` : ''}</span>
      </h3>
      {entries.length === 0 ? (
        <div className="nx-empty">
          <Check size={22} style={{ color: 'var(--ok)', display: 'block', margin: '0 auto 6px' }} />
          كل شي تمام، ما فيه شي ينتظرك.
        </div>
      ) : (
        <div className="nx-inbox">
          {entries.map((it) => {
            const [fg, bg, icon] = KIND[it.kind]
            return (
              <div key={it.key} className="nx-item">
                <div className="nx-dot" style={{ background: bg, color: fg }}>{icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p>{it.title}</p>
                  <small>{it.sub}</small>
                </div>
                <div className="nx-acts">
                  {it.kind === 'ticket' && it.ticket && (
                    <button type="button" className="nx-btn sm ghost" onClick={() => onOpenTicket(it.ticket!)}>افتح التذكرة</button>
                  )}
                  {it.kind === 'human' && it.call && (
                    <>
                      <button type="button" className="nx-btn sm ghost" onClick={() => onOpenCall(it.call!)}>افتح المحادثة</button>
                      {it.linkedTicket && (
                        <button type="button" className="nx-btn sm" onClick={() => onOpenTicket(it.linkedTicket!)}><Ticket /> التذكرة</button>
                      )}
                      <button type="button" className="nx-btn sm" disabled={busyId === it.call.id} onClick={() => onReviewed(it.call!)}>
                        {busyId === it.call.id ? '…' : 'تم'}
                      </button>
                    </>
                  )}
                  {it.kind === 'lost' && it.call && (
                    <>
                      {it.call.phone && (
                        <>
                          <a className="nx-btn sm ghost" href={`tel:${it.call.phone}`}><Phone /> <span dir="ltr" className="nx-num">{it.call.phone}</span></a>
                          <button type="button" className="nx-icon-btn" aria-label="نسخ الرقم" title="نسخ الرقم" onClick={() => onCopy(it.call!.phone)}><Copy size={14} /></button>
                        </>
                      )}
                      <button type="button" className="nx-btn sm" onClick={() => onOpenCall(it.call!)}>التفاصيل</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          {total > entries.length && (
            <button type="button" className="nx-link" style={{ alignSelf: 'flex-start', fontSize: 13 }} onClick={onViewAll}>
              عرض الكل ({fmtN(total)})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── hourly chart ───────────────────────────────────────────────────────────

export function HourlyChart({ title, counts, startHour }: { title: string; counts: number[]; startHour: number }) {
  const peak = Math.max(0, ...counts)
  const peakHour = peak > 0 ? startHour + counts.indexOf(peak) : null
  return (
    <div className="nx-card nx-chart">
      <h3>
        <BarChart3 size={17} style={{ color: 'var(--sky)' }} /> {title}
        <span className="nx-aside">{peakHour != null ? `اليوم · الأزحم ${hourLabel(peakHour)}` : 'ما فيه نشاط اليوم للحين'}</span>
      </h3>
      <div className="nx-bars" role="img" aria-label={`${title}: توزيع اليوم بالساعة`}>
        {counts.map((v, i) => {
          const h = startHour + i
          return (
            <div key={h} className={`nx-bar ${v > 0 && v === peak ? 'peak' : ''}`} title={`${hourLabel(h)}: ${v}`}>
              {v > 0 ? <b>{v}</b> : null}
              <span className={v ? '' : 'zero'} style={{ height: v ? `${Math.max(6, Math.round((v / peak) * 100) - 14)}%` : 3 }} />
              <small>{i % 2 === 0 ? hourLabel(h) : ' '}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── recent conversations ───────────────────────────────────────────────────

export function RecentConversations({ items, onOpen, onViewAll }: { items: ConvItem[]; onOpen: (i: ConvItem) => void; onViewAll: () => void }) {
  return (
    <div className="nx-card nx-span-2">
      <h3>
        <MessageSquare size={17} style={{ color: 'var(--sky)' }} /> آخر المحادثات
        <span className="nx-aside"><button type="button" className="nx-link" onClick={onViewAll}>عرض الكل</button></span>
      </h3>
      {items.length === 0
        ? <div className="nx-empty">ما فيه محادثات بعد.</div>
        : <div className="nx-list">{items.map((i) => <ConvRow key={i.key} item={i} onOpen={onOpen} />)}</div>}
    </div>
  )
}

// ─── tickets mini card ──────────────────────────────────────────────────────

export function TicketsMini({ open, inProgress, urgent, onViewAll }: { open: number; inProgress: number; urgent: number; onViewAll: () => void }) {
  return (
    <div className="nx-card">
      <h3>
        <Ticket size={17} style={{ color: 'var(--sky)' }} /> التذاكر
        <span className="nx-aside"><button type="button" className="nx-link" onClick={onViewAll}>عرض الكل</button></span>
      </h3>
      <div className="nx-mini-stats">
        <div className="nx-stat"><b>{fmtN(open)}</b><span>مفتوحة</span></div>
        <div className="nx-stat"><b>{fmtN(inProgress)}</b><span>قيد المعالجة</span></div>
        <div className="nx-stat"><b style={{ color: urgent > 0 ? 'var(--bad)' : undefined }}>{fmtN(urgent)}</b><span>أولوية عالية</span></div>
      </div>
    </div>
  )
}

// ─── plan usage ─────────────────────────────────────────────────────────────

export function PlanCard({ metrics, renewsOn, onDetails }: { metrics: UsageMetric[]; renewsOn: string | null; onDetails: () => void }) {
  return (
    <div className="nx-card">
      <h3>
        <Clock size={17} style={{ color: 'var(--sky)' }} /> الباقة
        <span className="nx-aside">{renewsOn ? `تتجدد ${renewsOn}` : <button type="button" className="nx-link" onClick={onDetails}>التفاصيل</button>}</span>
      </h3>
      {metrics.length === 0 ? (
        <div className="nx-empty" style={{ padding: '6px 0' }}>
          ما فيه باقة فعّالة على الحساب.{' '}
          <button type="button" className="nx-link" onClick={onDetails}>تفاصيل الباقة</button>
        </div>
      ) : (
        <div className="nx-usage">
          {metrics.map((m) => {
            const pct = m.limit > 0 ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0
            return (
              <div key={m.key}>
                <div className="nx-usage-row"><span>{m.label}</span><b className="nx-num" dir="ltr">{fmtN(m.used)} / {fmtN(m.limit)}</b></div>
                <div className={`nx-meter ${pct >= 90 ? 'hot' : ''}`}><i style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── onboarding (brand-new account) ─────────────────────────────────────────

export interface OnboardStep { title: string; sub: string; action: string; done: boolean; onClick: () => void }

export function Onboarding({ greeting, sub, steps, bookingsWord }: { greeting: string; sub: string; steps: OnboardStep[]; bookingsWord: string }) {
  const done = steps.filter((s) => s.done).length
  const firstOpen = steps.findIndex((s) => !s.done)
  return (
    <div className="nx-page">
      <div className="nx-head">
        <div><h1 className="nx-h1">{greeting}</h1><p className="nx-h1-sub">{sub}</p></div>
      </div>
      <div className="nx-onboard">
        <div className="nx-card">
          <h3><Sparkles size={17} style={{ color: 'var(--ai)' }} /> جهّز موظفك الذكي <span className="nx-aside nx-num">{done} من {steps.length}</span></h3>
          <div className="nx-meter" style={{ margin: '-4px 0 16px' }}><i style={{ width: `${Math.round((done / steps.length) * 100)}%` }} /></div>
          <div className="nx-steps">
            {steps.map((s, i) => (
              <div key={s.title} className={`nx-step ${s.done ? 'done' : ''}`}>
                <span className="nx-n">{s.done ? <Check size={16} /> : i + 1}</span>
                <div style={{ minWidth: 0 }}><p>{s.title}</p><small>{s.sub}</small></div>
                {s.done
                  ? <Chip tone="ok">تم</Chip>
                  : <button type="button" className={`nx-btn sm ${i === firstOpen ? 'pri' : ''}`} onClick={s.onClick}>{s.action}</button>}
              </div>
            ))}
          </div>
        </div>
        <div className="nx-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <div className="nx-orb off" style={{ margin: '0 auto', width: 72, height: 72 }}><ListChecks size={32} /></div>
          <h3 style={{ justifyContent: 'center', margin: 0 }}>هنا بتشوف شغل موظفك</h3>
          <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.7 }}>
            أول ما يبدأ يرد، تظهر هنا المكالمات والمحادثات و{bookingsWord} اللي سجّلها، والأشياء اللي تحتاج تدخلك.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── loading skeleton ───────────────────────────────────────────────────────

export function HomeSkeleton() {
  return (
    <div className="nx-page" aria-busy="true" aria-label="جارِ التحميل">
      <div className="nx-head">
        <div style={{ width: 280, maxWidth: '100%' }}><Sk h={28} /><div style={{ height: 8 }} /><Sk h={14} w="70%" /></div>
        <Sk h={38} w={220} />
      </div>
      <div className="nx-grid-2">
        <div className="nx-card"><Sk h={60} w="60%" /><div style={{ height: 16 }} /><Sk h={80} /></div>
        <div className="nx-kpis"><Sk h={96} /><Sk h={96} /><Sk h={96} /><Sk h={96} /></div>
      </div>
      <div className="nx-grid-2">
        <div className="nx-card"><Sk h={18} w="40%" /><div style={{ height: 14 }} /><Sk h={54} /><div style={{ height: 8 }} /><Sk h={54} /><div style={{ height: 8 }} /><Sk h={54} /></div>
        <div className="nx-card"><Sk h={18} w="40%" /><div style={{ height: 14 }} /><Sk h={160} /></div>
      </div>
    </div>
  )
}
