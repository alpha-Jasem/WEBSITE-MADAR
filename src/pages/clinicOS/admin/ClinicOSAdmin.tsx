import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Loader2, RefreshCw, TrendingUp, UsersRound, Wrench } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { CLINIC_PLANS } from '../../../lib/clinicOSProduct'
import type { PackageType } from '../../../types/clinicOS'
import '../dashboard/clinic-ai-dashboard.css'

type UsageRow = {
  whatsapp_conversations_used?: number
  ai_messages_used?: number
  smart_call_minutes_used?: number
  appointment_reminders_used?: number
}

type LimitsRow = {
  whatsapp_conversations_limit?: number
  ai_messages_limit?: number
  smart_call_minutes_limit?: number
  appointment_reminders_limit?: number
}

type ClinicClient = {
  id: string
  name: string
  owner_name?: string
  owner_email?: string
  owner_phone?: string
  city?: string
  status: string
  clinic_plan_code?: PackageType
  subscription_status?: string
  subscription_start_date?: string
  subscription_end_date?: string
  usage?: UsageRow | null
  limits?: LimitsRow | null
}

const planName = (client: ClinicClient) => client.subscription_status === 'active'
  ? CLINIC_PLANS[client.clinic_plan_code || 'whatsapp'].name
  : 'Free'

const usagePercent = (client: ClinicClient) => {
  if (!client.usage || !client.limits) return 0
  const rows = [
    [client.usage.whatsapp_conversations_used, client.limits.whatsapp_conversations_limit],
    [client.usage.ai_messages_used, client.limits.ai_messages_limit],
    [client.usage.smart_call_minutes_used, client.limits.smart_call_minutes_limit],
    [client.usage.appointment_reminders_used, client.limits.appointment_reminders_limit],
  ]
  return Math.max(0, ...rows.map(([used = 0, limit = 0]) => limit ? Math.round((used / limit) * 100) : 0))
}

