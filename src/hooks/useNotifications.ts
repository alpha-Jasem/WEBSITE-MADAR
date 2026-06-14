import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyUsage } from './useDailyUsage'

export type NotifSeverity = 'info' | 'success' | 'warning' | 'critical'
export type NotifCategory = 'ops' | 'usage' | 'finance' | 'customer'

export interface AppNotification {
  id: string
  title: string
  message: string
  time: string
  severity: NotifSeverity
  category: NotifCategory
  icon: string
  action?: string
}

function fmtTime(isoStr: string): string {
  const d = new Date(isoStr)
  const h = d.getHours(), m = d.getMinutes()
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`
}

export function useNotifications(companyId: string | null, dailyUsage: DailyUsage) {
  const [queueNotifs, setQueueNotifs] = useState<AppNotification[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQueueNotifs = async () => {
    if (!companyId) return
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('cw_queue')
      .select('id, customer_name, status, started_at, service_name')
      .eq('company_id', companyId)
      .gte('created_at', todayStart.toISOString())
      .in('status', ['washing', 'drying', 'ready'])

    const now = Date.now()
    const notifs: AppNotification[] = []

    for (const item of data || []) {
      const since = item.started_at ? now - new Date(item.started_at).getTime() : 0
      const mins = Math.round(since / 60000)

      if ((item.status === 'washing' || item.status === 'drying') && mins > 30) {
        notifs.push({
          id: `late-${item.id}`,
          title: 'سيارة متأخرة',
          message: `${item.customer_name || 'عميل'} — متأخرة عن الوقت المتوقع بـ ${mins} دقيقة`,
          time: item.started_at ? fmtTime(item.started_at) : 'اليوم',
          severity: 'critical',
          category: 'ops',
          icon: '⏱️',
        })
      }

      if (item.status === 'ready' && mins > 20) {
        notifs.push({
          id: `ready-${item.id}`,
          title: 'سيارة جاهزة ولم تُستلم',
          message: `${item.customer_name || 'عميل'} — ${item.service_name || 'خدمة'} — انتظار ${mins} دقيقة`,
          time: item.started_at ? fmtTime(item.started_at) : 'اليوم',
          severity: 'warning',
          category: 'ops',
          icon: '🚗',
        })
      }
    }

    setQueueNotifs(notifs)
  }

  useEffect(() => {
    fetchQueueNotifs()
    intervalRef.current = setInterval(fetchQueueNotifs, 5 * 60 * 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [companyId])

  // Usage notifications (derived from dailyUsage)
  const usageNotifs: AppNotification[] = []
  if (dailyUsage.maxPct >= 100) {
    usageNotifs.push({
      id: 'usage-100',
      title: 'تم الوصول إلى الحد اليومي',
      message: `${dailyUsage.topMetric}: 100%. بعض الخدمات متوقفة مؤقتاً حتى إعادة التصفير.`,
      time: 'الآن',
      severity: 'critical',
      category: 'usage',
      icon: '🔴',
      action: '/client/settings',
    })
  } else if (dailyUsage.maxPct >= 80) {
    usageNotifs.push({
      id: `usage-${dailyUsage.maxPct}`,
      title: `حد الاستخدام ${dailyUsage.maxPct}%`,
      message: `اقتربت من حد ${dailyUsage.topMetric} اليومي.`,
      time: 'اليوم',
      severity: 'warning',
      category: 'usage',
      icon: '⚠️',
    })
  }

  const notifications = [...queueNotifs, ...usageNotifs]
  return { notifications, count: notifications.length }
}
