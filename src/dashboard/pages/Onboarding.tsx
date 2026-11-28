import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Loader2, Globe, LayoutTemplate, CalendarCheck, Headphones, UserCheck, Package, Receipt, PhoneForwarded, ClipboardList, CircleHelp, HeartPulse, ShoppingBag, Home, ConciergeBell, Landmark, GraduationCap, Car, Megaphone, LayoutGrid, ChevronUp } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { updateCompany } from '@/lib/dashboardQueries'
import { agentWrite } from '@/lib/queries/voicePlatform'
import { saveAnalysisGroup, syncAnalysisGroups, type AnalysisField } from '@/lib/queries/agentConfig'
import { GlassOrb } from '@/dashboard/components/GlassOrb'
import { useToast } from '@/dashboard/components/uiExtras'

// أول دخول: تسمية مساحة العمل ثم إنشاء أول وكيل (من الموقع أو من قالب)، مراجعة خيارات يقترحها الذكاء الاصطناعي،
// ثم مجموعة التحليل. لا يُنشأ شيء قبل الخطوة الأخيرة.

interface Plan {
  who_are_you: string; goal: string; steps: string; first_sentence: string
  questions: { q: string; options: { label: string; recommended: boolean }[] }[]
  analysis: { name: string; fields: AnalysisField[] }
}
type Step = 'welcome' | 'name' | 'method' | 'industry' | 'caps' | 'details' | 'working' | 'review' | 'analysis' | 'creating' | 'failed' | 'done'

const INDUSTRIES: [string, ReactNode][] = [
  ['الرعاية الصحية', <HeartPulse size={18} />], ['التجزئة والتجارة الإلكترونية', <ShoppingBag size={18} />], ['العقارات', <Home size={18} />], ['المطاعم والضيافة', <ConciergeBell size={18} />],
  ['البنوك والتمويل', <Landmark size={18} />], ['التعليم', <GraduationCap size={18} />], ['السيارات', <Car size={18} />], ['التسويق والإعلان', <Megaphone size={18} />],
  ['الخدمات اللوجستية والتوصيل', <Package size={18} />], ['أخرى', <LayoutGrid size={18} />],
]
const CAPS: [string, ReactNode][] = [
  ['الدعم وحل المشكلات', <Headphones size={18} />], ['حجز المواعيد', <CalendarCheck size={18} />], ['تصفية العملاء المحتملين', <UserCheck size={18} />], ['حالة الطلب والتوصيل', <Package size={18} />],
  ['تحصيل الديون', <Receipt size={18} />], ['الاستقبال وتحويل المكالمات', <PhoneForwarded size={18} />], ['الملاحظات والاستبيانات', <ClipboardList size={18} />], ['أخرى', <CircleHelp size={18} />],
]
const WORKING = ['كتابة شخصية الوكيل', 'صياغة جملة البداية', 'تخطيط خطوات المكالمة', 'تحديد ما يُسجَّل بعد كل مكالمة']

const DEMO_PLAN: Plan = {
  who_are_you: 'أنت سارة، موظفة الاستقبال الصوتية للنشاط. تتكلمين بلهجة سعودية بيضاء مهذبة وبأسلوب ودود ومختصر.',
  goal: 'ترحيبًا بالمتصل، فهم طلبه، والإجابة من المعلومات المتوفرة أو تسجيل طلبه وتحويله لفريق النشاط.',
  steps: '1. رحّبي بالمتصل واذكري اسم النشاط.\n2. اسألي عن حاجته.\n3. جاوبي من المعلومات المتوفرة فقط.\n4. إن لم تعرفي الجواب سجّلي بياناته وأخبريه أن الفريق سيتواصل معه.\n5. اختمي المكالمة بلطف.',
  first_sentence: 'حيّاك الله، معك سارة. كيف أقدر أساعدك؟',
  questions: [
    { q: 'هل تفضّل أن تسجّل سارة طلب الموعد وتتصل بالعميل لتأكيده، أم تؤكد الموعد مباشرة؟', options: [{ label: 'تسجيل الطلب ومعاودة الاتصال للتأكيد', recommended: true }, { label: 'تأكيد الحجز فورًا بحسب جدول متاح', recommended: false }] },
    { q: 'عند حالة طارئة أثناء المكالمة، ماذا تفعل سارة؟', options: [{ label: 'توجيه المتصل فورًا لجهة الطوارئ وتدوين بياناته', recommended: true }, { label: 'تسجيل بيانات المتصل فقط ونقلها للفريق', recommended: false }] },
  ],
  analysis: { name: 'تفاصيل المكالمة', fields: [
    { name: 'غرض الاتصال', type: 'text', description: 'السبب الرئيسي لاتصال العميل' }, { name: 'اسم المتصل', type: 'text', description: 'اسم المتصل كما ذكره' },
    { name: 'هل يحتاج متابعة', type: 'yes_no', description: 'هل يحتاج العميل تواصلًا من الفريق' },
  ] },
}

