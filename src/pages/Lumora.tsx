import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const VIDEOS = [
  { src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4', label: 'Golden Hour' },
  { src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4', label: 'Still Water' },
  { src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4', label: 'Deep Woods' },
  { src: 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4', label: 'Quiet Dawn' },
]

const OVERLAY_PNG = 'https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png'

const NAV_LINKS = ['How It Works', 'Features', 'Pricing', 'Community']
const STATS = ['60+ Deep Sessions', '12,000+ Creators', '4.8 User Satisfaction', 'Intentional-First Design']

const sysUI = { fontFamily: 'system-ui, sans-serif' }

export const Lumora = () => {
  const [activeVideo, setActiveVideo] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isDark = activeVideo === 2
  const darkColor = '#182C41'
  const contentColor = isDark ? darkColor : '#ffffff'

  const switchVideo = (i: number) => {
    if (i === activeVideo || isTransitioning) return
    setActiveVideo(i)
    setIsTransitioning(true)
    setTimeout(() => setIsTransitioning(false), 1000)
  }

  return (
    <section dir="ltr" className="relative w-full h-screen overflow-hidden bg-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
      <style>{`
        @keyframes lumora-bob {
          0%, 100% { transform: translateY(0) scale(1.03); }
          50% { transform: translateY(-6px) scale(1.03); }
        }
        .lumora-overlay { animation: lumora-bob 3s ease-in-out infinite; }
        .liquid-glass {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .liquid-glass::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(180deg,
            rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
            rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
            rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .lumora-input::placeholder { color: currentColor; opacity: 0.6; }
      `}</style>

      {/* ── Background video layer ── */}
      {VIDEOS.map((v, i) => (
        <video
          key={i}
          src={v.src}
          autoPlay muted loop playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${i === activeVideo ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}

      {/* ── Transparent PNG overlay ── */}
      <img
        src={OVERLAY_PNG}
        alt=""
        aria-hidden="true"
        className="lumora-overlay absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* ── Content layer ── */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 2 }}>

        {/* Navigation */}
        <nav className="flex items-center justify-between px-5 sm:px-10 pt-6">
          <span className="text-white italic text-xl sm:text-2xl">Lumora</span>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-2 liquid-glass rounded-full pl-6 pr-2 py-2">
            {NAV_LINKS.map(l => (
              <a key={l} href="#" className="text-white/90 hover:text-white text-sm px-3 transition-colors" style={sysUI}>{l}</a>
            ))}
            <button className="bg-white text-black text-sm font-medium rounded-full px-5 py-2 ml-1" style={sysUI}>Get Started</button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden liquid-glass rounded-full w-11 h-11 flex items-center justify-center relative"
            aria-label="Menu"
          >
            <Menu size={20} className="text-white absolute transition-all duration-300" style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? 'rotate(90deg) scale(0.75)' : 'rotate(0) scale(1)' }} />
            <X size={20} className="text-white absolute transition-all duration-300" style={{ opacity: menuOpen ? 1 : 0, transform: menuOpen ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0.75)' }} />
          </button>
        </nav>

        {/* Hero content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-5">
          <div className="liquid-glass rounded-full px-5 py-2 mb-7" style={{ color: contentColor, transition: 'color 700ms ease' }}>
            <span className="text-xs sm:text-sm" style={sysUI}>Over 10,000 minds already finding their clarity</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] max-w-4xl"
            style={{ lineHeight: 1.1, color: contentColor, transition: 'color 700ms ease' }}
          >
            Clarity in an Endlessly<br />Noisy Universe
          </h1>

          <p
            className="max-w-xl mt-6 leading-relaxed text-sm sm:text-base"
            style={{ ...sysUI, color: contentColor, opacity: 0.85, transition: 'color 700ms ease' }}
          >
            Rise above the chaos of pings, infinite scrolling, and relentless demands. Discover how to protect your presence and create with intention.
          </p>

          {/* Email input */}
          <div className="liquid-glass rounded-full flex items-center p-1.5 mt-8 w-full max-w-[320px] sm:max-w-sm" style={{ color: contentColor, transition: 'color 700ms ease' }}>
            <input
              type="email"
              placeholder="Your Best Email"
              className="lumora-input flex-1 bg-transparent outline-none border-none px-4 text-sm min-w-0"
              style={{ ...sysUI, color: contentColor }}
            />
            <button className="bg-white text-black text-sm font-medium rounded-full px-5 py-2.5 whitespace-nowrap" style={sysUI}>Get Early Access</button>
          </div>

          {/* Video switcher */}
          <div className="flex items-center gap-5 mt-10" style={{ color: contentColor, transition: 'color 700ms ease' }}>
            {VIDEOS.map((v, i) => (
              <button
                key={i}
                onClick={() => switchVideo(i)}
                className="text-xs sm:text-sm pb-1 transition-all duration-300"
                style={{
                  ...sysUI,
                  opacity: i === activeVideo ? 1 : 0.5,
                  borderBottom: `1px solid ${i === activeVideo ? 'currentColor' : 'transparent'}`,
                }}
                onMouseEnter={e => { if (i !== activeVideo) e.currentTarget.style.opacity = '0.8' }}
                onMouseLeave={e => { if (i !== activeVideo) e.currentTarget.style.opacity = '0.5' }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 px-5 pb-8">
          {STATS.map((s, i) => (
            <span key={s} className="flex items-center text-white/70 text-xs sm:text-sm" style={sysUI}>
              {i > 0 && <span className="hidden sm:inline mr-4 text-white/30">|</span>}
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div dir="ltr" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-8" onClick={() => setMenuOpen(false)}>
          {NAV_LINKS.map((l, i) => (
            <a
              key={l}
              href="#"
              className="text-white text-3xl"
              style={{
                ...sysUI,
                transition: 'all 500ms cubic-bezier(0.4,0,0.2,1)',
                transitionDelay: `${100 + i * 50}ms`,
                transform: 'translateY(0)',
              }}
            >
              {l}
            </a>
          ))}
          <button className="bg-white text-black text-lg font-medium rounded-full px-8 py-3 mt-4" style={{ ...sysUI, transition: 'all 500ms cubic-bezier(0.4,0,0.2,1)', transitionDelay: '300ms' }}>
            Get Started
          </button>
        </div>
      )}
    </section>
  )
}
