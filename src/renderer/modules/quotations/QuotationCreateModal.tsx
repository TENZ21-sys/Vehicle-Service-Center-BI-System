import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { InventoryItem } from '@shared/types/inventory.types'
import { ServiceItem } from '@shared/types/catalogue.types'
import { QuotationItemLineInput, QuotationWithDetails } from '@shared/types/quotation.types'

interface Props {
  currencySymbol?: string
  onClose: () => void
  onSuccess: (quotation: QuotationWithDetails) => void
}

export const QuotationCreateModal: React.FC<Props> = ({
  currencySymbol = 'Rs.',
  onClose,
  onSuccess
}) => {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])

  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [lines, setLines] = useState<QuotationItemLineInput[]>([])

  // Line item input state
  const [lineType, setLineType] = useState<'part' | 'service'>('service')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [lineQty, setLineQty] = useState('1')
  const [linePriceStr, setLinePriceStr] = useState('0.00')
  const [lineDescription, setLineDescription] = useState('')
  const [lineCostPrice, setLineCostPrice] = useState(0)

  // Quotation terms
  const [validityDays, setValidityDays] = useState('14')
  const [discountStr, setDiscountStr] = useState('0.00')
  const [taxRatePercent, setTaxRatePercent] = useState('0')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async (): Promise<void> => {
      setLoading(true)
      try {
        const [cRes, iRes, sRes, qtSettings, taxRes] = await Promise.all([
          api.customers.list(false),
          api.inventory.listItems({}),
          api.catalogue.listServices(),
          api.settings.getByCategory('quotations'),
          api.settings.get('financial', 'default_tax_rate')
        ])

        if (cRes.success && cRes.data) {
          setCustomers(cRes.data)
          if (cRes.data.length > 0) {
            setCustomerId(cRes.data[0].id)
            if (cRes.data[0].vehicles && cRes.data[0].vehicles.length > 0) {
              setVehicleId(cRes.data[0].vehicles[0].id)
            }
          }
        }
        if (iRes.success && iRes.data) {
          setInventoryItems(iRes.data.filter((item) => item.isActive))
        }
        if (sRes.success && sRes.data) {
          setServices(sRes.data.filter((s) => s.isActive))
        }
        if (qtSettings.success && qtSettings.data && qtSettings.data.default_validity_days) {
          setValidityDays(String(qtSettings.data.default_validity_days))
        }
        if (taxRes.success && typeof taxRes.data === 'number') {
          setTaxRatePercent((taxRes.data / 100).toString())
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize form')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const handleCustomerChange = (cid: string): void => {
    setCustomerId(cid)
    const cust = customers.find((c) => c.id === cid)
    if (cust && cust.vehicles && cust.vehicles.length > 0) {
      setVehicleId(cust.vehicles[0].id)
    } else {
      setVehicleId('')
    }
  }

  const handleItemSelect = (id: string): void => {
    setSelectedItemId(id)
    if (lineType === 'part') {
      const item = inventoryItems.find((i) => i.id === id)
      if (item) {
        setLineDescription(item.name)
        setLinePriceStr((item.sellingPriceAmount / 100).toFixed(2))
        setLineCostPrice(item.costPriceAmount)
      }
    } else {
      const svc = services.find((s) => s.id === id)
      if (svc) {
        const totalUnit = svc.basePriceAmount + svc.laborChargeAmount
        setLineDescription(svc.name)
        setLinePriceStr((totalUnit / 100).toFixed(2))
        setLineCostPrice(0)
      }
    }
  }

  const handleAddLine = (): void => {
    setError(null)
    const qty = parseFloat(lineQty)
    const unitPrice = parseFloat(linePriceStr)

    if (!lineDescription.trim()) {
      setError('Line item description is required')
      return
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be greater than zero')
      return
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      setError('Unit price cannot be negative')
      return
    }

    const newLine: QuotationItemLineInput = {
      itemType: lineType,
      referenceId: selectedItemId || undefined,
      description: lineDescription.trim(),
      quantity: qty,
      unitPriceAmount: Math.round(unitPrice * 100),
      costPriceAmount: lineCostPrice
    }

    setLines([...lines, newLine])
    setSelectedItemId('')
    setLineDescription('')
    setLineQty('1')
    setLinePriceStr('0.00')
    setLineCostPrice(0)
  }

  const handleRemoveLine = (idx: number): void => {
    setLines(lines.filter((_, i) => i !== idx))
  }

  const formatDisplay = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  // Totals
  const subtotalCents = lines.reduce(
    (acc, l) => acc + Math.round(l.unitPriceAmount * l.quantity),
    0
  )
  const taxBasisPoints = Math.round(parseFloat(taxRatePercent || '0') * 100)
  const taxCents = Math.round((subtotalCents * taxBasisPoints) / 10000)
  const discountCents = Math.round(parseFloat(discountStr || '0') * 100)
  const grandTotalCents = Math.max(0, subtotalCents + taxCents - discountCents)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!customerId) {
      setError('Customer is required')
      return
    }

    if (lines.length === 0) {
      setError('Please add at least one line item to the quotation')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.quotations.create({
        customerId,
        vehicleId: vehicleId || undefined,
        items: lines,
        validityDays: parseInt(validityDays, 10) || 14,
        discountAmount: discountCents > 0 ? discountCents : undefined,
        taxRate: taxBasisPoints,
        notes: notes.trim() || undefined
      })

      if (res.success && res.data) {
        onSuccess(res.data)
      } else {
        setError(res.error?.message || 'Failed to create quotation')
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating quotation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 36, textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Loading quotation form...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Create Formal Quotation / Estimate
            </h3>
          </div>
          <button onClick={onClose} style={closeIconStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(92vh - 80px)' }}>
          {error && <div style={errorBannerStyle}>{error}</div>}

          {/* Customer & Vehicle */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                style={inputStyle}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phonePrimary})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Vehicle (Optional)</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                style={inputStyle}
              >
                <option value="">No vehicle assigned (General Quote)</option>
                {selectedCustomer?.vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Line Item Box */}
          <div style={itemBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Add Estimate Line Item
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setLineType('service')
                    setSelectedItemId('')
                    setLineDescription('')
                  }}
                  style={lineType === 'service' ? activeTabBtnStyle : tabBtnStyle}
                >
                  🔧 Service
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineType('part')
                    setSelectedItemId('')
                    setLineDescription('')
                  }}
                  style={lineType === 'part' ? activeTabBtnStyle : tabBtnStyle}
                >
                  📦 Part
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Select {lineType === 'service' ? 'Service' : 'Inventory Part'}</label>
                {lineType === 'service' ? (
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose a service...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatDisplay(s.basePriceAmount + s.laborChargeAmount)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose an inventory item...</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - Stock: {item.currentStock} ({formatDisplay(item.sellingPriceAmount)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={labelStyle}>Qty</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Unit Price ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={linePriceStr}
                  onChange={(e) => setLinePriceStr(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <button
                type="button"
                onClick={handleAddLine}
                style={addLineBtnStyle}
              >
                + Add
              </button>
            </div>
          </div>

          {/* Table of Line Items */}
          <div style={{ marginBottom: 16 }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Description</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unit Price</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Line Total</th>
                  <th style={{ ...thStyle, width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontStyle: 'italic' }}>
                      No items added to quotation yet.
                    </td>
                  </tr>
                ) : (
                  lines.map((l, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <span style={l.itemType === 'service' ? serviceBadgeStyle : partBadgeStyle}>
                          {l.itemType}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{l.description}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{l.quantity}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{formatDisplay(l.unitPriceAmount)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                        {formatDisplay(Math.round(l.unitPriceAmount * l.quantity))}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          style={removeBtnStyle}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Validity, Tax, Discount & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Validity (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Discount ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discountStr}
                onChange={(e) => setDiscountStr(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Terms & Additional Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Estimate valid subject to physical parts availability. 50% deposit required upon authorization."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={textareaStyle}
            />
          </div>

          {/* Financial Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <div style={{ width: 260, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={calcRowStyle}>
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <span>{formatDisplay(subtotalCents)}</span>
              </div>
              {taxCents > 0 && (
                <div style={calcRowStyle}>
                  <span style={{ color: '#64748b' }}>Tax ({taxRatePercent}%):</span>
                  <span>{formatDisplay(taxCents)}</span>
                </div>
              )}
              {discountCents > 0 && (
                <div style={calcRowStyle}>
                  <span style={{ color: '#16a34a' }}>Discount:</span>
                  <span style={{ color: '#16a34a' }}>-{formatDisplay(discountCents)}</span>
                </div>
              )}
              <div style={{ ...calcRowStyle, borderTop: '2px solid #cbd5e1', paddingTop: 6, fontSize: 15 }}>
                <strong style={{ color: '#0f172a' }}>Total Estimate:</strong>
                <strong style={{ color: '#0f172a' }}>{formatDisplay(grandTotalCents)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || lines.length === 0} style={submitBtnStyle}>
              {submitting ? 'Creating...' : 'Draft Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1050,
  padding: 16
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 820,
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column'
}

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  borderTopLeftRadius: 12,
  borderTopRightRadius: 12
}

const closeIconStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 16,
  color: '#94a3b8',
  cursor: 'pointer'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 4
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box'
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxSizing: 'border-box',
  fontFamily: 'inherit'
}

const itemBoxStyle: React.CSSProperties = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: 14,
  marginBottom: 16
}

const tabBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  cursor: 'pointer'
}

const activeTabBtnStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: '1px solid #2563eb',
  borderRadius: 4,
  cursor: 'pointer'
}

const addLineBtnStyle: React.CSSProperties = {
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  height: '35px'
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
}

const thStyle: React.CSSProperties = {
  padding: '8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#475569',
  textTransform: 'uppercase'
}

const tdStyle: React.CSSProperties = {
  padding: '8px',
  fontSize: 13,
  color: '#334155'
}

const removeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#dc2626',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12
}

const serviceBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#eff6ff',
  color: '#2563eb'
}

const partBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: 4,
  backgroundColor: '#fef3c7',
  color: '#d97706'
}

const calcRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  padding: '3px 0'
}

const errorBannerStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  borderRadius: 6,
  fontSize: 12,
  marginBottom: 14
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer'
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}
