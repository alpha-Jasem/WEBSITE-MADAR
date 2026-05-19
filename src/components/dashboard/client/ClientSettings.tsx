import { User, Bell, Shield } from 'lucide-react'

export const ClientSettings = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-white font-cairo">الإعدادات</h1>
      <p className="text-sm text-slate-500 font-tajawal">إعدادات الحساب والإشعارات</p>
    </div>

    {[
      { icon: User, title: 'معلومات الحساب', items: ['الاسم الكامل', 'البريد الإلكتروني', 'رقم الهاتف'] },
      { icon: Bell, title: 'الإشعارات', items: ['تنبيه عميل جديد', 'تقرير أسبوعي', 'تنبيهات الأخطاء'] },
      { icon: Shield, title: 'الأمان', items: ['تغيير كلمة المرور', 'المصادقة الثنائية'] },
    ].map(({ icon: Icon, title, items }) => (
      <div key={title} className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <Icon size={16} className="text-primary-400" />
          <h3 className="text-sm font-bold text-white font-cairo">{title}</h3>
        </div>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-slate-400 font-tajawal">{item}</span>
              <button className="text-xs text-primary-400 hover:text-primary-300 font-tajawal cursor-pointer">تعديل</button>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)
