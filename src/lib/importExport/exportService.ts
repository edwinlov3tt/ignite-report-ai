/**
 * Export Service
 * Generates JSON and CSV ZIP bundles for export
 */

import JSZip from 'jszip'
import type { Product } from '@/lib/schemaApi'
import type { Platform, Industry } from '@/types/admin'
import type { EntityType } from './csvTemplates'
import { getTemplatesForEntity, generateEmptyTemplate } from './csvTemplates'
import {
  transformProductsToCSV,
  transformPlatformsToCSV,
  transformIndustriesToCSV
} from './transformers'

export interface ExportOptions {
  format: 'json' | 'csv'
  includeNested: boolean
  activeOnly: boolean
}

export interface ExportResult {
  filename: string
  blob: Blob
  mimeType: string
}

// ============================================
// JSON Export
// ============================================

/**
 * Export products as JSON
 */
export function exportProductsAsJSON(
  products: Product[],
  options: ExportOptions
): ExportResult {
  let data = products

  if (options.activeOnly) {
    // Products don't have is_active in current schema, but we can filter subproducts
    // For now, export all products
  }

  if (!options.includeNested) {
    data = products.map(p => ({
      ...p,
      subproducts: [],
      lumina_extractors: [],
      benchmarks: []
    }))
  }

  const exportData = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    entity_type: 'products',
    products: data
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const filename = `products_export_${formatDate(new Date())}.json`

  return { filename, blob, mimeType: 'application/json' }
}

/**
 * Export platforms as JSON
 */
export function exportPlatformsAsJSON(
  platforms: Platform[],
  options: ExportOptions
): ExportResult {
  let data = platforms

  if (options.activeOnly) {
    data = platforms.filter(p => p.is_active)
  }

  if (!options.includeNested) {
    data = data.map(p => ({
      ...p,
      quirks: [],
      kpis: [],
      thresholds: [],
      buyer_notes: []
    }))
  }

  const exportData = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    entity_type: 'platforms',
    platforms: data
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const filename = `platforms_export_${formatDate(new Date())}.json`

  return { filename, blob, mimeType: 'application/json' }
}

/**
 * Export industries as JSON
 */
export function exportIndustriesAsJSON(
  industries: Industry[],
  options: ExportOptions
): ExportResult {
  let data = industries

  if (options.activeOnly) {
    data = industries.filter(i => i.is_active)
  }

  if (!options.includeNested) {
    data = data.map(i => ({
      ...i,
      benchmarks: [],
      insights: [],
      seasonality: []
    }))
  }

  const exportData = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    entity_type: 'industries',
    industries: data
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const filename = `industries_export_${formatDate(new Date())}.json`

  return { filename, blob, mimeType: 'application/json' }
}

// ============================================
// CSV ZIP Export
// ============================================

/**
 * Export products as CSV ZIP bundle
 */
export async function exportProductsAsCSV(
  products: Product[],
  options: ExportOptions
): Promise<ExportResult> {
  const zip = new JSZip()

  const csvFiles = transformProductsToCSV(products)

  zip.file('products.csv', csvFiles.products)

  if (options.includeNested) {
    zip.file('subproducts.csv', csvFiles.subproducts)
    zip.file('tactic_types.csv', csvFiles.tactic_types)
    zip.file('lumina_extractors.csv', csvFiles.lumina_extractors)
    zip.file('product_benchmarks.csv', csvFiles.product_benchmarks)
  }

  // Add README
  zip.file('README.txt', generateReadme('products'))

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `products_export_${formatDate(new Date())}.zip`

  return { filename, blob, mimeType: 'application/zip' }
}

/**
 * Export platforms as CSV ZIP bundle
 */
export async function exportPlatformsAsCSV(
  platforms: Platform[],
  options: ExportOptions
): Promise<ExportResult> {
  let data = platforms

  if (options.activeOnly) {
    data = platforms.filter(p => p.is_active)
  }

  const zip = new JSZip()

  const csvFiles = transformPlatformsToCSV(data)

  zip.file('platforms.csv', csvFiles.platforms)

  if (options.includeNested) {
    zip.file('platform_quirks.csv', csvFiles.platform_quirks)
    zip.file('platform_kpis.csv', csvFiles.platform_kpis)
    zip.file('platform_thresholds.csv', csvFiles.platform_thresholds)
    zip.file('platform_buyer_notes.csv', csvFiles.platform_buyer_notes)
  }

  // Add README
  zip.file('README.txt', generateReadme('platforms'))

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `platforms_export_${formatDate(new Date())}.zip`

  return { filename, blob, mimeType: 'application/zip' }
}

/**
 * Export industries as CSV ZIP bundle
 */
