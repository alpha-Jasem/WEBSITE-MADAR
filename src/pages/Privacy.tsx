import { useEffect } from 'react'
import { Link } from 'react-router-dom'

/* ── design tokens (مطابقة SYC) ─────────────────────────────────── */
const C = {
  paper: '#FBFAF7', paper2: '#F4F1EA',
  ink: '#0F1A15', ink2: '#44524C', ink3: '#5E6A64',
  rule: '#E4DFD2', rule2: '#D6CFBD',
  accent: '#0F3D2E', accent2: '#1B6347', brand: '#2BB573',
  dark: '#0A1B14', onDark: '#EDE7D8', onDark2: '#C2D0C7',
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Serif+Arabic:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.lp-body { font-family: 'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif; direction: rtl; text-align: right; }
.lp-h1  { font-family: 'Noto Serif Arabic', 'Cairo', serif; }
.lp-mono { font-family: 'IBM Plex Mono', monospace; }
.lp-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: ${C.accent2}; display: inline-flex; align-items: center; gap: 10px;
}
.lp-eyebrow::before { content: ""; width: 22px; height: 1px; background: ${C.accent2}; }
.lp-nav {
  position: fixed; top: 0; inset-inline: 0; z-index: 100;
  background: rgba(251,250,247,0.88);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid ${C.rule};
}
.lp-section { padding: 2rem 0; border-bottom: 1px solid ${C.rule}; }
.lp-section:last-child { border-bottom: none; }
.lp-h2 { font-family: 'Noto Serif Arabic', serif; font-size: 1.2rem; font-weight: 700; color: ${C.ink}; margin-bottom: 0.75rem; }
.lp-h3 { font-size: 0.95rem; font-weight: 600; color: ${C.ink}; margin: 1rem 0 0.4rem; }
.lp-p  { font-size: 0.95rem; line-height: 1.9; color: ${C.ink2}; margin-bottom: 0.75rem; }
.lp-ul { list-style: none; padding: 0; margin: 0.5rem 0 0.75rem; }
.lp-ul li { font-size: 0.9rem; line-height: 1.8; color: ${C.ink2}; padding-right: 1.2rem; position: relative; }
.lp-ul li::before { content: "—"; position: absolute; right: 0; color: ${C.brand}; }
.lp-callout {
  background: ${C.paper2}; border-right: 3px solid ${C.accent2};
  border-radius: 6px; padding: 1rem 1.25rem; margin: 1rem 0;
  font-size: 0.9rem; line-height: 1.8; color: ${C.ink2};
}
.lp-callout strong { color: ${C.ink}; }
.lp-tag {
  display: inline-block; background: rgba(43,181,115,0.1); border: 1px solid rgba(43,181,115,0.25);
  color: ${C.accent2}; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 500; margin-left: 8px;
}
`

export const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="lp-body" style={{ background: C.paper, minHeight: '100vh', color: C.ink }}>
      <style>{css}</style>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EDE7D8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Noto Serif Arabic, serif', fontWeight: 700, fontSize: '1.1rem', color: C.ink }}>مدار OS</span>
          </Link>
          <Link to="/" style={{ fontSize: 13, color: C.ink2, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            العودة للرئيسية
          </Link>
        </div>
      </nav>

      {/* ── Hero header ────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '8rem 1.5rem 3rem' }}>
        <div style={{ paddingBottom: '2.5rem', borderBottom: `1px solid ${C.rule}`, marginBottom: '0.5rem' }}>
          <span className="lp-eyebrow">قانوني · وثيقة ٠١</span>
          <h1 className="lp-h1" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700, lineHeight: 1.25, margin: '1.5rem 0 1rem', color: C.ink }}>
            سياسة الخصوصية
          </h1>
          <p className="lp-p" style={{ fontSize: '1.1rem', maxWidth: 640 }}>
            كيف نجمع المعلومات ونستخدمها وندير الخصوصية لأصحاب المنشآت وعملائهم الذين يستخدمون منصة مدار OS.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <span className="lp-mono" style={{ fontSize: 12, color: C.ink3 }}>سارية المفعول · يناير ١، ٢٠٢٦</span>
            <span style={{ color: C.rule2 }}>·</span>
            <span className="lp-mono" style={{ fontSize: 12, color: C.ink3 }}>الإصدار · ١.٠</span>
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────── */}
        <div style={{ maxWidth: 720 }}>

          <div className="lp-section">
            <h2 className="lp-h2">النطاق ومن نحن</h2>
            <p className="lp-p">
              مدار OS ("مدار"، "نحن"، "لنا") منصة برمجيات سعودية تقدم أنظمة استقبال ذكية للعيادات الطبية. توضح سياسة الخصوصية هذه كيف نتعامل مع المعلومات عند استخدامك لموقعنا أو للتواصل معنا أو عند اشتراكك في خدماتنا.
            </p>
            <p className="lp-p">
              تغطي هذه السياسة فئتين مختلفتين من المعلومات: (أ) معلومات صاحب المنشأة أو الممثل المفوض، و(ب) معلومات عملاء المنشآت التي تستخدم منصة مدار. تسري قواعد حماية مختلفة على كل فئة.
            </p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">المعلومات التي نجمعها</h2>
            <h3 className="lp-h3">المعلومات التي تقدمها أنت</h3>
            <ul className="lp-ul">
              <li>بيانات التواصل: الاسم، اسم المنشأة، رقم الجوال، والبريد الإلكتروني عند التواصل معنا أو طلب تجربة النظام.</li>
              <li>بيانات المنشأة: نوع النشاط، موقعه، وحجمه خلال مرحلة التأهيل.</li>
              <li>بيانات الفوترة والاشتراك: طريقة الدفع وبيانات الفاتورة، تُعالَج عبر مزودنا المعتمد.</li>
              <li>المراسلات: ما ترسله عبر واتساب أو البريد الإلكتروني أو نماذج التواصل.</li>
            </ul>

            <h3 className="lp-h3">المعلومات المجمَّعة تلقائياً</h3>
            <ul className="lp-ul">
              <li>سجلات الخادم: عنوان IP، نوع المتصفح، الجهاز، الصفحة المُحيلة، والتوقيت.</li>
              <li>بيانات الاستخدام: الصفحات التي تزورها وروابط التنقل داخل الموقع.</li>
              <li>بيانات الأداء: مقاييس الحملات الإعلانية إذا أذنت لنا بالإدارة.</li>
            </ul>

            <h3 className="lp-h3">المعلومات من طرف ثالث</h3>
            <ul className="lp-ul">
              <li>بيانات العملاء التي تُدخلها منشأتك في نظام مدار (أسماء، أرقام هواتف، تفاصيل الخدمات).</li>
              <li>بيانات الأداء من بوابات الدفع وأنظمة نقاط البيع التي تصرح لنا بالربط معها.</li>
            </ul>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">كيف نستخدم المعلومات</h2>
            <p className="lp-p">نستخدم المعلومات الواردة أعلاه للأغراض التالية:</p>
            <ul className="lp-ul">
              <li>تشغيل وتطوير منصة مدار OS وتقديم الدعم الفني والتقني لمنشأتك.</li>
              <li>الرد على الاستفسارات وجدولة جلسات الاستشارة والتهيئة الأولية.</li>
              <li>معالجة المدفوعات وإدارة العلاقة التجارية.</li>
              <li>تحسين المنتج ومميزاته من خلال تحليل البيانات المُجمَّعة وغير المُعرَّفة.</li>
              <li>إرسال تحديثات تشغيلية وتقارير دورية وإشعارات الخدمة.</li>
              <li>الامتثال للأنظمة والقوانين المعمول بها في المملكة العربية السعودية.</li>
            </ul>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">بيانات العملاء وحماية الخصوصية</h2>
            <p className="lp-p">
              عندما تستخدم منشأتك نظام مدار لإدارة العملاء والزيارات، فإننا نُعالج بيانات العملاء بوصفنا معالج بيانات نيابةً عن منشأتك (التي تُعدّ متحكم البيانات).
            </p>
            <div className="lp-callout">
              <strong>من حيث الأثر العملي:</strong> إذا كنت عميلاً لإحدى المنشآت التي تستخدم مدار، فإن بياناتك محفوظة في سجلات المنشأة الآمنة ولا تُستخدم لأي غرض خارج نطاق تقديم الخدمة لتلك المنشأة.
            </div>
            <p className="lp-p">
              لا نبيع بيانات العملاء ولا نستخدمها للتسويق الخارجي أو لتدريب نماذج الذكاء الاصطناعي العامة أو لأي غرض غير ذي صلة بتشغيل المنصة لصالح منشأتك.
            </p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">المشاركة مع الأطراف الثالثة</h2>
            <p className="lp-p">لا نبيع المعلومات الشخصية. نشارك المعلومات فقط في الحالات التالية:</p>
            <ul className="lp-ul">
              <li><strong>مزودو الخدمات:</strong> الاستضافة، التحليلات، الاتصالات، معالجة المدفوعات. كل مزود مُلزَم تعاقدياً بمعالجة البيانات وفق تعليماتنا فقط.</li>
              <li><strong>منشأتك:</strong> بيانات العملاء والزيارات تُسلَّم لمنشأتك بوصفها المتحكم الأصلي في تلك البيانات.</li>
              <li><strong>الامتثال القانوني:</strong> عند الاقتضاء بموجب القانون أو أمر قضائي أو للتحقيق في مخالفات شروطنا.</li>
              <li><strong>عمليات الدمج أو الاستحواذ:</strong> مع إشعار المتأثرين كلما اقتضى ذلك.</li>
            </ul>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">ملفات تعريف الارتباط (Cookies)</h2>
            <p className="lp-p">يستخدم موقعنا ملفات تعريف الارتباط للأغراض المحدودة التالية:</p>
            <ul className="lp-ul">
              <li>الملفات الضرورية لتشغيل الموقع وتذكر تفضيلاتك.</li>
              <li>التحليلات التي تساعدنا على فهم الصفحات الأكثر فائدة لأصحاب المنشآت.</li>
              <li>تتبع التحويل من الحملات الإعلانية إن وصلت عبر إعلان.</li>
            </ul>
            <p className="lp-p">يمكنك التحكم في ملفات تعريف الارتباط عبر إعدادات متصفحك. تعطيلها لن يؤثر على قدرتك على تصفح الموقع أو التواصل معنا.</p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">مدة الاحتفاظ بالبيانات</h2>
            <p className="lp-p">نحتفظ بالمعلومات فقط بقدر ما هو ضروري لتقديم الخدمات أو الامتثال للالتزامات القانونية أو تسوية النزاعات:</p>
            <ul className="lp-ul">
              <li>بيانات الاستفسار وزوار الموقع: حتى <strong>١٢ شهراً</strong> من آخر تواصل، ما لم تصبح عميلاً فعلياً.</li>
              <li>سجلات العملاء والفوترة: طوال فترة الاشتراك ثم <strong>سبع سنوات</strong> لأغراض ضريبية ومحاسبية وفق نظام الزكاة والضريبة السعودي.</li>
              <li>بيانات العملاء: تُحذف عند إنهاء الاشتراك بناءً على طلبك خلال مدة معقولة.</li>
              <li>البيانات المُجمَّعة وغير المُعرَّفة: تُحتفظ بها إلى أجل غير مسمى لتحسين المنصة.</li>
            </ul>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">حقوقك وخياراتك</h2>
            <p className="lp-p">وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL) والأنظمة المعمول بها، قد يحق لك:</p>
            <ul className="lp-ul">
              <li>الاطلاع على المعلومات الشخصية التي نحتفظ بها عنك.</li>
              <li>تصحيح المعلومات غير الدقيقة أو المكتملة.</li>
              <li>حذف المعلومات، مع مراعاة متطلبات الاحتفاظ القانونية والتعاقدية.</li>
              <li>الاعتراض على معالجة معينة أو تقييدها.</li>
              <li>إلغاء الاشتراك في التواصل التسويقي في أي وقت.</li>
            </ul>
            <p className="lp-p">لممارسة أي من هذه الحقوق، راسلنا على <strong style={{ color: C.accent2 }}>privacy@madar.software</strong></p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">الأمان والحماية</h2>
            <p className="lp-p">
              نطبق ضمانات إدارية وتقنية ومادية مصممة لحماية المعلومات من الوصول غير المصرح به أو التعديل أو الإفصاح أو الحذف. تشمل هذه الضمانات: تشفير البيانات أثناء النقل والتخزين، ضوابط الوصول وفق مبدأ الحد الأدنى من الصلاحيات، ومراجعات أمنية دورية للبنية التحتية.
            </p>
            <p className="lp-p">لا يوجد نظام آمن بالكامل. في حال اكتشاف أي اختراق يمس بياناتك، سنخطرك والجهات المختصة وفق ما يقتضيه القانون.</p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">التغييرات على هذه السياسة</h2>
            <p className="lp-p">
              قد نُحدِّث سياسة الخصوصية هذه من وقت لآخر. عند إجراء تغييرات جوهرية سنُحدِّث تاريخ "سارية المفعول" أعلاه وسنُخطر عملاءنا الفعليين مباشرةً. ننصحك بمراجعة هذه السياسة بصفة دورية.
            </p>
          </div>

          <div className="lp-section">
            <h2 className="lp-h2">تواصل معنا</h2>
            <p className="lp-p">لأي أسئلة حول سياسة الخصوصية أو كيفية تعاملنا مع معلوماتك:</p>
            <ul className="lp-ul">
              <li>البريد الإلكتروني: <strong style={{ color: C.accent2 }}>privacy@madar.software</strong></li>
              <li>واتساب: <a href="https://wa.me/966546666005" style={{ color: C.accent2, textDecoration: 'none' }}>966546666005+</a></li>
              <li>العنوان: مدار OS، الرياض، المملكة العربية السعودية</li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ background: C.dark, padding: '2.5rem 1.5rem', marginTop: '4rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: 'Noto Serif Arabic, serif', color: C.onDark, fontWeight: 600 }}>مدار OS</span>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Link to="/privacy" style={{ fontSize: 13, color: C.onDark2, textDecoration: 'none' }}>سياسة الخصوصية</Link>
            <Link to="/terms"   style={{ fontSize: 13, color: C.onDark2, textDecoration: 'none' }}>شروط الاستخدام</Link>
            <Link to="/"        style={{ fontSize: 13, color: C.onDark2, textDecoration: 'none' }}>الرئيسية</Link>
          </div>
          <span style={{ fontSize: 12, color: C.onDark2 }}>© ٢٠٢٦ مدار OS · جميع الحقوق محفوظة</span>
        </div>
      </footer>
    </div>
  )
}
