/**
 * Import Service
 * Orchestrates parsing, validation, preview, and commit for imports
 */

import JSZip from 'jszip'
import Papa from 'papaparse'
import type { EntityType } from './csvTemplates'
import { getTemplatesForEntity, getPrimaryTemplateForEntity } from './csvTemplates'
import type { FileValidationResult, ValidationContext } from './validators'
import { validateFile, createValidationContext } from './validators'

export interface ImportOptions {
  duplicateHandling: 'skip' | 'update' | 'error'
  missingReferenceHandling: 'create' | 'skip'
}

export interface ParsedFile {
  filename: string
  rows: Record<string, string>[]
  headers: string[]
}

export interface ImportPreviewResult {
  entityType: EntityType
  format: 'json' | 'csv'
  files: FileValidationResult[]
  totalEntities: number
  validEntities: number
  warningEntities: number
  errorEntities: number
  canImport: boolean
}

export interface ImportCommitResult {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: Array<{ entity: string; error: string }>
}

// ============================================
// File Parsing
// ============================================

/**
 * Parse a CSV string into rows
 */
export function parseCSV(csvContent: string): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        resolve({
          filename: '',
          rows: results.data as Record<string, string>[],
          headers: results.meta.fields || []
        })
      },
      error: (err: Error) => {
        reject(new Error(`CSV parsing error: ${err.message}`))
      }
    })
  })
}

/**
 * Parse a ZIP file containing CSVs
 */
export async function parseZipFile(file: File): Promise<ParsedFile[]> {
  const zip = await JSZip.loadAsync(file)
  const parsedFiles: ParsedFile[] = []

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (filename.endsWith('.csv') && !zipEntry.dir) {
      const content = await zipEntry.async('string')
      const parsed = await parseCSV(content)
      parsed.filename = filename
      parsedFiles.push(parsed)
    }
  }

  return parsedFiles
}

/**
 * Parse a JSON file
 */
export async function parseJSONFile(file: File): Promise<unknown> {
  const content = await file.text()
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error('Invalid JSON file')
  }
}

/**
 * Determine file type from file
 */
export function getFileType(file: File): 'json' | 'csv' | 'zip' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'json') return 'json'
  if (ext === 'csv') return 'csv'
  if (ext === 'zip') return 'zip'
  return 'unknown'
}

// ============================================
// Import Preview
// ============================================

/**
 * Generate import preview from uploaded files
 */
export async function generateImportPreview(
  file: File,
  entityType: EntityType,
  existingData: {
    products?: Array<{ slug: string; id?: string }>
    subproducts?: Array<{ slug?: string; id?: string }>
    platforms?: Array<{ code: string; id?: string }>
    industries?: Array<{ code: string; id?: string }>
  },
  options: ImportOptions
): Promise<ImportPreviewResult> {
  const fileType = getFileType(file)
  const templates = getTemplatesForEntity(entityType)
  const context = createValidationContext(existingData, options)

  if (fileType === 'json') {
    return await previewJSONImport(file, entityType, context)
  } else if (fileType === 'zip') {
    return await previewCSVZipImport(file, entityType, templates, context)
  } else if (fileType === 'csv') {
    return await previewSingleCSVImport(file, entityType, context)
  } else {
    throw new Error('Unsupported file type. Please upload a .json, .csv, or .zip file.')
  }
}

/**
 * Preview JSON import
 */
async function previewJSONImport(
  file: File,
  entityType: EntityType,
  context: ValidationContext
): Promise<ImportPreviewResult> {
  const data = await parseJSONFile(file) as Record<string, unknown>

  // Get the array of entities from the JSON
  let entities: unknown[] = []
  if (Array.isArray(data)) {
    entities = data
  } else if (data[entityType]) {
    entities = data[entityType] as unknown[]
  } else {
    // Try to find any array in the data
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value.length > 0) {
        entities = value
        break
      }
    }
  }

  // Convert to validation format
  const template = getPrimaryTemplateForEntity(entityType)
  const rows = entities.map(entity => {
    const row: Record<string, string> = {}
    for (const col of template.columns) {
      const value = (entity as Record<string, unknown>)[col.key]
      if (Array.isArray(value)) {
        row[col.key] = value.join('|')
      } else if (value !== null && value !== undefined) {
        row[col.key] = String(value)
      } else {
        row[col.key] = ''
      }
    }
    return row
  })

  const validationResult = validateFile(rows, template, context)

  return {
    entityType,
    format: 'json',
    files: [validationResult],
    totalEntities: entities.length,
    validEntities: validationResult.validRows,
    warningEntities: validationResult.warningRows,
    errorEntities: validationResult.errorRows,
    canImport: validationResult.errorRows === 0
  }
}

