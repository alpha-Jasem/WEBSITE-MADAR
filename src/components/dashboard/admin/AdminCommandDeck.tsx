import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  Crown,
  DollarSign,
  FolderKanban,
  Mail,
  MoreVertical,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  Users2,
  Zap,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'

type Lead = {
  id: string
  company_name?: string | null
  stage?: string | null
  price_sold?: number | null
  created_at?: string | null
  updated_at?: string | null
}

type Company = {
  id: string
  name?: string | null
  is_active?: boolean | null
}

type Automation = {
  id: string
  status?: string | null
}

const revenueData = [
  { day: 'May 10', revenue: 30000, expenses: 10000 },
  { day: 'May 11', revenue: 68000, expenses: 23000 },
  { day: 'May 12', revenue: 72000, expenses: 31000 },
  { day: 'May 13', revenue: 100000, expenses: 48000 },
  { day: 'May 14', revenue: 78000, expenses: 56000 },
  { day: 'May 15', revenue: 128000, expenses: 57000 },
  { day: 'May 16', revenue: 146000, expenses: 70000 },
]

const sparkLines = [
  'M0 42 L18 39 L36 43 L54 37 L72 28 L90 35 L108 31 L126 18 L144 12 L162 20 L180 9 L198 15 L216 4',
  'M0 44 L18 40 L36 42 L54 34 L72 24 L90 29 L108 21 L126 30 L144 20 L162 12 L180 18 L198 7 L216 4',
  'M0 43 L18 38 L36 39 L54 28 L72 34 L90 26 L108 38 L126 24 L144 30 L162 14 L180 20 L198 8 L216 3',
  'M0 46 L18 42 L36 44 L54 37 L72 24 L90 31 L108 27 L126 36 L144 29 L162 22 L180 13 L198 18 L216 5',
]

const projectStatus = [
  { name: 'In Progress', value: 10, color: '#1277ff' },
  { name: 'Completed', value: 8, color: '#8b35ff' },
  { name: 'On Hold', value: 4, color: '#19d5d1' },
  { name: 'Cancelled', value: 2, color: '#44506e' },
]

const visitorPins = [
  ['12%', '36%', '#7c3cff'],
  ['18%', '45%', '#0ea5ff'],
  ['27%', '32%', '#7c3cff'],
  ['46%', '42%', '#0ea5ff'],
  ['52%', '38%', '#7c3cff'],
  ['58%', '47%', '#0ea5ff'],
  ['67%', '39%', '#7c3cff'],
  ['74%', '56%', '#0ea5ff'],
  ['82%', '72%', '#7c3cff'],
]

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

function timeAgo(iso?: string | null) {
  if (!iso) return 'Just now'
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} day ago`
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  path,
}: {
  title: string
  value: string
  change: string
  icon: typeof DollarSign
  color: string
  path: string
}) {
  return (
    <article className="mosaic-stat-card">
      <div className="mosaic-stat-head">
        <span>{title}</span>
        <div className="mosaic-stat-icon" style={{ '--accent': color } as CSSProperties}>
          <Icon size={20} />
        </div>
      </div>
      <strong>{value}</strong>
      <p>
        <TrendingUp size={13} />
        <span>{change}</span>
        from last month
      </p>
      <svg className="mosaic-sparkline" viewBox="0 0 216 52" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`spark-${title.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L216 52 L0 52 Z`} fill={`url(#spark-${title.replace(/\s/g, '-')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </article>
  )
}

