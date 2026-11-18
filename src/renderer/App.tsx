import React, { useState, useEffect } from 'react'
import { BusinessSelectPage } from './modules/auth/BusinessSelectPage'
import { LoginPage } from './modules/auth/LoginPage'
import { Sidebar } from './components/Layout/Sidebar'
import { SettingsPage } from './modules/settings/SettingsPage'
import { CustomerListPage } from './modules/customers/CustomerListPage'
import { CustomerDetailPage } from './modules/customers/CustomerDetailPage'
import { VehicleListPage } from './modules/vehicles/VehicleListPage'
import { ServiceListPage } from './modules/catalogue/ServiceListPage'
import { InventoryListPage } from './modules/inventory/InventoryListPage'
import { PurchasesListPage } from './modules/purchases/PurchasesListPage'
import { JobCardListPage } from './modules/job-cards/JobCardListPage'
import { InvoiceListPage } from './modules/billing/InvoiceListPage'
import { AppointmentListPage } from './modules/appointments/AppointmentListPage'
import { QuotationListPage } from './modules/quotations/QuotationListPage'
import { ExpenseListPage } from './modules/finance/ExpenseListPage'
import { BiDashboardPage } from './modules/bi/BiDashboardPage'
import { MainDashboardPage } from './modules/dashboard/MainDashboardPage'
import { CommandPaletteModal } from './components/Navigation/CommandPaletteModal'
import { AuthSession } from '@shared/types/user.types'
import { api } from './api'

interface SelectedBusiness {
  id: string
  name: string
  db_filename: string
  created_at: string
}

export const App: React.FC = () => {
  const [selectedBusiness, setSelectedBusiness] = useState<SelectedBusiness | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('vsc_sidebar_collapsed') === 'true'
  })
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [featureToggles, setFeatureToggles] = useState<Record<string, boolean>>({
    module_appointments: true,
    module_quotations: true,
    module_inventory: true,
    module_finance: true,
    module_bi: true
  })

  // Global keyboard shortcuts (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const toggleSidebarCollapse = (): void => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('vsc_sidebar_collapsed', String(next))
      return next
    })
  }

  // Load feature toggles when a session is active
  useEffect(() => {
    if (session) {
      api.settings.getFeatureToggles().then((res) => {
        if (res.success && res.data) {
          setFeatureToggles(res.data)
        }
      })
    }
  }, [session])

  const handleLogout = async (): Promise<void> => {
    await api.auth.logout()
    setSession(null)
    setSelectedCustomerId(null)
    setActiveTab('dashboard')
  }

  const handleTabSwitch = (tab: string): void => {
    setActiveTab(tab)
    if (tab !== 'customers') {
      setSelectedCustomerId(null)
    }
  }

  // State 1: Choose Business Account
  if (!selectedBusiness) {
    return (
      <BusinessSelectPage
        onSelectBusiness={(biz) => {
          setSelectedBusiness(biz)
        }}
      />
    )
  }

  // State 2: Login to Selected Business
  if (!session) {
    return (
      <LoginPage
        businessName={selectedBusiness.name}
        onBackToBusinesses={() => {
          setSelectedBusiness(null)
        }}
        onLoginSuccess={(newSession) => {
          setSession(newSession)
          setActiveTab('dashboard')
        }}
      />
    )
  }

  // State 3: Logged-in App Shell
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabSwitch}
        session={session}
        featureToggles={featureToggles}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      <main style={{ flex: 1, backgroundColor: 'var(--bg-app)', overflowY: 'auto' }}>
        {/* Modern Top Action Bar */}
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSidebarCollapsed && (
              <button
                onClick={toggleSidebarCollapse}
                title="Expand Sidebar"
                style={{
                  background: 'none',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                ▶ Sidebar
              </button>
            )}
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Branch: <strong style={{ color: 'var(--text-primary)' }}>{session.businessName}</strong>
            </span>
          </div>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              backgroundColor: 'var(--bg-muted)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12.5,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <span>🔍 Search or jump to...</span>
            <kbd
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 5px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-default)',
                borderRadius: 4,
                color: 'var(--text-secondary)'
              }}
            >
              Ctrl + K
            </kbd>
          </button>
        </div>
        {activeTab === 'dashboard' && (
          <MainDashboardPage
            session={session}
            onNavigate={(tab) => handleTabSwitch(tab)}
          />
        )}

        {activeTab === 'customers' && (
          selectedCustomerId ? (
            <CustomerDetailPage
              customerId={selectedCustomerId}
              onBack={() => setSelectedCustomerId(null)}
            />
          ) : (
            <CustomerListPage
              onSelectCustomer={(id) => setSelectedCustomerId(id)}
            />
          )
        )}

        {activeTab === 'vehicles' && (
          <VehicleListPage
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id)
              setActiveTab('customers')
            }}
            onSelectJobCard={() => setActiveTab('jobcards')}
          />
        )}

        {activeTab === 'catalogue' && (
          <ServiceListPage />
        )}

        {activeTab === 'appointments' && (
          <AppointmentListPage
            onNavigateToJobCard={() => setActiveTab('jobcards')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryListPage />
        )}

        {activeTab === 'purchases' && (
          <PurchasesListPage />
        )}

        {activeTab === 'jobcards' && (
          <JobCardListPage />
        )}

        {activeTab === 'quotations' && (
          <QuotationListPage
            onNavigateToJobCard={() => setActiveTab('jobcards')}
          />
        )}

        {activeTab === 'billing' && (
          <InvoiceListPage />
        )}

        {activeTab === 'finance' && (
          <ExpenseListPage />
        )}

        {activeTab === 'bi' && (
          <BiDashboardPage />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            onTogglesChanged={(t) => {
              setFeatureToggles(t)
            }}
          />
        )}

        {activeTab !== 'dashboard' && activeTab !== 'customers' && activeTab !== 'vehicles' && activeTab !== 'catalogue' && activeTab !== 'appointments' && activeTab !== 'inventory' && activeTab !== 'purchases' && activeTab !== 'jobcards' && activeTab !== 'quotations' && activeTab !== 'billing' && activeTab !== 'finance' && activeTab !== 'bi' && activeTab !== 'settings' && (
          <div style={{ padding: 28 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
              {activeTab} Module
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              This module will be built in its upcoming roadmap phase. The database models, permissions,
              and feature toggles are already fully supported in the architecture.
            </p>
          </div>
        )}
      </main>

      {/* Global Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={handleTabSwitch}
      />
    </div>
  )
}

const DashboardCard: React.FC<{
  title: string
  value: string
  subtitle: string
  color: string
}> = ({ title, value, subtitle, color }) => (
  <div
    style={{
      backgroundColor: '#ffffff',
      borderRadius: 10,
      padding: '20px 24px',
      border: '1px solid #e5e7eb',
      borderTop: `4px solid ${color}`
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{subtitle}</div>
  </div>
)

export default App
