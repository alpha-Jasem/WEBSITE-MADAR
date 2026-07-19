import React, { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown, ArrowUpLeft, ArrowUpRight, Check, MessageCircle, Calendar, Bell, BarChart3, Zap, Phone, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Footer } from '../components/public/Footer'
import { useLanguage } from '../context/LanguageContext'
import { openWhatsAppChat } from '../lib/whatsapp'

/* ─── Hero-only dark tokens — Madar brand navy + blue ──────────────── */
const H = {
  bg: '#0C1A2E',
  ink: '#EAF1FB',
  ink2: '#9FB2CC',
  ink3: '#5E7290',
  accent: '#2563EB',
  accentBright: '#60A5FA',
  ember: '#93C5FD',
  glassBd: 'rgba(255,255,255,0.12)',
  glassBg: 'rgba(255,255,255,0.05)',
}

/* ─── Design tokens — unified black cinematic, Madar brand blue ────── */
const K = {
  bg: '#000000',
  bgAlt: '#060709',
  card: 'rgba(255,255,255,0.025)',
  cardHi: 'rgba(37,99,235,0.10)',
  ink: '#F4F7FC',
  ink2: 'rgba(255,255,255,0.66)',
  ink3: 'rgba(255,255,255,0.4)',
  accent: '#4FA3FF',
  accentDeep: '#8FBEFF',
  accentSoft: 'rgba(79,163,255,0.14)',
  rule: 'rgba(255,255,255,0.09)',
}

const display = '"Noto Serif Arabic", serif'
const body = '"IBM Plex Sans Arabic", Cairo, sans-serif'
const mono = '"IBM Plex Mono", monospace'

const rv = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
const ha = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }

const wa = (msg: string) => openWhatsAppChat(msg)

