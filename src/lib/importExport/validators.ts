/**
 * Validation Rules for Import/Export
 * Validates imported data against schema requirements
 */

import type { ColumnDefinition, EntityTemplate } from './csvTemplates'
import { ARRAY_DELIMITER } from './csvTemplates'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  severity: ValidationSeverity
  field: string
  message: string
  value?: unknown
  suggestion?: string
}

export interface RowValidationResult {
  rowIndex: number
  isValid: boolean
  issues: ValidationIssue[]
  data: Record<string, unknown>
}

export interface FileValidationResult {
  filename: string
  entityType: string
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  rows: RowValidationResult[]
  globalIssues: ValidationIssue[]
}

export interface ValidationContext {
  existingData: {
    products?: Map<string, unknown>
    subproducts?: Map<string, unknown>
    platforms?: Map<string, unknown>
    industries?: Map<string, unknown>
  }
  importedData: {
    products?: Map<string, unknown>
    subproducts?: Map<string, unknown>
    platforms?: Map<string, unknown>
    industries?: Map<string, unknown>
  }
  duplicateHandling: 'skip' | 'update' | 'error'
  missingReferenceHandling: 'create' | 'skip'
}

/**
 * Parse array value from CSV string
 */
export function parseArrayValue(value: string | undefined | null): string[] {
  if (!value || value.trim() === '') return []
  // Handle escaped pipes by temporarily replacing them
  const escaped = value.replace(/\\\|/g, '\x00')
  const parts = escaped.split(ARRAY_DELIMITER).map(s => s.replace(/\x00/g, '|').trim())
  return parts.filter(s => s.length > 0)
}

/**
 * Parse boolean value from CSV string
 */
export function parseBooleanValue(value: string | undefined | null): boolean {
  if (!value) return false
  const lower = value.toString().toLowerCase().trim()
  return lower === 'true' || lower === '1' || lower === 'yes'
}

/**
 * Parse number value from CSV string
 */
export function parseNumberValue(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

/**
 * Validate a single field value against its column definition
 */
export function validateField(
  value: unknown,
  column: ColumnDefinition,
  _rowIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const stringValue = value?.toString()?.trim() || ''

  // Check required fields
  if (column.required && (!value || stringValue === '')) {
    issues.push({
      severity: 'error',
      field: column.key,
      message: `${column.header} is required`,
      value
    })
    return issues
  }

  // Skip validation if empty and not required
  if (!value || stringValue === '') {
    return issues
  }

  // Type-specific validation
  switch (column.type) {
    case 'number': {
      const num = parseNumberValue(stringValue)
      if (num === null) {
        issues.push({
          severity: 'error',
          field: column.key,
          message: `${column.header} must be a valid number`,
          value,
          suggestion: 'Enter a numeric value like 1.5 or 100'
        })
      }
      break
    }

    case 'boolean': {
      const lower = stringValue.toLowerCase()
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        issues.push({
          severity: 'warning',
          field: column.key,
          message: `${column.header} should be true/false`,
          value,
          suggestion: 'Use true, false, 1, or 0'
        })
      }
      break
    }

    case 'enum': {
      if (column.enumValues && !column.enumValues.includes(stringValue)) {
        issues.push({
          severity: 'error',
          field: column.key,
          message: `${column.header} must be one of: ${column.enumValues.join(', ')}`,
          value,
          suggestion: `Valid values: ${column.enumValues.join(', ')}`
        })
      }
      break
    }

    case 'array': {
      // Arrays are generally flexible, but we can warn about empty values
      const parts = parseArrayValue(stringValue)
      if (parts.length === 0 && column.required) {
        issues.push({
          severity: 'warning',
          field: column.key,
          message: `${column.header} appears to be empty`,
          value
        })
      }
      break
    }

    case 'string': {
      // String validation - check for potentially problematic characters
      if (stringValue.includes('\n') || stringValue.includes('\r')) {
        issues.push({
          severity: 'warning',
          field: column.key,
          message: `${column.header} contains newline characters`,
          value: stringValue.substring(0, 50) + '...',
          suggestion: 'Newlines may cause issues in CSV format'
        })
      }
      break
    }
  }

  return issues
}

/**
 * Validate a single row against a template
 */
