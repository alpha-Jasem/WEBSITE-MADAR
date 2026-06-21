import { useEffect } from 'react'

// Declare the ElevenLabs web component for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'agent-id': string
      }
    }
  }
}

const AGENT_ID = 'agent_6901kgxmt4pbfmy84gp7xx3tbsvk'

export function MahaWidget() {
  useEffect(() => {
    if (document.querySelector('script[data-elevenlabs-widget]')) return
    const script = document.createElement('script')
    script.src = 'https://elevenlabs.io/convai-widget/index.js'
    script.async = true
    script.setAttribute('data-elevenlabs-widget', 'true')
    document.head.appendChild(script)
  }, [])

  return (
    <elevenlabs-convai agent-id={AGENT_ID} />
  )
}
