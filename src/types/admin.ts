/**
 * Admin Types for Schema Knowledge Hub
 * Types matching the Supabase database schema
 */

// ============================================
// Platform Knowledge Types
// ============================================

export type ImpactLevel = 'high' | 'medium' | 'low'
export type QuirkType = 'attribution' | 'targeting' | 'bidding' | 'reporting' | 'creative'
export type Objective = 'awareness' | 'traffic' | 'conversions' | 'general'
export type Direction = 'above' | 'below'
export type NoteType = 'tip' | 'warning' | 'optimization' | 'gotcha'
export type PlatformCategory = 'social' | 'search' | 'programmatic' | 'ctv'

export interface Platform {
  id: string
  code: string
  name: string
  category?: PlatformCategory
  logo_url?: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  // Nested data (when fetched with details)
  quirks?: PlatformQuirk[]
  kpis?: PlatformKPI[]
  thresholds?: PlatformThreshold[]
  buyer_notes?: PlatformBuyerNote[]
}

export interface PlatformQuirk {
  id: string
  platform_id: string
  quirk_type: QuirkType
  title: string
  description: string
  impact: ImpactLevel
  ai_instruction?: string
  source?: string
  contributed_by?: string
  verified_by?: string
  applies_to_tactics?: string[]
  created_at?: string
}

export interface PlatformKPI {
  id: string
  platform_id: string
  objective: Objective
  primary_kpis: string[]
  secondary_kpis?: string[]
  notes?: string
  created_at?: string
}

export interface PlatformThreshold {
  id: string
  platform_id: string
  metric: string
  warning_value?: number
  critical_value?: number
  direction: Direction
  context?: string
  tactic_id?: string
  created_at?: string
}

export interface PlatformBuyerNote {
  id: string
  platform_id: string
  note_type: NoteType
  content: string
  tactic_id?: string
  contributed_by: string
  upvotes: number
  is_verified: boolean
  verified_by?: string
  created_at?: string
}

// ============================================
// Industry Knowledge Types
// ============================================

export type InsightType = 'trend' | 'recommendation' | 'warning' | 'opportunity'
export type SeasonalityPeriodType = 'month' | 'quarter' | 'holiday' | 'event'
export type SeasonalityImpact = 'high' | 'medium' | 'low'

export interface Industry {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  // Nested data
  benchmarks?: IndustryBenchmark[]
  insights?: IndustryInsight[]
  seasonality?: IndustrySeasonality[]
}

export interface IndustryBenchmark {
  id: string
  industry_id: string
  platform_id?: string
  tactic_id?: string
  metric: string
  p25?: number
  p50?: number
  p75?: number
  sample_size?: number
  confidence?: number
  quarter?: string
  source?: string
  notes?: string
  created_at?: string
}

export interface IndustryInsight {
  id: string
  industry_id: string
  insight_type: InsightType
  title: string
  content: string
  ai_instruction?: string
  source?: string
  source_url?: string
  valid_from?: string
  valid_until?: string
  created_at?: string
}

export interface IndustrySeasonality {
  id: string
  industry_id: string
  period_type: SeasonalityPeriodType
  period_value: string
  impact: SeasonalityImpact
  cpm_modifier?: number
  description?: string
  created_at?: string
}

// ============================================
// Soul Document Types
// ============================================

export type SoulDocumentType = 'system_prompt' | 'agent_persona' | 'skill' | 'template'

export interface SoulDocument {
  id: string
  doc_type: SoulDocumentType
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  // Nested data
  versions?: SoulDocumentVersion[]
  current_version?: SoulDocumentVersion
}

export interface SoulDocumentVersion {
  id: string
  document_id: string
  version: number
  content: string
  change_summary?: string
  changed_by?: string
  is_published: boolean
  published_at?: string
  created_at?: string
}

// ============================================
// Performance Table Types
// ============================================

