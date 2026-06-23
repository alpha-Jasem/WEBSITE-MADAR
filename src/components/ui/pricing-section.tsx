"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { Car, CheckCheck, BarChart3, Zap, Users, Sparkles, ArrowLeft, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { openWhatsAppChat } from "@/lib/whatsapp";

const plans = [
  {
    name: "Pro",
    description: "للمغسلة التي تريد نظام تشغيل كامل بسرعة: QR، شاشة عرض، عملاء، مالية، تقارير، ومساعد مدار AI.",
    launchPrice: 500,
    regularPrice: 799,
    monthlyPrice: 500,
    yearlyPrice: 4800,
    regularYearly: 799,
    buttonText: "احجز Pro على واتساب",
    popular: false,
    accentColor: "#0EA5E9",
    features: [
      { text: "QR للتسجيل الذاتي", icon: <Car size={18} /> },
      { text: "لوحة تشغيل السيارات", icon: <BarChart3 size={18} /> },
      { text: "شاشة عرض مباشرة", icon: <Zap size={18} /> },
    ],
    includes: [
      "يشمل أيضاً:",
      "العملاء والولاء",
      "VAT وإغلاق اليوم",
      "مساعد مدار AI",
    ],
  },
  {
    name: "Premium",
    description: "للمغسلة التي تريد إعداداً أعمق، أولوية دعم، وتقارير متقدمة وتوسعة جاهزة للفروع والإضافات.",
    launchPrice: 1000,
    regularPrice: 1999,
    monthlyPrice: 1000,
    yearlyPrice: 9600,
    regularYearly: 1999,
    buttonText: "احجز Premium على واتساب",
    popular: true,
    accentColor: "#7C3AED",
    features: [
      { text: "كل مزايا Pro", icon: <Users size={18} /> },
      { text: "تحليل أداء الموظفين", icon: <BarChart3 size={18} /> },
      { text: "تقارير متقدمة", icon: <Zap size={18} /> },
    ],
    includes: [
      "يشمل أيضاً:",
      "دعم أولوية",
      "تجهيز توسعة الفروع",
      "إعداد وتشغيل مخصص",
    ],
  },
];

