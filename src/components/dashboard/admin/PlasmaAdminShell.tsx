import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import '../../../styles/admin-plasma.css'

const NAV = [
  { group: 'الرئيسية', items: [
    { id: 'overview', label: 'نظرة عامة', to: '/admin', exact: true },
    { id: 'reports', label: 'التقارير', to: '/admin/reports' },
  ]},
  { group: 'إدارة العملاء', items: [
    { id: 'cw-accounts', label: 'حسابات المغاسل 🚗', to: '/admin/cw-accounts' },
    { id: 'accounts', label: 'حسابات العيادات 🏥', to: '/admin/accounts' },
    { id: 'companies', label: 'الشركات', to: '/admin/companies', badge: 0 },
    { id: 'leads', label: 'العملاء المحتملون', to: '/admin/leads' },
    { id: 'pipeline', label: 'خط المبيعات', to: '/admin/pipeline' },
    { id: 'chats', label: 'المحادثات', to: '/admin/conversations', badge: 0 },
  ]},
  { group: 'الأتمتة والتشغيل', items: [
    { id: 'agents', label: 'وكلاء AI', to: '/admin/ai-agents' },
    { id: 'n8n', label: 'n8n Workflows', to: '/admin/n8n' },
    { id: 'logs', label: 'السجلات', to: '/admin/logs' },
  ]},
  { group: 'النظام', items: [
    { id: 'settings', label: 'الإعدادات', to: '/admin/settings' },
  ]},
]

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/admin': { title: 'نظرة عامة', sub: 'ملخّص أداء منصة مدار' },
  '/admin/reports': { title: 'التقارير', sub: 'تحليلات الأداء والإيرادات' },
  '/admin/companies': { title: 'الشركات', sub: 'إدارة حسابات العملاء والباقات' },
  '/admin/accounts': { title: 'حسابات العيادات', sub: 'تحكم باشتراكات Clinic OS وحدود الاستخدام' },
  '/admin/cw-accounts': { title: 'حسابات المغاسل', sub: 'إدارة باقات وصلاحيات Car Wash OS' },
  '/admin/leads': { title: 'العملاء المحتملون', sub: 'متابعة وتحويل الليدز' },
  '/admin/pipeline': { title: 'خط المبيعات', sub: 'لوحة المراحل البيعية' },
  '/admin/conversations': { title: 'المحادثات', sub: 'محادثات واتساب الواردة' },
  '/admin/ai-agents': { title: 'وكلاء AI', sub: 'الوكلاء الصوتيون الأذكياء' },
  '/admin/n8n': { title: 'n8n Workflows', sub: 'أتمتة العمليات' },
  '/admin/logs': { title: 'السجلات', sub: 'سجلّ كل العمليات' },
  '/admin/settings': { title: 'الإعدادات', sub: 'إعدادات النظام' },
}

const NOTIFS = [
  { id: 1, text: 'شركة جديدة سجّلت: مغسلة الوطن', time: 'منذ 5 دقائق', unread: true },
  { id: 2, text: 'تحديث n8n: Workflow الرسائل نشط', time: 'منذ 22 دقيقة', unread: true },
  { id: 3, text: 'تم تجديد اشتراك: مغسلة النخبة', time: 'منذ ساعة', unread: true },
  { id: 4, text: 'تقرير شهري جاهز للتحميل', time: 'أمس', unread: false },
]

function initParticles(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  let W = 0, H = 0
  const N = 55
  const COLORS = [
    'rgba(60,130,255,', 'rgba(40,100,230,',
    'rgba(80,160,255,', 'rgba(30,80,200,',
    'rgba(100,180,255,', 'rgba(50,60,180,'
  ]

  type Pt = { x: number; y: number; r: number; vx: number; vy: number; a: number; col: string; tw: number; ts: number }

  let pts: Pt[] = []
  let rafId = 0

  function resize() {
    W = canvas.width = window.innerWidth
    H = canvas.height = window.innerHeight
  }

  function mkPt(): Pt {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.18,
      a: Math.random() * 0.55 + 0.15,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
      tw: Math.random() * Math.PI * 2,
      ts: Math.random() * 0.006 + 0.002,
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H)
    pts.forEach(p => {
      p.tw += p.ts
      p.x += p.vx + Math.sin(p.tw) * 0.12
      p.y += p.vy + Math.cos(p.tw * 0.7) * 0.08
      if (p.x < -10) p.x = W + 10
      if (p.x > W + 10) p.x = -10
      if (p.y < -10) p.y = H + 10
      if (p.y > H + 10) p.y = -10

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
      g.addColorStop(0, p.col + p.a + ')')
      g.addColorStop(1, p.col + '0)')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.col + (p.a * 1.5).toFixed(2) + ')'
      ctx.fill()
    })

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d < 90) {
          ctx.beginPath()
          ctx.moveTo(pts[i].x, pts[i].y)
          ctx.lineTo(pts[j].x, pts[j].y)
          ctx.strokeStyle = `rgba(60,120,255,${(1 - d / 90) * 0.09})`
          ctx.lineWidth = 0.6
          ctx.stroke()
        }
      }
    }
    rafId = requestAnimationFrame(draw)
  }

  window.addEventListener('resize', resize)
  resize()
  pts = Array.from({ length: N }, mkPt)
  draw()

  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
  }
}

