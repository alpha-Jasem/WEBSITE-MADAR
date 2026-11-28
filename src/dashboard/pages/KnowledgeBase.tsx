import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, FileText, Pencil, Plus, Table2, Trash2, Upload } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { kbAddDocument, kbCreate, kbDelete, kbDeleteDocument, kbGet, kbList, kbSetAgents, kbUpdate, type KbDoc, type KbKind, type KnowledgeBase } from '@/lib/queries/knowledgeBases'
import { Button, Card, Dialog, Input } from '@/dashboard/components/primitives'
import { EmptyState, useToast } from '@/dashboard/components/uiExtras'
import { NightPage } from './shared/night'

// قاعدة المعرفة: what the voice agents can look up during a call. Documents (PDF) are searched by meaning,
// a table (one CSV or Excel sheet) is looked up by column. Same flow as the voice platform's own page.

const CSS = `
.kb-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 22px 24px; }
.kb-head h1 { margin: 0; font-size: 26px; font-weight: 700; color: var(--ink); }
.kb-head p { margin: 4px 0 0; font-size: 13.5px; color: var(--muted); max-width: 60ch; }
.kb-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 12px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.kb-btn:disabled { opacity: .5; cursor: not-allowed; }
.kb-btn.sec { background: transparent; color: var(--ink); border: 1px solid var(--line-2, var(--line)); }
.kb-btn:focus-visible, .kb-ic:focus-visible, .kb-type:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.kb-card { background: var(--panel); border: 1px solid var(--line); border-radius: 20px; display: flex; flex-direction: column; min-width: 0; overflow: hidden; cursor: pointer; text-align: start; font: inherit; color: inherit; padding: 0; }
.kb-card:hover { border-color: var(--line-2, var(--line)); }
.kb-top { display: flex; gap: 14px; align-items: center; padding: 16px 18px; }
.kb-tile { width: 52px; height: 52px; border-radius: 16px; flex: none; display: grid; place-items: center; background: var(--hover-bg); color: var(--ink); }
.kb-info { min-width: 0; display: grid; gap: 4px; }
.kb-name { font-size: 15.5px; font-weight: 700; color: var(--ink); }
.kb-desc { font-size: 12.5px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.kb-chips { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 18px 14px; }
.kb-chip { font-size: 11.5px; font-weight: 600; padding: 2px 10px; border-radius: 999px; background: var(--hover-bg); color: var(--muted); }
.kb-chip.ok { background: var(--ok-bg, #e6f6ec); color: var(--ok, #16a34a); } .kb-chip.bad { background: var(--bad-bg, #fde8e8); color: var(--bad, #dc2626); } .kb-chip.warn { background: var(--warn-bg, #fdf1dc); color: var(--warn, #b7791f); }
.kb-ic { width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel); color: var(--bad, #dc2626); display: grid; place-items: center; cursor: pointer; flex: none; }
.kb-types { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.kb-type { text-align: start; font: inherit; color: var(--ink); border: 1px solid var(--line); background: var(--panel); border-radius: 14px; padding: 12px 14px; cursor: pointer; display: grid; gap: 4px; }
.kb-type[aria-pressed="true"] { border-color: var(--ink); background: var(--hover-bg); box-shadow: 0 0 0 1px var(--ink); }
.kb-type b { display: flex; align-items: center; gap: 8px; font-size: 14px; } .kb-type span { font-size: 12px; color: var(--muted); line-height: 1.6; }
.kb-field { display: grid; gap: 6px; font-size: 13px; color: var(--ink); }
.kb-field textarea { width: 100%; border: 1px solid var(--line-2, var(--line)); background: transparent; color: inherit; border-radius: 12px; padding: 10px 12px; font: inherit; font-size: 14px; resize: vertical; }
.kb-hint { font-size: 12px; color: var(--muted); line-height: 1.7; }
.kb-drop { border: 1.5px dashed var(--line-2, var(--line)); border-radius: 16px; padding: 22px; text-align: center; display: grid; gap: 8px; justify-items: center; color: var(--muted); font-size: 13px; }
.kb-drop[data-over="true"] { border-color: var(--ink); background: var(--hover-bg); }
.kb-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.kb-row:last-child { border-bottom: 0; } .kb-row b { flex: 1; min-width: 0; font-size: 14px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kb-agents { display: grid; gap: 8px; }
.kb-agents label { display: flex; gap: 8px; align-items: center; font-size: 13.5px; }
.kb-key { direction: ltr; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px; padding: 2px 8px; border-radius: 8px; border: 1px solid var(--line); color: var(--muted); }
.kb-back { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; color: var(--muted); font: inherit; font-size: 13.5px; cursor: pointer; padding: 0; }
`

