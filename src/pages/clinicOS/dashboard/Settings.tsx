import { useState } from 'react'
import { Building, Calendar, MessageSquare, Bot, Users, Bell, CreditCard, Settings as SettingsIcon } from 'lucide-react'
import { UpgradeCard } from '../../../components/clinicOS/ui/UpgradeCard'
import { useClinicOS } from '../../../context/ClinicOSContext'

const SECTIONS = [
  { id: 'clinic', icon: Building, label: 'بيانات العيادة' },
  { id: 'booking', icon: SettingsIcon, label: 'قواعد الحجز' },
  { id: 'calendar', icon: Calendar, label: 'إعدادات التقويم' },
  { id: 'whatsapp', icon: MessageSquare, label: 'إعدادات واتساب' },
  { id: 'ai', icon: Bot, label: 'إعدادات الحجز الذكي' },
  { id: 'users', icon: Users, label: 'المستخدمون والصلاحيات' },
  { id: 'notifications', icon: Bell, label: 'الإشعارات' },
  { id: 'billing', icon: CreditCard, label: 'الباقة والفوترة' },
]

const FIELD = ({ label, value, type = 'text' }: { label: string; value?: string; type?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>{label}</label>
    <input type={type} defaultValue={value} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl' }} />
  </div>
)

export const Settings = () => {
  const [activeSection, setActiveSection] = useState('clinic')
  const { packageType } = useClinicOS()
  const isAIPro = packageType === 'ai_pro'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, direction: 'rtl' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 4px 0' }}>الإعدادات</h1>
        <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>إدارة تفضيلات العيادة وقواعد الحجز والمستخدمين</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '8px', flexShrink: 0 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, marginBottom: 2, border: 'none', background: activeSection === s.id ? '#EEF2FF' : 'transparent', color: activeSection === s.id ? '#4F46E5' : '#475569', fontSize: 13, fontWeight: activeSection === s.id ? 700 : 500, cursor: 'pointer', fontFamily: 'Tajawal, Cairo, sans-serif', textAlign: 'right' }}>
                <Icon size={15} />
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '24px' }}>
          {activeSection === 'clinic' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>بيانات العيادة</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <FIELD label="اسم العيادة" value="عيادات نور للأسنان" />
                <FIELD label="رقم الهاتف" value="0112345678" type="tel" />
                <FIELD label="المدينة" value="جدة" />
                <FIELD label="العنوان" value="حي الروضة، شارع الأمير سلطان" />
                <FIELD label="البريد الإلكتروني" value="info@noor-dental.sa" type="email" />
              </div>
              <button style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>حفظ التغييرات</button>
            </div>
          )}

          {activeSection === 'booking' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>قواعد الحجز</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'مدة الموعد الافتراضية', value: '30 دقيقة' },
                  { label: 'وقت الانتظار بين المواعيد', value: '5 دقائق' },
                  { label: 'أقل وقت للحجز المسبق', value: '2 ساعة' },
                  { label: 'أقصى حجز مسبق', value: '30 يوم' },
                ].map(f => <FIELD key={f.label} {...f} />)}
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['تأكيد تلقائي للمواعيد', 'السماح بإلغاء المريض', 'تفعيل قائمة الانتظار'].map(item => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{item}</span>
                  </label>
                ))}
              </div>
              <button style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>حفظ</button>
            </div>
          )}

          {activeSection === 'calendar' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>إعدادات التقويم</h2>
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', fontFamily: 'Cairo, sans-serif' }}>تقويم العيادة — متصل</div>
                    <div style={{ fontSize: 12, color: '#065F46', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>آخر مزامنة: منذ 5 دقائق · 18 حدث اليوم</div>
                  </div>
                  <button style={{ padding: '7px 14px', borderRadius: 8, background: '#FFFFFF', color: '#059669', border: '1px solid #A7F3D0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إعادة المزامنة</button>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7 }}>جدول العيادة يبقى محدثاً تلقائياً. أي حدث محظور في التقويم يمنع الحجز في نفس الوقت.</p>
            </div>
          )}

          {activeSection === 'whatsapp' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>إعدادات واتساب</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <FIELD label="رقم واتساب العيادة" value="0112345678" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>وقت التذكير</label>
                  <select style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}>
                    <option>24 ساعة قبل الموعد</option>
                    <option>12 ساعة قبل الموعد</option>
                    <option>3 ساعات قبل الموعد</option>
                  </select>
                </div>
              </div>
              <button style={{ padding: '10px 24px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>حفظ</button>
            </div>
          )}

          {activeSection === 'ai' && (
            isAIPro ? (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>إعدادات الحجز الذكي</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <FIELD label="اسم المساعد" value="نورة" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>اللغة</label>
                    <select style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none' }}><option>العربية</option><option>الإنجليزية</option></select>
                  </div>
                  <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, color: '#334155', fontFamily: 'Cairo, sans-serif' }}>رسالة الترحيب</label>
                    <textarea defaultValue="أهلاً وسهلاً، عيادات نور للأسنان، أنا نورة كيف أساعدك؟" rows={3} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, fontFamily: 'Tajawal, sans-serif', outline: 'none', direction: 'rtl', resize: 'vertical' }} />
                  </div>
                </div>
                <button style={{ marginTop: 20, padding: '10px 24px', borderRadius: 8, background: '#4F46E5', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>حفظ</button>
              </div>
            ) : <UpgradeCard compact />
          )}

          {activeSection === 'users' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>المستخدمون والصلاحيات</h2>
              {[
                { name: 'د. أحمد الحربي', role: 'مالك', email: 'demo@clinic.sa' },
                { name: 'سارة المطيري', role: 'مسؤول', email: 'sara@clinic.sa' },
                { name: 'فيصل الزيد', role: 'استقبال', email: 'faisal@clinic.sa' },
              ].map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #F8FAFC' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4F46E540, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{u.name.charAt(0)}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: i === 0 ? '#EEF2FF' : '#F8FAFC', color: i === 0 ? '#4F46E5' : '#64748B', fontWeight: 700, fontFamily: 'Cairo, sans-serif', border: `1px solid ${i === 0 ? '#C7D2FE' : '#E2E8F0'}` }}>{u.role}</span>
                </div>
              ))}
              <button style={{ marginTop: 16, padding: '9px 20px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>إضافة مستخدم</button>
            </div>
          )}

          {activeSection === 'billing' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px 0' }}>الباقة والفوترة</h2>
              <div style={{ padding: '20px', borderRadius: 12, background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)', border: '1px solid #C7D2FE', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#4F46E5', fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>{isAIPro ? 'باقة الحجز الذكي 24/7' : 'باقة نمو الحجوزات'}</div>
                <div style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>وضع التجربة · تجديد: غير محدد</div>
                <div style={{ marginTop: 12, fontSize: 20, fontWeight: 900, color: '#0F172A', fontFamily: 'Cairo, sans-serif' }}>{isAIPro ? '19,900 ريال / سنة' : '6,900 ريال / سنة'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!isAIPro && <button style={{ padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>ترقية إلى الحجز الذكي 24/7</button>}
                <button style={{ padding: '10px 20px', borderRadius: 8, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>تواصل عبر واتساب</button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', fontFamily: 'Cairo, sans-serif', margin: '0 0 20px 0' }}>الإشعارات</h2>
              {['موعد جديد', 'موعد ملغي', 'تعارض في الجدول', 'المريض لم يؤكد', 'رسالة واتساب فاشلة', 'طلب مراجعة من الحجز الذكي'].map(n => (
                <label key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F8FAFC', cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{n}</span>
                  <input type="checkbox" defaultChecked style={{ width: 16, height: 16 }} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
