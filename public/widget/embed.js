/*
 * Madar website chat. Put this once in the page, before </body>:
 *   <script src="https://madar.software/widget/embed.js" data-key="WIDGET_KEY" async></script>
 * The look (title, colour, side, greeting, quick replies) comes from the dashboard (الإعدادات والربط ← ودجت الموقع).
 * Optional data-color, data-position ("right" or "left") override it on one page.
 */
(function () {
  'use strict'
  var API = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/site-chat'
  var script = document.currentScript
  if (!script) return
  var key = script.getAttribute('data-key')
  if (!key || !/^[0-9a-f-]{36}$/i.test(key)) return
  var origin = (function () { try { return new URL(script.src).origin } catch (e) { return 'https://madar.software' } })()

  function safeColor(c) { return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : '#4f6bff' }

  fetch(API + '?key=' + encodeURIComponent(key)).then(function (r) { return r.ok ? r.json() : null }).then(function (cfg) {
    if (!cfg) return
    var color = safeColor(script.getAttribute('data-color') || cfg.color)
    var side = (script.getAttribute('data-position') || cfg.position) === 'left' ? 'left' : 'right'
    var title = cfg.title || 'تحدث معنا'

    var host = document.createElement('div')
    host.setAttribute('data-madar-chat', '')
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
    var style = document.createElement('style')
    style.textContent = [
      '*{box-sizing:border-box;font-family:"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif}',
      '.fab{position:fixed;bottom:20px;' + side + ':20px;z-index:2147483000;width:58px;height:58px;border:0;border-radius:50%;background:' + color + ';color:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .15s}',
      '.fab:hover{transform:scale(1.06)}.fab:focus-visible{outline:3px solid #fff;outline-offset:2px}',
      '.tip{position:fixed;bottom:30px;' + side + ':90px;z-index:2147483000;background:#17171c;color:#f4f4f6;border:1px solid #2a2a33;border-radius:12px;padding:8px 12px;font-size:13.5px;direction:rtl;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:220px}',
      '.box{position:fixed;bottom:90px;' + side + ':20px;z-index:2147483000;width:380px;height:min(600px,calc(100vh - 110px));border:1px solid #2a2a33;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.4);background:#0f0f12;display:none}',
      '.box.open{display:block}.box iframe{width:100%;height:100%;border:0;display:block}',
      '@media(max-width:520px){.box{inset:0;width:100%;height:100%;border-radius:0;border:0}.fab.hide{display:none}}'
    ].join('')
    var fab = document.createElement('button')
    fab.className = 'fab'; fab.type = 'button'; fab.setAttribute('aria-label', title); fab.setAttribute('aria-expanded', 'false')
    fab.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>'
    var box = document.createElement('div'); box.className = 'box'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', title)
    var tip = null
    var frame = null

    function open() {
      if (!frame) {
        frame = document.createElement('iframe')
        frame.title = title
        frame.src = origin + '/widget/chat.html?key=' + encodeURIComponent(key) + '&page=' + encodeURIComponent(location.href.slice(0, 300))
        box.appendChild(frame)
      }
      if (tip) { tip.remove(); tip = null }
      box.classList.add('open'); fab.classList.add('hide'); fab.setAttribute('aria-expanded', 'true')
    }
    function close() { box.classList.remove('open'); fab.classList.remove('hide'); fab.setAttribute('aria-expanded', 'false'); fab.focus() }
    fab.addEventListener('click', function () { box.classList.contains('open') ? close() : open() })
    window.addEventListener('message', function (e) { if (e.data && e.data.type === 'madar-chat-close' && frame && e.source === frame.contentWindow) close() })
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close() })

    root.appendChild(style); root.appendChild(box); root.appendChild(fab)
    document.body.appendChild(host)

    // A small greeting next to the bubble, shown once per visitor.
    var seen = false
    try { seen = sessionStorage.getItem('madar_chat_tip') === '1' } catch (e) {}
    if (!seen && cfg.greeting) {
      setTimeout(function () {
        if (box.classList.contains('open')) return
        tip = document.createElement('div'); tip.className = 'tip'; tip.textContent = String(cfg.greeting).slice(0, 90)
        root.appendChild(tip)
        try { sessionStorage.setItem('madar_chat_tip', '1') } catch (e) {}
        setTimeout(function () { if (tip) { tip.remove(); tip = null } }, 8000)
      }, 2500)
    }
  }).catch(function () {})
})()
