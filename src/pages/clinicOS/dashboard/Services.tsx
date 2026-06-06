import { useState } from 'react'
import { Stethoscope, Plus, Clock, DollarSign, AlertCircle, CheckCircle, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatCard } from '../../../components/clinicOS/ui/StatCard'
import { useClinicServices, createService, updateService } from '../../../lib/clinicOSQueries'
import { useClinicOS } from '../../../context/ClinicOSContext'
import { useToast } from '../../../lib/useToast'
import type { Service } from '../../../types/clinicOS'

export const Services = () => {
  const { companyId, isDemo } = useClinicOS()
  const { showToast } = useToast()
  const { data: services = [], refetch } = useClinicServices(companyId, isDemo)
  const [selected, setSelected] = useState<Service | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSvc, setEditSvc] = useState<Partial<Service>>({})
  const [newSvc, setNewSvc] = useState({ name: '', category: '', duration_minutes: 30, buffer_minutes: 5, price: 0, requires_approval: false, available_for_ai: true })
  const [saving, setSaving] = useState(false)

  const handleAddService = async () => {
    if (!newSvc.name.trim() || !newSvc.category.trim()) {
      showToast('الاسم والفئة مطلوبان', 'warning'); return
    }
    if (isDemo) { showToast('لا يمكن الإضافة في وضع التجربة', 'info'); return }
    setSaving(true)
    try {
      await createService({ ...newSvc, active: true, available_for_whatsapp: true, clinic_id: companyId! })
      showToast('تم إضافة الخدمة بنجاح', 'success')
      setShowAddModal(false)
      setNewSvc({ name: '', category: '', duration_minutes: 30, buffer_minutes: 5, price: 0, requires_approval: false, available_for_ai: true })
      refetch()
    } catch { showToast('حدث خطأ أثناء الإضافة', 'error') }
    finally { setSaving(false) }
  }

  const handleEditService = async () => {
    if (!selected) return
    if (isDemo) { showToast('لا يمكن التعديل في وضع التجربة', 'info'); return }
    setSaving(true)
    try {
      await updateService(selected.id, editSvc)
      showToast('تم حفظ التغييرات بنجاح', 'success')
      setShowEditModal(false)
      refetch()
    } catch { showToast('حدث خطأ أثناء الحفظ', 'error') }
    finally { setSaving(false) }
  }

  const toggleActive = async (id: string) => {
    const svc = services.find(s => s.id === id)
    if (!svc) return
    const { supabase } = await import('../../../lib/supabase')
    await supabase.from('clinic_os_services').update({ active: !svc.active }).eq('id', id)
    refetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, direction: 'rtl' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الخدمات</h1>
          <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة الخدمات والأسعار والمدد وقواعد الحجز</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
          <Plus size={14} /> إضافة خدمة
        </button>
      </div>

      <div className="cos-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { icon: Stethoscope, label: 'خدمات نشطة', value: services.filter(s => s.active).length, color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' },
          { icon: Clock, label: 'متوسط المدة', value: services.length ? `${Math.round(services.reduce((s, x) => s + x.duration_minutes, 0) / services.length)} دق` : '—', color: '#4F46E5', bgColor: '#EEF2FF', borderColor: '#C7D2FE' },
          { icon: DollarSign, label: 'الأكثر حجزاً', value: 'تنظيف الأسنان', color: '#7C3AED', bgColor: '#F5F3FF', borderColor: '#DDD6FE' },
          { icon: AlertCircle, label: 'تحتاج موافقة', value: services.filter(s => s.requires_approval).length, color: '#C2410C', bgColor: '#FFF7ED', borderColor: '#FED7AA' },
        ].map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map((svc, i) => (
            <motion.div key={svc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(svc)}
              style={{ background: '#FFFFFF', borderRadius: 12, border: `1px solid ${selected?.id === svc.id ? '#C7D2FE' : '#E2E8F0'}`, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: svc.active ? 'linear-gradient(135deg, #4F46E520, #4F46E5)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Stethoscope size={18} style={{ color: svc.active ? '#4F46E5' : '#94A3B8' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: svc.active ? '#0F172A' : '#94A3B8', fontFamily: 'Cairo, sans-serif' }}>{svc.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: '#F8FAFC', color: '#64748B', fontFamily: 'Tajawal, sans-serif', fontWeight: 600 }}>{svc.category}</span>
                  {svc.requires_approval && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#FFF7ED', color: '#C2410C', fontFamily: 'Tajawal, sans-serif', fontWeight: 700 }}>يحتاج موافقة</span>}
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}><Clock size={11} style={{ display: 'inline', marginLeft: 3 }} />{svc.duration_minutes} دقيقة</span>
                  {svc.buffer_minutes > 0 && <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>+ {svc.buffer_minutes}د buffer</span>}
                  <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{svc.available_for_ai ? '✓ حجز ذكي' : '✗ حجز ذكي'}</span>
                </div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: svc.price > 0 ? '#0F172A' : '#059669', fontFamily: 'Cairo, sans-serif' }}>{svc.price > 0 ? `${svc.price} ريال` : 'مجاناً'}</div>
              </div>
              <div onClick={e => { e.stopPropagation(); toggleActive(svc.id) }} style={{ width: 40, height: 22, borderRadius: 11, background: svc.active ? '#4F46E5' : '#E2E8F0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, right: svc.active ? 3 : 'auto', left: svc.active ? 'auto' : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </motion.div>
          ))}
        </div>

        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="cos-side-panel" style={{ width: 280, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{selected.name}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: 18 }}>×</button>
            </div>
            {[['الفئة', selected.category], ['المدة', `${selected.duration_minutes} دقيقة`], ['Buffer', `${selected.buffer_minutes} دقيقة`], ['السعر', selected.price > 0 ? `${selected.price} ريال` : 'مجاناً']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ fontSize: 12, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[[selected.available_for_whatsapp, 'حجز واتساب'], [selected.available_for_ai, 'حجز ذكي'], [!selected.requires_approval, 'تأكيد تلقائي']].map(([on, label]) => (
                <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {on ? <CheckCircle size={13} style={{ color: '#059669' }} /> : <AlertCircle size={13} style={{ color: '#94A3B8' }} />}
                  <span style={{ fontSize: 12, color: on ? '#059669' : '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{String(label)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setEditSvc({ name: selected.name, category: selected.category, duration_minutes: selected.duration_minutes, buffer_minutes: selected.buffer_minutes, price: selected.price, requires_approval: selected.requires_approval, available_for_ai: selected.available_for_ai }); setShowEditModal(true) }} style={{ width: '100%', marginTop: 16, padding: '9px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تعديل الخدمة</button>
          </motion.div>
        )}
      </div>

      {/* Edit Service Modal */}
      <AnimatePresence>
        {showEditModal && selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>تعديل: {selected.name}</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[{ label: 'اسم الخدمة', key: 'name' }, { label: 'الفئة', key: 'category' }].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                      <input value={(editSvc as Record<string, unknown>)[f.key] as string || ''} onChange={e => setEditSvc(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[{ label: 'المدة (دق)', key: 'duration_minutes' }, { label: 'Buffer (دق)', key: 'buffer_minutes' }, { label: 'السعر (ريال)', key: 'price' }].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                      <input type="number" min={0} value={(editSvc as Record<string, unknown>)[f.key] as number || 0} onChange={e => setEditSvc(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{ label: 'يحتاج موافقة', key: 'requires_approval' }, { label: 'متاح للحجز الذكي', key: 'available_for_ai' }].map(f => (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Tajawal, sans-serif', color: '#334155' }}>
                      <input type="checkbox" checked={(editSvc as Record<string, unknown>)[f.key] as boolean || false} onChange={e => setEditSvc(p => ({ ...p, [f.key]: e.target.checked }))} />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleEditService} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 8, background: saving ? '#94A3B8' : '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
                <button onClick={() => setShowEditModal(false)} style={{ padding: '11px 18px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', width: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: 0 }}>إضافة خدمة جديدة</h2>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[{ label: 'اسم الخدمة', key: 'name', placeholder: 'تنظيف الأسنان' }, { label: 'الفئة', key: 'category', placeholder: 'وقاية' }].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                      <input value={(newSvc as Record<string, unknown>)[f.key] as string} onChange={e => setNewSvc(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[{ label: 'المدة (دق)', key: 'duration_minutes' }, { label: 'Buffer (دق)', key: 'buffer_minutes' }, { label: 'السعر (ريال)', key: 'price' }].map(f => (
                    <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{f.label}</label>
                      <input type="number" min={0} value={(newSvc as Record<string, unknown>)[f.key] as number} onChange={e => setNewSvc(p => ({ ...p, [f.key]: Number(e.target.value) }))}
                        style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', textAlign: 'center' }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {[{ label: 'يحتاج موافقة', key: 'requires_approval' }, { label: 'متاح للحجز الذكي', key: 'available_for_ai' }].map(f => (
                    <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Tajawal, sans-serif', color: '#334155' }}>
                      <input type="checkbox" checked={(newSvc as Record<string, unknown>)[f.key] as boolean} onChange={e => setNewSvc(p => ({ ...p, [f.key]: e.target.checked }))} />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleAddService} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 8, background: saving ? '#94A3B8' : '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                  {saving ? 'جاري الحفظ...' : 'إضافة الخدمة'}
                </button>
                <button onClick={() => setShowAddModal(false)} style={{ padding: '11px 18px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