export function validateRow(
  row: Record<string, string>,
  template: EntityTemplate,
  rowIndex: number,
  context?: ValidationContext
): RowValidationResult {
  const issues: ValidationIssue[] = []
  const parsedData: Record<string, unknown> = {}

  // Validate each column
  for (const column of template.columns) {
    const rawValue = row[column.key] || row[column.header]
    const fieldIssues = validateField(rawValue, column, rowIndex)
    issues.push(...fieldIssues)

    // Parse and store the value
    switch (column.type) {
      case 'number':
        parsedData[column.key] = parseNumberValue(rawValue)
        break
      case 'boolean':
        parsedData[column.key] = parseBooleanValue(rawValue)
        break
      case 'array':
        parsedData[column.key] = parseArrayValue(rawValue)
        break
      default:
        parsedData[column.key] = rawValue?.trim() || null
    }
  }

  // Validate foreign key references if context provided
  if (context) {
    for (const column of template.columns) {
      if (column.foreignKey && parsedData[column.key]) {
        const refValue = parsedData[column.key] as string
        const entityMap = context.existingData[column.foreignKey.entity as keyof typeof context.existingData]
        const importedMap = context.importedData[column.foreignKey.entity as keyof typeof context.importedData]

        const existsInExisting = entityMap?.has(refValue)
        const existsInImported = importedMap?.has(refValue)

        if (!existsInExisting && !existsInImported) {
          if (context.missingReferenceHandling === 'skip') {
            issues.push({
              severity: 'warning',
              field: column.key,
              message: `Referenced ${column.foreignKey.entity} "${refValue}" not found - row will be skipped`,
              value: refValue
            })
          } else {
            issues.push({
              severity: 'info',
              field: column.key,
              message: `Referenced ${column.foreignKey.entity} "${refValue}" will be created as placeholder`,
              value: refValue
            })
          }
        }
      }
    }
  }

  const hasErrors = issues.some(i => i.severity === 'error')

  return {
    rowIndex,
    isValid: !hasErrors,
    issues,
    data: parsedData
  }
}

/**
 * Validate an entire parsed CSV file
 */
export function validateFile(
  rows: Record<string, string>[],
  template: EntityTemplate,
  context?: ValidationContext
): FileValidationResult {
  const globalIssues: ValidationIssue[] = []
  const rowResults: RowValidationResult[] = []

  // Check if file has any data
  if (rows.length === 0) {
    globalIssues.push({
      severity: 'warning',
      field: '_file',
      message: 'File contains no data rows'
    })
  }

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], template, i, context)
    rowResults.push(result)
  }

  // Check for duplicates within the file
  const keyColumn = template.columns.find(c => c.key === 'slug' || c.key === 'code')
  if (keyColumn) {
    const seenKeys = new Map<string, number>()
    for (const result of rowResults) {
      const keyValue = result.data[keyColumn.key] as string
      if (keyValue) {
        const prevIndex = seenKeys.get(keyValue)
        if (prevIndex !== undefined) {
          result.issues.push({
            severity: 'warning',
            field: keyColumn.key,
            message: `Duplicate ${keyColumn.key} "${keyValue}" found (first seen at row ${prevIndex + 1})`,
            value: keyValue
          })
        } else {
          seenKeys.set(keyValue, result.rowIndex)
        }
      }
    }
  }

  // Calculate summary
  let validRows = 0
  let warningRows = 0
  let errorRows = 0

  for (const result of rowResults) {
    const hasErrors = result.issues.some(i => i.severity === 'error')
    const hasWarnings = result.issues.some(i => i.severity === 'warning')

    if (hasErrors) {
      errorRows++
    } else if (hasWarnings) {
      warningRows++
    } else {
      validRows++
    }
  }

  return {
    filename: template.filename,
    entityType: template.name,
    totalRows: rows.length,
    validRows,
    warningRows,
    errorRows,
    rows: rowResults,
    globalIssues
  }
}

/**
 * Create validation context from existing data
 */
export function createValidationContext(
  existingData: {
    products?: Array<{ slug: string; id?: string }>
    subproducts?: Array<{ slug?: string; id?: string }>
    platforms?: Array<{ code: string; id?: string }>
    industries?: Array<{ code: string; id?: string }>
  },
  options: {
    duplicateHandling: 'skip' | 'update' | 'error'
    missingReferenceHandling: 'create' | 'skip'
  }
): ValidationContext {
  return {
    existingData: {
      products: new Map(existingData.products?.map(p => [p.slug, p]) || []),
      subproducts: new Map(existingData.subproducts?.filter(s => s.slug).map(s => [s.slug!, s]) || []),
      platforms: new Map(existingData.platforms?.map(p => [p.code, p]) || []),
      industries: new Map(existingData.industries?.map(i => [i.code, i]) || [])
    },
    importedData: {
      products: new Map(),
      subproducts: new Map(),
      platforms: new Map(),
      industries: new Map()
    },
    duplicateHandling: options.duplicateHandling,
    missingReferenceHandling: options.missingReferenceHandling
  }
}

/**
 * Get overall status for a validation result
 */
export function getValidationStatus(result: FileValidationResult): 'valid' | 'warnings' | 'errors' {
  if (result.errorRows > 0) return 'errors'
  if (result.warningRows > 0) return 'warnings'
  return 'valid'
}

/**
 * Get row status based on its issues
 */
export function getRowStatus(row: RowValidationResult): 'valid' | 'warning' | 'error' {
  if (row.issues.some(i => i.severity === 'error')) return 'error'
  if (row.issues.some(i => i.severity === 'warning')) return 'warning'
  return 'valid'
}
