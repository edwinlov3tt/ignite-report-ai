/**
 * Data Transformers for Import/Export
 * Converts between API format and CSV format
 */

import type { Product, SubProduct, TacticType, LuminaExtractor, Benchmark } from '@/lib/schemaApi'
import type { Platform, PlatformQuirk, PlatformKPI, PlatformThreshold, PlatformBuyerNote } from '@/types/admin'
import type { Industry, IndustryBenchmark, IndustryInsight, IndustrySeasonality } from '@/types/admin'
import { ARRAY_DELIMITER, ESCAPED_PIPE } from './csvTemplates'

// ============================================
// Helper Functions
// ============================================

/**
 * Convert array to pipe-delimited string for CSV
 */
export function arrayToCsvString(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return ''
  return arr.map(s => s.replace(/\|/g, ESCAPED_PIPE)).join(ARRAY_DELIMITER)
}

/**
 * Convert boolean to CSV string
 */
export function booleanToCsvString(val: boolean | null | undefined): string {
  if (val === null || val === undefined) return ''
  return val ? 'true' : 'false'
}

/**
 * Convert number to CSV string
 */
export function numberToCsvString(val: number | null | undefined): string {
  if (val === null || val === undefined) return ''
  return val.toString()
}

/**
 * Escape CSV field value (handle commas, quotes, newlines)
 */
