import React from 'react'

interface OperationalMetricsGridProps {
  ongoingCount: number
  yetToBeDoneCount: number
  todayRevenueCents: number
  lowStockCount: number
  onNavigate: (tab: string) => void
  formatMoney: (cents: number) => string
}

export const OperationalMetricsGrid: React.FC<OperationalMetricsGridProps> = ({
  ongoingCount,
  yetToBeDoneCount,
  todayRevenueCents,
  lowStockCount,
  onNavigate,
  formatMoney
}) => {
  const cards = [
    {
      id: 'ongoing',
      title: 'Ongoing Works',
      value: ongoingCount,
      subtitle: `${ongoingCount} vehicle(s) on service bay`,
      icon: '⚡',
      badge: 'Live Floor',
      color: '#0284c7',
      bgLight: '#f0f9ff',
      borderColor: '#bae6fd',
      tab: 'jobcards'
    },
    {
      id: 'pending',
      title: 'Works Yet to Be Done',
      value: yetToBeDoneCount,
      subtitle: 'Awaiting technician / intake queue',
      icon: '⏳',
      badge: 'Queued',
      color: '#d97706',
      bgLight: '#fffbeb',
      borderColor: '#fde68a',
      tab: 'jobcards'
    },
    {
      id: 'revenue',
      title: "Today's Revenue",
      value: formatMoney(todayRevenueCents),
      subtitle: 'Invoiced & payments recorded today',
      icon: '💰',
      badge: 'Cash Inflow',
      color: '#16a34a',
      bgLight: '#f0fdf4',
      borderColor: '#bbf7d0',
      tab: 'billing'
    },
    {
      id: 'inventory',
      title: 'Low Stock Alerts',
      value: lowStockCount,
      subtitle: lowStockCount > 0 ? 'Parts at/below reorder minimum' : 'All stock levels healthy',
      icon: '⚠️',
      badge: lowStockCount > 0 ? 'Needs Attention' : 'Optimal',
      color: lowStockCount > 0 ? '#dc2626' : '#64748b',
      bgLight: lowStockCount > 0 ? '#fef2f2' : '#f8fafc',
      borderColor: lowStockCount > 0 ? '#fecaca' : '#e2e8f0',
      tab: 'inventory'
    }
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}
    >
      {cards.map((card) => (
        <div
          key={card.id}
          onClick={() => onNavigate(card.tab)}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: `1px solid ${card.borderColor}`,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 14px -2px rgba(0, 0, 0, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Top row: Icon & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: card.bgLight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18
              }}
            >
              {card.icon}
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 12,
                backgroundColor: card.bgLight,
                color: card.color,
                border: `1px solid ${card.borderColor}`
              }}
            >
              {card.badge}
            </span>
          </div>

          {/* Value and Title */}
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 2 }}>
              {card.title}
            </div>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 12,
              color: '#64748b',
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #f1f5f9',
              paddingTop: 8
            }}
          >
            <span>{card.subtitle}</span>
            <span style={{ fontSize: 13, color: card.color, fontWeight: 700 }}>→</span>
          </div>
        </div>
      ))}
    </div>
  )
}
