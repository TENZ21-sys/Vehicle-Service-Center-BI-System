import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { ExpenseCategory } from '@shared/types/finance.types'

export const WorkflowTab: React.FC = () => {
  // Job card workflow
  const [requireTech, setRequireTech] = useState(false)
  const [trackMileage, setTrackMileage] = useState(true)
  const [requireDeliveryMileage, setRequireDeliveryMileage] = useState(false)
  const [autoTimestamps, setAutoTimestamps] = useState(true)

  // Appointments settings
  const [allowOverlappingSlots, setAllowOverlappingSlots] = useState(true)
  const [defaultSlotDuration, setDefaultSlotDuration] = useState('60')
  const [autoAdvanceInService, setAutoAdvanceInService] = useState(true)

  // Quotations settings
  const [defaultValidityDays, setDefaultValidityDays] = useState('14')
  const [autoAllocateParts, setAutoAllocateParts] = useState(true)
  const [requireApprovalConversion, setRequireApprovalConversion] = useState(true)

  // Finance settings (granular toggles)
  const [enableExpenses, setEnableExpenses] = useState(true)
  const [enableCashRegister, setEnableCashRegister] = useState(true)
  const [enableCogsTracking, setEnableCogsTracking] = useState(true)

  // BI settings (granular toggles)
  const [enableTurnaroundMetrics, setEnableTurnaroundMetrics] = useState(true)
  const [enableTechnicianMetrics, setEnableTechnicianMetrics] = useState(true)
  const [enableInventoryAnalytics, setEnableInventoryAnalytics] = useState(true)
  const [enableCustomerAnalytics, setEnableCustomerAnalytics] = useState(true)
  const [enableCommissionTracking, setEnableCommissionTracking] = useState(false)
  const [commissionPercent, setCommissionPercent] = useState('10')

  // Expense Categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [newCatName, setNewCatName] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    setLoading(true)
    try {
      const [wfRes, aptRes, qtRes, finRes, biRes, catRes] = await Promise.all([
        api.settings.getByCategory('workflow'),
        api.settings.getByCategory('appointments'),
        api.settings.getByCategory('quotations'),
        api.settings.getByCategory('finance'),
        api.settings.getByCategory('bi'),
        api.finance.listCategories(true)
      ])

      if (wfRes.success && wfRes.data) {
        if (wfRes.data.require_technician_assignment !== undefined) setRequireTech(Boolean(wfRes.data.require_technician_assignment))
        if (wfRes.data.track_mileage !== undefined) setTrackMileage(Boolean(wfRes.data.track_mileage))
        if (wfRes.data.require_delivery_mileage !== undefined) setRequireDeliveryMileage(Boolean(wfRes.data.require_delivery_mileage))
        if (wfRes.data.auto_record_milestone_timestamps !== undefined) setAutoTimestamps(Boolean(wfRes.data.auto_record_milestone_timestamps))
      }

      if (aptRes.success && aptRes.data) {
        if (aptRes.data.allow_overlapping_slots !== undefined) setAllowOverlappingSlots(Boolean(aptRes.data.allow_overlapping_slots))
        if (aptRes.data.default_slot_duration !== undefined) setDefaultSlotDuration(String(aptRes.data.default_slot_duration))
        if (aptRes.data.auto_advance_to_in_service !== undefined) setAutoAdvanceInService(Boolean(aptRes.data.auto_advance_to_in_service))
      }

      if (qtRes.success && qtRes.data) {
        if (qtRes.data.default_validity_days !== undefined) setDefaultValidityDays(String(qtRes.data.default_validity_days))
        if (qtRes.data.auto_allocate_parts_on_conversion !== undefined) setAutoAllocateParts(Boolean(qtRes.data.auto_allocate_parts_on_conversion))
        if (qtRes.data.require_approval_before_conversion !== undefined) setRequireApprovalConversion(Boolean(qtRes.data.require_approval_before_conversion))
      }

      if (finRes.success && finRes.data) {
        if (finRes.data.finance_enable_expenses !== undefined) setEnableExpenses(Boolean(finRes.data.finance_enable_expenses))
        if (finRes.data.finance_enable_cash_register !== undefined) setEnableCashRegister(Boolean(finRes.data.finance_enable_cash_register))
        if (finRes.data.finance_enable_cogs_tracking !== undefined) setEnableCogsTracking(Boolean(finRes.data.finance_enable_cogs_tracking))
      }

      if (biRes.success && biRes.data) {
        if (biRes.data.bi_enable_turnaround_metrics !== undefined) setEnableTurnaroundMetrics(Boolean(biRes.data.bi_enable_turnaround_metrics))
        if (biRes.data.bi_enable_technician_metrics !== undefined) setEnableTechnicianMetrics(Boolean(biRes.data.bi_enable_technician_metrics))
        if (biRes.data.bi_enable_inventory_analytics !== undefined) setEnableInventoryAnalytics(Boolean(biRes.data.bi_enable_inventory_analytics))
        if (biRes.data.bi_enable_customer_analytics !== undefined) setEnableCustomerAnalytics(Boolean(biRes.data.bi_enable_customer_analytics))
        if (biRes.data.enable_technician_commission_tracking !== undefined) setEnableCommissionTracking(Boolean(biRes.data.enable_technician_commission_tracking))
        if (biRes.data.technician_commission_default_percent !== undefined) setCommissionPercent(String(biRes.data.technician_commission_default_percent))
      }

      if (catRes.success && catRes.data) {
        setCategories(catRes.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await Promise.all([
        // Workflow
        api.settings.set('workflow', 'require_technician_assignment', requireTech, 'boolean'),
        api.settings.set('workflow', 'track_mileage', trackMileage, 'boolean'),
        api.settings.set('workflow', 'require_delivery_mileage', requireDeliveryMileage, 'boolean'),
        api.settings.set('workflow', 'auto_record_milestone_timestamps', autoTimestamps, 'boolean'),
        // Appointments
        api.settings.set('appointments', 'allow_overlapping_slots', allowOverlappingSlots, 'boolean'),
        api.settings.set('appointments', 'default_slot_duration', parseInt(defaultSlotDuration, 10) || 60, 'number'),
        api.settings.set('appointments', 'auto_advance_to_in_service', autoAdvanceInService, 'boolean'),
        // Quotations
        api.settings.set('quotations', 'default_validity_days', parseInt(defaultValidityDays, 10) || 14, 'number'),
        api.settings.set('quotations', 'auto_allocate_parts_on_conversion', autoAllocateParts, 'boolean'),
        api.settings.set('quotations', 'require_approval_before_conversion', requireApprovalConversion, 'boolean'),
        // Finance
        api.settings.set('finance', 'finance_enable_expenses', enableExpenses, 'boolean'),
        api.settings.set('finance', 'finance_enable_cash_register', enableCashRegister, 'boolean'),
        api.settings.set('finance', 'finance_enable_cogs_tracking', enableCogsTracking, 'boolean'),
        // BI Analytics
        api.settings.set('bi', 'bi_enable_turnaround_metrics', enableTurnaroundMetrics, 'boolean'),
        api.settings.set('bi', 'bi_enable_technician_metrics', enableTechnicianMetrics, 'boolean'),
        api.settings.set('bi', 'bi_enable_inventory_analytics', enableInventoryAnalytics, 'boolean'),
        api.settings.set('bi', 'bi_enable_customer_analytics', enableCustomerAnalytics, 'boolean'),
        api.settings.set('bi', 'enable_technician_commission_tracking', enableCommissionTracking, 'boolean'),
        api.settings.set('bi', 'technician_commission_default_percent', parseFloat(commissionPercent) || 10, 'number')
      ])
      setMessage({ text: 'All workflow, finance, and BI preferences saved successfully!', type: 'success' })
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to save workflow settings.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async (): Promise<void> => {
    if (!newCatName.trim()) return
    try {
      const res = await api.finance.createCategory({ name: newCatName.trim() })
      if (res.success) {
        setNewCatName('')
        const updated = await api.finance.listCategories(true)
        if (updated.success && updated.data) setCategories(updated.data)
      } else {
        alert(res.error || 'Failed to add category')
      }
    } catch (err: any) {
      alert(err.message || 'Error adding category')
    }
  }

  const handleToggleCategory = async (cat: ExpenseCategory): Promise<void> => {
    try {
      const res = await api.finance.updateCategory(cat.id, { isActive: !cat.isActive })
      if (res.success) {
        const updated = await api.finance.listCategories(true)
        if (updated.success && updated.data) setCategories(updated.data)
      } else {
        alert(res.error || 'Failed to update category')
      }
    } catch (err: any) {
      alert(err.message || 'Error updating category')
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: '#6b7280' }}>Loading preferences...</div>
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <form onSubmit={handleSave}>
        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 6,
              marginBottom: 20,
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              fontSize: 14
            }}
          >
            {message.text}
          </div>
        )}

        {/* SECTION 1: FINANCE MODULE OPTIONS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            💵 Finance & Expenses Configuration
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>
            Control individual operational accounting and daily register features.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ToggleCard
              title="Operational Expense Tracking"
              description="Allow cashiers and accountants to record overhead, utility, rent, and staff payouts."
              checked={enableExpenses}
              onChange={setEnableExpenses}
            />

            <ToggleCard
              title="Daily Cash Register & Till Reconciliation"
              description="Track daily physical cash intake, cash expenses, and closing till balance position."
              checked={enableCashRegister}
              onChange={setEnableCashRegister}
            />

            <ToggleCard
              title="Automated Cost of Goods Sold (COGS) & Margin Calculation"
              description="Automatically compute parts cost of goods sold from inventory to calculate real gross profit."
              checked={enableCogsTracking}
              onChange={setEnableCogsTracking}
            />
          </div>
        </div>

        {/* SECTION 2: BI ANALYTICS MODULE OPTIONS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            📊 Business Intelligence (BI) Analytics Options
          </h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>
            Enable or disable specific executive dashboards and intelligence metrics.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ToggleCard
              title="Workshop Throughput & Turnaround Time Metrics"
              description="Calculate average turnaround hours, on-time delivery benchmarks, and service volume."
              checked={enableTurnaroundMetrics}
              onChange={setEnableTurnaroundMetrics}
            />

            <ToggleCard
              title="Technician Productivity & Workload Analytics"
              description="Track completed job cards, billable labour hours, and revenue per technician."
              checked={enableTechnicianMetrics}
              onChange={setEnableTechnicianMetrics}
            />

            <ToggleCard
              title="Inventory Velocity & Dead Stock Identification"
              description="Identify slow-moving stock with no movement over 60 days and total tied capital."
              checked={enableInventoryAnalytics}
              onChange={setEnableInventoryAnalytics}
            />

            <ToggleCard
              title="Customer Lifetime Value (LTV) & Retention Analytics"
              description="Track repeat customer rate and identify top spending workshop clients."
              checked={enableCustomerAnalytics}
              onChange={setEnableCustomerAnalytics}
            />

            <ToggleCard
              title="Technician Commission Tracking"
              description="Calculate automated labour commission percentages for workshop technicians."
              checked={enableCommissionTracking}
              onChange={setEnableCommissionTracking}
            />

            {enableCommissionTracking && (
              <div style={inputContainerStyle}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                    Default Commission Rate (%)
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Percentage of labour service revenue credited to the assigned technician.
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  style={numberInputStyle}
                />
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: APPOINTMENTS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            📅 Appointments & Scheduling Configuration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <ToggleCard
              title="Allow Overlapping Slots"
              description="Permit scheduling multiple simultaneous appointments in the same calendar time slot."
              checked={allowOverlappingSlots}
              onChange={setAllowOverlappingSlots}
            />

            <div style={inputContainerStyle}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                  Default Service Slot Duration (Minutes)
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  Standard block of time reserved for new appointments.
                </div>
              </div>
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={defaultSlotDuration}
                onChange={(e) => setDefaultSlotDuration(e.target.value)}
                style={numberInputStyle}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: QUOTATIONS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            📝 Quotations & Formal Estimates
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <ToggleCard
              title="Auto-Allocate Spare Parts on Conversion"
              description="Automatically create inventory stock deductions when an approved quotation is converted into a Job Card."
              checked={autoAllocateParts}
              onChange={setAutoAllocateParts}
            />

            <ToggleCard
              title="Require Customer Approval Before Conversion"
              description="Enforce that quotes must be in Approved state before creating workshop Job Cards."
              checked={requireApprovalConversion}
              onChange={setRequireApprovalConversion}
            />
          </div>
        </div>

        {/* SECTION 5: JOB CARDS */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            🔧 Workshop Job Card Workflow
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <ToggleCard
              title="Mandatory Technician Assignment"
              description="Job cards cannot move to In Progress without an assigned technician."
              checked={requireTech}
              onChange={setRequireTech}
            />

            <ToggleCard
              title="Odometer / Mileage Tracking"
              description="Record vehicle mileage in during check-in."
              checked={trackMileage}
              onChange={setTrackMileage}
            />
          </div>
        </div>

        {/* Save All Settings Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 24px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration Changes'}
          </button>
        </div>
      </form>

      {/* SECTION 6: DYNAMIC EXPENSE CATEGORIES MANAGER */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginBottom: 40 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
          🏷️ Manage Expense Categories
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px 0' }}>
          Add custom categories or enable/disable categories for your workshop.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="New Category Name (e.g. Diagnostic Scanner Subscription)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}
          />
          <button
            type="button"
            onClick={handleAddCategory}
            style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Category
          </button>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, color: c.isActive ? '#111827' : '#9ca3af' }}>
                    {c.name} {!c.isActive && '(Disabled)'}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(c)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        border: '1px solid #d1d5db',
                        backgroundColor: c.isActive ? '#fee2e2' : '#f3f4f6',
                        color: c.isActive ? '#b91c1c' : '#374151',
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {c.isActive ? 'Deactivate' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const ToggleCard: React.FC<{
  title: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}> = ({ title, description, checked, onChange }) => (
  <div
    style={{
      padding: '14px 16px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16
    }}
  >
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3, lineHeight: '1.4' }}>
        {description}
      </div>
    </div>
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, marginTop: 2 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: 'absolute',
          cursor: 'pointer',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: checked ? '#2563eb' : '#d1d5db',
          transition: '0.2s',
          borderRadius: 24
        }}
      >
        <span
          style={{
            position: 'absolute',
            content: '""',
            height: 18,
            width: 18,
            left: checked ? 23 : 3,
            bottom: 3,
            backgroundColor: 'white',
            transition: '0.2s',
            borderRadius: '50%'
          }}
        />
      </span>
    </label>
  </div>
)

const inputContainerStyle: React.CSSProperties = {
  padding: '14px 16px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16
}

const numberInputStyle: React.CSSProperties = {
  width: 90,
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  textAlign: 'right'
}
