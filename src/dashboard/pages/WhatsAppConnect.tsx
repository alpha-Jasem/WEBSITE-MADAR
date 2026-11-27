import { useEffect, useState } from 'react'
import { Inbox, MessageCircle, Copy, Check } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Card, Button, Input, Dialog, Select, Switch } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { supabase } from '@/lib/supabase'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { NightPage, PageHead, Chip } from './shared/night'
import { useWaStatus, type WaStatus } from '@/lib/queries/whatsappStatus'

// واتساب: connect the company's own number as an inbox (3 steps like the reference: number, Meta IDs, token),
// then choose the agent that answers on it. The whatsapp-connect function checks everything with Meta first.

const CSS = `
.wa-steps-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.wa-steps-bar span { height: 5px; border-radius: 99px; background: var(--line-2); }
.wa-steps-bar span[data-on="true"] { background: var(--ink); }
.wa-head { display: flex; align-items: center; gap: 12px; }
.wa-ico { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--panel-2, var(--line)); color: var(--ink); flex: none; }
.wa-hint { font-size: 12.5px; color: var(--muted); line-height: 1.8; margin: 0; }
.wa-tab { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 12px; font-size: 13.5px; font-weight: 600; color: var(--ink); }
.wa-num { direction: ltr; unicode-bidi: embed; font-family: var(--font-numeral); }
.wa-copy { display: flex; gap: 8px; align-items: center; border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; font-size: 12.5px; direction: ltr; overflow-wrap: anywhere; }
.wa-copy code { flex: 1; min-width: 0; }
.wa-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 0; border-bottom: 1px solid var(--line); }
.wa-row:last-child { border-bottom: 0; }
.wa-row .main { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 2px; }
.wa-row b { font-size: 14px; font-weight: 600; color: var(--ink); }
.wa-row small { font-size: 12.5px; color: var(--muted); line-height: 1.7; }
`
const STEPS = [
  { title: 'الصندوق والرقم', hint: 'اسم الصندوق ورقم واتساب الذي تُرسل منه (E.164 مع +).' },
  { title: 'معرّفات ميتا', hint: 'من تطبيقك في ميتا: صفحة «إرسال رسالة»، اختر رقمك وتطلع لك المعرّفات جنبه.' },
  { title: 'المفتاح والتوزيع', hint: 'مفتاح وصول دائم لمستخدم نظام بصلاحيتي whatsapp_business_messaging و whatsapp_business_management.' },
]
const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] as VoiceAgent[]

async function callConnect(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('whatsapp-connect', { body })
  if (error) {
    let msg = ''
    try { msg = ((await (error as { context?: Response }).context?.json?.()) as { message?: string } | undefined)?.message || '' } catch { /* generic message below */ }
    throw new Error(msg || 'تعذّر الاتصال الحين')
  }
  return data as { inbox_id?: string; webhook?: { callback_url: string | null; verify_token: string | null } | null; can_manage_templates?: boolean }
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
      <div className="wa-copy"><code>{value}</code>
        <button type="button" className="gr-btn" aria-label={`نسخ ${label}`} onClick={() => { navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => {}) }}>{done ? <Check size={14} /> : <Copy size={14} />}</button>
      </div>
    </div>
  )
}

