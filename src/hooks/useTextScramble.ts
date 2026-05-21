import { useState, useEffect, useRef } from 'react'

const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*'

export const useTextScramble = (text: string, trigger: boolean, delay = 0) => {
  const [output, setOutput] = useState(text)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const delayRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!trigger) return

    const isArabic = /[\u0600-\u06FF]/.test(text)
    // Randomizing Arabic glyphs, especially near mixed LTR text like "24/7",
    // creates bidirectional reordering and a broken first-load animation.
    if (isArabic) {
      setOutput(text)
      return
    }

    const chars = LATIN
    const len = text.length

    const start = () => {
      let frame = 0
      const totalFrames = Math.max(20, len * 2)

      timerRef.current = setInterval(() => {
        frame++
        const progress = frame / totalFrames

        setOutput(
          text.split('').map((char, i) => {
            if (char === ' ' || char === '\n') return char
            const revealed = i / len < progress * 1.3
            if (revealed) return text[i]
            return chars[Math.floor(Math.random() * chars.length)]
          }).join('')
        )

        if (frame >= totalFrames) {
          clearInterval(timerRef.current)
          setOutput(text)
        }
      }, 28)
    }

    delayRef.current = setTimeout(start, delay * 1000)

    return () => {
      clearTimeout(delayRef.current)
      clearInterval(timerRef.current)
    }
  }, [text, trigger, delay])

  return output
}
