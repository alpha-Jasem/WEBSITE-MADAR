import { useEffect, useState, useRef } from 'react'
import { Loader2, Send, Users, MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle, Star } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { ClientPageHeader, ClientPanel, ClientButton } from './ClientUI'

interface Customer {
  id: string
  name: string | null
  phone: string
  total_visits: number
  last_visit_at: string | null
  loyalty_count: number
}

interface SendResult {
  phone: string
  name: string | null
  status: 'success' | 'error'
  error?: string
}

const FILTERS = [
  { key: 'all',           label: 'كل العملاء' },
  { key: 'inactive30',   label: 'لم يزوروا 30 يوم' },
  { key: 'inactive60',   label: 'لم يزوروا 60 يوم' },
  { key: 'inactive90',   label: 'لم يزوروا 90 يوم' },
  { key: 'loyalty_almost', label: '⭐ باقي غسلة واحدة' },
]

const PLACEHOLDERS = [
  { tag: '{name}',   label: 'اسم العميل' },
  { tag: '{visits}', label: 'عدد الزيارات' },
]

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('966')) return digits + '@c.us'
  if (digits.startsWith('0') && digits.length === 10) return '966' + digits.slice(1) + '@c.us'
  return digits + '@c.us'
}

function applyPlaceholders(msg: string, customer: Customer): string {
  return msg
    .replace(/{name}/g, customer.name || 'عزيزي العميل')
    .replace(/{visits}/g, String(customer.total_visits || 0))
}

