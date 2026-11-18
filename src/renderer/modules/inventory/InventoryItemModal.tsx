import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  InventoryItem,
  InventoryCategory,
  UnitOfMeasure
} from '@shared/types/inventory.types'
import { toMoneyAmount } from '@shared/types/money.types'

interface Props {
  item?: InventoryItem | null
  onClose: () => void
  onSaved: () => void
}

export const InventoryItemModal: React.FC<Props> = ({ item, onClose, onSaved }) => {
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [units, setUnits] = useState<UnitOfMeasure[]>([])

  const [sku, setSku] = useState(item?.sku || '')
  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [categoryId, setCategoryId] = useState(item?.categoryId || '')
  const [unitId, setUnitId] = useState(item?.unitId || '')
  const [costPriceDisplay, setCostPriceDisplay] = useState(
    item ? (item.costPriceAmount / 100).toFixed(2) : '0.00'
  )
  const [sellingPriceDisplay, setSellingPriceDisplay] = useState(
    item ? (item.sellingPriceAmount / 100).toFixed(2) : '0.00'
  )
  const [reorderLevel, setReorderLevel] = useState(
    item ? item.reorderLevel.toString() : '5'
  )
  const [location, setLocation] = useState(item?.location || '')
  const [initialStock, setInitialStock] = useState('0')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOptions()
  }, [])

  const loadOptions = async (): Promise<void> => {
    try {
      const [catRes, unitRes] = await Promise.all([
        api.inventory.listCategories(false),
        api.inventory.listUnits(false)
      ])
      if (catRes.success && catRes.data) {
        setCategories(catRes.data)
        if (!categoryId && catRes.data.length > 0) {
          setCategoryId(catRes.data[0].id)
        }
      }
      if (unitRes.success && unitRes.data) {
        setUnits(unitRes.data)
        if (!unitId && unitRes.data.length > 0) {
          setUnitId(unitRes.data[0].id)
        }
      }
    } catch {
      // ignore
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Item name is required')
      return
    }

    let costPriceAmount = 0
    let sellingPriceAmount = 0
    try {
      costPriceAmount = toMoneyAmount(costPriceDisplay)
      sellingPriceAmount = toMoneyAmount(sellingPriceDisplay)
    } catch {
      setError('Please enter valid numeric prices')
      return
    }

    const parsedReorderLevel = parseFloat(reorderLevel) || 0
    const parsedInitialStock = parseFloat(initialStock) || 0

    const payload = {
      sku: sku.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      categoryId: categoryId || null,
      unitId: unitId || null,
      costPriceAmount,
      sellingPriceAmount,
      reorderLevel: parsedReorderLevel,
      location: location.trim() || null,
      initialStock: !item && parsedInitialStock > 0 ? parsedInitialStock : undefined
    }

    setLoading(true)
    try {
      if (item) {
        const res = await api.inventory.updateItem(item.id, payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to update item')
          return
        }
      } else {
        const res = await api.inventory.createItem(payload)
        if (!res.success) {
          setError(res.error?.message || 'Failed to create item')
          return
        }
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Error saving item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {item ? 'Edit Inventory Item' : 'New Inventory Item'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>SKU / Item Code</label>
              <input
                type="text"
                placeholder="e.g. OIL-5W30-4L"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Item Name *</label>
              <input
                type="text"
                placeholder="e.g. Synthetic Engine Oil 5W-30 (4L)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Uncategorized --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Unit of Measure</label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description / Specifications</label>
            <textarea
              placeholder="Brand, grade, OEM cross references, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Cost Price (Standard)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPriceDisplay}
                onChange={(e) => setCostPriceDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Selling Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPriceDisplay}
                onChange={(e) => setSellingPriceDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Reorder Level (Alert)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Shelf / Bin Location</label>
              <input
                type="text"
                placeholder="e.g. Rack A - Shelf 2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={inputStyle}
              />
            </div>

            {!item && (
              <div>
                <label style={labelStyle}>Initial Opening Stock</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={saveBtnStyle}>
              {loading ? 'Saving...' : item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 620, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto'
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box'
}
const saveBtnStyle: React.CSSProperties = {
  padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500
}
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280'
}
const errorStyle: React.CSSProperties = {
  padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 13
}
