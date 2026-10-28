import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { addDoNotContact, loadDoNotContact, recordContact, syncDealForLead } from '../../../lib/deals'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { LeadFocusPanel } from './LeadFocusPanel'
import { deleteLeads } from '../../../lib/deals'
import { AR_GREG, monthKey, nf } from '../../../lib/format'

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
  outreach_runs?: { query: string } | null
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
  { ar: 'مطورون عقاريون', en: 'real estate developer' },
  { ar: 'شركات تطوير عقاري', en: 'property development company' },
  { ar: 'مكاتب عقارية', en: 'real estate office' },
  { ar: 'صالونات', en: 'salon' },
  { ar: 'مقاولات', en: 'contracting company' },
  { ar: 'متاجر', en: 'store' },
  { ar: 'مغاسل سيارات', en: 'car wash' },
]
// Each fetch lands in the sector of its search. Order matters: 'beauty clinic' is beauty, not clinics.
const SECTORS = [
  { key: 'real_estate', ar: 'عقار', match: /(real estate|property|developer|development|realty|apartment|housing|عقار|تطوير)/i },
  { key: 'restaurants', ar: 'مطاعم وكافيهات', match: /(restaurant|cafe|coffee|food|مطعم|مطاعم|كافي)/i },
  { key: 'beauty', ar: 'تجميل وصالونات', match: /(beauty|salon|spa|barber|تجميل|صالون)/i },
  { key: 'clinics', ar: 'عيادات ومراكز طبية', match: /(dental|dentist|clinic|medical|hospital|عياد|طبي|أسنان)/i },
  { key: 'contracting', ar: 'مقاولات', match: /(contract|construction|مقاول)/i },
  { key: 'stores', ar: 'متاجر', match: /(store|shop|متجر|متاجر)/i },
  { key: 'car_wash', ar: 'مغاسل سيارات', match: /(car wash|مغسل)/i },
]
const sectorKey = (text: string) => SECTORS.find(x => x.match.test(text))?.key ?? 'other'
const sectorOf = (l: OutreachLead) => sectorKey(l.outreach_runs?.query || l.category)
const sectorLabel = (key: string) => SECTORS.find(x => x.key === key)?.ar ?? 'أخرى'
const SECTOR_STORE = 'madar_outreach_sector'

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
// Ready replies to the objections heard most often; the owner sends one when the customer pushes back.
const OBJECTIONS: { label: string; text: string }[] = [
  { label: 'وش أستفيد؟', text: 'سؤال في محله. لما أحد يبحث عن مطعم قريب منه في قوقل، الموقع يخلي {name} يطلع بالمنيو وزر الطلب، مو بس رقم وموقع. وكم تدفع عمولة على الطلب من التطبيقات؟ الطلب من موقعك ما فيه عمولة.' },
  { label: 'ما أبغى', text: 'أفهمك تمامًا، ما أبغى أضغط عليك. بس أسألك سؤال واحد: كيف يوصلك الزبون الجديد الحين؟ إذا حسيت إن في فرصة، أجهز لك تصميمًا تشوفه من غير أي التزام.' },
  { label: 'غالي', text: 'أقدّر صراحتك. خلني أجهز لك تصميمًا لـ {name} تشوفه أول، وبعدها تقرر إذا يستاهل. ولو السعر هو المشكلة، قلي وش الميزانية اللي تناسبك وأشوف أي باقة تنفع.' },
  { label: 'ما عندي وقت', text: 'ولا يهمك، أنت ما تحتاج وقت. أنا أجهز كل شي وأسألك أسئلة بسيطة بس. متى يناسبك أتصل 5 دقائق؟' },
  { label: 'عندي انستقرام', text: 'حلو إن عندك حضور. الموقع ما يلغي الانستقرام، يكمله: المنيو والطلب والموقع في مكان واحد يظهر في قوقل، والانستقرام ما يظهر فيه بنفس الطريقة.' },
  { label: 'أفكر فيها', text: 'تمام، خذ راحتك. أرسل لك نموذجًا لـ {name} تشوفه وقت ما تبغى، وأرجع لك بعد كم يوم؟' },
]
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
  daily_enabled: false, daily_source: 'google_maps', daily_query: 'real estate developer', daily_city: 'Jeddah', daily_count: 200, digest_enabled: true,
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
.ol{--paper:#1a150f;--card:#221b13;--card-2:#2a2218;--line:#3b3125;--line-2:#5a4a36;--ink:#f3ebdf;--ink-2:#d6c8b2;--ink-3:#a8977d;
  --fill:#2a2218;--fill-2:#30271c;--pop:#241d15;--cta:#f3ebdf;--cta-ink:#1a150f;--good:#5cc39a;--good-bg:rgba(92,195,154,.14);--gold:#e0a63a;--bad:#ff8a7a;
  --font:'Tajawal',system-ui,sans-serif;--head:'Tajawal',system-ui,sans-serif;
  background:var(--paper);color:var(--ink);font-family:var(--font);font-size:16px;line-height:1.6;display:flex;flex-direction:column;gap:18px;
  margin:8px 0 40px;padding:24px;border-radius:22px;border:1px solid var(--line)}
