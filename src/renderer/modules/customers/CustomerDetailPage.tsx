import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { CustomerWithVehicles } from '@shared/types/customer.types'
import { ServiceReminder, VehicleWithCustomer } from '@shared/types/vehicle.types'
import { VehicleFormModal } from '../vehicles/VehicleFormModal'
import { ReminderModal } from '../vehicles/ReminderModal'
import { CustomerFormModal } from './CustomerFormModal'

interface Props {
  customerId: string
  onBack: () => void
}

export const CustomerDetailPage: React.FC<Props> = ({ customerId, onBack }) => {
  const [customer, setCustomer] = useState<CustomerWithVehicles | null>(null)
  const [reminders, setReminders] = useState<Record<string, ServiceReminder[]>>({})
  const [loading, setLoading] = useState(true)

  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithCustomer | null>(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [activeVehicleForReminder, setActiveVehicleForReminder] = useState<{ id: string; regNo: string } | null>(null)

  useEffect(() => {
    loadCustomer()
  }, [customerId])

  const loadCustomer = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.customers.get(customerId)
      if (res.success && res.data) {
        setCustomer(res.data)
        // Load reminders for each vehicle
        for (const v of res.data.vehicles) {
          loadVehicleReminders(v.id)
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const loadVehicleReminders = async (vehicleId: string): Promise<void> => {
    try {
      const res = await api.vehicles.reminders.listForVehicle(vehicleId)
      if (res.success && res.data) {
        setReminders((prev) => ({
          ...prev,
          [vehicleId]: res.data!
        }))
      }
    } catch {
      // ignore
    }
  }

  const handleCompleteReminder = async (reminderId: string, vehicleId: string): Promise<void> => {
    try {
      await api.vehicles.reminders.complete(reminderId)
      loadVehicleReminders(vehicleId)
    } catch {
      // ignore
    }
  }

  const handleDeleteCustomer = async (): Promise<void> => {
    if (!customer) return
    if (!window.confirm(`Are you sure you want to remove customer "${customer.name}"? This customer will be deactivated.`)) return
    try {
      const res = await api.customers.deactivate(customer.id)
      if (res.success) {
        onBack()
      } else {
        alert(res.error?.message || 'Failed to remove customer')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeleteVehicle = async (vehicleId: string, regNo: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to remove vehicle "${regNo}"?`)) return
    try {
      const res = await api.vehicles.deactivate(vehicleId)
      if (res.success) {
        loadCustomer()
      } else {
        alert(res.error?.message || 'Failed to remove vehicle')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading || !customer) {
    return <div style={{ padding: 28 }}>Loading customer profile...</div>
  }

  return (
    <div style={{ padding: 28, height: '100%', overflowY: 'auto' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#2563eb',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
          padding: 0
        }}
      >
        ← Back to Customer Registry
      </button>

      {/* Customer Header & Profile Card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{customer.name}</h1>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#4b5563' }}>
              <div>📞 <strong>Primary:</strong> {customer.phonePrimary}</div>
              {customer.phoneSecondary && <div>📱 <strong>Secondary:</strong> {customer.phoneSecondary}</div>}
              {customer.email && <div>✉️ {customer.email}</div>}
              {customer.nic && <div>🆔 <strong>NIC:</strong> {customer.nic}</div>}
            </div>
            {customer.address && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                📍 {customer.address}
              </div>
            )}
            {customer.notes && (
              <div style={{ fontSize: 12, color: '#4b5563', backgroundColor: '#f9fafb', padding: '6px 10px', borderRadius: 6, marginTop: 8 }}>
                <strong>Notes:</strong> {customer.notes}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowCustomerModal(true)}
              style={actionBtnStyle}
            >
              Edit Profile
            </button>
            <button
              onClick={handleDeleteCustomer}
              style={{ ...actionBtnStyle, color: '#dc2626', borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}
            >
              Delete Customer
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Registered Vehicles ({customer.vehicles.length})
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Vehicles owned by this customer across any vehicle category
          </p>
        </div>

        <button
          onClick={() => setShowVehicleModal(true)}
          style={{ ...actionBtnStyle, backgroundColor: '#2563eb', color: '#fff', border: 'none' }}
        >
          + Register Vehicle
        </button>
      </div>

      {customer.vehicles.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 20px', color: '#6b7280' }}>
          No vehicles registered for this customer yet. Click <strong>"+ Register Vehicle"</strong> to add one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {customer.vehicles.map((v) => {
            const vehicleReminders = reminders[v.id] || []
            return (
              <div key={v.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 12, marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {v.imageUrl ? (
                      <img
                        src={v.imageUrl}
                        alt={v.registrationNo}
                        style={{
                          width: 64,
                          height: 48,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 6,
                          backgroundColor: '#eff6ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20
                        }}
                      >
                        🚗
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={badgeStyle}>{v.categoryName || 'Vehicle'}</span>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                          {v.registrationNo}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
                        {v.make} {v.model} {v.year ? `(${v.year})` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => setActiveVehicleForReminder({ id: v.id, regNo: v.registrationNo })}
                      style={{ ...actionBtnStyle, fontSize: 12, padding: '5px 10px' }}
                    >
                      + Reminder
                    </button>
                    <button
                      onClick={() => {
                        setEditingVehicle({
                          ...v,
                          customerName: customer.name,
                          customerPhone: customer.phonePrimary
                        })
                        setShowVehicleModal(true)
                      }}
                      style={{ ...actionBtnStyle, fontSize: 12, padding: '5px 10px', color: '#2563eb' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(v.id, v.registrationNo)}
                      style={{
                        ...actionBtnStyle,
                        fontSize: 12,
                        padding: '5px 10px',
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        backgroundColor: '#fef2f2'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 12, color: '#4b5563' }}>
                  <div>Color: <strong>{v.color || '—'}</strong></div>
                  <div>Fuel: <strong>{v.fuelType || '—'}</strong></div>
                  <div>Transmission: <strong>{v.transmission || '—'}</strong></div>
                  <div>Chassis / VIN: <strong>{v.vin || '—'}</strong></div>
                </div>

                {/* Service Reminders Section for this vehicle */}
                {vehicleReminders.length > 0 && (
                  <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                      Active Service Reminders:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {vehicleReminders.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            backgroundColor: r.isCompleted ? '#f9fafb' : '#fffbeb',
                            borderRadius: 6,
                            fontSize: 12,
                            border: `1px solid ${r.isCompleted ? '#e5e7eb' : '#fde68a'}`
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 600, color: r.isCompleted ? '#6b7280' : '#b45309' }}>
                              {r.reminderType === 'date' ? `Target Date: ${r.dueDate}` : `Target: ${r.dueMileage} km`}
                            </span>
                            <span style={{ marginLeft: 8, color: '#374151' }}>{r.description}</span>
                          </div>

                          {!r.isCompleted ? (
                            <button
                              onClick={() => handleCompleteReminder(r.id, v.id)}
                              style={{
                                padding: '3px 8px',
                                border: '1px solid #d97706',
                                borderRadius: 4,
                                backgroundColor: '#fff',
                                color: '#b45309',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Mark Completed
                            </button>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Completed</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <VehicleFormModal
        isOpen={showVehicleModal}
        customerId={customer.id}
        vehicleToEdit={editingVehicle}
        onClose={() => {
          setShowVehicleModal(false)
          setEditingVehicle(null)
        }}
        onSaved={(_v: VehicleWithCustomer) => {
          setShowVehicleModal(false)
          setEditingVehicle(null)
          loadCustomer()
        }}
      />

      <CustomerFormModal
        isOpen={showCustomerModal}
        customerToEdit={customer}
        onClose={() => setShowCustomerModal(false)}
        onSaved={(c: CustomerWithVehicles) => {
          setCustomer(c)
          setShowCustomerModal(false)
        }}
      />

      {activeVehicleForReminder && (
        <ReminderModal
          isOpen={true}
          vehicleId={activeVehicleForReminder.id}
          vehicleRegNo={activeVehicleForReminder.regNo}
          onClose={() => setActiveVehicleForReminder(null)}
          onSaved={() => {
            loadVehicleReminders(activeVehicleForReminder.id)
            setActiveVehicleForReminder(null)
          }}
        />
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 20,
  border: '1px solid #e5e7eb',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
}

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  backgroundColor: '#fff',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
}

const badgeStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  backgroundColor: '#eff6ff',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 600
}
