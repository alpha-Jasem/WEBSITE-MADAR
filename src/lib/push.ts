import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export const VAPID_PUBLIC = 'BAL_u-gkCD1pVdOCatOx4TKdx_IJJwgU6JIVPPxzIGK2pXeW3I0ZaePly5gRYPFFR5p9Ei8VRuX54rzGTSJ6h9k'

export type PushState = 'checking' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'denied' | 'busy'

function urlBase64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

// Web Push for this device: registers the service worker, asks permission, and stores the subscription for the signed-in admin.
// On iPhone the browser only allows push after the page was added to the Home Screen, so that case gets its own state.
export function usePush() {
  const [state, setState] = useState<PushState>('checking')
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) { setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported'); return }
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      if (Notification.permission === 'denied') setState('denied')
      else setState(sub && Notification.permission === 'granted' ? 'on' : 'off')
    }).catch(() => setState('unsupported'))
  }, [])

  const enable = useCallback(async () => {
    setState('busy'); setNote(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
      const j = sub.toJSON()
      const { data: u } = await supabase.auth.getUser()
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: u.user!.id, endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth, user_agent: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'endpoint' })
      if (error) throw new Error(error.message)
      setState('on'); setNote('تم تفعيل الإشعارات على هذا الجهاز.')
    } catch (e) {
      setState('off'); setNote((e as Error).message)
    }
  }, [])

  const test = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('outreach-daily', { body: { action: 'test_push' } })
    setNote(error || !data?.ok ? 'فشل الإرسال.' : data.sent ? 'أُرسل إشعار تجريبي، شوف جوالك.' : 'ما فيه جهاز مفعّل.')
  }, [])

  return { state, note, enable, test }
}
