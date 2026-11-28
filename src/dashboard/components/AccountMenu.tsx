import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, CreditCard, LifeBuoy, LogOut,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { CLINIC_PLANS, getOverallUsage, getUsageMetrics } from '@/lib/clinicOSProduct'
import { ShellMenu, type MenuEntry } from './ShellMenu'
import { UsageRingAvatar } from './UsageRingAvatar'
import { OrbAvatar } from './OrbAvatar'

export type ThemePref = 'light' | 'dark' | 'system'

/** Seed for the person's orb: stable per signed-in user. */
const nf = new Intl.NumberFormat('en-US')

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

/** The numbers the account menu and the billing page show: share used, and minutes total/remaining when the plan has call minutes. */
export function useAccountUsage() {
  const { packageType, isDemo, usageMetrics } = useWorkspace()
  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const pct = getOverallUsage(packageType, metrics)
  const calls = metrics.find((m) => m.key === 'smart_calls')
  const total = calls && calls.limit > 0 ? calls.limit : null
  const remaining = total != null && calls ? Math.max(0, total - calls.used) : null
  return { pct, total, remaining, planName: CLINIC_PLANS[packageType]?.name || '' }
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
  .am-head { display: flex; align-items: center; gap: 12px; padding: 6px 4px 10px; border-bottom: 1px solid var(--line); margin-bottom: 8px; }
  .am-head b { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: ltr; text-align: start; }
  .am-plan { display: grid; gap: 8px; padding: 4px 4px 10px; border-bottom: 1px solid var(--line); margin-bottom: 6px; }
  .am-plan .r { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13.5px; }
  .am-plan .r span { color: var(--muted); } .am-plan .r b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
  .am-bar { height: 7px; border-radius: 99px; background: var(--line); overflow: hidden; } .am-bar i { display: block; height: 100%; background: var(--ink); border-radius: 99px; min-width: 3px; }
  .am-ws-label { font-size: 12px; color: var(--dim); }
  .am-ws-name { font-size: 14.5px; font-weight: 600; color: var(--ink); margin-top: 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .am-ws-plan { font-size: 12.5px; color: var(--muted); margin-top: 1px; }
`

export function AccountMenu({ base }: { base: string }) {
  const navigate = useNavigate()
  const { logout, userEmail } = useWorkspace()
  const seed = useOrbSeed()
  const overall = usePlanUsage()
  const usage = useAccountUsage()
  const [open, setOpen] = useState(false)
  const [viaKey, setViaKey] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus({ preventScroll: true })
  }, [])

  const go = (path: string) => () => navigate(path)

  const items: MenuEntry[] = [
    {
      kind: 'node', id: 'who', node: (
        <div className="am-head">
          <OrbAvatar seed={seed} size={36} />
          <b>{userEmail || 'حسابي'}</b>
        </div>
      ),
    },
    {
      kind: 'node', id: 'plan', node: (
        <div className="am-plan">
          <div className="r">
            <div style={{ display: 'grid' }}><span style={{ fontSize: 12 }}>الخطة</span><b>{usage.planName || '—'}</b></div>
            <button type="button" role="menuitem" data-mi className="am-upgrade" style={{ marginInlineStart: 0 }} onClick={() => { close(false); navigate(`${base}/pricing`) }}>ترقية</button>
          </div>
          <div className="am-bar" role="progressbar" aria-valuenow={usage.pct} aria-valuemin={0} aria-valuemax={100} aria-label="الاستهلاك"><i style={{ width: `${Math.max(1, Math.min(100, usage.pct))}%` }} /></div>
          <div className="r"><span>المستخدم</span><b dir="ltr">{usage.pct}%</b></div>
          {usage.total != null && <div className="r"><span>الإجمالي</span><b>{nf.format(usage.total)} دقيقة</b></div>}
          {usage.remaining != null && <div className="r"><span>المتبقي</span><b>{nf.format(usage.remaining)} دقيقة</b></div>}
        </div>
      ),
    },
    { kind: 'item', id: 'account', label: 'الحساب', icon: <User />, onSelect: go(`${base}/account`) },
    { kind: 'item', id: 'billing', label: 'الفوترة', icon: <CreditCard />, onSelect: go(`${base}/billing`) },
    { kind: 'item', id: 'help', label: 'الدعم', icon: <LifeBuoy />, onSelect: go(`${base}/help`) },
    { kind: 'sep', id: 's2' },
    { kind: 'item', id: 'logout', label: 'تسجيل الخروج', icon: <LogOut />, danger: true, onSelect: () => { void logout() } },
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
