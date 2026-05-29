import { useEffect, useState } from 'react'
import { Loader2, ClipboardCheck, CheckCircle, Download, FileDown, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { logAudit } from '../../../lib/auditLog'
import { downloadCSV, formatDateForCSV } from '../../../lib/exportUtils'
import type { CWDailyClosing } from '../../../types'

// Daily closing notification handled by Supabase DB trigger (cw_trigger_daily_closing)

function SummaryRow({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #E2E8F0' }}>
      <span className="text-sm text-slate-400 font-tajawal">{label}</span>
      <span className={`text-sm font-bold font-sora`} style={{ color: color || (highlight ? '#6366F1' : '#0F172A') }}>{value}</span>
    </div>
  )
}

export const CarWashDailyClosing = () => {
  const { companyId, company, loading: authLoading } = useClientCompany()
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [todayClosing, setTodayClosing] = useState<CWDailyClosing | null>(null)
  const [pastClosings, setPastClosings] = useState<CWDailyClosing[]>([])
  const [notes, setNotes] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [preview, setPreview] = useState<{
    totalCars: number
    subtotalSales: number
    vatAmount: number
    totalSales: number
    cashSales: number
    madaSales: number
    visaSales: number
    bankTransferSales: number
    stcPaySales: number
    otherSales: number
    totalExpenses: number
    workerCommissions: number
    workerSalaries: number
    totalWorkerCost: number
    netProfit: number
    freeWashesCount: number
    loyaltyDiscountAmount: number
  } | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const loadData = async () => {
    if (!companyId) return
    setLoading(true)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      { data: existingClosing },
      { data: visits },
      { data: queue },
      { data: workers },
      { data: expenses },
      { data: past },
    ] = await Promise.all([
      supabase.from('cw_daily_closings').select('*').eq('company_id', companyId).eq('closing_date', today).maybeSingle(),
      supabase.from('cw_visits')
        .select('price, subtotal, vat_amount, payment_method, is_free_wash, discount_amount, payment_status, worker_id')
        .eq('company_id', companyId)
        .gte('created_at', todayStart.toISOString())
        .not('payment_status', 'in', '("refunded","cancelled")'),
      supabase.from('cw_queue')
        .select('price, subtotal, worker_id, status')
        .eq('company_id', companyId)
        .eq('status', 'delivered')
        .gte('delivered_at', todayStart.toISOString()),
      supabase.from('cw_workers').select('id, commission_type, commission_value, salary_type, fixed_salary').eq('company_id', companyId),
      supabase.from('cw_expenses').select('amount').eq('company_id', companyId).eq('expense_date', today),
      supabase.from('cw_daily_closings')
        .select('*')
        .eq('company_id', companyId)
        .neq('closing_date', today)
        .order('closing_date', { ascending: false })
        .limit(30),
    ])

    if (existingClosing) {
      setTodayClosing(existingClosing as CWDailyClosing)
      setPastClosings((past || []) as CWDailyClosing[])
      setLoading(false)
      return
    }

    // Calculate preview
    const visitList = visits || []
    const subtotalSales = visitList.reduce((s, v) => s + (v.subtotal ?? v.price ?? 0), 0)
    const vatAmount = visitList.reduce((s, v) => s + (v.vat_amount ?? 0), 0)
    const totalSales = subtotalSales + vatAmount
    const freeVisits = visitList.filter(v => v.is_free_wash)

    const pmTotals: Record<string, number> = { cash: 0, mada: 0, visa: 0, bank_transfer: 0, stc_pay: 0, other: 0 }
    for (const v of visitList) {
      const pm = v.payment_method || 'cash'
      const val = v.is_free_wash ? 0 : (v.subtotal ?? v.price ?? 0)
      if (pm in pmTotals) pmTotals[pm] += val
      else pmTotals.other += val
    }

    const workersMap = Object.fromEntries((workers || []).map(w => [w.id, w]))
    let commissions = 0
    let salaries = 0
    for (const q of queue || []) {
      const w = q.worker_id ? workersMap[q.worker_id] : null
      if (!w) continue
      if (w.salary_type === 'fixed') {
        salaries += (w.fixed_salary || 0) / 30
      } else {
        const c = w.commission_type === 'fixed' ? w.commission_value : ((q.subtotal ?? q.price ?? 0) * w.commission_value) / 100
        commissions += c
        if (w.salary_type === 'mixed') salaries += (w.fixed_salary || 0) / 30
      }
    }

    const totalExpenses = (expenses || []).reduce((s, e) => s + e.amount, 0)
    const totalWorkerCost = commissions + salaries
    const netProfit = subtotalSales - totalExpenses - totalWorkerCost

    setPreview({
      totalCars: visitList.length,
      subtotalSales,
      vatAmount,
      totalSales,
      cashSales: pmTotals.cash,
      madaSales: pmTotals.mada,
      visaSales: pmTotals.visa,
      bankTransferSales: pmTotals.bank_transfer,
      stcPaySales: pmTotals.stc_pay,
      otherSales: pmTotals.other,
      totalExpenses,
      workerCommissions: commissions,
      workerSalaries: salaries,
      totalWorkerCost,
      netProfit,
      freeWashesCount: freeVisits.length,
      loyaltyDiscountAmount: freeVisits.reduce((s, v) => s + (v.discount_amount || 0), 0),
    })
    setPastClosings((past || []) as CWDailyClosing[])
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && companyId) loadData()
  }, [authLoading, companyId])

  useEffect(() => {
    if (preview && !actualCash) setActualCash(String(preview.cashSales.toFixed(2)))
  }, [preview, actualCash])

  const closeDay = async () => {
    if (!companyId || !preview || closing) return
    setClosing(true)
    const actualCashValue = Number(actualCash || 0)
    const cashDiff = actualCashValue - preview.cashSales
    const cashNote = `مطابقة الكاش: المتوقع ${preview.cashSales.toFixed(2)} ر.س، الفعلي ${actualCashValue.toFixed(2)} ر.س، الفرق ${cashDiff.toFixed(2)} ر.س`
    const finalNotes = [cashNote, notes.trim()].filter(Boolean).join('\n')

    const { data: inserted } = await supabase.from('cw_daily_closings').insert({
      company_id: companyId,
      closing_date: today,
      total_cars: preview.totalCars,
      total_sales: preview.totalSales,
      subtotal_sales: preview.subtotalSales,
      vat_amount: preview.vatAmount,
      cash_sales: preview.cashSales,
      mada_sales: preview.madaSales,
      visa_sales: preview.visaSales,
      bank_transfer_sales: preview.bankTransferSales,
      stc_pay_sales: preview.stcPaySales,
      other_sales: preview.otherSales,
      total_expenses: preview.totalExpenses,
      worker_salaries: preview.workerSalaries,
      worker_commissions: preview.workerCommissions,
      total_worker_cost: preview.totalWorkerCost,
      net_profit: preview.netProfit,
      free_washes_count: preview.freeWashesCount,
      loyalty_discount_amount: preview.loyaltyDiscountAmount,
      notes: finalNotes || null,
    }).select().single()

    if (inserted) {
      logAudit(companyId, 'daily_closed', { entityType: 'cw_daily_closings', entityId: inserted.id, newValue: { net_profit: preview.netProfit } })
      setTodayClosing(inserted as CWDailyClosing)

      // Closing notification sent automatically via DB trigger
    }
    setClosing(false)
  }

  const exportClosingsCSV = () => {
    const rows = pastClosings.map(c => ({
      'التاريخ': c.closing_date,
      'عدد السيارات': c.total_cars,
      'قبل الضريبة': c.subtotal_sales.toFixed(2),
      'الضريبة': c.vat_amount.toFixed(2),
      'إجمالي المبيعات': c.total_sales.toFixed(2),
      'كاش': c.cash_sales.toFixed(2),
      'مدى': c.mada_sales.toFixed(2),
      'فيزا': c.visa_sales.toFixed(2),
      'تحويل': c.bank_transfer_sales.toFixed(2),
      'مصاريف': c.total_expenses.toFixed(2),
      'تكاليف موظفين': c.total_worker_cost.toFixed(2),
      'صافي الربح': c.net_profit.toFixed(2),
      'غسلات مجانية': c.free_washes_count,
    }))
    downloadCSV(rows, `madar-closings-${today}.csv`)
  }

  const printClosing = (c: CWDailyClosing) => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html dir="rtl"><head><meta charset="utf-8"><title>إغلاق يوم ${c.closing_date}</title>
      <style>body{font-family:sans-serif;padding:20px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #eee}td:last-child{text-align:left;font-weight:700}</style>
      </head><body>
      <h1>${company?.name || 'المغسلة'} — إغلاق يوم ${c.closing_date}</h1>
      <table>
        <tr><td>عدد السيارات</td><td>${c.total_cars}</td></tr>
        <tr><td>قبل الضريبة</td><td>${c.subtotal_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>ضريبة القيمة المضافة</td><td>${c.vat_amount.toFixed(2)} ر.س</td></tr>
        <tr><td>إجمالي المبيعات</td><td>${c.total_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>كاش</td><td>${c.cash_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>مدى</td><td>${c.mada_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>فيزا</td><td>${c.visa_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>تحويل</td><td>${c.bank_transfer_sales.toFixed(2)} ر.س</td></tr>
        <tr><td>المصاريف</td><td>${c.total_expenses.toFixed(2)} ر.س</td></tr>
        <tr><td>تكاليف الموظفين</td><td>${c.total_worker_cost.toFixed(2)} ر.س</td></tr>
        <tr><td><strong>صافي الربح</strong></td><td><strong>${c.net_profit.toFixed(2)} ر.س</strong></td></tr>
        <tr><td>غسلات مجانية</td><td>${c.free_washes_count}</td></tr>
        ${c.notes ? `<tr><td>ملاحظات</td><td>${c.notes}</td></tr>` : ''}
      </table>
      <p style="margin-top:20px;font-size:11px;color:#999">Madar AI Agency OS</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري التحميل...</p>
    </div>
  )

  const displayData = todayClosing || (preview ? {
    total_cars: preview.totalCars,
    subtotal_sales: preview.subtotalSales,
    vat_amount: preview.vatAmount,
    total_sales: preview.totalSales,
    cash_sales: preview.cashSales,
    mada_sales: preview.madaSales,
    visa_sales: preview.visaSales,
    bank_transfer_sales: preview.bankTransferSales,
    stc_pay_sales: preview.stcPaySales,
    other_sales: preview.otherSales,
    total_expenses: preview.totalExpenses,
    worker_commissions: preview.workerCommissions,
    worker_salaries: preview.workerSalaries,
    total_worker_cost: preview.totalWorkerCost,
    net_profit: preview.netProfit,
    free_washes_count: preview.freeWashesCount,
    loyalty_discount_amount: preview.loyaltyDiscountAmount,
  } : null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">إغلاق اليوم</h1>
          <p className="text-sm text-slate-500 font-tajawal">
            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {pastClosings.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-tajawal text-slate-400 transition-all hover:text-white"
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
            >
              <FileDown size={14} />
              تصدير
              <ChevronDown size={12} />
            </button>
            {showExport && (
              <div className="absolute left-0 top-full mt-1 rounded-xl overflow-hidden z-50" style={{ background: '#0D1422', border: '1px solid #CBD5E1', minWidth: 180 }}>
                {[
                  { label: 'تصدير CSV', action: () => { exportClosingsCSV(); setShowExport(false) } },
                  { label: 'طباعة آخر إغلاق', action: () => { if (todayClosing) printClosing(todayClosing); setShowExport(false) } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="block w-full text-right px-4 py-2.5 text-sm font-tajawal text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Already closed banner */}
      {todayClosing && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-400 font-cairo">تم إغلاق اليوم مسبقاً</p>
            <p className="text-xs text-slate-500 font-tajawal">لا يمكن إعادة الإغلاق ليوم واحد</p>
          </div>
        </div>
      )}

      {/* Summary card */}
      {displayData && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E2E8F0', background: '#FAFAFA' }}>
            <div className="flex items-center gap-2">
              <ClipboardCheck size={16} className="text-primary-400" />
              <p className="text-sm font-bold text-slate-900 font-cairo">ملخص اليوم</p>
            </div>
          </div>
          <div className="p-5 space-y-0">
            <SummaryRow label="عدد السيارات" value={`${displayData.total_cars} سيارة`} />
            <SummaryRow label="قبل الضريبة" value={`${displayData.subtotal_sales.toFixed(2)} ر.س`} />
            {displayData.vat_amount > 0 && <SummaryRow label="ضريبة القيمة المضافة" value={`${displayData.vat_amount.toFixed(2)} ر.س`} />}
            <SummaryRow label="إجمالي المبيعات" value={`${displayData.total_sales.toFixed(2)} ر.س`} />

            <div className="py-2" />

            {displayData.cash_sales > 0 && <SummaryRow label="كاش" value={`${displayData.cash_sales.toFixed(2)} ر.س`} />}
            {displayData.mada_sales > 0 && <SummaryRow label="مدى" value={`${displayData.mada_sales.toFixed(2)} ر.س`} />}
            {displayData.visa_sales > 0 && <SummaryRow label="فيزا" value={`${displayData.visa_sales.toFixed(2)} ر.س`} />}
            {displayData.bank_transfer_sales > 0 && <SummaryRow label="تحويل بنكي" value={`${displayData.bank_transfer_sales.toFixed(2)} ر.س`} />}
            {displayData.stc_pay_sales > 0 && <SummaryRow label="STC Pay" value={`${displayData.stc_pay_sales.toFixed(2)} ر.س`} />}
            {displayData.other_sales > 0 && <SummaryRow label="أخرى" value={`${displayData.other_sales.toFixed(2)} ر.س`} />}

            <div className="py-2" />

            <SummaryRow label="المصاريف" value={`${displayData.total_expenses.toFixed(2)} ر.س`} color="#EF4444" />
            {displayData.worker_commissions > 0 && <SummaryRow label="عمولات الموظفين" value={`${displayData.worker_commissions.toFixed(2)} ر.س`} color="#F59E0B" />}
            {displayData.worker_salaries > 0 && <SummaryRow label="رواتب يومية (حصة)" value={`${displayData.worker_salaries.toFixed(2)} ر.س`} color="#F59E0B" />}
            {displayData.free_washes_count > 0 && <SummaryRow label={`غسلات مجانية (${displayData.free_washes_count})`} value={`خصم ${displayData.loyalty_discount_amount.toFixed(2)} ر.س`} color="#F97316" />}

            <div className="py-2" />

            <div className="flex items-center justify-between py-3 px-4 rounded-xl mt-2" style={{ background: displayData.net_profit >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${displayData.net_profit >= 0 ? 'rgba(99,102,241,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              <span className="text-sm font-bold text-slate-900 font-cairo">صافي الربح</span>
              <span className="text-lg font-bold font-sora" style={{ color: displayData.net_profit >= 0 ? '#818CF8' : '#F87171' }}>
                {displayData.net_profit.toFixed(2)} ر.س
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes + close button */}
      {!todayClosing && preview && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 font-cairo">مطابقة درج الكاش</p>
                <p className="mt-1 text-xs text-slate-500 font-tajawal">اكتب المبلغ الموجود فعليًا في الدرج قبل إغلاق اليوم.</p>
              </div>
              <div className="min-w-[220px]">
                <label className="mb-1.5 block text-xs text-slate-500 font-tajawal">الكاش الفعلي</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={actualCash}
                  onChange={e => setActualCash(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-slate-900 outline-none font-sora"
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryRow label="المتوقع كاش" value={`${preview.cashSales.toFixed(2)} ر.س`} />
              <SummaryRow label="الموجود فعلياً" value={`${Number(actualCash || 0).toFixed(2)} ر.س`} />
              <SummaryRow
                label="الفرق"
                value={`${(Number(actualCash || 0) - preview.cashSales).toFixed(2)} ر.س`}
                color={Math.abs(Number(actualCash || 0) - preview.cashSales) < 0.01 ? '#059669' : '#DC2626'}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 font-tajawal mb-1.5 block">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات عن هذا اليوم..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-500 outline-none resize-none"
              style={{ background: '#FFFFFF', border: '1px solid #CBD5E1' }}
            />
          </div>
          <button
            onClick={closeDay}
            disabled={closing}
            className="w-full py-3.5 rounded-xl text-base font-bold font-cairo text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {closing ? <Loader2 size={18} className="animate-spin" /> : <ClipboardCheck size={18} />}
            {closing ? 'جاري الإغلاق...' : 'إغلاق اليوم'}
          </button>
        </div>
      )}

      {/* Past closings */}
      {pastClosings.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#FAFAFA', border: '1px solid #E2E8F0' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <p className="text-sm font-bold text-white font-cairo">الإغلاقات السابقة</p>
          </div>
          <div className="divide-y divide-white/5">
            {pastClosings.map(c => (
              <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-white font-tajawal">{c.closing_date}</p>
                  <p className="text-xs text-slate-500 font-tajawal">{c.total_cars} سيارة</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-sora" style={{ color: c.net_profit >= 0 ? '#818CF8' : '#F87171' }}>
                    {c.net_profit.toFixed(0)} ر.س
                  </p>
                  <p className="text-xs text-slate-600 font-tajawal">صافي الربح</p>
                </div>
                <button
                  onClick={() => printClosing(c)}
                  className="p-2 rounded-lg text-slate-600 hover:text-white transition-colors"
                  style={{ background: '#FFFFFF' }}
                >
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
