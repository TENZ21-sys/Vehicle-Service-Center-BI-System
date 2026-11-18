import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { InventoryItem, InventoryCategory } from '@shared/types/inventory.types'
import { InventoryItemModal } from './InventoryItemModal'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { StockMovementHistoryModal } from './StockMovementHistoryModal'
import { formatMoney } from '@shared/types/money.types'
import { downloadCsv } from '../../utils/csvDownload'
import { DataImportModal } from '../../components/Common/DataImportModal'

export const InventoryListPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  // Modals
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null)
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleExportCsv = async (type: 'inventory' | 'stock_movements' = 'inventory'): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.export.data(type)
      if (res.success && res.data) {
        downloadCsv(res.data.filename, res.data.csvContent)
      }
    } catch (err) {
      console.error('Inventory export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    loadCategories()
    loadItems()
  }, [])

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.inventory.listCategories(false)
      if (res.success && res.data) setCategories(res.data)
    } catch {
      // ignore
    }
  }

  const loadItems = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.inventory.listItems({
        categoryId: selectedCategory || undefined,
        search: searchQuery || undefined,
        lowStockOnly
      })
      if (res.success && res.data) {
        setItems(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [selectedCategory, searchQuery, lowStockOnly])

  const handleDeactivate = async (item: InventoryItem): Promise<void> => {
    if (!window.confirm(`Are you sure you want to remove item "${item.name}"? It will be archived and removed from active inventory.`)) return
    try {
      const res = await api.inventory.deactivateItem(item.id)
      if (res.success) {
        loadItems()
      } else {
        alert(res.error?.message || 'Failed to remove inventory item')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>
            Inventory & Stock
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
            Live stock ledger, reorder levels, manual adjustments, and item management
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => handleExportCsv('inventory')}
            disabled={exporting}
            style={{
              padding: '8px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              color: '#374151',
              fontWeight: 500,
              cursor: exporting ? 'not-allowed' : 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : '📥 Export Stock CSV'}
          </button>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowItemModal(true)
            }}
            style={primaryBtnStyle}
          >
            + Add Item
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by name, SKU, or shelf location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, width: 340 }}
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ ...inputStyle, width: 220 }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', userSelect: 'none', marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          <span style={{ fontWeight: 500, color: lowStockOnly ? '#b91c1c' : '#374151' }}>
            ⚠️ Low Stock Alert Only
          </span>
        </label>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>SKU / Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Cost Price</th>
              <th style={thStyle}>Selling Price</th>
              <th style={thStyle}>Calculated Stock</th>
              <th style={thStyle}>Reorder Level</th>
              <th style={thStyle}>Location</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  Loading inventory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                  No inventory items match the criteria.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>SKU: {item.sku || 'N/A'}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 12, background: '#f3f4f6', padding: '3px 8px', borderRadius: 4 }}>
                      {item.categoryName || 'General'}
                    </span>
                  </td>
                  <td style={tdStyle}>{formatMoney(item.costPriceAmount)}</td>
                  <td style={tdStyle}>{formatMoney(item.sellingPriceAmount)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: item.isLowStock ? '#dc2626' : '#111827' }}>
                        {item.currentStock} {item.unitAbbr || ''}
                      </span>
                      {item.isLowStock && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>
                          LOW
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={tdStyle}>{item.reorderLevel} {item.unitAbbr || ''}</td>
                  <td style={tdStyle}>{item.location || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => setAdjustingItem(item)}
                      title="Adjust Stock"
                      style={actionBtnStyle}
                    >
                      Adjust
                    </button>
                    <button
                      onClick={() => setHistoryItem(item)}
                      title="Movement History"
                      style={actionBtnStyle}
                    >
                      Ledger
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setShowItemModal(true)
                      }}
                      style={actionBtnStyle}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(item)}
                      style={{ ...actionBtnStyle, color: '#dc2626' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showItemModal && (
        <InventoryItemModal
          item={editingItem}
          onClose={() => {
            setShowItemModal(false)
            setEditingItem(null)
          }}
          onSaved={() => {
            setShowItemModal(false)
            setEditingItem(null)
            loadItems()
          }}
        />
      )}

      {adjustingItem && (
        <StockAdjustmentModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSaved={() => {
            setAdjustingItem(null)
            loadItems()
          }}
        />
      )}

      {historyItem && (
        <StockMovementHistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}

      {/* CSV Import Modal */}
      <DataImportModal
        sector="inventory"
        title="Inventory Items & Parts"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadItems()
        }}
      />
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '12px 16px', fontWeight: 600, color: '#374151', fontSize: 13
}
const tdStyle: React.CSSProperties = {
  padding: '12px 16px', verticalAlign: 'middle'
}
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14
}
const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500, marginLeft: 8
}
