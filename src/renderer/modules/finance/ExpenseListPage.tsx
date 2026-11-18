import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ExpenseWithCategory, ExpenseCategory } from '@shared/types/finance.types'
import { ExpenseCreateModal } from './ExpenseCreateModal'
import { CashRegisterPage } from './CashRegisterPage'
import { downloadCsv } from '../../utils/csvDownload'
import { DataImportModal } from '../../components/Common/DataImportModal'

export const ExpenseListPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'cash_register'>('expenses')
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  // Settings
  const [currencySymbol, setCurrencySymbol] = useState('Rs.')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExportCsv = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await api.export.data('expenses')
      if (res.success && res.data) {
        downloadCsv(res.data.filename, res.data.csvContent)
      }
    } catch (err) {
      console.error('Expense export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const loadSettings = async (): Promise<void> => {
    try {
      const res = await api.settings.getByCategory('business_profile')
      if (res.success && res.data && res.data.currency_symbol) {
        setCurrencySymbol(String(res.data.currency_symbol))
      }
    } catch (err) {
      console.warn('Failed to load currency symbol')
    }
  }

  const loadCategories = async (): Promise<void> => {
    try {
      const res = await api.finance.listCategories()
      if (res.success && res.data) {
        setCategories(res.data)
      }
    } catch (err) {
      console.warn('Failed to load categories')
    }
  }

  const loadExpenses = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.finance.listExpenses({
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchQuery.trim() || undefined
      })

      if (res.success && res.data) {
        setExpenses(res.data)
      } else {
        setError(res.error?.message || 'Failed to load expenses')
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading expenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    loadCategories()
  }, [])

  useEffect(() => {
    if (activeSubTab === 'expenses') {
      loadExpenses()
    }
  }, [activeSubTab, selectedCategory, startDate, endDate])

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    loadExpenses()
  }

  const handleDeleteExpense = async (exp: ExpenseWithCategory): Promise<void> => {
    if (!confirm(`Delete expense ${exp.expenseNumber} (${currencySymbol} ${(exp.amount / 100).toFixed(2)}) for "${exp.category.name}"?`)) {
      return
    }

    try {
      const res = await api.finance.deleteExpense(exp.id)
      if (res.success) {
        loadExpenses()
      } else {
        alert(res.error || 'Failed to delete expense')
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting expense')
    }
  }

  const formatMoney = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

  // Summary figures
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const cashAmount = expenses.filter((e) => e.paymentMethod === 'Cash').reduce((sum, e) => sum + e.amount, 0)
  const bankAmount = expenses.filter((e) => e.paymentMethod === 'Bank Transfer').reduce((sum, e) => sum + e.amount, 0)

  return (
    <div style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Financial Management & Expenses
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, margin: 0 }}>
            Record operational overhead, manage workshop expenses, and reconcile daily cash register tills.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              padding: '9px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            📥 Import CSV
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            style={{
              padding: '9px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              color: '#374151',
              fontSize: 13,
              fontWeight: 500,
              cursor: exporting ? 'not-allowed' : 'pointer'
            }}
          >
            {exporting ? 'Exporting...' : '📥 Export CSV'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '9px 18px',
              backgroundColor: '#dc2626',
              border: 'none',
              borderRadius: 6,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>-</span> Record Expense
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
        <button
          onClick={() => setActiveSubTab('expenses')}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: activeSubTab === 'expenses' ? 600 : 500,
            color: activeSubTab === 'expenses' ? '#2563eb' : '#6b7280',
            border: 'none',
            borderBottom: activeSubTab === 'expenses' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          📋 Operational Expenses
        </button>
        <button
          onClick={() => setActiveSubTab('cash_register')}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: activeSubTab === 'cash_register' ? 600 : 500,
            color: activeSubTab === 'cash_register' ? '#2563eb' : '#6b7280',
            border: 'none',
            borderBottom: activeSubTab === 'cash_register' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer'
          }}
        >
          💰 Daily Cash Register & Till
        </button>
      </div>

      {activeSubTab === 'cash_register' ? (
        <CashRegisterPage
          currencySymbol={currencySymbol}
          onRecordExpense={() => setShowCreateModal(true)}
        />
      ) : (
        <div>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 16,
              marginBottom: 20
            }}
          >
            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}>Total Expenses</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                {formatMoney(totalAmount)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {expenses.length} records matching filters
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}>Cash Payouts</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                {formatMoney(cashAmount)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Paid out of till cash drawer
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}>Bank / Online Transfers</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                {formatMoney(bankAmount)}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Paid via business bank accounts
              </div>
            </div>

            <div style={kpiCardStyle}>
              <div style={kpiLabelStyle}>Active Categories</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                {categories.length}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Configurable in Settings
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 12
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 12
                  }}
                />
              </div>

              {(selectedCategory !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setStartDate('')
                    setEndDate('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 12,
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Search expense #, payee, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  width: 240
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '7px 12px',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Search
              </button>
            </form>
          </div>

          {/* Expenses Table */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                Loading expenses...
              </div>
            ) : error ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#dc2626' }}>
                {error}
              </div>
            ) : expenses.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💸</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>No expenses recorded</div>
                <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, maxWidth: 400, margin: '4px auto 16px' }}>
                  Keep track of your workshop operational costs, utilities, rent, and supplies.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  - Record First Expense
                </button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Expense #</th>
                    <th style={{ padding: '12px 16px' }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Category</th>
                    <th style={{ padding: '12px 16px' }}>Payee & Reference</th>
                    <th style={{ padding: '12px 16px' }}>Method</th>
                    <th style={{ padding: '12px 16px' }}>Notes</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr
                      key={e.id}
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={(el) => (el.currentTarget.style.backgroundColor = '#fcfdfe')}
                      onMouseLeave={(el) => (el.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                        {e.expenseNumber}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#4b5563' }}>
                        {e.expenseDate}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                          {e.category.name}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#111827' }}>
                          {e.paidTo || '—'}
                        </div>
                        {e.referenceNo && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                            Ref: {e.referenceNo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ backgroundColor: e.paymentMethod === 'Cash' ? '#fef3c7' : '#e0f2fe', color: e.paymentMethod === 'Cash' ? '#92400e' : '#0369a1', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                          {e.paymentMethod}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.notes || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                        {formatMoney(e.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteExpense(e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 12,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showCreateModal && (
        <ExpenseCreateModal
          currencySymbol={currencySymbol}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadExpenses()
          }}
        />
      )}

      {/* CSV Import Modal */}
      <DataImportModal
        sector="expenses"
        title="Operating Expenses"
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false)
          loadExpenses()
        }}
      />
    </div>
  )
}

const kpiCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '16px 20px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
}

const kpiLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
}
