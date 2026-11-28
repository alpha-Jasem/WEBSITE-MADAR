import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CreditCard, Gauge, LifeBuoy, UserCircle } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { supabase } from '@/lib/supabase'
import { MADAR_WHATSAPP_NUMBER } from '@/lib/constants'
import { Chip, NightPage } from './shared/night'
import { WG_CSS } from './widgets/widgetUi'
import { useAccountUsage } from '@/dashboard/components/AccountMenu'

const CSS = `
.ac { display: flex; flex-direction: column; gap: 18px; max-width: 760px; margin: 0 auto; width: 100%; }
.ac h1 { margin: 6px 0 0; font-size: 30px; font-weight: 800; color: var(--ink); }
.ac .sub { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
.ac-card { border: 1px solid var(--line); border-radius: 22px; background: var(--panel); overflow: hidden; }
.ac-head { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-bottom: 1px solid var(--line); }
.ac-head .ic { width: 40px; height: 40px; border-radius: 12px; background: var(--hover-bg); display: grid; place-items: center; color: var(--ink); flex: none; }
.ac-head b { display: block; font-size: 16px; color: var(--ink); } .ac-head small { color: var(--muted); font-size: 13px; }
.ac-body { padding: 8px 20px 18px; display: grid; }
.ac-row { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.ac-row:last-child { border-bottom: 0; } .ac-row span { color: var(--muted); } .ac-row b { color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; }
.ac-box { border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; background: var(--panel-2, var(--panel)); }
.ac-box.warn { border-color: color-mix(in srgb, var(--bad, #dc2626) 35%, var(--line)); background: color-mix(in srgb, var(--bad, #dc2626) 6%, var(--panel)); }
.ac-box small { display: block; color: var(--muted); font-size: 12.5px; margin-top: 2px; } .ac-box b { font-size: 15px; color: var(--ink); }
.ac-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--line-2, var(--line)); background: var(--panel); color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
.ac-btn.red { color: var(--bad, #dc2626); border-color: color-mix(in srgb, var(--bad, #dc2626) 35%, var(--line)); }
.ac-btn:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.ac-bar { height: 8px; border-radius: 99px; background: var(--line); overflow: hidden; margin: 6px 0 4px; } .ac-bar i { display: block; height: 100%; background: var(--ink); border-radius: 99px; min-width: 4px; }
.ac-back { display: inline-flex; gap: 6px; align-items: center; color: var(--muted); font-size: 13px; background: none; border: 0; font-family: inherit; cursor: pointer; padding: 0; width: fit-content; }
.ac-back:hover { color: var(--ink); }
`

const nf = new Intl.NumberFormat('en-US')
const dateOf = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }) : '—')
const STATUS: Record<string, [string, 'ok' | 'info' | 'muted']> = { active: ['نشط', 'ok'], trial: ['تجريبي', 'info'], expired: ['منتهي', 'muted'], suspended: ['موقوف', 'muted'] }