/**
 * Preview CSV ZIP import
 */
async function previewCSVZipImport(
  file: File,
  entityType: EntityType,
  templates: ReturnType<typeof getTemplatesForEntity>,
  context: ValidationContext
): Promise<ImportPreviewResult> {
  const parsedFiles = await parseZipFile(file)
  const validationResults: FileValidationResult[] = []

  // Match each CSV file to its template
  for (const parsedFile of parsedFiles) {
    const template = templates.find(t =>
      t.filename === parsedFile.filename ||
      t.filename.replace('.csv', '') === parsedFile.filename.replace('.csv', '')
    )

    if (template) {
      const result = validateFile(parsedFile.rows, template, context)
      result.filename = parsedFile.filename
      validationResults.push(result)

      // Update context with imported data for foreign key validation
      if (template.name === 'Products' || template.name === 'Platforms' || template.name === 'Industries') {
        const keyField = template.name === 'Products' ? 'slug' : 'code'
        for (const row of result.rows) {
          if (row.isValid) {
            const key = row.data[keyField] as string
            const mapKey = template.name.toLowerCase() as keyof typeof context.importedData
            context.importedData[mapKey]?.set(key, row.data)
          }
        }
      }
    }
  }

  // Calculate totals (use primary entity for counts)
  const primaryTemplate = getPrimaryTemplateForEntity(entityType)
  const primaryResult = validationResults.find(r =>
    r.entityType === primaryTemplate.name
  )

  return {
    entityType,
    format: 'csv',
    files: validationResults,
    totalEntities: primaryResult?.totalRows || 0,
    validEntities: primaryResult?.validRows || 0,
    warningEntities: primaryResult?.warningRows || 0,
    errorEntities: primaryResult?.errorRows || 0,
    canImport: validationResults.every(r => r.errorRows === 0)
  }
}

/**
 * Preview single CSV file import
 */
async function previewSingleCSVImport(
  file: File,
  entityType: EntityType,
  context: ValidationContext
): Promise<ImportPreviewResult> {
  const content = await file.text()
  const parsed = await parseCSV(content)
  parsed.filename = file.name

  const template = getPrimaryTemplateForEntity(entityType)
  const validationResult = validateFile(parsed.rows, template, context)
  validationResult.filename = file.name

  return {
    entityType,
    format: 'csv',
    files: [validationResult],
    totalEntities: parsed.rows.length,
    validEntities: validationResult.validRows,
    warningEntities: validationResult.warningRows,
    errorEntities: validationResult.errorRows,
    canImport: validationResult.errorRows === 0
  }
}

// ============================================
// Import Commit
// ============================================

/**
 * Transform validated data back to API format for products
 */
export function transformToProductsAPIFormat(
  validationResults: FileValidationResult[]
): Array<{
  name: string
  slug: string
  platforms: string[]
  notes: string | null
  ai_guidelines: string | null
  ai_prompt: string | null
}> {
  const productsResult = validationResults.find(r => r.entityType === 'Products')
  if (!productsResult) return []

  return productsResult.rows
    .filter(row => row.isValid)
    .map(row => ({
      name: row.data.name as string,
      slug: row.data.slug as string,
      platforms: row.data.platforms as string[] || [],
      notes: row.data.notes as string | null,
      ai_guidelines: row.data.ai_guidelines as string | null,
      ai_prompt: row.data.ai_prompt as string | null
    }))
}

/**
 * Transform validated data to platforms API format
 */
