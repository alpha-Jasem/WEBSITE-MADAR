"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import NumberFlow from "@number-flow/react";
import { Car, CheckCheck, BarChart3, Zap, Users, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { openWhatsAppChat } from "@/lib/whatsapp";

const plans = [
  {
    name: "Pro",
    description: "للمغسلة التي تريد نظام تشغيل كامل بسرعة: QR، شاشة عرض، عملاء، مالية، تقارير، ومساعد مدار AI.",
    monthlyPrice: 799,
    yearlyPrice: 7670,
    buttonText: "احجز Pro على واتساب",
    buttonVariant: "outline" as const,
    popular: false,
    features: [
      { text: "QR للتسجيل الذاتي", icon: <Car size={20} /> },
      { text: "لوحة تشغيل السيارات", icon: <BarChart3 size={20} /> },
      { text: "شاشة عرض مباشرة", icon: <Zap size={20} /> },
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
    monthlyPrice: 1999,
    yearlyPrice: 19190,
    buttonText: "احجز Premium على واتساب",
    buttonVariant: "default" as const,
    popular: true,
    features: [
      { text: "كل مزايا Pro", icon: <Users size={20} /> },
      { text: "تحليل أداء الموظفين", icon: <BarChart3 size={20} /> },
      { text: "تقارير متقدمة", icon: <Zap size={20} /> },
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

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center" dir="rtl">
      <div className="relative z-50 mx-auto flex w-fit rounded-full bg-neutral-50 border border-gray-200 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={`relative z-10 w-fit sm:h-12 h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium font-cairo transition-colors ${
            selected === "0" ? "text-white" : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "0" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">شهري</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={`relative z-10 w-fit sm:h-12 h-8 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium font-cairo transition-colors ${
            selected === "1" ? "text-white" : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "1" && (
            <motion.span
              layoutId="switch"
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-blue-600 border-blue-600 bg-gradient-to-t from-blue-500 via-blue-400 to-blue-600"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            سنوي
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-black">
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
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { delay: i * 0.15, duration: 0.55 },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) =>
    setIsYearly(Number.parseInt(value) === 1);

  return (
    <div
      className="px-4 pt-20 pb-16 min-h-screen mx-auto relative bg-neutral-100"
      ref={pricingRef}
      dir="rtl"
    >
      {/* Background glow */}
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at center, #206ce8 0%, transparent 70%)`,
          opacity: 0.5,
          mixBlendMode: "multiply",
        }}
      />

      {/* Heading */}
      <div className="text-center mb-6 max-w-3xl mx-auto relative z-10">
        <TimelineContent
          as="h2"
          animationNum={0}
          timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
          customVariants={revealVariants}
          className="md:text-6xl sm:text-4xl text-3xl font-black font-cairo text-gray-900 mb-4"
        >
          اختر الباقة وابدأ تشغيل{" "}
          <TimelineContent
            as="span"
            animationNum={1}
            timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
            customVariants={revealVariants}
            className="border border-dashed border-blue-500 px-2 py-1 rounded-xl bg-blue-100 inline-block"
          >
            المغسلة بدون تعقيد
          </TimelineContent>
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
          customVariants={revealVariants}
          className="sm:text-base text-sm text-gray-600 font-tajawal sm:w-[70%] w-[85%] mx-auto"
        >
          بعد التحويل، نفّعل الحساب بدوياً. تم تضيف أي تكاملات اختيارية عند الحاجة.
        </TimelineContent>
      </div>

      {/* Switch */}
      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
        customVariants={revealVariants}
        className="relative z-10"
      >
        <PricingSwitch onSwitch={togglePricingPeriod} />
      </TimelineContent>

      {/* Plans — 2 only, centered */}
      <div className="grid md:grid-cols-2 max-w-3xl gap-5 py-8 mx-auto relative z-10">
        {plans.map((plan, index) => (
          <TimelineContent
            key={plan.name}
            as="div"
            animationNum={4 + index}
            timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
            customVariants={revealVariants}
          >
            <Card
              className={`relative border-neutral-200 h-full ${
                plan.popular ? "ring-2 ring-blue-500 bg-blue-50" : "bg-white"
              }`}
            >
              <CardHeader className="text-right">
                <div className="flex justify-between items-start">
                  <div>
                    {plan.popular && (
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold font-cairo flex items-center gap-1 w-fit mb-2">
                        <Sparkles size={12} />
                        الأكثر طلباً
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-black font-cairo text-gray-900 mb-1">
                    {plan.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 font-tajawal mb-3 text-right">
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-gray-500 font-tajawal text-sm">
                    /{isYearly ? "سنة" : "شهر"}
                  </span>
                  <span className="text-4xl font-black font-cairo text-gray-900">
                    <NumberFlow
                      value={isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      className="text-4xl font-black"
                    />
                  </span>
                  <span className="text-2xl font-bold text-gray-700">ر.س</span>
                </div>
                {isYearly && (
                  <p className="text-xs text-green-600 font-tajawal text-right mt-1">
                    وفّرت {Math.round(plan.monthlyPrice * 12 - plan.yearlyPrice).toLocaleString('ar-SA')} ر.س مقارنة بالشهري
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <button
                  onClick={() => openWhatsAppChat()}
                  className={`w-full mb-6 p-4 text-lg font-bold font-cairo rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                    plan.popular
                      ? "bg-gradient-to-t from-blue-500 to-blue-600 shadow-lg shadow-blue-500/40 border border-blue-400 text-white"
                      : "bg-gradient-to-t from-neutral-800 to-neutral-600 shadow-lg shadow-neutral-900/40 border border-neutral-700 text-white"
                  }`}
                >
                  {plan.buttonText}
                  <ArrowLeft size={16} />
                </button>

                <ul className="space-y-3 font-tajawal py-4 border-b border-neutral-200">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3 justify-end">
                      <span className="text-sm text-gray-600">{feature.text}</span>
                      <span className="text-neutral-700 grid place-content-center flex-shrink-0">
                        {feature.icon}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 pt-4">
                  <h4 className="font-bold text-sm font-cairo text-gray-900 text-right">
                    {plan.includes[0]}
                  </h4>
                  <ul className="space-y-2">
                    {plan.includes.slice(1).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 justify-end">
                        <span className="text-sm text-gray-600 font-tajawal">{feature}</span>
                        <span className="h-6 w-6 bg-green-50 border border-blue-500 rounded-full grid place-content-center flex-shrink-0">
                          <CheckCheck className="h-4 w-4 text-blue-500" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TimelineContent>
        ))}
      </div>

      <TimelineContent
        as="p"
        animationNum={7}
        timelineRef={pricingRef as React.RefObject<HTMLElement | null>}
        customVariants={revealVariants}
        className="text-center text-sm text-gray-500 font-tajawal max-w-md mx-auto relative z-10"
      >
        لا عقود طويلة — يمكنك الإلغاء في أي وقت. جرّب النظام وشوف الفرق بنفسك.
      </TimelineContent>
    </div>
  );
}
