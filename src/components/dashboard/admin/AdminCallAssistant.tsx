import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { logDealEvent, type Deal } from '../../../lib/deals'
import { dateShort } from '../../../lib/format'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { JarvisChat } from './JarvisChat'

interface Lead { id: string; name: string; phone: string; category: string; city: string; notes: string; status: string; last_contacted_at: string | null; contact_name: string }
interface Price { setup_net: number | null; monthly_net: number | null; packages: { name: string } | null }

// Approved call skills. Wording is original; prices are never invented (they come only from approved package prices).
const OBJECTIONS: { key: string; label: string; reply: string; next: string }[] = [
  { key: 'price', label: 'السعر غالي', reply: 'أفهمك. خلني أتأكد أول: وش الشي اللي تبغى يتحقق لك حتى يستاهل السعر؟', next: 'كم يكلفكم اليوم الطلب أو العميل اللي يضيع بدون رد؟' },
  { key: 'have', label: 'عندنا نظام', reply: 'ممتاز، يعني تهتمون بالموضوع. وش اللي ما يغطيه النظام الحالي ويزعجكم؟', next: 'متى آخر مرة ضاع عليكم عميل بسبب تأخر الرد؟' },
  { key: 'later', label: 'مو الحين', reply: 'مفهوم. وش اللي لازم يتغير عندكم حتى يصير الوقت مناسب؟', next: 'تحب أرجع لك بعد أسبوعين وبس أرسل لك ملخصاً قصيراً الحين؟' },
  { key: 'send', label: 'أرسل التفاصيل', reply: 'أكيد، وحتى أرسل لك المفيد فعلاً: وش أهم شي تبغى تشوفه فيها؟', next: 'من غيرك يشارك في القرار حتى أجهز لكم نسخة تناسب الجميع؟' },
  { key: 'boss', label: 'القرار عند المدير', reply: 'تمام، ومن الأفضل أرتب لك ملخصاً تعرضه عليه. وش اللي يهمه أكثر؟', next: 'وش الوقت الأنسب نكلمه معك خلال اجتماع قصير؟' },
  { key: 'trust', label: 'ما أعرفكم', reply: 'حقك. أقدر أعرض لك تجربة صغيرة على نشاطك بدون التزام حتى تحكم بنفسك.', next: 'وش أكثر شي يطمنك قبل ما نبدأ؟' },
]
const NEXT_QUESTIONS = ['وش أكثر شي يتعبكم الحين في الرد على العملاء؟', 'كم عميل تقريبًا يسألكم يوميًا على واتساب؟', 'من يتابع الرسائل عندكم الحين؟', 'لو تحسّن هذا الجانب، وش الفرق اللي تتوقعه؟']
const CLOSINGS = ['نبدأ بتجربة قصيرة هذا الأسبوع؟ أرسل لك العرض الحين وتقرر بعدها.', 'يناسبك نحجز 15 دقيقة غدًا نكمل فيها ونحدد الخطوة القادمة؟']

