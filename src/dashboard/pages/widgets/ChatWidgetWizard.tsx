import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Mic, Monitor, Moon, Palette, Plus, Settings2, Smartphone, Sun, Type, ClipboardList, MessageCircle } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import {
  useWidgetItems, chatConfig, parseOrigins, CHAT_TEMPLATES, DEFAULT_CHAT_CONFIG,
  type ChatConfig, type ChatTexts, type FieldMode, type Corner,
} from '@/lib/queries/widgets'
import { NightPage, Seg } from '../shared/night'
import { NB_CSS } from '../shared/nbPage'
import { WG_CSS, Field, Row, ColorField, Corners, Range, Tiles, PreviewFrame } from './widgetUi'

const DEMO_AGENTS = [{ agent_id: 'demo-a1', name: 'وكيل الاستقبال' }] as VoiceAgent[]
const STEPS = [
  ['الإعداد', Settings2], ['التصميم', Palette], ['النصوص', Type], ['قبل المحادثة', ClipboardList], ['صوت', Mic],
] as const
const WIDTH = { sm: 340, md: 380, lg: 430 }
const HEIGHT = { sm: 480, md: 540, lg: 600 }
const MODES: readonly (readonly [FieldMode, string])[] = [['hidden', 'مخفي'], ['optional', 'اختياري'], ['required', 'مطلوب']]
const TEXT_FIELDS: [keyof ChatTexts, string][] = [
  ['welcome', 'رسالة الترحيب'], ['offline', 'عند عدم توفر أحد'], ['ended', 'عند انتهاء المحادثة'], ['preIntro', 'مقدمة نموذج ما قبل الدردشة'], ['placeholder', 'النص داخل مربع الرسالة'], ['newChat', 'زر محادثة جديدة'],
]

