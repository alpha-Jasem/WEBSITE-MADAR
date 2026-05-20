import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface Props {
  leadId: string
  lead: any
  score?: number | null
  reason?: string | null
  onScored?: (score: number, reason: string) => void
}

function scoreColor(s: number) {
  if (s >= 80) return '#10B981'
  if (s >= 60) return '#F59E0B'
  if (s >= 40) return '#06B6D4'
  return '#EF4444'
}
function scoreLabel(s: number) {
  if (s >= 80) return 'ممتاز'
  if (s >= 60) return 'جيد'
  if (s >= 40) return 'متوسط'
  return 'ضعيف'
}

export const LeadScoreBadge = ({ leadId, lead, score, reason, onScored }: Props) => {
  const [loading, setLoading] = useState(false)
  const [localScore, setLocalScore] = useState<number | null>(score ?? null)
  const [localReason, setLocalReason] = useState<string | null>(reason ?? null)

  const analyze = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lead-score`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ lead_id: leadId, lead }),
        }
      )
      const { score: s, reason: r } = await res.json()
      setLocalScore(s)
      setLocalReason(r)
      onScored?.(s, r)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  if (!localScore) {
    return (
      <button onClick={analyze} disabled={loading}
        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-tajawal cursor-pointer transition-all hover:opacity-80"
        style={{ background: 'rgba(79,110,247,0.1)', border: '1px solid rgba(79,110,247,0.2)', color: '#4F6EF7' }}>
        {loading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
        {loading ? 'جاري...' : 'تحليل AI'}
      </button>
    )
  }

  return (
    <div className="group relative">
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold font-sora cursor-default"
        style={{ background: `${scoreColor(localScore)}18`, border: `1px solid ${scoreColor(localScore)}40`, color: scoreColor(localScore) }}>
        {localScore}
        <span className="font-tajawal font-normal">{scoreLabel(localScore)}</span>
      </div>
      {localReason && (
        <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block z-10 w-48 p-2 rounded-lg text-[10px] text-slate-300 font-tajawal leading-relaxed"
          style={{ background: '#1A1D26', border: '1px solid rgba(255,255,255,0.1)' }}>
          {localReason}
        </div>
      )}
    </div>
  )
}