const CSS = `
.ob { min-height: 100dvh; background: var(--surface-canvas); color: var(--ink); display: flex; flex-direction: column; }
.ob-top { display: flex; align-items: center; justify-content: space-between; padding: 18px 28px; }
.ob-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; } .ob-brand img { width: 34px; height: 34px; border-radius: 10px; }
.ob-top button { border: 0; background: none; color: var(--muted); font: inherit; font-size: 14px; cursor: pointer; padding: 6px 10px; border-radius: 8px; } .ob-top button:hover { color: var(--ink); background: var(--hover-bg); }
.ob-main { flex: 1; display: grid; place-items: center; padding: 20px 20px 60px; }
.ob-box { width: min(560px, 100%); display: grid; gap: 18px; animation: ob-in .4s cubic-bezier(.2,.8,.2,1) both; } .ob-box.wide { width: min(680px, 100%); }
@keyframes ob-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.ob-dots { display: flex; gap: 7px; justify-content: center; margin-bottom: 8px; } .ob-dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--line-2, #444); transition: width .3s, background .3s; } .ob-dots i.on { width: 30px; border-radius: 99px; background: var(--ink); }
.ob h1 { margin: 0; font-size: 30px; font-weight: 800; text-align: center; text-wrap: balance; } .ob h2 { margin: 0; font-size: 24px; font-weight: 800; }
.ob p.sub { margin: 0; color: var(--muted); font-size: 14.5px; line-height: 1.9; } .ob .center { text-align: center; }
.ob-welcome { text-align: center; display: grid; gap: 16px; justify-items: center; } .ob-welcome h1 { font-size: 40px; }
.ob-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 22px; border-radius: 14px; border: 0; background: var(--ink); color: var(--panel); font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; }
.ob-btn:disabled { opacity: .45; cursor: not-allowed; } .ob-btn.full { width: 100%; }
.ob-ghost { height: 42px; padding: 0 18px; border-radius: 12px; border: 1px solid var(--line); background: none; color: var(--ink); font: inherit; font-size: 14px; cursor: pointer; }
.ob-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.ob-f { display: grid; gap: 7px; } .ob-f > span { font-size: 14px; font-weight: 600; } .ob-f small { color: var(--muted); font-size: 12.5px; }
.ob-in { height: 50px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: inherit; font-size: 15px; padding: 0 16px; width: 100%; } textarea.ob-in { height: auto; min-height: 150px; padding: 14px 16px; line-height: 1.8; resize: vertical; }
.ob-in:focus-visible, .ob-btn:focus-visible, .ob-ghost:focus-visible, .ob-opt:focus-visible, .ob-way-h:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.ob-way { border: 1px solid var(--line); border-radius: 22px; background: var(--panel); overflow: hidden; }
.ob-way-h { display: flex; align-items: center; gap: 14px; width: 100%; text-align: start; background: none; border: 0; color: inherit; font: inherit; padding: 18px 20px; cursor: pointer; }
.ob-way-h .ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--hover-bg); flex: none; } .ob-way-h b { display: flex; gap: 8px; align-items: center; font-size: 16px; } .ob-way-h small { display: block; color: var(--muted); font-size: 13px; margin-top: 2px; }
.ob-way-h .tag { font-size: 11px; background: var(--hover-bg); border-radius: 99px; padding: 2px 10px; font-weight: 600; } .ob-way-h .chev { margin-inline-start: auto; color: var(--muted); }
.ob-way-b { padding: 6px 20px 20px; display: grid; gap: 14px; border-top: 1px solid var(--line); padding-top: 18px; }
.ob-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; } @media (max-width: 520px) { .ob-grid { grid-template-columns: 1fr; } }
.ob-opt { display: flex; align-items: center; gap: 12px; text-align: start; min-height: 58px; padding: 12px 14px; border-radius: 16px; border: 1px solid var(--line); background: var(--panel); color: inherit; font: inherit; font-size: 14.5px; cursor: pointer; transition: border-color .15s, background .15s; }
.ob-opt:hover { border-color: var(--line-2, var(--muted)); } .ob-opt[aria-pressed="true"] { border: 2px solid var(--ink); padding: 11px 13px; }
.ob-opt .ic { width: 36px; height: 36px; border-radius: 11px; background: var(--hover-bg); display: grid; place-items: center; flex: none; }
.ob-work { display: grid; gap: 14px; margin-top: 8px; } .ob-work div { display: flex; align-items: center; gap: 12px; font-size: 14.5px; color: var(--muted); } .ob-work div.on { color: var(--ink); font-weight: 600; } .ob-work div.done { color: var(--ink); }
.ob-work i { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2, #555); display: grid; place-items: center; flex: none; } .ob-work div.done i { background: var(--ink); border-color: var(--ink); color: var(--panel); }
.ob-work .spin { animation: ob-spin 1s linear infinite; } @keyframes ob-spin { to { transform: rotate(360deg); } }
.ob-q { border: 1px solid var(--line); border-radius: 20px; padding: 18px; background: var(--panel); display: grid; gap: 12px; } .ob-q > b { font-size: 15px; line-height: 1.8; }
.ob-opt .rec { margin-inline-start: auto; font-size: 11px; background: var(--hover-bg); border-radius: 99px; padding: 2px 10px; }
.ob-chk { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--line-2, #555); display: grid; place-items: center; flex: none; color: var(--panel); } .ob-opt[aria-pressed="true"] .ob-chk { background: var(--ink); border-color: var(--ink); }
.ob-grp { border: 1px solid var(--line); border-radius: 20px; background: var(--panel); padding: 16px; display: grid; gap: 12px; }
.ob-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; } .ob-field { border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: grid; gap: 4px; } .ob-field b { font-size: 14px; } .ob-field small { color: var(--muted); font-size: 12.5px; line-height: 1.7; } .ob-field em { font-style: normal; font-size: 11px; background: var(--hover-bg); border-radius: 99px; padding: 2px 9px; width: fit-content; }
.ob-err { color: var(--bad, #dc2626); font-size: 13.5px; line-height: 1.8; }
.ob-orb { display: grid; justify-items: center; margin-bottom: 4px; }
@media (prefers-reduced-motion: reduce) { .ob-box, .ob-work .spin { animation: none; } }
`