export function DashboardV2ChatWidgetWizard() {
  const { companyId, isDemo } = useWorkspace()
  const { id } = useParams()
  const editing = !!id && id !== 'new'
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = `${isDemo ? '/demo-review' : '/dashboard'}/plugins`
  const { items, loading, create, update } = useWidgetItems(companyId, isDemo, 'chat')
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo ? null : companyId || 'admin', 'agents')
  const agents = isDemo ? DEMO_AGENTS : agentsRead.data?.agents ?? []

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [cfg, setCfg] = useState<ChatConfig>(DEFAULT_CHAT_CONFIG)
  const [origins, setOrigins] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filled, setFilled] = useState(!editing)
  const [pState, setPState] = useState<'chat' | 'prechat' | 'offline' | 'ended'>('chat')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [pTheme, setPTheme] = useState<'' | 'light' | 'dark'>('')

  useEffect(() => {
    if (!editing || filled || loading) return
    const w = items.find((x) => x.id === id)
    if (!w) return
    setName(w.name); setCfg(chatConfig(w.config)); setOrigins(w.allowed_origins.join('\n')); setEnabled(w.enabled); setFilled(true)
  }, [editing, filled, loading, items, id])

  const edit = (patch: Partial<ChatConfig>) => setCfg((c) => ({ ...c, ...patch }))
  const editText = (k: keyof ChatTexts, v: string) => setCfg((c) => ({ ...c, texts: { ...c.texts, [k]: v } }))
  const editPre = (patch: Partial<ChatConfig['prechat']>) => setCfg((c) => ({ ...c, prechat: { ...c.prechat, ...patch } }))
  const o = useMemo(() => parseOrigins(origins), [origins])
  const missing = editing && !filled && !loading && !items.find((x) => x.id === id)

  // The same fields the public chat reads (see site-chat), so the preview matches what visitors get.
  const message = useMemo(() => ({
    type: 'madar-preview', state: pState,
    config: {
      title: cfg.displayName || 'تحدث معنا', greeting: cfg.texts.welcome, color: cfg.brand, theme: pTheme || cfg.theme, header: cfg.header, font: cfg.font, glass: cfg.glass,
      logo_url: cfg.logoUrl, chips: cfg.chips.filter(Boolean), texts: cfg.texts, prechat: cfg.prechat, voice: cfg.voice, agent_name: cfg.displayName,
    },
  }), [cfg, pState, pTheme])

  function validate(): string | null {
    if (!name.trim()) return 'اكتب اسم الودجة'
    if (o.bad) return `${o.bad} — اكتبه بالشكل https://example.com`
    if (cfg.voice && !cfg.voiceAgentId) return 'اختر وكيل المكالمات الصوتية'
    return null
  }
  async function onSave() {
    const err = validate()
    if (err) { setStep(err.startsWith('اختر') ? 4 : 0); pushToast({ kind: 'danger', title: err }); return }
    setSaving(true)
    try {
      const clean: ChatConfig = { ...cfg, chips: cfg.chips.map((c) => c.trim()).filter(Boolean).slice(0, 4), replyLimit: Math.min(200, Math.max(1, Math.round(cfg.replyLimit) || 40)) }
      const draft = { name, enabled, agent_id: '', allowed_origins: o.list, direct_link: false, config: clean as unknown as Record<string, unknown> }
      if (editing) { await update(id!, draft); pushToast({ kind: 'success', title: 'انحفظت الودجة' }); navigate(`${base}/chat-widgets`) }
      else { const row = await create(draft); pushToast({ kind: 'success', title: 'تم إنشاء الودجة' }); navigate(`${base}/chat-widgets?code=${row.id}`) }
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally { setSaving(false) }
  }

  if (missing) return <NightPage><style>{WG_CSS + NB_CSS}</style><div className="nb-card np-empty">ما لقينا هذه الودجة.</div></NightPage>
  const last = step === STEPS.length - 1
  const w = device === 'mobile' ? 340 : WIDTH[cfg.size]

  return (
    <NightPage>
      <style>{WG_CSS + NB_CSS}</style>
      <div className="wg-page">
        <div>
          <button type="button" className="wg-crumb" onClick={() => navigate(`${base}/chat-widgets`)}><ArrowRight size={14} /> ودجة الدردشة</button>
          <h1 className="wg-title">{name || (editing ? 'تعديل الودجة' : 'ودجة دردشة جديدة')}</h1>
        </div>

        <div className="wg-grid chat">
          <nav className="wg-nav" aria-label="الخطوات">
            {STEPS.map(([label, Icon], i) => (
              <button key={label} type="button" aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}><Icon size={16} /> {label}<em>{i + 1}</em></button>
            ))}
          </nav>

          <div style={{ display: 'grid', gap: 16 }}>
            {step === 0 && (
              <>
                <div className="wg-card">
                  <h2>الأساسيات</h2>
                  <Field label="الاسم *"><input className="wg-in" value={name} maxLength={60} placeholder="مثال: دعم الموقع" onChange={(e) => setName(e.target.value)} /></Field>
                  {editing && <Row title="تفعيل الودجة" sub="إذا أوقفتها ما تظهر لزوار موقعك" checked={enabled} onChange={setEnabled} />}
                </div>
                <div className="wg-card">
                  <h2>الوكيل</h2>
                  <p className="sub">يرد وكيلك على الزوار من قاعدة معرفة شركتك، وتوصلك المحادثات في صفحة المحادثات.</p>
                  <div className="wg-two">
                    <Field label="الاسم المعروض" hint="يظهر في ترويسة المحادثة."><input className="wg-in" value={cfg.displayName} maxLength={40} placeholder="تسمية اختيارية في الصندوق" onChange={(e) => edit({ displayName: e.target.value })} /></Field>
                    <Field label="ردود الوكيل لكل محادثة" hint="بعد هذا العدد من الردود تنتهي المحادثة.">
                      <input className="wg-in" type="number" min={1} max={200} dir="ltr" value={cfg.replyLimit} onChange={(e) => edit({ replyLimit: Number(e.target.value) })} />
                    </Field>
                  </div>
                  <Row title="السماح بالتحويل إلى إنسان" sub="يطلب الوكيل رقم الزائر ويحوّل المحادثة لفريقك عند الحاجة." checked={cfg.handoff} onChange={(v) => edit({ handoff: v })} />
                </div>
                <div className="wg-card">
                  <h2>المواقع المسموح بها</h2>
                  <p className="sub">يمكن لهذه المواقع فقط تحميل الودجة. افصل بينها بفواصل، مثال: https://example.com</p>
                  <textarea className="wg-in" dir="ltr" rows={3} value={origins} placeholder="https://example.com, https://www.example.com" onChange={(e) => setOrigins(e.target.value)} />
                  {o.bad && <div className="wg-hint" style={{ color: 'var(--bad, #dc2626)' }}>{o.bad} — اكتبه بالشكل https://example.com</div>}
                  {o.list.length === 0 && <div className="wg-hint" style={{ color: 'var(--warn, #b45309)' }}>لم تُضف أي مواقع، لذا يمكن لأي موقع تحميل هذه الودجة. أضف نطاقاتك قبل الإطلاق.</div>}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="wg-card">
                  <h2>القوالب</h2>
                  <p className="sub">لكل قالب تصميمه وألوانه. اختر واحدًا ثم غيّر لون العلامة والتفاصيل أدناه. تبقى نصوصك كما هي.</p>
                  <div className="wg-tpl">
                    {CHAT_TEMPLATES.map((t) => (
                      <button key={t.key} type="button" className="wg-tp" aria-pressed={cfg.template === t.key} onClick={() => edit({ ...t.patch, template: t.key })}>
                        <div className="th" style={{ background: t.patch.theme === 'dark' ? '#17171c' : '#f1f2f6' }}>
                          <span style={{ width: '100%', height: 20, borderRadius: 6, background: t.patch.header === 'plain' ? 'transparent' : t.patch.brand, display: 'block', border: t.patch.header === 'plain' ? '1px solid rgba(128,128,150,.3)' : 0 }} />
                          <i style={{ background: t.patch.theme === 'dark' ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.18)', width: '80%' }} />
                          <i style={{ background: t.patch.brand, width: '50%', opacity: 0.85 }} />
                        </div>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="wg-card">
                  <h2>الموضع والحجم</h2>
                  <div className="wg-two">
                    <Corners label="الموضع" value={cfg.position} onChange={(v: Corner) => edit({ position: v })} />
                    <Tiles label="الحجم" value={cfg.size} onChange={(v) => edit({ size: v })} options={[['sm', 'صغير'], ['md', 'متوسط'], ['lg', 'كبير']] as const} />
                  </div>
                </div>
                <div className="wg-card">
                  <h2>الهوية والمظهر</h2>
                  <ColorField label="لون العلامة" value={cfg.brand} onChange={(v) => edit({ brand: v || cfg.brand })} />
                  <Field group label="المظهر"><Seg label="المظهر" value={cfg.theme} onChange={(v) => edit({ theme: v })} options={[['auto', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']] as const} /></Field>
                  <Field group label="الخط"><Seg label="الخط" value={cfg.font} onChange={(v) => edit({ font: v })} options={[['system', 'النظام'], ['rounded', 'دائري'], ['serif', 'مُذيّل'], ['mono', 'ثابت العرض']] as const} /></Field>
                  <Range label="استدارة الزوايا" value={cfg.radius} min={0} max={40} unit="px" onChange={(v) => edit({ radius: v })} />
                  <Row title="الظل" checked={cfg.shadow} onChange={(v) => edit({ shadow: v })} />
                  <Row title="تأثير زجاجي (شفاف ومموّه)" checked={cfg.glass} onChange={(v) => edit({ glass: v })} />
                  <Field label="رابط الشعار (اختياري)"><input className="wg-in" dir="ltr" value={cfg.logoUrl} placeholder="https://…" onChange={(e) => edit({ logoUrl: e.target.value.trim() })} /></Field>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="wg-card">
                <h2>النصوص</h2>
                <p className="sub">ما يقرأه الزوار. اترك الحقل فارغًا لاستخدام النص الافتراضي.</p>
                {TEXT_FIELDS.map(([k, label]) => (
                  <Field key={k} label={label}><input className="wg-in" value={cfg.texts[k]} maxLength={200} placeholder={DEFAULT_CHAT_CONFIG.texts[k]} onChange={(e) => editText(k, e.target.value)} /></Field>
                ))}
                <h2 style={{ marginTop: 6 }}>ردود سريعة</h2>
                <p className="sub">حتى 4 أزرار يضغطها الزائر في بداية المحادثة.</p>
                {[0, 1, 2, 3].map((i) => (
                  <input key={i} className="wg-in" aria-label={`رد سريع ${i + 1}`} placeholder={`رد سريع ${i + 1}`} maxLength={40} value={cfg.chips[i] || ''}
                    onChange={(e) => { const next = [0, 1, 2, 3].map((j) => cfg.chips[j] || ''); next[i] = e.target.value; edit({ chips: next }) }} />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="wg-card">
                <h2>نموذج ما قبل الدردشة</h2>
                <p className="sub">اطلب من الزوار بياناتهم قبل الرسالة الأولى. بيانات الزوار غير موثّقة.</p>
                <Row title="إظهار نموذج ما قبل الدردشة" checked={cfg.prechat.on} onChange={(v) => { editPre({ on: v }); if (v) setPState('prechat') }} />
                {cfg.prechat.on && (
                  <>
                    {([['name', 'الاسم'], ['email', 'البريد الإلكتروني'], ['phone', 'رقم الجوال']] as const).map(([k, label]) => (
                      <div key={k} className="wg-row"><b>{label}</b><Seg label={label} value={cfg.prechat[k]} onChange={(v) => editPre({ [k]: v })} options={MODES} /></div>
                    ))}
                    <Field label="نص الموافقة (اختياري)" hint="عند إضافته يجب على الزائر تحديده قبل البدء.">
                      <textarea className="wg-in" rows={3} maxLength={300} value={cfg.prechat.consent} placeholder="مثال: أوافق على سياسة الخصوصية" onChange={(e) => editPre({ consent: e.target.value })} />
                    </Field>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="wg-card">
                <h2>المكالمات الصوتية</h2>
                <p className="sub">خلّ الزوار ينتقلون من الكتابة للكلام في نفس الودجة.</p>
                <Row title="اسمح للزوار بالاتصال بالمساعد" sub="يظهر زر اتصال في ترويسة المحادثة، يضغطه الزائر ويبدأ مكالمة صوتية." checked={cfg.voice} onChange={(v) => edit({ voice: v })} />
                {cfg.voice && (
                  <Field label="الوكيل الصوتي *">
                    <select className="wg-sel" value={cfg.voiceAgentId} onChange={(e) => edit({ voiceAgentId: e.target.value })}>
                      <option value="">{agentsRead.loading && !isDemo ? 'جارِ التحميل…' : agents.length ? 'اختر وكيلًا' : 'ما فيه وكلاء صوتيين مربوطين بحسابك'}</option>
                      {agents.map((a) => <option key={a.agent_id} value={a.agent_id}>{a.name || a.agent_id}</option>)}
                    </select>
                  </Field>
                )}
                <div className="wg-hint">المكالمات تشتغل بنفس طريقة ودجة الاتصال، وتُحسب من دقائق الاتصال في باقتك.</div>
              </div>
            )}
          </div>

          <div className="wg-stage">
            <div className="wg-row">
              <div className="wg-st" role="group" aria-label="حالة المعاينة">
                {([['chat', 'المحادثة'], ['prechat', 'قبل الدردشة'], ['offline', 'لا أحد متاح'], ['ended', 'انتهت المحادثة']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={pState === k} onClick={() => setPState(k)}>{l}</button>)}
              </div>
              <div className="wg-dv" style={{ display: 'flex', gap: 4 }}>
                <button type="button" aria-pressed={device === 'desktop'} aria-label="سطح المكتب" onClick={() => setDevice('desktop')}><Monitor size={13} /></button>
                <button type="button" aria-pressed={device === 'mobile'} aria-label="جوال" onClick={() => setDevice('mobile')}><Smartphone size={13} /></button>
                <button type="button" aria-pressed={pTheme === 'light'} aria-label="فاتح" onClick={() => setPTheme(pTheme === 'light' ? '' : 'light')}><Sun size={13} /></button>
                <button type="button" aria-pressed={pTheme === 'dark'} aria-label="داكن" onClick={() => setPTheme(pTheme === 'dark' ? '' : 'dark')}><Moon size={13} /></button>
              </div>
            </div>
            <div className="wg-frame" style={{ display: 'grid', justifyItems: 'center', padding: 16, background: 'linear-gradient(135deg,#dfe3f3,#f3e9f5)' }}>
              <div style={{ width: w, maxWidth: '100%', borderRadius: cfg.radius, overflow: 'hidden', border: '1px solid rgba(128,128,150,.28)', boxShadow: cfg.shadow ? '0 24px 60px rgba(0,0,0,.25)' : 'none', background: cfg.glass ? 'transparent' : '#fff', backdropFilter: cfg.glass ? 'blur(18px)' : undefined }}>
                <PreviewFrame src="/widget/chat.html?preview=1" readyType="madar-preview-ready" message={message} height={HEIGHT[cfg.size]} />
              </div>
              <span style={{ marginTop: 12, width: 52, height: 52, borderRadius: '50%', background: cfg.brand, color: '#fff', display: 'grid', placeItems: 'center', justifySelf: cfg.position.endsWith('l') ? 'start' : 'end', boxShadow: '0 8px 22px rgba(0,0,0,.25)' }}><MessageCircle size={24} /></span>
            </div>
          </div>
        </div>

        <div className="wg-bar">
          <span className="wg-hint">الخطوة {step + 1} من {STEPS.length} · {STEPS[step][0]}</span>
          <div className="acts">
            {step === 0
              ? <Button variant="secondary" onClick={() => navigate(`${base}/chat-widgets`)}>إلغاء</Button>
              : <Button variant="secondary" onClick={() => setStep(step - 1)}><ArrowRight size={14} /> رجوع</Button>}
            {last
              ? <Button disabled={saving} onClick={() => void onSave()}>{saving ? 'جارِ الحفظ...' : editing ? <><Check size={14} /> حفظ التعديلات</> : <><Plus size={14} /> إنشاء الودجة</>}</Button>
              : <Button onClick={() => setStep(step + 1)}>التالي <ArrowLeft size={14} /></Button>}
          </div>
        </div>
      </div>
    </NightPage>
  )
}
