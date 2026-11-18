import React, { useState } from 'react'
import { api } from '../../api'
import { downloadCsv } from '../../utils/csvDownload'

export type ImportSector = 'customers' | 'vehicles' | 'inventory' | 'services' | 'suppliers' | 'expenses'

interface Props {
  sector: ImportSector
  title: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const TEMPLATES: Record<ImportSector, { filename: string; content: string }> = {
  customers: {
    filename: 'customers_template.csv',
    content: `name,phone,email,address,notes\nSunil Perera,0771234567,sunil@gmail.com,124 Galle Rd Colombo,Individual client\nLanka Logistics,0112345678,fleet@logistics.lk,200 Baseline Rd Dematagoda,Corporate fleet`
  },
  vehicles: {
    filename: 'vehicles_template.csv',
    content: `registrationNo,customerPhone,make,model,year,category,fuelType,transmission,color,currentMileage\nCAB-1234,0771234567,Toyota,Corolla Axio,2018,Sedan,Petrol,Automatic,Pearl White,64500\nWP CAH-5678,0112345678,Honda,Vezel,2019,SUV,Hybrid,Automatic,Black,48200`
  },
  inventory: {
    filename: 'inventory_parts_template.csv',
    content: `sku,name,category,costPrice,sellingPrice,openingStock,unit,reorderLevel,location\nOIL-SYN-5W30,Mobil 1 Engine Oil 5W-30 (4L),Fluids & Lubricants,11500.00,14500.00,35,Bottle,10,Rack A-01\nFLT-OIL-TOY01,Toyota Genuine Oil Filter,Filters,1800.00,2600.00,50,Piece,15,Shelf B-01`
  },
  services: {
    filename: 'services_template.csv',
    content: `code,name,category,basePrice,estimatedDurationMinutes,description\nSRV-FULL-01,Full Periodic Comprehensive Service,Routine Maintenance,12500.00,120,Complete 45-point vehicle inspection\nSRV-ALIGN-04,Computerized 4-Wheel Alignment,Alignment & Tyres,3800.00,45,Laser wheel alignment calibration`
  },
  suppliers: {
    filename: 'suppliers_template.csv',
    content: `name,contactPerson,phone,email,address,notes\nToyota Lanka PVT Ltd,Roshan De Silva,0112939000,spares@toyota.lk,337 Negombo Rd Wattala,OEM parts supplier\nMcLarens Lubricants Ltd,Sanjeewa Perera,0114740700,mobil@mclarens.lk,284 Vauxhall St Colombo,Mobil oil distributor`
  },
  expenses: {
    filename: 'expenses_template.csv',
    content: `expenseDate,category,amount,paymentMethod,paidTo,referenceNo,notes\n2026-11-01,Workshop Rent & Utilities,125000.00,Bank Transfer,Colombo Land Holdings,RENT-NOV-2026,Monthly workshop bay rent\n2026-11-02,Electricity & Water,48500.00,Bank Transfer,Ceylon Electricity Board,CEB-998822,Three-phase compressor bill`
  }
}

export const DataImportModal: React.FC<Props> = ({ sector, title, isOpen, onClose, onSuccess }) => {
  const [csvContent, setCsvContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [validating, setValidating] = useState<boolean>(false)
  const [importing, setImporting] = useState<boolean>(false)
  const [dryRun, setDryRun] = useState<any>(null)
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip')
  const [result, setResult] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setErrorMsg(null)
    setDryRun(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
      handleDryRun(content)
    }
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file.')
    }
    reader.readAsText(file)
  }

