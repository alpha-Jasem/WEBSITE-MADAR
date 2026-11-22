import { useState } from 'react'
import { AdminTeamSnippets, SKILL_KINDS, SNIPPET_KINDS } from './AdminTeamSnippets'
import { AdminTeamFiles } from './AdminTeamFiles'

// The team library: shared message templates, work guides ("skills") and files. Admins only.
type Tab = 'templates' | 'skills' | 'files'

export const AdminLibrary = ({ initialTab = 'templates' }: { initialTab?: Tab }) => {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const flash = (t: string) => { setNote(t); window.setTimeout(() => setNote(null), 3000) }
  return (
    <div>
      {error && <div className="mc-banner">{error}</div>}
      {note && <div className="mc-banner" style={{ background: 'rgba(52,211,153,.14)', color: 'var(--green)' }}>{note}</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>المكتبة</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist">
              {([['templates', 'قوالب الرسائل'], ['skills', 'المهارات'], ['files', 'الملفات']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'mc-on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {tab === 'templates' && <AdminTeamSnippets onError={setError} onCopied={flash} table="admin_snippets" kinds={SNIPPET_KINDS} />}
        {tab === 'skills' && (
          <AdminTeamSnippets onError={setError} onCopied={flash} table="admin_skills" kinds={SKILL_KINDS} newLabel="مهارة جديدة"
            emptyText="ما فيه مهارات بعد. اكتب أدلة العمل وقوائم التحقق وتعليمات الوكلاء اللي يعيد الفريق استخدامها." />
        )}
        {tab === 'files' && <AdminTeamFiles onError={setError} onNote={flash} />}
      </article>
    </div>
  )
}
