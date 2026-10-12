import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings, CreditCard, BarChart3, Palette, Sun, Moon, Monitor, LifeBuoy, Gift, Keyboard, MessageCircle,
  ScrollText, FileText, Shield, LogOut,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics } from '@/lib/clinicOSProduct'
import { MADAR_WHATSAPP_NUMBER } from '@/lib/constants'
import { ShellMenu, type MenuEntry } from './ShellMenu'
import { UsageRingAvatar } from './UsageRingAvatar'
import { openWhatsNew } from './WhatsNew'
import { requestOpenShortcuts } from './shellActions'

export type ThemePref = 'light' | 'dark' | 'system'

/** Seed for the person's orb: stable per signed-in user. */
export function useOrbSeed() {
  const { userEmail, companyId, companyName } = useWorkspace()
  return userEmail || companyId || companyName || 'madar'
}

/** Share of the plan used this cycle (the metric closest to its limit), 0–100. */
export function usePlanUsage() {
  const { packageType, isDemo, usageMetrics } = useWorkspace()
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  return getOverallUsage(packageType, metrics)
}

export const ACCOUNT_MENU_CSS = `
  .am-btn { width: 40px; height: 40px; border-radius: 8px; border: 0; padding: 0; background: transparent; display: grid; place-items: center;
    cursor: pointer; flex: none; transition: background-color 150ms cubic-bezier(.4,0,.2,1) !important; }
  .am-btn:hover, .am-btn[aria-expanded="true"] { background: var(--hover-bg); }
  .am-card { border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; margin-bottom: 4px; background: color-mix(in srgb, var(--panel-2) 70%, transparent); }
  .am-card-head { display: flex; align-items: center; gap: 8px; min-height: 28px; }
  .am-card-head b { font-size: 14.5px; font-weight: 500; color: var(--ink); }
  .am-mini-ring { width: 18px; height: 18px; flex: none; }
  .am-mini-ring circle { fill: none; stroke-width: 12; stroke-linecap: round; }
  .am-upgrade { margin-inline-start: auto; height: 28px; padding: 0 10px; border-radius: 6px; border: 0; background: var(--pri-bg); color: var(--pri-fg);
    font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 150ms cubic-bezier(.4,0,.2,1) !important; }
  .am-upgrade:hover, .am-upgrade:focus-visible { background: var(--pri-hover); }
  .am-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13.5px; margin-top: 6px; }
  .am-row span { color: var(--muted); }
  .am-row b { color: var(--ink); font-weight: 500; font-variant-numeric: tabular-nums; }
  .am-ws-label { font-size: 12px; color: var(--dim); }
  .am-ws-name { font-size: 14.5px; font-weight: 600; color: var(--ink); margin-top: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .am-ws-plan { font-size: 12.5px; color: var(--muted); margin-top: 1px; }
`

function MiniRing({ pct }: { pct: number }) {
  const c = 2 * Math.PI * 42
  return (
    <svg className="am-mini-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="42" stroke="var(--line-2)" />
      <circle cx="50" cy="50" r="42" stroke="var(--ink)" transform="rotate(-90 50 50)" strokeDasharray={`${(Math.max(1, pct) / 100) * c} ${c}`} />
    </svg>
  )
}

