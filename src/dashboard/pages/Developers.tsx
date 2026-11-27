import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, Copy, ExternalLink, KeyRound, Plus, ShieldAlert, Trash2, Workflow } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApiKeys, createApiKey, revokeApiKey } from '@/lib/queries/connect'
import { Card, Button, Input, Select, Badge, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, EmptyLine } from './shared/night'

const CSS = `
.dv-ref { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.dv-ref-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--hover-bg); color: var(--ink); flex: none; }
.dv-ref-main { flex: 1; min-width: 220px; }
.dv-ref-main b { display: block; font-size: 15px; font-weight: 600; color: var(--ink); }
.dv-ref-main small { color: var(--muted); font-size: 13px; line-height: 1.7; }
.dv-note { display: flex; gap: 10px; align-items: flex-start; background: var(--warn-bg); color: var(--ink); border-radius: 10px; padding: 10px 12px; font-size: 12.5px; line-height: 1.8; margin-bottom: 10px; }
.dv-note svg { color: var(--warn); flex: none; margin-top: 3px; }
.dv-key { direction: ltr; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; background: var(--panel-2); border: 1px dashed var(--line-2); border-radius: 8px; padding: 10px 12px; }
.dv-mono { direction: ltr; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; color: var(--muted); }
.dv-icon-btn { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; display: grid; place-items: center; }
.dv-icon-btn:hover { background: var(--hover-bg); color: var(--ink); }
.dv-code { direction: ltr; text-align: left; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; overflow-x: auto; white-space: pre; color: var(--text-primary); }
.dv-hint { font-size: 12px; color: var(--text-tertiary); line-height: 1.7; }
`
const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const DATE = (iso: string) => new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', dateStyle: 'medium' })
const CLOSED = { open: false, name: '', write: false, created: null as string | null }

