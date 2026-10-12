import { useEffect, useState } from 'react'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { DEMO_TEST_LINES } from '@/lib/queries/opsDemo'

/** Demo-only: plays a scripted exchange. Real accounts open the platform's web agent instead. */
export function TestCallDialog({ open, onClose, agentName }: { open: boolean; onClose: () => void; agentName: string }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (!open) { setShown(0); return }
    const id = window.setInterval(() => setShown((n) => (n >= DEMO_TEST_LINES.length ? n : n + 1)), 900)
    return () => window.clearInterval(id)
  }, [open])
  return (
    <Dialog open={open} title={`مكالمة تجريبية مع ${agentName}`} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>إنهاء</Button>}>
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>هذي محاكاة لشكل الرد في العرض التجريبي. في حسابك تقدر تكلم الوكيل مباشرة من المتصفح.</p>
      <div className="ops-thread">
        {DEMO_TEST_LINES.slice(0, shown).map(([w, text], i) => (
          <div key={i} className={`ops-msg ${w}`}><span className="who">{w === 'a' ? agentName : 'أنت'}</span>{text}</div>
        ))}
      </div>
    </Dialog>
  )
}
