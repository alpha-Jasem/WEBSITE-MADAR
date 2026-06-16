import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowLeft, MessageCircle, Calendar, Users, BarChart3, Clock, Phone, Star, ChevronDown, Zap, Shield, Bot, Bell } from 'lucide-react'
import { MadarNavbar } from '../components/public/MadarNavbar'
import { Footer } from '../components/public/Footer'
import { ScrollProgress } from '../components/shared/ScrollProgress'
import { WhatsAppButton } from '../components/shared/WhatsAppButton'
import { CustomCursor } from '../components/shared/CustomCursor'

const PHONE = '966546666005'
const wa = (msg = 'مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي') =>
  window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

const reveal = { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55 } }

/* ─── WA Button ─────────────────────────────────────────────────── */
const WaBtn = ({ label, msg, large }: { label: string; msg?: string; large?: boolean }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => wa(msg)}
    className="inline-flex items-center justify-center gap-2 cursor-pointer"
    style={{
      padding: large ? '15px 36px' : '12px 26px',
      borderRadius: 14,
      background: '#25D366',
      color: '#fff',
      fontFamily: 'Cairo, sans-serif',
      fontWeight: 900,
      fontSize: large ? 16 : 14,
      border: 'none',
      boxShadow: '0 6px 24px rgba(37,211,102,0.35)',
    }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.548 4.076 1.508 5.786L.057 23.886a.5.5 0 0 0 .614.613l6.098-1.45A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.643-.51-5.153-1.396l-.37-.22-3.827.91.924-3.835-.241-.384A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
    </svg>
    {label}
  </motion.button>
)

