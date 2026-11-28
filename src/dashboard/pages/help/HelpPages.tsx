import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, FilePlus2, Rocket, Phone, MessageCircle, Code2, CreditCard, User, Search, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { requestOpenSupport } from '@/dashboard/components/shellActions'
import { useSupportRequests, KIND_LABELS, STATUS_LABELS, type RequestKind } from '@/lib/queries/supportRequests'
import { NightPage, Chip } from '../shared/night'
import { WG_CSS, Field } from '../widgets/widgetUi'
import { ARTICLES, CATEGORIES, POPULAR, TOP_SEARCHES, UPDATED, articleBySlug, articlesOf, categoryBySlug, type HelpArticle } from './helpContent'

const ICONS: Record<string, ReactNode> = {
  'getting-started': <Rocket size={18} />, 'agents-calls': <Phone size={18} />, 'whatsapp-chat': <MessageCircle size={18} />,
  developers: <Code2 size={18} />, billing: <CreditCard size={18} />, 'account-team': <User size={18} />,
}

const CSS = `
.hp { display: flex; flex-direction: column; gap: 22px; max-width: 1080px; margin: 0 auto; width: 100%; }
.hp-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.hp-bar .t { font-size: 15px; font-weight: 700; color: var(--ink); text-decoration: none; }
.hp-search { flex: 1; min-width: 220px; max-width: 420px; display: flex; align-items: center; gap: 8px; height: 40px; border: 1px solid var(--line); border-radius: 12px; padding: 0 12px; color: var(--muted); background: var(--panel); position: relative; }
.hp-search input { flex: 1; border: 0; outline: 0; background: none; color: var(--ink); font: inherit; font-size: 14px; min-width: 0; }
.hp-links { margin-inline-start: auto; display: flex; gap: 10px; align-items: center; }
.hp-link { color: var(--muted); font-size: 13.5px; text-decoration: none; background: none; border: 0; font-family: inherit; cursor: pointer; }
.hp-link:hover { color: var(--ink); }
.hp-btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 11px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
.hp-btn.sec { background: var(--panel); color: var(--ink); border: 1px solid var(--line-2, var(--line)); }
.hp-btn:focus-visible, .hp-link:focus-visible, .hp-card:focus-visible, .hp-row:focus-visible, .hp-chip:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.hp-hero { text-align: center; padding: 44px 0 12px; display: grid; gap: 10px; justify-items: center; }
.hp-hero h1 { margin: 0; font-size: 36px; font-weight: 800; color: var(--ink); }
.hp-hero p { margin: 0; color: var(--muted); font-size: 14px; }
.hp-big { width: min(560px, 100%); }
.hp-big .hp-search { max-width: none; width: 100%; height: 48px; border-radius: 14px; }
.hp-chips { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: center; font-size: 12.5px; color: var(--muted); }
.hp-chip { border: 0; background: none; color: var(--ink); font: inherit; font-size: 12.5px; cursor: pointer; padding: 2px 4px; border-radius: 6px; }
.hp-chip:hover { text-decoration: underline; }
.hp-results { position: absolute; top: calc(100% + 6px); inset-inline: 0; z-index: 10; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 14px 40px rgba(0,0,0,.18); padding: 6px; display: grid; text-align: start; max-height: 320px; overflow: auto; }
.hp-results a { padding: 9px 12px; border-radius: 9px; color: var(--ink); text-decoration: none; font-size: 13.5px; display: grid; gap: 2px; }
.hp-results a small { color: var(--muted); }
.hp-results a:hover, .hp-results a:focus-visible { background: var(--hover-bg); outline: 0; }
.hp h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--ink); }
.hp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.hp-card { display: grid; gap: 4px; border: 1px solid var(--line); border-radius: 18px; padding: 18px; background: linear-gradient(135deg, color-mix(in srgb, #8b7bff 10%, var(--panel)), var(--panel)); text-decoration: none; color: inherit; position: relative; }
.hp-card:hover { border-color: var(--line-2, var(--line)); }
.hp-card .ic { position: absolute; inset-inline-end: 16px; top: 16px; color: var(--muted); }
.hp-card b { font-size: 15px; color: var(--ink); } .hp-card span { font-size: 13px; color: var(--muted); line-height: 1.7; } .hp-card small { font-size: 12px; color: var(--muted); margin-top: 6px; }
.hp-cols { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 22px; align-items: start; }
@media (max-width: 900px) { .hp-cols { grid-template-columns: 1fr; } }
.hp-list { display: grid; border-top: 1px solid var(--line); }
.hp-row { display: flex; align-items: center; gap: 12px; padding: 14px 4px; border-bottom: 1px solid var(--line); text-decoration: none; color: var(--ink); font-size: 14.5px; }
.hp-row small { color: var(--muted); margin-inline-start: auto; font-size: 12.5px; }
.hp-row:hover { background: var(--hover-bg); }
.hp-box { border: 1px solid var(--line); border-radius: 18px; padding: 18px; display: grid; gap: 10px; background: var(--panel); }
.hp-box h3 { margin: 0; font-size: 15px; } .hp-box p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.hp-cta { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; border-radius: 20px; padding: 22px 26px; border: 1px solid var(--line); background: linear-gradient(100deg, color-mix(in srgb, #7c8cff 22%, var(--panel)), color-mix(in srgb, #ffc89a 18%, var(--panel))); }
.hp-cta h3 { margin: 0; font-size: 18px; } .hp-cta p { margin: 4px 0 0; color: var(--muted); font-size: 13.5px; }
.hp-crumb { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--muted); }
.hp-crumb a { color: var(--muted); text-decoration: none; } .hp-crumb a:hover { color: var(--ink); }
.hp-side { display: grid; gap: 4px; align-content: start; }
.hp-side a { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; color: var(--ink); text-decoration: none; font-size: 13.5px; }
.hp-side a[aria-current="page"] { background: var(--hover-bg); font-weight: 600; }
.hp-doc { display: grid; gap: 14px; }
.hp-doc h1 { margin: 0; font-size: 28px; font-weight: 800; color: var(--ink); line-height: 1.4; }
.hp-doc .lead { color: var(--muted); margin: 0; font-size: 15px; }
.hp-doc .meta { font-size: 12.5px; color: var(--muted); }
.hp-doc h3 { margin: 10px 0 0; font-size: 17px; }
.hp-doc p { margin: 0; line-height: 1.95; font-size: 14.5px; color: var(--ink); } .hp-doc li { line-height: 1.95; font-size: 14.5px; }
.hp-doc ul, .hp-doc ol { margin: 0; padding-inline-start: 22px; display: grid; gap: 4px; }
.hp-vote { display: flex; gap: 8px; align-items: center; border-top: 1px solid var(--line); padding-top: 16px; font-size: 14px; }
.hp-req { display: grid; gap: 4px; padding: 12px 0; border-bottom: 1px solid var(--line); } .hp-req b { font-size: 14px; } .hp-req small { color: var(--muted); font-size: 12.5px; }
.hp-kinds { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.hp-kind { border: 1px solid var(--line); border-radius: 12px; background: var(--panel); color: var(--ink); font: inherit; font-size: 13.5px; padding: 12px; cursor: pointer; text-align: start; }
.hp-kind[aria-pressed="true"] { border: 2px solid var(--ink); padding: 11px; }
.hp-kind:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
`