export function escapeCSVField(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = value.toString()
  // If the field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert object to JSON string for CSV storage
 */
export function objectToCsvString(obj: Record<string, unknown> | null | undefined): string {
  if (!obj) return ''
  return JSON.stringify(obj)
}

// ============================================
// Products Transformers
// ============================================

export interface ProductCSVRow {
  id: string
  name: string
  slug: string
  platforms: string
  notes: string
  ai_guidelines: string
  ai_prompt: string
}

export function productToCSVRow(product: Product): ProductCSVRow {
  return {
    id: product.id?.toString() || '',
    name: product.name,
    slug: product.slug || '',
    platforms: arrayToCsvString(product.platforms),
    notes: product.notes || '',
    ai_guidelines: product.ai_guidelines || '',
    ai_prompt: product.ai_prompt || ''
  }
}

export interface SubProductCSVRow {
  id: string
  product_slug: string
  name: string
  slug: string
  platforms: string
  notes: string
}

export function subProductToCSVRow(subProduct: SubProduct, productSlug: string): SubProductCSVRow {
  return {
    id: subProduct.id?.toString() || '',
    product_slug: productSlug,
    name: subProduct.name,
    slug: subProduct.slug || '',
    platforms: arrayToCsvString(subProduct.platforms),
    notes: subProduct.notes || ''
  }
}

export interface TacticTypeCSVRow {
  id: string
  subproduct_slug: string
  name: string
  slug: string
  data_value: string
  filename_stem: string
  aliases: string
  headers: string
}

export function tacticTypeToCSVRow(tactic: TacticType, subProductSlug: string): TacticTypeCSVRow {
  return {
    id: tactic.id?.toString() || '',
    subproduct_slug: subProductSlug,
    name: tactic.name,
    slug: tactic.slug || '',
    data_value: tactic.data_value || '',
    filename_stem: tactic.filename_stem || '',
    aliases: arrayToCsvString(tactic.aliases),
    headers: arrayToCsvString(tactic.headers)
  }
}

export interface LuminaExtractorCSVRow {
  id: string
  product_slug: string
  name: string
  path: string
  when_conditions: string
  aggregate_type: string
  description: string
}

export function luminaExtractorToCSVRow(extractor: LuminaExtractor, productSlug: string): LuminaExtractorCSVRow {
  return {
    id: extractor.id?.toString() || '',
    product_slug: productSlug,
    name: extractor.name,
    path: extractor.path,
    when_conditions: objectToCsvString(extractor.when_conditions),
    aggregate_type: extractor.aggregate_type || '',
    description: extractor.description || ''
  }
}

export interface ProductBenchmarkCSVRow {
  id: string
  product_slug: string
  metric_name: string
  goal_value: string
  warning_threshold: string
  unit: string
  direction: string
  context: string
  source: string
}

export function productBenchmarkToCSVRow(benchmark: Benchmark, productSlug: string): ProductBenchmarkCSVRow {
  return {
    id: benchmark.id?.toString() || '',
    product_slug: productSlug,
    metric_name: benchmark.metric_name,
    goal_value: numberToCsvString(benchmark.goal_value),
    warning_threshold: numberToCsvString(benchmark.warning_threshold),
    unit: benchmark.unit,
    direction: benchmark.direction,
    context: benchmark.context || '',
    source: benchmark.source || ''
  }
}

// ============================================
// Platforms Transformers
// ============================================

export interface PlatformCSVRow {
  id: string
  name: string
  code: string
  category: string
  logo_url: string
  is_active: string
}

export function platformToCSVRow(platform: Platform): PlatformCSVRow {
  return {
    id: platform.id || '',
    name: platform.name,
    code: platform.code,
    category: platform.category || '',
    logo_url: platform.logo_url || '',
    is_active: booleanToCsvString(platform.is_active)
  }
}

export interface PlatformQuirkCSVRow {
  id: string
  platform_code: string
  quirk_type: string
  title: string
  description: string
  impact: string
  ai_instruction: string
  applies_to_tactics: string
  source: string
  contributed_by: string
}

export function platformQuirkToCSVRow(quirk: PlatformQuirk, platformCode: string): PlatformQuirkCSVRow {
  return {
    id: quirk.id || '',
    platform_code: platformCode,
    quirk_type: quirk.quirk_type,
    title: quirk.title,
    description: quirk.description,
    impact: quirk.impact,
    ai_instruction: quirk.ai_instruction || '',
    applies_to_tactics: arrayToCsvString(quirk.applies_to_tactics),
    source: quirk.source || '',
    contributed_by: quirk.contributed_by || ''
  }
}

export interface PlatformKPICSVRow {
  id: string
  platform_code: string
  objective: string
  primary_kpis: string
  secondary_kpis: string
  notes: string
}

export function platformKPIToCSVRow(kpi: PlatformKPI, platformCode: string): PlatformKPICSVRow {
  return {
    id: kpi.id || '',
    platform_code: platformCode,
    objective: kpi.objective,
    primary_kpis: arrayToCsvString(kpi.primary_kpis),
    secondary_kpis: arrayToCsvString(kpi.secondary_kpis),
    notes: kpi.notes || ''
  }
}

export interface PlatformThresholdCSVRow {
  id: string
  platform_code: string
  metric: string
  warning_value: string
  critical_value: string
  direction: string
  context: string
  tactic_id: string
}

export function platformThresholdToCSVRow(threshold: PlatformThreshold, platformCode: string): PlatformThresholdCSVRow {
  return {
    id: threshold.id || '',
    platform_code: platformCode,
    metric: threshold.metric,
    warning_value: numberToCsvString(threshold.warning_value),
    critical_value: numberToCsvString(threshold.critical_value),
    direction: threshold.direction,
    context: threshold.context || '',
    tactic_id: threshold.tactic_id || ''
  }
}

export interface PlatformBuyerNoteCSVRow {
  id: string
  platform_code: string
  note_type: string
  content: string
  tactic_id: string
  contributed_by: string
  upvotes: string
  is_verified: string
  verified_by: string
}

export function platformBuyerNoteToCSVRow(note: PlatformBuyerNote, platformCode: string): PlatformBuyerNoteCSVRow {
  return {
    id: note.id || '',
    platform_code: platformCode,
    note_type: note.note_type,
    content: note.content,
    tactic_id: note.tactic_id || '',
    contributed_by: note.contributed_by,
    upvotes: numberToCsvString(note.upvotes),
    is_verified: booleanToCsvString(note.is_verified),
    verified_by: note.verified_by || ''
  }
}

// ============================================
// Industries Transformers
// ============================================

export interface IndustryCSVRow {
  id: string
  name: string
  code: string
  description: string
  icon: string
  is_active: string
}

export function industryToCSVRow(industry: Industry): IndustryCSVRow {
  return {
    id: industry.id || '',
    name: industry.name,
    code: industry.code,
    description: industry.description || '',
    icon: industry.icon || '',
    is_active: booleanToCsvString(industry.is_active)
  }
}

export interface IndustryBenchmarkCSVRow {
  id: string
  industry_code: string
  platform_id: string
  tactic_id: string
  metric: string
  p25: string
  p50: string
  p75: string
  sample_size: string
  confidence: string
  quarter: string
  source: string
  notes: string
}

export function industryBenchmarkToCSVRow(benchmark: IndustryBenchmark, industryCode: string): IndustryBenchmarkCSVRow {
  return {
    id: benchmark.id || '',
    industry_code: industryCode,
    platform_id: benchmark.platform_id || '',
    tactic_id: benchmark.tactic_id || '',
    metric: benchmark.metric,
    p25: numberToCsvString(benchmark.p25),
    p50: numberToCsvString(benchmark.p50),
    p75: numberToCsvString(benchmark.p75),
    sample_size: numberToCsvString(benchmark.sample_size),
    confidence: numberToCsvString(benchmark.confidence),
    quarter: benchmark.quarter || '',
    source: benchmark.source || '',
    notes: benchmark.notes || ''
  }
}

export interface IndustryInsightCSVRow {
  id: string
  industry_code: string
  insight_type: string
  title: string
  content: string
  ai_instruction: string
  source: string
  source_url: string
  valid_from: string
  valid_until: string
}

export function industryInsightToCSVRow(insight: IndustryInsight, industryCode: string): IndustryInsightCSVRow {
  return {
    id: insight.id || '',
    industry_code: industryCode,
    insight_type: insight.insight_type,
    title: insight.title,
    content: insight.content,
    ai_instruction: insight.ai_instruction || '',
    source: insight.source || '',
    source_url: insight.source_url || '',
    valid_from: insight.valid_from || '',
    valid_until: insight.valid_until || ''
  }
}

export interface IndustrySeasonalityCSVRow {
  id: string
  industry_code: string
  period_type: string
  period_value: string
  impact: string
  cpm_modifier: string
  description: string
}

export function industrySeasonalityToCSVRow(seasonality: IndustrySeasonality, industryCode: string): IndustrySeasonalityCSVRow {
  return {
    id: seasonality.id || '',
    industry_code: industryCode,
    period_type: seasonality.period_type,
    period_value: seasonality.period_value,
    impact: seasonality.impact,
    cpm_modifier: numberToCsvString(seasonality.cpm_modifier),
    description: seasonality.description || ''
  }
}

// ============================================
// CSV Generation Helpers
// ============================================

/**
 * Convert array of row objects to CSV string
 */
export function rowsToCSV(rows: Array<Record<string, string>>, headers: string[]): string {
  if (rows.length === 0) {
    return headers.join(',')
  }

  const headerLine = headers.join(',')
  const dataLines = rows.map(row => {
    return headers.map(h => escapeCSVField(row[h])).join(',')
  })

  return [headerLine, ...dataLines].join('\n')
}

/**
 * Transform products array to all CSV files needed for export
 */
export function transformProductsToCSV(products: Product[]): {
  products: string
  subproducts: string
  tactic_types: string
  lumina_extractors: string
  product_benchmarks: string
} {
  const productRows: ProductCSVRow[] = []
  const subProductRows: SubProductCSVRow[] = []
  const tacticTypeRows: TacticTypeCSVRow[] = []
  const extractorRows: LuminaExtractorCSVRow[] = []
  const benchmarkRows: ProductBenchmarkCSVRow[] = []

  for (const product of products) {
    productRows.push(productToCSVRow(product))

    for (const subProduct of product.subproducts || []) {
      subProductRows.push(subProductToCSVRow(subProduct, product.slug))

      for (const tactic of subProduct.tactic_types || []) {
        tacticTypeRows.push(tacticTypeToCSVRow(tactic, subProduct.slug || ''))
      }
    }

    for (const extractor of product.lumina_extractors || []) {
      extractorRows.push(luminaExtractorToCSVRow(extractor, product.slug))
    }

    for (const benchmark of product.benchmarks || []) {
      benchmarkRows.push(productBenchmarkToCSVRow(benchmark, product.slug))
    }
  }

  return {
    products: rowsToCSV(productRows as unknown as Record<string, string>[], ['id', 'name', 'slug', 'platforms', 'notes', 'ai_guidelines', 'ai_prompt']),
    subproducts: rowsToCSV(subProductRows as unknown as Record<string, string>[], ['id', 'product_slug', 'name', 'slug', 'platforms', 'notes']),
    tactic_types: rowsToCSV(tacticTypeRows as unknown as Record<string, string>[], ['id', 'subproduct_slug', 'name', 'slug', 'data_value', 'filename_stem', 'aliases', 'headers']),
    lumina_extractors: rowsToCSV(extractorRows as unknown as Record<string, string>[], ['id', 'product_slug', 'name', 'path', 'when_conditions', 'aggregate_type', 'description']),
    product_benchmarks: rowsToCSV(benchmarkRows as unknown as Record<string, string>[], ['id', 'product_slug', 'metric_name', 'goal_value', 'warning_threshold', 'unit', 'direction', 'context', 'source'])
  }
}

/**
 * Transform platforms array to all CSV files needed for export
 */
export function transformPlatformsToCSV(platforms: Platform[]): {
  platforms: string
  platform_quirks: string
  platform_kpis: string
  platform_thresholds: string
  platform_buyer_notes: string
} {
  const platformRows: PlatformCSVRow[] = []
  const quirkRows: PlatformQuirkCSVRow[] = []
  const kpiRows: PlatformKPICSVRow[] = []
  const thresholdRows: PlatformThresholdCSVRow[] = []
  const noteRows: PlatformBuyerNoteCSVRow[] = []

  for (const platform of platforms) {
    platformRows.push(platformToCSVRow(platform))

    for (const quirk of platform.quirks || []) {
      quirkRows.push(platformQuirkToCSVRow(quirk, platform.code))
    }

    for (const kpi of platform.kpis || []) {
      kpiRows.push(platformKPIToCSVRow(kpi, platform.code))
    }

    for (const threshold of platform.thresholds || []) {
      thresholdRows.push(platformThresholdToCSVRow(threshold, platform.code))
    }

    for (const note of platform.buyer_notes || []) {
      noteRows.push(platformBuyerNoteToCSVRow(note, platform.code))
    }
  }

  return {
    platforms: rowsToCSV(platformRows as unknown as Record<string, string>[], ['id', 'name', 'code', 'category', 'logo_url', 'is_active']),
    platform_quirks: rowsToCSV(quirkRows as unknown as Record<string, string>[], ['id', 'platform_code', 'quirk_type', 'title', 'description', 'impact', 'ai_instruction', 'applies_to_tactics', 'source', 'contributed_by']),
    platform_kpis: rowsToCSV(kpiRows as unknown as Record<string, string>[], ['id', 'platform_code', 'objective', 'primary_kpis', 'secondary_kpis', 'notes']),
    platform_thresholds: rowsToCSV(thresholdRows as unknown as Record<string, string>[], ['id', 'platform_code', 'metric', 'warning_value', 'critical_value', 'direction', 'context', 'tactic_id']),
    platform_buyer_notes: rowsToCSV(noteRows as unknown as Record<string, string>[], ['id', 'platform_code', 'note_type', 'content', 'tactic_id', 'contributed_by', 'upvotes', 'is_verified', 'verified_by'])
  }
}

/**
 * Transform industries array to all CSV files needed for export
 */
export function transformIndustriesToCSV(industries: Industry[]): {
  industries: string
  industry_benchmarks: string
  industry_insights: string
  industry_seasonality: string
} {
  const industryRows: IndustryCSVRow[] = []
  const benchmarkRows: IndustryBenchmarkCSVRow[] = []
  const insightRows: IndustryInsightCSVRow[] = []
  const seasonalityRows: IndustrySeasonalityCSVRow[] = []

  for (const industry of industries) {
    industryRows.push(industryToCSVRow(industry))

    for (const benchmark of industry.benchmarks || []) {
      benchmarkRows.push(industryBenchmarkToCSVRow(benchmark, industry.code))
    }

    for (const insight of industry.insights || []) {
      insightRows.push(industryInsightToCSVRow(insight, industry.code))
    }

    for (const seasonality of industry.seasonality || []) {
      seasonalityRows.push(industrySeasonalityToCSVRow(seasonality, industry.code))
    }
  }

  return {
    industries: rowsToCSV(industryRows as unknown as Record<string, string>[], ['id', 'name', 'code', 'description', 'icon', 'is_active']),
    industry_benchmarks: rowsToCSV(benchmarkRows as unknown as Record<string, string>[], ['id', 'industry_code', 'platform_id', 'tactic_id', 'metric', 'p25', 'p50', 'p75', 'sample_size', 'confidence', 'quarter', 'source', 'notes']),
    industry_insights: rowsToCSV(insightRows as unknown as Record<string, string>[], ['id', 'industry_code', 'insight_type', 'title', 'content', 'ai_instruction', 'source', 'source_url', 'valid_from', 'valid_until']),
    industry_seasonality: rowsToCSV(seasonalityRows as unknown as Record<string, string>[], ['id', 'industry_code', 'period_type', 'period_value', 'impact', 'cpm_modifier', 'description'])
  }
}