const STATUS: Record<string, [string, 'ok' | 'bad' | 'warn']> = {
  queued: ['في الانتظار', 'warn'], extracting: ['قراءة النص', 'warn'], chunking: ['تقسيم النص', 'warn'], embedding: ['فهرسة', 'warn'], indexing: ['فهرسة', 'warn'], processing: ['معالجة', 'warn'],
  ready: ['جاهز', 'ok'], completed: ['جاهز', 'ok'], processed: ['جاهز', 'ok'], failed: ['فشل', 'bad'], error: ['فشل', 'bad'],
}
const FINAL = new Set(['ready', 'completed', 'processed', 'failed', 'error'])
const statusOf = (s?: string): [string, 'ok' | 'bad' | 'warn'] => STATUS[String(s || '').toLowerCase()] ?? [s || '—', 'warn']
const kindLabel = (k: KbKind) => (k === 'tabular' ? 'جدول' : 'مستندات')
const KindIcon = ({ k, size = 22 }: { k: KbKind; size?: number }) => (k === 'tabular' ? <Table2 size={size} /> : <FileText size={size} />)

const DEMO: KnowledgeBase[] = [
  { id: 'demo-kb1', name: 'سياسات الشركة', desc: 'سياسات الاسترجاع والشحن والضمان.', kind: 'unstructured', document_count: 2, agent_ids: ['demo-a1'], documents: [{ id: 'd1', status: 'ready', filename: 'refund-policy.pdf' }, { id: 'd2', status: 'ready', filename: 'shipping.pdf' }] },
  { id: 'demo-kb2', name: 'الفروع وساعات العمل', desc: 'الفروع مع الحي وساعات الدوام ورقم كل فرع.', kind: 'tabular', document_count: 1, agent_ids: [], documents: [{ id: 'd3', status: 'ready', filename: 'branches.xlsx' }] },
]
const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] as VoiceAgent[]

