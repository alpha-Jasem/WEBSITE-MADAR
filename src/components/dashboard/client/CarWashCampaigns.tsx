import { useEffect, useState, useRef } from 'react'
import { Loader2, Send, Users, MessageSquare, CheckCircle2, XCircle, Settings, ChevronDown, ChevronUp, AlertCircle, Clock } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import { ClientPageHeader, ClientPanel, ClientButton } from './ClientUI'

interface Customer {
  id: string
  name: string | null
  phone: string
  total_visits: number
  last_visit_at: string | null
}

interface SendResult {
  phone: string
  name: string | null
  status: 'success' | 'error'
  error?: string
}

const FILTERS = [
  { key: 'all',    label: 'كل العملاء' },
  { key: 'inactive30',  label: 'لم يزوروا منذ 30 يوم' },
  { key: 'inactive60',  label: 'لم يزوروا منذ 60 يوم' },
  { key: 'inactive90',  label: 'لم يزوروا منذ 90 يوم' },
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

  /* ── Green API settings ── */
  const [showApiSettings, setShowApiSettings] = useState(false)
  const [idInstance, setIdInstance] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [savingApi, setSavingApi] = useState(false)
  const [apiSaved, setApiSaved] = useState(false)

  /* ── customers ── */
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filter, setFilter] = useState('all')
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  /* ── message composer ── */
  const [message, setMessage] = useState('السلام عليكم {name}،\nنشتاق لزيارتك في مغسلتنا! 🚗✨\nزورنا واستمتع بخدمة متميزة.')
  const msgRef = useRef<HTMLTextAreaElement>(null)

  /* ── campaign state ── */
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [progress, setProgress] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const abortRef = useRef(false)

  /* load API settings from cw_automations */
  useEffect(() => {
    if (!company) return
    const api = (company as any)?.cw_automations?.green_api
    if (api?.idInstance) { setIdInstance(api.idInstance); setApiToken(api.apiTokenInstance || '') }
  }, [company])

  /* load customers */
  useEffect(() => {
    if (!companyId) return
    loadCustomers()
  }, [companyId, filter])

  const loadCustomers = async () => {
    if (!companyId) return
    setLoadingCustomers(true)
    let query = supabase
      .from('cw_customers')
      .select('id, name, phone, total_visits, last_visit_at')
      .eq('company_id', companyId)
      .order('last_visit_at', { ascending: false })

    const now = new Date()
    if (filter === 'inactive30') {
      const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString()
      query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`)
    } else if (filter === 'inactive60') {
      const cutoff = new Date(now.getTime() - 60 * 86400000).toISOString()
      query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`)
    } else if (filter === 'inactive90') {
      const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString()
      query = query.or(`last_visit_at.lt.${cutoff},last_visit_at.is.null`)
    }

    const { data } = await query
    setCustomers((data || []) as Customer[])
    setLoadingCustomers(false)
  }

  const saveApiSettings = async () => {
    if (!companyId || !idInstance || !apiToken) return
    setSavingApi(true)
    const existing = (company as any)?.cw_automations || {}
    await supabase.from('companies').update({
      cw_automations: { ...existing, green_api: { idInstance, apiTokenInstance: apiToken } }
    }).eq('id', companyId)
    setSavingApi(false)
    setApiSaved(true)
    setTimeout(() => setApiSaved(false), 2500)
    setShowApiSettings(false)
  }

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
    if (!idInstance || !apiToken) { setShowApiSettings(true); return }
    if (!message.trim()) { alert('اكتب الرسالة أولاً'); return }
    if (customers.length === 0) { alert('لا يوجد عملاء لإرسال لهم'); return }

    setSending(true)
    abortRef.current = false
    setResults([])
    setProgress(0)
    setShowResults(true)

    const list = [...customers]
    const newResults: SendResult[] = []

    for (let i = 0; i < list.length; i++) {
      if (abortRef.current) break
      const c = list[i]
      const chatId = formatPhone(c.phone)
      const text = applyPlaceholders(message, c)

      try {
        const res = await fetch(
          `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: text }),
          }
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
      setProgress(Math.round(((i + 1) / list.length) * 100))

      /* تأخير 1.2 ثانية بين الرسائل لتجنب الحظر */
      if (i < list.length - 1 && !abortRef.current) {
        await new Promise(r => setTimeout(r, 1200))
      }
    }

    setSending(false)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount   = results.filter(r => r.status === 'error').length
  const apiConfigured = !!idInstance && !!apiToken

  return (
    <div className="space-y-5">
      <ClientPageHeader
        eyebrow="التسويق"
        title="حملات واتساب"
        description="أرسل رسائل واتساب مخصصة لعملاء المغسلة مباشرة من هنا."
        actions={(
          <button
            onClick={() => setShowApiSettings(v => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-cairo font-bold transition-all"
            style={{ background: apiConfigured ? '#ECFDF5' : '#FEF3C7', color: apiConfigured ? '#059669' : '#D97706', border: `1px solid ${apiConfigured ? '#A7F3D0' : '#FDE68A'}` }}
          >
            <Settings size={13} />
            {apiConfigured ? 'Green API متصل ✓' : 'إعداد Green API'}
          </button>
        )}
      />

      {/* Green API Settings panel */}
      {showApiSettings && (
        <ClientPanel icon={Settings} title="إعدادات Green API" description="أدخل بيانات حسابك في Green API لتفعيل الإرسال.">
          <div className="p-5 space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">idInstance</label>
              <input
                value={idInstance}
                onChange={e => setIdInstance(e.target.value.trim())}
                placeholder="مثال: 7105..."
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 outline-none"
                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">apiTokenInstance</label>
              <input
                value={apiToken}
                onChange={e => setApiToken(e.target.value.trim())}
                placeholder="مفتاح التوثيق..."
                dir="ltr"
                type="password"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-sora text-slate-900 outline-none"
                style={{ background: '#F8FAFC', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div className="flex gap-3">
              <ClientButton tone="secondary" onClick={() => setShowApiSettings(false)}>إلغاء</ClientButton>
              <ClientButton onClick={saveApiSettings} disabled={savingApi || !idInstance || !apiToken}>
                {savingApi ? <Loader2 size={14} className="animate-spin" /> : null}
                {apiSaved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
              </ClientButton>
            </div>
          </div>
        </ClientPanel>
      )}

      {/* Warning if API not configured */}
      {!apiConfigured && !showApiSettings && (
        <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-700 font-cairo">Green API غير مكوّن</p>
            <p className="text-xs text-amber-600 font-tajawal mt-0.5">اضغط على زر "إعداد Green API" في الأعلى وأدخل بيانات حسابك.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: Customers + Filter */}
        <div className="space-y-4">
          <ClientPanel icon={Users} title="المستلمون" description="اختر الشريحة المستهدفة من عملائك.">
            <div className="p-5 space-y-4">
              {/* Filter */}
              <div className="grid grid-cols-2 gap-2">
                {FILTERS.map(f => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className="py-2 px-3 rounded-xl text-xs font-tajawal font-bold transition-all text-right"
                    style={{
                      background: filter === f.key ? 'rgba(34,211,238,0.12)' : '#F8FAFC',
                      border: `1px solid ${filter === f.key ? '#22D3EE' : '#E2E8F0'}`,
                      color: filter === f.key ? '#0891B2' : '#64748B',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Count */}
              {loadingCustomers ? (
                <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
              ) : (
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)' }}>
                  <p className="text-3xl font-black font-sora" style={{ color: '#0891B2' }}>{customers.length}</p>
                  <p className="text-xs text-slate-500 font-tajawal mt-1">عميل سيستقبل الرسالة</p>
                </div>
              )}

              {/* Customer list preview */}
              {customers.length > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0', maxHeight: 240, overflowY: 'auto' }}>
                  {customers.slice(0, 50).map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: i < customers.slice(0, 50).length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <div>
                        <p className="text-sm font-bold text-slate-800 font-cairo">{c.name || 'غير محدد'}</p>
                        <p className="text-xs text-slate-400 font-tajawal" dir="ltr">{c.phone}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-tajawal">{c.total_visits} زيارة</span>
                    </div>
                  ))}
                  {customers.length > 50 && (
                    <div className="px-4 py-2 text-center text-xs text-slate-400 font-tajawal" style={{ background: '#F8FAFC' }}>
                      + {customers.length - 50} عميل آخر
                    </div>
                  )}
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

              {/* Message textarea */}
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
              {customers.length > 0 && message && (
                <div className="rounded-xl p-4" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <p className="text-xs text-slate-500 font-tajawal mb-2">معاينة للعميل الأول:</p>
                  <p className="text-sm font-tajawal text-slate-800 whitespace-pre-wrap">
                    {applyPlaceholders(message, customers[0])}
                  </p>
                </div>
              )}

              {/* Delay note */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-tajawal">
                <Clock size={12} />
                تأخير 1.2 ثانية بين كل رسالة لتجنب الحظر
              </div>

              {/* Send button */}
              <button
                onClick={startCampaign}
                disabled={sending || customers.length === 0 || !message.trim()}
                className="w-full py-3.5 rounded-xl text-sm font-black font-cairo text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: sending ? '#0891B2' : 'linear-gradient(135deg, #0EA5E9, #0891B2)' }}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending
                  ? `جاري الإرسال... ${progress}% (${results.length}/${customers.length})`
                  : `إرسال لـ ${customers.length} عميل`
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

      {/* Progress bar */}
      {(sending || (results.length > 0 && showResults)) && (
        <ClientPanel icon={Send} title="نتائج الإرسال" description={`${successCount} نجح · ${errorCount} فشل · ${results.length} إجمالي`}>
          <div className="p-5 space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 font-tajawal mb-1.5">
                <span>{results.length} من {customers.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 rounded-full" style={{ background: '#E2E8F0' }}>
                <div className="h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0EA5E9, #10B981)' }} />
              </div>
            </div>

            {/* Summary chips */}
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span className="text-xs font-bold font-sora text-emerald-600">{successCount} نجح</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                  <XCircle size={13} className="text-red-400" />
                  <span className="text-xs font-bold font-sora text-red-500">{errorCount} فشل</span>
                </div>
              )}
              {!sending && results.length === customers.length && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #86EFAC' }}>
                  <CheckCircle2 size={13} className="text-green-500" />
                  <span className="text-xs font-bold font-cairo text-green-600">اكتملت الحملة</span>
                </div>
              )}
            </div>

            {/* Result list */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0', maxHeight: 300, overflowY: 'auto' }}>
              {results.slice().reverse().map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: i < results.length - 1 ? '1px solid #F1F5F9' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                  <div className="flex items-center gap-2">
                    {r.status === 'success'
                      ? <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      : <XCircle size={13} className="text-red-400 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-xs font-bold text-slate-800 font-cairo">{r.name || 'غير محدد'}</p>
                      {r.error && <p className="text-xs text-red-400 font-tajawal">{r.error}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-tajawal" dir="ltr">{r.phone}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setResults([]); setProgress(0); setShowResults(false) }}
              disabled={sending}
              className="text-xs text-slate-400 font-tajawal hover:text-slate-600 transition-colors disabled:opacity-40">
              مسح النتائج
            </button>
          </div>
        </ClientPanel>
      )}
    </div>
  )
}
