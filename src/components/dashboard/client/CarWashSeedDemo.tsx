import { useState } from 'react'
import { Loader2, X, Check, Wrench, HardHat, Users, Car, Receipt, Rocket } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLog'

const DEMO_SERVICES = [
  { name: 'غسيل عادي', price: 30, duration_minutes: 20 },
  { name: 'غسيل بريميوم', price: 60, duration_minutes: 40 },
  { name: 'غسيل داخلي', price: 80, duration_minutes: 50 },
  { name: 'تلميع خارجي', price: 150, duration_minutes: 90 },
  { name: 'غسيل بخار كامل', price: 200, duration_minutes: 120 },
]

const DEMO_WORKERS = [
  { name: 'أحمد العمري', phone: '0501111111', salary_type: 'commission', fixed_salary: 0, commission_type: 'fixed', commission_value: 5 },
  { name: 'محمد السلمي', phone: '0502222222', salary_type: 'commission', fixed_salary: 0, commission_type: 'percentage', commission_value: 10 },
  { name: 'خالد الغامدي', phone: '0503333333', salary_type: 'mixed', fixed_salary: 1500, commission_type: 'fixed', commission_value: 3 },
]

const DEMO_CUSTOMERS = [
  { name: 'فهد الحربي', phone: '0551234567', total_visits: 12, loyalty_count: 2, loyalty_tier: 'gold' },
  { name: 'سلطان المطيري', phone: '0559876543', total_visits: 7, loyalty_count: 2, loyalty_tier: 'silver' },
  { name: 'ناصر القحطاني', phone: '0554444444', total_visits: 3, loyalty_count: 3, loyalty_tier: 'bronze' },
  { name: 'عبدالله الشهري', phone: '0555555555', total_visits: 1, loyalty_count: 1, loyalty_tier: 'bronze' },
]

const DEMO_EXPENSES = [
  { category: 'tools', description: 'شامبو وملمع', amount: 120 },
  { category: 'electricity', description: 'فاتورة الكهرباء', amount: 350 },
  { category: 'other', description: 'مستلزمات تنظيف', amount: 80 },
]

const ITEMS = [
  { icon: Wrench,   label: `${DEMO_SERVICES.length} خدمات جاهزة للتشغيل`,        bg: '#EFF6FF', border: '#BFDBFE', iconColor: '#2563EB', text: '#1D4ED8' },
  { icon: HardHat,  label: `${DEMO_WORKERS.length} موظفين بأنواع رواتب مختلفة`, bg: '#F5F3FF', border: '#DDD6FE', iconColor: '#7C3AED', text: '#6D28D9' },
  { icon: Users,    label: `${DEMO_CUSTOMERS.length} عملاء بمستويات ولاء`,       bg: '#F0FDF4', border: '#BBF7D0', iconColor: '#16A34A', text: '#15803D' },
  { icon: Car,      label: '5 سيارات في لوحة التشغيل',                           bg: '#FFFBEB', border: '#FDE68A', iconColor: '#D97706', text: '#B45309' },
  { icon: Receipt,  label: `${DEMO_EXPENSES.length} مصاريف يومية`,               bg: '#FFF1F2', border: '#FECDD3', iconColor: '#E11D48', text: '#BE123C' },
]

interface Props {
  companyId: string
  onDone: () => void
  onClose: () => void
}

