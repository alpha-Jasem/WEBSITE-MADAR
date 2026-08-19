import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2 } from 'lucide-react'
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client'

// Nabrah runs its agents on LiveKit. The room token is minted by a Supabase
// function so the Nabrah API key never reaches the browser.
const TOKEN_ENDPOINT = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/nabrah-web-call'

type Status = 'idle' | 'connecting' | 'connected' | 'error'

function StatusLabel({ status, agentSpeaking }: { status: Status; agentSpeaking: boolean }) {
  let text = 'انقر على الميكروفون لبدء المكالمة'
  if (status === 'connecting') text = 'جاري الاتصال بسعود…'
  else if (status === 'connected') text = agentSpeaking ? 'سعود يتحدث…' : 'يستمع إليك الآن…'
  else if (status === 'error') text = 'تعذّر الاتصال — جرّب مرة ثانية'

  return (
    <p className="text-sm font-tajawal" style={{ color: 'rgba(234,241,251,0.65)' }}>
      {text}
    </p>
  )
}

export function NabrahVoiceWidget() {
  const [status, setStatus] = useState<Status>('idle')
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  const cleanup = useCallback(() => {
    roomRef.current?.disconnect()
    roomRef.current = null
    audioElRef.current?.remove()
    audioElRef.current = null
    setAgentSpeaking(false)
  }, [])

  // Leaving the page mid-call would otherwise keep the room (and the meter) open.
  useEffect(() => cleanup, [cleanup])

  async function start() {
    setError(null)
    setStatus('connecting')

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('نحتاج إذن الميكروفون عشان تبدأ المكالمة.')
      setStatus('error')
      return
    }

    try {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) throw new Error(`token endpoint ${res.status}`)
      const { token, url } = await res.json()

      const room = new Room()
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication) => {
        if (track.kind !== Track.Kind.Audio) return
        // The agent's voice needs a real element on the page to be audible.
        const el = track.attach() as HTMLAudioElement
        el.autoplay = true
        el.style.display = 'none'
        document.body.appendChild(el)
        audioElRef.current = el
      })

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setAgentSpeaking(speakers.some((s) => s.identity !== room.localParticipant.identity))
      })

      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle')
        cleanup()
      })

      await room.connect(url, token)
      await room.localParticipant.publishTrack(await createLocalAudioTrack())
      setStatus('connected')
    } catch (e) {
      console.error('Nabrah call failed:', e)
      setError('تعذّر بدء المكالمة. جرّب مرة ثانية.')
      setStatus('error')
      cleanup()
    }
  }

  function end() {
    cleanup()
    setStatus('idle')
  }

  const connected = status === 'connected'
  const connecting = status === 'connecting'

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <div className="relative flex items-center justify-center" style={{ width: 148, height: 148 }}>
        <AnimatePresence>
          {connected && (
            <>
              <motion.span
                key="ring1"
                initial={{ opacity: 0.5, scale: 0.9 }}
                animate={{ opacity: 0, scale: agentSpeaking ? 1.55 : 1.35 }}
                exit={{ opacity: 0 }}
                transition={{ duration: agentSpeaking ? 1.1 : 1.8, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid rgba(0,191,255,0.55)' }}
              />
              <motion.span
                key="ring2"
                initial={{ opacity: 0.35, scale: 0.9 }}
                animate={{ opacity: 0, scale: agentSpeaking ? 1.9 : 1.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: agentSpeaking ? 1.1 : 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.25 }}
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid rgba(0,191,255,0.3)' }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={connected ? end : start}
          disabled={connecting}
          whileHover={{ scale: connecting ? 1 : 1.04 }}
          whileTap={{ scale: connecting ? 1 : 0.96 }}
          className="relative rounded-full flex items-center justify-center cursor-pointer disabled:cursor-wait"
          style={{
            width: 96,
            height: 96,
            background: connected
              ? 'linear-gradient(160deg, #00BFFF, #0D1B3E)'
              : 'linear-gradient(160deg, #123163, #0D1B3E)',
            border: '1px solid rgba(0,191,255,0.4)',
            boxShadow: connected
              ? `0 0 ${agentSpeaking ? 46 : 26}px rgba(0,191,255,0.55)`
              : '0 0 24px rgba(0,191,255,0.18)',
            transition: 'box-shadow 0.4s ease',
          }}
        >
          {connecting ? (
            <Loader2 size={30} className="animate-spin" color="#EAF6FF" />
          ) : connected ? (
            <Square size={26} fill="#EAF6FF" color="#EAF6FF" />
          ) : (
            <Mic size={30} color="#EAF6FF" />
          )}
        </motion.button>
      </div>

      <StatusLabel status={status} agentSpeaking={agentSpeaking} />

      {error && (
        <p className="text-xs font-tajawal text-center" style={{ color: '#FF8A8A', maxWidth: 320 }}>
          {error}
        </p>
      )}
    </div>
  )
}