const PricingSwitch = ({ onSwitch }: { onSwitch: (value: string) => void }) => {
  const [selected, setSelected] = useState("0");
  const handleSwitch = (value: string) => { setSelected(value); onSwitch(value); };

  return (
    <div className="flex justify-center" dir="rtl">
      <div className="relative z-50 mx-auto flex w-fit rounded-full bg-white border border-sky-200 shadow-sm p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={`relative z-10 sm:h-11 h-9 rounded-full sm:px-7 px-4 font-medium font-cairo transition-colors text-sm ${
            selected === "0" ? "text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {selected === "0" && (
            <motion.span
              layoutId="switch"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-400/40"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">شهري</span>
        </button>
        <button
          onClick={() => handleSwitch("1")}
          className={`relative z-10 sm:h-11 h-9 flex-shrink-0 rounded-full sm:px-7 px-4 font-medium font-cairo transition-colors text-sm ${
            selected === "1" ? "text-white" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {selected === "1" && (
            <motion.span
              layoutId="switch"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-400/40"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            سنوي
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              وفّر 20%
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const pricingRef = useRef<HTMLDivElement>(null);

  const revealVariants = {
    visible: (i: number) => ({
      y: 0, opacity: 1, filter: "blur(0px)",
      transition: { delay: i * 0.12, duration: 0.5 },
    }),
    hidden: { filter: "blur(8px)", y: -16, opacity: 0 },
  };

  return (
    <div
      className="px-4 pt-16 pb-16 min-h-screen mx-auto relative"
      style={{ background: "linear-gradient(160deg, #EFF6FF 0%, #F0FDFB 50%, #F5F3FF 100%)" }}
      ref={pricingRef}
      dir="rtl"
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(14,165,233,0.12) 0%, transparent 70%)" }} />

      {/* Badge */}
      <div className="flex justify-center mb-5 relative z-10">
        <TimelineContent as="span" animationNum={0}
          timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
          customVariants={revealVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold font-cairo text-sky-700 bg-sky-100 border border-sky-200"
        >
          <Tag size={12} /> الباقات
        </TimelineContent>
      </div>

      {/* Heading */}
      <div className="text-center mb-6 max-w-2xl mx-auto relative z-10">
        <TimelineContent as="h2" animationNum={1}
          timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
          customVariants={revealVariants}
          className="md:text-5xl sm:text-4xl text-3xl font-black font-cairo text-slate-900 mb-4 leading-tight"
        >
          اختر الباقة وابدأ تشغيل{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-sky-600">المغسلة بدون تعقيد</span>
            <span className="absolute bottom-1 left-0 right-0 h-3 bg-sky-100 rounded-full -z-0" />
          </span>
        </TimelineContent>

        <TimelineContent as="p" animationNum={2}
          timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
          customVariants={revealVariants}
          className="text-sm text-slate-500 font-tajawal"
        >
          بعد التحويل، نفّعل الحساب بدوياً. تم تضيف أي تكاملات اختيارية عند الحاجة.
        </TimelineContent>
      </div>

      {/* Switch */}
      <TimelineContent as="div" animationNum={3}
        timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
        customVariants={revealVariants}
        className="relative z-10 mb-8"
      >
        <PricingSwitch onSwitch={(v) => setIsYearly(Number.parseInt(v) === 1)} />
      </TimelineContent>

      {/* Plans */}
      <div className="grid md:grid-cols-2 max-w-3xl gap-6 mx-auto relative z-10">
        {plans.map((plan, index) => {
          const displayPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const regularPrice = isYearly ? plan.regularYearly * 12 : plan.regularPrice;
          return (
            <TimelineContent key={plan.name} as="div" animationNum={4 + index}
              timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
              customVariants={revealVariants}
            >
              <Card className={`relative overflow-hidden h-full border-0 shadow-xl ${
                plan.popular
                  ? "ring-2 ring-violet-400"
                  : "ring-1 ring-sky-200"
              }`}
                style={{
                  background: plan.popular
                    ? "linear-gradient(145deg, #FAFAFF 0%, #F5F0FF 100%)"
                    : "linear-gradient(145deg, #FAFDFF 0%, #EFF8FF 100%)"
                }}
              >
                {/* Top bar */}
                <div className="h-1 w-full" style={{
                  background: `linear-gradient(90deg, ${plan.accentColor}, ${plan.popular ? '#A855F7' : '#38BDF8'})`
                }} />

                <CardHeader className="text-right pb-3">
                  <div className="flex justify-between items-start mb-1">
                    {plan.popular ? (
                      <span className="inline-flex items-center gap-1 bg-violet-600 text-white px-3 py-1 rounded-full text-xs font-bold font-cairo shadow-sm">
                        <Sparkles size={10} /> الأكثر طلباً
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold font-cairo">
                        <Tag size={10} /> عرض الإطلاق
                      </span>
                    )}
                    <h3 className="text-3xl font-black font-cairo text-slate-900">{plan.name}</h3>
                  </div>

                  <p className="text-xs text-slate-500 font-tajawal leading-relaxed text-right mb-3">
                    {plan.description}
                  </p>

                  {/* Price block */}
                  <div className="rounded-2xl p-4 text-right"
                    style={{ background: plan.popular ? "rgba(124,58,237,0.06)" : "rgba(14,165,233,0.06)" }}
                  >
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-slate-400 font-tajawal text-sm">/{isYearly ? "سنة" : "شهر"}</span>
                      <span className="text-slate-900 font-black font-cairo" style={{ fontSize: 42 }}>
                        {displayPrice.toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xl font-bold text-slate-600">ر.س</span>
                    </div>

                    {/* Launch offer note */}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs text-slate-400 font-tajawal line-through">
                        {regularPrice.toLocaleString('ar-SA')} ر.س
                      </span>
                      <span className="text-xs font-bold font-cairo" style={{ color: plan.accentColor }}>
                        سعر الإطلاق لأول 5 مغاسل
                      </span>
                    </div>

                    {isYearly && (
                      <p className="text-xs text-emerald-600 font-tajawal mt-0.5">
                        ✓ وفّرت {Math.round(plan.monthlyPrice * 12 - plan.yearlyPrice).toLocaleString('ar-SA')} ر.س مقارنة بالشهري
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <button
                    onClick={() => openWhatsAppChat()}
                    className="w-full mb-5 p-3.5 text-base font-bold font-cairo rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:opacity-90 active:scale-95 text-white shadow-lg"
                    style={{
                      background: plan.popular
                        ? "linear-gradient(135deg, #7C3AED, #A855F7)"
                        : "linear-gradient(135deg, #0284C7, #38BDF8)",
                      boxShadow: plan.popular
                        ? "0 8px 24px rgba(124,58,237,0.35)"
                        : "0 8px 24px rgba(14,165,233,0.35)"
                    }}
                  >
                    {plan.buttonText}
                    <ArrowLeft size={15} />
                  </button>

                  <ul className="space-y-2.5 font-tajawal py-4 border-t border-b"
                    style={{ borderColor: plan.popular ? "rgba(124,58,237,0.12)" : "rgba(14,165,233,0.12)" }}
                  >
                    {plan.features.map((feature, fi) => (
                      <li key={fi} className="flex items-center gap-2.5 justify-end">
                        <span className="text-sm text-slate-600">{feature.text}</span>
                        <span style={{ color: plan.accentColor }}>{feature.icon}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-2.5 pt-4">
                    <h4 className="font-bold text-xs font-cairo text-slate-500 text-right uppercase tracking-wide">
                      {plan.includes[0]}
                    </h4>
                    <ul className="space-y-2">
                      {plan.includes.slice(1).map((f, fi) => (
                        <li key={fi} className="flex items-center gap-2.5 justify-end">
                          <span className="text-sm text-slate-600 font-tajawal">{f}</span>
                          <CheckCheck size={16} style={{ color: plan.accentColor, flexShrink: 0 }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TimelineContent>
          );
        })}
      </div>

      <TimelineContent as="p" animationNum={7}
        timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
        customVariants={revealVariants}
        className="text-center text-xs text-slate-400 font-tajawal max-w-md mx-auto relative z-10 mt-8"
      >
        لا عقود طويلة — يمكنك الإلغاء في أي وقت. جرّب النظام وشوف الفرق بنفسك.
      </TimelineContent>
    </div>
  );
}
