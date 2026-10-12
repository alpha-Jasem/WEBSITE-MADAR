import { useMemo, useState } from 'react'
import { BookOpen, ChevronDown, Info, Plus, Sparkles } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button } from '@/dashboard/components/primitives'
import { useToast, Skeleton, EmptyState } from '@/dashboard/components/uiExtras'
import {
  setKnowledgeActive, useKnowledgeItems, useOpsCaps, useUnansweredQuestions,
  type OpsKnowledgeItem,
} from '@/lib/queries/ops'
import { useShellPrimaryAction } from '@/dashboard/components/shellActions'
import { TeachDialog, type TeachTarget } from './knowledge/TeachDialog'
import { DEFAULT_CATEGORIES, categoryOf } from './knowledge/kbModel'
import './tickets/ops.css'

const DAY = 86_400_000

export function DashboardV2KnowledgeBase() {
  const { companyId, isDemo, companyName, accountLoading } = useWorkspace()
  const pushToast = useToast()
  const { caps, ready } = useOpsCaps(isDemo, accountLoading)
  const { data: items, loading, error, refetch } = useKnowledgeItems(companyId, isDemo)
  const { data: pending, refetch: refetchPending } = useUnansweredQuestions(companyId, isDemo, caps.unanswered)
  const [target, setTarget] = useState<TeachTarget | null>(null)
  useShellPrimaryAction({ label: 'إضافة معلومة', icon: <Plus />, onClick: () => setTarget({ mode: 'new' }) })
  const agentName = isDemo ? 'مها' : 'الوكيل الذكي'
  const biz = companyName || (isDemo ? 'شركة نموذجية' : 'منشأتك')

  const groups = useMemo(() => {
    const map = new Map<string, OpsKnowledgeItem[]>()
    for (const it of items || []) {
      const c = categoryOf(it)
      map.set(c, [...(map.get(c) || []), it])
    }
    return Array.from(map.entries())
  }, [items])
  const categories = useMemo(() => {
    const set = new Set(groups.map(([c]) => c))
    DEFAULT_CATEGORIES.forEach((c) => set.add(c))
    return Array.from(set)
  }, [groups])

  async function toggle(it: OpsKnowledgeItem) {
    try {
      await setKnowledgeActive(it.id, !it.is_active, isDemo)
      refetch()
    } catch (e) {
      pushToast({ kind: 'danger', title: 'تعذّر تحديث الحالة', description: e instanceof Error ? e.message : undefined })
    }
  }

  const pend = pending || []
  const now = Date.now()

  return (
    <div className="ops-page">
      <div className="ops-head">
        <div>
          <h1 className="ops-h1">قاعدة المعرفة</h1>
          <p className="ops-sub">اللي يعرفه {agentName} عن {biz}. أضف الأسئلة اللي يسألها عملاؤك مع جوابها.</p>
        </div>
        <Button onClick={() => setTarget({ mode: 'new' })}><Plus size={15} /> سؤال جديد</Button>
      </div>

      {ready && caps.unanswered && pend.length > 0 && (
        <section className="ops-card" style={{ borderColor: 'rgba(128,83,248,.4)' }}>
          <h3><Sparkles size={16} style={{ color: 'var(--ai)' }} /> أسئلة سألها عملاؤك وما عرف يجاوبها <span className="aside">جاوبها مرة وتنضاف لقاعدة المعرفة</span></h3>
          {pend.map((q) => (
            <div key={q.id} className="ops-q">
              <p>{q.question}</p>
              <span className="times">تكرر ×{q.count}</span>
              <Button size="sm" onClick={() => setTarget({ mode: 'answer', question: q })}>جاوب</Button>
            </div>
          ))}
        </section>
      )}
      {ready && caps.unanswered && pend.length === 0 && (
        <div className="ops-note"><Sparkles size={14} /><span>ما فيه أسئلة معلّقة. لما يُسأل {agentName} سؤال ما يعرف جوابه، يطلع هنا عشان تعلّمه.</span></div>
      )}
      {ready && !caps.unanswered && (
        <div className="ops-note"><Info size={14} /><span>تتبّع الأسئلة اللي ما عرف يجاوبها الوكيل يتفعّل بعد تحديث قاعدة البيانات.</span></div>
      )}

      {error && <div className="ops-note" style={{ background: 'var(--bad-bg)', color: 'var(--bad)' }}>تعذّر تحميل قاعدة المعرفة: {error}</div>}

      {loading ? (
        <div className="ops-stack">{[0, 1, 2].map((i) => <Skeleton key={i} height={50} radius="14px" />)}</div>
      ) : groups.length === 0 ? (
        <div className="ops-card">
          <EmptyState
            icon={<BookOpen size={20} />} title="ما فيه أسئلة بعد"
            description="أضف الأسئلة اللي يتكرر سؤالها، مثل الأسعار والدوام والموقع، مع الجواب اللي تبي الوكيل يقوله."
            action={<Button size="sm" onClick={() => setTarget({ mode: 'new' })}><Plus size={14} /> سؤال جديد</Button>}
          />
        </div>
      ) : (
        <div>
          {groups.map(([cat, list], gi) => (
            <details key={cat} className="ops-acc" open={gi === 0}>
              <summary>
                <BookOpen size={16} style={{ color: 'var(--sky)' }} />
                {cat}
                <span className="aside">{list.length} {list.length === 1 ? 'سؤال' : 'أسئلة'}</span>
                <ChevronDown size={15} className="chev" />
              </summary>
              {list.map((it) => {
                const fresh = now - new Date(it.created_at).getTime() < DAY
                return (
                  <div key={it.id} className={`ops-qa${it.is_active ? '' : ' off'}`} style={fresh ? { background: 'var(--ai-bg)' } : undefined}>
                    <div>
                      <p>{it.title}</p>
                      <span className="a">{it.content}</span>
                    </div>
                    <div className="tools">
                      <button type="button" className="ops-toggle" role="switch" aria-checked={it.is_active}
                        aria-label={it.is_active ? 'إيقاف السؤال' : 'تفعيل السؤال'} title={it.is_active ? 'مفعّل' : 'موقوف'}
                        onClick={() => toggle(it)} />
                      <Button size="sm" variant="secondary" onClick={() => setTarget({ mode: 'edit', item: it })}>تعديل</Button>
                    </div>
                  </div>
                )
              })}
            </details>
          ))}
        </div>
      )}

      <TeachDialog target={target} onClose={() => { setTarget(null); refetch(); refetchPending() }} categories={categories} companyId={companyId} isDemo={isDemo} agentName={agentName} />
    </div>
  )
}
