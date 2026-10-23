import { useEffect, useRef } from 'react'
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, EllipseCurve, LineBasicMaterial, LineLoop, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Points, PointsMaterial, SRGBColorSpace, Scene, SphereGeometry, Sprite, SpriteMaterial, type Texture, Vector3, WebGLRenderer,
} from 'three'

/** One orbiting moon per area Jarvis watches (follow-ups, deals, money, agent messages). Size follows the count. */
export interface OrbitMoon { key: string; label: string; count: number; color: string }

const ORBITS = [
  { radius: 2.15, tilt: -0.32, roll: 0.18, speed: 0.22, phase: 0.4 },
  { radius: 1.7, tilt: 0.46, roll: -0.25, speed: -0.3, phase: 2.3 },
  { radius: 2.6, tilt: 0.08, roll: 0.05, speed: 0.15, phase: 4.2 },
  { radius: 1.95, tilt: -0.62, roll: -0.4, speed: -0.19, phase: 5.6 },
]

function dotTexture(): Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

/**
 * The agent as a particle core with the channels orbiting it. Sparks fly from a moon into
 * the core in proportion to that channel's traffic; `pulse` changing makes the core flare
 * (new activity), `busy` keeps it brighter. Pauses off-screen, renders one still frame for
 * reduced motion, and disposes everything on unmount.
 */
