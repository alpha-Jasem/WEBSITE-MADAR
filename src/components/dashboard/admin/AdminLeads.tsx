import { useEffect, useState } from 'react'
import { fetchAllLeads, updateLeadStatus } from '../../../lib/supabase'
import { mockLeads } from '../../../lib/mockData'
import type { Lead, LeadStatus } from '../../../types'

const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost']

const statusBadge: Record<LeadStatus, string> = {
  new: 'violet',
  contacted: 'blue',
  qualified: 'green',
  converted: 'green',
  lost: 'red',
}

const statusLabel: Record<LeadStatus, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  converted: 'محوّل',
  lost: 'خسارة',
}

export const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')

  useEffect(() => {
    fetchAllLeads().then(d => { if (d.length) setLeads(d) })
  }, [])

  const handleStatus = async (id: string, status: LeadStatus) => {
    await updateLeadStatus(id, status)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const filtered = leads.filter(l => {
    const matchSearch = l.name.includes(search) || l.phone.includes(search)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  function avatarColor(name: string) {
    const colors = ['#3078FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
    return colors[name.charCodeAt(0) % colors.length]
  }

  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">العملاء المحتملون</div>
          <div className="sec-sub">{leads.length} عميل محتمل من جميع الشركات</div>
        </div>
      </div>

      <div className="row gap-3" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card row gap-2" style={{ padding: '9px 14px', flex: 1, minWidth: 220 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)', flexShrink: 0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث باسم أو رقم..."
            style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--ink)', flex: 1 }} />
        </div>
        <div className="pills">
          <button className={`pill ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
            الكل <span className="cnt">{leads.length}</span>
          </button>
          {statuses.map(s => (
            <button key={s} className={`pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>العميل</th>
              <th>المصدر</th>
              <th>القيمة</th>
              <th>الحالة</th>
              <th>آخر تواصل</th>
              <th>تغيير الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td>
                  <div className="row gap-3">
                    <div className="av av-sm" style={{ background: avatarColor(l.name) }}>{l.name[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{l.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }} dir="ltr">{l.phone}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{l.source}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{l.value ? `${l.value.toLocaleString()} ر.س` : '—'}</td>
                <td><span className={`badge ${statusBadge[l.status] || 'gray'}`}>{statusLabel[l.status]}</span></td>
                <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{new Date(l.last_contact).toLocaleDateString('ar-SA')}</td>
                <td>
                  <select value={l.status} onChange={e => handleStatus(l.id, e.target.value as LeadStatus)}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: 'var(--ink)', cursor: 'pointer', outline: 'none' }}>
                    {statuses.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
