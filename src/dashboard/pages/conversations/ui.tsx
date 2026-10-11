import type { ReactNode } from 'react'
import { Phone, MessageCircle, Globe } from 'lucide-react'
import { type ConvChannel, type ConvItem, type Tone, itemChip, fmtWhen } from './model'
import '../home/night.css'

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`nx-chip nx-tone-${tone}`}>{children}</span>
}

export function ChannelIcon({ channel, size = 16 }: { channel: ConvChannel; size?: number }) {
  const Icon = channel === 'phone' ? Phone : channel === 'whatsapp' ? MessageCircle : Globe
  const cls = channel === 'whatsapp' ? 'nx-ch wa' : channel === 'web' ? 'nx-ch web' : 'nx-ch'
  return <span className={cls} aria-hidden="true"><Icon size={size} /></span>
}

export function ConvRow({ item, onOpen }: { item: ConvItem; onOpen: (item: ConvItem) => void }) {
  const [label, tone] = itemChip(item)
  return (
    <button type="button" className="nx-conv" onClick={() => onOpen(item)}>
      <ChannelIcon channel={item.channel} />
      <span style={{ minWidth: 0, display: 'block' }}>
        <span className="nx-who">{item.name}</span>
        <span className="nx-sum">{item.summary || '—'}</span>
      </span>
      <span className="nx-end">
        <Chip tone={tone}>{label}</Chip>
        <span className="nx-when">{fmtWhen(item.time)}</span>
      </span>
    </button>
  )
}

export function Sk({ h, w = '100%' }: { h: number; w?: number | string }) {
  return <div className="nx-sk" style={{ height: h, width: w }} />
}
