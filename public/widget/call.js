/*
 * Madar web call. Put this once in the page, before </body>:
 *   <script src="https://madar.software/widget/call.js" data-key="WIDGET_KEY" async></script>
 * Visitors press the button, allow the microphone, and talk to the company's voice agent in the browser.
 * The agent, allowed websites, button and call-panel look are all set in the dashboard
 * (الإضافات ← ودجة المكالمة عبر الويب) and read from there, so changing them needs no new code.
 * Also used by call.html: data-page="1" is the public direct-link page, data-preview="1" is the dashboard's live preview.
 */
(function () {
  'use strict'
  var API = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/web-call-token'
  var LIVEKIT = 'https://esm.sh/livekit-client@2.16.1'
  var script = document.currentScript
  if (!script) return
  var key = script.getAttribute('data-key') || ''
  var PAGE = script.getAttribute('data-page') === '1'
  var PREVIEW = script.getAttribute('data-preview') === '1'
  if (!PREVIEW && !/^[0-9a-f-]{36}$/i.test(key)) return

  var FONTS = {
    system: '"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif',
    rounded: 'Nunito,"Segoe UI",Tahoma,system-ui,sans-serif',
    serif: 'Georgia,"Times New Roman",serif',
    mono: 'ui-monospace,Menlo,Consolas,monospace'
  }
  var ICONS = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
    headset: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'
  }
  var TXT = {
    connecting: ['جارِ الاتصال…', 'نجهّز المكالمة'],
    agent: ['الوكيل يتكلم', 'اسمعه أو قاطعه'],
    user: ['أنت تتكلم', 'الوكيل يسمعك'],
    listen: ['متصل — تكلّم الآن', 'الوكيل يسمعك'],
    error: ['تعذّر الاتصال', 'جرّب مرة ثانية'],
    mic: ['اسمح بالمايك', 'المتصفح يحتاج إذن الميكروفون']
  }

  var cfg = null, P = null
  var host = document.createElement('div')
  host.setAttribute('data-madar-call', '')
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
  var styleEl = document.createElement('style')
  root.appendChild(styleEl)
  var wrap = document.createElement('div')
  root.appendChild(wrap)

  var room = null, audios = [], st = 'idle', clock = null, startedAt = 0, muted = false
  var btn, card, wave, titleEl, subEl, statusEl, timeEl, muteBtn, endBtn
  var cur = [245, 158, 11], curMode = 'connecting', curLevel = 0, sm = 0, raf = 0, lastT = 0, previewShow = 'panel'
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var wctx = null, WW = 200, WH = 56

  function hex(c, d) { return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : d }
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] }
  function num(v, a, b, d) { v = Number(v); return isFinite(v) ? Math.min(b, Math.max(a, v)) : d }
  function mmss(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2) }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function dark(theme) { return theme === 'dark' || (theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) }

  // ── look ──
  function build() {
    var c = cfg, p = c.panel
    P = p
    var color = hex(c.color, '#4f46e5'), brand = hex(p.brand, color)
    var isDark = p.fill === 'dark' || p.fill === 'full' || dark(p.theme && p.theme !== 'auto' ? p.theme : c.theme)
    var fill = p.fill || 'header'
    var bg = hex(p.bg, '') || (fill === 'dark' ? '#0d0d14' : fill === 'full' ? brand : isDark ? '#17171c' : fill === 'soft' ? 'color-mix(in srgb,' + brand + ' 9%,#fff)' : '#ffffff')
    var onBg = fill === 'full' || fill === 'dark' || (isDark && fill !== 'soft') ? '#f6f6f9' : '#16161d'
    if (fill === 'soft' && isDark) { bg = 'color-mix(in srgb,' + brand + ' 14%,#15151b)'; onBg = '#f6f6f9' }
    var dim = fill === 'full' ? 'rgba(255,255,255,.78)' : (onBg === '#f6f6f9' ? '#a8a8b3' : '#6b6b78')
    var hdBg = fill === 'header' ? 'linear-gradient(135deg,' + brand + ',color-mix(in srgb,' + brand + ' 68%,#000))' : 'transparent'
    var hdFg = fill === 'header' ? '#fff' : onBg
    var hdDim = fill === 'header' ? 'rgba(255,255,255,.82)' : dim
    var glow = fill === 'dark' ? 'radial-gradient(ellipse at 50% -10%,' + brand + '66,transparent 62%),' : ''
    var shadow = p.shadow === 'none' ? 'none' : p.shadow === 'strong' ? '0 24px 64px rgba(0,0,0,.45)' : '0 14px 40px rgba(0,0,0,.25)'
    var br = num(p.btnRadius, 0, 30, 22), w = num(p.width, 240, 380, 288), rad = num(p.radius, 0, 40, 22)
    var btnBg = p.btnStyle === 'filled' ? (fill === 'full' ? '#fff' : brand) : fill === 'full' ? 'rgba(255,255,255,.18)' : 'color-mix(in srgb,' + brand + ' 14%,transparent)'
    var btnFg = p.btnStyle === 'filled' ? (fill === 'full' ? brand : '#fff') : (fill === 'full' ? '#fff' : onBg)
    var endBg = hex(p.endColor, '') || '#dc2626'
    var endFg = p.btnStyle === 'filled' || !hex(p.endColor, '') ? (p.btnStyle === 'filled' ? '#fff' : '#b42318') : '#fff'
    var endBack = p.btnStyle === 'filled' ? endBg : hex(p.endColor, '') ? endBg : 'rgba(220,38,38,.14)'
    var size = c.size === 'sm' ? 46 : c.size === 'lg' ? 68 : 56
    var pos = c.position || 'br', V = pos.charAt(0) === 't' ? 'top' : 'bottom', H = pos.charAt(1) === 'l' ? 'left' : 'right'
    var inPlace = PAGE || PREVIEW
    styleEl.textContent = [
      '*{box-sizing:border-box;font-family:' + FONTS[p.font] + '}',
      '.wrap{' + (inPlace ? 'position:relative;' : 'position:fixed;' + V + ':20px;' + H + ':20px;') + 'z-index:2147483001;direction:rtl}',
      '.btn{border:0;border-radius:999px;background:' + color + ';color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:' + size + 'px;min-width:' + size + 'px;padding:0 ' + (c.label ? '20px' : '0') + ';font-size:14.5px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .15s;overflow:hidden}',
      '.btn img{width:100%;height:100%;object-fit:cover;display:block}',
      '.btn:hover{transform:scale(1.05)}.btn:focus-visible,.cb:focus-visible{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 5px ' + color + '}',
      '.btn[hidden],.card[hidden]{display:none}.btn.err{background:#b42318}',
      '.card{width:' + w + 'px;max-width:calc(100vw - 32px);background:' + glow + bg + ';color:' + onBg + ';border-radius:' + rad + 'px;box-shadow:' + shadow + ';overflow:hidden;' + (isDark || fill === 'soft' ? 'border:1px solid rgba(128,128,150,.22);' : 'border:1px solid rgba(0,0,0,.06);') + '}',
      '.hd{background:' + hdBg + ';color:' + hdFg + ';padding:22px 18px 16px;text-align:center;display:grid;justify-items:center;gap:6px;position:relative}',
      p.curve ? '.hd{padding-bottom:30px}.hd::after{content:"";position:absolute;inset:auto 0 -1px 0;height:16px;background:' + bg + ';border-radius:50% 50% 0 0/100% 100% 0 0}' : '',
      '.av{width:62px;height:62px;border-radius:' + (p.avatarShape === 'rounded' ? '18px' : '50%') + ';background:#0b0b10;display:grid;place-items:center;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.35);color:#fff}',
      '.av img{width:100%;height:100%;object-fit:cover}',
      '.title{font-size:17px;font-weight:700;line-height:1.3}.sub{font-size:12.5px;color:' + hdDim + '}',
      '.bd{padding:6px 16px 14px;display:grid;justify-items:center;gap:10px}',
      '.wave{width:100%;max-width:' + (w - 40) + 'px;height:54px;display:block}',
      '.pill{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 12px;border-radius:999px;background:rgba(128,128,150,.16);color:' + dim + '}',
      '.pill i{width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block}.pill.off i{background:#f59e0b}',
      '.row{display:flex;gap:8px;width:100%}',
      '.cb{flex:1;border:0;height:42px;border-radius:' + br + 'px;font-size:13.5px;font-weight:600;cursor:pointer;background:' + btnBg + ';color:' + btnFg + '}',
      '.cb.end{background:' + endBack + ';color:' + endFg + '}.cb.on{opacity:.65}',
      '.pw{display:block;text-align:center;padding:0 0 10px;font-size:10.5px;color:' + dim + ';opacity:.8;text-decoration:none;direction:ltr;font-family:system-ui,sans-serif}.pw:hover{opacity:1;text-decoration:underline}',
      '.time{direction:ltr;font-variant-numeric:tabular-nums;font-size:12px;color:' + dim + '}',
      p.layout === 'compact' ? '.card{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:10px 12px}.pw{flex-basis:100%;padding:0}.hd{padding:0;background:none;color:' + onBg + ';display:flex;gap:10px;text-align:start;justify-items:start}.hd::after{display:none}.av{width:44px;height:44px;border-radius:' + (p.avatarShape === 'rounded' ? '12px' : '50%') + '}.bd{padding:0;flex:1;grid-auto-flow:column;gap:8px;justify-items:end}.wave{display:none}.time{display:none}.row{width:auto}.cb{flex:none;padding:0 12px;height:38px}.sub{color:' + dim + '}' : '',
      p.layout === 'centered' ? '.hd{padding-top:26px}.av{width:76px;height:76px}.hd{color:' + onBg + '}.sub{color:' + dim + '}' : '',
      '@media (prefers-reduced-motion:reduce){.btn{transition:none!important}}'
    ].join('')

    var icon = c.iconUrl && /^https:\/\//.test(c.iconUrl)
      ? '<img src="' + esc(c.iconUrl) + '" alt="">'
      : '<svg width="' + Math.round(size * 0.42) + '" height="' + Math.round(size * 0.42) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[c.icon] || ICONS.phone) + '</svg>'
    var avatar = p.avatar === 'image' && /^https:\/\//.test(p.avatarImage || '')
      ? '<img src="' + esc(p.avatarImage) + '" alt="">'
      : '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 10v4M9 7v10M13 4v16M17 8v8M21 11v2"/></svg>'
    wrap.className = 'wrap'
    wrap.innerHTML =
      '<button type="button" class="btn">' + icon + (c.label ? '<span class="t">' + esc(c.label) + '</span>' : '') + '</button>' +
      '<div class="card" hidden role="status" aria-live="polite">' +
        '<div class="hd"><div class="av">' + avatar + '</div><div><div class="title"></div>' + (p.subOn ? '<div class="sub"></div>' : '') + '</div></div>' +
        '<div class="bd">' + (p.indicatorOn ? '<canvas class="wave" aria-hidden="true"></canvas>' : '') + '<span class="pill"><i></i><span class="st"></span></span><span class="time"></span>' +
          '<div class="row">' + (p.muteOn ? '<button type="button" class="cb mute">كتم</button>' : '') + '<button type="button" class="cb end">إنهاء</button></div></div>' +
        '<a class="pw" href="https://madar.software" target="_blank" rel="noopener">Powered by madar.software</a>' +
      '</div>'
    btn = wrap.querySelector('.btn'); card = wrap.querySelector('.card'); wave = wrap.querySelector('.wave')
    titleEl = wrap.querySelector('.title'); subEl = wrap.querySelector('.sub'); statusEl = wrap.querySelector('.st'); timeEl = wrap.querySelector('.time')
    muteBtn = wrap.querySelector('.mute'); endBtn = wrap.querySelector('.end')
    titleEl.textContent = p.title || 'تحدث معنا'
    if (subEl) subEl.textContent = p.sub || ''
    btn.setAttribute('aria-label', c.label || 'اتصل بنا')
    wctx = wave ? wave.getContext('2d') : null
    btn.addEventListener('click', start)
    endBtn.addEventListener('click', function () { if (PREVIEW) return; cleanup(); set('idle') })
    if (muteBtn) muteBtn.addEventListener('click', function () {
      if (!room || PREVIEW) return
      muted = !muted; muteBtn.textContent = muted ? 'إلغاء الكتم' : 'كتم'; muteBtn.classList.toggle('on', muted)
      try { room.localParticipant.setMicrophoneEnabled(!muted) } catch (e) {}
    })
  }

  // ── indicator ──
  function setupWave() {
    if (!wave) return
    var dpr = Math.min(window.devicePixelRatio || 1, 2)
    WW = wave.clientWidth || 200; WH = 54
    wave.width = Math.round(WW * dpr); wave.height = Math.round(WH * dpr); wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  function col(a, k) { k = k == null ? 1 : k; return 'rgba(' + Math.round(Math.min(255, cur[0] * k)) + ',' + Math.round(Math.min(255, cur[1] * k)) + ',' + Math.round(Math.min(255, cur[2] * k)) + ',' + a + ')' }
  function target() {
    var brand = rgb(hex(P.brand, hex(cfg.color, '#4f46e5')))
    return curMode === 'agent' ? brand : curMode === 'user' ? [34, 197, 94] : curMode === 'listen' ? [143, 152, 196] : [245, 158, 11]
  }
  function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now
    var t = now / 1000, tgt = target()
    for (var i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 6)
    var lvl = curLevel
    if (PREVIEW) { var sp0 = t * 3; lvl = curMode === 'agent' || curMode === 'user' ? 0.12 + 0.07 * Math.sin(sp0) + 0.05 * Math.sin(sp0 * 2.3) : 0 }
    var want = curMode === 'agent' || curMode === 'user' ? Math.min(1, Math.max(0.22, lvl * 4)) : curMode === 'connecting' ? 0.2 + 0.12 * Math.sin(t * 4) : 0.06 + 0.03 * Math.sin(t * 1.6)
    sm += (want - sm) * Math.min(1, dt * 10)
    var a = reduce ? (curMode === 'agent' || curMode === 'user' ? 0.5 : 0.08) : sm, sp = reduce ? 0 : t, cy = WH / 2
    wctx.clearRect(0, 0, WW, WH)
    var kind = P.indicator
    if (kind === 'bars') {
      var n = 11, gap = 5, bw = (WW - gap * (n - 1)) / n
      for (var b = 0; b < n; b++) {
        var h = 4 + (WH - 8) * a * (0.35 + 0.65 * Math.abs(Math.sin(sp * 3 + b * 0.8)))
        wctx.fillStyle = col(0.95); wctx.beginPath(); wctx.roundRect ? wctx.roundRect(b * (bw + gap), cy - h / 2, bw, h, bw / 2) : wctx.rect(b * (bw + gap), cy - h / 2, bw, h); wctx.fill()
      }
    } else if (kind === 'orb') {
      var r = 10 + a * 16, g = wctx.createRadialGradient(WW / 2, cy, 2, WW / 2, cy, r * 1.9)
      g.addColorStop(0, col(0.95, 1.1)); g.addColorStop(0.45, col(0.6)); g.addColorStop(1, col(0))
      wctx.fillStyle = g; wctx.beginPath(); wctx.arc(WW / 2, cy, r * 1.9, 0, 6.283); wctx.fill()
      wctx.fillStyle = col(1, 1.12); wctx.beginPath(); wctx.arc(WW / 2, cy, r * 0.7, 0, 6.283); wctx.fill()
    } else if (kind === 'dot') {
      var rr = 5 + a * 6 + (reduce ? 0 : 1.5 * Math.sin(t * 4))
      wctx.fillStyle = col(0.25); wctx.beginPath(); wctx.arc(WW / 2, cy, rr * 2, 0, 6.283); wctx.fill()
      wctx.fillStyle = col(1); wctx.beginPath(); wctx.arc(WW / 2, cy, rr, 0, 6.283); wctx.fill()
    } else {
      wctx.strokeStyle = col(0.2); wctx.lineWidth = 1; wctx.beginPath(); wctx.moveTo(WW * 0.04, cy); wctx.lineTo(WW * 0.96, cy); wctx.stroke()
      for (var L = 2; L >= 0; L--) {
        var A = a * WH * (0.46 - L * 0.1) + WH * 0.02, top = []
        for (var x = WW * 0.04; x <= WW * 0.96; x += 2) {
          var u = (x - WW * 0.04) / (WW * 0.92), env = Math.sin(u * Math.PI)
          top.push([x, cy + Math.sin(u * (6 + L * 2) + sp * (2.4 + L * 0.8) + L * 1.3) * A * env])
        }
        wctx.beginPath(); top.forEach(function (p, i) { if (i) wctx.lineTo(p[0], p[1]); else wctx.moveTo(p[0], p[1]) })
        for (var j = top.length - 1; j >= 0; j--) wctx.lineTo(top[j][0], cy - (top[j][1] - cy) * 0.9)
        wctx.closePath()
        var gr = wctx.createLinearGradient(0, 0, 0, WH)
        gr.addColorStop(0, col(0)); gr.addColorStop(0.5, col(0.3 + a * 0.3 - L * 0.06, 1 + L * 0.1)); gr.addColorStop(1, col(0))
        wctx.fillStyle = gr; wctx.fill()
        wctx.beginPath(); top.forEach(function (p, i) { if (i) wctx.lineTo(p[0], p[1]); else wctx.moveTo(p[0], p[1]) })
        wctx.strokeStyle = col(0.95 - L * 0.25, 1.15); wctx.lineWidth = 2 - L * 0.4; wctx.stroke()
      }
    }
    raf = requestAnimationFrame(frame)
  }
  function startWave() { if (wctx && !raf) { setupWave(); lastT = performance.now(); raf = requestAnimationFrame(frame) } }
  function stopWave() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

  // ── states ──
  function stopClock() { if (clock) { clearInterval(clock); clock = null } }
  function showButton(text, isErr) {
    card.hidden = true; btn.hidden = false; stopWave()
    var t = btn.querySelector('.t'); if (t && text) t.textContent = text
    btn.className = isErr ? 'btn err' : 'btn'
    if (text) btn.setAttribute('aria-label', text)
  }
  function showCard(mode, level) {
    btn.hidden = true; card.hidden = false
    curMode = mode; curLevel = level || 0
    startWave()
    statusEl.textContent = TXT[mode][0]
    statusEl.parentNode.className = 'pill' + (mode === 'connecting' ? ' off' : '')
    timeEl.textContent = startedAt ? mmss(Math.floor((Date.now() - startedAt) / 1000)) : ''
  }
  function set(s, text, isErr) {
    st = s
    if (s === 'idle' || s === 'error') { stopClock(); startedAt = 0; muted = false; if (muteBtn) { muteBtn.textContent = 'كتم'; muteBtn.classList.remove('on') } showButton(text, isErr) }
    else showCard(s === 'connecting' ? 'connecting' : 'listen')
  }
  function cleanup() {
    if (room) { try { room.disconnect() } catch (e) {} room = null }
    audios.forEach(function (a) { a.remove() }); audios = []
  }
  function fail(text) {
    cleanup(); set('error', text, true)
    setTimeout(function () { if (st === 'error') set('idle') }, 3200)
  }
  async function start() {
    if (PREVIEW || (st !== 'idle' && st !== 'error')) return
    set('connecting')
    var mic
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch (e) { fail(TXT.mic[0]); return }
    mic.getTracks().forEach(function (t) { t.stop() })
    try {
      var res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key, page: PAGE }) })
      if (!res.ok) throw new Error('token ' + res.status)
      var data = await res.json()
      var LK = await import(LIVEKIT)
      var r = new LK.Room()
      room = r
      r.on(LK.RoomEvent.TrackSubscribed, function (track) {
        if (track.kind !== 'audio') return
        var el = track.attach(); el.autoplay = true; el.style.display = 'none'; document.body.appendChild(el); audios.push(el)
      })
      r.on(LK.RoomEvent.ActiveSpeakersChanged, function (list) {
        if (st === 'idle' || st === 'error' || st === 'connecting') return
        var top = list.slice().sort(function (a, b) { return b.audioLevel - a.audioLevel })[0]
        if (!top) { showCard('listen', 0); return }
        showCard(top.identity === r.localParticipant.identity ? 'user' : 'agent', top.audioLevel)
      })
      r.on(LK.RoomEvent.Disconnected, function () { cleanup(); set('idle') })
      await r.connect(data.url, data.token)
      await r.localParticipant.setMicrophoneEnabled(true)
      st = 'live'; startedAt = Date.now()
      showCard('listen', 0)
      clock = setInterval(function () { timeEl.textContent = mmss(Math.floor((Date.now() - startedAt) / 1000)) }, 1000)
    } catch (e) { fail(TXT.error[0]) }
  }
  window.addEventListener('pagehide', cleanup)

  // Sit above the chat button when both are on the page (same bottom corner).
  function place() {
    if (PAGE || PREVIEW) return
    var chat = document.querySelector('[data-madar-chat]')
    wrap.style.transform = chat && /^b/.test(cfg.position || 'br') ? 'translateY(-72px)' : ''
  }

  function normalise(c) {
    c = c && typeof c === 'object' ? c : {}
    var legacyPos = c.position === 'left' ? 'bl' : c.position === 'right' ? 'br' : c.position
    return Object.assign({ icon: 'phone', iconUrl: '', color: '#4f46e5', position: 'br', size: 'md', theme: 'auto', label: '' }, c, { position: legacyPos || 'br', panel: Object.assign({ layout: 'classic', fill: 'header', curve: false, brand: '', avatar: 'icon', avatarImage: '', avatarShape: 'circle', title: 'تحدث معنا', subOn: true, sub: 'متصل بوكيل مباشر', font: 'system', indicator: 'ribbons', indicatorOn: true, muteOn: true, btnStyle: 'soft', endColor: '', btnRadius: 22, width: 288, radius: 22, shadow: 'soft', bg: '', theme: 'auto' }, c.panel || {}) })
  }
  function mount(c) {
    cfg = normalise(c); build()
    if (!host.isConnected) document.body.appendChild(host)
    set('idle'); place(); setTimeout(place, 2500)
  }

  if (PREVIEW) {
    // The dashboard sends the settings as they are edited; show the panel (or the button) in a fixed demo state.
    var mode = 'agent'
    window.addEventListener('message', function (e) {
      var d = e.data
      if (!d || d.type !== 'madar-call-preview' || !d.config) return
      previewShow = d.show === 'button' ? 'button' : 'panel'; mode = d.state || 'agent'
      stopWave(); cfg = normalise(d.config); build()
      if (!host.isConnected) document.body.appendChild(host)
      if (previewShow === 'button') showButton(); else { startedAt = Date.now() - 83000; showCard(mode, 0) }
    })
    try { parent.postMessage({ type: 'madar-call-ready' }, '*') } catch (e) {}
    if (!cfg) mount({})
    if (previewShow === 'panel') { startedAt = Date.now() - 83000; showCard(mode, 0) }
  } else {
    fetch(API + '?key=' + encodeURIComponent(key) + (PAGE ? '&page=1' : '')).then(function (r) { return r.ok ? r.json() : Promise.reject() })
      .then(function (d) {
        var c = d.config || {}
        // Snippets written before the designer existed carried the look as attributes.
        var a = function (n) { return script.getAttribute(n) }
        if (!c.color && /^#[0-9a-fA-F]{6}$/.test(a('data-color') || '')) c.color = a('data-color')
        if (!c.label && a('data-label')) c.label = a('data-label')
        if (!c.position && a('data-position')) c.position = a('data-position')
        mount(c)
        if (PAGE) host.style.margin = 'auto'
      })
      .catch(function () { if (PAGE) { var d = document.createElement('p'); d.textContent = 'هذه الصفحة غير متاحة.'; document.body.appendChild(d) } })
  }
})()
