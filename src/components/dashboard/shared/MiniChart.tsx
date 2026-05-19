import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts'

interface MiniChartProps {
  data: { [key: string]: number | string }[]
  dataKey: string
  type?: 'area' | 'bar'
  color?: string
  height?: number
}

export const MiniChart = ({ data, dataKey, type = 'area', color = '#4F6EF7', height = 60 }: MiniChartProps) => {
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Tooltip
            contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{ background: '#0F1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
          cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <Area dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
