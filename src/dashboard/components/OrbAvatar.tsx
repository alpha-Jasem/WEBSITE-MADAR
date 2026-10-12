import type { CSSProperties } from 'react'

/** FNV-1a, so the same seed always gives the same orb. */
function hash(seed: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A soft blue / teal / violet gradient, different per person, with no letters. */
export function orbBackground(seed: string) {
  const h = hash(seed || 'madar')
  const base = 175 + (h % 105) // 175–280: teal → blue → violet
  const a = base
  const b = 175 + ((base - 175 + 35 + ((h >>> 8) % 40)) % 105)
  const c = 175 + ((base - 175 + 70 + ((h >>> 16) % 30)) % 105)
  const x = 22 + ((h >>> 4) % 30)
  const y = 18 + ((h >>> 12) % 30)
  return [
    `radial-gradient(circle at ${x}% ${y}%, hsl(${a} 95% 82% / .95), transparent 52%)`,
    `radial-gradient(circle at ${100 - x}% ${100 - y / 2}%, hsl(${c} 85% 58% / .9), transparent 60%)`,
    `linear-gradient(${(h >>> 20) % 360}deg, hsl(${b} 78% 52%), hsl(${a} 80% 62%))`,
  ].join(', ')
}

export function OrbAvatar({ seed, size = 28, imageUrl, style, className }: {
  seed: string
  size?: number
  /** A real picture (e.g. the company logo) wins over the orb. */
  imageUrl?: string | null
  style?: CSSProperties
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        width: size, height: size, borderRadius: '50%', flex: 'none', display: 'block', overflow: 'hidden',
        background: imageUrl ? 'var(--raise)' : orbBackground(seed),
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
        ...style,
      }}
    >
      {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
    </span>
  )
}