export async function exportIndustriesAsCSV(
  industries: Industry[],
  options: ExportOptions
): Promise<ExportResult> {
  let data = industries

  if (options.activeOnly) {
    data = industries.filter(i => i.is_active)
  }

  const zip = new JSZip()

  const csvFiles = transformIndustriesToCSV(data)

  zip.file('industries.csv', csvFiles.industries)

  if (options.includeNested) {
    zip.file('industry_benchmarks.csv', csvFiles.industry_benchmarks)
    zip.file('industry_insights.csv', csvFiles.industry_insights)
    zip.file('industry_seasonality.csv', csvFiles.industry_seasonality)
  }

  // Add README
  zip.file('README.txt', generateReadme('industries'))

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `industries_export_${formatDate(new Date())}.zip`

  return { filename, blob, mimeType: 'application/zip' }
}

// ============================================
// Unified Export Function
// ============================================

export async function exportData(
  entityType: EntityType,
  data: Product[] | Platform[] | Industry[],
  options: ExportOptions
): Promise<ExportResult> {
  if (options.format === 'json') {
    switch (entityType) {
      case 'products':
        return exportProductsAsJSON(data as Product[], options)
      case 'platforms':
        return exportPlatformsAsJSON(data as Platform[], options)
      case 'industries':
        return exportIndustriesAsJSON(data as Industry[], options)
    }
  } else {
    switch (entityType) {
      case 'products':
        return await exportProductsAsCSV(data as Product[], options)
      case 'platforms':
        return await exportPlatformsAsCSV(data as Platform[], options)
      case 'industries':
        return await exportIndustriesAsCSV(data as Industry[], options)
    }
  }
}

// ============================================
// Template Generation
// ============================================

/**
 * Generate empty CSV templates for download
 */
export async function generateTemplateBundle(entityType: EntityType): Promise<ExportResult> {
  const zip = new JSZip()
  const templates = getTemplatesForEntity(entityType)

  for (const template of templates) {
    const csvContent = generateEmptyTemplate(template)
    zip.file(template.filename, csvContent)
  }

  // Add README with column descriptions
  zip.file('README.txt', generateTemplateReadme(entityType))

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = `${entityType}_templates.zip`

  return { filename, blob, mimeType: 'application/zip' }
}

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function generateReadme(entityType: string): string {
  return `${entityType.toUpperCase()} EXPORT
=================

Generated: ${new Date().toISOString()}

This ZIP bundle contains CSV files for importing/exporting ${entityType} data.

FILE RELATIONSHIPS
------------------
${getRelationshipDescription(entityType)}

ARRAY VALUES
------------
Arrays are stored as pipe-delimited (|) values.
Example: "Google Search|YouTube|Display"

To include a literal pipe character in content, escape it with backslash: \\|

BOOLEAN VALUES
--------------
Use: true, false, 1, 0, yes, no

IMPORTING
---------
1. Edit the CSV files as needed (use Excel, Google Sheets, or any text editor)
2. Re-ZIP all files maintaining the same filenames
3. Upload to Schema Admin > Import/Export > Import

For more information, visit the Schema Admin documentation.
`
}

function generateTemplateReadme(entityType: EntityType): string {
  const templates = getTemplatesForEntity(entityType)

  let columnDescriptions = ''
  for (const template of templates) {
    columnDescriptions += `\n${template.name} (${template.filename})\n`
    columnDescriptions += '-'.repeat(40) + '\n'
    for (const col of template.columns) {
      const required = col.required ? ' [REQUIRED]' : ''
      const enumVals = col.enumValues ? ` (${col.enumValues.join(', ')})` : ''
      const desc = col.description ? ` - ${col.description}` : ''
      const fk = col.foreignKey ? ` (references ${col.foreignKey.entity}.${col.foreignKey.field})` : ''
      columnDescriptions += `  ${col.header}${required}${enumVals}${desc}${fk}\n`
    }
  }

  return `${entityType.toUpperCase()} CSV TEMPLATES
=======================

These are empty templates for importing ${entityType} data.

INSTRUCTIONS
------------
1. Fill in the CSV files with your data
2. ZIP all CSV files together
3. Upload to Schema Admin > Import/Export > Import

ARRAY VALUES
------------
Use pipe (|) to separate multiple values.
Example: platforms column -> "Google Search|YouTube|Display"

${columnDescriptions}
`
}

function getRelationshipDescription(entityType: string): string {
  switch (entityType) {
    case 'products':
      return `products.csv -> Main products
subproducts.csv -> References products via product_slug
tactic_types.csv -> References subproducts via subproduct_slug
lumina_extractors.csv -> References products via product_slug
product_benchmarks.csv -> References products via product_slug`

    case 'platforms':
      return `platforms.csv -> Main platforms
platform_quirks.csv -> References platforms via platform_code
platform_kpis.csv -> References platforms via platform_code
platform_thresholds.csv -> References platforms via platform_code
platform_buyer_notes.csv -> References platforms via platform_code`

    case 'industries':
      return `industries.csv -> Main industries
industry_benchmarks.csv -> References industries via industry_code
industry_insights.csv -> References industries via industry_code
industry_seasonality.csv -> References industries via industry_code`

    default:
      return ''
  }
}

/**
 * Trigger file download in browser
 */
export function downloadFile(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
