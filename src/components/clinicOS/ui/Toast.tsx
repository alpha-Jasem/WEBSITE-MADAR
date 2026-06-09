import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { color: string; bg: string; border: string; Icon: React.ElementType }> = {
  success: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle },
  error:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', Icon: AlertCircle },
  info:    { color: '#4F46E5', bg: '#EEF2FF', border: '#C7D2FE', Icon: Info },
  warning: { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', Icon: AlertTriangle },
}

const MAX_TOASTS = 3
const AUTO_DISMISS_MS = 3500

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

// ─── Provider ────────────────────────────────────────────────────────────────

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts(prev => {
      const next = [...prev, { id, message, type }]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

// ─── Container ────────────────────────────────────────────────────────────────

const ToastContainer = ({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) => (
  <div
    style={{
      position: 'fixed',
      bottom: 24,
      left: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none',
    }}
  >
    <AnimatePresence initial={false}>
      {toasts.map(toast => (
        <ToastPill key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </AnimatePresence>
  </div>
)

// ─── Pill ────────────────────────────────────────────────────────────────────

const ToastPill = ({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) => {
  const cfg = TOAST_CONFIG[toast.type]
  const Icon = cfg.Icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 40,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        minWidth: 220,
        maxWidth: 360,
        pointerEvents: 'all',
        cursor: 'default',
      }}
    >
      <Icon size={16} style={{ color: cfg.color, flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontFamily: 'Tajawal, sans-serif',
          color: '#1E293B',
          lineHeight: 1.5,
          fontWeight: 500,
        }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          color: '#94A3B8',
          flexShrink: 0,
        }}
        aria-label="إغلاق"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}