export default function OrbitScene({ moons, pulse = 0, busy = false }: { moons: OrbitMoon[]; pulse?: number; busy?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null)
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const live = useRef({ moons, pulse, busy, flareAt: 0 })

  useEffect(() => {
    if (live.current.pulse !== pulse) live.current.flareAt = performance.now()
    live.current = { ...live.current, moons, pulse, busy }
  }, [moons, pulse, busy])

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      return // no WebGL: the hero keeps its gradient background
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    el.prepend(renderer.domElement)

    const scene = new Scene()
    const camera = new PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0.35, 8.4)
    camera.lookAt(0, 0, 0)
    const tex = dotTexture()
    const disposables: { dispose: () => void }[] = [tex]

    // ── core: a fibonacci sphere of soft points ──
    const N = 1800
    const pos = new Float32Array(N * 3)
    const base = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = 2.399963 * i
      base.set([Math.cos(th) * r, y, Math.sin(th) * r], i * 3)
    }
    pos.set(base)
    const coreGeo = new BufferGeometry()
    coreGeo.setAttribute('position', new BufferAttribute(pos, 3))
    const coreMat = new PointsMaterial({ size: 0.055, map: tex, color: 0xa9b8ff, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 })
    const core = new Points(coreGeo, coreMat)
    core.rotation.x = 0.38
    scene.add(core)
    disposables.push(coreGeo, coreMat)

    const glowMat = new SpriteMaterial({ map: tex, color: 0x5f7dff, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.55 })
    const glow = new Sprite(glowMat)
    glow.scale.setScalar(3.2)
    scene.add(glow)
    const heartMat = new SpriteMaterial({ map: tex, color: 0xe1e8ff, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.7 })
    const heart = new Sprite(heartMat)
    heart.scale.setScalar(1.1)
    scene.add(heart)
    disposables.push(glowMat, heartMat)

    // ── orbits + moons ──
    type MoonObj = { pivot: Object3D; mesh: Mesh; halo: Sprite; orbit: typeof ORBITS[number] }
    const moonObjs: MoonObj[] = ORBITS.map((orbit, i) => {
      const pivot = new Object3D()
      pivot.rotation.set(orbit.tilt, 0, orbit.roll)
      scene.add(pivot)
      const curve = new EllipseCurve(0, 0, orbit.radius, orbit.radius, 0, Math.PI * 2)
      const lineGeo = new BufferGeometry().setFromPoints(curve.getPoints(128).map((p) => new Vector3(p.x, 0, p.y)))
      const lineMat = new LineBasicMaterial({ color: 0x5f7dff, transparent: true, opacity: 0.16 })
      pivot.add(new LineLoop(lineGeo, lineMat))
      const meshGeo = new SphereGeometry(1, 24, 16)
      const meshMat = new MeshBasicMaterial({ color: 0x5f7dff })
      const mesh = new Mesh(meshGeo, meshMat)
      pivot.add(mesh)
      const haloMat = new SpriteMaterial({ map: tex, color: 0x5f7dff, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.6 })
      const halo = new Sprite(haloMat)
      pivot.add(halo)
      disposables.push(lineGeo, lineMat, meshGeo, meshMat, haloMat)
      void i
      return { pivot, mesh, halo, orbit }
    })

    // ── sparks: pooled points flying moon → core ──
    const SP = 90
    const spPos = new Float32Array(SP * 3)
    const spCol = new Float32Array(SP * 3)
    const sparks = Array.from({ length: SP }, () => ({ on: false, t: 0, from: new Vector3(), mid: new Vector3(), color: new Color() }))
    const spGeo = new BufferGeometry()
    spGeo.setAttribute('position', new BufferAttribute(spPos, 3))
    spGeo.setAttribute('color', new BufferAttribute(spCol, 3))
    const spMat = new PointsMaterial({ size: 0.12, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending })
    scene.add(new Points(spGeo, spMat))
    disposables.push(spGeo, spMat)

    const tmp = new Vector3()
    const size = () => {
      const w = el.clientWidth, h = el.clientHeight
      if (w < 2 || h < 2) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // keep the widest orbit inside narrow frames
      camera.position.z = w / h < 1.2 ? 8.4 * (1.2 / (w / h)) ** 0.85 : 8.4
      camera.updateProjectionMatrix()
    }
    size()

    let raf = 0, last = performance.now(), visible = true
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = now / 1000
      const st = live.current
      const flare = Math.max(0, 1 - (now - st.flareAt) / 900) + (st.busy ? 0.35 : 0)
      const total = st.moons.reduce((a, m) => a + m.count, 0) || 1

      core.rotation.y += dt * (0.12 + flare * 0.25)
      const breathe = 1 + Math.sin(t * 1.5) * 0.02 + flare * 0.06
      for (let i = 0; i < N; i++) {
        const k = 1 + Math.sin(i * 0.37 + t * 2.2) * 0.012
        pos[i * 3] = base[i * 3] * breathe * k
        pos[i * 3 + 1] = base[i * 3 + 1] * breathe * k
        pos[i * 3 + 2] = base[i * 3 + 2] * breathe * k
      }
      coreGeo.attributes.position.needsUpdate = true
      glowMat.opacity = 0.45 + flare * 0.35
      heartMat.opacity = 0.55 + flare * 0.4
      heart.scale.setScalar(1.05 + flare * 0.35)

      moonObjs.forEach((mo, i) => {
        const m = st.moons[i]
        const show = !!m
        mo.pivot.visible = show
        const label = labels.current[i]
        if (!show) { if (label) label.style.opacity = '0'; return }
        const a = mo.orbit.phase + t * mo.orbit.speed
        mo.mesh.position.set(Math.cos(a) * mo.orbit.radius, 0, Math.sin(a) * mo.orbit.radius)
        const r = 0.07 + Math.min(0.12, Math.sqrt(m.count) * 0.018)
        mo.mesh.scale.setScalar(r)
        ;(mo.mesh.material as MeshBasicMaterial).color.set(m.color)
        mo.halo.position.copy(mo.mesh.position)
        mo.halo.scale.setScalar(r * 9)
        ;(mo.halo.material as SpriteMaterial).color.set(m.color)
        mo.mesh.getWorldPosition(tmp)
        // spawn sparks in proportion to this channel's share of the traffic
        if (m.count > 0 && Math.random() < dt * (0.6 + 3.2 * (m.count / total))) {
          const s = sparks.find((x) => !x.on)
          if (s) {
            s.on = true; s.t = 0; s.from.copy(tmp); s.color.set(m.color)
            s.mid.copy(tmp).multiplyScalar(0.5).add(new Vector3(0, 0.6, 0))
          }
        }
        if (label) {
          const p = tmp.clone().project(camera)
          const front = mo.mesh.getWorldPosition(new Vector3()).z > 0
          label.style.transform = `translate(-50%, -100%) translate(${((p.x + 1) / 2) * el.clientWidth}px, ${((1 - p.y) / 2) * el.clientHeight - 14}px)`
          label.style.opacity = front ? '1' : '0.45'
        }
      })

      sparks.forEach((s, i) => {
        if (!s.on) { spPos.set([0, 0, -99], i * 3); return }
        s.t += dt / 1.1
        if (s.t >= 1) { s.on = false; spPos.set([0, 0, -99], i * 3); return }
        const e = s.t * s.t * (3 - 2 * s.t), u = 1 - e
        spPos.set([u * u * s.from.x + 2 * u * e * s.mid.x, u * u * s.from.y + 2 * u * e * s.mid.y, u * u * s.from.z + 2 * u * e * s.mid.z], i * 3)
        const fade = 1 - s.t * 0.6
        spCol.set([s.color.r * fade, s.color.g * fade, s.color.b * fade], i * 3)
      })
      spGeo.attributes.position.needsUpdate = true
      spGeo.attributes.color.needsUpdate = true

      renderer.render(scene, camera)
      if (!reduced && visible) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const ro = new ResizeObserver(() => { size(); if (reduced) frame(performance.now()) })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting
      if (visible && !was && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame) }
    })
    io.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div ref={wrap} className="jv-scene">
      {ORBITS.map((_, i) => (
        <div key={i} ref={(n) => { labels.current[i] = n }} className="jv-moon-label" aria-hidden="true">
          {moons[i] && <><span>{moons[i].label}</span><b>{moons[i].count.toLocaleString('en')}</b></>}
        </div>
      ))}
    </div>
  )
}
