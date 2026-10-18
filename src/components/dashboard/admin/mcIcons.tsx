import type { ReactNode } from 'react'

export type McIconName =
  | 'grid' | 'chart' | 'mega' | 'users' | 'layers' | 'card' | 'gear' | 'wallet' | 'hand' | 'doc' | 'cal' | 'bank'
  | 'globe' | 'bot' | 'bell' | 'search' | 'arrow' | 'chev' | 'flag' | 'plus' | 'vid' | 'pin' | 'target' | 'news'
  | 'check' | 'building' | 'more' | 'phone' | 'out' | 'menu' | 'close'

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const ICONS: Record<McIconName, ReactNode> = {
  grid: <g fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></g>,
  chart: <path {...S} strokeWidth={2} d="M5 20V11M12 20V4M19 20v-7" />,
  mega: <path {...S} d="M3 11v3a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1zM18 8a5 5 0 0 1 0 8" />,
  users: <path {...S} d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  layers: <path {...S} d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  card: <path {...S} d="M5 5h14a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 19 19H5a2.5 2.5 0 0 1-2.5-2.5v-9A2.5 2.5 0 0 1 5 5zM3 10h18M7 15h4" />,
  gear: <g {...S} strokeWidth={1.8}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></g>,
  wallet: <path {...S} d="M4 7a2 2 0 0 1 2-2h11v4M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3M4 7h14a2 2 0 0 1 2 2v2M20 11h-4a2 2 0 0 0 0 4h4z" />,
  hand: <path {...S} strokeWidth={1.8} d="m11 17 2 2a1.4 1.4 0 0 0 2-2M14 14l2.5 2.5a1.4 1.4 0 0 0 2-2l-3.3-3.3M3 12l4-4 4 1 3-2 4 4M8 8l-5 4M21 12l-3-3" />,
  doc: <path {...S} d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" />,
  cal: <path {...S} d="M5 5h14a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 1 19 21H5a2.5 2.5 0 0 1-2.5-2.5v-11A2.5 2.5 0 0 1 5 5zM3 10h18M8 3v4M16 3v4" />,
  bank: <path {...S} d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  globe: <path {...S} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />,
  bot: <path {...S} d="M7 8h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM12 8V4M9 14h.01M15 14h.01" />,
  bell: <path {...S} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />,
  search: <path {...S} strokeWidth={2} d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5" />,
  arrow: <path {...S} strokeWidth={2.2} d="M19 12H5M11 6l-6 6 6 6" />,
  chev: <path {...S} strokeWidth={2} d="m15 6-6 6 6 6" />,
  flag: <path fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" d="M5 3v18M5 4h12l-2 4 2 4H5" />,
  plus: <path {...S} strokeWidth={2.2} d="M12 5v14M5 12h14" />,
  vid: <path {...S} strokeWidth={2} d="M5.5 6h8A2.5 2.5 0 0 1 16 8.5v7a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 3 15.5v-7A2.5 2.5 0 0 1 5.5 6zM16 10l5-3v10l-5-3" />,
  pin: <path {...S} strokeWidth={2} d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  target: <g {...S}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></g>,
  news: <path {...S} d="M4 4h12v16H6a2 2 0 0 1-2-2zM16 8h4v10a2 2 0 0 1-2 2M8 8h4M8 12h4M8 16h4" />,
  check: <path {...S} strokeWidth={3} d="m5 12 5 5 9-10" />,
  building: <path {...S} d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M2 21h20M8 8h2M8 12h2M8 16h2" />,
  more: <path {...S} d="M5 12h.01M12 12h.01M19 12h.01" />,
  phone: <path {...S} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  out: <path {...S} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path {...S} d="M4 7h16M4 12h16M4 17h16" />,
  close: <path {...S} d="M6 6l12 12M18 6 6 18" />,
}

export function McIcon({ name, size = 20 }: { name: McIconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>
  )
}