export function DashboardV2KnowledgeBase() {
  const { companyId, isDemo, can } = useWorkspace()
  const pushToast = useToast()
  const canEdit = can('agent.settings') || isDemo
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []
  const agentName = (id: string) => agents.find((a) => a.agent_id === id)?.name ?? 'وكيل'

  const [list, setList] = useState<KnowledgeBase[]>(isDemo ? DEMO : [])
  const [loading, setLoading] = useState(!isDemo)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDel, setConfirmDel] = useState<KnowledgeBase | null>(null)

  const load = useCallback(async () => {
    if (isDemo) return
    try { setList(await kbList()); setError('') } catch (e) { setError(e instanceof Error ? e.message : 'تعذّر تحميل قواعد المعرفة') }
    setLoading(false)
  }, [isDemo])
  useEffect(() => { void load() }, [load])

  async function remove(kb: KnowledgeBase) {
    setConfirmDel(null)
    try {
      if (isDemo) setList((l) => l.filter((x) => x.id !== kb.id)); else { await kbDelete(kb.id); await load() }
      pushToast({ kind: 'success', title: 'انحذفت قاعدة المعرفة' })
    } catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحذف', description: e instanceof Error ? e.message : undefined }) }
  }

  const open = list.find((k) => k.id === openId)
  if (openId && (open || !isDemo)) return (
    <KbDetail id={openId} seed={open} agents={agents} isDemo={isDemo} canEdit={canEdit} onBack={() => { setOpenId(null); void load() }} />
  )

  return (
    <NightPage>
      <style>{CSS}</style>
      <div className="kb-head">
        <div>
          <h1>قاعدة المعرفة</h1>
          <p>ارفع مستنداتك أو جدولك، والوكيل يبحث فيها أثناء المكالمة. اربط كل قاعدة بالوكلاء اللي يحتاجونها.</p>
        </div>
        {canEdit && <button type="button" className="kb-btn" onClick={() => setCreating(true)}><Plus size={16} /> قاعدة معرفة جديدة</button>}
      </div>
      {error && <Card style={{ padding: 16 }}><div className="np-empty">{error}</div></Card>}
      {!loading && !error && list.length === 0 && (
        <Card><EmptyState icon={<BookOpen size={20} />} title="ما عندك قواعد معرفة بعد" description="أنشئ قاعدة وارفع فيها ملفات PDF أو جدول، وربطها بوكيلك." /></Card>
      )}
      <div className="kb-grid">
        {list.map((k) => (
          <div key={k.id} className="kb-card" role="button" tabIndex={0} onClick={() => setOpenId(k.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(k.id) }}>
            <div className="kb-top">
              <span className="kb-tile"><KindIcon k={k.kind} /></span>
              <div className="kb-info"><span className="kb-name">{k.name}</span>{k.desc && <span className="kb-desc">{k.desc}</span>}</div>
            </div>
            <div className="kb-chips">
              <span className="kb-chip">{kindLabel(k.kind)}</span>
              <span className="kb-chip">{k.document_count ?? k.documents?.length ?? 0} {k.kind === 'tabular' ? 'جدول' : 'مستند'}</span>
              {(k.agent_ids ?? []).map((a) => <span key={a} className="kb-chip ok">{agentName(a)}</span>)}
              {!(k.agent_ids ?? []).length && <span className="kb-chip warn">غير مربوطة بوكيل</span>}
              <span style={{ flex: 1 }} />
              {canEdit && <button type="button" className="kb-ic" aria-label={`حذف ${k.name}`} title="حذف" onClick={(e) => { e.stopPropagation(); setConfirmDel(k) }}><Trash2 size={15} /></button>}
            </div>
          </div>
        ))}
      </div>
      <CreateDialog open={creating} onClose={() => setCreating(false)} isDemo={isDemo}
        onCreated={async (id) => { setCreating(false); await load(); if (id) setOpenId(id) }}
        onDemo={(kb) => { setList((l) => [kb, ...l]); setCreating(false); setOpenId(kb.id) }} />
      <Dialog open={!!confirmDel} title="تحذف قاعدة المعرفة؟" onClose={() => setConfirmDel(null)}
        footer={<><Button variant="secondary" onClick={() => setConfirmDel(null)}>إلغاء</Button><Button variant="danger" onClick={() => confirmDel && void remove(confirmDel)}>حذف نهائي</Button></>}>
        <p style={{ margin: 0, lineHeight: 1.8 }}>«{confirmDel?.name}» بتنحذف مع كل ملفاتها، والوكلاء المربوطين فيها ما يقدرون يبحثون فيها بعد كذا.</p>
      </Dialog>
    </NightPage>
  )
}

