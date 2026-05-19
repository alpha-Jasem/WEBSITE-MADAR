import { motion } from "framer-motion"
import { TrendingUp, MessageSquare, Calendar, Users, Zap, CheckCircle2, Clock, Bot } from "lucide-react"
import { ContainerScroll } from "../ui/container-scroll-animation"
import { useLanguage } from "../../context/LanguageContext"

const stats = [
  { icon: MessageSquare, value: "١٢,٤٨٠", label: "رسالة اليوم",   color: "#00BFFF", bg: "rgba(0,191,255,0.1)" },
  { icon: Calendar,      value: "٣٤٨",    label: "حجز تلقائي",    color: "#4A9EFF", bg: "rgba(74,158,255,0.1)" },
  { icon: TrendingUp,    value: "٧٨٪",    label: "معدل التحويل",  color: "#00BFFF", bg: "rgba(0,191,255,0.1)" },
  { icon: Clock,         value: "٠.٨ث",   label: "متوسط الرد",    color: "#4A9EFF", bg: "rgba(74,158,255,0.1)" },
]

const recentLeads = [
  { name: "أحمد المالكي",   type: "عقارات",  status: "مؤهَّل",  time: "الآن",    dot: "#00BFFF" },
  { name: "سارة العمري",    type: "عيادة",   status: "محجوز",   time: "٢ د",     dot: "#4A9EFF" },
  { name: "خالد الدوسري",   type: "عقارات",  status: "متابعة",  time: "٥ د",     dot: "#00BFFF" },
  { name: "منيرة السبيعي",  type: "عيادة",   status: "محجوز",   time: "٨ د",     dot: "#4A9EFF" },
  { name: "فهد الشمري",     type: "عقارات",  status: "جديد",    time: "١٢ د",    dot: "#1E90FF" },
]

const barHeights = [35, 55, 42, 70, 58, 85, 65, 90, 75, 95, 80, 100]
const barMonths  = ["ي","ف","م","أ","م","ي","ي","أ","س","أ","ن","د"]