interface Props {
  children: ReactNode
}

export function PlasmaAdminShell({ children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showNotif, setShowNotif] = useState(false)
  const [userInitials, setUserInitials] = useState('مد')

  const meta = PAGE_META[location.pathname] ?? { title: 'مدار', sub: '' }

  useEffect(() => {
    document.body.classList.add('plasma-admin')
    return () => document.body.classList.remove('plasma-admin')
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return
    return initParticles(canvasRef.current)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? ''
      if (email) setUserInitials(email.slice(0, 2).toUpperCase())
    })
  }, [])

  function isActive(to: string, exact?: boolean) {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  const unreadCount = NOTIFS.filter(n => n.unread).length

  return (
    <div className="plasma-app" dir="rtl">
      <canvas
        ref={canvasRef}
        id="plasma-particles"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.55 }}
      />

      <div className="plasma-main">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          <div className="topbar-spacer" />
          <div className="tb-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="بحث سريع..." />
          </div>
          <div style={{ position: 'relative' }}>
            <button className="tb-icon-btn" onClick={() => setShowNotif(v => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span className="dot" />}
            </button>
            {showNotif && (
              <div className="notif-panel">
                <div className="notif-head">
                  <h3>الإشعارات</h3>
                  <button onClick={() => setShowNotif(false)} style={{ color: 'var(--ink-3)', fontSize: 12 }}>إغلاق</button>
                </div>
                {NOTIFS.map(n => (
                  <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                    {n.unread && <div className="notif-dot" />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: n.unread ? 600 : 400 }}>{n.text}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="tb-avatar">{userInitials}</div>
        </header>

        <div className="plasma-scroll">
          {children}
        </div>
      </div>

      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-logo-img" title="Madar">
            <img src="/assets/logo-madar.png" alt="مدار" onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              t.parentElement!.style.background = 'linear-gradient(150deg, oklch(0.65 0.27 252) 0%, oklch(0.36 0.24 266) 100%)'
            }} />
          </div>
          <div>
            <div className="sb-brand-name">Madar.software</div>
            <div className="sb-brand-sub">لوحة الإدارة</div>
          </div>
        </div>

        <nav className="sb-nav">
          {NAV.map(g => (
            <div className="sb-group" key={g.group}>
              <div className="sb-group-label">{g.group}</div>
              {g.items.map(item => (
                <button
                  key={item.id}
                  className={`sb-item ${isActive(item.to, 'exact' in item ? item.exact : undefined) ? 'active' : ''}`}
                  onClick={() => navigate(item.to)}
                >
                  <NavIcon id={item.id} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="sb-status">
            <span className="pulse-dot" />
            جميع الأنظمة تعمل
          </div>
          <button className="sb-logout" onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </div>
  )
}

function NavIcon({ id }: { id: string }) {
  const s = { width: 18, height: 18 }
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 as const }
  switch (id) {
    case 'overview': return <svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    case 'reports': return <svg {...s} viewBox="0 0 24 24" {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    case 'companies': return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'accounts': return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M17.5 3.5 19 5l3-3"/></svg>
    case 'cw-accounts': return <svg {...s} viewBox="0 0 24 24" {...p}><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h6l3 5v3h-9V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    case 'leads': return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'pipeline': return <svg {...s} viewBox="0 0 24 24" {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'chats': return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    case 'agents': return <svg {...s} viewBox="0 0 24 24" {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    case 'n8n': return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    case 'logs': return <svg {...s} viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    case 'settings': return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    default: return <svg {...s} viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/></svg>
  }
}
