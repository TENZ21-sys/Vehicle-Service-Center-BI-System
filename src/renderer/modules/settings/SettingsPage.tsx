import React, { useState } from 'react'
import { BusinessProfileTab } from './BusinessProfileTab'
import { FeatureTogglesTab } from './FeatureTogglesTab'
import { VehicleCategoriesTab } from './VehicleCategoriesTab'
import { WorkflowTab } from './WorkflowTab'
import { BackupRestoreTab } from './BackupRestoreTab'
import { AuditTrailTab } from './AuditTrailTab'
import { SystemHealthTab } from './SystemHealthTab'
import { StaffAccountsTab } from './StaffAccountsTab'

interface Props {
  onTogglesChanged: (toggles: Record<string, boolean>) => void
}

type TabKey = 'profile' | 'staff' | 'categories' | 'workflow' | 'toggles' | 'backups' | 'audit' | 'health'

export const SettingsPage: React.FC<Props> = ({ onTogglesChanged }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  return (
    <div style={{ padding: 28, height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>System Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
          Configure business profile, staff accounts & security, workflow options, feature toggles, backups, and diagnostics.
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24, overflowX: 'auto' }}>
        <TabButton
          label="Business Profile"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
        <TabButton
          label="Staff & Account Security"
          active={activeTab === 'staff'}
          onClick={() => setActiveTab('staff')}
        />
        <TabButton
          label="Vehicle Categories"
          active={activeTab === 'categories'}
          onClick={() => setActiveTab('categories')}
        />
        <TabButton
          label="Workshop Workflow"
          active={activeTab === 'workflow'}
          onClick={() => setActiveTab('workflow')}
        />
        <TabButton
          label="Feature Toggles"
          active={activeTab === 'toggles'}
          onClick={() => setActiveTab('toggles')}
        />
        <TabButton
          label="Backups & Disaster Recovery"
          active={activeTab === 'backups'}
          onClick={() => setActiveTab('backups')}
        />
        <TabButton
          label="Audit Trail"
          active={activeTab === 'audit'}
          onClick={() => setActiveTab('audit')}
        />
        <TabButton
          label="System Health"
          active={activeTab === 'health'}
          onClick={() => setActiveTab('health')}
        />
      </div>

      <div>
        {activeTab === 'profile' && <BusinessProfileTab />}
        {activeTab === 'staff' && <StaffAccountsTab />}
        {activeTab === 'categories' && <VehicleCategoriesTab />}
        {activeTab === 'workflow' && <WorkflowTab />}
        {activeTab === 'toggles' && <FeatureTogglesTab onTogglesChanged={onTogglesChanged} />}
        {activeTab === 'backups' && <BackupRestoreTab />}
        {activeTab === 'audit' && <AuditTrailTab />}
        {activeTab === 'health' && <SystemHealthTab />}
      </div>
    </div>
  )
}

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '10px 18px',
      border: 'none',
      borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
      backgroundColor: 'transparent',
      color: active ? '#2563eb' : '#6b7280',
      fontWeight: active ? 600 : 500,
      fontSize: 14,
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }}
  >
    {label}
  </button>
)
