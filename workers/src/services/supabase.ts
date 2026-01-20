/**
 * Supabase Client Service
 * Handles all database interactions with Supabase
 * Includes fallback support for SiteGround Postgres
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Env, PlatformContext, IndustryContext, SoulDocument, SchemaProduct } from '../types/bindings'

/**
 * Database client wrapper with fallback support
 */
export interface DatabaseClient {
  supabase: SupabaseClient
  hasFallback: boolean
  fallbackUrl?: string
}

/**
 * Create a Supabase client with service role key
 */
export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Create database client with fallback configuration
 */
export function createDatabaseClient(env: Env): DatabaseClient {
  return {
    supabase: createSupabaseClient(env),
    hasFallback: !!env.FALLBACK_DB_URL,
    fallbackUrl: env.FALLBACK_DB_URL,
  }
}

/**
 * Log database health status
 */
export async function checkDatabaseHealth(client: DatabaseClient): Promise<{
  primary: boolean
  fallback: boolean | null
}> {
  let primaryHealthy = false
  let fallbackHealthy: boolean | null = null

  try {
    const { error } = await client.supabase.from('platforms').select('code').limit(1)
    primaryHealthy = !error
  } catch {
    primaryHealthy = false
  }

  // Fallback health check would require direct Postgres connection
  // For now, just indicate if fallback is configured
  if (client.hasFallback) {
    fallbackHealthy = true // Assume healthy if configured
  }

  return { primary: primaryHealthy, fallback: fallbackHealthy }
}

/**
 * Fetch all active platforms with their related data
 */
export async function fetchAllPlatforms(supabase: SupabaseClient): Promise<PlatformContext[]> {
  const { data: platforms, error } = await supabase
    .from('platforms')
    .select(`
      *,
      quirks:platform_quirks(*),
      kpis:platform_kpis(*),
      thresholds:platform_thresholds(*),
      buyer_notes:platform_buyer_notes(*)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch platforms: ${error.message}`)
  }

  return platforms as PlatformContext[]
}

/**
 * Fetch a single platform by code
 */
export async function fetchPlatformByCode(supabase: SupabaseClient, code: string): Promise<PlatformContext | null> {
  const { data, error } = await supabase
    .from('platforms')
    .select(`
      *,
      quirks:platform_quirks(*),
      kpis:platform_kpis(*),
      thresholds:platform_thresholds(*),
      buyer_notes:platform_buyer_notes(*)
    `)
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw new Error(`Failed to fetch platform: ${error.message}`)
  }

  return data as PlatformContext | null
}

/**
 * Fetch all active industries with their related data
 */
export async function fetchAllIndustries(supabase: SupabaseClient): Promise<IndustryContext[]> {
  const { data: industries, error } = await supabase
    .from('industries')
    .select(`
      *,
      benchmarks:industry_benchmarks(*),
      insights:industry_insights(*),
      seasonality:industry_seasonality(*)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch industries: ${error.message}`)
  }

  return industries as IndustryContext[]
}

/**
 * Fetch a single industry by code
 */
export async function fetchIndustryByCode(supabase: SupabaseClient, code: string): Promise<IndustryContext | null> {
  const { data, error } = await supabase
    .from('industries')
    .select(`
      *,
      benchmarks:industry_benchmarks(*),
      insights:industry_insights(*),
      seasonality:industry_seasonality(*)
    `)
    .eq('code', code)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch industry: ${error.message}`)
  }

  return data as IndustryContext | null
}

/**
 * Fetch published soul documents
 */
export async function fetchPublishedSoulDocs(supabase: SupabaseClient): Promise<SoulDocument[]> {
  const { data, error } = await supabase
    .from('soul_documents')
    .select(`
      id,
      doc_type,
      name,
      slug,
      versions:soul_document_versions(
        version,
        content,
        is_published,
        published_at
      )
    `)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch soul documents: ${error.message}`)
  }

  // Transform to get only published versions
  const docs: SoulDocument[] = []
  for (const doc of data) {
    const publishedVersion = doc.versions?.find((v: { is_published: boolean }) => v.is_published)
    if (publishedVersion) {
      docs.push({
        id: doc.id,
        doc_type: doc.doc_type,
        name: doc.name,
        slug: doc.slug,
        content: publishedVersion.content,
        version: publishedVersion.version,
        published_at: publishedVersion.published_at,
      })
    }
  }

  return docs
}

/**
 * Fetch a single soul document by slug
 */
export async function fetchSoulDocBySlug(supabase: SupabaseClient, slug: string): Promise<SoulDocument | null> {
  const { data, error } = await supabase
    .from('soul_documents')
    .select(`
      id,
      doc_type,
      name,
      slug,
      versions:soul_document_versions(
        version,
        content,
        is_published,
        published_at
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch soul document: ${error.message}`)
  }

  if (!data) return null

  const publishedVersion = data.versions?.find((v: { is_published: boolean }) => v.is_published)
  if (!publishedVersion) return null

  return {
    id: data.id,
    doc_type: data.doc_type,
    name: data.name,
    slug: data.slug,
    content: publishedVersion.content,
    version: publishedVersion.version,
    published_at: publishedVersion.published_at,
  }
}

/**
 * Fetch full schema (products > subproducts > tactic_types)
 */
export async function fetchFullSchema(supabase: SupabaseClient): Promise<SchemaProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      data_value,
      subproducts(
        id,
        name,
        data_value,
        tactic_types(
          id,
          name,
          data_value
        )
      )
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch schema: ${error.message}`)
  }

  return data as SchemaProduct[]
}

/**
 * Save report metadata to database
 */
export async function saveReportMetadata(
  supabase: SupabaseClient,
  report: {
    id: string
    campaign_id?: string
    r2_key: string
    model_used: string
    agent_strategy: 'single_call' | 'multi_agent'
    soul_doc_versions: Record<string, number>
  }
): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .insert(report)

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`)
  }
}

/**
 * Save feedback for a report
 */
export async function saveFeedback(
  supabase: SupabaseClient,
  feedback: {
    report_id: string
    feedback_type: 'thumbs_up' | 'thumbs_down'
    comment?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('report_feedback')
    .insert(feedback)

  if (error) {
    throw new Error(`Failed to save feedback: ${error.message}`)
  }
}

/**
 * Log a KV sync operation
 */
export async function logKvSync(
  supabase: SupabaseClient,
  log: {
    namespace: string
    keys_synced: number
    success: boolean
    error_message?: string
  }
): Promise<void> {
  const { error } = await supabase
    .from('kv_sync_log')
    .insert({
      ...log,
      synced_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to log KV sync:', error.message)
  }
}