  const handleDryRun = async (content: string): Promise<void> => {
    setValidating(true)
    setErrorMsg(null)
    try {
      const res = await api.import.validate(sector, content)
      if (res.success && res.data) {
        setDryRun(res.data)
      } else {
        setErrorMsg(res.error?.message || 'Failed to validate CSV data.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setValidating(false)
    }
  }

  const handleExecuteImport = async (): Promise<void> => {
    if (!csvContent) return
    setImporting(true)
    setErrorMsg(null)

    try {
      const res = await api.import.execute(sector, csvContent, duplicateAction)
      if (res.success && res.data) {
        setResult(res.data)
        onSuccess()
      } else {
        setErrorMsg(res.error?.message || 'Failed to execute import.')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadTemplate = (): void => {
    const template = TEMPLATES[sector]
    if (template) {
      downloadCsv(template.filename, template.content)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Import {title} from CSV
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
              Upload existing spreadsheet data into the system with validation and duplicate prevention.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={errorBannerStyle}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Step 1: File selection & Template download */}
        {!result && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Select CSV Spreadsheet:
              </label>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={downloadLinkStyle}
              >
                📥 Download Sample Template (.csv)
              </button>
            </div>

            <div style={dropZoneStyle}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                {fileName ? fileName : 'Click or Drag & Drop CSV file here'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Supports standard CSV files exported from Excel, Google Sheets, or previous software.
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Validation Preview */}
        {validating && (
          <div style={{ padding: 30, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            Analyzing and validating spreadsheet rows...
          </div>
        )}

        {dryRun && !result && (
          <div>
            {/* Stats Summary Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              <div style={{ ...statCardStyle, backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>TOTAL ROWS</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {dryRun.totalRows}
                </div>
              </div>
              <div style={{ ...statCardStyle, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>READY TO IMPORT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#15803d', marginTop: 2 }}>
                  {dryRun.validCount}
                </div>
              </div>
              <div style={{ ...statCardStyle, backgroundColor: dryRun.duplicateCount > 0 ? '#fffbeb' : '#f8fafc', borderColor: dryRun.duplicateCount > 0 ? '#fde68a' : '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>DUPLICATES DETECTED</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#d97706', marginTop: 2 }}>
                  {dryRun.duplicateCount}
                </div>
              </div>
              <div style={{ ...statCardStyle, backgroundColor: dryRun.errorCount > 0 ? '#fef2f2' : '#f8fafc', borderColor: dryRun.errorCount > 0 ? '#fecaca' : '#e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#991b1b', fontWeight: 600 }}>ERRORS FOUND</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                  {dryRun.errorCount}
                </div>
              </div>
            </div>

            {/* Duplicate Action Configuration */}
            {dryRun.duplicateCount > 0 && (
              <div style={configBoxStyle}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                  Duplicate Strategy:
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#78350f' }}>
                  <input
                    type="radio"
                    name="dupAction"
                    value="skip"
                    checked={duplicateAction === 'skip'}
                    onChange={() => setDuplicateAction('skip')}
                  />
                  Skip existing records
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#78350f' }}>
                  <input
                    type="radio"
                    name="dupAction"
                    value="update"
                    checked={duplicateAction === 'update'}
                    onChange={() => setDuplicateAction('update')}
                  />
                  Update existing records with new info
                </label>
              </div>
            )}

            {/* Row Inspection Sample */}
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '8px 12px' }}>Line #</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Record Data Preview</th>
                    <th style={{ padding: '8px 12px' }}>Notes / Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRun.rows.slice(0, 50).map((r: any) => (
                    <tr key={r.rowNumber} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#64748b' }}>
                        Row {r.rowNumber}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {!r.isValid ? (
                          <span style={badgeError}>Error</span>
                        ) : r.isDuplicate ? (
                          <span style={badgeWarning}>Duplicate</span>
                        ) : (
                          <span style={badgeSuccess}>Valid</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#1e293b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Object.values(r.data).filter(Boolean).slice(0, 3).join(' • ')}
                      </td>
                      <td style={{ padding: '8px 12px', color: r.errors.length > 0 ? '#dc2626' : '#64748b' }}>
                        {r.errors.length > 0 ? r.errors.join('; ') : r.isDuplicate ? `Matches existing (${r.conflictKey})` : 'Ready to import'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {result && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: '#15803d', margin: 0 }}>
              Import Completed Successfully!
            </h4>
            <div style={{ fontSize: 14, color: '#334155', marginTop: 8 }}>
              <strong>{result.importedCount}</strong> new records created • <strong>{result.updatedCount}</strong> records updated • <strong>{result.skippedCount}</strong> skipped.
            </div>
            {result.errors.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#dc2626' }}>
                Note: {result.errors.length} rows encountered issues and were bypassed.
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <button
            onClick={onClose}
            style={cancelBtnStyle}
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && dryRun && (
            <button
              onClick={handleExecuteImport}
              disabled={importing || (dryRun.validCount === 0 && duplicateAction === 'skip')}
              style={submitBtnStyle}
            >
              {importing
                ? 'Importing into Database...'
                : `Commit Import (${dryRun.validCount + (duplicateAction === 'update' ? dryRun.duplicateCount : 0)} Records)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: 14,
  width: '100%',
  maxWidth: 720,
  padding: 28,
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  boxSizing: 'border-box'
}

const dropZoneStyle: React.CSSProperties = {
  position: 'relative',
  border: '2px dashed #cbd5e1',
  borderRadius: 10,
  padding: '28px 20px',
  textAlign: 'center',
  backgroundColor: '#f8fafc',
  cursor: 'pointer',
  transition: 'all 0.15s ease'
}

const downloadLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline'
}

const statCardStyle: React.CSSProperties = {
  border: '1px solid',
  borderRadius: 8,
  padding: '10px 12px'
}

const configBoxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: 8,
  padding: '10px 14px',
  marginBottom: 16
}

const badgeSuccess: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  backgroundColor: '#dcfce7',
  color: '#15803d'
}

const badgeWarning: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  backgroundColor: '#fef3c7',
  color: '#b45309'
}

const badgeError: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: 9999,
  fontSize: 11,
  fontWeight: 700,
  backgroundColor: '#fee2e2',
  color: '#dc2626'
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#334155',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer'
}

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 6,
  backgroundColor: '#2563eb',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer'
}

const errorBannerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  color: '#b91c1c',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  marginBottom: 16
}
