import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { NightPage } from './shared/night'
import { WG_CSS } from './widgets/widgetUi'

// الخطط: three plans, monthly or yearly. Choosing one sends the team a request (there is no self-serve payment).

interface Plan { key: string; name: string; sub: string; monthly: number; credits: number; popular?: boolean; extra: string; support: string }

const PLANS: Plan[] = [
  { key: 'starter', name: 'ستارتر', sub: 'للفرق الجاهزة للاستخدام الإنتاجي.', monthly: 450, credits: 300000, popular: true, extra: 'كل مزايا الأساسي', support: 'دعم قياسي، حتى 3 أيام عمل' },
  { key: 'pro', name: 'برو', sub: 'لسير العمل المتقدم والاستخدام الأعلى.', monthly: 800, credits: 550000, extra: 'كل مزايا ستارتر', support: 'دعم ذو أولوية، حتى يومَي عمل' },
  { key: 'scale', name: 'سكيل', sub: 'للفرق ذات الحجم الكبير وعمليات التوسع.', monthly: 1700, credits: 1250000, extra: 'كل مزايا برو', support: 'دعم ذو أولوية، حتى يوم عمل واحد' },
]
const FEATURES = ['وكلاء صوتيون بالذكاء الاصطناعي بلا حدود', 'عدد غير محدود من أعضاء الفريق', 'تكامل مع واتساب', 'نظام تذاكر مدمج', 'إدارة جهات الاتصال', 'تحليلات مكالمات ديناميكية', 'الوصول إلى الواجهة البرمجية (API)']
const YEARLY_DISCOUNT = 0.05

const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const CSS = `
.pr { display: flex; flex-direction: column; gap: 22px; max-width: 1200px; margin: 0 auto; width: 100%; }
.pr-back { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); font-size: 13px; background: none; border: 0; font-family: inherit; cursor: pointer; padding: 0; width: fit-content; } .pr-back:hover { color: var(--ink); }
.pr-head { text-align: center; display: grid; gap: 8px; justify-items: center; } .pr-head h1 { margin: 0; font-size: 34px; font-weight: 800; color: var(--ink); } .pr-head p { margin: 0; color: var(--muted); font-size: 14px; }
.pr-tog { display: inline-flex; padding: 4px; border-radius: 999px; border: 1px solid var(--line); background: var(--panel); gap: 2px; }
.pr-tog button { border: 0; background: none; color: var(--muted); font: inherit; font-size: 13.5px; font-weight: 600; padding: 7px 18px; border-radius: 999px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
.pr-tog button[aria-pressed="true"] { background: var(--ink); color: var(--panel); }
.pr-tog em { font-style: normal; font-size: 11px; padding: 2px 8px; border-radius: 99px; background: color-mix(in srgb, #22c55e 22%, transparent); color: #16a34a; }
.pr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; align-items: stretch; padding-top: 12px; }
.pr-card { position: relative; border: 1px solid var(--line); border-radius: 22px; background: var(--panel); padding: 24px 22px; display: grid; gap: 14px; align-content: start; }
.pr-card.pop { border: 2px solid var(--ink); }
.pr-badge { position: absolute; top: -12px; inset-inline-start: 50%; transform: translateX(50%); background: var(--ink); color: var(--panel); font-size: 11.5px; font-weight: 700; padding: 3px 12px; border-radius: 99px; white-space: nowrap; }
.pr-card h2 { margin: 0; font-size: 20px; font-weight: 800; color: var(--ink); } .pr-card .sub { margin: -8px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; min-height: 44px; }
.pr-price { display: flex; align-items: baseline; gap: 8px; } .pr-price b { font-size: 36px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; } .pr-price span { color: var(--muted); font-size: 13px; }
.pr-note { color: var(--muted); font-size: 12px; min-height: 18px; }
.pr-credits { display: flex; justify-content: space-between; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 11px 0; font-size: 13.5px; } .pr-credits span { color: var(--muted); } .pr-credits b { color: var(--ink); font-variant-numeric: tabular-nums; }
.pr-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; font-size: 13.5px; color: var(--ink); line-height: 1.6; }
.pr-list li { display: flex; gap: 9px; align-items: flex-start; } .pr-list svg { flex: none; margin-top: 3px; color: #16a34a; }
.pr-btn { margin-top: 4px; height: 44px; border-radius: 13px; border: 1px solid var(--line-2, var(--line)); background: var(--panel); color: var(--ink); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
.pr-card.pop .pr-btn { background: var(--ink); color: var(--panel); border-color: var(--ink); }
.pr-btn:focus-visible, .pr-tog button:focus-visible, .pr-back:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.pr-card.ent { padding: 0; overflow: hidden; gap: 0; } .pr-ent-top { background: #0a0a0a; color: #fff; padding: 24px 22px; display: grid; gap: 14px; } .pr-ent-top h2 { color: #fff; } .pr-ent-top .sub { color: #a1a1aa; min-height: 0; margin: -8px 0 0; font-size: 13px; line-height: 1.7; } .pr-ent-top .big { font-size: 34px; font-weight: 800; padding: 14px 0; } .pr-ent-top .pr-btn { background: #fff; color: #0a0a0a; border-color: #fff; margin: 0; }
.pr-ent-body { padding: 20px 22px 24px; display: grid; gap: 12px; } .pr-ent-body h3 { margin: 0; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.pr-foot { text-align: center; color: var(--muted); font-size: 12.5px; }
`

