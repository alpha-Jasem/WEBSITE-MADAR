/*
 * Madar web call. Put this once in the page, before </body>:
 *   <script src="https://madar.software/widget/call.js" data-key="WIDGET_KEY" async></script>
 * Visitors press the button, allow the microphone, and talk to the company's voice agent in the browser.
 * During the call a small card shows who is speaking: the orb waves while the agent talks, glows green while the
 * visitor talks, and breathes while the agent listens.
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
    '.card{width:300px;max-width:calc(100vw - 32px);background:#17171c;color:#f4f4f6;border:1px solid #2a2a33;border-radius:20px;box-shadow:0 18px 50px rgba(0,0,0,.4);padding:12px 14px;display:flex;align-items:center;gap:12px}',
    '.orb{position:relative;width:60px;height:60px;flex:none;display:grid;place-items:center;--lv:0;--c:#8b8b98}',
    '.orb[data-s="agent"]{--c:' + color + '}.orb[data-s="user"]{--c:#22c55e}.orb[data-s="connecting"]{--c:#f59e0b}',
    '.core{position:relative;z-index:2;width:36px;height:36px;border-radius:50%;background:var(--c);display:grid;place-items:center;color:#fff;transform:scale(calc(1 + var(--lv) * .28));transition:transform .12s linear,background .3s}',
    '.ring{position:absolute;inset:6px;border-radius:50%;border:2px solid var(--c);opacity:0}',
    '.orb[data-s="agent"] .ring,.orb[data-s="user"] .ring{animation:wave 1.6s ease-out infinite}',
    '.orb .ring:nth-child(2){animation-delay:.5s!important}.orb .ring:nth-child(3){animation-delay:1s!important}',
    '.orb[data-s="listen"] .core{animation:breath 3s ease-in-out infinite}',
    '.orb[data-s="connecting"] .core{animation:blink 1s ease-in-out infinite}',
    '.bars{display:flex;gap:3px;align-items:center;height:16px}',
    '.bars i{width:3px;height:100%;border-radius:2px;background:#fff;animation:bar .9s ease-in-out infinite}',
    '.bars i:nth-child(2){animation-delay:.15s}.bars i:nth-child(3){animation-delay:.3s}.bars i:nth-child(4){animation-delay:.45s}',
    '.main{flex:1;min-width:0;display:grid;gap:2px}',
    '.main b{font-size:14px;font-weight:600}.main span{font-size:12.5px;color:#a8a8b3}',
    '.time{direction:ltr;text-align:right;font-variant-numeric:tabular-nums}',
    '.end{border:0;width:42px;height:42px;border-radius:50%;background:#dc2626;color:#fff;cursor:pointer;display:grid;place-items:center;flex:none}',
    '@keyframes wave{0%{transform:scale(.7);opacity:.55}100%{transform:scale(1.45);opacity:0}}',
    '@keyframes breath{50%{transform:scale(1.08)}}@keyframes blink{50%{opacity:.45}}@keyframes bar{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}',
    '@media (prefers-reduced-motion:reduce){.orb .ring,.orb .core,.bars i,.btn{animation:none!important;transition:none!important}',
    '.orb[data-s="agent"] .ring,.orb[data-s="user"] .ring{opacity:.35;transform:scale(1.15)}.bars i{transform:scaleY(.7)}}'
  ].join('')
  root.appendChild(style)

  var PHONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'
  var MIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>'
  var END = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'

  var wrap = document.createElement('div')
  wrap.className = 'wrap'
  wrap.innerHTML =
    '<button type="button" class="btn">' + PHONE + '<span class="t"></span></button>' +
    '<div class="card" hidden role="status" aria-live="polite">' +
      '<div class="orb" data-s="connecting"><span class="ring"></span><span class="ring"></span><span class="ring"></span><span class="core"></span></div>' +
      '<div class="main"><b class="title"></b><span class="hint"></span><span class="time"></span></div>' +
      '<button type="button" class="end" aria-label="إنهاء المكالمة">' + END + '</button>' +
    '</div>'
  root.appendChild(wrap)
  var btn = wrap.querySelector('.btn'), card = wrap.querySelector('.card'), orb = wrap.querySelector('.orb'), core = wrap.querySelector('.core')
  var titleEl = wrap.querySelector('.title'), hintEl = wrap.querySelector('.hint'), timeEl = wrap.querySelector('.time'), end = wrap.querySelector('.end')

  var room = null, audios = [], st = 'idle', clock = null, startedAt = 0
  function mmss(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2) }
  function stopClock() { if (clock) { clearInterval(clock); clock = null } }
  function showButton(text, isErr) {
    card.hidden = true; btn.hidden = false
    btn.querySelector('.t').textContent = text || label
    btn.className = isErr ? 'btn err' : 'btn'
    btn.setAttribute('aria-label', text || label)
  }
  // mode: connecting | agent | user | listen
  function showCard(mode, level) {
    btn.hidden = true; card.hidden = false
    orb.setAttribute('data-s', mode)
    orb.style.setProperty('--lv', String(Math.min(1, Math.max(0, level || 0)).toFixed(2)))
    core.innerHTML = mode === 'agent' ? '<span class="bars"><i></i><i></i><i></i><i></i></span>' : MIC
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
