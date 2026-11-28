import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Copy, LayoutGrid, MessageCircle, PhoneCall } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button, Input, Select, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { useSiteWidget, useCallWidget, callSnippet, DEFAULT_CALL, type CallWidget } from '@/lib/queries/siteWidget'
import { NightPage, Chip, Toggle } from './shared/night'
import { HeadCard, NB_CSS } from './shared/nbPage'

const CSS = `
.pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; max-width: 920px; }
.pl-tile { position: relative; display: block; width: 100%; text-align: start; font: inherit; color: inherit; padding: 0; border: 1px solid var(--line); border-radius: 26px; overflow: hidden; background: var(--panel); cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.pl-tile:hover { border-color: var(--line-2, var(--line)); }
.pl-tile:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.pl-img { position: relative; height: 210px; background: linear-gradient(180deg, #0f1118 0%, #4a4d57 55%, #e9eaee 100%); overflow: hidden; }
.pl-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pl-img::after { content: ""; position: absolute; inset: auto 0 0 0; height: 55%; background: linear-gradient(180deg, transparent, var(--panel)); pointer-events: none; }
.pl-mock { position: absolute; inset: 22px 34px 0; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); }
.pl-mock i { position: absolute; border-radius: 8px; background: rgba(255,255,255,.2); }
.pl-badge { position: absolute; z-index: 2; inset-inline-start: 18px; bottom: 6px; width: 44px; height: 44px; border-radius: 50%; background: var(--panel); border: 1px solid var(--line); display: grid; place-items: center; color: var(--ink); box-shadow: 0 6px 18px rgba(0,0,0,.12); }
.pl-state { position: absolute; z-index: 2; inset-inline-end: 14px; top: 14px; }
.pl-body { padding: 4px 22px 20px; display: grid; gap: 4px; }
.pl-body b { font-size: 16px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.pl-body span { font-size: 13.5px; color: var(--muted); line-height: 1.7; }
.pl-card { display: flex; flex-direction: column; gap: 12px; height: 100%; }
.pl-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pl-icon { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--hover-bg); color: var(--ink); }
.pl-card h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--ink); }
.pl-card p { margin: 0; font-size: 13px; line-height: 1.8; color: var(--muted); flex: 1; }
.pl-acts { display: flex; gap: 8px; flex-wrap: wrap; }
.pl-form { display: flex; flex-direction: column; gap: 14px; max-height: 65vh; overflow-y: auto; padding-inline-end: 4px; }
.pl-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pl-row b { font-size: 14px; font-weight: 600; color: var(--ink); display: block; }
.pl-row small, .pl-hint { color: var(--muted); font-size: 12.5px; line-height: 1.7; }
.pl-colors { display: flex; gap: 8px; flex-wrap: wrap; }
.pl-color { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.pl-color[aria-pressed="true"] { border-color: var(--ink); }
.pl-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-secondary); }
.pl-field textarea { border: 1px solid var(--line-2); background: var(--panel-2); color: var(--ink); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13px; direction: ltr; text-align: left; }
.pl-code { direction: ltr; text-align: left; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; color: var(--ink); }
`
const COLORS = ['#4f6bff', '#8053f8', '#0ea5a4', '#16a34a', '#f59e0b', '#e11d48', '#111827']
const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] as VoiceAgent[]

/** الإضافات: the two things a company puts on its own website, each with its own settings. */
export function DashboardV2Plugins() {
  const { companyId, isDemo, isOwner, can, hasModule } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const chat = useSiteWidget(companyId, isDemo)
  const call = useCallWidget(companyId, isDemo)
  const [callOpen, setCallOpen] = useState(false)
  const canEdit = isOwner || isDemo || can('integrations.manage')
  const voice = hasModule('voice')

  const tile = (img: string, kind: 'call' | 'chat', icon: ReactNode, title: string, desc: string, on: boolean, onOpen: () => void, disabled = false) => (
    <button type="button" className="pl-tile" disabled={disabled} onClick={onOpen}>
      <div className="pl-img">
        {/* The picture is dropped in as a file; until it exists the card shows a soft window sketch. */}
        <div className="pl-mock" aria-hidden="true">
          {kind === 'call'
            ? <><i style={{ insetInline: '8%', top: 14, height: 8 }} /><i style={{ insetInline: '6%', top: 36, height: 44 }} /><i style={{ insetInlineStart: '6%', width: '44%', top: 96, height: 60 }} /><i style={{ insetInlineEnd: '6%', width: '44%', top: 96, height: 60 }} /></>
            : <><i style={{ insetInlineStart: '8%', width: '52%', top: 22, height: 26 }} /><i style={{ insetInlineEnd: '8%', width: '44%', top: 62, height: 22 }} /><i style={{ insetInlineStart: '8%', width: '60%', top: 98, height: 30 }} /></>}
        </div>
        <img src={img} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <span className="pl-state">{on ? <Chip tone="ok">مفعّلة</Chip> : <Chip tone="muted">غير مفعّلة</Chip>}</span>
      </div>
      <span className="pl-badge" aria-hidden="true">{icon}</span>
      <div className="pl-body"><b>{title} <ChevronLeft size={15} /></b><span>{desc}</span></div>
    </button>
  )

  return (
    <NightPage>
      <style>{CSS + NB_CSS}</style>
      <HeadCard title="الإضافات" sub="تكاملات وأكواد تضمين لوكلائك." icon={<span className="pl-icon"><LayoutGrid size={20} /></span>} />
      <div className="pl-grid">
        {voice && tile('/plugins/web-call.webp', 'call', <PhoneCall size={20} />, 'ودجة المكالمة عبر الويب', 'أضف زر اتصال إلى أي موقع للتحدث مع وكيلك.', !!call.data?.call_enabled, () => setCallOpen(true), !canEdit || !call.available)}
        {tile('/plugins/chat.webp', 'chat', <MessageCircle size={20} />, 'ودجة الدردشة', 'أضف دردشة إلى موقعك يرد عليها وكيلك وفريقك.', !!chat.data?.enabled, () => navigate(`${base}/site-widget`))}
      </div>
      {voice && <CallWidgetDialog open={callOpen} onClose={() => setCallOpen(false)} widget={call.data} save={call.save} />}
    </NightPage>
  )
}