const articleText = (a: HelpArticle) => [a.title, a.summary, ...a.blocks.flatMap((b) => [b.h ?? '', b.p ?? '', ...(b.ul ?? []), ...(b.ol ?? [])])].join(' ')

function useBase() {
  const { isDemo } = useWorkspace()
  return `${isDemo ? '/demo-review' : '/dashboard'}/help`
}

function Bar({ query, setQuery }: { query?: string; setQuery?: (v: string) => void }) {
  const base = useBase()
  const hits = useMemo(() => {
    const q = (query ?? '').trim()
    return q ? ARTICLES.filter((a) => articleText(a).includes(q)).slice(0, 8) : []
  }, [query])
  return (
    <div className="hp-bar">
      <Link className="t" to={base}>مركز المساعدة</Link>
      {setQuery && (
        <label className="hp-search">
          <Search size={15} />
          <input value={query ?? ''} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المقالات…" aria-label="ابحث في المقالات" />
          {hits.length > 0 && <div className="hp-results">{hits.map((a) => <Link key={a.slug} to={`${base}/a/${a.slug}`}>{a.title}<small>{categoryBySlug(a.cat)?.title}</small></Link>)}</div>}
        </label>
      )}
      <div className="hp-links">
        <Link className="hp-link" to={`${base}/requests`}>طلباتي</Link>
        <Link className="hp-btn" to={`${base}/new`}><FilePlus2 size={15} /> إرسال طلب</Link>
      </div>
    </div>
  )
}