const DashboardContent = () => (
  <div className="h-full w-full flex flex-col overflow-hidden select-none" dir="rtl">
    {/* Top bar */}
    <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0D1B3E,#0099CC)" }}>
          <Bot size={13} className="text-white" />
        </div>
        <span className="text-white text-xs font-semibold font-cairo">MADAR AI — لوحة التحكم</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px] font-work">مباشر</span>
        </div>
        <div className="px-2 py-0.5 rounded text-[10px] font-work" style={{ background: "rgba(0,191,255,0.1)", color: "#00BFFF", border: "1px solid rgba(0,191,255,0.2)" }}>
          اليوم
        </div>
      </div>
    </div>

    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <div className="hidden md:flex flex-col gap-1 px-2 py-3 border-l" style={{ borderColor: "rgba(255,255,255,0.05)", width: 120, background: "rgba(255,255,255,0.01)" }}>
        {[
          { icon: TrendingUp, label: "الإحصاءات", active: true },
          { icon: MessageSquare, label: "المحادثات" },
          { icon: Calendar, label: "الحجوزات" },
          { icon: Users, label: "العملاء" },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer" style={{ background: item.active ? "rgba(0,191,255,0.1)" : "transparent", border: item.active ? "1px solid rgba(0,191,255,0.2)" : "1px solid transparent" }}>
              <Icon size={12} style={{ color: item.active ? "#00BFFF" : "#3B5280" }} />
              <span className="text-[10px] font-cairo" style={{ color: item.active ? "#00BFFF" : "#3B5280" }}>{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden p-3 flex flex-col gap-3">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {stats.map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl p-2.5 flex items-center gap-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                  <Icon size={13} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white font-cairo leading-none">{s.value}</div>
                  <div className="text-[9px] mt-0.5 font-tajawal" style={{ color: "rgba(255,255,255,0.55)" }}>{s.label}</div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Chart + Leads */}
        <div className="flex gap-3 flex-1 overflow-hidden">
          {/* Bar chart */}
          <div className="flex-1 rounded-xl p-3 flex flex-col" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-white font-cairo">نمو المحادثات</span>
              <span className="text-[9px] font-work" style={{ color: "#00BFFF" }}>+١٧٢٪</span>
            </div>
            <div className="flex-1 flex items-end gap-1 pb-1">
              {barHeights.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: h >= 80 ? "linear-gradient(to top,#0099CC,#00BFFF)" : "rgba(0,153,204,0.35)" }}
                />
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {barMonths.map((m, i) => (
                <div key={i} className="flex-1 text-center text-[7px] font-cairo" style={{ color: "#1E3A6E" }}>{m}</div>
              ))}
            </div>
          </div>

          {/* Recent leads */}
          <div className="w-44 rounded-xl p-3 flex flex-col" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[10px] font-bold text-white font-cairo mb-2">آخر العملاء</span>
            <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
              {recentLeads.map((lead, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lead.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-cairo text-white truncate">{lead.name}</div>
                    <div className="text-[8px] font-tajawal" style={{ color: "rgba(255,255,255,0.55)" }}>{lead.type}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] px-1.5 py-0.5 rounded font-cairo" style={{ background: "rgba(0,191,255,0.1)", color: "#00BFFF" }}>{lead.status}</span>
                    <span className="text-[7px] font-work mt-0.5" style={{ color: "#1E3A6E" }}>{lead.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom AI activity */}
        <div className="rounded-xl px-3 py-2 flex items-center gap-3" style={{ background: "rgba(0,191,255,0.05)", border: "1px solid rgba(0,191,255,0.12)" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#0D1B3E,#0099CC)" }}>
            <Zap size={11} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-cairo text-white">وكيل AI نشط</span>
              <div className="flex items-center gap-0.5">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-1 h-1 rounded-full" style={{ background: "#00BFFF" }}
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </div>
            <div className="text-[9px] font-tajawal" style={{ color: "rgba(255,255,255,0.55)" }}>يعالج ٢٣ محادثة الآن — متوسط الرد ٠.٨ ثانية</div>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 size={12} style={{ color: "#00BFFF" }} />
            <span className="text-[9px] font-work" style={{ color: "#00BFFF" }}>٩٩.٩٪ uptime</span>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export const ScrollShowcase = () => {
  const { language, t } = useLanguage()

  return (
    <section className="relative overflow-hidden" style={{ background: "#080E1C" }}>
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,191,255,0.3),transparent)" }} />

      <ContainerScroll
        titleComponent={
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.2)" }}>
              <Zap size={12} style={{ color: "#00BFFF" }} />
              <span className={`text-xs font-semibold tracking-widest uppercase ${language === "ar" ? "font-cairo" : "font-work"}`} style={{ color: "#00BFFF" }}>
                {t("لوحة تحكم مدار", "MADAR Dashboard")}
              </span>
            </div>
            <h2 className={`text-3xl sm:text-5xl font-bold leading-tight ${language === "ar" ? "font-cairo" : "font-sora"}`} style={{ color: "white" }}>
              {t(
                <>نظامك يعمل<br /><span style={{ background: "linear-gradient(135deg,#0D1B3E,#0099CC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>وأنت نايم</span></>,
                <>Your System Works<br /><span style={{ background: "linear-gradient(135deg,#0D1B3E,#0099CC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>While You Sleep</span></>
              )}
            </h2>
            <p className={`text-base sm:text-lg max-w-xl mx-auto ${language === "ar" ? "font-tajawal" : "font-work"}`} style={{ color: "rgba(255,255,255,0.55)" }}>
              {t(
                "ردود تلقائية، حجوزات فورية، ومتابعة مستمرة — كل شيء في لوحة واحدة.",
                "Auto responses, instant bookings, and continuous follow-ups — all in one dashboard."
              )}
            </p>
          </div>
        }
      >
        <DashboardContent />
      </ContainerScroll>
    </section>
  )
}
