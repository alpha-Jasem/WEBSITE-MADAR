import { useConversation } from '@elevenlabs/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState, useCallback } from 'react'
import { openWhatsAppChat } from '../../lib/whatsapp'

const AGENT_ID = 'agent_6901kgxmt4pbfmy84gp7xx3tbsvk'

const HIDDEN_PATHS = ['/admin', '/clinic-os/dashboard', '/solar', '/client', '/login', '/forgot-password', '/reset-password']

const PAGE_CONTEXT: Record<string, string> = {
  '/': 'المستخدم يتصفح الصفحة الرئيسية لمدار OS',
  '/book-a-call': 'المستخدم في صفحة حجز موعد — مهتم بالتواصل مع الفريق',
  '/clinic-os/demo': 'المستخدم مهتم بتجربة نظام عيادات نور',
  '/clinic-os/login': 'المستخدم في صفحة تسجيل الدخول',
  '/clinic-os/signup': 'المستخدم يسجل حساباً جديداً',
  '/privacy': 'المستخدم يقرأ سياسة الخصوصية',
  '/terms': 'المستخدم يقرأ الشروط والأحكام',
}

const PAGE_FIRST_MESSAGE: Record<string, string> = {
  '/book-a-call': 'أهلاً! يبدو إنك تريد التواصل معنا. كيف أقدر أساعدك؟',
  '/clinic-os/demo': 'أهلاً! تبي تجرب نظام عيادات نور؟ يسعدني أساعدك.',
}

type Message = { source: 'user' | 'ai'; text: string; ts: number }
type FeedbackState = null | 'positive' | 'negative'

function getPageContext(pathname: string): string {
  const key = Object.keys(PAGE_CONTEXT).find(p => {
    if (p === '/') return pathname === '/'
    return pathname.startsWith(p)
  })
  return key ? PAGE_CONTEXT[key] : `المستخدم في الصفحة: ${pathname}`
}

function getFirstMessage(pathname: string): string | undefined {
  const key = Object.keys(PAGE_FIRST_MESSAGE).find(p => pathname.startsWith(p))
  return key ? PAGE_FIRST_MESSAGE[key] : undefined
}

// Waveform bar component
function WaveBar({ height, delay }: { height: number; delay: number }) {
  return (
    <div
      style={{
        width: 3,
        height: Math.max(4, height * 32 + 4),
        borderRadius: 4,
        backgroundColor: height > 0.1 ? '#0ea5e9' : '#cbd5e1',
        transition: `height 80ms ease ${delay}ms`,
        flexShrink: 0,
      }}
    />
  )
}

