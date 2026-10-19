// Talks to the Madar bridge on behalf of the page script (a service worker is not limited by the page's CORS rules).
const BRIDGE = 'https://aacnqiuwrpzgxhzdavaq.supabase.co/functions/v1/wa-bridge'

async function callBridge(body) {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return { error: 'no_token' }
  try {
    const res = await fetch(BRIDGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-token': token },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? data : { error: data.error || 'http_' + res.status }
  } catch (e) {
    return { error: 'network' }
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg && msg.type === 'bridge') {
    callBridge(msg.body).then(reply)
    return true
  }
  return false
})
