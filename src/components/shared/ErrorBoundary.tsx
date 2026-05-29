import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

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
            حدث خطأ غير متوقع
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748B', maxWidth: 320 }}>
            توقف تحميل الصفحة. اضغط زر التحديث وإذا استمرت المشكلة تواصل مع الدعم.
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

        {import.meta.env.DEV && (
          <details style={{ maxWidth: 480, textAlign: 'left' }}>
            <summary style={{ fontSize: 11, color: '#94A3B8', cursor: 'pointer' }}>تفاصيل الخطأ (dev)</summary>
            <pre style={{ fontSize: 10, color: '#EF4444', marginTop: 8, whiteSpace: 'pre-wrap' }}>
              {this.state.error.message}
            </pre>
          </details>
        )}
      </div>
    )
  }
}
