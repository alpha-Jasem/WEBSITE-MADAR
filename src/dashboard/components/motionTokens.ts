// Shared motion vocabulary for the whole dv2 dashboard — one place that defines "how things move"
// so every card, number, and transition shares the same rhythm instead of drifting durations/easings.

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1]

export const DURATION_FAST = 0.15   // hover/tap micro-feedback
export const DURATION_MEDIUM = 0.3  // card/section entrances
export const DURATION_SLOW = 0.6    // large reveals (charts, dials)

// Springs use low bounce on purpose — a number or bar that overshoots its real value
// before settling reads as "playful", not "premium". Keep just enough motion to feel alive.
export const SPRING_SNAPPY = { type: 'spring' as const, bounce: 0.08, duration: 0.5 }
export const SPRING_SMOOTH = { type: 'spring' as const, bounce: 0.1, duration: 0.7 }

export const TRANSITION_ENTER = { duration: DURATION_MEDIUM, ease: EASE_OUT }
export const TRANSITION_FAST = { duration: DURATION_FAST, ease: EASE_OUT }
