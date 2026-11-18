import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import {
  JobCardWithDetails,
  JobCardServiceItem,
  JobCardPartItem
} from '@shared/types/job-card.types'
import { ServiceItem } from '@shared/types/catalogue.types'
import { InventoryItem } from '@shared/types/inventory.types'
import { formatMoney, toMoneyAmount } from '@shared/types/money.types'
import { InvoiceDocumentModal } from '../billing/InvoiceDocumentModal'

interface Props {
  jobCardId: string
  onBack: () => void
}

export const JobCardDetailPage: React.FC<Props> = ({ jobCardId, onBack }) => {
  const [jobCard, setJobCard] = useState<JobCardWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Options & settings
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; username: string; displayName: string }>>([])
  const [catalogueServices, setCatalogueServices] = useState<ServiceItem[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [workflowSettings, setWorkflowSettings] = useState<{
    requireTech: boolean
    trackMileage: boolean
    requireDeliveryMileage: boolean
  }>({ requireTech: false, trackMileage: true, requireDeliveryMileage: false })

  // Modals
  const [showAddServiceModal, setShowAddServiceModal] = useState(false)
  const [showAddPartModal, setShowAddPartModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [deliveryMileage, setDeliveryMileage] = useState('')
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  // Edit fields
  const [findingsText, setFindingsText] = useState('')
  const [internalNotesText, setInternalNotesText] = useState('')
  const [customerNotesText, setCustomerNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    loadJobCard()
    loadAuxiliaryData()
  }, [jobCardId])

  const loadJobCard = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.jobcards.get(jobCardId)
      if (res.success && res.data) {
        setJobCard(res.data)
        setFindingsText(res.data.findings || '')
        setInternalNotesText(res.data.internalNotes || '')
        setCustomerNotesText(res.data.customerNotes || '')
      } else {
        setError(res.error?.message || 'Failed to load job card')
      }
    } catch (err: any) {
      setError(err.message || 'Error loading job card')
    } finally {
      setLoading(false)
    }
  }

  const loadAuxiliaryData = async (): Promise<void> => {
    try {
      const [svcRes, invRes, wfRes] = await Promise.all([
        api.catalogue.listServices({ includeInactive: false }),
        api.inventory.listItems({ includeInactive: false }),
        api.settings.getByCategory('workflow')
      ])
      if (svcRes.success && svcRes.data) setCatalogueServices(svcRes.data)
      if (invRes.success && invRes.data) setInventoryItems(invRes.data)
      if (wfRes.success && wfRes.data) {
        setWorkflowSettings({
          requireTech: Boolean(wfRes.data.require_technician_assignment),
          trackMileage: wfRes.data.track_mileage !== undefined ? Boolean(wfRes.data.track_mileage) : true,
          requireDeliveryMileage: Boolean(wfRes.data.require_delivery_mileage)
        })
      }
    } catch {
      // ignore
    }
  }

  const handleStatusChange = async (nextStatus: string, mileageOutVal?: number): Promise<void> => {
    setError(null)
    try {
      const res = await api.jobcards.updateStatus(jobCardId, {
        status: nextStatus,
        mileageOut: mileageOutVal
      })
      if (!res.success) {
        setError(res.error?.message || `Failed to transition status to ${nextStatus}`)
        return
      }
      loadJobCard()
    } catch (err: any) {
      setError(err.message || 'Error updating status')
    }
  }

  const handleGenerateInvoice = async (): Promise<void> => {
    if (!jobCard) return
    setError(null)
    setGeneratingInvoice(true)
    try {
      const res = await api.invoices.createFromJobCard({
        jobCardId: jobCard.id
      })
      if (res.success && res.data) {
        await loadJobCard()
        setViewInvoiceId(res.data.id)
      } else {
        setError(res.error?.message || 'Failed to generate invoice')
      }
    } catch (err: any) {
      setError(err?.message || 'Error generating invoice')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const handleAssignTechnician = async (techId: string): Promise<void> => {
    setError(null)
    try {
      const res = await api.jobcards.assignTechnician(jobCardId, {
        technicianId: techId || null
      })
      if (!res.success) {
        setError(res.error?.message || 'Failed to assign technician')
        return
      }
      loadJobCard()
    } catch (err: any) {
      setError(err.message || 'Error assigning technician')
    }
  }

  const handleSaveNotes = async (): Promise<void> => {
    setSavingNotes(true)
    setError(null)
    try {
      const res = await api.jobcards.update(jobCardId, {
        findings: findingsText,
        internalNotes: internalNotesText,
        customerNotes: customerNotesText
      })
      if (!res.success) {
        setError(res.error?.message || 'Failed to save notes')
        return
      }
      loadJobCard()
    } catch (err: any) {
      setError(err.message || 'Error saving notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleRemoveService = async (serviceLineId: string): Promise<void> => {
    if (!window.confirm('Remove this service from the job card?')) return
    try {
      await api.jobcards.removeService(serviceLineId)
      loadJobCard()
    } catch {
      // ignore
    }
  }

  const handleServiceStatus = async (serviceLineId: string, status: any): Promise<void> => {
    try {
      await api.jobcards.updateService(serviceLineId, { status })
      loadJobCard()
    } catch {
      // ignore
    }
  }

  const handleRemovePart = async (partLineId: string): Promise<void> => {
    if (!window.confirm('Remove this part? The allocated quantity will be returned to inventory stock.')) return
    try {
      await api.jobcards.removePart(partLineId)
      loadJobCard()
    } catch {
      // ignore
    }
  }

  if (loading || !jobCard) {
    return <div style={{ padding: 28, color: '#6b7280' }}>Loading job card details...</div>
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    Open: { bg: '#eff6ff', text: '#1d4ed8' },
    'In Progress': { bg: '#fef3c7', text: '#b45309' },
    'Waiting for Parts': { bg: '#fee2e2', text: '#b91c1c' },
    'Quality Check': { bg: '#f3e8ff', text: '#7e22ce' },
    Ready: { bg: '#dcfce7', text: '#15803d' },
    Delivered: { bg: '#e5e7eb', text: '#374151' }
  }
  const currentBadge = statusColors[jobCard.status] || { bg: '#f3f4f6', text: '#374151' }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={secondaryBtnStyle}>
            ← Back to Job Cards
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#111827' }}>
                {jobCard.jobCardNumber}
              </h1>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 16,
                  backgroundColor: currentBadge.bg,
                  color: currentBadge.text
                }}
              >
                {jobCard.status}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563'
                }}
              >
                Priority: {jobCard.priority}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>
              Opened on: {new Date(jobCard.receivedAt || jobCard.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Quick Workflow Action Stepper */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {jobCard.status === 'Open' && (
            <button
              onClick={() => handleStatusChange('In Progress')}
              style={{ ...workflowActionBtnStyle, background: '#2563eb' }}
            >
              ▶ Start Work
            </button>
          )}

          {jobCard.status === 'In Progress' && (
            <>
              <button
                onClick={() => handleStatusChange('Waiting for Parts')}
                style={{ ...workflowActionBtnStyle, background: '#d97706' }}
              >
                ⏳ Wait for Parts
              </button>
              <button
                onClick={() => handleStatusChange('Quality Check')}
                style={{ ...workflowActionBtnStyle, background: '#7c3aed' }}
              >
                🔍 Quality Check
              </button>
            </>
          )}

          {jobCard.status === 'Waiting for Parts' && (
            <button
              onClick={() => handleStatusChange('In Progress')}
              style={{ ...workflowActionBtnStyle, background: '#2563eb' }}
            >
              ▶ Resume Work
            </button>
          )}

          {jobCard.status === 'Quality Check' && (
            <button
              onClick={() => handleStatusChange('Ready')}
              style={{ ...workflowActionBtnStyle, background: '#16a34a' }}
            >
              ✓ Mark Ready for Delivery
            </button>
          )}

          {jobCard.status === 'Ready' && (
            <button
              onClick={() => {
                if (workflowSettings.requireDeliveryMileage) {
                  setShowDeliverModal(true)
                } else {
                  handleStatusChange('Delivered')
                }
              }}
              style={{ ...workflowActionBtnStyle, background: '#059669' }}
            >
              🚗 Handover & Deliver Vehicle
            </button>
          )}

          {/* Fallback status picker */}
          <select
            value={jobCard.status}
            onChange={(e) => {
              if (e.target.value === 'Delivered' && workflowSettings.requireDeliveryMileage) {
                setShowDeliverModal(true)
              } else {
                handleStatusChange(e.target.value)
              }
            }}
            style={{ ...inputStyle, width: 140, fontSize: 12 }}
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Parts">Waiting for Parts</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Ready">Ready</option>
            <option value="Delivered">Delivered</option>
          </select>

          {/* Invoice Action Button */}
          {jobCard.invoiceId ? (
            <button
              onClick={() => setViewInvoiceId(jobCard.invoiceId!)}
              style={{ ...workflowActionBtnStyle, background: '#059669' }}
            >
              📄 View Invoice
            </button>
          ) : (
            <button
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice}
              style={{ ...workflowActionBtnStyle, background: '#2563eb' }}
            >
              {generatingInvoice ? 'Generating...' : '💳 Generate Invoice'}
            </button>
          )}
        </div>
      </div>

      {error && <div style={errorBannerStyle}>{error}</div>}

      {/* Top Cards: Customer, Vehicle, Workshop Assignments & Milestones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Customer Card */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Customer Profile</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{jobCard.customer.name}</div>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
            📞 {jobCard.customer.phonePrimary}
          </div>
          {jobCard.customer.nic && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              NIC: {jobCard.customer.nic}
            </div>
          )}
          {jobCard.customer.address && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              📍 {jobCard.customer.address}
            </div>
          )}
        </div>

        {/* Vehicle Card */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Vehicle Information</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1d4ed8' }}>
            {jobCard.vehicle.registrationNo}
          </div>
          <div style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>
            {jobCard.vehicle.make} {jobCard.vehicle.model} ({jobCard.vehicle.year || 'N/A'})
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Category: {jobCard.vehicle.categoryName || 'General'} | {jobCard.vehicle.fuelType || 'Fuel N/A'}
          </div>
          {workflowSettings.trackMileage && (
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginTop: 4 }}>
              Reception Mileage: <strong>{jobCard.mileageIn ? `${jobCard.mileageIn.toLocaleString()} km` : 'Not recorded'}</strong>
              {jobCard.mileageOut && ` ➔ Delivery: ${jobCard.mileageOut.toLocaleString()} km`}
            </div>
          )}
        </div>

        {/* Technician Assignment & Milestones */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Workshop Milestones</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#4b5563' }}>
            <div>Assigned Tech: <strong>{jobCard.technicianName || 'Unassigned'}</strong></div>
            <div>Work Started: <strong>{jobCard.startedAt ? new Date(jobCard.startedAt).toLocaleTimeString() : 'Pending'}</strong></div>
            <div>Work Completed: <strong>{jobCard.completedAt ? new Date(jobCard.completedAt).toLocaleTimeString() : 'Pending'}</strong></div>
            <div>Vehicle Delivered: <strong>{jobCard.deliveredAt ? new Date(jobCard.deliveredAt).toLocaleTimeString() : 'In Shop'}</strong></div>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>
              Services To Perform ({jobCard.services.length})
            </h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Standard labor and materials configured for this job
            </div>
          </div>
          <button onClick={() => setShowAddServiceModal(true)} style={primaryBtnSmallStyle}>
            + Add Service
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>Service</th>
              <th style={thStyle}>Base Price</th>
              <th style={thStyle}>Labor Charge</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobCard.services.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                  No services added yet. Click "+ Add Service" to attach services.
                </td>
              </tr>
            ) : (
              jobCard.services.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{s.serviceName}</div>
                    {s.notes && <div style={{ fontSize: 11, color: '#6b7280' }}>{s.notes}</div>}
                  </td>
                  <td style={tdStyle}>{formatMoney(s.priceAmount)}</td>
                  <td style={tdStyle}>{formatMoney(s.laborAmount)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#047857' }}>
                    {formatMoney(s.priceAmount + s.laborAmount)}
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={s.status}
                      onChange={(e) => handleServiceStatus(s.id, e.target.value)}
                      style={{ ...inputStyle, width: 115, fontSize: 11, padding: '4px 6px' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => handleRemoveService(s.id)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Parts Used Table */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#111827' }}>
              Parts & Materials Used ({jobCard.parts.length})
            </h2>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              Deducted automatically from inventory stock ledger
            </div>
          </div>
          <button onClick={() => setShowAddPartModal(true)} style={primaryBtnSmallStyle}>
            + Add Part
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={thStyle}>Part Name / SKU</th>
              <th style={thStyle}>Quantity</th>
              <th style={thStyle}>Unit Selling Price</th>
              <th style={thStyle}>Line Total</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobCard.parts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
                  No parts allocated to this job card yet. Click "+ Add Part" to draw from inventory.
                </td>
              </tr>
            ) : (
              jobCard.parts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{p.itemName}</div>
                    {p.itemSku && <div style={{ fontSize: 11, color: '#6b7280' }}>SKU: {p.itemSku}</div>}
                  </td>
                  <td style={tdStyle}>
                    {p.quantity} {p.unitAbbr || 'units'}
                  </td>
                  <td style={tdStyle}>{formatMoney(p.unitPriceAmount)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: '#047857' }}>
                    {formatMoney(p.totalAmount)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => handleRemovePart(p.id)}
                      title="Return part to stock"
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}
                    >
                      Return to Stock
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Notes Editor */}
        <div style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#111827' }}>
              Inspection Findings & Workshop Notes
            </h3>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              style={{ ...secondaryBtnStyle, padding: '4px 10px', fontSize: 12 }}
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Inspection Findings / Work Done</label>
              <textarea
                value={findingsText}
                onChange={(e) => setFindingsText(e.target.value)}
                rows={3}
                style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Customer Notes (Visible on Invoice)</label>
              <textarea
                value={customerNotesText}
                onChange={(e) => setCustomerNotesText(e.target.value)}
                rows={2}
                style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Live Financial Totals */}
        <div style={{ ...sectionCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px 0', color: '#111827' }}>
              Running Total Cost
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563', marginBottom: 6 }}>
              <span>Services Subtotal:</span>
              <span>{formatMoney(jobCard.totals.subtotalServices)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563', marginBottom: 6 }}>
              <span>Labor Charges:</span>
              <span>{formatMoney(jobCard.totals.subtotalLabor)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563', marginBottom: 10 }}>
              <span>Parts & Materials:</span>
              <span>{formatMoney(jobCard.totals.subtotalParts)}</span>
            </div>
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, color: '#047857' }}>
              <span>Estimated Total:</span>
              <span>{formatMoney(jobCard.totals.grandTotal)}</span>
            </div>
          </div>

          {jobCard.invoiceId ? (
            <div style={{ fontSize: 12, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 12px', borderRadius: 6, marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>✓ <strong>Invoiced</strong></span>
              <button
                onClick={() => setViewInvoiceId(jobCard.invoiceId!)}
                style={{ ...primaryBtnSmallStyle, background: '#059669', fontSize: 11, padding: '3px 8px' }}
              >
                View Document
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                style={{ ...workflowActionBtnStyle, background: '#2563eb', width: '100%', fontSize: 13 }}
              >
                {generatingInvoice ? 'Generating Invoice...' : '💳 Generate & Print Invoice'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <AddServiceDialog
          catalogueServices={catalogueServices}
          onClose={() => setShowAddServiceModal(false)}
          onAdd={async (svcData) => {
            const res = await api.jobcards.addService(jobCardId, svcData)
            if (res.success) {
              setShowAddServiceModal(false)
              loadJobCard()
            } else {
              setError(res.error?.message || 'Failed to add service')
            }
          }}
        />
      )}

      {/* Add Part Modal */}
      {showAddPartModal && (
        <AddPartDialog
          inventoryItems={inventoryItems}
          onClose={() => setShowAddPartModal(false)}
          onAdd={async (partData) => {
            const res = await api.jobcards.addPart(jobCardId, partData)
            if (res.success) {
              setShowAddPartModal(false)
              loadJobCard()
            } else {
              setError(res.error?.message || 'Failed to add part')
            }
          }}
        />
      )}

      {/* Delivery Mileage Modal */}
      {showDeliverModal && (
        <div style={backdropStyle}>
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 440 }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 16, fontWeight: 600 }}>Deliver Vehicle</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px 0' }}>
              Enter the final odometer reading upon vehicle delivery.
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                Delivery Mileage (km) *
              </label>
              <input
                type="number"
                min={jobCard.mileageIn || 0}
                placeholder="e.g. 85450"
                value={deliveryMileage}
                onChange={(e) => setDeliveryMileage(e.target.value)}
                style={inputStyle}
                required
              />
              {jobCard.mileageIn && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                  Reception mileage was {jobCard.mileageIn.toLocaleString()} km
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowDeliverModal(false)} style={secondaryBtnStyle}>Cancel</button>
              <button
                onClick={() => {
                  const m = parseInt(deliveryMileage, 10)
                  if (isNaN(m)) return
                  setShowDeliverModal(false)
                  handleStatusChange('Delivered', m)
                }}
                style={{ ...workflowActionBtnStyle, background: '#059669' }}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Document Modal */}
      {viewInvoiceId && (
        <InvoiceDocumentModal
          invoiceId={viewInvoiceId}
          onClose={() => setViewInvoiceId(null)}
          onInvoiceUpdated={loadJobCard}
        />
      )}
    </div>
  )
}

// Add Service Sub-Dialog
const AddServiceDialog: React.FC<{
  catalogueServices: ServiceItem[]
  onClose: () => void
  onAdd: (data: any) => void
}> = ({ catalogueServices, onClose, onAdd }) => {
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [basePriceDisplay, setBasePriceDisplay] = useState('0.00')
  const [laborChargeDisplay, setLaborChargeDisplay] = useState('0.00')
  const [notes, setNotes] = useState('')

  const handleSelect = (sId: string): void => {
    setSelectedServiceId(sId)
    const s = catalogueServices.find((i) => i.id === sId)
    if (s) {
      setServiceName(s.name)
      setBasePriceDisplay((s.basePriceAmount / 100).toFixed(2))
      setLaborChargeDisplay((s.laborChargeAmount / 100).toFixed(2))
    }
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onAdd({
      serviceId: selectedServiceId || null,
      serviceName,
      priceAmount: toMoneyAmount(basePriceDisplay),
      laborAmount: toMoneyAmount(laborChargeDisplay),
      notes: notes.trim() || null
    })
  }

  return (
    <div style={backdropStyle}>
      <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 500 }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 600 }}>Attach Service to Job Card</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Pick from Service Catalogue</label>
            <select
              value={selectedServiceId}
              onChange={(e) => handleSelect(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Custom One-Off Service --</option>
              {catalogueServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.basePriceAmount + s.laborChargeAmount)})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Service Name *</label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Base Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePriceDisplay}
                onChange={(e) => setBasePriceDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Labor Charge</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={laborChargeDisplay}
                onChange={(e) => setLaborChargeDisplay(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Notes</label>
            <input
              type="text"
              placeholder="e.g. Include synthetic brake fluid"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button type="submit" style={primaryBtnSmallStyle}>Attach Service</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Part Sub-Dialog
const AddPartDialog: React.FC<{
  inventoryItems: InventoryItem[]
  onClose: () => void
  onAdd: (data: any) => void
}> = ({ inventoryItems, onClose, onAdd }) => {
  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPriceDisplay, setUnitPriceDisplay] = useState('0.00')

  const selectedItem = inventoryItems.find((i) => i.id === selectedItemId)

  const handleSelect = (itemId: string): void => {
    setSelectedItemId(itemId)
    const item = inventoryItems.find((i) => i.id === itemId)
    if (item) {
      setUnitPriceDisplay((item.sellingPriceAmount / 100).toFixed(2))
    }
  }

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!selectedItemId) return
    onAdd({
      inventoryItemId: selectedItemId,
      quantity: parseFloat(quantity) || 1,
      unitPriceAmount: toMoneyAmount(unitPriceDisplay)
    })
  }

  return (
    <div style={backdropStyle}>
      <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 500 }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 600 }}>Allocate Part from Inventory</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Inventory Item *</label>
            <select
              value={selectedItemId}
              onChange={(e) => handleSelect(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">-- Select Inventory Item --</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.sku ? `(${item.sku})` : ''} — Stock: {item.currentStock} {item.unitAbbr || ''}
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: 4, fontSize: 12 }}>
              Available in Workshop: <strong>{selectedItem.currentStock} {selectedItem.unitAbbr || ''}</strong>
              {selectedItem.location && ` | Shelf: ${selectedItem.location}`}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Quantity Used *</label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Selling Price Each</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPriceDisplay}
                onChange={(e) => setUnitPriceDisplay(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button type="submit" style={primaryBtnSmallStyle}>Allocate & Deduct Stock</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb'
}
const sectionCardStyle: React.CSSProperties = {
  backgroundColor: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb'
}
const cardHeaderStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8
}
const thStyle: React.CSSProperties = {
  padding: '10px 12px', fontWeight: 600, color: '#374151', fontSize: 12
}
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', verticalAlign: 'middle'
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box'
}
const primaryBtnSmallStyle: React.CSSProperties = {
  padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500
}
const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 14px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500
}
const workflowActionBtnStyle: React.CSSProperties = {
  padding: '7px 16px', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600
}
const backdropStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}
const errorBannerStyle: React.CSSProperties = {
  padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 6, fontSize: 13
}
