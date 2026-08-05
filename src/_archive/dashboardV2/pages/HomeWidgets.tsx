import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  PhoneCall, CalendarCheck2, MessageSquare, Bell, Ticket, Plus, ArrowLeft,
  PhoneOff, Sparkles,
} from 'lucide-react'
import { Card, Badge, Button } from '@/_archive/dashboardV2/components/primitives'
import { Tooltip, CountUp } from '@/_archive/dashboardV2/components/uiExtras'
import type { AICallLog, Appointment, ClinicNotification, Integration, MessageLog, SupportTicket, TicketPriority } from '@/types/clinicOS'

// ─── shared helpers ─────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} د`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `منذ ${hours} س`
  const days = Math.round(hours / 24)
  return `منذ ${days} ي`
}

function isSameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate()
}

function EmptyRow({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', padding: '14px 0', textAlign: 'center' }}>{text}</div>
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{children}</div>
      {action}
    </div>
  )
}

// ─── Donut (moved from Home.tsx — now shared by booking-sources + AI performance) ──

export function Donut({ sources, onSelect }: { sources: { key: string; label: string; pct: number; color: string }[]; onSelect?: (key: string) => void }) {
  let acc = 0
  const stops = sources.map((s) => {
    const start = acc
    acc += s.pct
    return `${s.color} ${start}% ${acc}%`
  }).join(',')
  const total = sources.reduce((a, s) => a + s.pct, 0)

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onSelect || total === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
    const pct = (angle / 360) * 100
    let acc2 = 0
    for (const s of sources) {
      acc2 += s.pct
      if (pct <= acc2) { onSelect(s.key); return }
    }
  }

  return (
    <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto' }}>
      <div
        onClick={handleClick}
        style={{
          width: '100%', height: '100%', borderRadius: '50%', cursor: onSelect && total > 0 ? 'pointer' : 'default',
          background: total > 0 ? `conic-gradient(${stops})` : 'var(--slate-100)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 22, background: 'var(--surface-card)', borderRadius: '50%', pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}><CountUp value={total} suffix="%" /></div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>موزّعة</div>
      </div>
    </div>
  )
}

// ─── RadialDial — single-metric gauge with a dotted tick track ─────────────

export function RadialDial({ pct, sublabel }: { pct: number; sublabel?: string }) {
  const size = 104, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  const dash = (clamped / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border-default)" strokeWidth={1.5} strokeDasharray="1 7" fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke="var(--brand-500)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c - dash}` }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.9 }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 21, color: 'var(--text-primary)' }}><CountUp value={pct} suffix="%" /></div>
        {sublabel && <div style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

// ─── AgentHeroCard — real today's stats + real last call, no fake live call ─

export function AgentHeroCard({ todayCalls, todayBookings, escalatedToday, lastCall }: {
  todayCalls: number
  todayBookings: number
  escalatedToday: number
  lastCall: AICallLog | null
}) {
  const RESULT_LABEL: Record<string, string> = {
    booked: 'انتهت بحجز موعد', needs_review: 'تحتاج مراجعة بشرية', no_slot: 'لا يوجد موعد متاح',
    cancelled: 'أُلغيت', failed: 'فشلت', transferred: 'حُوّلت لموظف',
  }
  return (
    <Card glow style={{ position: 'relative', overflow: 'hidden', padding: 'var(--space-6)' }}>
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.65, 0.25] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px var(--brand-300), inset 0 0 32px -12px var(--brand-400)',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Sparkles size={19} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>الوكيل الصوتي — مها</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>ElevenLabs AI Agent</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 'var(--radius-full)', background: 'var(--success-100)' }}>
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-500)' }}
          />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--success-500)' }}>يستمع دائمًا</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'مكالمات اليوم', value: todayCalls },
          { label: 'حجوزات اليوم', value: todayBookings },
          { label: 'تحويل لبشري', value: escalatedToday },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 22 }}><CountUp value={s.value} /></div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed var(--border-default)', paddingTop: 14 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8 }}>آخر مكالمة</div>
        {lastCall ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <PhoneCall size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastCall.patient_name || lastCall.phone}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{RESULT_LABEL[lastCall.result] || lastCall.result}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(lastCall.call_time)}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-tertiary)', fontSize: 12.5 }}>
            <PhoneOff size={15} /> لم تُسجَّل أي مكالمات بعد
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── AiPerformanceCard — real Donut from clinic_os_ai_calls.status, no confidence placeholder ──

export function AiPerformanceCard({ calls, delay = 0 }: { calls: AICallLog[]; delay?: number }) {
  const total = calls.length
  const solved = calls.filter((c) => c.status === 'completed' && !c.needs_review).length
  const needsHuman = calls.filter((c) => c.needs_review || c.status === 'needs_review').length
  const failed = calls.filter((c) => c.status === 'failed').length

  const sources = total > 0 ? [
    { key: 'solved', label: 'حلّها الذكاء الاصطناعي', pct: Math.round((solved / total) * 100), color: 'var(--success-500)' },
    { key: 'human', label: 'تحتاج بشري', pct: Math.round((needsHuman / total) * 100), color: 'var(--warning-500)' },
    { key: 'failed', label: 'فشلت', pct: Math.round((failed / total) * 100), color: 'var(--danger-500)' },
  ].filter((s) => s.pct > 0) : []

  return (
    <Card delay={delay}>
      <SectionTitle action={<Badge tone="brand">AI</Badge>}>أداء الذكاء الاصطناعي</SectionTitle>
      {total === 0 ? <EmptyRow text="لا توجد مكالمات بعد" /> : (
        <>
          <Donut sources={sources} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {sources.map((s) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ fontWeight: 600 }}><CountUp value={s.pct} suffix="%" /></span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ─── TodayTimeline — real hourly bucket of today's appointments ────────────

export function TodayTimeline({ appointments, delay = 0 }: { appointments: Appointment[]; delay?: number }) {
  const todayStr = new Date().toISOString().split('T')[0]
  const todays = useMemo(() => appointments.filter((a) => a.appointment_date === todayStr), [appointments, todayStr])
  const hours = Array.from({ length: 13 }, (_, i) => 8 + i)
  const counts = hours.map((h) => todays.filter((a) => parseInt(a.start_time.split(':')[0], 10) === h).length)
  const max = Math.max(1, ...counts)

  return (
    // Column layout so the hour bars absorb whatever height the row's tallest card sets,
    // instead of leaving dead space under a fixed 44px strip.
    <Card delay={delay} style={{ display: 'flex', flexDirection: 'column' }}>
      <SectionTitle>الجدول الزمني لليوم</SectionTitle>
      {todays.length === 0 ? <EmptyRow text="لا توجد مواعيد اليوم بعد" /> : (
        <>
          <div style={{ display: 'flex', gap: 4, flex: 1, minHeight: 44, alignItems: 'flex-end' }}>
            {hours.map((h, i) => (
              <Tooltip key={h} label={`${h}:00 — ${counts[i]} موعد`} style={{ flex: 1, height: '100%' }}>
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.6, delay: Math.min(delay, 0.5) + i * 0.025 }}
                  style={{
                    width: '100%', height: '100%', borderRadius: 5, transformOrigin: 'bottom',
                    background: counts[i] > 0
                      ? `color-mix(in srgb, var(--brand-500) ${Math.round((counts[i] / max) * 90) + 10}%, var(--surface-sunken))`
                      : 'var(--surface-sunken)',
                  }}
                />
              </Tooltip>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
            <span>8 ص</span><span>2 م</span><span>8 م</span>
          </div>
        </>
      )}
    </Card>
  )
}

// ─── SystemHealthRow — only the 5 real tracked integrations, no fake uptime ─

export function SystemHealthRow({ integrations, delay = 0 }: { integrations: Integration[]; delay?: number }) {
  return (
    <Card delay={delay}>
      <SectionTitle>التكاملات</SectionTitle>
      {integrations.length === 0 ? <EmptyRow text="لا توجد تكاملات بعد" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {integrations.map((i) => {
            const connected = i.status === 'connected'
            return (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--border-default)' }}>
                <span style={{
                  width: 30, height: 30, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: connected ? 'var(--success-100)' : 'var(--surface-sunken)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: connected ? 'var(--success-500)' : 'var(--slate-300)',
                  }} />
                </span>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 500 }}>{i.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: connected ? 'var(--success-500)' : 'var(--text-tertiary)' }}>
                  {connected ? 'متصل' : 'غير متصل'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─── ActivityFeed — real merge of notifications + calls + messages + appointments ──

export function ActivityFeed({ notifications, calls, messages, appointments, delay = 0 }: {
  notifications: ClinicNotification[]
  calls: AICallLog[]
  messages: MessageLog[]
  appointments: Appointment[]
  delay?: number
}) {
  const items = useMemo(() => {
    const arr: { id: string; icon: ReactNode; title: string; ts: number }[] = []
    notifications.slice(0, 8).forEach((n) => arr.push({ id: `n-${n.id}`, icon: <Bell size={14} />, title: n.title, ts: new Date(n.created_at).getTime() }))
    calls.slice(0, 8).forEach((c) => arr.push({ id: `c-${c.id}`, icon: <PhoneCall size={14} />, title: `مكالمة من ${c.patient_name || c.phone}`, ts: new Date(c.call_time).getTime() }))
    messages.slice(0, 8).forEach((m) => arr.push({ id: `m-${m.id}`, icon: <MessageSquare size={14} />, title: `رسالة واتساب إلى ${m.recipient_name}`, ts: new Date(m.created_at).getTime() }))
    appointments.slice(0, 8).forEach((a) => arr.push({ id: `a-${a.id}`, icon: <CalendarCheck2 size={14} />, title: `حجز ${a.patient_name} — ${a.service_name}`, ts: new Date(`${a.appointment_date}T${a.start_time}`).getTime() || 0 }))
    return arr.filter((x) => !Number.isNaN(x.ts)).sort((a, b) => b.ts - a.ts).slice(0, 9)
  }, [notifications, calls, messages, appointments])

  return (
    <Card delay={delay}>
      <SectionTitle>النشاط المباشر</SectionTitle>
      {items.length === 0 ? <EmptyRow text="لا يوجد نشاط بعد" /> : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: Math.min(delay, 0.5) + i * 0.03, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px dashed var(--border-default)' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-sunken)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {it.icon}
              </div>
              <div style={{ flex: 1, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(new Date(it.ts).toISOString())}</div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ─── InsightBanner — template sentence from real aggregates, not an LLM call ─

export function InsightBanner({ weeklyData, prevWeeklyData, topSource, delay = 0 }: {
  weeklyData: number[]
  prevWeeklyData: number[]
  topSource?: { label: string; pct: number }
  delay?: number
}) {
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
  const cur = sum(weeklyData), prev = sum(prevWeeklyData)
  if (prev === 0 || cur === 0) return null // not enough data for a meaningful comparison

  const pct = Math.round(((cur - prev) / prev) * 100)
  const trendWord = pct > 5 ? 'ارتفعت' : pct < -5 ? 'انخفضت' : 'استقرت تقريبًا'
  const parts = [pct > 5 || pct < -5 ? `الحجوزات ${trendWord} ${Math.abs(pct)}% مقارنة بالأسبوع اللي قبله.` : `الحجوزات ${trendWord} مقارنة بالأسبوع اللي قبله.`]
  if (topSource && topSource.pct > 0) parts.push(`أغلب الحجوزات جتك من ${topSource.label} (${topSource.pct}%).`)

  return (
    <Card delay={delay} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--brand-100)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <Sparkles size={16} />
      </motion.div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{parts.join(' ')}</div>
    </Card>
  )
}

// ─── TicketPreviewCard — real ai_agent_support_tickets, "عرض الكل" is a "قريبًا" toast ──

export function TicketPreviewCard({ tickets, onCreateClick, onViewAllClick, delay = 0 }: {
  tickets: SupportTicket[]
  onCreateClick: () => void
  onViewAllClick: () => void
  delay?: number
}) {
  const today = new Date()
  const open = tickets.filter((t) => t.status === 'open').length
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length
  const resolvedToday = tickets.filter((t) => t.status === 'resolved' && isSameDay(t.updated_at, today)).length
  const highPriority = tickets.filter((t) => t.priority === 'high' && t.status !== 'resolved').length
  const latest = tickets.slice(0, 3)

  const PRIORITY_TONE: Record<TicketPriority, 'danger' | 'warning' | 'neutral'> = { high: 'danger', normal: 'warning', low: 'neutral' }
  const PRIORITY_LABEL: Record<TicketPriority, string> = { high: 'عالية', normal: 'عادية', low: 'منخفضة' }

  return (
    <Card delay={delay}>
      <SectionTitle action={<Button size="sm" variant="ghost" onClick={onCreateClick}><Plus size={14} /> تذكرة جديدة</Button>}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ticket size={15} /> مركز التذاكر</span>
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'مفتوحة', value: open },
          { label: 'قيد المعالجة', value: inProgress },
          { label: 'حُلّت اليوم', value: resolvedToday },
          { label: 'أولوية عالية', value: highPriority },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--surface-sunken)', borderRadius: 'var(--radius-md)', padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-numeral)', fontWeight: 800, fontSize: 16 }}><CountUp value={s.value} /></div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {latest.length === 0 ? <EmptyRow text="لا توجد تذاكر بعد" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {latest.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px dashed var(--border-default)', fontSize: 12.5 }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
              <Badge tone={PRIORITY_TONE[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
              <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0 }}>{timeAgo(t.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      <div onClick={onViewAllClick} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--brand-600)', fontWeight: 600, cursor: 'pointer' }}>
        عرض الكل <ArrowLeft size={13} />
      </div>
    </Card>
  )
}