/* ─── AI Core Bloom — vanilla Three.js organic blooming hero scene ─── */
const AICoreBloom = () => {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.set(0, 0.15, 7.6)
    camera.lookAt(0, 0.15, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight('#3a4a6b', 1.1))
    const blueLight = new THREE.PointLight('#4FA3FF', 22, 20, 2)
    blueLight.position.set(3.2, 2, 4.5)
    scene.add(blueLight)
    const violetLight = new THREE.PointLight('#A98BFF', 18, 20, 2)
    violetLight.position.set(-3.4, -1.6, 3.5)
    scene.add(violetLight)
    const rimLight = new THREE.PointLight('#EAF1FB', 6, 20, 2)
    rimLight.position.set(0, 1.5, -4)
    scene.add(rimLight)

    // starfield
    const starCount = 700
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 14 + Math.random() * 22
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      starPos[i * 3 + 2] = r * Math.cos(phi)
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: '#BFD6FF', size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // soft glow halo behind the core
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = 256; glowCanvas.height = 256
    const gctx = glowCanvas.getContext('2d')!
    const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(170,205,255,0.9)')
    grad.addColorStop(0.4, 'rgba(130,155,255,0.32)')
    grad.addColorStop(1, 'rgba(130,155,255,0)')
    gctx.fillStyle = grad
    gctx.fillRect(0, 0, 256, 256)
    const glowTex = new THREE.CanvasTexture(glowCanvas)
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.set(5.5, 5.5, 1)
    scene.add(glow)

    // luminous core
    const coreGeo = new THREE.IcosahedronGeometry(0.32, 3)
    const coreMat = new THREE.MeshBasicMaterial({ color: '#EAF1FB' })
    const core = new THREE.Mesh(coreGeo, coreMat)
    scene.add(core)

    // organic petal shape (teardrop), hinged from the flower's center
    const petalShape = (length: number, width: number) => {
      const s = new THREE.Shape()
      s.moveTo(0, 0)
      s.bezierCurveTo(width, length * 0.18, width * 0.85, length * 0.78, 0, length)
      s.bezierCurveTo(-width * 0.85, length * 0.78, -width, length * 0.18, 0, 0)
      return s
    }

    const flower = new THREE.Group()
    scene.add(flower)

    type Petal = { hinge: THREE.Group; closed: number; open: number; phase: number }
    const petals: Petal[] = []
    const disposables: { geo: THREE.BufferGeometry; mat: THREE.Material }[] = []

    const layers = [
      { count: 6, length: 1.15, width: 0.5, insert: 0.06, closed: -1.5, open: -0.6, colorA: '#3E7DFF', colorB: '#8FC4FF' },
      { count: 8, length: 1.55, width: 0.66, insert: 0.1, closed: -1.42, open: -0.28, colorA: '#5B8CFF', colorB: '#A98BFF' },
      { count: 10, length: 1.9, width: 0.78, insert: 0.14, closed: -1.32, open: -0.06, colorA: '#7D6BFF', colorB: '#C9A6FF' },
    ]

    layers.forEach((layer, li) => {
      const geo = new THREE.ShapeGeometry(petalShape(layer.length, layer.width), 10)
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + li * 0.35
        const pivot = new THREE.Group()
        pivot.rotation.z = angle
        const hinge = new THREE.Group()
        pivot.add(hinge)
        const t = i / layer.count
        const color = new THREE.Color(layer.colorA).lerp(new THREE.Color(layer.colorB), t)
        const mat = new THREE.MeshPhysicalMaterial({
          color,
          transparent: true,
          opacity: 0.88,
          roughness: 0.35,
          metalness: 0.05,
          clearcoat: 0.6,
          clearcoatRoughness: 0.25,
          emissive: color,
          emissiveIntensity: 0.16,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.y = layer.insert
        hinge.add(mesh)
        flower.add(pivot)
        petals.push({ hinge, closed: layer.closed, open: layer.open, phase: li * 0.12 + (i / layer.count) * 0.18 })
        disposables.push({ geo, mat })
      }
    })

    const clock = new THREE.Clock()
    let raf = 0
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    const animate = () => {
      const t = clock.getElapsedTime()
      const bloom = reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * 0.28)
      petals.forEach(p => {
        const local = reduceMotion ? bloom : Math.min(1, Math.max(0, bloom + Math.sin(t * 0.28 + p.phase) * 0.06))
        p.hinge.rotation.x = THREE.MathUtils.lerp(p.closed, p.open, local)
      })
      if (!reduceMotion) {
        flower.rotation.y = t * 0.09
        stars.rotation.y = t * 0.015
        core.rotation.y = t * 0.4
        core.scale.setScalar(1 + Math.sin(t * 1.6) * 0.05)
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      mount.removeChild(renderer.domElement)
      disposables.forEach(({ geo, mat }) => { geo.dispose(); mat.dispose() })
      starGeo.dispose(); starMat.dispose()
      glowTex.dispose(); glowMat.dispose()
      coreGeo.dispose(); coreMat.dispose()
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
}

/* ─── Nav — liquid-glass, centered pill ───────────────────────────── */
const Nav = () => {
  const { t, dir } = useLanguage()
  const links = [
    { ar: 'القدرات', en: 'Capabilities', href: '#features' },
    { ar: 'كيف يعمل', en: 'How it works', href: '#how' },
    { ar: 'الأسعار', en: 'Pricing', href: '#pricing' },
    { ar: 'الأسئلة', en: 'FAQ', href: '#faq' },
  ]
  return (
    <header dir={dir} style={{ position: 'relative', zIndex: 6 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo-main.png" alt="Madar" style={{ height: 34, width: 'auto', display: 'block' }} />
          <span style={{ fontFamily: display, fontSize: 21, fontWeight: 500, color: '#fff', letterSpacing: '0.01em' }} className="clinic-ai-brandword">{t('مدار', 'Madar')}</span>
        </Link>
        <div className="liquid-glass clinic-ai-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2, borderRadius: 999, padding: 6 }}>
          {links.map(l => (
            <a key={l.href} href={l.href} style={{ fontFamily: body, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', textDecoration: 'none', padding: '8px 14px' }}>
              {t(l.ar, l.en)}
            </a>
          ))}
          <button
            onClick={() => wa('مرحباً، أبي أحجز جلسة تقييم مجانية لوكيل مدار الذكي')}
            style={{
              marginInlineStart: 4, fontFamily: body, fontSize: 13.5, fontWeight: 600,
              padding: '9px 16px', borderRadius: 999, background: '#fff', border: 'none',
              color: '#0C1A2E', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            }}
          >
            {t('احجز جلسة', 'Claim a Spot')}
            {dir === 'rtl' ? <ArrowUpLeft size={15} /> : <ArrowUpRight size={15} />}
          </button>
        </div>
        <span style={{ width: 40, height: 40, flexShrink: 0 }} className="clinic-ai-nav-spacer" />
      </div>
    </header>
  )
}

/* ─── Hero — 3D blooming AI core + liquid-glass, Madar/clinic ──────── */
const Hero = () => {
  const { t, dir } = useLanguage()
  const { scrollY } = useScroll()
  const videoY = useTransform(scrollY, [0, 900], [0, 260])
  const videoScale = useTransform(scrollY, [0, 900], [1, 1.12])
  const contentY = useTransform(scrollY, [0, 700], [0, 120])
  const contentOpacity = useTransform(scrollY, [0, 520], [1, 0])
  const stats = [
    { n: t('< ١ ثانية', '< 1 sec'), l: t('زمن الرد على العميل', 'Response time'), icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ) },
    { n: t('٢٤/٧', '24/7'), l: t('يعمل بلا توقّف', 'Always on'), icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 1 2.4 5.7" /><path d="M4 20v-4h4" /></svg>
    ) },
  ]
  const arrow = dir === 'rtl' ? <ArrowUpLeft size={18} /> : <ArrowUpRight size={18} />
  return (
    <section dir={dir} className="clinic-ai-hero" style={{ position: 'relative', overflow: 'hidden', background: '#000', minHeight: '100vh' }}>
      <motion.div style={{ position: 'absolute', inset: 0, zIndex: 0, y: videoY, scale: videoScale, willChange: 'transform' }}>
        <AICoreBloom />
      </motion.div>
      {/* soft scrim for Arabic text legibility (kept light — glass chrome carries contrast) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 90% 70% at 50% 42%, rgba(0,0,0,0.28), rgba(0,0,0,0) 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 68%, rgba(0,0,0,0.9) 100%)' }} />

      <motion.div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', minHeight: '100vh', y: contentY, opacity: contentOpacity }}>
        <Nav />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6vh 24px 0' }}>
          <motion.div {...ha} className="liquid-glass" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, borderRadius: 999, padding: '5px 14px 5px 5px', marginBottom: 34,
          }}>
            <span style={{ background: '#fff', color: '#0C1A2E', borderRadius: 999, padding: '4px 12px', fontFamily: body, fontSize: 12, fontWeight: 700 }}>{t('جديد', 'New')}</span>
            <span style={{ fontFamily: body, fontSize: 13.5, color: 'rgba(255,255,255,0.9)', paddingInlineEnd: 6 }}>{t('وكيل ذكاء اصطناعي لعيادتك يعمل ٢٤/٧', 'An AI agent for your clinic, running 24/7')}</span>
          </motion.div>

          <motion.h1 {...ha} transition={{ ...ha.transition, delay: 0.08 }} style={{
            fontFamily: display, fontWeight: 500, lineHeight: 1.05,
            fontSize: 'clamp(44px, 7vw, 96px)', color: '#fff', letterSpacing: '-0.02em',
            margin: '0 0 22px', maxWidth: 900,
          }}>
            {t('استقبال عيادتك،', 'Your clinic reception,')}<br />
            {t('ما يتوقّف أبداً.', 'that never sleeps.')}
          </motion.h1>

          <motion.p {...ha} transition={{ ...ha.transition, delay: 0.16 }} style={{
            fontFamily: body, fontSize: 17, lineHeight: 1.8, color: 'rgba(255,255,255,0.92)', fontWeight: 300,
            maxWidth: 580, margin: '0 auto 30px',
          }}>
            {t(
              'وكيل يرد على العملاء، يحجز المواعيد، ويتابع — على واتساب والهاتف، على مدار الساعة بدون ما يغيب.',
              'An agent that answers patients, books appointments, and follows up — on WhatsApp and phone, around the clock.'
            )}
          </motion.p>

          <motion.div {...ha} transition={{ ...ha.transition, delay: 0.24 }} style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
            <button
              onClick={() => wa('مرحباً، أبي أحجز جلسة تقييم مجانية لوكيل مدار الذكي')}
              className="liquid-glass-strong"
              style={{ fontFamily: body, fontSize: 15, fontWeight: 500, color: '#fff', borderRadius: 999, padding: '12px 22px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9 }}
            >
              {t('ابدأ رحلتك', 'Start your voyage')}{arrow}
            </button>
            <a href="#how" style={{ fontFamily: body, fontSize: 15, fontWeight: 500, color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t('شوف كيف يعمل', 'See how it works')}<Play size={15} fill="#fff" />
            </a>
          </motion.div>

          <motion.div {...ha} transition={{ ...ha.transition, delay: 0.32 }} style={{ display: 'flex', alignItems: 'stretch', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 44 }}>
            {stats.map((s, i) => (
              <div key={i} className="liquid-glass" style={{ width: 220, borderRadius: 20, padding: 20, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
                <span style={{ color: '#fff', display: 'inline-flex' }}>{s.icon}</span>
                <div style={{ fontFamily: display, fontSize: 34, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1, marginTop: 22, fontVariantNumeric: 'tabular-nums' }}>{s.n}</div>
                <div style={{ fontFamily: body, fontSize: 12.5, color: 'rgba(255,255,255,0.9)', fontWeight: 300, marginTop: 8 }}>{s.l}</div>
              </div>
            ))}
          </motion.div>
        </main>

        <motion.div {...ha} transition={{ ...ha.transition, delay: 0.4 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingBottom: 44 }}>
          <div className="liquid-glass" style={{ borderRadius: 999, padding: '5px 16px', fontFamily: body, fontSize: 12, color: '#fff' }}>
            {t('مبني على أفضل الأدوات وموصول بأنظمتك الحالية', 'Built on the best tools, connected to your existing stack')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }} className="clinic-ai-partners">
            {['واتساب', 'Google Calendar', 'Google Maps', 'SMS'].map(n => (
              <span key={n} style={{ fontFamily: display, fontSize: 24, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>{n}</span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* bottom fade into next section */}
      <div style={{ position: 'absolute', insetInline: 0, bottom: 0, height: 160, zIndex: 4, pointerEvents: 'none', background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${K.bg} 92%)` }} />
    </section>
  )
}

/* ─── Trust strip ────────────────────────────────────────────────── */
const TrustLine = () => {
  const { t, dir } = useLanguage()
  const items = [
    { v: '24/7', l: t('استقبال مستمر', 'Always answering') },
    { v: '<5', l: t('ثواني للرد', 'sec response') },
    { v: '80%', l: t('تقليل مكالمات الاستقبال', 'fewer front-desk calls') },
    { v: '0', l: t('مواعيد ضائعة', 'missed bookings') },
  ]
  return (
    <div dir={dir} className="clinic-ai-trust-pad" style={{ background: K.bgAlt, borderBottom: `1px solid ${K.rule}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '30px 28px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '18px 0' }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: '0 36px', textAlign: 'center', borderInlineStart: i ? `1px solid ${K.rule}` : 'none' }}>
            <div style={{ fontFamily: display, fontSize: 26, color: K.accent, marginBottom: 4 }}>{it.v}</div>
            <div style={{ fontFamily: body, fontSize: 12.5, color: K.ink2 }}>{it.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── How it works ───────────────────────────────────────────────── */
const HowItWorks = () => {
  const { t, dir } = useLanguage()
  const steps = [
    { n: '01', title: t('العميل يراسل أو يتصل', 'Patient messages or calls'), body: t('عبر واتساب أو مكالمة هاتفية مباشرة على رقم عيادتك.', "Via WhatsApp or a direct call to your clinic's number.") },
    { n: '02', title: t('المساعد يرد ويفهم الطلب', 'The agent answers and understands'), body: t('يتكلم لهجتك، يسأل الأسئلة الصح، ويعرف الفرق بين حجز وإلغاء واستفسار.', 'Speaks your dialect, asks the right questions, and knows booking from cancelling from a general question.') },
    { n: '03', title: t('يحجز مباشرة بالتقويم', 'Books directly on the calendar'), body: t('يشيك على الأوقات الفعلية المتاحة عند كل دكتور ويثبت الموعد فوراً.', "Checks each doctor's real availability and confirms the slot instantly.") },
    { n: '04', title: t('يذكّر ويتابع', 'Reminds and follows up'), body: t('رسالة تأكيد وتذكير تلقائي قبل الموعد — تقليل الغياب بدون أي مجهود منك.', 'Automatic confirmation and reminder before the visit — fewer no-shows, zero effort.') },
  ]
  return (
    <section id="how" dir={dir} style={{ background: K.bg, padding: '110px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px' }}>
        <motion.div {...rv} style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.accent, marginBottom: 16 }}>
          {t('كيف يعمل', 'How it works')}
        </motion.div>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 64, maxWidth: 640 }}>
          {t('أربع خطوات وينتهي دور موظف الاستقبال بالتكرار.', 'Four steps, and repetitive front-desk work is over.')}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }} className="clinic-ai-4col">
          {steps.map((s, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.08 }}>
              <div style={{ fontFamily: display, fontSize: 40, color: K.accentSoft, marginBottom: 18 }}>{s.n}</div>
              <h3 style={{ fontFamily: body, fontWeight: 700, fontSize: 16.5, color: K.ink, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontFamily: body, fontSize: 14, lineHeight: 1.85, color: K.ink2 }}>{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Features / AI capabilities ─────────────────────────────────── */
const Features = () => {
  const { t, dir } = useLanguage()
  const cards = [
    { icon: MessageCircle, title: t('محادثة طبيعية', 'Natural conversation'), body: t('يفهم اللهجة السعودية ويرد بأسلوب بشري، مو ردود جاهزة.', 'Understands Saudi dialect and replies like a human — not canned responses.') },
    { icon: Calendar, title: t('حجز فوري بالتقويم', 'Instant calendar booking'), body: t('متصل مباشرة بتقويم كل دكتور، يعرض الأوقات الحقيقية المتاحة فقط.', "Connected directly to each doctor's calendar — only shows real open slots.") },
    { icon: Bell, title: t('تذكيرات تلقائية', 'Automatic reminders'), body: t('رسالة تأكيد وتذكير قبل الموعد بدون أي تدخل يدوي.', 'Confirmation and reminder messages sent automatically, no manual work.') },
    { icon: BarChart3, title: t('لوحة تحكم كاملة', 'Full dashboard'), body: t('تشوف كل محادثة وحجز وإحصائية بلوحة واحدة سهلة.', 'See every conversation, booking, and stat in one simple dashboard.') },
  ]
  return (
    <section id="features" dir={dir} style={{ background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}`, borderBottom: `1px solid ${K.rule}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px' }}>
        <motion.div {...rv} style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.accent, marginBottom: 16 }}>
          {t('المميزات', 'Features')}
        </motion.div>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 64, maxWidth: 640 }}>
          {t('كل شي يحتاجه استقبال عيادتك، بذكاء اصطناعي واحد.', "Everything your clinic's front desk needs, in one AI agent.")}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }} className="clinic-ai-2col">
          {cards.map((c, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.06 }} className="ca-card ca-toppad" style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))', borderRadius: 16, padding: 32, border: `1px solid ${K.rule}`,
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(140deg, rgba(79,163,255,0.28), rgba(122,79,232,0.18))', border: '1px solid rgba(79,163,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 22px -8px rgba(79,163,255,0.5)' }}>
                <c.icon size={21} color="#CFE2FF" />
              </div>
              <h3 style={{ fontFamily: body, fontWeight: 700, fontSize: 17, color: K.ink, marginBottom: 8 }}>{c.title}</h3>
              <p style={{ fontFamily: body, fontSize: 14.5, lineHeight: 1.85, color: K.ink2 }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Pricing ─────────────────────────────────────────────────────── */
const Pricing = () => {
  const { t, dir } = useLanguage()
  const plans = [
    {
      name: t('البداية الذكية', 'Smart Start'),
      desc: t('لعيادة وحدة تبي تجرب الفكرة', 'For a single clinic testing the waters'),
      features: [t('مساعد واتساب', 'WhatsApp agent'), t('حجز مواعيد', 'Appointment booking'), t('تذكيرات تلقائية', 'Automatic reminders')],
      cta: t('ابدأ الآن', 'Get started'),
      highlight: false,
    },
    {
      name: t('النمو الكامل', 'Full Growth'),
      desc: t('لعيادة تبي تشغيل كامل بدون لمس يدوي', 'For a clinic running fully hands-off'),
      features: [t('مساعد صوتي + واتساب', 'Voice + WhatsApp agent'), t('لوحة تحكم وتقارير', 'Dashboard & reports'), t('عدة دكاترة وخدمات', 'Multiple doctors & services'), t('دعم أولوية', 'Priority support')],
      cta: t('الأكثر طلباً', 'Most popular'),
      highlight: true,
    },
    {
      name: t('Enterprise', 'Enterprise'),
      desc: t('لسلسلة عيادات أو مجموعة طبية', 'For clinic chains and medical groups'),
      features: [t('كل الميزات', 'Everything included'), t('تكامل مخصص', 'Custom integrations'), t('مدير حساب مخصص', 'Dedicated account manager')],
      cta: t('تواصل معنا', 'Contact us'),
      highlight: false,
    },
  ]
  return (
    <section id="pricing" dir={dir} style={{ background: K.bg, padding: '110px 0' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 28px' }}>
        <motion.div {...rv} style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.accent, marginBottom: 16, textAlign: 'center' }}>
          {t('الباقات', 'Pricing')}
        </motion.div>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 64, textAlign: 'center' }}>
          {t('باقة تناسب حجم عيادتك.', 'A plan that fits your clinic size.')}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="clinic-ai-3col">
          {plans.map((p, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.08 }} style={{
              background: p.highlight ? `linear-gradient(160deg, ${K.cardHi}, #1B1030)` : K.card,
              borderRadius: 20, padding: 34,
              border: p.highlight ? '1px solid rgba(79,163,255,0.45)' : `1px solid ${K.rule}`,
              boxShadow: p.highlight ? '0 0 0 1px rgba(79,163,255,0.12), 0 30px 60px -22px rgba(79,163,255,0.4)' : 'none',
            }}>
              <h3 style={{ fontFamily: body, fontWeight: 700, fontSize: 19, color: '#fff', marginBottom: 8 }}>{p.name}</h3>
              <p style={{ fontFamily: body, fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,0.62)' : K.ink2, marginBottom: 26, lineHeight: 1.7 }}>{p.desc}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Check size={15} color={K.accent} />
                    <span style={{ fontFamily: body, fontSize: 13.5, color: p.highlight ? 'rgba(255,255,255,0.88)' : K.ink2 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => wa(`مرحباً، مهتم بباقة "${p.name}" لمساعد الاستقبال الذكي`)}
                style={{
                  width: '100%', fontFamily: body, fontSize: 13.5, fontWeight: 700,
                  padding: '13px', borderRadius: 999, border: p.highlight ? 'none' : `1.5px solid ${K.ink2}`,
                  background: p.highlight ? `linear-gradient(90deg, ${K.accent}, #7C4FE8)` : 'transparent',
                  color: '#fff', cursor: 'pointer',
                  boxShadow: p.highlight ? '0 16px 32px -12px rgba(91,108,255,0.6)' : 'none',
                }}
              >
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ─────────────────────────────────────────────────────────── */
const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${K.rule}`, padding: '22px 0' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'start',
      }}>
        <span style={{ fontFamily: body, fontWeight: 600, fontSize: 15.5, color: K.ink }}>{q}</span>
        <ChevronDown size={18} color={K.ink2} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <p style={{ fontFamily: body, fontSize: 14, lineHeight: 1.9, color: K.ink2, marginTop: 14, maxWidth: 640 }}>{a}</p>
      )}
    </div>
  )
}

const FAQ = () => {
  const { t, dir } = useLanguage()
  const items = [
    { q: t('هل المساعد يقدر يحجز موعد فعلي بالتقويم؟', 'Can the agent book a real calendar slot?'), a: t('إيه، مربوط مباشرة بتقويم كل دكتور، يشيك على الأوقات الفعلية المتاحة ويثبت الحجز فوراً.', "Yes — it's connected directly to each doctor's calendar, checks real availability, and confirms instantly.") },
    { q: t('هل يشتغل على واتساب والهاتف بنفس الوقت؟', 'Does it work on WhatsApp and phone at once?'), a: t('إيه، نفس المساعد يرد على القناتين، بنفس المعلومات ونفس اللهجة.', 'Yes — the same agent answers both channels, with the same knowledge and dialect.') },
    { q: t('كم يحتاج وقت عشان يبدأ يشتغل بعيادتي؟', 'How long until it goes live for my clinic?'), a: t('بعد ما نجمع معلومات عيادتك ودكاترتك، يصير جاهز خلال أيام قليلة.', "Once we collect your clinic and doctor details, it's ready within a few days.") },
    { q: t('هل أقدر أتابع كل المحادثات والحجوزات؟', 'Can I track every conversation and booking?'), a: t('إيه، عندك لوحة تحكم توريك كل محادثة وحجز وإحصائية لحظة بلحظة.', 'Yes — your dashboard shows every conversation, booking, and stat in real time.') },
  ]
  return (
    <section id="faq" dir={dir} style={{ background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}` }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 28px' }}>
        <motion.div {...rv} style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.accent, marginBottom: 16, textAlign: 'center' }}>
          {t('الأسئلة الشائعة', 'FAQ')}
        </motion.div>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(26px,3vw,36px)', color: K.ink, marginBottom: 48, textAlign: 'center' }}>
          {t('عندك سؤال؟ يمكن جاوبنا عليه.', 'Have a question? We might have answered it.')}
        </motion.h2>
        <div>
          {items.map((it, i) => <FAQItem key={i} q={it.q} a={it.a} />)}
        </div>
      </div>
    </section>
  )
}

/* ─── Final CTA ───────────────────────────────────────────────────── */
const FinalCTA = () => {
  const { t, dir } = useLanguage()
  return (
    <section dir={dir} style={{
      position: 'relative', overflow: 'hidden', padding: '130px 0', textAlign: 'center',
      background: `radial-gradient(ellipse 70% 60% at 50% 0%, rgba(79,163,255,0.16), rgba(6,6,12,0) 70%), ${H.bg}`,
    }}>
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '0 28px' }}>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', color: '#fff', marginBottom: 20, lineHeight: 1.2 }}>
          {t('خلّ عيادتك ترد', 'Let your clinic answer')}{' '}
          <span style={{ color: '#C9A6FF', fontStyle: 'italic' }}>{t('على طول', 'instantly')}</span>
        </motion.h2>
        <motion.p {...rv} transition={{ ...rv.transition, delay: 0.08 }} style={{ fontFamily: body, fontSize: 15.5, color: 'rgba(255,255,255,0.65)', marginBottom: 38, lineHeight: 1.9 }}>
          {t('احجز مكالمة مجانية 30 دقيقة، نوريك المساعد شغال على بياناتك الحقيقية.', "Book a free 30-minute call — we'll show you the agent running on your real data.")}
        </motion.p>
        <motion.button
          {...rv} transition={{ ...rv.transition, delay: 0.16 }}
          onClick={() => wa('مرحباً، أبي أحجز مكالمة تعريفية عن مساعد الاستقبال الذكي')}
          style={{
            fontFamily: body, fontSize: 14.5, fontWeight: 700,
            padding: '17px 34px', borderRadius: 999, border: 'none',
            background: `linear-gradient(90deg, ${K.accent}, #7C4FE8)`, color: '#fff', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 10,
            boxShadow: '0 24px 54px -16px rgba(91,108,255,0.6)',
          }}
        >
          {t('احجز مكالمة مجانية', 'Book a free call')}
          {dir === 'rtl' ? <ArrowUpLeft size={17} /> : <ArrowUpRight size={17} />}
        </motion.button>
      </div>
    </section>
  )
}

