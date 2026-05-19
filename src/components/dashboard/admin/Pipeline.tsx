import { motion } from 'framer-motion'
import { useState } from 'react'
import { Clock, MoreHorizontal, DollarSign } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const columns = [
  { id: 'new', ar: 'جديد', en: 'New', color: '#4F6EF7', count: 3 },
  { id: 'qualified', ar: 'مؤهل', en: 'Qualified', color: '#D4A853', count: 2 },
  { id: 'viewing', ar: 'عرض', en: 'Viewing', color: '#10B981', count: 1 },
  { id: 'offer', ar: 'عرض سعر', en: 'Offer', color: '#8B5CF6', count: 1 },
  { id: 'closed', ar: 'مغلق', en: 'Closed', color: '#06B6D4', count: 1 },
]

const leads = [
  { id: '1', status: 'new', name: 'نورة الشهري', nameEn: 'Nora Al-Shehri', detail: '3 غرف - العليا', detailEn: '3-bed Al Olaya', price: '2.5M', time: '12 دقيقة', timeEn: '12m ago', avatar: 'NS' },
  { id: '2', status: 'new', name: 'خالد المطيري', nameEn: 'Khaled Al-Mutairi', detail: 'فيلا - النخيل', detailEn: 'Villa Al Nakheel', price: '15K/شهر', time: 'ساعة', timeEn: '1h ago', avatar: 'KM' },
  { id: '3', status: 'new', name: 'سارة بن محفوظ', nameEn: 'Sara Bin Mahfouz', detail: 'استوديو - KAFD', detailEn: 'Studio KAFD', price: '4.5K/شهر', time: '3 ساعات', timeEn: '3h ago', avatar: 'SM' },
  { id: '4', status: 'qualified', name: 'عمر الغامدي', nameEn: 'Omar Al-Ghamdi', detail: 'بنتهاوس - الياسمين', detailEn: 'Penthouse Al Yasmin', price: '6M', time: 'أمس', timeEn: 'Yesterday', avatar: 'OG' },
  { id: '5', status: 'qualified', name: 'ليلى الدوسري', nameEn: 'Layla Al-Dosari', detail: 'تاون هاوس - الملقا', detailEn: 'Townhouse Al Malqa', price: '1.9M', time: 'يومان', timeEn: '2d ago', avatar: 'LD' },
  { id: '6', status: 'viewing', name: 'فهد الرشيد', nameEn: 'Fahad Al-Rasheed', detail: '3 غرف - العليا', detailEn: '3-bed Al Olaya', price: '2.5M', time: 'السبت 14:00', timeEn: 'Sat 14:00', avatar: 'FR' },
  { id: '7', status: 'offer', name: 'مريم القحطاني', nameEn: 'Mariam Al-Qahtani', detail: 'فيلا - قرطبة', detailEn: 'Villa Qurtubah', price: '12.5K/شهر', time: 'عرض قُدِّم', timeEn: 'Offered', avatar: 'MQ' },
  { id: '8', status: 'closed', name: 'يزيد العتيبي', nameEn: 'Yazeed Al-Otaibi', detail: 'استوديو - KAFD', detailEn: 'Studio KAFD', price: '4.2K/شهر', time: 'موقَّع', timeEn: 'Signed', avatar: 'YO' },
]

type Lead = typeof leads[0]

export const Pipeline = () => {
  const { language, t } = useLanguage()
  const [items, setItems] = useState(leads)
  const [dragId, setDragId] = useState<string | null>(null)

  const getColumnLeads = (colId: string) => items.filter((l) => l.status === colId)

  const handleDragStart = (id: string) => setDragId(id)

  const handleDrop = (colId: string) => {
    if (!dragId) return
    setItems((prev) => prev.map((l) => (l.id === dragId ? { ...l, status: colId } : l)))
    setDragId(null)
  }

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('Pipeline', 'Pipeline')}
        </h1>
        <p className={`text-slate-500 text-sm mt-1 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
          {items.length} {t('عميل محتمل', 'leads total')}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = getColumnLeads(col.id)
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.id)}
              className="flex-shrink-0 w-64"
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className={`text-sm font-medium text-slate-300 ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                    {language === 'ar' ? col.ar : col.en}
                  </span>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-work"
                  style={{ background: `${col.color}20`, color: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[200px] rounded-xl p-2 border border-dashed border-white/8 transition-colors"
                style={dragId ? { borderColor: `${col.color}40`, background: `${col.color}05` } : {}}>
                {colLeads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    whileHover={{ scale: 1.02 }}
                    whileDrag={{ scale: 1.05, opacity: 0.8 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-3.5 border border-white/8 hover:border-white/15 cursor-grab active:cursor-grabbing transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `${col.color}30`, border: `1px solid ${col.color}50` }}
                        >
                          {lead.avatar}
                        </div>
                        <div>
                          <p className={`text-xs font-semibold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
                            {language === 'ar' ? lead.name : lead.nameEn}
                          </p>
                          <p className={`text-xs text-slate-500 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                            {language === 'ar' ? lead.detail : lead.detailEn}
                          </p>
                        </div>
                      </div>
                      <button className="text-slate-600 hover:text-slate-400 p-0.5">
                        <MoreHorizontal size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <DollarSign size={11} className="text-gold-500" />
                        <span className="text-xs font-semibold text-gold-400 font-outfit">{lead.price}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-slate-600" />
                        <span className={`text-xs text-slate-600 ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>
                          {language === 'ar' ? lead.time : lead.timeEn}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
