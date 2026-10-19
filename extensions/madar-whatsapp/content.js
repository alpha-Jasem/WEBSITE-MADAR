// Runs inside WhatsApp Web. It never decides what to say or how much to send: the Madar bridge does (hours, daily cap,
// do-not-contact, stop words). This script only (1) sends the message the bridge hands out and (2) passes on replies
// from chats the agent started. Everything is paced with random waits so it behaves like a person using the page.
(() => {
  if (window.__madarWa) return
  window.__madarWa = true

  const TICK_MS = 15000
  const JOB_TIMEOUT_MS = 4 * 60 * 1000
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const rand = (a, b) => a + Math.random() * (b - a)
  const digits = s => String(s || '').replace(/\D/g, '')

  const store = {
    get: keys => chrome.storage.local.get(keys),
    set: obj => chrome.storage.local.set(obj),
  }
  const bridge = body => new Promise(resolve => chrome.runtime.sendMessage({ type: 'bridge', body }, r => resolve(r || { error: 'no_response' })))

  // ---- small on-page badge so the owner can see what the extension is doing ----
  const badge = document.createElement('div')
  badge.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:999999;background:#0b1224;color:#cfe0ff;font:600 12px system-ui;padding:6px 10px;border-radius:99px;border:1px solid #2f6bff;direction:rtl;max-width:70vw;opacity:.92;pointer-events:none'
  document.documentElement.appendChild(badge)
  const say = t => { badge.textContent = 'مدار: ' + t }
  say('جاهز')

  // ---- WhatsApp Web page helpers (selectors are kept loose because the page changes often) ----
  const composer = () => document.querySelector('footer div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"][data-tab]')
  const sendButton = () => {
    const icon = document.querySelector('footer [data-icon="send"], [data-icon="wds-ic-send-filled"]')
    return (icon && icon.closest('button, [role="button"]')) || document.querySelector('footer button[aria-label="إرسال"], footer button[aria-label="Send"]')
  }
  const invalidNumberDialog = () => {
    const d = document.querySelector('div[role="dialog"], div[data-animate-modal-popup="true"]')
    return !!d && /غير صالح|not valid|invalid|isn't on WhatsApp|ليس على واتساب/i.test(d.textContent || '')
  }
  const headerTitle = () => {
    const el = document.querySelector('#main header span[title], #main header [title]')
    return el ? (el.getAttribute('title') || el.textContent || '').trim() : ''
  }
  const lastMessages = () => Array.from(document.querySelectorAll('#main div.message-in, #main div.message-out, #main [data-testid="msg-container"]'))
  const msgText = el => {
    const t = el.querySelector('span.selectable-text, span[data-testid="selectable-text"]')
    return t ? t.innerText.trim() : ''
  }
  const msgTs = el => {
    const pre = el.querySelector('[data-pre-plain-text]')
    return pre ? pre.getAttribute('data-pre-plain-text') : ''
  }
  const isIncoming = el => el.classList.contains('message-in') || !!el.querySelector('.message-in') || el.closest('.message-in') !== null

  async function waitFor(fn, ms, step = 400) {
    const end = Date.now() + ms
    while (Date.now() < end) {
      const v = fn()
      if (v) return v
      await sleep(step)
    }
    return null
  }

  // ---- sending ----
  async function performSend(job) {
    const box = await waitFor(composer, 45000)
    if (!box) {
      if (invalidNumberDialog()) return { ok: false, error: 'not_on_whatsapp' }
      return { ok: false, error: 'composer_not_found' }
    }
    if (invalidNumberDialog()) return { ok: false, error: 'not_on_whatsapp' }
    await sleep(rand(1500, 3500))
    if (!(box.innerText || '').trim()) {
      box.focus()
      document.execCommand('insertText', false, job.text)
      await sleep(600)
    }
    const typed = (composer()?.innerText || '').replace(/\s+/g, ' ').trim()
    if (!typed || !job.text.replace(/\s+/g, ' ').startsWith(typed.slice(0, 25))) return { ok: false, error: 'text_mismatch' }
    await sleep(rand(800, 2200))
    const btn = sendButton()
    if (btn) btn.click()
    else composer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }))
    const sent = await waitFor(() => {
      const empty = !(composer()?.innerText || '').trim()
      const outs = lastMessages().filter(m => !isIncoming(m))
      const last = outs.length ? msgText(outs[outs.length - 1]) : ''
      return empty && last && job.text.replace(/\s+/g, ' ').startsWith(last.replace(/\s+/g, ' ').slice(0, 25))
    }, 20000)
    if (!sent) return { ok: false, error: 'send_not_confirmed' }
    const title = headerTitle()
    if (title) {
      const { chatMap = {} } = await store.get('chatMap')
      chatMap[title] = digits(job.phone)
      await store.set({ chatMap })
    }
    return { ok: true }
  }

  // ---- reading replies ----
  const unreadRows = () => {
    const rows = Array.from(document.querySelectorAll('#pane-side [role="listitem"], #pane-side [role="row"], #pane-side div[data-testid="cell-frame-container"]'))
    return rows.filter(r => r.querySelector('[aria-label*="غير مقروء"], [aria-label*="nread"], [data-icon="unread-count"]'))
  }
  const rowTitle = row => {
    const el = row.querySelector('span[title]')
    return el ? (el.getAttribute('title') || '').trim() : ''
  }

  // numbers of the conversations the agent started (refreshed from the bridge at most once a minute)
  let known = { at: 0, last9: new Set() }
  async function knownChats() {
    if (Date.now() - known.at < 60000) return known.last9
    const r = await bridge({ action: 'hello', status: 'chats' })
    if (Array.isArray(r.phones)) known = { at: Date.now(), last9: new Set(r.phones.map(p => digits(p).slice(-9))) }
    return known.last9
  }

  async function handleInbound() {
    const rows = unreadRows()
    if (!rows.length) return false
    const mine = await knownChats()
    const { chatMap = {} } = await store.get('chatMap')
    // only chats that belong to the agent are opened; every other chat is left unread and untouched
    let row = null, phone = null
    for (const r of rows) {
      const title = rowTitle(r)
      const p = digits(title).length >= 9 ? digits(title) : chatMap[title]
      if (p && mine.has(digits(p).slice(-9))) { row = r; phone = p; break }
    }
    if (!row) return false
    row.click()
    await sleep(rand(1500, 3000))
    const msgs = lastMessages()
    const tail = []
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (!isIncoming(msgs[i])) break
      const t = msgText(msgs[i])
      if (t) tail.unshift({ text: t, ts: msgTs(msgs[i]) })
    }
    if (!tail.length) return true
    say('وصل رد — يُعالج')
    await bridge({ action: 'inbound', phone, messages: tail, status: 'inbound' })
    return true
  }

  // ---- main loop ----
  let busy = false
  async function tick() {
    if (busy) return
    busy = true
    try {
      const st = await store.get(['token', 'running', 'pending', 'notBefore', 'retryAt'])
      if (!st.token) { say('أضف رمز الجهاز من أيقونة الإضافة'); return }
      if (st.running === false) { say('متوقف من الإضافة'); return }
      if (!composer() && !document.querySelector('#pane-side')) { say('سجّل الدخول في واتساب ويب'); return }

      // a job in progress (the page reloads when we open a chat by number)
      if (st.pending) {
        const job = st.pending
        if (Date.now() - job.startedAt > JOB_TIMEOUT_MS) {
          if (job.kind !== 'test') await bridge({ action: 'report', id: job.id, ok: false, error: 'timeout' })
          await store.set({ pending: null })
          return
        }
        if (job.opened) {
          say('يرسل…')
          const result = await performSend(job)
          if (job.kind !== 'test') await bridge({ action: 'report', id: job.id, ok: result.ok, error: result.error, status: result.ok ? 'sent' : 'failed' })
          await store.set({ pending: null, retryAt: Date.now() + rand(8000, 20000) })
          say(result.ok ? 'أُرسلت رسالة' : 'فشل: ' + result.error)
          return
        }
        if (Date.now() < job.notBefore) { say('ينتظر قبل الإرسال'); return }
        job.opened = true
        await store.set({ pending: job })
        say('يفتح المحادثة…')
        window.location.href = `https://web.whatsapp.com/send?phone=${digits(job.phone)}&text=${encodeURIComponent(job.text)}`
        return
      }

      if (st.retryAt && Date.now() < st.retryAt) return

      // replies first, then new work
      if (await handleInbound()) { await store.set({ retryAt: Date.now() + rand(4000, 9000) }); return }

      const r = await bridge({ action: 'next_job', status: 'poll' })
      if (r.error) { say(r.error === 'network' ? 'لا يوجد اتصال' : 'خطأ: ' + r.error); return }
      if (!r.job) {
        const why = { disabled: 'الإرسال متوقف من اللوحة', quiet_hours: 'خارج ساعات العمل', daily_cap: 'وصل الحد اليومي', agent_not_active: 'الإيجنت غير مفعّل', no_leads: 'لا يوجد عملاء جدد', cooldown: 'فاصل بين الرسائل', idle: 'لا يوجد عمل' }[r.reason] || 'لا يوجد عمل'
        say(why)
        await store.set({ retryAt: Date.now() + (r.retry_s || 60) * 1000 })
        return
      }
      const wait = Math.max(5, Number(r.wait_s) || 30)
      await store.set({ pending: { ...r.job, startedAt: Date.now(), notBefore: Date.now() + wait * 1000, opened: false } })
      say(`رسالة بعد ${wait} ثانية`)
    } catch (e) {
      say('خطأ غير متوقع')
    } finally {
      busy = false
    }
  }

  // Diagnostics for the popup: counts only, never message text.
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg && msg.type === 'selftest') {
      const n = s => document.querySelectorAll(s).length
      reply({
        loggedIn: !!document.querySelector('#pane-side'),
        chatRows: n('#pane-side [role="listitem"], #pane-side [role="row"], #pane-side div[data-testid="cell-frame-container"]'),
        unreadChats: unreadRows().length,
        chatOpen: !!document.querySelector('#main'),
        composer: !!composer(),
        sendButton: !!sendButton(),
        messagesInChat: lastMessages().length,
      })
      return false
    }
    if (msg && msg.type === 'testsend') {
      store.set({ pending: { id: 'test', kind: 'test', phone: msg.phone, text: msg.text, startedAt: Date.now(), notBefore: Date.now(), opened: false }, running: true }).then(() => { tick(); reply({ ok: true }) })
      return true
    }
    return false
  })

  setInterval(tick, TICK_MS)
  setTimeout(tick, 4000)
})()