function Cta() {
  const base = useBase()
  const navigate = useNavigate()
  return (
    <div className="hp-cta">
      <div><h3>تحتاج مساعدة إضافية؟</h3><p>اسأل مساعد مدار لإجابة فورية، أو أرسل طلبًا للفريق.</p></div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="hp-btn sec" onClick={requestOpenSupport}><Sparkles size={15} /> اسأل مساعد مدار</button>
        <button type="button" className="hp-btn" onClick={() => navigate(`${base}/new`)}>إرسال طلب</button>
      </div>
    </div>
  )
}

function Shell({ children, query, setQuery }: { children: ReactNode; query?: string; setQuery?: (v: string) => void }) {
  return (
    <NightPage>
      <style>{WG_CSS + CSS}</style>
      <div className="hp"><Bar query={query} setQuery={setQuery} />{children}</div>
    </NightPage>
  )
}

const when = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' })

/** الدعم: the help center home. */
export function DashboardV2HelpHome() {
  const base = useBase()
  const { companyId, isDemo, userEmail } = useWorkspace()
  const { items } = useSupportRequests(companyId, isDemo, userEmail)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  return (
    <Shell>
      <section className="hp-hero">
        <h1>كيف يمكننا المساعدة؟</h1>
        <p>الأدلة والإجابات وطلبات الدعم في مكان واحد.</p>
        <div className="hp-big">
          <label className="hp-search">
            <Search size={16} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في المقالات…" aria-label="ابحث في المقالات" />
            {query.trim() && (() => {
              const hits = ARTICLES.filter((a) => articleText(a).includes(query.trim())).slice(0, 8)
              return <div className="hp-results">{hits.length ? hits.map((a) => <Link key={a.slug} to={`${base}/a/${a.slug}`}>{a.title}<small>{categoryBySlug(a.cat)?.title}</small></Link>) : <span style={{ padding: 12, color: 'var(--muted)', fontSize: 13 }}>ما لقينا مقالة بهذا الاسم. جرّب كلمة ثانية أو أرسل طلبًا.</span>}</div>
            })()}
          </label>
        </div>
        <div className="hp-chips">الأكثر بحثًا: {TOP_SEARCHES.map((t) => <button key={t.slug} type="button" className="hp-chip" onClick={() => navigate(`${base}/a/${t.slug}`)}>{t.label}</button>)}</div>
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        <h2>تصفح حسب الموضوع</h2>
        <div className="hp-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} className="hp-card" to={`${base}/c/${c.slug}`}>
              <span className="ic">{ICONS[c.slug]}</span><b>{c.title}</b><span>{c.about}</span><small>{articlesOf(c.slug).length} مقالات</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="hp-cols">
        <section style={{ display: 'grid', gap: 12 }}>
          <h2>الأكثر قراءة</h2>
          <div className="hp-list">
            {POPULAR.map((s) => { const a = articleBySlug(s); return a ? <Link key={s} className="hp-row" to={`${base}/a/${s}`}>{a.title}<small>{categoryBySlug(a.cat)?.title}</small><ChevronLeft size={15} /></Link> : null })}
          </div>
        </section>
        <aside className="hp-box">
          <h3>طلباتك</h3>
          {items.length === 0 ? <p>لا توجد طلبات مفتوحة.</p> : items.slice(0, 3).map((r) => <div key={r.id} className="hp-req"><b>{r.subject}</b><small>{STATUS_LABELS[r.status]} · {when(r.created_at)}</small></div>)}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="hp-btn sec" to={`${base}/requests`}>عرض الكل</Link>
            <Link className="hp-link" style={{ alignSelf: 'center' }} to={`${base}/new`}>إرسال طلب</Link>
          </div>
        </aside>
      </div>
      <Cta />
    </Shell>
  )
}

function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return <nav className="hp-crumb" aria-label="مسار التنقل">{items.map((it, i) => <span key={i} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>{i > 0 && <ChevronLeft size={12} />}{it.to ? <Link to={it.to}>{it.label}</Link> : it.label}</span>)}</nav>
}

