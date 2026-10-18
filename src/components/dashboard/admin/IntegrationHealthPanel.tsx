import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort, timeShort } from '../../../lib/format'

interface Check { key: string; label: string; status: 'not_configured' | 'unchecked' | 'ok' | 'degraded' | 'failed'; detail: string; latency_ms: number | null; last_checked_at: string | null }

const BADGE: Record<Check['status'], { label: string; cls: string }> = {
  ok: { label: 'متصل', cls: 'mc-g' },
  degraded: { label: 'متدهور', cls: 'mc-a' },
  failed: { label: 'فشل', cls: 'mc-a' },
  unchecked: { label: 'غير مفحوص', cls: 'mc-n2' },
  not_configured: { label: 'غير مهيأ', cls: 'mc-n2' },
}

// Live checks from the integration-health function; nothing here is a static claim.
export function IntegrationHealthPanel() {
  const [checks, setChecks] = useState<Check[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const read = useCallback(async () => {
    const { data, error: e } = await supabase.from('integration_checks').select('*').order('key')
    setError(e ? 'تعذّر قراءة نتائج الفحص.' : null)
    setChecks((data ?? []) as Check[])
  }, [])
  useEffect(() => { read() }, [read])

  const run = async () => {
    setBusy(true)
    const { error: e } = await supabase.functions.invoke('integration-health', { body: {} })
    if (e) setError('تعذّر تشغيل الفحص.')
    await read()
    setBusy(false)
  }

  return (
    <article className="mc-card" style={{ marginBottom: 14 }}>
      <div className="mc-ph">
        <h3>حالة التكاملات</h3>
        <button className="mc-btn2 p" onClick={run} disabled={busy}>{busy ? 'جاري الفحص…' : 'افحص الآن'}</button>
      </div>
      {error && <div className="mc-banner" style={{ margin: '0 20px 10px' }}>{error}</div>}
      {checks.length === 0 && !error && <div className="mc-flat">لم يُجرَ أي فحص بعد. اضغط «افحص الآن».</div>}
      {checks.map(c => (
        <div key={c.key} className="mc-agent" style={{ alignItems: 'flex-start' }}>
          <div className="mc-m"><b style={{ display: 'block', font: '700 14.5px var(--head)' }}>{c.label}</b>
            <small style={{ color: 'var(--ink-3)', fontSize: 12 }}>{c.detail}{c.last_checked_at ? ` · آخر تحقق ${dateShort(c.last_checked_at)} ${timeShort(c.last_checked_at)}` : ''}</small></div>
          <span className={`mc-st ${BADGE[c.status].cls}`}>{BADGE[c.status].label}</span>
        </div>
      ))}
    </article>
  )
}
