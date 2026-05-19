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

export const LoadingScreen = ({ onDone }: { onDone: () => void }) => {
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

    const doneTimer = setTimeout(onDone, 2900)

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
      clearTimeout(doneTimer)
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
          className="flex flex-col items-center gap-3"
        >
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-[0.22em] uppercase"
            style={{
              fontFamily: 'Sora, sans-serif',
              color: 'white',
              textShadow: '0 0 70px rgba(0,191,255,0.75), 0 0 25px rgba(0,191,255,0.35)',
            }}
          >
            MADAR
          </h1>

          <p
            className="text-[11px] tracking-[0.45em] uppercase"
            style={{ color: 'rgba(0,191,255,0.65)', fontFamily: 'Work Sans, sans-serif' }}
          >
            AI Automation
          </p>

          <motion.div
            className="w-14 h-px mt-1"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,191,255,0.7), transparent)' }}
            animate={{ opacity: [0.3, 1, 0.3], scaleX: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
