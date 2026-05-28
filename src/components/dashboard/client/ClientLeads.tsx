import { useEffect, useState } from 'react'
import { Search, Users2, Phone, MessageCircle, Download, FileText, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from '../shared/StatusBadge'
import { LeadScoreBadge } from '../shared/LeadScoreBadge'
import { ColdLeadAlert } from '../shared/ColdLeadAlert'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'
import type { LeadStatus } from '../../../types'
import * as XLSX from 'xlsx'

const STAGES = [
  { key: 'new_lead',      label: 'جديد' },
  { key: 'contacted',     label: 'تم التواصل' },
  { key: 'qualified',     label: 'مؤهل' },
  { key: 'meeting_booked',label: 'موعد محجوز' },
  { key: 'won',           label: 'مغلق ✅' },
  { key: 'lost',          label: 'خسارة ❌' },
]

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export const ClientLeads = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [sendingWa, setSendingWa] = useState<string | null>(null)
  const [waModal, setWaModal] = useState<{ lead: any; msg: string } | null>(null)
  const [pdfLead, setPdfLead] = useState<any | null>(null)
  const [scoringAll, setScoringAll] = useState(false)

  useEffect(() => {
    if (authLoading) return
    setLoading(true)
    let q = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
    if (companyId) q = q.eq('company_id', companyId)
    q.then(({ data }) => { setLeads(data || []); setLoading(false) })

    const ch = supabase.channel('client_leads_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, async () => {
        let q2 = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
        if (companyId) q2 = q2.eq('company_id', companyId)
        const { data } = await q2
        setLeads(data || [])
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('Madar CRM', { body: 'تم تحديث قائمة العملاء', icon: '/favicon.ico' })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [authLoading, companyId])

  const filtered = leads.filter(l => {
    const s = search.toLowerCase()
    const matchSearch = (l.company_name || '').toLowerCase().includes(s) || (l.contact_name || '').toLowerCase().includes(s) || (l.phone || '').includes(s)
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    return matchSearch && matchStage
  })

  const handleStage = async (id: string, stage: string) => {
    await supabase.from('crm_leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage } : l))
  }

  // Excel export
  const exportExcel = () => {
    const rows = filtered.map(l => ({
      'الشركة': l.company_name || '',
      'المسؤول': l.contact_name || '',
      'الهاتف': l.phone || '',
      'القطاع': l.sector || '',
      'المرحلة': l.stage || '',
      'القيمة': l.price_sold || l.price_expected || 0,
      'الدرجة': l.score || '',
      'المصدر': l.source || '',
      'الملاحظات': l.notes || '',
      'تاريخ الإضافة': l.created_at?.slice(0, 10) || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء')
    XLSX.writeFile(wb, `madar-leads-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // PDF quote for a lead
  const generatePDF = async (lead: any) => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    doc.setFontSize(22)
    doc.text('عرض سعر', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`شركة: ${lead.company_name || ''}`, 190, 40, { align: 'right' })
    doc.text(`المسؤول: ${lead.contact_name || ''}`, 190, 50, { align: 'right' })
    doc.text(`الهاتف: ${lead.phone || ''}`, 190, 60, { align: 'right' })
    doc.text(`القطاع: ${lead.sector || ''}`, 190, 70, { align: 'right' })
    doc.text(`القيمة: ${(lead.price_sold || lead.price_expected || 0).toLocaleString()} ريال`, 190, 80, { align: 'right' })
    doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, 190, 90, { align: 'right' })
    if (lead.notes) {
      doc.text('الملاحظات:', 190, 105, { align: 'right' })
      const lines = doc.splitTextToSize(lead.notes, 160)
      doc.text(lines, 190, 115, { align: 'right' })
    }
    doc.save(`quote-${lead.company_name || lead.id}.pdf`)
    setPdfLead(null)
  }

  // WhatsApp send
  const sendWa = async () => {
    if (!waModal) return
    setSendingWa(waModal.lead.id)
    const phone = waModal.lead.phone?.replace(/\D/g, '')
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waModal.msg)}`, '_blank')
    setSendingWa(null)
    setWaModal(null)
  }

  // Score all leads
  const scoreAll = async () => {
    setScoringAll(true)
    const { data: { session } } = await supabase.auth.getSession()
    const unscored = filtered.filter(l => !l.score).slice(0, 10)
    for (const lead of unscored) {
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lead-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ lead_id: lead.id, lead }),
        })
      } catch { /* continue */ }
    }
    // Reload
    let q = supabase.from('crm_leads').select('*').order('updated_at', { ascending: false })
    if (companyId) q = q.eq('company_id', companyId)
    const { data } = await q
    setLeads(data || [])
    setScoringAll(false)
  }

  if (authLoading || loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <Loader2 size={20} className="animate-spin text-primary-400" />
      <p className="text-slate-500 font-tajawal text-sm">جاري التحميل...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo">العملاء المحتملون</h1>
          <p className="text-sm text-slate-500 font-tajawal">{leads.length} عميل</p>
        </div>
        <div className="flex gap-2">
          <button onClick={scoreAll} disabled={scoringAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-tajawal cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.2)', color: '#4F6EF7' }}>
            {scoringAll ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            تحليل AI للكل
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-tajawal cursor-pointer transition-all hover:opacity-80"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
            <Download size={12} />
            Excel
          </button>
        </div>
      </div>

      {/* Cold lead alert */}
      <ColdLeadAlert leads={leads} />

      {/* Stage filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[{ key: 'all', label: 'الكل' }, ...STAGES].map(s => (
          <button key={s.key} onClick={() => setStageFilter(s.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-tajawal cursor-pointer transition-all ${stageFilter === s.key ? 'bg-primary-500/20 text-primary-400' : 'text-slate-500 hover:text-white'}`}
            style={{ border: '1px solid #E2E8F0' }}>
            {s.label}
            {s.key !== 'all' && <span className="mr-1 text-slate-600">({leads.filter(l => l.stage === s.key).length})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف..."
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 pr-9 text-sm text-white placeholder-slate-600 outline-none font-tajawal"
          dir="rtl" />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden overflow-x-auto" style={{ border: '1px solid #E2E8F0' }}>
        <table className="w-full min-w-[600px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              {['العميل', 'المرحلة', 'القيمة', 'الدرجة', 'آخر تحديث', 'إجراءات'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-slate-500 font-tajawal font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => {
              const days = daysSince(l.updated_at || l.created_at)
              const isCold = !['won', 'lost'].includes(l.stage) && days > 7
              return (
                <motion.tr key={l.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  style={{ background: isCold ? 'rgba(6,182,212,0.02)' : undefined }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #10B981, #4F6EF7)' }}>
                        {(l.company_name || l.contact_name || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm text-white font-tajawal">{l.company_name || l.contact_name}</p>
                        <span className="flex items-center gap-1 text-[10px] text-slate-600">
                          <Phone size={9} /><span dir="ltr">{l.phone}</span>
                        </span>
                      </div>
                      {isCold && <span className="text-[9px] text-cyan-500 font-tajawal">❄️ بارد</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={l.stage || 'new_lead'}
                      onChange={e => handleStage(l.id, e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1 text-xs text-slate-300 font-tajawal cursor-pointer outline-none"
                      dir="rtl">
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-sora">
                    {(l.price_sold || l.price_expected) ? `${(l.price_sold || l.price_expected).toLocaleString()} ر.س` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge leadId={l.id} lead={l} score={l.score} reason={l.score_reason}
                      onScored={(s, r) => setLeads(prev => prev.map(x => x.id === l.id ? { ...x, score: s, score_reason: r } : x))} />
                  </td>
                  <td className="px-4 py-3 text-xs font-tajawal" style={{ color: isCold ? '#06B6D4' : 'rgba(100,116,139,1)' }}>
                    {days === 0 ? 'اليوم' : `${days} يوم`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setWaModal({ lead: l, msg: `مرحباً ${l.contact_name || ''}، تواصلنا معك بخصوص ${l.sector || 'خدماتنا'}.` })}
                        className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" title="إرسال واتساب"
                        style={{ color: '#25D366' }}>
                        <MessageCircle size={13} />
                      </button>
                      <button
                        onClick={() => generatePDF(l)}
                        className="p-1.5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors" title="عرض سعر PDF"
                        style={{ color: '#F59E0B' }}>
                        <FileText size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users2 size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 font-tajawal text-sm">لا توجد نتائج</p>
          </div>
        )}
      </div>

      {/* WhatsApp modal */}
      {waModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl space-y-4"
            style={{ background: '#0D1017', border: '1px solid #CBD5E1' }}>
            <h3 className="text-base font-bold text-white font-cairo">إرسال واتساب — {waModal.lead.company_name}</h3>
            <textarea
              value={waModal.msg}
              onChange={e => setWaModal(m => m ? { ...m, msg: e.target.value } : m)}
              rows={4} dir="rtl"
              className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-sm text-white font-tajawal outline-none resize-none" />
            <div className="flex gap-3">
              <button onClick={sendWa} disabled={!!sendingWa}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold font-tajawal text-white cursor-pointer"
                style={{ background: '#25D366' }}>
                {sendingWa ? 'جاري...' : 'فتح واتساب'}
              </button>
              <button onClick={() => setWaModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-tajawal text-slate-400 cursor-pointer hover:text-white"
                style={{ border: '1px solid #E2E8F0' }}>
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
