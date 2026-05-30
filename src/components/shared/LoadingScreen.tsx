import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
  speed: number
}

type LoadingScreenVariant = 'public' | 'portal'

const PortalLoadingScreen = () => (
  <motion.div
    className="fixed inset-0 z-[100] overflow-hidden"
    dir="rtl"
    style={{
      background:
        'linear-gradient(135deg, #f8fcff 0%, #eef9ff 48%, #f7fbff 100%)',
      fontFamily: 'Tajawal, Cairo, sans-serif',
    }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.22, ease: 'easeOut' }}
  >
    <div
      className="absolute inset-0 opacity-60"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,149,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(0,149,255,0.055) 1px, transparent 1px)',
        backgroundSize: '38px 38px',
      }}
    />
    <div
      className="absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl"
      style={{ background: 'rgba(0, 191, 255, 0.16)' }}
    />
    <div
      className="absolute right-24 bottom-10 h-80 w-80 rounded-full blur-3xl"
      style={{ background: 'rgba(79, 70, 229, 0.09)' }}
    />

    <div className="relative flex min-h-screen">
      <aside
        className="hidden w-[236px] shrink-0 border-l border-sky-100/80 bg-white/74 px-6 py-7 shadow-[0_20px_70px_rgba(15,84,122,0.08)] backdrop-blur xl:block"
      >
        <div className="mb-9 flex items-center gap-3">
          <img src="/logo-main.png" alt="Madar" className="h-11 w-auto object-contain" />
          <div>
            <p className="font-sora text-base font-bold leading-none text-slate-950">Madar.software</p>
            <p className="mt-1 text-xs font-semibold text-sky-500">مركز الإدارة</p>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-11 rounded-2xl bg-slate-100/80"
              initial={{ opacity: 0.45 }}
              animate={{ opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.08 }}
            />
          ))}
        </div>
      </aside>

      <main className="flex min-h-screen flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-5xl">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <div className="mb-3 h-3 w-24 rounded-full bg-sky-200/80" />
              <div className="h-9 w-72 max-w-[70vw] rounded-2xl bg-white/80 shadow-sm" />
            </div>
            <div className="flex items-center gap-3 rounded-full border border-sky-100 bg-white/84 px-4 py-3 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500" />
              </span>
              <span className="text-sm font-bold text-slate-700">جاري تجهيز اللوحة...</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                className="h-32 rounded-[26px] border border-sky-100 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,84,122,0.08)]"
                initial={{ opacity: 0.5, y: 8 }}
                animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
              >
                <div className="mb-7 h-4 w-16 rounded-full bg-slate-100" />
                <div className="mb-3 h-8 w-20 rounded-2xl bg-slate-100" />
                <div className="h-3 w-28 rounded-full bg-sky-100" />
              </motion.div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <motion.div
              className="h-72 rounded-[28px] border border-sky-100 bg-white/82 p-6 shadow-[0_18px_45px_rgba(15,84,122,0.08)]"
              initial={{ opacity: 0.58 }}
              animate={{ opacity: [0.58, 1, 0.58] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="mb-6 h-5 w-48 rounded-full bg-slate-100" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-sky-100/80" />
                    <div className="flex-1">
                      <div className="mb-2 h-4 w-2/5 rounded-full bg-slate-100" />
                      <div className="h-3 w-3/5 rounded-full bg-slate-100/80" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="h-72 rounded-[28px] border border-sky-100 bg-white/82 p-6 shadow-[0_18px_45px_rgba(15,84,122,0.08)]"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.45, repeat: Infinity, delay: 0.12 }}
            >
              <div className="mb-6 h-5 w-36 rounded-full bg-slate-100" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 rounded-2xl bg-slate-100/80" />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  </motion.div>
)

const PublicLoadingScreen = ({ onDone }: { onDone?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showText, setShowText] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const cx = W / 2
    const cy = H / 2
    const COUNT = W < 768 ? 40 : 65
    const LINK = W < 768 ? 100 : 140

    const nodes: Node[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7,
      r: Math.random() * 1.4 + 0.7,
      phase: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.022,
    }))

    const start = Date.now()
    let converge = false
    let raf: number

    const textTimer = setTimeout(() => {
      converge = true
      setShowText(true)
    }, 1400)

    const doneTimer = onDone ? setTimeout(onDone, 2900) : null

    const draw = () => {
      const t = Date.now() - start
      ctx.clearRect(0, 0, W, H)

      const convergeFactor = converge ? Math.min((t - 1400) / 900, 1) : 0

      nodes.forEach(n => {
        n.phase += n.speed
        if (converge) {
          n.x += (cx - n.x) * 0.035
          n.y += (cy - n.y) * 0.035
        } else {
          n.x += n.vx
          n.y += n.vy
          if (n.x < 0 || n.x > W) n.vx *= -1
          if (n.y < 0 || n.y > H) n.vy *= -1
        }
      })

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK) {
            const pulse = ((Math.sin(a.phase) + Math.sin(b.phase)) / 2) * 0.5 + 0.5
            const alpha = (1 - d / LINK) * 0.28 * pulse * (1 - convergeFactor * 0.85)
            ctx.strokeStyle = `rgba(0,191,255,${alpha})`
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const brightness = 0.45 + 0.55 * Math.sin(n.phase)
        const alpha = Math.max(0, 1 - convergeFactor * 1.1) * brightness

        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6)
        g.addColorStop(0, `rgba(0,191,255,${alpha * 0.55})`)
        g.addColorStop(1, 'rgba(0,191,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,191,255,${alpha})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(textTimer)
      if (doneTimer) clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      style={{ background: '#050810' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.82 }}
          animate={showText ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4"
        >
          {/* Logo: icon + shimmer text */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-main.png"
              alt="Madar"
              style={{ height: 56, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,191,255,0.5))' }}
            />
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>
              <span className="shimmer-text">Madar</span>
              <span className="shimmer-text-blue">.software</span>
            </span>
          </div>

          <motion.div
            className="w-20 h-px mt-1"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.7), transparent)' }}
            animate={{ opacity: [0.3, 1, 0.3], scaleX: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

export const LoadingScreen = ({ onDone, variant = 'public' }: { onDone?: () => void; variant?: LoadingScreenVariant }) => {
  return variant === 'portal' ? <PortalLoadingScreen /> : <PublicLoadingScreen onDone={onDone} />
}
