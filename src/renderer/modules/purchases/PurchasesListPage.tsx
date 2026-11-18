import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { Purchase } from '@shared/types/inventory.types'
import { PurchaseOrderModal } from './PurchaseOrderModal'
import { SuppliersListPage } from './SuppliersListPage'
import { formatMoney } from '@shared/types/money.types'

export const PurchasesListPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'purchases' | 'suppliers'>('purchases')
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    if (activeSubTab === 'purchases') {
      loadPurchases()
    }
  }, [activeSubTab])

  const loadPurchases = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.purchases.list()
      if (res.success && res.data) {
        setPurchases(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleViewPurchase = async (purchaseId: string): Promise<void> => {
    try {
      const res = await api.purchases.get(purchaseId)
      if (res.success && res.data) {
        setViewingPurchase(res.data)
      }
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
            Purchases & Suppliers
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Manage supplier records, purchase orders, and workshop parts intake
          </p>
        </div>
        {activeSubTab === 'purchases' && (
          <button onClick={() => setShowOrderModal(true)} style={primaryBtnStyle}>
            + Record Purchase / Intake
          </button>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button
          onClick={() => setActiveSubTab('purchases')}
          style={{
            ...tabBtnStyle,
            borderBottom: activeSubTab === 'purchases' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeSubTab === 'purchases' ? '#2563eb' : '#6b7280',
            fontWeight: activeSubTab === 'purchases' ? 600 : 400
          }}
        >
          📦 Purchase Orders & Intake
        </button>
        <button
          onClick={() => setActiveSubTab('suppliers')}
          style={{
            ...tabBtnStyle,
            borderBottom: activeSubTab === 'suppliers' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeSubTab === 'suppliers' ? '#2563eb' : '#6b7280',
            fontWeight: activeSubTab === 'suppliers' ? 600 : 400
          }}
        >
          🏢 Suppliers Directory
        </button>
      </div>

      {activeSubTab === 'suppliers' ? (
        <SuppliersListPage />
      ) : (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={thStyle}>PO Number</th>
                <th style={thStyle}>Purchase Date</th>
                <th style={thStyle}>Supplier</th>
                <th style={thStyle}>Notes / Reference</th>
                <th style={thStyle}>Total Cost</th>
                <th style={thStyle}>Recorded By</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#1d4ed8' }}>
                      {p.purchaseNumber}
                    </td>
                    <td style={tdStyle}>{p.purchaseDate}</td>
                    <td style={tdStyle}>{p.supplierName || 'Direct / Walk-in'}</td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{p.notes || '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: '#047857' }}>
                      {formatMoney(p.totalAmount)}
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280' }}>{p.createdByName || 'Staff'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => handleViewPurchase(p.id)}
                        style={actionBtnStyle}
                      >
                        View Items
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showOrderModal && (
        <PurchaseOrderModal
          onClose={() => setShowOrderModal(false)}
          onSaved={() => {
            setShowOrderModal(false)
            loadPurchases()
          }}
        />
      )}

      {viewingPurchase && (
        <div style={backdropStyle}>
          <div style={detailModalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                  Purchase Order: {viewingPurchase.purchaseNumber}
                </h2>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  Supplier: {viewingPurchase.supplierName || 'Direct Purchase'} | Date: {viewingPurchase.purchaseDate}
                </div>
              </div>
              <button onClick={() => setViewingPurchase(null)} style={closeBtnStyle}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 6, marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item Name / SKU</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPurchase.items?.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{item.itemName}</div>
                        {item.itemSku && <div style={{ fontSize: 11, color: '#6b7280' }}>SKU: {item.itemSku}</div>}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {item.quantity} {item.unitAbbr || ''}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        {formatMoney(item.unitCostAmount)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {formatMoney(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', padding: 12, borderRadius: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Grand Total:</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#047857' }}>
                {formatMoney(viewingPurchase.totalAmount)}
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button onClick={() => setViewingPurchase(null)} style={cancelBtnStyle}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontWeight: 600, color: '#374151', fontSize: 13
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', verticalAlign: 'middle'
}
const tabBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: '10px 18px', cursor: 'pointer', fontSize: 14, outline: 'none'
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14
}
const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500
}
const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const detailModalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 650, maxWidth: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
