import { arReason } from './conversations/model'
import { SAUDI_TZ, saudiHour, saudiStartOfDay } from '@/lib/saudiTime'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useBookings, useIntegrations, useSupportTickets, useKnowledge } from '@/lib/dashboardQueries'
import { useConversationData, markCallReviewed } from '@/lib/queries/conversations'
import { useToast } from '@/dashboard/components/uiExtras'
import { bookingsLabel, isIntegrationVisible } from '@/dashboard/modules'
import type { AICallLog, SupportTicket } from '@/types/dashboard'
import {
  buildConversations, callChannel, callDisplayName, fmtWhen, copyText, CHANNEL_LABEL, type ConvChannel, type ConvItem,
} from './conversations/model'
import {
  AlertBanner, AgentCard, KpiTiles, NeedsAction, HourlyChart, RecentConversations, TicketsMini, PlanCard, Onboarding, HomeSkeleton,
  PERIOD_WORD, type Period, type HomeAlert, type KpiTile, type InboxEntry, type OnboardStep,
} from './home/sections'

const DAY = 86400000
const INBOX_LIMIT = 6
const LOCALE = 'ar-SA-u-ca-gregory-nu-latn'

function windowStart(period: Period, now: number): number {
  if (period === 'today') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime() }
  return now - (period === 'week' ? 7 : 30) * DAY
}

const ts = (iso?: string | null) => (iso ? new Date(iso).getTime() : NaN)
const inRange = (iso: string | undefined | null, from: number, to: number) => { const t = ts(iso); return t >= from && t < to }
const fmtN = (n: number) => n.toLocaleString('en')