export interface PerformanceTable {
  id: string
  subproduct_id: string
  table_name: string
  file_name: string
  headers: string[]
  description?: string
  is_required: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface TableValidator {
  id: string
  subproduct_id: string
  required_tables: string[]
  minimum_tables: number
  created_at?: string
  updated_at?: string
}

export interface PerformanceTableFormData {
  table_name: string
  file_name: string
  headers: string[]
  description?: string
  is_required: boolean
}

// ============================================
// Navigation & UI Types
// ============================================

export type AdminSection = 'products' | 'platforms' | 'industries' | 'soul-documents'

export interface AdminNavItem {
  id: AdminSection
  label: string
  icon: string
  path: string
  children?: AdminNavChild[]
}

export interface AdminNavChild {
  id: string
  label: string
  path: string
}

// ============================================
// Form & Editor Types
// ============================================

export interface PlatformFormData {
  code: string
  name: string
  category?: PlatformCategory
  description?: string
}

export interface QuirkFormData {
  quirk_type: QuirkType
  title: string
  description: string
  impact: ImpactLevel
  ai_instruction?: string
  source?: string
  contributed_by?: string
}

export interface KPIFormData {
  objective: Objective
  primary_kpis: string[]
  secondary_kpis?: string[]
  notes?: string
}

export interface ThresholdFormData {
  metric: string
  warning_value?: number
  critical_value?: number
  direction: Direction
  context?: string
}

export interface BuyerNoteFormData {
  note_type: NoteType
  content: string
  contributed_by: string
}

export interface IndustryFormData {
  code: string
  name: string
  description?: string
  icon?: string
}

export interface BenchmarkFormData {
  metric: string
  p25?: number
  p50?: number
  p75?: number
  sample_size?: number
  confidence?: number
  quarter?: string
  source?: string
  notes?: string
}

export interface SoulDocumentFormData {
  doc_type: SoulDocumentType
  name: string
  slug: string
  description?: string
}

export interface VersionFormData {
  content: string
  change_summary?: string
}

// ============================================
// API Response Types
// ============================================

export interface AdminApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp?: string
}

// ============================================
// UI Helper Constants
// ============================================

export const IMPACT_LEVELS: { value: ImpactLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'var(--color-error)' },
  { value: 'medium', label: 'Medium', color: 'var(--color-warning)' },
  { value: 'low', label: 'Low', color: 'var(--color-info)' },
]

export const INSIGHT_TYPES: { value: InsightType; label: string }[] = [
  { value: 'trend', label: 'Trend' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'warning', label: 'Warning' },
  { value: 'opportunity', label: 'Opportunity' },
]

export const SEASONALITY_PERIODS: { value: SeasonalityPeriodType; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'event', label: 'Event' },
]

export const SOUL_DOC_TYPES: { value: SoulDocumentType; label: string }[] = [
  { value: 'system_prompt', label: 'System Prompt' },
  { value: 'agent_persona', label: 'Agent Persona' },
  { value: 'skill', label: 'Skill' },
  { value: 'template', label: 'Template' },
]

export const QUIRK_TYPES: { value: QuirkType; label: string }[] = [
  { value: 'attribution', label: 'Attribution' },
  { value: 'targeting', label: 'Targeting' },
  { value: 'bidding', label: 'Bidding' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'creative', label: 'Creative' },
]

export const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'general', label: 'General' },
]

export const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
]

export const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: 'tip', label: 'Tip' },
  { value: 'warning', label: 'Warning' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'gotcha', label: 'Gotcha' },
]

export const PLATFORM_CATEGORIES: { value: PlatformCategory; label: string }[] = [
  { value: 'social', label: 'Social' },
  { value: 'search', label: 'Search' },
  { value: 'programmatic', label: 'Programmatic' },
  { value: 'ctv', label: 'Connected TV' },
]

// ============================================
// Medium Types
// ============================================

export interface Medium {
  id: string
  name: string
  code: string
  description?: string
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}