export const AdminCallAssistant = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [prices, setPrices] = useState<Price[]>([])
  const [sel, setSel] = useState('')
  const [tip, setTip] = useState<{ title: string; text: string; follow?: string } | null>(null)
  const [heard, setHeard] = useState('')
  const [recap, setRecap] = useState<string | null>(null)
  const [post, setPost] = useState({ needs: '', agreements: '', next: '', user: '', evaluator: '', budget: '' })
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [l, d, p] = await Promise.all([
      supabase.from('outreach_leads').select('id, name, phone, category, city, notes, status, last_contacted_at, contact_name').order('last_contacted_at', { ascending: false, nullsFirst: false }).limit(300),
      supabase.from('deals').select('*').not('stage', 'in', '(won,lost)').limit(300),
      supabase.from('package_prices').select('setup_net, monthly_net, packages(name)').eq('status', 'approved'),
    ])
    setError(l.error ? 'تعذّر تحميل العملاء.' : null)
    setLeads((l.data ?? []) as Lead[]); setDeals((d.data ?? []) as Deal[]); setPrices((p.data ?? []) as unknown as Price[])
  }, [])
  useEffect(() => { load() }, [load])
  useRealtimeRefetch('admin_calls', [{ table: 'deals' }, { table: 'outreach_leads' }], load, true)

  const lead = leads.find(l => l.id === sel)
  const deal = useMemo(() => deals.find(d => d.lead_id === sel), [deals, sel])
  const rot = useMemo(() => ({ n: 0 }), [])

  const objection = (o: typeof OBJECTIONS[number]) => setTip({ title: o.label, text: o.reply, follow: o.next })
  const nextQ = () => { rot.n = (rot.n + 1) % NEXT_QUESTIONS.length; setTip({ title: 'السؤال التالي', text: NEXT_QUESTIONS[rot.n] }) }
  const close = () => { rot.n = (rot.n + 1) % CLOSINGS.length; setTip({ title: 'إغلاق', text: CLOSINGS[rot.n] }) }
  const priceTip = () => setTip(prices.length ? { title: 'الأسعار المعتمدة', text: prices.map(p => `${p.packages?.name ?? 'باقة'}: تأسيس ${p.setup_net ?? '—'} · شهري ${p.monthly_net ?? '—'} (صافي قبل الضريبة)`).join('\n') } : { title: 'السعر', text: 'لا يوجد سعر معتمد بعد. لا تذكر رقمًا، وقل: أرسل لك عرضًا مكتوبًا بعد ما أفهم احتياجكم.' })

  // "I missed what he said": shows the last lines you typed or pasted. It never guesses what was not captured.
  const recapNow = () => {
    const lines = heard.split(/\n+/).map(s => s.trim()).filter(Boolean)
    if (lines.length === 0) { setRecap('لم يُلتقط كلام. اكتب أو الصق آخر ما قاله.'); return }
    const last = lines.slice(-2).join(' / ')
    setRecap(last.length < 20 ? `الكلام قصير وغير واضح: «${last}». اطلب منه يعيد بلطف بدل التخمين.` : `آخر ما قاله: ${last}`)
  }

  const savePost = async () => {
    if (!lead) return
    if (deal) {
      await logDealEvent(deal.id, 'call_summary', { draft: true, ...post })
      if (post.next.trim()) await supabase.from('deals').update({ next_step: post.next.trim(), updated_at: new Date().toISOString() }).eq('id', deal.id)
      setSaved('حُفظ الملخص في سجل الصفقة. راجعه وعدّله من «الصفقات».')
    } else {
      await supabase.from('outreach_leads').update({ notes: [lead.notes, `مكالمة: ${post.needs} | اتفاق: ${post.agreements} | قادم: ${post.next}`].filter(Boolean).join('\n') }).eq('id', lead.id)
      setSaved('حُفظ في ملاحظات العميل (لا توجد صفقة بعد).')
    }
    setPost({ needs: '', agreements: '', next: '', user: '', evaluator: '', budget: '' }); load()
  }

  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>مساعد المكالمات (كتابي)</h3><span className="mc-st mc-n2">التقاط الصوت غير مفعّل</span></div>
        <div className="mc-delta" style={{ padding: '0 20px 12px', lineHeight: 1.8 }}>يعطيك اقتراحًا قصيرًا واحدًا في كل مرة، ولا يتكلم. التقاط صوت المكالمة (الجوال على السبيكر ومايك الكمبيوتر) لم يُختبر ولم يُفعّل، فاكتب أو الصق ما قيل. لا يذكر سعرًا غير معتمد.</div>
        <div style={{ padding: '0 20px 18px' }}>
          <label className="mc-field">قبل المكالمة: اختر العميل<select value={sel} onChange={e => { setSel(e.target.value); setTip(null); setSaved(null) }}><option value="">اختر عميلًا</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name} · {l.category}</option>)}</select></label>
          {lead && (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: 'var(--fill)', lineHeight: 1.9, fontSize: 13.5 }}>
              <b>{lead.name}</b> · {lead.category} · {lead.city}<br />
              الحالة: {lead.status} · آخر تواصل: {lead.last_contacted_at ? dateShort(lead.last_contacted_at) : 'لم يحصل'}{lead.contact_name ? ` · جهة الاتصال: ${lead.contact_name}` : ''}<br />
              {deal ? <>الصفقة: {deal.stage} · الخطوة القادمة: {deal.next_step || 'غير محددة'}<br /></> : 'لا توجد صفقة بعد.'}
              {lead.notes && <>ملاحظات: {lead.notes}<br /></>}
              هدف المكالمة: تحديد صاحب القرار وموعد عرض قصير. عرّف بنفسك بصدق ولا تدّعِ علاقة أو موعدًا سابقًا.
            </div>
          )}
        </div>
      </article>

      {lead && (
        <article className="mc-card" style={{ marginBottom: 14 }}>
          <div className="mc-ph"><h3>جارفيس أثناء المكالمة</h3><span className="mc-st mc-g">يعرف أنك مع {lead.name}</span></div>
          <div style={{ padding: '0 20px 18px' }}>
            <div className="mc-delta" style={{ lineHeight: 1.8 }}>قل له أو اكتب: «ذكرني أتصل بكرة 4»، «سجّل ملاحظة: القرار عند المدير»، «حط موعد المتابعة بعد 3 أيام». يطبقه على هذا العميل مباشرة.</div>
            <JarvisChat compact context={{ lead_name: lead.name, lead_phone: lead.phone, on_call: true }} onChanged={load} />
          </div>
        </article>
      )}

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>أثناء المكالمة</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-chips">
            {OBJECTIONS.map(o => <button key={o.key} className="mc-chipbtn" onClick={() => objection(o)}>{o.label}</button>)}
            <button className="mc-chipbtn" onClick={nextQ}>سؤال تالي</button>
            <button className="mc-chipbtn" onClick={close}>إغلاق</button>
            <button className="mc-chipbtn" onClick={priceTip}>الأسعار</button>
          </div>
          {tip ? (
            <div style={{ padding: 16, borderRadius: 14, border: '1px solid var(--line-2)', background: 'rgba(47,107,255,.08)' }}>
              <div style={{ color: 'var(--link)', font: '700 12.5px var(--head)', marginBottom: 6 }}>{tip.title}</div>
              <div style={{ font: '700 17px/1.7 var(--head)', whiteSpace: 'pre-line' }}>{tip.text}</div>
              {tip.follow && <div style={{ marginTop: 8, color: 'var(--ink-2)' }}>ثم اسأل: {tip.follow}</div>}
            </div>
          ) : <div className="mc-flat">اضغط الاعتراض الذي سمعته للحصول على اقتراح واحد قصير.</div>}
          <label className="mc-field">«فاتني كلامه»: اكتب أو الصق آخر ما قاله<textarea value={heard} onChange={e => { setHeard(e.target.value); setRecap(null) }} /></label>
          <div><button className="mc-btn2 p" onClick={recapNow}>لخّص آخر كلامه</button></div>
          {recap && <div className="mc-delta" style={{ fontSize: 13.5, color: 'var(--ink)' }}>{recap}</div>}
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph"><h3>بعد المكالمة (مسودة تراجعها)</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 10 }}>
          <label className="mc-field">الاحتياج<textarea value={post.needs} onChange={e => setPost({ ...post, needs: e.target.value })} /></label>
          <label className="mc-field">الاتفاقات<textarea value={post.agreements} onChange={e => setPost({ ...post, agreements: e.target.value })} /></label>
          <div className="mc-grid2">
            <label className="mc-field">المستخدم<input value={post.user} onChange={e => setPost({ ...post, user: e.target.value })} /></label>
            <label className="mc-field">المقيّم<input value={post.evaluator} onChange={e => setPost({ ...post, evaluator: e.target.value })} /></label>
            <label className="mc-field">صاحب الميزانية<input value={post.budget} onChange={e => setPost({ ...post, budget: e.target.value })} /></label>
            <label className="mc-field">الخطوة القادمة<input value={post.next} onChange={e => setPost({ ...post, next: e.target.value })} /></label>
          </div>
          <div><button className="mc-btn2 p" disabled={!lead || !(post.needs || post.agreements || post.next)} onClick={savePost}>حفظ الملخص</button></div>
          {saved && <div className="mc-delta" style={{ color: 'var(--green)' }}>{saved}</div>}
        </div>
      </article>
    </div>
  )
}
