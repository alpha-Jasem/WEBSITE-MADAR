import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Public page behind a preview link. The generated page runs inside a sandboxed frame (no scripts, no forms, no access to this site).
export const SitePreview = () => {
  const { token } = useParams()
  const [state, setState] = useState<{ business: string; html: string } | 'loading' | 'missing'>('loading')

  useEffect(() => {
    document.title = 'نموذج أولي — مدار'
    if (!token) { setState('missing'); return }
    supabase.rpc('get_site_preview', { p_token: token }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null
      setState(row ? { business: row.business_name, html: row.html } : 'missing')
    })
  }, [token])

  if (state === 'loading') return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif', direction: 'rtl' }}>جاري التحميل…</div>
  if (state === 'missing') return <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif', direction: 'rtl' }}>الرابط غير صالح أو انتهت صلاحيته.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', direction: 'rtl', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '8px 14px', background: '#0b1224', color: '#cfe0ff', fontSize: 13, textAlign: 'center' }}>
        نموذج أولي لموقع «{state.business}» أعدّته مدار — غير نهائي
      </div>
      <iframe title="معاينة الموقع" sandbox="" srcDoc={state.html} style={{ flex: 1, border: 0, width: '100%', background: '#fff' }} />
    </div>
  )
}
