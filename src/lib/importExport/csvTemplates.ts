/**
 * CSV Column Templates for Import/Export
 * Defines the column structure for each entity type
 */

export interface ColumnDefinition {
  key: string
  header: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array' | 'enum'
  enumValues?: string[]
  description?: string
  foreignKey?: {
    entity: string
    field: string
  }
}

export interface EntityTemplate {
  name: string
  filename: string
  columns: ColumnDefinition[]
}

// ============================================
// Products Bundle Templates
// ============================================

export const productsTemplate: EntityTemplate = {
  name: 'Products',
  filename: 'products.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'number', description: 'Auto-generated if not provided' },
    { key: 'name', header: 'name', required: true, type: 'string', description: 'Product name' },
    { key: 'slug', header: 'slug', required: true, type: 'string', description: 'URL-friendly identifier' },
    { key: 'platforms', header: 'platforms', required: false, type: 'array', description: 'Pipe-delimited list of platforms' },
    { key: 'notes', header: 'notes', required: false, type: 'string', description: 'Additional notes' },
    { key: 'ai_guidelines', header: 'ai_guidelines', required: false, type: 'string', description: 'AI analysis guidelines' },
    { key: 'ai_prompt', header: 'ai_prompt', required: false, type: 'string', description: 'Custom AI prompt' }
  ]
}

export const subProductsTemplate: EntityTemplate = {
  name: 'SubProducts',
  filename: 'subproducts.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'number' },
    { key: 'product_slug', header: 'product_slug', required: true, type: 'string', foreignKey: { entity: 'products', field: 'slug' } },
    { key: 'name', header: 'name', required: true, type: 'string' },
    { key: 'slug', header: 'slug', required: true, type: 'string' },
    { key: 'platforms', header: 'platforms', required: false, type: 'array' },
    { key: 'notes', header: 'notes', required: false, type: 'string' }
  ]
}

export const tacticTypesTemplate: EntityTemplate = {
  name: 'TacticTypes',
  filename: 'tactic_types.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'number' },
    { key: 'subproduct_slug', header: 'subproduct_slug', required: true, type: 'string', foreignKey: { entity: 'subproducts', field: 'slug' } },
    { key: 'name', header: 'name', required: true, type: 'string' },
    { key: 'slug', header: 'slug', required: true, type: 'string' },
    { key: 'data_value', header: 'data_value', required: true, type: 'string' },
    { key: 'filename_stem', header: 'filename_stem', required: true, type: 'string' },
    { key: 'expected_filenames', header: 'expected_filenames', required: false, type: 'array' },
    { key: 'aliases', header: 'aliases', required: false, type: 'array' },
    { key: 'headers', header: 'headers', required: false, type: 'array' }
  ]
}

export const luminaExtractorsTemplate: EntityTemplate = {
  name: 'LuminaExtractors',
  filename: 'lumina_extractors.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'number' },
    { key: 'product_slug', header: 'product_slug', required: true, type: 'string', foreignKey: { entity: 'products', field: 'slug' } },
    { key: 'name', header: 'name', required: true, type: 'string' },
    { key: 'path', header: 'path', required: true, type: 'string' },
    { key: 'when_conditions', header: 'when_conditions', required: false, type: 'string', description: 'JSON string' },
    { key: 'aggregate_type', header: 'aggregate_type', required: false, type: 'enum', enumValues: ['first', 'unique', 'sum', 'join'] }
  ]
}

export const productBenchmarksTemplate: EntityTemplate = {
  name: 'ProductBenchmarks',
  filename: 'product_benchmarks.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'number' },
    { key: 'product_slug', header: 'product_slug', required: true, type: 'string', foreignKey: { entity: 'products', field: 'slug' } },
    { key: 'metric_name', header: 'metric_name', required: true, type: 'string' },
    { key: 'goal_value', header: 'goal_value', required: true, type: 'number' },
    { key: 'warning_threshold', header: 'warning_threshold', required: true, type: 'number' },
    { key: 'unit', header: 'unit', required: true, type: 'enum', enumValues: ['percentage', 'ratio', 'USD', 'count', 'seconds'] },
    { key: 'direction', header: 'direction', required: true, type: 'enum', enumValues: ['higher_better', 'lower_better'] }
  ]
}

// ============================================
// Platforms Bundle Templates
// ============================================

export const platformsTemplate: EntityTemplate = {
  name: 'Platforms',
  filename: 'platforms.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'name', header: 'name', required: true, type: 'string' },
    { key: 'code', header: 'code', required: true, type: 'string', description: 'Unique identifier code' },
    { key: 'category', header: 'category', required: true, type: 'enum', enumValues: ['social', 'search', 'display', 'video', 'programmatic', 'other'] },
    { key: 'logo_url', header: 'logo_url', required: false, type: 'string' },
    { key: 'is_active', header: 'is_active', required: false, type: 'boolean' }
  ]
}

