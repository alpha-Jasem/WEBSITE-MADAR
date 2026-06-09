import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface ConvRow {
  id: string
  branch_id: string
  phone_number: string
  customer_name: string | null
  state: string
  state_data: Record<string, string>
  reminder_sent: boolean
  created_at: string
  updated_at: string
  company_name?: string | null
}

const STATE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  idle:                     { label: 'خامل',                 badgeClass: 'gray' },
  greeting:                 { label: 'ترحيب',                badgeClass: 'blue' },
  selecting_service:        { label: 'يختار الخدمة',         badgeClass: 'blue' },
  selecting_resource:       { label: 'يختار الموظف',         badgeClass: 'violet' },
  selecting_date:           { label: 'يختار التاريخ',        badgeClass: 'amber' },
  selecting_time:           { label: 'يختار الوقت',          badgeClass: 'amber' },
  confirming:               { label: 'ينتظر التأكيد',        badgeClass: 'amber' },
  booked:                   { label: 'تم الحجز',             badgeClass: 'green' },
  rescheduling_select_date: { label: 'يعيد الجدولة',         badgeClass: 'amber' },
  rescheduling_select_time: { label: 'يعيد الجدولة',         badgeClass: 'amber' },
  rescheduling_confirm:     { label: 'تأكيد إعادة جدولة',   badgeClass: 'amber' },
  cancelling_confirm:       { label: 'ينتظر تأكيد الإلغاء', badgeClass: 'red' },
  cancelled:                { label: 'ملغى',                 badgeClass: 'red' },
  abandoned:                { label: 'لم يكمل',              badgeClass: 'gray' },
  faq:                      { label: 'سؤال',                 badgeClass: 'blue' },
}

const ACTIVE_STATES = ['greeting', 'selecting_service', 'selecting_resource', 'selecting_date', 'selecting_time', 'confirming', 'rescheduling_select_date', 'rescheduling_select_time', 'rescheduling_confirm', 'cancelling_confirm', 'faq']

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${Math.floor(h / 24)} يوم`
}

export const AdminConversations = () => {
  const [conversations, setConversations] = useState<ConvRow[]>([])
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'booked' | 'abandoned'>('all')
  const [companyFilter, setCompanyFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    const { data: convs } = await supabase.from('conversation_state').select('*').order('updated_at', { ascending: false }).limit(500)
    const { data: branches } = await supabase.from('branches').select('id, company_id')
    const { data: comps } = await supabase.from('companies').select('id, name')
    const compMap: Record<string, string> = {}
    for (const c of comps ?? []) compMap[c.id] = c.name
    const branchToCompany: Record<string, string> = {}
    for (const b of branches ?? []) branchToCompany[b.id] = b.company_id
    const rows: ConvRow[] = (convs ?? []).map((c: ConvRow) => ({
      ...c,
      company_name: branchToCompany[c.branch_id] ? (compMap[branchToCompany[c.branch_id]] ?? null) : null,
    }))
    setConversations(rows)
    setCompanies(comps ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const ch = supabase.channel('admin_conv_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_state' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filtered = conversations.filter(c => {
    const matchState =
      filter === 'active' ? ACTIVE_STATES.includes(c.state) :
      filter === 'booked' ? c.state === 'booked' :
      filter === 'abandoned' ? c.state === 'abandoned' : true
    const matchCompany = companyFilter === 'all' || conversations
      .filter(x => x.company_name === companies.find(co => co.id === companyFilter)?.name)
      .some(x => x.id === c.id)
    return matchState && matchCompany
  })

  const activeCount = conversations.filter(c => ACTIVE_STATES.includes(c.state)).length
  const bookedCount = conversations.filter(c => c.state === 'booked').length
  const abandonedCount = conversations.filter(c => c.state === 'abandoned').length


  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">المحادثات</div>
          <div className="sec-sub">
            {activeCount > 0 ? <span style={{ color: 'var(--green)' }}>{activeCount} محادثة نشطة الآن</span> : 'لا توجد محادثات نشطة الآن'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          تحديث
        </button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'إجمالي', value: conversations.length },
          { label: 'نشط', value: activeCount },
          { label: 'تم الحجز', value: bookedCount },
          { label: 'لم يكمل', value: abandonedCount },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="row gap-3" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="pills">
          {([{ key: 'all', label: 'الكل' }, { key: 'active', label: 'نشط' }, { key: 'booked', label: 'محجوز' }, { key: 'abandoned', label: 'مهجور' }] as const).map(f => (
            <button key={f.key} className={`pill ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '7px 12px', fontSize: 12.5, color: 'var(--ink)', outline: 'none', cursor: 'pointer' }}>
          <option value="all">كل العملاء</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>العميل</th>
              <th>الشركة</th>
              <th>الحالة</th>
              <th>الخدمة</th>
              <th>آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-3)' }}>لا توجد محادثات في هذا التصنيف</td></tr>
            ) : filtered.map(conv => {
              const cfg = STATE_CONFIG[conv.state] ?? { label: conv.state, badgeClass: 'gray' }
              const isActive = ACTIVE_STATES.includes(conv.state)
              const sd = conv.state_data as Record<string, string>
              return (
                <tr key={conv.id}>
                  <td>
                    <div className="row gap-2">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div className="av av-sm" style={{ background: isActive ? 'rgba(48,120,255,0.25)' : 'rgba(255,255,255,0.08)', color: 'var(--ink)' }}>
                          {(conv.customer_name ?? conv.phone_number)[0]}
                        </div>
                        {isActive && <div style={{ position: 'absolute', top: -2, insetInlineEnd: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', border: '1.5px solid #050a18' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{conv.customer_name ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', direction: 'ltr', textAlign: 'start' }}>{conv.phone_number}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{conv.company_name ?? '—'}</td>
                  <td><span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{sd?.service_name ?? sd?.selected_service ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>{timeAgo(conv.updated_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