export const ClinicOSAdmin = ({ embedded = false }: { embedded?: boolean }) => {
  const [clients, setClients] = useState<ClinicClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activating, setActivating] = useState<string | null>(null)
  const [selectedPlans, setSelectedPlans] = useState<Record<string, PackageType>>({})

  const loadClients = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-ops', {
      body: { action: 'clinic_clients' },
    })
    if (invokeError || data?.error) setError('تعذر تحميل حسابات العيادات. تأكد أن حسابك يملك صلاحية الإدارة.')
    else setClients(data?.clients || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const activate = async (client: ClinicClient) => {
    const planCode = selectedPlans[client.id] || client.clinic_plan_code || 'whatsapp'
    setActivating(client.id)
    setError('')
    const { data, error: invokeError } = await supabase.functions.invoke('admin-ops', {
      body: { action: 'activate_clinic_subscription', company_id: client.id, plan_code: planCode },
    })
    if (invokeError || data?.error) setError('تعذر تفعيل الاشتراك. لم يتم تغيير الحساب.')
    else await loadClients()
    setActivating(null)
  }

  const stats = useMemo(() => {
    const active = clients.filter(client => client.subscription_status === 'active').length
    const trial = clients.length - active
    const nearLimit = clients.filter(client => usagePercent(client) >= 80).length
    const expiring = clients.filter(client => client.subscription_end_date && new Date(client.subscription_end_date).getTime() - Date.now() < 30 * 86400000).length
    return { active, trial, nearLimit, expiring }
  }, [clients])

  const body = <div className="clinic-ai-page">
    <div className="clinic-ai-header">
      <div><h1>اشتراكات Clinic OS</h1><p>فعّل الباقة والحدود ودورة الاستخدام للعميل بضغطة واحدة بعد تأكيد التحويل.</p></div>
      <button className="clinic-action secondary" onClick={loadClients} disabled={loading}><RefreshCw size={15}/>تحديث</button>
    </div>
    <div className="clinic-kpi-grid">
      <AdminMetric label="إجمالي العيادات" value={clients.length} icon={UsersRound}/>
      <AdminMetric label="اشتراكات نشطة" value={stats.active} icon={CheckCircle2}/>
      <AdminMetric label="حسابات Free" value={stats.trial} icon={Building2}/>
      <AdminMetric label="اقتربت من الحد" value={stats.nearLimit} icon={AlertTriangle}/>
      <AdminMetric label="تنتهي خلال 30 يوماً" value={stats.expiring} icon={CalendarClock}/>
      <AdminMetric label="فرص الترقية" value={clients.filter(client => client.subscription_status === 'active' && client.clinic_plan_code === 'whatsapp').length} icon={TrendingUp}/>
    </div>
    {error && <div className="clinic-note" style={{ color: '#b93446', marginBottom: 14 }}>{error}</div>}
    <div className="clinic-card clinic-section">
      <div className="clinic-section-head"><div><h2>إدارة التفعيل والتجديد</h2><p>كل تفعيل يضبط سنة الاشتراك، دورة الشهر، حدود الاستخدام، وسجل التدقيق تلقائياً.</p></div></div>
      {loading ? <div className="clinic-empty-state"><Loader2 className="spin" size={24}/><strong>جاري تحميل الحسابات</strong></div> :
      <div className="clinic-list">{clients.map(client => {
        const active = client.subscription_status === 'active' && client.status !== 'trial'
        const usage = usagePercent(client)
        return <div className="clinic-list-row clinic-admin-client" key={client.id} style={{ gridTemplateColumns: '1.25fr 1fr .7fr .85fr .9fr auto' }}>
          <div><strong>{client.name}</strong><div className="clinic-muted">{client.owner_email || client.owner_phone || client.city || 'بدون بيانات تواصل'}</div></div>
          <div><strong>{planName(client)}</strong><div className="clinic-muted">{client.subscription_end_date ? `حتى ${client.subscription_end_date}` : 'لم يبدأ الاشتراك'}</div></div>
          <span className={`clinic-badge ${active ? 'success' : 'warning'}`}>{active ? 'نشط' : 'Free'}</span>
          <div><div className="clinic-usage-meta"><span>الاستخدام</span><strong>{usage}%</strong></div><div className="clinic-progress"><span style={{ width: `${usage}%`, background: usage >= 100 ? '#d44b5c' : usage >= 80 ? '#c77a18' : '#0f9f78' }}/></div></div>
          <select className="clinic-select" value={selectedPlans[client.id] || client.clinic_plan_code || 'whatsapp'} onChange={event => setSelectedPlans(current => ({ ...current, [client.id]: event.target.value as PackageType }))}>
            <option value="whatsapp">WhatsApp AI</option><option value="ai_pro">AI + Smart Calls</option>
          </select>
          <button className="clinic-action" onClick={() => activate(client)} disabled={activating === client.id}>{activating === client.id ? <><Loader2 className="spin" size={14}/>جاري التفعيل</> : <><Wrench size={14}/>{active ? 'تحديث الباقة' : 'تفعيل الاشتراك'}</>}</button>
        </div>
      })}{!clients.length && <div className="clinic-empty-state"><Building2 size={22}/><strong>لا توجد حسابات عيادات</strong></div>}</div>}
    </div>
  </div>

  if (embedded) return body
  return <div style={{ minHeight: '100vh', direction: 'rtl', background: '#f6f8fc', padding: 24 }}>{body}</div>
}

const AdminMetric = ({ label, value, icon: Icon }: { label: string; value: number; icon: typeof UsersRound }) => <div className="clinic-card clinic-kpi"><div className="clinic-kpi-icon" style={{ background: '#f0efff', color: '#6557d9' }}><Icon size={18}/></div><div className="clinic-kpi-label">{label}</div><div className="clinic-kpi-value">{value}</div><div className="clinic-kpi-description">بيانات مباشرة</div></div>
