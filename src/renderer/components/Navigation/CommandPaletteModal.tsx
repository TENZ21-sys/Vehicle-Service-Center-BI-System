import React, { useState, useEffect, useRef } from 'react'

export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: string
  category: 'Navigation' | 'Actions' | 'Vehicles' | 'Customers'
  onSelect: () => void
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onNavigateTab: (tab: string) => void
  onOpenNewJobCard?: () => void
  onOpenNewCustomer?: () => void
  onOpenNewVehicle?: () => void
  onTriggerBackup?: () => void
}

export const CommandPaletteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewJobCard,
  onOpenNewCustomer,
  onOpenNewVehicle,
  onTriggerBackup
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const defaultCommands: CommandItem[] = [
    // Navigation
    { id: 'nav-dash', title: 'Go to Dashboard', subtitle: 'Overview & Stats', icon: '📊', category: 'Navigation', onSelect: () => onNavigateTab('dashboard') },
    { id: 'nav-veh', title: 'Go to Vehicles', subtitle: 'Registry & Photos', icon: '🚗', category: 'Navigation', onSelect: () => onNavigateTab('vehicles') },
    { id: 'nav-cust', title: 'Go to Customers', subtitle: 'Directory & History', icon: '👥', category: 'Navigation', onSelect: () => onNavigateTab('customers') },
    { id: 'nav-jobs', title: 'Go to Job Cards', subtitle: 'Workshop Repairs', icon: '🔧', category: 'Navigation', onSelect: () => onNavigateTab('jobcards') },
    { id: 'nav-bill', title: 'Go to Billing & POS', subtitle: 'Invoices & Receipts', icon: '💳', category: 'Navigation', onSelect: () => onNavigateTab('billing') },
    { id: 'nav-inv', title: 'Go to Inventory', subtitle: 'Stock & Parts', icon: '📦', category: 'Navigation', onSelect: () => onNavigateTab('inventory') },
    { id: 'nav-bi', title: 'Go to BI Analytics', subtitle: 'Profit Margins & Reports', icon: '📈', category: 'Navigation', onSelect: () => onNavigateTab('bi') },
    { id: 'nav-sett', title: 'Go to Settings', subtitle: 'System & Users', icon: '⚙️', category: 'Navigation', onSelect: () => onNavigateTab('settings') },

    // Quick Actions
    { id: 'act-new-job', title: 'Create New Job Card', subtitle: 'Intake vehicle for service', icon: '➕', category: 'Actions', onSelect: () => { onNavigateTab('jobcards'); onOpenNewJobCard?.(); } },
    { id: 'act-new-cust', title: 'Register New Customer', subtitle: 'Add contact details', icon: '👤', category: 'Actions', onSelect: () => { onNavigateTab('customers'); onOpenNewCustomer?.(); } },
    { id: 'act-new-veh', title: 'Add New Vehicle', subtitle: 'Register plate & photo', icon: '🚙', category: 'Actions', onSelect: () => { onNavigateTab('vehicles'); onOpenNewVehicle?.(); } },
    { id: 'act-backup', title: 'Create Hot Database Backup', subtitle: 'Instant safe snapshot', icon: '💾', category: 'Actions', onSelect: () => { onNavigateTab('settings'); onTriggerBackup?.(); } }
  ]

  const filtered = defaultCommands.filter((c) => {
    const q = query.toLowerCase().trim()
    if (!q) return true
    return (
      c.title.toLowerCase().includes(q) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filtered[selectedIndex]
      if (selected) {
        selected.onSelect()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        zIndex: 9999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 580,
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-default)',
            gap: 12
          }}
        >
          <span style={{ fontSize: 18, color: 'var(--text-muted)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or jump to screen... (ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14.5,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent'
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-default)'
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No matching commands or destinations found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.onSelect()
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSelected ? 'var(--primary-50)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div>
                      <div
                        style={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: 13.5,
                          color: isSelected ? 'var(--primary-600)' : 'var(--text-primary)'
                        }}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: isSelected ? 'var(--primary-600)' : 'var(--text-muted)',
                      backgroundColor: isSelected ? '#ffffff' : 'var(--bg-muted)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--bg-muted)',
            borderTop: '1px solid var(--border-default)',
            fontSize: 11.5,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate</span>
          <span>Press <strong>↵ Enter</strong> to select</span>
        </div>
      </div>
    </div>
  )
}
