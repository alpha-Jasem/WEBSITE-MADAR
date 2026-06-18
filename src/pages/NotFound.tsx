import { Link } from 'react-router-dom'

export const NotFound = () => (
  <main style={{
    fontFamily: 'Cairo, Tahoma, sans-serif',
    direction: 'rtl',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F4F5F8',
    color: '#1B2740',
    padding: '32px 20px',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 72, fontWeight: 200, lineHeight: 1, marginBottom: 16, color: '#2563EB', fontFamily: 'Sora, sans-serif' }}>404</div>
    <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>الصفحة غير موجودة</h1>
    <p style={{ fontSize: 15, color: '#5A6880', marginBottom: 32, maxWidth: 360, lineHeight: 1.7 }}>
      يبدو أن هذا الرابط غير موجود أو تم نقله.
    </p>
    <Link
      to="/"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 24px',
        background: '#1E3A6E',
        color: '#fff',
        borderRadius: 4,
        fontSize: 15,
        fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      العودة للرئيسية ←
    </Link>
  </main>
)
