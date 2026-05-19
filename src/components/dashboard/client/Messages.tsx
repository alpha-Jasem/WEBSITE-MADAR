import { motion } from 'framer-motion'
import { useState } from 'react'
import { Send } from 'lucide-react'
import { useLanguage } from '../../../context/LanguageContext'

const initialMessages = [
  { id: '1', from: 'admin', ar: 'مرحباً! تم بدء مرحلة التطوير بنجاح. سيتم تسليم النسخة الأولى الأسبوع القادم.', en: 'Hello! Development phase has started successfully. First version will be delivered next week.', time: '2026-04-18 10:30' },
  { id: '2', from: 'client', ar: 'شكراً على التحديث، هل يمكن إضافة قسم للمدونة؟', en: 'Thanks for the update, can we add a blog section?', time: '2026-04-18 11:15' },
  { id: '3', from: 'admin', ar: 'بالتأكيد! سنضيف قسم المدونة ضمن الباقة الحالية بدون تكلفة إضافية.', en: 'Absolutely! We\'ll add the blog section within the current package at no extra cost.', time: '2026-04-18 11:45' },
]

export const Messages = () => {
  const { language, t } = useLanguage()
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), from: 'client', ar: input, en: input, time: new Date().toLocaleString() },
    ])
    setInput('')
  }

  return (
    <div className="p-6 h-full flex flex-col max-h-[calc(100vh-80px)]">
      <div className="mb-4">
        <h1 className={`text-2xl font-bold text-white ${language === 'ar' ? 'font-cairo' : 'font-outfit'}`}>
          {t('الرسائل', 'Messages')}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 glass rounded-2xl border border-white/8 p-4">
        {messages.map((msg, i) => {
          const isClient = msg.from === 'client'
          const text = language === 'ar' ? msg.ar : msg.en
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
            >
              {!isClient && (
                <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/40 flex items-center justify-center me-2 flex-shrink-0 mt-auto mb-1">
                  <span className="text-xs text-primary-400 font-bold font-outfit">DM</span>
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isClient
                    ? 'bg-primary-500 text-white rounded-ee-sm'
                    : 'glass border border-white/10 text-slate-200 rounded-es-sm'
                }`}
              >
                <p className={`text-sm leading-relaxed ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}>{text}</p>
                <p className={`text-xs mt-1 opacity-60 ${isClient ? 'text-primary-100' : 'text-slate-500'} font-work`}>
                  {msg.time}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('اكتب رسالتك...', 'Type your message...')}
          className={`flex-1 bg-navy-800/60 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-primary-500/60 transition-all ${language === 'ar' ? 'font-tajawal' : 'font-work'}`}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={send}
          className="w-12 h-12 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-glow transition-all"
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  )
}
