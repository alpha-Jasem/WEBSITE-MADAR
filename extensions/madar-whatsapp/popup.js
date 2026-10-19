const $ = id => document.getElementById(id)

async function refresh() {
  const { token, running } = await chrome.storage.local.get(['token', 'running'])
  $('token').value = token || ''
  $('toggle').textContent = running === false ? 'استئناف' : 'إيقاف مؤقت'
  if (!token) { $('state').textContent = 'أضف رمز الجهاز ثم احفظ.'; return }
  const r = await chrome.runtime.sendMessage({ type: 'bridge', body: { action: 'hello', status: 'popup' } })
  if (r?.error) { $('state').textContent = r.error === 'invalid_device' ? 'الرمز غير صالح أو أُلغي. أنشئ رمزًا جديدًا من اللوحة.' : 'تعذّر الاتصال: ' + r.error; return }
  $('state').textContent = [
    running === false ? 'متوقف من الإضافة' : 'الإضافة تعمل',
    r.enabled ? 'الإرسال: مفعّل من اللوحة' : 'الإرسال: متوقف من اللوحة',
    r.in_hours ? 'ضمن ساعات العمل' : 'خارج ساعات العمل',
    `أُرسل اليوم ${r.sent_today} من ${r.cap_today}`,
    r.pause_reason ? 'سبب التوقف: ' + r.pause_reason : '',
  ].filter(Boolean).join('\n')
}

$('save').onclick = async () => {
  await chrome.storage.local.set({ token: $('token').value.trim(), running: true })
  refresh()
}
$('toggle').onclick = async () => {
  const { running } = await chrome.storage.local.get('running')
  await chrome.storage.local.set({ running: running === false })
  refresh()
}
$('test').onclick = async () => {
  const phone = $('me').value.replace(/\D/g, '')
  if (phone.length < 9) { $('state').textContent = 'اكتب رقمك كاملًا.'; return }
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  if (!tabs.length) { $('state').textContent = 'افتح واتساب ويب وسجّل الدخول أولًا.'; return }
  await chrome.tabs.sendMessage(tabs[0].id, { type: 'testsend', phone, text: 'تجربة من إضافة مدار ✅ ' + new Date().toLocaleTimeString('ar-SA') })
  $('state').textContent = 'بدأت التجربة. راقب شارة «مدار» أسفل واتساب ويب.'
}
$('self').onclick = async () => {
  const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' })
  if (!tabs.length) { $('state').textContent = 'افتح واتساب ويب أولًا.'; return }
  const r = await chrome.tabs.sendMessage(tabs[0].id, { type: 'selftest' }).catch(() => null)
  if (!r) { $('state').textContent = 'الإضافة لم تتصل بالصفحة. أعد تحميل واتساب ويب.'; return }
  $('state').textContent = [
    'مسجّل الدخول: ' + (r.loggedIn ? 'نعم' : 'لا'),
    'محادثات ظاهرة: ' + r.chatRows,
    'محادثات غير مقروءة: ' + r.unreadChats,
    'محادثة مفتوحة: ' + (r.chatOpen ? 'نعم' : 'لا'),
    'خانة الكتابة: ' + (r.composer ? 'موجودة' : 'غير موجودة'),
    'زر الإرسال: ' + (r.sendButton ? 'موجود' : 'غير موجود (يظهر بعد كتابة نص)'),
    'رسائل في المحادثة: ' + r.messagesInChat,
  ].join('\n')
}
$('open').onclick = () => chrome.tabs.create({ url: 'https://web.whatsapp.com/' })
refresh()
