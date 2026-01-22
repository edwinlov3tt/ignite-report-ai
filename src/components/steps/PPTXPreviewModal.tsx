import { useState } from 'react'
import {
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  XCircle,
  Edit3,
} from 'lucide-react'
import type { PPTXExtractResponse } from '@/types/pptx'
import type { DetectedTactic, UploadedFile } from '@/types'
import { createUploadedFile } from '@/lib/fileParser'

// Confidence thresholds for validation badges
const HIGH_CONFIDENCE_THRESHOLD = 0.9
const MEDIUM_CONFIDENCE_THRESHOLD = 0.6
const DEFAULT_CONFIDENCE_FALLBACK = 0.8
const MAX_PREVIEW_ROWS = 10
const MAX_MISSING_HEADERS_DISPLAY = 2

interface PPTXPreviewModalProps {
  isOpen: boolean
  data: PPTXExtractResponse
  detectedTactics: DetectedTactic[]
  /** Function to get expected headers for a tactic name */
  getExpectedHeaders?: (tacticName: string) => string[]
  onClose: () => void
  onImport: (files: UploadedFile[]) => void
  onAssignTactic: (tableId: string, tacticName: string, expectedHeaders?: string[]) => void
  onToggleIncluded: (tableId: string) => void
  onUpdateCell: (tableId: string, rowIndex: number, header: string, value: string) => void
}

interface EditingCell {
  tableId: string
  rowIndex: number
  header: string
}

