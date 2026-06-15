export interface DailyUsage {
  maxPct: number
  ringColor: string
}

export function useDailyUsage(_companyId: string | null, _plan: string = 'starter'): DailyUsage {
  return { maxPct: 0, ringColor: '#0099CC' }
}
