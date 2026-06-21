import { useState, useCallback } from 'react'
import { useConversation } from '@elevenlabs/react'
import { Mic, MicOff, X, PhoneCall, Loader2 } from 'lucide-react'

const AGENT_ID = 'agent_6901kgxmt4pbfmy84gp7xx3tbsvk'

export function MahaWidget() {
  const [open, setOpen] = useState(false)

  const conversation = useConversation({
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => setOpen(false),
  })

  const start = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conversation.startSession({ agentId: AGENT_ID, connectionType: 'webrtc' })
    } catch {
      // mic denied or start failed — widget stays closed
    }
  }, [conversation])

  const end = useCallback(async () => {
    await conversation.endSession()
  }, [conversation])

  const handleOpen = () => {
    setOpen(true)
    start()
  }

  const handleClose = () => {
    end()
    setOpen(false)
  }

  const isConnecting = conversation.status === 'connecting'
  const isConnected  = conversation.status === 'connected'
  const isSpeaking   = conversation.isSpeaking

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">

      {/* Expanded panel */}
      {open && (
        <div
          className="mb-1 w-72 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #0a1628 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-sm font-bold text-white">
                  م
                </div>
                {isConnected && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1b3e]" />
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-none">مها</p>
                <p className="text-white/50 text-xs mt-0.5">مساعدة عيادات نور</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-5 flex flex-col items-center gap-4">
            {/* Visualizer */}
            <div className="relative flex items-center justify-center w-20 h-20">
              {/* Pulse rings when speaking */}
              {isSpeaking && (
                <>
                  <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-blue-500/15 animate-ping [animation-delay:0.15s]" />
                </>
              )}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  background: isConnected
                    ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                    : 'linear-gradient(135deg, #1e3a5f, #1e4a6e)',
                  boxShadow: isConnected ? '0 0 24px rgba(59,130,246,0.4)' : 'none',
                }}
              >
                {isConnecting ? (
                  <Loader2 size={24} className="text-white animate-spin" />
                ) : isConnected ? (
                  isSpeaking ? (
                    <Mic size={24} className="text-white" />
                  ) : (
                    <MicOff size={24} className="text-white/70" />
                  )
                ) : (
                  <Mic size={24} className="text-white/40" />
                )}
              </div>
            </div>

            {/* Status text */}
            <div className="text-center">
              {isConnecting && (
                <p className="text-white/60 text-sm">جاري الاتصال…</p>
              )}
              {isConnected && isSpeaking && (
                <p className="text-blue-400 text-sm font-medium">مها تتكلم…</p>
              )}
              {isConnected && !isSpeaking && (
                <p className="text-white/60 text-sm">تفضل، أنا أسمعك</p>
              )}
              {!isConnecting && !isConnected && (
                <p className="text-white/40 text-sm">غير متصل</p>
              )}
            </div>

            {/* Hint */}
            {isConnected && (
              <p className="text-white/30 text-xs text-center leading-relaxed">
                تحدث بصوتك لتحجز موعد أو تسأل عن العيادة
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4">
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              إنهاء المحادثة
            </button>
          </div>
        </div>
      )}

      {/* FAB button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="group relative w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #0891b2)' }}
          aria-label="تحدث مع مها"
        >
          {/* Glow */}
          <span className="absolute inset-0 rounded-full bg-blue-500/30 blur-md group-hover:blur-lg transition-all" />
          <PhoneCall size={22} className="relative text-white" />

          {/* Tooltip */}
          <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#0d1b3e] text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            تحدث مع مها
          </span>
        </button>
      )}
    </div>
  )
}
