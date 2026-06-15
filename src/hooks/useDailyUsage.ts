import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DAILY_LIMITS } from '../lib/constants'

export interface DailyUsage {
  cars: number
  qr: number
  screenUpdates: number
  whatsapp: number
  carsPct: number
  qrPct: number
  screenPct: number
  whatsappPct: number
  maxPct: number
  topMetric: string
  ringColor: string
  limits: { cars: number; qr: number; screenUpdates: number; whatsapp: number }
}

function getRingColor(pct: number): string {
  if (pct >= 100) return '#EF4444'
  if (pct >= 90)  return '#F97316'
  if (pct >= 70)  return '#F59E0B'
  return '#0099CC'
}

const METRIC_LABELS: Record<string, string> = {
  cars: 'السيارات',
  qr: 'QR',
  screenUpdates: 'الشاشة',
  whatsapp: 'واتساب',
}

export function useDailyUsage(companyId: string | null, plan: string = 'starter'): DailyUsage {
  const limits = DAILY_LIMITS[plan] ?? DAILY_LIMITS.starter
  const [usage, setUsage] = useState({ cars: 0, qr: 0, screenUpdates: 0, whatsapp: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch = async () => {
    if (!companyId) return

    const today = new Date().toISOString().slice(0, 10)
    const from = `${today}T00:00:00`
    const to   = `${today}T23:59:59`

    const [carsResult, logsResult] = await Promise.all([
      supabase
        .from('cw_queue')
        .select('id', { count: 'exact', head: false })
        .eq('company_id', companyId)
        .gte('created_at', from)
        .lt('created_at', to),
      supabase
        .from('cw_audit_logs')
        .select('action', { count: 'exact', head: false })
        .eq('company_id', companyId)
        .in('action', ['self_checkin_approved', 'car_created', 'car_updated', 'car_delivered'])
        .gte('created_at', from)
        .lt('created_at', to),
    ])

    const cars = (carsResult.data ?? []).length
    const logs = (logsResult.data ?? []) as Array<{ action: string }>
    const qr = logs.filter(r => r.action === 'self_checkin_approved').length
    const screenUpdates = logs.filter(r => r.action === 'car_created' || r.action === 'car_updated').length
    const whatsapp = logs.filter(r => r.action === 'car_delivered').length

    setUsage({ cars, qr, screenUpdates, whatsapp })
  }

  useEffect(() => {
    if (!companyId) return
    fetch()
    intervalRef.current = setInterval(fetch, 5 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [companyId, plan])

  const pct = (val: number, limit: number) => Math.min(Math.round((val / limit) * 100), 100)
  const carsPct = pct(usage.cars, limits.cars)
  const qrPct = pct(usage.qr, limits.qr)
  const screenPct = pct(usage.screenUpdates, limits.screenUpdates)
  const whatsappPct = pct(usage.whatsapp, limits.whatsapp)

  const maxEntry = Object.entries({ cars: carsPct, qr: qrPct, screenUpdates: screenPct, whatsapp: whatsappPct })
    .sort((a, b) => b[1] - a[1])[0]

  const maxPct = maxEntry[1]
  const topMetric = METRIC_LABELS[maxEntry[0]] ?? maxEntry[0]
  const ringColor = getRingColor(maxPct)

  return {
    ...usage,
    carsPct,
    qrPct,
    screenPct,
    whatsappPct,
    maxPct,
    topMetric,
    ringColor,
    limits,
  }
}
