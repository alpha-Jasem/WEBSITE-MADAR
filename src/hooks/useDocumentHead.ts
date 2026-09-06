import { useEffect } from 'react'

interface DocumentHeadOptions {
  title: string
  description: string
  canonical: string
  noindex?: boolean
}

// The SPA has no server-side rendering, so every route otherwise inherits the
// same title/description/canonical baked into index.html — which is what
// made every non-homepage route in the sitemap canonicalize to "/". This
// hook lets each real route claim its own head tags without adding a
// dependency like react-helmet.
export function useDocumentHead({ title, description, canonical, noindex }: DocumentHeadOptions) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonical)

    let canonicalEl = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonicalEl) {
      canonicalEl = document.createElement('link')
      canonicalEl.rel = 'canonical'
      document.head.appendChild(canonicalEl)
    }
    canonicalEl.href = canonical

    let robotsEl = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta')
        robotsEl.setAttribute('name', 'robots')
        document.head.appendChild(robotsEl)
      }
      robotsEl.setAttribute('content', 'noindex, nofollow')
    } else if (robotsEl) {
      robotsEl.remove()
    }

    // Routes are only ever set to one non-default title/description/canonical
    // per mount in this app (no nested route head changes), so restoring the
    // previous title on unmount is enough — the next route's own effect sets
    // the rest before paint.
    return () => {
      document.title = previousTitle
    }
  }, [title, description, canonical, noindex])
}
