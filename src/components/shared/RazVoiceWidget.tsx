import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Loader2 } from 'lucide-react'
import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
  useConversationMode,
} from '@elevenlabs/react'

const RAZ_AGENT_ID = 'agent_7501kzx1z7xaekxbegasw7cpqs7n'

interface TranscriptEntry {
  id: number
  role: 'user' | 'ai'
  text: string
}

function MicButton({ status, isSpeaking, onStart, onEnd }: {
  status: string
  isSpeaking: boolean
  onStart: () => void
  onEnd: () => void
}) {
  const connected = status === 'connected'
  const connecting = status === 'connecting'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 148, height: 148 }}>
      <AnimatePresence>
        {connected && (
          <>
            <motion.span
              key="ring1"
              initial={{ opacity: 0.5, scale: 0.9 }}
              animate={{ opacity: 0, scale: isSpeaking ? 1.55 : 1.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: isSpeaking ? 1.1 : 1.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full"
              style={{ border: '1.5px solid rgba(0,191,255,0.55)' }}
            />
            <motion.span
              key="ring2"
              initial={{ opacity: 0.35, scale: 0.9 }}
              animate={{ opacity: 0, scale: isSpeaking ? 1.9 : 1.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: isSpeaking ? 1.1 : 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.25 }}
              className="absolute inset-0 rounded-full"
              style={{ border: '1.5px solid rgba(0,191,255,0.3)' }}
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        onClick={connected ? onEnd : onStart}
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
            ? `0 0 ${isSpeaking ? 46 : 26}px rgba(0,191,255,0.55)`
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
  )
}

function StatusLabel({ status, isSpeaking, isListening }: { status: string; isSpeaking: boolean; isListening: boolean }) {
  let text = 'انقر على الميكروفون لبدء التحدث'
  if (status === 'connecting') text = 'جاري الاتصال بعمر…'
  else if (status === 'connected' && isSpeaking) text = 'عمر يتحدث…'
  else if (status === 'connected' && isListening) text = 'يستمع إليك الآن…'
  else if (status === 'connected') text = 'المكالمة جارية'

  return (
    <p className="text-sm font-tajawal" style={{ color: 'rgba(234,241,251,0.65)' }}>
      {text}
    </p>
  )
}

function Bubble({ entry }: { entry: TranscriptEntry }) {
  const isAgent = entry.role === 'ai'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full"
      style={{ justifyContent: isAgent ? 'flex-end' : 'flex-start' }}
    >
      <div
        className="font-tajawal text-sm leading-relaxed"
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 14,
          borderBottomRightRadius: isAgent ? 4 : 14,
          borderBottomLeftRadius: isAgent ? 14 : 4,
          background: isAgent ? 'rgba(0,191,255,0.12)' : 'rgba(255,255,255,0.07)',
          border: isAgent ? '1px solid rgba(0,191,255,0.25)' : '1px solid rgba(255,255,255,0.1)',
          color: '#EAF1FB',
        }}
      >
        {entry.text}
      </div>
    </motion.div>
  )
}

function WidgetInner() {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const { isSpeaking, isListening } = useConversationMode()
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [transcript])

  async function handleStart() {
    setPermissionError(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setPermissionError('نحتاج إذن الميكروفون عشان تبدأ المكالمة — تأكد من السماح للمتصفح بالوصول للمايك.')
      return
    }
    setTranscript([])
    startSession({
      agentId: RAZ_AGENT_ID,
      connectionType: 'webrtc',
      onMessage: ({ message, role }) => {
        idRef.current += 1
        setTranscript((prev) => [...prev, { id: idRef.current, role: role === 'ai' ? 'ai' : 'user', text: message }])
      },
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <MicButton status={status} isSpeaking={isSpeaking} onStart={handleStart} onEnd={endSession} />
      <StatusLabel status={status} isSpeaking={isSpeaking} isListening={isListening} />
      {permissionError && (
        <p className="text-xs font-tajawal text-center" style={{ color: '#FF8A8A', maxWidth: 320 }}>
          {permissionError}
        </p>
      )}

      {transcript.length > 0 && (
        <div
          ref={scrollRef}
          className="w-full flex flex-col gap-2.5 overflow-y-auto rounded-2xl"
          style={{
            maxHeight: 320,
            padding: 16,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {transcript.map((entry) => (
            <Bubble key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

export function RazVoiceWidget() {
  return (
    <ConversationProvider onError={(message) => console.error('RAZ agent conversation error:', message)}>
      <WidgetInner />
    </ConversationProvider>
  )
}
