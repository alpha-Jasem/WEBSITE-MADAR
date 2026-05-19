import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export const CustomCursor = () => {
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  if (isTouch) return null

  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const [hovered, setHovered] = useState(false)
  const [clicking, setClicking] = useState(false)
  const rafRef = useRef<number>()
  const mouseRef = useRef({ x: -100, y: -100 })

  const dotX = useSpring(cursorX, { damping: 30, stiffness: 900, mass: 0.1 })
  const dotY = useSpring(cursorY, { damping: 30, stiffness: 900, mass: 0.1 })
  const blobX = useSpring(cursorX, { damping: 22, stiffness: 180, mass: 0.5 })
  const blobY = useSpring(cursorY, { damping: 22, stiffness: 180, mass: 0.5 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }

    const onDown = () => setClicking(true)
    const onUp   = () => setClicking(false)

    const onEnter = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('button, a, [data-cursor-hover], input, textarea, select')) {
        setHovered(true)
      }
    }
    const onLeave = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('button, a, [data-cursor-hover], input, textarea, select')) {
        setHovered(false)
      }
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout',  onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout',  onLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [cursorX, cursorY])

  return (
    <>
      <style>{`
        * { cursor: none !important; }
        @media (pointer: coarse) { * { cursor: auto !important; } }
      `}</style>

      {/* Blob ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9997] rounded-full"
        style={{
          x: blobX,
          y: blobY,
          translateX: '-50%',
          translateY: '-50%',
          width:  hovered ? 56 : 40,
          height: hovered ? 56 : 40,
          background: hovered
            ? 'rgba(0,191,255,0.12)'
            : 'transparent',
          border: `1.5px solid ${hovered ? 'rgba(0,191,255,0.6)' : 'rgba(0,191,255,0.35)'}`,
          scale: clicking ? 0.85 : 1,
          mixBlendMode: 'normal',
          backdropFilter: hovered ? 'blur(2px)' : 'none',
          transition: 'width 0.25s ease, height 0.25s ease, background 0.25s ease, border-color 0.25s ease',
        }}
      />

      {/* Inner dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
          width:  hovered ? 6 : 8,
          height: hovered ? 6 : 8,
          background: '#00BFFF',
          scale: clicking ? 0.6 : 1,
          boxShadow: '0 0 8px rgba(0,191,255,0.8)',
          transition: 'width 0.2s ease, height 0.2s ease',
        }}
      />
    </>
  )
}