[data-mc-theme="light"] .ol{--paper:#f7f3ec;--card:#fffdf9;--card-2:#fffaf2;--line:#e6dac6;--line-2:#cdbb9e;--ink:#231d15;--ink-2:#4d4131;--ink-3:#7a6b55;
  --fill:#fffaf2;--fill-2:#f1e8da;--pop:#fffdf9;--cta:#231d15;--cta-ink:#fffaf2;--good:#1f6f54;--good-bg:#e1efe8;--gold:#b97a12;--bad:#c0392b}
.ol *{box-sizing:border-box}
.ol button{font-family:inherit}
.ol a{color:inherit}
.ol .hd{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap}
.ol .hd h1{margin:0;font-size:32px;font-weight:700;line-height:1.2}
.ol .hd .sub{font-size:16px;color:var(--ink-3);margin-top:4px}
.ol .goal{flex:1;min-width:240px;max-width:440px}
.ol .goal .t{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:16px;font-weight:500}
.ol .goal .bar{height:10px;background:var(--fill-2);border-radius:99px;overflow:hidden;margin-top:8px}
.ol .goal .bar i{display:block;height:100%;background:var(--good);border-radius:99px;transition:width .4s}
.ol .goal .edit{display:flex;gap:8px;margin-top:8px}.ol .goal .edit input{width:110px}
.ol .linkbtn{border:0;background:none;padding:0;color:var(--ink-3);font-size:15px;text-decoration:underline;cursor:pointer}
.ol .sectors{display:flex;gap:4px;border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none}
.ol .sectors button{flex:0 0 auto;border:0;background:none;color:var(--ink-3);font-size:17px;font-weight:500;padding:10px 14px;border-bottom:3px solid transparent;cursor:pointer;white-space:nowrap}
.ol .sectors button i{font-style:normal;font-size:14px;background:var(--fill-2);border-radius:99px;padding:1px 8px;margin-inline-start:4px}
.ol .sectors button[aria-selected=true]{color:var(--ink);font-weight:700;border-color:var(--ink)}
.ol .flow{display:flex;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card-2);overflow-x:auto;scrollbar-width:none}
.ol .flow button{flex:1 0 auto;min-width:104px;border:0;border-inline-start:1px solid var(--line);background:transparent;color:var(--ink);padding:12px 16px;text-align:start;cursor:pointer}
.ol .flow button:first-child{border-inline-start:0}
.ol .flow b{display:block;font-size:28px;font-weight:700;line-height:1.15;font-variant-numeric:tabular-nums}
.ol .flow span{font-size:15px;color:var(--ink-3)}
.ol .flow button[aria-pressed=true]{background:var(--cta);color:var(--cta-ink)}.ol .flow button[aria-pressed=true] span{color:inherit;opacity:.75}
.ol .slip{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;align-items:start}
.ol .slip h2{font-weight:700;font-size:22px;margin:0;line-height:1.3}
.ol .slip .full{grid-column:1/-1}
.ol .lbl{font-size:15px;color:var(--ink-3);margin-bottom:6px}
.ol .seg{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.ol .seg button{border:0;background:transparent;font-weight:700;font-size:18px;padding:10px 0;cursor:pointer;color:var(--ink-3);border-inline-start:1px solid var(--line)}
.ol .seg button:first-child{border:0}
.ol .seg button[aria-pressed=true]{background:var(--cta);color:var(--cta-ink)}
.ol select,.ol input,.ol textarea{width:100%;border:1px solid var(--line);background:var(--fill);border-radius:12px;padding:10px 12px;font:inherit;font-size:15px;color:var(--ink)}
.ol textarea{resize:vertical}
.ol .chips{display:flex;flex-wrap:wrap;gap:8px}
.ol .chip{border:1px solid var(--line);background:var(--fill);border-radius:99px;padding:7px 15px;font-size:15px;cursor:pointer;color:var(--ink-2);font-weight:500}
.ol .chip[aria-pressed=true]{background:var(--cta);border-color:var(--cta);color:var(--cta-ink)}
.ol .chip:disabled{opacity:.5;cursor:not-allowed}
.ol .go{border:0;background:var(--cta);color:var(--cta-ink);border-radius:14px;padding:14px;font-weight:700;font-size:17px;cursor:pointer;width:100%}
.ol .go:disabled{opacity:.6;cursor:wait}
.ol .note{font-size:15px;color:var(--ink-3)}
.ol .msg-ok{color:var(--good);font-size:15px;font-weight:500}.ol .msg-bad{color:var(--bad);font-size:15px;font-weight:500}
.ol .panel{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.ol .sec-h{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.ol .sec-h h3{margin:0;font-size:20px;font-weight:700}
.ol .sec-h.due h3{color:var(--bad)}
.ol .tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ol .tools input{flex:1 1 240px;width:auto}.ol .tools select{width:auto}
.ol .tools-row{display:contents}
.ol .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.ol .cd{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}
.ol .cd.open{grid-column:1/-1}
.ol .cd.late{border-color:color-mix(in srgb,var(--bad) 45%,var(--line))}
.ol .cd-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.ol .nm{font-size:19px;font-weight:700;line-height:1.35;min-width:0;overflow-wrap:anywhere}
.ol .stars{color:var(--gold);font-size:15px;font-weight:700;white-space:nowrap}.ol .stars small{color:var(--ink-3);font-weight:400;margin-inline-start:3px}
.ol .cat{font-size:15px;color:var(--ink-3)}
.ol .tags{display:flex;gap:6px;flex-wrap:wrap}
.ol .tag{font-size:14px;font-weight:700;border-radius:8px;padding:2px 10px;background:var(--fill-2);color:var(--ink-2)}
.ol .tag.nosite{background:var(--good-bg);color:var(--good)}
.ol .tag.hot{background:var(--cta);color:var(--cta-ink)}
.ol .ph{direction:ltr;text-align:right;font-size:17px;font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums}
.ol .strow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ol .strow select{width:auto;padding:5px 10px;font-size:15px;font-weight:700;border:none}
.ol .fu{font-size:15px;color:var(--ink-3)}.ol .fu.late{color:var(--bad);font-weight:700}
.ol .meet{font-size:15px;color:var(--good);font-weight:700}
.ol .big2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ol .btn{border:1px solid var(--line);background:var(--fill);border-radius:12px;padding:9px 14px;font-size:15px;font-weight:700;cursor:pointer;color:var(--ink);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:42px;transition:border-color .15s,background .15s}
.ol .btn:hover{border-color:var(--line-2)}
.ol .btn.call{background:var(--cta);border-color:var(--cta);color:var(--cta-ink)}
.ol .btn.wa{background:transparent;border:1.5px solid var(--ink);color:var(--ink)}
.ol .big2 .btn{min-height:50px;font-size:17px}
.ol .btn.cal{background:var(--good);border-color:var(--good);color:#fff}
.ol .btn:disabled{opacity:.45;cursor:not-allowed}
.ol .small{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.ol .small .btn{min-height:40px;font-weight:500;padding:8px 6px;white-space:nowrap}
.ol .after{font-size:15px;color:var(--ink-3);border-top:1px dashed var(--line);padding-top:8px}
.ol .blocked{grid-column:1/-1;text-align:center;font-size:15px;font-weight:700;color:var(--bad);background:color-mix(in srgb,var(--bad) 12%,transparent);border-radius:12px;padding:12px}
.ol .detail{display:flex;flex-direction:column;gap:14px;padding-top:12px;border-top:1px dashed var(--line)}
.ol table{width:100%;border-collapse:collapse;font-size:15px}
.ol th{font-weight:700;font-size:14px;color:var(--ink-3);text-align:right;padding:9px 14px;background:var(--fill-2);border-bottom:1px solid var(--line)}
.ol td{padding:9px 14px;border-bottom:1px solid var(--line)}.ol td b{font-weight:700}
.ol .scroll{overflow-x:auto}
.ol .more{width:100%;border:1px dashed var(--line-2);background:transparent;color:var(--ink);border-radius:14px;padding:12px;font-size:16px;font-weight:700;cursor:pointer}
.ol .modal-bg{position:fixed;inset:0;background:rgba(10,8,5,.7);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
.ol .modal{background:var(--pop);border:1px solid var(--line-2);border-radius:20px;padding:22px;width:440px;max-width:100%;display:flex;flex-direction:column;gap:14px;color:var(--ink)}
.ol .modal h3{margin:0;font-size:22px;font-weight:700}
.ol .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ol :focus-visible{outline:2px solid var(--gold);outline-offset:2px}
@media(max-width:900px){
  .ol{padding:16px;border-radius:18px;margin:4px 0 32px}
  .ol .hd h1{font-size:27px}
  .ol .goal{max-width:none}
  .ol .flow b{font-size:24px}
  .ol .flow button{min-width:92px;padding:10px 12px}
  .ol .tools{flex-direction:column;align-items:stretch}
  .ol .tools input{flex:none;width:100%}
  .ol .tools-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;width:100%;max-width:100%;min-width:0}
  .ol .tools-row>*{flex:0 0 auto;white-space:nowrap}
  .ol .cards{grid-template-columns:1fr}
  .ol .two{grid-template-columns:1fr}
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
  const [panelOpen, setPanelOpen] = useState(false)
  const timer = useRef<number | null>(null)

  // list
  const [params] = useSearchParams()
  const initialQ = params.get('q') ?? ''
  const [search, setSearch] = useState(initialQ)
  const [statusFilter, setStatusFilter] = useState<'all' | Status>(initialQ ? 'all' : 'new')
  const [mobileOnly, setMobileOnly] = useState(!initialQ)
  const [catFilter, setCatFilter] = useState('all')
  const [sector, setSectorState] = useState<string>(() => { try { return localStorage.getItem(SECTOR_STORE) || 'all' } catch { return 'all' } })
  const setSector = (k: string) => { setSectorState(k); setCatFilter('all'); setLimit(PAGE_SIZE); try { localStorage.setItem(SECTOR_STORE, k) } catch { /* storage unavailable */ } }
  const [sort, setSort] = useState<'priority' | 'newest'>('priority')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [openId, setOpenId] = useState<string | null>(null)

  // settings / templates
  const [templates, setTemplates] = useState<Record<TemplateKey, string>>(() => loadJson(storeKey, siteMode ? SITE_TEMPLATES : DEFAULT_TEMPLATES))
  const [settings, setSettings] = useState<Settings>(() => loadJson(STORE.settings, { meetLink: '', offerLink: '' }))
  const [showSettings, setShowSettings] = useState(false)
  const [showFocus, setShowFocus] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // modals
  const [meetingFor, setMeetingFor] = useState<OutreachLead | null>(null)
  const [lostFor, setLostFor] = useState<OutreachLead | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string; link?: string; lead?: OutreachLead; call?: boolean; prev?: Partial<OutreachLead> } | null>(null)
  const [source, setSource] = useState<'google_maps' | 'linkedin'>('google_maps')
  const [daily, setDaily] = useState<DailySettings>(DEFAULT_DAILY)
  const [push, setPush] = useState<{ state: 'unsupported' | 'off' | 'on' | 'denied' | 'busy'; note?: string }>({ state: 'off' })
  const [queue, setQueue] = useState<{ ids: string[]; i: number } | null>(null)
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [goal, setGoal] = useState<{ target: number | null; won: number }>({ target: null, won: 0 })
  const [goalDraft, setGoalDraft] = useState<string | null>(null)

  const load = useCallback(async () => {
    const monthStart = new Date(`${monthKey()}-01T00:00:00+03:00`).toISOString()
    const [list, today, target, won] = await Promise.all([
      supabase.from('outreach_leads').select('*, outreach_runs(query)').eq('in_focus', true).order('created_at', { ascending: false }).limit(5000),
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).gte('created_at', startOfToday().toISOString()),
      supabase.from('agency_goals').select('target').eq('period', monthKey()).eq('kind', 'closed_deals').maybeSingle(),
      supabase.from('deals').select('id', { count: 'exact', head: true }).eq('stage', 'won').gte('closed_at', monthStart),
    ])
    setLeads((list.data ?? []) as OutreachLead[])
    setTodayCount(today.count ?? 0)
    setGoal({ target: target.data ? Number(target.data.target) : null, won: won.count ?? 0 })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useRealtimeRefetch('admin_outreach', [{ table: 'outreach_leads' }, { table: 'deals' }, { table: 'agency_goals' }], load, true)
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
          setSector(sectorKey(query))
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

  const saveGoal = async () => {
    const target = Number(goalDraft)
    if (!Number.isFinite(target) || target < 0) return
    const { error } = await supabase.from('agency_goals').upsert({ period: monthKey(), kind: 'closed_deals', target, updated_at: new Date().toISOString() }, { onConflict: 'period,kind' })
    if (error) { setToast({ ok: false, text: 'تعذّر حفظ الهدف.' }); return }
    setGoal(g => ({ ...g, target })); setGoalDraft(null)
  }

  const setStatus = (lead: OutreachLead, status: Status) => {
    if (status === 'lost') { setLostFor(lead); return }
    updateLead(lead.id, { status, ...(status === 'won' || status === 'meeting' ? { next_follow_up: null } : {}) })
  }

  const setFollowUp = (lead: OutreachLead, days: number | null) => {
    if (days === null) { updateLead(lead.id, { next_follow_up: null }); return }
    const d = new Date(); d.setHours(10, 0, 0, 0); d.setTime(d.getTime() + days * DAY)
    updateLead(lead.id, { next_follow_up: d.toISOString() })
  }

  // Any contact attempt is logged and a follow-up is scheduled for 2 days later unless one is already set.
  // The status never changes by itself: the lead stays where it is until the owner picks a new status.
  const markContact = (lead: OutreachLead, channel: 'whatsapp' | 'call' = 'whatsapp') => {
    if (isBlocked(lead)) return
    recordContact({ id: lead.id, name: lead.name, phone: lead.phone }, channel)
    const patch: Partial<OutreachLead> = {
      last_contacted_at: new Date().toISOString(),
      contact_count: (lead.contact_count || 0) + 1,
    }
    const open = ['new', 'contacted', 'no_answer'].includes(lead.status)
    const hasFuture = lead.next_follow_up && new Date(lead.next_follow_up) > new Date()
    if (open && !hasFuture) { const d = new Date(); d.setHours(10, 0, 0, 0); patch.next_follow_up = new Date(d.getTime() + 2 * DAY).toISOString() }
    updateLead(lead.id, patch)
    setToast({
      ok: true, call: channel === 'call', lead,
      prev: { status: lead.status, next_follow_up: lead.next_follow_up, last_contacted_at: lead.last_contacted_at, contact_count: lead.contact_count },
      text: `${channel === 'call' ? 'سُجّل اتصالك' : 'سُجّلت رسالتك'} بـ«${lead.name}»${patch.next_follow_up ? `، وذكّرتك بالمتابعة ${fmtFollow(patch.next_follow_up).text}` : ''}. يبقى في مكانه حتى تغيّر حالته.${channel === 'call' ? ' كيف كانت المكالمة؟' : ''}`,
    })
  }

  const removeLead = async (l: OutreachLead) => {
    if (!window.confirm(`حذف «${l.name}» نهائيًا؟ لن يرجع مع الجلب القادم.`)) return
    const r = await deleteLeads([{ id: l.id, phone: l.phone }])
    if (!r.ok) { setToast({ ok: false, text: 'تعذّر الحذف.' }); return }
    setLeads(ls => ls.filter(x => x.id !== l.id)); setOpenId(null)
    setToast({ ok: true, text: `حُذف «${l.name}».` })
  }

  // the owner's quick verdict right after a call (always applied to the latest copy of the lead)
  const outcome = (kind: 'contacted' | 'no_answer' | 'replied' | 'meeting' | 'lost' | 'undo') => {
    const base = toast?.lead
    if (!base) return
    const lead = leads.find(x => x.id === base.id) ?? base
    if (kind === 'undo') { updateLead(lead.id, { ...(toast?.prev ?? {}) }); setToast({ ok: true, text: 'أُلغي تسجيل الاتصال، ورجع العميل كما كان.' }); return }
    setToast(null)
    if (kind === 'meeting') { setMeetingFor(lead); return }
    setStatus(lead, kind)
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

  const sendObjection = (l: OutreachLead, text: string) => {
    if (isBlocked(l)) { setToast({ ok: false, text: 'هذا الرقم في قائمة ممنوع التواصل.' }); return }
    window.open(`https://wa.me/${l.phone}?text=${encodeURIComponent(text.split('{name}').join(l.name))}`, '_blank', 'noopener')
    markContact(l)
  }

  // Proposes two real free times from the owner's calendar and opens WhatsApp with the question.
  const proposeSlots = async (l: OutreachLead) => {
    if (isBlocked(l)) { setToast({ ok: false, text: 'هذا الرقم في قائمة ممنوع التواصل.' }); return }
    const { data, error } = await supabase.functions.invoke('outreach-calendar', { body: { action: 'slots', minutes: 30 } })
    const slots = (data?.slots ?? []) as { start: string; label: string }[]
    if (error || slots.length < 2) { setToast({ ok: false, text: 'ما قدرت أجيب أوقات فاضية من التقويم الآن.' }); return }
    const first = slots[0]
    const second = slots.find(s => s.start.slice(0, 10) !== first.start.slice(0, 10)) ?? slots[1]
    const text = `تمام، يناسبك نرتب مكالمة قصيرة 15 دقيقة نوريك فيها كيف يشتغل على ${l.name}؟ عندي ${first.label} أو ${second.label}. وش يناسبك؟`
    window.open(`https://wa.me/${l.phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
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

  const sectors = useMemo(() => {
    const m = new Map<string, number>()
    leads.forEach(l => { const k = sectorOf(l); m.set(k, (m.get(k) ?? 0) + 1) })
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [leads])
  const pool = useMemo(() => (sector === 'all' ? leads : leads.filter(l => sectorOf(l) === sector)), [leads, sector])

  const dueList = useMemo(
    () => pool
      .filter(l => l.next_follow_up && new Date(l.next_follow_up).getTime() <= Date.now() + 6 * 3600000 && ['contacted', 'no_answer', 'replied', 'new'].includes(l.status))
      .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime()),
    [pool],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = sort === 'priority' ? scored.sorted : leads
    return base.filter(l =>
      (sector === 'all' || sectorOf(l) === sector) &&
      (statusFilter === 'all' || l.status === statusFilter) &&
      (!siteMode || !l.website) &&
      (catFilter === 'all' || l.category === catFilter) &&
      (!mobileOnly || l.is_mobile) &&
      (!q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.category.toLowerCase().includes(q) || l.city.toLowerCase().includes(q)))
  }, [leads, scored, search, statusFilter, mobileOnly, sort, siteMode, catFilter, sector])

  const categories = useMemo(() => {
    const base = siteMode ? pool.filter(l => !l.website) : pool
    return [...new Set(base.map(l => l.category).filter(Boolean))].sort()
  }, [pool, siteMode])

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

  /* ---------- lead card ---------- */
  const FLOW: Status[] = ['new', 'contacted', 'no_answer', 'replied', 'meeting', 'won', 'lost']
  const renderLead = (l: OutreachLead) => {
    const fu = l.next_follow_up ? fmtFollow(l.next_follow_up) : null
    const st = STATUS_META[l.status]
    const open = openId === l.id
    const hot = scored.hotIds.has(l.id) && l.status === 'new'
    const late = !!fu?.late && !['won', 'lost', 'meeting'].includes(l.status)
    return (
      <article key={l.id} className={`cd ${open ? 'open' : ''} ${late ? 'late' : ''}`}>
        <div className="cd-top">
          <div className="nm">{l.name}</div>
          {l.rating ? <span className="stars">★ {l.rating}<small>({l.reviews ?? 0})</small></span> : null}
        </div>
        <div className="cat">{[l.category, l.city].filter(Boolean).join(' · ')}</div>
        {(hot || !l.website || !l.is_mobile) && (
          <div className="tags">
            {hot && <span className="tag hot">أولوية عالية</span>}
            {!l.website && <span className="tag nosite">بدون موقع</span>}
            {!l.is_mobile && <span className="tag">رقم ثابت، اتصال فقط</span>}
          </div>
        )}
        <div className="ph">+{l.phone}</div>
        <div className="strow">
          <select aria-label="الحالة" value={l.status} onChange={e => setStatus(l, e.target.value as Status)} style={{ color: st.color, background: st.bg }}>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {l.status === 'meeting' && l.meeting_at && <span className="meet">🗓 {fmtWhen(l.meeting_at)}</span>}
          {l.status === 'lost' && l.lost_reason && <span className="fu">السبب: {l.lost_reason}</span>}
          {fu && !['won', 'lost', 'meeting'].includes(l.status) && <span className={`fu ${fu.late ? 'late' : ''}`}>{fu.text}</span>}
        </div>
        <div className="big2">
          {isBlocked(l) ? <div className="blocked">ممنوع التواصل</div> : <>
            <a className="btn call" href={`tel:+${l.phone}`} onClick={() => markContact(l, 'call')}>📞 اتصال</a>
            <button className="btn wa" disabled={!l.is_mobile} onClick={() => sendWhatsApp(l)}>💬 واتساب</button>
          </>}
        </div>
        <div className="small">
          <button className="btn" onClick={() => setMeetingFor(l)}>🗓 اجتماع</button>
          <a className="btn" href={mapsUrl(l)} target="_blank" rel="noreferrer" title="موقعهم على خرائط قوقل">📍 الخريطة</a>
          <button className="btn" aria-expanded={open} onClick={() => setOpenId(open ? null : l.id)}>{open ? 'إخفاء' : 'المزيد'}</button>
        </div>
        <div className="after">
          {l.contact_count > 0
            ? `تواصلت ${l.contact_count} مرة${l.last_contacted_at ? `، آخرها ${new Date(l.last_contacted_at).toLocaleDateString(AR_GREG, { day: 'numeric', month: 'short' })}` : ''}`
            : 'لم يُتصل بعد'}
        </div>
        {open && (
          <div className="detail">
            <div>
              <div className="lbl">أرسل قالبًا محددًا</div>
              <div className="chips">
                {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map(k => (
                  <button key={k} className="chip" disabled={!l.is_mobile} aria-pressed="false" onClick={() => sendWhatsApp(l, k)}>{TEMPLATE_LABELS[k]}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="lbl">رد على اعتراض</div>
              <div className="chips">
                {OBJECTIONS.map(o => (
                  <button key={o.label} className="chip" disabled={!l.is_mobile} aria-pressed="false" onClick={() => sendObjection(l, o.text)}>{o.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="lbl">اقترح موعدًا</div>
              <div className="chips"><button className="chip" aria-pressed="false" disabled={!l.is_mobile} onClick={() => proposeSlots(l)}>🗓 أرسل موعدين فاضيين من تقويمي</button></div>
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
              {l.website && <><a href={l.website} target="_blank" rel="noreferrer">موقعهم</a> · </>}
              {l.source_url && <><a href={l.source_url} target="_blank" rel="noreferrer">صفحتهم في خرائط قوقل</a> · </>}
              <button className="linkbtn" onClick={() => removeLead(l)}>🗑 حذف هذا العميل</button>
            </div>
          </div>
        )}
      </article>
    )
  }

  const monthName = new Date().toLocaleDateString(AR_GREG, { month: 'long', timeZone: 'Asia/Riyadh' })
  const quickIds = filtered.filter(l => l.is_mobile && !isBlocked(l)).slice(0, 30).map(l => l.id)

  return (
    <div className="ol" dir="rtl">
      <style>{CSS}</style>

      {/* ---- header: title + monthly goal ---- */}
      <header className="hd">
        <div>
          <h1>{siteMode ? 'عملاء بدون موقع' : `مبيعات ${monthName}`}{sector !== 'all' && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {sectorLabel(sector)}</span>}</h1>
          <div className="sub">{nf(todayCount)} عميل أُضيف اليوم · {nf(dueList.length)} متابعة الآن</div>
        </div>
        <div className="goal">
          {goalDraft !== null ? (
            <div>
              <div className="lbl">كم صفقة تبغى تقفل هذا الشهر؟</div>
              <div className="edit">
                <input type="number" min={0} inputMode="numeric" value={goalDraft} onChange={e => setGoalDraft(e.target.value)} aria-label="هدف الشهر" />
                <button className="btn call" onClick={saveGoal}>حفظ</button>
                <button className="btn" onClick={() => setGoalDraft(null)}>إلغاء</button>
              </div>
            </div>
          ) : goal.target ? (<>
            <div className="t"><span>هدف الشهر: {nf(goal.target)} صفقات</span><span className="num">{nf(goal.won)} / {nf(goal.target)}</span></div>
            <div className="bar"><i style={{ width: `${Math.min(100, (goal.won / goal.target) * 100)}%` }} /></div>
            <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => setGoalDraft(String(goal.target))}>تعديل الهدف</button>
          </>) : (<>
            <div className="t"><span>أُغلق هذا الشهر: {nf(goal.won)}</span></div>
            <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => setGoalDraft('')}>حدد هدف الشهر</button>
          </>)}
        </div>
        <button className="btn call" onClick={() => setPanelOpen(o => !o)}>{panelOpen ? 'إخفاء الجلب' : '＋ جلب عملاء جدد'}</button>
      </header>

      {toast && (
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className={toast.ok ? 'msg-ok' : 'msg-bad'}>{toast.text}</span>
          <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {toast.call && (<>
              <button className="btn" onClick={() => outcome('contacted')}>تم التواصل</button>
              <button className="btn" onClick={() => outcome('no_answer')}>لم يرد</button>
              <button className="btn call" onClick={() => outcome('replied')}>رد ومهتم</button>
              <button className="btn cal" onClick={() => outcome('meeting')}>اجتماع</button>
              <button className="btn" onClick={() => outcome('lost')}>غير مهتم</button>
              <button className="btn" onClick={() => outcome('undo')}>تراجع</button>
            </>)}
            {!toast.call && toast.lead && toast.lead.is_mobile && toast.link && <button className="btn wa" onClick={() => sendWhatsApp(toast.lead!, 'confirm')}>أرسل التأكيد للعميل</button>}
            {toast.link && <a className="btn" href={toast.link} target="_blank" rel="noreferrer">افتح الحدث</a>}
            <button className="btn" onClick={() => setToast(null)}>إغلاق</button>
          </span>
        </div>
      )}

      {/* ---- fetch new leads ---- */}
      {panelOpen && (
        <section className="slip">
          <div className="full"><h2>{siteMode ? 'جيب أنشطة ما عندها موقع' : 'كم عميل تبغى اليوم؟'}</h2>{siteMode && <div className="note" style={{ marginTop: 6 }}>الجلب يستورد كل الأنشطة، وهذه الصفحة تعرض منها اللي ما فيها موقع فقط.</div>}</div>
          <div><div className="lbl">المصدر</div>
            <div className="chips">
              <button className="chip" aria-pressed={source === 'google_maps'} disabled={fetching} onClick={() => setSource('google_maps')}>خرائط قوقل</button>
              <button className="chip" aria-pressed={source === 'linkedin'} disabled={fetching} onClick={() => setSource('linkedin')}>LinkedIn</button>
            </div>
            {source === 'linkedin' && <div className="note" style={{ marginTop: 6 }}>الشركات من LinkedIn، والأرقام نبحث لها في خرائط قوقل. أبطأ وعدد أقل.</div>}
          </div>
          <div><div className="lbl">العدد</div>
            <div className="seg">{COUNTS.map(c => <button key={c} aria-pressed={count === c} onClick={() => setCount(c)} disabled={fetching}>{c}</button>)}</div></div>
          <div><div className="lbl">المدينة</div>
            <select value={city} onChange={e => setCity(e.target.value)} disabled={fetching}>{CITIES.map(c => <option key={c.en} value={c.en}>{c.ar}</option>)}</select></div>
          <div className="full"><div className="lbl">النشاط</div>
            <div className="chips">{QUICK_QUERIES.map(q => (
              <button key={q.en} className="chip" aria-pressed={query === q.en} disabled={fetching} onClick={() => setQuery(q.en)}>{q.ar}</button>
            ))}</div>
            <input style={{ marginTop: 10 }} dir="ltr" value={query} onChange={e => setQuery(e.target.value)} disabled={fetching} placeholder="أو اكتب بالإنجليزي: real estate developer" />
          </div>
          <div className="full" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="go" onClick={fetchLeads} disabled={fetching || !query.trim()}>
              {fetching ? `جارٍ الجلب… ${progress ? `(${progress})` : ''}` : `جيب ${count} عميل`}
            </button>
            {fetching && <div className="note">الجلب يأخذ من دقيقة إلى ٥ دقائق. تقدر تتصفح القائمة وهو يشتغل.</div>}
            {message && <div className={message.ok ? 'msg-ok' : 'msg-bad'}>{message.text}</div>}
          </div>
        </section>
      )}

      {/* ---- sectors: every fetch keeps its own section ---- */}
      {sectors.length > 0 && (
        <div className="sectors" role="tablist" aria-label="الأقسام">
          <button role="tab" aria-selected={sector === 'all'} onClick={() => setSector('all')}>كل الأقسام <i>{nf(leads.length)}</i></button>
          {sectors.map(([k, n]) => (
            <button key={k} role="tab" aria-selected={sector === k} onClick={() => setSector(k)}>{sectorLabel(k)} <i>{nf(n)}</i></button>
          ))}
        </div>
      )}

      {/* ---- stage strip doubles as the status filter ---- */}
      <nav className="flow" aria-label="مراحل البيع">
        <button aria-pressed={statusFilter === 'all'} onClick={() => { setStatusFilter('all'); setLimit(PAGE_SIZE) }}><b>{nf(pool.length)}</b><span>الكل</span></button>
        {FLOW.map(k => (
          <button key={k} aria-pressed={statusFilter === k} onClick={() => { setStatusFilter(k); setLimit(PAGE_SIZE) }}>
            <b>{nf(pool.filter(l => l.status === k).length)}</b><span>{STATUS_META[k].label}</span>
          </button>
        ))}
      </nav>

      {dueList.length > 0 && (
        <section>
          <div className="sec-h due"><h3>🔔 متابعات الآن ({nf(dueList.length)})</h3><button className="btn call" onClick={() => setQueue({ ids: dueList.map(l => l.id), i: 0 })}>▶ ابدأ المتابعة السريعة</button></div>
          <div className="cards">{dueList.slice(0, 12).map(l => renderLead(l))}</div>
        </section>
      )}

      {showFocus && <LeadFocusPanel onChanged={load} />}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="tools">
          <input placeholder="بحث بالاسم أو الرقم أو المدينة" value={search} onChange={e => { setSearch(e.target.value); setLimit(PAGE_SIZE) }} />
          <div className="tools-row">
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
            <button className="chip" aria-pressed="false" disabled={quickIds.length === 0} onClick={() => setQueue({ ids: quickIds, i: 0 })}>▶ تواصل سريع ({quickIds.length})</button>
            <button className="chip" aria-pressed={showStats} onClick={() => setShowStats(v => !v)}>📊 النتائج</button>
            <button className="chip" aria-pressed="false" onClick={() => exportCsv(filtered)}>⬇ تصدير Excel</button>
            <button className="chip" aria-pressed={showFocus} onClick={() => setShowFocus(v => !v)}>🎯 التركيز</button>
            <button className="chip" aria-pressed={showSettings} onClick={() => setShowSettings(v => !v)}>⚙ الرسائل والروابط</button>
          </div>
        </div>
            {showSettings && (
              <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              <div className="panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            {leads.length === 0 ? 'ما فيه عملاء بعد. اضغط «جلب عملاء جدد».' : 'ما فيه نتائج بهذا الفلتر.'}
          </div>
        ) : <div className="cards">{shown.map(renderLead)}</div>}

        {filtered.length > limit && (
          <button className="more" onClick={() => setLimit(n => n + PAGE_SIZE)}>عرض المزيد ({nf(filtered.length - limit)})</button>
        )}
        <div className="note" style={{ textAlign: 'center' }}>{nf(filtered.length)} نتيجة</div>
      </section>

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