/** «إعدادات واتساب»: the 3-step inbox setup when nothing is connected, the answering agent once it is. */
export function WhatsAppSettingsDialog({ open, onClose, status, reload }: { open: boolean; onClose: () => void; status: WaStatus | null; reload: () => Promise<void> | void }) {
  const { isDemo, companyId } = useWorkspace()
  const pushToast = useToast()
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo || !open ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []
  const connected = !!status?.connected && !!status?.can_reply
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ name: '', phone: '', phoneId: '', waba: '', token: '', auto: true })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ webhook: { callback_url: string | null; verify_token: string | null } | null } | null>(null)
  const [agentId, setAgentId] = useState('')

  useEffect(() => { if (open) { setStep(0); setDone(null); setAgentId(status?.agent_id || '') } }, [open, status?.agent_id])
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))

  const phone = f.phone.replace(/[\s-]/g, '')
  const stepOk = [
    f.name.trim().length > 0 && /^\+[1-9]\d{7,14}$/.test(phone),
    /^\d{8,25}$/.test(f.phoneId.trim()) && /^\d{8,25}$/.test(f.waba.trim()),
    f.token.trim().length >= 40 && !/\s/.test(f.token.trim()),
  ]

  async function save() {
    if (isDemo) { pushToast({ kind: 'info', title: 'عرض تجريبي: ما انربط شيء فعليًا' }); setDone({ webhook: null }); return }
    setBusy(true)
    try {
      const out = await callConnect({ action: 'connect', name: f.name.trim(), phone_number: phone, phone_number_id: f.phoneId.trim(), waba_id: f.waba.trim(), access_token: f.token.trim(), auto_assign: f.auto })
      setF((x) => ({ ...x, token: '' }))
      setDone({ webhook: out?.webhook ?? null })
      pushToast({ kind: 'success', title: 'انشأ صندوق الواتساب', description: out?.can_manage_templates ? undefined : 'المفتاح ما عنده صلاحية إدارة القوالب، فرفع القوالب ما يشتغل.' })
      await reload()
    } catch (e) { pushToast({ kind: 'danger', title: 'ما تم', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }
  async function assign() {
    if (!agentId) return
    if (isDemo) { pushToast({ kind: 'info', title: 'عرض تجريبي: ما انربط شيء فعليًا' }); return }
    setBusy(true)
    try { await callConnect({ action: 'assign', agent_id: agentId }); pushToast({ kind: 'success', title: 'الوكيل صار يرد على الرقم' }); await reload() }
    catch (e) { pushToast({ kind: 'danger', title: 'ما تم', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }
  async function disconnect() {
    if (isDemo) { pushToast({ kind: 'info', title: 'عرض تجريبي: ما انفصل شيء فعليًا' }); return }
    setBusy(true)
    try { await callConnect({ action: 'disconnect' }); pushToast({ kind: 'success', title: 'انفصل الربط' }); await reload(); onClose() }
    catch (e) { pushToast({ kind: 'danger', title: 'ما تم', description: e instanceof Error ? e.message : undefined }) }
    finally { setBusy(false) }
  }

  const agentPicker = (
    <div style={{ display: 'grid', gap: 10 }}>
      <Select label="الوكيل اللي يرد على الرقم" value={agentId} onChange={(e) => setAgentId(e.target.value)}
        options={[{ value: '', label: agents.length ? 'اختر وكيلًا' : 'ما عندك وكلاء بعد' }, ...agents.map((a) => ({ value: a.agent_id, label: a.name }))]} />
      <div><Button disabled={busy || !agentId} onClick={() => void assign()}>{status?.agent_id && status.agent_id === agentId ? 'حفظ' : 'ربط الوكيل'}</Button></div>
    </div>
  )

  let content
  if (done) {
    content = (
      <div style={{ display: 'grid', gap: 14 }}>
        <p className="wa-hint">انشأ الصندوق. {done.webhook ? 'أضف رابط الاستقبال ورمز التحقق تحت في ميتا (إعداد الويب هوك) واشترك في حقل messages عشان توصلك الرسائل.' : 'إذا ما وصلتك رسائل العملاء، تواصل مع فريق مدار يكملون إعداد الاستقبال في ميتا.'}</p>
        {done.webhook?.callback_url && <CopyLine label="رابط الاستقبال (Callback URL)" value={done.webhook.callback_url} />}
        {done.webhook?.verify_token && <CopyLine label="رمز التحقق (Verify token)" value={done.webhook.verify_token} />}
        {agentPicker}
      </div>
    )
  } else if (connected) {
    content = (
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="wa-row"><div className="main"><b>{status?.name || 'رقم الواتساب'}</b><small className="wa-num">{status?.phone_number || '—'}</small></div>
          <Chip tone={status?.token_expired ? 'bad' : 'ok'}>{status?.token_expired ? 'انفصل من ميتا' : 'مربوط'}</Chip></div>
        {agentPicker}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <p className="wa-hint" style={{ marginBottom: 8 }}>فصل الربط يوقف الرد والإرسال من الرقم في لوحتك.</p>
          <Button variant="danger" size="sm" disabled={busy} onClick={() => void disconnect()}>افصل الربط</Button>
        </div>
      </div>
    )
  } else {
    content = (
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>الخطوة {step + 1} من 3</span>
          <div className="wa-steps-bar">{[0, 1, 2].map((i) => <span key={i} data-on={i <= step} />)}</div>
        </div>
        <p className="wa-hint">{STEPS[step].hint}</p>
        {step === 0 && <>
          <Input label="اسم الصندوق" placeholder="مثال: خط الدعم" value={f.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="رقم الهاتف" placeholder="+966512345678" value={f.phone} onChange={(e) => set('phone', e.target.value)} style={{ direction: 'ltr' }} />
          <p className="wa-hint">E.164: الرقم الذي تُرسل منه الرسائل (رمز الدولة مع +).</p>
        </>}
        {step === 1 && <>
          <Input label="معرّف رقم الهاتف (Phone number ID)" value={f.phoneId} onChange={(e) => set('phoneId', e.target.value)} style={{ direction: 'ltr' }} />
          <Input label="معرّف حساب واتساب للأعمال (WABA ID)" value={f.waba} onChange={(e) => set('waba', e.target.value)} style={{ direction: 'ltr' }} />
        </>}
        {step === 2 && <>
          <Input label="مفتاح ميتا (API key)" type="password" value={f.token} onChange={(e) => set('token', e.target.value)} style={{ direction: 'ltr' }} />
          <Switch checked={f.auto} onChange={(v: boolean) => set('auto', v)} label="توزيع المحادثات تلقائيًا على الفريق" />
          <p className="wa-hint">نتأكد من المفتاح والمعرّفات مع ميتا قبل الحفظ، والمفتاح ما يرجع يظهر بعد الحفظ.</p>
        </>}
      </div>
    )
  }

  const footer = done || connected
    ? <Button variant="secondary" onClick={onClose}>إغلاق</Button>
    : <>
        <Button variant="secondary" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? 'إلغاء' : 'رجوع'}</Button>
        {step < 2
          ? <Button disabled={!stepOk[step]} onClick={() => setStep(step + 1)}>متابعة</Button>
          : <Button disabled={busy || !stepOk[2]} onClick={() => void save()}>{busy ? 'جارِ الحفظ…' : 'حفظ'}</Button>}
      </>

  return (
    <Dialog open={open} title="إعدادات واتساب" onClose={onClose} width={560} footer={footer}>
      <style>{CSS}</style>
      <div style={{ display: 'grid', gap: 14 }}>
        <p className="wa-hint">اضبط روبوت المحادثة وبيانات اعتماد صندوق واتساب للأعمال.</p>
        <div className="wa-tab"><Inbox size={15} /> الصندوق</div>
        <div className="wa-head">
          <div className="wa-ico"><MessageCircle size={20} /></div>
          <div><b style={{ fontSize: 16, color: 'var(--ink)' }}>{connected && !done ? 'صندوق واتساب' : 'إنشاء صندوق واتساب'}</b>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{done ? 'الاستقبال والوكيل' : connected ? 'الرقم والوكيل' : STEPS[step].title}</div></div>
        </div>
        {content}
      </div>
    </Dialog>
  )
}

/** The WhatsApp page before a number is connected. */
export function DashboardV2WhatsAppConnect() {
  const { isDemo, isOwner } = useWorkspace()
  const { status, error, loading, reload } = useWaStatus(isDemo)
  const [open, setOpen] = useState(false)
  return (
    <NightPage>
      <style>{CSS}</style>
      <PageHead title="واتساب" sub="محادثات عملائك على رقم الواتساب المربوط" />
      <Card style={{ padding: 28, display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center' }}>
        <div className="wa-ico"><MessageCircle size={20} /></div>
        <b style={{ fontSize: 16, color: 'var(--ink)' }}>صندوق واتساب غير مرتبط</b>
        <p className="wa-hint" style={{ maxWidth: 440 }}>{error || (loading && !status ? 'جارِ قراءة الحالة...' : 'اربط رقم واتساب نشاطك عشان تشوف محادثات عملائك هنا وترد عليهم، ويرد الوكيل تلقائيًا.')}</p>
        {isOwner ? <Button onClick={() => setOpen(true)}>ربط الصندوق</Button> : <p className="wa-hint">الربط لصاحب الحساب فقط.</p>}
      </Card>
      <WhatsAppSettingsDialog open={open} onClose={() => setOpen(false)} status={status} reload={reload} />
    </NightPage>
  )
}
