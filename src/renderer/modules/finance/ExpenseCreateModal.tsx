import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ExpenseCategory, ExpensePaymentMethod, ExpenseWithCategory } from '@shared/types/finance.types'

interface Props {
  currencySymbol?: string
  onClose: () => void
  onSuccess: (expense: ExpenseWithCategory) => void
}

export const ExpenseCreateModal: React.FC<Props> = ({
  currencySymbol = 'Rs.',
  onClose,
  onSuccess
}) => {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('Cash')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [paidTo, setPaidTo] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [notes, setNotes] = useState('')

  // Adding new category inline
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.finance.listCategories()
      if (res.success && res.data) {
        setCategories(res.data)
        if (res.data.length > 0 && !categoryId) {
          setCategoryId(res.data[0].id)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load expense categories')
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleCreateCategory = async (): Promise<void> => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const res = await api.finance.createCategory({ name: newCatName.trim() })
      if (res.success && res.data) {
        setNewCatName('')
        setShowNewCatInput(false)
        await loadCategories()
        setCategoryId(res.data.id)
      } else {
        alert(res.error || 'Failed to create category')
      }
    } catch (err: any) {
      alert(err.message || 'Error creating category')
    } finally {
      setSavingCat(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)

    const numAmount = parseFloat(amountStr)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than 0')
      return
    }

    if (!categoryId) {
      setError('Please select an expense category')
      return
    }

    setSaving(true)
    try {
      const amountInCents = Math.round(numAmount * 100)
      const res = await api.finance.createExpense({
        categoryId,
        amount: amountInCents,
        paymentMethod,
        expenseDate,
        paidTo: paidTo.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined
      })

      if (res.success && res.data) {
        onSuccess(res.data)
      } else {
        setError(res.error?.message || 'Failed to record expense')
      }
    } catch (err: any) {
      setError(err?.message || 'Error recording expense')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modalBackdropStyle}>
      <div style={modalContainerStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
              Record Workshop Expense
            </h2>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
              Track operational overheads, utility bills, maintenance, or staff payouts.
            </p>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, fontSize: 13, margin: '16px 20px 0' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          {/* Category Selection */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={labelStyle}>Expense Category *</label>
              <button
                type="button"
                onClick={() => setShowNewCatInput(!showNewCatInput)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showNewCatInput ? 'Cancel' : '+ New Category'}
              </button>
            </div>

            {showNewCatInput ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. Diagnostic Subscriptions"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={savingCat}
                  style={{ ...buttonStyle, backgroundColor: '#10b981', color: '#ffffff' }}
                >
                  {savingCat ? 'Adding...' : 'Add'}
                </button>
              </div>
            ) : null}

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              style={inputStyle}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Amount ({currencySymbol}) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                style={{ ...inputStyle, fontWeight: 600, fontSize: 14 }}
              />
            </div>

            <div>
              <label style={labelStyle}>Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
                style={inputStyle}
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Expense Date & Paid To */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Expense Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Paid To (Payee / Vendor)</label>
              <input
                type="text"
                placeholder="e.g. Electricity Board, Landlord"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Reference No */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Reference / Voucher / Bill Number</label>
            <input
              type="text"
              placeholder="e.g. CEB-BILL-90812, RCP-0043"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Notes / Description</label>
            <textarea
              rows={2}
              placeholder="Optional details about this expenditure..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...buttonStyle, backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ ...buttonStyle, backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600 }}
            >
              {saving ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
}

const modalContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 10,
  width: 520,
  maxWidth: '92vw',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  overflow: 'hidden'
}

const modalHeaderStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: 18,
  cursor: 'pointer',
  color: '#9ca3af'
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 4
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  boxSizing: 'border-box'
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer'
}
