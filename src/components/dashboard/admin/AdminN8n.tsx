import { useState } from 'react'
import { motion } from 'framer-motion'
import { Workflow, Play, Pause, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

const mockWorkflows = [
  { id: '1', name: 'واتساب → CRM → رد تلقائي',        status: 'active',   runs: 1240, success: 98.2, lastRun: 'منذ دقيقتين',  trigger: 'Webhook' },
  { id: '2', name: 'حجز المواعيد + تذكير SMS',          status: 'active',   runs: 532,  success: 99.1, lastRun: 'منذ 5 دقائق',  trigger: 'Schedule' },
  { id: '3', name: 'تصنيف العملاء المحتملين بـ AI',    status: 'active',   runs: 873,  success: 95.7, lastRun: 'منذ 12 دقيقة', trigger: 'Webhook' },
  { id: '4', name: 'إرسال التقرير الأسبوعي',            status: 'inactive', runs: 48,   success: 100,  lastRun: 'منذ 3 أيام',   trigger: 'Schedule' },
  { id: '5', name: 'متابعة العملاء غير المستجيبين',    status: 'active',   runs: 310,  success: 96.8, lastRun: 'منذ ساعة',     trigger: 'Schedule' },
  { id: '6', name: 'إشعار الإدارة عند عميل جديد',      status: 'error',    runs: 92,   success: 78.3, lastRun: 'منذ 30 دقيقة', trigger: 'Webhook' },
]

const mockExecutions = [
  { id: 'e1', workflow: 'واتساب → CRM → رد تلقائي', status: 'success', time: '14:32:01', duration: '0.8s' },
  { id: 'e2', workflow: 'حجز المواعيد + تذكير SMS',  status: 'success', time: '14:30:45', duration: '1.2s' },
  { id: 'e3', workflow: 'تصنيف العملاء المحتملين بـ AI', status: 'success', time: '14:28:12', duration: '2.1s' },
  { id: 'e4', workflow: 'إشعار الإدارة عند عميل جديد', status: 'error',   time: '14:25:33', duration: '0.3s' },
  { id: 'e5', workflow: 'واتساب → CRM → رد تلقائي', status: 'success', time: '14:22:08', duration: '0.9s' },
  { id: 'e6', workflow: 'متابعة العملاء غير المستجيبين', status: 'success', time: '14:00:00', duration: '1.5s' },
]

const StatusDot = ({ status }: { status: string }) => {
  const map: Record<string, { color: string; label: string }> = {
    active:   { color: '#10B981', label: 'نشط' },
    inactive: { color: '#94A3B8', label: 'موقف' },
    error:    { color: '#F43F5E', label: 'خطأ' },
  }
  const s = map[status] ?? map.inactive
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: status === 'active' ? `0 0 6px ${s.color}` : 'none' }} />
      <span className="text-[11px] font-tajawal" style={{ color: s.color }}>{s.label}</span>
    </div>
  )
}

export const AdminN8n = () => {
  const [tab, setTab] = useState<'workflows' | 'executions'>('workflows')

  const activeCount   = mockWorkflows.filter(w => w.status === 'active').length
  const errorCount    = mockWorkflows.filter(w => w.status === 'error').length
  const totalRuns     = mockWorkflows.reduce((a, w) => a + w.runs, 0)
  const avgSuccess    = (mockWorkflows.reduce((a, w) => a + w.success, 0) / mockWorkflows.length).toFixed(1)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-cairo flex items-center gap-2">
            <Workflow size={22} style={{ color: '#EA580C' }} />
            n8n Workflows
          </h1>
          <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            مراجعة وإدارة تدفقات الأتمتة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal cursor-pointer transition-all"
            style={{ background: 'rgba(234,88,12,0.1)', border: '1px solid rgba(234,88,12,0.25)', color: '#EA580C' }}>
            <RefreshCw size={13} />
            تحديث
          </motion.button>
          <motion.a whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            href="https://n8n.io" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-tajawal cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #92400e, #EA580C)', color: 'white' }}>
            <ExternalLink size={13} />
            فتح n8n
          </motion.a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'تدفقات نشطة',    value: activeCount,          icon: Zap,         accent: '#10B981' },
          { label: 'أخطاء نشطة',     value: errorCount,           icon: XCircle,     accent: '#F43F5E' },
          { label: 'إجمالي التشغيل', value: totalRuns.toLocaleString(), icon: Play, accent: '#EA580C' },
          { label: 'معدل النجاح',    value: `${avgSuccess}%`,     icon: CheckCircle, accent: '#00BFFF' },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="p-4 rounded-2xl relative overflow-hidden"
            style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${k.accent}50, transparent)` }} />
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.accent}18` }}>
              <k.icon size={15} style={{ color: k.accent }} />
            </div>
            <p className="text-2xl font-bold font-sora text-white">{k.value}</p>
            <p className="text-xs font-tajawal mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {([
          { id: 'workflows',  label: 'التدفقات' },
          { id: 'executions', label: 'سجل التشغيل' },
        ] as { id: typeof tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-tajawal cursor-pointer transition-all"
            style={tab === t.id
              ? { background: 'rgba(234,88,12,0.15)', color: '#EA580C', border: '1px solid rgba(234,88,12,0.25)' }
              : { color: 'rgba(255,255,255,0.35)' }
            }>
            {t.label}
          </button>
        ))}
      </div>

      {/* Workflows Table */}
      {tab === 'workflows' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold text-white font-cairo">{mockWorkflows.length} تدفق مسجل</h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {mockWorkflows.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-tajawal truncate">{w.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-work px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                      {w.trigger}
                    </span>
                    <span className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      آخر تشغيل: {w.lastRun}
                    </span>
                  </div>
                </div>
                <div className="text-center hidden lg:block">
                  <p className="text-sm font-bold font-sora text-white">{w.runs.toLocaleString()}</p>
                  <p className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.3)' }}>تشغيلة</p>
                </div>
                <div className="text-center hidden lg:block">
                  <p className="text-sm font-bold font-sora" style={{ color: w.success >= 95 ? '#10B981' : w.success >= 80 ? '#F59E0B' : '#F43F5E' }}>
                    {w.success}%
                  </p>
                  <p className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.3)' }}>نجاح</p>
                </div>
                <StatusDot status={w.status} />
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}
                    title={w.status === 'active' ? 'إيقاف' : 'تشغيل'}>
                    {w.status === 'active' ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    style={{ background: 'rgba(0,191,255,0.1)', color: '#00BFFF' }}
                    title="تشغيل يدوي">
                    <RefreshCw size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Executions Log */}
      {tab === 'executions' && (
        <div className="rounded-2xl overflow-hidden" style={{ background: '#13161E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="text-sm font-bold text-white font-cairo">آخر التشغيلات</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-tajawal" style={{ color: 'rgba(255,255,255,0.3)' }}>مباشر</span>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {mockExecutions.map((ex, i) => (
              <motion.div key={ex.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: ex.status === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)' }}>
                  {ex.status === 'success'
                    ? <CheckCircle size={13} style={{ color: '#10B981' }} />
                    : <XCircle size={13} style={{ color: '#F43F5E' }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-tajawal truncate">{ex.workflow}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-work" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <Clock size={10} />
                  {ex.duration}
                </div>
                <span className="text-[10px] font-work" style={{ color: 'rgba(255,255,255,0.25)' }}>{ex.time}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