/* ─── Shared section header ───────────────────────────────────────── */
const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: K.accentDeep, marginBottom: 16 }}>{children}</div>
)

/* ─── Announcement bar ────────────────────────────────────────────── */
const AnnouncementBar = () => {
  const { t, dir } = useLanguage()
  return (
    <div dir={dir} style={{ background: '#08111F', borderBottom: `1px solid ${K.rule}`, padding: '9px 20px', textAlign: 'center' }}>
      <span style={{ fontFamily: body, fontSize: 12.5, color: K.ink2 }}>
        {t('مدار — الذكاء الاصطناعي المصمَّم خصيصاً للعيادات', 'Madar — AI designed specifically for clinics')}
      </span>
      <span style={{ color: K.ink3, margin: '0 12px' }}>|</span>
      <a href="#how" style={{ fontFamily: body, fontSize: 12.5, color: K.accentDeep, textDecoration: 'none' }}>{t('اقرأ المزيد ←', 'Read more →')}</a>
    </div>
  )
}

/* ─── Logos / trusted-by strip ────────────────────────────────────── */
const LogosStrip = () => {
  const { t, dir } = useLanguage()
  const clinics = [
    t('عيادات الأسنان', 'Dental clinics'), t('العيادات الجلدية', 'Dermatology'), t('عيادات التجميل', 'Aesthetics'),
    t('عيادات العيون', 'Ophthalmology'), t('العيادات النفسية', 'Mental health'), t('المراكز الطبية', 'Medical centers'),
  ]
  return (
    <div dir={dir} style={{ position: 'relative', background: K.bg, padding: '64px 0', borderBottom: `1px solid ${K.rule}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 55% 130% at 50% -10%, rgba(79,163,255,0.12), transparent 72%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: K.accentDeep, textAlign: 'center', marginBottom: 30 }}>
          {t('مصمّم لكل تخصص طبي في المملكة', 'Built for every medical specialty in the Kingdom')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
          {clinics.map((c, i) => (
            <motion.span
              key={i}
              className="ca-chip"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="ca-chip-dot" />
              {c}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Why us — statement + outcome stats ──────────────────────────── */
const WhyUs = () => {
  const { t, dir } = useLanguage()
  const stats = [
    { n: '+500K', l: t('محادثة ذكية', 'smart conversations') },
    { n: '92.9%', l: t('معدل الرد الآلي', 'automated answer rate') },
    { n: '4.8/5', l: t('رضا المرضى', 'patient satisfaction') },
    { n: '24/7', l: t('تشغيل بلا توقّف', 'always-on operation') },
  ]
  return (
    <section dir={dir} style={{ position: 'relative', background: K.bgAlt, padding: '110px 0', borderBottom: `1px solid ${K.rule}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 80% 0%, rgba(122,79,232,0.10), transparent 65%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('ليش مدار', 'Why us')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.6vw,46px)', color: K.ink, lineHeight: 1.32, maxWidth: 860, marginBottom: 56 }}>
          {t('كل وكيل نطلقه يُقاس بنتيجة حقيقية على عيادتك — مواعيد محجوزة، ساعات موفّرة، وتكاليف استقبال أقل.', "Every agent we deploy is measured against a real clinic outcome — appointments booked, hours saved, and lower front-desk costs.")}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }} className="clinic-ai-4col">
          {stats.map((s, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.07 }} className="ca-card ca-toppad" style={{ background: 'linear-gradient(180deg, rgba(79,163,255,0.06), rgba(255,255,255,0.015))', border: `1px solid ${K.rule}`, borderRadius: 16, padding: '30px 26px' }}>
              <div className="ca-num" style={{ fontFamily: display, fontSize: 46, fontVariantNumeric: 'tabular-nums', marginBottom: 8, lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontFamily: body, fontSize: 13.5, color: K.ink2 }}>{s.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Problem vs Solution comparison ──────────────────────────────── */
const ProblemSolution = () => {
  const { t, dir } = useLanguage()
  const rows = [
    { k: t('المكالمات الفائتة', 'Missed calls'), m: t('٣٥٪ من المكالمات تضيع يومياً بسبب انشغال الاستقبال.', '35% of calls are lost daily to a busy front desk.'), a: t('يرد على كل مكالمة على مدار الساعة بدون أي فوات.', 'Answers every call around the clock — nothing missed.') },
    { k: t('الرد على واتساب', 'WhatsApp replies'), m: t('٤٥٪ من المرضى يتجهون لمنافس بسبب تأخّر الرد.', '45% of patients switch to a competitor over slow replies.'), a: t('رد فوري خلال ثوانٍ يحافظ على ثقة المريض وحجزه.', 'Instant reply in seconds keeps the patient and the booking.') },
    { k: t('نسيان المواعيد', 'Forgotten appointments'), m: t('٣٠٪ متوسط المواعيد المفقودة بسبب غياب التذكير.', '30% of appointments missed with no reminders.'), a: t('تذكير وتأكيد تلقائي يقلّل الغياب بشكل كبير.', 'Automatic reminders and confirmations cut no-shows sharply.') },
    { k: t('ضغط الموظفين', 'Staff overload'), m: t('٧٠٪ من وقت الموظفين يضيع في مهام متكررة.', '70% of staff time goes to repetitive tasks.'), a: t('الوكيل يتولّى المتكرر ويصعّد المهم فقط للفريق.', 'The agent handles the repetitive work, escalates only what matters.') },
    { k: t('تقييمات Google', 'Google reviews'), m: t('٦٠٪ من المرضى يراجعون التقييمات قبل الحجز.', '60% of patients read reviews before booking.'), a: t('ردود ذكية على تعليقات قوقل ماب تحسّن سمعتك.', 'Smart replies to Google Maps reviews lift your reputation.') },
  ]
  return (
    <section dir={dir} style={{ background: K.bg, padding: '110px 0' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('المشكلة مقابل الحل', 'Problem vs solution')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 14 }}>
          {t('من الفوضى اليدوية إلى وضوح مؤتمت', 'From manual chaos to automated clarity')}
        </motion.h2>
        <motion.p {...rv} style={{ fontFamily: body, fontSize: 15.5, color: K.ink2, maxWidth: 620, marginBottom: 48, lineHeight: 1.85 }}>
          {t('شوف بالضبط وش يتغيّر لما الذكاء الاصطناعي يتولّى الشغل المتكرر اللي ما يفترض فريقك يضيّع وقته فيه.', "See exactly what changes when AI handles the repetitive work your team shouldn't be doing.")}
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 0, border: `1px solid ${K.rule}`, borderRadius: 16, overflow: 'hidden' }} className="clinic-ai-ps">
          <div style={{ padding: '18px 22px', background: '#0B1526', borderInlineEnd: `1px solid ${K.rule}` }} />
          <div style={{ padding: '18px 22px', background: '#0B1526', borderInlineEnd: `1px solid ${K.rule}`, fontFamily: body, fontWeight: 700, fontSize: 14, color: K.ink3 }}>{t('يدوياً', 'Manual')}</div>
          <div style={{ padding: '18px 22px', background: 'rgba(37,99,235,0.14)', fontFamily: body, fontWeight: 700, fontSize: 14, color: K.accentDeep }}>{t('مع وكلاء مدار', 'With Madar agents')}</div>
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              <div style={{ padding: '18px 22px', background: '#0B1526', borderInlineEnd: `1px solid ${K.rule}`, borderTop: `1px solid ${K.rule}`, fontFamily: body, fontWeight: 600, fontSize: 13.5, color: K.ink }}>{r.k}</div>
              <div style={{ padding: '18px 22px', borderInlineEnd: `1px solid ${K.rule}`, borderTop: `1px solid ${K.rule}`, fontFamily: body, fontSize: 13, color: K.ink2, lineHeight: 1.7 }}>{r.m}</div>
              <div style={{ padding: '18px 22px', borderTop: `1px solid ${K.rule}`, background: 'rgba(37,99,235,0.05)', fontFamily: body, fontSize: 13, color: K.ink, lineHeight: 1.7, display: 'flex', gap: 8 }}>
                <Check size={16} color={K.accent} style={{ flexShrink: 0, marginTop: 2 }} />{r.a}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Services ────────────────────────────────────────────────────── */
const Services = () => {
  const { t, dir } = useLanguage()
  const items = [
    { icon: Phone, title: t('الوكيل الصوتي (AI Voice Agent)', 'AI Voice Agent'), body: t('يستقبل المكالمات ٢٤/٧، يجاوب الأسئلة، يحجز ويعدّل المواعيد، ويحوّل المكالمة للموظف عند الحاجة — بصوت طبيعي باللهجة العربية.', 'Answers calls 24/7, handles questions, books and edits appointments, and transfers to staff when needed — natural Arabic voice.') },
    { icon: MessageCircle, title: t('وكيل واتساب الذكي', 'WhatsApp AI Agent'), body: t('رد فوري على كل رسالة، حجز وتعديل المواعيد، الرد على الأسئلة، إرسال الموقع والأسعار، ومتابعة المريض.', 'Instant reply to every message — booking, editing, Q&A, sending location and pricing, and patient follow-up.') },
    { icon: Calendar, title: t('أتمتة المواعيد', 'Appointment Automation'), body: t('تذكير وتأكيد تلقائي، إعادة جدولة وإلغاء بسهولة، وتقليل حالات عدم الحضور (No-Shows).', 'Automatic reminders and confirmations, easy rescheduling, and fewer no-shows.') },
    { icon: Bell, title: t('متابعة ما بعد الزيارة', 'Post-Visit Automation'), body: t('رسالة شكر بعد الزيارة، طلب تقييم Google، متابعة حالة المريض، وعرض خدمات مستقبلية.', 'Post-visit thank-you, Google review requests, patient status follow-up, and future offers.') },
    { icon: Zap, title: t('ردود قوقل ماب الذكية', 'Google Maps Reviews AI'), body: t('يراقب التعليقات الجديدة ويرد عليها بذكاء بأسلوب يعزّز سمعة عيادتك ويزيد تقييماتك.', 'Monitors new reviews and replies intelligently in a way that boosts your reputation and ratings.') },
    { icon: BarChart3, title: t('لوحة التحكم والتقارير', 'Dashboard & Analytics'), body: t('كل بيانات عيادتك في مكان واحد — محادثات، حجوزات، إيرادات، وأداء الذكاء الاصطناعي لحظة بلحظة.', "All your clinic's data in one place — conversations, bookings, revenue, and AI performance in real time.") },
  ]
  return (
    <section id="services" dir={dir} style={{ position: 'relative', background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}`, borderBottom: `1px solid ${K.rule}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 45% at 15% 5%, rgba(79,163,255,0.10), transparent 62%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('منصة مدار الذكية', 'The Madar platform')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 14 }}>
          {t('نظام متكامل لإدارة تواصل عيادتك بأكمله', "One system to manage all your clinic's communication")}
        </motion.h2>
        <motion.p {...rv} style={{ fontFamily: body, fontSize: 15.5, color: K.ink2, maxWidth: 640, marginBottom: 52, lineHeight: 1.85 }}>
          {t('وكلاء ذكاء اصطناعي صوتيون وكتابيون يديرون المكالمات وواتساب والحجوزات والمتابعة وردود قوقل ماب — كل ذلك على مدار الساعة.', 'Voice and text AI agents that manage calls, WhatsApp, bookings, follow-ups, and Google Maps replies — all around the clock.')}
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }} className="clinic-ai-2col">
          {items.map((c, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.06 }} className="ca-card ca-toppad" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))', borderRadius: 16, padding: 34, border: `1px solid ${K.rule}` }}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'linear-gradient(140deg, rgba(79,163,255,0.28), rgba(122,79,232,0.18))', border: '1px solid rgba(79,163,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: '0 8px 22px -8px rgba(79,163,255,0.5)' }}>
                <c.icon size={22} color="#CFE2FF" />
              </div>
              <h3 style={{ fontFamily: body, fontWeight: 700, fontSize: 18, color: K.ink, marginBottom: 10 }}>{c.title}</h3>
              <p style={{ fontFamily: body, fontSize: 14.5, lineHeight: 1.85, color: K.ink2 }}>{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Big outcome metrics (before/after) ──────────────────────────── */
const Metrics = () => {
  const { t, dir } = useLanguage()
  const items = [
    { n: t('+٢٨٪', '+28%'), h: t('زيادة في عدد الحجوزات', 'more bookings'), b: t('مواعيد أكثر تُحجز تلقائياً عبر الوكيل الصوتي وواتساب على مدار الساعة.', 'more appointments booked automatically via the voice and WhatsApp agents, 24/7.') },
    { n: t('-٧٠٪', '-70%'), h: t('تقليل عدم الحضور', 'fewer no-shows'), b: t('تذكيرات وتأكيدات تلقائية قبل كل موعد تقلّل الغياب بشكل كبير.', 'automatic reminders and confirmations before every visit sharply cut no-shows.') },
    { n: t('+٣٦٪', '+36%'), h: t('تحسّن تقييمات Google', 'better Google reviews'), b: t('ردود ذكية على تعليقات قوقل ماب ترفع سمعة عيادتك وثقة المرضى الجدد.', 'smart replies to Google Maps reviews raise your reputation and new-patient trust.') },
  ]
  return (
    <section dir={dir} style={{ position: 'relative', background: K.bg, padding: '110px 0', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 55% at 50% 100%, rgba(79,163,255,0.12), transparent 68%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('النتائج', 'Results')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 56, maxWidth: 720 }}>
          {t('عيادتك قبل وبعد وكلاء مدار', 'Your clinic before and after Madar agents')}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="clinic-ai-3col">
          {items.map((m, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.08 }} className="ca-card ca-toppad" style={{ background: `linear-gradient(160deg, rgba(79,163,255,0.16), #0B1424)`, border: '1px solid rgba(79,163,255,0.22)', borderRadius: 18, padding: 34 }}>
              <div className="ca-num" style={{ fontFamily: display, fontSize: 52, marginBottom: 6, lineHeight: 1 }}>{m.n}</div>
              <div style={{ fontFamily: body, fontWeight: 700, fontSize: 15, color: K.accentDeep, marginBottom: 14 }}>{m.h}</div>
              <p style={{ fontFamily: body, fontSize: 14, lineHeight: 1.8, color: K.ink2 }}>{m.b}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Dashboard preview ───────────────────────────────────────────── */
const CaseStudy = () => {
  const { t, dir } = useLanguage()
  const tiles = [
    { n: '1,248', l: t('إجمالي الحجوزات', 'Total bookings'), d: '+28%' },
    { n: '90.2%', l: t('معدل الحضور', 'Attendance rate'), d: '+6%' },
    { n: '482,650', l: t('إجمالي الإيرادات (ر.س)', 'Total revenue (SAR)'), d: '+32%' },
    { n: '4.8/5', l: t('رضا المرضى', 'Patient satisfaction'), d: '+4.8%' },
  ]
  return (
    <section id="dashboard" dir={dir} style={{ background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}`, borderBottom: `1px solid ${K.rule}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('لوحة التحكم والتقارير', 'Dashboard & analytics')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(26px,3.2vw,40px)', color: K.ink, marginBottom: 48, maxWidth: 820, lineHeight: 1.32 }}>
          {t('كل بيانات عيادتك في مكان واحد، لحظة بلحظة.', "All your clinic's data in one place, in real time.")}
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 24 }} className="clinic-ai-2col">
          <motion.div {...rv} className="ca-card" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))', border: `1px solid ${K.rule}`, borderRadius: 18, padding: 34 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <img src="/logo-main.png" alt="Madar" style={{ height: 26, width: 'auto' }} />
              <span style={{ fontFamily: body, fontSize: 13, color: K.ink3 }}>{t('نظرة عامة على أداء عيادتك', "Your clinic's performance at a glance")}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {tiles.map((tl, i) => (
                <div key={i} style={{ background: K.bgAlt, border: `1px solid ${K.rule}`, borderRadius: 14, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: display, fontSize: 30, color: K.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{tl.n}</div>
                    <div style={{ fontFamily: mono, fontSize: 12, color: '#4ADE80' }}>{tl.d}</div>
                  </div>
                  <div style={{ fontFamily: body, fontSize: 12.5, color: K.ink2, marginTop: 10 }}>{tl.l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 30, marginTop: 26, paddingTop: 22, borderTop: `1px solid ${K.rule}` }}>
              <div><div style={{ fontFamily: display, fontSize: 26, color: K.accentDeep }}>3,682</div><div style={{ fontFamily: body, fontSize: 12, color: K.ink2 }}>{t('محادثة ذكية', 'AI conversations')}</div></div>
              <div><div style={{ fontFamily: display, fontSize: 26, color: K.accentDeep }}>92.9%</div><div style={{ fontFamily: body, fontSize: 12, color: K.ink2 }}>{t('معدل الرد الآلي', 'answer rate')}</div></div>
            </div>
          </motion.div>
          <motion.div {...rv} transition={{ ...rv.transition, delay: 0.1 }} style={{ background: `linear-gradient(160deg, ${K.cardHi}, #0B1526)`, border: `1px solid ${K.rule}`, borderRadius: 18, padding: 34, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: display, fontSize: 60, color: K.accentDeep, lineHeight: 0.8, marginBottom: 18 }}>&ldquo;</div>
            <p style={{ fontFamily: display, fontWeight: 500, fontSize: 20, color: K.ink, lineHeight: 1.6, marginBottom: 24 }}>
              {t('لا نقدّم مجرد أداة — نحن شريك ذكي لنمو عيادتك وتحقيق تجربة لا تُنسى للمرضى.', "We don't just offer a tool — we're a smart partner for your clinic's growth and an unforgettable patient experience.")}
            </p>
            <div style={{ fontFamily: body, fontWeight: 700, fontSize: 14.5, color: K.ink }}>{t('فريق مدار', 'The Madar team')}</div>
            <div style={{ fontFamily: body, fontSize: 12.5, color: K.ink3 }}>{t('منصة ذكاء اصطناعي سعودية للعيادات', 'Saudi AI platform for clinics')}</div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─── Specialties (industries) ────────────────────────────────────── */
const Specialties = () => {
  const { t, dir } = useLanguage()
  const items = [
    t('أسنان وتقويم', 'Dental & ortho'), t('جلدية وتجميل', 'Derm & aesthetics'), t('أطفال', 'Pediatrics'),
    t('عيون', 'Ophthalmology'), t('جراحة تجميل', 'Cosmetic surgery'), t('أنف وأذن', 'ENT'),
    t('نساء وولادة', 'OB-GYN'), t('عام وأسرة', 'General & family'),
  ]
  return (
    <section dir={dir} style={{ background: K.bg, padding: '110px 0' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('التخصصات', 'Specialties')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 14 }}>
          {t('نتائج حقيقية عبر كل تخصص نخدمه', 'Real results across every specialty we serve')}
        </motion.h2>
        <motion.p {...rv} style={{ fontFamily: body, fontSize: 15.5, color: K.ink2, maxWidth: 640, marginBottom: 48, lineHeight: 1.85 }}>
          {t('طلّقنا وكلاء لعيادات ما تتحمّل رد بطيء ولا موعد ضائع ولا اختناق يدوي بالاستقبال.', "We've deployed agents for clinics that can't afford slow replies, missed appointments, or manual bottlenecks.")}
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }} className="clinic-ai-4col">
          {items.map((s, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.04 }} style={{ background: K.card, border: `1px solid ${K.rule}`, borderRadius: 12, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: K.accent, transform: 'rotate(45deg)', flexShrink: 0 }} />
              <span style={{ fontFamily: body, fontSize: 14.5, color: K.ink }}>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Integrations — glass cards with real brand logos ────────────── */
const Tools = () => {
  const { t, dir } = useLanguage()
  const integrations = [
    { logo: '/logos/whatsapp.svg', name: 'WhatsApp Business', label: t('المكالمات والرسائل', 'Calls & messages') },
    { logo: '/logos/google-calendar.svg', name: 'Google Calendar', label: t('مزامنة وإدارة المواعيد', 'Appointment sync') },
    { logo: '/logos/google-maps.svg', name: 'Google Maps', label: t('الرد على التقييمات', 'Reviews & replies') },
    { logo: '/logos/instagram.svg', name: 'Meta', label: t('رسائل إنستقرام وفيسبوك', 'Instagram & Facebook DMs') },
    { logo: '/logos/twilio.svg', name: 'SMS', label: t('تذكيرات ورسائل نصية', 'SMS reminders') },
    { logo: '/logos/stripe.svg', name: 'Payments', label: t('المدفوعات والفواتير', 'Payments & invoices') },
  ]
  return (
    <section dir={dir} style={{ position: 'relative', background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}`, borderBottom: `1px solid ${K.rule}`, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 50% 50% at 50% 0%, rgba(79,163,255,0.08), rgba(0,0,0,0) 70%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('التكاملات · +٢٠ تكامل جاهز', 'Integrations · 20+ ready')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 14 }}>
          {t('نربط كل ما تحتاجه عيادتك في مكان واحد', "We connect everything your clinic needs in one place")}
        </motion.h2>
        <motion.p {...rv} style={{ fontFamily: body, fontSize: 15.5, color: K.ink2, maxWidth: 660, marginBottom: 52, lineHeight: 1.85 }}>
          {t('APIs مفتوحة وأكثر من ٢٠ تكاملاً جاهزاً — نوصل الوكيل بأنظمتك الحالية ويشتغل داخلها بسلاسة، بدون ما تغيّر طريقة عملك.', "Open APIs and 20+ ready integrations — the agent plugs into your existing stack and runs inside it, no change to how you work.")}
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }} className="clinic-ai-3col">
          {integrations.map((it, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.06 }} className="liquid-glass" style={{ borderRadius: 18, padding: '26px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ width: 46, height: 46, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={it.logo} alt={it.name} style={{ width: 40, height: 40, objectFit: 'contain', display: 'block' }} />
              </span>
              <span>
                <span style={{ display: 'block', fontFamily: body, fontWeight: 700, fontSize: 15.5, color: K.ink }}>{it.name}</span>
                <span style={{ display: 'block', fontFamily: body, fontSize: 12.5, color: K.ink2, marginTop: 3 }}>{it.label}</span>
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div {...rv} style={{ marginTop: 40, paddingTop: 30, borderTop: `1px solid ${K.rule}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '12px 36px' }}>
          <span style={{ fontFamily: body, fontSize: 12.5, color: K.ink3 }}>{t('ويتكامل مع الأدوات اللي تستخدمها كل يوم:', 'Works with the tools you use every day:')}</span>
          {['HubSpot', 'Salesforce', 'Zoho', 'Mailchimp', 'Twilio', 'Stripe'].map(n => (
            <span key={n} style={{ fontFamily: display, fontSize: 18, color: K.ink2, opacity: 0.7 }}>{n}</span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ─── About / values (من نحن) ─────────────────────────────────────── */
const Testimonials = () => {
  const { t, dir } = useLanguage()
  const items = [
    { tag: t('رؤيتنا', 'Our vision'), q: t('أن نكون الشريك الأول للعيادات في التحول الرقمي باستخدام الذكاء الاصطناعي.', 'To be the first partner for clinics in their digital transformation with AI.') },
    { tag: t('رسالتنا', 'Our mission'), q: t('تمكين العيادات من تقديم تجربة مريض استثنائية وزيادة النمو والكفاءة من خلال الذكاء الاصطناعي.', 'Empowering clinics to deliver an exceptional patient experience and grow with AI.') },
    { tag: t('قيمنا', 'Our values'), q: t('تركيز على نجاح العميل، ابتكار مستمر، شفافية وموثوقية، وجودة في كل تفاعل.', 'Focus on client success, continuous innovation, transparency and trust, and quality in every interaction.') },
  ]
  return (
    <section dir={dir} style={{ position: 'relative', background: K.bg, padding: '110px 0', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 45% 50% at 85% 20%, rgba(122,79,232,0.10), transparent 62%)' }} />
      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <Eyebrow>{t('من نحن', 'About us')}</Eyebrow>
        <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, marginBottom: 20, maxWidth: 820, lineHeight: 1.32 }}>
          {t('منصة ذكاء اصطناعي سعودية متخصّصة في أتمتة تواصل العيادات', 'A Saudi AI platform specialized in automating clinic communication')}
        </motion.h2>
        <motion.p {...rv} style={{ fontFamily: body, fontSize: 15.5, color: K.ink2, maxWidth: 720, marginBottom: 52, lineHeight: 1.9 }}>
          {t('فريق سعودي من خبراء الذكاء الاصطناعي وتقنية المعلومات بخبرة عميقة في قطاع الرعاية الصحية — نبني وكلاء صوتيين وكتابيين يديرون تواصل عيادتك بالكامل على مدار الساعة.', 'A Saudi team of AI and IT experts with deep healthcare experience — we build voice and text agents that fully manage your clinic communication around the clock.')}
        </motion.p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="clinic-ai-3col">
          {items.map((it, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.08 }} className="ca-card ca-toppad" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))', border: `1px solid ${K.rule}`, borderRadius: 18, padding: 32, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontFamily: mono, fontSize: 11.5, color: K.accentDeep, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>{it.tag}</div>
              <p style={{ fontFamily: body, fontSize: 15, lineHeight: 1.9, color: K.ink, flex: 1 }}>{it.q}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Blog ────────────────────────────────────────────────────────── */
const Blog = () => {
  const { t, dir } = useLanguage()
  const posts = [
    { cat: t('استراتيجية', 'Strategy'), date: t('١٧ مارس ٢٠٢٦', 'Mar 17, 2026'), title: t('كيف تحسب العائد المتوقّع من وكيل ذكاء اصطناعي لعيادتك', 'How to estimate the ROI of an AI agent for your clinic'), g: 'linear-gradient(135deg, #2563EB, #1E3A6E)' },
    { cat: t('وكلاء AI', 'AI agents'), date: t('١ أبريل ٢٠٢٦', 'Apr 1, 2026'), title: t('وش يسوّي وكيل الذكاء الاصطناعي فعلياً ولماذا تحتاجه عيادتك', 'What AI agents actually do and why your clinic needs one'), g: 'linear-gradient(135deg, #1A4FA0, #0C1A2E)' },
    { cat: t('أتمتة', 'Automation'), date: t('٢٤ مارس ٢٠٢٦', 'Mar 24, 2026'), title: t('٥ مهام استقبال تؤتمتها قبل ما توظّف موظف جديد', '5 front-desk tasks to automate before hiring again'), g: 'linear-gradient(135deg, #3D4F6A, #111F38)' },
  ]
  return (
    <section dir={dir} style={{ background: K.bgAlt, padding: '110px 0', borderTop: `1px solid ${K.rule}`, borderBottom: `1px solid ${K.rule}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 44, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Eyebrow>{t('المدونة', 'Blog')}</Eyebrow>
            <motion.h2 {...rv} style={{ fontFamily: display, fontWeight: 500, fontSize: 'clamp(28px,3.4vw,42px)', color: K.ink, margin: 0 }}>
              {t('رؤى عملية عن وكلاء الذكاء الاصطناعي والأتمتة', 'Practical insights on AI agents and automation')}
            </motion.h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="clinic-ai-3col">
          {posts.map((p, i) => (
            <motion.div key={i} {...rv} transition={{ ...rv.transition, delay: i * 0.08 }} className="ca-card" style={{ background: K.card, border: `1px solid ${K.rule}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ height: 160, background: p.g }} />
              <div style={{ padding: 24 }}>
                <div style={{ fontFamily: mono, fontSize: 11, color: K.ink3, letterSpacing: '0.06em', marginBottom: 12 }}>{p.cat} · {p.date}</div>
                <h3 style={{ fontFamily: body, fontWeight: 700, fontSize: 16, color: K.ink, lineHeight: 1.6, marginBottom: 16 }}>{p.title}</h3>
                <span style={{ fontFamily: body, fontSize: 13, fontWeight: 600, color: K.accentDeep }}>{t('اقرأ المزيد ←', 'Read more →')}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */
export const ClinicAILanding = () => {
  const { dir } = useLanguage()
  return (
    <div dir={dir} style={{ fontFamily: body, background: K.bg }}>
      <style>{`
        @keyframes clinicAiPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.65); }
        }
        .clinic-ai-pulse-dot { animation: clinicAiPulse 1.6s ease-in-out infinite; }
        .clinic-ai-btn-primary { position: relative; }
        .clinic-ai-btn-primary::after {
          content: ''; position: absolute; inset: -6px; border-radius: 999px;
          border: 1px solid rgba(154,171,255,0.35);
          animation: clinicAiRingPulse 2.2s ease-out infinite;
        }
        @keyframes clinicAiRingPulse {
          0% { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.28); }
        }
        .clinic-ai-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 116px 116px;
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 42%, transparent 68%);
          mask-image: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 42%, transparent 68%);
        }
        .clinic-ai-trust-pad { padding-top: 40px !important; }
        .liquid-glass {
          background: rgba(255,255,255,0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border: none;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.1);
          position: relative;
          overflow: hidden;
        }
        .liquid-glass::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px;
          background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
        }
        .liquid-glass-strong {
          background: rgba(255,255,255,0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(50px);
          -webkit-backdrop-filter: blur(50px);
          border: none;
          box-shadow: 4px 4px 4px rgba(0,0,0,0.05), inset 0 1px 1px rgba(255,255,255,0.15);
          position: relative; overflow: hidden;
        }
        .liquid-glass-strong::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px;
          background: linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.2) 80%, rgba(255,255,255,0.5) 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none;
        }
        .ca-chip {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 12px 22px; border-radius: 999px;
          font-family: 'IBM Plex Sans Arabic', Cairo, sans-serif; font-size: 14.5px; color: #EAF1FB;
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.10);
          transition: transform .28s cubic-bezier(.22,1,.36,1), border-color .28s ease, box-shadow .28s ease, background .28s ease;
        }
        .ca-chip:hover {
          transform: translateY(-3px);
          border-color: rgba(79,163,255,0.55);
          box-shadow: 0 14px 34px -12px rgba(79,163,255,0.5);
          background: linear-gradient(180deg, rgba(79,163,255,0.16), rgba(122,79,232,0.06));
        }
        .ca-chip-dot {
          width: 7px; height: 7px; border-radius: 2px; transform: rotate(45deg); flex-shrink: 0;
          background: linear-gradient(135deg, #4FA3FF, #A98BFF);
          box-shadow: 0 0 10px rgba(79,163,255,0.75);
        }
        .ca-card { transition: transform .3s cubic-bezier(.22,1,.36,1), border-color .3s ease, box-shadow .3s ease; }
        .ca-card:hover {
          transform: translateY(-5px);
          border-color: rgba(79,163,255,0.42) !important;
          box-shadow: 0 28px 56px -22px rgba(79,163,255,0.4);
        }
        .ca-num {
          background: linear-gradient(135deg, #8FC4FF 0%, #B79BFF 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          -webkit-text-fill-color: transparent;
        }
        .ca-toppad { position: relative; }
        .ca-toppad::before {
          content: ''; position: absolute; top: 0; inset-inline: 22px; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, transparent, rgba(79,163,255,0.7), rgba(167,139,255,0.5), transparent);
          opacity: 0; transition: opacity .3s ease;
        }
        .ca-card:hover.ca-toppad::before { opacity: 1; }
        @media (max-width: 900px) {
          .clinic-ai-nav-links { gap: 0 !important; }
          .clinic-ai-nav-links a { display: none !important; }
          .clinic-ai-nav-spacer { display: none !important; }
          .clinic-ai-4col { grid-template-columns: 1fr 1fr !important; }
          .clinic-ai-2col { grid-template-columns: 1fr !important; }
          .clinic-ai-3col { grid-template-columns: 1fr !important; }
          .clinic-ai-ps { grid-template-columns: 1fr !important; }
          .clinic-ai-partners { gap: 20px !important; }
        }
      `}</style>
      <AnnouncementBar />
      <Hero />
      <LogosStrip />
      <WhyUs />
      <ProblemSolution />
      <Services />
      <Metrics />
      <CaseStudy />
      <Specialties />
      <Tools />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <Blog />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
