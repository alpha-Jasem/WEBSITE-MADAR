import { useState } from 'react'
import { Link } from 'react-router-dom'

// Developer center: how to connect to Madar from code, from an AI assistant (MCP) or from the terminal.
// Keys are created in «API والتكاملات»; no key is shown or stored here.

const BASE = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1'
type Tab = 'mcp' | 'cli' | 'api'

function Code({ text, onCopy }: { text: string; onCopy: () => void }) {
  return (
    <div>
      <pre dir="ltr" style={{ textAlign: 'left', margin: 0, padding: 12, background: 'var(--fill-2)', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--ink)' }}>{text}</pre>
      <button className="mc-btn2" style={{ marginTop: 8 }} onClick={() => { void navigator.clipboard.writeText(text).then(onCopy).catch(() => undefined) }}>نسخ</button>
    </div>
  )
}

export const AdminDeveloper = () => {
  const [tab, setTab] = useState<Tab>('mcp')
  const [note, setNote] = useState<string | null>(null)
  const copied = () => { setNote('انسخ'); window.setTimeout(() => setNote(null), 2000) }
  const mcp = JSON.stringify({ mcpServers: { madar: { type: 'http', url: `${BASE}/madar-mcp`, headers: { Authorization: 'Bearer YOUR_API_KEY' } } } }, null, 2)
  return (
    <div>
      {note && <div className="mc-banner" style={{ background: 'rgba(52,211,153,.14)', color: 'var(--green)' }}>{note}</div>}
      <article className="mc-card">
        <div className="mc-ph">
          <h3>مركز المطوّر</h3>
          <div className="mc-phr">
            <div className="mc-tabs" role="tablist">
              {([['mcp', 'خادم MCP'], ['cli', 'سطر الأوامر'], ['api', 'واجهة API']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'mc-on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'grid', gap: 14, maxWidth: 820 }}>
          {tab === 'mcp' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.9 }}>اربط مساعدك الذكي (Claude أو أي عميل يدعم MCP) بمدار ليقرأ المحادثات والعملاء والتذاكر والحجوزات. المفتاح الذي بلا صلاحية كتابة يرى أدوات القراءة فقط.</p>
              <b>العنوان</b><Code text={`${BASE}/madar-mcp`} onCopy={copied} />
              <b>إعداد العميل</b><Code text={mcp} onCopy={copied} />
              <div className="mc-delta">استبدل YOUR_API_KEY بمفتاح من <Link to="/admin/api" style={{ color: 'var(--link)' }}>API والتكاملات</Link>. المفتاح يخص شركة واحدة ويُظهر بياناتها فقط.</div>
              <div style={{ padding: 12, border: '1px dashed var(--line-2)', borderRadius: 12 }}>
                <b>خوادم MCP خارجية</b>
                <div className="mc-delta" style={{ marginTop: 4 }}>غير مفعّل: ربط خوادم MCP خارجية بوكلاء مدار يحتاج بنية تشغيل وبيانات اعتماد غير متوفرة حاليًا.</div>
              </div>
            </>
          )}
          {tab === 'cli' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.9 }}>أداة سطر أوامر صغيرة (Node.js) للتحويل والتذاكر والمحادثات من الطرفية.</p>
              <Code text={`curl -fsSL https://madar.software/cli/madar.mjs -o madar.mjs\nnode madar.mjs login YOUR_API_KEY\nnode madar.mjs conversations --limit 10\nnode madar.mjs tickets --status open\nnode madar.mjs help`} onCopy={copied} />
            </>
          )}
          {tab === 'api' && (
            <>
              <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.9 }}>واجهة REST بمفاتيح لكل شركة. قائمة العمليات الكاملة على العنوان أدناه.</p>
              <Code text={`curl -H "Authorization: Bearer YOUR_API_KEY" \\\n  "${BASE}/madar-api/v1/list_conversations?limit=5"`} onCopy={copied} />
              <div className="mc-delta">قائمة العمليات: <a href={`${BASE}/madar-api`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--link)' }}>{BASE}/madar-api</a> · إنشاء المفاتيح وإدارة الويب هوك من <Link to="/admin/api" style={{ color: 'var(--link)' }}>API والتكاملات</Link>.</div>
            </>
          )}
        </div>
      </article>
    </div>
  )
}
