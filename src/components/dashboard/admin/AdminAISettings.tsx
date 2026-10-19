import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface Cfg {
  jarvis_enabled: boolean; jarvis_instructions: string; jarvis_tools: string[]
  agent_product: string; agent_instructions: string; agent_tone: 'friendly' | 'formal'
}
const TOOLS: { key: string; label: string; hint: string }[] = [
  { key: 'tasks', label: 'المهام', hint: 'يضيف ويكمل ويعدّل مواعيد مهامك' },
  { key: 'goal', label: 'هدف الشهر', hint: 'يضبط هدف التحصيل الشهري' },
  { key: 'deals', label: 'الصفقات', hint: 'ينقل الصفقة بين المراحل ويحدد الخطوة القادمة (لا يقفلها كمكسوبة)' },
  { key: 'leads', label: 'عملاء Outreach', hint: 'يحدد موعد متابعة ويضيف ملاحظة' },
]
const DEFAULT: Cfg = { jarvis_enabled: true, jarvis_instructions: '', jarvis_tools: ['tasks', 'goal', 'deals', 'leads'], agent_product: '', agent_instructions: '', agent_tone: 'friendly' }

// Where the owner tunes Jarvis and the sales agent. The built-in safety rules always stay; these settings only add to them.
export const AdminAISettings = () => {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT)
  const [digest, setDigest] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('ai_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('outreach_settings').select('digest_enabled').eq('id', 1).maybeSingle(),
    ]).then(([a, o]) => {
      if (a.data) setCfg({ ...DEFAULT, ...a.data })
      if (o.data) setDigest(!!o.data.digest_enabled)
      setLoaded(true)
    })
  }, [])

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => setCfg(c => ({ ...c, [k]: v }))
  const toggleTool = (k: string) => set('jarvis_tools', cfg.jarvis_tools.includes(k) ? cfg.jarvis_tools.filter(x => x !== k) : [...cfg.jarvis_tools, k])

  const save = async () => {
    setSaving(true); setMsg(null)
    const [a, o] = await Promise.all([
      supabase.from('ai_settings').upsert({ id: 1, ...cfg, updated_at: new Date().toISOString() }),
      supabase.from('outreach_settings').upsert({ id: 1, digest_enabled: digest, updated_at: new Date().toISOString() }),
    ])
    setSaving(false)
    setMsg(a.error || o.error ? { ok: false, text: 'تعذّر الحفظ. أعد المحاولة.' } : { ok: true, text: 'تم الحفظ. يسري من الرسالة القادمة.' })
  }

  if (!loaded) return <div className="mc-flat">جاري التحميل…</div>

  return (
    <div>
      {msg && <div className="mc-banner" style={msg.ok ? { background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.35)', color: 'var(--green)' } : undefined}>{msg.text}</div>}

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>إعدادات جارفيس</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 14 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={cfg.jarvis_enabled} onChange={e => set('jarvis_enabled', e.target.checked)} />
            <span><b>تفعيل جارفيس</b><div className="mc-delta">إذا أوقفته يرفض كل الأوامر.</div></span>
          </label>
          <div>
            <div className="mc-delta" style={{ marginBottom: 6 }}>ما يسمح له بتعديله:</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {TOOLS.map(t => (
                <label key={t.key} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" style={{ width: 'auto' }} checked={cfg.jarvis_tools.includes(t.key)} onChange={() => toggleTool(t.key)} />
                  <span><b>{t.label}</b> <span className="mc-delta">· {t.hint}</span></span>
                </label>
              ))}
            </div>
          </div>
          <label className="mc-field">تعليمات إضافية لجارفيس (اختياري)
            <textarea rows={4} value={cfg.jarvis_instructions} maxLength={1200} onChange={e => set('jarvis_instructions', e.target.value)} placeholder="مثل: خلك مختصر جدًا. أي مهمة بدون وقت خلها الساعة 10 صباحًا. نادني أبا فهد." />
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={digest} onChange={e => setDigest(e.target.checked)} />
            <span><b>ملخص الصباح بإشعار</b><div className="mc-delta">كل يوم الساعة 8 صباحًا بتوقيت الرياض.</div></span>
          </label>
        </div>
      </article>

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>إعدادات الإيجنت البائع</h3></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 14 }}>
          <div className="mc-delta" style={{ lineHeight: 1.8 }}>ثوابت لا تتغير: يعرّف بنفسه كمساعد آلي، ولا يذكر سعرًا إلا من الأسعار المعتمدة، ولا ينزل عن أقل سعر أو يتجاوز أقصى خصم (تضبطها لكل إيجنت في «الإيجنت البائع»)، ويتوقف إذا رفض العميل. الحد اليومي وقوائم عدم التواصل تبقى في «الإيجنت البائع».</div>
          <label className="mc-field">وصف ما تبيعه (يحل محل الوصف الافتراضي)
            <textarea rows={4} value={cfg.agent_product} maxLength={1500} onChange={e => set('agent_product', e.target.value)} placeholder="اتركه فارغًا لاستخدام وصف مدار الافتراضي: وكلاء ذكاء اصطناعي يردون على واتساب والمكالمات ويحجزون المواعيد." />
          </label>
          <label className="mc-field">نبرة الكلام
            <select value={cfg.agent_tone} onChange={e => set('agent_tone', e.target.value as Cfg['agent_tone'])}>
              <option value="friendly">ودودة</option>
              <option value="formal">رسمية</option>
            </select>
          </label>
          <label className="mc-field">تعليمات إضافية للإيجنت (اختياري)
            <textarea rows={4} value={cfg.agent_instructions} maxLength={1500} onChange={e => set('agent_instructions', e.target.value)} placeholder="مثل: ركّز على العيادات. اذكر أن التجربة الأولى مجانية (إذا كانت فعلًا كذلك). لا تتصل بعد الساعة 9 مساءً." />
          </label>
        </div>
      </article>

      <button className="mc-btn2 p" onClick={save} disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ الإعدادات'}</button>
    </div>
  )
}
