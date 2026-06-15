import { useEffect, useState } from 'react'
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
}

export const LoyaltyCard = () => {
  const { customerId } = useParams<{ customerId: string }>()
  const [card, setCard] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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

      setCard({
        name: cust.name || 'عميل',
        phone: cust.phone || '',
        loyalty_count: cust.loyalty_count || 0,
        free_washes_available: cust.free_washes_available || 0,
        total_visits: cust.total_visits || 0,
        company_name: (co as any)?.name || 'مغسلة مادار',
        company_logo: (co as any)?.logo_url || null,
        loyalty_target: loyaltyTarget,
      })
      setLoading(false)
    }
    load()
  }, [customerId])

  // PWA install prompt for Android
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); (window as any).__pwaPrompt = e }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const isAndroid = /android/i.test(navigator.userAgent)
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches

  const installApp = () => {
    const prompt = (window as any).__pwaPrompt
    if (prompt) { prompt.prompt(); (window as any).__pwaPrompt = null }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #0099CC', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF', fontFamily: 'Tajawal, sans-serif', direction: 'rtl', gap: 12, padding: 24 }}>
      <span style={{ fontSize: 48 }}>🚗</span>
      <p style={{ fontSize: 16, color: '#64748B', textAlign: 'center' }}>البطاقة غير موجودة أو انتهت صلاحيتها</p>
    </div>
  )

  if (!card) return null

  const filled = Math.min(card.loyalty_count % card.loyalty_target || (card.loyalty_count > 0 && card.loyalty_count % card.loyalty_target === 0 ? card.loyalty_target : card.loyalty_count % card.loyalty_target), card.loyalty_target)
  const stamps = card.loyalty_count % card.loyalty_target === 0 && card.loyalty_count > 0 ? card.loyalty_target : card.loyalty_count % card.loyalty_target
  const qrData = encodeURIComponent(card.phone)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${qrData}`
  const hasFreeWash = card.free_washes_available > 0
  const remaining = card.loyalty_target - stamps

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0 }
        body { background: #0D1B3E; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.6 } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .stamp { width: 38px; height: 38px; border-radius: 50%; display:flex; align-items:center; justify-content:center; font-size:18px; transition: all 0.3s; }
        .stamp.filled { background: linear-gradient(135deg,#0099CC,#22D3EE); box-shadow: 0 4px 12px rgba(0,153,204,0.4); }
        .stamp.empty { background: #EEF2F8; border: 2px dashed #CBD5E1; }
        .free-badge { animation: pulse 2s ease-in-out infinite; }
      `}</style>

      <div dir="rtl" style={{ minHeight: '100dvh', background: '#0D1B3E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Tajawal, sans-serif' }}>

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.5s ease' }}>

          {/* Top brand strip */}
          <div style={{ background: 'linear-gradient(135deg, #0099CC, #0D1B3E)', borderRadius: '20px 20px 0 0', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {card.company_logo ? (
              <img src={card.company_logo} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', background: '#fff' }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🚗</div>
            )}
            <div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>بطاقة الولاء</p>
              <p style={{ fontSize: 16, color: '#fff', fontWeight: 900 }}>{card.company_name}</p>
            </div>
            <div style={{ marginRight: 'auto', textAlign: 'left' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>الزيارات</p>
              <p style={{ fontSize: 20, color: '#fff', fontWeight: 900 }}>{card.total_visits}</p>
            </div>
          </div>

          {/* White card body */}
          <div style={{ background: '#fff', borderRadius: '0 0 20px 20px', padding: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

            {/* Customer name */}
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 2 }}>اسم العميل</p>
              <p style={{ fontSize: 22, color: '#0D1B3E', fontWeight: 900 }}>{card.name}</p>
            </div>

            {/* Free wash alert */}
            {hasFreeWash && (
              <div className="free-badge" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: '2px solid #F59E0B', borderRadius: 12, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>🎁</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 900, color: '#92400E' }}>غسلة مجانية جاهزة!</p>
                  <p style={{ fontSize: 11, color: '#B45309' }}>أبلغ الموظف عند وصولك</p>
                </div>
              </div>
            )}

            {/* Loyalty stamps */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>تقدم الولاء</p>
                <p style={{ fontSize: 12, color: '#0099CC', fontWeight: 700 }}>
                  {hasFreeWash ? `${card.free_washes_available} غسلة مجانية` : `${remaining} زيارة للجائزة`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: card.loyalty_target }).map((_, i) => (
                  <div key={i} className={`stamp ${i < stamps ? 'filled' : 'empty'}`}>
                    {i < stamps ? '✓' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 0', borderTop: '1px dashed #E2E8F0', borderBottom: '1px dashed #E2E8F0', marginBottom: 16 }}>
              <img src={qrUrl} alt="QR" style={{ width: 120, height: 120, borderRadius: 10 }} />
              <p style={{ fontSize: 10, color: '#94A3B8', letterSpacing: 1 }}>{card.phone}</p>
            </div>

            {/* Install button */}
            {!isStandalone && (
              <div style={{ textAlign: 'center' }}>
                {isAndroid && (
                  <button onClick={installApp}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#0099CC,#22D3EE)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    📲 أضف للشاشة الرئيسية
                  </button>
                )}
                {isIOS && (
                  <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                      لحفظ البطاقة: اضغط <strong>□↑</strong> ثم <strong>"أضف إلى الشاشة الرئيسية"</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {isStandalone && (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ البطاقة محفوظة على جهازك</p>
            )}
          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Madar.software</p>
      </div>
    </>
  )
}
