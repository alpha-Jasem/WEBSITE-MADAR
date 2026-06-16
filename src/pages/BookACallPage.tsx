import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { openWhatsAppChat } from '../lib/whatsapp'

/* ── design tokens ─────────────────────────────────────────────── */
const C = {
  paper: '#FBFAF7', paper2: '#F4F1EA', paper3: '#ECE7DB',
  ink: '#0F1A15', ink2: '#44524C', ink3: '#5E6A64',
  rule: '#E4DFD2', rule2: '#D6CFBD',
  accent: '#0F3D2E', accent2: '#1B6347', brand: '#2BB573',
  dark: '#0A1B14', onDark: '#EDE7D8', onDark2: '#C2D0C7',
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Serif+Arabic:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
.bc-body { font-family: 'IBM Plex Sans Arabic', 'Tajawal', system-ui, sans-serif; direction: rtl; text-align: right; }
.bc-serif { font-family: 'Noto Serif Arabic', 'Cairo', serif; }
.bc-mono  { font-family: 'IBM Plex Mono', monospace; }
.bc-eyebrow {
  font-family: 'IBM Plex Mono', monospace; font-size: 11px;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: ${C.accent2}; display: inline-flex; align-items: center; gap: 10px;
}
.bc-eyebrow::before { content: ""; width: 22px; height: 1px; background: ${C.accent2}; }
.bc-nav {
  position: fixed; top: 0; inset-inline: 0; z-index: 100;
  background: rgba(251,250,247,0.88);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid ${C.rule};
}
.bc-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  background: ${C.accent}; color: #FBFAF7;
  border: none; border-radius: 4px; padding: 14px 28px;
  font-family: 'IBM Plex Sans Arabic', sans-serif;
  font-size: 15px; font-weight: 600; cursor: pointer;
  text-decoration: none; transition: background 0.2s, transform 0.15s;
  width: 100%;
}
.bc-btn-primary:hover { background: ${C.accent2}; transform: translateY(-1px); }
.bc-btn-wa {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  background: #25D366; color: #fff;
  border: none; border-radius: 4px; padding: 14px 28px;
  font-family: 'IBM Plex Sans Arabic', sans-serif;
  font-size: 15px; font-weight: 600; cursor: pointer;
  text-decoration: none; transition: background 0.2s, transform 0.15s;
  width: 100%;
}
.bc-btn-wa:hover { background: #1ebe5b; transform: translateY(-1px); }
.bc-card {
  background: #fff; border: 1px solid ${C.rule};
  border-radius: 12px; padding: 1.75rem;
  transition: box-shadow 0.2s;
}
.bc-card:hover { box-shadow: 0 8px 32px rgba(15,26,21,0.08); }
.bc-trust-row { display: flex; align-items: center; gap: 10px; padding: 0.9rem 0; border-bottom: 1px solid ${C.rule}; }
.bc-trust-row:last-child { border-bottom: none; }
.bc-check { width: 20px; height: 20px; background: rgba(43,181,115,0.12); border: 1px solid rgba(43,181,115,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bc-form-input {
  width: 100%; box-sizing: border-box;
  border: 1px solid ${C.rule2}; border-radius: 6px;
  padding: 11px 14px; font-size: 14px; font-family: 'IBM Plex Sans Arabic', sans-serif;
  background: ${C.paper}; color: ${C.ink}; outline: none; direction: rtl; text-align: right;
  transition: border-color 0.2s;
}
.bc-form-input:focus { border-color: ${C.accent2}; }
.bc-form-input::placeholder { color: ${C.ink3}; }
@media (max-width: 860px) {
  .bc-grid { grid-template-columns: 1fr !important; }
}
`

const trustItems = [
  { title: 'مكالمة عمل حقيقية لا عرض ترويجي', body: 'نُراجع وضع منشأتك الحالي ونحدد معك أين يكون مدار OS الأنسب.' },
  { title: 'ثلاثون دقيقة بالضبط', body: 'لا نتجاوزها. ملخص يصلك بالبريد فور انتهاء المكالمة.' },
  { title: 'إجابة صريحة في النهاية', body: 'إذا لم يكن مدار مناسباً لك، سنقول ذلك بصدق ونقترح البديل.' },
]

export const BookACallPage = () => {
  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [biz, setBiz]     = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleWhatsApp = () => {
    const msg = `مرحباً، اسمي ${name || '...'} وأود حجز استشارة لمنشأتي${biz ? ` (${biz})` : ''}. رقمي: ${phone || '...'}`
    openWhatsAppChat(msg)
  }

  return (
    <div className="bc-body" style={{ background: C.paper, minHeight: '100vh' }}>
      <style>{css}</style>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="bc-nav">
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

      {/* ── Main content ───────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8rem 1.5rem 5rem' }}>

        {/* Eyebrow + heading */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <span className="bc-eyebrow" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>استشارة مجانية · ٣٠ دقيقة</span>
          <h1 className="bc-serif" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)', fontWeight: 700, lineHeight: 1.2, color: C.ink, margin: '1.25rem 0 1rem' }}>
            احجز استشارة مع مدار OS
          </h1>
          <p style={{ fontSize: '1.1rem', color: C.ink2, maxWidth: 560, margin: '0 auto', lineHeight: 1.8 }}>
            جلسة عمل لا عرض ترويجي. نُراجع وضع منشأتك الحالي ونُخبرك بصدق هل مدار هو الحل المناسب لك.
          </p>
        </div>

        {/* Grid: form + trust */}
        <div className="bc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>

          {/* Left: form */}
          <div className="bc-card">
            <h2 className="bc-serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: C.ink, marginBottom: '1.5rem' }}>
              أخبرنا عن منشأتك
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: 'block', marginBottom: 6 }}>الاسم الكريم</label>
                <input className="bc-form-input" placeholder="محمد العتيبي" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: 'block', marginBottom: 6 }}>رقم الجوال (واتساب)</label>
                <input className="bc-form-input" placeholder="05xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" style={{ textAlign: 'left' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: 'block', marginBottom: 6 }}>اسم منشأتك ونوعها</label>
                <input className="bc-form-input" placeholder="مغسلة نايف - الرياض / عيادة الابتسامة" value={biz} onChange={e => setBiz(e.target.value)} />
              </div>
            </div>

            <div style={{ marginTop: '1.75rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="bc-btn-wa" onClick={handleWhatsApp}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                تواصل عبر واتساب
              </button>
              <p style={{ fontSize: 12, color: C.ink3, textAlign: 'center' }}>سيرد عليك فريقنا خلال ساعات العمل</p>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.5rem 0' }}>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
              <span style={{ fontSize: 12, color: C.ink3 }}>أو</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>

            <a href="mailto:hello@madar.software" className="bc-btn-primary" style={{ background: C.paper2, color: C.ink, border: `1px solid ${C.rule2}` }}>
              راسلنا بالبريد الإلكتروني
            </a>
          </div>

          {/* Right: trust + testimonial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* What to expect */}
            <div className="bc-card">
              <h3 className="bc-serif" style={{ fontSize: '1rem', fontWeight: 700, color: C.ink, marginBottom: '0.5rem' }}>ماذا تتوقع من الاستشارة؟</h3>
              {trustItems.map(item => (
                <div key={item.title} className="bc-trust-row">
                  <div className="bc-check">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: 0 }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: C.ink2, margin: '2px 0 0', lineHeight: 1.6 }}>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div style={{ background: C.dark, borderRadius: 12, padding: '1.75rem' }}>
              <p style={{ fontSize: '1rem', fontStyle: 'italic', color: C.onDark, lineHeight: 1.8, marginBottom: '1.25rem' }}>
                "دخلت الاستشارة وأنا أظن أحتاج نظام كاشير فقط. طلعت وأنا عارف وين أخسر كل يوم — ووش أسويه."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: C.accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: C.onDark, fontWeight: 700, fontFamily: 'Noto Serif Arabic, serif' }}>ن</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.onDark }}>نايف العتيبي</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.onDark2 }}>صاحب مغسلة · الرياض</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { num: '+٥٠', label: 'منشأة تستخدم مدار' },
                { num: '٣٠ د', label: 'الاستشارة بالضبط' },
                { num: '٠ ر.س', label: 'تكلفة الاستشارة' },
                { num: '٢٤ س', label: 'رد خلال ساعات العمل' },
              ].map(s => (
                <div key={s.label} style={{ background: C.paper2, borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
                  <p className="bc-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: C.ink, margin: 0 }}>{s.num}</p>
                  <p style={{ fontSize: 12, color: C.ink2, margin: '4px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ background: C.dark, padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
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