/** "+12% عن الفترة السابقة" when there is a previous figure to compare with. */
function delta(cur: number, prev: number): Pick<KpiTile, 'note' | 'trend'> | null {
  if (prev <= 0) return null
  const pct = Math.round(((cur - prev) / prev) * 100)
  if (pct === 0) return { note: 'نفس الفترة السابقة' }
  return { note: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% عن الفترة السابقة`, trend: pct > 0 ? 'up' : 'down' }
}

function fmtMinutes(sec: number): string {
  const m = Math.round(sec / 60)
  if (m >= 60) return `${(m / 60).toFixed(m >= 600 ? 0 : 1)} ساعة`
  if (m === 1) return 'دقيقة'
  if (m === 2) return 'دقيقتين'
  if (m >= 3 && m <= 10) return `${m} دقائق`
  return `${m} دقيقة`
}

export function DashboardV2Home() {
  const {
    companyId, isDemo, companyName, userName, hasModule, businessType, usageMetrics, usageCycleEnd, accountLoading,
  } = useWorkspace()
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const go = (path: string) => navigate(`${base}/${path}`)

  const showBookings = hasModule('bookings')
  const showVoice = hasModule('voice')
  const showTickets = hasModule('tickets')
  const showConversations = hasModule('conversations')
  const [period, setPeriod] = useState<Period>('today')
  const [busyId, setBusyId] = useState<string | null>(null)

  const { calls, messages, callsLoading, messagesLoading } = useConversationData(companyId, isDemo)
  const { data: bookingsData, loading: bookingsLoading } = useBookings(showBookings ? companyId : null, undefined, isDemo && showBookings)
  const { data: ticketsData } = useSupportTickets(showTickets ? companyId : null, isDemo && showTickets)
  const { data: integrationsData } = useIntegrations(companyId, isDemo)
  const { data: knowledge } = useKnowledge(companyId, isDemo)

  const bookings = bookingsData || []
  const tickets = ticketsData || []
  const integrations = (integrationsData || []).filter((i) => isIntegrationVisible(i.provider, hasModule))

  // Phone calls belong to the voice module; chats the agent handled on WhatsApp or the
  // website show for everyone.
  const agentCalls = useMemo(() => calls.filter((c) => showVoice || callChannel(c) !== 'phone'), [calls, showVoice])
  const phoneCalls = useMemo(() => agentCalls.filter((c) => callChannel(c) === 'phone'), [agentCalls])

  // Re-read the clock whenever data or the period changes, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [period, calls, messages, bookingsData, ticketsData])
  const from = windowStart(period, now)
  const prevFrom = from - (now - from)

  const p = useMemo(() => {
    const pc = phoneCalls.filter((c) => inRange(c.call_time, from, now))
    const pcPrev = phoneCalls.filter((c) => inRange(c.call_time, prevFrom, from))
    const chatCalls = agentCalls.filter((c) => callChannel(c) !== 'phone')
    const chats = chatCalls.filter((c) => inRange(c.call_time, from, now)).length + messages.filter((m) => inRange(m.created_at, from, now)).length
    const msgs = messages.filter((m) => inRange(m.created_at, from, now))
    const msgsPrev = messages.filter((m) => inRange(m.created_at, prevFrom, from)).length
    const bk = bookings.filter((b) => inRange(b.created_at, from, now))
    const bkPrev = bookings.filter((b) => inRange(b.created_at, prevFrom, from)).length
    const resolved = pc.filter((c) => c.status === 'completed' && !c.needs_review && c.result !== 'referred' && c.result !== 'failed').length
    return {
      calls: pc, callsPrev: pcPrev.length, chats, msgs, msgsPrev, bookings: bk, bookingsPrev: bkPrev, resolved,
      talkSeconds: pc.reduce((a, c) => a + (c.duration_seconds || 0), 0),
      attention: pc.filter((c) => c.needs_review || c.status !== 'completed').length,
    }
  }, [phoneCalls, agentCalls, messages, bookings, from, prevFrom, now])

  const periodWord = PERIOD_WORD[period]
  const bookWord = bookingsLabel(businessType)

  // ─── needs your action ───
  const inbox = useMemo(() => {
    const ticketByCall = new Map<string, SupportTicket>()
    tickets.forEach((t) => { if (t.ai_call_id && t.status !== 'resolved') ticketByCall.set(t.ai_call_id, t) })
    const byNewest = (a: AICallLog, b: AICallLog) => ts(b.call_time) - ts(a.call_time)
    const sub = (c: AICallLog) => [c.summary, CHANNEL_LABEL[callChannel(c)], fmtWhen(c.call_time)].filter(Boolean).join(' · ')
    const entries: InboxEntry[] = []
    agentCalls.filter((c) => c.needs_review || c.status === 'needs_review').sort(byNewest).forEach((c) => {
      entries.push({
        key: `h:${c.id}`, kind: 'human', call: c, linkedTicket: ticketByCall.get(c.id),
        title: `${callDisplayName(c)}: ${arReason(c.review_reason) || 'تحتاج مراجعة من فريقك'}`, sub: sub(c),
      })
    })
    // Failed calls from the last two weeks: someone tried to reach you and the agent couldn't finish.
    agentCalls.filter((c) => c.status === 'failed' && !c.needs_review && ts(c.call_time) >= now - 14 * DAY).sort(byNewest).forEach((c) => {
      entries.push({ key: `l:${c.id}`, kind: 'lost', call: c, title: `${callDisplayName(c)}: ${arReason(c.review_reason) || 'مكالمة ما اكتملت'}`, sub: sub(c) })
    })
    const linked = new Set(entries.map((e) => e.linkedTicket?.id).filter(Boolean))
    // There is no assignee on tickets yet, so "unowned" means still open (not picked up).
    tickets
      .filter((t) => t.status === 'open' && !linked.has(t.id))
      .sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) || ts(b.created_at) - ts(a.created_at))
      .forEach((t) => {
        entries.push({
          key: `t:${t.id}`, kind: 'ticket', ticket: t, title: t.subject,
          sub: [t.priority === 'high' ? 'أولوية عالية' : null, 'تذكرة مفتوحة', fmtWhen(t.created_at)].filter(Boolean).join(' · '),
        })
      })
    return entries
  }, [agentCalls, tickets, now])

  // ─── hourly chart (today) ───
  const hourly = useMemo(() => {
    const start = saudiStartOfDay()
    const times = [...agentCalls.map((c) => c.call_time), ...messages.map((m) => m.created_at)]
    const hours = times.filter((t) => inRange(t, start, start + DAY)).map((t) => saudiHour(t))
    const lo = Math.min(8, ...hours)
    const hi = Math.max(20, ...hours)
    const counts = Array.from({ length: hi - lo + 1 }, () => 0)
    hours.forEach((h) => { counts[h - lo] += 1 })
    return { counts, startHour: lo }
  }, [agentCalls, messages])

  const recent = useMemo(
    () => buildConversations(agentCalls, messages, { includePhone: showVoice, includeMessages: true }).slice(0, 5),
    [agentCalls, messages, showVoice],
  )

  // ─── agent status (from real activity only) ───
  const lastActivity = useMemo(() => {
    const all = [...agentCalls.map((c) => c.call_time), ...messages.map((m) => m.created_at)].map(ts).filter((t) => !Number.isNaN(t))
    return all.length ? Math.max(...all) : null
  }, [agentCalls, messages])
  const activeChannels = useMemo(() => {
    const set = new Set<ConvChannel>()
    agentCalls.forEach((c) => { if (ts(c.call_time) >= now - 30 * DAY) set.add(callChannel(c)) })
    if (messages.some((m) => ts(m.created_at) >= now - 30 * DAY)) set.add('whatsapp')
    return (['phone', 'whatsapp', 'web'] as ConvChannel[]).filter((c) => set.has(c))
  }, [agentCalls, messages, now])

  const metricVisible = (m: { key: string; limit: number }) => m.limit > 0
    && (m.key !== 'smart_calls' || showVoice)
    && (m.key !== 'reminders' || hasModule('reminders'))
    && (m.key !== 'whatsapp' || showConversations)

  // ─── alert banner: plan nearly used up, or WhatsApp disconnected ───
  const alert: HomeAlert | null = useMemo(() => {
    const relevant = usageMetrics.filter(metricVisible)
    const over = relevant.find((m) => m.used >= m.limit)
    if (over) return { tone: 'bad', title: `خلص رصيد ${over.label}.`, text: 'زوّد الباقة عشان يرجع الوكيل يرد على هالقناة.', action: 'تفاصيل الباقة', onAction: () => go('plan-usage') }
    const low = relevant.find((m) => m.used / m.limit >= 0.9)
    if (low) return { tone: 'warn', title: `باقي ${fmtN(low.limit - low.used)} من ${low.label}.`, text: 'لما يخلص يوقف الرد على هالقناة.', action: 'تفاصيل الباقة', onAction: () => go('plan-usage') }
    const wa = integrations.find((i) => i.provider === 'whatsapp')
    if (showConversations && wa && wa.status !== 'connected' && (agentCalls.length > 0 || messages.length > 0)) {
      return { tone: 'warn', title: 'رقم الواتساب مو مربوط.', text: 'الوكيل ما يقدر يرد على رسائل الواتساب لين تربطه.', action: 'ربط', onAction: () => go('integrations') }
    }
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usageMetrics, integrations, showVoice, showConversations, agentCalls.length, messages.length])

  // ─── actions ───
  function openCall(c: AICallLog) {
    const key = `call:${c.id}`
    go(showConversations ? `conversations?id=${encodeURIComponent(key)}` : `call-logs?id=${encodeURIComponent(key)}`)
  }
  function openItem(i: ConvItem) { go(`conversations?id=${encodeURIComponent(i.key)}`) }
  function openTicket(t: SupportTicket) { go(`tickets?ticket=${encodeURIComponent(t.id)}`) }
  async function copyPhone(phone: string) {
    const ok = await copyText(phone)
    pushToast(ok ? { kind: 'success', title: 'تم نسخ الرقم', description: phone } : { kind: 'danger', title: 'تعذّر النسخ', description: phone })
  }
  async function reviewed(c: AICallLog) {
    setBusyId(c.id)
    try {
      await markCallReviewed(c, isDemo)
      pushToast({ kind: 'success', title: 'تم تعليمها كمراجَعة', description: isDemo ? 'عرض تجريبي: التغيير ما ينحفظ.' : undefined })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'ما قدرنا نحفظ المراجعة', description: e instanceof Error ? e.message : undefined })
    } finally {
      setBusyId(null)
    }
  }

  // ─── header ───
  const hour = saudiHour(Date.now())
  const firstName = (userName || '').trim().split(/\s+/)[0]
  const greeting = `${hour < 12 ? 'صباح الخير' : 'مساء الخير'}${firstName ? `، ${firstName}` : ''}`
  const dateLine = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: SAUDI_TZ })
  const sub = [companyName, dateLine].filter(Boolean).join(' · ')

  const initialLoading = accountLoading || (callsLoading && messagesLoading && calls.length === 0 && messages.length === 0)
  if (initialLoading) return <HomeSkeleton />

  const stillLoading = callsLoading || messagesLoading || (showBookings && bookingsLoading)
  const brandNew = !stillLoading && calls.length === 0 && messages.length === 0 && bookings.length === 0
  if (brandNew) {
    const channelConnected = integrations.some((i) => (i.provider === 'whatsapp' || i.provider === 'voip') && i.status === 'connected')
    const steps: OnboardStep[] = [
      { title: `اربط رقم الواتساب${showVoice ? ' أو الهاتف' : ''}`, sub: 'عشان يبدأ يرد على عملائك', action: 'ربط', done: channelConnected, onClick: () => go('integrations') },
      { title: 'أضف أول الأسئلة وأجوبتها', sub: 'الأسعار، الدوام، الموقع، وأكثر شي يسألون عنه', action: 'افتح قاعدة المعرفة', done: (knowledge || []).length > 0, onClick: () => go('knowledge-base') },
      { title: 'اضبط شخصية الوكيل وتعليماته', sub: 'الاسم، طريقة الرد، ومتى يحوّل لموظف', action: 'إعدادات الوكيل', done: false, onClick: () => go('agents') },
      { title: 'شغّل الوكيل الذكي', sub: 'يبدأ يرد من الدقيقة الأولى، وتظهر شغله هنا', action: 'تشغيل', done: false, onClick: () => go('agents') },
    ]
    return (
      <Onboarding
        greeting="أهلًا بك في مدار" sub={`${companyName || 'حسابك'} · حسابك جاهز، باقي خطوات بسيطة`}
        steps={steps} bookingsWord={showBookings ? bookWord : 'الطلبات'}
      />
    )
  }

  // ─── KPI tiles ───
  const callN = p.calls.length
  const tiles: KpiTile[] = []
  if (showVoice) {
    tiles.push({
      label: 'انحلت بدون موظف',
      value: callN ? `${Math.round((p.resolved / callN) * 100)}%` : '—',
      note: callN ? `${fmtN(p.resolved)} من ${fmtN(callN)} مكالمة` : `ما فيه مكالمات ${periodWord}`,
    })
    tiles.push({ label: 'وقت تولاه الوكيل', value: fmtMinutes(p.talkSeconds), note: `مدة المكالمات ${periodWord}` })
  } else {
    const sent = p.msgs.filter((m) => m.status !== 'pending').length
    const reached = p.msgs.filter((m) => m.status === 'delivered' || m.status === 'read').length
    tiles.push({ label: `رسائل ${periodWord}`, value: fmtN(p.msgs.length), ...(delta(p.msgs.length, p.msgsPrev) || { note: 'رسائل واتساب أرسلها الوكيل' }) })
    tiles.push({ label: 'نسبة الوصول', value: sent ? `${Math.round((reached / sent) * 100)}%` : '—', note: sent ? `${fmtN(reached)} من ${fmtN(sent)} رسالة وصلت` : `ما فيه رسائل ${periodWord}` })
  }
  if (showBookings) {
    tiles.push({ label: `${bookWord} ${periodWord}`, value: fmtN(p.bookings.length), ...(delta(p.bookings.length, p.bookingsPrev) || { note: 'انضافت في هالفترة' }) })
  } else if (showTickets) {
    const openT = tickets.filter((t) => t.status === 'open').length
    tiles.push({ label: 'تذاكر مفتوحة', value: fmtN(openT), note: openT ? 'تنتظر أحد يستلمها' : 'ما فيه تذاكر مفتوحة' })
  }
  if (showVoice) {
    tiles.push({ label: 'تحتاج مراجعة', value: fmtN(p.attention), note: p.attention ? 'مراجعة أو ما اكتملت' : `كل مكالمات ${periodWord} اكتملت` })
  } else {
    const failed = p.msgs.filter((m) => m.status === 'failed').length
    tiles.push({ label: 'رسائل ما وصلت', value: fmtN(failed), note: failed ? 'تحقق من الأرقام' : 'كل الرسائل انرسلت' })
  }

  const lastActive = lastActivity != null && now - lastActivity < DAY
  const agentStatus = lastActivity == null
    ? 'ما استقبل شي للحين'
    : lastActive ? `شغّال · آخر نشاط ${fmtWhen(new Date(lastActivity).toISOString())}` : `آخر نشاط ${fmtWhen(new Date(lastActivity).toISOString())}`
  const agentStats = [
    { value: fmtN(callN), label: `مكالمة ${periodWord}` },
    { value: fmtN(p.chats), label: 'محادثات اليوم' },
    showBookings
      ? { value: fmtN(p.bookings.filter((b) => b.source === 'ai_booking').length), label: `${bookWord === 'المواعيد' ? 'موعد' : 'حجز'} سجّله` }
      : { value: callN ? `${Math.round((p.resolved / callN) * 100)}%` : '—', label: 'انحلت بدون موظف' },
  ]

  const visibleMetrics = usageMetrics.filter(metricVisible)
  const renewsOn = usageCycleEnd
    ? new Date(usageCycleEnd).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' })
    : null
  const ticketCounts = {
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    urgent: tickets.filter((t) => t.status !== 'resolved' && t.priority === 'high').length,
  }

  return (
    <div className="nx-page">
      {alert && <AlertBanner alert={alert} />}

      <div className="nx-head">
        <div style={{ minWidth: 0 }}>
          <h1 className="nx-h1">{greeting}</h1>
          <p className="nx-h1-sub">{sub}</p>
        </div>
        <div className="nx-seg" role="group" aria-label="الفترة">
          {([['today', 'اليوم'], ['week', 'الأسبوع'], ['month', 'الشهر']] as [Period, string][]).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>{l}</button>
          ))}
        </div>
      </div>

      {showVoice ? (
        <div className="nx-grid-2">
          <AgentCard
            status={agentStatus} statusTone={lastActive ? 'ok' : 'dim'} active={lastActive} channels={activeChannels} stats={agentStats}
            onCalls={() => go('call-logs')} onSettings={() => go('agents')}
          />
          <KpiTiles tiles={tiles} />
        </div>
      ) : (
        <KpiTiles tiles={tiles} wide />
      )}

      <div className="nx-grid-2">
        <NeedsAction
          entries={inbox.slice(0, INBOX_LIMIT)} total={inbox.length} busyId={busyId}
          onOpenCall={openCall} onReviewed={reviewed} onOpenTicket={openTicket} onCopy={copyPhone}
          onViewAll={() => go('conversations?filter=needs')}
        />
        <HourlyChart title="المحادثات حسب الساعة" counts={hourly.counts} startHour={hourly.startHour} />
      </div>

      <div className="nx-grid-3">
        <RecentConversations items={recent} onOpen={openItem} onViewAll={() => go('conversations')} />
        <div className="nx-stack">
          {showTickets && <TicketsMini {...ticketCounts} onViewAll={() => go('tickets')} />}
          <PlanCard metrics={visibleMetrics} renewsOn={renewsOn} onDetails={() => go('plan-usage')} />
        </div>
      </div>
    </div>
  )
}
