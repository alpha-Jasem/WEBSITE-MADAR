import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Copy, ExternalLink, MessageCircle, MoreVertical, Pencil, Plus, Power, PhoneCall, Trash2, Code2 } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Button, Dialog } from '@/dashboard/components/primitives'
import { useToast } from '@/dashboard/components/uiExtras'
import { useVoiceRead, type VoiceAgent } from '@/lib/queries/voicePlatform'
import { useWidgetItems, callConfig, chatConfig, directLink, snippetOf, type WidgetItem, type WidgetKind } from '@/lib/queries/widgets'
import { NightPage, Chip } from '../shared/night'
import { HeadCard, NB_CSS } from '../shared/nbPage'
import { WG_CSS } from './widgetUi'

const COPY = {
  call: { title: 'ودجة المكالمة عبر الويب', sub: 'أضف زر اتصال إلى أي موقع ليتحدث الزوار مع وكيلك الصوتي مباشرة.', empty: 'ما أنشأت أي ودجة مكالمة بعد.', path: 'widgets' },
  chat: { title: 'ودجة الدردشة', sub: 'أضف دردشة إلى موقعك يرد عليها وكيلك من معلومات شركتك.', empty: 'ما أنشأت أي ودجة دردشة بعد.', path: 'chat-widgets' },
} as const

