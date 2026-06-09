import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

type VisitRow = { id: string; company_id: string | null; created_at: string | null; subtotal?: number | null; total_amount?: number | null; price?: number | null }
type LeadRow = { id: string; created_at: string | null; stage?: string | null }

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
function dayKey(date: Date) { return date.toISOString().slice(0, 10) }
function formatSar(value: number) { return `${Math.round(value).toLocaleString('ar-SA')} ر.س` }

export const AdminOverview = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const since = new Date(); since.setDate(since.getDate() - 30)
      const [companiesRes, visitsRes, leadsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('cw_visits').select('id, company_id, created_at, subtotal, total_amount, price').gte('created_at', since.toISOString()),
        supabase.from('crm_leads').select('id, created_at, stage').gte('created_at', since.toISOString()),
      ])
      setCompanies((companiesRes.data ?? []) as Company[])
      setVisits((visitsRes.data ?? []) as VisitRow[])
      setLeads((leadsRes.data ?? []) as LeadRow[])
      setLoading(false)
    }
    load()
  }, [])

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index))
      const key = dayKey(date)
      const dayVisits = visits.filter(v => (v.created_at || '').startsWith(key))
      return {
        day: dayNames[date.getDay()],
        revenue: Math.round(dayVisits.reduce((s, v) => s + Number(v.total_amount ?? v.subtotal ?? v.price ?? 0), 0)),
        cars: dayVisits.length,
        leads: leads.filter(l => (l.created_at || '').startsWith(key)).length,
      }
    })
  }, [visits, leads])

  const revenue = visits.reduce((s, v) => s + Number(v.total_amount ?? v.subtotal ?? v.price ?? 0), 0)
  const activeCompanies = companies.filter(c => c.status === 'active').length
  const carWashCompanies = companies.filter(c => c.business_type === 'car_wash').length
  const convertedLeads = leads.filter(l => l.stage === 'won' || l.stage === 'converted').length
  const conversion = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0


  return (
    <div className="page fade-in">
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">التقارير</div>
          <div className="sec-sub">إيرادات المغاسل، نشاط السيارات، وحركة العملاء في آخر 30 يوم</div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'إيراد 30 يوم', value: formatSar(revenue) },
          { label: 'سيارات مسجلة', value: visits.length.toLocaleString() },
          { label: 'شركات نشطة', value: `${activeCompanies}/${companies.length}` },
          { label: 'تحويل المبيعات', value: `${conversion}%` },
        ].map((s, i) => (
          <div key={i} className="stat">
            <div className="stat-top"><div className="stat-label">{s.label}</div></div>
            <div className="stat-value num">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card card-pad chartbox" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>الحركة اليومية</div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 20 }}>آخر 7 أيام: الإيرادات، السيارات، والعملاء المحتملون</div>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.60 0.27 258)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="oklch(0.60 0.27 258)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(8,15,36,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--ink)' }} />
              <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="oklch(0.60 0.27 258)" fill="url(#adminRevGrad)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="cars" name="السيارات" stroke="var(--green)" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" name="العملاء المحتملون" stroke="var(--amber)" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>توزيع الشركات</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>{carWashCompanies} مغسلة سيارات من إجمالي {companies.length} شركة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'شركات نشطة', value: activeCompanies, color: 'var(--green)' },
              { label: 'تجربة أو موقوفة', value: companies.length - activeCompanies, color: 'var(--amber)' },
              { label: 'مغاسل سيارات', value: carWashCompanies, color: 'var(--primary)' },
            ].map(row => (
              <div key={row.label} className="row gap-3">
                <span style={{ flex: 1, fontSize: 13 }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>استهلاك الرسائل</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {companies.slice(0, 5).map(company => {
              const usage = company.message_limit ? Math.round(((company.messages_used || 0) / company.message_limit) * 100) : 0
              return (
                <div key={company.id}>
                  <div className="row gap-2" style={{ marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 12 }}>{company.name}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: usage >= 80 ? 'var(--red)' : 'var(--ink-3)' }}>{usage}%</span>
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: `${usage}%`, background: usage >= 80 ? 'var(--red)' : usage >= 60 ? 'var(--amber)' : 'var(--primary)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
