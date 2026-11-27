import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, MessageCircle, PhoneCall, Settings2 } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button, Input, Select, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { useSiteWidget, useCallWidget, callSnippet, DEFAULT_CALL, type CallWidget } from '@/lib/queries/siteWidget'
import { NightPage, PageHead, Chip, Toggle } from './shared/night'

const CSS = `
.pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
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

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="الإضافات" sub="أضف الوكيل لموقعك: زر اتصال صوتي من المتصفح، أو محادثة كتابية" />
      <div className="pl-grid">
        {voice && (
          <Card>
            <div className="pl-card">
              <div className="pl-top">
                <span className="pl-icon"><PhoneCall size={20} /></span>
                {call.data?.call_enabled ? <Chip tone="ok">مفعّلة</Chip> : <Chip tone="muted">غير مفعّلة</Chip>}
              </div>
              <h2>ودجة المكالمة عبر الويب</h2>
              <p>زر على موقعك يضغطه الزائر ويكلّم الوكيل الصوتي مباشرة من المتصفح، بدون رقم ولا تطبيق.</p>
              <div className="pl-acts">
                <Button size="sm" disabled={!canEdit || !call.available} onClick={() => setCallOpen(true)}><Settings2 size={14} /> الإعداد والكود</Button>
              </div>
            </div>
          </Card>
        )}
        <Card>
          <div className="pl-card">
            <div className="pl-top">
              <span className="pl-icon"><MessageCircle size={20} /></span>
              {chat.data?.enabled ? <Chip tone="ok">مفعّلة</Chip> : <Chip tone="muted">غير مفعّلة</Chip>}
            </div>
            <h2>ودجة الدردشة</h2>
            <p>نافذة محادثة على موقعك يرد فيها الوكيل كتابيًا على زوارك، وتوصلك المحادثات في «الدردشة على الموقع».</p>
            <div className="pl-acts">
              <Button size="sm" onClick={() => navigate(`${base}/site-widget`)}><Settings2 size={14} /> الإعداد والكود</Button>
            </div>
          </div>
        </Card>
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
