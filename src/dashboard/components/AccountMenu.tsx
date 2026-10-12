import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Users, CreditCard, LogOut } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { getOverallUsage, getUsageMetrics } from '@/lib/clinicOSProduct'

export function AccountMenu({ base }: { base: string }) {
  const navigate = useNavigate()
  const { companyName, packageType, isDemo, usageMetrics, logout } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  const metrics = isDemo ? getUsageMetrics(packageType) : usageMetrics
  const overall = getOverallUsage(packageType, metrics)
  const initial = (companyName || 'م').trim()[0] || 'م'

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="قائمة الحساب"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, padding: 0,
          border: '1px solid var(--border-strong)', background: 'var(--raise)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600,
        }}
      >{initial}</button>

      {hover && !open && (
        <div style={{
          position: 'absolute', top: '130%', insetInlineEnd: 0, whiteSpace: 'nowrap', zIndex: 1300,
          background: 'var(--surface-inverse)', color: '#fff', padding: '6px 10px', borderRadius: 'var(--radius-md)',
          fontSize: 11.5, boxShadow: 'var(--shadow-lg)',
        }}>
          {overall}% من الاستخدام الشهري مستهلك
        </div>
      )}

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
          <div style={{
            position: 'absolute', top: '130%', insetInlineEnd: 0, width: 220,
            background: 'var(--surface-raised)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 1300,
            border: '1px solid var(--border-default)', overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{companyName || 'حسابي'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{overall}% من الاستخدام الشهري</div>
            </div>
            {[
              { icon: Settings, label: 'الإعدادات', action: () => go(`${base}/settings`) },
              { icon: Users, label: 'الفريق', action: () => go(`${base}/settings`) },
              { icon: CreditCard, label: 'الاشتراك والاستخدام', action: () => go(`${base}/plan-usage`) },
            ].map((item) => (
              <div
                key={item.label}
                onClick={item.action}
                className="dv2-menu-row"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <item.icon size={15} /> {item.label}
              </div>
            ))}
            <div
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--danger-500)', borderTop: '1px solid var(--border-default)' }}
            >
              <LogOut size={15} /> تسجيل الخروج
            </div>
          </div>
        </>
      )}
    </div>
  )
}
