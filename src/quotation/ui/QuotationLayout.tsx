import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Package, BarChart3, Settings, Sun, Moon, LogOut, ArrowLeftRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { SHELL_CSS } from '@/dashboard/components/DashboardV2Layout'
import '@/styles/dashboardV2Tokens.css'
import { initQuotation, useQt } from '../store'
import { QtStyles } from './common'
import { supabase } from '@/lib/supabase'

const THEME_KEY = 'qt_theme'

interface Item { label: string; short?: string; path: string; icon: ReactNode; badge?: number }

export function QuotationLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const ws = useWorkspace()
  const base = ws.isDemo ? '/quotation-demo' : '/quotation'
  const status = useQt((s) => s.status)
  const error = useQt((s) => s.error)
  const pendingApprovals = useQt((s) => s.approvals.filter((a) => a.status === 'pending').length)
  const needsInfo = useQt((s) => s.quotes.filter((q) => q.workState === 'needs_info').length)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
  })
  const [hasVoice, setHasVoice] = useState(false)

  useEffect(() => {
    if (ws.accountLoading) return
    void initQuotation({ demo: ws.isDemo, companyId: ws.companyId, companyName: ws.companyName, actor: ws.userName || ws.userEmail || 'عضو الفريق', isOwner: ws.isOwner, role: ws.staffRole })
  }, [ws.accountLoading, ws.isDemo, ws.companyId, ws.companyName, ws.userName, ws.userEmail, ws.isOwner, ws.staffRole])

  useEffect(() => {
    if (ws.isDemo) { setHasVoice(true); return }
    if (!ws.companyId) return
    supabase.from('companies').select('products').eq('id', ws.companyId).maybeSingle().then(({ data }) => {
      const p = (data as { products?: string[] } | null)?.products
      setHasVoice(Array.isArray(p) && p.includes('voice_ai'))
    })
  }, [ws.isDemo, ws.companyId])

  useEffect(() => {
    const prev = [document.documentElement.style.background, document.body.style.background]
    const c = theme === 'dark' ? '#070B24' : '#F3F5FA'
    document.documentElement.style.background = c; document.body.style.background = c
    return () => { document.documentElement.style.background = prev[0]; document.body.style.background = prev[1] }
  }, [theme])

  const items: Item[] = [
    { label: 'الرئيسية', path: base, icon: <LayoutDashboard size={16} />, badge: pendingApprovals + needsInfo || undefined },
    { label: 'عروض الأسعار', short: 'العروض', path: `${base}/quotes`, icon: <FileText size={16} /> },
    { label: 'العملاء', path: `${base}/customers`, icon: <Users size={16} /> },
    { label: 'المنتجات والتسعير', short: 'المنتجات', path: `${base}/products`, icon: <Package size={16} /> },
    { label: 'التحليلات', path: `${base}/analytics`, icon: <BarChart3 size={16} /> },
    { label: 'الإعدادات والفريق', short: 'الإعدادات', path: `${base}/settings`, icon: <Settings size={16} /> },
  ]
  const isActive = (p: string) => (p === base ? location.pathname === base || location.pathname === `${base}/` : location.pathname.startsWith(p))
  const toggleTheme = () => setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, n) } catch { /* private mode */ } return n })

  // Once the company's data is in, page changes (which reload the workspace account) never blank the page again.
  let body: ReactNode = <Outlet />
  if (status === 'loading' || (status === 'idle' && (ws.accountLoading || ws.companyId))) body = <Loading />
  else if (status === 'idle') body = (
    <div className="qt-card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.8 }}>{ws.accountError || 'ما لقينا شركة مربوطة بهذا الحساب. تواصل مع فريق مدار.'}</p>
    </div>
  )
  else if (status === 'not_enabled') body = (
    <div className="qt-card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>مدار Quotation غير مفعّل لشركتك</h2>
      <p style={{ color: 'var(--muted)', margin: 0, lineHeight: 1.8 }}>يفعّله فريق مدار بعد تجهيز الكتالوج والأسعار وقواعد الإصدار. تواصل مع فريق مدار لبدء التجهيز.</p>
    </div>
  )
  else if (status === 'error') body = (
    <div className="qt-card" style={{ maxWidth: 560, margin: '40px auto' }}>
      <p style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--bad)', margin: '0 0 12px' }}><AlertTriangle size={16} /> تعذر تحميل البيانات: {error}</p>
      <button type="button" className="qt-btn" onClick={() => window.location.reload()}><RefreshCw size={14} /> إعادة المحاولة</button>
    </div>
  )

  return (
    <div className="dv2-scope dv2-app qt-accent qr" dir="rtl" data-theme={theme}>
      <style>{SHELL_CSS + QR_CSS}</style>
      <QtStyles />
      <header className="qr-top">
        <div className="qr-brand">
          <img src="/logo-orbit.png" alt="" width={36} height={36} />
          <b>مدار</b>
          <span className="qr-product">Quotation</span>
        </div>
        <nav className="qr-nav" aria-label="قائمة مدار Quotation">
          {items.map((it) => (
            <button key={it.path} type="button" className={isActive(it.path) ? 'is-active' : undefined} aria-current={isActive(it.path) ? 'page' : undefined} onClick={() => navigate(it.path)}>
              {it.short || it.label}{it.badge != null && <i className="dv2-badge">{it.badge}</i>}
            </button>
          ))}
        </nav>
        <div className="qr-end">
          {hasVoice && (
            <button type="button" className="qt-btn ghost qr-wide" onClick={() => navigate(ws.isDemo ? '/demo-review' : '/dashboard')}><ArrowLeftRight size={15} /> Voice AI</button>
          )}
          <span className="qr-company qr-wide">{ws.isDemo ? 'شركة الأثاث المكتبي' : ws.companyName || 'شركتك'}</span>
          <button type="button" className="qt-btn ghost" onClick={toggleTheme} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
          {!ws.isDemo && <button type="button" className="qt-btn ghost" onClick={() => ws.logout()} aria-label="تسجيل الخروج"><LogOut size={16} /></button>}
        </div>
      </header>
      <div className="dv2-col">
        <main className="dv2-content dv2-main">{body}</main>
      </div>
      <nav className="dv2-tabbar" aria-label="التنقل">
        {items.slice(0, 5).map((it) => (
          <button key={it.path} type="button" className={isActive(it.path) ? 'is-active' : undefined} aria-current={isActive(it.path) ? 'page' : undefined} onClick={() => navigate(it.path)}>
            {it.icon}<span className="dv2-tab-label">{it.short || it.label}</span>{it.badge != null && <i className="dv2-badge">{it.badge}</i>}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Skeleton in the page's own shape, so a slow load reads as "coming" rather than "stuck". */
function Loading() {
  return (
    <div className="qr-skel" aria-busy="true" aria-label="جارٍ التحميل">
      <i style={{ height: 120 }} />
      <div><i /><i /><i /><i /></div>
      <i style={{ height: 260 }} />
    </div>
  )
}

/* "Royal blue": Madar's logo colours (electric blue, violet, silver) on deep navy. Overrides the dv2 tokens,
   so every page and shared component follows without its own colours. */
const QR_CSS = `
  .dv2-scope.qr {
    --abyss:#070B24;--side:#060920;--panel:#0D1336;--panel-2:#111944;--raise:#18215A;
    --line:#1C2554;--line-2:#29346E;
    --ink:#F2F4F8;--muted:#AEB5C6;--dim:#8F98AF;
    --sky:#5B8CFF;--royal:#1550FF;--royal-2:#2F6BFF;--violet:#9B6BFF;
    --pri-bg:#E9ECF2;--pri-fg:#0A0F2C;--pri-hover:#FFFFFF;
    --info:#AFC0FF;--info-bg:rgba(21,80,255,.18);--ai:#C9B6FF;--ai-bg:rgba(123,43,255,.20);
    --surface-input:#0A1030;--surface-inverse:#18215A;
    --topbar-bg:rgba(7,11,36,.86);--tabbar-bg:rgba(7,11,36,.96);--hover-bg:rgba(255,255,255,.04);--nav-active-bg:rgba(255,255,255,.10);
    --border-focus:#5B8CFF;
    flex-direction: column;
    background: radial-gradient(1200px 520px at 80% -10%, #16207A 0%, #070B24 60%);
  }
  .dv2-scope.qr[data-theme="light"] {
    --abyss:#F3F5FA;--panel:#FFFFFF;--panel-2:#F5F7FB;--raise:#E9EDF5;--line:#E1E5EE;--line-2:#CBD2E0;
    --ink:#0A0F2C;--muted:#4A5370;--dim:#636C86;
    --sky:#1550FF;--royal:#1550FF;--violet:#7B2BFF;
    --pri-bg:#0A0F2C;--pri-fg:#FFFFFF;--pri-hover:#16207A;
    --info:#1F3FBF;--info-bg:rgba(21,80,255,.08);--ai:#5B21B6;--ai-bg:rgba(123,43,255,.08);
    --border-focus:#1550FF;--royal-2:#2F6BFF;
    --surface-input:#FFFFFF;--surface-inverse:#171A2E;
    --topbar-bg:rgba(255,255,255,.9);--tabbar-bg:rgba(255,255,255,.96);--hover-bg:rgba(10,15,44,.04);--nav-active-bg:rgba(10,15,44,.07);
    background: #F3F5FA;
  }
  .qr .qr-top { flex: none; display: flex; align-items: center; gap: 18px; padding: 12px 32px; border-bottom: 1px solid var(--line); background: var(--topbar-bg); backdrop-filter: blur(12px); position: relative; z-index: 30; }
  .qr .qr-brand { display: flex; align-items: center; gap: 10px; flex: none; }
  .qr .qr-brand b { font-size: 17px; font-weight: 600; color: var(--ink); }
  .qr .qr-product { font-size: 11px; color: var(--muted); border: 1px solid var(--line-2); border-radius: 999px; padding: 2px 9px; }
  .qr .qr-nav { display: flex; gap: 4px; flex-wrap: wrap; min-width: 0; }
  .qr .qr-nav button { position: relative; border: 0; background: none; color: var(--muted); font: inherit; font-size: 13.5px; padding: 8px 14px; border-radius: 999px; cursor: pointer; }
  .qr .qr-nav button:hover { color: var(--ink); background: var(--hover-bg); }
  .qr .qr-nav button.is-active { color: var(--ink); background: var(--nav-active-bg); }
  .qr .qr-nav .dv2-badge { margin-inline-start: 6px; }
  .qr .qr-end { margin-inline-start: auto; display: flex; align-items: center; gap: 6px; flex: none; }
  .qr .qr-company { font-size: 13px; color: var(--muted); padding-inline: 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .qr .dv2-col { height: auto; flex: 1; min-height: 0; }
  .qr .dv2-content { margin-inline: auto; }
  .qr .np-kpi { border-radius: 18px; }
  .qr .np-seg { border-radius: 999px; padding: 3px; }
  .qr .np-seg button { border-radius: 999px; }
  .qr:not([data-theme="light"]) .qt-btn.pri { background: linear-gradient(180deg, #FFFFFF, #CDD2DC); }
  .qr .qr-skel { display: flex; flex-direction: column; gap: 16px; }
  .qr .qr-skel > div { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .qr .qr-skel i { display: block; height: 96px; border-radius: 18px; background: linear-gradient(90deg, var(--panel) 0%, var(--panel-2) 50%, var(--panel) 100%); background-size: 200% 100%; animation: qr-shine 1.4s ease-in-out infinite; }
  @keyframes qr-shine { from { background-position: 100% 0 } to { background-position: -100% 0 } }
  @media (prefers-reduced-motion: reduce) { .qr .qr-skel i { animation: none; } }
  @media (max-width: 1100px) { .qr .qr-wide { display: none; } }
  @media (max-width: 900px) {
    .qr .qr-top { padding: calc(env(safe-area-inset-top, 0px) + 8px) 14px 8px; }
    .qr .qr-nav { display: none; }
    .qr .qr-skel > div { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media print {
    .qr-top, .dv2-tabbar, .qt-no-print { display: none !important; }
    .dv2-app, .dv2-col { height: auto !important; overflow: visible !important; display: block !important; background: #fff !important; }
    .dv2-content { padding: 0 !important; max-width: none !important; }
  }
`
