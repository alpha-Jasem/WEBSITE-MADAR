import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Preset = 'real_estate' | 'developers' | 'all' | 'custom'
interface Focus { preset: Preset; include_words: string[]; exclude_words: string[] }

const PRESETS: Record<Exclude<Preset, 'custom'>, { label: string; hint: string; include: string[] }> = {
  developers: { label: 'مطورون عقاريون فقط', hint: 'شركات التطوير والاستثمار العقاري', include: ['developer', 'development', 'property investment', 'real estate investment', 'تطوير', 'مطور'] },
  real_estate: { label: 'كل قطاع العقار', hint: 'مطورون، مكاتب، إدارة أملاك، تأجير…', include: ['real estate', 'property', 'developer', 'development', 'housing', 'apartment', 'realty', 'estate agent', 'rental agency', 'condominium', 'townhouse', 'عقار', 'عقارية', 'مطور', 'تطوير'] },
  all: { label: 'بدون فلتر', hint: 'كل شيء يُجلب يظهر', include: [] },
}
const EXCLUDE_DEFAULT = ['law', 'legal', 'attorney', 'lawyer', 'notary', 'bank', 'government', 'internet cafe', 'cafe', 'restaurant', 'marine', 'salon', 'beauty', 'dental', 'dentist', 'clinic', 'medical', 'hospital', 'تجميل', 'أسنان', 'طبي', 'عيادة', 'محام', 'قانون']
const split = (s: string) => s.split(/[,،\n]/).map(x => x.trim()).filter(Boolean)

// Decides which kinds of businesses count as leads. Anything outside the focus is hidden, never contacted by the agent,
// and (for new fetches) not even imported. The match is on the category Google gives the place.
export function LeadFocusPanel({ onChanged }: { onChanged: () => void }) {
  const [f, setF] = useState<Focus | null>(null)
  const [exclude, setExclude] = useState('')
  const [include, setInclude] = useState('')
  const [counts, setCounts] = useState<{ visible: number; hidden: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('lead_focus').select('preset, include_words, exclude_words').eq('id', 1).maybeSingle()
    if (data) { setF(data as Focus); setExclude((data.exclude_words ?? []).join('، ')); setInclude((data.include_words ?? []).join('، ')) }
    const [v, h] = await Promise.all([
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).eq('in_focus', true),
      supabase.from('outreach_leads').select('id', { count: 'exact', head: true }).eq('in_focus', false),
    ])
    setCounts({ visible: v.count ?? 0, hidden: h.count ?? 0 })
  }, [])
  useEffect(() => { load() }, [load])

  const apply = async (preset: Preset, inc: string[], exc: string[]) => {
    setBusy(true); setMsg(null)
    const { error } = await supabase.from('lead_focus').update({ preset, include_words: inc, exclude_words: exc, updated_at: new Date().toISOString() }).eq('id', 1)
    if (error) { setBusy(false); setMsg('تعذّر الحفظ.'); return }
    const { data } = await supabase.rpc('refocus_leads')
    setBusy(false)
    const row = Array.isArray(data) ? data[0] : null
    setMsg(row ? `تم. الظاهر الآن ${Number(row.visible)} عميل، والمخفي ${Number(row.hidden)}.` : 'تم الحفظ.')
    await load(); onChanged()
  }

  if (!f) return null
  const current = f.preset

  return (
    <section className="panel" style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div className="panel-h" style={{ padding: 0, border: 0 }}>
        <span>🎯 تركيز الاستهداف</span>
        {counts && <span className="note">ظاهر {counts.visible} · مخفي {counts.hidden}</span>}
      </div>
      <div className="note" style={{ lineHeight: 1.8 }}>تحدد أي نوع نشاط يُعتبر عميلًا. غير المطابق يختفي من القائمة، ولا يتواصل معه الإيجنت، ولا يُستورد من الجلب الجديد. المطابقة على تصنيف النشاط في خرائط قوقل.</div>
      <div className="chips">
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(k => (
          <button key={k} className="chip" aria-pressed={current === k} disabled={busy} title={PRESETS[k].hint}
            onClick={() => apply(k, PRESETS[k].include, k === 'all' ? [] : split(exclude).length ? split(exclude) : EXCLUDE_DEFAULT)}>{PRESETS[k].label}</button>
        ))}
        {current === 'custom' && <button className="chip" aria-pressed="true" disabled>مخصص</button>}
      </div>
      <div>
        <div className="lbl">كلمات تُستبعد دائمًا (تصنيف النشاط يحتويها)</div>
        <textarea rows={2} value={exclude} onChange={e => setExclude(e.target.value)} placeholder="مثال: law، legal، bank، محام" />
      </div>
      <div>
        <div className="lbl">كلمات يجب أن يحتويها التصنيف (فارغ = أي تصنيف)</div>
        <textarea rows={2} value={include} onChange={e => setInclude(e.target.value)} placeholder="مثال: real estate، developer، مطور" />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn call" disabled={busy} onClick={() => apply('custom', split(include), split(exclude))}>حفظ الكلمات وتطبيقها</button>
        {msg && <span className="msg-ok">{msg}</span>}
      </div>
    </section>
  )
}
