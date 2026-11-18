import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { InventoryItem } from '@shared/types/inventory.types'
import { ServiceItem } from '@shared/types/catalogue.types'
import { PosItemLineInput, InvoiceWithDetails } from '@shared/types/invoice.types'

interface Props {
  currencySymbol?: string
  onClose: () => void
  onSuccess: (invoice: InvoiceWithDetails) => void
}

export const PosSaleModal: React.FC<Props> = ({
  currencySymbol = 'Rs.',
  onClose,
  onSuccess
}) => {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])

  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [lines, setLines] = useState<PosItemLineInput[]>([])

  // Line item input state
  const [lineType, setLineType] = useState<'part' | 'service'>('part')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [lineQty, setLineQty] = useState('1')
  const [linePriceStr, setLinePriceStr] = useState('0.00')
  const [lineDescription, setLineDescription] = useState('')
  const [lineCostPrice, setLineCostPrice] = useState(0)

  // Financial inputs
  const [discountStr, setDiscountStr] = useState('0.00')
  const [taxRatePercent, setTaxRatePercent] = useState('0')
  const [notes, setNotes] = useState('')

  // Barcode scanner state
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanFeedback, setScanFeedback] = useState<string | null>(null)

  // Immediate payment state
  const [collectPayment, setCollectPayment] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paidAmountStr, setPaidAmountStr] = useState('')
  const [paymentRef, setPaymentRef] = useState('')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async (): Promise<void> => {
      setLoading(true)
      try {
        const [cRes, iRes, sRes, taxRes] = await Promise.all([
          api.customers.list(false),
          api.inventory.listItems({}),
          api.catalogue.listServices(),
          api.settings.get('financial', 'default_tax_rate')
        ])

        if (cRes.success && cRes.data) {
          setCustomers(cRes.data)
          if (cRes.data.length > 0) {
            setSelectedCustomerId(cRes.data[0].id)
          }
        }
        if (iRes.success && iRes.data) {
          setInventoryItems(iRes.data.filter((item) => item.isActive))
        }
        if (sRes.success && sRes.data) {
          setServices(sRes.data.filter((s) => s.isActive))
        }
        if (taxRes.success && typeof taxRes.data === 'number') {
          setTaxRatePercent((taxRes.data / 100).toString())
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize POS form')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Auto-populate vehicles when customer changes
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  // Handle item selection in line entry
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
      setError('Item description is required')
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

    // Check stock if part
    if (lineType === 'part' && selectedItemId) {
      const part = inventoryItems.find((i) => i.id === selectedItemId)
      if (part && part.currentStock < qty) {
        setError(`Insufficient stock for "${part.name}". Available: ${part.currentStock}`)
        return
      }
    }

    const newLine: PosItemLineInput = {
      itemType: lineType,
      referenceId: selectedItemId || undefined,
      description: lineDescription.trim(),
      quantity: qty,
      unitPriceAmount: Math.round(unitPrice * 100),
      costPriceAmount: lineCostPrice
    }

    const updated = [...lines, newLine]
    setLines(updated)

    // Reset line input
    setSelectedItemId('')
    setLineDescription('')
    setLineQty('1')
    setLinePriceStr('0.00')
    setLineCostPrice(0)
  }

  const handleRemoveLine = (index: number): void => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = barcodeInput.trim().toLowerCase()
      if (!query) return

      const matched = inventoryItems.find(
        (i) =>
          (i.sku && i.sku.toLowerCase() === query) ||
          (i.name && i.name.toLowerCase() === query)
      )

      if (matched) {
        const existingIdx = lines.findIndex(
          (l) => l.itemType === 'part' && l.referenceId === matched.id
        )
        if (existingIdx >= 0) {
          const newLines = [...lines]
          newLines[existingIdx].quantity += 1
          setLines(newLines)
          setScanFeedback(`+1 ${matched.name} (Total: ${newLines[existingIdx].quantity})`)
        } else {
          const newLine: PosItemLineInput = {
            itemType: 'part',
            referenceId: matched.id,
            description: `${matched.name}${matched.sku ? ` [${matched.sku}]` : ''}`,
            quantity: 1,
            unitPriceAmount: matched.sellingPriceAmount,
            costPriceAmount: matched.costPriceAmount
          }
          setLines([...lines, newLine])
          setScanFeedback(`✓ Added: ${matched.name}`)
        }
        setBarcodeInput('')
      } else {
        setScanFeedback(`⚠️ Item not found for: "${barcodeInput}"`)
      }
    }
  }

  // Calculate live totals
  const subtotalCents = lines.reduce(
    (acc, line) => acc + Math.round(line.unitPriceAmount * line.quantity),
    0
  )
  const taxBasisPoints = Math.round(parseFloat(taxRatePercent || '0') * 100)
  const taxCents = Math.round((subtotalCents * taxBasisPoints) / 10000)
  const discountCents = Math.round(parseFloat(discountStr || '0') * 100)
  const grandTotalCents = Math.max(0, subtotalCents + taxCents - discountCents)

  // Keep paid amount updated if user selected full payment
  useEffect(() => {
    if (collectPayment) {
      setPaidAmountStr((grandTotalCents / 100).toFixed(2))
    }
  }, [grandTotalCents, collectPayment])

  const formatDisplay = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    if (!selectedCustomerId) {
      setError('Please select a customer for the sale')
      return
    }

    if (lines.length === 0) {
      setError('Please add at least one line item to the sale')
      return
    }

    let immediatePayment: any = undefined
    if (collectPayment) {
      const paidNum = parseFloat(paidAmountStr)
      if (isNaN(paidNum) || paidNum <= 0) {
        setError('Please enter a valid positive payment amount')
        return
      }
      const paidCents = Math.round(paidNum * 100)
      if (paidCents > grandTotalCents) {
        setError(`Payment amount cannot exceed grand total of ${formatDisplay(grandTotalCents)}`)
        return
      }

      immediatePayment = {
        paymentMethod,
        amount: paidCents,
        reference: paymentRef.trim() || undefined
      }
    }

    setSubmitting(true)
    try {
      const res = await api.invoices.createPos({
        customerId: selectedCustomerId,
        vehicleId: selectedVehicleId || undefined,
        items: lines,
        discountAmount: discountCents > 0 ? discountCents : undefined,
        taxRate: taxBasisPoints,
        notes: notes.trim() || undefined,
        immediatePayment
      })

      if (res.success && res.data) {
        onSuccess(res.data)
      } else {
        setError(res.error?.message || 'Failed to complete POS sale')
      }
    } catch (err: any) {
      setError(err?.message || 'Error executing POS sale')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={backdropStyle}>
        <div style={{ ...modalStyle, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#6b7280' }}>Loading POS registers...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
                New POS Counter Sale
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                Direct counter billing with automated stock ledger deduction & receipts
              </p>
            </div>
          </div>
          <button onClick={onClose} style={closeIconStyle}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(92vh - 80px)' }}>
          {error && <div style={errorStyle}>{error}</div>}

          {/* Customer & Vehicle Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Customer *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value)
                  setSelectedVehicleId('')
                }}
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
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={inputStyle}
              >
                <option value="">No vehicle linked (Counter Sale)</option>
                {selectedCustomer?.vehicles?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNo} - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Item Line Section */}
          <div style={itemBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Add Line Item
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setLineType('part')
                    setSelectedItemId('')
                    setLineDescription('')
                  }}
                  style={lineType === 'part' ? activeTabBtnStyle : tabBtnStyle}
                >
                  📦 Inventory Part
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLineType('service')
                    setSelectedItemId('')
                    setLineDescription('')
                  }}
                  style={lineType === 'service' ? activeTabBtnStyle : tabBtnStyle}
                >
                  🔧 Service / Labor
                </button>
              </div>
            </div>

            {/* Direct Barcode Scanner Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#f0fdf4',
                border: '1.5px dashed #86efac',
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 14
              }}
            >
              <span style={{ fontSize: 20 }}>📷</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Barcode Reader / Fast SKU Scanner (Plug & Play)
                </div>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Scan barcode with reader or type SKU & press Enter to auto-add..."
                  style={{
                    width: '100%',
                    border: '1px solid #bbf7d0',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 13,
                    marginTop: 4,
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {scanFeedback && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: 6,
                    backgroundColor: scanFeedback.startsWith('✓') || scanFeedback.startsWith('+1') ? '#dcfce7' : '#fee2e2',
                    color: scanFeedback.startsWith('✓') || scanFeedback.startsWith('+1') ? '#15803d' : '#b91c1c'
                  }}
                >
                  {scanFeedback}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Select {lineType === 'part' ? 'Part' : 'Service'}</label>
                {lineType === 'part' ? (
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Choose an inventory part...</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.sku ? `[${item.sku}]` : ''} - Stock: {item.currentStock} ({formatDisplay(item.sellingPriceAmount)})
                      </option>
                    ))}
                  </select>
                ) : (
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

          {/* Lines Table */}
          <div style={{ marginBottom: 20 }}>
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
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontStyle: 'italic' }}>
                      No items added yet. Use the selector above to add parts or services.
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

          {/* Discounts, Tax & Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
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
            <div>
              <label style={labelStyle}>Notes</label>
              <input
                type="text"
                placeholder="Optional sale note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Financial Summary & Immediate Payment Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <input
                  type="checkbox"
                  id="collectNow"
                  checked={collectPayment}
                  onChange={(e) => setCollectPayment(e.target.checked)}
                />
                <label htmlFor="collectNow" style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', cursor: 'pointer' }}>
                  Collect Payment Now (Immediate Receipt)
                </label>
              </div>

              {collectPayment && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Amount Paid ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(grandTotalCents / 100).toFixed(2)}
                      value={paidAmountStr}
                      onChange={(e) => setPaidAmountStr(e.target.value)}
                      style={inputStyle}
                      required={collectPayment}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Payment Reference / Slip #</label>
                    <input
                      type="text"
                      placeholder="e.g. Card auth code or cheque number"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 16 }}>
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
              <div style={{ ...calcRowStyle, borderTop: '2px solid #cbd5e1', paddingTop: 8, fontSize: 16 }}>
                <strong style={{ color: '#0f172a' }}>Grand Total:</strong>
                <strong style={{ color: '#0f172a' }}>{formatDisplay(grandTotalCents)}</strong>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || lines.length === 0} style={completeBtnStyle}>
              {submitting ? 'Processing POS Sale...' : 'Complete POS Sale & Print'}
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
  maxWidth: 860,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
  padding: '7px 16px',
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
  padding: '4px 0'
}

const errorStyle: React.CSSProperties = {
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

const completeBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer'
}