function CreateDialog({ open, onClose, isDemo, onCreated, onDemo }: {
  open: boolean; onClose: () => void; isDemo: boolean; onCreated: (id?: string) => void | Promise<void>; onDemo: (kb: KnowledgeBase) => void
}) {
  const pushToast = useToast()
  const [kind, setKind] = useState<'documents' | 'table'>('documents')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setKind('documents'); setName(''); setDesc('') } }, [open])
  const ready = name.trim().length > 0 && desc.trim().length > 0

  async function create() {
    if (!ready) return
    if (isDemo) { onDemo({ id: `demo-${Date.now()}`, name: name.trim(), desc: desc.trim(), kind: kind === 'table' ? 'tabular' : 'unstructured', document_count: 0, agent_ids: [], documents: [] }); return }
    setBusy(true)
    try { const out = await kbCreate(name.trim(), desc.trim(), kind); await onCreated(out.id as string | undefined) }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر إنشاء القاعدة', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} title="قاعدة معرفة جديدة" onClose={onClose} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button disabled={!ready || busy} onClick={() => void create()}>{busy ? 'جارِ الإنشاء…' : 'إنشاء'}</Button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <p className="kb-hint" style={{ margin: 0 }}>أعطها اسمًا ووصفًا يخبر الوكيل متى يستخدمها.</p>
        <div className="kb-field">النوع
          <div className="kb-types">
            <button type="button" className="kb-type" aria-pressed={kind === 'documents'} onClick={() => setKind('documents')}><b><FileText size={16} /> مستندات</b><span>ملفات PDF (نصوص) يبحث فيها الوكيل بالمعنى.</span></button>
            <button type="button" className="kb-type" aria-pressed={kind === 'table'} onClick={() => setKind('table')}><b><Table2 size={16} /> جدول</b><span>ورقة CSV أو Excel واحدة يبحث فيها الوكيل حسب الأعمدة.</span></button>
          </div>
          <span className="kb-hint">لا يمكن تغيير النوع بعد إنشاء القاعدة.</span>
        </div>
        <Input label="الاسم" value={name} placeholder="مثال: الأسئلة الشائعة عن المنتج" onChange={(e) => setName(e.target.value)} />
        <label className="kb-field">الوصف
          <textarea rows={3} value={desc} placeholder="إجابات حول ميزات المنتج والأسعار والباقات والمرتجعات." onChange={(e) => setDesc(e.target.value)} />
          <span className="kb-hint">يستخدمه الوكيل لتحديد متى يبحث في قاعدة المعرفة هذه.</span>
        </label>
      </div>
    </Dialog>
  )
}