function Side({ active }: { active: string }) {
  const base = useBase()
  return <nav className="hp-side" aria-label="المواضيع">{CATEGORIES.map((c) => <Link key={c.slug} to={`${base}/c/${c.slug}`} aria-current={active === c.slug ? 'page' : undefined}>{ICONS[c.slug]}{c.title}</Link>)}</nav>
}

export function DashboardV2HelpCategory() {
  const { slug = '' } = useParams()
  const base = useBase()
  const cat = categoryBySlug(slug)
  const [query, setQuery] = useState('')
  if (!cat) return <Shell><div className="hp-box">ما لقينا هذا الموضوع.</div></Shell>
  const list = articlesOf(cat.slug)
  return (
    <Shell query={query} setQuery={setQuery}>
      <Crumbs items={[{ label: 'مركز المساعدة', to: base }, { label: cat.title }]} />
      <div className="hp-cols" style={{ gridTemplateColumns: '220px minmax(0, 1fr)' }}>
        <Side active={cat.slug} />
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="hp-doc"><h1>{cat.title}</h1><p className="lead">{cat.about} · {list.length} مقالات</p></div>
          <div className="hp-list">{list.map((a) => <Link key={a.slug} className="hp-row" to={`${base}/a/${a.slug}`}>{a.title}<ChevronLeft size={15} style={{ marginInlineStart: 'auto' }} /></Link>)}</div>
        </div>
      </div>
      <Cta />
    </Shell>
  )
}

