import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { dateShort, nf, timeShort } from '../../../lib/format'

interface Workflow { id: string; name: string; active: boolean; updated_at: string | null }
interface Execution { id: string; workflow_id: string; status: string; started_at: string | null; stopped_at: string | null }
interface Snapshot {
  configured: boolean
  fetched_at?: string
  workflows?: Workflow[]
  executions?: Execution[]
  executions_error?: string | null
  error?: string
}

const EXEC_LABEL: Record<string, { label: string; badge: string }> = {
  success: { label: 'نجح', badge: 'green' },
  error: { label: 'فشل', badge: 'red' },
  crashed: { label: 'انهار', badge: 'red' },
  waiting: { label: 'ينتظر', badge: 'amber' },
  running: { label: 'يعمل', badge: 'blue' },
  canceled: { label: 'أُلغي', badge: 'amber' },
}

// n8n page: everything shown comes from the n8n REST API through the n8n-status function.
// Without credentials the page says so and shows no numbers.
export const AdminN8n = () => {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFailure(null)
    const { data, error } = await supabase.functions.invoke('n8n-status', { body: {} })
    if (error || !data) setFailure('تعذّر الاتصال بدالة n8n-status. أعد المحاولة.')
    else setSnap(data as Snapshot)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const nameOf = useMemo(() => new Map((snap?.workflows ?? []).map(w => [w.id, w.name])), [snap])
  const active = (snap?.workflows ?? []).filter(w => w.active).length
  const total = snap?.workflows?.length ?? 0

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">n8n</div>
          <div className="sec-sub">التدفقات وآخر التشغيلات من واجهة n8n مباشرة</div>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>{loading ? 'جاري الفحص…' : 'تحديث'}</button>
      </div>

      {failure && <div className="card card-pad" style={{ borderColor: 'rgba(240,80,60,.4)' }}>{failure}</div>}

      {snap && !snap.configured && (
        <div className="card card-pad" style={{ maxWidth: 640 }}>
          <span className="badge amber">غير مهيأ</span>
          <div style={{ fontWeight: 700, fontSize: 16, margin: '12px 0 6px' }}>n8n غير مربوط بهذه اللوحة</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13.5, lineHeight: 1.8 }}>
            لا تُعرض هنا أي تدفقات أو أرقام قبل الربط الفعلي. للربط أضف في أسرار Supabase:
            <div style={{ margin: '10px 0', display: 'grid', gap: 6 }}>
              <code className="mono">N8N_BASE_URL</code>
              <code className="mono">N8N_API_KEY</code>
            </div>
            ثم اضغط «تحديث». المفتاح يبقى على الخادم ولا يصل للمتصفح.
          </div>
        </div>
      )}

      {snap?.configured && snap.error && (
        <div className="card card-pad" style={{ borderColor: 'rgba(240,80,60,.4)' }}>
          <span className="badge red">فشل</span>
          <div style={{ marginTop: 10, fontSize: 13.5 }}>تعذّر قراءة n8n: <code className="mono">{snap.error}</code></div>
        </div>
      )}

      {snap?.configured && !snap.error && (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat"><div className="stat-label">التدفقات</div><div className="stat-value num">{nf(total)}</div></div>
            <div className="stat"><div className="stat-label">نشطة</div><div className="stat-value num">{nf(active)}</div></div>
            <div className="stat"><div className="stat-label">موقوفة</div><div className="stat-value num">{nf(total - active)}</div></div>
            <div className="stat">
              <div className="stat-label">آخر مزامنة</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{snap.fetched_at ? `${dateShort(snap.fetched_at)} ${timeShort(snap.fetched_at)}` : '—'}</div>
            </div>
          </div>

          <div className="card card-pad" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>التدفقات</div>
            {total === 0 ? <div className="muted">لا توجد تدفقات في هذا الحساب.</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ color: 'var(--ink-3)', textAlign: 'right' }}><th style={{ padding: 8 }}>الاسم</th><th>الحالة</th><th>آخر تعديل</th></tr></thead>
                  <tbody>
                    {snap.workflows!.map(w => (
                      <tr key={w.id} style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
                        <td style={{ padding: 10, fontWeight: 600 }}>{w.name}</td>
                        <td><span className={`badge ${w.active ? 'green' : 'amber'}`}>{w.active ? 'نشط' : 'موقوف'}</span></td>
                        <td className="muted">{w.updated_at ? dateShort(w.updated_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>آخر التشغيلات</div>
            {snap.executions_error ? (
              <div className="muted">تعذّر جلب التشغيلات: <code className="mono">{snap.executions_error}</code></div>
            ) : (snap.executions ?? []).length === 0 ? (
              <div className="muted">لا توجد تشغيلات مسجلة.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ color: 'var(--ink-3)', textAlign: 'right' }}><th style={{ padding: 8 }}>التدفق</th><th>النتيجة</th><th>البداية</th></tr></thead>
                  <tbody>
                    {snap.executions!.map(e => {
                      const st = EXEC_LABEL[e.status] ?? { label: e.status, badge: 'amber' }
                      return (
                        <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
                          <td style={{ padding: 10 }}>{nameOf.get(e.workflow_id) ?? `#${e.workflow_id}`}</td>
                          <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                          <td className="muted">{e.started_at ? `${dateShort(e.started_at)} ${timeShort(e.started_at)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
