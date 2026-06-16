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
.lt-body { font-family: 'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif; direction: rtl; text-align: right; }
.lt-h1  { font-family: 'Noto Serif Arabic', 'Cairo', serif; }
.lt-mono { font-family: 'IBM Plex Mono', monospace; }
.lt-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: ${C.accent2}; display: inline-flex; align-items: center; gap: 10px;
}
.lt-eyebrow::before { content: ""; width: 22px; height: 1px; background: ${C.accent2}; }
.lt-nav {
  position: fixed; top: 0; inset-inline: 0; z-index: 100;
  background: rgba(251,250,247,0.88);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid ${C.rule};
}
.lt-section { padding: 2rem 0; border-bottom: 1px solid ${C.rule}; }
.lt-section:last-child { border-bottom: none; }
.lt-h2 { font-family: 'Noto Serif Arabic', serif; font-size: 1.2rem; font-weight: 700; color: ${C.ink}; margin-bottom: 0.75rem; }
.lt-h3 { font-size: 0.95rem; font-weight: 600; color: ${C.ink}; margin: 1rem 0 0.4rem; }
.lt-p  { font-size: 0.95rem; line-height: 1.9; color: ${C.ink2}; margin-bottom: 0.75rem; }
.lt-ul { list-style: none; padding: 0; margin: 0.5rem 0 0.75rem; }
.lt-ul li { font-size: 0.9rem; line-height: 1.8; color: ${C.ink2}; padding-right: 1.2rem; position: relative; }
.lt-ul li::before { content: "—"; position: absolute; right: 0; color: ${C.brand}; }
.lt-callout {
  background: ${C.paper2}; border-right: 3px solid ${C.accent2};
  border-radius: 6px; padding: 1rem 1.25rem; margin: 1rem 0;
  font-size: 0.9rem; line-height: 1.8; color: ${C.ink2};
}
.lt-callout strong { color: ${C.ink}; }
.lt-caps {
  background: ${C.paper2}; border: 1px solid ${C.rule2};
  border-radius: 6px; padding: 1rem 1.25rem; margin: 1rem 0;
  font-size: 0.85rem; line-height: 1.8; color: ${C.ink3};
  font-family: 'IBM Plex Sans Arabic', sans-serif;
}
`

export const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="lt-body" style={{ background: C.paper, minHeight: '100vh', color: C.ink }}>
      <style>{css}</style>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="lt-nav">
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
          <span className="lt-eyebrow">قانوني · وثيقة ٠٢</span>
          <h1 className="lt-h1" style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)', fontWeight: 700, lineHeight: 1.25, margin: '1.5rem 0 1rem', color: C.ink }}>
            شروط الاستخدام
          </h1>
          <p className="lt-p" style={{ fontSize: '1.1rem', maxWidth: 640 }}>
            الشروط التي تحكم استخدامك لموقع مدار OS والبرنامج الذي نقدمه والأنظمة التي ننشرها لصالح منشأتك.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <span className="lt-mono" style={{ fontSize: 12, color: C.ink3 }}>سارية المفعول · يناير ١، ٢٠٢٦</span>
            <span style={{ color: C.rule2 }}>·</span>
            <span className="lt-mono" style={{ fontSize: 12, color: C.ink3 }}>الإصدار · ١.٠</span>
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────── */}
        <div style={{ maxWidth: 720 }}>

          <div className="lt-section">
            <h2 className="lt-h2">قبول الشروط</h2>
            <p className="lt-p">
              تحكم شروط الاستخدام هذه ("الشروط") وصولك إلى موقع مدار OS وبرنامجنا وأي أنظمة أو خدمات ذات صلة تقدمها مدار OS ("مدار"، "نحن"، "لنا"). باستخدامك لموقعنا أو طلب تجربة النظام أو توقيع اتفاقية برنامج معنا، فإنك توافق على الالتزام بهذه الشروط.
            </p>
            <p className="lt-p">
              إذا كنت تُبرم هذه الشروط نيابةً عن منشأة أو مؤسسة، فأنت تُقرّ بأنك تملك صلاحية إلزام تلك الجهة. في هذه الحالة، تعني كلمة "أنت" الشخصَ الطبيعيَّ ومنشأته معاً.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">البرنامج والخدمات</h2>
            <p className="lt-p">تقدم مدار OS منظومة أنظمة تشغيل للمنشآت التجارية، قد تشمل أياً من المكونات التالية أو جميعها:</p>
            <ul className="lt-ul">
              <li>نظام إدارة طابور الانتظار وتتبع الخدمات في الوقت الفعلي.</li>
              <li>نظام تسجيل العملاء الذاتي عبر QR واستلام السيارة أو الخدمة.</li>
              <li>شاشة انتظار حية للعملاء مع إشعارات واتساب عند الجاهزية.</li>
              <li>لوحة تشغيل للموظفين مع تتبع الحالات والإيرادات.</li>
              <li>برنامج ولاء وتتبع زيارات العملاء.</li>
              <li>تقارير مالية وضريبية (شاملة ضريبة القيمة المضافة) وتقارير أداء الموظفين.</li>
              <li>واجهة برمجة تطبيقات (API) للتكامل مع منصات خارجية.</li>
            </ul>
            <p className="lt-p">
              الخدمات المحددة في اشتراكك مُبيَّنة في اتفاقية برنامجك المكتوبة. تسري هذه الشروط بالإضافة لتلك الاتفاقية؛ وفي حال تعارض، تسود الاتفاقية.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">الأهلية والإقرارات</h2>
            <p className="lt-p">أنت تُقرّ وتضمن ما يلي:</p>
            <ul className="lt-ul">
              <li>أن عمرك لا يقل عن ١٨ عاماً وأنك قادر على إبرام عقد ملزم قانونياً.</li>
              <li>أنك تملك المنشأة أو مُخوَّل رسمياً بتشغيلها.</li>
              <li>أن منشأتك تحمل جميع التراخيص والسجلات التجارية المطلوبة لتقديم خدماتها.</li>
              <li>أن الخدمات والعروض التي توجهنا للترويج لها مشروعة ومدعومة بمعلومات صحيحة.</li>
              <li>أنك حصلت على جميع الموافقات اللازمة لمشاركة بيانات العملاء معنا بهدف تلقي خدماتنا.</li>
            </ul>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">الحسابات ومسؤولياتك</h2>
            <p className="lt-p">
              عند الاشتراك أو التهيئة، قد تتلقى بيانات دخول للوحة تشغيل مدار أو الأنظمة المرتبطة. أنت مسؤول عن:
            </p>
            <ul className="lt-ul">
              <li>الحفاظ على سرية بيانات الدخول وعدم مشاركتها مع غير المُخوَّلين.</li>
              <li>جميع الأنشطة التي تجري تحت حساباتك.</li>
              <li>إبلاغنا فوراً بأي وصول غير مصرح به أو اشتباه أمني.</li>
              <li>تقديم معلومات دقيقة وحديثة وكاملة عند الطلب.</li>
            </ul>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">الرسوم والفوترة والاسترداد</h2>
            <p className="lt-p">رسوم خدماتنا مُبيَّنة في اتفاقية برنامجك. ما لم تنص الاتفاقية على خلاف ذلك:</p>
            <ul className="lt-ul">
              <li>رسوم الاشتراك تُحصَّل مقدماً وفق الجدول المتفق عليه وغير قابلة للاسترداد بعد بدء دورة الفوترة.</li>
              <li>تكاليف البنية التحتية (مثل إرسال الإشعارات والرسائل) تُفوتَر بالتكلفة الفعلية وتُبلَّغ شهرياً.</li>
              <li>المدفوعات المتأخرة قد تخضع لفائدة تأخيرية بالحدود المسموح بها نظاماً.</li>
              <li>أنت تُخوِّلنا خصم جميع المستحقات من وسيلة الدفع المسجلة لديك عند استحقاقها.</li>
            </ul>
            <p className="lt-p">شروط الاسترداد والائتمان المحددة لاشتراكك مُبيَّنة في اتفاقية برنامجك.</p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">الملكية الفكرية</h2>
            <p className="lt-p">
              جميع أساليب مدار ونظمها وتصاميمها وبرمجياتها ونماذجها ولوحاتها التشغيلية وأنظمة التقارير وعلاماتها التجارية وحقوق النشر مملوكة لنا ومحمية بموجب القانون.
            </p>
            <p className="lt-p">مع الوفاء الكامل بمدفوعاتك والالتزام بهذه الشروط، نمنحك ترخيصاً غير حصري وغير قابل للتحويل لاستخدام المخرجات التي أنتجناها لمنشأتك.</p>
            <p className="lt-p">عند إنهاء الاشتراك:</p>
            <ul className="lt-ul">
              <li>تحتفظ بملكية علامتك التجارية وبيانات عملائك وعلاقاتهم.</li>
              <li>تحصل على ترخيص دائم لمواصلة استخدام لوحات التشغيل والتصاميم التي بنيناها خصيصاً لمنشأتك.</li>
              <li>نحتفظ بملكية أساليبنا وقوالبنا وبرمجياتنا وأسرارنا التجارية.</li>
              <li>نحتفظ بحق استخدام بيانات الأداء المُجمَّعة وغير المُعرَّفة لتحسين المنصة.</li>
            </ul>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">السرية</h2>
            <p className="lt-p">
              يجوز لكل طرف الاطلاع على معلومات غير عامة للطرف الآخر ("المعلومات السرية") خلال فترة التعامل. يتعهد كل طرف بعدم استخدام المعلومات السرية للطرف الآخر إلا لتنفيذ هذه الشروط، وبحمايتها بمستوى حماية لا يقل عن ما يطبقه على معلوماته السرية الخاصة.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">إخلاء المسؤولية وعدم ضمان النتائج</h2>
            <div className="lt-caps">
              تُقدَّم خدماتنا "كما هي" و"كما تتوفر" دون ضمانات من أي نوع. لا نضمن أي نتيجة تجارية أو مالية محددة. النتائج تعتمد على عوامل كثيرة خارج سيطرتنا، منها: جودة الخدمة التي تقدمها منشأتك، وطريقة التشغيل، وأوضاع السوق.
            </div>
            <p className="lt-p">
              أي أرقام أو دراسات حالة أو شهادات معروضة في موقعنا هي نتائج حقيقية لعملاء محددين في ظروف معينة ولا تمثل النتائج الاعتيادية المتوقعة.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">تحديد المسؤولية</h2>
            <div className="lt-caps">
              بالقدر الأقصى المسموح به نظاماً: لا يتحمل أي من الطرفين مسؤولية الأضرار غير المباشرة أو العرضية أو التبعية أو خسائر الأرباح أو الإيرادات أو البيانات. تُحدَّد مسؤوليتنا الإجمالية بمجموع ما دفعته فعلياً في الاثني عشر شهراً السابقة للحادثة موضع المطالبة.
            </div>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">التعويض</h2>
            <p className="lt-p">
              توافق على تعويضنا وتبرئة ذمتنا من أي مطالبات أو أضرار أو غرامات أو نفقات (بما فيها أتعاب المحامين) تنشأ عن: (أ) الخدمات التي تقدمها منشأتك لعملائها؛ (ب) إخلالك بهذه الشروط أو إقراراتك؛ (ج) المحتوى أو العروض التي توجهنا لنشرها؛ (د) مخالفتك لأي نظام أو حقوق طرف ثالث.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">مدة العقد والإنهاء</h2>
            <p className="lt-p">
              يبدأ اشتراكك عند توقيع اتفاقية البرنامج ويستمر للمدة المنصوص عليها فيها. يحق لأي من الطرفين الإنهاء في حال الإخلال الجوهري مع إشعار كتابي مسبق مدته <strong>ثلاثون (٣٠) يوماً</strong> وفرصة للمعالجة. يحق لنا التعليق أو الإنهاء الفوري إذا رأينا أن الاستمرار يُعرِّضنا لمخاطر نظامية.
            </p>
            <p className="lt-p">عند الإنهاء: (أ) يجب سداد جميع الرسوم المستحقة حتى تاريخ الإنهاء؛ (ب) نُساعدك في استرداد بياناتك خلال مدة معقولة؛ (ج) يبقى الترخيص على المخرجات المُنتَجة لمنشأتك سارياً شريطة اكتمال السداد.</p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">القانون الحاكم وتسوية النزاعات</h2>
            <p className="lt-p">
              تخضع هذه الشروط لأنظمة المملكة العربية السعودية. تُحل أي نزاعات ناشئة عنها أو عن خدماتنا عبر المحاكم التجارية السعودية المختصة في الرياض، وذلك بعد محاولة التسوية الودية خلال <strong>ثلاثين (٣٠) يوماً</strong> من إشعار النزاع.
            </p>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">أحكام متنوعة</h2>
            <ul className="lt-ul">
              <li><strong>الاتفاقية الكاملة:</strong> هذه الشروط مع اتفاقية البرنامج وسياسة الخصوصية تمثل الاتفاقية الكاملة بيننا.</li>
              <li><strong>التعديلات:</strong> قد نُحدِّث هذه الشروط؛ وسنُخطر العملاء الفعليين بأي تغييرات جوهرية.</li>
              <li><strong>التنازل:</strong> لا يجوز لك التنازل عن هذه الشروط بدون موافقتنا الخطية.</li>
              <li><strong>الفصل:</strong> إذا وُجد أي بند غير قابل للتنفيذ، يبقى سائر الشروط سارياً.</li>
              <li><strong>العلاقة:</strong> الطرفان مستقلان؛ ولا تنشئ هذه الشروط وكالة أو شراكة أو علاقة توظيف.</li>
              <li><strong>القوة القاهرة:</strong> لا يتحمل أي طرف المسؤولية عن التأخير الناجم عن أسباب خارج سيطرته المعقولة.</li>
            </ul>
          </div>

          <div className="lt-section">
            <h2 className="lt-h2">تواصل معنا</h2>
            <p className="lt-p">هل لديك أسئلة حول شروط الاستخدام؟ يسعدنا المساعدة.</p>
            <ul className="lt-ul">
              <li>البريد الإلكتروني: <strong style={{ color: C.accent2 }}>legal@madar.software</strong></li>
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
