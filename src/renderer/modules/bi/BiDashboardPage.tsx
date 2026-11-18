import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  FinancialSummary,
  WorkshopTurnaroundMetrics,
  TechnicianMetrics,
  InventoryTurnoverMetrics,
  CustomerLtvMetrics
} from '@shared/types/finance.types'
import { ExecutiveDonutChart, FinancialComparisonBarChart } from './charts/ExecutiveCharts'

export const BiDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financial' | 'workshop' | 'technicians' | 'inventory' | 'customers'>('financial')

  // Date Range Filter
  const [rangePreset, setRangePreset] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Settings
  const [currencySymbol, setCurrencySymbol] = useState('Rs.')

  // Data states
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null)
  const [workshopData, setWorkshopData] = useState<WorkshopTurnaroundMetrics | null>(null)
  const [techData, setTechData] = useState<TechnicianMetrics[]>([])
  const [inventoryData, setInventoryData] = useState<InventoryTurnoverMetrics | null>(null)
  const [customerData, setCustomerData] = useState<CustomerLtvMetrics | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date helper to prevent UTC midnight shifts
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Safe error message extractor to prevent React object children crash
  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (!err) return fallback
    if (typeof err === 'string') return err
    if (typeof err === 'object') {
      if ('message' in err && typeof (err as any).message === 'string') {
        return (err as any).message
      }
    }
    return fallback
  }

  // Calculate preset dates
  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year'): void => {
    setRangePreset(preset)
    const now = new Date()
    const todayStr = formatLocalDate(now)

    let start = todayStr
    if (preset === 'today') {
      start = todayStr
    } else if (preset === 'week') {
      const d = new Date()
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.getFullYear(), d.getMonth(), diff)
      start = formatLocalDate(monday)
    } else if (preset === 'month') {
      start = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1))
    } else if (preset === 'quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3
      start = formatLocalDate(new Date(now.getFullYear(), qMonth, 1))
    } else if (preset === 'year') {
      start = formatLocalDate(new Date(now.getFullYear(), 0, 1))
    }

    if (start > todayStr) {
      start = todayStr
    }

    setStartDate(start)
    setEndDate(todayStr)
  }

  useEffect(() => {
    api.settings.getByCategory('business_profile').then((res) => {
      if (res.success && res.data && res.data.currency_symbol) {
        setCurrencySymbol(String(res.data.currency_symbol))
      }
    })
    applyPreset('month')
  }, [])

  const loadTabData = async (): Promise<void> => {
    if (!startDate || !endDate) return

    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'financial') {
        const res = await api.analytics.getFinancialSummary(startDate, endDate)
        if (res.success && res.data) setFinancialData(res.data)
        else setError(getErrorMessage(res.error, 'Failed to load financial summary'))
      } else if (activeTab === 'workshop') {
        const res = await api.analytics.getWorkshopTurnaround(startDate, endDate)
        if (res.success && res.data) setWorkshopData(res.data)
        else setError(getErrorMessage(res.error, 'Failed to load workshop metrics'))
      } else if (activeTab === 'technicians') {
        const res = await api.analytics.getTechnicianMetrics(startDate, endDate)
        if (res.success && res.data) setTechData(res.data || [])
        else setError(getErrorMessage(res.error, 'Failed to load technician metrics'))
      } else if (activeTab === 'inventory') {
        const res = await api.analytics.getInventoryTurnover()
        if (res.success && res.data) setInventoryData(res.data)
        else setError(getErrorMessage(res.error, 'Failed to load inventory turnover'))
      } else if (activeTab === 'customers') {
        const res = await api.analytics.getCustomerLtv()
        if (res.success && res.data) setCustomerData(res.data)
        else setError(getErrorMessage(res.error, 'Failed to load customer analytics'))
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error loading analytics'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (startDate && endDate) {
      loadTabData()
    }
  }, [activeTab, startDate, endDate])

  const formatMoney = (cents: number): string => {
    return `${currencySymbol} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  }

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
            Executive Business Intelligence & Analytics
          </h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4, margin: 0 }}>
            Real-time profit margins, workshop throughput, technician efficiency, inventory velocity, and customer retention.
          </p>
        </div>

        {/* Date presets */}
        <div style={{ display: 'flex', gap: 6, backgroundColor: '#ffffff', padding: 4, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'This Quarter' },
            { id: 'year', label: 'This Year' }
          ].map((p) => {
            const active = rangePreset === p.id
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  backgroundColor: active ? '#2563eb' : 'transparent',
                  color: active ? '#ffffff' : '#4b5563',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Analytics Tabs */}
      <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #e5e7eb', marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'financial', label: '💵 Financial Overview & Margins' },
          { id: 'workshop', label: '⏱️ Workshop Throughput' },
          { id: 'technicians', label: '👨‍🔧 Technician Productivity' },
          { id: 'inventory', label: '📦 Inventory Velocity & Dead Stock' },
          { id: 'customers', label: '👥 Customer Retention & LTV' }
        ].map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? '#2563eb' : '#6b7280',
                border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
          Generating analytics reports...
        </div>
      ) : error ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: 8 }}>
          {error}
        </div>
      ) : (
        <div>
          {/* TAB 1: FINANCIAL OVERVIEW */}
          {activeTab === 'financial' && financialData && (
            <div>
              {/* Financial KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: 16,
                  marginBottom: 24
                }}
              >
                <div style={{ ...kpiCardStyle, borderTop: '4px solid #2563eb' }}>
                  <div style={kpiLabelStyle}>Total Revenue</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {formatMoney(financialData.totalRevenue)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Services: {formatMoney(financialData.serviceRevenue)} • Parts: {formatMoney(financialData.partsRevenue)}
                  </div>
                </div>

                <div style={{ ...kpiCardStyle, borderTop: '4px solid #d97706' }}>
                  <div style={kpiLabelStyle}>Cost of Goods Sold (COGS)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', marginTop: 4 }}>
                    {formatMoney(financialData.partsCogs)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Parts inventory acquisition cost
                  </div>
                </div>

                <div style={{ ...kpiCardStyle, borderTop: '4px solid #16a34a' }}>
                  <div style={kpiLabelStyle}>Gross Profit & Margin</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    {formatMoney(financialData.grossProfit)}
                  </div>
                  <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                    {financialData.grossMarginPercent}% Gross Margin
                  </div>
                </div>

                <div style={{ ...kpiCardStyle, borderTop: '4px solid #dc2626' }}>
                  <div style={kpiLabelStyle}>Operational Expenses</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                    {formatMoney(financialData.totalExpenses)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Rent, utilities, staff, overhead
                  </div>
                </div>

                <div style={{ ...kpiCardStyle, borderTop: '4px solid #7c3aed' }}>
                  <div style={kpiLabelStyle}>Net Workshop Profit</div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: financialData.netProfit >= 0 ? '#15803d' : '#dc2626',
                      marginTop: 4
                    }}
                  >
                    {formatMoney(financialData.netProfit)}
                  </div>
                  <div style={{ fontSize: 12, color: financialData.netProfit >= 0 ? '#15803d' : '#dc2626', fontWeight: 600, marginTop: 4 }}>
                    {financialData.netMarginPercent}% Net Margin
                  </div>
                </div>
              </div>

              {/* Visual Analytics Grid: P&L Comparison & Expense Donut */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 20,
                  marginBottom: 24
                }}
              >
                {/* Visual P&L Flow Comparison */}
                <div style={panelContainerStyle}>
                  <div style={panelHeaderStyle}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>Revenue vs. Expenditure Velocity</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>Net Profit Conversion</span>
                  </div>
                  <div style={{ padding: 24 }}>
                    <FinancialComparisonBarChart
                      revenue={financialData.totalRevenue}
                      cogs={financialData.partsCogs}
                      expenses={financialData.totalExpenses}
                      netProfit={financialData.netProfit}
                      formatMoney={formatMoney}
                    />
                  </div>
                </div>

                {/* Expense Category Donut Visualization */}
                <div style={panelContainerStyle}>
                  <div style={panelHeaderStyle}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>Expenditure Distribution</span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>By Expense Category</span>
                  </div>
                  <div style={{ padding: 24 }}>
                    {financialData.expensesByCategory.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: 30 }}>
                        No expenses recorded in this period
                      </div>
                    ) : (
                      <ExecutiveDonutChart
                        size={190}
                        thickness={28}
                        centerLabel="Total Outflow"
                        centerValue={formatMoney(financialData.totalExpenses)}
                        segments={financialData.expensesByCategory.map((cat, idx) => {
                          const palette = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
                          return {
                            name: cat.categoryName,
                            value: cat.totalAmount,
                            color: palette[idx % palette.length],
                            formattedValue: formatMoney(cat.totalAmount)
                          }
                        })}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Expense Category Breakdown */}
              <div style={panelContainerStyle}>
                <div style={panelHeaderStyle}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Expenditure Breakdown by Category</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    Period: {financialData.dateRange.startDate} to {financialData.dateRange.endDate}
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  {financialData.expensesByCategory.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
                      No expenses recorded in this period
                    </div>
                  ) : (
                    financialData.expensesByCategory.map((cat) => (
                      <div key={cat.categoryId} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{cat.categoryName} ({cat.count})</span>
                          <span style={{ fontWeight: 700, color: '#111827' }}>
                            {formatMoney(cat.totalAmount)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div style={{ height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${cat.percentage}%`,
                              backgroundColor: '#2563eb',
                              borderRadius: 4
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORKSHOP EFFICIENCY */}
          {activeTab === 'workshop' && workshopData && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Completed Jobs</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {workshopData.totalCompletedJobs}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Finished vehicle services
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Average Turnaround</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    {workshopData.averageDurationHours} hrs
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    From reception to completion
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Fastest Turnaround</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    {workshopData.shortestDurationHours} hrs
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Express servicing
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>On-Time Completion Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                    {workshopData.onTimeRatePercent}%
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Workshop operational target: &gt;90%
                  </div>
                </div>
              </div>

              {/* Service Popularity Table */}
              <div style={panelContainerStyle}>
                <div style={panelHeaderStyle}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Top Services by Volume & Revenue</span>
                </div>
                <div style={{ padding: 16 }}>
                  {(workshopData.servicePopularity || []).length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
                      No service records found
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
                          <th style={{ padding: '8px 12px' }}>Service Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Completed Count</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(workshopData.servicePopularity || []).map((s, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                              {s.serviceName}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>
                              {s.count}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                              {formatMoney(s.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICIAN PRODUCTIVITY */}
          {activeTab === 'technicians' && (
            <div style={panelContainerStyle}>
              <div style={panelHeaderStyle}>
                <span style={{ fontWeight: 600, color: '#111827' }}>Technician Productivity Leaderboard</span>
              </div>
              <div style={{ padding: 16 }}>
                {techData.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
                    No technician activity recorded for this period
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
                        <th style={{ padding: '10px 12px' }}>Technician</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Completed Jobs</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Labour Hours</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Labour Revenue</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {techData.map((t) => (
                        <tr key={t.technicianId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 12px', fontWeight: 600, color: '#111827' }}>
                            👨‍🔧 {t.technicianName}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', color: '#374151' }}>
                            {t.completedJobCardsCount}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'center', color: '#6b7280' }}>
                            {t.estimatedLabourHours} hrs
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                            {formatMoney(t.totalLabourRevenue)}
                          </td>
                          <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                            {formatMoney(t.commissionAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORY VELOCITY & DEAD STOCK */}
          {activeTab === 'inventory' && inventoryData && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Total Stock Asset Value</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {formatMoney(inventoryData.totalStockAssetValue)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Valuation at cost price
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Potential Retail Value</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    {formatMoney(inventoryData.totalRetailValue)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Estimated retail revenue
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Potential Inventory Profit</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    {formatMoney(inventoryData.potentialProfit)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Unrealized stock margin
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Dead Stock Alerts</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: inventoryData.deadStockCount > 0 ? '#dc2626' : '#16a34a', marginTop: 4 }}>
                    {inventoryData.deadStockCount}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    No movement in &gt;60 days
                  </div>
                </div>
              </div>

              {/* Dead stock table */}
              {(inventoryData.deadStockItems || []).length > 0 && (
                <div style={{ ...panelContainerStyle, marginBottom: 20 }}>
                  <div style={{ ...panelHeaderStyle, backgroundColor: '#fef2f2' }}>
                    <span style={{ fontWeight: 600, color: '#b91c1c' }}>⚠️ Dead Stock Items (&gt;60 days no movement)</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #fee2e2', textAlign: 'left', color: '#991b1b', fontSize: 12 }}>
                          <th style={{ padding: '8px 12px' }}>SKU</th>
                          <th style={{ padding: '8px 12px' }}>Part Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty on Hand</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost Price</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Tied Capital</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventoryData.deadStockItems || []).map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{item.sku}</td>
                            <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 500 }}>{item.name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{item.quantity}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4b5563' }}>{formatMoney(item.costPriceAmount)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                              {formatMoney(item.quantity * item.costPriceAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top Selling Parts */}
              <div style={panelContainerStyle}>
                <div style={panelHeaderStyle}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Top Selling Spare Parts & Consumables</span>
                </div>
                <div style={{ padding: 16 }}>
                  {(inventoryData.topSellingParts || []).length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
                      No parts sales recorded
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
                          <th style={{ padding: '8px 12px' }}>Part Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Units Sold</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Sales Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inventoryData.topSellingParts || []).map((p, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827' }}>
                              {p.name}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>
                              {p.unitsSold}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                              {formatMoney(p.totalRevenueAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMER RETENTION & LTV */}
          {activeTab === 'customers' && customerData && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Total Active Customers</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 4 }}>
                    {customerData.totalActiveCustomers}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Registered customer base
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Repeat Customer Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    {customerData.repeatCustomerRatePercent}%
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Clients with 2 or more workshop visits
                  </div>
                </div>

                <div style={kpiCardStyle}>
                  <div style={kpiLabelStyle}>Average Customer Spend</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    {formatMoney(customerData.averageCustomerSpendAmount)}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Lifetime average invoice spend
                  </div>
                </div>
              </div>

              {/* Top Customers Leaderboard */}
              <div style={panelContainerStyle}>
                <div style={panelHeaderStyle}>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Top Spending Customers (Lifetime Value)</span>
                </div>
                <div style={{ padding: 16 }}>
                  {(customerData.topCustomers || []).length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>
                      No customer billing activity found
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280', fontSize: 12 }}>
                          <th style={{ padding: '8px 12px' }}>Customer Name</th>
                          <th style={{ padding: '8px 12px' }}>Phone</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>Total Visits</th>
                          <th style={{ padding: '8px 12px' }}>Last Visit</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(customerData.topCustomers || []).map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px 12px', fontWeight: 600, color: '#111827' }}>
                              👤 {c.name}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#4b5563' }}>
                              {c.phone || '—'}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'center', color: '#374151' }}>
                              {c.visitsCount}
                            </td>
                            <td style={{ padding: '12px 12px', color: '#6b7280' }}>
                              {c.lastVisitDate ? c.lastVisitDate.split('T')[0] : '—'}
                            </td>
                            <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              {formatMoney(c.totalSpentAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
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

const panelContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  overflow: 'hidden'
}

const panelHeaderStyle: React.CSSProperties = {
  padding: '14px 20px',
  backgroundColor: '#f9fafb',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13
}
