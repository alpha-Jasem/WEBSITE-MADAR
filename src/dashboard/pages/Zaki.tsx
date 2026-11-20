import { useEffect, useRef, useState } from 'react'
import { Sparkles, Plus, Send, Trash2, History } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useConversationData } from '@/lib/queries/conversations'
import { useContacts } from '@/lib/queries/segments'
import { useCampaigns } from '@/lib/queries/campaigns'
import { zakiAsk, zakiDelete, zakiMessages, zakiThreads, type ZakiMessage, type ZakiThread } from '@/lib/queries/zaki'
import type { Contact } from '@/lib/contacts'
import type { Campaign } from '@/lib/campaigns'
import type { AICallLog } from '@/types/dashboard'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead } from './shared/night'
import { fmtWhen } from './conversations/model'
import './growth.css'

const SUGGESTIONS = [
  'كم محادثة جتنا اليوم، وكم منها تحتاج مراجعة؟',
  'وش أكثر الأشياء اللي سألوا عنها وما قدر الوكيل يجاوبها هالأسبوع؟',
  'مين العملاء اللي انقطعوا عنا من أكثر من شهر؟',
  'كيف أداء حملاتنا؟ وأي وحدة جابت ردود أكثر؟',
  'وش وضع الحجوزات بكرة؟',
  'مين في الفريق عنده محادثات مفتوحة أكثر؟',
]

