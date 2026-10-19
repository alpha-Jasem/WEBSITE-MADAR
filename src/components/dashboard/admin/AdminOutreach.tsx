import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { addDoNotContact, loadDoNotContact, recordContact, syncDealForLead } from '../../../lib/deals'
import { useRealtimeRefetch } from '../../../lib/realtime'

type Status = 'new' | 'contacted' | 'replied' | 'meeting' | 'won' | 'lost' | 'no_answer'
type TemplateKey = 'first' | 'reminder' | 'meeting' | 'offer' | 'confirm'

interface OutreachLead {
  id: string
  name: string
  phone: string
  is_mobile: boolean
  website: string
  address: string
  city: string
  category: string
  rating: number | null
  reviews: number | null
  source: string
  campaign?: string
  contact_name?: string
  source_url: string
  status: Status
  notes: string
  created_at: string
  next_follow_up: string | null
  meeting_at: string | null
  lost_reason: string
  last_contacted_at: string | null
  contact_count: number
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  new: { label: 'جديد', color: 'var(--s-new)', bg: 'color-mix(in srgb, var(--s-new) 16%, transparent)' },
  contacted: { label: 'تم التواصل', color: 'var(--s-contacted)', bg: 'color-mix(in srgb, var(--s-contacted) 16%, transparent)' },
  replied: { label: 'رد علينا', color: 'var(--s-replied)', bg: 'color-mix(in srgb, var(--s-replied) 16%, transparent)' },
  meeting: { label: 'اجتماع', color: 'var(--s-meeting)', bg: 'color-mix(in srgb, var(--s-meeting) 16%, transparent)' },
  won: { label: 'أُغلق ✓', color: 'var(--s-won)', bg: 'color-mix(in srgb, var(--s-won) 16%, transparent)' },
  no_answer: { label: 'لا يرد', color: 'var(--s-noanswer)', bg: 'color-mix(in srgb, var(--s-noanswer) 16%, transparent)' },
  lost: { label: 'غير مهتم', color: 'var(--s-lost)', bg: 'color-mix(in srgb, var(--s-lost) 16%, transparent)' },
}

const LOST_REASONS = ['السعر', 'عندهم نظام حالياً', 'غير مهتم', 'قرار لاحقاً', 'رقم خاطئ', 'طلب التوقف', 'أخرى']

// Google Maps scraping only works with English search terms, so each Arabic label carries its English query.
const QUICK_QUERIES = [
  { ar: 'عيادات أسنان', en: 'dental clinic' },
  { ar: 'مراكز تجميل', en: 'beauty clinic' },
  { ar: 'مراكز طبية', en: 'medical center' },
  { ar: 'مطاعم', en: 'restaurant' },
  { ar: 'مكاتب عقارية', en: 'real estate office' },
  { ar: 'صالونات', en: 'salon' },
  { ar: 'مقاولات', en: 'contracting company' },
  { ar: 'متاجر', en: 'store' },
  { ar: 'مغاسل سيارات', en: 'car wash' },
]
const CITIES = [
  { ar: 'جدة', en: 'Jeddah' }, { ar: 'الرياض', en: 'Riyadh' }, { ar: 'مكة المكرمة', en: 'Makkah' },
  { ar: 'المدينة المنورة', en: 'Madinah' }, { ar: 'الدمام', en: 'Dammam' }, { ar: 'الخبر', en: 'Khobar' },
  { ar: 'الطائف', en: 'Taif' }, { ar: 'أبها', en: 'Abha' }, { ar: 'تبوك', en: 'Tabuk' }, { ar: 'بريدة', en: 'Buraidah' },
]
const COUNTS = [200, 300, 500]

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  first: 'أول تواصل', reminder: 'تذكير', meeting: 'عرض اجتماع', offer: 'إرسال العرض', confirm: 'تأكيد الاجتماع',
}
const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  first: 'مرحباً، أنا جاسم من مادار. نساعد {name} على الرد على العملاء وحجز المواعيد تلقائياً على واتساب. هل يناسبك دقيقتان أوضح لك كيف؟',
  reminder: 'مرحباً مرة ثانية 👋 أتابع معك بخصوص {name}. ودي أعرض عليك كيف نخلي واتساب يرد ويحجز عنك تلقائياً. متى يناسبك؟',
  meeting: 'يسعدني نجلس 15 دقيقة نوريك النظام على {name}. وش الوقت المناسب لك هالأسبوع؟',
  offer: 'هذا عرضنا لـ {name}: {offer_link}\nأي سؤال أنا حاضر.',
  confirm: 'تم تأكيد اجتماعنا {time} 🗓\nرابط الاجتماع: {meet_link}\nنتشرف بك.',
}
const SITE_TEMPLATES: Record<TemplateKey, string> = {
  first: 'مرحباً، أنا جاسم من مادار. لاحظت أن {name} ما عنده موقع إلكتروني، ونبني مواقع جاهزة للمطاعم والعقارات والمتاجر تستقبل الطلبات والحجوزات. تحب أرسل لك نموذجاً تجريبياً لنشاطك؟',
  reminder: 'مرحباً مرة ثانية 👋 بخصوص موقع {name}. جهزنا لك فكرة سريعة وأقدر أوريك نموذجها. متى يناسبك؟',
  meeting: 'يسعدني أعرض عليك نموذج موقع {name} في 10 دقائق. وش الوقت المناسب لك هالأسبوع؟',
  offer: 'هذا عرض موقع {name}: {offer_link}\nأي سؤال أنا حاضر.',
  confirm: 'تم تأكيد اجتماعنا {time} 🗓\nرابط الاجتماع: {meet_link}\nنتشرف بك.',
}
const STORE = { templates: 'madar_outreach_templates', settings: 'madar_outreach_settings' }
const PAGE_SIZE = 40
const DAY = 86400000
const VAPID_PUBLIC = 'BAL_u-gkCD1pVdOCatOx4TKdx_IJJwgU6JIVPPxzIGK2pXeW3I0ZaePly5gRYPFFR5p9Ei8VRuX54rzGTSJ6h9k'