export function DashboardV2Pricing() {
  const { isDemo } = useWorkspace()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  const [yearly, setYearly] = useState(false)

  function choose(p: Plan) {
    const subject = encodeURIComponent(`طلب الاشتراك في خطة ${p.name} (${yearly ? 'سنوي' : 'شهري'})`)
    navigate(`${base}/help/new?kind=billing&subject=${subject}`)
  }

  return (
    <NightPage>
      <style>{WG_CSS + CSS}</style>
      <div className="pr">
        <button type="button" className="pr-back" onClick={() => navigate(`${base}/billing`)}><ArrowRight size={14} /> العودة إلى الفوترة</button>
        <div className="pr-head">
          <h1>الخطط</h1>
          <p>اختر الخطة المناسبة لفريقك. يمكنك التبديل في أي وقت.</p>
          <div className="pr-tog" role="group" aria-label="فترة الدفع">
            <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)}>شهري</button>
            <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)}>سنوي <em>وفّر 5%</em></button>
          </div>
        </div>
        <div className="pr-grid">
          {PLANS.map((p) => {
            const total = Math.round(p.monthly * 12 * (1 - YEARLY_DISCOUNT))
            const month = yearly ? total / 12 : p.monthly
            return (
              <section key={p.key} className={`pr-card${p.popular ? ' pop' : ''}`} aria-label={`خطة ${p.name}`}>
                {p.popular && <span className="pr-badge">الأكثر شيوعًا</span>}
                <h2>{p.name}</h2>
                <p className="sub">{p.sub}</p>
                <div className="pr-price"><b>{nf.format(month)}</b><span>ريال / شهريًا</span></div>
                <div className="pr-note">{yearly ? `يُدفع ${nf.format(total)} ريال سنويًا` : ''}</div>
                <div className="pr-credits"><span>الرصيد الشهري</span><b>{nf.format(p.credits)}</b></div>
                <ul className="pr-list">
                  <li><Check size={15} />{p.extra}، بالإضافة إلى</li>
                  <li><Check size={15} />{p.support}</li>
                  {FEATURES.map((f) => <li key={f}><Check size={15} />{f}</li>)}
                </ul>
                <button type="button" className="pr-btn" onClick={() => choose(p)}>اختيار الخطة</button>
              </section>
            )
          })}
          <section className="pr-card ent" aria-label="باقة المؤسسات">
            <div className="pr-ent-top">
              <h2>باقة المؤسسات</h2>
              <p className="sub">للمنظمات ذات المتطلبات المخصصة.</p>
              <div className="big">مخصص</div>
              <button type="button" className="pr-btn" onClick={() => navigate(`${base}/help/new?kind=billing&subject=${encodeURIComponent('طلب باقة المؤسسات')}`)}>تواصل معنا</button>
            </div>
            <div className="pr-ent-body">
              <h3>ما تشمله الباقة</h3>
              <ul className="pr-list">
                <li><Check size={15} />رصيد: حسب الطلب</li>
                <li><Check size={15} />كل ما في باقة سكيل، بالإضافة إلى</li>
                <li><Check size={15} />اتفاقية مستوى خدمة مخصصة حسب احتياجك</li>
                <li><Check size={15} />الوصول إلى الواجهة البرمجية (API): حسب الطلب</li>
              </ul>
            </div>
          </section>
        </div>
        <p className="pr-foot">بعد اختيار الخطة يصلك طلبك للفريق ويؤكد معك الاشتراك والدفع.</p>
      </div>
    </NightPage>
  )
}
