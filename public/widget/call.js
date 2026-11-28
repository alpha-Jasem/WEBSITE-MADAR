/*
 * Madar web call. Put this once in the page, before </body>:
 *   <script src="https://madar.software/widget/call.js" data-key="WIDGET_KEY" async></script>
 * Visitors press the button, allow the microphone, and talk to the company's voice agent in the browser.
 * During the call a small card shows who is speaking: layered light ribbons widen with the voice, purple while the agent
 * talks, green while the visitor talks, quiet while the agent listens.
 * The agent and allowed websites are set in the dashboard (الإضافات ← ودجة المكالمة عبر الويب).
 * Optional: data-label (button text), data-color (#rrggbb), data-position ("right" or "left").
 */
(function () {
  'use strict'
  var API = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/web-call-token'
  var LIVEKIT = 'https://esm.sh/livekit-client@2.16.1'
  var script = document.currentScript
  if (!script) return
  var key = script.getAttribute('data-key')
  if (!key || !/^[0-9a-f-]{36}$/i.test(key)) return
  var color = /^#[0-9a-fA-F]{6}$/.test(script.getAttribute('data-color') || '') ? script.getAttribute('data-color') : '#4f6bff'
  var side = script.getAttribute('data-position') === 'left' ? 'left' : 'right'
  var label = (script.getAttribute('data-label') || 'اتصل بنا').slice(0, 30)
  var TXT = {
    connecting: ['جارِ الاتصال…', 'نجهّز المكالمة'],
    agent: ['الوكيل يتكلم', 'اسمعه أو قاطعه'],
    user: ['أنت تتكلم', 'الوكيل يسمعك'],
    listen: ['الوكيل يسمعك', 'تكلّم متى ما جهزت'],
    error: ['تعذّر الاتصال', 'جرّب مرة ثانية'],
    mic: ['اسمح بالمايك', 'المتصفح يحتاج إذن الميكروفون']
  }

  var host = document.createElement('div')
  host.setAttribute('data-madar-call', '')
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
  var style = document.createElement('style')
  style.textContent = [
    '*{box-sizing:border-box;font-family:"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif}',
    '.wrap{position:fixed;bottom:20px;' + side + ':20px;z-index:2147483001;direction:rtl}',
    '.btn{border:0;border-radius:999px;background:' + color + ';color:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:0 18px 0 14px;height:52px;font-size:14.5px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .15s}',
    '.btn:hover{transform:scale(1.04)}.btn:focus-visible,.end:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.btn[hidden],.card[hidden]{display:none}',
    '.btn.err{background:#b42318}',
    '.card{width:320px;max-width:calc(100vw - 32px);background:#17171c;color:#f4f4f6;border:1px solid #2a2a33;border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.4);padding:12px 14px;display:flex;align-items:center;gap:12px}',
    '.wave{width:104px;height:60px;flex:none;display:block}',
    '.main{flex:1;min-width:0;display:grid;gap:2px}',
    '.main b{font-size:14px;font-weight:600}.main span{font-size:12.5px;color:#a8a8b3}',
    '.time{direction:ltr;text-align:right;font-variant-numeric:tabular-nums}',
    '.end{border:0;width:42px;height:42px;border-radius:50%;background:#dc2626;color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}',
    '@media (prefers-reduced-motion:reduce){.btn{transition:none!important}}'
  ].join('')
  root.appendChild(style)

  var PHONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
  var END = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'

  var wrap = document.createElement('div')
  wrap.className = 'wrap'
  wrap.innerHTML =
    '<button type="button" class="btn">' + PHONE + '<span class="t"></span></button>' +
    '<div class="card" hidden role="status" aria-live="polite">' +
      '<canvas class="wave" aria-hidden="true"></canvas>' +
      '<div class="main"><b class="title"></b><span class="hint"></span><span class="time"></span></div>' +
      '<button type="button" class="end" aria-label="إنهاء المكالمة">' + END + '</button>' +
    '</div>'
  root.appendChild(wrap)
  var btn = wrap.querySelector('.btn'), card = wrap.querySelector('.card'), wave = wrap.querySelector('.wave')
  var titleEl = wrap.querySelector('.title'), hintEl = wrap.querySelector('.hint'), timeEl = wrap.querySelector('.time'), end = wrap.querySelector('.end')

  var room = null, audios = [], st = 'idle', clock = null, startedAt = 0
  function mmss(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2) }
  function stopClock() { if (clock) { clearInterval(clock); clock = null } }
  function showButton(text, isErr) {
    card.hidden = true; btn.hidden = false; stopWave()
    btn.querySelector('.t').textContent = text || label
    btn.className = isErr ? 'btn err' : 'btn'
    btn.setAttribute('aria-label', text || label)
  }
  // mode: connecting | agent | user | listen. level (0..1) is the loudness of whoever speaks.
  var RGB = { agent: [139, 116, 255], user: [34, 197, 94], listen: [143, 152, 196], connecting: [245, 158, 11] }
  var cur = RGB.connecting.slice(), curMode = 'connecting', curLevel = 0, sm = 0, raf = 0, lastT = 0
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var wctx = wave.getContext('2d'), WW = 104, WH = 60
  function setupWave() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2)
    wave.width = Math.round(WW * dpr); wave.height = Math.round(WH * dpr); wctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  function col(a, k) { k = k == null ? 1 : k; return 'rgba(' + Math.round(cur[0] * k) + ',' + Math.round(cur[1] * k) + ',' + Math.round(cur[2] * k) + ',' + a + ')' }
  // Three layered ribbons across a mirror line; they widen and speed up with the voice.
  function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now
    var t = now / 1000, tgt = RGB[curMode]
    for (var i = 0; i < 3; i++) cur[i] += (tgt[i] - cur[i]) * Math.min(1, dt * 6)
    var want = curMode === 'agent' || curMode === 'user' ? Math.min(1, Math.max(0.22, curLevel * 4)) : curMode === 'connecting' ? 0.2 + 0.12 * Math.sin(t * 4) : 0.06 + 0.03 * Math.sin(t * 1.6)
    sm += (want - sm) * Math.min(1, dt * 10)
    var a = reduce ? (curMode === 'agent' || curMode === 'user' ? 0.5 : 0.08) : sm, sp = reduce ? 0 : t, cy = WH / 2
    wctx.clearRect(0, 0, WW, WH)
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
      var g = wctx.createLinearGradient(0, 0, 0, WH)
      g.addColorStop(0, col(0)); g.addColorStop(0.5, col(0.3 + a * 0.3 - L * 0.06, 1 + L * 0.1)); g.addColorStop(1, col(0))
      wctx.fillStyle = g; wctx.fill()
      wctx.beginPath(); top.forEach(function (p, i) { if (i) wctx.lineTo(p[0], p[1]); else wctx.moveTo(p[0], p[1]) })
      wctx.strokeStyle = col(0.95 - L * 0.25, 1.15); wctx.lineWidth = 2 - L * 0.4; wctx.stroke()
    }
    raf = requestAnimationFrame(frame)
  }
  function startWave() { if (!raf) { setupWave(); lastT = performance.now(); raf = requestAnimationFrame(frame) } }
  function stopWave() { if (raf) { cancelAnimationFrame(raf); raf = 0 } }
  function showCard(mode, level) {
    btn.hidden = true; card.hidden = false
    curMode = mode; curLevel = level || 0
    startWave()
    titleEl.textContent = TXT[mode][0]; hintEl.textContent = TXT[mode][1]
    timeEl.textContent = startedAt ? mmss(Math.floor((Date.now() - startedAt) / 1000)) : ''
  }
  function set(s, text, isErr) {
    st = s
    if (s === 'idle' || s === 'error') { stopClock(); startedAt = 0; showButton(text, isErr) }
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
    if (st !== 'idle' && st !== 'error') return
    set('connecting')
    var mic
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch (e) { fail(TXT.mic[0]); return }
    mic.getTracks().forEach(function (t) { t.stop() })
    try {
      var res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key }) })
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
  btn.addEventListener('click', start)
  end.addEventListener('click', function () { cleanup(); set('idle') })
  window.addEventListener('pagehide', cleanup)

  // Sit above the chat button when both are on the page.
  function place() { wrap.style.bottom = document.querySelector('[data-madar-chat]') ? '92px' : '20px' }
  set('idle')
  document.body.appendChild(host)
  place(); setTimeout(place, 2500)
})()
