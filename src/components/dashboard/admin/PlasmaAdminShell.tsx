import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { AdminPulseProvider, useAdminPulse } from './adminPulse'
import '../../../styles/admin-plasma.css'
import '../../../styles/admin-shell.css'

type IconId =
  | 'home' | 'target' | 'pipeline' | 'users' | 'bolt' | 'building' | 'badge' | 'chat'
  | 'bot' | 'flow' | 'log' | 'chart' | 'gear' | 'plug' | 'search' | 'bell' | 'menu' | 'close'
  | 'out' | 'collapse' | 'more' | 'plus' | 'phone'

interface NavItem { id: string; label: string; to: string; icon: IconId; exact?: boolean; hint?: string }

const NAV: { group: string; items: NavItem[] }[] = [
  { group: '', items: [
    { id: 'overview', label: 'اليوم', to: '/admin', icon: 'home', exact: true, hint: 'ملخص يومك' },
  ]},
  { group: 'المبيعات', items: [
    { id: 'outreach', label: 'Outreach', to: '/admin/outreach', icon: 'target', hint: 'جلب العملاء والمتابعة' },
    { id: 'pipeline', label: 'الصفقات', to: '/admin/pipeline', icon: 'pipeline' },
  ]},
  { group: 'العملاء', items: [
    { id: 'companies', label: 'الشركات', to: '/admin/companies', icon: 'building' },
    { id: 'accounts', label: 'الحسابات والاشتراكات', to: '/admin/accounts', icon: 'badge' },
    { id: 'chats', label: 'المحادثات', to: '/admin/conversations', icon: 'chat' },
  ]},
  { group: 'التشغيل', items: [
    { id: 'agents', label: 'الوكلاء', to: '/admin/ai-agents', icon: 'bot' },
    { id: 'n8n', label: 'n8n Workflows', to: '/admin/n8n', icon: 'flow' },
    { id: 'logs', label: 'السجلات', to: '/admin/logs', icon: 'log' },
    { id: 'reports', label: 'التقارير', to: '/admin/reports', icon: 'chart' },
  ]},
  { group: 'النظام', items: [
    { id: 'settings', label: 'الإعدادات', to: '/admin/settings', icon: 'gear' },
    { id: 'api', label: 'API والتكاملات', to: '/admin/api', icon: 'plug' },
  ]},
]
const ALL_ITEMS = NAV.flatMap(g => g.items)
const MOBILE_TABS = ['overview', 'outreach', 'companies', 'chats']

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/admin': { title: 'اليوم', sub: 'اللي يستاهل وقتك الآن' },
  '/admin/reports': { title: 'التقارير', sub: 'تحليلات الأداء والإيرادات' },
  '/admin/companies': { title: 'الشركات', sub: 'إدارة حسابات العملاء والباقات' },
  '/admin/accounts': { title: 'الحسابات والاشتراكات', sub: 'تحكم باشتراكات Workspace OS وحدود الاستخدام' },
  '/admin/leads': { title: 'العملاء المحتملون', sub: 'متابعة وتحويل الليدز' },
  '/admin/pipeline': { title: 'الصفقات', sub: 'مراحل صفقات وكالة مدار' },
  '/admin/outreach': { title: 'Outreach', sub: 'اجلب العملاء وتواصل معهم وحدد الاجتماعات' },
  '/admin/sales-blitz': { title: 'Sales Blitz — جدة', sub: 'حملة العيادات المستهدفة في جدة' },
  '/admin/conversations': { title: 'المحادثات', sub: 'محادثات واتساب الواردة' },
  '/admin/ai-agents': { title: 'الوكلاء', sub: 'الوكلاء الأذكياء للصوت والمحادثة' },
  '/admin/n8n': { title: 'n8n Workflows', sub: 'أتمتة العمليات' },
  '/admin/logs': { title: 'السجلات', sub: 'سجلّ كل العمليات' },
  '/admin/settings': { title: 'الإعدادات', sub: 'إعدادات النظام' },
  '/admin/api': { title: 'API والتكاملات', sub: 'مفاتيح API والـ Webhooks' },
}

const P: Record<IconId, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  pipeline: 'M4 5h16M7 10h10M10 15h4M12 20v-0.01',
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  building: 'M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M2 21h20M8 8h2M8 12h2M8 16h2',
  badge: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.2 13.9 7 22l5-3 5 3-1.2-8.1',
  chat: 'M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  bot: 'M12 8V4M8 4h8M5 8h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM9 14h.01M15 14h.01',
  flow: 'M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6M6 3a2 2 0 1 0 0 .01M18 21a2 2 0 1 0 0-.01',
  log: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  collapse: 'M15 6l-6 6 6 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
}

export function Icon({ id, size = 18 }: { id: IconId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[id]} />
    </svg>
  )
}

