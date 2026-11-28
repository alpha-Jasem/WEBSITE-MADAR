import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, Copy, ExternalLink, KeyRound, Plus, ShieldAlert, Trash2, Workflow } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useApiKeys, createApiKey, revokeApiKey } from '@/lib/queries/connect'
import { Card, Button, Input, Select, Badge, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage, CardTitle } from './shared/night'
import { HeadCard, NB_CSS } from './shared/nbPage'

const CSS = `
.dv-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-radius: 20px; padding: 22px 24px; border: 1px solid var(--line);
  background: linear-gradient(100deg, color-mix(in srgb, #7c8cff 22%, var(--panel)) 0%, color-mix(in srgb, #c9a8ff 16%, var(--panel)) 55%, color-mix(in srgb, #ffc89a 18%, var(--panel)) 100%); }
.dv-banner b { display: block; font-size: 16px; font-weight: 700; color: var(--ink); }
.dv-banner small { color: var(--muted); font-size: 13.5px; line-height: 1.7; }
.dv-cols { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; }
@media (max-width: 860px) { .dv-cols { grid-template-columns: 1fr; } }
.dv-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 20px; display: grid; gap: 14px; }
.dv-panel h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--ink); }
.dv-panel p { margin: 2px 0 0; font-size: 13px; color: var(--muted); line-height: 1.7; }
.dv-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dv-count { font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted); }
.dv-keys { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.dv-key { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.dv-key:last-child { border-bottom: 0; }
.dv-n { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--line); display: grid; place-items: center; font-size: 12px; color: var(--muted); flex: none; }
.dv-kmain { flex: 1; min-width: 140px; display: grid; gap: 2px; }
.dv-kmain b { direction: ltr; text-align: start; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; color: var(--ink); }
.dv-kmain small { color: var(--muted); font-size: 12px; }
.dv-act { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; font: inherit; font-size: 12.5px; cursor: pointer; color: var(--muted); padding: 4px 6px; border-radius: 8px; }
.dv-act:hover { background: var(--hover-bg); }
.dv-act.del { color: var(--bad, #dc2626); }
.dv-warn { display: grid; gap: 4px; background: color-mix(in srgb, var(--warn, #f59e0b) 12%, var(--panel)); border: 1px solid color-mix(in srgb, var(--warn, #f59e0b) 30%, var(--line)); border-radius: 14px; padding: 12px 14px; }
.dv-warn b { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--ink); }
.dv-warn span { font-size: 12.5px; color: var(--muted); line-height: 1.7; }
.dv-big { height: 46px; border-radius: 14px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.dv-big:focus-visible, .dv-act:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.dv-tile { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--hover-bg); color: var(--ink); flex: none; }
.dv-key-new { direction: ltr; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; background: var(--panel-2); border: 1px dashed var(--line-2); border-radius: 8px; padding: 10px 12px; }
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
      <style>{CSS + NB_CSS}</style>
      <HeadCard title="واجهات المطور" sub="أنشئ مفاتيح API لمساحة العمل هذه وأدرها." />

      <div className="dv-banner">
        <div><b>مرجع API</b><small>تصفح جميع العمليات المتاحة مع وصفها ومدخلاتها: المحادثات، العملاء، التذاكر، الحجوزات، والرسائل.</small></div>
        <a className="nb-btn sec" href={`${API_BASE}/madar-api`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> افتح المرجع</a>
      </div>

      <div className="dv-cols">
        <div className="dv-panel">
          <div className="dv-top">
            <div><h2>مفاتيح API لمساحة العمل</h2><p>استخدم هذه المفاتيح للمصادقة على طلبات الـ API الخارجية.</p></div>
            <span className="dv-count">{keys.length} مفتاح/مفاتيح</span>
          </div>
          {keys.length === 0 ? <div className="np-empty">ما فيه مفاتيح بعد.</div> : (
            <div className="dv-keys">
              {keys.map((k, i) => (
                <div key={k.id} className="dv-key">
                  <span className="dv-n nx-num">{i + 1}</span>
                  <div className="dv-kmain">
                    <b>{k.key_prefix}••••••••</b>
                    <small>{k.name} · {k.permissions.includes('write:all') ? 'قراءة وكتابة' : 'قراءة فقط'} · {DATE(k.created_at)}{k.last_used_at ? ` · آخر استخدام ${DATE(k.last_used_at)}` : ''}</small>
                  </div>
                  <button type="button" className="dv-act" aria-label={`نسخ بداية المفتاح ${k.name}`} onClick={() => void copy(k.key_prefix, 'انسخت بداية المفتاح')}><Copy size={14} /> نسخ</button>
                  {canEdit && <button type="button" className="dv-act del" aria-label={`حذف ${k.name}`} onClick={() => setRemoving({ id: k.id, name: k.name })}><Trash2 size={14} /> حذف</button>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dv-panel">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="dv-tile"><KeyRound size={20} /></span>
            <div><h2>إنشاء مفتاح API جديد</h2><p>أنشئ مفاتيح وصول للتكاملات الخارجية وطلبات الـ API من الخادم.</p></div>
          </div>
          <div className="dv-warn"><b><ShieldAlert size={16} /> حافظ على سرية المفاتيح</b><span>احفظ المفاتيح في بيئات الخادم فقط، ولا تعرضها في تطبيقات العميل العامة. نعرض المفتاح مرة وحدة عند إنشائه.</span></div>
          {canEdit
            ? <button type="button" className="dv-big" onClick={() => setNewKey({ ...CLOSED, open: true })}><Plus size={17} /> إنشاء مفتاح</button>
            : <span className="dv-hint">إنشاء المفاتيح لصاحب الحساب فقط.</span>}
        </div>
      </div>

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

      <div className="dv-banner">
        <div><b>الأتمتة والويب هوك</b><small>قواعد تشتغل لحالها: لما توصل محادثة أو تنفتح تذكرة، أرسل لـ Slack أو Zapier أو n8n أو أي رابط.</small></div>
        <button type="button" className="nb-btn sec" onClick={() => navigate(`${base}/connect`)}><Workflow size={14} /> فتح الأتمتة</button>
      </div>

      <Dialog
        open={newKey.open} title={newKey.created ? 'انسخ مفتاحك الحين' : 'مفتاح API جديد'} onClose={() => setNewKey(CLOSED)}
        footer={newKey.created
          ? <Button onClick={() => setNewKey(CLOSED)}><Check size={14} /> تم</Button>
          : <><Button variant="secondary" onClick={() => setNewKey(CLOSED)}>إلغاء</Button><Button onClick={makeKey}>إنشاء</Button></>}
      >
        {newKey.created ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="dv-key-new">{newKey.created}</div>
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
