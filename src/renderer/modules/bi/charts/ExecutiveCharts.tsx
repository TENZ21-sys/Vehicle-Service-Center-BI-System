import React, { useState } from 'react'

export interface DonutSegment {
  name: string
  value: number
  color: string
  formattedValue?: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}

export const ExecutiveDonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 220,
  thickness = 32,
  centerLabel,
  centerValue
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  if (total <= 0 || segments.length === 0) {
    return (
      <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
        No category expenditure recorded
      </div>
    )
  }

  const radius = size / 2
  const innerRadius = radius - thickness
  let cumulativeAngle = -Math.PI / 2

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number): { x: number; y: number } => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => {
            if (seg.value <= 0) return null
            const fraction = seg.value / total
            const angle = fraction * Math.PI * 2
            const startAngle = cumulativeAngle
            const endAngle = cumulativeAngle + angle
            cumulativeAngle = endAngle

            const isHovered = hoveredIdx === i
            const r = isHovered ? radius + 3 : radius
            const ir = innerRadius

            const p1 = polarToCartesian(radius, radius, r, startAngle)
            const p2 = polarToCartesian(radius, radius, r, endAngle)
            const p3 = polarToCartesian(radius, radius, ir, endAngle)
            const p4 = polarToCartesian(radius, radius, ir, startAngle)

            const largeArc = angle > Math.PI ? 1 : 0

            const d = [
              `M ${p1.x} ${p1.y}`,
              `A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
              `L ${p3.x} ${p3.y}`,
              `A ${ir} ${ir} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
              'Z'
            ].join(' ')

            return (
              <path
                key={i}
                d={d}
                fill={seg.color}
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
                cursor="pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ transition: 'all 0.2s ease' }}
              />
            )
          })}
        </svg>

        {/* Center Label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            {hoveredIdx !== null ? segments[hoveredIdx].name : (centerLabel || 'Total Expenses')}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 2 }}>
            {hoveredIdx !== null
              ? segments[hoveredIdx].formattedValue || segments[hoveredIdx].value
              : centerValue}
          </div>
        </div>
      </div>

      {/* Legend List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
        {segments.map((seg, i) => {
          const pct = Math.round((seg.value / total) * 100)
          const isHovered = hoveredIdx === i
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                backgroundColor: isHovered ? '#f1f5f9' : 'transparent',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: seg.color,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontWeight: isHovered ? 700 : 500, color: '#334155' }}>
                  {seg.name}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {seg.formattedValue || seg.value}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>({pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FinancialBarChartProps {
  revenue: number
  cogs: number
  expenses: number
  netProfit: number
  formatMoney: (cents: number) => string
}

export const FinancialComparisonBarChart: React.FC<FinancialBarChartProps> = ({
  revenue,
  cogs,
  expenses,
  netProfit,
  formatMoney
}) => {
  const max = Math.max(revenue, cogs + expenses, 1)

  const bars = [
    { label: 'Total Revenue', value: revenue, color: '#2563eb', bg: '#eff6ff' },
    { label: 'COGS (Parts Cost)', value: cogs, color: '#d97706', bg: '#fffbeb' },
    { label: 'Overhead Expenses', value: expenses, color: '#dc2626', bg: '#fef2f2' },
    {
      label: 'Net Profit',
      value: Math.max(netProfit, 0),
      color: netProfit >= 0 ? '#16a34a' : '#ef4444',
      bg: netProfit >= 0 ? '#f0fdf4' : '#fef2f2'
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {bars.map((bar, i) => {
        const pct = Math.min(Math.round((bar.value / max) * 100), 100)
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>{bar.label}</span>
              <span style={{ fontWeight: 700, color: bar.color }}>
                {bar.label === 'Net Profit' && netProfit < 0 ? `-${formatMoney(Math.abs(netProfit))}` : formatMoney(bar.value)}
              </span>
            </div>
            <div style={{ height: 16, backgroundColor: '#f1f5f9', borderRadius: 8, overflow: 'hidden', padding: 2 }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(pct, 2)}%`,
                  backgroundColor: bar.color,
                  borderRadius: 6,
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
