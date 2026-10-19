import { useEffect } from 'react'

// Colours the page behind the phone's browser bars (and the bars' tint) so no white strip shows around a dark screen.
export function useSystemChrome(color: string) {
  useEffect(() => {
    const html = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const prev = { html: html.style.backgroundColor, body: document.body.style.backgroundColor, meta: meta?.content ?? null }
    html.style.backgroundColor = color
    document.body.style.backgroundColor = color
    if (meta) meta.content = color
    return () => {
      html.style.backgroundColor = prev.html
      document.body.style.backgroundColor = prev.body
      if (meta && prev.meta !== null) meta.content = prev.meta
    }
  }, [color])
}
