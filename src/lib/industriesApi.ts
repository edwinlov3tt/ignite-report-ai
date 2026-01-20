/**
 * Industries API Service
 * Connects directly to Supabase for industry knowledge management
 */

import { supabase, publishToKV } from './supabase'

// Types matching the database schema
export interface IndustryBenchmark {
  id: string
  industry_id: string
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
  insight_type: 'trend' | 'recommendation' | 'warning' | 'opportunity'
  title: string
  content: string
  ai_instruction?: string
  source?: string
  valid_from?: string
  valid_until?: string
  created_at?: string
}

export interface IndustrySeasonality {
  id: string
  industry_id: string
  period_type: 'month' | 'quarter' | 'holiday' | 'event'
  period_value: string
  impact: 'high' | 'medium' | 'low'
  cpm_modifier?: number
  description?: string
  created_at?: string
}

// Curator Research Types (JSONB structures stored on industries table)
export interface CuratorBenchmarkRange {
  min: number
  max: number
  avg: number
  currency?: string
  unit?: string
}

export interface CuratorBenchmarks {
  cpc_range?: CuratorBenchmarkRange
  cpa_range?: CuratorBenchmarkRange
  ctr_range?: CuratorBenchmarkRange
  cpm_range?: CuratorBenchmarkRange
  roas_range?: { min: number; max: number; avg: number }
  notes?: string
}

export interface CuratorSeasonality {
  peak_months?: number[]
  slow_months?: number[]
  quarterly_trends?: {
    q1?: string
    q2?: string
    q3?: string
    q4?: string
  }
  holidays_impact?: string[]
  notes?: string
}

export interface CuratorInsight {
  topic: string
  content: string
  confidence: number
}

export interface ResearchMetadata {
  researched_at?: string
  sources?: string[]
  query?: string
  company_context?: string | null
  tokens_used?: number
}

export interface Industry {
  id: string
  code: string
  name: string
  description?: string
  icon?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  // Nested data from related tables
  benchmarks?: IndustryBenchmark[]
  insights?: IndustryInsight[]
  seasonality?: IndustrySeasonality[]
  // Curator research data (JSONB columns)
  curator_benchmarks?: CuratorBenchmarks
  curator_seasonality?: CuratorSeasonality
  curator_insights?: CuratorInsight[]
  buyer_notes?: string
  research_metadata?: ResearchMetadata
}

// ============================================
// READ Operations
// ============================================

/**
 * Get all industries with related data
 */
