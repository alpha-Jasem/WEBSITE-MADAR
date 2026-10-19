import { useEffect } from 'react'

// Only the client and admin dashboards are installable apps; the public site has no manifest.
export function useAppManifest(href: string) {
  useEffect(() => {
    const link = Object.assign(document.createElement('link'), { rel: 'manifest', href })
    document.head.appendChild(link)
    return () => { link.remove() }
  }, [href])
}
