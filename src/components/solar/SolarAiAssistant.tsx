import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Msg = { role: 'user' | 'ai'; text: string }

const QUICK = [
  'Launch win-back campaign for dormant leads',
  'Generate weekly performance report',
  'Identify top revenue opportunities',
  'Optimize appointment scheduling',
]

export const SolarAiAssistant = () => {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Solar AI online. How can I optimize your operations today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (text: string) => {
    if (!text.trim()) return
    setMsgs(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/ai-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: text }),
      })
      const json = await res.json()
      setMsgs(prev => [...prev, { role: 'ai', text: json.reply || 'Command received and processed.' }])
    } catch {
      setMsgs(prev => [...prev, { role: 'ai', text: 'Processing your command...' }])
    }
    setLoading(false)
  }

  return (
    <div className="se-section">
      <div className="se-section-head">
        <h2>AI Command Center</h2>
        <div className="se-ai-status"><span className="se-status-dot-sm" /> Online</div>
      </div>
      <div className="se-ai-layout">
        <div className="se-ai-robot-panel">
          <video src="/assets/ai-robot.mp4" autoPlay loop muted playsInline className="se-ai-robot-lg" />
          <p>Solar AI</p>
          <span>Intelligence Active</span>
        </div>
        <div className="se-ai-chat">
          <div className="se-chat-msgs">
            <AnimatePresence>
              {msgs.map((m, i) => (
                <motion.div key={i} className={`se-chat-msg ${m.role === 'user' ? 'se-msg-user' : 'se-msg-ai'}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  {m.role === 'ai' && <Bot size={14} color="#4f6ef7" />}
                  <p>{m.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="se-chat-msg se-msg-ai">
                <Bot size={14} color="#4f6ef7" />
                <div className="se-typing"><span /><span /><span /></div>
              </div>
            )}
          </div>
          <div className="se-quick-cmds">
            {QUICK.map(q => (
              <button key={q} type="button" className="se-quick-btn" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
          <div className="se-chat-input-row">
            <input className="se-chat-input" placeholder="Enter command..." value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)} />
            <button type="button" className="se-send-btn" onClick={() => send(input)}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
