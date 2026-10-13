import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search, User, CalendarDays, X, LayoutDashboard, Users, MessageSquare, Star,
  Wrench, BarChart3, Wallet, BellRing, Plug, History, Settings, Plus, Clock, Sparkles, Contact,
} from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useCustomers, useBookings } from '@/lib/dashboardQueries'
import { useOnOpenSearchRequest } from './uiExtras'
import type { ModuleId } from '@/dashboard/modules'

const RECENT_KEY = 'dv2_recent_searches'

interface QuickAction { id: string; label: string; icon: React.ReactNode; run: (navigate: ReturnType<typeof useNavigate>, base: string) => void; module?: ModuleId }

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'new-booking', label: 'موعد جديد', icon: <Plus size={14} />, run: (nav, base) => nav(`${base}/bookings?new=1`), module: 'bookings' },
  { id: 'nav-home', label: 'الرئيسية', icon: <LayoutDashboard size={14} />, run: (nav, base) => nav(base) },
  { id: 'nav-bookings', label: 'الحجوزات', icon: <CalendarDays size={14} />, run: (nav, base) => nav(`${base}/bookings`), module: 'bookings' },
  { id: 'nav-patients', label: 'العملاء', icon: <Users size={14} />, run: (nav, base) => nav(`${base}/patients`), module: 'customers' },
  { id: 'nav-conversations', label: 'المحادثات', icon: <MessageSquare size={14} />, run: (nav, base) => nav(`${base}/conversations`), module: 'conversations' },
  { id: 'nav-agent-analytics', label: 'تحليلات الوكيل', icon: <Sparkles size={14} />, run: (nav, base) => nav(`${base}/agent-analytics`), module: 'voice' },
  { id: 'nav-reviews', label: 'تقييمات Google', icon: <Star size={14} />, run: (nav, base) => nav(`${base}/reviews`), module: 'reviews' },
  { id: 'nav-services', label: 'الخدمات', icon: <Wrench size={14} />, run: (nav, base) => nav(`${base}/services`), module: 'services' },
  { id: 'nav-reports', label: 'التقارير والتحليلات', icon: <BarChart3 size={14} />, run: (nav, base) => nav(`${base}/reports`), module: 'reports' },
  { id: 'nav-revenue', label: 'الإيرادات', icon: <Wallet size={14} />, run: (nav, base) => nav(`${base}/revenue`), module: 'revenue' },
  { id: 'nav-reminders', label: 'التذكيرات', icon: <BellRing size={14} />, run: (nav, base) => nav(`${base}/reminders`), module: 'reminders' },
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
  const { companyId, isDemo, hasModule } = useWorkspace()
  const { data: patients } = useCustomers(companyId, isDemo)
  const { data: appointments } = useBookings(companyId, undefined, isDemo)
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
    if (!query.trim() || !hasModule('bookings')) return []
    const q = query.trim().toLowerCase()
    return (appointments || []).filter((a) => a.patient_name?.toLowerCase().includes(q) || a.patient_phone?.includes(q) || a.service_name?.toLowerCase().includes(q)).slice(0, 5)
  }, [appointments, query, hasModule])

  const actionMatches = useMemo(() => {
    // Same module gating as the sidebar, so hidden sections aren't reachable from search.
    const available = QUICK_ACTIONS.filter((a) => !a.module || hasModule(a.module))
    if (!query.trim()) return available
    const q = query.trim().toLowerCase()
    return available.filter((a) => a.label.toLowerCase().includes(q))
  }, [query, hasModule])

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

  // A command palette: the trigger lives in the sidebar / top bar and calls
  // requestOpenSearch(); this renders only the floating panel.
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="gs-scrim" onClick={close}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1390, background: 'var(--scrim)' }}
          />
          <motion.div
            key="gs-panel" role="dialog" aria-modal="true" aria-label="البحث"
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', top: 'min(14vh, 120px)', insetInlineStart: 0, insetInlineEnd: 0, margin: '0 auto',
              width: 'min(580px, calc(100vw - 24px))', background: 'var(--surface-raised)', color: 'var(--text-primary)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-strong)',
              zIndex: 1400, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'min(520px, 76vh)',
            }}
          >
            <div style={{ position: 'relative', borderBottom: '1px solid var(--border-default)', flex: 'none' }}>
              <Search size={16} style={{ position: 'absolute', insetInlineStart: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0) }}
                onKeyDown={onKeyDown}
                placeholder="ابحث عن عميل أو حجز، أو اكتب أمرًا..."
                aria-label="البحث"
                style={{
                  width: '100%', boxSizing: 'border-box', height: 50, paddingBlock: 0, paddingInlineStart: 44, paddingInlineEnd: 56,
                  border: 0, fontSize: 14, outline: 'none', background: 'transparent', color: 'var(--text-primary)',
                }}
              />
              <button type="button" onClick={close} aria-label="إغلاق" style={{
                position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer',
                fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', border: '1px solid var(--border-strong)', background: 'transparent',
                borderRadius: 6, padding: '1px 6px',
              }}>{query ? <X size={12} style={{ display: 'block' }} /> : 'Esc'}</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '6px 0' }}>
              {!query.trim() && recent.length > 0 && (
                <div>
                  <div style={{ padding: '8px 18px 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)' }}>عمليات بحث سابقة</div>
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
                  <div style={{ padding: '8px 18px 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)' }}>{query.trim() ? 'إجراءات' : 'إجراءات سريعة'}</div>
                  {actionMatches.map((a) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'action' && r.item.id === a.id)
                    return (
                      <div
                        key={a.id}
                        onClick={() => go(flatResults[idx])}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                          background: activeIndex === idx ? 'var(--nav-active-bg)' : 'transparent', borderRadius: 8, margin: '0 6px',
                        }}
                      >
                        <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>{a.icon}</span>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.label}</div>
                      </div>
                    )
                  })}
                </div>
              )}

              {patientMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 18px 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)' }}>العملاء</div>
                  {patientMatches.map((p) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'patient' && r.item.id === p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() => go(flatResults[idx])}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                          background: activeIndex === idx ? 'var(--nav-active-bg)' : 'transparent', borderRadius: 8, margin: '0 6px',
                        }}
                      >
                        <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{p.phone}</div>
                      </div>
                    )
                  })}
                </div>
              )}
              {bookingMatches.length > 0 && (
                <div>
                  <div style={{ padding: '8px 18px 4px', fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)' }}>الحجوزات</div>
                  {bookingMatches.map((a) => {
                    const idx = flatResults.findIndex((r) => r.kind === 'booking' && r.item.id === a.id)
                    return (
                      <div
                        key={a.id}
                        onClick={() => go(flatResults[idx])}
                        onMouseEnter={() => setActiveIndex(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                          background: activeIndex === idx ? 'var(--nav-active-bg)' : 'transparent', borderRadius: 8, margin: '0 6px',
                        }}
                      >
                        <CalendarDays size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{a.service_name} · {a.appointment_date}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