/* ─── 1. HERO ────────────────────────────────────────────────────── */
const Hero = () => (
  <section style={{ background: '#0D1B3E', paddingTop: 100, paddingBottom: 80, direction: 'rtl' }}>
    {/* grid dots */}
    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '52px 52px' }} />
    <div className="relative max-w-5xl mx-auto px-4 sm:px-8 text-center">

      {/* badge */}
      <motion.div {...reveal} className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
        style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)' }}>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span style={{ color: '#4ADE80', fontFamily: 'Cairo, sans-serif', fontSize: 13, fontWeight: 700 }}>
          متاح الآن في جدة — تجربة مجانية 4 أسابيع
        </span>
      </motion.div>

      {/* headline */}
      <motion.h1 {...reveal} transition={{ delay: 0.1, duration: 0.6 }}
        style={{ fontSize: 'clamp(28px, 5vw, 54px)', fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif', lineHeight: 1.25, marginBottom: 20 }}>
        نظام الاستقبال الذكي<br />
        <span style={{ color: '#00BFFF' }}>لعيادة الأسنان في جدة</span>
      </motion.h1>

      <motion.p {...reveal} transition={{ delay: 0.2 }}
        style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'rgba(255,255,255,0.65)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, maxWidth: 620, margin: '0 auto 36px' }}>
        مساعد AI يرد على مرضاك على واتساب، يحجز المواعيد تلقائياً، ويذكّرهم — بدون موظف استقبال إضافي.
      </motion.p>

      {/* CTAs */}
      <motion.div {...reveal} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center mb-14">
        <WaBtn label="احجز جلسة مجانية 30 دقيقة" msg="مرحباً، أريد معرفة المزيد عن نظام الاستقبال الذكي لعيادتي" large />
        <button onClick={() => document.getElementById('process')?.scrollIntoView({ behavior: 'smooth' })}
          style={{ padding: '15px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          كيف يعمل النظام؟
        </button>
      </motion.div>

      {/* big numbers */}
      <motion.div {...reveal} transition={{ delay: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
        {[
          { val: '24/7', label: 'استقبال بلا انقطاع' },
          { val: '<12 ث', label: 'وقت الرد على المريض' },
          { val: '80%', label: 'تقليل المواعيد الضائعة' },
          { val: '3 أسابيع', label: 'وقت تشغيل النظام' },
        ].map(s => (
          <div key={s.val} style={{ padding: '16px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#00BFFF', fontFamily: 'Cairo, sans-serif', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal, sans-serif', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
)

/* ─── 2. PROBLEM ─────────────────────────────────────────────────── */
const Problem = () => (
  <section style={{ background: '#fff', padding: '80px 24px', direction: 'rtl' }}>
    <div className="max-w-4xl mx-auto">
      <motion.div {...reveal} style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>
          المشكلة التي تخسر منها يومياً
        </span>
        <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px' }}>
          عيادتك تخسر مرضى كل يوم — وأنت لا تعرف
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
          كل رسالة واتساب لم تُرد عليها فوراً = مريض راح للمنافس
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { icon: Phone, color: '#EF4444', title: 'مكالمات ضائعة', body: 'المريض يتصل خارج الدوام أو أثناء انشغال الاستقبال — يحجز عند منافسك مباشرة.' },
          { icon: Clock, color: '#F59E0B', title: 'ردود بطيئة على واتساب', body: 'رد بعد ساعة على استفسار الحجز = 70% من هؤلاء المرضى لن يرجعوا.' },
          { icon: Calendar, color: '#8B5CF6', title: 'مواعيد بدون تذكير', body: 'بدون تذكير تلقائي، 3 من كل 10 مرضى لا يحضرون — خسارة مباشرة من جدولك.' },
        ].map(({ icon: Icon, color, title, body }) => (
          <motion.div key={title} {...reveal}
            style={{ padding: 24, borderRadius: 16, border: '1px solid #F1F5F9', background: '#FAFBFF' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Icon size={20} color={color} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', marginBottom: 8 }}>{title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, margin: 0 }}>{body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

/* ─── 3. METHOD ──────────────────────────────────────────────────── */
const Method = () => (
  <section id="method" style={{ background: '#F8FAFF', padding: '80px 24px', direction: 'rtl' }}>
    <div className="max-w-5xl mx-auto">
      <motion.div {...reveal} style={{ textAlign: 'center', marginBottom: 52 }}>
        <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: 'rgba(0,153,204,0.08)', border: '1px solid rgba(0,153,204,0.2)', color: '#0099CC', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>
          المنهجية
        </span>
        <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px' }}>
          4 أنظمة — تشغيل عيادة كاملة
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
          من أول رسالة واتساب حتى آخر تقرير اليوم
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          {
            num: '01', icon: Bot, color: '#0099CC',
            title: 'مساعد الاستقبال AI',
            body: 'يرد على كل رسالة واتساب خلال ثوانٍ، يجيب على الأسئلة الشائعة، ويحجز المواعيد مباشرة في الجدول.',
            points: ['رد فوري 24/7 بدون انقطاع', 'يفهم اللهجة السعودية', 'يحجز بدون تدخل الاستقبال'],
          },
          {
            num: '02', icon: Calendar, color: '#10B981',
            title: 'إدارة المواعيد الذكية',
            body: 'جدول مواعيد متزامن تلقائياً — لا تعارض، لا فوضى، لا أخطاء يدوية.',
            points: ['منع التعارض تلقائياً', 'مزامنة مع جداول الأطباء', 'قبول وإلغاء المواعيد ذكياً'],
          },
          {
            num: '03', icon: Bell, color: '#8B5CF6',
            title: 'متابعة المرضى تلقائياً',
            body: 'تذكير قبل الموعد بـ 24 ساعة، متابعة بعد الزيارة، وإعادة استهداف المرضى الغائبين.',
            points: ['تذكير واتساب قبل 24 ساعة', 'متابعة بعد كل زيارة', 'استرداد المرضى الغائبين'],
          },
          {
            num: '04', icon: BarChart3, color: '#F59E0B',
            title: 'تقارير وتحليلات يومية',
            body: 'لوحة تحكم تعرفك كم موعد، كم مريض جديد، وكم خسرت — كل يوم.',
            points: ['تقرير يومي تلقائي', 'تتبع no-show بالأرقام', 'مقارنة الأداء أسبوعياً'],
          },
        ].map(({ num, icon: Icon, color, title, body, points }) => (
          <motion.div key={num} {...reveal}
            style={{ padding: '28px', borderRadius: 18, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(13,27,62,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={22} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: color, fontFamily: 'Cairo, sans-serif', letterSpacing: '0.08em' }}>النظام {num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{title}</h3>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, marginBottom: 16 }}>{body}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {points.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Check size={13} color={color} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#334155', fontFamily: 'Tajawal, sans-serif' }}>{p}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

/* ─── 4. AI RECEPTIONIST DEMO ────────────────────────────────────── */
const AiDemo = () => (
  <section style={{ background: '#0D1B3E', padding: '80px 24px', direction: 'rtl' }}>
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">

        {/* Left: copy */}
        <motion.div {...reveal}>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.25)', color: '#00BFFF', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 16 }}>
            مساعد الاستقبال AI
          </span>
          <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px', lineHeight: 1.3 }}>
المساعد الذكي — يستقبل مرضاك على واتساب
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, marginBottom: 28 }}>
            تستقبل الرسائل، تحجز المواعيد، وترد على الأسئلة — كل هذا بدون أن يلمس أحد الهاتف.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: Zap, color: '#00BFFF', text: 'رد في أقل من 12 ثانية على كل رسالة' },
              { icon: Calendar, color: '#10B981', text: 'حجز مباشر في جدول الطبيب بدون تدخل' },
              { icon: Users, color: '#8B5CF6', text: 'تأهيل المريض وفهم احتياجه قبل الزيارة' },
              { icon: Clock, color: '#F59E0B', text: 'تعمل 24 ساعة — حتى في الإجازات والأعياد' },
            ].map(({ icon: Icon, color, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Tajawal, sans-serif' }}>{text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right: WhatsApp mockup */}
        <motion.div {...reveal} transition={{ delay: 0.15 }}>
          <div style={{ borderRadius: 24, overflow: 'hidden', border: '3px solid #0D1B3E', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', maxWidth: 320, margin: '0 auto' }}>
            {/* header */}
            <div style={{ background: '#075E54', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <p style={{ margin: 0, color: '#fff', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13 }}>مساعد عيادتك الذكي</p>
                <p style={{ margin: 0, color: '#A8D5A2', fontSize: 10, fontFamily: 'Tajawal, sans-serif' }}>متصلة الآن</p>
              </div>
            </div>
            {/* chat */}
            <div style={{ background: '#ECE5DD', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { from: 'user', text: 'السلام عليكم، أبي أحجز موعد تنظيف أسنان' },
                { from: 'ai', text: 'وعليكم السلام! 😊 أهلاً بك في عيادة د. أحمد. متى تفضل تجي؟ عندنا مواعيد الثلاثاء والأربعاء.' },
                { from: 'user', text: 'الثلاثاء عصراً لو أمكن' },
                { from: 'ai', text: 'ممتاز! ✅ عندي خانة الثلاثاء 5:30م. اسمك الكريم ورقم جوالك لتأكيد الحجز؟' },
                { from: 'user', text: 'محمد العتيبي — 0556789012' },
                { from: 'ai', text: 'تم الحجز بنجاح يا محمد! 🎉\nالثلاثاء 5:30م — د. أحمد\nراح يوصلك تذكير الغد إن شاء الله.' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '82%', padding: '8px 11px', borderRadius: m.from === 'ai' ? '0 12px 12px 12px' : '12px 0 12px 12px',
                    background: m.from === 'ai' ? '#fff' : '#D9FDD3',
                    fontSize: 11, color: '#111B21', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.55,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)', whiteSpace: 'pre-line',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── 5. PROCESS ─────────────────────────────────────────────────── */
const Process = () => (
  <section id="process" style={{ background: '#fff', padding: '80px 24px', direction: 'rtl' }}>
    <div className="max-w-4xl mx-auto">
      <motion.div {...reveal} style={{ textAlign: 'center', marginBottom: 52 }}>
        <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>
          العملية
        </span>
        <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 12px' }}>
          من الاتفاق إلى التشغيل في 3 أسابيع
        </h2>
        <p style={{ fontSize: 15, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
          عملية واضحة — تعرف في كل يوم وين وصلنا
        </p>
      </motion.div>

      <div style={{ position: 'relative' }}>
        {/* connector line */}
        <div className="hidden sm:block" style={{ position: 'absolute', top: 28, right: '12.5%', width: '75%', height: 2, background: 'linear-gradient(90deg, #0099CC, #10B981, #8B5CF6, #F59E0B)', zIndex: 0 }} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6" style={{ position: 'relative', zIndex: 1 }}>
          {[
            { week: 'الأسبوع 1', color: '#0099CC', title: 'التحليل والإعداد', points: ['فهم جدولك الحالي', 'إعداد واتساب Business', 'تدريب المساعد على عيادتك'] },
            { week: 'الأسبوع 2', color: '#10B981', title: 'البناء والتخصيص', points: ['ربط جدول المواعيد', 'تخصيص ردود AI', 'إعداد التذكيرات'] },
            { week: 'الأسبوع 3', color: '#8B5CF6', title: 'الإطلاق التجريبي', points: ['تشغيل مباشر', 'تدريب فريقك', 'مراقبة وتعديل'] },
            { week: 'الأسبوع 4+', color: '#F59E0B', title: 'التحسين المستمر', points: ['تقارير أسبوعية', 'تطوير بناءً على بيانات', 'دعم مستمر'] },
          ].map(({ week, color, title, points }) => (
            <motion.div key={week} {...reveal} style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 4px 16px ${color}44` }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif' }}>{week.split(' ')[1]}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: color, fontFamily: 'Cairo, sans-serif', marginBottom: 4 }}>{week}</div>
              <h4 style={{ fontSize: 13, fontWeight: 800, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', marginBottom: 10 }}>{title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {points.map(p => (
                  <div key={p} style={{ fontSize: 11, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>{p}</div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

/* ─── 6. PROGRAMS ────────────────────────────────────────────────── */
const Programs = () => (
  <section id="plans" style={{ background: '#F8FAFF', padding: '80px 24px', direction: 'rtl' }}>
    <div className="max-w-3xl mx-auto">
      <motion.div {...reveal} style={{ textAlign: 'center', marginBottom: 48 }}>
        <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 99, background: 'rgba(0,153,204,0.08)', border: '1px solid rgba(0,153,204,0.2)', color: '#0099CC', fontSize: 12, fontWeight: 700, fontFamily: 'Cairo, sans-serif', marginBottom: 14 }}>
          البرامج
        </span>
        <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>
          برنامجان — وضوح تام
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif' }}>
          السعر يُحدد بعد جلسة تعريفية مجانية — بناءً على حجم عيادتك
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          {
            name: 'البداية الذكية',
            tag: 'للعيادات الجديدة',
            featured: false,
            desc: 'نظام استقبال AI + إدارة مواعيد + لوحة تحكم — كل ما تحتاجه للبداية.',
            features: ['مساعد واتساب AI مخصص', 'جدول مواعيد رقمي', 'تذكيرات تلقائية للمرضى', 'لوحة تحكم أساسية', 'تدريب الفريق (ساعتين)', 'دعم شهر كامل'],
            cta: 'تحدث معنا على واتساب',
            msg: 'مرحباً، أريد الاستفسار عن برنامج البداية الذكية لعيادتي',
          },
          {
            name: 'النمو الكامل',
            tag: 'الأكثر طلباً',
            featured: true,
            desc: 'كل شيء في البداية الذكية + مساعد صوتي AI + تقارير متقدمة + متابعة مستمرة.',
            features: ['كل مزايا البداية الذكية', 'مساعد صوتي AI للمكالمات', 'تقارير تحليلية متقدمة', 'استرداد المرضى الغائبين', 'تكاملات خاصة بعيادتك', 'دعم أولوية + متابعة شهرية'],
            cta: 'احجز جلسة تعريفية مجانية',
            msg: 'مرحباً، أريد الاستفسار عن برنامج النمو الكامل لعيادتي',
          },
        ].map(plan => (
          <motion.div key={plan.name} {...reveal}
            style={{
              padding: 28, borderRadius: 20, position: 'relative', overflow: 'hidden',
              background: plan.featured ? '#0D1B3E' : '#fff',
              border: `1px solid ${plan.featured ? '#0099CC' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: plan.featured ? '0 16px 48px rgba(0,153,204,0.22)' : '0 2px 16px rgba(13,27,62,0.06)',
            }}>
            {plan.featured && <div style={{ position: 'absolute', top: 0, insetInline: 0, height: 3, background: 'linear-gradient(90deg,#0099CC,#00BFFF)' }} />}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 20, fontWeight: 900, color: plan.featured ? '#fff' : '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: 0 }}>{plan.name}</h3>
              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700, fontFamily: 'Cairo, sans-serif', background: plan.featured ? 'rgba(0,191,255,0.15)' : '#F1F5F9', color: plan.featured ? '#00BFFF' : '#64748B', border: `1px solid ${plan.featured ? 'rgba(0,191,255,0.3)' : 'transparent'}` }}>
                {plan.tag}
              </span>
            </div>
            <p style={{ fontSize: 13, color: plan.featured ? 'rgba(255,255,255,0.6)' : '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.7, marginBottom: 20 }}>{plan.desc}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: plan.featured ? 'rgba(255,255,255,0.85)' : '#334155', fontFamily: 'Tajawal, sans-serif' }}>
                  <Check size={13} color={plan.featured ? '#00BFFF' : '#10B981'} style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <WaBtn label={plan.cta} msg={plan.msg} />
          </motion.div>
        ))}
      </div>

      <motion.p {...reveal} transition={{ delay: 0.3 }}
        style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', fontFamily: 'Tajawal, sans-serif', marginTop: 20 }}>
        لا عقود طويلة — لا التزامات مسبقة — جلسة التعريف مجانية تماماً
      </motion.p>
    </div>
  </section>
)

/* ─── 7. FAQ ─────────────────────────────────────────────────────── */
const faqs = [
  { q: 'هل يفهم النظام اللهجة السعودية؟', a: 'نعم — المساعد الذكي مدرب على اللهجة الخليجية السعودية تحديداً. يفهم "أبي أحجز" و"وش الدوام" وغيرها من العبارات اليومية.' },
  { q: 'كم من الوقت يحتاج التشغيل؟', a: 'من يوم الاتفاق، النظام يكون شغّال خلال 3 أسابيع كاملاً. الأسبوع الأول إعداد، الثاني بناء، الثالث إطلاق مع تدريب فريقك.' },
  { q: 'هل يتعارض مع نظام الحجز الحالي؟', a: 'لا — النظام يتكامل مع ما لديك أو يعمل بشكل مستقل. يمكن الربط مع Google Calendar وأنظمة أخرى.' },
  { q: 'ماذا لو لم يعمل كما توقعنا؟', a: 'نبدأ بتجربة مجانية 4 أسابيع — ترى النتيجة بنفسك قبل أي التزام مالي.' },
  { q: 'هل بيانات المرضى آمنة؟', a: 'البيانات مخزنة على خوادم آمنة ومشفرة. لا تذهب أي معلومات شخصية لأطراف خارجية.' },
  { q: 'هل تحتاج العيادة واتساب Business API؟', a: 'نعم — نساعدك في إعداده وتفعيله كجزء من عملية الإعداد. يستغرق 7-10 أيام للحصول على الموافقة.' },
]

const FAQ = () => {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section style={{ background: '#fff', padding: '80px 24px', direction: 'rtl' }}>
      <div className="max-w-2xl mx-auto">
        <motion.div {...reveal} style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>
            أسئلة شائعة
          </h2>
        </motion.div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faqs.map((faq, i) => (
            <motion.div key={i} {...reveal}
              style={{ borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden', background: open === i ? '#F8FAFF' : '#fff' }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif' }}>{faq.q}</span>
                <ChevronDown size={16} color="#94A3B8" style={{ flexShrink: 0, transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <p style={{ padding: '0 20px 16px', fontSize: 13, color: '#64748B', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.75, margin: 0 }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── 8. FINAL CTA ───────────────────────────────────────────────── */
const FinalCTA = () => (
  <section style={{ background: '#0D1B3E', padding: '90px 24px', direction: 'rtl', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(0,153,204,0.15), transparent 50%), radial-gradient(circle at 70% 50%, rgba(37,211,102,0.08), transparent 50%)' }} />
    <div className="relative max-w-2xl mx-auto">
      <motion.div {...reveal}>
        <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, color: '#fff', fontFamily: 'Cairo, sans-serif', margin: '0 0 16px', lineHeight: 1.3 }}>
          جاهز تحوّل استقبال عيادتك؟
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontFamily: 'Tajawal, sans-serif', lineHeight: 1.8, marginBottom: 36 }}>
          جلسة تعريفية مجانية 30 دقيقة — نفهم احتياجك ونريك النظام على عيادتك تحديداً.<br />
          لا عقد. لا التزام.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', sm: { flexDirection: 'row' }, gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <WaBtn label="احجز جلسة تعريفية مجانية" msg="مرحباً، أريد حجز جلسة تعريفية مجانية لنظام الاستقبال الذكي" large />
        </div>
        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Tajawal, sans-serif' }}>
          خاص بعيادات جدة — متاحية محدودة هذا الشهر
        </p>
      </motion.div>
    </div>
  </section>
)

/* ─── PAGE ───────────────────────────────────────────────────────── */
export const HomePage = () => (
  <>
    <ScrollProgress />
    <CustomCursor />
    <MadarNavbar
      subtitle="نظام الاستقبال الذكي للعيادات"
      navLinks={[
        { href: '#method',  label: 'المنهجية' },
        { href: '#process', label: 'العملية' },
        { href: '#plans',   label: 'البرامج' },
      ]}
    />
    <main>
      <Hero />
      <Problem />
      <Method />
      <AiDemo />
      <Process />
      <Programs />
      <FAQ />
      <FinalCTA />
    </main>
    <Footer />
    <WhatsAppButton />
  </>
)