interface DailySettings {
  daily_enabled: boolean
  daily_source: 'google_maps' | 'linkedin' | 'both'
  daily_query: string
  daily_city: string
  daily_count: number
  digest_enabled: boolean
}
const DEFAULT_DAILY: DailySettings = {
  daily_enabled: false, daily_source: 'google_maps', daily_query: 'dental clinic', daily_city: 'Jeddah', daily_count: 200, digest_enabled: true,
}

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function exportCsv(rows: OutreachLead[]) {
  const head = ['الاسم', 'الجوال', 'المدينة', 'النشاط', 'التقييم', 'الموقع', 'المصدر', 'الحالة', 'ملاحظات']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [head.map(esc).join(',')].concat(rows.map(l =>
    [l.name, `+${l.phone}`, l.city, l.category, l.rating ?? '', l.website, l.source_url, STATUS_META[l.status].label, l.notes].map(esc).join(',')))
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `outreach-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

interface Settings { meetLink: string; offerLink: string }

function loadJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback } catch { return fallback }
}
function saveJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })
}

function fmtFollow(iso: string) {
  const d = new Date(iso)
  const diff = Math.floor((startOfToday().getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / DAY)
  if (diff > 0) return { text: `متأخرة ${diff} يوم`, late: true }
  if (diff === 0) return { text: 'متابعة اليوم', late: true }
  if (diff === -1) return { text: 'متابعة غداً', late: false }
  return { text: `متابعة ${d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}`, late: false }
}

function mapsUrl(l: { name: string; city: string; address: string; source_url: string }) {
  if (l.source_url && /^https?:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(l.source_url)) return l.source_url
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([l.name, l.address, l.city].filter(Boolean).join(' '))}`
}

