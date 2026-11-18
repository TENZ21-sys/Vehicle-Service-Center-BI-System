import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'
import { AuthSession } from '@shared/types/user.types'
import { JobCardWithDetails } from '@shared/types/job-card.types'
import { AppointmentWithDetails } from '@shared/types/appointment.types'
import { InventoryItem } from '@shared/types/inventory.types'
import { TopSellingPart } from '@shared/types/finance.types'
import { WorkshopHeroBanner } from './components/WorkshopHeroBanner'
import { OperationalMetricsGrid } from './components/OperationalMetricsGrid'
import { QuickActionLaunchpad } from './components/QuickActionLaunchpad'
import { WorksStatusBoard } from './components/WorksStatusBoard'
import { InventoryDemandBlock } from './components/InventoryDemandBlock'
import { DataImportModal, ImportSector } from '../../components/Common/DataImportModal'

interface MainDashboardPageProps {
  session: AuthSession
  onNavigate: (tab: string, extra?: any) => void
}

export const MainDashboardPage: React.FC<MainDashboardPageProps> = ({ session, onNavigate }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Operational state
  const [ongoingJobs, setOngoingJobs] = useState<JobCardWithDetails[]>([])
  const [pendingJobs, setPendingJobs] = useState<JobCardWithDetails[]>([])
  const [readyJobs, setReadyJobs] = useState<JobCardWithDetails[]>([])
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithDetails[]>([])
  const [todayRevenueCents, setTodayRevenueCents] = useState<number>(0)
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([])
  const [topDemandedParts, setTopDemandedParts] = useState<TopSellingPart[]>([])
  const [currencySymbol, setCurrencySymbol] = useState('Rs.')

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedImportSector, setSelectedImportSector] = useState<ImportSector>('customers')
  const [showSectorPicker, setShowSectorPicker] = useState(false)

  // Date helper
  const getTodayDateString = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatMoney = (cents: number): string => {
    const val = (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${currencySymbol} ${val}`
  }

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    const today = getTodayDateString()

    try {
      // 1. Fetch Job Cards
      try {
        const jcRes = await api.jobcards.list()
        if (jcRes.success && jcRes.data) {
          const all = jcRes.data
          const ongoing = all.filter((j) => j.status === 'In Progress' || j.status === 'Quality Check')
          const pending = all.filter((j) => j.status === 'Open' || j.status === 'Waiting for Parts')
          const ready = all.filter((j) => j.status === 'Ready')
          setOngoingJobs(ongoing)
          setPendingJobs(pending)
          setReadyJobs(ready)
        }
      } catch (e) {
        console.warn('Job cards fetch warning:', e)
      }

      // 2. Fetch Appointments for Today
      try {
        const apptRes = await api.appointments.list({ date: today })
        if (apptRes.success && apptRes.data) {
          const activeAppts = apptRes.data.filter(
            (a) => a.status === 'Scheduled' || a.status === 'Confirmed'
          )
          setTodayAppointments(activeAppts)
        }
      } catch (e) {
        console.warn('Appointments fetch warning:', e)
      }

      // 3. Fetch Low Stock Inventory Items
      try {
        const invRes = await api.inventory.listItems({ lowStockOnly: true })
        if (invRes.success && invRes.data) {
          setLowStockItems(invRes.data)
        }
      } catch (e) {
        console.warn('Inventory fetch warning:', e)
      }

      // 4. Fetch Inventory Turnover & Top Demanded Parts
      try {
        const turnRes = await api.analytics.getInventoryTurnover()
        if (turnRes.success && turnRes.data && turnRes.data.topSellingParts) {
          setTopDemandedParts(turnRes.data.topSellingParts)
        }
      } catch (e) {
        console.warn('Analytics inventory turnover warning:', e)
      }

      // 5. Fetch Today's Revenue / Cash Flow
      try {
        const finRes = await api.analytics.getFinancialSummary(today, today)
        if (finRes.success && finRes.data) {
          setTodayRevenueCents(finRes.data.totalRevenue || 0)
        } else {
          const invListRes = await api.invoices.list()
          if (invListRes.success && invListRes.data) {
            const todayInvs = invListRes.data.filter(
              (i) => i.createdAt && i.createdAt.startsWith(today) && i.status !== 'Void'
            )
            const sum = todayInvs.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0)
            setTodayRevenueCents(sum)
          }
        }
      } catch (e) {
        console.warn('Revenue calculation warning:', e)
      }

      // 6. Currency Setting (from business_profile category)
      try {
        const currRes = await api.settings.getByCategory('business_profile')
        if (currRes.success && currRes.data && Array.isArray(currRes.data)) {
          const map: Record<string, any> = {}
          currRes.data.forEach((s: any) => {
            map[s.key] = s.value
          })
          if (map['business_currency']) {
            setCurrencySymbol(map['business_currency'])
          }
        }
      } catch (e) {
        console.warn('Currency setting fetch warning:', e)
      }
    } catch (err: any) {
      console.error('Failed to load dashboard operational data', err)
      setError(err?.message || 'Could not load complete dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleOpenImport = (): void => {
    setShowSectorPicker(true)
  }

  const handleSelectSectorToImport = (sector: ImportSector): void => {
    setSelectedImportSector(sector)
    setShowSectorPicker(false)
    setIsImportModalOpen(true)
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto' }}>
      {/* 1. Hero Workshop Welcome & Live Status Banner */}
      <WorkshopHeroBanner
        displayName={session.displayName}
        businessName={session.businessName}
        activeOngoingCount={ongoingJobs.length}
        pendingCount={pendingJobs.length + todayAppointments.length}
      />

      {/* 2. Top Live Operational Metric Cards */}
      <OperationalMetricsGrid
        ongoingCount={ongoingJobs.length}
        yetToBeDoneCount={pendingJobs.length + todayAppointments.length}
        todayRevenueCents={todayRevenueCents}
        lowStockCount={lowStockItems.length}
        onNavigate={onNavigate}
        formatMoney={formatMoney}
      />

      {/* 3. Primary Quick Action Launchpad */}
      <QuickActionLaunchpad
        onNavigate={onNavigate}
        onOpenImport={handleOpenImport}
      />

      {/* Error notification if partial data load failed */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 13,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={fetchDashboardData}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontWeight: 700,
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* 4. Floor Operations Board: Ongoing Works vs Works Yet To Be Done */}
      <WorksStatusBoard
        ongoingJobs={ongoingJobs}
        pendingJobs={pendingJobs}
        todayAppointments={todayAppointments}
        readyJobs={readyJobs}
        onNavigate={onNavigate}
      />

      {/* 5. Inventory Block: Low Stocks & Parts Demand Chart */}
      <InventoryDemandBlock
        lowStockItems={lowStockItems}
        topDemandedParts={topDemandedParts}
        onNavigate={onNavigate}
        formatMoney={formatMoney}
      />

      {/* Sector Selection Popup when user clicks "Import CSV Data" */}
      {showSectorPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setShowSectorPicker(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: '24px 28px',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  📥 Import Existing Business Data
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                  Select the sector you want to upload CSV spreadsheet records into:
                </p>
              </div>
              <button
                onClick={() => setShowSectorPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 18,
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              {[
                { sector: 'customers' as ImportSector, name: 'Customers', icon: '👤', desc: 'Phone, names, emails' },
                { sector: 'vehicles' as ImportSector, name: 'Vehicles', icon: '🚗', desc: 'Plates, makes, mileage' },
                { sector: 'inventory' as ImportSector, name: 'Inventory & Parts', icon: '📦', desc: 'SKU, pricing, stock' },
                { sector: 'services' as ImportSector, name: 'Service Catalogue', icon: '⚙️', desc: 'Labor, prices, hours' },
                { sector: 'suppliers' as ImportSector, name: 'Suppliers', icon: '🏢', desc: 'Vendor records' },
                { sector: 'expenses' as ImportSector, name: 'Expenses', icon: '💸', desc: 'Historical spending' }
              ].map((s) => (
                <button
                  key={s.sector}
                  onClick={() => handleSelectSectorToImport(s.sector)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff'
                    e.currentTarget.style.borderColor = '#3b82f6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc'
                    e.currentTarget.style.borderColor = '#e2e8f0'
                  }}
                >
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button
                onClick={() => setShowSectorPicker(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Data Import Modal */}
      <DataImportModal
        sector={selectedImportSector}
        title={`Import ${selectedImportSector.toUpperCase()} from CSV`}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false)
          fetchDashboardData()
        }}
      />
    </div>
  )
}