export function PPTXPreviewModal({
  isOpen,
  data,
  detectedTactics,
  getExpectedHeaders,
  onClose,
  onImport,
  onAssignTactic,
  onToggleIncluded,
  onUpdateCell,
}: PPTXPreviewModalProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')

  if (!isOpen) return null

  const toggleExpanded = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      if (next.has(tableId)) {
        next.delete(tableId)
      } else {
        next.add(tableId)
      }
      return next
    })
  }

  const startEditing = (tableId: string, rowIndex: number, header: string, currentValue: string) => {
    setEditingCell({ tableId, rowIndex, header })
    setEditValue(currentValue)
  }

  const saveEdit = () => {
    if (editingCell) {
      onUpdateCell(editingCell.tableId, editingCell.rowIndex, editingCell.header, editValue)
      setEditingCell(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Handle tactic assignment with header validation
  const handleTacticAssign = (tableId: string, tacticName: string) => {
    const expectedHeaders = getExpectedHeaders?.(tacticName) ?? []
    onAssignTactic(tableId, tacticName, expectedHeaders)
  }

  const getConfidenceBadge = (confidence: number) => {
    const getBadgeConfig = () => {
      if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
        return {
          Icon: Check,
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--color-success)',
        }
      } else if (confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
        return {
          Icon: AlertTriangle,
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#d97706',
        }
      } else {
        return {
          Icon: XCircle,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--color-error)',
        }
      }
    }

    const { Icon, backgroundColor, color } = getBadgeConfig()

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        backgroundColor,
        color,
        fontSize: '12px',
        fontWeight: 600,
      }}>
        <Icon size={12} />
        {Math.round(confidence * 100)}%
      </span>
    )
  }

  const includedTables = data.tables.filter((t) => t.included)
  const assignedTables = includedTables.filter((t) => t.assignedTactic)

  const handleImport = () => {
    const filesToImport: UploadedFile[] = []

    for (const table of includedTables) {
      if (!table.assignedTactic) continue

      // Convert table rows to the format expected by UploadedFile
      const tableData = table.rows.map((row) => {
        const converted: Record<string, string | number> = {}
        for (const [key, value] of Object.entries(row)) {
          // Try to convert to number if possible
          const numValue = parseFloat(value)
          converted[key] = isNaN(numValue) ? value : numValue
        }
        return converted
      })

      const uploadedFile = createUploadedFile(
        {
          name: `${table.slideTitle || `Slide ${table.slideNumber}`} - Table ${table.tableIndex + 1}.csv`,
          size: JSON.stringify(tableData).length,
        },
        {
          headers: table.headers,
          data: tableData,
          rowCount: table.rowCount,
        },
        table.assignedTactic,
        table.headerMatch?.confidence ?? DEFAULT_CONFIDENCE_FALLBACK,
        'pptx_extraction'
      )

      filesToImport.push(uploadedFile)
    }

    onImport(filesToImport)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--color-background)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileSpreadsheet size={24} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                PowerPoint Import
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {data.metadata.filename} - Found {data.tables.length} table{data.tables.length !== 1 ? 's' : ''} across {data.metadata.slideCount} slides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {data.tables.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px',
                color: 'var(--color-text-muted)',
              }}
            >
              <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '16px' }}>
                No data tables found in this PowerPoint file
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.tables.map((table) => {
                const isExpanded = expandedTables.has(table.id!)
                const validation = table.headerMatch

                return (
                  <div
                    key={table.id}
                    style={{
                      border: `1px solid ${table.included ? 'var(--color-border)' : 'var(--color-gray-200)'}`,
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: table.included ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
                      opacity: table.included ? 1 : 0.6,
                    }}
                  >
                    {/* Table Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleExpanded(table.id!)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600 }}>
                              Slide {table.slideNumber}: {table.slideTitle || 'Untitled'}
                            </span>
                            {validation && getConfidenceBadge(validation.confidence)}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            {table.rowCount} rows, {table.headers.length} columns
                            {validation && validation.missingHeaders.length > 0 && (
                              <span style={{ color: '#d97706' }}>
                                {' '}| Missing: {validation.missingHeaders.slice(0, MAX_MISSING_HEADERS_DISPLAY).join(', ')}
                                {validation.missingHeaders.length > MAX_MISSING_HEADERS_DISPLAY && ` +${validation.missingHeaders.length - MAX_MISSING_HEADERS_DISPLAY} more`}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
                        {/* Tactic Assignment */}
                        <select
                          value={table.assignedTactic || ''}
                          onChange={(e) => handleTacticAssign(table.id!, e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-background)',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Select Tactic...</option>
                          {detectedTactics.map((tactic) => (
                            <option key={tactic.name} value={tactic.name}>
                              {tactic.name}
                            </option>
                          ))}
                        </select>

                        {/* Include/Exclude Toggle */}
                        <button
                          onClick={() => onToggleIncluded(table.id!)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: table.included ? 'var(--color-success)' : 'var(--color-gray-200)',
                            color: table.included ? 'white' : 'var(--color-text-secondary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {table.included ? 'Included' : 'Excluded'}
                        </button>
                      </div>
                    </div>

                    {/* Table Preview */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: '0 16px 16px',
                          overflowX: 'auto',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                          }}
                        >
                          <thead>
                            <tr>
                              {table.headers.map((header, i) => (
                                <th
                                  key={i}
                                  style={{
                                    padding: '8px 12px',
                                    textAlign: 'left',
                                    backgroundColor: 'var(--color-gray-100)',
                                    borderBottom: '1px solid var(--color-border)',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.slice(0, MAX_PREVIEW_ROWS).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {table.headers.map((header, colIndex) => {
                                  const isEditing =
                                    editingCell?.tableId === table.id &&
                                    editingCell?.rowIndex === rowIndex &&
                                    editingCell?.header === header

                                  return (
                                    <td
                                      key={colIndex}
                                      style={{
                                        padding: '8px 12px',
                                        borderBottom: '1px solid var(--color-border)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                      }}
                                      onClick={() => !isEditing && startEditing(table.id!, rowIndex, header, row[header] || '')}
                                    >
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyDown={handleKeyDown}
                                          onBlur={saveEdit}
                                          autoFocus
                                          style={{
                                            width: '100%',
                                            padding: '4px',
                                            border: '1px solid var(--color-primary)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: '13px',
                                          }}
                                        />
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span>{row[header] || ''}</span>
                                          <Edit3
                                            size={12}
                                            style={{
                                              opacity: 0.3,
                                              flexShrink: 0,
                                            }}
                                          />
                                        </div>
                                      )}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {table.rowCount > MAX_PREVIEW_ROWS && (
                          <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            Showing {MAX_PREVIEW_ROWS} of {table.rowCount} rows
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface-secondary)',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {assignedTables.length} of {includedTables.length} table{includedTables.length !== 1 ? 's' : ''} assigned to tactics
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={assignedTables.length === 0}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: assignedTables.length > 0 ? 'var(--color-primary)' : 'var(--color-gray-300)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: assignedTables.length > 0 ? 'pointer' : 'not-allowed',
              }}
            >
              Import {assignedTables.length} Table{assignedTables.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
