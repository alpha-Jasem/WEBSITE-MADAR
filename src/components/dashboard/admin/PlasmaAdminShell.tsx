import { useSystemChrome } from '../../../hooks/useSystemChrome'
import { useRealtimeRefetch } from '../../../lib/realtime'
import { usePush } from '../../../lib/push'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { AdminPulseProvider, useAdminPulse } from './adminPulse'
import { McIcon, type McIconName } from './mcIcons'
import { dateLong, nf, timeShort } from '../../../lib/format'
import '../../../styles/admin-plasma.css'
import '../../../styles/admin-shell.css'
import '../../../styles/admin-mc.css'

interface Tab { label: string; to: string }
interface Section { id: string; label: string; icon: McIconName; to: string; match: string[]; exact?: boolean; tabs?: Tab[] }

// The sidebar has the eight sections of the reference design. Pages that already exist live as tabs under them.
const SECTIONS: Section[] = [
  { id: 'command', label: 'مركز القيادة', icon: 'grid', to: '/admin', match: ['/admin'], exact: true },
  { id: 'sales', label: 'المبيعات', icon: 'chart', to: '/admin/outreach', match: ['/admin/outreach', '/admin/no-website', '/admin/pipeline', '/admin/sales-blitz'],
    tabs: [{ label: 'Outreach', to: '/admin/outreach' }, { label: 'بدون موقع', to: '/admin/no-website' }, { label: 'الصفقات', to: '/admin/pipeline' }] },
  { id: 'ai', label: 'الإيجنت AI', icon: 'bot', to: '/admin/ai', match: ['/admin/ai', '/admin/ai-settings', '/admin/ai-knowledge', '/admin/ai-test', '/admin/agents-control', '/admin/call-assistant'],
    tabs: [{ label: 'جارفيس', to: '/admin/ai' }, { label: 'الإيجنت البائع', to: '/admin/agents-control' }, { label: 'معرفة الإيجنت', to: '/admin/ai-knowledge' }, { label: 'تجربة الإيجنت', to: '/admin/ai-test' }, { label: 'مساعد المكالمات', to: '/admin/call-assistant' }, { label: 'الإعدادات', to: '/admin/ai-settings' }] },
  { id: 'campaigns', label: 'الحملات', icon: 'mega', to: '/admin/campaigns', match: ['/admin/campaigns'] },
  { id: 'customers', label: 'العملاء', icon: 'users', to: '/admin/companies', match: ['/admin/companies', '/admin/accounts', '/admin/conversations', '/admin/onboarding'],
    tabs: [{ label: 'الشركات', to: '/admin/companies' }, { label: 'الحسابات والاشتراكات', to: '/admin/accounts' }, { label: 'التجهيز والتسليم', to: '/admin/onboarding' }, { label: 'المحادثات', to: '/admin/conversations' }] },
  { id: 'ops', label: 'التشغيل', icon: 'layers', to: '/admin/ai-agents', match: ['/admin/ai-agents', '/admin/n8n', '/admin/logs', '/admin/reports'],
    tabs: [{ label: 'الوكلاء', to: '/admin/ai-agents' }, { label: 'n8n', to: '/admin/n8n' }, { label: 'السجلات', to: '/admin/logs' }, { label: 'التقارير', to: '/admin/reports' }] },
  { id: 'finance', label: 'المالية', icon: 'card', to: '/admin/finance', match: ['/admin/finance', '/admin/quotes', '/admin/expenses', '/admin/bank'],
    tabs: [{ label: 'الدفعات', to: '/admin/finance' }, { label: 'العروض والفواتير', to: '/admin/quotes' }, { label: 'المصروفات والربحية', to: '/admin/expenses' }, { label: 'إشعارات البنك', to: '/admin/bank' }] },
  { id: 'marketers', label: 'المسوّقون', icon: 'users', to: '/admin/marketers', match: ['/admin/marketers'] },
  { id: 'settings', label: 'الإعدادات', icon: 'gear', to: '/admin/settings', match: ['/admin/settings', '/admin/api'],
    tabs: [{ label: 'الإعدادات', to: '/admin/settings' }, { label: 'API والتكاملات', to: '/admin/api' }] },
]
const ALL_PAGES: { label: string; to: string; hint: string }[] = [
  { label: 'مركز القيادة', to: '/admin', hint: 'ملخص يومك' },
  ...SECTIONS.flatMap(s => (s.tabs ?? [{ label: s.label, to: s.to }]).map(t => ({ label: t.label, to: t.to, hint: s.label }))),
]
const MOBILE_TABS = ['command', 'sales', 'ai', 'finance']
const THEME_KEY = 'madar_admin_theme'
type Theme = 'dark' | 'light'
const readTheme = (): Theme => { try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' } }

const isIn = (s: Section, path: string) => (s.exact ? path === '/admin' : s.match.some(m => path === m || path.startsWith(m + '/')))

function Shell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const pulse = useAdminPulse()

  const [drawer, setDrawer] = useState(false)
  const [bell, setBell] = useState(false)
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<Theme>(readTheme)

  const section = SECTIONS.find(s => isIn(s, location.pathname)) ?? SECTIONS[0]
  const badges: Record<string, number> = { sales: pulse.due.length + pulse.meetingsToday.length }

  useEffect(() => {
    document.body.classList.add('plasma-admin')
    return () => document.body.classList.remove('plasma-admin')
  }, [])

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')) }, [])
  useEffect(() => { setDrawer(false); setBell(false); setMenu(false) }, [location.pathname])
  useEffect(() => { document.querySelector('.mc-subtabs .mc-on')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [location.pathname])

  // On phones every data table is shown as a stack of cards: each cell carries its column name.
  const contentRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = contentRef.current
    if (!root) return
    let raf = 0
    const label = () => {
      raf = 0
      root.querySelectorAll('table').forEach(table => {
        const heads = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent?.trim() ?? '')
        if (heads.length < 3) return
        if (!table.classList.contains('mc-cardtbl')) table.classList.add('mc-cardtbl')
        table.querySelectorAll('tbody tr').forEach(tr => {
          const cells = Array.from(tr.children) as HTMLTableCellElement[]
          if (cells.length === 1 || cells.some(c => c.colSpan > 1)) { if (!tr.classList.contains('mc-fullrow')) tr.classList.add('mc-fullrow'); return }
          cells.forEach((c, i) => { const h = heads[i] ?? ''; if (c.dataset.label !== h) c.dataset.label = h })
        })
      })
    }
    const obs = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(label) })
    obs.observe(root, { childList: true, subtree: true })
    label()
    return () => { obs.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
      if (e.key === 'Escape') { setPalette(false); setBell(false); setDrawer(false); setMenu(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useSystemChrome(theme === 'dark' ? '#040815' : '#eef2fb')
  useEffect(() => {
    document.body.setAttribute('data-mc-theme', theme)
    return () => document.body.removeAttribute('data-mc-theme')
  }, [theme])
  const toggleTheme = () => setTheme(t => {
    const next: Theme = t === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(THEME_KEY, next) } catch { /* storage unavailable */ }
    return next
  })

  const push = usePush()
  const [pushHidden, setPushHidden] = useState(() => { try { return localStorage.getItem('madar_push_banner') === 'hide' } catch { return false } })
  const live = useRealtimeRefetch('admin_shell', [{ table: 'integration_checks' }], () => {}, true)
  const signOut = async () => { await supabase.auth.signOut(); navigate('/admin/login') }

  const notifs = useMemo(() => {
    const list: { id: string; title: string; text: string; to: string }[] = []
    if (pulse.meetingsToday.length) {
      list.push({ id: 'm', title: `اجتماعات اليوم (${nf(pulse.meetingsToday.length)})`, to: '/admin/outreach',
        text: pulse.meetingsToday.map(m => `${m.name} ${m.meeting_at ? timeShort(m.meeting_at) : ''}`).join('، ') })
    }
    if (pulse.due.length) {
      const names = pulse.due.slice(0, 4).map(l => l.name).join('، ')
      list.push({ id: 'd', title: `متابعات اليوم (${nf(pulse.due.length)})`, to: '/admin/outreach', text: pulse.due.length > 4 ? `${names} و${nf(pulse.due.length - 4)} آخرين` : names })
    }
    if (pulse.newToday) list.push({ id: 'n', title: `${nf(pulse.newToday)} عميل أُضيف اليوم`, to: '/admin/outreach', text: `بانتظار أول تواصل: ${nf(pulse.waiting)} عميل` })
    return list
  }, [pulse])

  const name = email ? email.split('@')[0] : 'جاسم'
  const initial = (name[0] ?? 'ج').toUpperCase()
  const nav = (to: string) => { navigate(to); setDrawer(false) }

  return (
    <div className="mc-root" dir="rtl" data-mc-theme={theme}>
      <div className={`mc-app ${drawer ? 'mc-drawer-open' : ''}`}>
        <aside className="mc-sb" aria-label="القائمة الرئيسية">
          <div className="mc-logo">
            <img className="mc-logoimg" src="/logo-main.png" alt="مدار" width="48" height="36" />
            <div className="mc-t"><b>مدار</b><small>MADAR</small></div>
            <button className="mc-close" onClick={() => setDrawer(false)} aria-label="إغلاق"><McIcon name="close" size={18} /></button>
          </div>
          <nav className="mc-nav">
            {SECTIONS.map(s => (
              <button key={s.id} className={`mc-it ${s.id === section.id ? 'mc-on' : ''}`} onClick={() => nav(s.to)} aria-current={s.id === section.id ? 'page' : undefined}>
                <McIcon name={s.icon} />
                <span className="mc-lbl">{s.label}</span>
                {badges[s.id] ? <span className="mc-nb">{nf(badges[s.id])}</span> : null}
              </button>
            ))}
          </nav>
        </aside>
        <div className="mc-scrim" onClick={() => setDrawer(false)} />

        <main className="mc-main">
          <header className="mc-top">
            <button className="mc-menu" onClick={() => setDrawer(true)} aria-label="فتح القائمة"><McIcon name="menu" size={22} /></button>
            <img className="mc-barlogo" src="/logo-main.png" alt="" width="30" height="22" />
            <b className="mc-ptitle">{section.tabs?.find(t => t.to === location.pathname)?.label ?? section.label}</b>
            <div className="mc-who-wrap">
              <button className="mc-who" onClick={() => setMenu(m => !m)} aria-expanded={menu}>
                <span className="mc-av">{initial}</span>أهلاً {name}
              </button>
              {menu && (
                <>
                  <div className="mc-pop-bg" onClick={() => setMenu(false)} />
                  <div className="mc-pop"><button onClick={signOut}><McIcon name="out" size={16} />تسجيل الخروج</button></div>
                </>
              )}
            </div>
            <button className="mc-theme" onClick={toggleTheme} aria-label={theme === 'dark' ? 'تفعيل وضع النهار' : 'تفعيل الوضع الليلي'} title={theme === 'dark' ? 'وضع النهار' : 'الوضع الليلي'}>
              <McIcon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
            </button>
            <div className="mc-bell-wrap">
              <button className="mc-bell" onClick={() => setBell(v => !v)} aria-label="الإشعارات" aria-expanded={bell}>
                <McIcon name="bell" size={22} />{notifs.length > 0 && <i />}
              </button>
              {bell && (
                <>
                  <div className="mc-pop-bg" onClick={() => setBell(false)} />
                  <div className="mc-panel" role="dialog" aria-label="الإشعارات">
                    <div className="mc-panel-h">الإشعارات</div>
                    {notifs.length === 0 ? <div className="mc-empty">ما عندك شي معلّق. وقتك فاضي للعملاء الجدد.</div> : notifs.map(n => (
                      <button key={n.id} className="mc-notif" onClick={() => navigate(n.to)}><b>{n.title}</b><span>{n.text}</span></button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="mc-search" onClick={() => setPalette(true)}><McIcon name="search" size={18} /><span>البحث في العملاء، الصفقات، الحملات …</span></button>
            <div className="mc-sp" />
            <div className="mc-date">
              <span className={`mc-chip ${live ? '' : 'mc-chip-off'}`} title={live ? 'متصل بالتحديث الفوري: أي تغيير يظهر مباشرة' : 'التحديث الفوري غير متصل الآن، تتجدد الأرقام كل دقيقة'}>{live ? '● مباشر' : '○ يتجدد كل دقيقة'}</span>
              <span className="mc-sepv" />
              <span className="mc-date-t">{dateLong(new Date())}</span><McIcon name="cal" size={18} />
            </div>
          </header>

          {section.tabs && (
            <div className="mc-subtabs" role="tablist">
              {section.tabs.map(t => (
                <button key={t.to} role="tab" aria-selected={location.pathname === t.to} className={location.pathname === t.to ? 'mc-on' : ''} onClick={() => navigate(t.to)}>{t.label}</button>
              ))}
            </div>
          )}

          {!pushHidden && ['off', 'busy', 'denied', 'ios-install'].includes(push.state) && (
            <div className="mc-pushbar" role="status">
              <div className="mc-pushtxt">
                <b>فعّل إشعارات الجوال</b>
                <span>{push.state === 'ios-install'
                  ? 'على الآيفون: اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية»، وافتح اللوحة من الأيقونة، وبعدها فعّل الإشعارات.'
                  : push.state === 'denied'
                    ? 'الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح أو التطبيق ثم أعد تحميل الصفحة.'
                    : 'يوصلك تنبيه فوري عند دفعة جديدة، صفقة تتحرك، موعد متابعة، أو اجتماع بعد دقائق.'}</span>
              </div>
              {(push.state === 'off' || push.state === 'busy') && <button className="mc-btn2 p" onClick={push.enable} disabled={push.state === 'busy'}>فعّل الآن</button>}
              <button className="mc-pushx" aria-label="إخفاء" onClick={() => { setPushHidden(true); try { localStorage.setItem('madar_push_banner', 'hide') } catch { /* private mode */ } }}>×</button>
            </div>
          )}
          {push.note && push.state === 'on' && <div className="mc-banner" style={{ background: 'rgba(52,211,153,.1)', borderColor: 'rgba(52,211,153,.35)', color: 'var(--green)' }}>{push.note}</div>}

          <div className="mc-content" ref={contentRef}>{children}</div>
        </main>

        <nav className="mc-mtab" aria-label="تنقل سريع">
          {MOBILE_TABS.map(id => {
            const s = SECTIONS.find(x => x.id === id)!
            return (
              <button key={id} className={s.id === section.id ? 'mc-on' : ''} onClick={() => nav(s.to)}>
                <McIcon name={s.icon} size={21} /><span>{s.label === 'مركز القيادة' ? 'القيادة' : s.label}</span>
                {badges[id] ? <i>{nf(badges[id])}</i> : null}
              </button>
            )
          })}
          <button onClick={() => setDrawer(true)}><McIcon name="more" size={21} /><span>المزيد</span></button>
        </nav>

        {palette && <Palette onClose={() => setPalette(false)} navigate={navigate} />}
      </div>
    </div>
  )
}

/* ---------- command palette: pages and quick search in leads and companies ---------- */
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
        supabase.from('outreach_leads').select('id, name, phone').or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(5),
        supabase.from('companies').select('id, name').ilike('name', `%${safe}%`).limit(4),
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
    const pages = ALL_PAGES.filter(p => !term || p.label.toLowerCase().includes(term) || p.hint.includes(term)).map(p => ({ id: p.to, label: p.label, sub: p.hint, to: p.to }))
    return [...pages, ...found]
  }, [q, found])

  const go = (to: string) => { navigate(to); onClose() }

  return (
    <div className="pal-bg" onClick={onClose}>
      <div className="pal" role="dialog" aria-label="بحث سريع" onClick={e => e.stopPropagation()}>
        <div className="pal-input">
          <McIcon name="search" size={18} />
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
