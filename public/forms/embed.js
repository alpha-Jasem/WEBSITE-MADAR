/*
 * Madar lead form. Put this where the form should appear (for a pop-up or floating button, anywhere in the page):
 *   <script src="https://madar.software/forms/embed.js" data-form="FORM_ID" async></script>
 * The form's look and fields come from the dashboard (الربط والأتمتة ← نماذج الموقع); each submission reaches
 * the company's dashboard and its automations within seconds.
 */
(function () {
  'use strict'
  var API = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/lead-form'
  var script = document.currentScript
  if (!script) return
  var formId = script.getAttribute('data-form')
  if (!formId) return

  function el(tag, attrs, children) {
    var n = document.createElement(tag)
    for (var k in attrs || {}) {
      if (k === 'text') n.textContent = attrs[k]
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k])
    }
    ;(children || []).forEach(function (c) { if (c) n.appendChild(c) })
    return n
  }

  function css(color) {
    return [
      ':host{all:initial}',
      '*{box-sizing:border-box;font-family:"IBM Plex Sans Arabic",Tahoma,system-ui,sans-serif}',
      '.f{direction:rtl;text-align:right;background:#fff;color:#16181d;border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:12px;width:100%;max-width:380px;box-shadow:0 18px 50px rgba(0,0,0,.18)}',
      '.inline .f{box-shadow:none;border:1px solid #e4e6eb;max-width:520px}',
      'h3{margin:0;font-size:19px;line-height:1.5}',
      'p{margin:0;font-size:14px;color:#5b6170;line-height:1.7}',
      'label{display:flex;flex-direction:column;gap:6px;font-size:13.5px;color:#30343c}',
      'input,textarea{width:100%;border:1px solid #d5d8de;border-radius:10px;padding:10px 12px;font-size:15px;color:#16181d;background:#fff}',
      'input:focus,textarea:focus{outline:2px solid ' + color + ';outline-offset:1px;border-color:' + color + '}',
      'textarea{min-height:84px;resize:vertical}',
      'button.go{border:0;border-radius:10px;padding:12px;font-size:15px;font-weight:600;color:#fff;background:' + color + ';cursor:pointer}',
      'button.go[disabled]{opacity:.6;cursor:default}',
      '.err{color:#c62828;font-size:13px;min-height:1em}',
      '.ok{font-size:15px;line-height:1.8;color:#1b5e20;padding:8px 0}',
      '.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
      '.wrap{position:fixed;inset:0;background:rgba(10,12,16,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:2147483000}',
      '.box{position:relative;width:100%;max-width:380px}',
      '.x{position:absolute;top:10px;left:10px;border:0;background:#f1f2f4;border-radius:50%;width:30px;height:30px;font-size:17px;cursor:pointer;color:#30343c;z-index:1}',
      '.fab{position:fixed;bottom:20px;z-index:2147482999;border:0;border-radius:999px;padding:13px 20px;font-size:15px;font-weight:600;color:#fff;background:' + color + ';box-shadow:0 10px 30px rgba(0,0,0,.2);cursor:pointer}',
    ].join('')
  }

  function buildForm(cfg, onDone) {
    var err = el('div', { class: 'err', role: 'alert' })
    var inputs = []
    var fields = (cfg.fields || []).map(function (f) {
      var id = 'm-' + f.key
      var input = f.type === 'textarea'
        ? el('textarea', { id: id, name: f.key })
        : el('input', {
          id: id, name: f.key,
          type: f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : 'text',
          inputmode: f.type === 'phone' ? 'tel' : null,
          autocomplete: f.type === 'phone' ? 'tel' : f.type === 'email' ? 'email' : f.key === 'name' ? 'name' : null,
          dir: f.type === 'phone' || f.type === 'email' ? 'ltr' : null,
          placeholder: f.type === 'phone' ? '05xxxxxxxx' : null,
        })
      if (f.required) input.required = true
      inputs.push(input)
      return el('label', { for: id }, [document.createTextNode(f.label + (f.required ? ' *' : '')), input])
    })
    var hp = el('input', { class: 'hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' })
    var btn = el('button', { class: 'go', type: 'submit', text: cfg.button_text || 'أرسل' })
    var form = el('form', { class: 'f', novalidate: '' }, [
      el('h3', { text: cfg.title || '' }),
      cfg.subtitle ? el('p', { text: cfg.subtitle }) : null,
    ].concat(fields, [hp, err, btn]))

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      err.textContent = ''
      var values = {}
      for (var i = 0; i < inputs.length; i++) {
        var f = cfg.fields[i]
        var v = (inputs[i].value || '').trim()
        if (f.required && !v) { err.textContent = '«' + f.label + '» مطلوب'; inputs[i].focus(); return }
        values[f.key] = v
      }
      btn.disabled = true
      fetch(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_id: formId, values: values, page_url: location.href.slice(0, 500), website: hp.value }),
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j } }) })
        .then(function (res) {
          if (!res.ok) { err.textContent = (res.j && res.j.error) || 'تعذّر الإرسال، جرّب مرة ثانية'; btn.disabled = false; return }
          while (form.firstChild) form.removeChild(form.firstChild)
          form.appendChild(el('div', { class: 'ok', role: 'status', text: (res.j && res.j.message) || cfg.success_text }))
          try { localStorage.setItem('madar-form-' + formId, 'sent') } catch (x) { /* storage blocked */ }
          if (onDone) onDone()
        })
        .catch(function () { err.textContent = 'تعذّر الإرسال، تأكد من الاتصال'; btn.disabled = false })
    })
    return form
  }

  function mount(cfg) {
    var color = /^#[0-9a-f]{3,8}$/i.test((cfg.settings || {}).color || '') ? cfg.settings.color : '#111827'
    var host = el('div', { 'data-madar-form': formId })
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host
    root.appendChild(el('style', { text: css(color) }))

    if (cfg.kind === 'inline') {
      var box = el('div', { class: 'inline' }, [buildForm(cfg)])
      root.appendChild(box)
      script.parentNode.insertBefore(host, script)
      return
    }

    document.body.appendChild(host)
    var side = (cfg.settings || {}).position === 'left' ? 'left' : 'right'
    var wrap = null
    function close() { if (wrap) { root.removeChild(wrap); wrap = null; document.removeEventListener('keydown', onKey) } }
    function onKey(e) { if (e.key === 'Escape') close() }
    function open() {
      if (wrap) return
      var x = el('button', { class: 'x', type: 'button', 'aria-label': 'إغلاق', text: '×' })
      x.addEventListener('click', close)
      var form = buildForm(cfg)
      wrap = el('div', { class: 'wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': cfg.title || '' }, [el('div', { class: 'box' }, [x, form])])
      wrap.addEventListener('click', function (e) { if (e.target === wrap) close() })
      document.addEventListener('keydown', onKey)
      root.appendChild(wrap)
      var first = form.querySelector('input,textarea')
      if (first) first.focus()
    }

    if (cfg.kind === 'button') {
      var fab = el('button', { class: 'fab', type: 'button', style: side + ':20px', text: (cfg.settings || {}).button_label || cfg.title || 'تواصل معنا' })
      fab.addEventListener('click', open)
      root.appendChild(fab)
      return
    }
    // Pop-up: once per visitor, after the delay set in the dashboard.
    var seen = null
    try { seen = localStorage.getItem('madar-form-' + formId) } catch (x) { /* storage blocked */ }
    if (seen) return
    var delay = Math.min(120, Math.max(0, Number((cfg.settings || {}).delay_seconds) || 8))
    setTimeout(function () {
      try { localStorage.setItem('madar-form-' + formId, 'shown') } catch (x) { /* storage blocked */ }
      open()
    }, delay * 1000)
  }

  fetch(API + '?id=' + encodeURIComponent(formId))
    .then(function (r) { return r.ok ? r.json() : null })
    .then(function (cfg) {
      if (!cfg) return
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mount(cfg) })
      else mount(cfg)
    })
    .catch(function () { /* the site keeps working without the form */ })
})()
