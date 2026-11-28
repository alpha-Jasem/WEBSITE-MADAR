import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Headphones, MessageCircle, Mic, Phone, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import {
  useWidgetItems, callConfig, parseOrigins, CALL_TEMPLATES, DEFAULT_CALL_CONFIG, DEFAULT_CALL_PANEL,
  type CallConfig, type CallPanel, type Corner,
} from '@/lib/queries/widgets'
import { NightPage, Seg } from '../shared/night'
import { NB_CSS } from '../shared/nbPage'
import { WG_CSS, Field, Row, ColorField, Tiles, Corners, Range, PreviewFrame } from './widgetUi'

const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }, { agent_id: 'demo-a2', name: 'وكيل المتابعة' }] as VoiceAgent[]
const ICONS = [['phone', Phone], ['chat', MessageCircle], ['headset', Headphones], ['mic', Mic], ['spark', Sparkles]] as const
const SIZE_PX = { sm: 44, md: 56, lg: 68 }

/** Mock site with the call button where it will sit (step 1's preview). */
function ButtonPreview({ cfg }: { cfg: CallConfig }) {
  const px = SIZE_PX[cfg.size]
  const v = cfg.position.startsWith('t') ? { top: 14 } : { bottom: 14 }
  const h = cfg.position.endsWith('l') ? { left: 14 } : { right: 14 }
  const Icon = ICONS.find(([k]) => k === cfg.icon)?.[1] ?? Phone
  const dark = cfg.theme === 'dark'
  return (
    <div className="wg-stage">
      <h3>معاينة</h3>
      <div className="wg-win" style={dark ? { background: '#14151b', borderColor: '#2a2d38' } : undefined} aria-label="معاينة الزر على موقعك">
        <div className="bar" style={dark ? { background: '#1b1d26', borderColor: '#2a2d38' } : undefined}><i style={{ background: '#ef6b6b' }} /><i style={{ background: '#f5c04a' }} /><i style={{ background: '#4cc38a' }} /><span>yoursite.com</span></div>
        <div className="site">
          <i style={{ width: '38%', height: 16, ...(dark ? { background: '#262935' } : {}) }} />
          <i style={{ width: '88%', ...(dark ? { background: '#262935' } : {}) }} /><i style={{ width: '72%', ...(dark ? { background: '#262935' } : {}) }} />
          <div className="b"><i style={dark ? { background: '#262935' } : undefined} /><i style={dark ? { background: '#262935' } : undefined} /></div>
        </div>
        <span className="wg-fab" style={{ ...v, ...h, background: cfg.color, width: cfg.label ? 'auto' : px, minWidth: px, height: px, padding: cfg.label ? '0 18px' : 0, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
          {cfg.iconUrl.startsWith('https://') ? <img src={cfg.iconUrl} alt="" /> : <Icon size={Math.round(px * 0.42)} />}
          {cfg.label && <span>{cfg.label}</span>}
        </span>
      </div>
      <div className="wg-cap">هكذا يظهر الزر على موقعك.</div>
    </div>
  )
}

function TemplateThumb({ patch, brand }: { patch: Partial<CallPanel>; brand: string }) {
  const fill = patch.fill ?? 'header'
  const bg = fill === 'full' ? brand : fill === 'dark' ? '#0d0d14' : fill === 'soft' ? `color-mix(in srgb, ${brand} 14%, #fff)` : `linear-gradient(135deg, ${brand}, color-mix(in srgb, ${brand} 65%, #000))`
  return <div className="th" style={{ background: bg, borderRadius: patch.curve ? '9px 9px 40% 40%' : 9 }}><span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0b0b10', display: 'block' }} /><i style={fill === 'soft' ? { background: 'rgba(0,0,0,.25)' } : undefined} /><i style={{ width: '45%', ...(fill === 'soft' ? { background: 'rgba(0,0,0,.15)' } : {}) }} /></div>
}

export function DashboardV2CallWidgetWizard() {
  const { companyId, isDemo } = useWorkspace()
  const { id } = useParams()
  const editing = !!id && id !== 'new'
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = `${isDemo ? '/demo-review' : '/dashboard'}/plugins`
  const { items, loading, create, update } = useWidgetItems(companyId, isDemo, 'call')
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [agentId, setAgentId] = useState('')
  const [cfg, setCfg] = useState<CallConfig>(DEFAULT_CALL_CONFIG)
  const [origins, setOrigins] = useState('')
  const [direct, setDirect] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [tab, setTab] = useState<'templates' | 'advanced'>('templates')
  const [state, setState] = useState<'agent' | 'user' | 'listen' | 'connecting'>('agent')
  const [saving, setSaving] = useState(false)
  const [filled, setFilled] = useState(!editing)

  useEffect(() => {
    if (!editing || filled || loading) return
    const w = items.find((x) => x.id === id)
    if (!w) return
    setName(w.name); setAgentId(w.agent_id); setCfg(callConfig(w.config)); setOrigins(w.allowed_origins.join('\n')); setDirect(w.direct_link); setEnabled(w.enabled); setFilled(true)
  }, [editing, filled, loading, items, id])

  const p = cfg.panel
  const edit = (patch: Partial<CallConfig>) => setCfg((c) => ({ ...c, ...patch }))
  const editPanel = (patch: Partial<CallPanel>) => setCfg((c) => ({ ...c, panel: { ...c.panel, ...patch } }))
  // The panel's brand follows the button colour until the owner picks a different one in the designer.
  const setColor = (color: string) => setCfg((c) => ({ ...c, color, panel: { ...c.panel, brand: c.panel.brand === c.color ? color : c.panel.brand } }))
  const o = useMemo(() => parseOrigins(origins), [origins])
  const step1Ok = name.trim().length > 0 && !!agentId
  const missing = editing && filled === false && !loading && !items.find((x) => x.id === id)

  async function onSave() {
    if (!step1Ok) { setStep(1); pushToast({ kind: 'danger', title: 'اكتب الاسم واختر الوكيل' }); return }
    if (o.bad) { setStep(1); pushToast({ kind: 'danger', title: 'رابط موقع غير صحيح', description: `${o.bad} — اكتبه بالشكل https://example.com` }); return }
    setSaving(true)
    try {
      const draft = { name, enabled, agent_id: agentId, allowed_origins: o.list, direct_link: direct, config: cfg as unknown as Record<string, unknown> }
      if (editing) { await update(id!, draft); pushToast({ kind: 'success', title: 'انحفظت الودجة' }); navigate(`${base}/widgets`) }
      else { const row = await create(draft); pushToast({ kind: 'success', title: 'تم إنشاء الودجة' }); navigate(`${base}/widgets?code=${row.id}`) }
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  const message = { type: 'madar-call-preview', config: cfg, show: 'panel', state }
  const applyTemplate = (key: string) => {
    const t = CALL_TEMPLATES.find((x) => x.key === key)
    if (t) editPanel({ ...t.patch, template: key })
  }

  if (missing) return <NightPage><style>{WG_CSS + NB_CSS}</style><div className="nb-card np-empty">ما لقينا هذه الودجة.</div></NightPage>

  return (
    <NightPage>
      <style>{WG_CSS + NB_CSS}</style>
      <div className="wg-page">
        <div>
          <button type="button" className="wg-crumb" onClick={() => navigate(`${base}/widgets`)}><ArrowRight size={14} /> ودجة المكالمة عبر الويب</button>
          <h1 className="wg-title">{editing ? name || 'تعديل الودجة' : 'ودجة جديدة'}</h1>
          <div className="wg-steps" aria-label={`الخطوة ${step} من 2`}><i className="on" /><i className={step === 2 ? 'on' : ''} /> الخطوة {step} من 2 · {step === 1 ? 'الودجة' : 'لوحة المكالمة'}</div>
        </div>

        {step === 1 && (
          <div className="wg-grid">
            <div style={{ display: 'grid', gap: 16 }}>
              <div className="wg-card">
                <h2>الأساسيات</h2>
                <Field label="الاسم *"><input className="wg-in" value={name} maxLength={60} placeholder="مثال: خط الدعم" onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="الوكيل *" hint={agents.length === 0 && !agentsRead.loading ? 'ما فيه وكلاء مربوطين بحسابك.' : undefined}>
                  <select className="wg-sel" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                    <option value="">{agentsRead.loading && !isDemo ? 'جارِ التحميل…' : 'اختر وكيلًا'}</option>
                    {agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name || a.agent_id}</option>)}
                  </select>
                </Field>
                {editing && <Row title="تفعيل الودجة" sub="إذا أوقفتها ما تبدأ مكالمات من موقعك" checked={enabled} onChange={setEnabled} />}
              </div>

              <div className="wg-card">
                <h2>المظهر</h2>
                <Tiles label="الأيقونة" value={cfg.icon} onChange={(v) => edit({ icon: v })} options={ICONS.map(([k, I]) => [k, <I key={k} size={20} />] as const)} />
                <Field label="أو الصق رابط صورة"><input className="wg-in" dir="ltr" value={cfg.iconUrl} placeholder="https://…" onChange={(e) => edit({ iconUrl: e.target.value.trim() })} /></Field>
                <Field label="نص الزر (اختياري)" hint="اتركه فارغًا ليظهر الزر دائريًا بالأيقونة فقط."><input className="wg-in" value={cfg.label} maxLength={30} placeholder="اتصل بنا" onChange={(e) => edit({ label: e.target.value })} /></Field>
                <ColorField label="اللون" value={cfg.color} onChange={setColor} />
                <div className="wg-two">
                  <Corners label="الموضع" value={cfg.position} onChange={(v: Corner) => edit({ position: v })} />
                  <Tiles label="الحجم" value={cfg.size} onChange={(v) => edit({ size: v })} options={[['sm', 'صغير'], ['md', 'متوسط'], ['lg', 'كبير']] as const} />
                </div>
                <Field group label="السمة" hint="«تلقائي» يطابق موقع الزائر (أو نظامه) تلقائيًا.">
                  <Seg label="السمة" value={cfg.theme} onChange={(v) => edit({ theme: v })} options={[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']] as const} />
                </Field>
              </div>

              <div className="wg-card">
                <h2>النطاقات المسموح بها (اختياري)</h2>
                <p className="sub">افصل بينها بفواصل أو أسطر. اتركها فارغة للسماح لأي موقع.</p>
                <textarea className="wg-in" dir="ltr" rows={3} value={origins} placeholder="https://example.com, https://app.example.com" onChange={(e) => setOrigins(e.target.value)} />
                {o.bad && <div className="wg-hint" style={{ color: 'var(--bad, #dc2626)' }}>{o.bad} — اكتبه بالشكل https://example.com</div>}
                <div className="wg-hint">الكود يظهر في صفحات موقعك وأي أحد يقدر ينسخه. حدّد مواقعك عشان ما تنصرف دقائقك على موقع غيرك.</div>
              </div>

              <div className="wg-card">
                <h2>رابط مباشر</h2>
                <p className="sub">شارك صفحة عامة يمكن لأي شخص التحدث فيها مع وكيلك، دون موقع أو تضمين.</p>
                <Row title="تفعيل الرابط المباشر" checked={direct} onChange={setDirect} />
              </div>
            </div>
            <ButtonPreview cfg={cfg} />
          </div>
        )}

        {step === 2 && (
          <div className="wg-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="wg-row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
              <h2>مصمّم لوحة المكالمة</h2>
              <button type="button" className="nb-btn sec" onClick={() => setCfg((c) => ({ ...c, panel: { ...DEFAULT_CALL_PANEL, brand: c.color } }))}><RotateCcw size={14} /> إعادة تعيين</button>
            </div>
            <div className="wg-grid" style={{ gap: 0, alignItems: 'stretch' }}>
              <div style={{ padding: 18, display: 'grid', gap: 14, alignContent: 'start', maxHeight: 520, overflowY: 'auto' }}>
                <div className="wg-tabs" role="group" aria-label="التبويبات">
                  <button type="button" aria-pressed={tab === 'templates'} onClick={() => setTab('templates')}>القوالب</button>
                  <button type="button" aria-pressed={tab === 'advanced'} onClick={() => setTab('advanced')}>متقدم</button>
                </div>
                {tab === 'templates' ? (
                  <>
                    <div className="wg-tpl">
                      {CALL_TEMPLATES.map((t) => (
                        <button key={t.key} type="button" className="wg-tp" aria-pressed={p.template === t.key} onClick={() => applyTemplate(t.key)}>
                          <TemplateThumb patch={t.patch} brand={p.brand} />{t.label}
                        </button>
                      ))}
                    </div>
                    <div className="wg-hint">تحتاج إلى تخصيص؟ انتقل إلى «متقدم».</div>
                  </>
                ) : (
                  <>
                    <Field group label="التخطيط"><Seg label="التخطيط" value={p.layout} onChange={(v) => editPanel({ layout: v })} options={[['classic', 'كلاسيكي'], ['centered', 'موسّط'], ['compact', 'مدمج']] as const} /></Field>
                    <ColorField label="لون العلامة" value={p.brand} onChange={(v) => editPanel({ brand: v || cfg.color })} />
                    <Field group label="الصورة الرمزية"><Seg label="الصورة الرمزية" value={p.avatar} onChange={(v) => editPanel({ avatar: v })} options={[['icon', 'أيقونة'], ['image', 'صورة']] as const} /></Field>
                    {p.avatar === 'image' && <Field label="رابط الصورة"><input className="wg-in" dir="ltr" value={p.avatarImage} placeholder="https://…" onChange={(e) => editPanel({ avatarImage: e.target.value.trim() })} /></Field>}
                    <Field group label="الشكل"><Seg label="الشكل" value={p.avatarShape} onChange={(v) => editPanel({ avatarShape: v })} options={[['circle', 'دائري'], ['rounded', 'مدوّر']] as const} /></Field>
                    <Field label="النص"><input className="wg-in" value={p.title} maxLength={40} onChange={(e) => editPanel({ title: e.target.value })} /></Field>
                    <Row title="نص فرعي" checked={p.subOn} onChange={(v) => editPanel({ subOn: v })} />
                    {p.subOn && <input className="wg-in" aria-label="النص الفرعي" value={p.sub} maxLength={60} onChange={(e) => editPanel({ sub: e.target.value })} />}
                    <Field group label="النظام"><Seg label="الخط" value={p.font} onChange={(v) => editPanel({ font: v })} options={[['system', 'النظام'], ['rounded', 'مدوّر'], ['serif', 'بحروف'], ['mono', 'ثابت العرض']] as const} /></Field>
                    <Field group label="مؤشّر الحالة"><Seg label="مؤشر الحالة" value={p.indicator} onChange={(v) => editPanel({ indicator: v })} options={[['ribbons', 'أشرطة'], ['bars', 'أعمدة'], ['orb', 'كرة'], ['dot', 'نقطة']] as const} /></Field>
                    <Row title="إظهار المؤشّر" checked={p.indicatorOn} onChange={(v) => editPanel({ indicatorOn: v })} />
                    <Row title="إظهار زر الكتم" checked={p.muteOn} onChange={(v) => editPanel({ muteOn: v })} />
                    <Field group label="الأزرار"><Seg label="شكل الأزرار" value={p.btnStyle} onChange={(v) => editPanel({ btnStyle: v })} options={[['filled', 'ممتلئ'], ['soft', 'ناعم']] as const} /></Field>
                    <ColorField label="لون زر الإنهاء" value={p.endColor} onChange={(v) => editPanel({ endColor: v })} allowEmpty />
                    <Range label="استدارة الزر" value={p.btnRadius} min={0} max={30} onChange={(v) => editPanel({ btnRadius: v })} />
                    <Range label="العرض" value={p.width} min={240} max={380} onChange={(v) => editPanel({ width: v })} />
                    <Range label="استدارة الزوايا" value={p.radius} min={0} max={40} onChange={(v) => editPanel({ radius: v })} />
                    <Field group label="الظل"><Seg label="الظل" value={p.shadow} onChange={(v) => editPanel({ shadow: v })} options={[['none', 'بدون'], ['soft', 'خفيف'], ['strong', 'قوي']] as const} /></Field>
                    <ColorField label="الخلفية" value={p.bg} onChange={(v) => editPanel({ bg: v })} allowEmpty emptyLabel="تلقائي" />
                    <Field group label="السمة"><Seg label="سمة اللوحة" value={p.theme} onChange={(v) => editPanel({ theme: v })} options={[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']] as const} /></Field>
                  </>
                )}
              </div>
              <div style={{ background: 'var(--panel-2, var(--panel))', borderInlineStart: '1px solid var(--line)', padding: 14, display: 'grid', gap: 10, alignContent: 'start' }}>
                <div className="wg-st" role="group" aria-label="حالة المعاينة">
                  {([['agent', 'الوكيل يتكلم'], ['user', 'أنت تتكلم'], ['listen', 'ينتظر'], ['connecting', 'اتصال']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={state === k} onClick={() => setState(k)}>{l}</button>)}
                </div>
                <div className="wg-frame" style={{ background: '#eceef2' }}>
                  <PreviewFrame src="/widget/call.html?preview=1" readyType="madar-call-ready" message={message} height={420} />
                </div>
                <div className="wg-cap">معاينة حية — تمامًا كما يراها الزوّار</div>
              </div>
            </div>
          </div>
        )}

        <div className="wg-bar">
          {step === 1 ? (
            <>
              <span className="wg-hint">{step1Ok ? '' : 'اكتب الاسم واختر الوكيل للمتابعة.'}</span>
              <div className="acts">
                <Button variant="secondary" onClick={() => navigate(`${base}/widgets`)}>إلغاء</Button>
                <Button disabled={!step1Ok || !!o.bad} onClick={() => setStep(2)}>التالي <ArrowLeft size={14} /></Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}><ArrowRight size={14} /> رجوع</Button>
              <Button disabled={saving} onClick={() => void onSave()}>{saving ? 'جارِ الحفظ...' : editing ? 'حفظ التعديلات' : <><Plus size={14} /> إنشاء الودجة</>}</Button>
            </>
          )}
        </div>
      </div>
    </NightPage>
  )
}
