import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Wrench, Users2, Calendar, Settings2,
  Plus, Trash2, Check, Loader2, Save, Clock, Phone,
  MapPin, Wifi, CheckSquare, Square,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useClientCompany } from '../../../hooks/useClientCompany'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Branch {
  id: string; company_id: string; name: string; name_ar: string
  industry_type: string; timezone: string; phone: string | null
  address: string | null; address_ar: string | null
  whatsapp_phone_id: string | null; is_active: boolean; created_at: string
}
interface WbosService {
  id: string; branch_id: string; name: string; name_ar: string
  duration_minutes: number; price: number | null; color: string; is_active: boolean
}
interface WbosResource {
  id: string; branch_id: string; name: string; name_ar: string
  role: string; whatsapp_phone: string | null; avatar_color: string; is_active: boolean
}
interface WbosSchedule {
  id: string; branch_id: string; resource_id: string | null
  day_of_week: number; start_time: string; end_time: string
  slot_interval_minutes: number; is_active: boolean
}
interface BranchSetting { key: string; value: string }

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const COLORS = ['#4F6EF7', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const SETTING_KEYS = [
  { key: 'working_hours',              label: 'ساعات العمل',         placeholder: 'الأحد–الخميس 9ص–9م' },
  { key: 'location',                   label: 'الموقع',               placeholder: 'الرياض، حي النزهة' },
  { key: 'phone_number',               label: 'رقم التواصل',          placeholder: '9200XXXXX' },
  { key: 'accepted_payments',          label: 'طرق الدفع',            placeholder: 'مدى، فيزا، كاش' },
  { key: 'cancellation_policy',        label: 'سياسة الإلغاء',        placeholder: 'يمكن الإلغاء قبل ساعتين' },
  { key: 'cancellation_deadline_hours',label: 'مهلة الإلغاء (ساعات)', placeholder: '2' },
  { key: 'google_review_link',         label: 'رابط تقييم جوجل',      placeholder: 'https://g.page/r/...' },
  { key: 'parking_info',               label: 'معلومات الموقف',        placeholder: 'موقف مجاني في الخلف' },
  { key: 'website',                    label: 'الموقع الإلكتروني',     placeholder: 'https://...' },
]

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ active, icon: Icon, label, onClick }: { active: boolean; icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-tajawal cursor-pointer transition-all whitespace-nowrap ${active ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
      style={active ? { background: 'rgba(79,110,247,0.15)', border: '1px solid rgba(79,110,247,0.35)' } : { border: '1px solid transparent' }}>
      <Icon size={14} />
      {label}
    </button>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-slate-500 font-tajawal mb-1.5 block">
        {label}{required && <span className="text-red-400 mr-1">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, dir = 'rtl', type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; dir?: string; type?: string
}) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} type={type} dir={dir}
      placeholder={placeholder}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/50 font-tajawal transition-colors" />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ClientSetup = () => {
  const { companyId, loading: authLoading } = useClientCompany()
  const [tab, setTab] = useState(0)
  const [branch, setBranch] = useState<Branch | null>(null)
  const [services, setServices] = useState<WbosService[]>([])
  const [resources, setResources] = useState<WbosResource[]>([])
  const [schedules, setSchedules] = useState<WbosSchedule[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return
    const load = async () => {
      setLoading(true)
      const { data: br } = await supabase.from('branches').select('*').eq('company_id', companyId).maybeSingle()
      setBranch(br ?? null)
      if (br) {
        const [{ data: sv }, { data: rs }, { data: sc }, { data: st }] = await Promise.all([
          supabase.from('wbos_services').select('*').eq('branch_id', br.id).order('created_at'),
          supabase.from('wbos_resources').select('*').eq('branch_id', br.id).order('created_at'),
          supabase.from('wbos_schedules').select('*').eq('branch_id', br.id).order('day_of_week'),
          supabase.from('branch_settings').select('key,value').eq('branch_id', br.id),
        ])
        setServices(sv ?? [])
        setResources(rs ?? [])
        setSchedules(sc ?? [])
        const obj: Record<string, string> = {}
        ;(st ?? []).forEach((s: BranchSetting) => { obj[s.key] = s.value })
        setSettings(obj)
      }
      setLoading(false)
    }
    load()
  }, [companyId])


  const tabs = [
    { icon: GitBranch, label: 'الفرع' },
    { icon: Wrench,    label: 'الخدمات' },
    { icon: Users2,    label: 'الطاقم' },
    { icon: Calendar,  label: 'الجداول' },
    { icon: Settings2, label: 'الإعدادات' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white font-cairo">إعداد النظام</h1>
        <p className="text-sm text-slate-500 font-tajawal mt-0.5">
          أدخل بيانات نشاطك التجاري لتشغيل نظام الحجز عبر واتساب
        </p>
      </div>

      {/* Progress indicator */}
      {!branch && (
        <div className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <GitBranch size={15} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-400 font-cairo">ابدأ بإنشاء الفرع</p>
            <p className="text-xs text-yellow-400/70 font-tajawal">أدخل بيانات فرعك أولاً ثم أضف الخدمات والطاقم</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t, i) => (
          <Tab key={i} active={tab === i} icon={t.icon} label={t.label} onClick={() => setTab(i)} />
        ))}
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl text-sm font-tajawal text-emerald-400"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Check size={14} /> {msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab 0: Branch ── */}
      {tab === 0 && (
        <BranchTab companyId={companyId!} branch={branch} setBranch={setBranch}
          saving={saving} setSaving={setSaving} flash={flash} />
      )}

      {/* ── Tab 1: Services ── */}
      {tab === 1 && branch && (
        <ServicesTab branchId={branch.id} services={services} setServices={setServices}
          saving={saving} setSaving={setSaving} flash={flash} />
      )}

      {/* ── Tab 2: Resources ── */}
      {tab === 2 && branch && (
        <ResourcesTab branchId={branch.id} resources={resources} setResources={setResources}
          saving={saving} setSaving={setSaving} flash={flash} />
      )}

      {/* ── Tab 3: Schedules ── */}
      {tab === 3 && branch && (
        <SchedulesTab branchId={branch.id} schedules={schedules} setSchedules={setSchedules}
          resources={resources} saving={saving} setSaving={setSaving} flash={flash} />
      )}

      {/* ── Tab 4: Settings ── */}
      {tab === 4 && branch && (
        <SettingsTab branchId={branch.id} settings={settings} setSettings={setSettings}
          saving={saving} setSaving={setSaving} flash={flash} />
      )}

      {/* No branch yet for tabs 1-4 */}
      {tab > 0 && !branch && (
        <div className="py-16 text-center">
          <GitBranch size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-tajawal text-sm">أنشئ الفرع أولاً من تبويب "الفرع"</p>
          <button onClick={() => setTab(0)}
            className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-tajawal cursor-pointer">
            الذهاب لإنشاء الفرع ←
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Branch Tab ───────────────────────────────────────────────────────────────
function BranchTab({ companyId, branch, setBranch, saving, setSaving, flash }: {
  companyId: string; branch: Branch | null; setBranch: (b: Branch) => void
  saving: boolean; setSaving: (v: boolean) => void; flash: (m: string) => void
}) {
  const [form, setForm] = useState({
    name: branch?.name ?? '',
    name_ar: branch?.name_ar ?? '',
    industry_type: branch?.industry_type ?? 'other',
    timezone: branch?.timezone ?? 'Asia/Riyadh',
    phone: branch?.phone ?? '',
    address: branch?.address ?? '',
    address_ar: branch?.address_ar ?? '',
    whatsapp_phone_id: branch?.whatsapp_phone_id ?? '',
  })
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || !form.name_ar) return flash('أدخل اسم الفرع بالعربي والإنجليزي')
    setSaving(true)
    if (branch) {
      const { data, error } = await supabase.from('branches').update({ ...form, updated_at: new Date().toISOString() }).eq('id', branch.id).select().single()
      if (!error && data) { setBranch(data); flash('تم حفظ بيانات الفرع ✅') }
    } else {
      const { data, error } = await supabase.from('branches').insert({ ...form, company_id: companyId }).select().single()
      if (!error && data) { setBranch(data); flash('تم إنشاء الفرع ✅') }
    }
    setSaving(false)
  }

  const industries = [
    { id: 'clinic', label: 'عيادة طبية' },
    { id: 'beauty', label: 'صالون تجميل' },
    { id: 'car_wash', label: 'مغسلة سيارات' },
    { id: 'real_estate', label: 'شركة عقارية' },
    { id: 'education', label: 'تعليم / تدريب' },
    { id: 'other', label: 'أخرى' },
  ]

  return (
    <div className="rounded-2xl p-6 space-y-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <h3 className="text-sm font-bold text-white font-cairo">بيانات الفرع</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="اسم الفرع (عربي)" required><Input value={form.name_ar} onChange={set('name_ar')} placeholder="مثال: مغسلة النجوم" /></Field>
        <Field label="اسم الفرع (إنجليزي)" required><Input value={form.name} onChange={set('name')} placeholder="Al Nujoom Car Wash" dir="ltr" /></Field>
        <Field label="رقم الهاتف"><Input value={form.phone} onChange={set('phone')} placeholder="+966 5x xxx xxxx" dir="ltr" /></Field>
        <Field label="WhatsApp Phone ID"><Input value={form.whatsapp_phone_id} onChange={set('whatsapp_phone_id')} placeholder="1056968717488521" dir="ltr" /></Field>
        <Field label="العنوان (عربي)"><Input value={form.address_ar} onChange={set('address_ar')} placeholder="الرياض، حي النزهة" /></Field>
        <Field label="العنوان (إنجليزي)"><Input value={form.address} onChange={set('address')} placeholder="Riyadh, Al Nuzha district" dir="ltr" /></Field>
      </div>

      <Field label="نوع النشاط">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {industries.map(ind => (
            <button key={ind.id} onClick={() => setForm(f => ({ ...f, industry_type: ind.id }))}
              className="py-2 px-1 rounded-xl text-xs font-tajawal text-center cursor-pointer transition-all"
              style={{
                border: `1px solid ${form.industry_type === ind.id ? 'rgba(79,110,247,0.5)' : '#F8FAFC'}`,
                background: form.industry_type === ind.id ? 'rgba(79,110,247,0.12)' : 'transparent',
                color: form.industry_type === ind.id ? '#fff' : '#64748b',
              }}>
              {ind.label}
            </button>
          ))}
        </div>
      </Field>

      {branch && (
        <div className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Wifi size={13} className="text-emerald-400" />
          <span className="text-xs text-emerald-400 font-tajawal">
            Webhook URL: <span className="font-work text-emerald-300">https://keepcalm.app.n8n.cloud/webhook/{branch.id}</span>
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {branch ? 'حفظ التغييرات' : 'إنشاء الفرع'}
        </motion.button>
      </div>
    </div>
  )
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab({ branchId, services, setServices, saving, setSaving, flash }: {
  branchId: string; services: WbosService[]; setServices: (s: WbosService[]) => void
  saving: boolean; setSaving: (v: boolean) => void; flash: (m: string) => void
}) {
  const empty = { name: '', name_ar: '', duration_minutes: 30, price: '', color: COLORS[0] }
  const [form, setForm] = useState(empty)
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const add = async () => {
    if (!form.name_ar) return flash('أدخل اسم الخدمة')
    setSaving(true)
    const { data, error } = await supabase.from('wbos_services').insert({
      branch_id: branchId, name: form.name || form.name_ar, name_ar: form.name_ar,
      duration_minutes: Number(form.duration_minutes), price: form.price ? Number(form.price) : null,
      color: form.color,
    }).select().single()
    if (!error && data) { setServices([...services, data]); setForm(empty); flash('تمت إضافة الخدمة ✅') }
    setSaving(false)
  }

  const remove = async (id: string) => {
    await supabase.from('wbos_services').delete().eq('id', id)
    setServices(services.filter(s => s.id !== id))
  }

  const toggleActive = async (s: WbosService) => {
    const { data } = await supabase.from('wbos_services').update({ is_active: !s.is_active }).eq('id', s.id).select().single()
    if (data) setServices(services.map(sv => sv.id === s.id ? data : sv))
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <div className="rounded-2xl p-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <h3 className="text-sm font-bold text-white font-cairo mb-4">إضافة خدمة جديدة</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="اسم الخدمة (عربي)" required><Input value={form.name_ar} onChange={set('name_ar')} placeholder="تنظيف سيارة" /></Field>
          <Field label="الاسم (إنجليزي)"><Input value={form.name} onChange={set('name')} placeholder="Car Wash" dir="ltr" /></Field>
          <Field label="المدة (دقيقة)"><Input value={String(form.duration_minutes)} onChange={set('duration_minutes')} type="number" dir="ltr" /></Field>
          <Field label="السعر (ر.س)"><Input value={form.price} onChange={set('price')} type="number" placeholder="0" dir="ltr" /></Field>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <p className="text-xs text-slate-500 font-tajawal">اللون:</p>
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
              className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
              style={{ background: c, border: form.color === c ? '2px solid white' : '2px solid transparent' }} />
          ))}
          <motion.button whileHover={{ scale: 1.02 }} onClick={add} disabled={saving}
            className="mr-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-cairo cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', color: '#fff' }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            إضافة
          </motion.button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {services.length === 0 ? (
          <div className="py-10 text-center text-slate-600 font-tajawal text-sm">لا توجد خدمات — أضف خدمتك الأولى</div>
        ) : services.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-tajawal">{s.name_ar}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-xs text-slate-500 font-tajawal">
                  <Clock size={10} /> {s.duration_minutes} دقيقة
                </span>
                {s.price && <span className="text-xs text-emerald-400 font-work">{s.price} ر.س</span>}
              </div>
            </div>
            <button onClick={() => toggleActive(s)} className="cursor-pointer">
              {s.is_active
                ? <CheckSquare size={16} className="text-indigo-400" />
                : <Square size={16} className="text-slate-600" />}
            </button>
            <button onClick={() => remove(s.id)} className="cursor-pointer hover:text-red-400 text-slate-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Resources Tab ────────────────────────────────────────────────────────────
function ResourcesTab({ branchId, resources, setResources, saving, setSaving, flash }: {
  branchId: string; resources: WbosResource[]; setResources: (r: WbosResource[]) => void
  saving: boolean; setSaving: (v: boolean) => void; flash: (m: string) => void
}) {
  const empty = { name: '', name_ar: '', role: 'staff', whatsapp_phone: '', avatar_color: COLORS[0] }
  const [form, setForm] = useState(empty)
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  const ROLES = [
    { id: 'doctor', label: 'طبيب' }, { id: 'stylist', label: 'مصفف' },
    { id: 'staff', label: 'موظف' }, { id: 'manager', label: 'مدير' },
    { id: 'technician', label: 'فني' }, { id: 'other', label: 'أخرى' },
  ]

  const add = async () => {
    if (!form.name_ar) return flash('أدخل اسم الموظف')
    setSaving(true)
    const { data, error } = await supabase.from('wbos_resources').insert({
      branch_id: branchId, name: form.name || form.name_ar, name_ar: form.name_ar,
      role: form.role, whatsapp_phone: form.whatsapp_phone || null, avatar_color: form.avatar_color,
    }).select().single()
    if (!error && data) { setResources([...resources, data]); setForm(empty); flash('تمت إضافة عضو الطاقم ✅') }
    setSaving(false)
  }

  const remove = async (id: string) => {
    await supabase.from('wbos_resources').delete().eq('id', id)
    setResources(resources.filter(r => r.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <h3 className="text-sm font-bold text-white font-cairo mb-4">إضافة عضو طاقم</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="الاسم (عربي)" required><Input value={form.name_ar} onChange={set('name_ar')} placeholder="د. أحمد محمد" /></Field>
          <Field label="الاسم (إنجليزي)"><Input value={form.name} onChange={set('name')} placeholder="Dr. Ahmad" dir="ltr" /></Field>
          <Field label="رقم واتساب"><Input value={form.whatsapp_phone} onChange={set('whatsapp_phone')} placeholder="+966 5x xxx xxxx" dir="ltr" /></Field>
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <p className="text-xs text-slate-500 font-tajawal">الدور:</p>
          {ROLES.map(r => (
            <button key={r.id} onClick={() => setForm(f => ({ ...f, role: r.id }))}
              className="px-3 py-1.5 rounded-lg text-xs font-tajawal cursor-pointer transition-all"
              style={{
                border: `1px solid ${form.role === r.id ? 'rgba(79,110,247,0.5)' : '#F8FAFC'}`,
                background: form.role === r.id ? 'rgba(79,110,247,0.12)' : 'transparent',
                color: form.role === r.id ? '#fff' : '#64748b',
              }}>
              {r.label}
            </button>
          ))}
          <div className="flex items-center gap-2 mr-auto">
            {COLORS.map(c => (
              <button key={c} onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-110"
                style={{ background: c, border: form.avatar_color === c ? '2px solid white' : '2px solid transparent' }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <motion.button whileHover={{ scale: 1.02 }} onClick={add} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-cairo cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', color: '#fff' }}>
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            إضافة
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resources.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-slate-600 font-tajawal text-sm">لا يوجد طاقم بعد</div>
        ) : resources.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: r.avatar_color }}>
              {r.name_ar[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-tajawal">{r.name_ar}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-tajawal">{r.role}</span>
                {r.whatsapp_phone && (
                  <span className="flex items-center gap-1 text-xs text-slate-600 font-work">
                    <Phone size={9} /> {r.whatsapp_phone}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => remove(r.id)} className="cursor-pointer hover:text-red-400 text-slate-600 transition-colors">
              <Trash2 size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Schedules Tab ────────────────────────────────────────────────────────────
function SchedulesTab({ branchId, schedules, setSchedules, resources, saving, setSaving, flash }: {
  branchId: string; schedules: WbosSchedule[]; setSchedules: (s: WbosSchedule[]) => void
  resources: WbosResource[]; saving: boolean; setSaving: (v: boolean) => void; flash: (m: string) => void
}) {
  const [selectedResource, setSelectedResource] = useState<string | null>(null)

  const toggleDay = async (day: number) => {
    const existing = schedules.find(s => s.day_of_week === day && s.resource_id === selectedResource)
    if (existing) {
      const { data } = await supabase.from('wbos_schedules').update({ is_active: !existing.is_active }).eq('id', existing.id).select().single()
      if (data) setSchedules(schedules.map(s => s.id === existing.id ? data : s))
    } else {
      const { data, error } = await supabase.from('wbos_schedules').insert({
        branch_id: branchId, resource_id: selectedResource, day_of_week: day,
        start_time: '09:00', end_time: '21:00', slot_interval_minutes: 30, is_active: true,
      }).select().single()
      if (!error && data) setSchedules([...schedules, data])
    }
  }

  const updateTime = async (id: string, field: 'start_time' | 'end_time', val: string) => {
    await supabase.from('wbos_schedules').update({ [field]: val }).eq('id', id)
    setSchedules(schedules.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  const updateInterval = async (id: string, val: number) => {
    await supabase.from('wbos_schedules').update({ slot_interval_minutes: val }).eq('id', id)
    setSchedules(schedules.map(s => s.id === id ? { ...s, slot_interval_minutes: val } : s))
  }

  const filteredSchedules = schedules.filter(s => s.resource_id === selectedResource)

  return (
    <div className="space-y-4">
      {/* Resource selector */}
      {resources.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSelectedResource(null)}
            className="px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all"
            style={{
              border: `1px solid ${selectedResource === null ? 'rgba(79,110,247,0.5)' : '#F8FAFC'}`,
              background: selectedResource === null ? 'rgba(79,110,247,0.12)' : 'transparent',
              color: selectedResource === null ? '#fff' : '#64748b',
            }}>
            عام (كل الفرع)
          </button>
          {resources.map(r => (
            <button key={r.id} onClick={() => setSelectedResource(r.id)}
              className="px-3 py-2 rounded-lg text-xs font-tajawal cursor-pointer transition-all"
              style={{
                border: `1px solid ${selectedResource === r.id ? r.avatar_color + '80' : '#F8FAFC'}`,
                background: selectedResource === r.id ? r.avatar_color + '15' : 'transparent',
                color: selectedResource === r.id ? '#fff' : '#64748b',
              }}>
              {r.name_ar}
            </button>
          ))}
        </div>
      )}

      {/* Days grid */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
        <div className="px-4 py-3 text-xs font-bold text-slate-500 font-tajawal"
          style={{ background: '#FAFAFA', borderBottom: '1px solid #E2E8F0' }}>
          أيام وساعات العمل
        </div>
        <div className="divide-y divide-white/[0.05]">
          {DAYS.map((day, i) => {
            const sch = filteredSchedules.find(s => s.day_of_week === i)
            const isActive = sch?.is_active ?? false
            return (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <button onClick={() => toggleDay(i)}
                  className="cursor-pointer flex-shrink-0 transition-all">
                  {isActive
                    ? <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#4F6EF7' }}><Check size={10} color="#fff" /></div>
                    : <div className="w-5 h-5 rounded-full" style={{ border: '2px solid #CBD5E1' }} />}
                </button>
                <span className="text-sm font-tajawal w-20" style={{ color: isActive ? '#fff' : '#64748b' }}>{day}</span>
                {isActive && sch ? (
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-tajawal">من</span>
                      <input type="time" value={sch.start_time}
                        onChange={e => updateTime(sch.id, 'start_time', e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none font-work" />
                      <span className="text-xs text-slate-500 font-tajawal">إلى</span>
                      <input type="time" value={sch.end_time}
                        onChange={e => updateTime(sch.id, 'end_time', e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none font-work" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-tajawal">كل</span>
                      <select value={sch.slot_interval_minutes}
                        onChange={e => updateInterval(sch.id, Number(e.target.value))}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white outline-none font-work cursor-pointer">
                        {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} دقيقة</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-700 font-tajawal">مغلق</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ branchId, settings, setSettings, saving, setSaving, flash }: {
  branchId: string; settings: Record<string, string>; setSettings: (s: Record<string, string>) => void
  saving: boolean; setSaving: (v: boolean) => void; flash: (m: string) => void
}) {
  const [local, setLocal] = useState<Record<string, string>>(settings)
  useEffect(() => { setLocal(settings) }, [settings])

  const save = async () => {
    setSaving(true)
    const upserts = Object.entries(local).filter(([, v]) => v.trim()).map(([key, value]) => ({
      branch_id: branchId, key, value, updated_at: new Date().toISOString(),
    }))
    const { error } = await supabase.from('branch_settings').upsert(upserts, { onConflict: 'branch_id,key' })
    if (!error) { setSettings(local); flash('تم حفظ الإعدادات ✅') }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
        <h3 className="text-sm font-bold text-white font-cairo">إعدادات الفرع</h3>
        <p className="text-xs text-slate-500 font-tajawal">هذه البيانات يستخدمها الذكاء الاصطناعي للرد على أسئلة العملاء عبر واتساب</p>
        <div className="space-y-3">
          {SETTING_KEYS.map(({ key, label, placeholder }) => (
            <div key={key} className="grid grid-cols-3 gap-3 items-center">
              <div className="flex items-center gap-2">
                <MapPin size={11} className="text-slate-600 flex-shrink-0" />
                <label className="text-xs text-slate-400 font-tajawal">{label}</label>
              </div>
              <div className="col-span-2">
                <input
                  value={local[key] ?? ''}
                  onChange={e => setLocal(l => ({ ...l, [key]: e.target.value }))}
                  placeholder={placeholder}
                  dir="rtl"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-sm text-white placeholder-slate-700 outline-none focus:border-indigo-500/50 font-tajawal transition-colors"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <motion.button whileHover={{ scale: 1.02 }} onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold font-cairo cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #4F6EF7, #7C3AED)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ الإعدادات
          </motion.button>
        </div>
      </div>
    </div>
  )
}