function CallWidgetDialog({ open, onClose, widget, save }: {
  open: boolean
  onClose: () => void
  widget: CallWidget | null
  save: (w: CallWidget) => Promise<CallWidget>
}) {
  const { companyId, isDemo } = useWorkspace()
  const pushToast = useToast()
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo || !open ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []
  const [draft, setDraft] = useState<CallWidget>(DEFAULT_CALL)
  const [origins, setOrigins] = useState('')
  const [saving, setSaving] = useState(false)

  // Fill the form when it opens (and once the saved settings arrive), not after each save.
  const [filled, setFilled] = useState(false)
  useEffect(() => {
    if (!open) { setFilled(false); return }
    if (filled && widget) return
    const w = widget ?? DEFAULT_CALL
    setDraft(w)
    setOrigins(w.call_allowed_origins.join('\n'))
    if (widget) setFilled(true)
  }, [open, widget, filled])

  const edit = (patch: Partial<CallWidget>) => setDraft((d) => ({ ...d, ...patch }))
  const originList = origins.split(/[\n,]/).map((o) => o.trim()).filter(Boolean)
  const badOrigin = originList.find((o) => !/^https?:\/\/[^/\s]+$/i.test(o.replace(/\/$/, '')))

  async function onSave() {
    if (draft.call_enabled && !draft.call_agent_id) { pushToast({ kind: 'danger', title: 'اختر الوكيل اللي يرد' }); return }
    if (badOrigin) { pushToast({ kind: 'danger', title: 'رابط موقع غير صحيح', description: `${badOrigin} — اكتبه بالشكل https://example.com` }); return }
    setSaving(true)
    setFilled(true)
    try {
      const saved = await save({ ...draft, call_allowed_origins: originList.map((o) => o.replace(/\/$/, '')) })
      // The look lives in the snippet only, so keep what was picked here.
      setDraft({ ...saved, color: draft.color, position: draft.position })
      pushToast({ kind: 'success', title: 'انحفظت الإعدادات' })
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  const snippet = draft.public_key ? callSnippet(draft) : ''
  async function copy() {
    try { await navigator.clipboard.writeText(snippet); pushToast({ kind: 'success', title: 'انسخ الكود' }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ، حدده وانسخه بنفسك' }) }
  }

  return (
    <Dialog open={open} title="ودجة المكالمة عبر الويب" onClose={onClose} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>إغلاق</Button><Button onClick={onSave} disabled={saving}>{saving ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}>
      <div className="pl-form">
        <div className="pl-row">
          <div><b>تفعيل الزر</b><small>إذا أوقفته ما تبدأ مكالمات من موقعك</small></div>
          <Toggle checked={draft.call_enabled} onChange={(v) => edit({ call_enabled: v })} label="تفعيل ودجة المكالمة" />
        </div>
        <Select label="الوكيل اللي يرد" value={draft.call_agent_id} onChange={(e) => edit({ call_agent_id: e.target.value })}
          options={[{ value: '', label: agentsRead.loading ? 'جارِ التحميل…' : agents.length ? 'اختر وكيل' : 'ما فيه وكلاء مربوطين بحسابك' }, ...agents.map((a) => ({ value: a.agent_id, label: a.name || a.agent_id }))]} />
        <Input label="نص الزر" value={draft.call_label} onChange={(e) => edit({ call_label: e.target.value })} />
        <div>
          <span className="pl-hint" style={{ display: 'block', marginBottom: 6 }}>اللون</span>
          <div className="pl-colors" role="group" aria-label="اللون">
            {COLORS.map((c) => <button key={c} type="button" className="pl-color" style={{ background: c }} aria-label={c} aria-pressed={draft.color === c} onClick={() => edit({ color: c })} />)}
          </div>
        </div>
        <Select label="مكان الزر" value={draft.position} onChange={(e) => edit({ position: e.target.value === 'left' ? 'left' : 'right' })}
          options={[{ value: 'right', label: 'أسفل اليمين' }, { value: 'left', label: 'أسفل اليسار' }]} />
        <label className="pl-field">المواقع المسموحة (رابط في كل سطر)
          <textarea rows={3} value={origins} placeholder="https://example.com" onChange={(e) => setOrigins(e.target.value)} />
        </label>
        <div className="pl-hint">الكود يظهر في صفحات موقعك، وأي أحد يقدر ينسخه. حدّد مواقعك هنا عشان ما تنصرف دقائقك على موقع غيرك. لو تركتها فاضية يشتغل الزر في أي موقع.</div>
        {snippet ? (
          <>
            <div className="pl-code">{snippet}</div>
            <div className="pl-acts">
              <Button variant="secondary" size="sm" onClick={copy}><Copy size={14} /> نسخ الكود</Button>
            </div>
            <div className="pl-hint">الصقه قبل &lt;/body&gt; في موقعك. لو غيّرت لون الزر أو نصه أو مكانه انسخ الكود من جديد، أما الوكيل والمواقع فتتغير بدون نسخ.</div>
          </>
        ) : <div className="pl-hint">احفظ مرة وحدة ويطلع لك كود التضمين.</div>}
      </div>
    </Dialog>
  )
}
