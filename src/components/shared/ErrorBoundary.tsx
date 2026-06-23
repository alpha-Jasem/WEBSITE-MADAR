import { Component, type ReactNode } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  resetKey?: string
}
interface State { error: Error | null }

const CHUNK_RELOAD_PREFIX = 'madar_chunk_reload'
const RUNTIME_RECOVERY_PREFIX = 'madar_runtime_recovery'

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
  window.location.reload()
}

function recoverFromRuntimeError(error: Error) {
  if (typeof window === 'undefined') return false
  const signature = `${error.name}:${error.message}`.slice(0, 120)
  const key = `${RUNTIME_RECOVERY_PREFIX}:${window.location.pathname}:${signature}`
  const lastReload = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - lastReload < 30000) return false

  sessionStorage.setItem(key, String(Date.now()))
  window.location.reload()
  return true
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

    recoverFromRuntimeError(error)
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
          background: 'rgba(11,99,246,0.1)', border: '1px solid rgba(11,99,246,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={28} color="#0B63F6" />
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
            نعيد تجهيز الصفحة
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B', maxWidth: 320 }}>
            حدث انقطاع مؤقت في تحميل الواجهة. اضغط تحديث أو ارجع للرئيسية وسيكمل النظام بشكل طبيعي.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #0B63F6, #00BFFF)',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            تحديث الصفحة
          </button>
          <button
            onClick={() => { window.location.href = window.location.pathname.startsWith('/admin') ? '/admin' : '/client' }}
            style={{
              padding: '12px 24px', borderRadius: 12, border: '1px solid #D7E1F0',
              background: '#fff', color: '#0D1B3E', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            الرجوع للرئيسية
          </button>
        </div>
      </div>
    )
  }
}
