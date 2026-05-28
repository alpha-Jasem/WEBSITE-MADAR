import { useState } from 'react'
import { Loader2, Sparkles, X, Check } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: '#0D1422', border: '1px solid #CBD5E1' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-400" />
            <h2 className="text-base font-bold text-white font-cairo">بيانات تجريبية</h2>
          </div>
          {!seeding && <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16} /></button>}
        </div>

        {!done ? (
          <>
            <p className="text-sm text-slate-400 font-tajawal mb-6">
              سيتم إضافة بيانات تجريبية حقيقية لمساعدتك على استكشاف النظام:
            </p>
            <div className="space-y-2 mb-6">
              {[
                `${DEMO_SERVICES.length} خدمات (غسيل، تلميع، بخار...)`,
                `${DEMO_WORKERS.length} موظفين بأنواع رواتب مختلفة`,
                `${DEMO_CUSTOMERS.length} عملاء بمستويات ولاء`,
                `5 سيارات في لوحة التشغيل`,
                `${DEMO_EXPENSES.length} مصاريف يومية`,
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400 font-tajawal">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {seeding && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Loader2 size={14} className="animate-spin text-primary-400" />
                <p className="text-xs text-primary-400 font-tajawal">{step}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={seeding}
                className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-slate-400 disabled:opacity-40"
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
              >
                إلغاء
              </button>
              <button
                onClick={seed}
                disabled={seeding}
                className="flex-1 py-2.5 rounded-xl text-sm font-tajawal text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {seeding ? 'جاري التحميل...' : 'تحميل البيانات'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <Check size={24} className="text-emerald-400" />
            </div>
            <p className="text-base font-bold text-white font-cairo mb-2">تم التحميل بنجاح! 🎉</p>
            <p className="text-sm text-slate-400 font-tajawal mb-6">البيانات التجريبية جاهزة للاستكشاف</p>
            <button
              onClick={onDone}
              className="w-full py-2.5 rounded-xl text-sm font-tajawal text-white"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              الذهاب للوحة التشغيل
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
