import { useState } from 'react'
import { Loader2, Sparkles, X, Check, Rocket, Wrench, Users, Car, Receipt } from 'lucide-react'
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
  { icon: Wrench,  label: `${DEMO_SERVICES.length} خدمات جاهزة للتشغيل`, color: '#0EA5E9' },
  { icon: Users,   label: `${DEMO_WORKERS.length} موظفين بأنواع رواتب مختلفة`, color: '#8B5CF6' },
  { icon: Users,   label: `${DEMO_CUSTOMERS.length} عملاء بمستويات ولاء`, color: '#10B981' },
  { icon: Car,     label: '5 سيارات في لوحة التشغيل', color: '#F59E0B' },
  { icon: Receipt, label: `${DEMO_EXPENSES.length} مصاريف يومية`, color: '#EF4444' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>

        {!done ? (
          <>
            {/* Header gradient */}
            <div className="relative px-6 pt-6 pb-5 text-center" style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)' }}>
              <button
                onClick={onClose}
                disabled={seeding}
                className="absolute left-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all disabled:opacity-0"
              >
                <X size={16} />
              </button>

              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)' }}>
                <Rocket size={26} className="text-white" />
              </div>

              <h2 className="text-xl font-bold text-slate-900 font-cairo mb-1">
                أهلاً بك في مدار! 🎉
              </h2>
              <p className="text-sm text-slate-500 font-tajawal leading-6">
                لمساعدتك على استكشاف النظام، يمكنك تحميل بيانات تجريبية
                <br />جاهزة تُشغّل لوحتك مباشرة
              </p>
            </div>

            {/* Items list */}
            <div className="px-6 py-4 space-y-2.5">
              {ITEMS.map(({ icon: Icon, label, color }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color + '18' }}>
                    <Icon size={15} style={{ color }} />
                  </div>
                  <span className="text-sm text-slate-700 font-tajawal">{label}</span>
                </div>
              ))}
            </div>

            {/* Progress */}
            {seeding && (
              <div className="mx-6 mb-3 flex items-center gap-2 p-3 rounded-xl"
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <Loader2 size={14} className="animate-spin text-sky-500 flex-shrink-0" />
                <p className="text-xs text-sky-700 font-tajawal">{step}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={seeding}
                className="flex-1 py-3 rounded-xl text-sm font-tajawal font-bold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40"
                style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
              >
                تخطّ الآن
              </button>
              <button
                onClick={seed}
                disabled={seeding}
                className="flex-1 py-3 rounded-xl text-sm font-tajawal font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', boxShadow: '0 8px 20px rgba(14,165,233,0.3)' }}
              >
                {seeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {seeding ? 'جاري التحميل...' : 'تحميل البيانات'}
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
              <Check size={28} className="text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 font-cairo mb-2">تم التحميل بنجاح!</p>
            <p className="text-sm text-slate-500 font-tajawal mb-6 leading-6">
              البيانات التجريبية جاهزة — استكشف النظام بحرية
            </p>
            <button
              onClick={onDone}
              className="w-full py-3 rounded-xl text-sm font-tajawal font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', boxShadow: '0 8px 20px rgba(14,165,233,0.3)' }}
            >
              ابدأ الاستكشاف ←
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
