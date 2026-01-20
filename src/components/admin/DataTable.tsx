import type { ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Column<T> {
  id: string
  header: string
  accessor: keyof T | ((row: T) => ReactNode)
  width?: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (columnId: string) => void
  actions?: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No data available',
  sortColumn,
  sortDirection,
  onSort,
  actions
}: DataTableProps<T>) {
  const getCellValue = (row: T, accessor: Column<T>['accessor']): ReactNode => {
    if (typeof accessor === 'function') {
      return accessor(row)
    }
    const value = row[accessor]
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              {columns.map(col => (
                <th
                  key={col.id}
                  onClick={() => col.sortable && onSort?.(col.id)}
                  style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: col.sortable ? 'pointer' : 'default',
                    width: col.width,
                    userSelect: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start'
                  }}>
                    {col.header}
                    {col.sortable && sortColumn === col.id && (
                      sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th style={{
                  padding: '12px 16px',
                  width: '60px'
                }} />
              )}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  style={{
                    padding: '40px 16px',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)'
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    borderBottom: index < data.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = 'var(--color-surface-secondary)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {columns.map(col => (
                    <td
                      key={col.id}
                      style={{
                        padding: '14px 16px',
                        textAlign: col.align || 'left',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {getCellValue(row, col.accessor)}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Pagination component to pair with DataTable
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 0',
      fontSize: '14px',
      color: 'var(--color-text-secondary)'
    }}>
      <span>
        Showing {startItem}-{endItem} of {totalItems}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-secondary"
          style={{ padding: '8px 16px', minWidth: 'auto' }}
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-secondary"
          style={{ padding: '8px 16px', minWidth: 'auto' }}
        >
          Next
        </button>
      </div>
    </div>
  )
}
