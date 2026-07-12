import { Link } from 'react-router-dom'

export const NotFound = () => (
  <main
    dir="rtl"
    style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      background: '#0B120E',
      fontFamily: '"IBM Plex Sans Arabic", Cairo, Tahoma, sans-serif',
    }}
  >
    <img
      src="/404-bg.png"
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        transform: 'scaleX(-1)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(270deg, rgba(6,10,8,0.94) 0%, rgba(6,10,8,0.78) 32%, rgba(6,10,8,0.15) 62%, rgba(6,10,8,0) 78%)',
      }}
    />

    <div
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 1240,
        margin: '0 auto',
        padding: '0 28px',
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: '"Sora", sans-serif',
            fontSize: 'clamp(72px, 11vw, 128px)',
            fontWeight: 200,
            lineHeight: 1,
            color: '#fff',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          404
        </div>
        <div
          style={{
            fontFamily: '"Sora", sans-serif',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.42)',
            letterSpacing: '0.02em',
            marginBottom: 28,
          }}
        >
          خطأ :(
        </div>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.9,
            color: 'rgba(255,255,255,0.75)',
            marginBottom: 40,
          }}
        >
          مو كل رابط يودّيك مكان صح.
          <br />
          هذا الرابط وحد منهم :)
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 30px',
            background: '#fff',
            color: '#0B120E',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textDecoration: 'none',
          }}
        >
          استكشف مدار
          <span aria-hidden="true">⚡</span>
        </Link>
      </div>
    </div>
  </main>
)