export const CarWashCampaigns = () => {
  const { companyId, company } = useClientCompany()

  const idInstance = (company as any)?.cw_automations?.green_api?.idInstance || ''
  const apiToken   = (company as any)?.cw_automations?.green_api?.apiTokenInstance || ''
  const apiConfigured = !!idInstance && !!apiToken
  const loyaltyThreshold: number = (company as any)?.cw_loyalty_threshold || 5

  /* ── customers ── */
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filter, setFilter] = useState('all')
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* ── message composer ── */
  const [message, setMessage] = useState('السلام عليكم {name}،\nنشتاق لزيارتك في مغسلتنا! 🚗✨\nزورنا واستمتع بخدمة متميزة.')
  const msgRef = useRef<HTMLTextAreaElement>(null)

  /* ── campaign state ── */
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [progress, setProgress] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const abortRef = useRef(false)

  /* load all customers once */
  useEffect(() => {
    if (!companyId) return
    loadCustomers()
  }, [companyId])

  const loadCustomers = async () => {
    if (!companyId) return
    setLoadingCustomers(true)
    const { data } = await supabase
      .from('cw_customers')
      .select('id, name, phone, total_visits, last_visit_at, loyalty_count')
      .eq('company_id', companyId)
      .order('last_visit_at', { ascending: false })
    setAllCustomers((data || []) as Customer[])
    setLoadingCustomers(false)
  }

  /* filtered view */
  const filteredCustomers = (() => {
    const now = Date.now()
    if (filter === 'inactive30') {
      const cut = now - 30 * 86400000
      return allCustomers.filter(c => !c.last_visit_at || new Date(c.last_visit_at).getTime() < cut)
    }
    if (filter === 'inactive60') {
      const cut = now - 60 * 86400000
      return allCustomers.filter(c => !c.last_visit_at || new Date(c.last_visit_at).getTime() < cut)
    }
    if (filter === 'inactive90') {
      const cut = now - 90 * 86400000
      return allCustomers.filter(c => !c.last_visit_at || new Date(c.last_visit_at).getTime() < cut)
    }
    if (filter === 'loyalty_almost') {
      return allCustomers.filter(c => {
        const count = c.loyalty_count || 0
        const rem = loyaltyThreshold - (count % loyaltyThreshold)
        return rem === 1
      })
    }
    return allCustomers
  })()

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(filteredCustomers.map(c => c.id)))
  const deselectAll = () => setSelectedIds(new Set())
  const allSelected = filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.has(c.id))

  const insertTag = (tag: string) => {
    const el = msgRef.current
    if (!el) { setMessage(m => m + tag); return }
    const start = el.selectionStart ?? message.length
    const end = el.selectionEnd ?? message.length
    const next = message.slice(0, start) + tag + message.slice(end)
    setMessage(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(start + tag.length, start + tag.length) }, 0)
  }

  const startCampaign = async () => {
    if (!apiConfigured) { alert('لم يتم إعداد Green API بعد. تواصل مع الإدارة.'); return }
    if (!message.trim()) { alert('اكتب الرسالة أولاً'); return }
    const targets = filteredCustomers.filter(c => selectedIds.has(c.id))
    if (targets.length === 0) { alert('اختر عملاء أولاً'); return }

    setSending(true)
    abortRef.current = false
    setResults([])
    setProgress(0)
    setShowResults(true)

    const newResults: SendResult[] = []

    for (let i = 0; i < targets.length; i++) {
      if (abortRef.current) break
      const c = targets[i]
      const chatId = formatPhone(c.phone)
      const text = applyPlaceholders(message, c)

      try {
        const res = await fetch(
          `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, message: text }) }
        )
        if (res.ok) {
          newResults.push({ phone: c.phone, name: c.name, status: 'success' })
        } else {
          const err = await res.text()
          newResults.push({ phone: c.phone, name: c.name, status: 'error', error: err.slice(0, 80) })
        }
      } catch (e: any) {
        newResults.push({ phone: c.phone, name: c.name, status: 'error', error: e?.message || 'خطأ في الشبكة' })
      }

      setResults([...newResults])
      setProgress(Math.round(((i + 1) / targets.length) * 100))

      if (i < targets.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 1200))
      }
    }

    setSending(false)
  }

  const selectedTargets = filteredCustomers.filter(c => selectedIds.has(c.id))
  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length

  return (
    <div className="space-y-5">
      <ClientPageHeader
        eyebrow="التسويق"
        title="حملات واتساب"
        description="أرسل رسائل واتساب مخصصة لعملاء المغسلة مباشرة من هنا."
        actions={(
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-cairo font-bold"
            style={{ background: apiConfigured ? '#ECFDF5' : '#FEF3C7', color: apiConfigured ? '#059669' : '#D97706', border: `1px solid ${apiConfigured ? '#A7F3D0' : '#FDE68A'}` }}>
            {apiConfigured ? 'Green API متصل ✓' : '⚠ Green API غير مكوّن'}
          </div>
        )}
      />

      {!apiConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 font-cairo">Green API غير مكوّن</p>
            <p className="text-xs text-amber-600 font-tajawal mt-0.5">تواصل مع الإدارة لإعداد بيانات Green API الخاصة بمغسلتك.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Customer selection */}
        <div className="space-y-4">
          <ClientPanel icon={Users} title="المستلمون" description="فلتر ثم اختر العملاء الذين سيستقبلون الرسالة.">
            <div className="p-5 space-y-4">

              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {FILTERS.map(f => (
                  <button key={f.key} onClick={() => { setFilter(f.key); setSelectedIds(new Set()) }}
                    className="py-1.5 px-3 rounded-xl text-xs font-tajawal font-bold transition-all"
                    style={{
                      background: filter === f.key ? 'rgba(34,211,238,0.12)' : '#F8FAFC',
                      border: `1px solid ${filter === f.key ? '#22D3EE' : '#E2E8F0'}`,
                      color: filter === f.key ? '#0891B2' : '#64748B',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Select all / deselect */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-tajawal">
                  {loadingCustomers ? 'جارٍ التحميل...' : `${filteredCustomers.length} عميل`}
                </span>
                {filteredCustomers.length > 0 && (
                  <button
                    onClick={allSelected ? deselectAll : selectAll}
                    className="text-xs font-bold font-cairo px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: allSelected ? '#FEF2F2' : '#EFF6FF', color: allSelected ? '#DC2626' : '#2563EB', border: `1px solid ${allSelected ? '#FCA5A5' : '#BFDBFE'}` }}>
                    {allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                )}
              </div>

              {/* Selected count badge */}
              {selectedIds.size > 0 && (
                <div className="rounded-xl px-4 py-2 text-center" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)' }}>
                  <span className="text-sm font-black font-sora" style={{ color: '#0891B2' }}>{selectedTargets.length}</span>
                  <span className="text-xs text-slate-500 font-tajawal mr-1.5">عميل محدد للإرسال</span>
                </div>
              )}

              {/* Customer list with checkboxes */}
              {loadingCustomers ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              ) : filteredCustomers.length === 0 ? (
                <p className="text-center text-sm text-slate-400 font-tajawal py-4">لا يوجد عملاء في هذه الشريحة</p>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0', maxHeight: 340, overflowY: 'auto' }}>
                  {filteredCustomers.map((c, i) => {
                    const checked = selectedIds.has(c.id)
                    const rem = loyaltyThreshold - ((c.loyalty_count || 0) % loyaltyThreshold)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleSelect(c.id)}
                        className="flex items-center w-full gap-3 px-4 py-2.5 text-right transition-colors"
                        style={{
                          borderBottom: i < filteredCustomers.length - 1 ? '1px solid #F1F5F9' : 'none',
                          background: checked ? 'rgba(14,165,233,0.06)' : i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        }}>
                        <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ background: checked ? '#0EA5E9' : '#FFFFFF', border: `1.5px solid ${checked ? '#0EA5E9' : '#CBD5E1'}` }}>
                          {checked && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <p className="text-sm font-bold text-slate-800 font-cairo truncate">{c.name || 'غير محدد'}</p>
                          <p className="text-xs text-slate-400 font-tajawal" dir="ltr">{c.phone}</p>
                        </div>
                        <div className="flex-shrink-0 text-left">
                          <span className="text-xs text-slate-400 font-tajawal block">{c.total_visits} زيارة</span>
                          {rem === 1 && <span className="text-[10px] font-bold" style={{ color: '#F59E0B' }}><Star size={9} className="inline mb-0.5" /> غسلة مجانية</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </ClientPanel>
        </div>

        {/* Right: Message Composer */}
        <div className="space-y-4">
          <ClientPanel icon={MessageSquare} title="الرسالة" description="اكتب الرسالة — استخدم المتغيرات لتخصيصها لكل عميل.">
            <div className="p-5 space-y-4">
              {/* Placeholder chips */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-400 font-tajawal">إدراج متغير:</span>
                {PLACEHOLDERS.map(p => (
                  <button key={p.tag} onClick={() => insertTag(p.tag)}
                    className="px-2.5 py-1 rounded-lg text-xs font-cairo font-bold transition-all"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1', border: '1px solid rgba(99,102,241,0.2)' }}>
                    {p.tag} — {p.label}
                  </button>
                ))}
              </div>

              <textarea
                ref={msgRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={7}
                placeholder="اكتب رسالتك هنا..."
                className="w-full px-4 py-3 rounded-xl text-sm font-tajawal text-slate-900 placeholder-slate-400 outline-none resize-none"
                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', lineHeight: 1.8 }}
                dir="rtl"
              />

              {/* Preview */}
              {filteredCustomers.length > 0 && message && (
                <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <p className="text-xs text-slate-500 font-tajawal mb-2">معاينة للعميل الأول:</p>
                  <p className="text-sm font-tajawal text-slate-800 whitespace-pre-wrap">
                    {applyPlaceholders(message, filteredCustomers[0])}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400 font-tajawal">
                <Clock size={12} />
                تأخير 1.2 ثانية بين كل رسالة لتجنب الحظر
              </div>

              <button
                onClick={startCampaign}
                disabled={sending || selectedIds.size === 0 || !message.trim() || !apiConfigured}
                className="w-full py-3.5 rounded-xl text-sm font-black font-cairo text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: sending ? '#0891B2' : 'linear-gradient(135deg, #0EA5E9, #0891B2)' }}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending
                  ? `جاري الإرسال... ${progress}% (${results.length}/${selectedTargets.length})`
                  : selectedIds.size > 0
                    ? `إرسال لـ ${selectedTargets.length} عميل`
                    : 'اختر عملاء أولاً'
                }
              </button>

              {sending && (
                <button
                  onClick={() => { abortRef.current = true }}
                  className="w-full py-2.5 rounded-xl text-xs font-cairo font-bold transition-all"
                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                  إيقاف الحملة
                </button>
              )}
            </div>
          </ClientPanel>
        </div>
      </div>

      {/* Progress + Results */}
      {(sending || (results.length > 0 && showResults)) && (
        <ClientPanel icon={Send} title="نتائج الإرسال" description={`${successCount} نجح · ${errorCount} فشل · ${results.length} إجمالي`}>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-400 font-tajawal mb-1.5">
                <span>{results.length} من {selectedTargets.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 rounded-full" style={{ background: '#E2E8F0' }}>
                <div className="h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0EA5E9, #10B981)' }} />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <p className="text-xl font-black font-sora text-emerald-600">{successCount}</p>
                <p className="text-xs text-slate-500 font-tajawal mt-0.5">نجح</p>
              </div>
              <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="text-xl font-black font-sora text-red-600">{errorCount}</p>
                <p className="text-xs text-slate-500 font-tajawal mt-0.5">فشل</p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0', maxHeight: 220, overflowY: 'auto' }}>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                  {r.status === 'success'
                    ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    : <XCircle size={15} className="text-red-500 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 font-cairo truncate">{r.name || r.phone}</p>
                    {r.error && <p className="text-xs text-red-500 font-tajawal truncate">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ClientPanel>
      )}
    </div>
  )
}
