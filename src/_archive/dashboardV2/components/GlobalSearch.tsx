import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, User, CalendarDays, X, LayoutDashboard, Users, MessageSquare, Star,
  Wrench, BarChart3, Wallet, BellRing, Plug, History, Settings, Plus, Clock,
} from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicPatients, useClinicAppointments } from '@/lib/clinicOSQueries'
import { useOnOpenSearchRequest } from './uiExtras'

const RECENT_KEY = 'dv2_recent_searches'

interface QuickAction { id: string; label: string; icon: React.ReactNode; run: (navigate: ReturnType<typeof useNavigate>, base: string) => void }

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-booking', label: 'حجز جديد', icon: <Plus size={14} />, run: (nav, base) => nav(`${base}/bookings?new=1`) },
  { id: 'nav-home', label: 'الرئيسية', icon: <LayoutDashboard size={14} />, run: (nav, base) => nav(base) },
  { id: 'nav-bookings', label: 'الحجوزات', icon: <CalendarDays size={14} />, run: (nav, base) => nav(`${base}/bookings`) },
  { id: 'nav-patients', label: 'العملاء', icon: <Users size={14} />, run: (nav, base) => nav(`${base}/patients`) },
  { id: 'nav-conversations', label: 'المحادثات', icon: <MessageSquare size={14} />, run: (nav, base) => nav(`${base}/conversations`) },
  { id: 'nav-reviews', label: 'AI Google Reviews', icon: <Star size={14} />, run: (nav, base) => nav(`${base}/reviews`) },
  { id: 'nav-services', label: 'الخدمات', icon: <Wrench size={14} />, run: (nav, base) => nav(`${base}/services`) },
  { id: 'nav-reports', label: 'التقارير والتحليلات', icon: <BarChart3 size={14} />, run: (nav, base) => nav(`${base}/reports`) },
  { id: 'nav-revenue', label: 'الإيرادات', icon: <Wallet size={14} />, run: (nav, base) => nav(`${base}/revenue`) },
  { id: 'nav-reminders', label: 'التذكيرات', icon: <BellRing size={14} />, run: (nav, base) => nav(`${base}/reminders`) },
  { id: 'nav-integrations', label: 'التكاملات', icon: <Plug size={14} />, run: (nav, base) => nav(`${base}/integrations`) },
  { id: 'nav-audit', label: 'سجل التدقيق', icon: <History size={14} />, run: (nav, base) => nav(`${base}/audit-log`) },
  { id: 'nav-settings', label: 'الإعدادات', icon: <Settings size={14} />, run: (nav, base) => nav(`${base}/settings`) },
]

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(q: string) {
  const list = [q, ...loadRecent().filter((r) => r !== q)].slice(0, 5)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export function GlobalSearch({ base }: { base: string }) {
  const navigate = useNavigate()
  const { companyId, isDemo } = useClinicOS()
  const { data: patients } = useClinicPatients(companyId, isDemo)
  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useOnOpenSearchRequest(useCallback(() => {
    setOpen(true)
    setRecent(loadRecent())
    requestAnimationFrame(() => inputRef.current?.focus())
  }, []))

  useEffect(() => { if (open) setRecent(loadRecent()) }, [open])

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

  const actionMatches = useMemo(() => {
    if (!query.trim()) return QUICK_ACTIONS
    const q = query.trim().toLowerCase()
    return QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(q))
  }, [query])

  const flatResults = useMemo(() => [
    ...actionMatches.map((a) => ({ kind: 'action' as const, item: a })),
    ...patientMatches.map((p) => ({ kind: 'patient' as const, item: p })),
    ...bookingMatches.map((a) => ({ kind: 'booking' as const, item: a })),
  ], [actionMatches, patientMatches, bookingMatches])

  const hasResults = flatResults.length > 0

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function go(entry: typeof flatResults[number]) {
    if (query.trim()) saveRecent(query.trim())
    if (entry.kind === 'action') entry.item.run(navigate, base)
    else navigate(entry.kind === 'patient' ? `${base}/patients` : `${base}/bookings`)
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
          onFocus={() => { setOpen(true); setRecent(loadRecent()) }}
          onKeyDown={onKeyDown}
          placeholder="ابحث أو اكتب أمرًا سريعًا..."
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
        {open && (
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
                zIndex: 1300, maxHeight: 400, overflowY: 'auto',
              }}
            >
              {!query.trim() && recent.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>عمليات بحث سابقة</div>
                  {recent.map((r, i) => (
                    <div key={i} onClick={() => setQuery(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer' }}>
                      <Clock size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <div style={{ fontSize: 13 }}>{r}</div>
                    </div>
                  ))}
                </div>
              )}

              {!hasResults && <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)' }}>لا نتائج</div>}

              {actionMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{query.trim() ? 'إجراءات' : 'إجراءات سريعة'}</div>
                  {actionMatches.map((a) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'action' && r.item.id === a.id)
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
                        <span style={{ color: 'var(--brand-500)', display: 'flex' }}>{a.icon}</span>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}

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