/** Zaki: ask about your own business in plain Arabic; answers come from read-only lookups of your data. */
export function DashboardV2Zaki() {
  const { isDemo, companyId, userName } = useWorkspace()
  const pushToast = useToast()
  const { calls } = useConversationData(companyId, isDemo)
  const { contacts } = useContacts(companyId, isDemo)
  const { campaigns } = useCampaigns(companyId, isDemo)
  const [threads, setThreads] = useState<ZakiThread[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [log, setLog] = useState<ZakiMessage[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  // The tour keeps its chats in memory for this visit only.
  const demoThreads = useRef(new Map<string, ZakiMessage[]>())

  useEffect(() => { if (!isDemo) zakiThreads().then(setThreads).catch(() => setThreads([])) }, [isDemo])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [log, busy])

  async function open(id: string) {
    setActive(id); setHistOpen(false)
    if (isDemo) { setLog(demoThreads.current.get(id) || []); return }
    try { setLog(await zakiMessages(id)) } catch { pushToast({ kind: 'danger', title: 'ما قدرنا نفتح المحادثة' }) }
  }

  function fresh() { setActive(null); setLog([]); setHistOpen(false) }

  async function remove(id: string) {
    if (isDemo) demoThreads.current.delete(id)
    else await zakiDelete(id).catch(() => null)
    setThreads((t) => t.filter((x) => x.id !== id))
    if (active === id) fresh()
  }

  async function ask(q: string) {
    const question = q.trim()
    if (!question || busy) return
    setText('')
    const next: ZakiMessage[] = [...log, { role: 'user', content: question }]
    setLog(next)
    setBusy(true)
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 500))
        const answer = demoAnswer(question, { calls: calls || [], contacts, campaigns })
        const done: ZakiMessage[] = [...next, { role: 'assistant', content: answer.text, tools: answer.tools }]
        const id = active || `demo-${Date.now()}`
        demoThreads.current.set(id, done)
        if (!active) { setActive(id); setThreads((t) => [{ id, title: question.slice(0, 60), updated_at: new Date().toISOString() }, ...t]) }
        setLog(done)
      } else {
        const r = await zakiAsk(question, active)
        setLog([...next, { role: 'assistant', content: r.reply, tools: r.tools }])
        if (!active) {
          setActive(r.conversation_id)
          setThreads((t) => [{ id: r.conversation_id, title: question.slice(0, 60), updated_at: new Date().toISOString() }, ...t])
        }
      }
    } catch (e) {
      setLog([...next, { role: 'assistant', content: e instanceof Error ? e.message : 'مدار غير متاح الآن' }])
    } finally { setBusy(false) }
  }

  return (
    <NightPage>
      <PageHead icon={<Sparkles size={20} />} title="مدار" sub="اسأل عن شغلك بكلامك: المحادثات، العملاء، الحجوزات، الحملات والفريق. مدار يقرأ بياناتك فقط وما يرسل أو يعدّل شيء."
        actions={<span className="gr-acts"><button type="button" className="gr-btn zk-hist-toggle" onClick={() => setHistOpen((o) => !o)}><History /> السجل</button><button type="button" className="gr-btn primary" onClick={fresh}><Plus /> سؤال جديد</button></span>} />
      <div className="zk">
        <aside className={`zk-hist${histOpen ? ' is-open' : ''}`} aria-label="محادثاتك مع مدار">
          <header><b style={{ fontSize: 13, color: 'var(--ink)' }}>محادثاتك</b></header>
          <ul>
            {threads.length === 0 && <li style={{ fontSize: 12, color: 'var(--dim)', padding: 8 }}>ما فيه محادثات سابقة.</li>}
            {threads.map((t) => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'center' }}>
                <button type="button" aria-current={t.id === active ? 'true' : undefined} onClick={() => void open(t.id)} title={fmtWhen(t.updated_at)}>{t.title}</button>
                <button type="button" className="gr-x" aria-label="حذف المحادثة" onClick={() => void remove(t.id)}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="zk-main">
          <div className="zk-log" aria-live="polite">
            {log.length === 0 && (
              <div className="zk-hello">
                <span className="zk-msg bot" style={{ alignSelf: 'center' }}><span className="zk-av" style={{ width: 44, height: 44 }}><Sparkles size={22} /></span></span>
                <h2>هلا {userName ? userName.split(' ')[0] : ''}، وش تبي تعرف؟</h2>
                <p>مدار يطالع بيانات شركتك ويرد عليك بالأرقام. جرّب واحد من هذي:</p>
                <div className="zk-sugg">{SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>)}</div>
              </div>
            )}
            {log.map((m, i) => m.role === 'user'
              ? <div key={i} className="zk-msg user">{m.content}</div>
              : (
                <div key={i} className="zk-msg bot">
                  <span className="zk-av" aria-hidden="true"><Sparkles size={14} /></span>
                  <div>{m.content}{m.tools && m.tools.length > 0 && <div className="zk-tools">اطّلع على: {m.tools.join('، ')}</div>}</div>
                </div>
              ))}
            {busy && <div className="zk-msg bot"><span className="zk-av"><Sparkles size={14} /></span><span className="zk-dots" aria-label="مدار يكتب"><i /><i /><i /></span></div>}
            <div ref={end} />
          </div>
          <form className="zk-input" onSubmit={(e) => { e.preventDefault(); void ask(text) }}>
            <textarea rows={1} value={text} placeholder="اسأل مدار…" aria-label="سؤالك لمدار" onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(text) } }} />
            <button type="submit" className="gr-btn primary" style={{ height: 40 }} disabled={busy || !text.trim()} aria-label="إرسال"><Send /></button>
          </form>
        </section>
      </div>
    </NightPage>
  )
}

// ─── tour answers ───────────────────────────────────────────────────────────────

const DAY = 86_400_000
const riyadhDay = (ms: number) => new Date(ms + 3 * 3600_000).toISOString().slice(0, 10)

