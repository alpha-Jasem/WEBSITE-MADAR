import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { fetchCallRecording } from '@/lib/queries/conversations'

/** Loads a call's recording on demand (it is streamed through an edge function, so nothing is fetched until asked). */
export function RecordingPlayer({ callId }: { callId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'missing'>('idle')
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => () => { if (src) URL.revokeObjectURL(src) }, [src])
  useEffect(() => { setState('idle'); setSrc(null) }, [callId])

  async function load() {
    setState('loading')
    try {
      const url = await fetchCallRecording(callId)
      if (url) { setSrc(url); setState('ready') } else setState('missing')
    } catch { setState('missing') }
  }

  if (state === 'ready' && src) return <audio controls autoPlay src={src} style={{ width: '100%', marginBottom: 14 }} />
  if (state === 'missing') return <div className="nx-empty" style={{ marginBottom: 14 }}>التسجيل غير متاح لهذه المكالمة.</div>
  return (
    <button type="button" onClick={load} disabled={state === 'loading'} className="nx-btn"
      style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Play size={14} /> {state === 'loading' ? 'جاري تحميل التسجيل…' : 'استمع للتسجيل'}
    </button>
  )
}
