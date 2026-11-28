import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LayoutGrid, MessageCircle, PhoneCall } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useWidgetItems } from '@/lib/queries/widgets'
import { NightPage, Chip } from './shared/night'
import { HeadCard, NB_CSS } from './shared/nbPage'

const CSS = `
.pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; max-width: 920px; }
.pl-tile { position: relative; display: block; width: 100%; text-align: start; font: inherit; color: inherit; padding: 0; border: 1px solid var(--line); border-radius: 26px; overflow: hidden; background: var(--panel); cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
.pl-tile:hover { border-color: var(--line-2, var(--line)); }
.pl-tile:disabled { cursor: not-allowed; }
.pl-tile:disabled:hover { border-color: var(--line); }
.pl-tile:focus-visible { outline: 3px solid var(--accent, #6c4cf1); outline-offset: 2px; }
.pl-img { position: relative; height: 210px; background: linear-gradient(180deg, #0f1118 0%, #4a4d57 55%, #e9eaee 100%); overflow: hidden; }
.pl-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pl-img::after { content: ""; position: absolute; inset: auto 0 0 0; height: 55%; background: linear-gradient(180deg, transparent, var(--panel)); pointer-events: none; }
.pl-mock { position: absolute; inset: 22px 34px 0; border-radius: 16px 16px 0 0; border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); }
.pl-mock i { position: absolute; border-radius: 8px; background: rgba(255,255,255,.2); }
.pl-badge { position: absolute; z-index: 2; inset-inline-start: 18px; bottom: 6px; width: 44px; height: 44px; border-radius: 50%; background: var(--panel); border: 1px solid var(--line); display: grid; place-items: center; color: var(--ink); box-shadow: 0 6px 18px rgba(0,0,0,.12); }
.pl-state { position: absolute; z-index: 2; inset-inline-end: 14px; top: 14px; }
.pl-body { padding: 4px 22px 20px; display: grid; gap: 4px; }
.pl-body b { font-size: 16px; font-weight: 700; color: var(--ink); display: flex; align-items: center; gap: 6px; }
.pl-body span { font-size: 13.5px; color: var(--muted); line-height: 1.7; }
`

/** الإضافات: the two things a company puts on its own website, each with its own settings. */
export function DashboardV2Plugins() {
  const { companyId, isDemo, hasModule } = useWorkspace()
  const navigate = useNavigate()
  const base = `${isDemo ? '/demo-review' : '/dashboard'}/plugins`
  const chat = useWidgetItems(companyId, isDemo, 'chat')
  const call = useWidgetItems(companyId, isDemo, 'call')
  const voice = hasModule('voice')

  const tile = (img: string, kind: 'call' | 'chat', icon: ReactNode, title: string, desc: string, count: number, onOpen: () => void) => (
    <button type="button" className="pl-tile" onClick={onOpen}>
      <div className="pl-img">
        {/* The picture is dropped in as a file; until it exists the card shows a soft window sketch. */}
        <div className="pl-mock" aria-hidden="true">
          {kind === 'call'
            ? <><i style={{ insetInline: '8%', top: 14, height: 8 }} /><i style={{ insetInline: '6%', top: 36, height: 44 }} /><i style={{ insetInlineStart: '6%', width: '44%', top: 96, height: 60 }} /><i style={{ insetInlineEnd: '6%', width: '44%', top: 96, height: 60 }} /></>
            : <><i style={{ insetInlineStart: '8%', width: '52%', top: 22, height: 26 }} /><i style={{ insetInlineEnd: '8%', width: '44%', top: 62, height: 22 }} /><i style={{ insetInlineStart: '8%', width: '60%', top: 98, height: 30 }} /></>}
        </div>
        <img src={img} alt="" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <span className="pl-state">{count > 0 ? <Chip tone="ok">{count === 1 ? 'ودجة واحدة' : `${count} ودجات`}</Chip> : <Chip tone="muted">لا توجد ودجات</Chip>}</span>
      </div>
      <span className="pl-badge" aria-hidden="true">{icon}</span>
      <div className="pl-body"><b>{title} <ChevronLeft size={15} /></b><span>{desc}</span></div>
    </button>
  )

  return (
    <NightPage>
      <style>{CSS + NB_CSS}</style>
      <HeadCard title="الإضافات" sub="تكاملات وأكواد تضمين لوكلائك." icon={<span className="pl-icon"><LayoutGrid size={20} /></span>} />
      <div className="pl-grid">
        {voice && tile('/plugins/web-call.webp', 'call', <PhoneCall size={20} />, 'ودجة المكالمة عبر الويب', 'أضف زر اتصال إلى أي موقع للتحدث مع وكيلك.', call.items.length, () => navigate(`${base}/widgets`))}
        {tile('/plugins/chat.webp', 'chat', <MessageCircle size={20} />, 'ودجة الدردشة', 'أضف دردشة إلى موقعك يرد عليها وكيلك وفريقك.', chat.items.length, () => navigate(`${base}/chat-widgets`))}
      </div>
    </NightPage>
  )
}