export function DashboardV2HelpArticle() {
  const { slug = '' } = useParams()
  const base = useBase()
  const a = articleBySlug(slug)
  const [query, setQuery] = useState('')
  const [vote, setVote] = useState<'up' | 'down' | null>(null)
  if (!a) return <Shell><div className="hp-box">ما لقينا هذه المقالة.</div></Shell>
  const cat = categoryBySlug(a.cat)
  const related = articlesOf(a.cat).filter((x) => x.slug !== a.slug).slice(0, 3)
  return (
    <Shell query={query} setQuery={setQuery}>
      <Crumbs items={[{ label: 'مركز المساعدة', to: base }, { label: cat?.title ?? '', to: `${base}/c/${a.cat}` }, { label: a.title }]} />
      <article className="hp-doc" style={{ maxWidth: 760 }}>
        <h1>{a.title}</h1>
        <p className="lead">{a.summary}</p>
        <div className="meta">آخر تحديث {UPDATED}</div>
        {a.blocks.map((b, i) => (
          <div key={i} style={{ display: 'grid', gap: 8 }}>
            {b.h && <h3>{b.h}</h3>}
            {b.p && <p>{b.p}</p>}
            {b.ul && <ul>{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>}
            {b.ol && <ol>{b.ol.map((x) => <li key={x}>{x}</li>)}</ol>}
          </div>
        ))}
        <div className="hp-vote">
          {vote ? 'شكرًا على رأيك.' : <>هل كانت المقالة مفيدة؟
            <button type="button" className="hp-btn sec" onClick={() => setVote('up')}><ThumbsUp size={14} /> نعم</button>
            <button type="button" className="hp-btn sec" onClick={() => setVote('down')}><ThumbsDown size={14} /> لا</button></>}
        </div>
        {related.length > 0 && <div style={{ display: 'grid', gap: 8 }}><h3>مقالات ذات صلة</h3><div className="hp-list">{related.map((r) => <Link key={r.slug} className="hp-row" to={`${base}/a/${r.slug}`}>{r.title}<ChevronLeft size={15} style={{ marginInlineStart: 'auto' }} /></Link>)}</div></div>}
      </article>
      <Cta />
    </Shell>
  )
}

const KINDS = Object.entries(KIND_LABELS) as [RequestKind, string][]

export function DashboardV2HelpNew() {
  const base = useBase()
  const navigate = useNavigate()
  const pushToast = useToast()
  const { companyId, isDemo, userEmail } = useWorkspace()
  const { send } = useSupportRequests(companyId, isDemo, userEmail)
  const [params] = useSearchParams()
  const pk = params.get('kind') as RequestKind | null
  const [kind, setKind] = useState<RequestKind>(pk && pk in KIND_LABELS ? pk : 'unsure')
  const [subject, setSubject] = useState(params.get('cancel') === '1' ? 'طلب إلغاء الاشتراك' : '')
  const [details, setDetails] = useState('')
  const [reference, setReference] = useState('')
  const [sending, setSending] = useState(false)
  const ok = subject.trim().length > 0 && details.trim().length > 0

  async function submit() {
    if (!ok || sending) return
    setSending(true)
    try {
      await send({ kind, subject, details, reference })
      pushToast({ kind: 'success', title: 'وصل طلبك. نرد عليك خلال يوم عمل.' })
      navigate(`${base}/requests`)
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر إرسال الطلب', description: e instanceof Error ? e.message : undefined })
    } finally { setSending(false) }
  }

  return (
    <Shell>
      <Crumbs items={[{ label: 'مركز المساعدة', to: base }, { label: 'إرسال طلب' }]} />
      <div className="hp-cols">
        <div className="hp-doc" style={{ gap: 18 }}>
          <div><h1>إرسال طلب</h1><p className="lead">اكتب لنا ما حدث. نرد عليك هنا وعلى بريدك.</p></div>
          <div className="wg-f" role="group" aria-label="نوع الطلب">
            <span>نوع الطلب</span>
            <div className="hp-kinds">{KINDS.map(([k, label]) => <button key={k} type="button" className="hp-kind" aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}</div>
          </div>
          <Field label="الموضوع"><input className="wg-in" value={subject} maxLength={200} placeholder="صف المشكلة باختصار" onChange={(e) => setSubject(e.target.value)} /><small style={{ color: 'var(--muted)' }}>{subject.length}/200</small></Field>
          <Field label="التفاصيل"><textarea className="wg-in" rows={6} value={details} maxLength={5000} placeholder="ماذا حدث، وماذا توقعت، وأي نص خطأ أو خطوات." onChange={(e) => setDetails(e.target.value)} /><small style={{ color: 'var(--muted)' }}>{details.length}/5000</small></Field>
          <Field label="مرجع (اختياري)" hint="رابط الصفحة أو رقم مكالمة أو أي مرجع يساعدنا."><input className="wg-in" value={reference} maxLength={300} onChange={(e) => setReference(e.target.value)} /></Field>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button disabled={!ok || sending} onClick={() => void submit()}>{sending ? 'جارِ الإرسال...' : 'إرسال الطلب'}</Button>
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>نرد عادة خلال يوم عمل واحد.</span>
          </div>
        </div>
        <aside className="hp-box">
          <h3>تحتاج إجابة سريعة؟</h3>
          <p>يجيبك مساعد مدار من أدلتنا خلال ثوان.</p>
          <button type="button" className="hp-btn sec" onClick={requestOpenSupport}><Sparkles size={15} /> اسأل مساعد مدار</button>
        </aside>
      </div>
    </Shell>
  )
}

export function DashboardV2HelpRequests() {
  const base = useBase()
  const { companyId, isDemo, userEmail } = useWorkspace()
  const { items, loading } = useSupportRequests(companyId, isDemo, userEmail)
  return (
    <Shell>
      <Crumbs items={[{ label: 'مركز المساعدة', to: base }, { label: 'طلباتي' }]} />
      <div className="hp-doc"><h1>طلباتي</h1><p className="lead">كل طلباتك للفريق وحالتها.</p></div>
      <div className="hp-box" style={{ padding: '6px 18px' }}>
        {loading ? <p style={{ padding: 12 }}>جارِ التحميل...</p> : items.length === 0
          ? <p style={{ padding: 12 }}>لا توجد طلبات بعد. <Link to={`${base}/new`}>أرسل أول طلب</Link></p>
          : items.map((r) => (
            <div key={r.id} className="hp-req">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><b>{r.subject}</b><Chip tone={r.status === 'open' ? 'info' : r.status === 'answered' ? 'ok' : 'muted'}>{STATUS_LABELS[r.status]}</Chip></div>
              <small>{KIND_LABELS[r.kind]} · {when(r.created_at)}</small>
              <small style={{ color: 'var(--ink)', lineHeight: 1.8 }}>{r.details.length > 220 ? r.details.slice(0, 220) + '…' : r.details}</small>
              {r.admin_reply && <div style={{ marginTop: 6, padding: '10px 12px', borderRadius: 12, background: 'var(--hover-bg)', fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}><small style={{ display: 'block', color: 'var(--muted)', marginBottom: 2 }}>رد فريق مدار{r.replied_at ? ` · ${when(r.replied_at)}` : ''}</small>{r.admin_reply}</div>}
            </div>
          ))}
      </div>
    </Shell>
  )
}

