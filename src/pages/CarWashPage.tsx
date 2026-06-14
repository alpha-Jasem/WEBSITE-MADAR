import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  BarChart3,
  Bell,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  CreditCard,
  FileText,
  Gift,
  MessageCircle,
  Menu,
  Monitor,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { openWhatsAppChat } from '../lib/whatsapp'
import { MadarAgentWidget } from '../components/dash/MadarAgentWidget'

gsap.registerPlugin(ScrollTrigger)

const adminPhone = import.meta.env.VITE_ADMIN_WHATSAPP || '966546666005'

const requestDemo = () =>
  openWhatsAppChat('مرحباً، أريد تجربة مدار OS لمغسلتي ومعرفة أفضل باقة مناسبة للتشغيل.')

// ─── tiny helpers ────────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
})

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  waiting:  { bg: '#F1F5F9', text: '#64748B', label: 'في الانتظار' },
  washing:  { bg: '#EDE9FE', text: '#7C3AED', label: 'جاري الغسيل' },
  drying:   { bg: '#FFF7ED', text: '#EA580C', label: 'التجفيف' },
  ready:    { bg: '#DCFCE7', text: '#16A34A', label: 'جاهزة' },
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false)
  const links = [
    { href: '#how', label: 'كيف يعمل' },
    { href: '#waiting-screen', label: 'شاشة الانتظار' },
    { href: '#features', label: 'المميزات' },
    { href: '#finance', label: 'المالية والتقارير' },
    { href: '#pricing', label: 'الباقات' },
    { href: '#faq', label: 'تواصل معنا' },
  ]
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(18px)', borderBottom: '1px solid #E2EBF6', boxShadow: '0 1px 12px rgba(13,27,62,0.06)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0D1B3E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={18} color="#38BDF8" />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>Madar OS</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 20 }}>مغاسل</span>
        </a>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden-mobile">
          {links.map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: 13.5, fontWeight: 500, color: '#334155', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif', transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0099CC')}
              onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
            >{l.label}</a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={requestDemo} style={{ background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>
            اطلب تجربة
          </button>
          <button onClick={() => setOpen(true)} className="show-mobile" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <Menu size={22} color="#0D1B3E" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(13,27,62,0.45)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 280, background: '#fff', padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>القائمة</span>
                <button onClick={() => setOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer' }}><X size={16} /></button>
              </div>
              {links.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                  style={{ fontSize: 15, fontWeight: 500, color: '#0D1B3E', padding: '11px 12px', borderRadius: 10, textDecoration: 'none', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}
                >{l.label}</a>
              ))}
              <button onClick={() => { setOpen(false); requestDemo() }} style={{ marginTop: 'auto', background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>
                اطلب تجربة الآن
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .hidden-mobile { display: flex; }
        .show-mobile { display: none; }
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .show-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  )
}

// ─── HERO MOCKUP ─────────────────────────────────────────────────────────────
function HeroMockup() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 460 }}>
      {/* QR card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}
        style={{ background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 8px 40px rgba(13,27,62,0.12)', border: '1px solid #E2EBF6', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 56, height: 56, background: '#0D1B3E', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={28} color="#38BDF8" />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>تسجيل ذاتي</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>امسح QR — سجّل سيارتك</div>
          </div>
          <div style={{ marginRight: 'auto', background: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>مباشر</div>
        </div>
      </motion.div>

      {/* Mini queue table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.7 }}
        style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(13,27,62,0.12)', border: '1px solid #E2EBF6', marginBottom: 12 }}>
        <div style={{ background: '#0D1B3E', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Monitor size={14} color="#38BDF8" />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>شاشة الانتظار الحية</span>
          <span style={{ marginRight: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 6px #4ADE80' }} />
        </div>
        {[
          { num: '06', car: 'كامري', status: 'waiting' },
          { num: '05', car: 'جيب',   status: 'washing' },
          { num: '04', car: 'أكورد', status: 'ready' },
        ].map(row => {
          const s = STATUS_COLORS[row.status]
          return (
            <div key={row.num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0D1B3E', width: 24, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.num}</span>
              <Car size={14} color="#64748B" />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', flexGrow: 1, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.car}</span>
              <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.text, padding: '3px 10px', borderRadius: 20, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{s.label}</span>
            </div>
          )
        })}
      </motion.div>

      {/* Revenue card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}
        style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 20, padding: '18px 20px', boxShadow: '0 8px 40px rgba(13,27,62,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, background: 'rgba(56,189,248,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircleDollarSign size={22} color="#38BDF8" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.6)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>إيراد اليوم</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>8,420 ر.س</div>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.15)', padding: '4px 10px', borderRadius: 20 }}>
          <TrendingUp size={12} color="#4ADE80" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>+12%</span>
        </div>
      </motion.div>
    </div>
  )
}

// ─── KANBAN MOCKUP ───────────────────────────────────────────────────────────
function KanbanMockup() {
  const cols = [
    { label: 'في الانتظار', color: '#64748B', bg: '#F8FAFC', cards: [{ car: 'كامري', plate: 'أ ب ج 1234', service: 'داخلي وخارجي', time: '5 د' }] },
    { label: 'جاري الغسيل', color: '#7C3AED', bg: '#FAF5FF', cards: [{ car: 'جيب', plate: 'د هـ و 5678', service: 'بخار', time: '18 د' }, { car: 'باترول', plate: 'ز ح ط 9012', service: 'خارجي', time: '12 د' }] },
    { label: 'التجفيف', color: '#EA580C', bg: '#FFF7ED', cards: [{ car: 'أكورد', plate: 'ي ك ل 3456', service: 'تلميع', time: '7 د' }] },
    { label: 'المراجعة', color: '#0099CC', bg: '#F0F9FF', cards: [] },
    { label: 'جاهزة', color: '#16A34A', bg: '#F0FDF4', cards: [{ car: 'إلنترا', plate: 'م ن س 7890', service: 'داخلي', time: 'الآن' }] },
  ]
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 10, minWidth: 700 }}>
        {cols.map(col => (
          <div key={col.label} style={{ flex: 1, minWidth: 130, background: col.bg, borderRadius: 14, padding: 10, border: `1px solid ${col.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: col.color, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{col.label}</span>
              <span style={{ marginRight: 'auto', fontSize: 10, fontWeight: 700, color: col.color, background: `${col.color}18`, borderRadius: 20, padding: '1px 7px' }}>{col.cards.length}</span>
            </div>
            {col.cards.map(card => (
              <div key={card.plate} style={{ background: '#fff', borderRadius: 10, padding: '9px 10px', marginBottom: 6, border: '1px solid #E2EBF6', boxShadow: '0 1px 4px rgba(13,27,62,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{card.car}</div>
                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Sans Arabic, sans-serif', marginTop: 2 }}>{card.plate}</div>
                <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Sans Arabic, sans-serif', marginTop: 2 }}>{card.service}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <Clock size={9} color="#94A3B8" />
                  <span style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{card.time}</span>
                </div>
              </div>
            ))}
            {col.cards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 10, color: '#CBD5E1', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>فارغ</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── WAITING SCREEN MOCKUP ───────────────────────────────────────────────────
function WaitingScreenMockup() {
  const rows = [
    { num: '07', car: 'كامري',  service: 'داخلي وخارجي', status: 'waiting', time: '28 دقيقة' },
    { num: '06', car: 'جيب',    service: 'بخار',          status: 'washing', time: '18 دقيقة' },
    { num: '05', car: 'أكورد',  service: 'خارجي',         status: 'drying',  time: '9 دقائق' },
    { num: '04', car: 'إلنترا', service: 'تلميع سريع',    status: 'ready',   time: 'الآن' },
  ]
  return (
    <div style={{ background: '#0D1B3E', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(13,27,62,0.25)' }}>
      {/* Header bar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>شاشة الانتظار — مغسلة نايف</span>
        <span style={{ marginRight: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>مباشر الآن</span>
      </div>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 120px 100px', gap: 0, padding: '10px 20px', background: 'rgba(255,255,255,0.04)' }}>
        {['#', 'السيارة', 'الخدمة', 'الحالة', 'الوقت'].map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => {
        const s = STATUS_COLORS[row.status]
        return (
          <div key={row.num} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 1fr 120px 100px', gap: 0, padding: '13px 20px', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#38BDF8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.num}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.car}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.service}</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.text, padding: '4px 12px', borderRadius: 20, display: 'inline-block', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{s.label}</span>
            <span style={{ fontSize: 13, color: row.status === 'ready' ? '#4ADE80' : 'rgba(255,255,255,0.5)', fontWeight: row.status === 'ready' ? 700 : 400, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{row.time}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── FINANCE CARDS MOCKUP ─────────────────────────────────────────────────────
function FinanceMockup() {
  const cards = [
    { label: 'دخل اليوم',      value: '8,420',  unit: 'ر.س', color: '#0099CC', icon: CircleDollarSign },
    { label: 'عدد السيارات',   value: '64',     unit: 'سيارة', color: '#7C3AED', icon: Car },
    { label: 'متوسط الفاتورة', value: '131',    unit: 'ر.س', color: '#EA580C', icon: ReceiptText },
    { label: 'كاش',            value: '3,200',  unit: 'ر.س', color: '#16A34A', icon: Wallet },
    { label: 'مدى',            value: '4,100',  unit: 'ر.س', color: '#0099CC', icon: CreditCard },
    { label: 'تحويل',          value: '1,120',  unit: 'ر.س', color: '#64748B', icon: TrendingUp },
    { label: 'مصاريف',         value: '980',    unit: 'ر.س', color: '#EF4444', icon: FileText },
    { label: 'VAT',            value: '1,054',  unit: 'ر.س', color: '#F59E0B', icon: ShieldCheck },
    { label: 'صافي الربح',     value: '6,386',  unit: 'ر.س', color: '#16A34A', icon: Star },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', border: '1px solid #E2EBF6', boxShadow: '0 2px 8px rgba(13,27,62,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <c.icon size={14} color={c.color} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{c.label}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{c.value} <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{c.unit}</span></div>
        </div>
      ))}
    </div>
  )
}

// ─── LOYALTY CARD MOCKUP ─────────────────────────────────────────────────────
function LoyaltyCard() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 20, padding: '24px', boxShadow: '0 16px 48px rgba(13,27,62,0.25)', maxWidth: 340, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Gift size={22} color="#38BDF8" />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>بطاقة الولاء</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>محمد العتيبي</div>
        </div>
        <div style={{ marginRight: 'auto', background: 'rgba(74,222,128,0.15)', borderRadius: 20, padding: '4px 10px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>عميل متكرر</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الزيارات</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>4 / 5</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '80%', background: 'linear-gradient(90deg, #38BDF8, #0099CC)', borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{ flex: 1, height: 32, background: 'rgba(56,189,248,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={14} color="#38BDF8" />
          </div>
        ))}
        <div style={{ flex: 1, height: 32, background: 'rgba(255,255,255,0.08)', borderRadius: 8, border: '1.5px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={14} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
      <div style={{ marginTop: 14, background: 'rgba(74,222,128,0.1)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(74,222,128,0.2)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#4ADE80', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>الغسلة القادمة عليها مكافأة ⭐</span>
      </div>
    </div>
  )
}

// ─── FAQ ITEM ────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 14, border: '1px solid #E2EBF6', background: '#fff', overflow: 'hidden', boxShadow: '0 1px 4px rgba(13,27,62,0.04)' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', background: 'none', border: 'none', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'right' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif', textAlign: 'right', flex: 1 }}>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ marginRight: 12, flexShrink: 0, color: '#0099CC' }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div style={{ padding: '0 20px 18px', fontSize: 14, lineHeight: 1.8, color: '#475569', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────────────
const S = ({ id, bg = '#fff', children }: { id?: string; bg?: string; children: React.ReactNode }) => (
  <section id={id} style={{ background: bg, padding: '80px 0' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>{children}</div>
  </section>
)

const SectionLabel = ({ text }: { text: string }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0099CC' }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: '#0099CC', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{text}</span>
  </div>
)

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#0D1B3E', lineHeight: 1.25, margin: '0 0 16px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{children}</h2>
)

const Sub = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 16, lineHeight: 1.8, color: '#475569', fontFamily: 'IBM Plex Sans Arabic, sans-serif', margin: 0 }}>{children}</p>
)

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export const CarWashPage = () => {
  const heroImageRef = useRef<HTMLImageElement | null>(null)
  const [lead, setLead] = useState({ name: '', phone: '', business: '', city: '' })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    gsap.fromTo(heroImageRef.current, { autoAlpha: 0.92 }, { autoAlpha: 1, duration: 1.2, ease: 'power3.out' })
    gsap.from('.hero-copy > *', { y: 34, autoAlpha: 0, duration: 0.85, stagger: 0.12, ease: 'power3.out', delay: 0.15 })
    gsap.from('.hero-pulse', { scale: 0.7, autoAlpha: 0, duration: 1, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  }, [])

  const submitLead = async (event: FormEvent) => {
    event.preventDefault()
    if (!lead.name.trim() || !lead.phone.trim()) return
    setSending(true)
    setFormError('')
    try {
      const { error } = await supabase.from('leads').insert([{
        name: lead.name.trim(),
        phone: lead.phone.trim(),
        email: '',
        service: 'madar_os_car_wash_demo',
        message: `النشاط: ${lead.business || 'مغسلة سيارات'} | المدينة: ${lead.city || 'غير محددة'} | طلب تجربة مدار OS`,
        source: 'website',
        status: 'new',
      }])
      if (error) throw error
      setDone(true)
      setLead({ name: '', phone: '', business: '', city: '' })
    } catch {
      setFormError('حدث خطأ، تواصل معنا مباشرة عبر واتساب.')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#F8FAFC', border: '1.5px solid #E2EBF6', borderRadius: 12,
    padding: '13px 16px', fontSize: 14, color: '#0D1B3E', outline: 'none',
    fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif', transition: 'border-color .2s',
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'IBM Plex Sans Arabic, Tajawal, Cairo, sans-serif' }}>
      <Navbar />

      {/* ── 1. HERO ── */}
      <section className="relative min-h-[760px] overflow-hidden bg-white sm:min-h-[820px] lg:min-h-0">
        <img
          ref={heroImageRef}
          src="/madar-carwash-hero-real.png"
          alt="Madar OS car wash hero"
          className="absolute inset-0 h-full w-full object-cover object-[35%_center] lg:static lg:block lg:h-auto lg:object-contain"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.66)_34%,rgba(255,255,255,0.18)_66%,rgba(255,255,255,0.02)_100%)] sm:bg-[linear-gradient(270deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.90)_24%,rgba(255,255,255,0.48)_45%,rgba(255,255,255,0.04)_68%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/70 to-transparent" />
        <div className="hero-pulse absolute bottom-[24%] left-[26%] hidden h-20 w-20 rounded-full border-2 border-[#00BFFF]/70 bg-[#00BFFF]/10 shadow-[0_0_55px_rgba(0,191,255,0.55)] lg:block" />

        <div className="absolute inset-0 z-10 mx-auto flex max-w-7xl items-start justify-start px-4 pt-24 sm:items-start sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
          <div className="hero-copy w-full max-w-[560px] text-[#0D1B3E]">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3.5 py-2 text-xs font-black text-[#0D1B3E] shadow-sm backdrop-blur-xl sm:px-5 sm:py-2.5 sm:text-sm" style={{ fontFamily: 'IBM Plex Sans Arabic, Cairo, sans-serif' }}>
              <span className="h-2 w-2 rounded-full bg-[#00BFFF]" />
              نظام تشغيل ذكي للمغاسل
            </div>
            <h1 className="mt-5 text-[2rem] font-black leading-[1.08] tracking-normal drop-shadow-[0_2px_0_rgba(255,255,255,0.85)] sm:mt-7 sm:text-6xl lg:text-7xl" style={{ fontFamily: 'IBM Plex Sans Arabic, Cairo, sans-serif' }}>
              إدارة أسهل.
              <span className="block text-[#008FE8]">تشغيل أذكى.</span>
            </h1>
            <p className="mt-3 max-w-[300px] rounded-xl border border-white/50 bg-white/50 px-3 py-2.5 text-[13px] font-bold leading-6 text-slate-800 shadow-sm backdrop-blur-md sm:mt-5 sm:max-w-xl sm:rounded-2xl sm:bg-white/75 sm:px-5 sm:py-4 sm:text-xl sm:leading-8" style={{ fontFamily: 'IBM Plex Sans Arabic, Tajawal, sans-serif' }}>
              منصة متكاملة لإدارة عمليات المغسلة — من استقبال السيارة وتتبع مراحل الخدمة، إلى الفوترة والتقارير المالية وتجربة العميل.
            </p>
            <div className="mt-5 flex flex-col items-start gap-2.5 sm:mt-7 sm:flex-row sm:items-center sm:gap-3">
              <Link
                to="/trial"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00BFFF] px-4 py-3 text-sm font-black text-[#071322] shadow-[0_14px_32px_rgba(0,191,255,0.30)] sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base sm:shadow-[0_18px_45px_rgba(0,191,255,0.36)]"
                style={{ fontFamily: 'IBM Plex Sans Arabic, Cairo, sans-serif' }}
              >
                ابدأ تجربة 3 أيام
                <ChevronLeft size={18} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white/80 px-4 py-3 text-sm font-black text-[#0D1B3E] shadow-sm backdrop-blur-xl sm:rounded-2xl sm:px-6 sm:py-4 sm:text-base"
                style={{ fontFamily: 'IBM Plex Sans Arabic, Cairo, sans-serif' }}
              >
                شاهد الديمو الحي
                <Monitor size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PAIN ── */}
      <S bg="#FAFCFF">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel text="المشاكل اليومية" />
          <H2>كل يوم في المغسلة نفس المشاكل</H2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: MessageCircle, title: 'العميل يسأل كل شوي', text: 'متى تخلص السيارة؟ كم باقي؟ وين وصلت؟ أسئلة تتكرر وتضغط على الموظفين.', color: '#EF4444' },
            { icon: Car, title: 'ترتيب الدور يضيع', text: 'مع الزحمة، السيارات تدخل وتطلع بدون وضوح، والعميل يحس أن الدور غير منظم.', color: '#F59E0B' },
            { icon: Users, title: 'الموظف ينسى الحالة', text: 'سيارة في الانتظار، سيارة تحت الغسيل، سيارة جاهزة… بدون نظام واضح تبدأ اللخبطة.', color: '#8B5CF6' },
            { icon: Wallet, title: 'الكاش ما يطابق', text: 'آخر اليوم تبدأ الأسئلة: كم دخلنا؟ كم مصروف؟ كم مدى؟ كم كاش؟', color: '#EF4444' },
            { icon: TrendingUp, title: 'فرص البيع تضيع', text: 'تلميع، تعطير، غسيل داخلي، اشتراكات… إضافات ممكن ترفع الفاتورة لكنها لا تُعرض بذكاء.', color: '#0099CC' },
            { icon: Star, title: 'العميل ما يرجع', text: 'بدون ولاء وتذكير وتجربة مرتبة، العميل يزورك مرة وينسى يرجع.', color: '#16A34A' },
          ].map(({ icon: Icon, title, text, color }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.06)}
              style={{ background: '#fff', borderRadius: 16, padding: '22px 20px', border: '1px solid #E2EBF6', boxShadow: '0 2px 8px rgba(13,27,62,0.05)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Icon size={20} color={color} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D1B3E', margin: '0 0 8px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.8, color: '#64748B', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{text}</p>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.4)} style={{ marginTop: 40, background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            مدار OS يحول هذه الفوضى إلى مسار واضح من أول مسحة QR إلى استلام السيارة.
          </p>
        </motion.div>
      </S>

      {/* ── 3. HOW IT WORKS ── */}
      <S id="how" bg="#fff">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel text="آلية العمل" />
          <H2>كيف يعمل النظام؟</H2>
          <Sub>٤ خطوات بسيطة تحول مغسلتك من فوضى إلى تشغيل احترافي.</Sub>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 40 }}>
          {[
            { icon: QrCode, num: '01', title: 'العميل يمسح QR', text: 'يدخل من جواله بدون تطبيق وبدون انتظار موظف.' },
            { icon: Car, num: '02', title: 'يسجل السيارة والخدمة', text: 'الاسم، رقم الجوال، اللوحة، نوع السيارة، والخدمة المطلوبة.' },
            { icon: Monitor, num: '03', title: 'السيارة تظهر على الشاشة', text: 'تظهر مباشرة في شاشة الانتظار ولوحة التشغيل الداخلية.' },
            { icon: Bell, num: '04', title: 'يوصله تنبيه عند الجاهزية', text: 'عند تغيير الحالة إلى جاهزة، يتم إرسال إشعار للعميل.' },
          ].map(({ icon: Icon, num, title, text }, i) => (
            <motion.div key={num} {...fadeUp(i * 0.08)}
              style={{ background: '#F8FAFC', borderRadius: 16, padding: '24px 20px', border: '1px solid #E2EBF6', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 16, left: 16, fontSize: 13, fontWeight: 700, color: '#0099CC', background: '#EFF6FF', borderRadius: 20, padding: '3px 10px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{num}</div>
              <div style={{ width: 48, height: 48, background: '#0D1B3E', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Icon size={22} color="#38BDF8" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D1B3E', margin: '0 0 8px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.8, color: '#64748B', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{text}</p>
            </motion.div>
          ))}
        </div>
        {/* Flow bar */}
        <motion.div {...fadeUp(0.3)} style={{ background: '#F0F7FF', borderRadius: 14, padding: '16px 20px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 560, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['QR', 'تسجيل السيارة', 'في الانتظار', 'جاري الغسيل', 'التجفيف', 'المراجعة', 'جاهزة'].map((step, i, arr) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === arr.length - 1 ? '#16A34A' : '#0099CC', background: i === arr.length - 1 ? '#DCFCE7' : '#DBEAFE', borderRadius: 20, padding: '5px 12px', fontFamily: 'IBM Plex Sans Arabic, sans-serif', whiteSpace: 'nowrap' }}>{step}</span>
                {i < arr.length - 1 && <ChevronLeft size={14} color="#94A3B8" />}
              </div>
            ))}
          </div>
        </motion.div>
      </S>

      {/* ── 4. LIVE WAITING SCREEN ── */}
      <S id="waiting-screen" bg="#F0F7FF">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel text="شاشة الانتظار" />
          <H2>شاشة انتظار تريح العميل والموظف</H2>
          <Sub>بدل ما يسأل العميل كل شوي، يشوف دوره وحالة سيارته مباشرة على الشاشة.</Sub>
        </motion.div>
        <motion.div {...fadeUp(0.1)}>
          <WaitingScreenMockup />
        </motion.div>
        <motion.div {...fadeUp(0.2)} style={{ marginTop: 24, background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #E2EBF6', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0D1B3E', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            النتيجة: عميل أهدأ، موظف أقل ضغط، وتجربة احترافية تشبه الشركات الكبرى.
          </p>
        </motion.div>
      </S>

      {/* ── 5. OPERATIONS DASHBOARD ── */}
      <S id="features" bg="#fff">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'start' }}>
          <div>
            <motion.div {...fadeUp()}>
              <SectionLabel text="لوحة التشغيل" />
              <H2>لوحة تشغيل تعرفك ماذا يحدث الآن</H2>
              <Sub>لوحة Kanban تعرض كل سيارة وحالتها وموظفها في الوقت الفعلي — بدون اتصالات وبدون لخبطة.</Sub>
            </motion.div>
            <motion.div {...fadeUp(0.1)} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'عرض حالة كل سيارة بالوقت الفعلي',
                'تغيير الحالة بضغطة زر للموظف',
                'إشعار فوري للعميل عند الجاهزية',
                'عدد السيارات في كل مرحلة',
                'تتبع موظف كل سيارة',
                'تنبيه عند تأخير السيارة',
                'ربط مع الفاتورة والمالية',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, background: '#DCFCE7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={13} color="#16A34A" />
                  </div>
                  <span style={{ fontSize: 14, color: '#334155', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{f}</span>
                </div>
              ))}
            </motion.div>
          </div>
          <motion.div {...fadeUp(0.15)}>
            <div style={{ background: '#F8FAFC', borderRadius: 20, padding: 16, border: '1px solid #E2EBF6' }}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={14} color="#0099CC" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>لوحة تشغيل السيارات</span>
              </div>
              <KanbanMockup />
            </div>
          </motion.div>
        </div>
      </S>

      {/* ── 6. WHATSAPP NOTIFICATION ── */}
      <S bg="#0D1B3E">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center' }}>
          <motion.div {...fadeUp()}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.1)', borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>
              <MessageCircle size={12} color="#38BDF8" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>واتساب تلقائي</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: '0 0 16px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              السيارة جاهزة؟<br />العميل يعرف فورًا
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.6)', marginBottom: 28, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              بمجرد ما الموظف يضغط "جاهز"، يتم إرسال واتساب للعميل تلقائياً — بدون مكالمة، بدون صوت عالٍ، بدون ازدحام الاستقبال.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['إشعار فوري', 'فاتورة PDF', 'تذكير بعد ٣ أيام', 'طلب تقييم Google'].map(c => (
                <span key={c} style={{ fontSize: 12, fontWeight: 600, color: '#38BDF8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 20, padding: '5px 14px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{c}</span>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            {/* WhatsApp mockup */}
            <div style={{ background: '#0B141A', borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
              <div style={{ background: '#1F2C34', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>مغسلة نايف</div>
                  <div style={{ fontSize: 11, color: '#8E9EA8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>متصل الآن</div>
                </div>
              </div>
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
                <div style={{ background: '#1F2C34', borderRadius: '12px 12px 12px 4px', padding: '12px 14px', maxWidth: '85%', alignSelf: 'flex-start' }}>
                  <p style={{ fontSize: 14, color: '#fff', margin: '0 0 6px', lineHeight: 1.6, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    مرحبًا، سيارتك جاهزة للاستلام. شكرًا لاختيارك مغسلتنا.
                  </p>
                  <p style={{ fontSize: 10, color: '#8E9EA8', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>10:42 ص ✓✓</p>
                </div>
                <div style={{ background: '#1F2C34', borderRadius: '12px 12px 12px 4px', padding: '12px 14px', maxWidth: '85%', alignSelf: 'flex-start' }}>
                  <p style={{ fontSize: 14, color: '#fff', margin: '0 0 6px', lineHeight: 1.6, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                    فاتورتك: 115 ر.س (شامل VAT). لأي استفسار نحن هنا.
                  </p>
                  <div style={{ background: '#0D1B3E', borderRadius: 8, padding: '8px 12px', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color="#38BDF8" />
                    <span style={{ fontSize: 12, color: '#38BDF8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>invoice-2026-06-14.pdf</span>
                  </div>
                  <p style={{ fontSize: 10, color: '#8E9EA8', margin: '6px 0 0', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>10:42 ص ✓✓</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </S>

      {/* ── 7. UPSELL ── */}
      <S bg="#FAFCFF">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel text="رفع قيمة الفاتورة" />
          <H2>ارفع قيمة الفاتورة من نفس التسجيل</H2>
          <Sub>كل عميل يدخل للتسجيل فرصة بيع إضافية.</Sub>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            { name: 'تعطير', price: '+10', color: '#8B5CF6' },
            { name: 'تلميع داخلي', price: '+25', color: '#0099CC' },
            { name: 'تنظيف مكينة', price: '+40', color: '#EA580C' },
            { name: 'غسيل بخار', price: '+60', color: '#16A34A' },
            { name: 'اشتراك شهري', price: 'عرض', color: '#EF4444' },
          ].map(({ name, price, color }, i) => (
            <motion.div key={name} {...fadeUp(i * 0.06)}
              style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', border: '1px solid #E2EBF6', textAlign: 'center', boxShadow: '0 2px 8px rgba(13,27,62,0.04)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'IBM Plex Sans Arabic, sans-serif', marginBottom: 6 }}>{price} ر.س</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{name}</div>
              <div style={{ marginTop: 10, height: 3, borderRadius: 2, background: `${color}22` }}>
                <div style={{ height: '100%', width: '100%', background: color, borderRadius: 2, opacity: 0.4 }} />
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.35)} style={{ marginTop: 28, background: '#EFF6FF', borderRadius: 14, padding: '16px 20px', textAlign: 'center', border: '1px solid #BFDBFE' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1D4ED8', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            الإضافات تظهر للعميل لحظة التسجيل — يختار بنفسه، الفاتورة ترتفع بدون ضغط على الموظف.
          </p>
        </motion.div>
      </S>

      {/* ── 8. LOYALTY ── */}
      <S bg="#fff">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center' }}>
          <motion.div {...fadeUp()}>
            <SectionLabel text="برنامج الولاء" />
            <H2>خلي العميل يرجع بدل ما يروح لمغسلة ثانية</H2>
            <Sub>نظام ولاء تلقائي يتتبع زيارات كل عميل ويرسل مكافأة عند الزيارة الخامسة — بدون دفاتر وبدون متابعة يدوية.</Sub>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'تتبع تلقائي لكل زيارة',
                'مكافأة عند اكتمال ٥ زيارات',
                'رسالة واتساب تلقائية للعميل المتكرر',
                'معرفة أكثر عميل وفاءً لمغسلتك',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Gift size={16} color="#0099CC" />
                  <span style={{ fontSize: 14, color: '#334155', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <LoyaltyCard />
          </motion.div>
        </div>
      </S>

      {/* ── 9. FINANCE & VAT ── */}
      <S id="finance" bg="#F0F7FF">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel text="المالية اليومية" />
          <H2>اعرف دخل اليوم بدون تخمين</H2>
          <Sub>بدل ما تنتظر نهاية اليوم وتراجع الورق، شوف أرقامك مباشرة.</Sub>
        </motion.div>
        <motion.div {...fadeUp(0.1)}>
          <FinanceMockup />
        </motion.div>
        <motion.div {...fadeUp(0.25)} style={{ marginTop: 24, background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            VAT محسوبة تلقائياً على كل فاتورة — جاهزة لإغلاق اليوم والتقارير الضريبية.
          </p>
        </motion.div>
      </S>

      {/* ── 10. REPORTS ── */}
      <S bg="#fff">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'start' }}>
          <motion.div {...fadeUp()}>
            <SectionLabel text="التقارير" />
            <H2>تقارير تعرفك أين تزيد وأين تخسر</H2>
            <Sub>تقارير يومية وأسبوعية وشهرية تكشف فرص التحسين ومواطن الخسارة.</Sub>
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { icon: BarChart3, label: 'إيراد يومي وشهري' },
                { icon: Car, label: 'عدد السيارات لكل خدمة' },
                { icon: Users, label: 'أداء الموظفين' },
                { icon: Clock, label: 'متوسط وقت الخدمة' },
                { icon: TrendingUp, label: 'أكثر الخدمات مبيعاً' },
                { icon: CreditCard, label: 'توزيع طرق الدفع' },
                { icon: Star, label: 'تقييمات العملاء' },
                { icon: Zap, label: 'أوقات الذروة' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', border: '1px solid #E2EBF6' }}>
                  <Icon size={15} color="#0099CC" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <div style={{ background: '#F8FAFC', borderRadius: 20, padding: 20, border: '1px solid #E2EBF6' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D1B3E', margin: '0 0 16px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>رؤى تلقائية من بياناتك</h3>
              {[
                { label: 'أكثر وقت زحمة', value: '6 مساءً', icon: Clock, color: '#EF4444' },
                { label: 'أكثر خدمة مبيعاً', value: 'داخلي وخارجي', icon: Car, color: '#0099CC' },
                { label: 'متوسط وقت الغسيل', value: '24 دقيقة', icon: Zap, color: '#16A34A' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: '1px solid #E2EBF6' }}>
                  <div style={{ width: 36, height: 36, background: `${color}12`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{value}</div>
                  </div>
                </div>
              ))}
              {/* Mini bar chart */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>إيراد الأسبوع</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
                  {[45, 60, 38, 72, 55, 80, 48].map((h, i) => (
                    <div key={i} style={{ flex: 1, background: i === 5 ? '#0099CC' : '#BFDBFE', borderRadius: '4px 4px 0 0', height: `${h}%` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  {['أحد', 'إثن', 'ثلث', 'أرب', 'خمس', 'جمع', 'سبت'].map(d => (
                    <div key={d} style={{ flex: 1, fontSize: 9, color: '#94A3B8', textAlign: 'center', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{d}</div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </S>

      {/* ── 11. OWNER OUTCOMES ── */}
      <S bg="#F0F7FF">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 40 }}>
          <SectionLabel text="ما يكسبه صاحب المغسلة" />
          <H2>ماذا يكسب صاحب المغسلة؟</H2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {[
            { icon: Clock, title: 'وقت أقل في الاستقبال', text: 'QR يستبدل الموظف في التسجيل — فريقك يشتغل بدل ما يتكلم.' },
            { icon: CircleDollarSign, title: 'إيراد أعلى لكل سيارة', text: 'الإضافات تُعرض تلقائياً — الفاتورة ترتفع بدون ضغط.' },
            { icon: Users, title: 'عملاء يرجعون', text: 'الولاء والتذكير يجيب العميل القديم بدون تكلفة إعلان.' },
            { icon: BarChart3, title: 'أرقام واضحة كل يوم', text: 'إيراد اليوم، VAT، وصافي الربح — بدون حسابات يدوية.' },
            { icon: ShieldCheck, title: 'ثقة بالموظف', text: 'كل عملية موثقة — تعرف من فعل ماذا ومتى.' },
            { icon: TrendingUp, title: 'قرارات بناءً على بيانات', text: 'اعرف أفضل وقت، أكثر خدمة، وأكثر موظف إنتاجاً.' },
            { icon: Zap, title: 'تشغيل أسرع', text: 'الانتظار ينخفض، الإنتاجية ترتفع، وتسلّم أكثر يومياً.' },
            { icon: Star, title: 'سمعة أفضل', text: 'تجربة منظمة تنتج تقييمات Google أعلى بدون طلب.' },
          ].map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} {...fadeUp(i * 0.05)}
              style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #E2EBF6', boxShadow: '0 2px 8px rgba(13,27,62,0.04)' }}>
              <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} color="#0099CC" />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0D1B3E', margin: '0 0 6px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#64748B', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{text}</p>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.45)} style={{ marginTop: 32, background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 16, padding: '20px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            النظام لا يضيف شاشة فقط، النظام ينظم التشغيل ويرفع قيمة كل زيارة.
          </p>
        </motion.div>
      </S>

      {/* ── 12. PRICING ── */}
      <S id="pricing" bg="#fff">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', marginBottom: 48 }}>
          <SectionLabel text="الباقات" />
          <H2>باقات واضحة لمغسلتك</H2>
          <Sub>اختر الباقة المناسبة وابدأ تشغيل مغسلتك خلال 24 ساعة.</Sub>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
          {[
            {
              name: 'Starter',
              price: '299',
              period: 'ر.س / شهر',
              desc: 'للمغسلة الصغيرة التي تريد البداية بالأساسيات.',
              recommended: false,
              features: ['QR للتسجيل الذاتي', 'شاشة انتظار مباشرة', 'لوحة تشغيل الموظف', 'سجل العملاء الأساسي', 'إيراد يومي بسيط', 'دعم واتساب', 'تقرير أسبوعي'],
            },
            {
              name: 'Pro',
              price: '500',
              period: 'ر.س / شهر',
              desc: 'للمغسلة الجادة: QR، شاشة عرض، عملاء، مالية، تقارير، وواتساب تلقائي.',
              recommended: true,
              features: ['كل مزايا Starter', 'واتساب تلقائي بالكامل', 'فاتورة PDF تلقائية', 'برنامج الولاء', 'إضافات البيع الذكي', 'VAT وإغلاق اليوم', 'تقارير متقدمة', 'تحليل أداء الموظفين', 'مساعد مدار AI', 'دعم أولوية', 'تجربة 3 أيام مجانية', 'إعداد كامل'],
            },
            {
              name: 'Premium',
              price: '1,000',
              period: 'ر.س / شهر',
              desc: 'لفرع أو أكثر — إعداد مخصص وتوسعة كاملة.',
              recommended: false,
              features: ['كل مزايا Pro', 'دعم متعدد الفروع', 'تقارير مقارنة بين الفروع', 'مدير حساب مخصص', 'إعداد وتشغيل مخصص', 'تكاملات إضافية', 'سرعة أولوية قصوى', 'تدريب الفريق', 'حسب احتياجك', 'اتصل للتفاصيل', 'عرض سعر خاص', 'دعم 7 أيام'],
            },
          ].map((plan, i) => (
            <motion.div key={plan.name} {...fadeUp(i * 0.08)}
              style={{ borderRadius: 20, border: plan.recommended ? '2px solid #0099CC' : '1.5px solid #E2EBF6', background: plan.recommended ? '#F0F9FF' : '#fff', padding: '28px 24px', position: 'relative', boxShadow: plan.recommended ? '0 8px 32px rgba(0,153,204,0.12)' : '0 2px 8px rgba(13,27,62,0.04)' }}>
              {plan.recommended && (
                <div style={{ position: 'absolute', top: -14, right: 24, background: '#0099CC', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                  الأكثر طلباً
                </div>
              )}
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0D1B3E', marginBottom: 4, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{plan.name}</div>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, margin: '0 0 20px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{plan.desc}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#0D1B3E', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: '#64748B', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{plan.period}</span>
              </div>
              <button onClick={requestDemo} style={{ width: '100%', borderRadius: 12, padding: '13px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif', border: 'none', background: plan.recommended ? '#0D1B3E' : '#F1F5F9', color: plan.recommended ? '#fff' : '#0D1B3E', marginBottom: 20 }}>
                اطلب {plan.name} على واتساب
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Check size={14} color="#16A34A" />
                    <span style={{ fontSize: 13, color: '#334155', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </S>

      {/* ── 13. CTA SECTION ── */}
      <S bg="#0D1B3E">
        <motion.div {...fadeUp()} style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 16px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            جاهز تنقل مغسلتك من الفوضى إلى التشغيل الذكي؟
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)', marginBottom: 32, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
            ابدأ تجربة 3 أيام مجانية — نجهز لك الحساب، نشرح النظام، ونكون معك من أول يوم.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={requestDemo} style={{ background: '#38BDF8', color: '#0D1B3E', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif', boxShadow: '0 8px 24px rgba(56,189,248,0.3)' }}>
              اطلب تجربة الآن
            </button>
            <button onClick={requestDemo} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageCircle size={18} />
              تواصل عبر واتساب
            </button>
          </div>
        </motion.div>
      </S>

      {/* ── 14. FAQ + CONTACT ── */}
      <S id="faq" bg="#FAFCFF">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'start' }}>
          <motion.div {...fadeUp()}>
            <SectionLabel text="الأسئلة الشائعة" />
            <H2>الأسئلة الشائعة</H2>
            <Sub>كل ما يحتاجه صاحب المغسلة قبل البدء.</Sub>
            <div style={{ marginTop: 28, background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A6E 100%)', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 12px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>سؤال ما لقيت إجابته؟</p>
              <button onClick={requestDemo} style={{ background: '#38BDF8', color: '#0D1B3E', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
                تواصل معنا الآن
              </button>
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.1)} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { q: 'ماذا أستلم عند تفعيل مدار OS؟', a: 'نجهز لك حساب مغسلة كامل: لوحة تشغيل السيارات، QR للتسجيل الذاتي، شاشة انتظار، العملاء والولاء، المالية، التقارير، وإغلاق اليوم — كل شيء جاهز من أول يوم.' },
              { q: 'كيف أبدأ الاشتراك الآن؟', a: 'اختر الباقة المناسبة، يتم الدفع بتحويل بنكي، ثم نفعّل الحساب ونرسل لك بيانات الدخول خلال 24 ساعة.' },
              { q: 'هل أقدر أجرب قبل الاشتراك؟', a: 'نعم. التجربة 3 أيام مجانية — تشاهد النظام على سيناريو قريب من تشغيل مغسلتك: دخول سيارة، انتقال المراحل، تسليم، وتقارير اليوم.' },
              { q: 'هل لازم أستخدم QR من أول يوم؟', a: 'لا. تقدر تبدأ بإضافة السيارات من الموظف، ثم تفعّل QR عندما تريد تقليل الزحام وتسريع تسجيل العملاء.' },
              { q: 'هل يعمل النظام بدون إنترنت؟', a: 'النظام يعتمد على الإنترنت للمزامنة الفورية. اشتراك بيانات بسيط كافٍ — لا يحتاج شبكة سريعة.' },
              { q: 'هل يمكن تفعيله لأكثر من فرع؟', a: 'نعم، باقة Premium تدعم أكثر من فرع مع تقارير مقارنة وإدارة مركزية. تواصل معنا لعرض مخصص.' },
            ].map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </motion.div>
        </div>
      </S>

      {/* ── 15. LEAD FORM ── */}
      <S id="contact" bg="#fff">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center' }}>
          <motion.div {...fadeUp()}>
            <SectionLabel text="ابدأ الآن" />
            <H2>احجز تجربتك المجانية</H2>
            <Sub>اترك بياناتك ونتواصل معك خلال ساعات لتجهيز حساب المغسلة.</Sub>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                '٣ أيام تجربة مجانية',
                'إعداد كامل للحساب',
                'دعم مباشر عبر واتساب',
                'لا يحتاج بطاقة ائتمانية',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Check size={16} color="#16A34A" />
                  <span style={{ fontSize: 14, color: '#334155', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <div style={{ background: '#F8FAFC', borderRadius: 20, padding: 28, border: '1px solid #E2EBF6' }}>
              {done ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ width: 56, height: 56, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Check size={28} color="#16A34A" />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B3E', margin: '0 0 8px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>تم استلام طلبك</h3>
                  <p style={{ fontSize: 14, color: '#64748B', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>سنتواصل معك خلال ساعات لتجهيز الحساب.</p>
                </div>
              ) : (
                <form onSubmit={submitLead} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0D1B3E', margin: '0 0 4px', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>أو اترك بياناتك ونرجع لك</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input value={lead.name} onChange={e => setLead(p => ({ ...p, name: e.target.value }))} placeholder="اسمك" required style={inputStyle} />
                    <input value={lead.phone} onChange={e => setLead(p => ({ ...p, phone: e.target.value }))} placeholder="رقم الجوال" required style={inputStyle} />
                    <input value={lead.business} onChange={e => setLead(p => ({ ...p, business: e.target.value }))} placeholder="اسم المغسلة" style={inputStyle} />
                    <input value={lead.city} onChange={e => setLead(p => ({ ...p, city: e.target.value }))} placeholder="المدينة" style={inputStyle} />
                  </div>
                  <button type="submit" disabled={sending} style={{ background: '#0D1B3E', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif', opacity: sending ? 0.6 : 1 }}>
                    {sending ? 'جار إرسال الطلب...' : 'أرسل طلب التجربة'}
                  </button>
                  {formError && <p style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', borderRadius: 10, padding: '10px 14px', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{formError}</p>}
                  <button type="button" onClick={requestDemo} style={{ background: '#fff', color: '#0D1B3E', border: '1.5px solid #E2EBF6', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'IBM Plex Sans Arabic, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <MessageCircle size={16} color="#25D366" />
                    تواصل واتساب بدلاً من النموذج
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </S>

      {/* ── 16. FOOTER ── */}
      <footer style={{ background: '#0D1B3E', padding: '40px 0 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={18} color="#38BDF8" />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>Madar OS</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>نظام عربي للمغاسل</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { href: '#how', label: 'كيف يعمل' },
                { href: '#pricing', label: 'الباقات' },
                { href: '#faq', label: 'الأسئلة' },
                { href: `/login`, label: 'دخول العملاء', isLink: true },
              ].map(item => item.isLink ? (
                <Link key={item.label} to="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{item.label}</Link>
              ) : (
                <a key={item.label} href={item.href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>{item.label}</a>
              ))}
              <a href={`https://wa.me/${adminPhone}`} style={{ fontSize: 13, color: '#38BDF8', fontWeight: 600, textDecoration: 'none', fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>واتساب</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              مدار OS — نظام عربي لتشغيل مغاسل السيارات من التسجيل إلى الاستلام.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0, fontFamily: 'IBM Plex Sans Arabic, sans-serif' }}>
              © 2026 madar.software
            </p>
          </div>
        </div>
      </footer>

      <MadarAgentWidget agentType="sales_website" label="اسأل مدار AI" />
    </div>
  )
}