/** المطورون: the API reference, the company's API keys, and the command line and MCP setup. */
export function DashboardV2Developers() {
  const { companyId, isDemo, isOwner } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const pushToast = useToast()
  const keys = useApiKeys(companyId, isDemo)
  const [newKey, setNewKey] = useState(CLOSED)
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null)
  const canEdit = isOwner || isDemo
  const sample = 'mk_live_xxxxxxxxxxxxxxxx'

  async function copy(text: string, title: string) {
    try { await navigator.clipboard.writeText(text); pushToast({ kind: 'success', title }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ، حدده وانسخه بنفسك' }) }
  }
  async function makeKey() {
    if (!newKey.name.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم للمفتاح' }); return }
    try { const k = await createApiKey(companyId, isDemo, newKey.name.trim(), newKey.write); setNewKey((n) => ({ ...n, created: k })) }
    catch { pushToast({ kind: 'danger', title: 'تعذّر إنشاء المفتاح' }) }
  }
  async function remove() {
    if (!removing) return
    try { await revokeApiKey(companyId, isDemo, removing.id); pushToast({ kind: 'success', title: 'انحذف المفتاح' }) }
    catch { pushToast({ kind: 'danger', title: 'تعذّر الحذف' }) }
    setRemoving(null)
  }

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="واجهات المطور" sub="اربط أنظمتك بمدار: مرجع الـ API ومفاتيح الوصول وسطر الأوامر" />

      <Card>
        <div className="dv-ref">
          <span className="dv-ref-icon"><BookOpen size={20} /></span>
          <div className="dv-ref-main">
            <b>مرجع API</b>
            <small>كل العمليات المتاحة مع وصفها ومدخلاتها: المحادثات، العملاء، التذاكر، الحجوزات، والرسائل.</small>
          </div>
          <a className="nx-btn" href={`${API_BASE}/madar-api`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> افتح المرجع</a>
        </div>
      </Card>

      <Card>
        <CardTitle aside={canEdit ? <Button size="sm" onClick={() => setNewKey({ ...CLOSED, open: true })}><Plus size={14} /> إنشاء مفتاح</Button> : undefined}>
          <KeyRound size={16} /> مفاتيح API
        </CardTitle>
        <div className="dv-note"><ShieldAlert size={15} /><span>المفتاح يعطي صلاحية الوصول لبيانات شركتك. لا تحطه في كود الموقع أو التطبيق اللي يوصل للزوار، ولا تشاركه. نعرضه مرة وحدة عند إنشائه فقط.</span></div>
        {keys.length === 0 && <EmptyLine>ما فيه مفاتيح بعد.</EmptyLine>}
        {keys.map((k) => (
          <div key={k.id} className="np-row" style={{ flexWrap: 'wrap' }}>
            <div className="np-row-main">
              <b>{k.name}</b>
              <small className="dv-mono">{k.key_prefix}••••••••••••</small>
            </div>
            <Badge tone={k.permissions.includes('write:all') ? 'warning' : 'neutral'}>{k.permissions.includes('write:all') ? 'قراءة وكتابة' : 'قراءة فقط'}</Badge>
            <small style={{ color: 'var(--text-tertiary)' }}>أُنشئ {DATE(k.created_at)}{k.last_used_at ? ` · آخر استخدام ${DATE(k.last_used_at)}` : ''}</small>
            <button type="button" className="dv-icon-btn" aria-label={`نسخ بداية المفتاح ${k.name}`} title="نسخ بداية المفتاح" onClick={() => void copy(k.key_prefix, 'انسخت بداية المفتاح')}><Copy size={15} /></button>
            {canEdit && <button type="button" className="dv-icon-btn" aria-label={`حذف ${k.name}`} title="حذف" onClick={() => setRemoving({ id: k.id, name: k.name })}><Trash2 size={15} /></button>}
          </div>
        ))}
      </Card>

      <Card>
        <CardTitle>جرّب الـ API</CardTitle>
        <p className="dv-hint" style={{ margin: '0 0 10px' }}>حط المفتاح في ترويسة Authorization. للقراءة GET، وللكتابة POST بجسم JSON.</p>
        <div className="dv-code">{`curl -H "Authorization: Bearer ${sample}" \\\n  "${API_BASE}/madar-api/v1/list_conversations?limit=5"`}</div>
      </Card>

      <Card>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>سطر الأوامر وخادم MCP</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            <p className="dv-hint" style={{ margin: 0 }}>أداة سطر الأوامر (تحتاج Node 18 أو أحدث):</p>
            <div className="dv-code">{`curl -fsSL https://madar.software/cli/madar.mjs -o madar.mjs\nnode madar.mjs login ${sample}\nnode madar.mjs conversations --limit 10`}</div>
            <p className="dv-hint" style={{ margin: 0 }}>خادم MCP لأي مساعد ذكي، بنفس صلاحيات المفتاح:</p>
            <div className="dv-code">{`claude mcp add --transport http madar ${API_BASE}/madar-mcp \\\n  --header "Authorization: Bearer ${sample}"`}</div>
          </div>
        </details>
      </Card>

      <Card>
        <div className="dv-ref">
          <span className="dv-ref-icon"><Workflow size={20} /></span>
          <div className="dv-ref-main">
            <b>الأتمتة والويب هوك</b>
            <small>قواعد تشتغل لحالها: لما توصل محادثة أو تنفتح تذكرة، أرسل لـ Slack أو Zapier أو n8n أو أي رابط.</small>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/connect`)}>فتح الأتمتة</Button>
        </div>
      </Card>

      <Dialog
        open={newKey.open} title={newKey.created ? 'انسخ مفتاحك الحين' : 'مفتاح API جديد'} onClose={() => setNewKey(CLOSED)}
        footer={newKey.created
          ? <Button onClick={() => setNewKey(CLOSED)}><Check size={14} /> تم</Button>
          : <><Button variant="secondary" onClick={() => setNewKey(CLOSED)}>إلغاء</Button><Button onClick={makeKey}>إنشاء</Button></>}
      >
        {newKey.created ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="dv-key">{newKey.created}</div>
            <Button variant="secondary" onClick={() => void copy(newKey.created || '', 'انسخ المفتاح')}><Copy size={14} /> نسخ</Button>
            <div className="dv-hint">ما نعرض هذا المفتاح مرة ثانية. لو ضاع احذفه وسوّ واحد جديد.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="اسم المفتاح" value={newKey.name} placeholder="مثال: ربط نظام المبيعات" onChange={(e) => setNewKey((n) => ({ ...n, name: e.target.value }))} />
            <Select label="الصلاحية" value={newKey.write ? 'write' : 'read'} onChange={(e) => setNewKey((n) => ({ ...n, write: e.target.value === 'write' }))}
              options={[{ value: 'read', label: 'قراءة فقط (الأكثر أمانًا)' }, { value: 'write', label: 'قراءة وكتابة (تحويل، تذاكر، حجوزات، رسائل)' }]} />
          </div>
        )}
      </Dialog>

      <Dialog open={!!removing} title="حذف المفتاح" onClose={() => setRemoving(null)}
        footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>إلغاء</Button><Button variant="danger" onClick={remove}>حذف</Button></>}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8, color: 'var(--ink)' }}>حذف «{removing?.name}»؟ أي نظام يستخدمه يوقف فورًا، وما ينفع نرجعه.</p>
      </Dialog>
    </NightPage>
  )
}
