import { useEffect, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import {
  markQuestionAnswered, removeKnowledgeItem, saveKnowledgeAnswer, syncKnowledgeToVoicePlatforms,
  type OpsKnowledgeItem, type UnansweredQuestion,
} from '@/lib/queries/ops'
import { categoryOf } from './kbModel'

export type TeachTarget =
  | { mode: 'new' }
  | { mode: 'answer'; question: UnansweredQuestion }
  | { mode: 'edit'; item: OpsKnowledgeItem }

const NEW_CAT = '__new__'

export function TeachDialog({ target, onClose, categories, companyId, isDemo, agentName }: {
  target: TeachTarget | null
  onClose: () => void
  categories: string[]
  companyId: string | null
  isDemo: boolean
  agentName: string
}) {
  const pushToast = useToast()
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [cat, setCat] = useState('')
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!target) return
    if (target.mode === 'edit') {
      setQ(target.item.title); setA(target.item.content || ''); setCat(categoryOf(target.item))
    } else {
      setQ(target.mode === 'answer' ? target.question.question : ''); setA(''); setCat(categories[0] || NEW_CAT)
    }
    setNewCat('')
  }, [target, categories])

  const title = !target ? '' : target.mode === 'answer' ? 'علّم الموظف الجواب' : target.mode === 'edit' ? 'تعديل الجواب' : 'سؤال جديد'
  const catOptions = target?.mode === 'edit' && !categories.includes(cat) && cat !== NEW_CAT ? [cat, ...categories] : categories

  async function save() {
    if (!target) return
    const category = cat === NEW_CAT ? newCat.trim() : cat
    if (!q.trim() || !a.trim() || !category) {
      pushToast({ kind: 'danger', title: 'اكتب السؤال والجواب والقسم' })
      return
    }
    if (!companyId && !isDemo) return
    setSaving(true)
    try {
      const id = await saveKnowledgeAnswer({
        id: target.mode === 'edit' ? target.item.id : undefined,
        company_id: companyId || 'demo-clinic-001',
        question: q.trim(), answer: a.trim(), category,
        type: target.mode === 'edit' ? target.item.type : 'faq',
        metadata: target.mode === 'edit' ? target.item.metadata : target.mode === 'answer' ? { source: 'unanswered_question', question_id: target.question.id } : null,
      }, isDemo)
      if (target.mode === 'answer') await markQuestionAnswered(target.question.id, id, isDemo)
      // No-op today; the hook point for pushing answers to Nabrah/ElevenLabs later.
      if (companyId) void syncKnowledgeToVoicePlatforms(companyId)
      pushToast({ kind: 'success', title: 'انحفظ الجواب' })
      onClose()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحفظ', description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (target?.mode !== 'edit') return
    if (!window.confirm(`حذف "${target.item.title}"؟`)) return
    try {
      await removeKnowledgeItem(target.item.id, isDemo)
      pushToast({ kind: 'success', title: 'انحذف السؤال' })
      onClose()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر الحذف', description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <Dialog
      open={!!target} title={title} onClose={onClose}
      footer={<>
        {target?.mode === 'edit' && (
          <Button variant="danger" onClick={remove} style={{ marginInlineEnd: 'auto' }}><Trash2 size={14} /> حذف</Button>
        )}
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button onClick={save} disabled={saving}><Check size={15} /> {saving ? 'جارِ الحفظ...' : 'احفظ الجواب'}</Button>
      </>}
    >
      <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 13 }}>اكتب الجواب مثل ما تقوله لعميل. {agentName} يعتمد عليه لما ينسأل نفس السؤال.</p>
      <div className="ops-stack">
        <div className="ops-field">
          <label htmlFor="t-q">السؤال</label>
          <input className="ops-input" id="t-q" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={target?.mode === 'new'} />
        </div>
        <div className="ops-field">
          <label htmlFor="t-a">الجواب</label>
          <textarea className="ops-input" id="t-a" value={a} onChange={(e) => setA(e.target.value)} autoFocus={target?.mode === 'answer'}
            placeholder="مثال: إيه، عندنا جلسات تبييض بالليزر بـ 1500 ريال، والجلسة ساعة تقريبًا." />
        </div>
        <div className="ops-field">
          <label htmlFor="t-c">القسم</label>
          <select className="ops-input" id="t-c" value={cat} onChange={(e) => setCat(e.target.value)}>
            {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value={NEW_CAT}>قسم جديد…</option>
          </select>
        </div>
        {cat === NEW_CAT && (
          <div className="ops-field">
            <label htmlFor="t-nc">اسم القسم الجديد</label>
            <input className="ops-input" id="t-nc" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="مثال: العروض" />
          </div>
        )}
      </div>
    </Dialog>
  )
}
