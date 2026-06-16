import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

type Segment = 'dental' | 'skin' | 'general'
type Status  = 'meeting_booked' | 'silent' | 'pending' | 'won' | 'lost' | 'contacted'

interface Lead {
  id: string
  clinic: string
  contact: string
  phone: string
  segment: Segment
  area: string
  status: Status
  notes: string
  campaign: string
  created_at: string
}



const STATUS_META: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  pending:        { label: 'بانتظار التواصل', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.2)'   },
  contacted:      { label: 'تم التواصل',      color: '#38BDF8', bg: 'rgba(56,189,248,0.1)',   border: 'rgba(56,189,248,0.25)'  },
  meeting_booked: { label: 'اجتماع محجوز',    color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'   },
  silent:         { label: 'لا يرد',           color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)'   },
  won:            { label: 'تم الإغلاق ✓',    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)',border: 'rgba(167,139,250,0.3)'  },
  lost:           { label: 'خسرنا',            color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)'  },
}

const SEG_LABELS: Record<string, string> = { all: 'الكل', dental: 'أسنان', skin: 'جلدية / تجميل', general: 'عامة' }

const EMPTY_FORM = { clinic: '', contact: '', phone: '', segment: 'dental' as Segment, area: '', status: 'pending' as Status, notes: '' }

function waMsg(lead: Lead) {
  const name = lead.contact.replace('د. ', '')
  const text = `مرحباً د. ${name}، أنا جاسم من مادار — نظام الاستقبال الذكي للعيادات على واتساب. هل لديك دقيقتان أشارككم كيف نساعد عيادة ${lead.clinic} على حجز المواعيد تلقائياً؟`
  window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
}