export function transformToPlatformsAPIFormat(
  validationResults: FileValidationResult[]
): Array<{
  name: string
  code: string
  category: string
  logo_url?: string
  is_active: boolean
}> {
  const platformsResult = validationResults.find(r => r.entityType === 'Platforms')
  if (!platformsResult) return []

  return platformsResult.rows
    .filter(row => row.isValid)
    .map(row => ({
      name: row.data.name as string,
      code: row.data.code as string,
      category: row.data.category as string,
      logo_url: row.data.logo_url as string | undefined,
      is_active: row.data.is_active as boolean ?? true
    }))
}

/**
 * Transform validated data to industries API format
 */
export function transformToIndustriesAPIFormat(
  validationResults: FileValidationResult[]
): Array<{
  name: string
  code: string
  description?: string
  icon?: string
  is_active: boolean
}> {
  const industriesResult = validationResults.find(r => r.entityType === 'Industries')
  if (!industriesResult) return []

  return industriesResult.rows
    .filter(row => row.isValid)
    .map(row => ({
      name: row.data.name as string,
      code: row.data.code as string,
      description: row.data.description as string | undefined,
      icon: row.data.icon as string | undefined,
      is_active: row.data.is_active as boolean ?? true
    }))
}

/**
 * Commit import to database
 * This is a placeholder - actual implementation depends on available API endpoints
 */
export async function commitImport(
  preview: ImportPreviewResult,
  _options: ImportOptions,
  callbacks: {
    onProgress?: (current: number, total: number, message: string) => void
    createProduct?: (data: unknown) => Promise<{ id: string }>
    createPlatform?: (data: unknown) => Promise<{ id: string }>
    createIndustry?: (data: unknown) => Promise<{ id: string }>
    updateProduct?: (id: string, data: unknown) => Promise<void>
    updatePlatform?: (id: string, data: unknown) => Promise<void>
    updateIndustry?: (id: string, data: unknown) => Promise<void>
  }
): Promise<ImportCommitResult> {
  const result: ImportCommitResult = {
    success: true,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  try {
    switch (preview.entityType) {
      case 'products': {
        const products = transformToProductsAPIFormat(preview.files)
        const total = products.length
        let current = 0

        for (const product of products) {
          current++
          callbacks.onProgress?.(current, total, `Importing product: ${product.name}`)

          try {
            if (callbacks.createProduct) {
              await callbacks.createProduct(product)
              result.created++
            }
          } catch (error) {
            result.errors.push({
              entity: product.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
        break
      }

      case 'platforms': {
        const platforms = transformToPlatformsAPIFormat(preview.files)
        const total = platforms.length
        let current = 0

        for (const platform of platforms) {
          current++
          callbacks.onProgress?.(current, total, `Importing platform: ${platform.name}`)

          try {
            if (callbacks.createPlatform) {
              await callbacks.createPlatform(platform)
              result.created++
            }
          } catch (error) {
            result.errors.push({
              entity: platform.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
        break
      }

      case 'industries': {
        const industries = transformToIndustriesAPIFormat(preview.files)
        const total = industries.length
        let current = 0

        for (const industry of industries) {
          current++
          callbacks.onProgress?.(current, total, `Importing industry: ${industry.name}`)

          try {
            if (callbacks.createIndustry) {
              await callbacks.createIndustry(industry)
              result.created++
            }
          } catch (error) {
            result.errors.push({
              entity: industry.name,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
        break
      }
    }

    result.success = result.errors.length === 0
  } catch (error) {
    result.success = false
    result.errors.push({
      entity: 'Import',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  return result
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate error report as downloadable CSV
 */
export function generateErrorReport(preview: ImportPreviewResult): string {
  const rows: string[] = ['File,Row,Field,Severity,Message,Value']

  for (const file of preview.files) {
    for (const row of file.rows) {
      for (const issue of row.issues) {
        rows.push([
          file.filename,
          (row.rowIndex + 1).toString(),
          issue.field,
          issue.severity,
          `"${issue.message.replace(/"/g, '""')}"`,
          `"${String(issue.value || '').replace(/"/g, '""')}"`
        ].join(','))
      }
    }
  }

  return rows.join('\n')
}

/**
 * Download error report
 */
export function downloadErrorReport(preview: ImportPreviewResult): void {
  const content = generateErrorReport(preview)
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
