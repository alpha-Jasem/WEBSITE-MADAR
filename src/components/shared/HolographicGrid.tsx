import { useEffect, useRef } from 'react'

interface Props {
  className?: string
}

export const HolographicGrid = ({ className = '' }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: 0.5, y: 0.5 })
  const rafRef    = useRef<number>()
  const timeRef   = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top)  / rect.height,
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const draw = (ts: number) => {
      timeRef.current = ts * 0.001
      const t = timeRef.current
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.clearRect(0, 0, W, H)

      const COLS = 18
      const ROWS = 12
      const cellW = W / COLS
      const cellH = H / ROWS

      for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
          const bx = c * cellW
          const by = r * cellH

          /* 3D perspective tilt toward mouse */
          const dx = (mx - 0.5) * 80
          const dy = (my - 0.5) * 50
          const px = bx + dx * (r / ROWS - 0.5) * 2
          const py = by + dy * (c / COLS - 0.5) * 2

          /* wave */
          const wave = Math.sin(c * 0.4 + t * 1.2) * 6 + Math.cos(r * 0.5 + t * 0.9) * 4
          const fx = px
          const fy = py + wave

          /* distance from mouse for glow */
          const distX = (c / COLS) - mx
          const distY = (r / ROWS) - my
          const dist  = Math.sqrt(distX * distX + distY * distY)
          const glow  = Math.max(0, 1 - dist * 2.5)

          /* draw node */
          if (c < COLS && r < ROWS) {
            const nx = (c + 0.5) * cellW + dx * (r / ROWS - 0.5) * 2
            const ny = (r + 0.5) * cellH + wave + dy * (c / COLS - 0.5) * 2

            /* horizontal line */
            if (c + 1 <= COLS) {
              const nx2 = (c + 1.5) * cellW + dx * (r / ROWS - 0.5) * 2
              const lineGlow = glow * 0.85 + 0.05
              const hue = (200 + dist * 60 + t * 8) % 360
              ctx.beginPath()
              ctx.moveTo(nx, ny)
              ctx.lineTo(nx2, ny)
              ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${lineGlow * 0.25})`
              ctx.lineWidth   = 0.5 + glow * 1.2
              ctx.stroke()
            }
            /* vertical line */
            if (r + 1 <= ROWS) {
              const ny2 = (r + 1.5) * cellH + wave + dy * (c / COLS - 0.5) * 2
              const lineGlow = glow * 0.85 + 0.05
              const hue = (210 + dist * 60 + t * 8) % 360
              ctx.beginPath()
              ctx.moveTo(nx, ny)
              ctx.lineTo(nx, ny2)
              ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${lineGlow * 0.25})`
              ctx.lineWidth   = 0.5 + glow * 1.2
              ctx.stroke()
            }
          }

          /* intersection dot */
          if (glow > 0.3) {
            const hue = (190 + glow * 40 + t * 15) % 360
            ctx.beginPath()
            ctx.arc(fx, fy, 1.5 + glow * 2.5, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${glow * 0.9})`
            ctx.fill()
          } else {
            ctx.beginPath()
            ctx.arc(fx, fy, 1, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(0,191,255,${0.08 + glow * 0.15})`
            ctx.fill()
          }
        }
      }

      /* Mouse glow pulse */
      const gx = mx * W
      const gy = my * H
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.25)
      grad.addColorStop(0, `rgba(0,191,255,${0.06 + Math.sin(t * 2) * 0.02})`)
      grad.addColorStop(1, 'rgba(0,191,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  )
}