function pad(n: number) { return String(n).padStart(2, '0') }
function calStamp(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function score(l: OutreachLead) {
  return (l.rating ?? 0) * Math.log10((l.reviews ?? 0) + 10) + (l.website ? 1 : 0) + (l.is_mobile ? 3 : 0)
}

const CSS = `
.ol{color:var(--ink);font-family:var(--font);font-size:14px;line-height:1.6;display:flex;flex-direction:column;gap:14px;margin:8px 0 40px}
.ol *{box-sizing:border-box}
.ol button{font-family:inherit}
.ol .row2{display:grid;grid-template-columns:340px minmax(0,1fr);gap:14px;align-items:start}
.ol .slip{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:16px}
.ol .slip h2{font-family:var(--head);font-weight:800;font-size:21px;margin:0;line-height:1.3}
.ol .eb{font-family:var(--font);font-size:11px;letter-spacing:1px;color:var(--link);font-weight:600}
.ol .perf{border-top:1px dashed var(--line)}
.ol .lbl{font-size:12px;color:var(--ink-3);margin-bottom:6px}
.ol .seg{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ol .seg button{border:0;background:transparent;font-family:var(--head);font-weight:700;font-size:18px;padding:10px 0;cursor:pointer;color:var(--ink-3);border-inline-start:1px solid var(--line)}
.ol .seg button:first-child{border:0}
.ol .seg button[aria-pressed=true]{background:var(--blue);color:#fff}
.ol select,.ol input,.ol textarea{width:100%;border:1px solid var(--line);background:var(--fill);border-radius:11px;padding:10px 12px;font:inherit;color:var(--ink)}
.ol textarea{resize:vertical}
.ol .chips{display:flex;flex-wrap:wrap;gap:6px}
.ol .chip{border:1px solid var(--line);background:var(--fill);border-radius:99px;padding:6px 14px;font-size:13px;cursor:pointer;color:var(--ink-2);font-family:var(--head);font-weight:600}
.ol .chip[aria-pressed=true]{background:rgba(47,107,255,.2);border-color:var(--blue);color:var(--ink)}
.ol .go{border:0;background:linear-gradient(90deg,#2f6bff,#4f9bff);color:#fff;border-radius:14px;padding:14px;font-family:var(--head);font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 8px 24px rgba(47,107,255,.35)}
.ol .go:disabled{opacity:.6;cursor:wait}
.ol .note{font-size:12px;color:var(--ink-3)}
.ol .msg-ok{color:var(--green);font-size:13px}.ol .msg-bad{color:var(--red);font-size:13px}
.ol .main{display:flex;flex-direction:column;gap:14px;min-width:0}
.ol .head{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between}
.ol .big{font-family:var(--head);font-weight:800;font-size:44px;line-height:1;letter-spacing:-1px}
.ol .big small{font-size:14px;letter-spacing:0;color:var(--ink-3);font-weight:500;margin-inline-start:8px}
.ol .mini{display:flex;gap:20px;flex-wrap:wrap}.ol .mini b{display:block;font-family:var(--head);font-size:20px;font-weight:700}.ol .mini span{font-size:12px;color:var(--ink-3)}
.ol .panel{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.ol .panel-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line);font-family:var(--head);font-weight:700;flex-wrap:wrap}
.ol .due{border-color:rgba(255,93,93,.4);background:rgba(255,93,93,.06)}
.ol .due .panel-h{color:var(--red);border-color:rgba(255,93,93,.25)}
.ol .tools{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap;align-items:center}
.ol .tools input{flex:1 1 200px;width:auto}.ol .tools select{width:auto}
.ol .tools-row{display:contents}
.ol .lead{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,1.1fr) auto;gap:14px;align-items:center;padding:13px 16px;border-bottom:1px solid var(--line);transition:background .15s}
.ol .lead:hover{background:rgba(80,120,255,.05)}
.ol .lead:last-child{border:0}
.ol .lead.hot{background:linear-gradient(270deg,rgba(47,107,255,.08),transparent)}
.ol .nm{font-family:var(--head);font-weight:700;line-height:1.35;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ol .cat{font-size:12px;color:var(--ink-3)}
.ol .hotb{font-size:11px;background:var(--blue);color:#fff;border-radius:6px;padding:1px 8px;font-weight:600}
.ol .ph{font-family:var(--font);direction:ltr;text-align:right;font-size:13.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.ol .stt{display:inline-block;font-size:12px;padding:2px 10px;border-radius:6px;font-weight:600;white-space:nowrap}
.ol .fu{font-size:12px;color:var(--ink-3);margin-top:3px}.ol .fu.late{color:var(--red);font-weight:600}
.ol .meet{font-size:12px;color:var(--s-meeting);font-weight:600;margin-top:3px}
.ol .acts{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.ol .btn{border:1px solid var(--line);background:var(--fill);border-radius:10px;padding:8px 13px;font-family:var(--head);font-size:13px;font-weight:700;cursor:pointer;color:var(--ink);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;transition:border-color .15s,background .15s}
.ol .btn:hover{border-color:var(--line-2)}
.ol .btn.wa{background:#17a05d;border-color:#17a05d;color:#fff}
.ol .btn.call{background:var(--blue);border-color:var(--blue);color:#fff}
.ol .btn.cal{background:var(--violet);border-color:var(--violet);color:#fff}
.ol .btn.map{color:var(--link)}
.ol .btn:disabled{opacity:.45;cursor:not-allowed}
.ol .detail{grid-column:1/-1;display:flex;flex-direction:column;gap:10px;padding-top:10px;border-top:1px dashed var(--line)}
.ol .detail .chips{align-items:center}
.ol table{width:100%;border-collapse:collapse;font-size:13px}
.ol th{font-weight:600;font-size:12px;color:var(--ink-3);text-align:right;padding:9px 14px;background:var(--fill-2);border-bottom:1px solid var(--line)}
.ol td{padding:9px 14px;border-bottom:1px solid var(--line)}.ol td b{font-weight:700}
.ol .scroll{overflow-x:auto}
.ol .modal-bg{position:fixed;inset:0;background:rgba(2,5,14,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.ol .modal{background:var(--pop);border:1px solid var(--line-2);border-radius:18px;padding:22px;width:420px;max-width:100%;display:flex;flex-direction:column;gap:14px}
.ol .modal h3{font-family:var(--head);margin:0;font-size:19px;font-weight:800}
.ol .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ol :focus-visible{outline:2px solid var(--link);outline-offset:2px}
.ol .mob-toggle{display:none}
@media(max-width:900px){
  .ol .row2{grid-template-columns:1fr}
  .ol .mob-toggle{display:block}
  .ol .slip.closed{display:none}
  .ol .big{font-size:36px}
  .ol .lead{grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;padding:14px}
  .ol .lead .c-name{grid-column:1/-1}
  .ol .lead .nm{font-size:15.5px}
  .ol .lead .ph{font-size:15px}
  .ol .lead .acts{grid-column:1/-1;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
  .ol .lead .acts>*{grid-column:span 2;min-height:46px;padding:8px 6px}
  .ol .lead .acts>.call,.ol .lead .acts>.wa{grid-column:span 3;font-size:15px;min-height:50px}
  .ol .lead .acts>.stt{grid-column:1/-1;text-align:center}
  .ol .btn{min-height:44px}
  .ol .tools{flex-direction:column;align-items:stretch;padding:10px 12px}
  .ol .tools input{flex:none;width:100%}
  .ol .tools-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:0 -12px;padding:0 12px 2px}
  .ol .tools-row>*{flex:0 0 auto;white-space:nowrap}
  .ol .tools-row select{min-height:40px}
  .ol .head{gap:12px}
  .ol .mini{gap:14px;width:100%;justify-content:space-between}
  .ol .panel-h{padding:12px 14px}
  .ol .panel-h .btn{width:100%}
}
@media(prefers-reduced-motion:reduce){.ol *{transition:none!important}}
`

export const AdminOutreach = ({ mode = 'all' }: { mode?: 'all' | 'no-website' }) => {
  const siteMode = mode === 'no-website'
  const storeKey = siteMode ? STORE.templates + '_site' : STORE.templates
  const [leads, setLeads] = useState<OutreachLead[]>([])
  const [loading, setLoading] = useState(true)
  const [todayCount, setTodayCount] = useState(0)

  // fetch panel
  const [query, setQuery] = useState('dental clinic')
  const [city, setCity] = useState('Jeddah')
  const [count, setCount] = useState(200)
  const [fetching, setFetching] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 900)
  const timer = useRef<number | null>(null)

  // list
  const [params] = useSearchParams()
  const initialQ = params.get('q') ?? ''
  const [search, setSearch] = useState(initialQ)
  const [statusFilter, setStatusFilter] = useState<'all' | Status>(initialQ ? 'all' : 'new')
  const [mobileOnly, setMobileOnly] = useState(!initialQ)
  const [catFilter, setCatFilter] = useState('all')
  const [sort, setSort] = useState<'priority' | 'newest'>('priority')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [openId, setOpenId] = useState<string | null>(null)

  // settings / templates
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>(() => loadJson(storeKey, siteMode ? SITE_TEMPLATES : DEFAULT_TEMPLATES))
  const [settings, setSettings] = useState<Settings>(() => loadJson(STORE.settings, { meetLink: '', offerLink: '' }))
  const [showSettings, setShowSettings] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // modals
  const [meetingFor, setMeetingFor] = useState<OutreachLead | null>(null)
  const [lostFor, setLostFor] = useState<OutreachLead | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string; link?: string; lead?: OutreachLead } | null>(null)
  const [source, setSource] = useState<'google_maps' | 'linkedin'>('google_maps')
  const [daily, setDaily] = useState<DailySettings>(DEFAULT_DAILY)
  const [push, setPush] = useState<{ state: 'unsupported' | 'off' | 'on' | 'denied' | 'busy'; note?: string }>({ state: 'off' })
  const [queue, setQueue] = useState<{ ids: string[]; i: number } | null>(null)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [list, today] = await Promise.all([
      supabase.from('outreach_leads').select('*').order('created_at', { ascending: false }).limit(5000),
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday().toISOString()),
    ])
    setLeads((list.data ?? []) as OutreachLead[])
    setTodayCount(today.count ?? 0)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtimeRefetch('admin_outreach', [{ table: 'outreach_leads' }], load, true)
  useEffect(() => { loadDoNotContact().then(setBlocked).catch(() => undefined) }, [])

  // Register the push service worker (the install manifest is set by the admin shell).
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPush({ state: 'unsupported' })
    } else {
      navigator.serviceWorker.register('/sw.js').then(async reg => {
        const sub = await reg.pushManager.getSubscription()
        if (Notification.permission === 'denied') setPush({ state: 'denied' })
        else setPush({ state: sub ? 'on' : 'off' })
      }).catch(() => setPush({ state: 'unsupported' }))
    }
    supabase.from('outreach_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => { if (data) setDaily({ ...DEFAULT_DAILY, ...data }) })
  }, [])

  const saveDaily = async (patch: Partial<DailySettings>) => {
    const next = { ...daily, ...patch }
    setDaily(next)
    await supabase.from('outreach_settings').upsert({ id: 1, ...next, updated_at: new Date().toISOString() })
  }

  const enablePush = async () => {
    setPush({ state: 'busy' })
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPush({ state: perm === 'denied' ? 'denied' : 'off' }); return }
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
      const j = sub.toJSON()
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: u.user!.id, endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'endpoint' })
      if (error) throw new Error(error.message)
      setPush({ state: 'on', note: 'تم تفعيل الإشعارات على هذا الجهاز' })
    } catch (e) {
      setPush({ state: 'off', note: (e as Error).message })
    }
  }

  const testPush = async () => {
    const { data, error } = await supabase.functions.invoke('outreach-daily', { body: { action: 'test_push' } })
    setPush(p => ({ ...p, note: error || !data?.ok ? 'فشل الإرسال' : data.sent ? 'أُرسل إشعار تجريبي، شوف جوالك' : 'ما فيه جهاز مفعّل' }))
  }
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveJson(STORE.settings, next)
  }
  const updateTemplate = (key: TemplateKey, value: string) => {
    const next = { ...templates, [key]: value }
    setTemplates(next)
    saveJson(storeKey, next)
  }

  /* ---------- fetching new leads ---------- */
  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('outreach-leads', { body })
    if (error) throw new Error(data?.details || data?.error || error.message)
    return data as Record<string, any>
  }

  const poll = (runId: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const r = await invoke({ action: 'poll', run_id: runId })
        if (r.status === 'running') {
          setProgress(r.progress ?? 0)
          poll(runId)
        } else if (r.status === 'done') {
          setFetching(false)
          setMessage({ ok: true, text: `تمت إضافة ${r.added} عميل جديد${r.found > r.added ? ` (${r.found - r.added} كانوا موجودين مسبقاً)` : ''}` })
          setStatusFilter('new')
          load()
        } else {
          setFetching(false)
          setMessage({ ok: false, text: `فشل الجلب: ${r.error || 'خطأ غير معروف'}` })
        }
      } catch (e) {
        setFetching(false)
        setMessage({ ok: false, text: (e as Error).message })
      }
    }, 5000)
  }

  const fetchLeads = async () => {
    if (!query.trim() || fetching) return
    setFetching(true)
    setProgress(0)
    setMessage(null)
    try {
      const r = await invoke({ action: 'start', source, query: query.trim(), query_en: query.trim(), city, city_en: city, count })
      poll(r.run_id)
    } catch (e) {
      setFetching(false)
      setMessage({ ok: false, text: (e as Error).message })
    }
  }

  /* ---------- lead updates ---------- */
  const updateLead = async (id: string, patch: Partial<OutreachLead>) => {
    const current = leads.find(x => x.id === id)
    setLeads(l => l.map(x => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('outreach_leads').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setToast({ ok: false, text: 'تعذّر حفظ التغيير، أعد المحاولة.' }); return }
    if (current && patch.status && patch.status !== current.status) {
      await syncDealForLead(
        { id, name: current.name, phone: current.phone, contact_name: current.contact_name, campaign: current.campaign, source: current.source },
        patch.status,
        patch.status === 'lost' ? { lost_reason: patch.lost_reason ?? '' } : {},
      )
    }
  }

  const isBlocked = (l: OutreachLead) => blocked.has(l.phone)

  const setStatus = (lead: OutreachLead, status: Status) => {
    if (status === 'lost') { setLostFor(lead); return }
    updateLead(lead.id, { status, ...(status === 'won' || status === 'meeting' ? { next_follow_up: null } : {}) })
  }

  const setFollowUp = (lead: OutreachLead, days: number | null) => {
    if (days === null) { updateLead(lead.id, { next_follow_up: null }); return }
    const d = new Date(); d.setHours(10, 0, 0, 0); d.setTime(d.getTime() + days * DAY)
    updateLead(lead.id, { next_follow_up: d.toISOString() })
  }

  // Any contact attempt is logged, and a follow-up is scheduled for 2 days later unless one is already set.
  const markContact = (lead: OutreachLead, channel: 'whatsapp' | 'call' = 'whatsapp') => {
    if (isBlocked(lead)) return
    recordContact({ id: lead.id, name: lead.name, phone: lead.phone }, channel)
    const patch: Partial<OutreachLead> = {
      last_contacted_at: new Date().toISOString(),
      contact_count: (lead.contact_count || 0) + 1,
    }
    if (lead.status === 'new') patch.status = 'contacted'
    const open = ['new', 'contacted', 'no_answer'].includes(lead.status)
    const hasFuture = lead.next_follow_up && new Date(lead.next_follow_up) > new Date()
    if (open && !hasFuture) { const d = new Date(); d.setHours(10, 0, 0, 0); patch.next_follow_up = new Date(d.getTime() + 2 * DAY).toISOString() }
    updateLead(lead.id, patch)
  }

  /* ---------- messages ---------- */
  const autoTemplate = (l: OutreachLead): TemplateKey => {
    if (l.status === 'meeting' && l.meeting_at) return 'confirm'
    if (l.status === 'replied') return 'meeting'
    if (l.status === 'contacted' || l.status === 'no_answer') return 'reminder'
    return 'first'
  }

  const buildText = (l: OutreachLead, key: TemplateKey) =>
    templates[key]
      .split('{name}').join(l.name)
      .split('{offer_link}').join(settings.offerLink || '(ضع رابط العرض من الإعدادات)')
      .split('{meet_link}').join(settings.meetLink || '(رابط الاجتماع)')
      .split('{time}').join(l.meeting_at ? fmtWhen(l.meeting_at) : '')

  const sendWhatsApp = (l: OutreachLead, key?: TemplateKey) => {
    if (isBlocked(l)) { setToast({ ok: false, text: 'هذا الرقم في قائمة ممنوع التواصل.' }); return }
    window.open(`https://wa.me/${l.phone}?text=${encodeURIComponent(buildText(l, key ?? autoTemplate(l)))}`, '_blank', 'noopener')
    markContact(l)
  }

  /* ---------- meeting (Google Calendar + Meet) ---------- */
  const saveMeeting = async (lead: OutreachLead, start: Date, minutes: number) => {
    setMeetingFor(null)
    updateLead(lead.id, { status: 'meeting', meeting_at: start.toISOString(), next_follow_up: null })
    try {
      const { data, error } = await supabase.functions.invoke('outreach-calendar', {
        body: { name: lead.name, phone: lead.phone, start: start.toISOString(), minutes, meet_link: settings.meetLink },
      })
      if (error || !data?.ok) throw new Error(data?.details || data?.error || error?.message || 'calendar_failed')
      setToast({ ok: true, text: `تمت إضافة الاجتماع إلى Google Calendar: ${fmtWhen(start.toISOString())}`, link: data.link, lead: { ...lead, meeting_at: start.toISOString(), status: 'meeting' } })
    } catch {
      // Fallback: open a prefilled Google Calendar page so the meeting is never lost.
      const end = new Date(start.getTime() + minutes * 60000)
      const details = [`اجتماع تعريفي مع ${lead.name}`, `الجوال: +${lead.phone}`, settings.meetLink ? `Google Meet: ${settings.meetLink}` : ''].filter(Boolean).join('\n')
      const url = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
        action: 'TEMPLATE', text: `اجتماع مدار — ${lead.name}`, dates: `${calStamp(start)}/${calStamp(end)}`,
        ctz: 'Asia/Riyadh', details, location: settings.meetLink || '',
      }).toString()
      window.open(url, '_blank', 'noopener')
      setToast({ ok: false, text: 'تعذّر الإضافة التلقائية، فتحت لك Google Calendar لتحفظ الاجتماع يدوياً.' })
    }
  }

  /* ---------- derived ---------- */
  const scored = useMemo(() => {
    const sorted = [...leads].sort((a, b) => score(b) - score(a))
    const hotIds = new Set(sorted.slice(0, Math.max(1, Math.round(sorted.length * 0.2))).map(l => l.id))
    return { sorted, hotIds }
  }, [leads])

  const dueList = useMemo(
    () => leads
      .filter(l => l.next_follow_up && new Date(l.next_follow_up).getTime() <= Date.now() + 6 * 3600000 && ['contacted', 'no_answer', 'replied', 'new'].includes(l.status))
      .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime()),
    [leads],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = sort === 'priority' ? scored.sorted : leads
    return base.filter(l =>
      (statusFilter === 'all' || l.status === statusFilter) &&
      (!siteMode || !l.website) &&
      (catFilter === 'all' || l.category === catFilter) &&
      (!mobileOnly || l.is_mobile) &&
      (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.category.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)))
  }, [leads, scored, search, statusFilter, mobileOnly, sort, siteMode, catFilter])

  const categories = useMemo(() => {
    const pool = siteMode ? leads.filter(l => !l.website) : leads
    return [...new Set(pool.map(l => l.category).filter(Boolean))].sort()
  }, [leads, siteMode])

  const totals = useMemo(() => {
    const c = (f: (l: OutreachLead) => boolean) => leads.filter(f).length
    return {
      all: leads.length,
      fresh: c(l => l.status === 'new'),
      contacted: c(l => l.status !== 'new'),
      replied: c(l => ['replied', 'meeting', 'won'].includes(l.status)),
      meetings: c(l => ['meeting', 'won'].includes(l.status)),
      won: c(l => l.status === 'won'),
    }
  }, [leads])

  const breakdown = useMemo(() => {
    const group = (key: (l: OutreachLead) => string) => {
      const map = new Map<string, { total: number; contacted: number; replied: number; meetings: number; won: number }>()
      leads.forEach(l => {
        const k = key(l) || '—'
        const g = map.get(k) ?? { total: 0, contacted: 0, replied: 0, meetings: 0, won: 0 }
        g.total++
        if (l.status !== 'new') g.contacted++
        if (['replied', 'meeting', 'won'].includes(l.status)) g.replied++
        if (['meeting', 'won'].includes(l.status)) g.meetings++
        if (l.status === 'won') g.won++
        map.set(k, g)
      })
      return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8)
    }
    return { byCategory: group(l => l.category), byCity: group(l => l.city) }
  }, [leads])

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
  const shown = filtered.slice(0, limit)

  /* ---------- lead row ---------- */
  const renderLead = (l: OutreachLead) => {
    const fu = l.next_follow_up ? fmtFollow(l.next_follow_up) : null
    const st = STATUS_META[l.status]
    const open = openId === l.id
    return (
      <div key={l.id} className={`lead ${scored.hotIds.has(l.id) && l.status === 'new' ? 'hot' : ''}`}>
        <div className="c-name">
          <div className="nm">{l.name}{scored.hotIds.has(l.id) && l.status === 'new' && <span className="hotb">أولوية عالية</span>}{!l.website && <span className="hotb" style={{ background: 'var(--violet)' }}>بدون موقع</span>}</div>
          <div className="cat">{l.category}{l.city ? ` · ${l.city}` : ''}{l.rating ? ` · ★ ${l.rating} (${l.reviews ?? 0})` : ''}</div>
        </div>
        <div>
          <div className="ph">+{l.phone}</div>
          {!l.is_mobile && <div className="cat">رقم ثابت — اتصال فقط</div>}
        </div>
        <div>
          <select aria-label="الحالة" value={l.status} onChange={e => setStatus(l, e.target.value as Status)}
            style={{ width: 'auto', padding: '4px 8px', fontSize: 12, fontWeight: 600, color: st.color, background: st.bg, border: 'none' }}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {l.status === 'meeting' && l.meeting_at && <div className="meet">🗓 {fmtWhen(l.meeting_at)}</div>}
          {l.status === 'lost' && l.lost_reason && <div className="fu">السبب: {l.lost_reason}</div>}
          {fu && !['won', 'lost', 'meeting'].includes(l.status) && <div className={`fu ${fu.late ? 'late' : ''}`}>{fu.text}</div>}
        </div>
        <div className="acts">
          {isBlocked(l) ? <span className="stt" style={{ background: 'color-mix(in srgb, var(--s-lost) 16%, transparent)', color: 'var(--s-lost)' }}>ممنوع التواصل</span> : <>
          <a className="btn call" href={`tel:+${l.phone}`} onClick={() => markContact(l, 'call')}>📞 اتصال</a>
          <button className="btn wa" disabled={!l.is_mobile} onClick={() => sendWhatsApp(l)}>واتساب</button></>}
          <button className="btn cal" onClick={() => setMeetingFor(l)}>🗓 اجتماع</button>
          <a className="btn map" href={mapsUrl(l)} target="_blank" rel="noreferrer" title="موقعهم على خرائط قوقل">📍 الموقع</a>
          <button className="btn" aria-expanded={open} onClick={() => setOpenId(open ? null : l.id)}>{open ? '▴' : '⋯'}</button>
        </div>
        {open && (
          <div className="detail">
            <div>
              <div className="lbl">أرسل قالباً محدداً</div>
              <div className="chips">
                {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map(k => (
                  <button key={k} className="chip" disabled={!l.is_mobile} aria-pressed="false" onClick={() => sendWhatsApp(l, k)}>{TEMPLATE_LABELS[k]}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="lbl">ذكّرني بالمتابعة</div>
              <div className="chips">
                {[[1, 'بعد يوم'], [2, 'يومين'], [3, '٣ أيام'], [7, 'أسبوع']].map(([d, t]) => (
                  <button key={d} className="chip" aria-pressed="false" onClick={() => setFollowUp(l, d as number)}>{t}</button>
                ))}
                {l.next_follow_up && <button className="chip" aria-pressed="false" onClick={() => setFollowUp(l, null)}>إلغاء التذكير</button>}
              </div>
            </div>
            <div>
              <div className="lbl">ملاحظات</div>
              <textarea rows={2} defaultValue={l.notes} placeholder="اكتب أي شي مهم عن العميل"
                onBlur={e => { if (e.target.value !== l.notes) updateLead(l.id, { notes: e.target.value }) }} />
            </div>
            <div className="note">
              {l.contact_count > 0 ? `تم التواصل ${l.contact_count} مرة` : 'ما تم التواصل بعد'}
              {l.website && <> · <a href={l.website} target="_blank" rel="noreferrer">الموقع</a></>}
              {l.source_url && <> · <a href={l.source_url} target="_blank" rel="noreferrer">خرائط قوقل</a></>}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ol" dir="rtl">
      <style>{CSS}</style>

      <button className="btn mob-toggle" onClick={() => setPanelOpen(o => !o)}>
        {panelOpen ? 'إخفاء جلب العملاء' : '＋ جلب عملاء جدد'}
      </button>

      <div className="row2">
        {/* ---- order slip ---- */}
        <aside className={`slip ${panelOpen ? '' : 'closed'}`}>
          <div><div className="eb">{siteMode ? 'WEBSITES · عملاء بدون موقع' : 'OUTREACH · طلب جلب'}</div><h2>{siteMode ? 'جيب أنشطة ما عندها موقع' : 'كم عميل تبغى اليوم؟'}</h2>{siteMode && <div className="note" style={{ marginTop: 6 }}>اختر القطاع والمدينة. الجلب يستورد كل الأنشطة، وهذه الصفحة تعرض منها اللي ما فيها موقع فقط.</div>}</div>
          <div><div className="lbl">المصدر</div>
            <div className="chips">
              <button className="chip" aria-pressed={source === 'google_maps'} disabled={fetching} onClick={() => setSource('google_maps')}>خرائط قوقل</button>
              <button className="chip" aria-pressed={source === 'linkedin'} disabled={fetching} onClick={() => setSource('linkedin')}>LinkedIn</button>
            </div>
            {source === 'linkedin' && <div className="note" style={{ marginTop: 6 }}>الشركات من LinkedIn، والأرقام نبحث لها في خرائط قوقل. أبطأ وعدد أقل.</div>}
          </div>
          <div><div className="lbl">العدد</div>
            <div className="seg">{COUNTS.map(c => <button key={c} aria-pressed={count === c} onClick={() => setCount(c)} disabled={fetching}>{c}</button>)}</div></div>
          <div><div className="lbl">النشاط</div>
            <div className="chips">{QUICK_QUERIES.map(q => (
              <button key={q.en} className="chip" aria-pressed={query === q.en} disabled={fetching} onClick={() => setQuery(q.en)}>{q.ar}</button>
            ))}</div>
            <input style={{ marginTop: 8 }} dir="ltr" value={query} onChange={e => setQuery(e.target.value)} disabled={fetching} placeholder="أو اكتب بالإنجليزي: dental clinic" />
          </div>
          <div><div className="lbl">المدينة</div>
            <select value={city} onChange={e => setCity(e.target.value)} disabled={fetching}>{CITIES.map(c => <option key={c.en} value={c.en}>{c.ar}</option>)}</select></div>
          <div className="perf" />
          <button className="go" onClick={fetchLeads} disabled={fetching || !query.trim()}>
            {fetching ? `جارٍ الجلب… ${progress ? `(${progress})` : ''}` : `جيب ${count} عميل`}
          </button>
          {fetching && <div className="note">الجلب يأخذ من دقيقة إلى ٥ دقائق. تقدر تتصفح القائمة وهو يشتغل.</div>}
          {message && <div className={message.ok ? 'msg-ok' : 'msg-bad'}>{message.text}</div>}
        </aside>

        {/* ---- main ---- */}
        <main className="main">
          {toast && (
            <div className="panel" style={{ padding: '10px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span className={toast.ok ? 'msg-ok' : 'msg-bad'}>{toast.text}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                {toast.lead && toast.lead.is_mobile && <button className="btn wa" onClick={() => sendWhatsApp(toast.lead!, 'confirm')}>أرسل التأكيد للعميل</button>}
                {toast.link && <a className="btn" href={toast.link} target="_blank" rel="noreferrer">افتح الحدث</a>}
                <button className="btn" onClick={() => setToast(null)}>إغلاق</button>
              </span>
            </div>
          )}
          <div className="head">
            <div className="big">{todayCount}<small>عميل أُضيف اليوم</small></div>
            <div className="mini">
              <div><b>{totals.fresh}</b><span>بانتظار التواصل</span></div>
              <div><b>{totals.contacted}</b><span>تم التواصل</span></div>
              <div><b>{totals.meetings}</b><span>اجتماعات</span></div>
              <div><b>{totals.won}</b><span>أُغلقت</span></div>
            </div>
          </div>

          {dueList.length > 0 && (
            <section className="panel due">
              <div className="panel-h"><span>🔔 متابعات اليوم ({dueList.length})</span><button className="btn call" onClick={() => setQueue({ ids: dueList.map(l => l.id), i: 0 })}>▶ ابدأ المتابعة السريعة</button></div>
              {dueList.slice(0, 12).map(l => renderLead(l))}
            </section>
          )}

          <section className="panel">
            <div className="tools">
              <input placeholder="بحث بالاسم أو الرقم أو المدينة" value={search} onChange={e => { setSearch(e.target.value); setLimit(PAGE_SIZE) }} />
              <div className="tools-row">
              <select aria-label="تصفية الحالة" value={statusFilter} onChange={e => { setStatusFilter(e.target.value as 'all' | Status); setLimit(PAGE_SIZE) }}>
                <option value="all">كل الحالات</option>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select aria-label="الترتيب" value={sort} onChange={e => setSort(e.target.value as 'priority' | 'newest')}>
                <option value="priority">الأولوية أولاً</option>
                <option value="newest">الأحدث</option>
              </select>
              {categories.length > 1 && (
                <select aria-label="القطاع" value={catFilter} onChange={e => { setCatFilter(e.target.value); setLimit(PAGE_SIZE) }}>
                  <option value="all">كل القطاعات</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button className="chip" aria-pressed={mobileOnly} onClick={() => setMobileOnly(m => !m)}>جوالات فقط</button>
              <button className="chip" aria-pressed="false" disabled={filtered.filter(l => l.is_mobile && !isBlocked(l)).length === 0}
                onClick={() => setQueue({ ids: filtered.filter(l => l.is_mobile && !isBlocked(l)).slice(0, 30).map(l => l.id), i: 0 })}>▶ تواصل سريع ({Math.min(30, filtered.filter(l => l.is_mobile && !isBlocked(l)).length)})</button>
              <button className="chip" aria-pressed={showStats} onClick={() => setShowStats(s => !s)}>📊 النتائج</button>
              <button className="chip" aria-pressed="false" onClick={() => exportCsv(filtered)}>⬇ تصدير Excel</button>
              <button className="chip" aria-pressed={showSettings} onClick={() => setShowSettings(s => !s)}>⚙ الرسائل والروابط</button>
              </div>
            </div>

            {showSettings && (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: '1px solid var(--line)' }}>
                <div className="two">
                  <div><div className="lbl">رابط Google Meet الخاص بك</div>
                    <input dir="ltr" value={settings.meetLink} onChange={e => updateSettings({ meetLink: e.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></div>
                  <div><div className="lbl">رابط العرض / الباقات</div>
                    <input dir="ltr" value={settings.offerLink} onChange={e => updateSettings({ offerLink: e.target.value })} placeholder="https://madar.software/..." /></div>
                </div>
                <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>🔔 إشعارات الجوال</div>
                  {push.state === 'unsupported' && <div className="note">هذا المتصفح ما يدعم الإشعارات. على الآيفون: ثبّت الصفحة على الشاشة الرئيسية أولاً ثم افتحها من الأيقونة.</div>}
                  {push.state === 'denied' && <div className="note">الإشعارات محظورة. فعّلها من إعدادات المتصفح أو التطبيق ثم أعد المحاولة.</div>}
                  {(push.state === 'off' || push.state === 'busy') && <button className="btn call" disabled={push.state === 'busy'} onClick={enablePush}>فعّل الإشعارات على هذا الجهاز</button>}
                  {push.state === 'on' && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className="msg-ok">الإشعارات مفعّلة على هذا الجهاز</span><button className="btn" onClick={testPush}>جرّب إشعاراً</button></div>}
                  {push.note && <div className="note">{push.note}</div>}
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={daily.digest_enabled} onChange={e => saveDaily({ digest_enabled: e.target.checked })} />
                    ملخص كل صباح الساعة ٨ (المتابعات والاجتماعات والعملاء الجدد)
                  </label>
                </div>
                <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontWeight: 600 }}>⏰ جلب يومي تلقائي</div>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" style={{ width: 'auto' }} checked={daily.daily_enabled} onChange={e => saveDaily({ daily_enabled: e.target.checked })} />
                    جيب لي عملاء جدد كل يوم الساعة ٥ الصبح، ويوصلني إشعار
                  </label>
                  <div className="two">
                    <div><div className="lbl">المصدر</div>
                      <select value={daily.daily_source} onChange={e => saveDaily({ daily_source: e.target.value as DailySettings['daily_source'] })}>
                        <option value="google_maps">خرائط قوقل</option><option value="linkedin">LinkedIn</option><option value="both">الاثنين</option></select></div>
                    <div><div className="lbl">العدد يومياً</div>
                      <select value={daily.daily_count} onChange={e => saveDaily({ daily_count: Number(e.target.value) })}>{COUNTS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><div className="lbl">النشاط</div>
                      <select value={daily.daily_query} onChange={e => saveDaily({ daily_query: e.target.value })}>{QUICK_QUERIES.map(q => <option key={q.en} value={q.en}>{q.ar}</option>)}</select></div>
                    <div><div className="lbl">المدينة</div>
                      <select value={daily.daily_city} onChange={e => saveDaily({ daily_city: e.target.value })}>{CITIES.map(c => <option key={c.en} value={c.en}>{c.ar}</option>)}</select></div>
                  </div>
                  <div className="note">كل جلبة تكلّف في Apify حوالي دولار واحد أو أقل لكل ٥٠٠ عميل.</div>
                </div>
                <div className="note">في الرسائل: {'{name}'} اسم النشاط · {'{offer_link}'} رابط العرض · {'{meet_link}'} رابط الاجتماع · {'{time}'} موعد الاجتماع</div>
                {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map(k => (
                  <div key={k}><div className="lbl">{TEMPLATE_LABELS[k]}</div>
                    <textarea rows={2} value={templates[k]} onChange={e => updateTemplate(k, e.target.value)} /></div>
                ))}
              </div>
            )}

            {showStats && (
              <div style={{ padding: 16, borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="note">
                  من {totals.all} عميل: تواصلت مع {pct(totals.contacted, totals.all)} · ردّ {pct(totals.replied, totals.contacted)} من اللي تواصلت معهم · اجتماع {pct(totals.meetings, totals.contacted)} · إغلاق {pct(totals.won, totals.meetings)} من الاجتماعات
                </div>
                {[['حسب النشاط', breakdown.byCategory], ['حسب المدينة', breakdown.byCity]].map(([title, rows]) => (
                  <div key={title as string} className="scroll">
                    <table>
                      <thead><tr><th>{title as string}</th><th>العدد</th><th>تم التواصل</th><th>ردّوا</th><th>اجتماعات</th><th>أُغلقت</th></tr></thead>
                      <tbody>{(rows as [string, { total: number; contacted: number; replied: number; meetings: number; won: number }][]).map(([k, g]) => (
                        <tr key={k}><td>{k}</td><td><b>{g.total}</b></td><td><b>{g.contacted}</b></td><td><b>{g.replied}</b> <span className="note">{pct(g.replied, g.contacted)}</span></td><td><b>{g.meetings}</b></td><td><b>{g.won}</b></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="note">جارٍ التحميل…</div>
            ) : shown.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="note">
                {leads.length === 0 ? 'ما فيه عملاء بعد. اضغط «جيب عميل».' : 'ما فيه نتائج بهذا الفلتر.'}
              </div>
            ) : shown.map(renderLead)}

            {filtered.length > limit && (
              <button className="btn" style={{ width: '100%', borderRadius: 0, border: 0, borderTop: '1px solid var(--line)' }} onClick={() => setLimit(n => n + PAGE_SIZE)}>
                عرض المزيد ({filtered.length - limit})
              </button>
            )}
          </section>
          <div className="note" style={{ textAlign: 'center' }}>{filtered.length} نتيجة</div>
        </main>
      </div>

      {queue && (() => {
        const lead = leads.find(l => l.id === queue.ids[queue.i])
        if (!lead) return null
        const key = autoTemplate(lead)
        return (
          <div className="modal-bg" onClick={() => setQueue(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="note">{queue.i + 1} من {queue.ids.length}</div>
              <h3>{lead.name}</h3>
              <div className="cat">{lead.category}{lead.city ? ` · ${lead.city}` : ''}</div>
              <div className="ph" style={{ fontSize: 18 }}>+{lead.phone}</div>
              <a className="btn map" href={mapsUrl(lead)} target="_blank" rel="noreferrer">📍 موقعهم على خرائط قوقل</a>
              <div className="note" style={{ background: 'var(--fill)', border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>{buildText(lead, key)}</div>
              <div className="acts" style={{ justifyContent: 'stretch' }}>
                <a className="btn call" style={{ flex: 1 }} href={`tel:+${lead.phone}`} onClick={() => markContact(lead, 'call')}>📞 اتصال</a>
                <button className="btn wa" style={{ flex: 1 }} disabled={!lead.is_mobile || isBlocked(lead)} onClick={() => { sendWhatsApp(lead); setQueue(q => (q && q.i + 1 < q.ids.length ? { ...q, i: q.i + 1 } : null)) }}>افتح واتساب وانتقل للتالي</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => setQueue(null)}>إنهاء</button>
                <button className="btn" style={{ flex: 1 }} onClick={() => setMeetingFor(lead)}>🗓 اجتماع</button>
                <button className="btn" style={{ flex: 1 }} onClick={() => queue.i + 1 < queue.ids.length ? setQueue({ ...queue, i: queue.i + 1 }) : setQueue(null)}>التالي ◂</button>
              </div>
            </div>
          </div>
        )
      })()}

      {meetingFor && <MeetingModal lead={meetingFor} settings={settings} onSettings={updateSettings} onClose={() => setMeetingFor(null)} onSave={saveMeeting} />}

      {lostFor && (
        <div className="modal-bg" onClick={() => setLostFor(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>ليش ما صارت؟</h3>
            <div className="note">{lostFor.name}</div>
            <div className="chips">
              {LOST_REASONS.map(r => (
                <button key={r} className="chip" aria-pressed="false"
                  onClick={async () => {
                    updateLead(lostFor.id, { status: 'lost', lost_reason: r, next_follow_up: null })
                    if (r === 'طلب التوقف') {
                      const ok = await addDoNotContact(lostFor.phone, lostFor.name, 'opt_out', 'طلب التوقف من الواجهة')
                      if (ok) setBlocked(prev => new Set(prev).add(lostFor.phone))
                    }
                    setLostFor(null)
                  }}>{r}</button>
              ))}
            </div>
            <button className="btn" onClick={() => setLostFor(null)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  )
}

const MeetingModal = ({ lead, settings, onSettings, onClose, onSave }: {
  lead: OutreachLead
  settings: Settings
  onSettings: (p: Partial<Settings>) => void
  onClose: () => void
  onSave: (lead: OutreachLead, start: Date, minutes: number) => void
}) => {
  const tomorrow = new Date(Date.now() + DAY)
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`)
  const [time, setTime] = useState('10:00')
  const [minutes, setMinutes] = useState(30)
  const start = new Date(`${date}T${time}:00`)
  const valid = !Number.isNaN(start.getTime())
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>حجز اجتماع مع {lead.name}</h3>
        <div className="two">
          <div><div className="lbl">التاريخ</div><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><div className="lbl">الوقت</div><input type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
        </div>
        <div><div className="lbl">المدة</div>
          <div className="chips">{[15, 30, 45, 60].map(m => <button key={m} className="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} دقيقة</button>)}</div></div>
        <div><div className="lbl">رابط Google Meet (يتحفظ لكل الاجتماعات)</div>
          <input dir="ltr" value={settings.meetLink} onChange={e => onSettings({ meetLink: e.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></div>
        <div className="note">يُضاف الاجتماع إلى Google Calendar تلقائياً. بعدها تقدر ترسل التأكيد للعميل على واتساب من «⋯» ثم «تأكيد الاجتماع».</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn cal" style={{ flex: 1 }} disabled={!valid} onClick={() => onSave(lead, start, minutes)}>احجز الاجتماع</button>
        </div>
      </div>
    </div>
  )
}