export function DashboardV2WidgetList({ kind }: { kind: WidgetKind }) {
  const { companyId, isDemo, isOwner, can } = useWorkspace()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const pushToast = useToast()
  const base = `${isDemo ? '/demo-review' : '/dashboard'}/plugins`
  const t = COPY[kind]
  const { items, loading, available, update, remove } = useWidgetItems(companyId, isDemo, kind)
  const agentsRead = useVoiceRead<{ agents: VoiceAgent[] }>(isDemo || kind !== 'call' ? null : companyId || 'admin', 'agents')
  const agentName = (id: string) => (isDemo ? 'وكيل الاستقبال' : agentsRead.data?.agents?.find((a) => a.agent_id === id)?.name || '')
  const canEdit = isOwner || isDemo || can('integrations.manage')
  const [menu, setMenu] = useState<string | null>(null)
  const [code, setCode] = useState<WidgetItem | null>(null)
  const [del, setDel] = useState<WidgetItem | null>(null)

  // Right after creating, the wizard sends the visitor here with ?code=<id> to show the snippet.
  const codeId = params.get('code')
  useEffect(() => {
    if (!codeId || !items.length) return
    const w = items.find((x) => x.id === codeId)
    if (w) { setCode(w); setParams({}, { replace: true }) }
  }, [codeId, items, setParams])

  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); pushToast({ kind: 'success', title: ok }) }
    catch { pushToast({ kind: 'danger', title: 'ما قدرنا ننسخ، حدده وانسخه بنفسك' }) }
  }
  async function toggle(w: WidgetItem) {
    setMenu(null)
    try { await update(w.id, { enabled: !w.enabled }); pushToast({ kind: 'success', title: w.enabled ? 'تم التعطيل' : 'تم التفعيل' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر التحديث', description: e instanceof Error ? e.message : undefined }) }
  }
  async function confirmDelete() {
    if (!del) return
    try { await remove(del.id); pushToast({ kind: 'success', title: 'انحذفت الودجة' }) }
    catch (e) { pushToast({ kind: 'danger', title: 'تعذّر الحذف', description: e instanceof Error ? e.message : undefined }) }
    setDel(null)
  }

  const swatch = (w: WidgetItem) => {
    if (kind === 'call') { const c = callConfig(w.config); return { bg: c.color, img: c.iconUrl } }
    const c = chatConfig(w.config); return { bg: c.brand, img: c.logoUrl }
  }

  return (
    <NightPage>
      <style>{WG_CSS + NB_CSS}</style>
      <HeadCard title={t.title} sub={t.sub}>
        {canEdit && <button type="button" className="nb-btn" onClick={() => navigate(`${base}/${t.path}/new`)}><Plus size={16} /> ودجة جديدة</button>}
      </HeadCard>
      {!available ? <div className="nb-card np-empty">الإضافات غير مفعّلة على هذا الحساب بعد.</div>
        : loading ? <div className="nb-card np-empty">جارِ التحميل...</div>
        : items.length === 0 ? <div className="nb-card np-empty">{t.empty}</div>
        : (
          <div className="wg-list">
            {items.map((w) => {
              const sw = swatch(w)
              return (
                <div key={w.id} className="wg-item">
                  <div className="top">
                    <span className="ic" style={{ background: sw.bg }}>{sw.img ? <img src={sw.img} alt="" /> : kind === 'call' ? <PhoneCall size={20} /> : <MessageCircle size={20} />}</span>
                    <div style={{ minWidth: 0 }}>
                      <h3>{w.name}</h3>
                      <div className="meta">{kind === 'call' ? (agentName(w.agent_id) ? `الوكيل: ${agentName(w.agent_id)}` : 'وكيل الاتصال') : 'يرد من قاعدة معرفة الشركة'}</div>
                    </div>
                    {canEdit && <button type="button" className="wg-ic" aria-label={`خيارات ${w.name}`} aria-expanded={menu === w.id} onClick={() => setMenu(menu === w.id ? null : w.id)}><MoreVertical size={16} /></button>}
                  </div>
                  {menu === w.id && (
                    <div className="wg-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setMenu(null); navigate(`${base}/${t.path}/${w.id}`) }}><Pencil size={14} /> تعديل</button>
                      <button type="button" role="menuitem" onClick={() => { setMenu(null); setCode(w) }}><Code2 size={14} /> الكود</button>
                      <button type="button" role="menuitem" onClick={() => void toggle(w)}><Power size={14} /> {w.enabled ? 'تعطيل' : 'تفعيل'}</button>
                      <button type="button" role="menuitem" className="del" onClick={() => { setMenu(null); setDel(w) }}><Trash2 size={14} /> حذف</button>
                    </div>
                  )}
                  <div className="acts">
                    {w.enabled ? <Chip tone="ok">مفعّلة</Chip> : <Chip tone="muted">معطّلة</Chip>}
                    {kind === 'call' && w.direct_link && <Chip tone="info">رابط مباشر</Chip>}
                    <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => setCode(w)}>الكود</Button>
                      {canEdit && <Button variant="secondary" size="sm" onClick={() => navigate(`${base}/${t.path}/${w.id}`)}>تعديل</Button>}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      <Dialog open={!!code} title={code ? `كود ${code.name}` : ''} onClose={() => setCode(null)} width={540}
        footer={<Button variant="secondary" onClick={() => setCode(null)}>إغلاق</Button>}>
        {code && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="wg-hint">الصق السطر قبل &lt;/body&gt; في صفحات موقعك. الوكيل والمواقع المسموحة والتصميم تتغير من لوحة التحكم بدون نسخ الكود من جديد.</div>
            <div className="wg-code">{snippetOf(code)}</div>
            <div><Button variant="secondary" size="sm" onClick={() => void copy(snippetOf(code), 'انسخ الكود')}><Copy size={14} /> نسخ الكود</Button></div>
            {code.kind === 'call' && (
              code.direct_link ? (
                <>
                  <div className="wg-hint">الرابط المباشر: صفحة عامة يتكلم فيها أي شخص مع وكيلك بدون موقع أو تضمين.</div>
                  <div className="wg-code">{directLink(code.public_key)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" onClick={() => void copy(directLink(code.public_key), 'انسخ الرابط')}><Copy size={14} /> نسخ الرابط</Button>
                    <Button variant="secondary" size="sm" onClick={() => window.open(directLink(code.public_key), '_blank', 'noopener')}><ExternalLink size={14} /> فتح</Button>
                  </div>
                </>
              ) : <div className="wg-hint">الرابط المباشر مطفأ. فعّله من «تعديل».</div>
            )}
            {!code.enabled && <div className="wg-hint" style={{ color: 'var(--bad, #dc2626)' }}>هذه الودجة معطّلة، ما تظهر لزوار موقعك حتى تفعّلها.</div>}
          </div>
        )}
      </Dialog>

      <Dialog open={!!del} title="حذف الودجة" onClose={() => setDel(null)} width={420}
        footer={<><Button variant="secondary" onClick={() => setDel(null)}>إلغاء</Button><Button variant="danger" onClick={() => void confirmDelete()}>حذف</Button></>}>
        <div className="wg-hint">بتنحذف «{del?.name}» نهائيًا، والكود المركّب في موقعك يتوقف عن العمل.</div>
      </Dialog>
    </NightPage>
  )
}