function KbDetail({ id, seed, agents, isDemo, canEdit, onBack }: {
  id: string; seed?: KnowledgeBase; agents: VoiceAgent[]; isDemo: boolean; canEdit: boolean; onBack: () => void
}) {
  const pushToast = useToast()
  const [kb, setKb] = useState<KnowledgeBase | null>(seed ?? null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [sheetDesc, setSheetDesc] = useState('')
  const [cols, setCols] = useState('')
  const [staged, setStaged] = useState<File | null>(null)
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (isDemo) return
    try { setKb(await kbGet(id)) } catch { /* the list keeps working; a failed refresh just keeps the last view */ }
  }, [id, isDemo])
  useEffect(() => { void load() }, [load])
  // While a file is still being processed, check again every few seconds.
  const pending = (kb?.documents ?? []).some((d) => !FINAL.has(String(d.status || '').toLowerCase()))
  useEffect(() => {
    if (!pending || isDemo) return
    const t = setInterval(() => { void load() }, 4000)
    return () => clearInterval(t)
  }, [pending, isDemo, load])

  if (!kb) return <NightPage><style>{CSS}</style><button type="button" className="kb-back" onClick={onBack}><ArrowRight size={16} /> قواعد المعرفة</button><Card style={{ padding: 16 }}><div className="np-empty">جارِ التحميل…</div></Card></NightPage>
  const isTable = kb.kind === 'tabular'
  const docs = kb.documents ?? []

  async function upload(file: File | undefined) {
    if (!file || !kb) return
    if (isTable && !staged) { setStaged(file); return }
    if (isDemo) {
      const d: KbDoc = { id: `d-${Date.now()}`, status: 'ready', filename: file.name }
      setKb({ ...kb, documents: isTable ? [d] : [...docs, d], document_count: isTable ? 1 : docs.length + 1 }); setStaged(null); return
    }
    setBusy(true)
    try { await kbAddDocument(kb.id, file, isTable ? sheetDesc.trim() : undefined, isTable ? cols.trim() : undefined); pushToast({ kind: 'success', title: 'انرفع الملف، وبيجهز للبحث بعد لحظات' }); setStaged(null); await load() }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر رفع الملف', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }
  function pick(file: File | undefined) { if (!file) return; if (isTable) setStaged(file); else void upload(file) }
  async function saveEdit(name: string, desc: string) {
    if (!kb) return
    if (isDemo) { setKb({ ...kb, name, desc }); setEditing(false); return }
    try { await kbUpdate(kb.id, name, desc); setEditing(false); pushToast({ kind: 'success', title: 'انحفظت التعديلات' }); await load() }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined }) }
  }
  async function removeDoc(d: KbDoc) {
    if (!kb) return
    try {
      if (isDemo) setKb({ ...kb, documents: docs.filter((x) => x.id !== d.id), document_count: docs.length - 1 }); else { await kbDeleteDocument(kb.id, d.id); await load() }
    } catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحذف', description: e instanceof Error ? e.message : undefined }) }
  }
  async function toggleAgent(agentId: string, on: boolean) {
    if (!kb) return
    const next = on ? [...(kb.agent_ids ?? []), agentId] : (kb.agent_ids ?? []).filter((a) => a !== agentId)
    setKb({ ...kb, agent_ids: next })
    if (isDemo) return
    try { await kbSetAgents(kb.id, next) } catch (e) { pushToast({ kind: 'danger', title: 'تعذّر ربط الوكيل', description: e instanceof Error ? e.message : undefined }); await load() }
  }

  return (
    <NightPage>
      <style>{CSS}</style>
      <button type="button" className="kb-back" onClick={onBack}><ArrowRight size={16} /> قواعد المعرفة</button>
      <div className="kb-head">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <span className="kb-tile"><KindIcon k={kb.kind} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22 }}>{kb.name}</h1>
              <span className="kb-chip">{kindLabel(kb.kind)}</span>
              {kb.key && <span className="kb-key">{kb.key}</span>}
            </div>
            {kb.desc && <p>{kb.desc}</p>}
          </div>
        </div>
        {canEdit && <button type="button" className="kb-btn sec" onClick={() => setEditing(true)}><Pencil size={15} /> تعديل</button>}
      </div>
      <EditDialog open={editing} kb={kb} onClose={() => setEditing(false)} onSave={saveEdit} />

      {canEdit && (
        <Card style={{ padding: 18, display: 'grid', gap: 14 }}>
          <b style={{ fontSize: 14, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}><KindIcon k={kb.kind} size={16} /> {isTable ? (docs.length ? 'استبدال الورقة' : 'رفع الورقة') : 'رفع مستند'}</b>
          <div className="kb-drop" data-over={over}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]) }}>
            <Upload size={22} />
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{staged ? staged.name : isTable ? 'أفلت ملف CSV أو Excel هنا، أو انقر للتصفح' : 'أفلت ملف PDF هنا، أو انقر للتصفح'}</span>
            <span className="kb-hint">{isTable ? 'CSV أو XLSX أو XLS — حتى 2 ميجابايت و10,000 صف.' : 'PDF فقط — حتى 20 ميجابايت.'}</span>
            <input ref={fileRef} id="kb-file" type="file" hidden accept={isTable ? '.csv,.xlsx,.xls' : '.pdf,application/pdf'} onChange={(e) => pick(e.target.files?.[0])} />
            <button type="button" className="kb-btn sec" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'جارِ الرفع…' : 'اختر ملفًا'}</button>
          </div>
          {isTable && <>
            <label className="kb-field">وصف الورقة (اختياري)
              <textarea rows={3} value={sheetDesc} placeholder="ما معنى الأعمدة وكيف يسأل الناس عن هذه البيانات." onChange={(e) => setSheetDesc(e.target.value)} />
            </label>
            <label className="kb-field">الأعمدة القابلة للبحث (اختياري)
              <Input value={cols} placeholder="معرّف المورّد، الاسم، المنطقة" onChange={(e) => setCols(e.target.value)} />
              <span className="kb-hint">أسماء الأعمدة مفصولة بفواصل يمكن للوكيل التصفية بها. اتركه فارغًا للسماح بجميع الأعمدة.</span>
            </label>
            <div><button type="button" className="kb-btn" disabled={!staged || busy} onClick={() => void upload(staged ?? undefined)}>{busy ? 'جارِ الرفع…' : docs.length ? 'استبدال الورقة' : 'رفع الورقة'}</button></div>
          </>}
        </Card>
      )}

      <Card style={{ padding: '6px 18px' }}>
        {docs.length === 0 && <div className="np-empty" style={{ padding: '18px 0' }}>ما فيه ملفات بعد. ارفع أول ملف وتجهز للبحث بعد لحظات.</div>}
        {docs.map((d) => {
          const [label, tone] = statusOf(d.status)
          return (
            <div key={d.id} className="kb-row">
              <span className="kb-tile" style={{ width: 36, height: 36, borderRadius: 10 }}><KindIcon k={kb.kind} size={16} /></span>
              <b>{d.title || d.filename || 'ملف'}</b>
              <span className={`kb-chip ${tone}`}>{label}</span>
              {canEdit && <button type="button" className="kb-ic" aria-label="حذف الملف" title="حذف" onClick={() => void removeDoc(d)}><Trash2 size={15} /></button>}
            </div>
          )
        })}
      </Card>

      <Card style={{ padding: 18, display: 'grid', gap: 10 }}>
        <b style={{ fontSize: 14, color: 'var(--ink)' }}>الوكلاء اللي يبحثون فيها</b>
        {agents.length === 0 ? <span className="kb-hint">ما فيه وكلاء مربوطين بحسابك.</span> : (
          <div className="kb-agents">
            {agents.map((a) => (
              <label key={a.agent_id}>
                <input type="checkbox" disabled={!canEdit} checked={(kb.agent_ids ?? []).includes(a.agent_id)} onChange={(e) => void toggleAgent(a.agent_id, e.target.checked)} />
                {a.name || a.agent_id}
              </label>
            ))}
          </div>
        )}
        <span className="kb-hint">الوكيل يبحث في القاعدة المربوطة فيه أثناء المكالمة، حسب وصفها.</span>
      </Card>
    </NightPage>
  )
}

function EditDialog({ open, kb, onClose, onSave }: { open: boolean; kb: KnowledgeBase; onClose: () => void; onSave: (name: string, desc: string) => void | Promise<void> }) {
  const [name, setName] = useState(kb.name)
  const [desc, setDesc] = useState(kb.desc ?? '')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setName(kb.name); setDesc(kb.desc ?? '') } }, [open, kb])
  const ready = name.trim().length > 0 && desc.trim().length > 0
  return (
    <Dialog open={open} title="تعديل قاعدة المعرفة" onClose={onClose} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>إلغاء</Button><Button disabled={!ready || busy} onClick={async () => { setBusy(true); try { await onSave(name.trim(), desc.trim()) } finally { setBusy(false) } }}>{busy ? 'جارِ الحفظ…' : 'حفظ'}</Button></>}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Input label="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="kb-field">الوصف
          <textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <span className="kb-hint">يستخدمه الوكيل لتحديد متى يبحث في قاعدة المعرفة هذه.</span>
        </label>
      </div>
    </Dialog>
  )
}
