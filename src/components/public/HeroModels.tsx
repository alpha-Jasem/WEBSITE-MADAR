import { motion } from 'framer-motion'

export const Model2_HolographicInterface = () => (
  <div className="relative w-[380px] h-[380px] flex items-center justify-center" style={{ perspective: 1200 }}>
    <div
      className="absolute inset-0 rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.10) 0%, transparent 70%)' }}
    />

    <motion.div
      animate={{ rotateY: [-10, 10, -10], rotateX: [10, 4, 10], y: [-6, 6, -6] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      style={{ transformStyle: 'preserve-3d' }}
      className="relative"
    >
      <div
        className="relative overflow-hidden rounded-[28px]"
        style={{
          width: 280,
          height: 330,
          background: 'linear-gradient(180deg, rgba(18,31,56,0.75), rgba(7,13,25,0.72))',
          border: '1px solid rgba(79,110,247,0.35)',
          boxShadow: '0 0 45px rgba(79,110,247,0.18), inset 0 0 35px rgba(255,255,255,0.04)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(123,150,255,0.16),transparent_45%)]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] text-slate-500 font-work uppercase tracking-[0.2em]">AI SYSTEM</div>
              <div className="text-sm text-white font-outfit font-semibold mt-1">Holographic Interface</div>
            </div>
            <div className="w-10 h-10 rounded-2xl border border-primary-500/30 bg-primary-500/10 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(79,110,247,0.8)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: 'Signals', value: '128', color: '#4F6EF7' },
              { label: 'Active Flows', value: '12', color: '#10B981' },
              { label: 'Response Time', value: '0.9s', color: '#D4A853' },
              { label: 'Bookings', value: '+36%', color: '#8B5CF6' },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}30` }}
              >
                <div className="text-[11px] text-slate-500 font-work mb-1">{card.label}</div>
                <div className="text-base font-outfit font-bold" style={{ color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4 mb-3 border border-white/8 bg-white/[0.025]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-work">Neural Sync</span>
              <span className="text-[11px] text-primary-300 font-work">87%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden mb-3">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: ['72%', '87%', '72%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #4F6EF7, #8BA5FF)' }}
              />
            </div>
            <div className="flex items-end gap-1 h-16">
              {[25, 45, 30, 60, 52, 72, 48, 84].map((h, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [`${Math.max(18, h - 10)}%`, `${h}%`, `${Math.max(18, h - 10)}%`] }}
                  transition={{ duration: 2.6 + i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex-1 rounded-t-md"
                  style={{
                    background: i % 3 === 0 ? '#D4A853' : i % 2 === 0 ? 'rgba(139,92,246,0.8)' : 'rgba(79,110,247,0.9)',
                    boxShadow: '0 0 12px rgba(79,110,247,0.18)',
                  }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary-500/20 bg-primary-500/[0.05] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-slate-400 font-work">Conversation Flow</span>
              <span className="text-[11px] text-emerald-400 font-work">Live</span>
            </div>
            <div className="flex items-center gap-2">
              {['Lead', 'Qualify', 'Book', 'Follow-up'].map((step, i) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div className="w-full rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2 text-center text-[10px] text-slate-300 font-work">
                    {step}
                  </div>
                  {i < 3 && <div className="h-px flex-1 bg-gradient-to-r from-primary-500/70 to-transparent" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [-4, 5, -4], x: [0, 5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -top-6 -right-10 rounded-2xl border border-primary-500/30 bg-[#101A30]/85 px-4 py-3 backdrop-blur-xl"
        style={{ boxShadow: '0 0 20px rgba(79,110,247,0.14)' }}
      >
        <div className="text-[10px] text-slate-500 font-work uppercase tracking-[0.18em] mb-1">Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
          <span className="text-xs text-white font-outfit">AI Active</span>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [6, -6, 6], x: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        className="absolute -bottom-2 -left-10 rounded-2xl border border-[#D4A853]/30 bg-[#151224]/85 px-4 py-3 backdrop-blur-xl"
        style={{ boxShadow: '0 0 22px rgba(212,168,83,0.12)' }}
      >
        <div className="text-[10px] text-slate-500 font-work uppercase tracking-[0.18em] mb-1">Output</div>
        <div className="text-xs text-white font-outfit">Automated Booking Ready</div>
      </motion.div>
    </motion.div>
  </div>
)