/* ── Generic inline editable single-line cell ── */
const InlineCell = ({ value, field, leadId, onSave, placeholder = '—', mono = false }: {
  value: string; field: string; leadId: string; placeholder?: string; mono?: boolean
  onSave: (id: string, field: string, val: string) => void
}) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])
  const save = () => { setEditing(false); if (val.trim() && val !== value) { onSave(leadId, field, val.trim()) } else { setVal(value) } }
  if (editing) return (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
      style={{ width: '100%', minWidth: 110, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 6, padding: '4px 8px', color: 'var(--ink)', fontSize: 13, fontFamily: mono ? 'var(--mono)' : 'inherit', outline: 'none' }} />
  )
  return (
    <div onClick={() => setEditing(true)} title="اضغط للتعديل"
      style={{ fontSize: 13, color: 'var(--ink)', cursor: 'text', fontFamily: mono ? 'var(--mono)' : 'inherit', padding: '2px 4px', borderRadius: 4, transition: 'background .12s', whiteSpace: 'nowrap' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
      {val || <span style={{ color: 'rgba(255,255,255,0.2)' }}>{placeholder}</span>}
    </div>
  )
}

/* ── Inline editable notes cell ── */
const NotesCell = ({ lead, onSave }: { lead: Lead; onSave: (id: string, notes: string) => void }) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(lead.notes)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  const save = () => { setEditing(false); if (val !== lead.notes) onSave(lead.id, val) }

  if (editing) return (
    <textarea
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save() } if (e.key === 'Escape') { setVal(lead.notes); setEditing(false) } }}
      style={{ width: '100%', minWidth: 160, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(96,165,250,0.4)', borderRadius: 6, padding: '5px 8px', color: 'var(--ink)', fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', rows: 2 } as React.CSSProperties}
      rows={2}
    />
  )
  return (
    <div
      onClick={() => setEditing(true)}
      title="اضغط للتعديل"
      style={{ fontSize: 12, color: val ? 'var(--ink-3)' : 'rgba(255,255,255,0.18)', cursor: 'text', minWidth: 120, padding: '2px 4px', borderRadius: 4, transition: 'background .12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {val || '+ أضف ملاحظة'}
    </div>
  )
}

/* ── Add Lead Modal ── */
const AddModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (form: typeof EMPTY_FORM) => void }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw' }} onClick={e => e.stopPropagation()} dir="rtl">
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>إضافة عيادة جديدة</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'clinic',   label: 'اسم العيادة',    placeholder: 'عيادة ...' },
            { key: 'contact',  label: 'الطبيب / المسؤول', placeholder: 'د. ...' },
            { key: 'phone',    label: 'رقم الجوال',      placeholder: '9665XXXXXXXX' },
            { key: 'area',     label: 'الحي',            placeholder: 'حي ...' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>{f.label}</label>
              <input
                value={(form as Record<string, string>)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>التخصص</label>
              <select value={form.segment} onChange={e => set('segment', e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                <option value="dental">أسنان</option>
                <option value="skin">جلدية / تجميل</option>
                <option value="general">عامة</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>الحالة</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13 }}>إلغاء</button>
          <button
            onClick={() => { if (form.clinic && form.phone) { onAdd(form); onClose() } }}
            style={{ padding: '8px 20px', borderRadius: 8, background: '#2563EB', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            إضافة
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main component ── */
export const AdminSalesBlitz = () => {
  const [leads, setLeads]         = useState<Lead[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [seg, setSeg]             = useState<'all' | Segment>('all')
  const [statusFilter, setStatus] = useState<'all' | Status>('all')
  const [showAdd, setShowAdd]     = useState(false)
  const [saving, setSaving]       = useState<string | null>(null)

  /* Load from Supabase — seed if empty */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('sales_blitz_leads')
        .select('*')
        .eq('campaign', 'jeddah-medical-2026')
        .order('created_at', { ascending: true })

      setLeads((data ?? []) as Lead[])
      setLoading(false)
    }
    load()
  }, [])

  /* Update status */
  const updateStatus = async (id: string, status: Status) => {
    setSaving(id)
    setLeads(l => l.map(x => x.id === id ? { ...x, status } : x))
    await supabase.from('sales_blitz_leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setSaving(null)
  }

  /* Update any text field (notes, clinic, phone, contact) */
  const updateField = async (id: string, field: string, value: string) => {
    setLeads(l => l.map(x => x.id === id ? { ...x, [field]: value } : x))
    await supabase.from('sales_blitz_leads').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const updateNotes = (id: string, notes: string) => updateField(id, 'notes', notes)

  /* Add new lead */
  const addLead = async (form: typeof EMPTY_FORM) => {
    const row = { ...form, campaign: 'jeddah-medical-2026' }
    const { data } = await supabase.from('sales_blitz_leads').insert(row).select().single()
    if (data) setLeads(l => [...l, data as Lead])
  }

  /* Delete lead */
  const deleteLead = async (id: string) => {
    if (!confirm('حذف هذه العيادة من القائمة؟')) return
    setLeads(l => l.filter(x => x.id !== id))
    await supabase.from('sales_blitz_leads').delete().eq('id', id)
  }

  const filtered = useMemo(() => leads.filter(l => {
    const matchSeg    = seg === 'all' || l.segment === seg
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const q = search.toLowerCase()
    return matchSeg && matchStatus && (!q || l.clinic.includes(q) || l.contact.includes(q) || l.area.includes(q))
  }), [leads, search, seg, statusFilter])

  const kpi = {
    total:     leads.length,
    pending:   leads.filter(l => l.status === 'pending').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    meeting:   leads.filter(l => l.status === 'meeting_booked').length,
    silent:    leads.filter(l => l.status === 'silent').length,
    won:       leads.filter(l => l.status === 'won').length,
  }

  if (loading) return <div className="page fade-in" style={{ color: 'var(--ink-3)', padding: 40 }}>جاري التحميل...</div>

  return (
    <div className="page fade-in" dir="rtl">
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addLead} />}

      {/* Header */}
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">⚡ Sales Blitz — جدة الطبية</div>
          <div className="sec-sub">{leads.length} عيادة مستهدفة · حملة 2026</div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#2563EB', border: 'none', color: '#fff', cursor: 'pointer' }}>
          + عيادة جديدة
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'إجمالي',         value: kpi.total,     color: '#60A5FA', f: 'all'            },
          { label: 'بانتظار التواصل',value: kpi.pending,   color: '#94A3B8', f: 'pending'        },
          { label: 'تم التواصل',     value: kpi.contacted, color: '#38BDF8', f: 'contacted'      },
          { label: 'اجتماع محجوز',   value: kpi.meeting,   color: '#10B981', f: 'meeting_booked' },
          { label: 'لا يرد',         value: kpi.silent,    color: '#F59E0B', f: 'silent'         },
          { label: 'تم الإغلاق',     value: kpi.won,       color: '#A78BFA', f: 'won'            },
        ].map(k => (
          <div key={k.label} className="card card-pad" onClick={() => setStatus(k.f as 'all' | Status)}
            style={{ cursor: 'pointer', borderBottom: `3px solid ${k.color}`, transition: 'transform .15s', background: statusFilter === k.f ? 'rgba(255,255,255,0.05)' : undefined }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالعيادة أو الطبيب أو الحي..."
            style={{ flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 12px', color: 'var(--ink)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          {(['all', 'dental', 'skin', 'general'] as const).map(s => (
            <button key={s} onClick={() => setSeg(s)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: seg === s ? '#2563EB' : 'rgba(255,255,255,0.06)', color: seg === s ? '#fff' : 'var(--ink-3)', transition: 'all .15s' }}>
              {SEG_LABELS[s]}
            </button>
          ))}
          <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 'auto' }}>{filtered.length} نتيجة</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                {['#', 'العيادة', 'الطبيب', 'الجوال', 'الحي', 'التخصص', 'الحالة', 'الملاحظات', 'إجراءات'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, idx) => {
                const st = STATUS_META[lead.status]
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>

                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      <InlineCell value={lead.clinic} field="clinic" leadId={lead.id} onSave={updateField} placeholder="اسم العيادة" />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <InlineCell value={lead.contact} field="contact" leadId={lead.id} onSave={updateField} placeholder="د. ..." />
                    </td>
                    <td style={{ padding: '8px 14px' }}>
                      <InlineCell value={lead.phone} field="phone" leadId={lead.id} onSave={updateField} placeholder="9665XXXXXXXX" mono />
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)', fontSize: 12 }}>{lead.area}</td>

                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--ink-3)' }}>
                        {SEG_LABELS[lead.segment]}
                      </span>
                    </td>

                    {/* Editable status dropdown */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ position: 'relative' }}>
                        <select
                          value={lead.status}
                          onChange={e => updateStatus(lead.id, e.target.value as Status)}
                          disabled={saving === lead.id}
                          style={{
                            appearance: 'none', WebkitAppearance: 'none',
                            background: st.bg, border: `1px solid ${st.border}`,
                            color: st.color, borderRadius: 20, padding: '4px 28px 4px 10px',
                            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            opacity: saving === lead.id ? 0.5 : 1,
                          }}>
                          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: st.color, pointerEvents: 'none' }}>▾</span>
                      </div>
                    </td>

                    {/* Inline editable notes */}
                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                      <NotesCell lead={lead} onSave={updateNotes} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => waMsg(lead)} title="واتساب"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 7, padding: '5px 10px', color: '#25D366', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(37,211,102,0.1)')}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.518 3.66 1.42 5.18L2 22l4.94-1.38A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm5.07 14.29c-.21.59-1.22 1.12-1.67 1.19-.44.06-.99.09-1.6-.1-.37-.12-.84-.28-1.44-.55-2.52-1.09-4.16-3.6-4.29-3.77-.12-.17-.99-1.32-.99-2.52 0-1.2.63-1.79.85-2.03.22-.24.48-.3.64-.3h.46c.15 0 .35-.06.55.42.21.49.7 1.7.76 1.82.06.12.1.27.02.43-.08.17-.12.27-.23.42l-.35.41c-.11.11-.23.23-.1.46.13.23.58.96 1.25 1.55.86.77 1.58 1.01 1.81 1.12.22.11.35.09.48-.05l.57-.67c.13-.16.26-.13.44-.08.18.05 1.17.55 1.37.65.2.1.33.15.38.23.05.08.05.47-.16 1.06Z"/></svg>
                          واتساب
                        </button>
                        <button onClick={() => deleteLead(lead.id)} title="حذف"
                          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '5px 8px', color: '#F87171', fontSize: 12, cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.18)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}>
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
