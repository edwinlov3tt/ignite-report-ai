/**
 * Import Preview Component
 * Displays validation results with row-by-row status
 */

import { useState } from 'react'
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react'
import type { ImportPreviewResult, FileValidationResult, RowValidationResult } from '@/lib/importExport'
import { getRowStatus, getValidationStatus } from '@/lib/importExport'

interface ImportPreviewProps {
  preview: ImportPreviewResult
  onDownloadErrors?: () => void
}

export function ImportPreview({ preview, onDownloadErrors }: ImportPreviewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set([preview.files[0]?.filename]))
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleFile = (filename: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(filename)) {
        next.delete(filename)
      } else {
        next.add(filename)
      }
      return next
    })
  }

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Summary Bar */}
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '16px',
        backgroundColor: 'var(--color-background)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
          <span style={{ fontWeight: 500 }}>{preview.validEntities}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>valid</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
          <span style={{ fontWeight: 500 }}>{preview.warningEntities}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>warnings</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={20} style={{ color: 'var(--color-error)' }} />
          <span style={{ fontWeight: 500 }}>{preview.errorEntities}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>errors</span>
        </div>

        <div style={{ flex: 1 }} />

        {preview.errorEntities > 0 && onDownloadErrors && (
          <button
            onClick={onDownloadErrors}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px' }}
          >
            Download Error Report
          </button>
        )}
      </div>

      {/* Files Accordion */}
      {preview.files.map(file => (
        <FilePreview
          key={file.filename}
          file={file}
          isExpanded={expandedFiles.has(file.filename)}
          onToggle={() => toggleFile(file.filename)}
          expandedRows={expandedRows}
          onToggleRow={toggleRow}
        />
      ))}
    </div>
  )
}

interface FilePreviewProps {
  file: FileValidationResult
  isExpanded: boolean
  onToggle: () => void
  expandedRows: Set<string>
  onToggleRow: (key: string) => void
}

function FilePreview({ file, isExpanded, onToggle, expandedRows, onToggleRow }: FilePreviewProps) {
  const status = getValidationStatus(file)

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }}>
      {/* File Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <FileText size={18} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontWeight: 500, flex: 1 }}>{file.filename}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
          {file.entityType}
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: status === 'valid' ? 'rgba(34, 197, 94, 0.1)' :
                         status === 'warnings' ? 'rgba(234, 179, 8, 0.1)' :
                         'rgba(239, 68, 68, 0.1)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          fontWeight: 500,
          color: status === 'valid' ? 'var(--color-success)' :
                 status === 'warnings' ? 'var(--color-warning)' :
                 'var(--color-error)'
        }}>
          {status === 'valid' && <CheckCircle size={14} />}
          {status === 'warnings' && <AlertTriangle size={14} />}
          {status === 'errors' && <XCircle size={14} />}
          {file.totalRows} rows
        </div>
      </button>

      {/* File Content */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--color-border)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {file.globalIssues.length > 0 && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(234, 179, 8, 0.05)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              {file.globalIssues.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: issue.severity === 'error' ? 'var(--color-error)' :
                         issue.severity === 'warning' ? 'var(--color-warning)' :
                         'var(--color-text-muted)',
                  fontSize: '13px'
                }}>
                  {issue.severity === 'error' && <XCircle size={14} />}
                  {issue.severity === 'warning' && <AlertTriangle size={14} />}
                  {issue.message}
                </div>
              ))}
            </div>
          )}

          {/* Rows Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-background)' }}>
                <th style={{ width: '40px', padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>#</th>
                <th style={{ width: '40px', padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name/Key</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {file.rows.map((row, index) => (
                <RowPreview
                  key={index}
                  row={row}
                  isExpanded={expandedRows.has(`${file.filename}-${index}`)}
                  onToggle={() => onToggleRow(`${file.filename}-${index}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface RowPreviewProps {
  row: RowValidationResult
  isExpanded: boolean
  onToggle: () => void
}

function RowPreview({ row, isExpanded, onToggle }: RowPreviewProps) {
  const status = getRowStatus(row)
  const hasIssues = row.issues.length > 0

  // Get a display name from common fields
  const displayName = row.data.name || row.data.title || row.data.slug || row.data.code || `Row ${row.rowIndex + 1}`

  return (
    <>
      <tr
        onClick={hasIssues ? onToggle : undefined}
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: status === 'error' ? 'rgba(239, 68, 68, 0.03)' :
                          status === 'warning' ? 'rgba(234, 179, 8, 0.03)' :
                          'transparent',
          cursor: hasIssues ? 'pointer' : 'default'
        }}
      >
        <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {row.rowIndex + 1}
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
          {status === 'valid' && <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />}
          {status === 'warning' && <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />}
          {status === 'error' && <XCircle size={16} style={{ color: 'var(--color-error)' }} />}
        </td>
        <td style={{ padding: '10px 12px', fontSize: '13px' }}>
          {String(displayName)}
        </td>
        <td style={{ padding: '10px 12px' }}>
          {row.issues.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                color: status === 'error' ? 'var(--color-error)' : 'var(--color-warning)'
              }}>
                {row.issues.length} issue{row.issues.length > 1 ? 's' : ''}
              </span>
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>-</span>
          )}
        </td>
      </tr>

      {/* Expanded Issues */}
      {isExpanded && hasIssues && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <div style={{
              padding: '12px 16px 12px 68px',
              backgroundColor: 'var(--color-background)',
              borderTop: '1px dashed var(--color-border)'
            }}>
              {row.issues.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '8px 0',
                  borderBottom: i < row.issues.length - 1 ? '1px dashed var(--color-border)' : 'none'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px'
                  }}>
                    {issue.severity === 'error' && <XCircle size={14} style={{ color: 'var(--color-error)' }} />}
                    {issue.severity === 'warning' && <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />}
                    {issue.severity === 'info' && <CheckCircle size={14} style={{ color: 'var(--color-info)' }} />}
                    <span style={{
                      fontWeight: 500,
                      color: issue.severity === 'error' ? 'var(--color-error)' :
                             issue.severity === 'warning' ? 'var(--color-warning)' :
                             'var(--color-text-secondary)'
                    }}>
                      {issue.field}:
                    </span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {issue.message}
                    </span>
                  </div>
                  {issue.value !== undefined && issue.value !== '' && (
                    <div style={{
                      marginLeft: '22px',
                      fontSize: '12px',
                      color: 'var(--color-text-muted)'
                    }}>
                      Value: <code style={{
                        padding: '2px 4px',
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '2px'
                      }}>{String(issue.value)}</code>
                    </div>
                  )}
                  {issue.suggestion && (
                    <div style={{
                      marginLeft: '22px',
                      fontSize: '12px',
                      color: 'var(--color-info)'
                    }}>
                      {issue.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