const TYPE_LABEL: Record<string, string> = { text: 'نص', number: 'رقم', yes_no: 'نعم/لا' }
const errText = (e: unknown) => (e instanceof Error ? e.message : 'تعذّر إكمال الطلب')

export function DashboardV2Onboarding() {
  const { companyId, isDemo, companyName, companySettings, refreshAccount, logout } = useWorkspace()
  const navigate = useNavigate()
  const pushToast = useToast()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const [step, setStep] = useState<Step>('welcome')
  const [wsName, setWsName] = useState(companyName || '')
  const [way, setWay] = useState<'site' | 'template'>('site')
  const [site, setSite] = useState('https://')
  const [bizName, setBizName] = useState('')
  const [agentName, setAgentName] = useState('سارة')
  const [industry, setIndustry] = useState('')
  const [caps, setCaps] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [useGroup, setUseGroup] = useState(true)
  const [workIdx, setWorkIdx] = useState(0)
  const [error, setError] = useState('')
  const [agentId, setAgentId] = useState('')
  const [busy, setBusy] = useState(false)
  const nameTouched = useRef(false)
  useEffect(() => { if (!nameTouched.current && companyName) setWsName(companyName) }, [companyName])
  useEffect(() => { if (!bizName && wsName) setBizName(wsName) }, [wsName]) // eslint-disable-line react-hooks/exhaustive-deps

  const dotIndex = step === 'done' ? 3 : step === 'welcome' ? 0 : step === 'name' ? 0 : ['method', 'industry', 'caps', 'details'].includes(step) ? 1 : step === 'working' ? 2 : 3

  async function markDone(tour = false) {
    if (isDemo || !companyId) return
    await updateCompany(companyId, { clinic_settings: { ...companySettings, onboarded: true, ...(tour ? { tour: 'pending' } : {}) } }).catch(() => null)
    await refreshAccount().catch(() => null)
  }
  async function skip() { await markDone(); navigate(base, { replace: true }) }

  async function saveName() {
    setError('')
    const n = wsName.trim()
    if (!n) return
    if (!isDemo && companyId && n !== companyName) {
      setBusy(true)
      try { await updateCompany(companyId, { name: n }) } catch (e) { setError(errText(e)); setBusy(false); return }
      setBusy(false)
    }
    if (!bizName.trim()) setBizName(n)
    setStep('method')
  }

  async function generate() {
    setError(''); setStep('working'); setWorkIdx(0)
    const tick = window.setInterval(() => setWorkIdx((i) => Math.min(i + 1, WORKING.length - 1)), 3200)
    try {
      let p: Plan
      if (isDemo || !companyId) {
        await new Promise((r) => setTimeout(r, 4200)); p = DEMO_PLAN
      } else {
        const { data, error: err } = await supabase.functions.invoke('onboarding-agent', {
          body: { business_name: bizName.trim() || wsName.trim(), agent_name: agentName.trim(), website: way === 'site' ? site.trim() : site.trim().length > 8 ? site.trim() : '', industry: way === 'template' ? industry : '', capabilities: way === 'template' ? caps : [], instructions: way === 'template' ? instructions.trim() : '' },
        })
        if (err || data?.error) {
          const code = data?.error
          throw new Error(code === 'site_unreadable' ? 'ما قدرنا نقرأ هذا الموقع. تأكد من الرابط أو اختر «استخدام قالب».' : 'تعذّر تجهيز الوكيل الآن. حاول مرة ثانية.')
        }
        p = data.plan as Plan
      }
      window.clearInterval(tick); setWorkIdx(WORKING.length)
      await new Promise((r) => setTimeout(r, 500))
      setPlan(p); setAnswers(p.questions.map((q) => Math.max(0, q.options.findIndex((o) => o.recommended))))
      setStep(p.questions.length ? 'review' : 'analysis')
    } catch (e) {
      window.clearInterval(tick); setError(errText(e)); setStep('failed')
    }
  }

  async function create() {
    if (!plan) return
    setError(''); setStep('creating'); setBusy(true)
    const decisions = plan.questions.map((q, i) => `- ${q.q} ← ${q.options[answers[i]]?.label ?? ''}`).join('\n')
    const fields = {
      name: agentName.trim() || 'سارة', who_are_you: plan.who_are_you, goal: plan.goal,
      steps: plan.steps + (decisions ? `\n\nقرارات صاحب النشاط:\n${decisions}` : ''), first_sentence: plan.first_sentence,
      start_first: false, allow_interruptions: true, languages: ['ar'],
    }
    try {
      if (isDemo || !companyId) { await new Promise((r) => setTimeout(r, 1500)); setAgentId('demo'); setBusy(false); setStep('done'); pushToast({ kind: 'success', title: `الوكيل ${agentName.trim() || 'سارة'} جاهز لاستقبال المكالمات` }); return }
      const out = await agentWrite<{ agent?: { agent_id?: string } }>('create', { fields })
      const newId = String(out?.agent?.agent_id ?? '')
      if (useGroup && newId && plan.analysis.fields.length) {
        await saveAnalysisGroup(companyId, false, { name: plan.analysis.name, description: null, fields: plan.analysis.fields, agent_ids: [newId] })
        await syncAnalysisGroups().catch(() => null)
      }
      await markDone(true)
      setAgentId(newId)
      setBusy(false); setStep('done')
      pushToast({ kind: 'success', title: `الوكيل ${agentName.trim() || 'سارة'} جاهز لاستقبال المكالمات` })
    } catch (e) { setError(errText(e)); setStep('analysis'); setBusy(false) }
  }

  const dots = <div className="ob-dots" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i === dotIndex ? 'on' : ''} />)}</div>
  const back = (to: Step) => <button type="button" className="ob-ghost" onClick={() => { setError(''); setStep(to) }}>رجوع</button>
  const Next = ArrowLeft

  let body: ReactNode = null
  if (step === 'welcome') body = (
    <div className="ob-box ob-welcome">
      <div className="ob-orb"><GlassOrb size={96} energy={0.5} /></div>
      <h1>أهلًا بك في مدار</h1>
      <p className="sub">لنجهّز مساحة عملك وأول وكيل صوتي لك. تأخذ دقائق قليلة.</p>
      <button type="button" className="ob-btn" onClick={() => setStep('name')}>ابدأ <Next size={16} /></button>
    </div>
  )
  if (step === 'name') body = (
    <div className="ob-box">{dots}
      <div><h2>سمِّ مساحة العمل</h2><p className="sub">مساحة العمل تضم وكلاءك وأرقامك وسجل مكالماتك.</p></div>
      <label className="ob-f"><span>اسم مساحة العمل</span><input className="ob-in" value={wsName} maxLength={80} onChange={(e) => { nameTouched.current = true; setWsName(e.target.value) }} /><small>يمكنك تغيير الاسم لاحقًا من الإعدادات.</small></label>
      {error && <div className="ob-err" role="alert">{error}</div>}
      <div className="ob-row"><button type="button" className="ob-ghost" onClick={() => setStep('welcome')}>رجوع</button><button type="button" className="ob-btn" disabled={!wsName.trim() || busy} onClick={() => void saveName()}>{busy ? 'جارِ الحفظ…' : <>متابعة <Next size={16} /></>}</button></div>
    </div>
  )
  if (step === 'method') body = (
    <div className="ob-box">{dots}
      <div><h2>أنشئ أول وكيل لك</h2><p className="sub">اختر طريقة البدء. يمكنك تعديل كل شيء بعد الإنشاء.</p></div>
      <div className="ob-way">
        <button type="button" className="ob-way-h" aria-expanded={way === 'site'} onClick={() => setWay('site')}>
          <span className="ic"><Globe size={19} /></span><span><b>من موقعك الإلكتروني <span className="tag">موصى به</span></b><small>يقرأ مدار موقعك ويبني وكيلًا يعرف نشاطك.</small></span>{way === 'site' && <ChevronUp size={16} className="chev" />}
        </button>
        {way === 'site' && (
          <div className="ob-way-b">
            <label className="ob-f"><span>موقع الشركة <b style={{ color: 'var(--bad, #dc2626)' }}>*</b></span><input className="ob-in" dir="ltr" value={site} placeholder="https://" onChange={(e) => setSite(e.target.value)} /><small>أدخل الرابط كاملًا بدءًا بـ https://</small></label>
            <label className="ob-f"><span>اسم النشاط</span><input className="ob-in" value={bizName} onChange={(e) => setBizName(e.target.value)} /></label>
            <label className="ob-f"><span>اسم الوكيل</span><input className="ob-in" value={agentName} onChange={(e) => setAgentName(e.target.value)} /></label>
            <button type="button" className="ob-btn full" disabled={!/^https:\/\/[^/\s]+\.[^/\s]+/.test(site.trim()) || !bizName.trim() || !agentName.trim()} onClick={() => void generate()}>أنشئ وكيلي <Next size={16} /></button>
          </div>
        )}
      </div>
      <div className="ob-way">
        <button type="button" className="ob-way-h" onClick={() => { setWay('template'); setStep('industry') }}>
          <span className="ic"><LayoutTemplate size={19} /></span><span><b>استخدام قالب</b><small>اختر مجال نشاطك وما يتولاه الوكيل، خطوة بخطوة.</small></span><Next size={16} className="chev" />
        </button>
      </div>
      <div className="ob-row"><button type="button" className="ob-ghost" onClick={() => setStep('name')}>رجوع</button><button type="button" className="ob-ghost" style={{ border: 0, color: 'var(--muted)' }} onClick={() => void skip()}>تخطي الآن</button></div>
    </div>
  )
  if (step === 'industry') body = (
    <div className="ob-box wide">{dots}
      <div><h2>اختر نوع النشاط</h2><p className="sub">يكيّف الوكيل أسلوبه وسلوكه وفقًا لهذا المجال.</p></div>
      <div className="ob-grid">{INDUSTRIES.map(([label, icon]) => <button key={label} type="button" className="ob-opt" aria-pressed={industry === label} onClick={() => setIndustry(label)}><span className="ic">{icon}</span>{label}</button>)}</div>
      <div className="ob-row">{back('method')}<button type="button" className="ob-btn" disabled={!industry} onClick={() => setStep('caps')}>متابعة <Next size={16} /></button></div>
    </div>
  )
  if (step === 'caps') body = (
    <div className="ob-box wide">{dots}
      <div><h2>اختر القدرات</h2><p className="sub">اختر ما يتولاه الوكيل في المكالمة. يمكنك اختيار أكثر من خيار.</p></div>
      <div className="ob-grid">{CAPS.map(([label, icon]) => <button key={label} type="button" className="ob-opt" aria-pressed={caps.includes(label)} onClick={() => setCaps((c) => (c.includes(label) ? c.filter((x) => x !== label) : [...c, label]))}><span className="ic">{icon}</span>{label}</button>)}</div>
      <div className="ob-row">{back('industry')}<button type="button" className="ob-btn" disabled={caps.length === 0} onClick={() => setStep('details')}>متابعة <Next size={16} /></button></div>
    </div>
  )
  if (step === 'details') body = (
    <div className="ob-box wide">{dots}
      <h2>بيانات النشاط</h2>
      <div className="ob-grid">
        <label className="ob-f"><span>اسم النشاط *</span><input className="ob-in" value={bizName} onChange={(e) => setBizName(e.target.value)} /></label>
        <label className="ob-f"><span>اسم الوكيل *</span><input className="ob-in" value={agentName} onChange={(e) => setAgentName(e.target.value)} /></label>
      </div>
      <label className="ob-f"><span>الموقع الإلكتروني (اختياري)</span><input className="ob-in" dir="ltr" value={site === 'https://' ? '' : site} placeholder="https://" onChange={(e) => setSite(e.target.value)} /><small>إن أدخلته يقرأ الوكيل الموقع لمعرفة الخدمات والأسعار وأوقات العمل.</small></label>
      <label className="ob-f"><span>التعليمات *</span><small>صف خدماتك وأوقات العمل والأسعار والسياسات، وما ينبغي أن يفعله الوكيل في المكالمة.</small><textarea className="ob-in" value={instructions} maxLength={2500} onChange={(e) => setInstructions(e.target.value)} placeholder="صف خدماتك وأوقات العمل والأسعار والسياسات، وما ينبغي أن يفعله الوكيل في المكالمة." /></label>
      <div className="ob-row">{back('caps')}<button type="button" className="ob-btn" disabled={!bizName.trim() || !agentName.trim() || !instructions.trim()} onClick={() => void generate()}>إنشاء الوكيل</button></div>
    </div>
  )
  if (step === 'working') body = (
    <div className="ob-box">{dots}
      <div><h2>جارٍ تجهيز الوكيل</h2><p className="sub">تتم كتابة الشخصية وجملة البداية وخطوات المكالمة. قد يستغرق ذلك لحظات.</p></div>
      <div className="ob-work" role="status" aria-live="polite">
        {WORKING.map((t, i) => <div key={t} className={i < workIdx ? 'done' : i === workIdx ? 'on' : ''}><i>{i < workIdx ? <Check size={13} /> : i === workIdx ? <Loader2 size={13} className="spin" /> : null}</i>{t}</div>)}
      </div>
    </div>
  )
  if (step === 'done') body = (
    <div className="ob-box" style={{ textAlign: 'center', justifyItems: 'center' }}>{dots}
      <span style={{ width: 58, height: 58, borderRadius: '50%', background: 'var(--ink)', color: 'var(--panel)', display: 'grid', placeItems: 'center' }}><Check size={26} /></span>
      <div><h2>الوكيل {agentName.trim() || 'سارة'} جاهز</h2><p className="sub">تم إعداد وكيلك في {wsName.trim() || 'مساحة عملك'}. افتحه لتجربة مكالمة أو لضبط ما يقوله.</p></div>
      <div className="ob-row" style={{ gap: 10 }}>
        <button type="button" className="ob-btn" onClick={() => navigate(agentId && agentId !== 'demo' ? `${base}/agents/${agentId}/edit` : `${base}/agents${isDemo ? '?tour=1' : ''}`, { replace: true })}>فتح الوكيل <Next size={16} /></button>
        <button type="button" className="ob-ghost" onClick={() => navigate(`${base}${isDemo ? '?tour=1' : ''}`, { replace: true })}>الذهاب إلى لوحة التحكم</button>
      </div>
    </div>
  )
  if (step === 'failed') body = (
    <div className="ob-box">{dots}
      <div><h2>تعذّر تجهيز الوكيل</h2><p className="ob-err" role="alert">{error}</p></div>
      <div className="ob-row">{back('method')}<button type="button" className="ob-btn" onClick={() => void generate()}>حاول مرة ثانية</button></div>
    </div>
  )
  if (step === 'review' && plan) body = (
    <div className="ob-box wide">{dots}
      <div><h2>مراجعة الخيارات</h2><p className="sub">غيّر أي خيار أدناه، أو أبقِ الخيار الموصى به.</p></div>
      {plan.questions.map((q, qi) => (
        <div key={qi} className="ob-q"><b>{q.q}</b>
          {q.options.map((o, oi) => (
            <button key={oi} type="button" className="ob-opt" aria-pressed={answers[qi] === oi} onClick={() => setAnswers((a) => a.map((x, i) => (i === qi ? oi : x)))}>
              <span className="ob-chk">{answers[qi] === oi && <Check size={13} />}</span>{o.label}{o.recommended && <span className="rec">موصى به</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="ob-row"><span /><button type="button" className="ob-btn" onClick={() => setStep('analysis')}>متابعة <Next size={16} /></button></div>
    </div>
  )
  if ((step === 'analysis' || step === 'creating') && plan) body = (
    <div className="ob-box wide">{dots}
      <div><h2>مجموعات التحليل</h2><p className="sub">اختر المجموعات التي تريد ربطها بهذا الوكيل. تُعبّأ حقولها تلقائيًا من كل مكالمة.</p></div>
      <button type="button" className="ob-grp" style={{ textAlign: 'start', color: 'inherit', font: 'inherit', cursor: 'pointer' }} aria-pressed={useGroup} onClick={() => setUseGroup((v) => !v)}>
        <div className="ob-row"><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="ob-chk" style={{ border: '2px solid var(--line-2,#555)', background: useGroup ? 'var(--ink)' : 'none' }}>{useGroup && <Check size={13} />}</span><span><b style={{ fontSize: 15 }}>{plan.analysis.name}</b><small style={{ display: 'block', color: 'var(--muted)' }}>{plan.analysis.fields.length} حقول</small></span></span></div>
        <div className="ob-fields">{plan.analysis.fields.map((f) => <div key={f.name} className="ob-field"><em>{TYPE_LABEL[f.type]}</em><b>{f.name}</b><small>{f.description}</small></div>)}</div>
      </button>
      {error && <div className="ob-err" role="alert">{error}</div>}
      <div className="ob-row">{back(plan.questions.length ? 'review' : 'method')}<button type="button" className="ob-btn" disabled={busy || step === 'creating'} onClick={() => void create()}>{step === 'creating' ? <><Loader2 size={16} style={{ animation: 'ob-spin 1s linear infinite' }} /> جارِ إنشاء الوكيل…</> : 'إنشاء الوكيل'}</button></div>
    </div>
  )

  return (
    <div className="ob">
      <style>{CSS}</style>
      <header className="ob-top">
        <span className="ob-brand"><img src="/logo-orbit.png" alt="" /><span dir="ltr">Madar software</span></span>
        <button type="button" onClick={() => void logout()}>تسجيل الخروج</button>
      </header>
      <main className="ob-main">{body}</main>
    </div>
  )
}