export const platformQuirksTemplate: EntityTemplate = {
  name: 'PlatformQuirks',
  filename: 'platform_quirks.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'platform_code', header: 'platform_code', required: true, type: 'string', foreignKey: { entity: 'platforms', field: 'code' } },
    { key: 'quirk_type', header: 'quirk_type', required: true, type: 'enum', enumValues: ['attribution', 'targeting', 'bidding', 'reporting', 'creative', 'other'] },
    { key: 'title', header: 'title', required: true, type: 'string' },
    { key: 'description', header: 'description', required: true, type: 'string' },
    { key: 'impact', header: 'impact', required: true, type: 'enum', enumValues: ['high', 'medium', 'low'] },
    { key: 'ai_instruction', header: 'ai_instruction', required: false, type: 'string' },
    { key: 'applies_to_tactics', header: 'applies_to_tactics', required: false, type: 'array' },
    { key: 'source', header: 'source', required: false, type: 'string' },
    { key: 'contributed_by', header: 'contributed_by', required: false, type: 'string' },
    { key: 'is_active', header: 'is_active', required: false, type: 'boolean' }
  ]
}

export const platformKPIsTemplate: EntityTemplate = {
  name: 'PlatformKPIs',
  filename: 'platform_kpis.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'platform_code', header: 'platform_code', required: true, type: 'string', foreignKey: { entity: 'platforms', field: 'code' } },
    { key: 'objective', header: 'objective', required: true, type: 'string' },
    { key: 'primary_kpis', header: 'primary_kpis', required: true, type: 'array' },
    { key: 'secondary_kpis', header: 'secondary_kpis', required: false, type: 'array' },
    { key: 'notes', header: 'notes', required: false, type: 'string' }
  ]
}

export const platformThresholdsTemplate: EntityTemplate = {
  name: 'PlatformThresholds',
  filename: 'platform_thresholds.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'platform_code', header: 'platform_code', required: true, type: 'string', foreignKey: { entity: 'platforms', field: 'code' } },
    { key: 'metric', header: 'metric', required: true, type: 'string' },
    { key: 'warning_value', header: 'warning_value', required: true, type: 'number' },
    { key: 'critical_value', header: 'critical_value', required: true, type: 'number' },
    { key: 'direction', header: 'direction', required: true, type: 'enum', enumValues: ['above', 'below'] },
    { key: 'context', header: 'context', required: false, type: 'string' },
    { key: 'tactic_id', header: 'tactic_id', required: false, type: 'string' }
  ]
}

export const platformBuyerNotesTemplate: EntityTemplate = {
  name: 'PlatformBuyerNotes',
  filename: 'platform_buyer_notes.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'platform_code', header: 'platform_code', required: true, type: 'string', foreignKey: { entity: 'platforms', field: 'code' } },
    { key: 'note_type', header: 'note_type', required: true, type: 'enum', enumValues: ['tip', 'warning', 'gotcha', 'best_practice'] },
    { key: 'content', header: 'content', required: true, type: 'string' },
    { key: 'tactic_id', header: 'tactic_id', required: false, type: 'string' },
    { key: 'contributed_by', header: 'contributed_by', required: true, type: 'string' },
    { key: 'upvotes', header: 'upvotes', required: false, type: 'number' },
    { key: 'is_verified', header: 'is_verified', required: false, type: 'boolean' },
    { key: 'verified_by', header: 'verified_by', required: false, type: 'string' }
  ]
}

// ============================================
// Industries Bundle Templates
// ============================================

export const industriesTemplate: EntityTemplate = {
  name: 'Industries',
  filename: 'industries.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'name', header: 'name', required: true, type: 'string' },
    { key: 'code', header: 'code', required: true, type: 'string', description: 'Unique identifier code' },
    { key: 'description', header: 'description', required: false, type: 'string' },
    { key: 'icon', header: 'icon', required: false, type: 'string' },
    { key: 'is_active', header: 'is_active', required: false, type: 'boolean' }
  ]
}

