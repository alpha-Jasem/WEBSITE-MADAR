import type { CSSProperties } from 'react'

// ─── Keyframes injected once ──────────────────────────────────────────────────

let _injected = false
const injectKeyframes = () => {
  if (_injected || typeof document === 'undefined') return
  _injected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes skeleton-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `
  document.head.appendChild(style)
}

// ─── Base shimmer style ───────────────────────────────────────────────────────

const shimmerStyle = (): CSSProperties => {
  injectKeyframes()
  return {
    background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s infinite',
    borderRadius: 6,
  }
}

// ─── SkeletonLine ─────────────────────────────────────────────────────────────

export const SkeletonLine = ({
  width = '100%',
  height = 14,
}: {
  width?: string | number
  height?: string | number
}) => (
  <div
    style={{
      ...shimmerStyle(),
      width,
      height,
      borderRadius: 4,
    }}
  />
)

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export const SkeletonCard = ({ rows = 3 }: { rows?: number }) => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 12,
      border: '1px solid #F1F5F9',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
  >
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonLine
        key={i}
        width={i === rows - 1 ? '60%' : '100%'}
        height={i === 0 ? 16 : 13}
      />
    ))}
  </div>
)

// ─── StatCardSkeleton ────────────────────────────────────────────────────────

export const StatCardSkeleton = () => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 12,
      border: '1px solid #F1F5F9',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      minWidth: 0,
    }}
    dir="rtl"
  >
    {/* Icon circle */}
    <div
      style={{
        ...shimmerStyle(),
        width: 42,
        height: 42,
        borderRadius: '50%',
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Label */}
      <SkeletonLine width="60%" height={12} />
      {/* Value */}
      <SkeletonLine width="40%" height={22} />
    </div>
  </div>
)

// ─── TableRowSkeleton ────────────────────────────────────────────────────────

export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td
        key={i}
        style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}
      >
        <SkeletonLine width={i === 0 ? '80%' : i === cols - 1 ? '50%' : '70%'} height={13} />
      </td>
    ))}
  </tr>
)

// ─── PageSkeleton ─────────────────────────────────────────────────────────────

export const PageSkeleton = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      padding: '24px 0',
    }}
  >
    {/* 4 stat cards */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Table */}
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #F1F5F9',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <th
                key={i}
                style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  borderBottom: '1px solid #F1F5F9',
                  background: '#F8FAFC',
                }}
              >
                <SkeletonLine width="60%" height={12} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} cols={5} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
)