export function MahaWidget() {
  const location = useLocation()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [volume, setVolume] = useState(80)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [inputBars, setInputBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [outputBars, setOutputBars] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [hasGreeted, setHasGreeted] = useState(false)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const prevPathRef = useRef(location.pathname)

  const clientTools = {
    open_whatsapp: async ({ message }: { message?: string }) => {
      openWhatsAppChat(message)
      return 'تم فتح واتساب'
    },
    navigate_to: async ({ path }: { path: string }) => {
      const safe = path.startsWith('/') ? path : '/' + path
      navigate(safe)
      return 'تم الانتقال للصفحة'
    },
    scroll_to_section: async ({ section_id }: { section_id: string }) => {
      const el = document.getElementById(section_id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return el ? 'تم التمرير' : 'لم يتم إيجاد القسم'
    },
    get_current_page: async () => {
      return { path: location.pathname, context: getPageContext(location.pathname) }
    },
  }

  const conversation = useConversation({
    onConnect: () => {
      setHasGreeted(false)
      setFeedback(null)
    },
    onDisconnect: () => {
      stopVizLoop()
    },
    onMessage: ({ message, source }) => {
      setMessages(prev => {
        const next = [...prev, { source, text: message, ts: Date.now() }]
        return next.slice(-20)
      })
    },
    onError: (err) => {
      console.error('[MahaWidget]', err)
    },
    clientTools,
  })

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages])

  // Send contextual update when route changes during active session
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname
      if (conversation.status === 'connected') {
        conversation.sendContextualUpdate(
          `[تحديث سياق] ${getPageContext(location.pathname)}`
        )
      }
    }
  }, [location.pathname, conversation])

  // Sync volume
  useEffect(() => {
    if (conversation.status === 'connected') {
      conversation.setVolume({ volume: volume / 100 })
    }
  }, [volume, conversation])

  // Visualizer RAF loop
  function startVizLoop() {
    function tick() {
      const input = conversation.getInputVolume?.() ?? 0
      const output = conversation.getOutputVolume?.() ?? 0
      setInputBars(bars => bars.map((_, i) => {
        const noise = Math.random() * 0.3
        return Math.min(1, input * (0.6 + noise) * (i % 3 === 1 ? 1.4 : 1))
      }))
      setOutputBars(bars => bars.map((_, i) => {
        const noise = Math.random() * 0.3
        return Math.min(1, output * (0.6 + noise) * (i % 3 === 1 ? 1.4 : 1))
      }))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopVizLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setInputBars([0, 0, 0, 0, 0, 0, 0])
    setOutputBars([0, 0, 0, 0, 0, 0, 0])
  }

  useEffect(() => {
    if (conversation.status === 'connected') {
      startVizLoop()
    } else {
      stopVizLoop()
    }
    return () => stopVizLoop()
  }, [conversation.status])

  // Send contextual update once connected (not as first message)
  useEffect(() => {
    if (conversation.status === 'connected' && !hasGreeted) {
      setHasGreeted(true)
      setTimeout(() => {
        conversation.sendContextualUpdate(getPageContext(location.pathname))
      }, 800)
    }
  }, [conversation.status, hasGreeted])

  // Signal user activity on widget interaction
  const signalActivity = useCallback(() => {
    if (conversation.status === 'connected') {
      conversation.sendUserActivity()
    }
  }, [conversation])

  const startConversation = async () => {
    setPermissionDenied(false)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setPermissionDenied(true)
      return
    }

    const firstMessage = getFirstMessage(location.pathname)

    await conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      ...(firstMessage ? {
        overrides: { agent: { firstMessage } }
      } : {}),
    })
  }

  const endConversation = async () => {
    await conversation.endSession()
    setMessages([])
    setFeedback(null)
  }

  const sendFeedback = async (positive: boolean) => {
    await conversation.sendFeedback(positive)
    setFeedback(positive ? 'positive' : 'negative')
  }

  const sendText = (text: string) => {
    if (conversation.status === 'connected') {
      conversation.sendUserMessage(text)
      setMessages(prev => [...prev, { source: 'user', text, ts: Date.now() }].slice(-20))
    }
  }

  // Hide on certain pages
  const shouldHide = HIDDEN_PATHS.some(p => location.pathname.startsWith(p))
  if (shouldHide) return null

  const isConnected = conversation.status === 'connected'
  const isConnecting = conversation.status === 'connecting'
  const isSpeaking = conversation.isSpeaking

  // Status colors
  const statusColor = isConnected
    ? (isSpeaking ? '#0ea5e9' : '#22c55e')
    : isConnecting ? '#f59e0b' : '#94a3b8'

  const statusText = isConnected
    ? (isSpeaking ? 'مها تتكلم...' : 'مها تستمع')
    : isConnecting ? 'جاري الاتصال...'
    : 'مها — مساعدة مدار OS'

  return (
    <div
      dir="rtl"
      onMouseMove={signalActivity}
      style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 9999, fontFamily: 'inherit' }}
    >
      {/* Main Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: 72,
            left: 0,
            width: 340,
            background: '#fff',
            borderRadius: 20,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            {/* Avatar */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              flexShrink: 0,
              boxShadow: isConnected ? `0 0 0 3px ${statusColor}` : 'none',
              transition: 'box-shadow 0.3s',
            }}>
              🤖
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>مها</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: statusColor,
                  flexShrink: 0,
                  boxShadow: isConnected ? `0 0 8px ${statusColor}` : 'none',
                }} />
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{statusText}</div>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none', borderRadius: 8, padding: '6px 8px',
                cursor: 'pointer', color: '#94a3b8', fontSize: 16,
                display: 'flex', alignItems: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* Waveform Visualizer */}
          {isConnected && (
            <div style={{
              background: '#f8fafc',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              borderBottom: '1px solid #e2e8f0',
            }}>
              {/* Input (mic) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>🎤 أنت</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
                  {inputBars.map((h, i) => (
                    <WaveBar key={i} height={h} delay={i * 10} />
                  ))}
                </div>
              </div>

              <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />

              {/* Output (agent) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>🔊 مها</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
                  {outputBars.map((h, i) => (
                    <WaveBar key={i} height={h} delay={i * 10} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div
            ref={transcriptRef}
            style={{
              flex: 1,
              maxHeight: 200,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: '#f8fafc',
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: 13,
                padding: '20px 0',
              }}>
                {isConnected
                  ? 'ابدأ الحديث مع مها...'
                  : 'اضغط "ابدأ المحادثة" للتحدث مع مها'}
              </div>
            ) : (
              messages.slice(-8).map((m) => (
                <div key={m.ts} style={{
                  display: 'flex',
                  justifyContent: m.source === 'user' ? 'flex-start' : 'flex-end',
                }}>
                  <div style={{
                    maxWidth: '80%',
                    background: m.source === 'user' ? '#fff' : '#0f172a',
                    color: m.source === 'user' ? '#1e293b' : '#f1f5f9',
                    padding: '8px 12px',
                    borderRadius: m.source === 'user'
                      ? '12px 12px 12px 4px'
                      : '12px 12px 4px 12px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    border: m.source === 'user' ? '1px solid #e2e8f0' : 'none',
                  }}>
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions (when connected) */}
          {isConnected && (
            <div style={{
              padding: '8px 16px',
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              borderTop: '1px solid #e2e8f0',
              background: '#fff',
            }}>
              {[
                { label: 'واتساب', action: () => sendText('أريد التواصل عبر واتساب') },
                { label: 'الأسعار', action: () => sendText('ما هي الأسعار؟') },
                { label: 'تجربة مجانية', action: () => sendText('أريد تجربة مجانية') },
              ].map(({ label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 20,
                    padding: '4px 12px',
                    fontSize: 12,
                    color: '#475569',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{
            padding: '12px 16px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Volume Slider */}
            {isConnected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{volume === 0 ? '🔇' : '🔊'}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#0ea5e9',
                    cursor: 'pointer',
                    height: 4,
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 28 }}>{volume}%</span>
              </div>
            )}

            {/* Main Action Button */}
            {!isConnected ? (
              <button
                onClick={startConversation}
                disabled={isConnecting}
                style={{
                  width: '100%',
                  background: isConnecting
                    ? '#e2e8f0'
                    : 'linear-gradient(135deg, #0f172a, #1e3a5f)',
                  color: isConnecting ? '#94a3b8' : '#fff',
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isConnecting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                {isConnecting ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                    جاري الاتصال...
                  </>
                ) : (
                  <>🎤 ابدأ المحادثة</>
                )}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Feedback */}
                <button
                  onClick={() => sendFeedback(true)}
                  disabled={feedback !== null}
                  title="مفيد"
                  style={{
                    flex: 1,
                    background: feedback === 'positive' ? '#dcfce7' : '#f1f5f9',
                    border: feedback === 'positive' ? '1px solid #22c55e' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px',
                    cursor: feedback ? 'default' : 'pointer',
                    fontSize: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  👍
                </button>
                <button
                  onClick={() => sendFeedback(false)}
                  disabled={feedback !== null}
                  title="غير مفيد"
                  style={{
                    flex: 1,
                    background: feedback === 'negative' ? '#fee2e2' : '#f1f5f9',
                    border: feedback === 'negative' ? '1px solid #ef4444' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px',
                    cursor: feedback ? 'default' : 'pointer',
                    fontSize: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  👎
                </button>

                {/* End Call */}
                <button
                  onClick={endConversation}
                  style={{
                    flex: 2,
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontFamily: 'inherit',
                  }}
                >
                  📵 إنهاء
                </button>
              </div>
            )}

            {/* Permission Denied Warning */}
            {permissionDenied && (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: '#c2410c',
                textAlign: 'center',
              }}>
                ⚠️ يرجى السماح بالوصول للميكروفون من إعدادات المتصفح
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isConnected
            ? `linear-gradient(135deg, #0ea5e9, #6366f1)`
            : 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isConnected
            ? `0 4px 20px rgba(14,165,233,0.5), 0 0 0 ${isSpeaking ? '8px' : '3px'} rgba(14,165,233,0.2)`
            : '0 4px 20px rgba(15,23,42,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          transition: 'all 0.3s',
          animation: isConnected && isSpeaking ? 'pulse-ring 1.5s ease-out infinite' : 'none',
          position: 'relative',
        }}
        title="تحدث مع مها"
      >
        {isConnected ? '🎙️' : '🤖'}

        {/* Status dot */}
        {isConnected && (
          <div style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isSpeaking ? '#0ea5e9' : '#22c55e',
            border: '2px solid #fff',
            boxShadow: `0 0 6px ${isSpeaking ? '#0ea5e9' : '#22c55e'}`,
          }} />
        )}

        {isConnecting && (
          <div style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#f59e0b',
            border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(14,165,233,0.4), 0 4px 20px rgba(14,165,233,0.5); }
          70% { box-shadow: 0 0 0 12px rgba(14,165,233,0), 0 4px 20px rgba(14,165,233,0.5); }
          100% { box-shadow: 0 0 0 0 rgba(14,165,233,0), 0 4px 20px rgba(14,165,233,0.5); }
        }
        @keyframes spin {
          from { display: inline-block; transform: rotate(0deg); }
          to { display: inline-block; transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
