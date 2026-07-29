import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, CalendarDays, X } from 'lucide-react'
import { useClinicOS } from '@/context/ClinicOSContext'
import { useClinicPatients, useClinicAppointments } from '@/lib/clinicOSQueries'

export function GlobalSearch() {
  const navigate = useNavigate()
  const { companyId, isDemo } = useClinicOS()
  const { data: patients } = useClinicPatients(companyId, isDemo)
  const { data: appointments } = useClinicAppointments(companyId, undefined, isDemo)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

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

  const hasResults = patientMatches.length > 0 || bookingMatches.length > 0

  function close() {
    setOpen(false)
    setQuery('')
  }

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', insetInlineStart: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث عن عميل، حجز..."
          style={{
            width: '100%', boxSizing: 'border-box', padding: '8px 34px 8px 12px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)', fontSize: 13, outline: 'none', background: 'var(--surface-sunken)',
          }}
        />
        {query && (
          <span onClick={close} style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
            <X size={14} />
          </span>
        )}
      </div>
      {open && query.trim() && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1200 }} />
          <div style={{
            position: 'absolute', top: '115%', insetInlineStart: 0, insetInlineEnd: 0, background: '#fff',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-default)',
            zIndex: 1300, maxHeight: 360, overflowY: 'auto',
          }}>
            {!hasResults && <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text-tertiary)' }}>لا نتائج</div>}
            {patientMatches.length > 0 && (
              <div>
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>العملاء</div>
                {patientMatches.map((p) => (
                  <div key={p.id} onClick={() => { navigate('/clinic-os/dashboard/patients'); close() }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer' }}>
                    <User size={14} style={{ color: 'var(--brand-500)' }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{p.phone}</div>
                  </div>
                ))}
              </div>
            )}
            {bookingMatches.length > 0 && (
              <div>
                <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>الحجوزات</div>
                {bookingMatches.map((a) => (
                  <div key={a.id} onClick={() => { navigate('/clinic-os/dashboard/bookings'); close() }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer' }}>
                    <CalendarDays size={14} style={{ color: 'var(--brand-500)' }} />
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginInlineStart: 'auto' }}>{a.service_name} · {a.appointment_date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
