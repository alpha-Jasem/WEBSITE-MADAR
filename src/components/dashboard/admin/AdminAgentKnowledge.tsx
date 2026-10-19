import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

interface Item { id: string; category: Category; title: string; content: string; active: boolean }
type Category = 'about' | 'services' | 'pricing' | 'faq' | 'objection' | 'policy' | 'website'

const CATS: { key: Category; label: string; hint: string }[] = [
  { key: 'about', label: 'عن مدار', hint: 'من أنتم وماذا تقدمون في جملتين' },
  { key: 'services', label: 'الخدمات', hint: 'ما الذي يقدمه وكيل الذكاء الاصطناعي بالتفصيل' },
  { key: 'pricing', label: 'الأسعار والعروض', hint: 'أسعار معتمدة فقط، وأي عرض أو تجربة مجانية حقيقية' },
  { key: 'faq', label: 'أسئلة شائعة', hint: 'سؤال العميل المتكرر وجوابك الصحيح' },
  { key: 'objection', label: 'ردود على الاعتراضات', hint: 'مثل «السعر غالي» أو «عندنا نظام»' },
  { key: 'policy', label: 'سياسات', hint: 'ساعات الدعم، الاسترجاع، مدة التجهيز…' },
  { key: 'website', label: 'المواقع الإلكترونية', hint: 'ما تقدمه في المواقع: النماذج والمدة والسعر إن وُجد' },
]
const EMPTY = { category: 'about' as Category, title: '', content: '' }

// What the sales agent knows. Everything here is written by the owner; the agent relies on it and says it will check with the team when something is not covered.
export const AdminAgentKnowledge = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('ai_knowledge').select('id, category, title, content, active').order('created_at')
    if (error) setMsg({ ok: false, text: 'تعذّر تحميل المعرفة.' })
    setItems((data ?? []) as Item[])
  }, [])
  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setBusy(true); setMsg(null)
    const row = { category: form.category, title: form.title.trim(), content: form.content.trim(), updated_at: new Date().toISOString() }
    const { error } = editing
      ? await supabase.from('ai_knowledge').update(row).eq('id', editing)
      : await supabase.from('ai_knowledge').insert(row)
    setBusy(false)
    if (error) { setMsg({ ok: false, text: 'تعذّر الحفظ.' }); return }
    setForm(EMPTY); setEditing(null); setMsg({ ok: true, text: 'حُفظت. يعتمد عليها الإيجنت من الرد القادم.' }); load()
  }
  const toggle = async (i: Item) => { await supabase.from('ai_knowledge').update({ active: !i.active, updated_at: new Date().toISOString() }).eq('id', i.id); load() }
  const remove = async (i: Item) => { if (!window.confirm(`حذف «${i.title}»؟`)) return; await supabase.from('ai_knowledge').delete().eq('id', i.id); load() }
  const edit = (i: Item) => { setEditing(i.id); setForm({ category: i.category, title: i.title, content: i.content }); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const shown = items.filter(i => filter === 'all' || i.category === filter)
  const cat = CATS.find(c => c.key === form.category)!
  const used = items.filter(i => i.active).reduce((n, i) => n + i.title.length + i.content.length, 0)

  return (
    <div>
      {msg && <div className="mc-banner" style={msg.ok ? { background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.35)', color: 'var(--green)' } : undefined}>{msg.text}</div>}

      <article className="mc-card" style={{ marginBottom: 14 }}>
        <div className="mc-ph"><h3>{editing ? 'تعديل معلومة' : 'أضف معلومة للإيجنت'}</h3><button className="mc-btn2" onClick={() => navigate('/admin/ai-test')}>جرّب الإيجنت الآن</button></div>
        <div style={{ padding: '0 20px 18px', display: 'grid', gap: 12 }}>
          <div className="mc-delta" style={{ lineHeight: 1.8 }}>اكتب هنا كل ما تريد أن يعرفه الإيجنت قبل ما يكلم عميلًا. هو يعتمد على كلامك حرفيًا، وإذا سُئل عن شيء غير مكتوب يقول إنه يتأكد من الفريق ولا يخمّن. أسعار تكتبها هنا يذكرها العميل، فاكتب فقط ما تعتمده.</div>
          <label className="mc-field">النوع
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}>
              {CATS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <div className="mc-delta">{cat.hint}</div>
          <label className="mc-field">العنوان
            <input value={form.title} maxLength={120} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثل: كم يستغرق تجهيز الوكيل؟" />
          </label>
          <label className="mc-field">المحتوى
            <textarea rows={5} value={form.content} maxLength={3000} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="اكتب الجواب أو المعلومة بصياغتك." />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="mc-btn2 p" onClick={save} disabled={busy || !form.title.trim() || !form.content.trim()}>{busy ? 'جاري الحفظ…' : editing ? 'حفظ التعديل' : 'إضافة'}</button>
            {editing && <button className="mc-btn2" onClick={() => { setEditing(null); setForm(EMPTY) }}>إلغاء</button>}
          </div>
        </div>
      </article>

      <article className="mc-card">
        <div className="mc-ph">
          <h3>ما يعرفه الإيجنت ({items.length})</h3>
          <span className={`mc-st ${used > 6500 ? 'mc-a' : 'mc-n2'}`}>{used.toLocaleString('en-US')} / 7000 حرف يستخدمها</span>
        </div>
        <div style={{ padding: '0 20px 10px' }}>
          <div className="mc-chips">
            <button className={`mc-chipbtn ${filter === 'all' ? 'mc-on' : ''}`} onClick={() => setFilter('all')}>الكل</button>
            {CATS.map(c => <button key={c.key} className={`mc-chipbtn ${filter === c.key ? 'mc-on' : ''}`} onClick={() => setFilter(c.key)}>{c.label} ({items.filter(i => i.category === c.key).length})</button>)}
          </div>
        </div>
        {shown.length === 0 && <div className="mc-flat">لا توجد معلومات بعد. أضف أول معلومة من الأعلى.</div>}
        {shown.map(i => (
          <div key={i.id} className="mc-act" style={{ cursor: 'default', alignItems: 'flex-start', opacity: i.active ? 1 : 0.55 }}>
            <div className="mc-m" style={{ minWidth: 0 }}>
              <b>{i.title}</b>
              <small style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{i.content}</small>
              <small style={{ color: 'var(--link)' }}>{CATS.find(c => c.key === i.category)?.label}</small>
            </div>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="mc-btn2" onClick={() => edit(i)}>تعديل</button>
              <button className="mc-btn2" onClick={() => toggle(i)}>{i.active ? 'إيقاف' : 'تفعيل'}</button>
              <button className="mc-btn2" onClick={() => remove(i)}>حذف</button>
            </span>
          </div>
        ))}
      </article>
    </div>
  )
}
