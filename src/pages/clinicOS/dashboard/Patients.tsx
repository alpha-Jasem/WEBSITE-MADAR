import { useState } from 'react'
import { Users, UserPlus, AlertTriangle, Star, Search, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { EmptyState } from '../../../components/clinicOS/ui/EmptyState'
import { DEMO_PATIENTS, DEMO_APPOINTMENTS } from '../../../lib/clinicOSDemoData'
import type { Patient } from '../../../types/clinicOS'

const TODAY = new Date().toISOString().split('T')[0]

const TAG_CFG: Record<string, { label: string; color: string; bg: string }> = {
  new_patient:    { label: 'جديد',      color: '#7C3AED', bg: '#F5F3FF' },
  returning:      { label: 'مراجع',     color: '#0369A1', bg: '#EFF9FF' },
  vip:            { label: 'VIP',       color: '#B45309', bg: '#FFFBEB' },
  high_no_show:   { label: 'غياب متكرر',color: '#DC2626', bg: '#FEF2F2' },
  needs_followup: { label: 'يحتاج متابعة',color:'#C2410C',bg: '#FFF7ED' },
  payment_pending:{ label: 'دفع معلق', color: '#DC2626', bg: '#FEF2F2' },
  whatsapp_only:  { label: 'واتساب فقط',color: '#059669', bg: '#ECFDF5' },
}

export const Patients = () => {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Patient | null>(null)

  const filtered = DEMO_PATIENTS.filter(p => {
    if (search && !p.name.includes(search) && !p.phone.includes(search)) return false
    if (typeFilter === 'new' && p.patient_type !== 'new') return false
    if (typeFilter === 'returning' && p.patient_type !== 'returning') return false
    if (typeFilter === 'no_show' && p.no_show_count < 1) return false
    return true
  })

  const patientAppts = selected ? DEMO_APPOINTMENTS.filter(a => a.patient_id === selected.id) : []
  const upcoming = patientAppts.filter(a => a.appointment_date >= TODAY && !['cancelled','no_show'].includes(a.status))
  const history = patientAppts.filter(a => a.appointment_date < TODAY || ['completed','cancelled','no_show'].includes(a.status))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>المرضى</h1>
        <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة سجلات المرضى، الزيارات، والتواصل</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { icon: Users, label: 'إجمالي المرضى', value: DEMO_PATIENTS.length, color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: UserPlus, label: 'مرضى جدد هذا الشهر', value: DEMO_PATIENTS.filter(p => p.patient_type === 'new').length, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Users, label: 'مرضى مراجعون', value: DEMO_PATIENTS.filter(p => p.patient_type === 'returning').length, color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
          { icon: AlertTriangle, label: 'غياب متكرر', value: DEMO_PATIENTS.filter(p => p.no_show_count > 1).length, color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' },
          { icon: Star, label: 'يحتاج متابعة', value: DEMO_PATIENTS.filter(p => p.tags.includes('needs_followup')).length, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', flex: 1 }}>
          <Search size={14} style={{ color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الجوال..." style={{ border: 'none', background: 'transparent', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', width: '100%', direction: 'rtl' }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}>
          <option value="">كل المرضى</option>
          <option value="new">مرضى جدد</option>
          <option value="returning">مرضى مراجعون</option>
          <option value="no_show">غياب متكرر</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="لا توجد نتائج" body="لا يوجد مرضى يطابقون البحث." />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['المريض', 'الجوال', 'آخر زيارة', 'إجمالي الزيارات', 'الغياب', 'التصنيف', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    onClick={() => setSelected(p)}
                    style={{ borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: selected?.id === p.id ? '#EEF2FF' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLTableRowElement).style.background = '#FAFAFA' }}
                    onMouseLeave={e => { if (selected?.id !== p.id) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>{p.name.charAt(0)}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#475569', fontFamily: 'Tajawal, sans-serif' }}>{p.phone}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{p.last_visit_at?.split('T')[0] || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{p.total_visits}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: p.no_show_count > 1 ? '#DC2626' : '#0F172A', fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}>{p.no_show_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.tags.slice(0, 2).map(tag => {
                          const cfg = TAG_CFG[tag]
                          return cfg ? <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, color: cfg.color, background: cfg.bg, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>{cfg.label}</span> : null
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <ChevronLeft size={14} style={{ color: '#94A3B8' }} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Patient profile drawer */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ width: 320, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {selected.tags.map(tag => {
                const cfg = TAG_CFG[tag]
                return cfg ? <span key={tag} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, color: cfg.color, background: cfg.bg, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>{cfg.label}</span> : null
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[['الجوال', selected.phone], ['آخر زيارة', selected.last_visit_at?.split('T')[0] || '—'], ['إجمالي الزيارات', String(selected.total_visits)], ['مرات الغياب', String(selected.no_show_count)]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{k}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{v}</span>
                </div>
              ))}
            </div>
            {upcoming.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}>الموعد القادم</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', fontFamily: 'Cairo, sans-serif' }}>{upcoming[0].appointment_date} {upcoming[0].start_time}</div>
                  <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{upcoming[0].service_name} · {upcoming[0].doctor_name}</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>موعد جديد</button>
              <button style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>واتساب</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
