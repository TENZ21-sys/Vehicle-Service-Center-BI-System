import React, { useState, useEffect } from 'react'
import { api } from '../../api'
import { StaffLookupResult } from '@shared/types/user.types'

interface Props {
  onClose: () => void
  onSelectUsername: (username: string) => void
}

export const UsernameLookupModal: React.FC<Props> = ({ onClose, onSelectUsername }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'directory'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StaffLookupResult[]>([])
  const [directoryList, setDirectoryList] = useState<StaffLookupResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (activeTab === 'directory' && directoryList.length === 0) {
      loadDirectory()
    }
  }, [activeTab])

  const loadDirectory = async (): Promise<void> => {
    setLoading(true)
    try {
      const res = await api.auth.listStaffDirectory()
      if (res.success && res.data) {
        setDirectoryList(res.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.auth.lookupUsername(searchQuery.trim())
      if (res.success && res.data) {
        setSearchResults(res.data)
      } else {
        setSearchResults([])
      }
    } catch {
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 10,
          padding: 24,
          maxWidth: 520,
          width: '90%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            🔍 Staff Username & ID Lookup
          </h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'search' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'search' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'search' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Lookup by Phone / Email
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'directory' ? '2px solid #2563eb' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === 'directory' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'directory' ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Workshop Staff Directory
          </button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Enter your registered phone number or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: 13
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Searching...' : 'Find ID'}
              </button>
            </form>

            {searched && (
              <div>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#6b7280', fontSize: 13 }}>
                    No matching account found with that contact info. Try the "Workshop Staff Directory" tab.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {searchResults.map((staff) => (
                      <div
                        key={staff.username}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 14px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8,
                          backgroundColor: '#f9fafb'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                            {staff.displayName}
                          </div>
                          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                            Username:{' '}
                            <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                              {staff.username}
                            </strong>{' '}
                            • Role: {staff.roleName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectUsername(staff.username)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Use Username
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                Loading workshop staff directory...
              </div>
            ) : directoryList.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                No active staff profiles registered yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {directoryList.map((staff) => (
                  <div
                    key={staff.username}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                        {staff.displayName}
                      </div>
                      <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>
                        Username:{' '}
                        <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>
                          {staff.username}
                        </strong>{' '}
                        • Role: {staff.roleName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectUsername(staff.username)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