function Page({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const { isDemo } = useWorkspace()
  const navigate = useNavigate()
  return (
    <NightPage>
      <style>{WG_CSS + CSS}</style>
      <div className="ac">
        <div>
          <button type="button" className="ac-back" onClick={() => navigate(isDemo ? '/demo-review' : '/dashboard')}><ArrowRight size={14} /> العودة إلى الرئيسية</button>
          <h1>{title}</h1><p className="sub">{sub}</p>
        </div>
        {children}
      </div>
    </NightPage>
  )
}

function Card({ icon, title, sub, children }: { icon: ReactNode; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="ac-card">
      <div className="ac-head"><span className="ic">{icon}</span><div><b>{title}</b><small>{sub}</small></div></div>
      <div className="ac-body">{children}</div>
    </section>
  )
}

function PlanBlock() {
  const { subscriptionStatus, subscriptionStartDate, subscriptionEndDate, isDemo } = useWorkspace()
  const { planName } = useAccountUsage()
  const navigate = useNavigate()
  const base = `${isDemo ? '/demo-review' : '/dashboard'}/help/new`
  const st = STATUS[subscriptionStatus || 'active'] ?? STATUS.active
  return (
    <>
      <div className="ac-box">
        <div><small>الخطة الحالية</small><b>{planName || '—'}</b> <Chip tone={st[1]}>{st[0]}</Chip>
          {subscriptionEndDate && <small>ينتهي الاشتراك في {dateOf(subscriptionEndDate)}{subscriptionStartDate ? ` · بدأ في ${dateOf(subscriptionStartDate)}` : ''}</small>}
        </div>
        <button type="button" className="ac-btn" onClick={() => navigate(`${base}?kind=billing`)}>تغيير الخطة</button>
      </div>
      <div className="ac-box warn">
        <div><b>إلغاء الاشتراك</b><small>يسري الإلغاء في نهاية فترة الاشتراك الحالية. تحتفظ بخطتك حتى ذلك الحين.</small></div>
        <button type="button" className="ac-btn red" onClick={() => navigate(`${base}?kind=billing&cancel=1`)}>طلب إلغاء الاشتراك</button>
      </div>
    </>
  )
}

/** الحساب: profile details and the plan. */
export function DashboardV2Account() {
  const { userEmail, subscriptionStatus } = useWorkspace()
  const [info, setInfo] = useState<{ verified: boolean | null; since: string | null }>({ verified: null, since: null })
  useEffect(() => {
    let live = true
    void supabase.auth.getUser().then(({ data }) => { if (live && data.user) setInfo({ verified: !!data.user.email_confirmed_at, since: data.user.created_at ?? null }) })
    return () => { live = false }
  }, [])
  const active = !subscriptionStatus || subscriptionStatus === 'active' || subscriptionStatus === 'trial'
  return (
    <Page title="الحساب" sub="ملفك والخطة وسجل الاستخدام في مكان واحد.">
      <Card icon={<UserCircle size={20} />} title="تفاصيل الملف" sub="معلومات مرتبطة بحسابك المسجّل.">
        <div className="ac-row"><span>البريد الإلكتروني</span><b dir="ltr">{userEmail || '—'}</b></div>
        <div className="ac-row"><span>البريد موثّق</span><b>{info.verified == null ? '—' : info.verified ? 'نعم' : 'لا'}</b></div>
        <div className="ac-row"><span>الحساب نشط</span><b>{active ? 'نعم' : 'لا'}</b></div>
        <div className="ac-row"><span>عضو منذ</span><b>{dateOf(info.since)}</b></div>
      </Card>
      <Card icon={<CreditCard size={20} />} title="الخطة" sub="الاشتراك والحدود والفوترة."><PlanBlock /></Card>
      <Card icon={<Gauge size={20} />} title="سجل الاستخدام" sub="النشاط الأخير والاستهلاك."><div className="ac-row"><span>قريبًا</span><b style={{ color: 'var(--muted)', fontWeight: 400 }}>ستتوفر تقارير الاستخدام والسجل هنا قريبًا.</b></div></Card>
    </Page>
  )
}

/** الفوترة: plan, usage this period, support. */
export function DashboardV2Billing() {
  const { isDemo } = useWorkspace()
  const usage = useAccountUsage()
  const navigate = useNavigate()
  const base = isDemo ? '/demo-review' : '/dashboard'
  return (
    <Page title="الفوترة" sub="أدر خطة مساحة عملك واستخدامك واشتراكك.">
      <Card icon={<CreditCard size={20} />} title="الخطة الحالية" sub="اعرض أو غيّر أو ألغِ خطة مساحة العمل هذه."><PlanBlock /></Card>
      <Card icon={<Gauge size={20} />} title="الاستخدام في هذه الفترة" sub="استهلاك خطة مساحة العمل الحالية.">
        <div style={{ paddingTop: 10 }}>
          <div className="ac-bar" role="progressbar" aria-valuenow={usage.pct} aria-valuemin={0} aria-valuemax={100} aria-label="الاستهلاك"><i style={{ width: `${Math.max(1, Math.min(100, usage.pct))}%` }} /></div>
        </div>
        <div className="ac-row"><span>المستخدم</span><b dir="ltr">{usage.pct}%</b></div>
        {usage.total != null && <div className="ac-row"><span>الإجمالي</span><b>{nf.format(usage.total)} دقيقة</b></div>}
        {usage.remaining != null && <div className="ac-row"><span>المتبقي</span><b>{nf.format(usage.remaining)} دقيقة</b></div>}
        <div style={{ paddingTop: 10 }}><button type="button" className="ac-btn" onClick={() => navigate(`${base}/plan-usage`)}>تفاصيل كل مقياس</button></div>
      </Card>
      <Card icon={<LifeBuoy size={20} />} title="الدعم" sub="هل تواجه مشكلة أو لديك سؤال حول خطتك أو الفوترة؟ فريقنا سعيد بمساعدتك.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12 }}>
          <button type="button" className="ac-btn" onClick={() => navigate(`${base}/help/new?kind=billing`)}>إرسال طلب</button>
          <a className="ac-btn" href={`https://wa.me/${MADAR_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">واتساب</a>
        </div>
      </Card>
    </Page>
  )
}
