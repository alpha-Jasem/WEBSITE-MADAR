import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MONTHLY_LIMITS } from '../lib/constants'

export interface MonthlyUsage {
  cars: number
  whatsapp: number
  carsPct: number
  whatsappPct: number
  limits: { cars: number; whatsapp: number }
}

export function useMonthlyUsage(companyId: string | null, plan: string = 'starter'): MonthlyUsage {
  const limits = MONTHLY_LIMITS[plan] ?? MONTHLY_LIMITS.starter
  const [usage, setUsage] = useState({ cars: 0, whatsapp: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = async () => {
    if (!companyId) return
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthEnd = nextMonth.toISOString().slice(0, 10) + 'T00:00:00'

    const [carsResult, logsResult] = await Promise.all([
      supabase
        .from('cw_queue')
        .select('id', { count: 'exact', head: false })
        .eq('company_id', companyId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd),
      supabase
        .from('cw_audit_logs')
        .select('action', { count: 'exact', head: false })
        .eq('company_id', companyId)
        .eq('action', 'car_delivered')
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd),
    ])

    const cars = (carsResult.data ?? []).length
    const whatsapp = (logsResult.data ?? []).length
    setUsage({ cars, whatsapp })
  }

  useEffect(() => {
    if (!companyId) return
    fetch()
    intervalRef.current = setInterval(fetch, 10 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [companyId, plan])

  const pct = (val: number, limit: number) => Math.min(Math.round((val / limit) * 100), 100)

  return {
    ...usage,
    carsPct: pct(usage.cars, limits.cars),
    whatsappPct: pct(usage.whatsapp, limits.whatsapp),
    limits,
  }
}