export async function getIndustries(): Promise<Industry[]> {
  const { data, error } = await supabase
    .from('industries')
    .select(`
      id,
      code,
      name,
      description,
      icon,
      is_active,
      created_at,
      updated_at,
      curator_benchmarks,
      curator_seasonality,
      curator_insights,
      buyer_notes,
      research_metadata,
      benchmarks:industry_benchmarks (
        id,
        industry_id,
        metric,
        p25,
        p50,
        p75,
        sample_size,
        confidence,
        quarter,
        source,
        notes,
        created_at
      ),
      insights:industry_insights (
        id,
        industry_id,
        insight_type,
        title,
        content,
        ai_instruction,
        source,
        valid_from,
        valid_until,
        created_at
      ),
      seasonality:industry_seasonality (
        id,
        industry_id,
        period_type,
        period_value,
        impact,
        cpm_modifier,
        description,
        created_at
      )
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Failed to fetch industries:', error)
    throw new Error(error.message)
  }

  return (data || []) as Industry[]
}

/**
 * Get a single industry by ID with all related data
 */
export async function getIndustry(id: string): Promise<Industry | null> {
  const { data, error } = await supabase
    .from('industries')
    .select(`
      id,
      code,
      name,
      description,
      icon,
      is_active,
      created_at,
      updated_at,
      curator_benchmarks,
      curator_seasonality,
      curator_insights,
      buyer_notes,
      research_metadata,
      benchmarks:industry_benchmarks (
        id,
        industry_id,
        metric,
        p25,
        p50,
        p75,
        sample_size,
        confidence,
        quarter,
        source,
        notes,
        created_at
      ),
      insights:industry_insights (
        id,
        industry_id,
        insight_type,
        title,
        content,
        ai_instruction,
        source,
        valid_from,
        valid_until,
        created_at
      ),
      seasonality:industry_seasonality (
        id,
        industry_id,
        period_type,
        period_value,
        impact,
        cpm_modifier,
        description,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch industry:', error)
    throw new Error(error.message)
  }

  return data as Industry | null
}

// ============================================
// Industry CRUD
// ============================================

/**
 * Create a new industry
 */
export async function createIndustry(data: {
  code: string
  name: string
  description?: string
  icon?: string
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('industries')
    .insert({
      code: data.code,
      name: data.name,
      description: data.description,
      icon: data.icon,
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to create industry:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')

  return { id: result.id }
}

/**
 * Update an industry
 */
export async function updateIndustry(
  id: string,
  data: {
    code?: string
    name?: string
    description?: string
    icon?: string
    is_active?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('industries')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update industry:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}

/**
 * Delete an industry
 */
export async function deleteIndustry(id: string): Promise<void> {
  const { error } = await supabase
    .from('industries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete industry:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}

// ============================================
// Benchmark Operations
// ============================================

/**
 * Add a benchmark to an industry
 */
export async function addBenchmark(
  industryId: string,
  data: {
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
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('industry_benchmarks')
    .insert({
      industry_id: industryId,
      ...data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add benchmark:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')

  return { id: result.id }
}

/**
 * Update a benchmark
 */
export async function updateBenchmark(
  benchmarkId: string,
  data: {
    metric?: string
    p25?: number
    p50?: number
    p75?: number
    sample_size?: number
    confidence?: number
    quarter?: string
    source?: string
    notes?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('industry_benchmarks')
    .update(data)
    .eq('id', benchmarkId)

  if (error) {
    console.error('Failed to update benchmark:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}

/**
 * Delete a benchmark
 */
export async function deleteBenchmark(benchmarkId: string): Promise<void> {
  const { error } = await supabase
    .from('industry_benchmarks')
    .delete()
    .eq('id', benchmarkId)

  if (error) {
    console.error('Failed to delete benchmark:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}

// ============================================
// Insight Operations
// ============================================

/**
 * Add an insight to an industry
 */
export async function addInsight(
  industryId: string,
  data: {
    insight_type: 'trend' | 'recommendation' | 'warning' | 'opportunity'
    title: string
    content: string
    ai_instruction?: string
    source?: string
    valid_from?: string
    valid_until?: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('industry_insights')
    .insert({
      industry_id: industryId,
      ...data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add insight:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')

  return { id: result.id }
}

/**
 * Delete an insight
 */
export async function deleteInsight(insightId: string): Promise<void> {
  const { error } = await supabase
    .from('industry_insights')
    .delete()
    .eq('id', insightId)

  if (error) {
    console.error('Failed to delete insight:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}

// ============================================
// Seasonality Operations
// ============================================

/**
 * Add a seasonality entry to an industry
 */
export async function addSeasonality(
  industryId: string,
  data: {
    period_type: 'month' | 'quarter' | 'holiday' | 'event'
    period_value: string
    impact: 'high' | 'medium' | 'low'
    cpm_modifier?: number
    description?: string
  }
): Promise<{ id: string }> {
  const { data: result, error } = await supabase
    .from('industry_seasonality')
    .insert({
      industry_id: industryId,
      ...data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to add seasonality:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')

  return { id: result.id }
}

/**
 * Delete a seasonality entry
 */
export async function deleteSeasonality(seasonalityId: string): Promise<void> {
  const { error } = await supabase
    .from('industry_seasonality')
    .delete()
    .eq('id', seasonalityId)

  if (error) {
    console.error('Failed to delete seasonality:', error)
    throw new Error(error.message)
  }

  await publishToKV('industries')
}
