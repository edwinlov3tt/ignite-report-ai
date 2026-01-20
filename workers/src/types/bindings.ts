/**
 * Environment bindings for Cloudflare Worker
 * These types define all available KV namespaces, R2 buckets, and secrets
 */

export interface Env {
  // KV Namespaces
  PLATFORMS_KV: KVNamespace
  INDUSTRIES_KV: KVNamespace
  SOUL_DOCS_KV: KVNamespace
  SCHEMA_KV: KVNamespace
  LUMINA_CACHE_KV: KVNamespace

  // R2 Buckets
  REPORTS_R2: R2Bucket

  // Secrets (set via wrangler secret put)
  ANTHROPIC_API_KEY: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  OPENAI_API_KEY: string    // For Schema Curator (GPT-5.2)
  TAVILY_API_KEY: string    // For Schema Curator web research

  // Fallback database (SiteGround Postgres)
  FALLBACK_DB_URL?: string // Format: postgresql://user:pass@host:5432/dbname

  // Environment variables (from wrangler.toml [vars])
  ENVIRONMENT: 'development' | 'production'
  LUMINA_API_URL: string
}

// Re-export for convenience
export type { KVNamespace, R2Bucket } from '@cloudflare/workers-types'

/**
 * Platform data structure stored in KV
 */
export interface PlatformContext {
  code: string
  name: string
  description?: string
  is_active: boolean
  quirks: PlatformQuirk[]
  kpis: PlatformKpi[]
  thresholds: PlatformThreshold[]
  buyer_notes: PlatformBuyerNote[]
}

export interface PlatformQuirk {
  id: string
  quirk: string
  impact_level: 'high' | 'medium' | 'low'
  recommendation?: string
}

export interface PlatformKpi {
  id: string
  kpi_name: string
  typical_range?: string
  good_threshold?: number
  bad_threshold?: number
}

export interface PlatformThreshold {
  id: string
  metric_name: string
  threshold_type: 'minimum' | 'maximum' | 'range'
  value: number
  context?: string
}

export interface PlatformBuyerNote {
  id: string
  note: string
  priority: number
}

/**
 * Industry data structure stored in KV
 */
export interface IndustryContext {
  code: string
  name: string
  description?: string
  is_active: boolean
  benchmarks: IndustryBenchmark[]
  insights: IndustryInsight[]
  seasonality: IndustrySeasonality[]
}

export interface IndustryBenchmark {
  id: string
  metric_name: string
  benchmark_value: number
  unit?: string
  source?: string
}

export interface IndustryInsight {
  id: string
  insight: string
  category?: string
  priority: number
}

export interface IndustrySeasonality {
  id: string
  period: string
  impact: 'high' | 'medium' | 'low'
  description?: string
}

/**
 * Soul Document structure
 */
export interface SoulDocument {
  id: string
  doc_type: 'system_prompt' | 'agent_persona' | 'skill'
  name: string
  slug: string
  content: string
  version: number
  published_at: string
}

/**
 * Schema structures for products and tactics
 */
export interface SchemaProduct {
  id: string
  name: string
  data_value: string
  subproducts: SchemaSubproduct[]
}

export interface SchemaSubproduct {
  id: string
  name: string
  data_value: string
  tactic_types: SchemaTacticType[]
}

export interface SchemaTacticType {
  id: string
  name: string
  data_value: string
}

/**
 * Report structure stored in R2
 */
export interface StoredReport {
  id: string
  campaign_id?: string
  content: string
  model_used: string
  agent_strategy: 'single_call' | 'multi_agent'
  soul_doc_versions: Record<string, number>
  tokens_used: {
    input: number
    output: number
  }
  created_at: string
}

/**
 * Request/Response types for API endpoints
 */
export interface AnalyzeRequest {
  campaignData: {
    orderId: string
    orderName?: string
    startDate?: string
    endDate?: string
  }
  companyConfig: {
    companyName: string
    industry: string
    customInstructions?: string
  }
  files: {
    performance?: ParsedFile
    pacing?: ParsedFile
  }
  config: {
    model?: 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514'
    temperature?: number
    tone?: string
  }
}

export interface ParsedFile {
  data: Record<string, unknown>[]
  headers: string[]
  tactics: DetectedTactic[]
}

export interface DetectedTactic {
  platform: string
  product: string
  subproduct?: string
  tacticType: string
  dataValue: string
  matchConfidence: number
}

export interface AnalyzeResponse {
  success: boolean
  reportId: string
  analysis: string
  model: string
  tokensUsed: {
    input: number
    output: number
  }
}

export interface LuminaRequest {
  orderId: string
  forceRefresh?: boolean
}

export interface LuminaResponse {
  success: boolean
  data: {
    orderId: string
    orderName: string
    orderAmount: number
    platform: string
    startDate: string
    endDate: string
    [key: string]: unknown
  }
}

export interface FeedbackRequest {
  reportId: string
  feedbackType: 'thumbs_up' | 'thumbs_down'
  comment?: string
}

export interface PublishRequest {
  namespace: 'platforms' | 'industries' | 'soul_docs' | 'schema' | 'all'
}

export interface PublishResponse {
  success: boolean
  synced: number
  namespace: string
}
