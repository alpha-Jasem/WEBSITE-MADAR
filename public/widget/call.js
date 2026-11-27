/*
 * Madar web call. Put this once in the page, before </body>:
 *   <script src="https://madar.software/widget/call.js" data-key="WIDGET_KEY" async></script>
 * Visitors press the button, allow the microphone, and talk to the company's voice agent in the browser.
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
  var TXT = { idle: label, connecting: 'جارِ الاتصال…', listening: 'تكلّم، الوكيل يسمعك', speaking: 'الوكيل يتكلم…', error: 'تعذّر الاتصال، جرّب مرة ثانية', mic: 'اسمح للمتصفح باستخدام المايك' }

  var host = document.createElement('div')
  host.setAttribute('data-madar-call', '')
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
  var style = document.createElement('style')
  style.textContent = [
    '*{box-sizing:border-box;font-family:"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif}',
    '.wrap{position:fixed;bottom:20px;' + side + ':20px;z-index:2147483001;display:flex;gap:8px;align-items:center;direction:rtl}',
    '.btn{border:0;border-radius:999px;background:' + color + ';color:#fff;cursor:pointer;display:inline-flex;align-items:center;gap:8px;padding:0 18px 0 14px;height:52px;font-size:14.5px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .15s}',
    '.btn:hover{transform:scale(1.04)}.btn:focus-visible,.end:focus-visible{outline:3px solid #fff;outline-offset:2px}',
    '.btn[data-s="listening"],.btn[data-s="speaking"]{background:#16a34a}.btn[data-s="error"]{background:#b42318}',
    '.dot{width:9px;height:9px;border-radius:50%;background:#fff;opacity:.9}',
    '.btn[data-s="connecting"] .dot,.btn[data-s="speaking"] .dot{animation:p 1s ease-in-out infinite}',
    '@keyframes p{50%{transform:scale(1.7);opacity:.4}}',
    '@media (prefers-reduced-motion:reduce){.btn,.dot{animation:none!important;transition:none}}',
    '.end{border:0;width:44px;height:44px;border-radius:50%;background:#17171c;color:#fff;cursor:pointer;display:none;place-items:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}',
    '.end.on{display:grid}',
  ].join('')
  root.appendChild(style)

  var wrap = document.createElement('div')
  wrap.className = 'wrap'
  var btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'btn'
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg><span class="t"></span><span class="dot" hidden></span>'
  var end = document.createElement('button')
  end.type = 'button'
  end.className = 'end'
  end.setAttribute('aria-label', 'إنهاء المكالمة')
  end.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  wrap.appendChild(end)
  wrap.appendChild(btn)
  root.appendChild(wrap)

  var room = null, audios = [], st = 'idle'
  function set(s, text) {
    st = s
    btn.setAttribute('data-s', s)
    btn.querySelector('.t').textContent = text || TXT[s] || label
    btn.querySelector('.dot').hidden = s === 'idle' || s === 'error'
    var live = s === 'connecting' || s === 'listening' || s === 'speaking'
    end.className = live ? 'end on' : 'end'
    btn.setAttribute('aria-label', live ? 'مكالمة جارية' : label)
  }
  function cleanup() {
    if (room) { try { room.disconnect() } catch (e) {} room = null }
    audios.forEach(function (a) { a.remove() }); audios = []
  }
  async function start() {
    if (st !== 'idle' && st !== 'error') return
    set('connecting')
    var mic
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch (e) { set('error', TXT.mic); setTimeout(function () { if (st === 'error') set('idle') }, 3500); return }
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
      r.on(LK.RoomEvent.ActiveSpeakersChanged, function (sp) {
        set(sp.some(function (x) { return x.identity !== r.localParticipant.identity }) ? 'speaking' : 'listening')
      })
      r.on(LK.RoomEvent.Disconnected, function () { cleanup(); set('idle') })
      await r.connect(data.url, data.token)
      await r.localParticipant.setMicrophoneEnabled(true)
      set('listening')
    } catch (e) {
      cleanup(); set('error')
      setTimeout(function () { if (st === 'error') set('idle') }, 3000)
    }
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
