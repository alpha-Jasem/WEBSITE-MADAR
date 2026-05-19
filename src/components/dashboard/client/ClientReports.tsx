import { BarChart3 } from 'lucide-react'
import { MiniChart } from '../shared/MiniChart'
import { mockChartData } from '../../../lib/mockData'

export const ClientReports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-white font-cairo">التقارير</h1>
      <p className="text-sm text-slate-500 font-tajawal">تحليلات أداء الأتمتة</p>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {[
        { title: 'الرسائل اليومية', data: mockChartData.weeklyMessages, dataKey: 'messages', color: '#4F6EF7', type: 'area' as const },
        { title: 'العملاء المحتملون يومياً', data: mockChartData.weeklyLeads, dataKey: 'leads', color: '#10B981', type: 'bar' as const },
      ].map(({ title, data, dataKey, color, type }) => (
        <div key={title} className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} style={{ color }} />
            <h3 className="text-sm font-bold text-white font-cairo">{title}</h3>
          </div>
          <MiniChart data={data} dataKey={dataKey} color={color} type={type} height={180} />
        </div>
      ))}
    </div>

    <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <h3 className="text-sm font-bold text-white font-cairo mb-6">ملخص الأداء الشهري</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الرسائل', value: '18,240', color: '#4F6EF7' },
          { label: 'عملاء محتملون', value: '128', color: '#10B981' },
          { label: 'معدل التحويل', value: '31%', color: '#8B5CF6' },
          { label: 'توفير الوقت', value: '240 ساعة', color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}22` }}>
            <p className="text-2xl font-bold font-sora mb-1" style={{ color }}>{value}</p>
            <p className="text-xs text-slate-500 font-tajawal">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
)