export function AccountMenu({ base, themePref, onThemeChange }: {
  base: string
  themePref: ThemePref
  onThemeChange: (pref: ThemePref) => void
}) {
  const navigate = useNavigate()
  const { companyName, packageType, logout } = useWorkspace()
  const seed = useOrbSeed()
  const overall = usePlanUsage()
  const [open, setOpen] = useState(false)
  const [viaKey, setViaKey] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const planName = CLINIC_PLANS[packageType]?.name

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus({ preventScroll: true })
  }, [])

  const go = (path: string) => () => navigate(path)
  const ext = (url: string) => () => window.open(url, '_blank', 'noopener,noreferrer')

  const items: MenuEntry[] = [
    {
      kind: 'node', id: 'usage', node: (
        <div className="am-card">
          <div className="am-card-head">
            <MiniRing pct={overall} />
            <b>باقتك</b>
            <button type="button" role="menuitem" data-mi className="am-upgrade" onClick={() => { close(false); navigate(`${base}/plan-usage`) }}>ترقية</button>
          </div>
          <div className="am-row"><span>الاستهلاك الكلي</span><b dir="ltr">{overall}%</b></div>
          <div className="am-row"><span>المتبقي</span><b dir="ltr">{Math.max(0, 100 - overall)}%</b></div>
        </div>
      ),
    },
    {
      kind: 'node', id: 'workspace', node: (
        <div className="am-card">
          <div className="am-ws-label">المنشأة الحالية</div>
          <div className="am-ws-name">{companyName || 'منشأتك'}</div>
          <div className="am-ws-plan">{planName ? `باقة ${planName}` : 'بدون باقة'}</div>
        </div>
      ),
    },
    { kind: 'item', id: 'settings', label: 'الإعدادات', icon: <Settings />, onSelect: go(`${base}/settings`) },
    { kind: 'item', id: 'billing', label: 'الفوترة والاشتراك', icon: <CreditCard />, onSelect: go(`${base}/plan-usage`) },
    { kind: 'item', id: 'usage-analytics', label: 'تحليلات الاستخدام', icon: <BarChart3 />, onSelect: go(`${base}/plan-usage`) },
    {
      kind: 'sub', id: 'theme', label: 'المظهر', icon: <Palette />, items: [
        { kind: 'radio', id: 'light', label: 'فاتح', icon: <Sun />, checked: themePref === 'light', onSelect: () => onThemeChange('light') },
        { kind: 'radio', id: 'dark', label: 'داكن', icon: <Moon />, checked: themePref === 'dark', onSelect: () => onThemeChange('dark') },
        { kind: 'radio', id: 'system', label: 'تلقائي', icon: <Monitor />, checked: themePref === 'system', onSelect: () => onThemeChange('system') },
      ],
    },
    { kind: 'sep', id: 's1' },
    {
      kind: 'sub', id: 'docs', label: 'الدليل والموارد', icon: <LifeBuoy />, items: [
        { kind: 'item', id: 'news', label: 'ما الجديد', icon: <Gift />, onSelect: openWhatsNew },
        { kind: 'item', id: 'keys', label: 'اختصارات لوحة المفاتيح', icon: <Keyboard />, onSelect: requestOpenShortcuts },
        { kind: 'item', id: 'wa', label: 'الدعم عبر واتساب', icon: <MessageCircle />, onSelect: ext(`https://wa.me/${MADAR_WHATSAPP_NUMBER}`) },
      ],
    },
    {
      kind: 'sub', id: 'legal', label: 'الشروط والخصوصية', icon: <ScrollText />, items: [
        { kind: 'item', id: 'terms', label: 'الشروط والأحكام', icon: <FileText />, onSelect: ext('/terms') },
        { kind: 'item', id: 'privacy', label: 'سياسة الخصوصية', icon: <Shield />, onSelect: ext('/privacy') },
      ],
    },
    { kind: 'sep', id: 's2' },
    { kind: 'item', id: 'logout', label: 'تسجيل الخروج', icon: <LogOut />, onSelect: () => { void logout() } },
  ]

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="am-btn"
        aria-label={`الحساب — مستهلك ${overall}% من الباقة`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { setViaKey(e.detail === 0); setOpen((v) => !v) }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setViaKey(true); setOpen(true) } }}
      >
        <UsageRingAvatar percent={overall} open={open} seed={seed} />
      </button>
      <ShellMenu open={open} anchorRef={btnRef} onClose={close} items={items} label="قائمة الحساب" width={264} focusFirst={viaKey} />
    </>
  )
}
