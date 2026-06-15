/** Generate a new Madar API key — returns raw key (shown once) + hash (stored) + display prefix */
export async function generateApiKey(): Promise<{ raw: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  const raw = `mdrc_${hex}`

  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hash = Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('')
  const prefix = raw.slice(0, 13) + '...'

  return { raw, hash, prefix }
}
