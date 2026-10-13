import { Component, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  children: ReactNode
  resetKey?: string
}
interface State { error: Error | null }

const CHUNK_RELOAD_PREFIX = 'madar_chunk_reload'
const RUNTIME_RECOVERY_PREFIX = 'madar_runtime_recovery'

export function isChunkLoadError(error: Error | string) {
  const message = typeof error === 'string' ? error : error.message
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|dynamically imported module|MIME type|module script|Unexpected token '<'|error loading dynamically/i.test(message)
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

    if (!recoverFromRuntimeError(error)) window.setTimeout(() => this.setState({ error: null }), 4000)
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

    // No error screen: the page reloads by itself (componentDidCatch) and this quiet
    // spinner is all that shows in the meantime.
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg, #0b0b0c)' }}>
        <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite', color: '#7a8699' }} />
      </div>
    )
  }
}
