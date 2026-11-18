import React from 'react'

interface QuickActionLaunchpadProps {
  onNavigate: (tab: string) => void
  onOpenImport: () => void
}

export const QuickActionLaunchpad: React.FC<QuickActionLaunchpadProps> = ({
  onNavigate,
  onOpenImport
}) => {
  const actions = [
    {
      id: 'new-job',
      title: 'New Job Card',
      desc: 'Vehicle intake & diagnostics',
      icon: '➕',
      accent: '#2563eb',
      bgHover: '#eff6ff',
      onClick: () => onNavigate('jobcards')
    },
    {
      id: 'add-customer',
      title: 'Add Customer / Vehicle',
      desc: 'Create new client profile',
      icon: '🚗',
      accent: '#0d9488',
      bgHover: '#f0fdfa',
      onClick: () => onNavigate('customers')
    },
    {
      id: 'book-appt',
      title: 'Book Appointment',
      desc: 'Schedule service slot',
      icon: '📅',
      accent: '#8b5cf6',
      bgHover: '#f5f3ff',
      onClick: () => onNavigate('appointments')
    },
    {
      id: 'counter-sale',
      title: 'Counter Sale / POS',
      desc: 'Quick parts sale & receipt',
      icon: '🧾',
      accent: '#ea580c',
      bgHover: '#fff7ed',
      onClick: () => onNavigate('billing')
    },
    {
      id: 'import-data',
      title: 'Import CSV Data',
      desc: 'Batch upload existing records',
      icon: '📥',
      accent: '#475569',
      bgHover: '#f8fafc',
      onClick: onOpenImport
    }
  ]

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        marginBottom: 24
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🚀</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Quick Launchpad</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>— 1-click access to core workshop operations</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12
        }}
      >
        {actions.map((act) => (
          <button
            key={act.id}
            onClick={act.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = act.bgHover
              e.currentTarget.style.borderColor = act.accent
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc'
              e.currentTarget.style.borderColor = '#e2e8f0'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0
              }}
            >
              {act.icon}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {act.title}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {act.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
