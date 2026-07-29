import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, User, CalendarDays, X } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicPatients, useClinicAppointments } from '@/lib/clinicOSQueries'
import { useOnOpenSearchRequest } from './uiExtras'

export function GlobalSearch() {
  const navigate = useNavigate()
  const { companyId, isDemo } = useClinicOS()
  const { data: patients } = useClinicPatients(companyId, isDemo)
  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useOnOpenSearchRequest(useCallback(() => {
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, []))

  const patientMatches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return (patients || []).filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)).slice(0, 5)
  }, [patients, query])

  const bookingMatches = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return (appointments || []).filter((a) => a.patient_name?.toLowerCase().includes(q) || a.patient_phone?.includes(q) || a.service_name?.toLowerCase().includes(q)).slice(0, 5)
  }, [appointments, query])

  const flatResults = useMemo(() => [
    ...patientMatches.map((p) => ({ kind: 'patient' as const, item: p })),
    ...bookingMatches.map((a) => ({ kind: 'booking' as const, item: a })),
  ], [patientMatches, bookingMatches])

  const hasResults = flatResults.length > 0

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function go(entry: typeof flatResults[number]) {
    navigate(entry.kind === 'patient' ? '/clinic-os/dashboard/patients' : '/clinic-os/dashboard/bookings')
    close()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { close(); return }
    if (!hasResults) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); const entry = flatResults[activeIndex]; if (entry) go(entry) }
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIndex(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="ابحث عن عميل، حجز..."
          style={{
            width: '100%', boxSizing: 'border-box', padding: '8px 60px 8px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', fontSize: 13, outline: 'none', background: 'var(--surface-sunken)',
          }}
        />
        {query ? (
          <span onClick={close} style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={14} />
          </span>
        ) : (
          <span style={{
            position: 'absolute', insetInlineEnd: 8, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', padding: '2px 5px', pointerEvents: 'none',
          }}>⌘K</span>
        )}
      </div>
      <AnimatePresence>
        {open && query.trim() && (
          <>
            <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute', top: '115%', insetInlineStart: 0, insetInlineEnd: 0, background: '#fff',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-default)',
                zIndex: 1300, maxHeight: 360, overflowY: 'auto',
              }}
            >
              {!hasResults && <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)' }}>لا نتائج</div>}
              {patientMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>العملاء</div>
                  {patientMatches.map((p) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'patient' && r.item.id === p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => go(flatResults[idx])}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                          background: activeIndex === idx ? 'var(--surface-sunken)' : 'transparent',
                        }}
                      >
                        <User size={14} style={{ color: 'var(--brand-500)' }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{p.phone}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              {bookingMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>الحجوزات</div>
                  {bookingMatches.map((a) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'booking' && r.item.id === a.id)
                    return (
                      <div
                        key={a.id}
                        onClick={() => go(flatResults[idx])}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                          background: activeIndex === idx ? 'var(--surface-sunken)' : 'transparent',
                        }}
                      >
                        <CalendarDays size={14} style={{ color: 'var(--brand-500)' }} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{a.service_name} · {a.appointment_date}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
