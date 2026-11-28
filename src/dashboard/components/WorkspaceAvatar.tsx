// A soft gradient tile whose colours come from the workspace name, so each company recognises its own workspace.
const PALETTES = [
  ['#7CF7C4', '#4FC3FF', '#B07BFF'], ['#FFB36B', '#FF5F8D', '#8E5BFF'], ['#6CF0FF', '#5B7CFF', '#C06BFF'],
  ['#FFE27A', '#7CE38A', '#22C3B0'], ['#FF8FB0', '#FFC36B', '#7AA2FF'],
]
const hash = (s: string) => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0; return x }

export function WorkspaceAvatar({ name, size = 30 }: { name: string; size?: number }) {
  const p = PALETTES[hash(name) % PALETTES.length]
  const r = hash(`${name}x`)
  const blob = (w: string, pos: Record<string, string>, color: string) =>
    <i style={{ position: 'absolute', width: w, height: w, borderRadius: '50%', filter: `blur(${Math.max(5, size / 8)}px)`, background: color, ...pos }} />
  return (
    <span aria-hidden="true" style={{ position: 'relative', overflow: 'hidden', display: 'block', flex: 'none', width: size, height: size, borderRadius: size * 0.3, background: p[0] }}>
      {blob('70%', { left: `${(r % 25) - 10}%`, top: `${(r % 20) - 8}%` }, p[1])}
      {blob('75%', { right: `${(r % 18) - 10}%`, bottom: `${(r % 22) - 10}%` }, p[2])}
    </span>
  )
}
