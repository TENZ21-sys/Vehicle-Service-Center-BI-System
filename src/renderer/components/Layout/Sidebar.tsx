import React, { useState, useEffect } from 'react'
import { AuthSession } from '@shared/types/user.types'
import { ChangePasswordModal } from '../Auth/ChangePasswordModal'

interface Props {
  activeTab: string
  onSelectTab: (tab: string) => void
  session: AuthSession
  featureToggles: Record<string, boolean>
  onLogout: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  session,
  featureToggles,
  onLogout,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [showChangePassword, setShowChangePassword] = useState(false)
  const hasPerm = (perm: string): boolean => session.permissions.includes(perm as any)

  return (
    <aside
      style={{
        ...sidebarStyle,
        width: isCollapsed ? 68 : 240,
        transition: 'width 200ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Top Header / Branding */}
      <div
        style={{
          padding: isCollapsed ? '16px 8px' : '18px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: 65
        }}
      >
        {!isCollapsed ? (
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {session.businessName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {session.displayName}
            </div>
          </div>
        ) : (
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {session.businessName.charAt(0).toUpperCase()}
          </div>
        )}

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            style={toggleBtnStyle}
          >
            ◀
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: isCollapsed ? '12px 6px' : '12px 10px', overflowY: 'auto' }}>
        <NavItem
          label="Dashboard"
          icon="📊"
          active={activeTab === 'dashboard'}
          isCollapsed={isCollapsed}
          onClick={() => onSelectTab('dashboard')}
        />

        {hasPerm('customers:view') && (
          <NavItem
            label="Customers"
            icon="👥"
            active={activeTab === 'customers'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('customers')}
          />
        )}

        {hasPerm('vehicles:view') && (
          <NavItem
            label="Vehicles"
            icon="🚗"
            active={activeTab === 'vehicles'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('vehicles')}
          />
        )}

        {hasPerm('catalogue:view') && (
          <NavItem
            label="Services"
            icon="📋"
            active={activeTab === 'catalogue'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('catalogue')}
          />
        )}

        {featureToggles.module_appointments && hasPerm('appointments:view') && (
          <NavItem
            label="Appointments"
            icon="📅"
            active={activeTab === 'appointments'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('appointments')}
          />
        )}

        {hasPerm('jobcards:view') && (
          <NavItem
            label="Job Cards"
            icon="🔧"
            active={activeTab === 'jobcards'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('jobcards')}
          />
        )}

        {hasPerm('invoices:view') && (
          <NavItem
            label="Billing & POS"
            icon="💳"
            active={activeTab === 'billing'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('billing')}
          />
        )}

        {featureToggles.module_quotations && hasPerm('quotations:view') && (
          <NavItem
            label="Quotations"
            icon="📝"
            active={activeTab === 'quotations'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('quotations')}
          />
        )}

        {featureToggles.module_inventory && hasPerm('inventory:view') && (
          <NavItem
            label="Inventory"
            icon="📦"
            active={activeTab === 'inventory'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('inventory')}
          />
        )}

        {featureToggles.module_inventory && hasPerm('purchases:view') && (
          <NavItem
            label="Purchases"
            icon="🛒"
            active={activeTab === 'purchases'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('purchases')}
          />
        )}

        {featureToggles.module_finance && hasPerm('finance:view') && (
          <NavItem
            label="Finance"
            icon="💰"
            active={activeTab === 'finance'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('finance')}
          />
        )}

        {featureToggles.module_bi && hasPerm('bi:view') && (
          <NavItem
            label="BI Reports"
            icon="📈"
            active={activeTab === 'bi'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('bi')}
          />
        )}

        {hasPerm('settings:view') && (
          <NavItem
            label="Settings"
            icon="⚙️"
            active={activeTab === 'settings'}
            isCollapsed={isCollapsed}
            onClick={() => onSelectTab('settings')}
          />
        )}
      </nav>

      {/* Footer Controls */}
      <div
        style={{
          padding: isCollapsed ? '12px 6px' : 12,
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        {onToggleCollapse && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            style={{
              ...toggleBtnStyle,
              width: '100%',
              marginBottom: 4
            }}
          >
            ▶
          </button>
        )}

        <div className="sidebar-item-container" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowChangePassword(true)}
            title={isCollapsed ? 'Change Password' : ''}
            style={{
              width: '100%',
              padding: isCollapsed ? '8px 0' : '7px 12px',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: 8,
              transition: 'background var(--transition-fast)'
            }}
          >
            <span>🔒</span>
            {!isCollapsed && <span>Password</span>}
          </button>
          {isCollapsed && <div className="sidebar-tooltip">Change Password</div>}
        </div>

        <div className="sidebar-item-container" style={{ position: 'relative' }}>
          <button
            onClick={onLogout}
            title={isCollapsed ? 'Sign Out' : ''}
            style={{
              ...logoutBtnStyle,
              padding: isCollapsed ? '8px 0' : '7px 12px',
              justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}
          >
            <span>🚪</span>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
          {isCollapsed && <div className="sidebar-tooltip">Sign Out</div>}
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          userId={session.userId}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </aside>
  )
}

const NavItem: React.FC<{
  label: string
  icon: string
  active: boolean
  isCollapsed: boolean
  onClick: () => void
}> = ({ label, icon, active, isCollapsed, onClick }) => (
  <div className="sidebar-item-container" style={{ position: 'relative' }}>
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: 12,
        width: '100%',
        padding: isCollapsed ? '10px 0' : '9px 12px',
        marginBottom: 3,
        border: 'none',
        borderRadius: 'var(--radius-md)',
        backgroundColor: active ? 'var(--primary-50)' : 'transparent',
        color: active ? 'var(--primary-600)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500,
        fontSize: 13.5,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition-fast)',
        position: 'relative'
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {!isCollapsed && <span>{label}</span>}
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            bottom: '20%',
            width: 3.5,
            borderRadius: '0 4px 4px 0',
            backgroundColor: 'var(--primary-600)'
          }}
        />
      )}
    </button>
    {isCollapsed && <div className="sidebar-tooltip">{label}</div>}
  </div>
)

const sidebarStyle: React.CSSProperties = {
  height: '100vh',
  backgroundColor: 'var(--bg-surface)',
  borderRight: '1px solid var(--border-default)',
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none',
  zIndex: 20
}

const toggleBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 11,
  color: 'var(--text-muted)',
  transition: 'all var(--transition-fast)'
}

const logoutBtnStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #fee2e2',
  borderRadius: 'var(--radius-md)',
  backgroundColor: '#fef2f2',
  color: 'var(--danger-600)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transition: 'background var(--transition-fast)'
}
