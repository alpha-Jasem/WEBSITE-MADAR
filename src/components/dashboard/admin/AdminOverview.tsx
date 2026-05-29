import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3, Building2, Car, MessageSquare, TrendingUp, Users2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Company } from '../../../types'

type VisitRow = {
  id: string
  company_id: string | null
  created_at: string | null
  subtotal?: number | null
  total_amount?: number | null
  price?: number | null
}

type LeadRow = {
  id: string
  created_at: string | null
  stage?: string | null
}

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatSar(value: number) {
  return `${Math.round(value).toLocaleString('ar-SA')} ر.س`
}

export const AdminOverview = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 30)

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
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const key = dayKey(date)
      const dayVisits = visits.filter(visit => (visit.created_at || '').startsWith(key))
      return {
        day: dayNames[date.getDay()],
        revenue: Math.round(dayVisits.reduce((sum, visit) => sum + Number(visit.total_amount ?? visit.subtotal ?? visit.price ?? 0), 0)),
        cars: dayVisits.length,
        leads: leads.filter(lead => (lead.created_at || '').startsWith(key)).length,
      }
    })
  }, [visits, leads])

  const revenue = visits.reduce((sum, visit) => sum + Number(visit.total_amount ?? visit.subtotal ?? visit.price ?? 0), 0)
  const activeCompanies = companies.filter(company => company.status === 'active').length
  const carWashCompanies = companies.filter(company => company.business_type === 'car_wash').length
  const convertedLeads = leads.filter(lead => lead.stage === 'won' || lead.stage === 'converted').length
  const conversion = leads.length ? Math.round((convertedLeads / leads.length) * 100) : 0

  if (loading) {
    return <div className="admin-empty-state">جاري تحميل التحليلات...</div>
  }

  return (
    <div className="admin-page">
      <section className="admin-page-hero">
        <div>
          <span>التحليلات</span>
          <h1>صورة تنفيذية عن المنصة</h1>
          <p>إيرادات المغاسل، نشاط السيارات، الشركات النشطة، وحركة العملاء المحتملين في آخر 30 يوم.</p>
        </div>
      </section>

      <div className="admin-metric-strip">
        {[
          { label: 'إيراد 30 يوم', value: formatSar(revenue), color: '#10B981', icon: TrendingUp },
          { label: 'سيارات مسجلة', value: visits.length.toLocaleString('en-US'), color: '#1565C0', icon: Car },
          { label: 'شركات نشطة', value: `${activeCompanies}/${companies.length}`, color: '#00BFFF', icon: Building2 },
          { label: 'تحويل المبيعات', value: `${conversion}%`, color: '#F59E0B', icon: Users2 },
        ].map(item => {
          const Icon = item.icon
          return (
            <article key={item.label}>
              <span style={{ background: item.color }} />
              <Icon size={18} style={{ color: item.color, marginBottom: 10 }} />
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </article>
          )
        })}
      </div>

      <section className="admin-control-card">
        <div className="admin-control-card-head">
          <div className="admin-control-icon"><BarChart3 size={18} /></div>
          <div>
            <h3>الحركة اليومية</h3>
            <p>آخر 7 أيام: الإيرادات، السيارات، والعملاء المحتملون.</p>
          </div>
        </div>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevenue" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00BFFF" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#00BFFF" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(13,27,62,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#52627A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52627A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" name="الإيراد" stroke="#00BFFF" fill="url(#adminRevenue)" strokeWidth={3} />
              <Area type="monotone" dataKey="cars" name="السيارات" stroke="#1565C0" fill="transparent" strokeWidth={2} />
              <Area type="monotone" dataKey="leads" name="العملاء المحتملون" stroke="#F59E0B" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="admin-settings-grid">
        <section className="admin-control-card">
          <div className="admin-control-card-head">
            <div className="admin-control-icon"><Building2 size={18} /></div>
            <div>
              <h3>توزيع الشركات</h3>
              <p>{carWashCompanies} مغسلة سيارات من إجمالي {companies.length} شركة.</p>
            </div>
          </div>
          <div className="admin-check-list">
            <div className="done">شركات نشطة: {activeCompanies}</div>
            <div>تجربة أو موقوفة: {companies.length - activeCompanies}</div>
            <div>مغاسل سيارات: {carWashCompanies}</div>
          </div>
        </section>

        <section className="admin-control-card">
          <div className="admin-control-card-head">
            <div className="admin-control-icon"><MessageSquare size={18} /></div>
            <div>
              <h3>استهلاك الرسائل</h3>
              <p>راقب حدود واتساب قبل أن يتعطل التشغيل للعميل.</p>
            </div>
          </div>
          <div className="admin-check-list">
            {companies.slice(0, 5).map(company => (
              <div key={company.id}>{company.name}: {(company.messages_used || 0).toLocaleString('en-US')} / {(company.message_limit || 0).toLocaleString('en-US')}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
