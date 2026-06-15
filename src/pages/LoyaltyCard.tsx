import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface CardData {
  name: string
  phone: string
  loyalty_count: number
  free_washes_available: number
  total_visits: number
  company_name: string
  company_logo: string | null
  loyalty_target: number
  company_id: string
}

interface QueueItem {
  id: string
  status: string
  service_name: string
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; icon: string; color: string; bg: string; pulse: boolean }> = {
  received:  { label: 'في الانتظار',       icon: '⏳', color: '#0099CC', bg: '#EFF9FF', pulse: false },
  washing:   { label: 'قيد الغسيل',        icon: '🫧', color: '#7C3AED', bg: '#F5F3FF', pulse: false },
  drying:    { label: 'التجفيف',            icon: '💨', color: '#EA580C', bg: '#FFF7ED', pulse: false },
  ready:     { label: 'جاهزة — استلمها!', icon: '✅', color: '#059669', bg: '#F0FDF4', pulse: true  },
}

export const LoyaltyCard = () => {
  const { customerId } = useParams<{ customerId: string }>()
  const [card, setCard] = useState<CardData | null>(null)
  const [queue, setQueue] = useState<QueueItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchQueue = async (phone: string, companyId: string) => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const { data } = await supabase
      .from('cw_queue')
      .select('id, status, service_name, created_at')
      .eq('company_id', companyId)
      .eq('phone', phone)
      .neq('status', 'delivered')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setQueue(data as QueueItem | null)
  }

  useEffect(() => {
    if (!customerId) return
    const load = async () => {
      const { data: cust } = await supabase
        .from('cw_customers')
        .select('name, phone, loyalty_count, free_washes_available, total_visits, company_id')
        .eq('id', customerId)
        .maybeSingle()
      if (!cust) { setNotFound(true); setLoading(false); return }

      const { data: co } = await supabase
        .from('companies')
        .select('name, logo_url, cw_automations')
        .eq('id', (cust as any).company_id)
        .maybeSingle()

      const loyaltyTarget = (co as any)?.cw_automations?.loyalty?.target || 5
      const companyId = (cust as any).company_id

      setCard({
        name: cust.name || 'عميل',
        phone: cust.phone || '',
        loyalty_count: cust.loyalty_count || 0,
        free_washes_available: cust.free_washes_available || 0,
        total_visits: cust.total_visits || 0,
        company_name: (co as any)?.name || 'مغسلة مادار',
        company_logo: (co as any)?.logo_url || null,
        loyalty_target: loyaltyTarget,
        company_id: companyId,
      })

      await fetchQueue(cust.phone, companyId)
      setLoading(false)

      // Real-time subscription
      channelRef.current = supabase
        .channel(`card-queue-${customerId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'cw_queue',
          filter: `company_id=eq.${companyId}`,
        }, () => fetchQueue(cust.phone, companyId))
        .subscribe()
    }
    load()
    return () => { channelRef.current?.unsubscribe() }
  }, [customerId])

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); (window as any).__pwaPrompt = e }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches
  const installApp = () => { const p = (window as any).__pwaPrompt; if (p) { p.prompt(); (window as any).__pwaPrompt = null } }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1B3E' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #22D3EE', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0D1B3E', fontFamily: 'Tajawal,sans-serif', direction: 'rtl', gap: 12 }}>
      <span style={{ fontSize: 48 }}>🚗</span>
      <p style={{ fontSize: 16, color: '#94A3B8' }}>البطاقة غير موجودة</p>
    </div>
  )

  if (!card) return null

  const stamps = card.loyalty_count % card.loyalty_target === 0 && card.loyalty_count > 0
    ? card.loyalty_target
    : card.loyalty_count % card.loyalty_target
  const hasFreeWash = card.free_washes_available > 0
  const remaining = card.loyalty_target - stamps
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(card.phone)}`
  const queueStatus = queue ? STATUS_MAP[queue.status] : null

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0D1B3E}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.85;transform:scale(1.01)}}
        @keyframes ripple{0%{box-shadow:0 0 0 0 rgba(5,150,105,.4)}100%{box-shadow:0 0 0 16px rgba(5,150,105,0)}}
        .stamp{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
        .stamp.on{background:linear-gradient(135deg,#0099CC,#22D3EE);box-shadow:0 3px 10px rgba(0,153,204,.35);color:#fff}
        .stamp.off{background:#EEF2F8;border:2px dashed #CBD5E1}
        .pulse-card{animation:pulse 2s ease-in-out infinite}
        .ripple-dot{animation:ripple 1.5s ease-out infinite}
      `}</style>

      <div dir="rtl" style={{ minHeight:'100dvh', background:'#0D1B3E', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px 16px', fontFamily:'Tajawal,sans-serif' }}>
        <div style={{ width:'100%', maxWidth:360, animation:'fadeUp 0.45s ease' }}>

          {/* Header */}
          <div style={{ background:'linear-gradient(135deg,#0099CC 0%,#0D1B3E 100%)', borderRadius:'22px 22px 0 0', padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
            {card.company_logo
              ? <img src={card.company_logo} alt="" style={{ width:40, height:40, borderRadius:10, objectFit:'cover', background:'#fff' }} />
              : <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🚗</div>
            }
            <div style={{ flex:1 }}>
              <p style={{ fontSize:11, color:'rgba(255,255,255,.65)', fontWeight:500 }}>بطاقة الولاء</p>
              <p style={{ fontSize:15, color:'#fff', fontWeight:900 }}>{card.company_name}</p>
            </div>
            <div style={{ textAlign:'left' }}>
              <p style={{ fontSize:10, color:'rgba(255,255,255,.55)' }}>الزيارات</p>
              <p style={{ fontSize:22, color:'#fff', fontWeight:900 }}>{card.total_visits}</p>
            </div>
          </div>

          {/* Body */}
          <div style={{ background:'#fff', borderRadius:'0 0 22px 22px', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.45)' }}>

            {/* Live car status */}
            {queueStatus ? (
              <div className={queue?.status === 'ready' ? 'pulse-card' : ''}
                style={{ background: queueStatus.bg, borderBottom:`2px solid ${queueStatus.color}20`, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:`${queueStatus.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                    {queueStatus.icon}
                  </div>
                  {queue?.status === 'ready' && (
                    <div className="ripple-dot" style={{ position:'absolute', inset:0, borderRadius:'50%', border:`2px solid ${queueStatus.color}` }} />
                  )}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:`${queueStatus.color}cc`, fontWeight:600, marginBottom:2 }}>سيارتك الآن</p>
                  <p style={{ fontSize:16, fontWeight:900, color: queueStatus.color }}>{queueStatus.label}</p>
                  {queue?.service_name && (
                    <p style={{ fontSize:11, color:'#64748B', marginTop:1 }}>{queue.service_name}</p>
                  )}
                </div>
                {queue?.status === 'ready' && (
                  <div style={{ background: queueStatus.color, borderRadius:10, padding:'6px 12px' }}>
                    <p style={{ fontSize:11, color:'#fff', fontWeight:700 }}>توجّه الآن</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding:'12px 18px', background:'#F8FAFF', borderBottom:'1px solid #EEF2F8', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>🚗</span>
                <p style={{ fontSize:12, color:'#94A3B8', fontWeight:500 }}>لا توجد سيارة في المسار حالياً</p>
              </div>
            )}

            <div style={{ padding:'16px 18px' }}>
              {/* Customer name */}
              <div style={{ marginBottom:14 }}>
                <p style={{ fontSize:10, color:'#94A3B8', fontWeight:500, marginBottom:2 }}>اسم العميل</p>
                <p style={{ fontSize:20, color:'#0D1B3E', fontWeight:900 }}>{card.name}</p>
              </div>

              {/* Free wash alert */}
              {hasFreeWash && (
                <div className="pulse-card" style={{ background:'linear-gradient(135deg,#FEF3C7,#FDE68A)', border:'1.5px solid #F59E0B', borderRadius:12, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>🎁</span>
                  <div>
                    <p style={{ fontSize:13, fontWeight:900, color:'#92400E' }}>غسلة مجانية جاهزة!</p>
                    <p style={{ fontSize:11, color:'#B45309' }}>أبلغ الموظف عند وصولك</p>
                  </div>
                </div>
              )}

              {/* Stamps */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <p style={{ fontSize:12, color:'#64748B', fontWeight:600 }}>تقدم الولاء</p>
                  <p style={{ fontSize:12, color:'#0099CC', fontWeight:700 }}>
                    {hasFreeWash ? `${card.free_washes_available} غسلة مجانية` : `${remaining} زيارة للجائزة`}
                  </p>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {Array.from({ length: card.loyalty_target }).map((_, i) => (
                    <div key={i} className={`stamp ${i < stamps ? 'on' : 'off'}`}>{i < stamps ? '✓' : ''}</div>
                  ))}
                </div>
              </div>

              {/* QR */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 0', borderTop:'1px dashed #E2E8F0', borderBottom:'1px dashed #E2E8F0', marginBottom:14 }}>
                <img src={qrUrl} alt="QR" style={{ width:110, height:110, borderRadius:10 }} />
                <p style={{ fontSize:10, color:'#CBD5E1', letterSpacing:.5 }} dir="ltr">{card.phone}</p>
              </div>

              {/* Install */}
              {!isStandalone && (isAndroid ? (
                <button onClick={installApp}
                  style={{ width:'100%', padding:'11px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#0099CC,#22D3EE)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                  📲 أضف للشاشة الرئيسية
                </button>
              ) : isIOS ? (
                <div style={{ background:'#F8FAFF', borderRadius:12, padding:'10px 14px', border:'1px solid #E2E8F0' }}>
                  <p style={{ fontSize:12, color:'#475569', lineHeight:1.6 }}>
                    لحفظ البطاقة: اضغط <strong>□↑</strong> ثم <strong>"أضف إلى الشاشة الرئيسية"</strong>
                  </p>
                </div>
              ) : null)}

              {isStandalone && (
                <p style={{ textAlign:'center', fontSize:11, color:'#10B981', fontWeight:600 }}>✓ البطاقة محفوظة على جهازك</p>
              )}
            </div>
          </div>
        </div>

        <p style={{ marginTop:18, fontSize:10, color:'rgba(255,255,255,.2)' }}>Madar.software</p>
      </div>
    </>
  )
}