export const industryBenchmarksTemplate: EntityTemplate = {
  name: 'IndustryBenchmarks',
  filename: 'industry_benchmarks.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'industry_code', header: 'industry_code', required: true, type: 'string', foreignKey: { entity: 'industries', field: 'code' } },
    { key: 'platform_id', header: 'platform_id', required: false, type: 'string' },
    { key: 'tactic_id', header: 'tactic_id', required: false, type: 'string' },
    { key: 'metric', header: 'metric', required: true, type: 'string' },
    { key: 'p25', header: 'p25', required: false, type: 'number' },
    { key: 'p50', header: 'p50', required: true, type: 'number' },
    { key: 'p75', header: 'p75', required: false, type: 'number' },
    { key: 'sample_size', header: 'sample_size', required: false, type: 'number' },
    { key: 'confidence', header: 'confidence', required: false, type: 'number' },
    { key: 'quarter', header: 'quarter', required: true, type: 'string' },
    { key: 'source', header: 'source', required: false, type: 'string' },
    { key: 'notes', header: 'notes', required: false, type: 'string' }
  ]
}

export const industryInsightsTemplate: EntityTemplate = {
  name: 'IndustryInsights',
  filename: 'industry_insights.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'industry_code', header: 'industry_code', required: true, type: 'string', foreignKey: { entity: 'industries', field: 'code' } },
    { key: 'insight_type', header: 'insight_type', required: true, type: 'enum', enumValues: ['trend', 'strategy', 'audience', 'creative', 'budget', 'other'] },
    { key: 'title', header: 'title', required: true, type: 'string' },
    { key: 'content', header: 'content', required: true, type: 'string' },
    { key: 'ai_instruction', header: 'ai_instruction', required: false, type: 'string' },
    { key: 'source', header: 'source', required: false, type: 'string' },
    { key: 'source_url', header: 'source_url', required: false, type: 'string' },
    { key: 'valid_from', header: 'valid_from', required: false, type: 'string' },
    { key: 'valid_until', header: 'valid_until', required: false, type: 'string' }
  ]
}

export const industrySeasonalityTemplate: EntityTemplate = {
  name: 'IndustrySeasonality',
  filename: 'industry_seasonality.csv',
  columns: [
    { key: 'id', header: 'id', required: false, type: 'string' },
    { key: 'industry_code', header: 'industry_code', required: true, type: 'string', foreignKey: { entity: 'industries', field: 'code' } },
    { key: 'period_type', header: 'period_type', required: true, type: 'enum', enumValues: ['month', 'quarter', 'holiday', 'event'] },
    { key: 'period_value', header: 'period_value', required: true, type: 'string' },
    { key: 'impact', header: 'impact', required: true, type: 'enum', enumValues: ['high', 'medium', 'low'] },
    { key: 'cpm_modifier', header: 'cpm_modifier', required: false, type: 'number' },
    { key: 'description', header: 'description', required: false, type: 'string' }
  ]
}

// ============================================
// Entity Bundles
// ============================================

export const productsBundleTemplates = [
  productsTemplate,
  subProductsTemplate,
  tacticTypesTemplate,
  luminaExtractorsTemplate,
  productBenchmarksTemplate
]

export const platformsBundleTemplates = [
  platformsTemplate,
  platformQuirksTemplate,
  platformKPIsTemplate,
  platformThresholdsTemplate,
  platformBuyerNotesTemplate
]

export const industriesBundleTemplates = [
  industriesTemplate,
  industryBenchmarksTemplate,
  industryInsightsTemplate,
  industrySeasonalityTemplate
]

export type EntityType = 'products' | 'platforms' | 'industries'

export function getTemplatesForEntity(entityType: EntityType): EntityTemplate[] {
  switch (entityType) {
    case 'products':
      return productsBundleTemplates
    case 'platforms':
      return platformsBundleTemplates
    case 'industries':
      return industriesBundleTemplates
  }
}

export function getPrimaryTemplateForEntity(entityType: EntityType): EntityTemplate {
  switch (entityType) {
    case 'products':
      return productsTemplate
    case 'platforms':
      return platformsTemplate
    case 'industries':
      return industriesTemplate
  }
}

/**
 * Generate CSV header row from a template
 */
export function generateCSVHeaders(template: EntityTemplate): string {
  return template.columns.map(col => col.header).join(',')
}

/**
 * Generate empty CSV template content
 */
export function generateEmptyTemplate(template: EntityTemplate): string {
  const headers = generateCSVHeaders(template)
  const exampleRow = template.columns.map(col => {
    if (col.type === 'array') return ''
    if (col.type === 'boolean') return 'true'
    if (col.type === 'number') return ''
    if (col.type === 'enum' && col.enumValues) return col.enumValues[0]
    return ''
  }).join(',')
  return `${headers}\n${exampleRow}`
}

// Array delimiter used in CSV files
export const ARRAY_DELIMITER = '|'

// Escape character for pipe within content
export const ESCAPED_PIPE = '\\|'
