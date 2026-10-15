import { useState } from 'react'
import { Plus, Trash2, Play, Pencil, Copy, KeyRound, Zap, ArrowLeft, Check } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTeams } from '@/lib/queries/teams'
import { useWaTemplates } from '@/lib/queries/outreach'
import {
  useConnectRules, saveConnectRule, deleteConnectRule, toggleConnectRule, testConnectRule,
  useApiKeys, createApiKey, revokeApiKey,
  TRIGGER_LABELS, ACTION_LABELS, WEBHOOK_PRESETS, RECIPES,
  type ConnectRule, type TriggerEvent, type ActionType,
} from '@/lib/queries/connect'
import { Card, Button, Input, Select, Badge, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { NightPage, PageHead, CardTitle, EmptyLine, Seg, Toggle, Chip, fmtNum } from './shared/night'

const CSS = `
.cn-recipes { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.cn-recipe { text-align: start; background: var(--panel-2); border: 1px solid var(--line); border-radius: 12px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; color: var(--ink); font: inherit; }
.cn-recipe:hover { border-color: var(--line-2); }
.cn-recipe b { font-size: 13.5px; font-weight: 600; line-height: 1.6; }
.cn-recipe span { font-size: 12.5px; color: var(--muted); line-height: 1.6; }
.cn-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); }
.cn-flow svg { flex: none; color: var(--text-tertiary); }
.cn-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.cn-preset { border: 1px solid var(--line-2); background: none; color: var(--muted); border-radius: 99px; padding: 5px 12px; font: inherit; font-size: 12.5px; cursor: pointer; }
.cn-preset[aria-pressed="true"] { background: var(--raise); color: var(--ink); border-color: var(--ink); }
.cn-code { direction: ltr; text-align: left; background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.7; overflow-x: auto; white-space: pre; color: var(--text-primary); position: relative; }
.cn-copy { position: absolute; top: 6px; right: 6px; border: 1px solid var(--line-2); background: var(--panel); color: var(--muted); border-radius: 7px; padding: 3px 7px; font-size: 11px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.cn-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--text-secondary); }
.cn-field textarea, .cn-field select { border: 1px solid var(--line-2); background: var(--panel-2); color: var(--ink); border-radius: 8px; padding: 8px 10px; font: inherit; font-size: 13.5px; }
.cn-hint { font-size: 12px; color: var(--text-tertiary); line-height: 1.7; }
.cn-key { direction: ltr; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; background: var(--panel-2); border: 1px dashed var(--line-2); border-radius: 8px; padding: 10px 12px; }
.cn-icon-btn { border: 0; background: none; color: var(--muted); cursor: pointer; padding: 6px; border-radius: 8px; display: grid; place-items: center; }
.cn-icon-btn:hover { background: var(--hover-bg); color: var(--ink); }
`

type Draft = Omit<ConnectRule, 'id' | 'run_count' | 'last_run_at'> & { id?: string }
const BLANK: Draft = { name: '', trigger_event: 'conversation.new', conditions: {}, action_type: 'webhook', action_config: { preset: 'slack' }, enabled: true }
const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

function Code({ text }: { text: string }) {
  const pushToast = useToast()
  return (
    <div className="cn-code">
      <button type="button" className="cn-copy" onClick={() => { void navigator.clipboard?.writeText(text); pushToast({ kind: 'success', title: 'اننسخ' }) }}><Copy size={11} /> نسخ</button>
      {text}
    </div>
  )
}

function ruleFlow(r: Pick<ConnectRule, 'trigger_event' | 'action_type' | 'action_config'>) {
  const preset = r.action_type === 'webhook' ? WEBHOOK_PRESETS.find((p) => p.id === r.action_config.preset)?.label : null
  return (
    <span className="cn-flow">
      <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{TRIGGER_LABELS[r.trigger_event]}</b>
      <ArrowLeft size={13} />
      <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{ACTION_LABELS[r.action_type]}{preset ? ` · ${preset}` : ''}</b>
    </span>
  )
}

export function DashboardV2Connect() {
  const { companyId, isDemo, isOwner } = useWorkspace()
  const pushToast = useToast()
  const [tab, setTab] = useState<'rules' | 'api' | 'dev'>('rules')
  const { rules, runs, available } = useConnectRules(companyId, isDemo)
  const { teams } = useTeams(companyId, isDemo)
  const { templates } = useWaTemplates(companyId, isDemo)
  const keys = useApiKeys(companyId, isDemo)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState<{ open: boolean; name: string; write: boolean; created: string | null }>({ open: false, name: '', write: false, created: null })
  const canEdit = isOwner || isDemo

  const cfg = (k: string) => (draft?.action_config[k] as string | undefined) ?? ''
  const setCfg = (k: string, v: unknown) => setDraft((d) => (d ? { ...d, action_config: { ...d.action_config, [k]: v } } : d))
  const preset = WEBHOOK_PRESETS.find((p) => p.id === (draft?.action_config.preset || 'slack'))
  const tpl = templates.find((t) => t.id === draft?.action_config.template_id)

  function setAction(a: ActionType) {
    setDraft((d) => (d ? { ...d, action_type: a, action_config: a === 'webhook' ? { preset: 'slack' } : a === 'ticket' ? { priority: 'normal', subject: '{{summary_text}}' } : {} } : d))
  }

  async function submit() {
    if (!draft) return
    if (!draft.name.trim()) { pushToast({ kind: 'danger', title: 'اكتب اسم للقاعدة' }); return }
    if (draft.action_type === 'webhook') {
      if (draft.action_config.preset === 'telegram') {
        if (!cfg('bot_token') || !cfg('chat_id')) { pushToast({ kind: 'danger', title: 'ناقص توكن البوت أو رقم المحادثة' }); return }
      } else if (!/^https:\/\//.test(cfg('url'))) { pushToast({ kind: 'danger', title: 'الرابط لازم يبدأ بـ https' }); return }
    }
    if (draft.action_type === 'transfer' && !cfg('team_id')) { pushToast({ kind: 'danger', title: 'اختر الفريق' }); return }
    if (draft.action_type === 'whatsapp' && !cfg('template_id')) { pushToast({ kind: 'danger', title: 'اختر القالب' }); return }
    if (draft.action_type === 'transfer' && draft.trigger_event === 'conversation.transferred') { pushToast({ kind: 'danger', title: 'ما ينفع التحويل التلقائي عند حدث تحويل' }); return }
    if (draft.action_type === 'ticket' && draft.trigger_event === 'ticket.created') { pushToast({ kind: 'danger', title: 'ما ينفع فتح تذكرة عند حدث تذكرة' }); return }
    setBusy(true)
    try { await saveConnectRule(companyId, isDemo, draft); setDraft(null); pushToast({ kind: 'success', title: 'انحفظت القاعدة' }) }
    catch { pushToast({ kind: 'danger', title: 'تعذّر الحفظ' }) }
    finally { setBusy(false) }
  }

  async function test(r: ConnectRule) {
    try {
      const out = await testConnectRule(isDemo, r)
      pushToast({ kind: out.status === 'ok' ? 'success' : 'danger', title: out.status === 'ok' ? 'اشتغلت التجربة' : 'فشلت التجربة', description: out.detail })
    } catch (e) { pushToast({ kind: 'danger', title: 'تعذّرت التجربة', description: e instanceof Error ? e.message : undefined }) }
  }

  async function makeKey() {
    try {
      const k = await createApiKey(companyId, isDemo, newKey.name, newKey.write)
      setNewKey((n) => ({ ...n, created: k }))
    } catch { pushToast({ kind: 'danger', title: 'تعذّر إنشاء المفتاح' }) }
  }

  const sampleKey = 'mk_live_xxxxxxxxxxxxxxxx'

  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="الربط والأتمتة" sub="اربط مدار بأي نظام بضغطة زر، أو تحكم فيها من الكود" actions={
        <Seg label="القسم" value={tab} onChange={setTab} options={[['rules', 'الأتمتة'], ['api', 'مفاتيح API'], ['dev', 'CLI و MCP']] as const} />
      } />

      {tab === 'rules' && (
        <>
          {!available && <Card><EmptyLine>الأتمتة غير مفعّلة على هذا الحساب بعد.</EmptyLine></Card>}
          {canEdit && (
            <Card>
              <CardTitle aside="اضغط على وصفة تبدأ منها"><Zap size={16} style={{ color: 'var(--warn)' }} /> وصفات جاهزة</CardTitle>
              <div className="cn-recipes">
                {RECIPES.map((r) => (
                  <button key={r.title} type="button" className="cn-recipe" onClick={() => setDraft({ ...r.rule, enabled: true })}>
                    <b>{r.title}</b><span>{r.desc}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <CardTitle aside={canEdit ? <Button size="sm" onClick={() => setDraft({ ...BLANK })}><Plus size={14} /> قاعدة جديدة</Button> : undefined}>قواعدك</CardTitle>
            {rules.length === 0 && <EmptyLine>ما سوّيت قواعد بعد. ابدأ من وصفة فوق أو أنشئ قاعدتك.</EmptyLine>}
            {rules.map((r) => (
              <div key={r.id} className="np-row" style={{ flexWrap: 'wrap' }}>
                <div className="np-row-main">
                  <b>{r.name}</b>
                  {ruleFlow(r)}
                  <small>{fmtNum(r.run_count)} تشغيل{r.last_run_at ? ` · آخرها ${new Date(r.last_run_at).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' })}` : ''}</small>
                </div>
                {canEdit && (
                  <>
                    <Toggle checked={r.enabled} onChange={(v) => void toggleConnectRule(companyId, isDemo, r.id, v)} label={`تفعيل ${r.name}`} />
                    <Button variant="secondary" size="sm" onClick={() => test(r)}><Play size={13} /> جرّب</Button>
                    <button type="button" className="cn-icon-btn" aria-label="تعديل" onClick={() => setDraft({ ...r })}><Pencil size={15} /></button>
                    <button type="button" className="cn-icon-btn" aria-label="حذف" onClick={() => { if (window.confirm(`حذف «${r.name}»؟`)) void deleteConnectRule(companyId, isDemo, r.id) }}><Trash2 size={15} /></button>
                  </>
                )}
              </div>
            ))}
          </Card>
          {runs.length > 0 && (
            <Card>
              <CardTitle>آخر التشغيلات</CardTitle>
              {runs.slice(0, 12).map((x) => (
                <div key={x.id} className="np-row">
                  <Chip tone={x.status === 'ok' ? 'ok' : 'bad'}>{x.status === 'ok' ? 'نجح' : 'فشل'}</Chip>
                  <div className="np-row-main"><b>{rules.find((r) => r.id === x.rule_id)?.name || 'قاعدة محذوفة'}</b><small>{x.detail}</small></div>
                  <small style={{ color: 'var(--text-tertiary)' }}>{new Date(x.created_at).toLocaleTimeString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' })}</small>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {tab === 'api' && (
        <>
          <Card>
            <CardTitle aside={canEdit ? <Button size="sm" onClick={() => setNewKey({ open: true, name: '', write: false, created: null })}><Plus size={14} /> مفتاح جديد</Button> : undefined}><KeyRound size={16} style={{ color: 'var(--sky)' }} /> مفاتيح API</CardTitle>
            <p className="cn-hint" style={{ margin: '0 0 8px' }}>المفتاح يفتح لك الـ API والـ CLI وخادم MCP. نعرضه مرة وحدة عند إنشائه، وبعدها نحفظ بصمته فقط.</p>
            {keys.length === 0 && <EmptyLine>ما فيه مفاتيح.</EmptyLine>}
            {keys.map((k) => (
              <div key={k.id} className="np-row">
                <div className="np-row-main"><b>{k.name}</b><small dir="ltr" style={{ textAlign: 'start' }}>{k.key_prefix}••••••••</small></div>
                <Badge tone={k.permissions.includes('write:all') ? 'warning' : 'neutral'}>{k.permissions.includes('write:all') ? 'قراءة وكتابة' : 'قراءة فقط'}</Badge>
                <small style={{ color: 'var(--text-tertiary)' }}>{k.last_used_at ? 'استُخدم ' + new Date(k.last_used_at).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Riyadh' }) : 'ما استُخدم'}</small>
                {canEdit && <button type="button" className="cn-icon-btn" aria-label="إلغاء المفتاح" onClick={() => { if (window.confirm(`إلغاء «${k.name}»؟ أي أداة تستخدمه توقف.`)) void revokeApiKey(companyId, isDemo, k.id) }}><Trash2 size={15} /></button>}
              </div>
            ))}
          </Card>
          <Card>
            <CardTitle>جرّب الـ API</CardTitle>
            <p className="cn-hint" style={{ margin: '0 0 10px' }}>كل عملية لها رابط واحد. للقراءة استخدم GET، وللكتابة POST بجسم JSON.</p>
            <Code text={`curl -H "Authorization: Bearer ${sampleKey}" \\\n  "${API_BASE}/madar-api/v1/list_conversations?limit=5"\n\ncurl -X POST -H "Authorization: Bearer ${sampleKey}" -H "Content-Type: application/json" \\\n  -d '{"conversation_key":"chat:966501234567","team":"المبيعات","reason":"عرض سعر"}' \\\n  "${API_BASE}/madar-api/v1/transfer_conversation"`} />
            <p className="cn-hint" style={{ margin: '10px 0 0' }}>قائمة العمليات الكاملة مع وصفها: <a href={`${API_BASE}/madar-api`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky)' }}>{API_BASE}/madar-api</a></p>
          </Card>
        </>
      )}

      {tab === 'dev' && (
        <>
          <Card>
            <CardTitle>سطر الأوامر (CLI)</CardTitle>
            <p className="cn-hint" style={{ margin: '0 0 10px' }}>أداة وحدة بدون تثبيت مكتبات، تحتاج Node 18 أو أحدث. تقرأ عمليات الـ API وتحوّلها لأوامر.</p>
            <Code text={`curl -fsSL https://madar.software/cli/madar.mjs -o madar.mjs\nnode madar.mjs login ${sampleKey}\nnode madar.mjs conversations --limit 10\nnode madar.mjs transfer chat:966501234567 --team المبيعات --reason "عرض سعر"\nnode madar.mjs tickets --status open\nnode madar.mjs help`} />
          </Card>
          <Card>
            <CardTitle>خادم MCP (لـ Claude وأي وكيل ذكي)</CardTitle>
            <p className="cn-hint" style={{ margin: '0 0 10px' }}>يخلّي أي مساعد ذكي يشوف محادثاتك ويحوّلها ويفتح تذاكر ويحجز، بنفس صلاحيات مفتاحك.</p>
            <p className="cn-hint" style={{ margin: '0 0 6px' }}>في Claude Code:</p>
            <Code text={`claude mcp add --transport http madar ${API_BASE}/madar-mcp \\\n  --header "Authorization: Bearer ${sampleKey}"`} />
            <p className="cn-hint" style={{ margin: '12px 0 6px' }}>أو في أي عميل يقرأ ملف إعداد:</p>
            <Code text={JSON.stringify({ mcpServers: { madar: { type: 'http', url: `${API_BASE}/madar-mcp`, headers: { Authorization: `Bearer ${sampleKey}` } } } }, null, 2)} />
            <p className="cn-hint" style={{ margin: '10px 0 0' }}>المفتاح «قراءة فقط» يشوف أدوات القراءة بس. للتحويل والكتابة سوّ مفتاح «قراءة وكتابة».</p>
          </Card>
        </>
      )}

      <Dialog
        open={!!draft} title={draft?.id ? 'تعديل القاعدة' : 'قاعدة جديدة'} onClose={() => setDraft(null)}
        footer={<><Button variant="secondary" onClick={() => setDraft(null)}>إلغاء</Button><Button onClick={submit} disabled={busy}>{busy ? 'جارِ الحفظ...' : 'حفظ'}</Button></>}
      >
        {draft && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto', paddingInlineEnd: 4 }}>
            <Input label="اسم القاعدة" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Select label="لما يصير:" value={draft.trigger_event} onChange={(e) => setDraft({ ...draft, trigger_event: e.target.value as TriggerEvent })}
              options={(Object.keys(TRIGGER_LABELS) as TriggerEvent[]).map((k) => ({ value: k, label: TRIGGER_LABELS[k] }))} />
            {draft.trigger_event.startsWith('conversation.') && draft.trigger_event !== 'conversation.transferred' && (
              <Select label="القناة (اختياري)" value={draft.conditions.channel || ''} onChange={(e) => setDraft({ ...draft, conditions: { ...draft.conditions, channel: e.target.value || undefined } })}
                options={[{ value: '', label: 'كل القنوات' }, { value: 'whatsapp', label: 'واتساب' }, { value: 'phone', label: 'مكالمات' }, { value: 'web', label: 'الموقع' }]} />
            )}
            {draft.trigger_event === 'ticket.created' && (
              <Select label="الأولوية (اختياري)" value={draft.conditions.priority || ''} onChange={(e) => setDraft({ ...draft, conditions: { ...draft.conditions, priority: e.target.value || undefined } })}
                options={[{ value: '', label: 'أي أولوية' }, { value: 'high', label: 'عالية' }, { value: 'urgent', label: 'عاجلة' }]} />
            )}
            <Input label="يحتوي على كلمة (اختياري)" value={draft.conditions.contains || ''} onChange={(e) => setDraft({ ...draft, conditions: { ...draft.conditions, contains: e.target.value || undefined } })} />

            <Select label="سوّ:" value={draft.action_type} onChange={(e) => setAction(e.target.value as ActionType)}
              options={(Object.keys(ACTION_LABELS) as ActionType[]).map((k) => ({ value: k, label: ACTION_LABELS[k] }))} />

            {draft.action_type === 'webhook' && (
              <>
                <div className="cn-presets" role="group" aria-label="الخدمة">
                  {WEBHOOK_PRESETS.map((p) => <button key={p.id} type="button" className="cn-preset" aria-pressed={draft.action_config.preset === p.id} onClick={() => setCfg('preset', p.id)}>{p.label}</button>)}
                </div>
                {preset && <div className="cn-hint">{preset.hint}</div>}
                {draft.action_config.preset === 'telegram' ? (
                  <>
                    <Input label="توكن البوت" value={cfg('bot_token')} onChange={(e) => setCfg('bot_token', e.target.value)} />
                    <Input label="رقم المحادثة (chat id)" value={cfg('chat_id')} onChange={(e) => setCfg('chat_id', e.target.value)} />
                  </>
                ) : (
                  <Input label="رابط الاستقبال (https)" value={cfg('url')} onChange={(e) => setCfg('url', e.target.value)} />
                )}
                <label className="cn-field">نص الرسالة (اختياري)
                  <textarea rows={2} value={cfg('template')} placeholder="مثال: عميل جديد {{customer.name}} {{customer.phone}}" onChange={(e) => setCfg('template', e.target.value)} />
                </label>
                {['generic', 'zapier', 'make', 'n8n', 'sheets'].includes(String(draft.action_config.preset)) && (
                  <Input label="مفتاح التوقيع (اختياري)" value={cfg('secret')} onChange={(e) => setCfg('secret', e.target.value)} />
                )}
                <div className="cn-hint">ندخل لك بيانات الحدث كاملة كـ JSON مع نص مختصر. لو حطيت مفتاح توقيع نرسل ترويسة X-Madar-Signature للتحقق.</div>
              </>
            )}
            {draft.action_type === 'transfer' && (
              <>
                <Select label="الفريق" value={cfg('team_id')} onChange={(e) => setCfg('team_id', e.target.value)} options={[{ value: '', label: teams.length ? 'اختر فريق' : 'سوّ فريق أول من «الفريق والصلاحيات»' }, ...teams.map((t) => ({ value: t.id, label: t.name }))]} />
                <Input label="سبب التحويل (اختياري)" value={cfg('reason')} onChange={(e) => setCfg('reason', e.target.value)} />
              </>
            )}
            {draft.action_type === 'ticket' && (
              <>
                <Input label="عنوان التذكرة" value={cfg('subject')} onChange={(e) => setCfg('subject', e.target.value)} />
                <Select label="الأولوية" value={cfg('priority') || 'normal'} onChange={(e) => setCfg('priority', e.target.value)} options={[{ value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' }, { value: 'high', label: 'عالية' }, { value: 'urgent', label: 'عاجلة' }]} />
              </>
            )}
            {draft.action_type === 'notify' && <Input label="عنوان الإشعار" value={cfg('title')} onChange={(e) => setCfg('title', e.target.value)} />}
            {draft.action_type === 'whatsapp' && (
              <>
                <Select label="القالب المعتمد" value={cfg('template_id')} onChange={(e) => setDraft({ ...draft, action_config: { ...draft.action_config, template_id: e.target.value, params: [] } })}
                  options={[{ value: '', label: templates.length ? 'اختر قالب' : 'ما فيه قوالب، أضفها من «الرسائل الصادرة»' }, ...templates.map((t) => ({ value: t.id, label: t.label }))]} />
                {tpl && tpl.param_labels.map((l, i) => (
                  <Input key={i} label={`قيمة «${l}»`} value={(draft.action_config.params as string[] | undefined)?.[i] ?? ''}
                    placeholder={i === 0 ? '{{customer.name}}' : ''}
                    onChange={(e) => { const p = [...((draft.action_config.params as string[] | undefined) || [])]; p[i] = e.target.value; setCfg('params', p) }} />
                ))}
                <div className="cn-hint">يُرسل لرقم العميل في الحدث. تقدر تستخدم {'{{customer.name}}'} و {'{{booking.date}}'} و {'{{summary_text}}'}.</div>
              </>
            )}
          </div>
        )}
      </Dialog>

      <Dialog
        open={newKey.open} title={newKey.created ? 'انسخ مفتاحك الحين' : 'مفتاح API جديد'} onClose={() => setNewKey({ open: false, name: '', write: false, created: null })}
        footer={newKey.created
          ? <Button onClick={() => setNewKey({ open: false, name: '', write: false, created: null })}><Check size={14} /> تم</Button>
          : <><Button variant="secondary" onClick={() => setNewKey({ open: false, name: '', write: false, created: null })}>إلغاء</Button><Button onClick={makeKey}>إنشاء</Button></>}
      >
        {newKey.created ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="cn-key">{newKey.created}</div>
            <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(newKey.created || ''); pushToast({ kind: 'success', title: 'اننسخ المفتاح' }) }}><Copy size={14} /> نسخ</Button>
            <div className="cn-hint">هذا المفتاح ما نعرضه مرة ثانية. لو ضاع ألغِه وسوّ واحد جديد.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="اسم المفتاح" value={newKey.name} placeholder="مثال: سكربت التقارير" onChange={(e) => setNewKey((n) => ({ ...n, name: e.target.value }))} />
            <Select label="الصلاحية" value={newKey.write ? 'write' : 'read'} onChange={(e) => setNewKey((n) => ({ ...n, write: e.target.value === 'write' }))}
              options={[{ value: 'read', label: 'قراءة فقط (الأكثر أمانًا)' }, { value: 'write', label: 'قراءة وكتابة (تحويل، تذاكر، حجوزات، رسائل)' }]} />
          </div>
        )}
      </Dialog>
    </NightPage>
  )
}
