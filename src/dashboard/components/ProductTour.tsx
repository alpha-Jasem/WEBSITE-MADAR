import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { updateCompany } from '@/lib/dashboardQueries'

// الجولة التعريفية بعد أول وكيل: تبرز عنصرًا واحدًا في كل خطوة، ولا تنتقل إلا إذا ضغط المستخدم العنصر المبرز نفسه
// (لا زر «التالي» ولا «تخطي»). تظهر مرة واحدة بعد الأونبوردنغ (clinic_settings.tour = 'pending')، أو في العرض التجريبي عند فتح ?tour=1.

interface TourStep { find: () => HTMLElement | null; title: string; text: string; closeMenu?: boolean }

const byText = (selector: string, text: string) => () => [...document.querySelectorAll<HTMLElement>(selector)].find((el) => el.textContent?.trim().startsWith(text)) ?? null
const STEPS: TourStep[] = [
  { find: byText('.dv2-side button, .dv2-side a', 'الوكلاء'), title: 'الوكلاء', text: 'من هنا تنشئ وكلاءك الصوتيين وتعدّل شخصيتهم وصوتهم وتجرّبهم بمكالمة. اضغط «الوكلاء».' },
  { find: byText('.dv2-side button, .dv2-side a', 'قاعدة المعرفة'), title: 'قاعدة المعرفة', text: 'ارفع ملفاتك وجداولك ليجاوب الوكيل بمعلومات نشاطك. اضغط «قاعدة المعرفة».' },
  { find: () => document.querySelector<HTMLElement>('.dv2-top-end > button[aria-label^="الوضع"]'), title: 'المظهر', text: 'بدّل بين الوضع الفاتح والداكن. اضغط الزر.' },
  { find: () => document.querySelector<HTMLElement>('.am-btn'), title: 'الخطة والاستخدام', text: 'من قائمة حسابك ترى الخطة والاستهلاك والفوترة والدعم. اضغط على حسابك.' },
  { find: () => document.querySelector<HTMLElement>('.sc-launch'), title: 'اسأل مدار', text: 'مرشدك في الزاوية: يعرف الصفحة التي أنت فيها ويجيب عن أسئلتك. اضغط الكرة.', closeMenu: true },
]

const CSS = `
.pt-block { position: fixed; z-index: 2000; background: rgba(3,4,14,.62); }
.pt-ring { position: fixed; z-index: 2001; border-radius: 12px; box-shadow: 0 0 0 2px rgba(255,255,255,.95), 0 0 0 6px rgba(122,162,255,.35); pointer-events: none; animation: pt-pulse 1.8s ease-in-out infinite; }
@keyframes pt-pulse { 50% { box-shadow: 0 0 0 2px rgba(255,255,255,.95), 0 0 0 12px rgba(122,162,255,.12); } }
.pt-card { position: fixed; z-index: 2002; width: 290px; max-width: calc(100vw - 24px); background: #14162b; color: #f2f4ff; border: 1px solid #2a2f58; border-radius: 16px; padding: 14px 16px; box-shadow: 0 18px 50px rgba(0,0,0,.5); animation: pt-in .25s ease both; direction: rtl; }
@keyframes pt-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.pt-card small { color: #9aa0c4; font-size: 11.5px; letter-spacing: .02em; } .pt-card h4 { margin: 4px 0 4px; font-size: 15px; font-weight: 800; } .pt-card p { margin: 0; color: #c4c8e6; font-size: 13px; line-height: 1.8; }
@media (prefers-reduced-motion: reduce) { .pt-ring, .pt-card { animation: none; } }
`

export function ProductTour() {
  const { companyId, isDemo, companySettings, refreshAccount } = useWorkspace()
  const location = useLocation()
  const wanted = isDemo ? new URLSearchParams(location.search).get('tour') === '1' : companySettings?.tour === 'pending'
  const [active, setActive] = useState(false)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => { if (wanted && !active) { const t = window.setTimeout(() => setActive(true), 900); return () => window.clearTimeout(t) } }, [wanted, active])

  const finish = useCallback(async () => {
    setActive(false)
    if (!isDemo && companyId) {
      await updateCompany(companyId, { clinic_settings: { ...companySettings, tour: 'done' } }).catch(() => null)
      await refreshAccount().catch(() => null)
    }
  }, [isDemo, companyId, companySettings, refreshAccount])

  const advance = useCallback(() => {
    if (STEPS[idx]?.closeMenu !== undefined && idx === STEPS.length - 1) { void finish(); return }
    // The account menu stays open after its step: close it before showing the next one.
    if (idx === 3) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    setIdx((i) => i + 1)
  }, [idx, finish])

  // Follow the highlighted element (it can move when the page changes) and move on only when it is pressed.
  useEffect(() => {
    if (!active) return
    const step = STEPS[idx]
    if (!step) { void finish(); return }
    let el: HTMLElement | null = null
    let missing = 0
    const onClick = () => { window.setTimeout(advance, 60) }
    const tick = () => {
      const next = step.find()
      const r = next?.getBoundingClientRect()
      if (!next || !r || r.width === 0 || r.height === 0) {
        missing += 1
        if (missing > 8) { if (idx < STEPS.length - 1) setIdx((i) => i + 1); else void finish() }
        return
      }
      missing = 0
      if (next !== el) { el?.removeEventListener('click', onClick, true); el = next; el.addEventListener('click', onClick, true) }
      setRect((prev) => (prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height ? prev : r))
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => { window.clearInterval(timer); el?.removeEventListener('click', onClick, true) }
  }, [active, idx, advance, finish])

  if (!active || !rect) return null
  const pad = 6
  const hole = { top: Math.max(0, rect.top - pad), left: Math.max(0, rect.left - pad), right: Math.min(window.innerWidth, rect.right + pad), bottom: Math.min(window.innerHeight, rect.bottom + pad) }
  const cardW = 290
  const below = hole.bottom + 14 + 150 < window.innerHeight
  const top = below ? hole.bottom + 14 : Math.max(12, hole.top - 14 - 150)
  const left = Math.min(Math.max(12, rect.left + rect.width / 2 - cardW / 2), window.innerWidth - cardW - 12)
  const step = STEPS[idx]

  return (
    <>
      <style>{CSS}</style>
      {/* Four panels dim the page and block clicks everywhere except the highlighted element. */}
      <div className="pt-block" style={{ top: 0, left: 0, right: 0, height: hole.top }} aria-hidden="true" />
      <div className="pt-block" style={{ top: hole.bottom, left: 0, right: 0, bottom: 0 }} aria-hidden="true" />
      <div className="pt-block" style={{ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top }} aria-hidden="true" />
      <div className="pt-block" style={{ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top }} aria-hidden="true" />
      <div className="pt-ring" style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }} aria-hidden="true" />
      <div className="pt-card" role="dialog" aria-label={step.title} style={{ top, left }}>
        <small>الخطوة {idx + 1} من {STEPS.length}</small>
        <h4>{step.title}</h4>
        <p>{step.text}</p>
      </div>
    </>
  )
}
