import { Component, type ReactNode } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  resetKey?: string
}
interface State { error: Error | null }

const CHUNK_RELOAD_PREFIX = 'madar_chunk_reload'

export function isChunkLoadError(error: Error | string) {
  const message = typeof error === 'string' ? error : error.message
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|dynamically imported module/i.test(message)
}

export function reloadForFreshAssets(reason = 'chunk') {
  if (typeof window === 'undefined') return
  const key = `${CHUNK_RELOAD_PREFIX}:${reason}:${window.location.pathname}`
  const lastReload = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - lastReload < 8000) return
  sessionStorage.setItem(key, String(Date.now()))
  const url = new URL(window.location.href)
  url.searchParams.set('fresh', String(Date.now()))
  window.location.replace(url.toString())
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)

    if (isChunkLoadError(error)) {
      reloadForFreshAssets('boundary')
      return
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    if (isChunkLoadError(this.state.error)) {
      return (
        <div
          dir="rtl"
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#F4F8FC',
            color: '#0D1B3E',
            fontFamily: 'Tajawal, Cairo, sans-serif',
            padding: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800 }}>
            <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: '#00BFFF' }} />
            جاري تحديث ملفات الصفحة...
          </div>
        </div>
      )
    }

    return (
      <div
        dir="rtl"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', gap: 16,
          background: '#F4F6FB', fontFamily: 'Tajawal, Cairo, sans-serif',
          padding: 24, textAlign: 'center',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={28} color="#EF4444" />
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            تعذر فتح هذه الصفحة
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B', maxWidth: 320 }}>
            رجع للقائمة واختر صفحة ثانية، أو اضغط تحديث إذا استمرت المشكلة.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          تحديث الصفحة
        </button>

        <details style={{ maxWidth: 480, textAlign: 'left' }} open>
          <summary style={{ fontSize: 11, color: '#94A3B8', cursor: 'pointer' }}>تفاصيل الخطأ</summary>
          <pre style={{ fontSize: 10, color: '#EF4444', marginTop: 8, whiteSpace: 'pre-wrap', direction: 'ltr' }}>
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack?.slice(0, 300)}
          </pre>
        </details>
      </div>
    )
  }
}