export const CarWashSeedDemo = ({ companyId, onDone, onClose }: Props) => {
  const [seeding, setSeeding] = useState(false)
  const [step, setStep] = useState('')
  const [done, setDone] = useState(false)

  const seed = async () => {
    setSeeding(true)
    try {
      setStep('جاري إضافة الخدمات...')
      const { data: insertedServices } = await supabase.from('cw_services').insert(
        DEMO_SERVICES.map(s => ({ ...s, company_id: companyId, active: true }))
      ).select()

      setStep('جاري إضافة الموظفين...')
      const { data: insertedWorkers } = await supabase.from('cw_workers').insert(
        DEMO_WORKERS.map(w => ({ ...w, company_id: companyId, active: true }))
      ).select()

      setStep('جاري إضافة العملاء...')
      await supabase.from('cw_customers').insert(
        DEMO_CUSTOMERS.map(c => ({ ...c, company_id: companyId, free_washes_available: 0, google_review_requested: false, welcome_sent: false }))
      )

      setStep('جاري إضافة السيارات...')
      const serviceList = insertedServices || []
      const workerList = insertedWorkers || []
      const queueItems = [
        { customer_name: 'فهد الحربي', phone: '0551234567', car_type: 'تويوتا كامري', plate: 'أ ب ج 1234', status: 'received', payment_status: 'unpaid', payment_method: 'cash', service_name: serviceList[0]?.name || 'غسيل عادي', service_id: serviceList[0]?.id || null, price: serviceList[0]?.price || 30, worker_id: workerList[0]?.id || null },
        { customer_name: 'سلطان المطيري', phone: '0559876543', car_type: 'هيونداي سوناتا', plate: 'د ه و 5678', status: 'washing', payment_status: 'unpaid', payment_method: 'mada', service_name: serviceList[1]?.name || 'غسيل بريميوم', service_id: serviceList[1]?.id || null, price: serviceList[1]?.price || 60, worker_id: workerList[1]?.id || null },
        { customer_name: 'ناصر القحطاني', phone: '0554444444', car_type: 'نيسان باترول', plate: 'ز ح ط 9012', status: 'drying', payment_status: 'unpaid', payment_method: 'cash', service_name: serviceList[2]?.name || 'غسيل داخلي', service_id: serviceList[2]?.id || null, price: serviceList[2]?.price || 80, worker_id: workerList[2]?.id || null },
        { customer_name: 'عبدالله الشهري', phone: '0555555555', car_type: 'جي إم سي يوكون', plate: 'ي ك ل 3456', status: 'ready', payment_status: 'unpaid', payment_method: 'visa', service_name: serviceList[0]?.name || 'غسيل عادي', service_id: serviceList[0]?.id || null, price: serviceList[0]?.price || 30, worker_id: workerList[0]?.id || null },
        { customer_name: 'خالد السبيعي', phone: '0556667788', car_type: 'لكزس ES', plate: 'م ن س 7890', status: 'received', payment_status: 'unpaid', payment_method: 'cash', service_name: serviceList[3]?.name || 'تلميع خارجي', service_id: serviceList[3]?.id || null, price: serviceList[3]?.price || 150, worker_id: workerList[1]?.id || null },
      ]
      await supabase.from('cw_queue').insert(queueItems.map(q => ({ ...q, company_id: companyId })))

      setStep('جاري إضافة المصاريف...')
      const today = new Date().toISOString().slice(0, 10)
      await supabase.from('cw_expenses').insert(
        DEMO_EXPENSES.map(e => ({ ...e, company_id: companyId, expense_date: today }))
      )

      logAudit(companyId, 'demo_data_seeded', { newValue: { services: DEMO_SERVICES.length, workers: DEMO_WORKERS.length } })
      setStep('تم!')
      setDone(true)
    } catch (err) {
      console.error('Seed error:', err)
      setStep('حدث خطأ — حاول مرة أخرى')
    }
    setSeeding(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2,8,23,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-[420px] rounded-[28px] overflow-hidden"
        style={{
          background: 'white',
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        {!done ? (
          <>
            {/* ── Header ── */}
            <div className="relative overflow-hidden px-7 pt-7 pb-6 text-center"
              style={{ background: 'linear-gradient(145deg, #0EA5E9 0%, #0369A1 55%, #1E3A8A 100%)' }}>

              {/* decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #fff, transparent)' }} />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #7DD3FC, transparent)' }} />

              {!seeding && (
                <button onClick={onClose}
                  className="absolute left-4 top-4 p-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/15 transition-all">
                  <X size={15} />
                </button>
              )}

              {/* icon */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
                <Rocket size={30} className="text-white" strokeWidth={1.8} />
              </div>

              <h2 className="font-cairo text-2xl font-black text-white mb-1.5" style={{ letterSpacing: '-0.3px' }}>
                أهلاً بك في مدار!
              </h2>
              <p className="font-tajawal text-sm text-sky-100 leading-7 opacity-90">
                جهّز لوحتك في ثوانٍ — نضيف لك بيانات تجريبية<br />حقيقية لتستكشف كل ميزة بوضوح
              </p>
            </div>

            {/* ── Items ── */}
            <div className="px-5 pt-4 pb-2 space-y-2">
              {ITEMS.map(({ icon: Icon, label, bg, border, iconColor, text }, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all"
                  style={{ background: bg, border: `1px solid ${border}` }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: iconColor + '18' }}>
                    <Icon size={16} style={{ color: iconColor }} strokeWidth={2} />
                  </div>
                  <span className="font-tajawal text-sm font-semibold" style={{ color: text }}>{label}</span>
                </div>
              ))}
            </div>

            {/* ── Progress bar ── */}
            {seeding && (
              <div className="mx-5 mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <Loader2 size={14} className="animate-spin text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700 font-tajawal">{step}</p>
              </div>
            )}

            {/* ── Buttons ── */}
            <div className="px-5 pt-3 pb-5 flex gap-2.5">
              <button onClick={onClose} disabled={seeding}
                className="flex-1 py-3 rounded-2xl font-tajawal text-sm font-bold text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-40"
                style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
                تخطّ الآن
              </button>
              <button onClick={seed} disabled={seeding}
                className="flex-[2] py-3 rounded-2xl font-tajawal text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0EA5E9 0%, #0369A1 100%)',
                  boxShadow: '0 8px 24px rgba(14,165,233,0.4)',
                }}>
                {seeding
                  ? <><Loader2 size={15} className="animate-spin" /> جاري التحميل...</>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> تحميل البيانات التجريبية</>
                }
              </button>
            </div>
          </>
        ) : (
          /* ── Success state ── */
          <div className="px-7 py-10 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5"
              style={{ background: 'linear-gradient(135deg, #D1FAE5, #6EE7B7)' }}>
              <Check size={36} className="text-emerald-600" strokeWidth={2.5} />
            </div>
            <p className="font-cairo text-2xl font-black text-slate-900 mb-2">تم التحميل! 🎉</p>
            <p className="font-tajawal text-sm text-slate-500 mb-7 leading-7">
              البيانات التجريبية جاهزة — استكشف النظام بحرية
            </p>
            <button onClick={onDone}
              className="w-full py-3.5 rounded-2xl font-tajawal text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #0EA5E9, #0369A1)',
                boxShadow: '0 8px 24px rgba(14,165,233,0.4)',
              }}>
              ابدأ الاستكشاف ←
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
