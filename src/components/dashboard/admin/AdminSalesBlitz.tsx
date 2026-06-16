import { useState, useMemo } from 'react'

type Segment = 'all' | 'dental' | 'skin' | 'general'
type Status = 'meeting_booked' | 'silent' | 'pending'

interface Lead {
  id: number
  clinic: string
  contact: string
  phone: string
  segment: Segment
  status: Status
  notes: string
  area: string
}

const LEADS: Lead[] = [
  { id: 1,  clinic: 'عيادة الفردوس لطب الأسنان',      contact: 'د. فيصل العتيبي',   phone: '966501110001', segment: 'dental',  status: 'meeting_booked', notes: 'اجتماع الثلاثاء 10ص — مهتم بالباقة Pro', area: 'حي الروضة' },
  { id: 2,  clinic: 'مركز دانة لتجميل البشرة',         contact: 'د. منى الزهراني',   phone: '966501110002', segment: 'skin',    status: 'silent',         notes: 'لا رد منذ 4 أيام — أرسل follow-up', area: 'حي الزهراء' },
  { id: 3,  clinic: 'عيادة النخبة لطب الأسنان',        contact: 'د. خالد القحطاني',  phone: '966501110003', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي السلامة' },
  { id: 4,  clinic: 'مركز جدة التخصصي للجلدية',        contact: 'د. سارة الغامدي',   phone: '966501110004', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الحمراء' },
  { id: 5,  clinic: 'عيادة الياسمين العامة',            contact: 'د. عبدالله الدوسري',phone: '966501110005', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي النزهة' },
  { id: 6,  clinic: 'عيادة الأمانة لطب الأسنان',       contact: 'د. أحمد السبيعي',   phone: '966501110006', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الشرفية' },
  { id: 7,  clinic: 'مجمع البيان الطبي',                contact: 'د. نورة العمري',    phone: '966501110007', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الربوة' },
  { id: 8,  clinic: 'عيادة الرياض لتجميل الأسنان',     contact: 'د. محمد الشهري',    phone: '966501110008', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي العزيزية' },
  { id: 9,  clinic: 'مركز فينوس للتجميل والبشرة',      contact: 'د. ريم الحربي',     phone: '966501110009', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الفيصلية' },
  { id: 10, clinic: 'عيادة التقوى للأسرة',              contact: 'د. عمر المالكي',    phone: '966501110010', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الصفا' },
  { id: 11, clinic: 'عيادة البسمة لطب الأسنان',        contact: 'د. هيفاء الجهني',   phone: '966501110011', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الثغر' },
  { id: 12, clinic: 'مركز الجودة للجلدية والتجميل',    contact: 'د. بشرى الرشيدي',   phone: '966501110012', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الروضة' },
  { id: 13, clinic: 'عيادة الخير العامة',               contact: 'د. ياسر بن علي',    phone: '966501110013', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الكندرة' },
  { id: 14, clinic: 'عيادة الشروق لطب الأسنان',        contact: 'د. فاطمة بن زيد',   phone: '966501110014', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي السلامة' },
  { id: 15, clinic: 'مركز الزهور للعناية بالبشرة',     contact: 'د. مريم السلمي',    phone: '966501110015', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الزهراء' },
  { id: 16, clinic: 'عيادة القمة لطب الأسنان',         contact: 'د. ناصر العنزي',    phone: '966501110016', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الحمراء' },
  { id: 17, clinic: 'مجمع النور الطبي التخصصي',        contact: 'د. إيمان القرني',   phone: '966501110017', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي النعيم' },
  { id: 18, clinic: 'عيادة الصحة الذهبية',             contact: 'د. وليد الزبيدي',   phone: '966501110018', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي العزيزية' },
  { id: 19, clinic: 'عيادة الأنوار لتقويم الأسنان',   contact: 'د. شيماء الشمري',   phone: '966501110019', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الشرفية' },
  { id: 20, clinic: 'مركز ليلى للتجميل والليزر',       contact: 'د. ليلى بن صالح',   phone: '966501110020', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الربوة' },
  { id: 21, clinic: 'عيادة الهداية العامة',             contact: 'د. تركي المطيري',   phone: '966501110021', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الصفا' },
  { id: 22, clinic: 'مركز الإشراق لطب الأسنان',        contact: 'د. نادية العسيري',  phone: '966501110022', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الثغر' },
  { id: 23, clinic: 'عيادة الأوائل التخصصية',           contact: 'د. سليمان الوادعي', phone: '966501110023', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي النزهة' },
  { id: 24, clinic: 'مركز الفن والجمال للبشرة',        contact: 'د. أميرة الخضيري',  phone: '966501110024', segment: 'skin',    status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الكندرة' },
  { id: 25, clinic: 'عيادة الوطن لطب الأسنان',         contact: 'د. حمد الرويلي',    phone: '966501110025', segment: 'dental',  status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الفيصلية' },
  { id: 26, clinic: 'مركز بلسم الطبي',                  contact: 'د. منال الجبير',    phone: '966501110026', segment: 'general', status: 'pending',        notes: 'رسالة أولى لم تُرسل بعد', area: 'حي الروضة' },
]

const STATUS_META = {
  meeting_booked: { label: 'اجتماع محجوز', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  silent:         { label: 'لا يرد',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  pending:        { label: 'بانتظار التواصل', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)'   },
}

const SEG_LABELS: Record<Segment, string> = {
  all: 'الكل', dental: 'أسنان', skin: 'جلدية / تجميل', general: 'عامة'
}

function openWa(phone: string) {
  window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank')
}

function waMsg(lead: Lead) {
  const text = `مرحباً د. ${lead.contact.replace('د. ', '')}، أنا جاسم من مادار — نظام الاستقبال الذكي للعيادات. هل لديك دقيقتان أشارككم كيف نساعد عيادة ${lead.clinic} على حجز المواعيد تلقائياً عبر واتساب؟`
  window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
}

export const AdminSalesBlitz = () => {
  const [search, setSearch] = useState('')
  const [seg, setSeg]       = useState<Segment>('all')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')

  const filtered = useMemo(() => LEADS.filter(l => {
    const matchSeg    = seg === 'all' || l.segment === seg
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const q = search.toLowerCase()
    const matchQ = !q || l.clinic.includes(q) || l.contact.includes(q) || l.area.includes(q)
    return matchSeg && matchStatus && matchQ
  }), [search, seg, statusFilter])

  const kpi = {
    total:   LEADS.length,
    meeting: LEADS.filter(l => l.status === 'meeting_booked').length,
    silent:  LEADS.filter(l => l.status === 'silent').length,
    pending: LEADS.filter(l => l.status === 'pending').length,
  }

  return (
    <div className="page fade-in" dir="rtl">
      {/* Header */}
      <div className="sec-head" style={{ marginBottom: 24 }}>
        <div>
          <div className="sec-title">Sales Blitz — جدة الطبية</div>
          <div className="sec-sub">حملة تواصل مع عيادات جدة · {LEADS.length} عيادة مستهدفة</div>
        </div>
        <button
          className="btn-primary"
          style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#10B981', border: 'none', color: '#fff', cursor: 'pointer' }}
          onClick={() => alert('تصدير Excel — قيد التطوير')}
        >
          ⬇ تصدير
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'إجمالي العيادات',    value: kpi.total,   color: '#60A5FA', onClick: () => setStatusFilter('all')           },
          { label: 'اجتماع محجوز',       value: kpi.meeting, color: '#10B981', onClick: () => setStatusFilter('meeting_booked') },
          { label: 'لا يرد',             value: kpi.silent,  color: '#F59E0B', onClick: () => setStatusFilter('silent')         },
          { label: 'بانتظار التواصل',    value: kpi.pending, color: '#94A3B8', onClick: () => setStatusFilter('pending')        },
        ].map(k => (
          <div
            key={k.label}
            className="card card-pad"
            onClick={k.onClick}
            style={{ cursor: 'pointer', borderBottom: `3px solid ${k.color}`, transition: 'transform .15s', userSelect: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
          >
            <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالعيادة أو الطبيب أو الحي..."
            style={{
              flex: 1, minWidth: 200,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 14px',
              color: 'var(--ink)', fontSize: 13,
              outline: 'none', fontFamily: 'inherit',
            }}
          />

          {/* Segment tabs */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'dental', 'skin', 'general'] as Segment[]).map(s => (
              <button
                key={s}
                onClick={() => setSeg(s)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: seg === s ? '#2563EB' : 'rgba(255,255,255,0.06)',
                  color: seg === s ? '#fff' : 'var(--ink-3)',
                  transition: 'all .15s',
                }}
              >{SEG_LABELS[s]}</button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'meeting_booked', 'silent', 'pending'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid',
                  borderColor: statusFilter === s ? (s === 'all' ? '#60A5FA' : STATUS_META[s as Status]?.color ?? '#60A5FA') : 'rgba(255,255,255,0.1)',
                  background: statusFilter === s ? 'rgba(96,165,250,0.1)' : 'transparent',
                  color: s === 'all' ? 'var(--ink-3)' : (STATUS_META[s as Status]?.color ?? 'var(--ink-3)'),
                  transition: 'all .15s',
                }}
              >
                {s === 'all' ? 'الكل' : STATUS_META[s as Status].label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: 12, color: 'var(--ink-3)', marginRight: 'auto' }}>{filtered.length} نتيجة</span>
        </div>
      </div>

      {/* Leads list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                {['#', 'العيادة', 'الطبيب / المسؤول', 'الحي', 'التخصص', 'الحالة', 'الملاحظات', 'إجراء'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const st = STATUS_META[lead.status]
                return (
                  <tr
                    key={lead.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11 }}>{lead.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--ink)' }}>{lead.clinic}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)' }}>{lead.contact}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)', fontSize: 12 }}>{lead.area}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--ink-3)' }}>
                        {SEG_LABELS[lead.segment]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: st.bg, border: `1px solid ${st.border}`, color: st.color, whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--ink-3)', fontSize: 12, maxWidth: 220 }}>{lead.notes}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => waMsg(lead)}
                        title={`واتساب — ${lead.contact}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)',
                          borderRadius: 8, padding: '5px 11px', color: '#25D366',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                          transition: 'all .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.18)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.1)' }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="#25D366"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.518 3.66 1.42 5.18L2 22l4.94-1.38A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Zm5.07 14.29c-.21.59-1.22 1.12-1.67 1.19-.44.06-.99.09-1.6-.1-.37-.12-.84-.28-1.44-.55-2.52-1.09-4.16-3.6-4.29-3.77-.12-.17-.99-1.32-.99-2.52 0-1.2.63-1.79.85-2.03.22-.24.48-.3.64-.3h.46c.15 0 .35-.06.55.42.21.49.7 1.7.76 1.82.06.12.1.27.02.43-.08.17-.12.27-.23.42l-.35.41c-.11.11-.23.23-.1.46.13.23.58.96 1.25 1.55.86.77 1.58 1.01 1.81 1.12.22.11.35.09.48-.05l.57-.67c.13-.16.26-.13.44-.08.18.05 1.17.55 1.37.65.2.1.33.15.38.23.05.08.05.47-.16 1.06Z"/></svg>
                        واتساب
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>لا توجد نتائج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
