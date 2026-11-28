import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { updateCompany } from '@/lib/dashboardQueries'

// الجولة التعريفية بعد أول وكيل: تبرز عناصر الشاشة واحدًا بعد الآخر مع شرح قصير.
// تظهر مرة واحدة: بعد الأونبوردنغ (clinic_settings.tour = 'pending') أو في العرض التجريبي عند فتح ?tour=1.

interface TourStep { find: () => HTMLElement | null; title: string; text: string }

const byText = (selector: string, text: string) => () => [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.textContent?.trim().startsWith(text)) ?? null
const STEPS: TourStep[] = [
  { find: () => document.querySelector<HTMLElement>('.dv2-toggle'), title: 'القائمة الجانبية', text: 'اطوِ القائمة أو وسّعها لتحصل على مساحة أكبر للمحتوى.' },
  { find: byText('.dv2-side button, .dv2-side a', 'الوكلاء'), title: 'الوكلاء', text: 'من هنا تنشئ وكلاءك الصوتيين وتعدّل شخصيتهم وصوتهم، وتجرّبهم بمكالمة.' },
  { find: byText('.dv2-side button, .dv2-side a', 'قاعدة المعرفة'), title: 'قاعدة المعرفة', text: 'ارفع ملفاتك وجداولك ليجاوب الوكيل بمعلومات نشاطك.' },
  { find: () => document.querySelector<HTMLElement>('.dv2-top-end > button[aria-label^="الوضع"]'), title: 'المظهر', text: 'بدّل بين الوضع الفاتح والداكن.' },
  { find: () => document.querySelector<HTMLElement>('.am-btn'), title: 'الخطة والاستخدام', text: 'افتح قائمة حسابك لترى الخطة والاستهلاك والفوترة والدعم.' },
  { find: () => document.querySelector<HTMLElement>('.sc-launch'), title: 'اسأل مدار', text: 'مرشدك في الزاوية: يعرف الصفحة التي أنت فيها ويجيب عن أسئلتك.' },
]

const CSS = `
.pt-shade { position: fixed; inset: 0; z-index: 2000; }
.pt-hole { position: fixed; z-index: 2001; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(3,4,14,.62), 0 0 0 2px rgba(255,255,255,.95); pointer-events: none; transition: all .28s cubic-bezier(.2,.8,.2,1); }
.pt-card { position: fixed; z-index: 2002; width: 290px; max-width: calc(100vw - 24px); background: #14162b; color: #f2f4ff; border: 1px solid #2a2f58; border-radius: 16px; padding: 14px 16px; box-shadow: 0 18px 50px rgba(0,0,0,.5); animation: pt-in .25s ease both; direction: rtl; }
@keyframes pt-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.pt-card small { color: #9aa0c4; font-size: 11.5px; letter-spacing: .02em; } .pt-card h4 { margin: 4px 0 4px; font-size: 15px; font-weight: 800; } .pt-card p { margin: 0 0 12px; color: #c4c8e6; font-size: 13px; line-height: 1.8; }
.pt-row { display: flex; align-items: center; gap: 8px; } .pt-row .sp { flex: 1; }
.pt-card button { border: 0; border-radius: 10px; font: inherit; font-size: 13px; font-weight: 700; padding: 7px 14px; cursor: pointer; }
.pt-next { background: #f2f4ff; color: #14162b; } .pt-back { background: #232749; color: #e6e9ff; } .pt-skip { background: none; color: #9aa0c4; }
.pt-card button:focus-visible { outline: 3px solid #7aa2ff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .pt-hole, .pt-card { transition: none; animation: none; } }
`

export function ProductTour() {
  const { companyId, isDemo, companySettings, refreshAccount } = useWorkspace()
  const location = useLocation()
  const wanted = isDemo ? new URLSearchParams(location.search).get('tour') === '1' : companySettings?.tour === 'pending'
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => { if (wanted) { const t = window.setTimeout(() => setActive(true), 900); return () => window.clearTimeout(t) } }, [wanted])

  const finish = useCallback(async () => {
    setActive(false)
    if (!isDemo && companyId) {
      await updateCompany(companyId, { clinic_settings: { ...companySettings, tour: 'done' } }).catch(() => null)
      await refreshAccount().catch(() => null)
    }
  }, [isDemo, companyId, companySettings, refreshAccount])

  // The step's element: skip a step whose element is not on screen (a collapsed menu, a hidden button).
  const measure = useCallback(() => {
    const el = STEPS[idx]?.find()
    const r = el?.getBoundingClientRect()
    if (!r || r.width === 0 || r.height === 0) return null
    return r
  }, [idx])
  useLayoutEffect(() => {
    if (!active) return
    const r = measure()
    if (!r) { if (idx < STEPS.length - 1) setIdx((i) => i + 1); else void finish(); return }
    setRect(r)
    const on = () => setRect(measure())
    window.addEventListener('resize', on); window.addEventListener('scroll', on, true)
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true) }
  }, [active, idx, measure, finish])
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') void finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish])

  if (!active || !rect) return null
  const pad = 6
  const cardW = 290
  const below = rect.bottom + 14 + 170 < window.innerHeight
  const top = below ? rect.bottom + 14 : Math.max(12, rect.top - 14 - 170)
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 12)
  const last = idx === STEPS.length - 1
  const step = STEPS[idx]

  return (
    <>
      <style>{CSS}</style>
      <div className="pt-shade" onClick={() => void finish()} aria-hidden="true" />
      <div className="pt-hole" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} aria-hidden="true" />
      <div className="pt-card" role="dialog" aria-label={step.title} style={{ top, left }}>
        <small>الخطوة {idx + 1} من {STEPS.length}</small>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
        <div className="pt-row">
          <button type="button" className="pt-next" onClick={() => (last ? void finish() : setIdx((i) => i + 1))}>{last ? 'تم' : 'التالي'}</button>
          {idx > 0 && <button type="button" className="pt-back" onClick={() => setIdx((i) => i - 1)}>رجوع</button>}
          <span className="sp" />
          {!last && <button type="button" className="pt-skip" onClick={() => void finish()}>تخطي</button>}
        </div>
      </div>
    </>
  )
}
