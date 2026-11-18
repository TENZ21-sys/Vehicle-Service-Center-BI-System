import React from 'react'
import { InventoryItem } from '@shared/types/inventory.types'
import { TopSellingPart } from '@shared/types/finance.types'

interface InventoryDemandBlockProps {
  lowStockItems: InventoryItem[]
  topDemandedParts: TopSellingPart[]
  onNavigate: (tab: string) => void
  formatMoney: (cents: number) => string
}

export const InventoryDemandBlock: React.FC<InventoryDemandBlockProps> = ({
  lowStockItems,
  topDemandedParts,
  onNavigate,
  formatMoney
}) => {
  // Calculate max units for relative demand bar scaling
  const maxUnits = topDemandedParts.length > 0
    ? Math.max(...topDemandedParts.map((p) => p.unitsSold), 1)
    : 10

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}
    >
      {/* Panel 1: Low Stock Reorder Attention */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Low Stock & Reorder Alerts
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Parts at or below minimum threshold
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('inventory')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4
            }}
          >
            Manage Stock →
          </button>
        </div>

        {/* Content list */}
        <div style={{ flex: 1 }}>
          {lowStockItems.length === 0 ? (
            <div
              style={{
                height: '100%',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #e2e8f0',
                padding: 16
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📦✨</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                Inventory Levels are Optimal
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                No parts are currently below their minimum reorder point.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
              {lowStockItems.slice(0, 6).map((item) => {
                const isCritical = (item.currentStock || 0) <= 0
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: isCritical ? '#fff5f5' : '#fffbeb',
                      borderRadius: 8,
                      border: `1px solid ${isCritical ? '#fed7d7' : '#fef3c7'}`
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                          [{item.sku || 'SKU'}]
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Unit Cost: <strong>{formatMoney(item.costPriceAmount)}</strong>
                      </div>
                    </div>

                    {/* Stock Count Pill */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          display: 'inline-block',
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 6,
                          backgroundColor: isCritical ? '#fee2e2' : '#fef3c7',
                          color: isCritical ? '#dc2626' : '#d97706',
                          border: `1px solid ${isCritical ? '#fca5a5' : '#fde68a'}`
                        }}
                      >
                        {item.currentStock ?? 0} {item.unitOfMeasureAbbr || 'units'} left
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        Reorder at: {item.reorderLevel}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel 2: Fast-Moving Parts Demand Chart */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                High-Demand Parts & Consumption
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Fastest-moving spare parts consumed in workshop repairs
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('bi')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4
            }}
          >
            BI Analytics →
          </button>
        </div>

        {/* Demand Chart / Breakdown */}
        <div style={{ flex: 1 }}>
          {topDemandedParts.length === 0 ? (
            <div
              style={{
                height: '100%',
                minHeight: 180,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #e2e8f0',
                padding: 16
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📈🔧</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                Parts Demand Tracking Ready
              </div>
              <p style={{ fontSize: 12, color: '#64748b', maxWidth: 300, margin: '4px 0 0 0' }}>
                As parts are issued to job cards and billed to customers, this chart dynamically tracks your highest-velocity items.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto' }}>
              {topDemandedParts.slice(0, 5).map((part, idx) => {
                const percent = Math.min(Math.round((part.unitsSold / maxUnits) * 100), 100)
                const colors = ['#2563eb', '#0d9488', '#8b5cf6', '#d97706', '#ec4899']
                const barColor = colors[idx % colors.length]

                return (
                  <div key={part.id || idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {part.name}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>({part.sku})</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {part.unitsSold} sold
                        </span>
                        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                          {formatMoney(part.totalRevenueAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Demand Bar */}
                    <div style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(percent, 4)}%`,
                          backgroundColor: barColor,
                          borderRadius: 5,
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