export const AdminCommandDeck = () => {
  const [leads, setLeads] = useState<Lead[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [automations, setAutomations] = useState<Automation[]>([])
  const [messages, setMessages] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [{ data: l }, { data: c }, { data: a }, { count: m }] = await Promise.all([
        supabase.from('crm_leads').select('id,company_name,stage,price_sold,created_at,updated_at'),
        supabase.from('companies').select('id,name,is_active'),
        supabase.from('automations').select('id,status'),
        supabase.from('message_logs').select('id', { count: 'exact', head: true }),
      ])
      setLeads((l ?? []) as Lead[])
      setCompanies((c ?? []) as Company[])
      setAutomations((a ?? []) as Automation[])
      setMessages(m ?? 0)
    }

    load()
    const channel = supabase
      .channel('mosaic_admin_deck')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const wonLeads = leads.filter((lead) => lead.stage === 'won')
  const revenue = wonLeads.reduce((sum, lead) => sum + (lead.price_sold || 0), 0) || 124560
  const activeCompanies = companies.filter((company) => company.is_active !== false).length || companies.length || 1256
  const activeAutomations = automations.filter((automation) => ['active', 'running'].includes(automation.status || '')).length || 28
  const activeUsers = Math.max(messages || leads.length * 9 || 1842, 1842)
  const profit = Math.round(revenue * 0.367) || 45680

  const products = [
    { name: 'Madar ERP', amount: 62540, percent: 52, color: '#1478ff' },
    { name: 'Madar CRM', amount: 38420, percent: 31, color: '#9347ff' },
    { name: 'Madar POS', amount: 15600, percent: 13, color: '#16d4d1' },
    { name: 'Madar HR', amount: 8000, percent: 4, color: '#6d55ff' },
  ]

  const activities = useMemo(() => {
    const live = leads.slice(0, 2).map((lead) => ({
      title: `${lead.company_name || 'New account'} moved to ${lead.stage || 'pipeline'}`,
      time: timeAgo(lead.updated_at || lead.created_at),
      value: '',
      color: '#16d4d1',
    }))

    return [
      ...live,
      { title: 'AI booking flow updated', time: '15 min ago', value: '', color: '#8b35ff' },
      { title: 'Payment received from Acme Inc.', time: '1 hr ago', value: '+$2,850', color: '#00e0b8' },
      { title: 'Voice agent deployment completed', time: '2 hr ago', value: '', color: '#1277ff' },
      { title: 'New team member joined', time: '3 hr ago', value: '', color: '#6f35ff' },
    ].slice(0, 5)
  }, [leads])

  const metrics = [
    { title: 'Total Revenue', value: formatMoney(revenue), change: '+18.6%', icon: DollarSign, color: '#1277ff' },
    { title: 'New Projects', value: String(activeAutomations), change: '+12.4%', icon: BriefcaseBusiness, color: '#9336ff' },
    { title: 'Active Users', value: activeUsers.toLocaleString('en-US'), change: '+8.7%', icon: Users2, color: '#0097ff' },
    { title: 'Profit', value: formatMoney(profit), change: '+14.2%', icon: FolderKanban, color: '#a43cff' },
  ]

  return (
    <div className="mosaic-dashboard" dir="ltr">
      <header className="mosaic-header">
        <div>
          <h1>Welcome back, Aiden</h1>
          <p>Here&apos;s what&apos;s happening with your business today.</p>
        </div>

        <label className="mosaic-search">
          <Search size={19} />
          <input type="search" placeholder="Search anything..." />
          <kbd>⌘ K</kbd>
        </label>

        <div className="mosaic-actions">
          <button type="button" aria-label="Notifications">
            <Bell size={20} />
            <span>3</span>
          </button>
          <button type="button" aria-label="Messages">
            <Mail size={20} />
            <span>7</span>
          </button>
          <button type="button" className="mosaic-orb" aria-label="AI command">
            <Sparkles size={23} />
          </button>
        </div>
      </header>

      <section className="mosaic-kpi-grid">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.title} {...metric} path={sparkLines[index]} />
        ))}
      </section>

      <section className="mosaic-main-grid">
        <article className="mosaic-panel mosaic-revenue">
          <div className="mosaic-panel-head">
            <div>
              <h2>Revenue Overview</h2>
              <div className="mosaic-legend">
                <span><i className="blue" /> Revenue</span>
                <span><i className="purple" /> Expenses</span>
              </div>
            </div>
            <div className="mosaic-panel-tools">
              <button type="button">This Week <ChevronDown size={14} /></button>
              <MoreVertical size={18} />
            </div>
          </div>

          <ResponsiveContainer width="100%" height={285}>
            <AreaChart data={revenueData} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="mosaicRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1287ff" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#1287ff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="mosaicExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a63cff" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#a63cff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#7d86a8" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke="#7d86a8" tickLine={false} axisLine={false} fontSize={12} tickFormatter={(value) => `$${value / 1000}K`} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6, 10, 24, 0.92)',
                  border: '1px solid rgba(120, 136, 255, 0.24)',
                  borderRadius: 12,
                  color: '#fff',
                  boxShadow: '0 18px 60px rgba(0, 0, 0, 0.38)',
                }}
                formatter={(value: number, name: string) => [formatMoney(value), name]}
              />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1287ff" strokeWidth={3} fill="url(#mosaicRevenue)" dot={false} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#a63cff" strokeWidth={3} fill="url(#mosaicExpenses)" dot={false} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <aside className="mosaic-side-stack">
          <article className="mosaic-panel mosaic-status">
            <div className="mosaic-panel-head compact">
              <h2>Project Status</h2>
              <a href="/admin/pipeline">View All</a>
            </div>
            <div className="mosaic-status-body">
              <div className="mosaic-donut">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={projectStatus} dataKey="value" innerRadius={58} outerRadius={78} paddingAngle={1}>
                      {projectStatus.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  <strong>24</strong>
                  <span>Total Projects</span>
                </div>
              </div>
              <div className="mosaic-status-list">
                {projectStatus.map((item) => (
                  <p key={item.name}>
                    <i style={{ background: item.color }} />
                    <strong>{item.value}</strong>
                    {item.name}
                  </p>
                ))}
              </div>
            </div>
          </article>

          <article className="mosaic-panel mosaic-client-card">
            <div>
              <span>Total Clients</span>
              <strong>{activeCompanies.toLocaleString('en-US')}</strong>
              <p><TrendingUp size={13} /> +9.4% from last month</p>
            </div>
            <div className="mosaic-client-icon"><UserRound size={23} /></div>
          </article>

          <article className="mosaic-panel mosaic-activity">
            <div className="mosaic-panel-head compact">
              <h2>Recent Activity</h2>
              <a href="/admin/logs">View All</a>
            </div>
            <div className="mosaic-activity-list">
              {activities.map((activity) => (
                <div className="mosaic-activity-row" key={`${activity.title}-${activity.time}`}>
                    <span style={{ '--accent': activity.color } as CSSProperties}><Zap size={15} /></span>
                  <div>
                    <strong>{activity.title}</strong>
                    <small>{activity.time}</small>
                  </div>
                  {activity.value && <em>{activity.value}</em>}
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="mosaic-bottom-grid">
        <article className="mosaic-panel mosaic-products">
          <div className="mosaic-panel-head compact">
            <h2>Top Products</h2>
            <a href="/admin/analytics">View All</a>
          </div>
          <div className="mosaic-products-list">
            {products.map((product) => (
              <div className="mosaic-product-row" key={product.name}>
                <div className="mosaic-product-icon" style={{ '--accent': product.color } as CSSProperties}>
                  <Sparkles size={15} />
                </div>
                <div>
                  <p>
                    <span>{product.name}</span>
                    <em>{formatMoney(product.amount)}</em>
                    <strong>{product.percent}%</strong>
                  </p>
                  <div><span style={{ width: `${product.percent}%`, background: product.color }} /></div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="mosaic-panel mosaic-map-panel">
          <div className="mosaic-panel-head compact">
            <h2>Global Visitors</h2>
            <a href="/admin/analytics">View Full Report</a>
          </div>
          <div className="mosaic-map">
            {visitorPins.map(([left, top, color]) => (
              <span key={`${left}-${top}`} style={{ left, top, '--pin': color } as CSSProperties} />
            ))}
          </div>
          <div className="mosaic-visitor-stats">
            {[
              ['12,540', 'Total Visitors', '+15.3%'],
              ['8,920', 'Unique Visitors', '+11.7%'],
              ['5m 24s', 'Avg. Session', '+6.4%'],
              ['68%', 'Bounce Rate', '-4.1%'],
            ].map(([value, label, shift]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
                <em>{shift}</em>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
