import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, ArrowLeft } from 'lucide-react'

import { ScrollProgress }   from '../components/shared/ScrollProgress'
import { WhatsAppButton }   from '../components/shared/WhatsAppButton'
import { CustomCursor }     from '../components/shared/CustomCursor'
import { MadarNavbar }      from '../components/public/MadarNavbar'
import { Hero }             from '../components/public/Hero'
import { Footer }           from '../components/public/Footer'

const PHONE = '966546666005'
const openWhatsApp = (msg: string) => window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`, '_blank')

/* ─── 1. Stats Bar ──────────────────────────────────────────────── */
const StatsBar = () => (
  <div style={{ background: '#0D1B3E', padding: '18px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
      {[
        { val: '80%',      label: 'تقليل في الـ no-show' },
        { val: '< ثانية', label: 'وقت رد المساعد' },
        { val: '24/7',     label: 'استقبال بلا انقطاع' },
        { val: '٣ أيام',  label: 'وقت الإعداد والتشغيل' },
      ].map((s, i, arr) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ padding: '4px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#00BFFF', fontFamily: 'Cairo, sans-serif', lineHeight: 1.2 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Tajawal, sans-serif', marginTop: 2 }}>{s.label}</div>
          </div>
          {i < arr.length - 1 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)' }} />}
        </div>
      ))}
    </div>
  </div>
)

/* ─── 2. Dashboard Preview ──────────────────────────────────────── */
const DashboardPreview = () => (
  <section style={{ background: '#F8FAFF', padding: '72px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 1060, margin: '0 auto' }}>

      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        style={{ textAlign: 'center', marginBottom: 36 }}>
        <h2 style={{ fontSize: 30, fontWeight: 900, color: '#0D1B3E', fontFamily: 'Cairo, sans-serif', margin: '0 0 10px' }}>
          كل عيادتك في شاشة واحدة
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'Tajawal, sans-serif', margin: 0 }}>
          مواعيد، مرضى، AI نشط — ترى كل شيء بلمحة
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 70px rgba(13,27,62,0.12)', background: '#fff' }}
      >
        {/* Browser chrome */}
        <div style={{ background: '#F1F5F9', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#FF5F57','#FEBC2E','#28C840'].map((c,i)=><div key={i} style={{ width:9,height:9,borderRadius:'50%',background:c }} />)}
          </div>
          <div style={{ flex:1, background:'#E2E8F0', borderRadius:5, padding:'3px 10px', display:'flex', alignItems:'center', gap:6, maxWidth:260, margin:'0 auto' }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#10B981' }} />
            <span style={{ fontSize:10, color:'#64748B', fontFamily:'monospace' }}>clinic.madar.software</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ display:'flex', height:420, direction:'rtl' }}>
          {/* Sidebar */}
          <div style={{ width:180, background:'#0D1B3E', padding:'16px 0', flexShrink:0 }}>
            <div style={{ padding:'0 14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize:12,fontWeight:900,color:'#fff',fontFamily:'Cairo, sans-serif' }}>Madar <span style={{color:'#00BFFF'}}>Clinic OS</span></div>
              <div style={{ fontSize:9,color:'rgba(255,255,255,0.4)',fontFamily:'Tajawal, sans-serif',marginTop:2 }}>عيادة د. أحمد</div>
            </div>
            <div style={{ padding:'10px 0' }}>
              {['الرئيسية','المواعيد','المرضى','الأطباء','التقارير','الإعدادات'].map((label,i)=>(
                <div key={label} style={{ padding:'7px 14px', margin:'1px 6px', borderRadius:7,
                  background: i===0 ? 'rgba(0,191,255,0.15)' : 'transparent',
                  borderRight: i===0 ? '3px solid #00BFFF' : '3px solid transparent',
                  fontSize:11, color: i===0 ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontFamily:'Cairo, sans-serif', fontWeight: i===0 ? 700 : 400 }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Main */}
          <div style={{ flex:1, background:'#F8FAFF', padding:16, display:'flex', flexDirection:'column', gap:12, overflowY:'auto' }}>
            {/* Top bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:14,fontWeight:900,color:'#0D1B3E',fontFamily:'Cairo, sans-serif' }}>لوحة التحكم</div>
                <div style={{ fontSize:10,color:'#94A3B8',fontFamily:'Tajawal, sans-serif' }}>الأحد، 15 يونيو 2025</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                <div style={{ width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#0D1B3E,#0099CC)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <span style={{ fontSize:9,color:'#fff',fontWeight:700 }}>أ</span>
                </div>
                <span style={{ fontSize:11,color:'#334155',fontFamily:'Cairo, sans-serif' }}>د. أحمد</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {[
                { label:'مواعيد اليوم', value:'14', color:'#0099CC' },
                { label:'مرضى جدد',    value:'3',  color:'#10B981' },
                { label:'مؤكدة',       value:'11', color:'#7C3AED' },
                { label:'no-show',     value:'0',  color:'#F59E0B' },
              ].map(s=>(
                <div key={s.label} style={{ background:'#fff',borderRadius:10,padding:'12px 10px',border:'1px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ fontSize:20,fontWeight:900,color:s.color,fontFamily:'Cairo, sans-serif' }}>{s.value}</div>
                  <div style={{ fontSize:9,color:'#64748B',fontFamily:'Tajawal, sans-serif',marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Content row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flex:1 }}>
              {/* Appointments */}
              <div style={{ background:'#fff',borderRadius:12,padding:12,border:'1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize:12,fontWeight:800,color:'#0D1B3E',fontFamily:'Cairo, sans-serif',marginBottom:8 }}>مواعيد اليوم</div>
                {[
                  { name:'محمد العتيبي', time:'09:00', status:'حضر',         color:'#10B981' },
                  { name:'نورة الشمري', time:'09:30', status:'قادم',         color:'#0099CC' },
                  { name:'فهد الدوسري', time:'10:00', status:'في الانتظار', color:'#F59E0B' },
                  { name:'ريم المطيري', time:'10:30', status:'قادم',         color:'#0099CC' },
                  { name:'عبدالله الحربي',time:'11:00',status:'قادم',        color:'#0099CC' },
                ].map((a,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:7,padding:'6px 0',borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ width:24,height:24,borderRadius:'50%',background:'rgba(0,153,204,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <span style={{ fontSize:9,fontWeight:700,color:'#0099CC' }}>{a.name[0]}</span>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:10,fontWeight:700,color:'#0D1B3E',fontFamily:'Cairo, sans-serif',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.name}</div>
                      <div style={{ fontSize:9,color:'#94A3B8',fontFamily:'Tajawal, sans-serif' }}>{a.time}</div>
                    </div>
                    <div style={{ fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:8,background:a.color+'18',color:a.color,fontFamily:'Cairo, sans-serif',whiteSpace:'nowrap' }}>{a.status}</div>
                  </div>
                ))}
              </div>

              {/* AI feed */}
              <div style={{ background:'#fff',borderRadius:12,padding:12,border:'1px solid rgba(0,0,0,0.07)',display:'flex',flexDirection:'column',gap:6 }}>
                <div style={{ fontSize:12,fontWeight:800,color:'#0D1B3E',fontFamily:'Cairo, sans-serif',marginBottom:4 }}>نشاط المساعد AI</div>
                {[
                  { icon:'✅', text:'تأكيد موعد نورة الشمري',   time:'الآن' },
                  { icon:'📨', text:'تذكير أُرسل لـ فهد الدوسري', time:'٥ د' },
                  { icon:'📅', text:'حجز جديد — ريم المطيري',    time:'١٢ د' },
                  { icon:'💬', text:'رد واتساب — عبدالله الحربي', time:'١٨ د' },
                  { icon:'📊', text:'ملخص يومي أُرسل للدكتور',   time:'٣٠ د' },
                ].map((e,i)=>(
                  <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:7,paddingBottom:6,borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize:13,flexShrink:0 }}>{e.icon}</span>
                    <div style={{ flex:1,fontSize:10,color:'#334155',fontFamily:'Tajawal, sans-serif',lineHeight:1.5 }}>{e.text}</div>
                    <span style={{ fontSize:9,color:'#CBD5E1',whiteSpace:'nowrap',flexShrink:0 }}>{e.time}</span>
                  </div>
                ))}
                <div style={{ marginTop:'auto',padding:'7px 10px',borderRadius:8,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',display:'flex',alignItems:'center',gap:6 }}>
                  <div style={{ width:6,height:6,borderRadius:'50%',background:'#10B981' }} />
                  <span style={{ fontSize:10,color:'#059669',fontWeight:700,fontFamily:'Cairo, sans-serif' }}>المساعد AI نشط الآن</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity:0,y:12 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} transition={{ delay:0.3 }}
        style={{ textAlign:'center', marginTop:28 }}>
        <Link to="/trial" style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:12,background:'linear-gradient(135deg,#0D1B3E,#0099CC)',color:'#fff',fontFamily:'Cairo, sans-serif',fontWeight:700,fontSize:14,textDecoration:'none',boxShadow:'0 6px 20px rgba(0,153,204,0.28)' }}>
          جرّب اللوحة مجاناً
          <ArrowLeft size={14} />
        </Link>
      </motion.div>
    </div>
  </section>
)

/* ─── 3. Pain vs Solution ───────────────────────────────────────── */
const PainSolution = () => (
  <section style={{ background: '#fff', padding: '72px 24px', direction: 'rtl' }}>
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <motion.div initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
        style={{ textAlign:'center', marginBottom:48 }}>
        <h2 style={{ fontSize:30,fontWeight:900,color:'#0D1B3E',fontFamily:'Cairo, sans-serif',margin:'0 0 10px',lineHeight:1.35 }}>
          قبل مدار — بعد مدار
        </h2>
        <p style={{ fontSize:14,color:'#64748B',fontFamily:'Tajawal, sans-serif',margin:0 }}>
          نفس العيادة، نتائج مختلفة تماماً
        </p>
      </motion.div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Before */}
        <motion.div initial={{ opacity:0,x:20 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
          style={{ borderRadius:16,padding:'24px',background:'#FEF2F2',border:'1px solid rgba(239,68,68,0.12)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background:'rgba(239,68,68,0.12)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontSize:14 }}>😓</span>
            </div>
            <span style={{ fontSize:13,fontWeight:800,color:'#DC2626',fontFamily:'Cairo, sans-serif' }}>بدون مدار</span>
          </div>
          {[
            'مكالمة فايتة = مريض راح للمنافس',
            '٣ من ١٠ مرضى ما يحضرون بدون تذكير',
            'الاستقبال يرد على الجوال ويخدم المريض في نفس الوقت',
            'بعد الساعة ٥ مساءً لا أحد يرد',
            'حجز يدوي → أخطاء → تعارض مواعيد',
            'راتب موظف ٤٠٠٠+ ريال يشتغل ٨ ساعات فقط',
          ].map((t,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:10 }}>
              <span style={{ color:'#DC2626',fontSize:14,flexShrink:0,marginTop:1 }}>✗</span>
              <span style={{ fontSize:12,color:'#7F1D1D',fontFamily:'Tajawal, sans-serif',lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </motion.div>

        {/* After */}
        <motion.div initial={{ opacity:0,x:-20 }} whileInView={{ opacity:1,x:0 }} viewport={{ once:true }}
          style={{ borderRadius:16,padding:'24px',background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:20 }}>
            <div style={{ width:28,height:28,borderRadius:'50%',background:'rgba(16,185,129,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span style={{ fontSize:14 }}>🚀</span>
            </div>
            <span style={{ fontSize:13,fontWeight:800,color:'#059669',fontFamily:'Cairo, sans-serif' }}>مع مدار AI</span>
          </div>
          {[
            'كل مكالمة وواتساب يُرد عليها خلال ثانية',
            'تذكير تلقائي يقلل الـ no-show ٨٠٪',
            'AI يستقبل ويحجز والموظف يركّز على المريض أمامه',
            'يشتغل ٢٤ ساعة، ٧ أيام، حتى الأعياد',
            'حجز ذكي بدون تعارض، يتزامن مع التقويم',
            'تكلفة أقل من موظف — مع أداء أعلى بكثير',
          ].map((t,i)=>(
            <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:8,marginBottom:10 }}>
              <span style={{ color:'#10B981',fontSize:14,flexShrink:0,marginTop:1 }}>✓</span>
              <span style={{ fontSize:12,color:'#064E3B',fontFamily:'Tajawal, sans-serif',lineHeight:1.5 }}>{t}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
)

/* ─── 4. Pricing ────────────────────────────────────────────────── */
const Pricing = () => (
  <section id="plans" style={{ background:'#F8FAFF', padding:'72px 24px', direction:'rtl' }}>
    <div style={{ maxWidth:760, margin:'0 auto' }}>
      <motion.div initial={{ opacity:0,y:16 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}
        style={{ textAlign:'center', marginBottom:40 }}>
        <span style={{ display:'inline-block',padding:'5px 14px',borderRadius:99,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.22)',color:'#059669',fontSize:11,fontWeight:700,fontFamily:'Cairo, sans-serif',marginBottom:12 }}>
          الباقات
        </span>
        <h2 style={{ fontSize:28,fontWeight:900,color:'#0D1B3E',fontFamily:'Cairo, sans-serif',margin:'0 0 8px',lineHeight:1.3 }}>
          باقتان — وضوح تام
        </h2>
        <p style={{ fontSize:13,color:'#64748B',fontFamily:'Tajawal, sans-serif',margin:0 }}>
          جلسة التعريف مجانية — السعر يتحدد بعد معرفة حجم العيادة
        </p>
      </motion.div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
        {[
          {
            name:'Clinic Core',
            tag:'البداية الصحيحة',
            desc:'نظام تشغيل يومي لعيادتك — مواعيد، مرضى، تقارير.',
            features:['جدول المواعيد الذكي','ملفات المرضى الرقمية','لوحة تحكم الأطباء','تقارير يومية وشهرية','دعم مباشر'],
            featured:false,
            cta:'اطلب عرضاً',
          },
          {
            name:'Clinic AI',
            tag:'الأكثر طلباً ⭐',
            desc:'كل Core + مساعد AI يحجز ويذكّر ويرد على واتساب تلقائياً.',
            features:['كل مزايا Clinic Core','مساعد AI ٢٤/٧ على واتساب','تأكيدات وتذكيرات تلقائية','حجز ذكي بدون تعارض','تكاملات خاصة بعيادتك'],
            featured:true,
            cta:'ابدأ مجاناً',
          },
        ].map((plan,i)=>(
          <motion.div key={plan.name} initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} transition={{ delay:i*0.1 }}
            style={{ borderRadius:18,padding:'24px',position:'relative',overflow:'hidden',
              background: plan.featured ? '#0D1B3E' : '#fff',
              border: `1px solid ${plan.featured ? '#0099CC' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: plan.featured ? '0 12px 40px rgba(0,153,204,0.2)' : '0 2px 12px rgba(13,27,62,0.06)' }}>
            {plan.featured && <div style={{ position:'absolute',top:0,insetInline:0,height:2,background:'linear-gradient(90deg,#00BFFF,#0099CC)' }} />}
            <span style={{ display:'inline-block',padding:'3px 10px',borderRadius:99,marginBottom:10,
              background: plan.featured ? 'rgba(0,191,255,0.15)' : 'rgba(0,0,0,0.04)',
              color: plan.featured ? '#00BFFF' : '#64748B',
              fontSize:10,fontWeight:700,fontFamily:'Cairo, sans-serif',border:`1px solid ${plan.featured?'rgba(0,191,255,0.3)':'rgba(0,0,0,0.07)'}` }}>
              {plan.tag}
            </span>
            <h3 style={{ fontSize:20,fontWeight:900,color: plan.featured ? '#fff' : '#0D1B3E',fontFamily:'Cairo, sans-serif',margin:'0 0 8px' }}>{plan.name}</h3>
            <p style={{ fontSize:12,color: plan.featured ? 'rgba(255,255,255,0.6)' : '#64748B',fontFamily:'Tajawal, sans-serif',lineHeight:1.6,margin:'0 0 18px' }}>{plan.desc}</p>
            <ul style={{ listStyle:'none',padding:0,margin:'0 0 22px',display:'flex',flexDirection:'column',gap:8 }}>
              {plan.features.map(f=>(
                <li key={f} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,color: plan.featured ? 'rgba(255,255,255,0.85)' : '#334155',fontFamily:'Tajawal, sans-serif' }}>
                  <Check size={13} color={plan.featured ? '#00BFFF' : '#10B981'} style={{ flexShrink:0 }} />
                  {f}
                </li>
              ))}
            </ul>
            {plan.featured ? (
              <Link to="/trial"
                style={{ display:'block',width:'100%',padding:'12px',borderRadius:12,textAlign:'center',textDecoration:'none',fontFamily:'Cairo, sans-serif',fontSize:14,fontWeight:700,
                  background:'linear-gradient(135deg,#0099CC,#007BFF)',color:'#fff',
                  boxShadow:'0 4px 16px rgba(0,153,204,0.3)' }}>
                {plan.cta}
              </Link>
            ) : (
              <button
                onClick={() => openWhatsApp(`مرحباً، أريد عرضاً لباقة ${plan.name} لعيادتي.`)}
                style={{ width:'100%',padding:'12px',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'Cairo, sans-serif',fontSize:14,fontWeight:700,
                  background:'rgba(13,27,62,0.06)',color:'#0D1B3E' }}>
                {plan.cta}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <motion.p initial={{ opacity:0 }} whileInView={{ opacity:1 }} viewport={{ once:true }} transition={{ delay:0.4 }}
        style={{ textAlign:'center',fontSize:12,color:'#94A3B8',fontFamily:'Tajawal, sans-serif',marginTop:20 }}>
        لا عقود سنوية إجبارية — بإمكانك البدء والإيقاف متى تشاء
      </motion.p>
    </div>
  </section>
)

/* ─── 5. Final CTA ──────────────────────────────────────────────── */
const FinalCTA = () => (
  <section style={{ background:'#0D1B3E', padding:'80px 24px', direction:'rtl', textAlign:'center' }}>
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      <motion.div initial={{ opacity:0,y:20 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }}>
        <div style={{ fontSize:28,marginBottom:16 }}>🤝</div>
        <h2 style={{ fontSize:32,fontWeight:900,color:'#fff',fontFamily:'Cairo, sans-serif',margin:'0 0 14px',lineHeight:1.35 }}>
          جاهز تشغّل مساعد الاستقبال في عيادتك؟
        </h2>
        <p style={{ fontSize:15,color:'rgba(255,255,255,0.6)',fontFamily:'Tajawal, sans-serif',margin:'0 0 36px',lineHeight:1.7 }}>
          جلسة تعريف مجانية — نفهم احتياجك ونريك النظام على عيادتك تحديداً
        </p>
        <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
          <Link to="/trial"
            style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'14px 32px',borderRadius:14,background:'linear-gradient(135deg,#0099CC,#007BFF)',color:'#fff',fontFamily:'Cairo, sans-serif',fontWeight:900,fontSize:15,textDecoration:'none',boxShadow:'0 8px 28px rgba(0,153,204,0.4)' }}>
            ابدأ مجاناً الآن
            <ArrowLeft size={15} />
          </Link>
          <button
            onClick={() => openWhatsApp('مرحباً، أريد معرفة المزيد عن مساعد الاستقبال AI لعيادتي')}
            style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'14px 28px',borderRadius:14,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',fontFamily:'Cairo, sans-serif',fontWeight:700,fontSize:15,cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.104.548 4.076 1.508 5.786L.057 23.886a.5.5 0 0 0 .614.613l6.098-1.45A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.643-.51-5.153-1.396l-.37-.22-3.827.91.924-3.835-.241-.384A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            تواصل عبر واتساب
          </button>
        </div>
        <p style={{ marginTop:20,fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'Tajawal, sans-serif' }}>
          الأماكن محدودة لضمان جودة الخدمة لكل عيادة
        </p>
      </motion.div>
    </div>
  </section>
)

/* ─── Page ──────────────────────────────────────────────────────── */
export const HomePage = () => (
  <div className="min-h-screen overflow-x-hidden" style={{ background:'#FFFFFF' }}>
    <CustomCursor />
    <ScrollProgress />
    <MadarNavbar
      navLinks={[
        { href:'#dashboard', label:'لوحة التحكم' },
        { href:'#compare',   label:'المقارنة' },
        { href:'#plans',     label:'الباقات' },
      ]}
      subtitle="مساعد استقبال AI للعيادات"
    />
    <main>
      <Hero />
      <StatsBar />
      <div id="dashboard"><DashboardPreview /></div>
      <div id="compare"><PainSolution /></div>
      <Pricing />
      <FinalCTA />
    </main>
    <Footer />
    <WhatsAppButton />
  </div>
)