function initParticles(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  let W = 0, H = 0, raf = 0
  const pts = Array.from({ length: 36 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.4,
    vx: (Math.random() - 0.5) * 0.00012, vy: (Math.random() - 0.5) * 0.0001, a: Math.random() * 0.4 + 0.12,
  }))
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
  const draw = () => {
    ctx.clearRect(0, 0, W, H)
    for (const p of pts) {
      p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(110,170,255,${p.a})`; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }
  window.addEventListener('resize', resize); resize(); draw()
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
}

const nf = (n: number) => n.toLocaleString('ar-SA')
const LS_COLLAPSED = 'madar_admin_sidebar_collapsed'

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const pulse = useAdminPulse()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(LS_COLLAPSED) === '1' } catch { return false } })
  const [drawer, setDrawer] = useState(false)
  const [bell, setBell] = useState(false)
  const [palette, setPalette] = useState(false)
  const [email, setEmail] = useState('')

  const meta = PAGE_META[location.pathname] ?? { title: 'مدار', sub: '' }
  const badges: Record<string, number> = { outreach: pulse.due.length + pulse.meetingsToday.length }

  useEffect(() => {
    document.body.classList.add('plasma-admin')
    return () => document.body.classList.remove('plasma-admin')
  }, [])

  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 900
    if (calm || !canvasRef.current) return
    return initParticles(canvasRef.current)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  useEffect(() => { setDrawer(false); setBell(false) }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
      if (e.key === 'Escape') { setPalette(false); setBell(false); setDrawer(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(c => {
      try { localStorage.setItem(LS_COLLAPSED, c ? '0' : '1') } catch { /* storage unavailable */ }
      return !c
    })
  }

  const isActive = (it: NavItem) => (it.exact ? location.pathname === it.to : location.pathname.startsWith(it.to))
  const signOut = async () => { await supabase.auth.signOut(); navigate('/admin/login') }

  const notifs = useMemo(() => {
    const list: { id: string; title: string; text: string; to: string }[] = []
    if (pulse.meetingsToday.length) {
      list.push({
        id: 'm', title: `اجتماعات اليوم (${nf(pulse.meetingsToday.length)})`, to: '/admin/outreach',
        text: pulse.meetingsToday.map(m => `${m.name} ${new Date(m.meeting_at!).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' })}`).join('، '),
      })
    }
    if (pulse.due.length) {
      const names = pulse.due.slice(0, 4).map(l => l.name).join('، ')
      list.push({ id: 'd', title: `متابعات اليوم (${nf(pulse.due.length)})`, to: '/admin/outreach', text: pulse.due.length > 4 ? `${names} و${nf(pulse.due.length - 4)} آخرين` : names })
    }
    if (pulse.newToday) list.push({ id: 'n', title: `${nf(pulse.newToday)} عميل أُضيف اليوم`, to: '/admin/outreach', text: `بانتظار أول تواصل: ${nf(pulse.waiting)} عميل` })
    return list
  }, [pulse])

  const initials = (email.slice(0, 2) || 'مد').toUpperCase()
  const cls = ['sbx-app', collapsed ? 'is-collapsed' : '', drawer ? 'drawer-open' : ''].join(' ')

  return (
    <div className={cls} dir="rtl">
      <canvas ref={canvasRef} className="sbx-particles" aria-hidden="true" />

      {/* ---------- sidebar ---------- */}
      <aside className="sbx" aria-label="القائمة الرئيسية">
        <div className="sbx-brand">
          <div className="sbx-logo"><img src="/assets/logo-madar.png" alt="" onError={e => { e.currentTarget.style.display = 'none' }} /><span>م</span></div>
          <div className="sbx-brand-text">
            <b>مدار</b>
            <small>لوحة الإدارة</small>
          </div>
          <button className="sbx-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'} title={collapsed ? 'توسيع' : 'طي'}>
            <Icon id="collapse" size={16} />
          </button>
          <button className="sbx-close" onClick={() => setDrawer(false)} aria-label="إغلاق"><Icon id="close" size={18} /></button>
        </div>

        <button className="sbx-quick" onClick={() => navigate('/admin/outreach')} title="جيب عملاء">
          <Icon id="plus" size={16} /><span>جيب عملاء</span>
        </button>

        <nav className="sbx-nav">
          {NAV.map((g, gi) => (
            <div className="sbx-group" key={gi}>
              {g.group && <div className="sbx-group-label">{g.group}</div>}
              {g.items.map(it => {
                const b = badges[it.id]
                return (
                  <button key={it.id} className={`sbx-item ${isActive(it) ? 'active' : ''}`} onClick={() => navigate(it.to)}
                    title={collapsed ? it.label : undefined} aria-current={isActive(it) ? 'page' : undefined}>
                    <span className="sbx-ico"><Icon id={it.icon} /></span>
                    <span className="sbx-label">{it.label}</span>
                    {b ? <span className="sbx-badge">{nf(b)}</span> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sbx-foot">
          <div className="sbx-user">
            <div className="sbx-avatar">{initials}</div>
            <div className="sbx-user-text">
              <b>{email ? email.split('@')[0] : 'مدير النظام'}</b>
              <small>{email || 'admin'}</small>
            </div>
            <button className="sbx-out" onClick={signOut} title="تسجيل الخروج" aria-label="تسجيل الخروج"><Icon id="out" size={16} /></button>
          </div>
        </div>
      </aside>
      <div className="sbx-scrim" onClick={() => setDrawer(false)} />

      {/* ---------- main ---------- */}
      <div className="sbx-main">
        <header className="tbx">
          <button className="tbx-btn tbx-menu" onClick={() => setDrawer(true)} aria-label="فتح القائمة"><Icon id="menu" /></button>
          <div className="tbx-title">
            <h1>{meta.title}</h1>
            {meta.sub && <div>{meta.sub}</div>}
          </div>
          <div className="tbx-spacer" />
          <button className="tbx-search" onClick={() => setPalette(true)}>
            <Icon id="search" size={16} /><span>ابحث أو انتقل إلى…</span><kbd>Ctrl K</kbd>
          </button>
          <button className="tbx-btn tbx-search-m" onClick={() => setPalette(true)} aria-label="بحث"><Icon id="search" /></button>
          <div className="tbx-bell-wrap">
            <button className="tbx-btn" onClick={() => setBell(v => !v)} aria-label="الإشعارات" aria-expanded={bell}>
              <Icon id="bell" />
              {notifs.length > 0 && <span className="tbx-dot" />}
            </button>
            {bell && (
              <>
                <div className="tbx-bell-bg" onClick={() => setBell(false)} />
                <div className="tbx-panel" role="dialog" aria-label="الإشعارات">
                  <div className="tbx-panel-head">الإشعارات</div>
                  {notifs.length === 0 ? (
                    <div className="tbx-empty">ما عندك شي معلّق. وقتك فاضي للعملاء الجدد.</div>
                  ) : notifs.map(n => (
                    <button key={n.id} className="tbx-notif" onClick={() => navigate(n.to)}>
                      <b>{n.title}</b>
                      <span>{n.text}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>

        <div className="sbx-scroll">{children}</div>
      </div>

      {/* ---------- mobile tab bar ---------- */}
      <nav className="mtab" aria-label="تنقل سريع">
        {MOBILE_TABS.map(id => {
          const it = ALL_ITEMS.find(i => i.id === id)!
          const b = badges[id]
          return (
            <button key={id} className={isActive(it) ? 'active' : ''} onClick={() => navigate(it.to)}>
              <span className="mtab-ico"><Icon id={it.icon} size={21} />{b ? <i>{nf(b)}</i> : null}</span>
              <span>{it.label === 'اليوم' ? 'اليوم' : it.label}</span>
            </button>
          )
        })}
        <button onClick={() => setDrawer(true)}>
          <span className="mtab-ico"><Icon id="more" size={21} /></span><span>المزيد</span>
        </button>
      </nav>

      {palette && <Palette onClose={() => setPalette(false)} navigate={navigate} />}
    </div>
  )
}

/* ---------- command palette: pages, actions and quick search in leads and companies ---------- */
function Palette({ onClose, navigate }: { onClose: () => void; navigate: (to: string) => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [found, setFound] = useState<{ id: string; label: string; sub: string; to: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setFound([]); return }
    const t = window.setTimeout(async () => {
      const safe = term.replace(/[%,()]/g, ' ')
      const [leads, comps] = await Promise.all([
        supabase.from('outreach_leads').select('id, name, phone, city').or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(5),
        supabase.from('companies').select('id, name, plan').ilike('name', `%${safe}%`).limit(4),
      ])
      setFound([
        ...(leads.data ?? []).map(l => ({ id: `l${l.id}`, label: l.name, sub: `عميل محتمل · +${l.phone}`, to: `/admin/outreach?q=${encodeURIComponent(l.name)}` })),
        ...(comps.data ?? []).map(c => ({ id: `c${c.id}`, label: c.name, sub: 'شركة', to: '/admin/companies' })),
      ])
    }, 220)
    return () => window.clearTimeout(t)
  }, [q])

  const items = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pages = ALL_ITEMS
      .filter(i => !term || i.label.toLowerCase().includes(term) || (i.hint ?? '').includes(term))
      .map(i => ({ id: i.id, label: i.label, sub: i.hint ?? 'صفحة', to: i.to }))
    return [...pages, ...found]
  }, [q, found])

  const go = (to: string) => { navigate(to); onClose() }

  return (
    <div className="pal-bg" onClick={onClose}>
      <div className="pal" role="dialog" aria-label="بحث سريع" onClick={e => e.stopPropagation()}>
        <div className="pal-input">
          <Icon id="search" size={18} />
          <input ref={inputRef} value={q} placeholder="ابحث عن صفحة أو عميل أو شركة…"
            onChange={e => { setQ(e.target.value); setSel(0) }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && items[sel]) go(items[sel].to)
            }} />
        </div>
        <div className="pal-list">
          {items.length === 0 && <div className="tbx-empty">ما لقيت شي</div>}
          {items.map((it, i) => (
            <button key={it.id} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => go(it.to)}>
              <b>{it.label}</b><span>{it.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PlasmaAdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminPulseProvider>
      <Shell>{children}</Shell>
    </AdminPulseProvider>
  )
}
