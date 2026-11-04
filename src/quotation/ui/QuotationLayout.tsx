import { useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Package, BarChart3, Settings, Sun, Moon, LogOut, ArrowLeftRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { SHELL_CSS } from '@/dashboard/components/DashboardV2Layout'
import { TOPBAR_CSS } from '@/dashboard/components/TopBar'
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
    const c = theme === 'dark' ? '#0F0F0F' : '#FFFFFF'
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
  const title = items.find((i) => isActive(i.path))?.label ?? (location.pathname.includes('/q/') ? 'عرض سعر' : 'الرئيسية')
  const toggleTheme = () => setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, n) } catch { /* private mode */ } return n })

  let body: ReactNode = <Outlet />
  if (ws.accountLoading || status === 'loading' || status === 'idle') body = <div className="np-empty" style={{ padding: 60 }}>جارٍ التحميل…</div>
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
    <div className="dv2-scope dv2-app qt-accent" dir="rtl" data-theme={theme}>
      <style>{SHELL_CSS + TOPBAR_CSS + QT_SHELL_CSS}</style>
      <QtStyles />
      <aside className="dv2-side" aria-label="قائمة مدار Quotation">
        <div className="dv2-logo"><img src="/logo-main.png" alt="" />مدار <span className="qt-product">Quotation</span></div>
        <div className="dv2-ctx">
          <div className="dv2-ctx-txt">
            <b>{ws.isDemo ? 'شركة الأثاث المكتبي' : ws.companyName || 'شركتك'}</b>
            <small><i className="dv2-dot" />{ws.isDemo ? 'نسخة تجريبية' : 'عروض الأسعار'}</small>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 8 }}>
          {items.map((it) => (
            <button key={it.path} type="button" className={`dv2-nav${isActive(it.path) ? ' is-active' : ''}`} aria-current={isActive(it.path) ? 'page' : undefined} onClick={() => navigate(it.path)}>
              {it.icon}<span style={{ flex: 1 }}>{it.label}</span>{it.badge != null && <i className="dv2-badge">{it.badge}</i>}
            </button>
          ))}
        </nav>
        {hasVoice && (
          <button type="button" className="dv2-nav qt-switch" onClick={() => navigate(ws.isDemo ? '/demo-review' : '/dashboard')}>
            <ArrowLeftRight size={16} /><span style={{ flex: 1 }}>الانتقال إلى مدار Voice AI</span>
          </button>
        )}
      </aside>
      <div className="dv2-col">
        <header className="dv2-top">
          <div className="dv2-top-start"><div className="dv2-title"><span>{title}</span></div></div>
          <div className="dv2-top-actions">
            <button type="button" className="qt-btn ghost" onClick={toggleTheme} aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
            {!ws.isDemo && <button type="button" className="qt-btn ghost" onClick={() => ws.logout()} aria-label="تسجيل الخروج"><LogOut size={16} /></button>}
          </div>
        </header>
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

const QT_SHELL_CSS = `
  .qt-product { font-size: 11px; font-weight: 600; color: var(--violet); border: 1px solid color-mix(in srgb, var(--violet) 40%, transparent); border-radius: 999px; padding: 1px 7px; }
  .qt-switch { margin-top: auto; border: 1px dashed var(--line-2); }
  @media (max-width: 900px) { .dv2-tabbar { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
  @media print {
    .dv2-side, .dv2-top, .dv2-tabbar, .qt-no-print { display: none !important; }
    .dv2-app, .dv2-col { height: auto !important; overflow: visible !important; display: block !important; }
    .dv2-content { padding: 0 !important; max-width: none !important; }
  }
`
