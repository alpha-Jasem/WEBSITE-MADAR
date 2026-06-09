import { useEffect, useMemo, useState } from 'react'
import { ArrowUpLeft, CheckCircle2, ClipboardCheck, Loader2, MapPin, QrCode, Sparkles, Users, WalletCards, Wrench, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { getSelfCheckinUrl } from '../../../lib/selfCheckin'

type ChecklistCounts = {
  services: number
  workers: number
  activePlans: number
  customers: number
  carsToday: number
  closingToday: number
}

function pct(done: number, total: number) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

export function CarWashLaunchChecklist({ compact = false }: { compact?: boolean }) {
  const { company, companyId } = useClientCompany()
  const [counts, setCounts] = useState<ChecklistCounts>({ services: 0, workers: 0, activePlans: 0, customers: 0, carsToday: 0, closingToday: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    Promise.all([
      supabase.from('cw_services').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
      supabase.from('cw_workers').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
      supabase.from('cw_membership_plans').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
      supabase.from('cw_customers').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
      supabase.from('cw_queue').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', today.toISOString()).neq('status', 'cancelled'),
      supabase.from('cw_daily_closings').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('date', today.toISOString().slice(0, 10)),
    ]).then(([services, workers, plans, customers, queue, closing]) => {
      setCounts({
        services: services.count || 0,
        workers: workers.count || 0,
        activePlans: plans.count || 0,
        customers: customers.count || 0,
        carsToday: queue.count || 0,
        closingToday: closing.count || 0,
      })
      setLoading(false)
    })
  }, [companyId])

  const flags = ((company?.cw_automations as any)?.feature_flags || {}) as Record<string, boolean>
  const checkinUrl = getSelfCheckinUrl(company as any)

  const items = useMemo(() => [
    {
      id: 'services',
      label: 'الخدمات والأسعار',
      detail: counts.services > 0 ? `${counts.services} خدمة مفعلة` : 'أضف أسعار الغسيل قبل البيع',
      done: counts.services > 0,
      icon: Wrench,
      to: '/client/setup',
      required: true,
    },
    {
      id: 'workers',
      label: 'الموظفون والصلاحيات',
      detail: counts.workers > 0 ? `${counts.workers} موظف نشط` : 'أضف الموظفين أو مستخدمي الكاشير',
      done: counts.workers > 0,
      icon: Users,
      to: '/client/workers',
      required: true,
    },
    {
      id: 'qr',
      label: 'QR التسجيل الذاتي',
      detail: checkinUrl ? 'جاهز للطباعة والتجربة' : 'فعّل رابط QR من الإعدادات',
      done: Boolean(checkinUrl),
      icon: QrCode,
      to: '/client/settings',
      required: true,
    },
    {
      id: 'maps',
      label: 'Google Maps للتقييم',
      detail: company?.google_maps_url ? 'جاهز لطلبات التقييم' : 'أضف رابط التقييم لرفع السمعة',
      done: Boolean(company?.google_maps_url),
      icon: MapPin,
      to: '/client/settings',
      required: false,
    },
    {
      id: 'memberships',
      label: 'الاشتراكات والمحفظة',
      detail: flags.memberships || flags.wallet ? (counts.activePlans > 0 ? `${counts.activePlans} باقة جاهزة` : 'أنشئ باقة شهرية واحدة على الأقل') : 'ميزة اختيارية من الإدارة',
      done: flags.memberships || flags.wallet ? counts.activePlans > 0 : false,
      icon: WalletCards,
      to: '/client/memberships',
      required: false,
    },
    {
      id: 'operations',
      label: 'اختبار التشغيل اليومي',
      detail: counts.carsToday > 0 ? `${counts.carsToday} سيارة اليوم` : 'جرّب تسجيل سيارة من QR أو اللوحة',
      done: counts.carsToday > 0,
      icon: Zap,
      to: '/client/queue',
      required: true,
    },
    {
      id: 'closing',
      label: 'إغلاق اليوم',
      detail: counts.closingToday > 0 ? 'تم تسجيل إغلاق اليوم' : 'اختبر إغلاق اليوم بعد أول تشغيل',
      done: counts.closingToday > 0 || counts.carsToday === 0,
      icon: ClipboardCheck,
      to: '/client/finance?tab=closing',
      required: false,
    },
  ], [counts, flags.memberships, flags.wallet, checkinUrl, company?.google_maps_url])

  const requiredItems = items.filter(item => item.required)
  const scoreItems = items.filter(item => {
    if (item.required) return true
    if (item.id === 'memberships') return Boolean(flags.memberships || flags.wallet)
    if (item.id === 'closing') return counts.carsToday > 0 || counts.closingToday > 0
    return true
  })
  const requiredScore = pct(requiredItems.filter(item => item.done).length, requiredItems.length)
  const totalScore = pct(scoreItems.filter(item => item.done).length, scoreItems.length)
  const blockers = requiredItems.filter(item => !item.done)

  if (loading) {
    return (
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 font-tajawal">
          <Loader2 size={16} className="animate-spin" />
          جاري فحص جاهزية المغسلة...
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.06)]" dir="rtl">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 font-tajawal">
            <Sparkles size={13} />
            إعداد الحساب
          </span>
          <h2 className="mt-3 text-xl font-black text-slate-950 font-cairo">جاهزية الحساب للتشغيل</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 font-tajawal">
            فحص مختصر لأهم الإعدادات التي تجعل الحساب جاهزاً لاستقبال العملاء وتشغيل الفريق باحتراف.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-20 w-20 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-800 shadow-sm">
            <strong className="font-sora text-2xl font-black">{requiredScore}%</strong>
            <span className="text-[10px] font-bold text-sky-700 font-tajawal">أساسي</span>
          </div>
          <div className="grid h-20 w-20 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 shadow-sm">
            <strong className="font-sora text-2xl font-black">{totalScore}%</strong>
            <span className="text-[10px] font-bold text-slate-500 font-tajawal">كامل</span>
          </div>
        </div>
      </div>

      {blockers.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 font-tajawal">
          الخطوات المتبقية: {blockers.map(item => item.label).join('، ')}
        </div>
      )}

      <div className={`grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-3 xl:grid-cols-4'}`}>
        {items.map(item => (
          <Link key={item.id} to={item.to} className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${item.done ? 'border-emerald-200 bg-white shadow-[0_10px_28px_rgba(16,185,129,0.08)]' : 'border-slate-200 bg-slate-50'}`}>
            <div className="mb-3 flex items-center justify-between">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                <item.icon size={18} />
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold font-tajawal ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500'}`}>
                <CheckCircle2 size={12} />
                {item.done ? 'مكتمل' : 'ناقص'}
              </span>
            </div>
            <strong className="block text-sm text-slate-950 font-cairo">{item.label}</strong>
            <small className="mt-1 block min-h-[34px] text-xs leading-5 text-slate-500 font-tajawal">{item.detail}</small>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-700 opacity-0 transition-opacity group-hover:opacity-100 font-tajawal">
              فتح
              <ArrowUpLeft size={12} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