/** Rule-based answers for the tour, worked out from its own data so the numbers are real for the demo. */
function demoAnswer(q: string, d: { calls: AICallLog[]; contacts: Contact[]; campaigns: Campaign[] }): { text: string; tools: string[] } {
  const now = Date.now()
  const today = riyadhDay(now)
  if (/حمل/.test(q)) {
    if (!d.campaigns.length) return { text: 'ما عندك حملات بعد. تقدر تسوي أول حملة من صفحة الحملات.', tools: ['الحملات'] }
    const lines = d.campaigns.map((c) => `- ${c.name}: ${c.recipients.length} شخص، حالتها ${c.status === 'done' ? 'اكتملت' : c.status === 'running' ? 'قيد الإرسال' : c.status === 'scheduled' ? 'مجدولة' : c.status}`)
    return { text: `عندك ${d.campaigns.length} حملات.\n${lines.join('\n')}\nأنصحك تفتح التحليلات في صفحة الحملات وتعيد الحملة اللي جابت أعلى نسبة رد على شريحة ثانية.`, tools: ['الحملات'] }
  }
  if (/انقطع|ما تواصل|شهر/.test(q)) {
    const quiet = d.contacts.filter((c) => c.lastAt && now - Date.parse(c.lastAt) > 30 * DAY)
    if (!quiet.length) return { text: 'كل عملائك تواصلوا خلال آخر 30 يوم، ما فيه أحد منقطع.', tools: ['العملاء'] }
    return { text: `فيه ${quiet.length} عميل آخر تواصل لهم قبل أكثر من 30 يوم، منهم:\n${quiet.slice(0, 5).map((c) => `- ${c.name}`).join('\n')}\nسوّ لهم شريحة «انقطعوا عنا» وأرسل لهم حملة تذكير.`, tools: ['العملاء'] }
  }
  if (/مراجع|ما قدر|ما انجاوب|سأل/.test(q)) {
    const week = d.calls.filter((c) => now - Date.parse(c.call_time) < 7 * DAY && c.needs_review)
    if (!week.length) return { text: 'هالأسبوع ما فيه محادثات علّمها الوكيل إنها تحتاج مراجعة.', tools: ['الأسئلة اللي ما انجاوبت'] }
    return { text: `هالأسبوع ${week.length} محادثة احتاجت مراجعة، أبرزها:\n${week.slice(0, 4).map((c) => `- ${(c.summary || c.review_reason || 'بدون ملخص').slice(0, 90)}`).join('\n')}\nأضف أجوبتها في قاعدة المعرفة عشان الوكيل يرد عليها بنفسه المرة الجاية.`, tools: ['الأسئلة اللي ما انجاوبت'] }
  }
  if (/حجز|موعد|مواعيد|بكرة/.test(q)) {
    return { text: 'أشوف الحجوزات من صفحة الحجوزات في نسختك الفعلية. في العرض التجريبي هذا السؤال يجاوب عليه مدار من جدول مواعيدك مباشرة.', tools: ['الحجوزات'] }
  }
  if (/فريق|ضغط|موظف|مسند/.test(q)) {
    const open = d.contacts.filter((c) => c.status === 'open')
    const unassigned = open.filter((c) => !c.assigneeId).length
    return { text: `عندك ${open.length} محادثة مفتوحة، ${unassigned} منها ما هي مسندة لأحد.\nفعّل الإسناد الذكي من صفحة الفريق عشان تتوزع تلقائيًا.`, tools: ['ضغط الفريق'] }
  }
  const todays = d.calls.filter((c) => riyadhDay(Date.parse(c.call_time)) === today)
  const review = todays.filter((c) => c.needs_review).length
  const wa = todays.filter((c) => c.channel === 'whatsapp').length
  // Anything else gets today's overview.
  return {
    text: todays.length
      ? `اليوم جتك ${todays.length} محادثة.\n- واتساب: ${wa}\n- باقي القنوات: ${todays.length - wa}\n- تحتاج مراجعة: ${review}\n${review ? 'ابدأ بالمحادثات اللي تحتاج مراجعة من صندوق المحادثات.' : 'الوكيل غطى كل شي اليوم.'}`
      : `اليوم ما جت محادثات للحين. آخر 7 أيام جتك ${d.calls.filter((c) => now - Date.parse(c.call_time) < 7 * DAY).length} محادثة.`,
    tools: ['إحصاء المحادثات'],
  }
}
